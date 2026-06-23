// ===================== CONFIG =====================
const CONFIG = {
  whatsappNumber: "51948294214", // cambia aquí si el número es otro (formato: cod. país + número, sin +)
  storeName: "Bella Edición",
  currency: "S/",
};

// ===================== STATE =====================
let PRODUCTS = [];
let cart = JSON.parse(localStorage.getItem("be_cart") || "{}"); // { id: qty }
let activeCategory = "Todos";
let searchTerm = "";
let sortMode = "destacado";
let estado = "sellado"; // sellado | abierto

// ===================== INIT =====================
fetch("products.json")
  .then(r => r.json())
  .then(data => {
    PRODUCTS = data;
    buildCategoryNav();
    renderGrid();
    renderCart();
  });

function buildCategoryNav() {
  const cats = ["Todos", ...new Set(PRODUCTS.map(p => p.categoria_web))];
  const nav = document.getElementById("catNav");
  nav.innerHTML = cats.map(c =>
    `<button class="cat-pill${c === activeCategory ? " active" : ""}" data-cat="${c}">${c}</button>`
  ).join("");
  nav.querySelectorAll(".cat-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      nav.querySelectorAll(".cat-pill").forEach(b => b.classList.toggle("active", b === btn));
      renderGrid();
    });
  });
}

// ===================== GRID =====================
function getFiltered() {
  let list = PRODUCTS.filter(p => p.disponible !== false);
  if (activeCategory !== "Todos") list = list.filter(p => p.categoria_web === activeCategory);
  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    list = list.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.marca.toLowerCase().includes(q) ||
      (p.subcategoria || "").toLowerCase().includes(q)
    );
  }
  switch (sortMode) {
    case "precio-asc": list.sort((a,b) => a.precio - b.precio); break;
    case "precio-desc": list.sort((a,b) => b.precio - a.precio); break;
    case "nombre": list.sort((a,b) => a.nombre.localeCompare(b.nombre)); break;
    default: list.sort((a,b) => (b.destacado - a.destacado) || (b.nuevo - a.nuevo));
  }
  return list;
}

function renderGrid() {
  const list = getFiltered();
  const grid = document.getElementById("productGrid");
  const empty = document.getElementById("emptyState");
  document.getElementById("resultsCount").textContent = `${list.length} producto${list.length === 1 ? "" : "s"}`;

  if (!list.length) {
    grid.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  grid.innerHTML = list.map(p => `
    <div class="card" data-id="${p.id}">
      <div class="card-img-wrap" data-action="open-modal" data-id="${p.id}">
        <div class="badges">
          ${p.nuevo ? '<span class="badge nuevo">Nuevo</span>' : ""}
          ${p.oferta ? '<span class="badge oferta">Oferta</span>' : ""}
          ${p.destacado ? '<span class="badge destacado">Destacado</span>' : ""}
        </div>
        <img src="${p.imagen}" alt="${p.nombre}" loading="lazy">
      </div>
      <div class="card-body">
        <span class="card-brand">${p.marca}</span>
        <span class="card-name">${p.nombre}</span>
        <span class="card-pres">${p.presentacion || ""}</span>
        <div class="price-row">
          <span class="price-before">${CONFIG.currency}${p.precio_antes}</span>
          <span class="price-now">${CONFIG.currency}${p.precio}</span>
        </div>
        <span class="price-open">Abierto/sin caja: ${CONFIG.currency}${p.precio_abierto}</span>
        <button class="add-btn" data-action="add" data-id="${p.id}">Agregar a mi lista</button>
      </div>
    </div>
  `).join("");
}

// ===================== EVENTS: grid =====================
document.getElementById("productGrid").addEventListener("click", e => {
  const addBtn = e.target.closest('[data-action="add"]');
  if (addBtn) {
    addToCart(addBtn.dataset.id);
    addBtn.textContent = "Agregado ✓";
    addBtn.classList.add("added");
    setTimeout(() => { addBtn.textContent = "Agregar a mi lista"; addBtn.classList.remove("added"); }, 1100);
    return;
  }
  const imgWrap = e.target.closest('[data-action="open-modal"]');
  if (imgWrap) openModal(imgWrap.dataset.id);
});

document.getElementById("searchInput").addEventListener("input", e => {
  searchTerm = e.target.value;
  renderGrid();
});
document.getElementById("sortSelect").addEventListener("change", e => {
  sortMode = e.target.value;
  renderGrid();
});

// ===================== CART =====================
function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  renderCart();
  openCart();
}
function changeQty(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  saveCart();
  renderCart();
}
function removeFromCart(id) {
  delete cart[id];
  saveCart();
  renderCart();
}
function saveCart() { localStorage.setItem("be_cart", JSON.stringify(cart)); }

function renderCart() {
  const ids = Object.keys(cart);
  const count = ids.reduce((s,id) => s + cart[id], 0);
  document.getElementById("cartCount").textContent = count;

  const itemsWrap = document.getElementById("cartItems");
  const emptyMsg = document.getElementById("cartEmptyMsg");
  const foot = document.getElementById("cartFoot");

  if (!ids.length) {
    itemsWrap.innerHTML = "";
    emptyMsg.hidden = false;
    foot.hidden = true;
    return;
  }
  emptyMsg.hidden = true;
  foot.hidden = false;

  let total = 0;
  itemsWrap.innerHTML = ids.map(id => {
    const p = PRODUCTS.find(x => String(x.id) === String(id));
    if (!p) return "";
    const unit = estado === "abierto" ? p.precio_abierto : p.precio;
    total += unit * cart[id];
    return `
      <div class="cart-row">
        <img src="${p.imagen}" alt="${p.nombre}">
        <div class="cart-row-info">
          <div class="cart-row-brand">${p.marca}</div>
          <div class="cart-row-name">${p.nombre}</div>
          <div class="cart-row-price">${CONFIG.currency}${unit} c/u</div>
          <div class="qty-controls">
            <button data-action="dec" data-id="${id}">−</button>
            <span>${cart[id]}</span>
            <button data-action="inc" data-id="${id}">+</button>
          </div>
        </div>
        <button class="remove-row" data-action="remove" data-id="${id}">✕</button>
      </div>`;
  }).join("");

  document.getElementById("cartTotal").textContent = `${CONFIG.currency}${total}`;
}

document.getElementById("cartItems").addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === "inc") changeQty(id, 1);
  if (btn.dataset.action === "dec") changeQty(id, -1);
  if (btn.dataset.action === "remove") removeFromCart(id);
});

document.getElementById("estadoSellado").addEventListener("click", () => setEstado("sellado"));
document.getElementById("estadoAbierto").addEventListener("click", () => setEstado("abierto"));
function setEstado(v) {
  estado = v;
  document.getElementById("estadoSellado").classList.toggle("active", v === "sellado");
  document.getElementById("estadoAbierto").classList.toggle("active", v === "abierto");
  renderCart();
}

document.getElementById("clearCartBtn").addEventListener("click", () => {
  cart = {};
  saveCart();
  renderCart();
});

// ===================== WHATSAPP =====================
document.getElementById("sendWhatsappBtn").addEventListener("click", () => {
  const ids = Object.keys(cart);
  if (!ids.length) return;
  let lines = [`Hola! Quiero consultar por estos productos (${estado === "abierto" ? "precio abierto/sin caja" : "precio sellado"}):`];
  let total = 0;
  ids.forEach(id => {
    const p = PRODUCTS.find(x => String(x.id) === String(id));
    if (!p) return;
    const unit = estado === "abierto" ? p.precio_abierto : p.precio;
    const sub = unit * cart[id];
    total += sub;
    lines.push(`• ${p.nombre} (${p.marca}) x${cart[id]} — ${CONFIG.currency}${sub}`);
  });
  lines.push(`Total aproximado: ${CONFIG.currency}${total}`);
  lines.push("¿Están disponibles?");
  const text = encodeURIComponent(lines.join("\n"));
  window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${text}`, "_blank");
});

// ===================== DRAWER OPEN/CLOSE =====================
const cartDrawer = document.getElementById("cartDrawer");
const overlay = document.getElementById("overlay");
function openCart() { cartDrawer.classList.add("open"); overlay.classList.add("show"); }
function closeCart() { cartDrawer.classList.remove("open"); overlay.classList.remove("show"); }
document.getElementById("openCartBtn").addEventListener("click", openCart);
document.getElementById("closeCartBtn").addEventListener("click", closeCart);
overlay.addEventListener("click", () => { closeCart(); closeModal(); });

// ===================== PRODUCT MODAL =====================
const modal = document.getElementById("productModal");
const modalOverlay = document.getElementById("modalOverlay");
function openModal(id) {
  const p = PRODUCTS.find(x => String(x.id) === String(id));
  if (!p) return;
  modal.innerHTML = `
    <div class="modal-inner">
      <div class="modal-img"><img src="${p.imagen}" alt="${p.nombre}"></div>
      <div class="modal-info">
        <button class="modal-close" id="modalCloseBtn">✕</button>
        <div class="modal-brand">${p.marca}</div>
        <h3>${p.nombre}</h3>
        <div class="modal-pres">${p.presentacion || ""} · ${p.estado_empaque || ""}</div>
        <p class="modal-desc">${p.descripcion || ""}</p>
        <div class="modal-price-row">
          <span class="price-before">${CONFIG.currency}${p.precio_antes}</span>
          <span class="price-now">${CONFIG.currency}${p.precio}</span>
        </div>
        <span class="price-open">Abierto/sin caja: ${CONFIG.currency}${p.precio_abierto}</span>
        <button class="add-btn" style="margin-top:16px" data-action="add" data-id="${p.id}">Agregar a mi lista</button>
      </div>
    </div>`;
  modal.querySelector('[data-action="add"]').addEventListener("click", e => {
    addToCart(p.id);
    e.target.textContent = "Agregado ✓";
    e.target.classList.add("added");
  });
  modal.querySelector("#modalCloseBtn").addEventListener("click", closeModal);
  modal.classList.add("open");
  modalOverlay.classList.add("show");
}
function closeModal() {
  modal.classList.remove("open");
  modalOverlay.classList.remove("show");
}
modalOverlay.addEventListener("click", closeModal);
