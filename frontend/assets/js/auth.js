// Passwordless auth: user requests a one-time 6-digit code by email, then
// verifies it. On success the backend issues a signed session token (JWT)
// that is stored in localStorage and sent as a Bearer token to /orders/me.

document.addEventListener("DOMContentLoaded", () => {
  const requestForm = document.getElementById("auth-request-form");
  const verifyForm = document.getElementById("auth-verify-form");
  if (!requestForm || !verifyForm) return;

  const errorBox = document.getElementById("auth-error");
  let pendingEmail = null;

  requestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.style.display = "none";
    const email = new FormData(requestForm).get("email");
    const btn = requestForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await api("/auth/request-code", { method: "POST", body: { email } });
      pendingEmail = email;
      requestForm.style.display = "none";
      verifyForm.style.display = "";
      document.getElementById("verify-email-label").textContent = email;
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = "block";
    } finally {
      btn.disabled = false;
    }
  });

  verifyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.style.display = "none";
    const code = new FormData(verifyForm).get("code");
    const btn = verifyForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const { token } = await api("/auth/verify-code", { method: "POST", body: { email: pendingEmail, code } });
      setAuthToken(token);
      location.href = "cabinet.html";
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = "block";
    } finally {
      btn.disabled = false;
    }
  });
});
