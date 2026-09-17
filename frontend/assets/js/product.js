function socialLinkValid(url) {
  try {
    const u = new URL(url);
    return /vk\.com|t\.me|telegram\.me/i.test(u.hostname);
  } catch (_) {
    return false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const mount = document.getElementById("product-mount");
  if (!mount) return;

  const id = new URLSearchParams(location.search).get("id");
  const products = await loadCatalog();
  const product = products.find((p) => p.id === id) || products[0];
  if (!product) {
    mount.innerHTML = "<p>Товар не найден.</p>";
    return;
  }

  document.title = `${product.title} — lablabel`;

  mount.innerHTML = `
    <div class="hero" style="align-items:start;">
      <div class="hero-art">${product.title}</div>
      <div>
        <h1>${product.title}</h1>
        <p class="lead">${product.description}</p>
        <p class="card-price" style="font-size:22px;">${product.price} ₽</p>
        <p class="hint" style="color:var(--fg-muted); font-size:13px;">Срок изготовления: ~${product.leadTimeDays} дн. Товар персонализируется под вас и не подлежит возврату без брака (ст. 26.1 ЗоЗПП) — подробнее в <a href="legal/vozvrat.html">условиях возврата</a>.</p>

        <form id="personalize-form">
          <div class="field">
            <label for="link">Ссылка для QR и NFC (VK или Telegram)</label>
            <input type="url" id="link" name="link" placeholder="https://vk.com/username или https://t.me/username" required />
            <div class="error" id="link-error">Укажите корректную ссылку на VK или Telegram.</div>
          </div>

          <div class="field">
            <label>Цвет корпуса</label>
            <div class="color-swatches" id="color-swatches">
              ${product.colors
                .map(
                  (c, i) => `<div class="swatch${i === 0 ? " selected" : ""}" data-color="${c.id}" title="${c.label}" style="background:${c.hex}"></div>`
                )
                .join("")}
            </div>
          </div>

          <div class="field">
            <label for="qty">Количество</label>
            <input type="number" id="qty" name="qty" value="1" min="1" max="20" required />
          </div>

          <div class="field">
            <label for="comment">Комментарий к заказу (необязательно)</label>
            <textarea id="comment" name="comment" placeholder="Пожелания по гравировке, упаковке и т.п."></textarea>
          </div>

          <button type="submit" class="btn full">Добавить в корзину</button>
        </form>
      </div>
    </div>
  `;

  let selectedColor = product.colors[0].id;
  mount.querySelectorAll(".swatch").forEach((el) => {
    el.addEventListener("click", () => {
      mount.querySelectorAll(".swatch").forEach((s) => s.classList.remove("selected"));
      el.classList.add("selected");
      selectedColor = el.dataset.color;
    });
  });

  mount.querySelector("#personalize-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const link = mount.querySelector("#link").value.trim();
    const linkError = mount.querySelector("#link-error");
    if (!socialLinkValid(link)) {
      linkError.style.display = "block";
      return;
    }
    linkError.style.display = "none";

    const qty = Math.max(1, parseInt(mount.querySelector("#qty").value, 10) || 1);
    const comment = mount.querySelector("#comment").value.trim();

    addToCart({
      productId: product.id,
      title: product.title,
      price: product.price,
      qty,
      options: { link, color: selectedColor, comment },
    });

    location.href = "cart.html";
  });
});
