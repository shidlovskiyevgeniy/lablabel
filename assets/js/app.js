/* ============ LABLABEL — lablabel.ru ============ */
'use strict';

/* --- Настройки. Меняются здесь и больше нигде. --- */
const CONFIG = {
  // URL Cloud Function, которая шлёт заявки в Telegram.
  // Пока пусто — форма подскажет написать напрямую. См. README.md.
  orderEndpoint: '',
  telegram: 'https://t.me/lablabel',   // ЗАМЕНИТЬ
  whatsapp: 'https://wa.me/70000000000' // ЗАМЕНИТЬ
};

/* --- Прайс. Пороговые цены за штуку. --- */
const PRICES = {
  paper: {
    title: 'Бумажные визитки',
    steps: [100, 150, 200, 250, 300, 500, 750, 1000, 1500, 2000, 3000],
    tiers: [[250, 12], [500, 10], [1000, 8.5], [Infinity, 7]],
    twoside: true
  },
  pvc: {
    title: 'Пластиковые ПВХ-визитки',
    steps: [10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500],
    tiers: [[50, 200], [100, 180], [Infinity, 160]],
    twoside: true
  },
  wood: {
    title: 'Визитки из фанеры с гравировкой',
    steps: [10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500],
    tiers: [[50, 240], [100, 220], [Infinity, 200]],
    twoside: false
  },
  nfc: {
    title: 'NFC-визитки',
    steps: [1, 2, 3, 5, 10, 20, 30, 50, 75, 100, 150],
    tiers: [[10, 650], [50, 600], [Infinity, 550]],
    twoside: false
  }
};

const DESIGN_FEE = 900;   // разработка макета, разово
const TWOSIDE_K  = 0.30;  // двусторонняя печать
const URGENT_K   = 0.30;  // срочно, за 1 день

const rub = n => Math.round(n).toLocaleString('ru-RU');
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- мобильное меню ---------- */
(function nav() {
  const burger = $('.burger');
  const menu = $('#mobnav');
  if (!burger || !menu) return;

  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    menu.hidden = open;
    if (open) menu.removeAttribute('data-open'); else menu.setAttribute('data-open', '');
  });

  menu.addEventListener('click', e => {
    if (e.target.tagName !== 'A') return;
    burger.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    menu.removeAttribute('data-open');
  });
})();

/* ---------- калькулятор ---------- */
const calc = (function () {
  const form = $('#calcForm');
  if (!form) return null;

  const qty     = $('#qty');
  const marks   = $('#qtyMarks');
  const outKind = $('#outKind');
  const outSum  = $('#outTotal');
  const outPer  = $('#outPer');
  const outQty  = $('#outQty');
  const outRows = $('#outRows');
  const qtyVal  = $('#qtyVal');

  const state = () => {
    const kind = form.elements.kind.value;
    const p = PRICES[kind];
    const q = p.steps[Number(qty.value)];
    const unit = p.tiers.find(t => q < t[0])[1];

    const base = unit * q;
    const twoside = form.elements.twoside.checked && p.twoside ? base * TWOSIDE_K : 0;
    const sub = base + twoside;
    const urgent = form.elements.urgent.checked ? sub * URGENT_K : 0;
    const design = form.elements.design.checked ? DESIGN_FEE : 0;

    return { kind, p, q, unit, base, twoside, urgent, design, total: sub + urgent + design };
  };

  function render() {
    const s = state();

    qtyVal.textContent = rub(s.q);
    marks.innerHTML = `<span>${rub(s.p.steps[0])}</span><span>${rub(s.p.steps[s.p.steps.length - 1])} шт</span>`;
    outKind.textContent = s.p.title;
    outSum.textContent = rub(s.total);
    const per = s.total / s.q;
    outPer.textContent = (per < 20 && per % 1 >= 0.05 ? per.toFixed(1) : String(Math.round(per))).replace('.', ',');
    outQty.textContent = rub(s.q);

    const rows = [[`${rub(s.q)} шт × ${rub(s.unit)} ₽`, `${rub(s.base)} ₽`]];
    if (s.twoside) rows.push(['Двусторонняя печать', `+${rub(s.twoside)} ₽`]);
    if (s.urgent)  rows.push(['Срочно, за 1 день', `+${rub(s.urgent)} ₽`]);
    if (s.design)  rows.push(['Разработка макета', `+${rub(s.design)} ₽`]);
    outRows.innerHTML = rows.map(r => `<li><span>${r[0]}</span><b>${r[1]}</b></li>`).join('');
  }

  // при смене вида — сбрасываем ползунок на минимум этого вида
  form.addEventListener('change', e => {
    if (e.target.name === 'kind') qty.value = '0';
    render();
  });
  qty.addEventListener('input', render);

  // ссылки «Рассчитать тираж →» из карточек товаров
  $$('[data-preset]').forEach(a => {
    a.addEventListener('click', () => {
      const el = form.querySelector(`input[name="kind"][value="${a.dataset.preset}"]`);
      if (el) { el.checked = true; qty.value = '0'; render(); }
    });
  });

  // приход со страницы вида: /?kind=nfc#calc — сразу выбираем нужный вид
  const fromUrl = new URLSearchParams(location.search).get('kind');
  if (fromUrl && PRICES[fromUrl]) {
    const el = form.querySelector(`input[name="kind"][value="${fromUrl}"]`);
    if (el) { el.checked = true; qty.value = '0'; }
  }

  render();
  return { state };
})();

/* ---------- перенос расчёта в заявку ---------- */
(function bridge() {
  const btn = $('#calcToOrder');
  const form = $('#orderForm');
  if (!btn || !form || !calc) return;

  btn.addEventListener('click', () => {
    const s = calc.state();
    form.elements.kind.value = s.kind;
    form.elements.qty.value = s.q;
    const c = form.elements.comment;
    const line = `Расчёт с сайта: ${s.p.title}, ${rub(s.q)} шт — ${rub(s.total)} ₽`
      + (s.design ? ', нужен макет' : '')
      + (s.twoside ? ', двусторонние' : '')
      + (s.urgent ? ', срочно' : '');
    if (!c.value.includes('Расчёт с сайта')) c.value = (c.value ? c.value + '\n' : '') + line;
  });
})();

/* ---------- форма заявки ---------- */
(function order() {
  const form = $('#orderForm');
  if (!form) return;

  const msg = $('#formMsg');
  const btn = $('#orderSubmit');
  const KINDS = {
    paper: 'Бумажные', pvc: 'Пластиковые ПВХ', wood: 'Фанера с гравировкой',
    nfc: 'NFC-визитки', graffiti: 'Чистое граффити', other: 'Ещё не решил(а)'
  };

  const say = (text, cls) => { msg.textContent = text; msg.className = 'form__msg ' + (cls || ''); };

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const f = form.elements;
    const bad = [];
    if (!f.name.value.trim()) bad.push(f.name);
    if (!f.contact.value.trim()) bad.push(f.contact);
    $$('input', form).forEach(i => i.removeAttribute('aria-invalid'));

    if (bad.length) {
      bad.forEach(i => i.setAttribute('aria-invalid', 'true'));
      bad[0].focus();
      return say('Заполните имя и контакт — без них мы не сможем ответить.', 'err');
    }
    if (!f.agree.checked) return say('Нужно согласие на обработку персональных данных.', 'err');

    const data = {
      name: f.name.value.trim(),
      contact: f.contact.value.trim(),
      kind: KINDS[f.kind.value] || f.kind.value,
      qty: f.qty.value.trim(),
      comment: f.comment.value.trim(),
      company: f.company ? f.company.value : '',
      page: location.href
    };

    if (!CONFIG.orderEndpoint) {
      const text = `Заявка с сайта lablabel.ru\nИмя: ${data.name}\nКонтакт: ${data.contact}\n`
        + `Вид: ${data.kind}\nТираж: ${data.qty || '—'}\n${data.comment}`;
      try { await navigator.clipboard.writeText(text); } catch (_) {}
      return say('Отправка форм ещё не подключена. Текст заявки скопирован — пришлите его в Telegram или WhatsApp.', 'err');
    }

    btn.disabled = true;
    say('Отправляем…');

    try {
      const res = await fetch(CONFIG.orderEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      form.reset();
      say('Заявка отправлена. Ответим в течение рабочего дня — спасибо!', 'ok');
    } catch (err) {
      say('Не получилось отправить. Напишите, пожалуйста, в Telegram — ответим сразу.', 'err');
    } finally {
      btn.disabled = false;
    }
  });
})();

/* ---------- мелочи ---------- */
(function misc() {
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  // подставляем контакты из CONFIG в ссылки-заглушки
  $$('a[href^="https://t.me/"]').forEach(a => { a.href = CONFIG.telegram; });
  $$('a[href^="https://wa.me/"]').forEach(a => { a.href = CONFIG.whatsapp; });
})();
