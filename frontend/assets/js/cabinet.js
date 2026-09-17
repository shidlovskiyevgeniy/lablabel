const STATUS_LABELS = {
  new: ["Новый", "new"],
  paid: ["Оплачен", "paid"],
  in_production: ["В изготовлении", "new"],
  shipped: ["Отправлен", "shipped"],
  done: ["Выполнен", "paid"],
  cancelled: ["Отменён", "cancelled"],
};

document.addEventListener("DOMContentLoaded", async () => {
  const mount = document.getElementById("cabinet-mount");
  if (!mount) return;

  if (!authToken()) {
    location.href = "login.html";
    return;
  }

  try {
    const { orders } = await api("/orders/me", { auth: true });
    if (!orders.length) {
      mount.innerHTML = `<div class="notice">У вас пока нет заказов. <a href="catalog.html">Перейти в каталог</a>.</div>`;
      return;
    }
    mount.innerHTML = `<div class="order-list">${orders
      .map((o) => {
        const [label, cls] = STATUS_LABELS[o.status] || [o.status, "new"];
        return `
        <div class="order-item">
          <div>
            <strong>Заказ #${o.id.slice(0, 8)}</strong><br/>
            <span style="color:var(--fg-muted); font-size:13px;">${new Date(o.createdAt).toLocaleDateString("ru-RU")} · ${o.total} ₽</span>
          </div>
          <span class="badge ${cls}">${label}</span>
        </div>`;
      })
      .join("")}</div>`;
  } catch (err) {
    if (err.message === "NOT_AUTHENTICATED" || /401|403/.test(err.message)) {
      setAuthToken(null);
      location.href = "login.html";
      return;
    }
    mount.innerHTML = `<div class="notice err">${err.message}</div>`;
  }
});

function logout() {
  setAuthToken(null);
  location.href = "index.html";
}
