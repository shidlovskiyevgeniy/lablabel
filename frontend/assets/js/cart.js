// Cart is client-side only (localStorage) until checkout, when it is sent to
// POST /orders and becomes the source of truth on the server.
const CART_KEY = "lablabel_cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch (_) {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartBadge();
}

function addToCart(item) {
  // item: { productId, title, price, qty, options: {...} }
  const items = getCart();
  items.push({ ...item, lineId: crypto.randomUUID() });
  saveCart(items);
}

function removeFromCart(lineId) {
  saveCart(getCart().filter((i) => i.lineId !== lineId));
}

function clearCart() {
  saveCart([]);
}

function cartTotal(items = getCart()) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function cartCount(items = getCart()) {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

function updateCartBadge() {
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    const n = cartCount();
    el.textContent = n > 0 ? String(n) : "";
    el.style.display = n > 0 ? "inline-flex" : "none";
  });
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
