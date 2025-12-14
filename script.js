// ===================== SETTINGS =====================
const COMMISSION_RATE = 0.10;      // 10% platform commission
const EXPRESS_FEE = 200;           // Express delivery fee
const BACKEND_URL = "";            // Stripe backend base URL (leave "" for same-origin)

// ===================== STORAGE KEYS =====================
const STORAGE_PRODUCTS = "goldmart_products_v2";
const STORAGE_CART     = "goldmart_cart_v2";
const STORAGE_VENDORS  = "goldmart_vendors_v2";
const STORAGE_SESSION  = "goldmart_vendor_session_v2";
const STORAGE_ORDERS   = "goldmart_orders_v2";

// ===================== STATE =====================
let products = [];
let cart = {}; // { productId: qty }

// ===================== HELPERS =====================
const el = (id) => document.getElementById(id);

function money(n){
  return `Rs ${Number(n || 0).toLocaleString("en-US")}`;
}
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function toast(msg){
  const t = el("toast");
  if(!t) return alert(msg);
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(()=> t.classList.add("hidden"), 2200);
}
function scrollToSection(id){
  document.getElementById(id).scrollIntoView({behavior:"smooth", block:"start"});
}

// ===================== LOAD/SAVE =====================
function loadProducts(){
  products = JSON.parse(localStorage.getItem(STORAGE_PRODUCTS) || "[]");
}
function saveProducts(){
  localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(products));
  updateStats();
}
function loadCart(){
  cart = JSON.parse(localStorage.getItem(STORAGE_CART) || "{}");
}
function saveCart(){
  localStorage.setItem(STORAGE_CART, JSON.stringify(cart));
}
function loadVendors(){
  return JSON.parse(localStorage.getItem(STORAGE_VENDORS) || "[]");
}
function saveVendors(vs){
  localStorage.setItem(STORAGE_VENDORS, JSON.stringify(vs));
  updateStats();
}
function getSession(){
  return JSON.parse(localStorage.getItem(STORAGE_SESSION) || "null");
}
function setSession(s){
  localStorage.setItem(STORAGE_SESSION, JSON.stringify(s));
}
function clearSession(){
  localStorage.removeItem(STORAGE_SESSION);
}
function loadOrders(){
  return JSON.parse(localStorage.getItem(STORAGE_ORDERS) || "[]");
}
function saveOrders(os){
  localStorage.setItem(STORAGE_ORDERS, JSON.stringify(os));
}

// ===================== DEMO DATA =====================
function seedDemoData(){
  // Add demo vendors if none
  const vendors = loadVendors();
  if(vendors.length === 0){
    vendors.push(
      { vendorId:"v_demo1", shop:"Gold Electronics", email:"gold@vendor.com", password:"123456", approved:true },
      { vendorId:"v_demo2", shop:"Black Fashion",   email:"black@vendor.com", password:"123456", approved:true }
    );
    saveVendors(vendors);
  }

  // Add demo products (published)
  products = [
    {
      id:"p1",
      name:"Wireless Earbuds Pro",
      price:2499,
      category:"Electronics",
      img:"https://images.unsplash.com/photo-1585386959984-a41552231693?auto=format&fit=crop&w=1200&q=80",
      desc:"Crisp sound, compact case, long battery life.",
      vendorId:"v_demo1",
      vendorShop:"Gold Electronics",
      published:true,
      featured:true
    },
    {
      id:"p2",
      name:"Smart Watch Classic",
      price:5999,
      category:"Electronics",
      img:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
      desc:"Track steps, heart rate, and notifications.",
      vendorId:"v_demo1",
      vendorShop:"Gold Electronics",
      published:true,
      featured:true
    },
    {
      id:"p3",
      name:"Premium Backpack",
      price:1899,
      category:"Fashion",
      img:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80",
      desc:"Durable daily backpack with laptop sleeve.",
      vendorId:"v_demo2",
      vendorShop:"Black Fashion",
      published:true,
      featured:false
    },
    {
      id:"p4",
      name:"Running Shoes",
      price:3999,
      category:"Fashion",
      img:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
      desc:"Lightweight comfort for daily training.",
      vendorId:"v_demo2",
      vendorShop:"Black Fashion",
      published:true,
      featured:false
    }
  ];
  saveProducts();
  renderCategoryOptions();
  renderProducts();
  renderVendorUI();
  renderSummary();
  toast("Demo products loaded ✅");
}

// ===================== PRODUCTS UI =====================
function renderCategoryOptions(){
  const select = el("categorySelect");
  if(!select) return;

  const cats = ["all", ...Array.from(new Set(products.map(p => p.category)))];
  select.innerHTML = cats.map(c=>{
    const label = c === "all" ? "All categories" : c;
    return `<option value="${escapeHtml(c)}">${escapeHtml(label)}</option>`;
  }).join("");
}

function getFilteredProducts(){
  const q = (el("searchInput")?.value || "").trim().toLowerCase();
  const cat = el("categorySelect")?.value || "all";
  const sort = el("sortSelect")?.value || "featured";

  // customers see ONLY published
  let list = products.filter(p => p.published === true);

  if(cat !== "all") list = list.filter(p => p.category === cat);

  if(q){
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      (p.vendorShop || "").toLowerCase().includes(q)
    );
  }

  if(sort === "low") list.sort((a,b)=>a.price-b.price);
  if(sort === "high") list.sort((a,b)=>b.price-a.price);
  if(sort === "name") list.sort((a,b)=>a.name.localeCompare(b.name));
  if(sort === "featured") list.sort((a,b)=>(b.featured===true)-(a.featured===true));

  return list;
}

function renderProducts(){
  const grid = el("productsGrid");
  if(!grid) return;

  const list = getFilteredProducts();
  el("emptyState")?.classList.toggle("hidden", list.length !== 0);

  grid.innerHTML = list.map(p => `
    <article class="card">
      <img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.name)}" loading="lazy">
      <div class="card-body">
        <div class="card-title">${escapeHtml(p.name)}</div>
        <div class="card-desc">${escapeHtml(p.desc)}</div>

        <div class="card-row">
          <div class="price">${money(p.price)}</div>
          <span class="tag">${escapeHtml(p.category)}</span>
        </div>

        <div class="card-row">
          <span class="seller">${escapeHtml(p.vendorShop || "Vendor")}</span>
          <button class="btn gold" onclick="addToCart('${escapeHtml(p.id)}', 1)">Add</button>
        </div>

        <div class="card-row">
          <button class="btn outline" onclick="openModal('${escapeHtml(p.id)}')">Quick View</button>
        </div>
      </div>
    </article>
  `).join("");
}

// ===================== MODAL =====================
function openModal(id){
  const p = products.find(x=>x.id===id && x.published===true);
  if(!p) return;

  el("modalImg").src = p.img;
  el("modalName").textContent = p.name;
  el("modalDesc").textContent = p.desc;
  el("modalPrice").textContent = money(p.price);
  el("modalCat").textContent = p.category;
  el("modalSeller").textContent = p.vendorShop || "Vendor";

  el("modalAdd").onclick = () => { addToCart(p.id, 1); closeModal(); };
  el("modal").classList.remove("hidden");
}
function closeModal(){ el("modal").classList.add("hidden"); }

// ===================== CART =====================
function openCart(){ el("cart").classList.remove("hidden"); }
function closeCart(){ el("cart").classList.add("hidden"); }

function addToCart(id, qty){
  cart[id] = (cart[id] || 0) + qty;
  if(cart[id] <= 0) delete cart[id];
  saveCart();
  renderCart();
  renderSummary();
  renderCartCount();
  toast("Added to cart ✅");
}

function clearCart(){
  cart = {};
  saveCart();
  renderCart();
  renderSummary();
  renderCartCount();
  toast("Cart cleared");
}

function cartExpanded(){
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

// commission per vendor
function commissionBreakdown(){
  const { items, subtotal } = cartExpanded();
  const byVendor = {};

  for(const it of items){
    const vId = it.vendorId || "unknown";
    if(!byVendor[vId]){
      byVendor[vId] = {
        vendorId: vId,
        vendorShop: it.vendorShop || "Vendor",
        gross: 0,
        fee: 0,
        net: 0,
        items: []
      };
    }
    byVendor[vId].gross += it.line;
    byVendor[vId].items.push({
      productId: it.id,
      name: it.name,
      qty: it.qty,
      price: it.price,
      lineTotal: it.line
    });
  }

  let platformFeeTotal = 0;
  Object.values(byVendor).forEach(v=>{
    v.fee = Math.round(v.gross * COMMISSION_RATE);
    v.net = v.gross - v.fee;
    platformFeeTotal += v.fee;
  });

  return { subtotal, platformFeeTotal, byVendor };
}

function renderCartCount(){
  const count = Object.values(cart).reduce((a,b)=>a+b,0);
  el("cartCount").textContent = count;
}

function renderCart(){
  const { items, subtotal } = cartExpanded();
  const { platformFeeTotal } = commissionBreakdown();

  const wrapper = el("cartItems");
  el("cartEmpty")?.classList.toggle("hidden", items.length !== 0);

  wrapper.innerHTML = items.map(it => `
    <div class="cart-item">
      <img src="${escapeHtml(it.img)}" alt="${escapeHtml(it.name)}">
      <div>
        <h4>${escapeHtml(it.name)}</h4>
        <div class="meta">${escapeHtml(it.vendorShop || "Vendor")} • ${money(it.price)}</div>

        <div class="qty">
          <button onclick="addToCart('${escapeHtml(it.id)}', -1)">−</button>
          <span>${it.qty}</span>
          <button onclick="addToCart('${escapeHtml(it.id)}', 1)">+</button>
          <button class="remove" onclick="removeItem('${escapeHtml(it.id)}')">Remove</button>
        </div>
      </div>
    </div>
  `).join("");

  el("cartSubtotal").textContent = money(subtotal);
  el("cartCommission").textContent = money(platformFeeTotal);
  el("cartTotal").textContent = money(subtotal); // delivery added at checkout
}

function removeItem(id){
  delete cart[id];
  saveCart();
  renderCart();
  renderSummary();
  renderCartCount();
}

// ===================== CHECKOUT SUMMARY =====================
function renderSummary(){
  const { subtotal } = cartExpanded();
  const { platformFeeTotal } = commissionBreakdown();
  const deliveryType = document.querySelector("select[name='delivery']")?.value || "standard";
  const deliveryFee = deliveryType === "express" ? EXPRESS_FEE : 0;
  const total = subtotal + deliveryFee;

  // items list
  const { items } = cartExpanded();
  el("summaryItems").innerHTML = items.length ? items.map(it => `
    <div class="summary-item">
      <span>${escapeHtml(it.name)} × ${it.qty}</span>
      <strong>${money(it.line)}</strong>
    </div>
  `).join("") : `<p class="muted">No items yet.</p>`;

  el("summarySubtotal").textContent = money(subtotal);
  el("summaryCommission").textContent = money(platformFeeTotal);
  el("summaryDelivery").textContent = money(deliveryFee);
  el("summaryTotal").textContent = money(total);
}

// ===================== VENDOR PORTAL =====================
function vendorStatusText(){
  const s = getSession();
  if(!s) return "Not logged in";
  return `Logged in as ${s.shop} (${s.email})`;
}

function renderVendorUI(){
  const s = getSession();
  el("vendorStatus").textContent = vendorStatusText();
  el("vendorLogoutBtn").style.display = s ? "inline-flex" : "none";

  const listEl = el("vendorProductsList");
  const ordersEl = el("vendorOrdersList");

  if(!s){
    listEl.innerHTML = `<p class="muted small">Login to manage products.</p>`;
    ordersEl.innerHTML = `<p class="muted small">Login to view orders.</p>`;
    return;
  }

  const mine = products.filter(p => p.vendorId === s.vendorId);
  listEl.innerHTML = mine.length ? mine.map(p => `
    <div class="vendor-item">
      <div class="left">
        <strong>${escapeHtml(p.name)}</strong>
        <span class="muted small">${escapeHtml(p.category)} • ${money(p.price)}</span>
        <span class="muted small">Status: ${p.published ? "Visible" : "Hidden"} • Featured: ${p.featured ? "Yes" : "No"}</span>
      </div>
      <div class="right">
        <button class="btn outline" type="button" onclick="togglePublish('${escapeHtml(p.id)}')">${p.published ? "Hide" : "Publish"}</button>
        <button class="btn outline" type="button" onclick="toggleFeatured('${escapeHtml(p.id)}')">${p.featured ? "Unfeature" : "Feature"}</button>
        <button class="btn outline" type="button" onclick="deleteVendorProduct('${escapeHtml(p.id)}')">Delete</button>
      </div>
    </div>
  `).join("") : `<p class="muted small">No products yet. Add one above.</p>`;

  // Vendor orders (only COD stored locally; Stripe will be marked pending until backend confirms)
  const allOrders = loadOrders();
  const vendorOrders = allOrders.filter(o => (o.vendors || []).some(v => v.vendorId === s.vendorId));
  ordersEl.innerHTML = vendorOrders.length ? vendorOrders.slice(0, 12).map(o => {
    const v = (o.vendors || []).find(x => x.vendorId === s.vendorId);
    const gross = v?.gross || 0;
    const fee = v?.fee || 0;
    const net = v?.net || 0;
    return `
      <div class="vendor-item">
        <div class="left">
          <strong>Order ${escapeHtml(o.orderId)}</strong>
          <span class="muted small">${new Date(o.createdAt).toLocaleString()}</span>
          <span class="muted small">Payment: ${escapeHtml(o.payment)} • Status: ${escapeHtml(o.status)}</span>
          <span class="muted small">Your Gross: ${money(gross)} • Fee: ${money(fee)} • Payout: ${money(net)}</span>
        </div>
        <div class="right">
          <button class="btn outline" type="button" onclick="showOrderItems('${escapeHtml(o.orderId)}')">Items</button>
        </div>
      </div>
    `;
  }).join("") : `<p class="muted small">No orders yet.</p>`;
}

function togglePublish(id){
  const s = getSession();
  const p = products.find(x=>x.id===id);
  if(!s || !p || p.vendorId !== s.vendorId) return;
  p.published = !p.published;
  saveProducts();
  renderProducts();
  renderVendorUI();
}

function toggleFeatured(id){
  const s = getSession();
  const p = products.find(x=>x.id===id);
  if(!s || !p || p.vendorId !== s.vendorId) return;
  p.featured = !p.featured;
  saveProducts();
  renderProducts();
  renderVendorUI();
}

function deleteVendorProduct(id){
  const s = getSession();
  const p = products.find(x=>x.id===id);
  if(!s || !p || p.vendorId !== s.vendorId) return;

  products = products.filter(x => x.id !== id);
  saveProducts();

  if(cart[id]) { delete cart[id]; saveCart(); }

  renderCategoryOptions();
  renderProducts();
  renderCart();
  renderSummary();
  renderVendorUI();
}

function showOrderItems(orderId){
  const s = getSession();
  if(!s) return;
  const o = loadOrders().find(x => x.orderId === orderId);
  if(!o) return;

  const v = (o.vendors || []).find(x => x.vendorId === s.vendorId);
  const lines = (v?.items || []).map(it =>
    `• ${it.name} × ${it.qty} = ${money(it.lineTotal)}`
  ).join("\n");

  alert(
    `Order ${o.orderId}\n\n` +
    `Customer: ${o.customer?.name || "-"}\nPhone: ${o.customer?.phone || "-"}\nAddress: ${o.customer?.address || "-"}\n\n` +
    `Items:\n${lines || "(none)"}\n\n` +
    `Gross: ${money(v?.gross || 0)}\nFee: ${money(v?.fee || 0)}\nPayout: ${money(v?.net || 0)}`
  );
}

// ===================== AUTH EVENTS =====================
function initVendorPortal(){
  const loginForm = el("vendorLoginForm");
  const signupForm = el("vendorSignupForm");
  const productForm = el("vendorProductForm");

  loginForm.addEventListener("submit", (e)=>{
    e.preventDefault();
    const data = new FormData(loginForm);
    const email = String(data.get("email")).trim().toLowerCase();
    const password = String(data.get("password"));

    const vendors = loadVendors();
    const v = vendors.find(x => x.email === email && x.password === password);
    if(!v) return toast("Invalid login ❌");

    setSession({ vendorId: v.vendorId, email: v.email, shop: v.shop });
    loginForm.reset();
    toast("Logged in ✅");
    renderVendorUI();
  });

  signupForm.addEventListener("submit", (e)=>{
    e.preventDefault();
    const data = new FormData(signupForm);
    const shop = String(data.get("shop")).trim();
    const email = String(data.get("email")).trim().toLowerCase();
    const password = String(data.get("password"));

    const vendors = loadVendors();
    if(vendors.some(x => x.email === email)) return toast("Email already exists ❌");

    const vendorId = "v_" + Math.random().toString(16).slice(2);
    vendors.push({ vendorId, shop, email, password, approved:true });
    saveVendors(vendors);

    signupForm.reset();
    toast("Vendor created ✅ Now login.");
    renderVendorUI();
  });

  el("vendorLogoutBtn").addEventListener("click", ()=>{
    clearSession();
    toast("Logged out");
    renderVendorUI();
  });

  productForm.addEventListener("submit", (e)=>{
    e.preventDefault();
    const s = getSession();
    if(!s) return toast("Please login first.");

    const data = new FormData(productForm);
    const name = String(data.get("name")).trim();
    const price = Number(data.get("price"));
    const category = String(data.get("category")).trim();
    const img = String(data.get("img")).trim();
    const desc = String(data.get("desc")).trim();
    const published = String(data.get("published")) === "yes";
    const featured = String(data.get("featured")) === "yes";

    const id = "p_" + Math.random().toString(16).slice(2);
    products.push({
      id, name, price, category, img, desc,
      vendorId: s.vendorId,
      vendorShop: s.shop,
      published,
      featured
    });

    saveProducts();
    productForm.reset();
    renderCategoryOptions();
    renderProducts();
    renderVendorUI();
    toast("Product saved ✅");
  });
}

// ===================== CHECKOUT: COD + STRIPE =====================
async function handleCheckoutSubmit(e){
  e.preventDefault();

  const { subtotal } = cartExpanded();
  if(subtotal <= 0) return toast("Cart is empty.");

  const form = e.target;
  const fd = new FormData(form);

  const customer = {
    name: String(fd.get("name")).trim(),
    phone: String(fd.get("phone")).trim(),
    address: String(fd.get("address")).trim()
  };

  const delivery = String(fd.get("delivery"));
  const payment = String(fd.get("payment"));
  const deliveryFee = (delivery === "express") ? EXPRESS_FEE : 0;

  const { platformFeeTotal, byVendor } = commissionBreakdown();
  const total = subtotal + deliveryFee;

  const order = {
    orderId: "O" + Date.now(),
    createdAt: new Date().toISOString(),
    customer,
    delivery,
    deliveryFee,
    payment,
    subtotal,
    platformFeeTotal,
    total,
    vendors: Object.values(byVendor),
    status: payment === "cod" ? "Pending COD" : "Pending Payment"
  };

  // COD works everywhere (GitHub Pages OK)
  if(payment === "cod"){
    const all = loadOrders();
    all.unshift(order);
    saveOrders(all);

    clearCart();
    form.reset();
    renderSummary();
    renderVendorUI();

    alert(
      "Order placed ✅ (Cash on Delivery)\n\n" +
      `Subtotal: ${money(subtotal)}\n` +
      `Delivery: ${money(deliveryFee)}\n` +
      `Platform Commission: ${money(platformFeeTotal)}\n` +
      `Total: ${money(total)}\n\n` +
      `Order ID: ${order.orderId}`
    );
    return;
  }

  // Stripe Card option included; requires backend endpoint:
  // POST {order} -> {url}
  try{
    const all = loadOrders();
    all.unshift(order);
    saveOrders(all);

    const res = await fetch(`${BACKEND_URL}/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ order })
    });

    if(!res.ok) throw new Error("Stripe backend missing");
    const data = await res.json();
    if(!data?.url) throw new Error("No URL returned");

    window.location.href = data.url;
  }catch(err){
    // clean fallback message — no crash
    alert(
      "Card payment (Stripe) is included in the code ✅\n\n" +
      "But Stripe needs a backend server to create a Checkout Session.\n" +
      "Cash on Delivery works fully right now.\n\n" +
      "If you want, I can give you the ready backend code + deploy steps."
    );
    console.error(err);
  }
}

// ===================== STATS =====================
function updateStats(){
  el("statProducts").textContent = products.filter(p=>p.published===true).length;
  el("statVendors").textContent = loadVendors().length;
  el("statCommission").textContent = `${Math.round(COMMISSION_RATE*100)}%`;
}

// ===================== INIT =====================
function init(){
  el("year").textContent = new Date().getFullYear();

  loadProducts();
  loadCart();
  updateStats();

  renderCategoryOptions();
  renderProducts();
  renderCart();
  renderSummary();
  renderCartCount();
  renderVendorUI();

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
  document.querySelector("select[name='delivery']").addEventListener("change", renderSummary);

  el("checkoutForm").addEventListener("submit", handleCheckoutSubmit);

  initVendorPortal();
}

init();
