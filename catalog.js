/* 产品目录：读取 products.json，渲染列表、详情和图片放大。
   详情页地址形如 #HUY0001（产品 id 就是价目表货号），可以直接把链接发给客人。 */

const $ = id => document.getElementById(id);
const state = { store: {}, products: [], cat: '全部', q: '', sort: 'default', current: null, img: 0 };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const money = n => `${state.store.currency || 'RM'} ${Number(n).toFixed(2)}`;

async function load() {
  try {
    const res = await fetch('products.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    state.store = data.store || {};
    state.products = data.products || [];
  } catch (err) {
    $('grid').innerHTML = '';
    $('empty').hidden = false;
    $('empty').textContent = '读取 products.json 失败。请用 http 打开（python3 serve.py），并检查 JSON 格式是否正确。';
    console.error(err);
    return;
  }

  const s = state.store;
  if (s.name) { $('storeName').textContent = s.name; document.title = `${s.name} · 产品目录`; }
  $('storeTagline').textContent = s.tagline || '';
  $('storeNote').textContent = s.note || '';

  renderCats();
  renderGrid();
  openFromHash();
}

function renderCats() {
  const cats = ['全部', ...new Set(state.products.map(p => p.category).filter(Boolean))];
  $('cats').innerHTML = cats.map(c =>
    `<button type="button" data-cat="${esc(c)}" aria-pressed="${c === state.cat}">${esc(c)}</button>`).join('');
}

function visible() {
  const q = state.q.trim().toLowerCase();
  let list = state.products.filter(p =>
    (state.cat === '全部' || p.category === state.cat) &&
    (!q || [p.name, p.summary, p.description, p.category, p.id, p.sku].join(' ').toLowerCase().includes(q)));
  if (state.sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
  if (state.sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
  return list;
}

function renderGrid() {
  const list = visible();
  $('count').textContent = `共 ${list.length} 件产品`;
  $('empty').hidden = list.length > 0;
  $('grid').innerHTML = list.map(p => {
    const badge = p.soldOut ? '<span class="badge out">售罄</span>'
      : p.tags?.length ? `<span class="badge">${esc(p.tags[0])}</span>` : '';
    return `<li><button type="button" class="card${p.soldOut ? ' sold' : ''}" data-id="${esc(p.id)}">
      <div class="ph">${p.images?.[0] ? `<img src="${esc(p.images[0])}" alt="${esc(p.name)}" loading="lazy">` : ''}${badge}</div>
      <div class="txt">
        <h3>${esc(p.name)}</h3>
        <p class="sku">${esc(p.sku || p.id)}</p>
        <p class="sum">${esc(p.summary)}</p>
        <span class="price">${money(p.price)}${p.originalPrice ? `<s>${money(p.originalPrice)}</s>` : ''}</span>
      </div>
    </button></li>`;
  }).join('');
}

/* 详情 */
function openDetail(id, push = true) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  state.current = p;
  state.img = 0;

  $('dCat').textContent = [p.category, p.sku || p.id].filter(Boolean).join(' · ');
  $('dName').textContent = p.name;
  $('dPrice').textContent = p.soldOut ? `${money(p.price)}（售罄）` : money(p.price);
  $('dOrig').textContent = p.originalPrice ? money(p.originalPrice) : '';
  $('dSummary').textContent = p.summary || '';
  $('dDesc').textContent = p.description || '';
  $('dSpecs').innerHTML = Object.entries(p.specs || {})
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');

  const wa = state.store.whatsapp;
  $('dAsk').hidden = !wa;
  if (wa) {
    const msg = `你好，我想询问：${p.name}（${p.sku || p.id}）${money(p.price)}\n${location.href.split('#')[0]}#${p.id}`;
    $('dAsk').href = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
  }

  $('thumbs').innerHTML = (p.images || []).map((src, i) =>
    `<button type="button" data-i="${i}" aria-label="第 ${i + 1} 张"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('');
  $('thumbs').hidden = (p.images || []).length < 2;
  showImg(0);

  if (push && location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
  if (!$('detail').open) $('detail').showModal();
  $('detail').scrollTop = 0;
}

function showImg(i) {
  const imgs = state.current?.images || [];
  if (!imgs.length) return;
  state.img = (i + imgs.length) % imgs.length;
  $('mainImg').src = imgs[state.img];
  $('mainImg').alt = state.current.name;
  $('zoomImg').src = imgs[state.img];
  [...$('thumbs').children].forEach((b, k) => b.setAttribute('aria-current', k === state.img));
  $('zPrev').hidden = $('zNext').hidden = imgs.length < 2;
}

function closeDetail() {
  if ($('zoom').open) $('zoom').close();
  if ($('detail').open) $('detail').close();
}

function openFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (id && state.products.some(p => p.id === id)) openDetail(id, false);
  else closeDetail();
}

/* 事件 */
$('cats').addEventListener('click', e => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  state.cat = b.dataset.cat;
  renderCats();
  renderGrid();
});
$('search').addEventListener('input', e => { state.q = e.target.value; renderGrid(); });
$('sort').addEventListener('change', e => { state.sort = e.target.value; renderGrid(); });
$('grid').addEventListener('click', e => {
  const c = e.target.closest('[data-id]');
  if (c) openDetail(c.dataset.id);
});
$('thumbs').addEventListener('click', e => {
  const b = e.target.closest('[data-i]');
  if (b) showImg(Number(b.dataset.i));
});
$('mainImgBtn').addEventListener('click', () => $('zoom').showModal());
$('zPrev').addEventListener('click', () => showImg(state.img - 1));
$('zNext').addEventListener('click', () => showImg(state.img + 1));

document.querySelectorAll('[data-close]').forEach(b =>
  b.addEventListener('click', () => b.closest('dialog').close()));

// 点遮罩关闭
for (const d of [$('detail'), $('zoom')]) {
  d.addEventListener('click', e => { if (e.target === d || (d === $('zoom') && e.target === $('zoomImg'))) d.close(); });
}
// 详情关闭时把地址里的 #sku 去掉
$('detail').addEventListener('close', () => {
  if (location.hash) history.pushState(null, '', location.pathname + location.search);
});

// 放大时左右滑动 / 方向键切图
let touchX = null;
$('zoom').addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
$('zoom').addEventListener('touchend', e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 40) showImg(state.img + (dx < 0 ? 1 : -1));
  touchX = null;
});
document.addEventListener('keydown', e => {
  if (!$('zoom').open && !$('detail').open) return;
  if (e.key === 'ArrowLeft') showImg(state.img - 1);
  if (e.key === 'ArrowRight') showImg(state.img + 1);
});

$('dShare').addEventListener('click', async () => {
  const url = `${location.href.split('#')[0]}#${state.current.id}`;
  try {
    if (navigator.share) await navigator.share({ title: state.current.name, url });
    else { await navigator.clipboard.writeText(url); $('dShare').textContent = '已复制'; }
  } catch { /* 用户取消分享 */ }
  setTimeout(() => { $('dShare').textContent = '复制链接'; }, 1500);
});

window.addEventListener('popstate', openFromHash);

load();
