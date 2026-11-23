'use strict';

/* Hábitos: marca tus hábitos del día. Al completar todos, el jet despega. */

const store = createStore('habitos.v1', () => ({
  habits: [
    { id: 'h-agua', name: 'Tomar agua', icon: 'agua' },
    { id: 'h-leer', name: 'Leer', icon: 'leer' },
    { id: 'h-mover', name: 'Moverme', icon: 'ejercicio' },
  ],
  log: {},
}));

const HABIT_ICONS = ['agua', 'leer', 'ejercicio', 'meditar', 'dormir', 'caminar', 'vitaminas', 'skincare', 'estudiar', 'plantas', 'huella', 'comida', 'casa', 'mod_diario', 'mod_finanzas', 'salud', 'otros', 'avion'];

const ui = { day: todayISO() };

const doneOn = (date) => new Set(store.data.log[date] || []);
const isDone = (id, date) => doneOn(date).has(id);

function streak(id) {
  let d = todayISO();
  if (!isDone(id, d)) d = addDays(d, -1);
  let n = 0;
  while (isDone(id, d)) { n++; d = addDays(d, -1); }
  return n;
}

function progress(date) {
  const total = store.data.habits.length;
  const done = store.data.habits.filter((h) => isDone(h.id, date)).length;
  return { total, done, pct: total ? done / total : 0 };
}

function renderWeek() {
  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  $('#week').innerHTML = days.map((d) => {
    const p = progress(d);
    const dt = dateOf(d);
    return `<button type="button" class="day-pill ${d === ui.day ? 'sel' : ''} ${p.total && p.done === p.total ? 'full' : ''}" data-day="${d}" style="--p:${(p.pct * 100).toFixed(0)}%">
      <small>${dt.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')}</small>
      <b>${dt.getDate()}</b>
      <span class="ring"></span>
    </button>`;
  }).join('');
}

function renderHero(animate = false) {
  const p = progress(ui.day);
  const label = ui.day === todayISO() ? 'Hoy llevas' : `El ${dateOf(ui.day).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} llevaste`;
  if (!$('#hero').dataset.ready) {
    $('#hero').dataset.ready = '1';
    $('#hero').innerHTML = `
      <span class="shine"></span>
      <div class="k" id="rwLabel"></div>
      <div class="v" id="rwCount"></div>
      <div class="runway"><span class="runway-line"></span><span class="runway-jet" id="rwJet">${icon('avion')}</span><span class="runway-flag">${icon('otros')}</span></div>
      <div class="meta" id="rwMeta"></div>`;
  }
  $('#rwLabel').textContent = label;
  $('#rwCount').textContent = p.total ? `${p.done} de ${p.total}` : 'Sin hábitos';
  $('#rwMeta').textContent = !p.total ? 'Agrega tu primer hábito con +'
    : p.done === p.total ? '¡Despegue! Día completo ✦' : `Te falta${p.total - p.done === 1 ? '' : 'n'} ${p.total - p.done} para despegar`;
  const jet = $('#rwJet');
  jet.style.left = `calc(${(p.pct * 100).toFixed(1)}% * .82)`;
  jet.classList.toggle('flying', p.total > 0 && p.done === p.total);
  if (animate) replay($('#hero'), 'bump');
}

function week7(id) {
  const today = todayISO();
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
    .map((d) => `<i class="${isDone(id, d) ? 'on' : ''} ${d === ui.day ? 'cur' : ''}"></i>`).join('');
}

function renderHabits() {
  $('#listTitle').textContent = ui.day === todayISO() ? 'Hoy' : dayLabel(ui.day);
  const hs = store.data.habits;
  if (!hs.length) {
    $('#habits').innerHTML = `<div class="empty">${icon('mod_habitos')}<b>Sin hábitos</b>Toca + para crear el primero.</div>`;
    return;
  }
  $('#habits').innerHTML = hs.map((h, i) => {
    const done = isDone(h.id, ui.day);
    const s = streak(h.id);
    return `
      <div class="habit ${done ? 'done' : ''}" data-id="${esc(h.id)}" style="--i:${i}">
        <button type="button" class="habit-main" data-edit>
          <span class="bubble">${icon(h.icon)}</span>
          <span class="main">
            <div class="t">${esc(h.name)}</div>
            <div class="s">${s ? `✦ ${s} día${s === 1 ? '' : 's'} seguido${s === 1 ? '' : 's'}` : 'Empieza tu racha'}</div>
            <div class="dots">${week7(h.id)}</div>
          </span>
        </button>
        <button type="button" class="check-btn" data-toggle aria-pressed="${done}" aria-label="${done ? 'Desmarcar' : 'Marcar'} ${esc(h.name)}">
          <svg viewBox="0 0 24 24"><path d="M5.5 12.5l4.2 4.2 8.8-9.4"/></svg>
        </button>
      </div>`;
  }).join('');
}

function render(animate = false) { renderWeek(); renderHero(animate); renderHabits(); }

function toggle(id, btn) {
  const set = doneOn(ui.day);
  const was = set.has(id);
  const before = progress(ui.day);
  if (was) set.delete(id); else set.add(id);
  store.data.log[ui.day] = Array.from(set);
  if (!store.data.log[ui.day].length) delete store.data.log[ui.day];
  store.save();
  render(true);
  const after = progress(ui.day);
  if (!was) {
    const nb = $(`.habit[data-id="${CSS.escape(id)}"] .check-btn`);
    replay(nb, 'just');
    burstFrom(nb || btn, { count: 12, spread: 70, size: [8, 14] });
    if (after.total && after.done === after.total && before.done !== before.total) {
      setTimeout(() => {
        celebrate('mod_habitos', '¡Día completo!', 'Todos tus hábitos ✦', true);
        takeoff($('#rwJet'), { duration: 2000 });
      }, 250);
    }
  }
}

function habitSheet(id) {
  const h = id ? store.data.habits.find((x) => x.id === id) : null;
  const st = { icon: h?.icon || 'agua' };
  const sheet = openSheet(`
    <h3>${h ? 'Editar hábito' : 'Nuevo hábito'}</h3>
    <div class="field"><label class="label" for="hName">Nombre</label><input id="hName" value="${esc(h?.name || '')}" placeholder="Ej. Tomar vitaminas" autocomplete="off"></div>
    <div class="field"><div class="label">Ícono</div><div class="icon-pick" id="hIcons"></div></div>
    <button type="button" class="btn primary" id="saveHab">${h ? 'Guardar cambios' : 'Crear hábito'}</button>
    ${h ? '<button type="button" class="btn danger" id="delHab">Eliminar hábito</button>' : ''}`);
  const paint = () => {
    $('#hIcons', sheet).innerHTML = HABIT_ICONS.map((n) =>
      `<button type="button" data-ic="${n}" aria-pressed="${st.icon === n}" aria-label="${n}">${icon(n)}</button>`).join('');
  };
  paint();
  if (!h) setTimeout(() => $('#hName', sheet)?.focus(), 300);
  sheet.addEventListener('click', (e) => {
    const ic = e.target.closest('[data-ic]');
    if (ic) { st.icon = ic.dataset.ic; paint(); replay($(`[data-ic="${st.icon}"]`, sheet), 'just'); return; }
    if (e.target.closest('#saveHab')) {
      const name = $('#hName', sheet).value.trim();
      if (!name) { toast('Escribe un nombre'); return; }
      if (h) Object.assign(h, { name, icon: st.icon });
      else store.data.habits.push({ id: uid(), name, icon: st.icon });
      store.save(); closeSheet(); render(true);
      if (!h) celebrate(st.icon, '¡Hábito nuevo!', name);
      return;
    }
    if (e.target.closest('#delHab') && confirm(`¿Eliminar "${h.name}" y su historial?`)) {
      store.data.habits = store.data.habits.filter((x) => x.id !== h.id);
      for (const d of Object.keys(store.data.log)) {
        store.data.log[d] = store.data.log[d].filter((x) => x !== h.id);
        if (!store.data.log[d].length) delete store.data.log[d];
      }
      store.save(); closeSheet(); render(true);
    }
  });
}

function bind() {
  $('#add').addEventListener('click', () => habitSheet(null));
  $('#week').addEventListener('click', (e) => {
    const b = e.target.closest('[data-day]');
    if (!b) return;
    ui.day = b.dataset.day;
    render(true);
  });
  $('#habits').addEventListener('click', (e) => {
    const row = e.target.closest('.habit');
    if (!row) return;
    if (e.target.closest('[data-toggle]')) toggle(row.dataset.id, e.target.closest('[data-toggle]'));
    else if (e.target.closest('[data-edit]')) habitSheet(row.dataset.id);
  });
}

if (!localStorage.getItem('habitos.v1')) store.save();
bind();
render();
initPage();
