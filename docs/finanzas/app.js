'use strict';

/* ============================================================
   Mis Finanzas — PWA privada. Los datos viven solo en este
   dispositivo (localStorage). Respaldo manual en Ajustes.
   ============================================================ */

const STORAGE_KEY = 'finanzas.v1';
const PHOTO_KEY = 'finanzas.foto'; // la foto va aparte para que el respaldo .json no pese

const DEFAULT_CARDS = [
  { id: 'banamex-debito', name: 'Débito Banamex', kind: 'debito', color: '#c8102e' },
  { id: 'banamex-credito', name: 'Crédito Banamex', kind: 'credito', color: '#1d3c78' },
  { id: 'nu-debito', name: 'Débito Nu', kind: 'debito', color: '#820ad1' },
  { id: 'efectivo', name: 'Efectivo', kind: 'efectivo', color: '#2f8f5b' },
];

const CATEGORIES = [
  { id: 'comida', name: 'Comida', icon: '🍽️' },
  { id: 'super', name: 'Súper', icon: '🛒' },
  { id: 'transporte', name: 'Transporte', icon: '🚗' },
  { id: 'casa', name: 'Casa', icon: '🏠' },
  { id: 'servicios', name: 'Servicios', icon: '💡' },
  { id: 'salud', name: 'Salud', icon: '💊' },
  { id: 'entretenimiento', name: 'Entretenimiento', icon: '🎬' },
  { id: 'compras', name: 'Compras', icon: '🛍️' },
  { id: 'suscripciones', name: 'Suscripciones', icon: '🔁' },
  { id: 'viajes', name: 'Viajes', icon: '✈' },
  { id: 'otros', name: 'Otros', icon: '•' },
];

/*
 * Tipos de movimiento.
 *  card:     'required' | 'optional' | false
 *  person:   pide nombre de persona (deudas)
 *  category: pide categoría (es gasto tuyo, total o parcial)
 *  flow:     'out' sale dinero de tu cuenta, 'in' entra, 'none' no se mueve dinero tuyo
 *  debt:     efecto en el saldo con la persona (+ = te debe, − = le debes)
 */
const TYPES = {
  gasto:    { label: 'Gasto personal',      icon: '🧾', card: 'required', person: false, category: true,  flow: 'out' },
  prestado: { label: 'Pagué por alguien',   icon: '🤝', card: 'required', person: true,  category: true,  flow: 'out' },
  debo:     { label: 'Alguien pagó por mí', icon: '🙋', card: false,      person: true,  category: true,  flow: 'none' },
  cobro:    { label: 'Me pagaron',          icon: '📥', card: 'optional', person: true,  category: false, flow: 'in' },
  pago:     { label: 'Pagué una deuda',     icon: '📤', card: 'required', person: true,  category: false, flow: 'out' },
  ingreso:  { label: 'Ingreso',             icon: '💰', card: 'optional', person: false, category: false, flow: 'in' },
};
const TYPE_ORDER = ['gasto', 'prestado', 'debo', 'cobro', 'pago', 'ingreso'];

const THEMES = [
  { id: 'auto', name: 'Automático', swatch: 'linear-gradient(135deg,#f8dccf,#d9e4f6 50%,#1b2150 50%,#2a2763)', style: 'journal' },
  { id: 'cielo', name: 'Cielo', swatch: 'radial-gradient(circle at 75% 30%,#fff 0 3px,transparent 4px),radial-gradient(circle at 30% 65%,#fff 0 2px,transparent 3px),linear-gradient(180deg,#f8dccf,#ece0f3 50%,#d9e4f6)', style: 'journal' },
  { id: 'nocheestrellada', name: 'Noche estrellada', swatch: 'radial-gradient(circle at 70% 30%,#f3c894 0 3px,transparent 4px),radial-gradient(circle at 30% 60%,#fff 0 2px,transparent 3px),radial-gradient(circle at 50% 80%,#d9ccff 0 1.5px,transparent 2.5px),linear-gradient(180deg,#0f1430,#2a2763)', style: 'journal' },
  { id: 'menta', name: 'Menta', swatch: 'linear-gradient(135deg,#0f766e,#34d399)' },
  { id: 'sakura', name: 'Sakura', swatch: 'linear-gradient(135deg,#c93d68,#f9a8c0)' },
  { id: 'lavanda', name: 'Lavanda', swatch: 'linear-gradient(135deg,#6a49c9,#c4a7f5)' },
  { id: 'arena', name: 'Arena', swatch: 'linear-gradient(135deg,#b0532c,#e9c79a)' },
  { id: 'oceano', name: 'Océano', swatch: 'linear-gradient(135deg,#1667ad,#4fc3e8)' },
  { id: 'medianoche', name: 'Medianoche', swatch: 'linear-gradient(135deg,#1c1733,#a78bfa 60%,#f472b6)' },
  { id: 'grafito', name: 'Grafito', swatch: 'linear-gradient(135deg,#1d2024 45%,#facc15 45%,#fb923c)' },
];

const TITLES = {
  nuevo: 'Nuevo movimiento',
  movs: 'Movimientos',
  deudas: 'Deudas',
  resumen: 'Resumen',
  ajustes: 'Ajustes',
};

/* ---------------- Utilidades ---------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const fmt = (n) => money.format(Math.round(n * 100) / 100);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function parseAmount(str) {
  if (str == null) return NaN;
  const clean = String(str).replace(/[$\s,]/g, '');
  if (clean === '') return NaN;
  const n = Number(clean);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

function pad(n) { return String(n).padStart(2, '0'); }
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function monthOf(iso) { return iso.slice(0, 7); }
function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}
function dayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const t = todayISO();
  if (iso === t) return 'Hoy';
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  if (iso === `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`) return 'Ayer';
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
}

function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function personKey(name) { return String(name || '').trim().toLocaleLowerCase('es-MX'); }

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------------- Datos ---------------- */

function emptyDb() {
  return { version: 1, cards: DEFAULT_CARDS.map((c) => ({ ...c })), movements: [], lastCardId: null, lastBackup: null, theme: 'auto', photo: { where: 'ambos', visibility: 35 } };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDb();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.movements) || !Array.isArray(data.cards)) return emptyDb();
    return { ...emptyDb(), ...data };
  } catch (e) {
    console.error('No se pudo leer el almacenamiento', e);
    return emptyDb();
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    console.error(e);
    alert('No se pudo guardar en este dispositivo. Exporta un respaldo desde Ajustes.');
    return false;
  }
}

let db = load();

const ui = {
  tab: 'nuevo',
  month: monthOf(todayISO()),
  filterCard: '',
  editingId: null,
  form: { type: 'gasto', cardId: null, category: null },
};

function cardById(id) { return db.cards.find((c) => c.id === id); }
function cardName(id) { return cardById(id)?.name ?? (id ? 'Tarjeta eliminada' : ''); }
function categoryById(id) { return CATEGORIES.find((c) => c.id === id); }

/* Lo que realmente gastaste tú (para resumen por categoría). */
function personalExpense(m) {
  if (m.type === 'gasto' || m.type === 'debo') return m.amount;
  if (m.type === 'prestado') return Math.max(0, m.amount - (m.owed ?? m.amount));
  return 0;
}

/* Efecto en el saldo con la persona: + te debe, − le debes. */
function debtDelta(m) {
  switch (m.type) {
    case 'prestado': return m.owed ?? m.amount;
    case 'pago': return m.amount;
    case 'debo': return -m.amount;
    case 'cobro': return -m.amount;
    default: return 0;
  }
}

function peopleBalances() {
  const map = new Map();
  for (const m of db.movements) {
    if (!TYPES[m.type]?.person || !m.person) continue;
    const k = personKey(m.person);
    if (!map.has(k)) map.set(k, { key: k, name: m.person.trim(), balance: 0, last: m.date, count: 0 });
    const p = map.get(k);
    p.balance += debtDelta(m);
    p.count += 1;
    if (m.date > p.last) p.last = m.date;
  }
  for (const p of map.values()) p.balance = Math.round(p.balance * 100) / 100;
  return Array.from(map.values());
}

function sortedMovements(list) {
  return list.slice().sort((a, b) => (b.date.localeCompare(a.date)) || (b.createdAt - a.createdAt));
}

/* ---------------- Tema ---------------- */

const darkQuery = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  let t = db.theme || 'auto';
  if (t === 'auto') t = darkQuery.matches ? 'nocheestrellada' : 'cielo';
  document.documentElement.dataset.theme = t;
  const journal = t === 'cielo' || t === 'nocheestrellada';
  if (journal) document.documentElement.dataset.style = 'journal';
  else delete document.documentElement.dataset.style;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
}

/* ---------------- Foto ---------------- */

function getPhoto() { try { return localStorage.getItem(PHOTO_KEY); } catch (e) { return null; } }
function photoSettings() { return { where: 'ambos', visibility: 35, ...(db.photo || {}) }; }

function applyPhoto() {
  const img = getPhoto();
  const ps = photoSettings();
  const root = document.documentElement;
  root.style.setProperty('--photo', img ? `url("${img}")` : 'none');
  root.style.setProperty('--photo-veil', String(1 - ps.visibility / 100));
  document.body.classList.toggle('photo-on', !!img && (ps.where === 'fondo' || ps.where === 'ambos'));
  $('#hero')?.classList.toggle('photo', !!img && (ps.where === 'tarjeta' || ps.where === 'ambos'));
}

// Reduce la foto (máx. 1400 px) para que quepa en el almacenamiento del teléfono.
function loadPhoto(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const max = 1400;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    let data = canvas.toDataURL('image/jpeg', 0.82);
    try {
      localStorage.setItem(PHOTO_KEY, data);
    } catch (e) {
      try {
        data = canvas.toDataURL('image/jpeg', 0.6);
        localStorage.setItem(PHOTO_KEY, data);
      } catch (e2) {
        alert('La foto es demasiado grande para guardarla. Prueba con otra.');
        return;
      }
    }
    applyPhoto();
    renderSettings();
    toast('Foto aplicada');
  };
  img.onerror = () => { URL.revokeObjectURL(url); alert('No se pudo abrir esa imagen.'); };
  img.src = url;
}

function renderPhotoAdmin() {
  const img = getPhoto();
  const ps = photoSettings();
  $('#photoPreview').textContent = img ? '' : 'Sin foto';
  const where = [['fondo', 'Fondo'], ['tarjeta', 'Tarjeta de inicio'], ['ambos', 'Ambos']];
  $('#photoControls').innerHTML = `
    <button type="button" class="btn" data-photo="pick">${img ? 'Cambiar foto' : 'Elegir foto'}</button>
    ${img ? `
      <div class="label" style="margin-top:10px">¿Dónde se muestra?</div>
      <div class="chips">${where.map(([id, name]) =>
        `<button type="button" class="chip" data-photo-where="${id}" aria-pressed="${ps.where === id}">${name}</button>`).join('')}</div>
      <label class="label" for="photoVis" style="margin-top:10px">Qué tanto se ve en el fondo</label>
      <input type="range" id="photoVis" min="10" max="80" step="5" value="${ps.visibility}">
      <button type="button" class="btn danger" data-photo="remove">Quitar foto</button>` : ''}`;
}

/* ---------------- Efectos ---------------- */

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Vuelve a disparar una animación CSS ligada a una clase.
function replay(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}

function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

const PARTICLE_SHAPES = {
  star: (c) => `<svg viewBox="0 0 20 20"><path d="M10 1l2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 14.6 4.6 17.5l1.2-6L1.3 7.3l6.1-.7z" fill="${c}"/></svg>`,
  sparkle: (c) => `<svg viewBox="0 0 20 20"><path d="M10 0Q11.6 8.4 20 10Q11.6 11.6 10 20Q8.4 11.6 0 10Q8.4 8.4 10 0Z" fill="${c}"/></svg>`,
  heart: (c) => `<svg viewBox="0 0 20 20"><path d="M10 18C-1 10 3 1 10 5.5 17 1 21 10 10 18Z" fill="${c}"/></svg>`,
  dot: (c) => `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="6" fill="${c}"/></svg>`,
  cloud: () => `<svg viewBox="0 0 32 20"><g fill="#fff" fill-opacity=".95"><circle cx="9" cy="12" r="6"/><circle cx="17" cy="8" r="8"/><circle cx="25" cy="12" r="5.5"/><rect x="3" y="11" width="27" height="7" rx="3.5"/></g></svg>`,
};

// Lluvia de estrellas, destellos y corazones desde (x, y).
function burst(x, y, { count = 10, spread = 80, size = [8, 16], duration = 900 } = {}) {
  if (reduceMotion.matches) return;
  const colors = [cssVar('--ic-spark'), cssVar('--ic-heart'), cssVar('--accent'), cssVar('--accent-2'), '#ffffff'];
  const shapes = ['star', 'sparkle', 'sparkle', 'heart', 'dot'];
  for (let i = 0; i < count; i++) {
    const shape = count > 15 && i % 9 === 0 ? 'cloud' : shapes[i % shapes.length];
    const el = document.createElement('span');
    el.className = 'particle';
    const s = size[0] + Math.random() * (size[1] - size[0]) * (shape === 'cloud' ? 1.8 : 1);
    el.style.width = el.style.height = `${s}px`;
    el.innerHTML = PARTICLE_SHAPES[shape](colors[(Math.random() * colors.length) | 0]);
    document.body.appendChild(el);
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const dist = spread * (0.45 + Math.random() * 0.55);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - spread * 0.25;
    const rot = (Math.random() - 0.5) * 540;
    const anim = el.animate([
      { transform: `translate(${x - s / 2}px, ${y - s / 2}px) scale(.2) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${x - s / 2 + dx}px, ${y - s / 2 + dy}px) scale(1) rotate(${rot}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${x - s / 2 + dx * 1.15}px, ${y - s / 2 + dy + spread * 0.45}px) scale(.5) rotate(${rot * 1.4}deg)`, opacity: 0 },
    ], { duration: duration * (0.8 + Math.random() * 0.4), easing: 'cubic-bezier(.2,.7,.3,1)' });
    anim.onfinish = () => el.parentNode && el.parentNode.removeChild(el);
  }
}

// Tarjeta de celebración en el centro de la pantalla.
function celebrate(iconName, title, sub, big = false) {
  const host = $('#celebrate');
  host.innerHTML = `<div class="card">${icon(iconName)}<b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>`;
  if (big && !reduceMotion.matches) {
    // confeti extra que cae desde arriba
    for (let i = 0; i < 6; i++) {
      setTimeout(() => burst(window.innerWidth * (0.15 + Math.random() * 0.7), window.innerHeight * 0.25,
        { count: 10, spread: 120, size: [10, 18], duration: 1300 }), i * 120);
    }
  }
}

// Anima un monto de un valor a otro.
function countUp(el, from, to) {
  if (!el) return;
  if (reduceMotion.matches) { el.textContent = fmt(to); return; }
  const start = performance.now();
  const dur = 750;
  const step = (now) => {
    const k = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------------- Aviones ✈ ---------------- */

// Nubecita de la estela que deja el avión.
function puff(x, y, size = 10) {
  const el = document.createElement('span');
  el.className = 'puff';
  el.style.left = `${x - size / 2}px`;
  el.style.top = `${y - size / 2}px`;
  el.style.width = el.style.height = `${size}px`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.parentNode && el.parentNode.removeChild(el), { once: true });
}

// Vuela un avioncito por una curva (4 puntos de control). La nariz sigue la curva.
function flight(points, { duration = 1700, size = 40, easing = (t) => t, trail = true, fadeOut = false } = {}) {
  if (reduceMotion.matches) return;
  const el = document.createElement('span');
  el.className = 'plane-fly';
  el.style.width = el.style.height = `${size}px`;
  el.innerHTML = icon('avion');
  document.body.appendChild(el);
  const [p0, p1, p2, p3] = points;
  const B = (t, k) => (1 - t) ** 3 * p0[k] + 3 * (1 - t) ** 2 * t * p1[k] + 3 * (1 - t) * t * t * p2[k] + t ** 3 * p3[k];
  const D = (t, k) => 3 * (1 - t) ** 2 * (p1[k] - p0[k]) + 6 * (1 - t) * t * (p2[k] - p1[k]) + 3 * t * t * (p3[k] - p2[k]);
  const start = performance.now();
  let lastPuff = 0;
  const step = (now) => {
    const r = Math.min(1, (now - start) / duration);
    const t = easing(r);
    const x = B(t, 0), y = B(t, 1);
    const ang = Math.atan2(D(t, 1), D(t, 0) || 0.0001);
    el.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px) rotate(${ang}rad)`;
    if (fadeOut && r > 0.75) el.style.opacity = String(Math.max(0, (1 - r) / 0.25));
    if (trail && now - lastPuff > 45 && r > 0.04 && r < 0.96) {
      lastPuff = now;
      puff(x - Math.cos(ang) * size * 0.5, y - Math.sin(ang) * size * 0.5, size * (0.22 + Math.random() * 0.12));
    }
    if (r < 1) requestAnimationFrame(step);
    else if (el.parentNode) el.parentNode.removeChild(el);
  };
  requestAnimationFrame(step);
}

// Despega desde un botón: carretea, se eleva y sale por arriba a la derecha.
function takeoff(rect) {
  const vw = window.innerWidth;
  const y = rect.top + rect.height / 2;
  const x = rect.left + 36;
  flight([[x, y], [x + rect.width * 0.55, y], [vw * 0.9, y - 110], [vw + 90, y - 380]],
    { duration: 1800, size: 50, easing: (t) => t * t * (0.35 + 0.65 * t) });
}

// Aterriza sobre la tarjeta de inicio: baja desde la izquierda, toca y frena.
function landOnHero() {
  const hero = $('#hero');
  if (!hero || hero.hidden || ui.tab !== 'nuevo') return;
  const r = hero.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight) return;
  const vw = window.innerWidth;
  const ground = r.bottom - 12;
  flight([[-60, r.top - 70], [vw * 0.22, r.top - 30], [vw * 0.36, ground], [vw * 0.72, ground]],
    { duration: 2300, size: 48, easing: (t) => 1 - Math.pow(1 - t, 2.6), fadeOut: true });
}

/* ---------------- Navegación ---------------- */

function setTab(tab) {
  ui.tab = tab;
  for (const v of $$('.view')) v.hidden = v.id !== `view-${tab}`;
  for (const b of $$('#tabbar button')) {
    if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  $('#title').textContent = tab === 'nuevo' && ui.editingId ? 'Editar movimiento' : TITLES[tab];
  $('#subtitle').textContent = `${new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} ☁︎ ✦`;
  render();
  window.scrollTo(0, 0);
  replay($(`#view-${tab}`), 'enter');
  replay($(`#tabbar [data-tab="${tab}"]`), 'just');
}

function render() {
  if (ui.tab === 'nuevo') renderForm();
  if (ui.tab === 'movs') renderMovements();
  if (ui.tab === 'deudas') renderDebts();
  if (ui.tab === 'resumen') renderSummary();
  if (ui.tab === 'ajustes') renderSettings();
}

function renderMonthNavs() {
  for (const nav of $$('[data-month-nav]')) {
    const isCurrent = ui.month === monthOf(todayISO());
    nav.innerHTML = `
      <button type="button" data-shift="-1" aria-label="Mes anterior">‹</button>
      <strong>${esc(monthLabel(ui.month))}</strong>
      <button type="button" data-shift="1" aria-label="Mes siguiente" ${isCurrent ? 'disabled style="opacity:.35"' : ''}>›</button>`;
  }
}

/* ---------------- Formulario ---------------- */

function renderHero() {
  const hero = $('#hero');
  applyPhoto();
  hero.hidden = !!ui.editingId;
  if (ui.editingId) return;
  const ym = monthOf(todayISO());
  const spent = db.movements.filter((m) => monthOf(m.date) === ym).reduce((s, m) => s + personalExpense(m), 0);
  const people = peopleBalances();
  const owedToMe = people.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0);
  const iOwe = people.filter((p) => p.balance < 0).reduce((s, p) => s - p.balance, 0);
  if (!hero.dataset.ready) {
    hero.dataset.ready = '1';
    const stars = [12, 30, 52, 70, 86].map((x, i) =>
      `<span class="float-star" style="--x:${x}%;--d:${(i * 0.75).toFixed(2)}s"></span>`).join('');
    hero.innerHTML = `
      <span class="shine"></span>${stars}
      <span class="moon">${icon('moon')}</span>
      <div class="k">Tu gasto en ${esc(new Date().toLocaleDateString('es-MX', { month: 'long' }))}</div>
      <div class="v" id="heroAmount">${fmt(spent)}</div>
      <div class="meta"><span id="heroOwed"></span><span id="heroOwe"></span></div>`;
    ui.heroSpent = spent;
  }
  $('#heroOwed').textContent = `Te deben ${fmt(owedToMe)}`;
  $('#heroOwe').textContent = `Debes ${fmt(iOwe)}`;
  if (ui.heroSpent !== spent) {
    countUp($('#heroAmount'), ui.heroSpent || 0, spent);
    ui.heroSpent = spent;
    replay(hero, 'bump');
  }
}

function renderForm() {
  const f = ui.form;
  const t = TYPES[f.type];
  renderHero();

  $('#types').innerHTML = TYPE_ORDER.map((k) => `
    <button type="button" class="type" role="radio" data-type="${k}" aria-checked="${k === f.type}">
      ${icon(k)}${esc(TYPES[k].label)}
    </button>`).join('');

  // Tarjeta
  const cardField = $('[data-field="card"]');
  cardField.hidden = !t.card;
  $('#cardLabel').textContent = {
    cobro: '¿A qué cuenta te pagaron? (opcional)',
    ingreso: '¿A qué cuenta entró? (opcional)',
  }[f.type] || '¿Con qué pagaste?';
  $('#cards').innerHTML = db.cards.map((c) => `
    <button type="button" class="chip" data-card="${esc(c.id)}" aria-pressed="${c.id === f.cardId}">
      <span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}
    </button>`).join('') || '<span class="muted">Agrega tarjetas en Ajustes.</span>';

  // Persona
  $('[data-field="person"]').hidden = !t.person;
  $('#personLabel').textContent = {
    prestado: '¿Por quién pagaste?',
    debo: '¿Quién pagó por ti?',
    cobro: '¿Quién te pagó?',
    pago: '¿A quién le pagaste?',
  }[f.type] || 'Persona';
  $('#peopleList').innerHTML = peopleBalances()
    .sort((a, b) => b.last.localeCompare(a.last))
    .map((p) => `<option value="${esc(p.name)}"></option>`).join('');

  // Monto que te deben
  $('[data-field="owed"]').hidden = f.type !== 'prestado';
  updateOwedHint();

  // Categoría
  $('[data-field="category"]').hidden = !t.category;
  $('#catLabel').textContent = f.type === 'prestado' ? 'Categoría (de tu parte)' : 'Categoría';
  $('#categories').innerHTML = CATEGORIES.map((c) => `
    <button type="button" class="chip" data-cat="${c.id}" aria-pressed="${c.id === f.category}">${icon(c.id)}${esc(c.name)}</button>`).join('');

  $('#editBanner').hidden = !ui.editingId;
  $('#delete').hidden = !ui.editingId;
  $('#save').textContent = ui.editingId ? 'Guardar cambios' : 'Guardar';
  if (!$('#date').value) $('#date').value = todayISO();
}

function updateOwedHint() {
  const amount = parseAmount($('#amount').value);
  const owedInput = $('#owed');
  const owed = parseAmount(owedInput.value);
  owedInput.placeholder = Number.isFinite(amount) ? `Todo (${fmt(amount)})` : 'Todo';
  const hint = $('#owedHint');
  if (!Number.isFinite(amount)) { hint.textContent = 'Si pagaste una cuenta compartida, pon solo la parte que te deben.'; return; }
  const effective = Number.isFinite(owed) ? owed : amount;
  if (effective > amount) { hint.innerHTML = '<span class="out">No puede ser mayor que el monto pagado.</span>'; return; }
  const mine = amount - effective;
  hint.textContent = mine > 0 ? `Tu parte: ${fmt(mine)} · Te deben: ${fmt(effective)}` : `Te deben todo: ${fmt(effective)}`;
}

function resetForm(keepType = true) {
  const type = keepType ? ui.form.type : 'gasto';
  ui.editingId = null;
  ui.form = { type, cardId: TYPES[type].card === 'required' ? (db.lastCardId && cardById(db.lastCardId) ? db.lastCardId : null) : null, category: null };
  $('#amount').value = '';
  $('#owed').value = '';
  $('#person').value = '';
  $('#note').value = '';
  $('#date').value = todayISO();
  $('#title').textContent = TITLES.nuevo;
}

function startEdit(id) {
  const m = db.movements.find((x) => x.id === id);
  if (!m) return;
  ui.editingId = id;
  ui.form = { type: m.type, cardId: m.cardId || null, category: m.category || null };
  $('#amount').value = m.amount;
  $('#owed').value = m.type === 'prestado' && m.owed != null && m.owed !== m.amount ? m.owed : '';
  $('#person').value = m.person || '';
  $('#note').value = m.note || '';
  $('#date').value = m.date;
  setTab('nuevo');
}

function prefillPayment(person, balance) {
  resetForm();
  ui.form.type = balance > 0 ? 'cobro' : 'pago';
  ui.form.cardId = ui.form.type === 'pago' ? (db.lastCardId && cardById(db.lastCardId) ? db.lastCardId : null) : null;
  $('#person').value = person;
  $('#amount').value = Math.abs(balance).toFixed(2);
  setTab('nuevo');
  toast(balance > 0 ? 'Registra lo que te pagaron' : 'Registra lo que pagaste');
}

function submitForm() {
  const f = ui.form;
  const t = TYPES[f.type];
  const amount = parseAmount($('#amount').value);
  if (!Number.isFinite(amount) || amount <= 0) { toast('Escribe un monto válido'); $('#amount').focus(); return; }
  if (t.card === 'required' && !f.cardId) { toast('Elige con qué pagaste'); return; }
  const person = $('#person').value.trim();
  if (t.person && !person) { toast('Escribe el nombre de la persona'); $('#person').focus(); return; }
  let owed = null;
  if (f.type === 'prestado') {
    const o = parseAmount($('#owed').value);
    owed = Number.isFinite(o) ? o : amount;
    if (owed <= 0 || owed > amount) { toast('Revisa cuánto te deben'); $('#owed').focus(); return; }
  }
  const date = $('#date').value || todayISO();

  // Si la persona ya existe con otra capitalización, reusa el nombre existente.
  let personName = person;
  if (t.person) {
    const existing = peopleBalances().find((p) => p.key === personKey(person));
    if (existing) personName = existing.name;
  }

  const record = {
    type: f.type,
    amount,
    cardId: t.card ? f.cardId : null,
    person: t.person ? personName : null,
    owed,
    category: t.category ? (f.category || 'otros') : null,
    note: $('#note').value.trim(),
    date,
  };

  const balanceBefore = t.person ? (peopleBalances().find((p) => p.key === personKey(personName))?.balance ?? 0) : 0;

  if (ui.editingId) {
    const idx = db.movements.findIndex((x) => x.id === ui.editingId);
    if (idx >= 0) db.movements[idx] = { ...db.movements[idx], ...record, updatedAt: Date.now() };
  } else {
    db.movements.push({ id: uid(), createdAt: Date.now(), ...record });
  }
  if (record.cardId) db.lastCardId = record.cardId;
  if (!save()) return;

  const wasEditing = !!ui.editingId;
  const balanceAfter = t.person ? (peopleBalances().find((p) => p.key === personKey(personName))?.balance ?? 0) : 0;
  const settled = t.person && balanceBefore !== 0 && balanceAfter === 0;
  const btn = $('#save').getBoundingClientRect();
  resetForm(false);
  renderForm();
  if (settled) {
    celebrate('tab_deudas', `¡A mano con ${personName}!`, 'Deuda saldada', true);
  } else if (wasEditing) {
    celebrate('check', 'Cambios guardados', '');
  } else {
    celebrate(TYPES[record.type].category && record.category ? record.category : record.type, '¡Guardado!', fmt(amount));
  }
  burst(btn.left + btn.width / 2, btn.top + btn.height / 2, { count: settled ? 40 : 16, spread: settled ? 190 : 110, size: [10, 18] });
  if (wasEditing) { setTab('movs'); return; }
  if (TYPES[record.type].flow === 'in') {
    // Entra dinero: el avión aterriza en tu tarjeta de inicio.
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(landOnHero, 450);
  } else {
    // Sale dinero: el avión despega desde el botón.
    takeoff(btn);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 900);
  }
}

function deleteCurrent() {
  if (!ui.editingId) return;
  if (!confirm('¿Eliminar este movimiento?')) return;
  db.movements = db.movements.filter((m) => m.id !== ui.editingId);
  save();
  resetForm();
  toast('Movimiento eliminado');
  setTab('movs');
}

/* ---------------- Movimientos ---------------- */

function movementRow(m, i = 0) {
  const t = TYPES[m.type] || { label: m.type, icon: '•', flow: 'none' };
  const cat = categoryById(m.category);
  const title = m.note || (m.person && m.type !== 'gasto' ? `${t.label}: ${m.person}` : cat?.name) || t.label;
  const parts = [t.label];
  if (m.person) parts.push(m.person);
  if (m.cardId) parts.push(cardName(m.cardId));
  else if (m.type === 'debo') parts.push('sin tarjeta');
  const cls = t.flow === 'out' ? 'out' : t.flow === 'in' ? 'in' : 'neutral';
  const sign = t.flow === 'out' ? '−' : t.flow === 'in' ? '+' : '';
  let sub = '';
  if (m.type === 'prestado') sub = `<small>te debe ${fmt(m.owed ?? m.amount)}</small>`;
  if (m.type === 'debo') sub = '<small>le debes</small>';
  const card = cardById(m.cardId);
  return `
    <button type="button" class="item" data-edit="${esc(m.id)}" style="--i:${i}">
      <span class="bubble">${icon(cat && t.category ? cat.id : m.type)}${card ? `<span class="dot" style="background:${esc(card.color)}"></span>` : ''}</span>
      <span class="main">
        <div class="t">${esc(title)}</div>
        <div class="s">${esc(parts.join(' · '))}</div>
      </span>
      <span class="amt ${cls}">${sign}${fmt(m.amount)}${sub}</span>
    </button>`;
}

function renderMovements() {
  renderMonthNavs();
  const sel = $('#filterCard');
  sel.innerHTML = `<option value="">Todas las tarjetas y cuentas</option>` +
    db.cards.map((c) => `<option value="${esc(c.id)}" ${c.id === ui.filterCard ? 'selected' : ''}>${esc(c.name)}</option>`).join('');

  const list = sortedMovements(db.movements.filter((m) =>
    monthOf(m.date) === ui.month && (!ui.filterCard || m.cardId === ui.filterCard)));

  if (!list.length) {
    $('#movList').innerHTML = `<div class="empty">${icon('avion')}<b>Pista despejada</b>No hay movimientos en ${esc(monthLabel(ui.month))}.</div>`;
    return;
  }
  const groups = new Map();
  for (const m of list) {
    if (!groups.has(m.date)) groups.set(m.date, []);
    groups.get(m.date).push(m);
  }
  $('#movList').innerHTML = Array.from(groups.entries()).map(([date, items]) => `
    <div class="day">${esc(dayLabel(date))}</div>
    <div class="list">${items.map(movementRow).join('')}</div>`).join('');
}

/* ---------------- Deudas ---------------- */

function renderDebts() {
  const people = peopleBalances();
  const owedToMe = people.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0);
  const iOwe = people.filter((p) => p.balance < 0).reduce((s, p) => s - p.balance, 0);
  $('#debtTotals').innerHTML = `
    <div class="stat"><div class="k">Te deben</div><div class="v in">${fmt(owedToMe)}</div></div>
    <div class="stat"><div class="k">Debes</div><div class="v out">${fmt(iOwe)}</div></div>`;

  if (!people.length) {
    $('#debtList').innerHTML = `<div class="empty">${icon('tab_deudas')}<b>Sin deudas</b>Usa “Pagué por alguien” o “Alguien pagó por mí” al registrar.</div>`;
    return;
  }

  const open = people.filter((p) => p.balance !== 0).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  const settled = people.filter((p) => p.balance === 0).sort((a, b) => b.last.localeCompare(a.last));

  const personBlock = (p) => {
    const hist = sortedMovements(db.movements.filter((m) => personKey(m.person) === p.key)).slice(0, 5);
    const status = p.balance > 0 ? `<span class="in">te debe ${fmt(p.balance)}</span>`
      : p.balance < 0 ? `<span class="out">le debes ${fmt(-p.balance)}</span>` : '<span class="muted">a mano</span>';
    return `
      <details class="list" style="margin-bottom:10px">
        <summary class="item" style="list-style:none;cursor:pointer">
          <span class="main"><div class="t">${esc(p.name)}</div><div class="s">${p.count} movimiento${p.count === 1 ? '' : 's'}</div></span>
          <span class="amt">${status}</span>
        </summary>
        ${p.balance !== 0 ? `<div class="person-actions">
          <button type="button" class="btn small" data-settle="${esc(p.name)}" data-balance="${p.balance}">
            ${p.balance > 0 ? 'Me pagó' : 'Le pagué'}
          </button></div>` : ''}
        ${hist.map(movementRow).join('')}
      </details>`;
  };

  $('#debtList').innerHTML =
    (open.length ? open.map(personBlock).join('') : `<div class="empty">${icon('avion')}<b>Cielo despejado</b>Estás a mano con todos.</div>`) +
    (settled.length ? `<h2>A mano</h2>${settled.map(personBlock).join('')}` : '');
}

/* ---------------- Resumen ---------------- */

function renderSummary() {
  renderMonthNavs();
  const ms = db.movements.filter((m) => monthOf(m.date) === ui.month);

  const personal = ms.reduce((s, m) => s + personalExpense(m), 0);
  const income = ms.filter((m) => m.type === 'ingreso').reduce((s, m) => s + m.amount, 0);
  const repaid = ms.filter((m) => m.type === 'cobro').reduce((s, m) => s + m.amount, 0);
  const lentOut = ms.filter((m) => m.type === 'prestado').reduce((s, m) => s + (m.owed ?? m.amount), 0);

  // Lo que salió de cada tarjeta/cuenta
  const byCard = new Map();
  for (const m of ms) {
    if (TYPES[m.type]?.flow !== 'out' || !m.cardId) continue;
    byCard.set(m.cardId, (byCard.get(m.cardId) || 0) + m.amount);
  }
  const cardRows = Array.from(byCard.entries()).sort((a, b) => b[1] - a[1]);
  const cardMax = Math.max(1, ...cardRows.map((r) => r[1]));

  // Gasto personal por categoría
  const byCat = new Map();
  for (const m of ms) {
    const v = personalExpense(m);
    if (v <= 0) continue;
    const k = m.category || 'otros';
    byCat.set(k, (byCat.get(k) || 0) + v);
  }
  const catRows = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]);
  const catMax = Math.max(1, ...catRows.map((r) => r[1]));

  const bar = (label, value, max, color) => `
    <div class="bar">
      <div class="top"><span>${label}</span><span>${fmt(value)}</span></div>
      <div class="track"><div class="fill" style="width:${(value / max * 100).toFixed(1)}%;${color ? `background:${esc(color)}` : ''}"></div></div>
    </div>`;

  if (!ms.length) {
    $('#summary').innerHTML = `<div class="empty">${icon('avion')}<b>Pista despejada</b>Sin movimientos en ${esc(monthLabel(ui.month))}.</div>`;
    return;
  }

  $('#summary').innerHTML = `
    <div class="totals">
      <div class="stat wide"><div class="k">Tu gasto personal</div><div class="v">${fmt(personal)}</div></div>
      <div class="stat"><div class="k">Ingresos</div><div class="v in">${fmt(income)}</div></div>
      <div class="stat"><div class="k">Prestado este mes</div><div class="v neutral">${fmt(lentOut)}</div></div>
      ${repaid ? `<div class="stat wide"><div class="k">Te devolvieron este mes</div><div class="v in">${fmt(repaid)}</div></div>` : ''}
    </div>
    <h2>Salió de cada tarjeta</h2>
    <div class="bars">${cardRows.length ? cardRows.map(([id, v]) => {
      const c = cardById(id);
      return bar(esc(c?.name || 'Tarjeta eliminada') + (c?.kind === 'credito' ? ' <span class="muted small">(a pagar)</span>' : ''), v, cardMax, c?.color);
    }).join('') : '<div class="empty" style="padding:16px">Sin pagos con tarjeta.</div>'}</div>
    <h2>Gasto personal por categoría</h2>
    <div class="bars">${catRows.length ? catRows.map(([id, v]) => {
      const c = categoryById(id) || { id: 'otros', name: id };
      return bar(`${icon(c.id)}${esc(c.name)}`, v, catMax);
    }).join('') : '<div class="empty" style="padding:16px">Sin gastos personales.</div>'}</div>`;
}

/* ---------------- Ajustes ---------------- */

function renderSettings() {
  renderPhotoAdmin();
  $('#themes').innerHTML = THEMES.map((t) => `
    <button type="button" class="theme-opt" data-theme-id="${t.id}" aria-pressed="${(db.theme || 'auto') === t.id}">
      <span class="sw" style="background:${t.swatch}"></span>${esc(t.name)}
    </button>`).join('');

  $('#cardAdmin').innerHTML = `<div class="list">${db.cards.map((c) => `
    <div class="card-row" data-card-row="${esc(c.id)}">
      <input type="color" value="${esc(c.color)}" data-card-color aria-label="Color">
      <input type="text" value="${esc(c.name)}" data-card-name aria-label="Nombre">
      <select data-card-kind aria-label="Tipo">
        <option value="debito" ${c.kind === 'debito' ? 'selected' : ''}>Débito</option>
        <option value="credito" ${c.kind === 'credito' ? 'selected' : ''}>Crédito</option>
        <option value="efectivo" ${c.kind === 'efectivo' ? 'selected' : ''}>Efectivo</option>
        <option value="otra" ${c.kind === 'otra' ? 'selected' : ''}>Otra</option>
      </select>
      <button type="button" class="icon-btn" data-card-del aria-label="Eliminar">×</button>
    </div>`).join('') || '<div class="empty">Sin tarjetas.</div>'}</div>`;

  $('#backupInfo').textContent = `${db.movements.length} movimiento${db.movements.length === 1 ? '' : 's'} guardado${db.movements.length === 1 ? '' : 's'}. ` +
    (db.lastBackup ? `Último respaldo: ${new Date(db.lastBackup).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.` : 'Aún no has exportado un respaldo.');

  if (navigator.storage?.persisted) {
    navigator.storage.persisted().then((p) => {
      $('#storageInfo').textContent = p
        ? 'Almacenamiento persistente activado: el navegador no borrará tus datos automáticamente.'
        : 'Consejo: instala la app en tu pantalla de inicio para que el navegador conserve tus datos.';
    });
  }
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportJson() {
  db.lastBackup = Date.now();
  save();
  const json = JSON.stringify(db, null, 2);
  const filename = `finanzas-respaldo-${todayISO()}.json`;
  // En el celular, el menú de compartir permite guardarlo en Archivos / Drive.
  try {
    const file = new File([json], filename, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Respaldo de finanzas' });
      renderSettings();
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }
  download(filename, json, 'application/json');
  renderSettings();
}

function exportCsv() {
  const head = ['fecha', 'tipo', 'monto', 'tarjeta', 'persona', 'te_deben', 'tu_gasto', 'categoria', 'nota'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = sortedMovements(db.movements).reverse().map((m) => [
    m.date, TYPES[m.type]?.label || m.type, m.amount.toFixed(2), cardName(m.cardId), m.person || '',
    m.type === 'prestado' ? (m.owed ?? m.amount).toFixed(2) : '',
    personalExpense(m).toFixed(2), categoryById(m.category)?.name || '', m.note || '',
  ].map(q).join(','));
  download(`finanzas-${todayISO()}.csv`, '﻿' + [head.join(','), ...rows].join('\n'), 'text/csv');
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.movements) || !Array.isArray(data.cards)) throw new Error('formato');
      if (!confirm(`Esto reemplazará tus datos actuales con el respaldo (${data.movements.length} movimientos). ¿Continuar?`)) return;
      db = { ...emptyDb(), ...data };
      save();
      applyTheme();
      resetForm(false);
      toast('Respaldo importado');
      render();
    } catch (e) {
      alert('Ese archivo no parece un respaldo válido de esta app.');
    }
  };
  reader.readAsText(file);
}

/* ---------------- Eventos ---------------- */

function bind() {
  $('#tabbar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) setTab(b.dataset.tab);
  });

  $('#types').addEventListener('click', (e) => {
    const b = e.target.closest('[data-type]');
    if (!b) return;
    const prev = ui.form.type;
    ui.form.type = b.dataset.type;
    const t = TYPES[ui.form.type];
    if (!t.card) ui.form.cardId = null;
    else if (t.card === 'required' && !ui.form.cardId && db.lastCardId && cardById(db.lastCardId)) ui.form.cardId = db.lastCardId;
    else if (t.card === 'optional' && TYPES[prev].card === 'required') ui.form.cardId = null;
    if (!t.category) ui.form.category = null;
    renderForm();
    replay($(`#types [data-type="${ui.form.type}"]`), 'just');
  });

  $('#cards').addEventListener('click', (e) => {
    const b = e.target.closest('[data-card]');
    if (!b) return;
    const id = b.dataset.card;
    ui.form.cardId = ui.form.cardId === id && TYPES[ui.form.type].card === 'optional' ? null : id;
    renderForm();
    replay($(`#cards [data-card="${CSS.escape(id)}"]`), 'just');
  });

  $('#categories').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    ui.form.category = ui.form.category === b.dataset.cat ? null : b.dataset.cat;
    renderForm();
    replay($(`#categories [data-cat="${b.dataset.cat}"]`), 'just');
  });

  $('#amount').addEventListener('input', updateOwedHint);
  $('#owed').addEventListener('input', updateOwedHint);
  $$('[data-owed]').forEach((b) => b.addEventListener('click', () => {
    const amount = parseAmount($('#amount').value);
    if (!Number.isFinite(amount)) { toast('Primero escribe el monto'); return; }
    $('#owed').value = b.dataset.owed === 'half' ? (amount / 2).toFixed(2) : '';
    updateOwedHint();
  }));

  $('#save').addEventListener('click', submitForm);
  $('#delete').addEventListener('click', deleteCurrent);
  $('#cancelEdit').addEventListener('click', () => { const back = !!ui.editingId; resetForm(); renderForm(); if (back) setTab('movs'); });

  document.addEventListener('click', (e) => {
    const shift = e.target.closest('[data-shift]');
    if (shift) {
      const next = shiftMonth(ui.month, Number(shift.dataset.shift));
      if (next <= monthOf(todayISO())) { ui.month = next; render(); }
      return;
    }
    const edit = e.target.closest('[data-edit]');
    if (edit) {
      if (edit.tagName === 'SUMMARY') return;
      startEdit(edit.dataset.edit);
      return;
    }
    const settle = e.target.closest('[data-settle]');
    if (settle) prefillPayment(settle.dataset.settle, Number(settle.dataset.balance));
  });

  $('#filterCard').addEventListener('change', (e) => { ui.filterCard = e.target.value; renderMovements(); });

  // Administrar tarjetas
  $('#cardAdmin').addEventListener('change', (e) => {
    const row = e.target.closest('[data-card-row]');
    if (!row) return;
    const c = cardById(row.dataset.cardRow);
    if (!c) return;
    if (e.target.matches('[data-card-name]')) c.name = e.target.value.trim() || c.name;
    if (e.target.matches('[data-card-kind]')) c.kind = e.target.value;
    if (e.target.matches('[data-card-color]')) c.color = e.target.value;
    save();
    toast('Tarjeta actualizada');
  });
  $('#cardAdmin').addEventListener('click', (e) => {
    const del = e.target.closest('[data-card-del]');
    if (!del) return;
    const id = del.closest('[data-card-row]').dataset.cardRow;
    const used = db.movements.filter((m) => m.cardId === id).length;
    const msg = used
      ? `Esta tarjeta tiene ${used} movimiento${used === 1 ? '' : 's'}. Se conservarán pero aparecerán como “Tarjeta eliminada”. ¿Eliminarla?`
      : '¿Eliminar esta tarjeta?';
    if (!confirm(msg)) return;
    db.cards = db.cards.filter((c) => c.id !== id);
    if (db.lastCardId === id) db.lastCardId = null;
    if (ui.form.cardId === id) ui.form.cardId = null;
    save();
    renderSettings();
  });
  $('#addCard').addEventListener('click', () => {
    const name = prompt('Nombre de la tarjeta o cuenta (ej. Crédito Nu):');
    if (!name || !name.trim()) return;
    const palette = ['#0f766e', '#b45309', '#be185d', '#4338ca', '#0369a1', '#4d7c0f'];
    db.cards.push({ id: uid(), name: name.trim(), kind: /cr[eé]dito/i.test(name) ? 'credito' : 'debito', color: palette[db.cards.length % palette.length] });
    save();
    renderSettings();
  });

  $('#themes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme-id]');
    if (!b) return;
    db.theme = b.dataset.themeId;
    save();
    applyTheme();
    renderSettings();
    replay($(`#themes [data-theme-id="${db.theme}"]`), 'just');
  });
  darkQuery.addEventListener?.('change', applyTheme);

  $('#photoControls').addEventListener('click', (e) => {
    const pick = e.target.closest('[data-photo="pick"]');
    if (pick) { $('#photoFile').click(); return; }
    if (e.target.closest('[data-photo="remove"]')) {
      if (!confirm('¿Quitar la foto?')) return;
      localStorage.removeItem(PHOTO_KEY);
      applyPhoto(); renderSettings();
      return;
    }
    const w = e.target.closest('[data-photo-where]');
    if (w) { db.photo = { ...photoSettings(), where: w.dataset.photoWhere }; save(); applyPhoto(); renderSettings(); }
  });
  $('#photoControls').addEventListener('input', (e) => {
    if (e.target.id !== 'photoVis') return;
    db.photo = { ...photoSettings(), visibility: Number(e.target.value) };
    applyPhoto();
  });
  $('#photoControls').addEventListener('change', (e) => { if (e.target.id === 'photoVis') save(); });
  $('#photoFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadPhoto(file);
    e.target.value = '';
  });

  $('#exportJson').addEventListener('click', exportJson);
  $('#exportCsv').addEventListener('click', exportCsv);
  $('#importJson').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importJson(file);
    e.target.value = '';
  });
  $('#wipe').addEventListener('click', () => {
    if (!confirm('¿Borrar TODOS tus movimientos y tarjetas de este teléfono? Esto no se puede deshacer.')) return;
    if (prompt('Escribe BORRAR para confirmar') !== 'BORRAR') return;
    db = emptyDb();
    save();
    localStorage.removeItem(PHOTO_KEY);
    applyTheme();
    applyPhoto();
    resetForm(false);
    toast('Datos borrados');
    render();
  });
}

/* ---------------- Inicio ---------------- */

function init() {
  // Primera vez: guardar tarjetas por defecto.
  if (!localStorage.getItem(STORAGE_KEY)) save();
  applyTheme();
  applyPhoto();
  for (const b of $$('#tabbar [data-tab]')) b.querySelector('svg').outerHTML = icon(`tab_${b.dataset.tab}`);
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.type, .chip, .theme-opt, .tabbar button, .month-nav button, .btn:not(.primary)');
    if (t) burst(e.clientX, e.clientY, { count: 6, spread: 34, size: [7, 12], duration: 550 });
  });
  bind();
  $('.sky .jet').innerHTML = icon('avion');
  setTimeout(landOnHero, 700);
  resetForm(false);
  setTab('nuevo');

  // Pedir que el navegador no borre los datos.
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
  }
}

init();
