'use strict';

/* Vision board: post-its y fotos que se acomodan y giran libremente.
   Si una nota tiene fecha, aparece en Countdown con su cuenta regresiva. */

const store = createStore('ideas.v1', () => ({ notes: [] }));

const COLORS = [
  { id: 'amarillo', hex: '#fff1a8' },
  { id: 'rosa', hex: '#ffd6e4' },
  { id: 'lavanda', hex: '#e4dbff' },
  { id: 'menta', hex: '#cdf3e1' },
  { id: 'cielo', hex: '#d2e8ff' },
  { id: 'durazno', hex: '#ffdfc6' },
  { id: 'blanco', hex: '#fffdf8' },
];
const TAGS = [
  { id: 'meta', name: 'Meta' },
  { id: 'viaje', name: 'Viaje' },
  { id: 'proyecto', name: 'Proyecto' },
  { id: 'regalo', name: 'Regalo' },
  { id: 'casa', name: 'Casa' },
  { id: 'compras', name: 'Compras' },
  { id: 'otro', name: 'Otro' },
];

const ui = { filter: 'todas', q: '', sel: null, z: 1 };

const colorHex = (id) => (COLORS.find((c) => c.id === id) || COLORS[0]).hex;
const tagName = (id) => TAGS.find((t) => t.id === id)?.name || '';
const noteById = (id) => store.data.notes.find((n) => n.id === id);
const board = () => $('#board');
const bw = () => board().clientWidth || 360;
const noteW = () => Math.min(190, Math.round(bw() * 0.46));

/* ---------------- Posiciones ---------------- */

function estHeight(n) {
  const lines = Math.min(9, Math.ceil((n.text || '').length / 16) + (n.text || '').split('\n').length - 1);
  return (n.photo ? noteW() * 0.95 + 30 : 40) + (n.text ? lines * 24 : 0) + 46;
}

// Acomoda notas en dos columnas (para notas nuevas sin lugar o al tocar "Acomodar").
function layout(list, all = false) {
  const colY = [24, 40];
  if (!all) {
    for (const n of store.data.notes) {
      if (n.x == null) continue;
      const col = n.x < 0.4 ? 0 : 1;
      colY[col] = Math.max(colY[col], n.y + estHeight(n) + 16);
    }
  }
  for (const n of list) {
    const col = colY[0] <= colY[1] ? 0 : 1;
    n.x = col === 0 ? 0.03 + Math.random() * 0.02 : Math.min(0.5 + Math.random() * 0.02, (bw() - noteW() - 14) / bw());
    n.y = colY[col] + Math.random() * 8;
    n.rot = Math.round((Math.random() * 8 - 4) * 10) / 10;
    n.z = ui.z++;
    colY[col] += estHeight(n) + 18;
  }
}

function boardHeight() {
  const maxY = store.data.notes.reduce((m, n) => Math.max(m, (n.y || 0) + estHeight(n)), 0);
  return Math.max(window.innerHeight * 0.75, maxY + 220);
}

/* ---------------- Cuenta regresiva ---------------- */

function countdownOf(date) {
  if (!date) return '';
  const d = daysBetween(todayISO(), date);
  if (d === 0) return '¡Hoy!';
  if (d === 1) return 'Mañana';
  if (d < 0) return `Hace ${-d} día${d === -1 ? '' : 's'}`;
  return d < 60 ? `En ${d} días` : `En ${Math.round(d / 30.4)} meses`;
}

function titleOf(n) {
  const t = (n.text || '').split('\n')[0].trim();
  return t ? (t.length > 40 ? t.slice(0, 38) + '…' : t) : 'Nota del vision board';
}

// Mantiene sincronizada la fecha de la nota con Countdown.
function syncCountdown(n, removed = false) {
  let f;
  try { f = JSON.parse(localStorage.getItem('fechas.v1')) || { events: [] }; } catch (e) { f = { events: [] }; }
  f.events = f.events || [];
  const i = f.events.findIndex((e) => e.noteId === n.id);
  if (removed || !n.date) {
    if (i >= 0) f.events.splice(i, 1); else return;
  } else {
    const ev = { ...(i >= 0 ? f.events[i] : { id: uid(), createdAt: Date.now() }), noteId: n.id, kind: 'tablero', name: titleOf(n), yearly: false, knowYear: true, date: n.date };
    if (i >= 0) f.events[i] = ev; else f.events.push(ev);
  }
  localStorage.setItem('fechas.v1', JSON.stringify(f));
}

/* ---------------- Dibujar ---------------- */

function matches(n) {
  const q = ui.q.trim().toLocaleLowerCase('es-MX');
  if (q && !(n.text || '').toLocaleLowerCase('es-MX').includes(q)) return false;
  if (ui.filter === 'fav') return !!n.fav;
  if (ui.filter === 'hechas') return !!n.done;
  if (ui.filter === 'fecha') return !!n.date;
  if (ui.filter !== 'todas') return n.tag === ui.filter;
  return true;
}

function noteHTML(n) {
  const cd = countdownOf(n.date);
  const sel = ui.sel === n.id;
  return `
    <article class="note ${n.photo ? 'polaroid' : ''} ${n.done ? 'done' : ''} ${sel ? 'sel' : ''} ${matches(n) ? '' : 'dim'}" data-id="${esc(n.id)}"
      style="--note:${colorHex(n.color)};left:${(n.x * bw()).toFixed(1)}px;top:${n.y.toFixed(1)}px;width:${noteW()}px;transform:rotate(${n.rot}deg);z-index:${n.z || 1}">
      <span class="tape" aria-hidden="true"></span>
      ${n.photo ? `<img class="note-photo" src="${n.photo}" alt="" draggable="false">` : ''}
      ${n.text ? `<div class="note-text">${esc(n.text)}</div>` : ''}
      <div class="note-foot">
        ${n.tag ? `<span class="note-tag">${esc(tagName(n.tag))}</span>` : ''}
        ${cd ? `<span class="note-cd">${icon('avion', 'mini')}${esc(cd)}</span>` : ''}
        ${n.fav ? '<span class="note-fav">★</span>' : ''}
      </div>
      ${n.done ? '<span class="stamp">¡Hecho! ✈</span>' : ''}
      ${sel ? `
        <span class="rot-handle" data-rot aria-label="Girar">↻</span>
        <div class="note-tools">
          <button type="button" data-edit>Editar</button>
          <button type="button" data-fav class="${n.fav ? 'on' : ''}" aria-label="Favorita">★</button>
          <button type="button" data-done class="${n.done ? 'on' : ''}" aria-label="Hecha">✓</button>
        </div>` : ''}
    </article>`;
}

function renderFilters() {
  const used = new Set(store.data.notes.map((n) => n.tag).filter(Boolean));
  const opts = [['todas', 'Todas'], ['fav', '★ Favoritas'], ['fecha', '✈ Con fecha'], ...TAGS.filter((t) => used.has(t.id)).map((t) => [t.id, t.name]), ['hechas', '✓ Hechas']];
  $('#filters').innerHTML = store.data.notes.length ? opts.map(([id, name]) =>
    `<button type="button" class="chip" data-filter="${id}" aria-pressed="${ui.filter === id}">${esc(name)}</button>`).join('') : '';
}

function renderBoard() {
  const b = board();
  if (!store.data.notes.length) {
    b.style.height = 'auto';
    b.innerHTML = `<div class="empty">${icon('mod_ideas')}<b>Tu vision board está vacío</b>Toca + para pegar tu primera nota o foto.</div>`;
    $('#hint').hidden = true;
    return;
  }
  $('#hint').hidden = false;
  b.style.height = `${boardHeight()}px`;
  b.innerHTML = store.data.notes.map(noteHTML).join('');
}

function render() { renderFilters(); renderBoard(); }

function apply(n) {
  const el = $(`.note[data-id="${CSS.escape(n.id)}"]`);
  if (!el) return;
  el.style.left = `${(n.x * bw()).toFixed(1)}px`;
  el.style.top = `${n.y.toFixed(1)}px`;
  el.style.transform = `rotate(${n.rot}deg)`;
  el.style.zIndex = n.z;
}

function select(id) {
  ui.sel = id;
  renderBoard();
}

/* ---------------- Mover y girar ---------------- */

const drag = { id: null, pts: new Map(), moved: false };
const rot = { id: null };
const angleOf = (a, b) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
const clampRot = (r) => Math.max(-45, Math.min(45, Math.round(r * 10) / 10));

function bindBoard() {
  const b = board();
  b.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.note');
    if (!el) { if (ui.sel) select(null); return; }
    if (e.target.closest('.note-tools')) return;
    const n = noteById(el.dataset.id);
    if (!n) return;

    // Control para girar
    if (e.target.closest('[data-rot]')) {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      Object.assign(rot, { id: n.id, c, a0: angleOf(c, { x: e.clientX, y: e.clientY }), r0: n.rot, pid: e.pointerId });
      return;
    }

    el.setPointerCapture(e.pointerId);
    drag.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (drag.pts.size === 1) {
      Object.assign(drag, { id: n.id, el, sx: e.clientX, sy: e.clientY, ox: n.x * bw(), oy: n.y, moved: false });
      n.z = ++ui.z;
      el.style.zIndex = n.z;
    } else if (drag.pts.size === 2 && drag.id === n.id) {
      // Dos dedos: girar
      const [p1, p2] = [...drag.pts.values()];
      drag.a0 = angleOf(p1, p2);
      drag.r0 = n.rot;
      drag.moved = true;
    }
  });

  b.addEventListener('pointermove', (e) => {
    if (rot.id && e.pointerId === rot.pid) {
      const n = noteById(rot.id);
      n.rot = clampRot(rot.r0 + angleOf(rot.c, { x: e.clientX, y: e.clientY }) - rot.a0);
      apply(n);
      return;
    }
    if (!drag.pts.has(e.pointerId)) return;
    drag.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const n = noteById(drag.id);
    if (!n) return;
    if (drag.pts.size >= 2) {
      const [p1, p2] = [...drag.pts.values()];
      n.rot = clampRot(drag.r0 + angleOf(p1, p2) - drag.a0);
      apply(n);
      return;
    }
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 7) return;
    if (!drag.moved) drag.el.classList.add('dragging');
    drag.moved = true;
    // Se queda dentro del tablero para que el control de giro siempre se vea.
    const maxX = (bw() - noteW() - 14) / bw();
    n.x = Math.max(0.02, Math.min(maxX, (drag.ox + dx) / bw()));
    n.y = Math.max(22, drag.oy + dy);
    apply(n);
    // Si llegas al fondo, el tablero crece.
    const need = n.y + estHeight(n) + 200;
    if (need > board().clientHeight) board().style.height = `${need}px`;
  });

  const end = (e) => {
    if (rot.id && e.pointerId === rot.pid) { rot.id = null; store.save(); return; }
    if (!drag.pts.has(e.pointerId)) return;
    drag.pts.delete(e.pointerId);
    if (drag.pts.size) return;
    const id = drag.id;
    drag.el?.classList.remove('dragging');
    if (drag.moved) store.save();
    else if (e.type === 'pointerup') select(ui.sel === id ? null : id);
    drag.id = null;
  };
  b.addEventListener('pointerup', end);
  b.addEventListener('pointercancel', end);

  // Botones de la nota seleccionada
  b.addEventListener('click', (e) => {
    const el = e.target.closest('.note');
    if (!el) return;
    const n = noteById(el.dataset.id);
    if (!n) return;
    if (e.target.closest('[data-edit]')) { openEditor(n.id); return; }
    if (e.target.closest('[data-fav]')) {
      n.fav = !n.fav; store.save();
      if (n.fav) burstFrom(e.target, { count: 8, spread: 40, size: [7, 12] });
      renderBoard(); return;
    }
    if (e.target.closest('[data-done]')) {
      n.done = !n.done; store.save();
      if (n.done) { burstFrom(el, { count: 18, spread: 110 }); toast('¡Cumplida! ✈'); }
      renderBoard();
      if (n.done) replay($(`.note[data-id="${CSS.escape(n.id)}"]`), 'stamping');
    }
  });
}

/* ---------------- Editor ---------------- */

function openEditor(id) {
  const n = id ? noteById(id) : null;
  const st = { color: n?.color || COLORS[store.data.notes.length % (COLORS.length - 1)].id, tag: n?.tag || null, photo: n?.photo || null };
  const sheet = openSheet(`
    <h3>${n ? 'Editar nota' : 'Nueva nota'}</h3>
    <div class="photo-slot" id="photoSlot"></div>
    <input type="file" id="notePhoto" accept="image/*" hidden>
    <div class="field"><textarea id="noteText" placeholder="Escribe tu sueño, meta o idea…" class="note-input">${esc(n?.text || '')}</textarea></div>
    <div class="field"><div class="label">Color</div><div class="swatches" id="swatches"></div></div>
    <div class="field"><div class="label">Etiqueta (opcional)</div><div class="chips" id="tags"></div></div>
    <div class="field">
      <label class="label" for="noteDate">Fecha (opcional): aparecerá en Countdown</label>
      <div class="row"><input id="noteDate" type="date" value="${esc(n?.date || '')}"><button type="button" class="chip" id="clearDate">Quitar</button></div>
    </div>
    <button type="button" class="btn primary" id="saveNote">${n ? 'Guardar cambios' : 'Pegar en el tablero'}</button>
    ${n ? '<button type="button" class="btn danger" id="delNote">Quitar del tablero</button>' : ''}`);

  const paint = () => {
    $('#photoSlot', sheet).innerHTML = st.photo
      ? `<img src="${st.photo}" alt=""><div class="photo-btns"><button type="button" class="chip" id="pickPhoto">Cambiar foto</button><button type="button" class="chip" id="rmPhoto">Quitar foto</button></div>`
      : `<button type="button" class="add-photo" id="pickPhoto">${icon('mod_ideas')}<span>Agregar foto</span></button>`;
    $('#swatches', sheet).innerHTML = COLORS.map((c) =>
      `<button type="button" class="swatch" data-color="${c.id}" aria-pressed="${st.color === c.id}" aria-label="${c.id}" style="background:${c.hex}"></button>`).join('');
    $('#tags', sheet).innerHTML = TAGS.map((t) =>
      `<button type="button" class="chip" data-tag="${t.id}" aria-pressed="${st.tag === t.id}">${esc(t.name)}</button>`).join('');
    $('#noteText', sheet).style.background = colorHex(st.color);
  };
  paint();

  $('#notePhoto', sheet).addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try { st.photo = await resizeImage(f, 720, 0.74); paint(); } catch (err) { alert('No se pudo abrir esa imagen.'); }
  });

  sheet.addEventListener('click', (e) => {
    if (e.target.closest('#pickPhoto')) { $('#notePhoto', sheet).click(); return; }
    if (e.target.closest('#rmPhoto')) { st.photo = null; paint(); return; }
    if (e.target.closest('#clearDate')) { $('#noteDate', sheet).value = ''; return; }
    const c = e.target.closest('[data-color]');
    if (c) { st.color = c.dataset.color; paint(); replay($(`[data-color="${st.color}"]`, sheet), 'just'); return; }
    const t = e.target.closest('[data-tag]');
    if (t) { st.tag = st.tag === t.dataset.tag ? null : t.dataset.tag; paint(); return; }
    if (e.target.closest('#saveNote')) {
      const text = $('#noteText', sheet).value.trim();
      if (!text && !st.photo) { toast('Escribe algo o agrega una foto'); return; }
      const date = $('#noteDate', sheet).value || null;
      let note = n;
      if (n) Object.assign(n, { text, color: st.color, tag: st.tag, photo: st.photo, date, updatedAt: Date.now() });
      else {
        note = { id: uid(), text, color: st.color, tag: st.tag, photo: st.photo, date, fav: false, done: false, createdAt: Date.now() };
        // Se pega en un hueco libre (abajo de la columna más corta).
        layout([note]);
        store.data.notes.push(note);
        if (ui.filter === 'hechas') ui.filter = 'todas';
      }
      if (!store.save()) return;
      syncCountdown(note);
      closeSheet();
      ui.sel = note.id;
      render();
      const el = $(`.note[data-id="${CSS.escape(note.id)}"]`);
      if (!n && el) {
        el.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
        replay(el, 'drop');
        setTimeout(() => burstFrom(el, { count: 14, spread: 90 }), 350);
      }
      if (date) toast(`En Countdown: ${countdownOf(date).toLowerCase()}`);
      else if (n) toast('Nota actualizada');
      return;
    }
    if (e.target.closest('#delNote')) {
      if (!confirm('¿Quitar esta nota del tablero?')) return;
      store.data.notes = store.data.notes.filter((x) => x.id !== n.id);
      store.save();
      syncCountdown(n, true);
      ui.sel = null;
      closeSheet(); render(); toast('Nota quitada');
    }
  });
}

/* ---------------- Arranque ---------------- */

function bind() {
  $('#add').addEventListener('click', () => openEditor(null));
  $('#search').addEventListener('input', (e) => { ui.q = e.target.value; renderBoard(); });
  $('#filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    ui.filter = b.dataset.filter;
    render();
  });
  $('#arrange').addEventListener('click', () => {
    if (!confirm('¿Acomodar todas las notas en dos columnas?')) return;
    layout(store.data.notes.slice().sort((a, b) => (b.fav - a.fav) || (a.createdAt - b.createdAt)), true);
    store.save(); ui.sel = null; render();
  });
  let w = window.innerWidth;
  window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - w) > 20) { w = window.innerWidth; renderBoard(); } });
  bindBoard();
}

// Notas de la versión anterior (sin posición): se acomodan una vez.
(function migrate() {
  const pending = store.data.notes.filter((n) => n.x == null || n.y == null);
  ui.z = store.data.notes.reduce((m, n) => Math.max(m, n.z || 0), 0) + 1;
  if (!pending.length) return;
  layout(pending);
  store.save();
})();

bind();
render();
initPage();
