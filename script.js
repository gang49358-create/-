let products = [
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

// Supabase client: publishable key is intended for browser use; database RLS protects writes.
const SUPABASE_URL = "https://mpmdhxhhsljllouqrbtr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_wZfkO7LLjZyX8Z0D7_b4GA_YhLXsdP9";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let isAdmin = false;
let productsLoadedFromDb = false;
const fallbackProducts = products.map(p => ({...p, sizes:[...p.sizes]}));

function mapProductRow(row){
  return {id:Number(row.id), name:row.name, category:row.category, type:row.type || `${String(row.category||"classic").toUpperCase()} / CUSTOM`, price:Number(row.price), oldPrice:row.old_price==null?null:Number(row.old_price), label:row.label||"NEW", desc:row.description||"", image:row.image||"", sizes:Array.isArray(row.sizes)&&row.sizes.length?row.sizes:[39,40,41,42,43,44,45]};
}
function productToRow(p){
  return {name:p.name,category:p.category,type:p.type,price:p.price,old_price:p.oldPrice||null,label:p.label||"NEW",description:p.desc||"",image:p.image||"",sizes:p.sizes||[39,40,41,42,43,44,45]};
}
async function refreshProductsFromDb(){
  const {data,error}=await supabaseClient.from("products").select("*").order("id",{ascending:true});
  if(error){console.error("Supabase products read failed:",error.message);showToast("Не удалось загрузить товары из базы");return false;}
  productsLoadedFromDb=Boolean(data && data.length);
  if(data.length){products=data.map(mapProductRow);}
  else {products=fallbackProducts.map(p=>({...p,sizes:[...p.sizes]}));}
  // Remove cart entries for products that no longer exist in the active catalog.
  cart=cart.filter(item=>products.some(p=>p.id===item.id));saveCart();renderProducts();renderCart();
  return true;
}
async function verifyAdminSession(){
  const {data:{user},error:authError}=await supabaseClient.auth.getUser();
  if(authError||!user)return false;
  const {data,error}=await supabaseClient.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();
  if(error){console.error("Admin check failed:",error.message);return false;}
  return Boolean(data);
}
async function seedProductsIfEmpty(){
  const {data,error}=await supabaseClient.from("products").select("id").limit(1);
  if(error)throw error;
  if(data.length)return;
  const seed=fallbackProducts.map(productToRow);
  const {error:insertError}=await supabaseClient.from("products").insert(seed);
  if(insertError)throw insertError;
  await refreshProductsFromDb();
}
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
function cartTotal(){return cart.reduce((sum,x)=>{const p=products.find(item=>item.id===x.id);return sum+(p?p.price*x.qty:0)},0)}
function renderCart(){
  $("#cartCount").textContent=cartQuantity();$("#drawerCount").textContent=`(${cartQuantity()})`;
  $("#cartTotal").textContent=money(cartTotal());$("#checkoutTotal").textContent=money(cartTotal());
  const empty=cart.length===0;$("#cartEmpty").style.display=empty?"block":"none";$("#cartBottom").style.display=empty?"none":"block";
  $("#cartItems").innerHTML=cart.map(item=>{const p=products.find(x=>x.id===item.id);if(!p)return "";return `<div class="cart-line"><img src="${p.image}" alt=""><div><h3>${p.name}</h3><p>Размер: EU ${item.size}</p><span class="line-price">${money(p.price)}</span><div class="qty-control"><button data-qty="${p.id}" data-size="${item.size}" data-delta="-1" aria-label="Уменьшить">−</button><span>${item.qty}</span><button data-qty="${p.id}" data-size="${item.size}" data-delta="1" aria-label="Увеличить">+</button></div></div><button class="remove-item" data-remove="${p.id}" data-size="${item.size}" aria-label="Удалить">×</button></div>`}).join("");
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
$("#checkoutForm").addEventListener("submit",async e=>{
 e.preventDefault();
 if(!cart.length){showToast("Корзина пуста");return}
 if(!productsLoadedFromDb){showToast("Каталог ещё не загружен в базу. Попроси администратора войти в панель и проверить товары.");return}
 const form=e.currentTarget;
 const submitButton=form.querySelector('button[type="submit"]');
 const data=new FormData(form);
 const items=cart.map(item=>({product_id:Number(item.id),size:Number(item.size),quantity:Number(item.qty)}));
 submitButton.disabled=true;submitButton.textContent="Сохраняем заказ…";
 try{
  const {data:orderId,error}=await supabaseClient.rpc("create_store_order",{
   p_customer_name:String(data.get("name")||"").trim(),
   p_phone:String(data.get("phone")||"").trim(),
   p_address:String(data.get("address")||"").trim(),
   p_items:items,
   p_email:String(data.get("email")||"").trim()||null,
   p_comment:"Способ доставки: "+String(data.get("delivery")||"Курьер")
  });
  if(error)throw error;
  if(!orderId)throw new Error("База не вернула номер заказа");
  $("#successText").textContent=`${String(data.get("name")).trim()}, спасибо! Заказ №${orderId} сохранён. Продавец сможет подтвердить его после проверки. Онлайн-оплаты пока нет.`;
  $("#checkoutForm").hidden=true;$("#orderSuccess").hidden=false;
  cart=[];saveCart();renderCart();form.reset();
 }catch(err){
  console.error("Order submission failed:",err);
  const msg=String(err?.message||"");
  if(msg.includes("Product not found"))showToast("Товары ещё не заведены в базе. Войди в админ-панель и проверь каталог.");
  else if(msg.includes("Invalid product size"))showToast("Выбранный размер недоступен. Обнови каталог и попробуй снова.");
  else showToast("Не удалось сохранить заказ. Проверь функцию create_store_order в Supabase.");
 }finally{submitButton.disabled=false;submitButton.innerHTML='Отправить заказ <span>↗</span>'}
});
$("#finishOrder").addEventListener("click",()=>{closeCheckout();$("#catalog").scrollIntoView({behavior:"smooth"})});
$("#newsletterForm").addEventListener("submit",e=>{e.preventDefault();const email=$("#emailInput").value.trim();if(!email)return;$("#newsletterMessage").textContent="Спасибо! Подписка сохранена только в рамках этой демонстрации.";$("#newsletterMessage").style.color="#245bff";e.currentTarget.reset();showToast("Ты в списке Baze China ✳")});
$("#menuToggle").addEventListener("click",()=>$(".nav").classList.toggle("open"));
$$(".nav a").forEach(a=>a.addEventListener("click",()=>$(".nav").classList.remove("open")));
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeCart();closeProduct();closeCheckout();$(".nav").classList.remove("open")}});
renderProducts();renderCart();


// Demo content for community, editorial news and browser-only admin panel.
const defaultReviews=[
 {id:101,name:"Артём",rating:5,text:"Очень стильная подача и удобный интерфейс. Визуально прям то, что нужно для streetwear.",date:"12.10.2026"},
 {id:102,name:"Милана",rating:5,text:"Понравились синие акценты и подборка моделей. Хочется увидеть ещё больше новых дропов.",date:"08.10.2026"},
 {id:103,name:"Даниил",rating:4,text:"Классная концепция магазина. Особенно понравилась возможность выбрать размер прямо в карточке.",date:"02.10.2026"}
];
const defaultNews=[
 {id:201,date:"19 OCT 2026",tag:"NEW DROP",title:"Скоро: новая волна синего",text:"Вдохновение ночным городом, электрические оттенки и свежие силуэты. Следи за обновлениями Baze China.",symbol:"DROP 02"},
 {id:202,date:"12 OCT 2026",tag:"BRAND NOTES",title:"Почему мы выбираем синий",text:"Синий — это движение, глубина и уверенность. Он стал визуальным кодом нашей концепции streetwear.",symbol:"BLUE"},
 {id:203,date:"04 OCT 2026",tag:"COMMUNITY",title:"Твой стиль — твои правила",text:"Baze China задуман как пространство для тех, кто смешивает направления и создаёт собственные правила.",symbol:"MOVE"}
];
// Новости и отзывы загружаются из Supabase, а не из localStorage.
let reviews=[];
let newsItems=[];
let adminTab="products";
function mapNewsRow(row){
 let displayDate = "НОВОСТЬ";
 if (row.date) {
  const rawDate = String(row.date);
  if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
   const [year, month, day] = rawDate.slice(0, 10).split("-");
   displayDate = `${day}.${month}.${year}`;
  } else {
   displayDate = rawDate;
  }
 } else if (row.created_at) {
  displayDate = new Date(row.created_at).toLocaleDateString("ru-RU");
 }
 return {id:row.id,date:displayDate,tag:row.tag||row.category||"BAZE NEWS",title:row.title||"",text:row.text||row.content||row.body||"",symbol:row.symbol||"B/C"};
}
function mapReviewRow(row){
 let displayDate = "СЕГОДНЯ";
 if (row.date) {
  const rawDate = String(row.date);
  if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
   const [year, month, day] = rawDate.slice(0, 10).split("-");
   displayDate = `${day}.${month}.${year}`;
  } else {
   displayDate = rawDate;
  }
 } else if (row.created_at) {
  displayDate = new Date(row.created_at).toLocaleDateString("ru-RU");
 }
 return {id:row.id,name:row.name||row.author_name||"Покупатель",rating:Math.max(1,Math.min(5,Number(row.rating)||5)),text:row.text||row.content||row.review_text||"",date:displayDate};
}
async function loadCommunityContent(){
 const [newsResult,reviewsResult]=await Promise.all([
  supabaseClient.from("news_items").select("*"),
  supabaseClient.from("reviews").select("*")
 ]);
 if(newsResult.error){console.error("Supabase news load failed:",newsResult.error.message);newsItems=[];}
 else newsItems=(newsResult.data||[]).map(mapNewsRow).sort((a,b)=>Number(b.id)-Number(a.id));
 if(reviewsResult.error){console.error("Supabase reviews load failed:",reviewsResult.error.message);reviews=[];}
 else reviews=(reviewsResult.data||[]).map(mapReviewRow).sort((a,b)=>Number(b.id)-Number(a.id));
 renderNews();renderReviews();
}
function renderReviews(){
 const sorted=[...reviews].sort((a,b)=>b.id-a.id);
 $("#reviewGrid").innerHTML=sorted.length?sorted.map(r=>`<article class="review-card"><div class="review-top"><span class="review-avatar">${escapeHtml(r.name.slice(0,1).toUpperCase())}</span><span class="review-name">${escapeHtml(r.name)}</span><span class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</span></div><p>${escapeHtml(r.text)}</p><span class="review-date">${escapeHtml(r.date||"СЕГОДНЯ")}</span></article>`).join(""):`<div class="admin-empty">Пока нет отзывов. Стань первым!</div>`;
 const avg=reviews.length?reviews.reduce((s,r)=>s+r.rating,0)/reviews.length:0;
 $(".review-score").innerHTML=`${avg.toFixed(1)}<span>/5</span>`;
 $(".review-summary small").textContent=`${reviews.length} отзыв(ов) · отзывы загружаются из базы`;
}
function renderNews(){
 $("#newsGrid").innerHTML=newsItems.length?newsItems.map(n=>`<article class="news-card"><div class="news-image"><span>${escapeHtml(n.symbol||"B/C")}</span></div><div class="news-body"><div class="news-meta">${escapeHtml(n.tag||"BAZE NEWS")} · ${escapeHtml(n.date||"НОВОСТЬ")}</div><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.text)}</p><button class="news-read" data-news-read="${n.id}">Читать заметку ↗</button></div></article>`).join(""):`<div class="admin-empty">Новостей пока нет.</div>`;
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
function openReview(){ $("#reviewModal").classList.add("open");document.body.classList.add("locked")}
function closeReview(){ $("#reviewModal").classList.remove("open");if(!$("#adminModal").classList.contains("open")&&!$("#checkoutModal").classList.contains("open")&&!$("#productModal").classList.contains("open"))document.body.classList.remove("locked")}
function openAdmin(){
 const modal=$("#adminModal");
 if(!modal){console.error("Admin modal #adminModal not found");return}
 modal.classList.add("open");
 document.body.classList.add("locked");
}
// Robust delegated handler: also supports header buttons and links added later.
document.addEventListener("click",e=>{
 const el=e.target.closest('a[href="#admin"], [data-open-admin], [data-admin-open], #openAdmin, #adminButton, .open-admin, .admin-open');
 const label=(e.target.closest("a,button")?.textContent||"").trim().toLowerCase();
 if(!el && !/админ.?панел|admin.?panel/.test(label))return;
 e.preventDefault();
 openAdmin();
},true);
function closeAdmin(){ $("#adminModal").classList.remove("open");document.body.classList.remove("locked")}
function adminTabButtons(){ $$(".admin-tab").forEach(b=>b.classList.toggle("active",b.dataset.adminTab===adminTab))}
async function loadAdminOrders(root){
 root.innerHTML='<div class="admin-empty">Загружаем заказы…</div>';
 const {data:orders,error}=await supabaseClient.from("orders").select("id,customer_name,phone,email,delivery_address,customer_comment,status,total,created_at").order("created_at",{ascending:false}).limit(100);
 if(error){console.error("Orders read failed:",error);root.innerHTML='<div class="admin-empty">Не удалось загрузить заказы. Проверь RLS и права администратора.</div>';return}
 if(!orders.length){root.innerHTML='<div class="admin-empty">Заказов пока нет. Новые заказы появятся здесь.</div>';return}
 const ids=orders.map(o=>o.id);
 const {data:items,error:itemError}=await supabaseClient.from("order_items").select("order_id,product_name,size,quantity,unit_price").in("order_id",ids);
 if(itemError){console.error("Order items read failed:",itemError);root.innerHTML='<div class="admin-empty">Не удалось загрузить состав заказов. Проверь права доступа к order_items.</div>';return}
 const byOrder={};for(const item of items||[]){(byOrder[item.order_id] ||= []).push(item)}
 const statuses={new:"Новый",confirmed:"Подтверждён",shipped:"Отправлен",completed:"Завершён",cancelled:"Отменён"};
 root.innerHTML=`<p class="admin-note">Последние ${orders.length} заказ(ов). Оплата на сайте не подключена; уточняй детали и оплату с покупателем отдельно.</p><div class="admin-list">${orders.map(o=>{
  const orderItems=(byOrder[o.id]||[]).map(i=>`${escapeHtml(i.product_name)} · EU ${i.size} × ${i.quantity} (${money(Number(i.unit_price)*i.quantity)})`).join('<br>');
  const created=new Date(o.created_at).toLocaleString('ru-RU');
  return `<article class="admin-list-item order-admin-item"><div class="admin-item-copy"><strong>Заказ №${o.id} · ${money(Number(o.total))}</strong><small>${escapeHtml(created)} · ${escapeHtml(o.customer_name)} · ${escapeHtml(o.phone)}</small><small>${o.email?escapeHtml(o.email)+" · ":""}${escapeHtml(o.delivery_address)}</small><small>${escapeHtml(o.customer_comment||"")}</small><small>${orderItems||"Состав заказа недоступен"}</small><label class="order-status-label">Статус <select data-order-status="${o.id}">${Object.entries(statuses).map(([value,label])=>`<option value="${value}" ${o.status===value?"selected":""}>${label}</option>`).join("")}</select></label></div></article>`;
 }).join("")}</div>`;
}
function renderAdmin(){
 adminTabButtons();const root=$("#adminPanelContent");
 if(adminTab==="orders"){
  loadAdminOrders(root);
 }else if(adminTab==="products"){
  root.innerHTML=`<form class="admin-form" id="adminProductForm"><label>Название<input name="name" required placeholder="Название модели"></label><label>Цена, ₽<input name="price" type="number" min="1" required placeholder="7990"></label><label>Категория<select name="category"><option value="running">Running</option><option value="street">Streetwear</option><option value="classic">Classic</option></select></label><label>URL фото<input name="image" type="url" placeholder="https://..."></label><label class="wide">Описание<textarea name="desc" rows="2" required placeholder="Коротко о модели"></textarea></label><button class="button button-primary" type="submit">Добавить товар +</button></form><div class="admin-list">${products.map(p=>`<div class="admin-list-item"><img src="${p.image}" alt=""><div class="admin-item-copy"><strong>${escapeHtml(p.name)}</strong><small>${money(p.price)} · ${p.category}</small></div><button data-admin-delete-product="${p.id}">Удалить</button></div>`).join("")}</div><p class="admin-note">Товары сохраняются в Supabase. Новости и отзывы пока остаются в демо-режиме этого браузера.</p>`;
  $("#adminProductForm").addEventListener("submit",async e=>{e.preventDefault();if(!isAdmin){showToast("Сначала войди как администратор");return}const d=new FormData(e.currentTarget);const category=d.get("category");const product={name:d.get("name").trim(),category,type:category.toUpperCase()+" / CUSTOM",price:Number(d.get("price")),oldPrice:null,label:"NEW",desc:d.get("desc").trim(),image:d.get("image").trim()||"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",sizes:[39,40,41,42,43,44,45]};const {error}=await supabaseClient.from("products").insert(productToRow(product));if(error){console.error(error);showToast("Не удалось сохранить товар. Проверь политики Supabase");return}await refreshProductsFromDb();renderAdmin();e.currentTarget.reset();showToast("Товар сохранён в Supabase")});
 }else if(adminTab==="news"){
  root.innerHTML=`<form class="admin-form" id="adminNewsForm"><label>Заголовок<input name="title" required placeholder="Заголовок новости"></label><label>Категория<input name="tag" placeholder="BRAND NOTES" value="BAZE NEWS"></label><label class="wide">Текст<textarea name="text" required minlength="10" rows="3" placeholder="Текст новости"></textarea></label><button class="button button-primary" type="submit">Опубликовать новость +</button></form><div class="admin-list">${newsItems.map(n=>`<div class="admin-list-item"><div class="admin-item-copy"><strong>${escapeHtml(n.title)}</strong><small>${escapeHtml(n.tag||"BAZE NEWS")} · ${escapeHtml(n.date||"")}</small></div><button data-admin-delete-news="${n.id}">Удалить</button></div>`).join("")||'<div class="admin-empty">Опубликованных новостей пока нет.</div>'}</div>`;
  $("#adminNewsForm").addEventListener("submit", async e => {
   e.preventDefault();
   if (!isAdmin) { showToast("Нет прав администратора"); return; }
   const form = e.currentTarget;
   const d = new FormData(form);
   const button = form.querySelector('button[type="submit"]');
   const title = String(d.get("title") || "").trim();
   const content = String(d.get("text") || d.get("content") || "").trim();
   if (!title) { showToast("Введите заголовок новости"); return; }
   if (!content) { showToast("Введите текст новости"); return; }
   const payload = {
    title,
    content,
    tag: String(d.get("tag") || "").trim() || "BAZE NEWS",
    date: new Date().toISOString().slice(0, 10),
    symbol: "B/C"
   };
   button.disabled = true;
   button.textContent = "Публикуем…";
   try {
    const { data, error } = await supabaseClient.from("news_items").insert(payload).select("*").single();
    if (error) throw error;
    newsItems = [mapNewsRow(data), ...newsItems.filter(n => n.id !== data.id)];
    renderNews();
    renderAdmin();
    form.reset();
    showToast("Новость опубликована в Supabase");
   } catch (err) {
    console.error("News publish failed:", err);
    showToast("Ошибка публикации: " + (err.message || err.details || err.hint || "Неизвестная ошибка"));
   } finally {
    button.disabled = false;
    button.textContent = "Опубликовать новость +";
   }
  });
 }else{
  root.innerHTML=`<div class="admin-list">${reviews.length?reviews.map(r=>`<div class="admin-list-item"><div class="admin-item-copy"><strong>${escapeHtml(r.name)} · ${"★".repeat(r.rating)}</strong><small>${escapeHtml(r.text)}</small></div><button data-admin-delete-review="${r.id}">Удалить</button></div>`).join(""):`<div class="admin-empty">Отзывы отсутствуют.</div>`}</div><p class="admin-note">Отзывы загружаются из Supabase.</p>`;
 }
}
$("#writeReview").addEventListener("click",openReview);
$("#closeReview").addEventListener("click",closeReview);
$("#reviewModal").addEventListener("click",e=>{if(e.target===$("#reviewModal"))closeReview()});
$("#reviewForm").addEventListener("submit",async e=>{
 e.preventDefault();const form=e.currentTarget;const d=new FormData(form);const button=form.querySelector('button[type="submit"]');button.disabled=true;
 try{
  const payload={name:String(d.get("reviewName")||"").trim(),rating:Number(d.get("rating")),text:String(d.get("reviewText")||"").trim(),date:new Date().toISOString().slice(0,10)};
  const {data,error}=await supabaseClient.from("reviews").insert(payload).select("*").single();
  if(error)throw error;
  reviews=[mapReviewRow(data),...reviews];renderReviews();form.reset();closeReview();showToast("Спасибо! Отзыв сохранён");
 }catch(err){console.error("Review submit failed:",err);showToast("Не удалось сохранить отзыв: "+(err.message||"проверь RLS"));}
 finally{button.disabled=false;}
});
$("#closeAdmin").addEventListener("click",closeAdmin);
$("#adminModal").addEventListener("click",e=>{if(e.target===$("#adminModal"))closeAdmin()});
async function loginAdmin(){
 const email=$("#adminEmail").value.trim();const password=$("#adminPassword").value;
 if(!email||!password){showToast("Введи email и пароль");return}
 const btn=$("#adminLoginBtn");btn.disabled=true;btn.textContent="Входим…";
 try{
  const {error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error)throw error;
  isAdmin=await verifyAdminSession();
  if(!isAdmin){await supabaseClient.auth.signOut();throw new Error("Этот аккаунт не добавлен в список администраторов")}
  await seedProductsIfEmpty();
  $("#adminLogin").hidden=true;$("#adminDashboard").hidden=false;adminTab="products";renderAdmin();showToast("Вход администратора выполнен");
 }catch(err){console.error(err);showToast(err.message||"Не удалось войти. Проверь данные входа")}
 finally{btn.disabled=false;btn.innerHTML='Войти <span>↗</span>'}
}
$("#adminLoginBtn").addEventListener("click",loginAdmin);
$("#adminPassword").addEventListener("keydown",e=>{if(e.key==="Enter")loginAdmin()});
$$('a[href="#admin"]').forEach(a=>a.addEventListener("click",e=>{e.preventDefault();openAdmin()}));
$("#adminDashboard").addEventListener("change",async e=>{
 const statusSelect=e.target.closest("[data-order-status]");if(!statusSelect)return;
 if(!isAdmin){showToast("Нет прав администратора");return}
 const orderId=Number(statusSelect.dataset.orderStatus);const status=statusSelect.value;
 statusSelect.disabled=true;
 const {error}=await supabaseClient.from("orders").update({status}).eq("id",orderId);
 if(error){console.error("Order status update failed:",error);showToast("Не удалось изменить статус заказа");statusSelect.disabled=false;return}
 showToast("Статус заказа обновлён");statusSelect.disabled=false;
});
$("#adminDashboard").addEventListener("click",e=>{
 const tab=e.target.closest("[data-admin-tab]");if(tab){adminTab=tab.dataset.adminTab;renderAdmin();return}
 const dp=e.target.closest("[data-admin-delete-product]");if(dp){(async()=>{const id=Number(dp.dataset.adminDeleteProduct);if(!isAdmin){showToast("Нет прав администратора");return}const {error}=await supabaseClient.from("products").delete().eq("id",id);if(error){console.error(error);showToast("Не удалось удалить товар");return}await refreshProductsFromDb();renderAdmin();showToast("Товар удалён из Supabase")})();return}
 const dn=e.target.closest("[data-admin-delete-news]");if(dn){(async()=>{if(!isAdmin){showToast("Нет прав администратора");return}const id=dn.dataset.adminDeleteNews;const {error}=await supabaseClient.from("news_items").delete().eq("id",id);if(error){console.error("News delete failed:",error);showToast("Не удалось удалить новость: "+error.message);return}newsItems=newsItems.filter(n=>String(n.id)!==String(id));renderNews();renderAdmin();showToast("Новость удалена из Supabase")})();return}
 const dr=e.target.closest("[data-admin-delete-review]");if(dr){(async()=>{if(!isAdmin){showToast("Нет прав администратора");return}const id=dr.dataset.adminDeleteReview;const {error}=await supabaseClient.from("reviews").delete().eq("id",id);if(error){console.error("Review delete failed:",error);showToast("Не удалось удалить отзыв: "+error.message);return}reviews=reviews.filter(r=>String(r.id)!==String(id));renderReviews();renderAdmin();showToast("Отзыв удалён")})();return}
});
$("#newsGrid").addEventListener("click",e=>{const b=e.target.closest("[data-news-read]");if(!b)return;const n=newsItems.find(x=>x.id===Number(b.dataset.newsRead));if(n)showToast(n.title+" — "+n.text)});
const oldEscapeHandler = null;
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeReview();closeAdmin()}});
renderReviews();renderNews();
loadCommunityContent();
refreshProductsFromDb();
