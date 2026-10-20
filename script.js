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

// Supabase
const SUPABASE_URL = "https://mpmdhxhhsljllouqrbtr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_wZfkO7LLjZyX8Z0D7_b4GA_YhLXsdP9";
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let isAdmin = false;
let productsLoadedFromDb = false;
const fallbackProducts = products.map(p => ({...p, sizes:[...p.sizes]}));

function mapProductRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    category: row.category,
    type: row.type || `${String(row.category || "classic").toUpperCase()} / CUSTOM`,
    price: Number(row.price),
    oldPrice: row.old_price == null ? null : Number(row.old_price),
    label: row.label || "NEW",
    desc: row.description || "",
    image: row.image || "",
    sizes: Array.isArray(row.sizes) && row.sizes.length
      ? row.sizes
      : [39,40,41,42,43,44,45]
  };
}

function productToRow(p) {
  return {
    name: p.name,
    category: p.category,
    type: p.type,
    price: p.price,
    old_price: p.oldPrice || null,
    label: p.label || "NEW",
    description: p.desc || "",
    image: p.image || "",
    sizes: p.sizes || [39,40,41,42,43,44,45]
  };
}

async function refreshProductsFromDb() {
  const {data, error} = await supabaseClient
    .from("products")
    .select("*")
    .order("id", {ascending:true});

  if (error) {
    console.error("Supabase products read failed:", error.message);
    showToast("Не удалось загрузить товары из базы");
    return false;
  }

  productsLoadedFromDb = Boolean(data && data.length);

  if (data.length) {
    products = data.map(mapProductRow);
  } else {
    products = fallbackProducts.map(p => ({...p, sizes:[...p.sizes]}));
  }

  cart = cart.filter(item => products.some(p => p.id === item.id));
  saveCart();
  renderProducts();
  renderCart();
  return true;
}

async function verifyAdminSession() {
  const {data:{user}, error:authError} = await supabaseClient.auth.getUser();

  if (authError || !user) return false;

  const {data, error} = await supabaseClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Admin check failed:", error.message);
    return false;
  }

  return Boolean(data);
}

async function seedProductsIfEmpty() {
  const {data, error} = await supabaseClient
    .from("products")
    .select("id")
    .limit(1);

  if (error) throw error;
  if (data.length) return;

  const seed = fallbackProducts.map(productToRow);
  const {error:insertError} = await supabaseClient
    .from("products")
    .insert(seed);

  if (insertError) throw insertError;
  await refreshProductsFromDb();
}

let activeCategory = "all";
let searchTerm = "";
let sortMode = "featured";
let cart = JSON.parse(localStorage.getItem("bazeCart") || "[]");
let favorites = JSON.parse(localStorage.getItem("bazeFavorites") || "[]");
let currentProduct = null;
let selectedSize = 42;
let toastTimer;

function saveCart() {
  localStorage.setItem("bazeCart", JSON.stringify(cart));
}

function saveFavorites() {
  localStorage.setItem("bazeFavorites", JSON.stringify(favorites));
}

function visibleProducts() {
  let list = products.filter(p =>
    (activeCategory === "all" || p.category === activeCategory) &&
    (p.name + " " + p.type + " " + p.desc)
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (sortMode === "low") list.sort((a,b) => a.price-b.price);
  if (sortMode === "high") list.sort((a,b) => b.price-a.price);

  return list;
}

function renderProducts() {
  const list = visibleProducts();
  $("#resultCount").textContent = String(list.length).padStart(2,"0") + " моделей";

  $("#productGrid").innerHTML = list.length
    ? list.map(p => `
      <article class="product-card">
        <div class="product-image" data-view="${p.id}" tabindex="0" role="button" aria-label="Подробнее: ${p.name}">
          <span class="product-label">${p.label}</span>
          <button class="favorite ${favorites.includes(p.id) ? "active" : ""}" data-fav="${p.id}" aria-label="Добавить ${p.name} в избранное">${favorites.includes(p.id) ? "♥" : "♡"}</button>
          <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.opacity='.15'">
        </div>
        <div class="product-info">
          <div class="product-meta"><span>${p.type}</span><span>★ 4.9</span></div>
          <h3 class="product-name">${p.name}</h3>
          <p class="product-desc">${p.desc}</p>
          <div class="product-bottom">
            <div class="price">${money(p.price)} ${p.oldPrice ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}</div>
            <button class="add-btn" data-add="${p.id}" aria-label="Добавить ${p.name} в корзину">+</button>
          </div>
        </div>
      </article>
    `).join("")
    : `<div class="no-results"><strong>Ничего не найдено</strong>Попробуй изменить поиск или выбрать другую категорию.</div>`;
}

function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

function addToCart(id, size=42) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  const found = cart.find(x => x.id === id && x.size === size);

  if (found) found.qty++;
  else cart.push({id, size, qty:1});

  saveCart();
  renderCart();
  showToast(`${p.name} добавлен в корзину`);
}

function cartQuantity() {
  return cart.reduce((sum,x) => sum+x.qty, 0);
}

function cartTotal() {
  return cart.reduce((sum,x) => {
    const p = products.find(item => item.id === x.id);
    return sum + (p ? p.price*x.qty : 0);
  }, 0);
}

function renderCart() {
  $("#cartCount").textContent = cartQuantity();
  $("#drawerCount").textContent = `(${cartQuantity()})`;
  $("#cartTotal").textContent = money(cartTotal());
  $("#checkoutTotal").textContent = money(cartTotal());

  const empty = cart.length === 0;
  $("#cartEmpty").style.display = empty ? "block" : "none";
  $("#cartBottom").style.display = empty ? "none" : "block";

  $("#cartItems").innerHTML = cart.map(item => {
    const p = products.find(x => x.id === item.id);
    if (!p) return "";

    return `<div class="cart-line">
      <img src="${p.image}" alt="">
      <div>
        <h3>${p.name}</h3>
        <p>Размер: EU ${item.size}</p>
        <span class="line-price">${money(p.price)}</span>
        <div class="qty-control">
          <button data-qty="${p.id}" data-size="${item.size}" data-delta="-1" aria-label="Уменьшить">−</button>
          <span>${item.qty}</span>
          <button data-qty="${p.id}" data-size="${item.size}" data-delta="1" aria-label="Увеличить">+</button>
        </div>
      </div>
      <button class="remove-item" data-remove="${p.id}" data-size="${item.size}" aria-label="Удалить">×</button>
    </div>`;
  }).join("");
} 
function renderNews(){
 const sorted=[...newsItems].sort((a,b)=>Number(b.id)-Number(a.id));
 $("#newsGrid").innerHTML=sorted.length?sorted.map(n=>`
  <article class="news-card">
   <div class="news-visual"><span>${escapeHtml(n.symbol||"B/C")}</span><small>${escapeHtml(n.date||"BAZE NEWS")}</small></div>
   <div class="news-content">
    <span class="news-tag">${escapeHtml(n.tag||"BAZE NEWS")}</span>
    <h3>${escapeHtml(n.title)}</h3>
    <p>${escapeHtml(n.text)}</p>
    ${isAdmin?`<button class="admin-delete" data-delete-news="${n.id}">Удалить новость</button>`:""}
   </div>
  </article>`).join(""):`<div class="admin-empty">Новые новости скоро появятся.</div>`;
}

function escapeHtml(value){
 return String(value??"").replace(/[&<>"']/g,char=>({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#39;"
 }[char]));
}

async function loadCommunityContent(){
 const [newsResult,reviewsResult]=await Promise.all([
  supabaseClient.from("news_items").select("*"),
  supabaseClient.from("reviews").select("*")
 ]);

 if(newsResult.error){
  console.error("Supabase news load failed:",newsResult.error.message);
  newsItems=[];
 }else{
  newsItems=(newsResult.data||[]).map(mapNewsRow)
   .sort((a,b)=>Number(b.id)-Number(a.id));
 }

 if(reviewsResult.error){
  console.error("Supabase reviews load failed:",reviewsResult.error.message);
  reviews=[];
 }else{
  reviews=(reviewsResult.data||[]).map(mapReviewRow)
   .sort((a,b)=>Number(b.id)-Number(a.id));
 }

 renderNews();
 renderReviews();
}

function renderReviews(){
 const sorted=[...reviews].sort((a,b)=>Number(b.id)-Number(a.id));

 $("#reviewGrid").innerHTML=sorted.length?sorted.map(r=>`
  <article class="review-card">
   <div class="review-top">
    <span class="review-avatar">${escapeHtml(r.name.slice(0,1).toUpperCase())}</span>
    <span class="review-name">${escapeHtml(r.name)}</span>
    <span class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</span>
   </div>
   <p>${escapeHtml(r.text)}</p>
   <span class="review-date">${escapeHtml(r.date||"СЕГОДНЯ")}</span>
  </article>`).join(""):`<div class="admin-empty">Пока нет отзывов. Стань первым!</div>`;

 const avg=reviews.length
  ?reviews.reduce((sum,r)=>sum+r.rating,0)/reviews.length
  :0;

 $(".review-score").innerHTML=`${avg.toFixed(1)}<span>/5</span>`;
 $(".review-summary small").textContent=
  `${reviews.length} отзыв(ов) · отзывы загружаются из базы`;
}

// Форма отправки отзыва
const reviewForm=$("#reviewForm");

if(reviewForm){
 reviewForm.addEventListener("submit",async e=>{
  e.preventDefault();

  const form=e.currentTarget;
  const submitButton=form.querySelector('button[type="submit"]');
  const formData=new FormData(form);

  const name=String(
   formData.get("name")||
   form.querySelector('[name="name"]')?.value||
   ""
  ).trim();

  const reviewText=String(
   formData.get("text")||
   formData.get("review")||
   form.querySelector("textarea")?.value||
   ""
  ).trim();

  const ratingInput=
   formData.get("rating")||
   form.querySelector('[name="rating"]:checked')?.value||
   form.querySelector('[name="rating"]')?.value||
   5;

  const rating=Math.max(1,Math.min(5,Number(ratingInput)||5));

  if(!name||!reviewText){
   showToast("Заполни имя и текст отзыва");
   return;
  }

  submitButton.disabled=true;
  const oldButtonText=submitButton.textContent;
  submitButton.textContent="Отправляем…";

  try{
   const reviewRow={
    name,
    rating,
    text:reviewText,
    date:new Date().toISOString().slice(0,10)
   };

   const {data,error}=await supabaseClient
    .from("reviews")
    .insert([reviewRow])
    .select();

   if(error)throw error;

   if(!data||!data.length){
    throw new Error("Supabase не вернул сохранённый отзыв");
   }

   reviews.unshift(mapReviewRow(data[0]));
   renderReviews();
   form.reset();
   showToast("Отзыв успешно опубликован!");
  }catch(err){
   console.error("Review publishing failed:",err);
   showToast(
    "Не удалось опубликовать отзыв: "+
    (err.message||"неизвестная ошибка")
   );
  }finally{
   submitButton.disabled=false;
   submitButton.textContent=oldButtonText;
  }
 });
}

// Обработка удаления новости
$("#newsGrid").addEventListener("click",async e=>{
 const button=e.target.closest("[data-delete-news]");
 if(!button)return;
 if(!isAdmin)return;

 const id=button.dataset.deleteNews;

 if(!confirm("Удалить эту новость?"))return;

 const {error}=await supabaseClient
  .from("news_items")
  .delete()
  .eq("id",id);

 if(error){
  console.error("News delete failed:",error.message);
  showToast("Не удалось удалить новость: "+error.message);
  return;
 }

 newsItems=newsItems.filter(n=>String(n.id)!==String(id));
 renderNews();
 showToast("Новость удалена");
});

// Публикация новостей
const newsForm=$("#newsForm");

if(newsForm){
 newsForm.addEventListener("submit",async e=>{
  e.preventDefault();

  if(!isAdmin){
   showToast("Сначала войди в админ-панель");
   return;
  }

  const form=e.currentTarget;
  const submitButton=form.querySelector('button[type="submit"]');
  const formData=new FormData(form);

  const title=String(formData.get("title")||"").trim();
  const tag=String(formData.get("tag")||"BAZE NEWS").trim();
  const textContent=String(
   formData.get("text")||formData.get("content")||""
  ).trim();
  const symbol=String(formData.get("symbol")||"B/C").trim();

  if(!title||!textContent){
   showToast("Заполни заголовок и текст новости");
   return;
  }

  submitButton.disabled=true;
  const oldText=submitButton.textContent;
  submitButton.textContent="Публикуем…";

  try{
   const {data,error}=await supabaseClient
    .from("news_items")
    .insert([{
     title,
     tag,
     text:textContent,
     symbol,
     date:new Date().toISOString().slice(0,10)
    }])
    .select();

   if(error)throw error;
   if(!data||!data.length)throw new Error("Новость не вернулась из базы");

   newsItems.unshift(mapNewsRow(data[0]));
   renderNews();
   form.reset();
   showToast("Новость опубликована!");
  }catch(err){
   console.error("News publishing failed:",err);
   showToast("Ошибка публикации: "+(err.message||"неизвестная ошибка"));
  }finally{
   submitButton.disabled=false;
   submitButton.textContent=oldText;
  }
 });
}
async function loadCommunityContent(){
 const [newsResult,reviewsResult]=await Promise.all([
  supabaseClient.from("news_items").select("*"),
  supabaseClient.from("reviews").select("*")
 ]);
 if(newsResult.error){
  console.error("Supabase news load failed:",newsResult.error.message);
  newsItems=[];
 } else {
  newsItems=(newsResult.data||[])
   .map(mapNewsRow)
   .sort((a,b)=>Number(b.id)-Number(a.id));
 }
 if(reviewsResult.error){
  console.error("Supabase reviews load failed:",reviewsResult.error.message);
  reviews=[];
 } else {
  reviews=(reviewsResult.data||[])
   .map(mapReviewRow)
   .sort((a,b)=>Number(b.id)-Number(a.id));
 }
 renderNews();
 renderReviews();
}

function renderReviews(){
 const sorted=[...reviews].sort((a,b)=>b.id-a.id);
 $("#reviewGrid").innerHTML=sorted.length
  ? sorted.map(r=>`
    <article class="review-card">
     <div class="review-top">
      <span class="review-avatar">${escapeHtml(r.name.slice(0,1).toUpperCase())}</span>
      <span class="review-name">${escapeHtml(r.name)}</span>
      <span class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</span>
     </div>
     <p>${escapeHtml(r.text)}</p>
     <span class="review-date">${escapeHtml(r.date||"СЕГОДНЯ")}</span>
    </article>`).join("")
  : `<div class="admin-empty">Пока нет отзывов. Стань первым!</div>`;

 const avg=reviews.length
  ? reviews.reduce((s,r)=>s+r.rating,0)/reviews.length
  : 0;

 $(".review-score").innerHTML=`${avg.toFixed(1)}<span>/5</span>`;
 $(".review-summary small").textContent=
  `${reviews.length} отзыв(ов) · отзывы загружаются из базы`;
}

function renderNews(){
 $("#newsGrid").innerHTML=newsItems.length
  ? newsItems.map(n=>`
    <article class="news-card">
     <div class="news-image"><span>${escapeHtml(n.symbol||"B/C")}</span></div>
     <div class="news-body">
      <div class="news-meta">${escapeHtml(n.tag||"BAZE NEWS")} · ${escapeHtml(n.date||"НОВОСТЬ")}</div>
      <h3>${escapeHtml(n.title)}</h3>
      <p>${escapeHtml(n.text)}</p>
      <button class="news-read" data-news-read="${n.id}">Читать заметку ↗</button>
     </div>
    </article>`).join("")
  : `<div class="admin-empty">Новостей пока нет.</div>`;
}

function escapeHtml(value){
 return String(value).replace(/[&<>"']/g,ch=>({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#39;"
 }[ch]));
}
