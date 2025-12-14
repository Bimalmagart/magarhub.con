/* ------------------ BASIC STORE ------------------ */
const PRODUCTS_KEY="products";
const CART_KEY="cart";
const VENDORS_KEY="vendors";
const SESSION_KEY="vendor_session";

let products=JSON.parse(localStorage.getItem(PRODUCTS_KEY)||"[]");
let cart=JSON.parse(localStorage.getItem(CART_KEY)||"{}");

const saveProducts=()=>localStorage.setItem(PRODUCTS_KEY,JSON.stringify(products));
const saveCart=()=>localStorage.setItem(CART_KEY,JSON.stringify(cart));

function scrollToSection(id){
  document.getElementById(id).scrollIntoView({behavior:"smooth"});
}

/* ------------------ CART ------------------ */
function addToCart(id){
  cart[id]=(cart[id]||0)+1;
  saveCart();
  renderCart();
}

function clearCart(){
  cart={};
  saveCart();
  renderCart();
}

function renderCart(){
  const el=document.getElementById("cartItems");
  el.innerHTML="";
  let total=0;
  Object.keys(cart).forEach(id=>{
    const p=products.find(x=>x.id===id);
    if(!p) return;
    total+=p.price*cart[id];
    el.innerHTML+=`<p>${p.name} × ${cart[id]}</p>`;
  });
  document.getElementById("cartTotal").textContent=total;
  document.getElementById("cartCount").textContent=
    Object.values(cart).reduce((a,b)=>a+b,0);
}

function openCart(){
  document.getElementById("cart").classList.toggle("hidden");
}

/* ------------------ PRODUCTS ------------------ */
function renderProducts(){
  const grid=document.getElementById("productsGrid");
  grid.innerHTML="";
  products.filter(p=>p.published).forEach(p=>{
    grid.innerHTML+=`
      <div class="card">
        <img src="${p.img}">
        <h4>${p.name}</h4>
        <p>${p.desc}</p>
        <strong>Rs ${p.price}</strong>
        <button onclick="addToCart('${p.id}')">Add</button>
      </div>`;
  });
}

/* ------------------ VENDORS ------------------ */
const vendors=()=>JSON.parse(localStorage.getItem(VENDORS_KEY)||"[]");
const saveVendors=v=>localStorage.setItem(VENDORS_KEY,JSON.stringify(v));
const session=()=>JSON.parse(localStorage.getItem(SESSION_KEY)||"null");

function renderVendor(){
  const s=session();
  document.getElementById("vendorStatus").textContent=
    s?`Logged in as ${s.shop}`:"Not logged in";

  const list=document.getElementById("vendorProductsList");
  if(!s){ list.innerHTML="Login first"; return; }

  list.innerHTML="";
  products.filter(p=>p.vendorId===s.vendorId).forEach(p=>{
    list.innerHTML+=`
      <div>
        ${p.name} (${p.published?"Visible":"Hidden"})
        <button onclick="togglePublish('${p.id}')">Toggle</button>
        <button onclick="deleteProduct('${p.id}')">Delete</button>
      </div>`;
  });
}

function togglePublish(id){
  const p=products.find(x=>x.id===id);
  p.published=!p.published;
  saveProducts();
  renderProducts();
  renderVendor();
}

function deleteProduct(id){
  products=products.filter(p=>p.id!==id);
  saveProducts();
  renderProducts();
  renderVendor();
}

/* ------------------ AUTH ------------------ */
document.getElementById("vendorSignupForm").onsubmit=e=>{
  e.preventDefault();
  const f=e.target;
  const v=vendors();
  v.push({
    vendorId:"v"+Date.now(),
    shop:f.shop.value,
    email:f.email.value,
    password:f.password.value
  });
  saveVendors(v);
  alert("Vendor created");
  f.reset();
};

document.getElementById("vendorLoginForm").onsubmit=e=>{
  e.preventDefault();
  const f=e.target;
  const v=vendors().find(x=>x.email===f.email.value && x.password===f.password.value);
  if(!v) return alert("Invalid");
  localStorage.setItem(SESSION_KEY,JSON.stringify(v));
  renderVendor();
};

document.getElementById("vendorLogoutBtn").onclick=()=>{
  localStorage.removeItem(SESSION_KEY);
  renderVendor();
};

document.getElementById("vendorProductForm").onsubmit=e=>{
  e.preventDefault();
  const s=session();
  if(!s) return alert("Login first");
  const f=e.target;
  products.push({
    id:"p"+Date.now(),
    name:f.name.value,
    price:+f.price.value,
    category:f.category.value,
    img:f.img.value,
    desc:f.desc.value,
    published:f.published.value==="yes",
    vendorId:s.vendorId
  });
  saveProducts();
  f.reset();
  renderProducts();
  renderVendor();
};

/* ------------------ INIT ------------------ */
renderProducts();
renderCart();
renderVendor();
