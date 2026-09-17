const { ok, error, isPreflight } = require("../../lib/cors");
const { getProduct } = require("../../lib/catalog");
const { createOrder } = require("../../lib/ydb");
const { userFromEvent } = require("../../lib/jwt");

const DELIVERY_METHODS = new Set(["russian_post", "cdek", "pickup_klin"]);
const ADDRESS_REQUIRED = new Set(["russian_post", "cdek"]);

// POST /orders { items, contact: {name, phone, email}, delivery: {method, address} }
// Re-prices every line against lib/catalog.js (never trusts client-sent
// prices) and persists the order with status "new". If a valid session is
// present the order is linked to that user so it shows up in the cabinet;
// guest checkout is still allowed.
module.exports.handler = async (event) => {
  if (isPreflight(event)) return ok({});
  try {
    const body = JSON.parse(event.body || "{}");
    const { items, contact, delivery } = body;

    if (!Array.isArray(items) || items.length === 0) return error(400, "Корзина пуста");
    if (!contact || !contact.name || !contact.phone || !contact.email) {
      return error(400, "Заполните имя, телефон и e-mail");
    }
    if (!delivery || !DELIVERY_METHODS.has(delivery.method)) {
      return error(400, "Некорректный способ доставки");
    }
    if (ADDRESS_REQUIRED.has(delivery.method) && !delivery.address) {
      return error(400, "Укажите адрес доставки");
    }

    const pricedItems = [];
    let total = 0;
    for (const item of items) {
      const product = getProduct(item.productId);
      if (!product) return error(400, `Неизвестный товар: ${item.productId}`);
      const qty = Math.max(1, Math.min(20, parseInt(item.qty, 10) || 1));
      pricedItems.push({ productId: item.productId, title: product.title, price: product.price, qty, options: item.options });
      total += product.price * qty;
    }

    const user = userFromEvent(event);
    const order = {
      id: require("crypto").randomUUID(),
      userId: user ? user.sub : null,
      email: contact.email,
      phone: contact.phone,
      name: contact.name,
      deliveryMethod: delivery.method,
      deliveryAddress: delivery.address || null,
      items: pricedItems,
      total,
    };

    await createOrder(order);
    return ok({ id: order.id, total: order.total });
  } catch (err) {
    return error(500, err.message);
  }
};
