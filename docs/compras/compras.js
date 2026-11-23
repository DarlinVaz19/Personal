'use strict';

/* Lista de compras: del súper a regalos o ropa. Agregado rápido, palomita al comprar,
   total estimado y paso a Finanzas de lo que ya está en el carrito. */

const store = createStore('compras.v1', () => ({ items: [], lastCat: 'super' }));

const CATS = [
  { id: 'super', name: 'Súper', icon: 'super', fin: 'super' },
  { id: 'farmacia', name: 'Farmacia', icon: 'medicina', fin: 'salud' },
  { id: 'casa', name: 'Casa', icon: 'casa', fin: 'casa' },
  { id: 'ropa', name: 'Ropa', icon: 'ropa', fin: 'compras' },
  { id: 'regalos', name: 'Regalos', icon: 'regalo', fin: 'compras' },
  { id: 'gatos', name: 'Gatos', icon: 'huella', fin: 'mascotas' },
  { id: 'belleza', name: 'Belleza', icon: 'skincare', fin: 'compras' },
  { id: 'otros', name: 'Otros', icon: 'otros', fin: 'otros' },
];
const FIN_NAMES = { super: 'Súper', salud: 'Salud', casa: 'Casa', compras: 'Compras', mascotas: 'Mascotas', otros: 'Otros' };
const catOf = (id) => CATS.find((c) => c.id === id) || CATS[CATS.length - 1];

// Adivina la categoría por palabras comunes (se puede cambiar).
const GUESS = [
  [/croqueta|arena para|gat[oa]s?\b|michi|whiskas|premios? para/i, 'gatos'],
  [/regalo|cumple/i, 'regalos'],
  [/pastilla|medic|vitamina|paracetamol|ibuprofeno|curita|jarabe|farmacia/i, 'farmacia'],
  [/playera|blusa|pantal|vestido|zapato|tenis|calcet|jean|sudadera|chamarra|falda|ropa/i, 'ropa'],
  [/shampoo|crema|maquillaje|labial|perfume|rimel|esmalte|jabón facial|serum|protector solar/i, 'belleza'],
  [/foco|escoba|detergente|cloro|papel de baño|servilleta|trapo|bolsa de basura|suavizante|vela/i, 'casa'],
];
function guessCat(name) {
  for (const [re, c] of GUESS) if (re.test(name)) return c;
  return null;
}

const ui = { filter: 'todo', cat: store.data.lastCat || 'super', justId: null };

function pending() { return store.data.items.filter((i) => !i.done); }
function inCart() { return store.data.items.filter((i) => i.done); }
const lineTotal = (i) => (i.price || 0) * (i.qty || 1);

/* ---------------- Vistas ---------------- */

function renderHero() {
  const p = pending(), c = inCart();
  const total = p.reduce((a, i) => a + lineTotal(i), 0);
  const all = p.length + c.length;
  const pct = all ? c.length / all : 0;
  $('#hero').innerHTML = `
    <span class="shine"></span>
    <span class="moon">${icon('mod_compras')}</span>
    <div class="k">Por comprar</div>
    <div class="v">${p.length} ${p.length === 1 ? 'cosa' : 'cosas'}</div>
    <div class="meta"><span>Estimado ${fmt(total)}</span>${c.length ? `<span>En el carrito: ${c.length}</span>` : ''}</div>
    <div class="runway"><span class="runway-line"></span><span class="runway-fill" style="width:${(pct * 100).toFixed(0)}%"></span><span class="runway-jet" style="left:calc(${(pct * 100).toFixed(0)}% * .86)">${icon('avion')}</span></div>`;
}

function renderCats() {
  $('#qCats').innerHTML = CATS.map((c) =>
    `<button type="button" class="chip" data-qcat="${c.id}" aria-pressed="${ui.cat === c.id}">${icon(c.icon)}${c.name}</button>`).join('');
}

function renderFilters() {
  const p = pending();
  const used = CATS.filter((c) => p.some((i) => i.cat === c.id));
  $('#filters').innerHTML = used.length > 1 ? [['todo', `Todo (${p.length})`], ...used.map((c) => [c.id, `${c.name} (${p.filter((i) => i.cat === c.id).length})`])]
    .map(([id, n]) => `<button type="button" class="chip" data-filter="${id}" aria-pressed="${ui.filter === id}">${esc(n)}</button>`).join('') : '';
  if (used.length <= 1) ui.filter = 'todo';
}

function itemRow(i, k = 0) {
  const meta = [];
  if (i.qty > 1) meta.push(`×${i.qty}`);
  if (i.forWho) meta.push(`para ${i.forWho}`);
  if (i.store) meta.push(i.store);
  if (i.note) meta.push(i.note);
  return `
    <div class="shop-item ${i.done ? 'done' : ''} ${ui.justId === i.id ? 'pop-in' : ''}" data-id="${esc(i.id)}" style="--i:${k}">
      <button type="button" class="check-btn" data-toggle aria-pressed="${i.done}" aria-label="${i.done ? 'Regresar a la lista' : 'Marcar como comprado'}">
        <svg viewBox="0 0 24 24"><path d="M5.5 12.5l4.2 4.2 8.8-9.4"/></svg>
      </button>
      <button type="button" class="shop-main" data-edit>
        <span class="t">${esc(i.name)}</span>
        ${meta.length ? `<span class="s">${esc(meta.join(' · '))}</span>` : ''}
      </button>
      ${i.price ? `<span class="price">${fmt(lineTotal(i))}</span>` : ''}
    </div>`;
}

function renderList() {
  const p = pending().filter((i) => ui.filter === 'todo' || i.cat === ui.filter);
  if (!store.data.items.length) {
    $('#list').innerHTML = `<div class="empty">${icon('mod_compras')}<b>Tu lista está vacía</b>Escribe arriba lo que necesitas y toca +.</div>`;
    return;
  }
  if (!p.length) {
    $('#list').innerHTML = `<div class="empty">${icon('avion')}<b>¡Todo listo!</b>No te falta nada por comprar.</div>`;
    return;
  }
  let k = 0;
  $('#list').innerHTML = CATS.filter((c) => p.some((i) => i.cat === c.id)).map((c) => `
    <div class="group">
      <div class="group-head">${icon(c.icon)}<span>${c.name}</span><small>${p.filter((i) => i.cat === c.id).length}</small></div>
      ${p.filter((i) => i.cat === c.id).sort((a, b) => a.createdAt - b.createdAt).map((i) => itemRow(i, k++)).join('')}
    </div>`).join('');
}

function renderCart() {
  const c = inCart().sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  if (!c.length) { $('#cart').innerHTML = ''; return; }
  const total = c.reduce((a, i) => a + lineTotal(i), 0);
  $('#cart').innerHTML = `
    <h2>En el carrito</h2>
    <div class="cart">${c.map((i, k) => itemRow(i, k)).join('')}</div>
    <div class="cart-actions">
      ${total ? `<button type="button" class="btn" id="toFin">${icon('mod_finanzas')}Registrar ${fmt(total)} en Finanzas</button>` : ''}
      <button type="button" class="btn" id="clearCart">Vaciar carrito</button>
    </div>`;
}

function render() { renderHero(); renderCats(); renderFilters(); renderList(); renderCart(); ui.justId = null; }

/* ---------------- Acciones ---------------- */

// "3 leches", "leche x2" o "leche 2" → cantidad.
function parseQuick(text) {
  let name = text.trim(), qty = 1;
  let m = name.match(/^(\d{1,3})\s+(.+)$/);
  if (m) { qty = +m[1]; name = m[2]; }
  m = name.match(/^(.+?)\s*[x×]\s*(\d{1,3})$/i);
  if (m) { name = m[1]; qty = +m[2]; }
  let forWho = '';
  m = name.match(/^regalo para (.+)$/i);
  if (m) { forWho = m[1].trim(); name = `Regalo para ${forWho}`; }
  return { name: name.charAt(0).toUpperCase() + name.slice(1), qty, forWho };
}

function addQuick() {
  const input = $('#qName');
  const text = input.value.trim();
  if (!text) { input.focus(); return; }
  const q = parseQuick(text);
  const guessed = guessCat(text);
  // Solo adivina si estás en Súper u Otros; si elegiste otra categoría, se respeta.
  const cat = guessed && (ui.cat === 'super' || ui.cat === 'otros') ? guessed : ui.cat;
  const item = { id: uid(), name: q.name, qty: q.qty, cat, price: null, forWho: q.forWho, store: '', note: '', done: false, createdAt: Date.now() };
  store.data.items.push(item);
  store.save();
  ui.justId = item.id;
  input.value = '';
  render();
  const row = $(`.shop-item[data-id="${CSS.escape(item.id)}"]`);
  burstFrom(row, { count: 8, spread: 50, size: [7, 12] });
  if (guessed && guessed !== ui.cat) toast(`Lo puse en ${catOf(guessed).name}`);
  input.focus();
}

function toggle(id) {
  const i = store.data.items.find((x) => x.id === id);
  if (!i) return;
  const row = $(`.shop-item[data-id="${CSS.escape(id)}"] .check-btn`);
  const rect = row?.getBoundingClientRect();
  i.done = !i.done;
  i.doneAt = i.done ? Date.now() : null;
  store.save();
  if (i.done && rect) burst(rect.left + rect.width / 2, rect.top + rect.height / 2, { count: 12, spread: 70, size: [8, 14] });
  render();
  if (i.done && !pending().length) {
    celebrate('mod_compras', '¡Lista completa!', 'Todo en el carrito ✦', true);
    takeoff($('#hero .runway-jet') || $('#hero'), { duration: 1800 });
  }
}

function itemSheet(id) {
  const i = store.data.items.find((x) => x.id === id);
  if (!i) return;
  const st = { cat: i.cat };
  const sheet = openSheet(`
    <h3>Editar</h3>
    <div class="field"><label class="label" for="iName">¿Qué es?</label><input id="iName" value="${esc(i.name)}" autocomplete="off"></div>
    <div class="field"><div class="label">Categoría</div><div class="chips" id="iCats"></div></div>
    <div class="two">
      <div class="field"><label class="label" for="iQty">Cantidad</label><input id="iQty" inputmode="numeric" value="${i.qty || 1}"></div>
      <div class="field"><label class="label" for="iPrice">Precio c/u (opcional)</label><input id="iPrice" inputmode="decimal" value="${i.price ?? ''}" placeholder="$0.00"></div>
    </div>
    <div class="field" id="forWrap"><label class="label" for="iFor">¿Para quién?</label><input id="iFor" value="${esc(i.forWho || '')}" placeholder="Ej. Ana, mamá…" autocomplete="off"></div>
    <div class="two">
      <div class="field"><label class="label" for="iStore">Tienda</label><input id="iStore" value="${esc(i.store || '')}" placeholder="Ej. Costco, Amazon…" autocomplete="off"></div>
      <div class="field"><label class="label" for="iNote">Nota</label><input id="iNote" value="${esc(i.note || '')}" placeholder="Talla, marca, color…" autocomplete="off"></div>
    </div>
    <button type="button" class="btn primary" id="saveI">Guardar</button>
    <button type="button" class="btn danger" id="delI">Quitar de la lista</button>`);
  const paint = () => {
    $('#iCats', sheet).innerHTML = CATS.map((c) => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${st.cat === c.id}">${icon(c.icon)}${c.name}</button>`).join('');
    $('#forWrap', sheet).hidden = !['regalos', 'ropa'].includes(st.cat) && !i.forWho;
  };
  paint();
  sheet.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]');
    if (c) { st.cat = c.dataset.cat; paint(); return; }
    if (e.target.closest('#saveI')) {
      const name = $('#iName', sheet).value.trim();
      if (!name) { toast('Escribe qué es'); return; }
      const qty = Math.max(1, parseInt($('#iQty', sheet).value, 10) || 1);
      const price = parseAmount($('#iPrice', sheet).value);
      Object.assign(i, { name, cat: st.cat, qty, price: Number.isFinite(price) ? price : null, forWho: $('#iFor', sheet).value.trim(), store: $('#iStore', sheet).value.trim(), note: $('#iNote', sheet).value.trim() });
      store.save(); closeSheet(); render();
      return;
    }
    if (e.target.closest('#delI')) {
      store.data.items = store.data.items.filter((x) => x.id !== i.id);
      store.save(); closeSheet(); render(); toast('Quitado de la lista');
    }
  });
}

function financeData() {
  try {
    const f = JSON.parse(localStorage.getItem('finanzas.v1'));
    return f && Array.isArray(f.cards) && Array.isArray(f.movements) ? f : null;
  } catch (e) { return null; }
}

function toFinanceSheet() {
  const fin = financeData();
  if (!fin) { alert('Abre Finanzas una vez para configurar tus tarjetas y vuelve a intentarlo.'); return; }
  const items = inCart().filter((i) => i.price);
  // Agrupa por categoría de Finanzas: un movimiento por grupo.
  const groups = new Map();
  for (const i of items) {
    const k = catOf(i.cat).fin;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  }
  const st = { cardId: fin.lastCardId && fin.cards.some((c) => c.id === fin.lastCardId) ? fin.lastCardId : fin.cards[0]?.id };
  const sheet = openSheet(`
    <h3>Registrar en Finanzas</h3>
    <div class="list fin-preview">${Array.from(groups.entries()).map(([k, list]) => `
      <div class="item"><span class="main"><div class="t">${esc(list.map((i) => i.name).join(', '))}</div><div class="s">Categoría: ${esc(FIN_NAMES[k] || k)}</div></span>
      <span class="amt">${fmt(list.reduce((a, i) => a + lineTotal(i), 0))}</span></div>`).join('')}</div>
    <div class="field" style="margin-top:14px"><div class="label">¿Con qué pagaste?</div><div class="chips" id="fCards"></div></div>
    <button type="button" class="btn primary" id="doFin">Registrar gasto</button>`);
  const paint = () => {
    $('#fCards', sheet).innerHTML = fin.cards.map((c) =>
      `<button type="button" class="chip" data-card="${esc(c.id)}" aria-pressed="${st.cardId === c.id}"><span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}</button>`).join('');
  };
  paint();
  sheet.addEventListener('click', (e) => {
    const c = e.target.closest('[data-card]');
    if (c) { st.cardId = c.dataset.card; paint(); return; }
    if (e.target.closest('#doFin')) {
      if (!st.cardId) { toast('Elige una tarjeta'); return; }
      const rect = e.target.closest('#doFin').getBoundingClientRect();
      for (const [k, list] of groups) {
        fin.movements.push({
          id: uid(), createdAt: Date.now(), type: 'gasto', amount: Math.round(list.reduce((a, i) => a + lineTotal(i), 0) * 100) / 100,
          cardId: st.cardId, person: null, owed: null, category: k, note: list.map((i) => i.name).join(', ').slice(0, 80), date: todayISO(),
        });
      }
      fin.lastCardId = st.cardId;
      localStorage.setItem('finanzas.v1', JSON.stringify(fin));
      for (const i of items) i.registered = true;
      store.data.items = store.data.items.filter((i) => !(i.done && i.registered));
      store.save();
      closeSheet(); render();
      takeoff(rect);
      celebrate('mod_finanzas', '¡Registrado en Finanzas!', `${groups.size} movimiento${groups.size === 1 ? '' : 's'}`);
    }
  });
}

/* ---------------- Eventos ---------------- */

function bind() {
  $('#quick').addEventListener('submit', (e) => { e.preventDefault(); addQuick(); });
  $('#qCats').addEventListener('click', (e) => {
    const c = e.target.closest('[data-qcat]');
    if (!c) return;
    ui.cat = c.dataset.qcat;
    store.data.lastCat = ui.cat; store.save();
    renderCats();
    replay($(`#qCats [data-qcat="${ui.cat}"]`), 'just');
    $('#qName').placeholder = ui.cat === 'regalos' ? 'Ej. regalo para Ana, libro…' : ui.cat === 'ropa' ? 'Ej. tenis blancos, sudadera…' : 'Agregar… (ej. leche, 2 jabones)';
  });
  $('#filters').addEventListener('click', (e) => {
    const f = e.target.closest('[data-filter]');
    if (f) { ui.filter = f.dataset.filter; render(); }
  });
  document.addEventListener('click', (e) => {
    const row = e.target.closest('.shop-item');
    if (row) {
      if (e.target.closest('[data-toggle]')) toggle(row.dataset.id);
      else if (e.target.closest('[data-edit]')) itemSheet(row.dataset.id);
      return;
    }
    if (e.target.closest('#clearCart')) {
      if (!confirm('¿Quitar de la lista todo lo que ya está en el carrito?')) return;
      store.data.items = store.data.items.filter((i) => !i.done);
      store.save(); render(); toast('Carrito vaciado');
      return;
    }
    if (e.target.closest('#toFin')) toFinanceSheet();
  });
}

bind();
render();
initPage();
