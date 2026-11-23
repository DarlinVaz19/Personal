'use strict';

/* Ideas: tablero de notas adhesivas. */

const store = createStore('ideas.v1', () => ({ notes: [] }));

const COLORS = [
  { id: 'amarillo', hex: '#fff1a8' },
  { id: 'rosa', hex: '#ffd6e4' },
  { id: 'lavanda', hex: '#e4dbff' },
  { id: 'menta', hex: '#cdf3e1' },
  { id: 'cielo', hex: '#d2e8ff' },
  { id: 'durazno', hex: '#ffdfc6' },
];
const TAGS = [
  { id: 'proyecto', name: 'Proyecto' },
  { id: 'regalo', name: 'Regalo' },
  { id: 'viaje', name: 'Viaje' },
  { id: 'casa', name: 'Casa' },
  { id: 'compras', name: 'Compras' },
  { id: 'otro', name: 'Otro' },
];

const ui = { filter: 'todas', q: '', justAdded: null };

const colorHex = (id) => (COLORS.find((c) => c.id === id) || COLORS[0]).hex;
const tagName = (id) => TAGS.find((t) => t.id === id)?.name || '';

// Inclinación estable por nota (para que no "baile" al volver a pintar).
function tilt(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 7) - 3) * 0.8;
}

function visibleNotes() {
  const q = ui.q.trim().toLocaleLowerCase('es-MX');
  return store.data.notes
    .filter((n) => {
      if (ui.filter === 'fav' && !n.fav) return false;
      if (ui.filter === 'hechas' && !n.done) return false;
      if (ui.filter !== 'hechas' && ui.filter !== 'todas' && ui.filter !== 'fav' && n.tag !== ui.filter) return false;
      if (ui.filter !== 'hechas' && ui.filter !== 'todas' && n.done) return false;
      if (q && !n.text.toLocaleLowerCase('es-MX').includes(q)) return false;
      return true;
    })
    .sort((a, b) => (a.done - b.done) || (b.fav - a.fav) || (b.createdAt - a.createdAt));
}

function renderFilters() {
  const used = new Set(store.data.notes.map((n) => n.tag).filter(Boolean));
  const opts = [['todas', 'Todas'], ['fav', '★ Favoritas'], ...TAGS.filter((t) => used.has(t.id)).map((t) => [t.id, t.name]), ['hechas', '✓ Hechas']];
  $('#filters').innerHTML = opts.map(([id, name]) =>
    `<button type="button" class="chip" data-filter="${id}" aria-pressed="${ui.filter === id}">${esc(name)}</button>`).join('');
}

function renderBoard() {
  const notes = visibleNotes();
  if (!notes.length) {
    const empty = !store.data.notes.length;
    $('#board').innerHTML = `<div class="empty board-empty">${icon('mod_ideas')}<b>${empty ? 'Tu tablero está vacío' : 'Nada por aquí'}</b>${empty ? 'Toca + para pegar tu primera idea.' : 'Prueba con otro filtro o búsqueda.'}</div>`;
    return;
  }
  $('#board').innerHTML = notes.map((n, i) => `
    <article class="note ${n.done ? 'done' : ''} ${ui.justAdded === n.id ? 'drop' : ''}" data-id="${esc(n.id)}"
      style="--note:${colorHex(n.color)};--r:${tilt(n.id)}deg;--i:${i}">
      <span class="tape" aria-hidden="true"></span>
      <div class="note-text" data-open>${esc(n.text)}</div>
      <div class="note-foot">
        ${n.tag ? `<span class="note-tag">${esc(tagName(n.tag))}</span>` : '<span></span>'}
        <span class="note-actions">
          <button type="button" class="note-btn ${n.fav ? 'on' : ''}" data-fav aria-label="Favorita">★</button>
          <button type="button" class="note-btn ${n.done ? 'on' : ''}" data-done aria-label="Marcar como hecha">✓</button>
        </span>
      </div>
      ${n.done ? `<span class="stamp">¡Hecho! ✈</span>` : ''}
    </article>`).join('');
  ui.justAdded = null;
}

function render() { renderFilters(); renderBoard(); }

function openEditor(id) {
  const n = id ? store.data.notes.find((x) => x.id === id) : null;
  const state = { color: n?.color || COLORS[(store.data.notes.length) % COLORS.length].id, tag: n?.tag || null };
  const sheet = openSheet(`
    <h3>${n ? 'Editar idea' : 'Nueva idea'}</h3>
    <div class="field"><textarea id="noteText" placeholder="Escribe tu idea…" style="background:${colorHex(state.color)}" class="note-input">${esc(n?.text || '')}</textarea></div>
    <div class="field"><div class="label">Color</div><div class="swatches" id="swatches"></div></div>
    <div class="field"><div class="label">Etiqueta (opcional)</div><div class="chips" id="tags"></div></div>
    <button type="button" class="btn primary" id="saveNote">${n ? 'Guardar cambios' : 'Pegar en el tablero'}</button>
    ${n ? '<button type="button" class="btn danger" id="delNote">Eliminar idea</button>' : ''}`);

  const paint = () => {
    $('#swatches', sheet).innerHTML = COLORS.map((c) =>
      `<button type="button" class="swatch" data-color="${c.id}" aria-pressed="${state.color === c.id}" aria-label="${c.id}" style="background:${c.hex}"></button>`).join('');
    $('#tags', sheet).innerHTML = TAGS.map((t) =>
      `<button type="button" class="chip" data-tag="${t.id}" aria-pressed="${state.tag === t.id}">${esc(t.name)}</button>`).join('');
    $('#noteText', sheet).style.background = colorHex(state.color);
  };
  paint();
  if (!n) setTimeout(() => $('#noteText', sheet)?.focus(), 300);

  sheet.addEventListener('click', (e) => {
    const c = e.target.closest('[data-color]');
    if (c) { state.color = c.dataset.color; paint(); replay($(`[data-color="${state.color}"]`, sheet), 'just'); return; }
    const t = e.target.closest('[data-tag]');
    if (t) { state.tag = state.tag === t.dataset.tag ? null : t.dataset.tag; paint(); return; }
    if (e.target.closest('#saveNote')) {
      const text = $('#noteText', sheet).value.trim();
      if (!text) { toast('Escribe algo primero'); return; }
      if (n) Object.assign(n, { text, color: state.color, tag: state.tag, updatedAt: Date.now() });
      else {
        const note = { id: uid(), text, color: state.color, tag: state.tag, fav: false, done: false, createdAt: Date.now() };
        store.data.notes.push(note);
        ui.justAdded = note.id;
        ui.lastId = note.id;
        if (ui.filter === 'hechas') ui.filter = 'todas';
      }
      store.save();
      closeSheet();
      render();
      if (!n) {
        celebrate('mod_ideas', '¡Idea pegada!', '');
        setTimeout(() => burstFrom($(`.note[data-id="${CSS.escape(ui.lastId || '')}"]`) || $('.note'), { count: 14, spread: 90 }), 200);
      } else toast('Idea actualizada');
      return;
    }
    if (e.target.closest('#delNote')) {
      if (!confirm('¿Eliminar esta idea?')) return;
      store.data.notes = store.data.notes.filter((x) => x.id !== n.id);
      store.save();
      closeSheet();
      render();
      toast('Idea eliminada');
    }
  });
}

function bind() {
  $('#add').addEventListener('click', () => openEditor(null));
  $('#search').addEventListener('input', (e) => { ui.q = e.target.value; renderBoard(); });
  $('#filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    ui.filter = b.dataset.filter;
    render();
  });
  $('#board').addEventListener('click', (e) => {
    const card = e.target.closest('.note');
    if (!card) return;
    const n = store.data.notes.find((x) => x.id === card.dataset.id);
    if (!n) return;
    if (e.target.closest('[data-fav]')) {
      n.fav = !n.fav;
      store.save();
      if (n.fav) burstFrom(e.target, { count: 8, spread: 40, size: [7, 12] });
      renderBoard();
      return;
    }
    if (e.target.closest('[data-done]')) {
      n.done = !n.done;
      store.save();
      if (n.done) {
        burstFrom(card, { count: 18, spread: 110 });
        takeoff(card, { duration: 1500 });
        toast('¡Idea cumplida! ✈');
      }
      renderBoard();
      if (n.done) replay($(`.note[data-id="${CSS.escape(n.id)}"]`), 'stamping');
      return;
    }
    openEditor(n.id);
  });
}

bind();
render();
initPage();
