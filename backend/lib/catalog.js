// Authoritative product/price data. Must be kept in sync with
// frontend/assets/data/products.json by hand for now (low SKU count, MVP).
// This is what orders-create.js re-prices against — a tampered client
// request can never check out at a different price than listed here.
const PRODUCTS = {
  "spinner-chip": { title: "Фишка-спиннер lablabel", price: 1200 },
  "spinner-chip-duo": { title: "Фишка-спиннер lablabel — Duo (VK + Telegram)", price: 1500 },
  "keychain-tag": { title: "Брелок-бирка lablabel", price: 800 },
};

function getProduct(productId) {
  return PRODUCTS[productId] || null;
}

module.exports = { PRODUCTS, getProduct };
