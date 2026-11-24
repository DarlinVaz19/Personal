'use strict';

/* Fechas importantes: cumpleaños, aniversarios y eventos con cuenta regresiva.
   Los cumpleaños se conectan con Regalos de la lista de compras. */

const store = createStore('fechas.v1', () => ({ events: [] }));

const KINDS = {
  cumple: { name: 'Cumpleaños', icon: 'pastel' },
  aniversario: { name: 'Aniversario', icon: 'aniversario' },
  evento: { name: 'Evento', icon: 'evento' },
  gato: { name: 'De mis gatos', icon: 'huella' },
  otro: { name: 'Otro', icon: 'mod_fechas' },
};
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const ui = { filter: 'todas' };

// Próxima vez que ocurre (si se repite cada año) y cuántos días faltan.
function nextOf(ev, today = todayISO()) {
  if (!ev.yearly) return { date: ev.date, days: daysBetween(today, ev.date), turns: null };
  const [, m, d] = ev.date.split('-').map(Number);
  const ty = Number(today.slice(0, 4));
  let y = ty;
  let cand = `${y}-${pad(m)}-${pad(d)}`;
  if (cand < today) { y++; cand = `${y}-${pad(m)}-${pad(d)}`; }
  const turns = ev.knowYear ? y - Number(ev.date.slice(0, 4)) : null;
  return { date: cand, days: daysBetween(today, cand), turns };
}

function countdown(days) {
  if (days === 0) return '¡Hoy!';
  if (days === 1) return 'Mañana';
  if (days < 0) return `Hace ${-days} día${days === -1 ? '' : 's'}`;
  if (days < 7) return `En ${days} días`;
  if (days < 60) return `En ${days} días`;
  return `En ${Math.round(days / 30.4)} meses`;
}

function turnsText(ev, n) {
  if (n.turns == null || n.turns <= 0) return '';
  if (ev.kind === 'cumple' || ev.kind === 'gato') return `cumple ${n.turns}`;
  if (ev.kind === 'aniversario') return `${n.turns} año${n.turns === 1 ? '' : 's'}`;
  return '';
}

function sorted() {
  return store.data.events.map((e) => ({ e, n: nextOf(e) }))
    .filter(({ n }) => n.days >= -1)
    .sort((a, b) => a.n.days - b.n.days);
}

function renderHero() {
  const list = sorted();
  const hero = $('#hero');
  if (!list.length) {
    hero.innerHTML = `<span class="moon">${icon('mod_fechas')}</span><div class="k">Fechas importantes</div><div class="v">Sin fechas aún</div>
      <div class="meta"><span>Agrega cumpleaños y eventos con +</span></div>`;
    return;
  }
  const { e, n } = list[0];
  const t = turnsText(e, n);
  hero.innerHTML = `
    <span class="shine"></span>
    <span class="moon">${icon(KINDS[e.kind]?.icon || 'mod_fechas')}</span>
    <div class="k">Lo que sigue</div>
    <div class="v">${esc(e.name)}</div>
    <div class="meta"><span>${esc(dateOf(n.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }))}</span>${t ? `<span>${esc(t)}</span>` : ''}</div>
    <div class="big-count"><b>${n.days <= 0 ? '¡Hoy!' : n.days}</b>${n.days > 0 ? `<small>día${n.days === 1 ? '' : 's'}</small>` : ''}</div>`;
  if (n.days === 0 && !reduceMotion.matches) setTimeout(() => burstFrom(hero, { count: 24, spread: 150 }), 400);
}

function renderFilters() {
  const used = Object.keys(KINDS).filter((k) => store.data.events.some((e) => e.kind === k));
  $('#filters').innerHTML = used.length > 1 ? [['todas', 'Todas'], ...used.map((k) => [k, KINDS[k].name])]
    .map(([id, n]) => `<button type="button" class="chip" data-filter="${id}" aria-pressed="${ui.filter === id}">${esc(n)}</button>`).join('') : '';
}

function renderList() {
  const list = sorted().filter(({ e }) => ui.filter === 'todas' || e.kind === ui.filter);
  if (!store.data.events.length) {
    $('#list').innerHTML = `<div class="empty">${icon('pastel')}<b>Nunca olvides un cumpleaños</b>Toca + para agregar cumpleaños, aniversarios o eventos.</div>`;
    return;
  }
  // Agrupa por mes de la próxima vez.
  const groups = new Map();
  for (const x of list) {
    const k = x.n.date.slice(0, 7);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  }
  let i = 0;
  $('#list').innerHTML = Array.from(groups.entries()).map(([ym, items]) => `
    <div class="day">${esc(monthLabel(ym))}</div>
    <div class="dates">${items.map(({ e, n }) => {
      const t = turnsText(e, n);
      const soon = n.days <= 7;
      return `<button type="button" class="date-card ${soon ? 'soon' : ''} ${n.days <= 0 ? 'today' : ''}" data-id="${esc(e.id)}" style="--i:${i++}">
        <span class="cal-chip"><small>${esc(MONTHS[Number(n.date.slice(5, 7)) - 1].slice(0, 3).toUpperCase())}</small><b>${Number(n.date.slice(8, 10))}</b></span>
        <span class="main"><span class="t">${icon(KINDS[e.kind]?.icon || 'mod_fechas', 'mini')} ${esc(e.name)}</span>
          <span class="s">${esc([KINDS[e.kind]?.name, t, e.note].filter(Boolean).join(' · '))}</span></span>
        <span class="cd">${esc(countdown(n.days))}</span>
      </button>`;
    }).join('')}</div>`).join('');
}

function render() { renderHero(); renderFilters(); renderList(); }

function addGift(ev) {
  let data;
  try { data = JSON.parse(localStorage.getItem('compras.v1')) || { items: [], lastCat: 'super' }; } catch (e) { data = { items: [], lastCat: 'super' }; }
  const who = ev.person || ev.name.replace(/^cumple(años)?\s+(de\s+)?/i, '');
  if (data.items.some((i) => !i.done && i.cat === 'regalos' && (i.forWho || '').toLowerCase() === who.toLowerCase())) {
    toast(`Ya tienes un regalo para ${who} en tu lista`);
    return;
  }
  data.items.push({ id: uid(), name: ev.gift || `Regalo para ${who}`, qty: 1, cat: 'regalos', price: null, forWho: who, store: '', note: ev.name, done: false, createdAt: Date.now() });
  localStorage.setItem('compras.v1', JSON.stringify(data));
  celebrate('regalo', 'Agregado a tu lista', `Regalos · para ${who}`);
}

function eventSheet(id) {
  const ev = id ? store.data.events.find((x) => x.id === id) : null;
  const st = { kind: ev?.kind || 'cumple', yearly: ev ? ev.yearly : true, knowYear: ev ? ev.knowYear : false };
  const [y0, m0, d0] = (ev?.date || todayISO()).split('-').map(Number);
  const sheet = openSheet(`
    <h3>${ev ? 'Editar fecha' : 'Nueva fecha'}</h3>
    <div class="field"><div class="label">Tipo</div><div class="chips" id="eKinds"></div></div>
    <div class="field"><label class="label" for="eName">Nombre</label><input id="eName" value="${esc(ev?.name || '')}" placeholder="Ej. Cumple de Ana, Aniversario, Concierto" autocomplete="off"></div>
    <div class="field" id="personWrap"><label class="label" for="ePerson">¿De quién?</label><input id="ePerson" value="${esc(ev?.person || '')}" placeholder="Ej. Ana" autocomplete="off"></div>
    <div class="two">
      <div class="field"><label class="label" for="eDay">Día</label><select id="eDay">${Array.from({ length: 31 }, (_, i) => `<option ${i + 1 === d0 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
      <div class="field"><label class="label" for="eMonth">Mes</label><select id="eMonth">${MONTHS.map((m, i) => `<option value="${i + 1}" ${i + 1 === m0 ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
    </div>
    <label class="check"><input type="checkbox" id="eYearly" ${st.yearly ? 'checked' : ''}> Se repite cada año</label>
    <label class="check"><input type="checkbox" id="eKnow" ${st.knowYear || !st.yearly ? 'checked' : ''}> Sé el año</label>
    <div class="field" id="yearWrap"><label class="label" for="eYear">Año</label><input id="eYear" inputmode="numeric" value="${ev ? y0 : ''}" placeholder="Ej. 1996"></div>
    <div class="field"><label class="label" for="eGift">Idea de regalo (opcional)</label><input id="eGift" value="${esc(ev?.gift || '')}" placeholder="Ej. libro de cocina" autocomplete="off"></div>
    <div class="field"><label class="label" for="eNote">Nota</label><input id="eNote" value="${esc(ev?.note || '')}" placeholder="Ej. le gustan los girasoles" autocomplete="off"></div>
    <button type="button" class="btn primary" id="saveE">${ev ? 'Guardar cambios' : 'Guardar fecha'}</button>
    ${ev && ['cumple', 'aniversario'].includes(ev.kind) ? `<button type="button" class="btn" id="giftE">${icon('regalo', 'mini')} Agregar regalo a mi lista de compras</button>` : ''}
    ${ev ? '<button type="button" class="btn danger" id="delE">Eliminar</button>' : ''}`);
  const paint = () => {
    $('#eKinds', sheet).innerHTML = Object.entries(KINDS).map(([k, v]) =>
      `<button type="button" class="chip" data-kind="${k}" aria-pressed="${st.kind === k}">${icon(v.icon)}${v.name}</button>`).join('');
    $('#personWrap', sheet).hidden = !['cumple', 'aniversario'].includes(st.kind);
    const yearly = $('#eYearly', sheet).checked;
    $('#yearWrap', sheet).hidden = yearly && !$('#eKnow', sheet).checked;
    $('#eKnow', sheet).closest('label').hidden = !yearly;
  };
  paint();
  sheet.addEventListener('change', paint);
  sheet.addEventListener('click', (e) => {
    const k = e.target.closest('[data-kind]');
    if (k) { st.kind = k.dataset.kind; paint(); replay(k, 'just'); return; }
    if (e.target.closest('#saveE')) {
      const name = $('#eName', sheet).value.trim();
      if (!name) { toast('Escribe un nombre'); return; }
      const yearly = $('#eYearly', sheet).checked;
      const knowYear = !yearly || $('#eKnow', sheet).checked;
      let year = parseInt($('#eYear', sheet).value, 10);
      if (!knowYear || !year) year = Number(todayISO().slice(0, 4));
      if (!yearly && !$('#eYear', sheet).value) year = Number(todayISO().slice(0, 4));
      const m = Number($('#eMonth', sheet).value), d = Number($('#eDay', sheet).value);
      const maxD = new Date(year, m, 0).getDate();
      const data = {
        kind: st.kind, name, person: $('#ePerson', sheet).value.trim(), yearly, knowYear: knowYear && !!parseInt($('#eYear', sheet).value, 10),
        date: `${year}-${pad(m)}-${pad(Math.min(d, maxD))}`, gift: $('#eGift', sheet).value.trim(), note: $('#eNote', sheet).value.trim(),
      };
      if (ev) Object.assign(ev, data); else store.data.events.push({ id: uid(), createdAt: Date.now(), ...data });
      store.save(); closeSheet(); render();
      const n = nextOf(data);
      celebrate(KINDS[st.kind].icon, ev ? 'Fecha actualizada' : '¡Fecha guardada!', countdown(n.days));
      return;
    }
    if (e.target.closest('#giftE')) { addGift(ev); return; }
    if (e.target.closest('#delE') && confirm(`¿Eliminar "${ev.name}"?`)) {
      store.data.events = store.data.events.filter((x) => x.id !== ev.id);
      store.save(); closeSheet(); render();
    }
  });
}

function bind() {
  $('#add').addEventListener('click', () => eventSheet(null));
  $('#filters').addEventListener('click', (e) => {
    const f = e.target.closest('[data-filter]');
    if (f) { ui.filter = f.dataset.filter; render(); }
  });
  $('#list').addEventListener('click', (e) => {
    const c = e.target.closest('[data-id]');
    if (c) eventSheet(c.dataset.id);
  });
}

// Fechas de nacimiento de los gatos: se agregan solas una vez.
(function syncCats() {
  let gatos;
  try { gatos = JSON.parse(localStorage.getItem('gatos.v1')); } catch (e) { gatos = null; }
  let changed = false;
  for (const c of gatos?.cats || []) {
    if (!c.birth || store.data.events.some((e) => e.catId === c.id)) continue;
    store.data.events.push({ id: uid(), createdAt: Date.now(), catId: c.id, kind: 'gato', name: `Cumple de ${c.name}`, person: c.name, yearly: true, knowYear: true, date: c.birth, gift: '', note: '' });
    changed = true;
  }
  if (changed) store.save();
})();

bind();
render();
initPage();
