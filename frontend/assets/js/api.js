// Base URL of the API Gateway deployed in infra/. Set this after `terraform apply`
// (see docs/DEPLOY_CHECKLIST.md step "Frontend config"), or override at runtime via
// ?api=https://... for local testing against a different backend.
const API_BASE = (() => {
  const override = new URLSearchParams(location.search).get("api");
  if (override) {
    localStorage.setItem("lablabel_api_base", override);
    return override;
  }
  return localStorage.getItem("lablabel_api_base") || "https://REPLACE-ME.apigw.yandexcloud.net";
})();

function authToken() {
  return localStorage.getItem("lablabel_session") || null;
}

function setAuthToken(token) {
  if (token) localStorage.setItem("lablabel_session", token);
  else localStorage.removeItem("lablabel_session");
}

async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = authToken();
    if (!token) throw new Error("NOT_AUTHENTICATED");
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* empty body */ }
  if (!res.ok) {
    const message = (data && data.error) || `Ошибка запроса (${res.status})`;
    throw new Error(message);
  }
  return data;
}
