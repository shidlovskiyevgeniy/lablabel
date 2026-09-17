// Yandex Cloud Function response shape expected by API Gateway's function
// integration. ALLOWED_ORIGIN should be the site origin (https://lablabel.ru)
// in production; falls back to * for local/dev testing.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: JSON.stringify(payload),
  };
}

function ok(payload) {
  return json(200, payload);
}

function error(statusCode, message) {
  return json(statusCode, { error: message });
}

function isPreflight(event) {
  return (event.httpMethod || "").toUpperCase() === "OPTIONS";
}

module.exports = { json, ok, error, isPreflight };
