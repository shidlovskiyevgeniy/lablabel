/* ============ LABLABEL — кабинет мастера (master.html) ============ */
/* Прайс (PRICES, DESIGN_FEE, TWOSIDE_K, URGENT_K) и хелперы ($, $$, rub) берём из app.js. */
'use strict';

/* --- Справочник по умолчанию. Себестоимость подогнана под бизнес-план:
       бумага ≈ 5 ₽, ПВХ ≈ 30 ₽, фанера ≈ 130 ₽, NFC ≈ 160 ₽ за штуку на типовом заказе. --- */
const REF_DEFAULT = {
  labor: 400,          // ₽ за час своего труда
  kwh: 7,              // ₽ за кВт·ч
  taxP: 4,             // НПД с физлиц, %
  taxC: 6,             // НПД с компаний и ИП, %
  minOrder: 500,       // ₽, минимальный чек
  rentMonth: 5000,     // ₽ аренда в месяц
  ordersMonth: 50,     // заказов в месяц — на них делим аренду
  talkMin: 15,         // мин: переписка, согласование
  prepMin: 10,         // мин: подготовка файла к печати
  packMin: 5,          // мин: упаковка, выдача
  designMin: 90,       // мин: макет с нуля
  packEnvelope: 25,    // ₽: крафт-конверт / зип-пакет
  packBox: 80,         // ₽: фирменная коробка
  epsonPrice: 35000, epsonLife: 20000, epsonWatt: 20, epsonSec: 45,
  bambuPrice: 97000, bambuLife: 3000, bambuWatt: 150,
  paperSheet: 9, paperPerSheet: 10, paperInk: 4, paperCutSec: 6, paperDefect: 5,
  pvcBlank: 18, pvcInk: 3, pvcSec: 40, pvcDefect: 5,
  woodPiece: 120, woodDelivery: 300, woodSec: 20, woodDefect: 3,
  nfcChip: 30, nfcGrams: 10, nfcGramPrice: 2.2, nfcFlush: 3, nfcPrintMin: 20,
  nfcChanges: 30, nfcChangeWear: 0.3, nfcSec: 90, nfcDefect: 5
};

/* Описание полей справочника: [ключ, подпись, единица, подсказка] по группам */
const REF_SCHEMA = [
  ['Общее', [
    ['labor', 'Стоимость часа работы', '₽/ч', 'Сколько стоит ваш час (или час помощника)'],
    ['kwh', 'Тариф электроэнергии', '₽/кВт·ч', ''],
    ['taxP', 'НПД с физлиц', '%', ''],
    ['taxC', 'НПД с компаний и ИП', '%', ''],
    ['minOrder', 'Минимальная сумма заказа', '₽', 'Порог, если включён в расчёте'],
    ['rentMonth', 'Аренда в месяц', '₽', ''],
    ['ordersMonth', 'Заказов в месяц', 'шт', 'Аренда делится на это число']
  ]],
  ['Нормы времени на заказ', [
    ['talkMin', 'Переписка и согласование', 'мин', ''],
    ['prepMin', 'Подготовка файла к печати', 'мин', 'Раскладка, проверка вылетов'],
    ['packMin', 'Упаковка и выдача', 'мин', ''],
    ['designMin', 'Макет с нуля', 'мин', 'Если клиент заказал разработку'],
    ['packEnvelope', 'Конверт / зип-пакет', '₽', ''],
    ['packBox', 'Фирменная коробка', '₽', '']
  ]],
  ['Epson L8050 — бумага и ПВХ', [
    ['epsonPrice', 'Стоимость принтера', '₽', ''],
    ['epsonLife', 'Ресурс', 'проходов', 'Сколько листов/карт до замены'],
    ['epsonWatt', 'Мощность при печати', 'Вт', ''],
    ['epsonSec', 'Время одного прохода', 'сек', 'Лист A4 или одна карта']
  ]],
  ['Bambu Lab P2S Combo — NFC', [
    ['bambuPrice', 'Стоимость принтера', '₽', ''],
    ['bambuLife', 'Ресурс', 'мото-ч', 'До полной самоокупаемости'],
    ['bambuWatt', 'Мощность при печати', 'Вт', '']
  ]],
  ['Бумажные', [
    ['paperSheet', 'Лист картона A4 300 г/м²', '₽', ''],
    ['paperPerSheet', 'Визиток на листе', 'шт', ''],
    ['paperInk', 'Чернила на одну сторону листа', '₽', ''],
    ['paperCutSec', 'Резка / скругление', 'сек/шт', ''],
    ['paperDefect', 'Запас на брак', '%', '']
  ]],
  ['Пластик ПВХ', [
    ['pvcBlank', 'Заготовка карты', '₽', 'Белая ПВХ с покрытием для струйной печати'],
    ['pvcInk', 'Чернила на одну сторону', '₽', ''],
    ['pvcSec', 'Загрузка в лоток и снятие', 'сек/проход', ''],
    ['pvcDefect', 'Запас на брак', '%', '']
  ]],
  ['Фанера с гравировкой (подрядчик)', [
    ['woodPiece', 'Цена подрядчика', '₽/шт', ''],
    ['woodDelivery', 'Доставка от подрядчика', '₽/заказ', ''],
    ['woodSec', 'Приёмка, чистка', 'сек/шт', ''],
    ['woodDefect', 'Запас на брак', '%', '']
  ]],
  ['NFC-визитки', [
    ['nfcChip', 'Чип NTAG215/216', '₽', ''],
    ['nfcGrams', 'Пластик на изделие', 'г', ''],
    ['nfcGramPrice', 'Цена пластика', '₽/г', 'Катушка 1 кг / 1000'],
    ['nfcFlush', 'Отходы AMS на изделие', 'г', 'Очистка + башня / кол-во на столе'],
    ['nfcPrintMin', 'Время печати одного', 'мин', 'Время стола / кол-во на столе'],
    ['nfcChanges', 'Смен филамента на изделие', 'шт', ''],
    ['nfcChangeWear', 'Износ AMS за смену', '₽', 'Нож, мотор подачи'],
    ['nfcSec', 'Закладка чипа и прошивка', 'сек/шт', ''],
    ['nfcDefect', 'Запас на брак', '%', '']
  ]]
];

const KINDS = {
  paper: { short: 'Бумажные', term: '1–2 дня' },
  pvc:   { short: 'Пластик ПВХ', term: '1–3 дня' },
  wood:  { short: 'Фанера', term: '3–5 дней' },
  nfc:   { short: 'NFC', term: '3–5 дней' }
};
const PACKS = { pickup: 'Без упаковки', env: 'Конверт', box: 'Коробка' };
const MARKUPS = [50, 100, 150, 200, 300];

const ORDER_DEFAULT = {
  title: '', k: 'paper', q: 100, ts: false, u: false, d: false, ct: 'p',
  mode: 'list', mk: 100, disc: 0, dl: 0, pk: 'pickup', mo: true, note: ''
};

const REF_KEY = 'lablabel.master.ref.v1';
const NAME_KEY = 'lablabel.master.name';
const ORDER_KEY = 'lablabel.master.order.v1';   // последний открытый расчёт
const LOG_KEY = 'lablabel.master.log.v1';       // журнал отправленных расчётов
const LOG_MAX = 100;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
};
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const money = n => (Math.abs(n) < 100 && n % 1 ? n.toFixed(2).replace('.', ',') : rub(n)) + ' ₽';
const pct = n => Math.round(n) + '%';
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- упаковка состояния в ссылку: deflate-raw + base64url ---------- */
const packer = {
  b64(bytes) {
    let s = '';
    bytes.forEach(b => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  unb64(str) {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(s, c => c.charCodeAt(0));
  },
  async pack(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    if (!window.CompressionStream) return 'j' + this.b64(raw);
    const buf = await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
    return 'z' + this.b64(new Uint8Array(buf));
  },
  async unpack(str) {
    const bytes = this.unb64(str.slice(1));
    if (str[0] === 'j') return JSON.parse(new TextDecoder().decode(bytes));
    const txt = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    return JSON.parse(txt);
  }
};

/* ---------- расчёт ---------- */
function compute(o, R) {
  const p = PRICES[o.k];
  const q = Math.max(1, Math.round(o.q));
  const twoside = o.ts && p.twoside;
  const sides = twoside ? 2 : 1;
  const hourLabor = R.labor / 60;       // ₽ за минуту
  const lines = { mat: [], eq: [], labor: [], other: [] };
  let laborMin = 0;

  const epsonPass = R.epsonPrice / Math.max(1, R.epsonLife);
  const epsonKwh = passes => passes * R.epsonSec / 3600 * R.epsonWatt / 1000 * R.kwh;

  if (o.k === 'paper') {
    const sheets = Math.ceil(q * (1 + R.paperDefect / 100) / Math.max(1, R.paperPerSheet));
    const passes = sheets * sides;
    lines.mat.push([`Картон: ${sheets} ${plural(sheets, 'лист', 'листа', 'листов')} × ${money(R.paperSheet)}`, sheets * R.paperSheet]);
    lines.mat.push([`Чернила: ${passes} ${plural(passes, 'проход', 'прохода', 'проходов')}`, passes * R.paperInk]);
    lines.eq.push([`Износ Epson (${passes} ${plural(passes, 'проход', 'прохода', 'проходов')})`, passes * epsonPass]);
    lines.eq.push(['Электроэнергия', epsonKwh(passes)]);
    const cut = q * R.paperCutSec / 60;
    lines.labor.push([`Резка, скругление (${Math.round(cut)} мин)`, cut * hourLabor]);
    laborMin += cut;
  } else if (o.k === 'pvc') {
    const cards = Math.ceil(q * (1 + R.pvcDefect / 100));
    const passes = cards * sides;
    lines.mat.push([`Заготовки ПВХ: ${cards} × ${money(R.pvcBlank)}`, cards * R.pvcBlank]);
    lines.mat.push([`Чернила: ${passes} ${plural(passes, 'сторона', 'стороны', 'сторон')}`, passes * R.pvcInk]);
    lines.eq.push([`Износ Epson (${passes} ${plural(passes, 'проход', 'прохода', 'проходов')})`, passes * epsonPass]);
    lines.eq.push(['Электроэнергия', epsonKwh(passes)]);
    const load = passes * R.pvcSec / 60;
    lines.labor.push([`Загрузка карт в лоток (${Math.round(load)} мин)`, load * hourLabor]);
    laborMin += load;
  } else if (o.k === 'wood') {
    const pcs = Math.ceil(q * (1 + R.woodDefect / 100));
    lines.mat.push([`Гравировка у подрядчика: ${pcs} × ${money(R.woodPiece)}`, pcs * R.woodPiece]);
    if (R.woodDelivery) lines.mat.push(['Доставка от подрядчика', R.woodDelivery]);
    const t = q * R.woodSec / 60;
    lines.labor.push([`Приёмка и чистка (${Math.round(t)} мин)`, t * hourLabor]);
    laborMin += t;
  } else {
    const pcs = Math.ceil(q * (1 + R.nfcDefect / 100));
    const grams = pcs * (R.nfcGrams + R.nfcFlush);
    const hours = pcs * R.nfcPrintMin / 60;
    lines.mat.push([`Чипы NFC: ${pcs} × ${money(R.nfcChip)}`, pcs * R.nfcChip]);
    lines.mat.push([`Пластик: ${rub(grams)} г (с отходами AMS)`, grams * R.nfcGramPrice]);
    lines.eq.push([`Износ Bambu (${hours.toFixed(1).replace('.', ',')} ч)`, hours * R.bambuPrice / Math.max(1, R.bambuLife)]);
    lines.eq.push([`Износ AMS (${rub(pcs * R.nfcChanges)} смен)`, pcs * R.nfcChanges * R.nfcChangeWear]);
    lines.eq.push(['Электроэнергия', hours * R.bambuWatt / 1000 * R.kwh]);
    const t = q * R.nfcSec / 60;
    lines.labor.push([`Закладка чипов и прошивка (${Math.round(t)} мин)`, t * hourLabor]);
    laborMin += t;
  }

  const orderMin = R.talkMin + R.prepMin + R.packMin;
  lines.labor.push([`Приём, подготовка, выдача (${Math.round(orderMin)} мин)`, orderMin * hourLabor]);
  laborMin += orderMin;
  if (o.d) {
    lines.labor.push([`Макет с нуля (${Math.round(R.designMin)} мин)`, R.designMin * hourLabor]);
    laborMin += R.designMin;
  }

  const rent = R.rentMonth / Math.max(1, R.ordersMonth);
  if (rent) lines.other.push(['Аренда (доля на заказ)', rent]);
  const pack = o.pk === 'env' ? R.packEnvelope : o.pk === 'box' ? R.packBox : 0;
  if (pack) lines.other.push([`Упаковка: ${PACKS[o.pk].toLowerCase()}`, pack]);
  const delivery = Math.max(0, num(o.dl));
  if (delivery) lines.other.push(['Доставка клиенту', delivery]);

  const sum = arr => arr.reduce((a, l) => a + l[1], 0);
  const g = { mat: sum(lines.mat), eq: sum(lines.eq), labor: sum(lines.labor), other: sum(lines.other) };
  const cost = g.mat + g.eq + g.labor + g.other;
  const coreCost = cost - pack - delivery;   // то, на что начисляется наценка
  const taxRate = (o.ct === 'c' ? R.taxC : R.taxP) / 100;

  /* цена: товарная часть → скидка → минимальный чек → упаковка и доставка по себестоимости */
  const client = [];
  let goods;
  const unit = p.tiers.find(t => q < t[0])[1];
  const listBase = unit * q;
  const listTwo = twoside ? listBase * TWOSIDE_K : 0;
  const listUrg = o.u ? (listBase + listTwo) * URGENT_K : 0;
  const listDesign = o.d ? DESIGN_FEE : 0;
  const listGoods = listBase + listTwo + listUrg + listDesign;

  if (o.mode === 'list') {
    goods = listGoods;
    client.push([`${rub(q)} шт × ${money(unit)}`, listBase]);
    if (listTwo) client.push(['Двусторонняя печать', listTwo]);
    if (listUrg) client.push(['Срочно, за 1 рабочий день', listUrg]);
    if (listDesign) client.push(['Разработка макета', listDesign]);
  } else {
    const base = coreCost * (1 + Math.max(0, num(o.mk)) / 100) / (1 - taxRate);
    const urg = o.u ? base * URGENT_K : 0;
    goods = base + urg;
    const extras = [twoside && 'двусторонние', o.d && 'с разработкой макета'].filter(Boolean).join(', ');
    client.push([`${rub(q)} шт${extras ? ', ' + extras : ''}`, base]);
    if (urg) client.push(['Срочно, за 1 рабочий день', urg]);
  }

  const disc = goods * Math.min(90, Math.max(0, num(o.disc))) / 100;
  if (disc) client.push([`Скидка ${num(o.disc)}%`, -disc]);
  let subtotal = goods - disc;
  const topUp = o.mo && subtotal + pack + delivery < R.minOrder ? R.minOrder - subtotal - pack - delivery : 0;
  if (topUp) client.push(['До минимальной суммы заказа', topUp]);
  if (pack) client.push([`Упаковка: ${PACKS[o.pk].toLowerCase()}`, pack]);
  if (delivery) client.push(['Доставка', delivery]);

  const total = Math.round(subtotal + topUp + pack + delivery);
  const tax = total * taxRate;
  const profit = total - cost - tax;

  return {
    q, unit, twoside, lines, g, cost, tax, taxRate, profit, total, client, laborMin,
    per: total / q,
    listTotal: Math.round(listGoods),
    selfIncome: profit + g.labor,
    ownerIncome: profit + g.eq
  };
}

/* ---------- приложение ---------- */
(function master() {
  const form = $('#mForm');
  if (!form) return;
  const F = form.elements;

  let order = { ...ORDER_DEFAULT };
  let ref = loadRef();
  let refFromLink = null;      // справочник, пришедший в ссылке
  let last = null;

  function loadRef() {
    try { return { ...REF_DEFAULT, ...JSON.parse(store.get(REF_KEY) || '{}') }; }
    catch (_) { return { ...REF_DEFAULT }; }
  }
  const R = () => refFromLink || ref;

  /* --- статичная разметка, зависящая от данных --- */
  $('#kindOpts').innerHTML = Object.entries(KINDS).map(([k, v]) =>
    `<label class="opt"><input type="radio" name="k" value="${k}"><span><b>${v.short}</b><i>от ${rub(PRICES[k].tiers[0][1])} ₽</i></span></label>`
  ).join('');
  $('#mkChips').innerHTML = MARKUPS.map(m => `<button type="button" data-mk="${m}">+${m}%</button>`).join('');
  $('#pkSeg').innerHTML = Object.entries(PACKS).map(([k, v]) => `<button type="button" data-v="${k}">${v}</button>`).join('');
  $('#dHint').textContent = `+${rub(DESIGN_FEE)} ₽ по прайсу`;
  $('#tsHint').textContent = `+${Math.round(TWOSIDE_K * 100)}% к цене`;

  /* --- форма ⇄ состояние --- */
  function toForm() {
    F.title.value = order.title;
    form.querySelector(`input[name="k"][value="${order.k}"]`).checked = true;
    F.q.value = order.q;
    F.ts.checked = order.ts; F.u.checked = order.u; F.d.checked = order.d; F.mo.checked = order.mo;
    F.mk.value = order.mk; F.disc.value = order.disc || ''; F.dl.value = order.dl || '';
    $('#mNote').value = order.note;
    segSync();
  }
  function fromForm() {
    order.title = F.title.value.trim();
    order.k = form.querySelector('input[name="k"]:checked').value;
    order.q = Math.max(1, Math.round(num(F.q.value)) || 1);
    order.ts = F.ts.checked; order.u = F.u.checked; order.d = F.d.checked; order.mo = F.mo.checked;
    order.mk = Math.max(0, num(F.mk.value));
    order.disc = num(F.disc.value); order.dl = num(F.dl.value);
    order.note = $('#mNote').value.trim();
  }
  function segSync() {
    $$('.mseg').forEach(seg => {
      const v = order[seg.dataset.name];
      $$('button', seg).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    });
    $$('#mkChips button').forEach(b => b.setAttribute('aria-pressed', String(num(b.dataset.mk) === order.mk)));
  }

  /* --- вывод --- */
  function render() {
    const r = compute(order, R());
    last = r;
    const p = PRICES[order.k];

    $('#qtyChips').innerHTML = p.steps.slice(0, 8).map(s =>
      `<button type="button" data-q="${s}" aria-pressed="${s === order.q}">${rub(s)}</button>`).join('');
    $('#tsRow').hidden = !p.twoside;
    $('#markupFld').hidden = order.mode !== 'markup';
    $('#mkVal').textContent = '+' + order.mk + '%';
    $('#moHint').textContent = `${rub(R().minOrder)} ₽ — задаётся в справочнике`;
    $('#modeHint').textContent = order.mode === 'list'
      ? `Как в калькуляторе на сайте: ${money(r.unit)} за штуку на тираже ${rub(r.q)} шт.`
      : `Цена = себестоимость × (1 + наценка), налог НПД заложен сверху. По прайсу сайта было бы ${rub(r.listTotal)} ₽.`;

    $('#oTotal').textContent = rub(r.total);
    $('#oCost').textContent = money(r.cost);
    $('#oCostNote').textContent = `${money(r.cost / r.q)} за штуку`;
    $('#oTax').textContent = money(r.tax);
    $('#oTaxNote').textContent = `${Math.round(r.taxRate * 100)}% с ${order.ct === 'c' ? 'компании' : 'физлица'}`;
    $('#oProfit').textContent = money(r.profit);
    $('#oProfitNote').textContent = r.total ? `${pct(r.profit / r.total * 100)} от чека · ×${(r.total / Math.max(1, r.cost)).toFixed(1).replace('.', ',')} к себестоимости` : '';
    $('#oPer').textContent = `${money(r.per)} за штуку · ${rub(r.q)} шт · ${order.u ? '1 рабочий день' : KINDS[order.k].term}`;
    $('#oSelf').textContent = money(r.selfIncome);
    const h = Math.floor(r.laborMin / 60), m = Math.round(r.laborMin % 60);
    $('#oSelfNote').textContent = `≈ ${h ? h + ' ч ' : ''}${m} мин работы · ${money(r.selfIncome / Math.max(1 / 60, r.laborMin / 60))}/ч`;
    $('#oOwner').textContent = money(r.ownerIncome);
    $('#oOwnerNote').textContent = `прибыль + износ оборудования, труд ${money(r.g.labor)} уходит помощнику`;

    const warn = $('#oWarn');
    if (r.profit < 0) { warn.hidden = false; warn.textContent = `Заказ в минус на ${money(-r.profit)} — поднимите цену или тираж.`; }
    else if (order.mode === 'markup' && r.total < r.listTotal * 0.8) { warn.hidden = false; warn.textContent = `Дешевле прайса сайта на ${pct((1 - r.total / r.listTotal) * 100)} — клиент увидит другую цену на сайте.`; }
    else warn.hidden = true;

    const GROUPS = [['mat', 'Материалы', 'var(--wood)'], ['eq', 'Оборудование и энергия', 'var(--cyan)'], ['labor', 'Труд', 'var(--accent)'], ['other', 'Аренда, упаковка, доставка', 'var(--mute)']];
    $('#costBar').innerHTML = GROUPS.map(([k, , c]) => `<i style="flex:${r.g[k]};background:${c}"></i>`).join('');
    $('#costGroups').innerHTML = GROUPS.filter(([k]) => r.lines[k].length).map(([k, t, c]) => `
      <div class="mgrp">
        <p class="mgrp__h"><i style="background:${c}"></i>${t}<span>${pct(r.g[k] / Math.max(1, r.cost) * 100)}</span><b>${money(r.g[k])}</b></p>
        <ul>${r.lines[k].map(l => `<li><span>${esc(l[0])}</span><b>${money(l[1])}</b></li>`).join('')}</ul>
      </div>`).join('') +
      `<p class="mgrp__total"><span>Итого себестоимость</span><b>${money(r.cost)}</b></p>`;

    $('#msgPreview').hidden = true;
  }

  const saveOrder = () => store.set(ORDER_KEY, JSON.stringify(order));
  function update() { fromForm(); segSync(); render(); saveOrder(); }

  /* --- события формы --- */
  form.addEventListener('input', e => { if (e.target.name !== 'k') update(); });
  form.addEventListener('change', e => {
    if (e.target.name === 'k') {
      order.k = e.target.value;
      order.q = PRICES[order.k].steps[0];
      F.q.value = order.q;
    }
    update();
  });
  $('#mNote').addEventListener('input', update);
  form.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.q) { F.q.value = b.dataset.q; }
    else if (b.dataset.step) {
      const steps = PRICES[order.k].steps;
      const cur = order.q, dir = num(b.dataset.step);
      const next = dir > 0 ? steps.find(s => s > cur) : [...steps].reverse().find(s => s < cur);
      F.q.value = next || Math.max(1, cur + dir);
    }
    else if (b.dataset.mk) { F.mk.value = b.dataset.mk; }
    else if (b.dataset.v) { order[b.closest('.mseg').dataset.name] = b.dataset.v; }
    else return;
    update();
  });

  /* --- вкладки --- */
  $$('.mtabs button').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.tab;
    $$('.mtabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    $('#tab-calc').hidden = t !== 'calc';
    $('#tab-log').hidden = t !== 'log';
    $('#tab-ref').hidden = t !== 'ref';
    if (t === 'ref') renderRef();
    else if (t === 'log') renderLog();
    else render();
  }));

  $('#btnNew').addEventListener('click', () => {
    order = { ...ORDER_DEFAULT };
    refFromLink = null;
    $('#refBanner').hidden = true;
    $('#copyFallback').hidden = true;
    history.replaceState(null, '', location.pathname);
    toForm(); render(); saveOrder();
    $$('.mtabs button').find(b => b.dataset.tab === 'calc').click();
    toast('Форма очищена — считаем новый заказ.');
  });

  /* --- ссылки, КП, мессенджер --- */
  const nameInp = $('#mName');
  nameInp.value = store.get(NAME_KEY) || '';
  nameInp.addEventListener('input', () => store.set(NAME_KEY, nameInp.value.trim()));

  function toast(text) {
    const t = $('#toast');
    t.textContent = text;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.textContent = ''; }, 3500);
  }
  /* Копируем в буфер; если браузер не дал — показываем поле для ручного копирования */
  async function copy(text, okMsg) {
    const fb = $('#copyFallback');
    try {
      await navigator.clipboard.writeText(text);
      fb.hidden = true;
      toast(okMsg);
    } catch (_) {
      $('#copyText').value = text;
      fb.hidden = false;
      $('#copyText').select();
      toast('Буфер недоступен — текст ниже, скопируйте вручную.');
    }
  }

  /* В КП уходят только цены для клиента — без себестоимости и справочника */
  function kpData() {
    const r = last;
    return {
      k: order.k, q: r.q, t: r.total, u: order.u ? 1 : 0,
      rows: r.client.map(([l, v]) => [l, Math.round(v)]),
      m: nameInp.value.trim(), n: order.note,
      dt: new Date().toISOString().slice(0, 10)
    };
  }
  async function kpUrl() {
    const packed = await packer.pack(kpData());
    logPut(packed);
    return `${location.origin}/kp.html?c=${packed}`;
  }

  $('#btnKp').addEventListener('click', async () => { window.open(await kpUrl(), '_blank', 'noopener'); });
  $('#btnKpLink').addEventListener('click', async () => copy(await kpUrl(), 'Ссылка на КП скопирована — её можно отправить клиенту.'));

  $('#btnMsg').addEventListener('click', async () => {
    const r = last;
    const title = { paper: 'Бумажные визитки', pvc: 'Пластиковые ПВХ-визитки', wood: 'Визитки из фанеры с гравировкой', nfc: 'NFC-визитки' }[order.k];
    const txt = [
      `Расчёт LABLABEL — ${title}, ${rub(r.q)} шт`,
      ...r.client.map(([l, v]) => `• ${l} — ${v < 0 ? '−' : ''}${rub(Math.abs(v))} ₽`),
      `Итого: ${rub(r.total)} ₽ (${money(r.per)} за шт)`,
      `Срок: ${order.u ? '1 рабочий день' : KINDS[order.k].term}`,
      order.note ? `Комментарий: ${order.note}` : '',
      `Подробно: ${await kpUrl()}`,
      nameInp.value.trim() ? `— ${nameInp.value.trim()}` : '— LABLABEL, lablabel.ru'
    ].filter(Boolean).join('\n');
    const pre = $('#msgPreview');
    pre.textContent = txt;
    pre.hidden = false;
    copy(txt, 'Текст скопирован — вставьте в Telegram или WhatsApp.');
  });

  $('#btnSelfLink').addEventListener('click', async () => {
    const s = await packer.pack({ o: order, r: R() });
    const url = `${location.origin}${location.pathname}?s=${s}`;
    history.replaceState(null, '', `?s=${s}`);
    copy(url, 'Ссылка на расчёт скопирована — откроется с теми же цифрами и справочником.');
  });

  $('#refUseMine').addEventListener('click', () => {
    refFromLink = null;
    $('#refBanner').hidden = true;
    render();
  });

  /* --- журнал расчётов --- */
  function logLoad() {
    try { const a = JSON.parse(store.get(LOG_KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (_) { return []; }
  }
  function logWrite(list) {
    store.set(LOG_KEY, JSON.stringify(list.slice(0, LOG_MAX)));
    const n = list.length;
    const badge = $('#logCount');
    badge.hidden = !n;
    badge.textContent = n;
  }
  /* Один заказ — одна запись: повторная отправка того же расчёта обновляет её, а не плодит дубли */
  function logPut(packed) {
    const r = last;
    const key = JSON.stringify(order);
    const list = logLoad().filter(e => e.key !== key);
    list.unshift({
      key, ts: Date.now(), c: packed,
      title: order.title, k: order.k, q: r.q,
      total: r.total, cost: Math.round(r.cost), profit: Math.round(r.profit),
      o: { ...order }
    });
    logWrite(list);
    if (!$('#tab-log').hidden) renderLog();
  }
  function renderLog() {
    const list = logLoad();
    const box = $('#logList');
    if (!list.length) {
      box.innerHTML = '<p class="mempty">Пока пусто. Посчитайте заказ и нажмите «Открыть КП», «Ссылка на КП» или «Текст в мессенджер» — расчёт попадёт сюда.</p>';
      return;
    }
    const money0 = n => rub(n) + ' ₽';
    box.innerHTML = list.map(e => {
      const dt = new Date(e.ts);
      const when = dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ', ' +
                   dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      return `
      <article class="mlog__row">
        <div class="mlog__main">
          <p class="mlog__t">${esc(e.title || 'Без названия')}</p>
          <p class="mlog__s">${when} · ${KINDS[e.k] ? KINDS[e.k].short : e.k} · ${rub(e.q)} шт</p>
        </div>
        <div class="mlog__nums">
          <b>${money0(e.total)}</b>
          <i>прибыль ${money0(e.profit)}</i>
        </div>
        <div class="mlog__act">
          <a class="btn btn--ghost btn--sm" href="/kp.html?c=${e.c}" target="_blank" rel="noopener">КП</a>
          <button type="button" class="btn btn--ghost btn--sm" data-repeat="${e.ts}">Повторить</button>
          <button type="button" class="mlink mlink--del" data-del="${e.ts}" aria-label="Удалить запись">✕</button>
        </div>
      </article>`;
    }).join('');
  }
  $('#logList').addEventListener('click', e => {
    const rep = e.target.closest('[data-repeat]');
    const del = e.target.closest('[data-del]');
    if (rep) {
      const rec = logLoad().find(x => String(x.ts) === rep.dataset.repeat);
      if (!rec) return;
      order = { ...ORDER_DEFAULT, ...rec.o };
      toForm(); render(); saveOrder();
      $$('.mtabs button').find(b => b.dataset.tab === 'calc').click();
      toast('Расчёт загружен — можно править и пересчитывать.');
    } else if (del) {
      logWrite(logLoad().filter(x => String(x.ts) !== del.dataset.del));
      renderLog();
    }
  });
  $('#logClear').addEventListener('click', () => {
    if (!logLoad().length || !confirm('Удалить все записи журнала? Отменить будет нельзя.')) return;
    logWrite([]);
    renderLog();
  });
  $('#logCsv').addEventListener('click', () => {
    const list = logLoad();
    if (!list.length) return toast('Журнал пуст — выгружать нечего.');
    const head = ['Дата', 'Клиент / заказ', 'Вид', 'Тираж', 'Сумма, ₽', 'Себестоимость, ₽', 'Прибыль, ₽'];
    const rows = list.map(e => [
      new Date(e.ts).toLocaleString('ru-RU'),
      (e.title || '').replace(/[;\r\n]/g, ' '),
      KINDS[e.k] ? KINDS[e.k].short : e.k,
      e.q, e.total, e.cost, e.profit
    ]);
    const csv = '﻿' + [head, ...rows].map(r => r.join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `lablabel-zhurnal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  /* --- справочник --- */
  function renderRef() {
    const cur = R();
    $('#refForm').innerHTML = REF_SCHEMA.map(([title, fields]) => `
      <fieldset class="mcard mref__grp">
        <legend class="mcard__h">${title}</legend>
        ${fields.map(([k, label, unit, hint]) => `
          <label class="mfield">
            <span class="mfield__l">${label}${hint ? `<i>${hint}</i>` : ''}</span>
            <span class="mfield__v"><input type="number" step="any" min="0" data-ref="${k}" value="${cur[k]}"><em>${unit}</em></span>
          </label>`).join('')}
      </fieldset>`).join('');
  }
  $('#refForm').addEventListener('input', e => {
    const k = e.target.dataset.ref;
    if (!k) return;
    if (refFromLink) { ref = { ...refFromLink }; refFromLink = null; $('#refBanner').hidden = true; }
    ref[k] = num(e.target.value);
    store.set(REF_KEY, JSON.stringify(ref));
  });
  $('#refReset').addEventListener('click', () => {
    if (!confirm('Вернуть все значения справочника к стандартным?')) return;
    ref = { ...REF_DEFAULT }; refFromLink = null;
    store.set(REF_KEY, JSON.stringify(ref));
    renderRef();
  });
  $('#refExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(R(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lablabel-spravochnik-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#refImport').addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const clean = {};
      Object.keys(REF_DEFAULT).forEach(k => { if (Number.isFinite(data[k])) clean[k] = data[k]; });
      if (!Object.keys(clean).length) throw new Error('empty');
      ref = { ...REF_DEFAULT, ...clean }; refFromLink = null;
      store.set(REF_KEY, JSON.stringify(ref));
      renderRef();
      alert(`Справочник загружен: ${Object.keys(clean).length} параметров.`);
    } catch (_) { alert('Это не похоже на файл справочника LABLABEL.'); }
  });

  /* --- старт: ?s= из ссылки, иначе последний расчёт из браузера --- */
  (async function init() {
    const s = new URLSearchParams(location.search).get('s');
    if (s) {
      try {
        const data = await packer.unpack(s);
        order = { ...ORDER_DEFAULT, ...data.o };
        if (!PRICES[order.k]) order.k = 'paper';
        if (data.r) { refFromLink = { ...REF_DEFAULT, ...data.r }; $('#refBanner').hidden = false; }
      } catch (_) { toast('Ссылка повреждена — открыт пустой расчёт.'); }
    } else {
      try {
        const saved = JSON.parse(store.get(ORDER_KEY) || 'null');
        if (saved && PRICES[saved.k]) order = { ...ORDER_DEFAULT, ...saved };
      } catch (_) {}
    }
    toForm();
    render();
    const n = logLoad().length;
    $('#logCount').hidden = !n;
    $('#logCount').textContent = n;
  })();
})();
