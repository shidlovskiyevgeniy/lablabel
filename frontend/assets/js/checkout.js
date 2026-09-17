function renderCartTable(mount) {
  const items = getCart();
  if (items.length === 0) {
    mount.innerHTML = `<div class="notice">Корзина пуста. <a href="catalog.html">Перейти в каталог</a>.</div>`;
    return false;
  }

  const rows = items
    .map(
      (i) => `
    <tr>
      <td>${i.title}<br/><span style="color:var(--fg-muted); font-size:12px;">цвет: ${i.options.color}, ссылка: ${i.options.link}</span></td>
      <td>${i.qty}</td>
      <td>${i.price} ₽</td>
      <td>${i.price * i.qty} ₽</td>
      <td><button type="button" class="btn secondary" data-remove="${i.lineId}">Убрать</button></td>
    </tr>`
    )
    .join("");

  mount.innerHTML = `
    <table class="cart-table">
      <thead><tr><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="cart-total-row"><td colspan="3">Итого</td><td colspan="2">${cartTotal(items)} ₽</td></tr></tfoot>
    </table>
  `;

  mount.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCart(btn.dataset.remove);
      renderCartTable(mount);
      const checkoutSection = document.getElementById("checkout-section");
      if (checkoutSection) checkoutSection.style.display = getCart().length ? "" : "none";
    });
  });

  return true;
}

const DELIVERY_METHODS = [
  { id: "russian_post", label: "Почта России", needsAddress: true },
  { id: "cdek", label: "СДЭК", needsAddress: true },
  { id: "pickup_klin", label: "Самовывоз (Клин)", needsAddress: false },
];

document.addEventListener("DOMContentLoaded", () => {
  const cartMount = document.getElementById("cart-table-mount");
  if (!cartMount) return;

  const hasItems = renderCartTable(cartMount);
  const checkoutSection = document.getElementById("checkout-section");
  if (checkoutSection) checkoutSection.style.display = hasItems ? "" : "none";

  const deliveryMount = document.getElementById("delivery-methods");
  if (deliveryMount) {
    deliveryMount.innerHTML = DELIVERY_METHODS.map(
      (m, i) => `
      <div class="radio-row">
        <input type="radio" name="delivery" id="delivery-${m.id}" value="${m.id}" ${i === 0 ? "checked" : ""} />
        <label for="delivery-${m.id}" style="margin:0;">${m.label}</label>
      </div>`
    ).join("");
  }

  const addressField = document.getElementById("address-field");
  function syncAddressVisibility() {
    const selected = document.querySelector('input[name="delivery"]:checked');
    const method = DELIVERY_METHODS.find((m) => m.id === (selected && selected.value));
    if (addressField) addressField.style.display = method && method.needsAddress ? "" : "none";
  }
  document.querySelectorAll('input[name="delivery"]').forEach((r) => r.addEventListener("change", syncAddressVisibility));
  syncAddressVisibility();

  const form = document.getElementById("checkout-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorBox = document.getElementById("checkout-error");
    errorBox.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "Отправляем...";

    try {
      const fd = new FormData(form);
      const deliveryMethod = fd.get("delivery");
      const payload = {
        items: getCart().map(({ productId, qty, price, options }) => ({ productId, qty, price, options })),
        contact: {
          name: fd.get("name"),
          phone: fd.get("phone"),
          email: fd.get("email"),
        },
        delivery: {
          method: deliveryMethod,
          address: fd.get("address") || null,
        },
      };

      const order = await api("/orders", { method: "POST", body: payload, auth: !!authToken() });
      const payment = await api(`/orders/${order.id}/pay`, { method: "POST" });
      clearCart();
      location.href = payment.confirmationUrl;
    } catch (err) {
      errorBox.textContent = err.message || "Не удалось оформить заказ. Попробуйте ещё раз.";
      errorBox.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = "Оплатить";
    }
  });
});
