async function loadCatalog() {
  // Catalog is served as a static file for speed (low traffic, changes rarely).
  // The backend independently holds the same product/price data and re-validates
  // it at order time — see backend/functions/orders-create — so a tampered client
  // request can never buy at a different price.
  const res = await fetch("assets/data/products.json");
  return res.json();
}

function renderCatalogGrid(products, mountEl) {
  mountEl.innerHTML = products
    .map(
      (p) => `
    <div class="card">
      <div class="card-thumb">${productIcon(p.id)}</div>
      <div class="card-body">
        <div class="card-title">${p.title}</div>
        <div class="card-price">${p.price} ₽</div>
        <p style="color:var(--fg-muted); font-size:13px; margin:0;">${p.shortDescription}</p>
        <a class="btn full" href="product.html?id=${encodeURIComponent(p.id)}">Выбрать</a>
      </div>
    </div>`
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  const mount = document.getElementById("catalog-grid");
  if (!mount) return;
  const products = await loadCatalog();
  renderCatalogGrid(products, mount);
});
