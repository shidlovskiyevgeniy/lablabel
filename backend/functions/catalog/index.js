const { ok, error, isPreflight } = require("../../lib/cors");
const { PRODUCTS } = require("../../lib/catalog");

// GET /catalog — authoritative product/price list (kept for admin/future use;
// the frontend currently serves assets/data/products.json directly for speed).
module.exports.handler = async (event) => {
  if (isPreflight(event)) return ok({});
  try {
    const products = Object.entries(PRODUCTS).map(([id, p]) => ({ id, ...p }));
    return ok({ products });
  } catch (err) {
    return error(500, err.message);
  }
};
