'use strict';

/* ============================================================
   Núcleo compartido de "Mi cielo": utilidades, almacenamiento,
   temas, foto, efectos (destellos, celebraciones), jets ✈,
   navegación entre secciones y hojas emergentes.
   Cada página define <html data-root="./"> o "../".
   ============================================================ */

const ROOT = document.documentElement.dataset.root || './';
const SETTINGS_KEY = 'cielo.ajustes';
const PHOTO_KEY = 'cielo.foto';
/* Claves que entran en el respaldo general. */
const DATA_KEYS = ['finanzas.v1', 'ideas.v1', 'gatos.v1', 'habitos.v1', 'diario.v1', 'sueno.v1', 'compras.v1', SETTINGS_KEY];

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
function isoOf(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayISO() { return isoOf(new Date()); }
function dateOf(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(iso, n) { const d = dateOf(iso); d.setDate(d.getDate() + n); return isoOf(d); }
function daysBetween(a, b) { return Math.round((dateOf(b) - dateOf(a)) / 86400000); }
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
  const t = todayISO();
  if (iso === t) return 'Hoy';
  if (iso === addDays(t, -1)) return 'Ayer';
  return dateOf(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
}
function shortDate(iso) {
  return dateOf(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.parentNode.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------- Almacenamiento ---------------- */

// Crea un almacén JSON en localStorage: store.data se edita y store.save() guarda.
function createStore(key, defaults) {
  let data;
  try { data = JSON.parse(localStorage.getItem(key)); } catch (e) { data = null; }
  const store = {
    key,
    data: { ...defaults(), ...(data || {}) },
    save() {
      try {
        localStorage.setItem(key, JSON.stringify(store.data));
        return true;
      } catch (e) {
        console.error(e);
        alert('No se pudo guardar: el almacenamiento del teléfono está lleno. Prueba quitar fotos o exporta un respaldo.');
        return false;
      }
    },
    reset() { store.data = defaults(); store.save(); },
  };
  return store;
}

// Ajustes generales (tema y foto). Migra los de la versión anterior de Finanzas.
const settings = (() => {
  const s = createStore(SETTINGS_KEY, () => ({ theme: 'auto', photo: { where: 'ambos', visibility: 35 } }));
  if (!localStorage.getItem(SETTINGS_KEY)) {
    try {
      const old = JSON.parse(localStorage.getItem('finanzas.v1')) || {};
      if (old.theme) s.data.theme = old.theme;
      if (old.photo) s.data.photo = old.photo;
    } catch (e) { /* sin datos previos */ }
    s.save();
  }
  try {
    const oldPhoto = localStorage.getItem('finanzas.foto');
    if (oldPhoto && !localStorage.getItem(PHOTO_KEY)) localStorage.setItem(PHOTO_KEY, oldPhoto);
    if (oldPhoto) localStorage.removeItem('finanzas.foto');
  } catch (e) { /* sin espacio */ }
  return s;
})();

/* ---------------- Temas ---------------- */

const THEMES = [
  { id: 'auto', name: 'Automático', swatch: 'linear-gradient(135deg,#f8dccf,#d9e4f6 50%,#1b2150 50%,#2a2763)' },
  { id: 'cielo', name: 'Cielo', swatch: 'radial-gradient(circle at 75% 30%,#fff 0 3px,transparent 4px),radial-gradient(circle at 30% 65%,#fff 0 2px,transparent 3px),linear-gradient(180deg,#f8dccf,#ece0f3 50%,#d9e4f6)' },
  { id: 'nocheestrellada', name: 'Noche estrellada', swatch: 'radial-gradient(circle at 70% 30%,#f3c894 0 3px,transparent 4px),radial-gradient(circle at 30% 60%,#fff 0 2px,transparent 3px),radial-gradient(circle at 50% 80%,#d9ccff 0 1.5px,transparent 2.5px),linear-gradient(180deg,#0f1430,#2a2763)' },
  { id: 'menta', name: 'Menta', swatch: 'linear-gradient(135deg,#0f766e,#34d399)' },
  { id: 'sakura', name: 'Sakura', swatch: 'linear-gradient(135deg,#c93d68,#f9a8c0)' },
  { id: 'lavanda', name: 'Lavanda', swatch: 'linear-gradient(135deg,#6a49c9,#c4a7f5)' },
  { id: 'arena', name: 'Arena', swatch: 'linear-gradient(135deg,#b0532c,#e9c79a)' },
  { id: 'oceano', name: 'Océano', swatch: 'linear-gradient(135deg,#1667ad,#4fc3e8)' },
  { id: 'medianoche', name: 'Medianoche', swatch: 'linear-gradient(135deg,#1c1733,#a78bfa 60%,#f472b6)' },
  { id: 'grafito', name: 'Grafito', swatch: 'linear-gradient(135deg,#1d2024 45%,#facc15 45%,#fb923c)' },
];

const darkQuery = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  let t = settings.data.theme || 'auto';
  if (t === 'auto') t = darkQuery.matches ? 'nocheestrellada' : 'cielo';
  const root = document.documentElement;
  root.dataset.theme = t;
  if (t === 'cielo' || t === 'nocheestrellada') root.dataset.style = 'journal';
  else delete root.dataset.style;
  $('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
}

/* ---------------- Foto ---------------- */

function getPhoto() { try { return localStorage.getItem(PHOTO_KEY); } catch (e) { return null; } }
function photoSettings() { return { where: 'ambos', visibility: 35, ...(settings.data.photo || {}) }; }

function applyPhoto() {
  const img = getPhoto();
  const ps = photoSettings();
  const root = document.documentElement;
  root.style.setProperty('--photo', img ? `url("${img}")` : 'none');
  root.style.setProperty('--photo-veil', String(1 - ps.visibility / 100));
  document.body.classList.toggle('photo-on', !!img && (ps.where === 'fondo' || ps.where === 'ambos'));
  for (const el of $$('[data-photo-card]')) el.classList.toggle('photo', !!img && (ps.where === 'tarjeta' || ps.where === 'ambos'));
}

// Reduce una imagen y la devuelve como JPEG en data URL.
function resizeImage(file, max = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen')); };
    img.src = url;
  });
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

function burstFrom(el, opts) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, opts);
}

// Tarjeta de celebración en el centro de la pantalla.
function celebrate(iconName, title, sub, big = false) {
  const host = $('#celebrate');
  if (!host) return;
  host.innerHTML = `<div class="card">${icon(iconName)}<b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>`;
  if (big && !reduceMotion.matches) {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => burst(window.innerWidth * (0.15 + Math.random() * 0.7), window.innerHeight * 0.25,
        { count: 10, spread: 120, size: [10, 18], duration: 1300 }), i * 120);
    }
  }
}

// Anima un monto de un valor a otro.
function countUp(el, from, to, format = fmt) {
  if (!el) return;
  if (reduceMotion.matches) { el.textContent = format(to); return; }
  const start = performance.now();
  const dur = 750;
  const step = (now) => {
    const k = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = format(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------------- Jets ✈ ---------------- */

// Nubecita de la estela.
function puff(x, y, size = 10) {
  const el = document.createElement('span');
  el.className = 'puff';
  el.style.left = `${x - size / 2}px`;
  el.style.top = `${y - size / 2}px`;
  el.style.width = el.style.height = `${size}px`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.parentNode && el.parentNode.removeChild(el), { once: true });
}

// Vuela un jet por una curva de 4 puntos; la nariz sigue la curva.
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

// Despega desde un elemento (o rectángulo): carretea, se eleva y sale por arriba.
function takeoff(target, { duration = 1800 } = {}) {
  const rect = target.getBoundingClientRect ? target.getBoundingClientRect() : target;
  const vw = window.innerWidth;
  const y = rect.top + rect.height / 2;
  const x = rect.left + Math.min(36, rect.width / 3);
  flight([[x, y], [x + Math.max(80, rect.width * 0.55), y], [vw * 0.9, y - 110], [vw + 90, y - 380]],
    { duration, size: 50, easing: (t) => t * t * (0.35 + 0.65 * t) });
}

// Aterriza sobre un elemento: baja desde la izquierda, toca y frena.
function landOn(el) {
  if (!el || el.hidden) return;
  const r = el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight) return;
  const vw = window.innerWidth;
  const ground = r.bottom - 12;
  flight([[-60, r.top - 70], [vw * 0.22, r.top - 30], [vw * 0.36, ground], [vw * 0.72, ground]],
    { duration: 2300, size: 48, easing: (t) => 1 - Math.pow(1 - t, 2.6), fadeOut: true });
}

/* ---------------- Navegación entre secciones ---------------- */

// Ir a otra sección: el jet despega desde lo que tocaste y luego cambia de página.
function navigate(url, fromEl) {
  if (reduceMotion.matches || !fromEl) { location.href = url; return; }
  takeoff(fromEl, { duration: 1100 });
  burstFrom(fromEl, { count: 10, spread: 70, size: [8, 14] });
  setTimeout(() => { location.href = url; }, 620);
}

/* ---------------- Hoja emergente ---------------- */

// Abre una hoja desde abajo con el HTML dado. Devuelve el panel.
function openSheet(html, { onClose } = {}) {
  closeSheet(true);
  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-grip"></div>${html}</div>`;
  document.body.appendChild(back);
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => back.classList.add('open'));
  back.addEventListener('click', (e) => {
    if (e.target === back || e.target.closest('[data-sheet-close]')) closeSheet();
  });
  back._onClose = onClose;
  return $('.sheet', back);
}

function closeSheet(immediate = false) {
  const back = $('.sheet-backdrop');
  if (!back) return;
  document.body.classList.remove('sheet-open');
  const done = () => { back.parentNode && back.parentNode.removeChild(back); back._onClose && back._onClose(); };
  if (immediate || reduceMotion.matches) { done(); return; }
  back.classList.remove('open');
  setTimeout(done, 260);
}

/* ---------------- Respaldo general ---------------- */

function backupPayload() {
  const data = {};
  for (const k of DATA_KEYS) {
    try { const v = localStorage.getItem(k); if (v) data[k] = JSON.parse(v); } catch (e) { /* omitir */ }
  }
  return { app: 'mi-cielo', version: 1, exportedAt: new Date().toISOString(), data };
}

function restoreBackup(obj) {
  // Formato nuevo: { app, data: {clave: valor} }. Formato viejo: solo Finanzas.
  let data;
  if (obj && obj.data && typeof obj.data === 'object') data = obj.data;
  else if (obj && Array.isArray(obj.movements) && Array.isArray(obj.cards)) data = { 'finanzas.v1': obj };
  else throw new Error('formato');
  for (const [k, v] of Object.entries(data)) {
    if (DATA_KEYS.includes(k)) localStorage.setItem(k, JSON.stringify(v));
  }
  return Object.keys(data).length;
}

/* ---------------- Arranque de cada página ---------------- */

function pageShell() {
  // Capas comunes: cielo, foto, celebración y aviso.
  if (!$('.sky')) document.body.insertAdjacentHTML('afterbegin',
    '<div class="sky" aria-hidden="true"><i></i><i></i><i></i><i class="jet"></i></div><div class="photo-bg" aria-hidden="true"></div>');
  if (!$('#celebrate')) document.body.insertAdjacentHTML('beforeend', '<div class="celebrate" id="celebrate"></div>');
  if (!$('#toast')) document.body.insertAdjacentHTML('beforeend', '<div class="toast" id="toast" role="status" aria-live="polite"></div>');
  $('.sky .jet').innerHTML = icon('avion');
}

function initPage({ land } = {}) {
  pageShell();
  applyTheme();
  applyPhoto();
  darkQuery.addEventListener?.('change', applyTheme);

  const sub = $('#subtitle');
  if (sub && !sub.textContent) sub.textContent = `${new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} ☁︎ ✦`;

  // Iconos declarados en el HTML: <span data-icon="nombre"></span>
  for (const el of $$('[data-icon]')) el.innerHTML = icon(el.dataset.icon);

  // Chispitas al tocar.
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.type, .chip, .theme-opt, .tabbar button, .month-nav button, .btn:not(.primary), .tile, .home-btn, .fab, .icon-pick button');
    if (t) burst(e.clientX, e.clientY, { count: 6, spread: 34, size: [7, 12], duration: 550 });
  });

  // Enlaces entre secciones con despegue.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-nav]');
    if (!a) return;
    e.preventDefault();
    navigate(a.getAttribute('href'), a);
  });

  if (land) setTimeout(() => landOn(typeof land === 'string' ? $(land) : land), 650);

  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // Si había una versión anterior y llega una nueva, recarga una vez para mostrarla.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      location.reload();
    });
    navigator.serviceWorker.register(`${ROOT}sw.js`, { scope: ROOT })
      .then((reg) => reg.update())
      .catch((e) => console.warn('SW', e));
  }
}
