/**
 * Yandex Cloud Function: приём заявок с lablabel.ru → Telegram.
 *
 * Переменные окружения функции:
 *   TG_TOKEN   — токен бота от @BotFather
 *   TG_CHAT    — ваш chat_id (узнать: напишите боту и откройте
 *                https://api.telegram.org/bot<TOKEN>/getUpdates)
 *   ORIGIN     — https://lablabel.ru (для CORS)
 *
 * Точка входа: index.handler
 */

const ORIGIN = process.env.ORIGIN || 'https://lablabel.ru';

const cors = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const reply = (code, body) => ({
  statusCode: code,
  headers: { ...cors, 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .slice(0, 1500);

// примитивная защита от спама: не чаще одной заявки с IP в 20 секунд,
// пока экземпляр функции жив
const seen = new Map();

exports.handler = async (event) => {
  const method = (event.httpMethod || event.requestContext?.http?.method || '').toUpperCase();
  if (method === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (method !== 'POST') return reply(405, { error: 'method not allowed' });

  let data;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : (event.body || '{}');
    data = JSON.parse(raw);
  } catch (_) {
    return reply(400, { error: 'bad json' });
  }

  // honeypot: если бот заполнил скрытое поле — молча делаем вид, что всё ок
  if (data.company) return reply(200, { ok: true });

  if (!data.name || !data.contact) return reply(400, { error: 'name and contact required' });

  const ip = event.headers?.['x-forwarded-for'] || event.headers?.['X-Forwarded-For'] || 'unknown';
  const now = Date.now();
  if (seen.get(ip) && now - seen.get(ip) < 20000) return reply(429, { error: 'too many requests' });
  seen.set(ip, now);

  const token = process.env.TG_TOKEN;
  const chat = process.env.TG_CHAT;
  if (!token || !chat) {
    console.error('TG_TOKEN or TG_CHAT is not set');
    return reply(500, { error: 'not configured' });
  }

  const text =
    '<b>Заявка с lablabel.ru</b>\n\n' +
    `<b>Имя:</b> ${esc(data.name)}\n` +
    `<b>Контакт:</b> ${esc(data.contact)}\n` +
    `<b>Вид:</b> ${esc(data.kind) || '—'}\n` +
    `<b>Тираж:</b> ${esc(data.qty) || '—'}\n` +
    (data.comment ? `\n${esc(data.comment)}\n` : '') +
    `\n<i>${esc(data.page)}</i>`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true })
  });

  if (!res.ok) {
    console.error('telegram error', res.status, await res.text());
    return reply(502, { error: 'telegram unavailable' });
  }

  return reply(200, { ok: true });
};
