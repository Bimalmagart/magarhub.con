const money = (n) => `Rs ${Number(n).toLocaleString("en-US")}`;

const STORAGE_KEY = "myshop_products_v1";
const CART_KEY = "myshop_cart_v1";

let products = [];
let cart = {}; // {id: qty}

const el = (id) => document.getElementById(id);

function scrollToSection(id){
  document.getElementById(id).scrollIntoView({behavior:"smooth", block:"start"});
}

function loadProducts(){
  const saved = localStorage.getItem(STORAGE_KEY);
  products = saved ? JSON.parse(saved) : [];
  el("heroProducts").textContent = products.length;
}

function saveProducts(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  el("heroProducts").textContent = products.length;
}

function loadCart(){
  const saved = localStorage.getItem(CART_KEY);
  cart = saved ? JSON.parse(saved) : {};
}

function saveCart(){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
  renderSummary();
  renderCartCount();
}

function seedDemoData(){
  products = [
    {
      id:"p1",
      name:"Wireless Earbuds",
      price:2499,
      category:"Electronics",
      img:"https://images.unsplash.com/photo-1585386959984-a41552231693?auto=format&fit=crop&w=1200&q=80",
      desc:"Clear sound, compact case, long battery life."
    },
    {
      id:"p2",
      name:"Running Shoes",
      price:3999,
      category:"Fashion",
      img:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
      desc:"Lightweight shoes for daily comfort and training."
    },
    {
      id:"p3",
      name:"Smart Watch",
      price:5999,
      category:"Electronics",
      img:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
      desc:"Track steps, heart rate, and notifications."
    },
    {
      id:"p4",
      name:"Premium Coffee Beans",
      price:1299,
      category:"Grocery",
      img:"https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80",
      desc:"Medium roast beans with rich aroma and taste."
    },
    {
      id:"p5",
      name:"Backpack",
      price:1899,
      category:"Fashion",
      img:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80",
      desc:"Durable everyday backpack with laptop sleeve."
    },
    {
      id:"p6",
      name:"LED Desk Lamp",
      price:999,
      category:"Home",
      img:"https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80",
      desc:"Adjustable brightness. Clean, modern design."
    },
  ];
  saveProducts();
  renderCategoryOptions();
  renderProducts();
  alert("Demo products loaded ✅");
}

function renderCategoryOptions(){
  const select = el("categorySelect");
  const cats = ["all", ...Array.from(new Set(products.map(p => p.category)))];

  select.innerHTML = cats.map(c => {
    const label = c === "all" ? "All categories" : c;
    return `<option value="${c}">${label}</option>`;
  }).join("");
}

function getFilteredProducts(){
  const q = (el("searchInput").value || "").trim().toLowerCase();
  const cat = el("categorySelect").value;
  const sort = el("sortSelect").value;

  let list = [...products];

  if (cat !== "all") list = list.filter(p => p.category === cat);
  if (q) list = list.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.desc.toLowerCase().includes(q)
  );

  if (sort === "low") list.sort((a,b)=>a.price-b.price);
  if (sort === "high") list.sort((a,b)=>b.price-a.price);
  if (sort === "name") list.sort((a,b)=>a.name.localeCompare(b.name));

  return list;
}

function renderProducts(){
  const grid = el("productsGrid");
  const list = getFilteredProducts();
  el("emptyState").classList.toggle("hidden", list.length !== 0);

  grid.innerHTML = list.map(p => `
    <article class="card">
      <img src="${p.img}" alt="${escapeHtml(p.name)}" loading="lazy">
      <div class="card-body">
        <div class="card-title">${escapeHtml(p.name)}</div>
        <div class="card-desc">${escapeHtml(p.desc)}</div>
        <div class="card-row">
          <div class="price">${money(p.price)}</div>
          <span class="tag">${escapeHtml(p.category)}</span>
        </div>
        <div class="card-row">
          <button class="btn" onclick="openModal('${p.id}')">Quick View</button>
          <button class="btn primary" onclick="addToCart('${p.id}', 1)">Add</button>
        </div>
      </div>
    </article>
  `).join("");
}

function openModal(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;

  el("modalImg").src = p.img;
  el("modalName").textContent = p.name;
  el("modalDesc").textContent = p.desc;
  el("modalPrice").textContent = money(p.price);
  el("modalCat").textContent = p.category;

  el("modalAdd").onclick = () => { addToCart(p.id, 1); closeModal(); };
  el("modal").classList.remove("hidden");
}

function closeModal(){
  el("modal").classList.add("hidden");
}

function openCart(){ el("cart").classList.remove("hidden"); }
function closeCart(){ el("cart").classList.add("hidden"); }

function addToCart(id, qty){
  cart[id] = (cart[id] || 0) + qty;
  if (cart[id] <= 0) delete cart[id];
  saveCart();
}

function clearCart(){
  cart = {};
  saveCart();
}

function cartTotals(){
  let subtotal = 0;
  const items = Object.entries(cart).map(([id, qty]) => {
    const p = products.find(x=>x.id===id);
    if(!p) return null;
    const line = p.price * qty;
    subtotal += line;
    return { ...p, qty, line };
  }).filter(Boolean);

  return { items, subtotal };
}

function renderCartCount(){
  const count = Object.values(cart).reduce((a,b)=>a+b,0);
  el("cartCount").textContent = count;
}

function renderCart(){
  const {items, subtotal} = cartTotals();
  const wrapper = el("cartItems");
  el("cartEmpty").classList.toggle("hidden", items.length !== 0);

  wrapper.innerHTML = items.map(it => `
    <div class="cart-item">
      <img src="${it.img}" alt="${escapeHtml(it.name)}">
      <div>
        <h4>${escapeHtml(it.name)}</h4>
        <div class="meta">${escapeHtml(it.category)} • ${money(it.price)}</div>

        <div class="qty">
          <button onclick="addToCart('${it.id}', -1)">−</button>
          <span>${it.qty}</span>
          <button onclick="addToCart('${it.id}', 1)">+</button>
          <button class="remove" onclick="removeItem('${it.id}')">Remove</button>
        </div>
      </div>
    </div>
  `).join("");

  el("cartTotal").textContent = money(subtotal);
}

function removeItem(id){
  delete cart[id];
  saveCart();
}

function renderSummary(){
  const {items, subtotal} = cartTotals();
  const deliveryType = (document.querySelector("select[name='delivery']")?.value) || "standard";
  const delivery = deliveryType === "express" ? 200 : 0;
  const total = subtotal + delivery;

  el("summaryItems").innerHTML = items.length ? items.map(it => `
    <div class="summary-item">
      <span>${escapeHtml(it.name)} × ${it.qty}</span>
      <strong>${money(it.line)}</strong>
    </div>
  `).join("") : `<p class="muted">No items yet.</p>`;

  el("summarySubtotal").textContent = money(subtotal);
  el("summaryDelivery").textContent = money(delivery);
  el("summaryTotal").textContent = money(total);
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function init(){
  el("year").textContent = new Date().getFullYear();

  loadProducts();
  loadCart();

  renderCategoryOptions();
  renderProducts();
  renderCart();
  renderSummary();
  renderCartCount();

  // UI events
  el("cartOpenBtn").addEventListener("click", openCart);
  el("cartCloseBtn").addEventListener("click", closeCart);
  el("clearCartBtn").addEventListener("click", clearCart);

  el("modalBackdrop").addEventListener("click", closeModal);
  el("modalClose").addEventListener("click", closeModal);

  el("searchInput").addEventListener("input", renderProducts);
  el("categorySelect").addEventListener("change", renderProducts);
  el("sortSelect").addEventListener("change", renderProducts);

  el("summaryGoCart").addEventListener("click", () => openCart());

  document.getElementById("checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const {subtotal} = cartTotals();
    if(subtotal <= 0){
      alert("Cart is empty. Please add products first.");
      return;
    }
    clearCart();
    e.target.reset();
    renderSummary();
    alert("Order placed (demo) ✅\nNext: connect real payments + backend.");
  });

  document.querySelector("select[name='delivery']").addEventListener("change", renderSummary);
}

init();
