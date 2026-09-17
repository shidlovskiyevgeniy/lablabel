const { ok, error, isPreflight } = require("../../lib/cors");
const { getAuthCode, incrementAuthAttempts, deleteAuthCode, getOrCreateUser } = require("../../lib/ydb");
const { issueSession } = require("../../lib/jwt");

const MAX_ATTEMPTS = 5;

// POST /auth/verify-code { email, code } — checks the stored one-time code
// and, on success, issues a signed session JWT the frontend stores and sends
// as a Bearer token to authenticated endpoints (see lib/jwt.js).
module.exports.handler = async (event) => {
  if (isPreflight(event)) return ok({});
  try {
    const body = JSON.parse(event.body || "{}");
    const email = (body.email || "").trim().toLowerCase();
    const code = (body.code || "").trim();
    if (!email || !code) return error(400, "email и code обязательны");

    const record = await getAuthCode(email);
    if (!record) return error(400, "Код не найден или уже использован");
    if (record.attempts >= MAX_ATTEMPTS) {
      await deleteAuthCode(email);
      return error(429, "Слишком много попыток, запросите новый код");
    }
    if (Date.now() > record.expires_at) {
      await deleteAuthCode(email);
      return error(400, "Код истёк, запросите новый");
    }
    if (record.code !== code) {
      await incrementAuthAttempts(email, (record.attempts || 0) + 1);
      return error(400, "Неверный код");
    }

    await deleteAuthCode(email);
    const user = await getOrCreateUser(email);
    const token = issueSession(user.id, email);
    return ok({ token });
  } catch (err) {
    return error(500, err.message);
  }
};
