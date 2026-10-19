const products = [
  {id:1,name:"Phantom Blue 01",category:"running",type:"RUNNING / 01",price:8490,oldPrice:9990,label:"BESTSELLER",desc:"Лёгкий силуэт и энергия для каждого километра.",image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",sizes:[39,40,41,42,43,44,45]},
  {id:2,name:"Midnight Runner",category:"running",type:"RUNNING / 02",price:7290,label:"NEW DROP",desc:"Глубокий чёрный. Максимальный комфорт в движении.",image:"https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=85",sizes:[39,40,41,42,43,44]},
  {id:3,name:"Blue District",category:"street",type:"STREETWEAR / 01",price:9690,label:"LIMITED",desc:"Выразительная пара для тех, кто задаёт тренды.",image:"https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=85",sizes:[40,41,42,43,44,45]},
  {id:4,name:"Cloud Shift",category:"classic",type:"CLASSIC / 01",price:6790,label:"EVERYDAY",desc:"Чистые линии и универсальный стиль на каждый день.",image:"https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=900&q=85",sizes:[38,39,40,41,42,43,44]},
  {id:5,name:"Electric Wave",category:"street",type:"STREETWEAR / 02",price:10990,label:"EDITOR'S PICK",desc:"Контрастные детали и смелая городская геометрия.",image:"https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=85",sizes:[39,40,41,42,43,44,45]},
  {id:6,name:"Core Mono",category:"classic",type:"CLASSIC / 02",price:5990,label:"CORE SERIES",desc:"Минималистичная база, которая сочетается со всем.",image:"https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=85",sizes:[38,39,40,41,42,43,44]}
];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => new Intl.NumberFormat("ru-RU").format(n) + " ₽";
let activeCategory = "all", searchTerm = "", sortMode = "featured";
let cart = JSON.parse(localStorage.getItem("bazeCart") || "[]");
let favorites = JSON.parse(localStorage.getItem("bazeFavorites") || "[]");
let currentProduct = null, selectedSize = 42, toastTimer;

function saveCart(){ localStorage.setItem("bazeCart",JSON.stringify(cart)); }
function saveFavorites(){ localStorage.setItem("bazeFavorites",JSON.stringify(favorites)); }
function visibleProducts(){
  let list = products.filter(p => (activeCategory==="all" || p.category===activeCategory) && (p.name+" "+p.type+" "+p.desc).toLowerCase().includes(searchTerm.toLowerCase()));
  if(sortMode==="low") list.sort((a,b)=>a.price-b.price);
  if(sortMode==="high") list.sort((a,b)=>b.price-a.price);
  return list;
}
function renderProducts(){
  const list=visibleProducts();
  $("#resultCount").textContent=String(list.length).padStart(2,"0")+" моделей";
  $("#productGrid").innerHTML=list.length?list.map(p=>`
    <article class="product-card">
      <div class="product-image" data-view="${p.id}" tabindex="0" role="button" aria-label="Подробнее: ${p.name}">
        <span class="product-label">${p.label}</span>
        <button class="favorite ${favorites.includes(p.id)?"active":""}" data-fav="${p.id}" aria-label="Добавить ${p.name} в избранное">${favorites.includes(p.id)?"♥":"♡"}</button>
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.opacity='.15'">
      </div>
      <div class="product-info"><div class="product-meta"><span>${p.type}</span><span>★ 4.9</span></div>
      <h3 class="product-name">${p.name}</h3><p class="product-desc">${p.desc}</p>
      <div class="product-bottom"><div class="price">${money(p.price)} ${p.oldPrice?`<span class="old-price">${money(p.oldPrice)}</span>`:""}</div><button class="add-btn" data-add="${p.id}" aria-label="Добавить ${p.name} в корзину">+</button></div></div>
    </article>`).join(""):`<div class="no-results"><strong>Ничего не найдено</strong>Попробуй изменить поиск или выбрать другую категорию.</div>`;
}
function showToast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2400)}
function addToCart(id,size=42){const p=products.find(x=>x.id===id);if(!p)return;const found=cart.find(x=>x.id===id&&x.size===size);if(found)found.qty++;else cart.push({id,size,qty:1});saveCart();renderCart();showToast(`${p.name} добавлен в корзину`)}
function cartQuantity(){return cart.reduce((sum,x)=>sum+x.qty,0)}
function cartTotal(){return cart.reduce((sum,x)=>sum+products.find(p=>p.id===x.id).price*x.qty,0)}
function renderCart(){
  $("#cartCount").textContent=cartQuantity();$("#drawerCount").textContent=`(${cartQuantity()})`;
  $("#cartTotal").textContent=money(cartTotal());$("#checkoutTotal").textContent=money(cartTotal());
  const empty=cart.length===0;$("#cartEmpty").style.display=empty?"block":"none";$("#cartBottom").style.display=empty?"none":"block";
  $("#cartItems").innerHTML=cart.map(item=>{const p=products.find(x=>x.id===item.id);return `<div class="cart-line"><img src="${p.image}" alt=""><div><h3>${p.name}</h3><p>Размер: EU ${item.size}</p><span class="line-price">${money(p.price)}</span><div class="qty-control"><button data-qty="${p.id}" data-size="${item.size}" data-delta="-1" aria-label="Уменьшить">−</button><span>${item.qty}</span><button data-qty="${p.id}" data-size="${item.size}" data-delta="1" aria-label="Увеличить">+</button></div></div><button class="remove-item" data-remove="${p.id}" data-size="${item.size}" aria-label="Удалить">×</button></div>`}).join("");
}
function openCart(){ $("#overlay").classList.add("open");$("#cartDrawer").classList.add("open");$("#cartDrawer").setAttribute("aria-hidden","false");document.body.classList.add("locked")}
function closeCart(){ $("#overlay").classList.remove("open");$("#cartDrawer").classList.remove("open");$("#cartDrawer").setAttribute("aria-hidden","true");document.body.classList.remove("locked")}
function openProduct(id){const p=products.find(x=>x.id===id);if(!p)return;currentProduct=p;selectedSize=p.sizes.includes(42)?42:p.sizes[0];$("#modalContent").innerHTML=`<div class="modal-product"><div class="modal-product-image"><img src="${p.image}" alt="${p.name}"></div><div class="modal-product-copy"><div class="eyebrow"><span class="eyebrow-line"></span> ${p.type}</div><h2>${p.name}</h2><p>${p.desc} Подходит для повседневного движения и городских маршрутов.</p><div class="modal-price">${money(p.price)} ${p.oldPrice?`<span class="old-price">${money(p.oldPrice)}</span>`:""}</div><span class="size-label">ВЫБЕРИ РАЗМЕР (EU)</span><div class="size-options">${p.sizes.map(s=>`<button class="size-option ${s===selectedSize?"selected":""}" data-size-select="${s}">${s}</button>`).join("")}</div><button class="button button-primary modal-add" id="modalAdd">Добавить в корзину <span>↗</span></button></div></div>`;
  $("#productModal").classList.add("open");document.body.classList.add("locked");
}
function closeProduct(){$("#productModal").classList.remove("open");if(!$("#cartDrawer").classList.contains("open")&&!$("#checkoutModal").classList.contains("open"))document.body.classList.remove("locked")}
function openCheckout(){if(!cart.length){showToast("Сначала добавь товар в корзину");return}closeCart();$("#checkoutModal").classList.add("open");document.body.classList.add("locked");$("#checkoutForm").hidden=false;$("#orderSuccess").hidden=true}
function closeCheckout(){$("#checkoutModal").classList.remove("open");document.body.classList.remove("locked")}
function toggleFavorite(id){favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];saveFavorites();renderProducts();showToast(favorites.includes(id)?"Добавлено в избранное":"Удалено из избранного")}

$("#productGrid").addEventListener("click",e=>{
 const fav=e.target.closest("[data-fav]");if(fav){e.stopPropagation();toggleFavorite(Number(fav.dataset.fav));return}
 const add=e.target.closest("[data-add]");if(add){addToCart(Number(add.dataset.add));return}
 const view=e.target.closest("[data-view]");if(view)openProduct(Number(view.dataset.view));
});
$("#productGrid").addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-view]")){e.preventDefault();openProduct(Number(e.target.dataset.view))}});
$$(".filter").forEach(btn=>btn.addEventListener("click",()=>{activeCategory=btn.dataset.category;$$(".filter").forEach(b=>b.classList.toggle("active",b===btn));renderProducts()}));
$("#searchInput").addEventListener("input",e=>{searchTerm=e.target.value;renderProducts()});
$(".search-open").addEventListener("click",()=>{$("#searchInput").focus();$("#catalog").scrollIntoView({behavior:"smooth"})});
$("#sortSelect").addEventListener("change",e=>{sortMode=e.target.value;renderProducts()});
$("#openCart").addEventListener("click",openCart);$("#closeCart").addEventListener("click",closeCart);$("#overlay").addEventListener("click",closeCart);$("#continueShopping").addEventListener("click",()=>{closeCart();$("#catalog").scrollIntoView({behavior:"smooth"})});
$("#cartItems").addEventListener("click",e=>{
 const qty=e.target.closest("[data-qty]");if(qty){const item=cart.find(x=>x.id===Number(qty.dataset.qty)&&x.size===Number(qty.dataset.size));if(item){item.qty+=Number(qty.dataset.delta);if(item.qty<=0)cart=cart.filter(x=>x!==item);saveCart();renderCart()}return}
 const rem=e.target.closest("[data-remove]");if(rem){cart=cart.filter(x=>!(x.id===Number(rem.dataset.remove)&&x.size===Number(rem.dataset.size)));saveCart();renderCart()}
});
$("#closeModal").addEventListener("click",closeProduct);$("#productModal").addEventListener("click",e=>{if(e.target===$("#productModal"))closeProduct()});
$("#modalContent").addEventListener("click",e=>{const s=e.target.closest("[data-size-select]");if(s){selectedSize=Number(s.dataset.sizeSelect);$$(".size-option").forEach(b=>b.classList.toggle("selected",Number(b.dataset.sizeSelect)===selectedSize));return}if(e.target.closest("#modalAdd")){addToCart(currentProduct.id,selectedSize);closeProduct();openCart()}});
$("#checkoutBtn").addEventListener("click",openCheckout);$("#closeCheckout").addEventListener("click",closeCheckout);$("#checkoutModal").addEventListener("click",e=>{if(e.target===$("#checkoutModal"))closeCheckout()});
$("#checkoutForm").addEventListener("submit",e=>{e.preventDefault();if(!cart.length)return;const data=new FormData(e.currentTarget);const orderId="BC-"+Math.random().toString(36).slice(2,8).toUpperCase();$("#successText").textContent=`${data.get("name")}, спасибо! Номер демо-заказа ${orderId}. Подтверждение не отправляется, так как магазин работает в демонстрационном режиме.`;$("#checkoutForm").hidden=true;$("#orderSuccess").hidden=false;cart=[];saveCart();renderCart()});
$("#finishOrder").addEventListener("click",()=>{closeCheckout();$("#catalog").scrollIntoView({behavior:"smooth"})});
$("#newsletterForm").addEventListener("submit",e=>{e.preventDefault();const email=$("#emailInput").value.trim();if(!email)return;$("#newsletterMessage").textContent="Спасибо! Подписка сохранена только в рамках этой демонстрации.";$("#newsletterMessage").style.color="#245bff";e.currentTarget.reset();showToast("Ты в списке Baze China ✳")});
$("#menuToggle").addEventListener("click",()=>$(".nav").classList.toggle("open"));
$$(".nav a").forEach(a=>a.addEventListener("click",()=>$(".nav").classList.remove("open")));
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeCart();closeProduct();closeCheckout();$(".nav").classList.remove("open")}});
renderProducts();renderCart();
