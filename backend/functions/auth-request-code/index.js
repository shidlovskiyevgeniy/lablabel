const { ok, error, isPreflight } = require("../../lib/cors");
const { saveAuthCode } = require("../../lib/ydb");
const { sendAuthCode } = require("../../lib/mailer");

const CODE_TTL_MS = 10 * 60 * 1000;

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /auth/request-code { email } — generates a 6-digit one-time code,
// stores it (10 min TTL) and emails it. Always returns 200 regardless of
// whether the address is real, to avoid leaking which emails have accounts.
module.exports.handler = async (event) => {
  if (isPreflight(event)) return ok({});
  try {
    const body = JSON.parse(event.body || "{}");
    const email = (body.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) return error(400, "Некорректный e-mail");

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await saveAuthCode(email, code, Date.now() + CODE_TTL_MS);
    await sendAuthCode(email, code);

    return ok({ sent: true });
  } catch (err) {
    return error(500, err.message);
  }
};
