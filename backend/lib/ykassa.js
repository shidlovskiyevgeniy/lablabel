const fetch = require("node-fetch");

const API_BASE = "https://api.yookassa.ru/v3";

function authHeader() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) throw new Error("YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY not configured");
  return "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64");
}

// Creates a YooKassa payment for an order and returns the hosted confirmation
// page URL the buyer is redirected to. idempotenceKey must be stable per
// order (we use the order id) so retries never double-charge.
async function createPayment({ orderId, amountRub, description, returnUrl, receiptEmail, receiptItems }) {
  const res = await fetch(`${API_BASE}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotence-Key": orderId,
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount: { value: amountRub.toFixed(2), currency: "RUB" },
      capture: true,
      confirmation: { type: "redirect", return_url: returnUrl },
      description,
      metadata: { orderId },
      // Receipt is required for self-employed (НПД) sellers using YooKassa's
      // built-in fiscalization/"Мой налог" integration, if enabled on the shop.
      receipt: receiptEmail
        ? {
            customer: { email: receiptEmail },
            items: receiptItems,
          }
        : undefined,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.description || "YooKassa payment creation failed");
  return data; // { id, status, confirmation: { confirmation_url }, ... }
}

// Re-fetch payment status directly from YooKassa instead of trusting the
// webhook body verbatim — mitigates spoofed webhook calls.
async function getPayment(paymentId) {
  const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.description || "Failed to fetch payment");
  return data;
}

module.exports = { createPayment, getPayment };
