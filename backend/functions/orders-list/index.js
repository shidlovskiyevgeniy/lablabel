const { ok, error, isPreflight } = require("../../lib/cors");
const { listOrdersByUser } = require("../../lib/ydb");
const { userFromEvent } = require("../../lib/jwt");

// GET /orders/me — auth required. Returns the logged-in user's order history
// for the personal cabinet.
module.exports.handler = async (event) => {
  if (isPreflight(event)) return ok({});
  try {
    const user = userFromEvent(event);
    if (!user) return error(401, "Требуется авторизация");

    const rows = await listOrdersByUser(user.sub);
    const orders = rows.map((r) => ({
      id: r.id,
      total: r.total,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
    }));
    return ok({ orders });
  } catch (err) {
    return error(500, err.message);
  }
};
