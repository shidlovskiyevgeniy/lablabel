const { ok, error, isPreflight } = require("../../lib/cors");
const { getOrder, setOrderPayment } = require("../../lib/ydb");
const { createPayment } = require("../../lib/ykassa");

const SITE_URL = process.env.SITE_URL || "https://lablabel.ru";

// POST /orders/{orderId}/pay — creates a YooKassa payment for an existing
// order and returns the hosted confirmation page URL to redirect the buyer
// to. Chек (receipt) is issued manually afterwards via "Мой налог" per the
// self-employed (НПД) MVP flow — see docs/DEPLOY_CHECKLIST.md — so no YooKassa
// receipt payload is sent here; that can be wired up later if volume grows.
module.exports.handler = async (event) => {
  if (isPreflight(event)) return ok({});
  try {
    const orderId = event.pathParams && event.pathParams.orderId;
    if (!orderId) return error(400, "orderId обязателен");

    const order = await getOrder(orderId);
    if (!order) return error(404, "Заказ не найден");
    if (order.status !== "new") return error(400, "Заказ уже оплачен или отменён");

    const payment = await createPayment({
      orderId: order.id,
      amountRub: order.total,
      description: `Заказ lablabel.ru #${order.id.slice(0, 8)}`,
      returnUrl: `${SITE_URL}/order-success.html`,
    });

    await setOrderPayment(order.id, payment.id);

    return ok({ confirmationUrl: payment.confirmation.confirmation_url });
  } catch (err) {
    return error(500, err.message);
  }
};
