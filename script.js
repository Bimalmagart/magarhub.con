// ===================== SETTINGS =====================
const COMMISSION_RATE = 0.10;     // 10% platform commission
const EXPRESS_FEE = 200;          // Express delivery
const BACKEND_URL = "";           // Stripe backend base URL (leave "" for same-origin)

// ===================== STORAGE KEYS =====================
const STORAGE_PRODUCTS = "goldmart_products_v3";
const STORAGE_CART     = "goldmart_cart_v3";
const STORAGE_VENDORS  = "goldmart_vendors_v3";
const STORAGE_SESSION  = "goldmart_vendor_session_v3";
const STORAGE_ORDERS   = "goldmart_orders_v3";

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
function isLikelyUrl(u){
  try{
    const x = new URL(u);
    return x.protocol === "http:" || x.protocol === "https:";
  }catch{ return false; }
}
function toast(msg){
  const t = el("toast");
  if(!t) { alert(msg); return; }
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(()=> t.classList.add("hidden"), 2200);
}
function scrollToSection(id){
  const target = document.getElementById(id);
  if(target) target.scrollIntoView({behavior:"smooth", block:"start"});
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
  const vendors = loadVendors();
  if(vendors.length === 0){
    vendors.push(
      { vendorId:"v_demo1", shop:"Gold Electronics", email:"gold@vendor.com", password:"123456", approved:true },
      { vendorId:"v_demo2", shop:"Black Fashion",   email:"black@vendor.com", password:"123456", approved:true }
    );
    saveVendors(vendors);
  }

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
  renderCart();
  renderSummary();
  toast("Demo products loaded ✅");
}

// ===================== PRODUCTS UI =====================
function renderCategoryOptions(){
  const select = el("categorySelect");
  if(!select) return;

  const cats = ["all", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
  select.innerHTML = cats.map(c=>{
    const label = c === "all" ? "All categories" : c;
    return `<option value="${escapeHtml(c)}">${escapeHtml(label)}</option>`;
  }).join("");
}

function getFilteredProducts(){
  const q = (el("searchInput")?.value || "").trim().toLowerCase();
  const cat = el("categorySelect")?.value || "all";
  const sort = el("sortSelect")?.value || "featured";

  let list = products.filter(p => p.published === true);

  if(cat !== "all") list = list.filter(p => p.category === cat);

  if(q){
    list = list.filter(p =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (p.desc || "").toLowerCase().includes(q) ||
      (p.vendorShop || "").toLowerCase().includes(q)
    );
  }

  if(sort === "low") list.sort((a,b)=>(a.price||0)-(b.price||0));
  if(sort === "high") list.sort((a,b)=>(b.price||0)-(a.price||0));
  if(sort === "name") list.sort((a,b)=>(a.name||"").localeCompare(b.name||""));
  if(sort === "featured"){
    list.sort((a,b)=>{
      const fa = a.featured ? 1 : 0;
      const fb = b.featured ? 1 : 0;
      if(fb !== fa) return fb - fa;
      return (a.name||"").localeCompare(b.name||"");
    });
  }

  return list;
}

function renderProducts(){
  const grid = el("productsGrid");
  if(!grid) return;

  const list = getFilteredProducts();
  el("emptyState")?.classList.toggle("hidden", list.length !== 0);

  grid.innerHTML = list.map(p => `
    <article class="card">
      <img src="${escapeHtml(p.img || "")}"
           alt="${escapeHtml(p.name || "")}"
           loading="lazy"
           onerror="this.onerror=null;this.src='https://dummyimage.com/800x500/0b0b10/d6b25e&text=GoldMart';">
      <div class="card-body">
        <div class="card-title">${escapeHtml(p.name)}</div>
        <div class="card-desc">${escapeHtml(p.desc)}</div>

        <div class="card-row">
          <div class="price">${money(p.price)}</div>
          <span class="tag">${escapeHtml(p.category || "General")}</span>
        </div>

        <div class="card-row">
          <span class="seller">${escapeHtml(p.vendorShop || "Vendor")}</span>
          <button class="btn gold" type="button" onclick="addToCart('${escapeHtml(p.id)}', 1)">Add</button>
        </div>

        <div class="card-row">
          <button class="btn outline" type="button" onclick="openModal('${escapeHtml(p.id)}')">Quick View</button>
        </div>
      </div>
    </article>
  `).join("");

  updateStats();
}

// ===================== MODAL =====================
function openModal(id){
  const p = products.find(x=>x.id===id && x.published===true);
  if(!p) return;

  if(el("modalImg")){
    el("modalImg").src = p.img || "";
    el("modalImg").onerror = function(){
      this.onerror = null;
      this.src = "https://dummyimage.com/900x600/0b0b10/d6b25e&text=GoldMart";
    };
  }
  if(el("modalName")) el("modalName").textContent = p.name || "";
  if(el("modalDesc")) el("modalDesc").textContent = p.desc || "";
  if(el("modalPrice")) el("modalPrice").textContent = money(p.price);
  if(el("modalCat")) el("modalCat").textContent = p.category || "General";
  if(el("modalSeller")) el("modalSeller").textContent = p.vendorShop || "Vendor";

  if(el("modalAdd")){
    el("modalAdd").onclick = () => { addToCart(p.id, 1); closeModal(); };
  }
  el("modal")?.classList.remove("hidden");
}
function closeModal(){ el("modal")?.classList.add("hidden"); }

// ===================== CART =====================
function openCart(){ el("cart")?.classList.remove("hidden"); }
function closeCart(){ el("cart")?.classList.add("hidden"); }

function normalizeCart(){
  // remove items that no longer exist
  let changed = false;
  for(const id of Object.keys(cart)){
    const exists = products.some(p=>p.id===id);
    if(!exists){
      delete cart[id];
      changed = true;
    }
  }
  if(changed) saveCart();
}

function addToCart(id, qty){
  if(!products.some(p=>p.id===id && p.published===true)){
    toast("This product is not available.");
    return;
  }
  cart[id] = (cart[id] || 0) + qty;
  if(cart[id] <= 0) delete cart[id];
  saveCart();
  renderCart();
  renderSummary();
  renderCartCount();
  toast(qty > 0 ? "Added to cart ✅" : "Updated cart ✅");
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
    const line = (p.price || 0) * qty;
    subtotal += line;
    return { ...p, qty, line };
  }).filter(Boolean);

  return { items, subtotal };
}

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
  if(el("cartCount")) el("cartCount").textContent = count;
}

function removeItem(id){
  delete cart[id];
  saveCart();
  renderCart();
  renderSummary();
  renderCartCount();
}

function renderCart(){
  normalizeCart();

  const wrapper = el("cartItems");
  if(!wrapper) return;

  const { items, subtotal } = cartExpanded();
  const { platformFeeTotal } = commissionBreakdown();

  el("cartEmpty")?.classList.toggle("hidden", items.length !== 0);

  wrapper.innerHTML = items.map(it => `
    <div class="cart-item">
      <img src="${escapeHtml(it.img || "")}" alt="${escapeHtml(it.name || "")}"
           onerror="this.onerror=null;this.src='https://dummyimage.com/300x300/0b0b10/d6b25e&text=GoldMart';">
      <div>
        <h4>${escapeHtml(it.name)}</h4>
        <div class="meta">${escapeHtml(it.vendorShop || "Vendor")} • ${money(it.price)}</div>

        <div class="qty">
          <button type="button" onclick="addToCart('${escapeHtml(it.id)}', -1)">−</button>
          <span>${it.qty}</span>
          <button type="button" onclick="addToCart('${escapeHtml(it.id)}', 1)">+</button>
          <button class="remove" type="button" onclick="removeItem('${escapeHtml(it.id)}')">Remove</button>
        </div>
      </div>
    </div>
  `).join("");

  if(el("cartSubtotal")) el("cartSubtotal").textContent = money(subtotal);
  if(el("cartCommission")) el("cartCommission").textContent = money(platformFeeTotal);
  if(el("cartTotal")) el("cartTotal").textContent = money(subtotal);
}

// ===================== CHECKOUT SUMMARY =====================
function renderSummary(){
  const { subtotal, items } = cartExpanded();
  const { platformFeeTotal } = commissionBreakdown();

  const deliveryType = document.querySelector("select[name='delivery']")?.value || "standard";
  const deliveryFee = deliveryType === "express" ? EXPRESS_FEE : 0;
  const total = subtotal + deliveryFee;

  if(el("summaryItems")){
    el("summaryItems").innerHTML = items.length ? items.map(it => `
      <div class="summary-item">
        <span>${escapeHtml(it.name)} × ${it.qty}</span>
        <strong>${money(it.line)}</strong>
      </div>
    `).join("") : `<p class="muted">No items yet.</p>`;
  }

  if(el("summarySubtotal")) el("summarySubtotal").textContent = money(subtotal);
  if(el("summaryCommission")) el("summaryCommission").textContent = money(platformFeeTotal);
  if(el("summaryDelivery")) el("summaryDelivery").textContent = money(deliveryFee);
  if(el("summaryTotal")) el("summaryTotal").textContent = money(total);
}

// ===================== VENDOR PORTAL =====================
function vendorStatusText(){
  const s = getSession();
  if(!s) return "Not logged in";
  return `Logged in as ${s.shop} (${s.email})`;
}

function togglePublish(id){
  const s = getSession();
  const p = products.find(x=>x.id===id);
  if(!s || !p || p.vendorId !== s.vendorId) return;
  p.published = !p.published;
  saveProducts();
  renderCategoryOptions();
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

function renderVendorUI(){
  const s = getSession();
  if(el("vendorStatus")) el("vendorStatus").textContent = vendorStatusText();
  if(el("vendorLogoutBtn")) el("vendorLogoutBtn").style.display = s ? "inline-flex" : "none";

  const listEl = el("vendorProductsList");
  const ordersEl = el("vendorOrdersList");
  if(!listEl || !ordersEl) return;

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
        <span class="muted small">${escapeHtml(p.category || "General")} • ${money(p.price)}</span>
        <span class="muted small">Status: ${p.published ? "Visible" : "Hidden"} • Featured: ${p.featured ? "Yes" : "No"}</span>
      </div>
      <div class="right">
        <button class="btn outline" type="button" onclick="togglePublish('${escapeHtml(p.id)}')">${p.published ? "Hide" : "Publish"}</button>
        <button class="btn outline" type="button" onclick="toggleFeatured('${escapeHtml(p.id)}')">${p.featured ? "Unfeature" : "Feature"}</button>
        <button class="btn outline" type="button" onclick="deleteVendorProduct('${escapeHtml(p.id)}')">Delete</button>
      </div>
    </div>
  `).join("") : `<p class="muted small">No products yet. Add one above.</p>`;

  const allOrders = loadOrders();
  const vendorOrders = allOrders.filter(o => Array.isArray(o.vendors) && o.vendors.some(v => v.vendorId === s.vendorId));

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
          <span class="muted small">Gross: ${money(gross)} • Fee: ${money(fee)} • Payout: ${money(net)}</span>
        </div>
        <div class="right">
          <button class="btn outline" type="button" onclick="showOrderItems('${escapeHtml(o.orderId)}')">Items</button>
        </div>
      </div>
    `;
  }).join("") : `<p class="muted small">No orders yet.</p>`;
}

function showOrderItems(orderId){
  const s = getSession();
  if(!s) return;

  const o = loadOrders().find(x => x.orderId === orderId);
  if(!o) return;

  const v = (o.vendors || []).find(x => x.vendorId === s.vendorId);
  const lines = (v?.items || []).map(it => `• ${it.name} × ${it.qty} = ${money(it.lineTotal)}`).join("\n");

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

  if(loginForm){
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
  }

  if(signupForm){
    signupForm.addEventListener("submit", (e)=>{
      e.preventDefault();
      const data = new FormData(signupForm);
      const shop = String(data.get("shop")).trim();
      const email = String(data.get("email")).trim().toLowerCase();
      const password = String(data.get("password"));

      if(shop.length < 2) return toast("Shop name too short.");
      if(password.length < 6) return toast("Password must be 6+ characters.");

      const vendors = loadVendors();
      if(vendors.some(x => x.email === email)) return toast("Email already exists ❌");

      const vendorId = "v_" + Math.random().toString(16).slice(2);
      vendors.push({ vendorId, shop, email, password, approved:true });
      saveVendors(vendors);

      signupForm.reset();
      toast("Vendor created ✅ Now login.");
      renderVendorUI();
    });
  }

  if(el("vendorLogoutBtn")){
    el("vendorLogoutBtn").addEventListener("click", ()=>{
      clearSession();
      toast("Logged out");
      renderVendorUI();
    });
  }

  if(productForm){
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

      if(name.length < 2) return toast("Product name too short.");
      if(!Number.isFinite(price) || price <= 0) return toast("Invalid price.");
      if(category.length < 2) return toast("Category too short.");
      if(!isLikelyUrl(img)) return toast("Please use a valid http/https image URL.");
      if(desc.length < 5) return toast("Description too short.");

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

  if(customer.name.length < 2) return toast("Enter valid name.");
  if(customer.phone.length < 6) return toast("Enter valid phone.");
  if(customer.address.length < 6) return toast("Enter valid address.");

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
  try{
    const all = loadOrders();
    all.unshift(order);
    saveOrders(all);

    const url = `${BACKEND_URL}/create-checkout-session`.replace(/^\/create/, "/create");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ order })
    });

    if(!res.ok) throw new Error("Stripe backend missing or error");
    const data = await res.json();
    if(!data?.url) throw new Error("No URL returned");

    window.location.href = data.url;
  }catch(err){
    alert(
      "Card payment (Stripe) is included ✅\n\n" +
      "But Stripe needs a backend server to create a Checkout Session.\n" +
      "Cash on Delivery works fully right now.\n\n" +
      "If you want, send me your hosting choice (Render/Railway) and I’ll give final backend + connect BACKEND_URL."
    );
    console.error(err);
  }
}

// ===================== STATS =====================
function updateStats(){
  if(el("statProducts")) el("statProducts").textContent = products.filter(p=>p.published===true).length;
  if(el("statVendors")) el("statVendors").textContent = loadVendors().length;
  if(el("statCommission")) el("statCommission").textContent = `${Math.round(COMMISSION_RATE*100)}%`;
}

// ===================== INIT =====================
function init(){
  if(el("year")) el("year").textContent = new Date().getFullYear();

  loadProducts();
  loadCart();
  normalizeCart();
  updateStats();

  renderCategoryOptions();
  renderProducts();
  renderCart();
  renderSummary();
  renderCartCount();
  renderVendorUI();

  // UI events (safe)
  el("cartOpenBtn")?.addEventListener("click", openCart);
  el("cartCloseBtn")?.addEventListener("click", closeCart);
  el("clearCartBtn")?.addEventListener("click", clearCart);

  el("modalBackdrop")?.addEventListener("click", closeModal);
  el("modalClose")?.addEventListener("click", closeModal);

  el("searchInput")?.addEventListener("input", renderProducts);
  el("categorySelect")?.addEventListener("change", renderProducts);
  el("sortSelect")?.addEventListener("change", renderProducts);

  el("summaryGoCart")?.addEventListener("click", openCart);

  document.querySelector("select[name='delivery']")?.addEventListener("change", renderSummary);

  el("checkoutForm")?.addEventListener("submit", handleCheckoutSubmit);

  initVendorPortal();
}

init();
