'use strict';

/* Mi día: ánimo, emociones, energía, actividades, gratitud, pregunta del día y notas.
   Se guarda solo mientras llenas. Debajo: lo que te hace bien, racha, recuerdos y calendario. */

const store = createStore('diario.v1', () => ({ entries: {} }));

const MOODS = [
  { id: 'radiante', name: 'Radiante', score: 5 },
  { id: 'feliz', name: 'Feliz', score: 4 },
  { id: 'calma', name: 'En calma', score: 4 },
  { id: 'sueno', name: 'Con sueño', score: 3 },
  { id: 'triste', name: 'Triste', score: 2 },
  { id: 'estres', name: 'Estrés', score: 1 },
];
const EMOTIONS = [
  { id: 'alegria', name: 'Alegría', c: '#f5bf5f' },
  { id: 'calma', name: 'Calma', c: '#8ec9f2' },
  { id: 'gratitud', name: 'Gratitud', c: '#ef8fae' },
  { id: 'amor', name: 'Amor', c: '#f07aa0' },
  { id: 'motivacion', name: 'Motivación', c: '#f59e5b' },
  { id: 'orgullo', name: 'Orgullo', c: '#b18cf0' },
  { id: 'esperanza', name: 'Esperanza', c: '#7fd3b0' },
  { id: 'nostalgia', name: 'Nostalgia', c: '#a3a8d9' },
  { id: 'cansancio', name: 'Cansancio', c: '#b9b3c9' },
  { id: 'ansiedad', name: 'Ansiedad', c: '#e8a87c' },
  { id: 'tristeza', name: 'Tristeza', c: '#7fa6d9' },
  { id: 'enojo', name: 'Enojo', c: '#e57373' },
  { id: 'frustracion', name: 'Frustración', c: '#d98c6c' },
  { id: 'soledad', name: 'Soledad', c: '#9aa3b8' },
];
const ACTIVITIES = [
  { id: 'trabajo', name: 'Trabajo', icon: 'trabajo' },
  { id: 'estudiar', name: 'Estudiar', icon: 'estudiar' },
  { id: 'ejercicio', name: 'Ejercicio', icon: 'ejercicio' },
  { id: 'caminar', name: 'Caminar', icon: 'caminar' },
  { id: 'leer', name: 'Leer', icon: 'leer' },
  { id: 'cocinar', name: 'Cocinar', icon: 'cocinar' },
  { id: 'gatos', name: 'Gatos', icon: 'huella' },
  { id: 'amigos', name: 'Amigos', icon: 'tab_deudas' },
  { id: 'familia', name: 'Familia', icon: 'casa' },
  { id: 'pareja', name: 'Pareja', icon: 'salud' },
  { id: 'series', name: 'Series', icon: 'entretenimiento' },
  { id: 'musica', name: 'Música', icon: 'musica' },
  { id: 'compras', name: 'Compras', icon: 'compras' },
  { id: 'viajar', name: 'Viajar', icon: 'avion' },
  { id: 'naturaleza', name: 'Naturaleza', icon: 'plantas' },
  { id: 'meditar', name: 'Meditar', icon: 'meditar' },
  { id: 'cuidarme', name: 'Cuidarme', icon: 'skincare' },
  { id: 'descanso', name: 'Descansar', icon: 'mood_calma' },
];
const ENERGY = ['Sin pila', 'Baja', 'Normal', 'Buena', 'A tope'];
const PROMPTS = [
  '¿Qué te hizo sonreír hoy?',
  '¿Qué aprendiste hoy?',
  '¿Qué te gustaría recordar de este día?',
  '¿Qué hiciste hoy solo por ti?',
  '¿A quién te gustaría darle las gracias hoy?',
  'Si tu día fuera un clima, ¿cómo sería y por qué?',
  '¿Qué te preocupa y qué parte sí está en tus manos?',
  '¿Qué pequeño logro tuviste hoy?',
  '¿Qué harías distinto mañana?',
  '¿A dónde te gustaría volar si pudieras irte hoy?',
  '¿Qué canción describe tu día?',
  '¿Qué te dio energía y qué te la quitó?',
  '¿Qué te gustaría que te dijera tu yo del futuro?',
  '¿Qué momento del día fue el más tranquilo?',
];

const ui = { date: todayISO(), month: monthOf(todayISO()), promptShift: 0 };
const moodOf = (id) => MOODS.find((m) => m.id === id);
const emoOf = (id) => EMOTIONS.find((m) => m.id === id);
const actOf = (id) => ACTIVITIES.find((m) => m.id === id);

function entry(date = ui.date) {
  const e = store.data.entries[date];
  return { mood: null, emotions: [], energy: null, activities: [], gratitude: ['', '', ''], best: '', prompt: null, answer: '', text: '', ...(e || {}) };
}
function isEmpty(e) {
  return !e.mood && !e.emotions.length && !e.energy && !e.activities.length && !e.gratitude.some(Boolean) && !e.best && !e.answer && !e.text;
}
function promptFor(date) {
  const e = store.data.entries[date];
  if (e?.prompt) return e.prompt;
  const idx = (Math.floor(dateOf(date).getTime() / 86400000) + ui.promptShift) % PROMPTS.length;
  return PROMPTS[idx];
}

/* ---------------- Guardado ---------------- */

let saveTimer;
function persist(e, { quiet = true } = {}) {
  if (isEmpty(e)) delete store.data.entries[ui.date];
  else store.data.entries[ui.date] = { ...e, updatedAt: Date.now() };
  store.save();
  if (!quiet) return;
  clearTimeout(saveTimer);
  $('#savedHint') && ($('#savedHint').textContent = 'Guardado ✓');
  saveTimer = setTimeout(() => { if ($('#savedHint')) $('#savedHint').textContent = ''; }, 1600);
}

function update(fn, rerender = []) {
  const e = entry();
  fn(e);
  persist(e);
  for (const r of rerender) r();
}

/* ---------------- Formulario ---------------- */

function renderHead() {
  const isToday = ui.date === todayISO();
  const long = dateOf(ui.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#dayHead').innerHTML = `
    <button type="button" class="nav-day" data-day="-1" aria-label="Día anterior">‹</button>
    <div><b>${isToday ? 'Hoy' : esc(long)}</b>${isToday ? `<small>${esc(long)}</small>` : '<small><button type="button" class="link" data-today>Ir a hoy</button></small>'}</div>
    <button type="button" class="nav-day" data-day="1" aria-label="Día siguiente" ${isToday ? 'disabled' : ''}>›</button>`;
}

function renderForm() {
  const e = entry();
  $('#form').innerHTML = `
    <section class="card block">
      <h3>¿Cómo está tu cielo?</h3>
      <div class="moods">${MOODS.map((m) => `
        <button type="button" class="mood" data-mood="${m.id}" aria-pressed="${e.mood === m.id}">${icon(`mood_${m.id}`)}<span>${m.name}</span></button>`).join('')}</div>
    </section>

    <section class="card block">
      <h3>¿Qué sentiste? <small>elige todas las que quieras</small></h3>
      <div class="chips emo">${EMOTIONS.map((m) => `
        <button type="button" class="chip" data-emo="${m.id}" aria-pressed="${e.emotions.includes(m.id)}" style="--c:${m.c}"><span class="dot"></span>${m.name}</button>`).join('')}</div>
    </section>

    <section class="card block">
      <h3>Energía</h3>
      <div class="energy">${ENERGY.map((n, i) => `
        <button type="button" data-energy="${i + 1}" aria-pressed="${e.energy === i + 1}">
          <span class="bat">${Array.from({ length: 5 }, (_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</span><small>${n}</small>
        </button>`).join('')}</div>
    </section>

    <section class="card block">
      <h3>¿Qué hiciste hoy? <small>elige todas</small></h3>
      <div class="acts">${ACTIVITIES.map((a) => `
        <button type="button" class="act" data-act="${a.id}" aria-pressed="${e.activities.includes(a.id)}">${icon(a.icon)}<span>${a.name}</span></button>`).join('')}</div>
    </section>

    <section class="card block">
      <h3>Agradezco…</h3>
      ${e.gratitude.map((g, i) => `<div class="grat"><span>${i + 1}</span><input data-grat="${i}" value="${esc(g)}" placeholder="${['Algo pequeño', 'Alguien', 'Algo de mí'][i]}…" autocomplete="off"></div>`).join('')}
    </section>

    <section class="card block">
      <h3>Lo mejor del día ✦</h3>
      <input class="best" data-field="best" value="${esc(e.best)}" placeholder="Un momento que quieras guardar" autocomplete="off">
    </section>

    <section class="card block prompt">
      <div class="prompt-head"><h3>${icon('mod_ideas', 'mini')} Pregunta del día</h3>${!store.data.entries[ui.date]?.prompt ? '<button type="button" class="link" data-other-prompt>Otra</button>' : ''}</div>
      <p class="q" id="promptQ">${esc(promptFor(ui.date))}</p>
      <textarea data-field="answer" placeholder="Tu respuesta…">${esc(e.answer)}</textarea>
    </section>

    <section class="card block">
      <h3>Notas libres</h3>
      <div class="paper"><textarea data-field="text" placeholder="Querido día…">${esc(e.text)}</textarea></div>
    </section>

    <button type="button" class="btn primary" id="saveDay">Guardar mi día</button>
    <p class="saved-hint" id="savedHint"></p>
    ${store.data.entries[ui.date] ? '<button type="button" class="btn danger small-del" id="delDay">Borrar este día</button>' : ''}`;
}

/* ---------------- Cosas interesantes ---------------- */

function streak() {
  let d = todayISO();
  if (!store.data.entries[d]) d = addDays(d, -1);
  let n = 0;
  while (store.data.entries[d]) { n++; d = addDays(d, -1); }
  return n;
}

function renderInsights() {
  const all = Object.entries(store.data.entries);
  if (!all.length) { $('#insights').innerHTML = ''; return; }
  const withMood = all.filter(([, e]) => e.mood);
  const avg = withMood.length ? withMood.reduce((a, [, e]) => a + moodOf(e.mood).score, 0) / withMood.length : null;

  // Actividades que coinciden con días más soleados (mínimo 2 días con esa actividad).
  const good = [];
  if (avg !== null) {
    for (const a of ACTIVITIES) {
      const days = withMood.filter(([, e]) => (e.activities || []).includes(a.id));
      if (days.length < 2) continue;
      const m = days.reduce((s, [, e]) => s + moodOf(e.mood).score, 0) / days.length;
      good.push({ a, m, n: days.length, diff: m - avg });
    }
    good.sort((x, y) => y.diff - x.diff);
  }
  const best = good.filter((g) => g.diff > 0.15).slice(0, 3);

  // Emociones del mes.
  const counts = {};
  for (const [d, e] of all) if (monthOf(d) === ui.month) for (const em of e.emotions || []) counts[em] = (counts[em] || 0) + 1;
  const topEmo = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Un recuerdo: el día escrito más cercano a hace 30 días (o el más antiguo, si no hay).
  const target = addDays(todayISO(), -30);
  const older = all.filter(([d]) => d <= addDays(todayISO(), -7)).sort((a, b) => Math.abs(daysBetween(a[0], target)) - Math.abs(daysBetween(b[0], target)));
  const memory = older[0];
  const memText = memory ? (memory[1].best || memory[1].gratitude?.find(Boolean) || memory[1].answer || memory[1].text || '') : '';

  const s = streak();
  $('#insights').innerHTML = `
    <h2>Lo interesante</h2>
    <div class="ins-grid">
      <div class="card ins streak">${icon('otros')}<b>${s}</b><span>día${s === 1 ? '' : 's'} seguido${s === 1 ? '' : 's'} escribiendo</span></div>
      <div class="card ins total">${icon('mod_diario')}<b>${all.length}</b><span>día${all.length === 1 ? '' : 's'} en tu cuaderno</span></div>
    </div>
    ${best.length ? `<div class="card ins-list">
      <h3>Lo que te hace bien ☀︎</h3>
      ${best.map((g) => `<div class="good">${icon(g.a.icon)}<p>Los días con <b>${esc(g.a.name.toLowerCase())}</b> tu cielo suele estar más despejado <small>(${g.n} días)</small></p></div>`).join('')}
    </div>` : withMood.length >= 3 ? `<div class="card ins-list muted small">Sigue marcando tus actividades: con unos días más te diré cuáles coinciden con tus mejores días.</div>` : ''}
    ${topEmo.length ? `<div class="card ins-list">
      <h3>Tus emociones de ${esc(monthLabel(ui.month).split(' ')[0])}</h3>
      <div class="emo-cloud">${topEmo.map(([id, n]) => { const m = emoOf(id); return m ? `<span style="--c:${m.c};--s:${Math.min(1.5, 0.9 + n * 0.12)}">${esc(m.name)} <b>${n}</b></span>` : ''; }).join('')}</div>
    </div>` : ''}
    ${memory && memText ? `<button type="button" class="card memory" data-date="${memory[0]}">
      <small>UN RECUERDO · ${esc(dateOf(memory[0]).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }))}</small>
      <span>${memory[1].mood ? icon(`mood_${memory[1].mood}`) : icon('mod_diario')}</span>
      <p>“${esc(memText)}”</p>
    </button>` : ''}`;
}

/* ---------------- Calendario y lista ---------------- */

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
  const offset = (first.getDay() + 6) % 7;
  const today = todayISO();
  let cells = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<div class="cal-h">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) cells += '<div></div>';
  for (let d = 1; d <= days; d++) {
    const iso = `${ui.month}-${pad(d)}`;
    const e = store.data.entries[iso];
    cells += `<button type="button" class="cal-d ${iso === today ? 'today' : ''} ${iso === ui.date ? 'sel' : ''}" data-date="${iso}" ${iso > today ? 'disabled' : ''}>
      ${e?.mood ? icon(`mood_${e.mood}`) : `<span>${d}</span>`}${e && !e.mood ? '<i></i>' : ''}
    </button>`;
  }
  $('#calendar').innerHTML = `<div class="cal">${cells}</div>`;
  const counts = {};
  for (const [iso, e] of Object.entries(store.data.entries)) if (monthOf(iso) === ui.month && e.mood) counts[e.mood] = (counts[e.mood] || 0) + 1;
  $('#moodStats').innerHTML = MOODS.filter((mo) => counts[mo.id]).map((mo) =>
    `<span class="ms">${icon(`mood_${mo.id}`)}<b>${counts[mo.id]}</b></span>`).join('');
}

function renderRecent() {
  const list = Object.entries(store.data.entries).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 10);
  if (!list.length) {
    $('#recent').innerHTML = `<div class="empty">${icon('mod_diario')}<b>Aún no hay días guardados</b>Empieza por elegir cómo está tu cielo.</div>`;
    return;
  }
  $('#recent').innerHTML = `<div class="list">${list.map(([iso, e], i) => {
    const bits = [...(e.activities || []).slice(0, 3).map((a) => actOf(a)?.name), ...(e.emotions || []).slice(0, 2).map((x) => emoOf(x)?.name)].filter(Boolean);
    return `<button type="button" class="item" data-date="${iso}" style="--i:${i}">
      <span class="bubble">${icon(e.mood ? `mood_${e.mood}` : 'mod_diario')}</span>
      <span class="main"><div class="t">${esc(dayLabel(iso))}${e.mood ? ` · ${esc(moodOf(e.mood).name)}` : ''}</div>
        <div class="s">${esc(e.best || bits.join(' · ') || e.text || '')}</div></span>
    </button>`;
  }).join('')}</div>`;
}

function renderBelow() { renderInsights(); renderCalendar(); renderRecent(); }
function render() { renderHead(); renderForm(); renderBelow(); }

function openDate(iso) {
  ui.date = iso;
  ui.month = monthOf(iso);
  ui.promptShift = 0;
  render();
  window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}

/* ---------------- Eventos ---------------- */

function toggleIn(arr, id) { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); else arr.push(id); return i < 0; }

function bind() {
  document.addEventListener('click', (ev) => {
    const t = ev.target;
    const mood = t.closest('[data-mood]');
    if (mood) {
      let on = false;
      update((e) => { e.mood = e.mood === mood.dataset.mood ? null : mood.dataset.mood; on = !!e.mood; }, [renderBelow]);
      for (const b of $$('[data-mood]')) b.setAttribute('aria-pressed', String(b.dataset.mood === entry().mood));
      if (on) { replay(mood, 'just'); burstFrom(mood, { count: 8, spread: 50, size: [7, 12] }); }
      return;
    }
    const emo = t.closest('[data-emo]');
    if (emo) {
      let on;
      update((e) => { on = toggleIn(e.emotions, emo.dataset.emo); }, [renderBelow]);
      emo.setAttribute('aria-pressed', String(on));
      if (on) replay(emo, 'just');
      return;
    }
    const en = t.closest('[data-energy]');
    if (en) {
      const v = Number(en.dataset.energy);
      update((e) => { e.energy = e.energy === v ? null : v; });
      for (const b of $$('[data-energy]')) b.setAttribute('aria-pressed', String(Number(b.dataset.energy) === entry().energy));
      if (entry().energy) replay(en, 'just');
      return;
    }
    const act = t.closest('[data-act]');
    if (act) {
      let on;
      update((e) => { on = toggleIn(e.activities, act.dataset.act); }, [renderBelow]);
      act.setAttribute('aria-pressed', String(on));
      if (on) { replay(act, 'just'); burstFrom(act, { count: 6, spread: 36, size: [6, 10] }); }
      return;
    }
    if (t.closest('[data-other-prompt]')) {
      ui.promptShift++;
      $('#promptQ').textContent = promptFor(ui.date);
      replay($('#promptQ'), 'enter');
      return;
    }
    if (t.closest('#saveDay')) {
      const e = entry();
      if (isEmpty(e)) { toast('Elige algo o escribe unas líneas'); return; }
      persist(e, { quiet: false });
      burstFrom(t.closest('#saveDay'), { count: 20, spread: 130 });
      celebrate(e.mood ? `mood_${e.mood}` : 'mod_diario', 'Tu día quedó guardado', e.mood ? moodOf(e.mood).name : '', streak() >= 3);
      renderBelow();
      setTimeout(() => landOn($('#calendar')), 300);
      return;
    }
    if (t.closest('#delDay')) {
      if (!confirm('¿Borrar todo lo de este día?')) return;
      delete store.data.entries[ui.date]; store.save(); render(); toast('Día borrado');
      return;
    }
    if (t.closest('[data-today]')) { openDate(todayISO()); return; }
    const nd = t.closest('[data-day]');
    if (nd && !nd.disabled) { const next = addDays(ui.date, Number(nd.dataset.day)); if (next <= todayISO()) openDate(next); return; }
    const shift = t.closest('[data-shift]');
    if (shift) {
      const next = shiftMonth(ui.month, Number(shift.dataset.shift));
      if (next <= monthOf(todayISO())) { ui.month = next; renderBelow(); }
      return;
    }
    const d = t.closest('[data-date]');
    if (d && !d.disabled) openDate(d.dataset.date);
  });

  // Texto: se guarda solo mientras escribes.
  document.addEventListener('input', (ev) => {
    const g = ev.target.closest('[data-grat]');
    if (g) { update((e) => { e.gratitude[Number(g.dataset.grat)] = g.value; }); return; }
    const f = ev.target.closest('[data-field]');
    if (f) {
      update((e) => {
        e[f.dataset.field] = f.value;
        if (f.dataset.field === 'answer' && f.value.trim()) e.prompt = promptFor(ui.date);
      });
    }
  });
  document.addEventListener('change', (ev) => { if (ev.target.closest('[data-field], [data-grat]')) renderBelow(); });
}

bind();
render();
initPage();
