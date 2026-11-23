'use strict';

/* Diario: una página por día con el "clima" de tu ánimo. */

const store = createStore('diario.v1', () => ({ entries: {} }));

const MOODS = [
  { id: 'radiante', name: 'Radiante' },
  { id: 'feliz', name: 'Feliz' },
  { id: 'calma', name: 'En calma' },
  { id: 'sueno', name: 'Con sueño' },
  { id: 'triste', name: 'Triste' },
  { id: 'estres', name: 'Estrés' },
];
const moodName = (id) => MOODS.find((m) => m.id === id)?.name || '';

const ui = { date: todayISO(), month: monthOf(todayISO()), mood: null };

function loadEntry() {
  const e = store.data.entries[ui.date];
  ui.mood = e?.mood || null;
  return e;
}

function renderEntry() {
  const e = loadEntry();
  const isToday = ui.date === todayISO();
  const title = isToday ? '¿Cómo está tu cielo hoy?' : `¿Cómo estuvo tu cielo el ${dateOf(ui.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}?`;
  $('#entry').innerHTML = `
    <div class="entry-head">
      <h3>${esc(title)}</h3>
      ${!isToday ? '<button type="button" class="link" data-today>Ir a hoy</button>' : ''}
    </div>
    <div class="moods" id="moods">${MOODS.map((m) => `
      <button type="button" class="mood" data-mood="${m.id}" aria-pressed="${ui.mood === m.id}">
        ${icon(`mood_${m.id}`)}<span>${m.name}</span>
      </button>`).join('')}</div>
    <div class="paper">
      <textarea id="text" placeholder="Querido diario…">${esc(e?.text || '')}</textarea>
    </div>
    <button type="button" class="btn primary" id="saveEntry">${e ? 'Guardar cambios' : 'Guardar en mi diario'}</button>
    ${e ? '<button type="button" class="btn danger small-del" id="delEntry">Borrar esta página</button>' : ''}`;
}

function renderMonthNav() {
  const isCurrent = ui.month === monthOf(todayISO());
  $('[data-month-nav]').innerHTML = `
    <button type="button" data-shift="-1" aria-label="Mes anterior">‹</button>
    <strong>${esc(monthLabel(ui.month))}</strong>
    <button type="button" data-shift="1" aria-label="Mes siguiente" ${isCurrent ? 'disabled style="opacity:.35"' : ''}>›</button>`;
}

function renderCalendar() {
  renderMonthNav();
  const [y, m] = ui.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // semana empieza en lunes
  const today = todayISO();
  const heads = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<div class="cal-h">${d}</div>`).join('');
  let cells = '';
  for (let i = 0; i < offset; i++) cells += '<div></div>';
  for (let d = 1; d <= days; d++) {
    const iso = `${ui.month}-${pad(d)}`;
    const e = store.data.entries[iso];
    const future = iso > today;
    cells += `<button type="button" class="cal-d ${iso === today ? 'today' : ''} ${iso === ui.date ? 'sel' : ''} ${e ? 'has' : ''}" data-date="${iso}" ${future ? 'disabled' : ''}>
      ${e?.mood ? icon(`mood_${e.mood}`) : `<span>${d}</span>`}${e && !e.mood ? '<i></i>' : ''}
    </button>`;
  }
  $('#calendar').innerHTML = `<div class="cal">${heads}${cells}</div>`;

  const counts = {};
  for (const [iso, e] of Object.entries(store.data.entries)) if (monthOf(iso) === ui.month && e.mood) counts[e.mood] = (counts[e.mood] || 0) + 1;
  $('#moodStats').innerHTML = MOODS.filter((mo) => counts[mo.id]).map((mo) =>
    `<span class="ms">${icon(`mood_${mo.id}`)}<b>${counts[mo.id]}</b></span>`).join('');
}

function renderRecent() {
  const list = Object.entries(store.data.entries).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  if (!list.length) {
    $('#recent').innerHTML = `<div class="empty">${icon('mod_diario')}<b>Tu diario está en blanco</b>Elige cómo está tu cielo hoy y escribe unas líneas.</div>`;
    return;
  }
  $('#recent').innerHTML = `<div class="list">${list.map(([iso, e], i) => `
    <button type="button" class="item" data-date="${iso}" style="--i:${i}">
      <span class="bubble">${icon(e.mood ? `mood_${e.mood}` : 'mod_diario')}</span>
      <span class="main"><div class="t">${esc(dayLabel(iso))}${e.mood ? ` · ${esc(moodName(e.mood))}` : ''}</div>
        <div class="s">${esc(e.text || 'Sin texto')}</div></span>
    </button>`).join('')}</div>`;
}

function render() { renderEntry(); renderCalendar(); renderRecent(); }

function openDate(iso) {
  ui.date = iso;
  ui.month = monthOf(iso);
  render();
  window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}

function save() {
  const text = $('#text').value.trim();
  if (!ui.mood && !text) { toast('Elige cómo te sientes o escribe algo'); return; }
  const isNew = !store.data.entries[ui.date];
  store.data.entries[ui.date] = { mood: ui.mood, text, updatedAt: Date.now() };
  if (!store.save()) return;
  const btn = $('#saveEntry');
  burstFrom(btn, { count: 18, spread: 120 });
  celebrate(ui.mood ? `mood_${ui.mood}` : 'mod_diario', isNew ? 'Guardado en tu diario' : 'Página actualizada', ui.mood ? moodName(ui.mood) : '');
  render();
  if (isNew) setTimeout(() => landOn($('#calendar')), 300);
}

function bind() {
  document.addEventListener('click', (e) => {
    const mood = e.target.closest('[data-mood]');
    if (mood) {
      ui.mood = ui.mood === mood.dataset.mood ? null : mood.dataset.mood;
      for (const b of $$('#moods [data-mood]')) b.setAttribute('aria-pressed', String(b.dataset.mood === ui.mood));
      if (ui.mood) { replay(mood, 'just'); burstFrom(mood, { count: 8, spread: 50, size: [7, 12] }); }
      return;
    }
    if (e.target.closest('#saveEntry')) { save(); return; }
    if (e.target.closest('#delEntry')) {
      if (!confirm('¿Borrar la página de este día?')) return;
      delete store.data.entries[ui.date]; store.save(); render(); toast('Página borrada');
      return;
    }
    if (e.target.closest('[data-today]')) { openDate(todayISO()); return; }
    const shift = e.target.closest('[data-shift]');
    if (shift) {
      const next = shiftMonth(ui.month, Number(shift.dataset.shift));
      if (next <= monthOf(todayISO())) { ui.month = next; renderCalendar(); }
      return;
    }
    const d = e.target.closest('[data-date]');
    if (d && !d.disabled) openDate(d.dataset.date);
  });
}

bind();
render();
initPage();
