const { ok, error, isPreflight } = require("../../lib/cors");
const { getPayment } = require("../../lib/ykassa");
const { getOrderByPaymentId, setOrderStatus } = require("../../lib/ydb");
const { sendOrderPaidNotice } = require("../../lib/mailer");

const SELLER_EMAIL = process.env.SELLER_NOTIFY_EMAIL || null;

// POST /payments/webhook — called by YooKassa on payment status changes.
// We do NOT trust the webhook body's amount/status directly (a webhook URL
// is public and could be spoofed); instead we re-fetch the payment by id
// from YooKassa's API using our secret key and act on that authoritative
// result. See https://yookassa.ru/developers/using-api/webhooks for the
// recommended IP-allowlist hardening on top of this.
module.exports.handler = async (event) => {
  if (isPreflight(event)) return ok({});
  try {
    const body = JSON.parse(event.body || "{}");
    const paymentId = body.object && body.object.id;
    if (!paymentId) return error(400, "Некорректное уведомление");

    const payment = await getPayment(paymentId);
    if (payment.status !== "succeeded") {
      // Ignore other statuses (pending, canceled, waiting_for_capture) —
      // just acknowledge so YooKassa stops retrying.
      return ok({ received: true });
    }

    const order = await getOrderByPaymentId(paymentId);
    if (!order) return error(404, "Заказ для платежа не найден");

    if (order.status !== "paid") {
      await setOrderStatus(order.id, "paid");
      await sendOrderPaidNotice({ toBuyer: order.email, toSeller: SELLER_EMAIL, order });
    }

    return ok({ received: true });
  } catch (err) {
    return error(500, err.message);
  }
};
