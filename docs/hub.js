'use strict';

/* Pantalla de inicio de "Mi cielo": pase de abordar del día y accesos a cada sección. */

const MOODS = {
  radiante: 'Radiante', feliz: 'Feliz', calma: 'En calma', sueno: 'Con sueño', triste: 'Triste', estres: 'Estrés',
};

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch (e) { return null; }
}

function stats() {
  const today = todayISO();
  const ym = monthOf(today);
  const out = {};

  const fin = read('finanzas.v1');
  const personal = (m) => (m.type === 'gasto' || m.type === 'debo') ? m.amount
    : m.type === 'prestado' ? Math.max(0, m.amount - (m.owed ?? m.amount)) : 0;
  const movs = fin?.movements || [];
  out.monthSpent = movs.filter((m) => monthOf(m.date) === ym).reduce((s, m) => s + personal(m), 0);
  out.todaySpent = movs.filter((m) => m.date === today).reduce((s, m) => s + personal(m), 0);

  const ideas = read('ideas.v1')?.notes || [];
  out.ideasOpen = ideas.filter((n) => !n.done).length;

  const gatos = read('gatos.v1') || {};
  out.cats = gatos.cats || [];
  const upcoming = (gatos.health || []).filter((h) => h.next).sort((a, b) => a.next.localeCompare(b.next));
  out.nextCare = upcoming.find((h) => daysBetween(today, h.next) >= -30);

  const hab = read('habitos.v1');
  const habits = hab?.habits || [];
  const doneToday = (hab?.log?.[today] || []).filter((id) => habits.some((h) => h.id === id));
  out.habitsTotal = habits.length;
  out.habitsDone = doneToday.length;

  out.mood = read('diario.v1')?.entries?.[today]?.mood || null;

  const nights = read('sueno.v1')?.nights || {};
  const lastKey = Object.keys(nights).sort().pop();
  out.sleep = lastKey && daysBetween(lastKey, today) <= 1 ? nights[lastKey] : null;
  return out;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function renderHero(s) {
  const now = new Date();
  const flightNo = `MC${pad(now.getDate())}${pad(now.getMonth() + 1)}`;
  const day = now.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '').toUpperCase();
  const stars = [12, 34, 58, 80].map((x, i) => `<span class="float-star" style="--x:${x}%;--d:${(i * 0.8).toFixed(1)}s"></span>`).join('');
  $('#hero').innerHTML = `
    <span class="shine"></span>${stars}
    <div class="bp-top"><span>PASE DE ABORDAR</span><span>VUELO ${flightNo}</span></div>
    <div class="bp-route">
      <div><small>DESDE</small><b>Hoy</b></div>
      <span class="bp-plane">${icon('avion')}</span>
      <div class="to"><small>HACIA</small><b>Un gran día</b></div>
    </div>
    <div class="bp-fields">
      <div><small>FECHA</small><b>${esc(day)}</b></div>
      <div><small>HÁBITOS</small><b>${s.habitsTotal ? `${s.habitsDone}/${s.habitsTotal}` : '—'}</b></div>
      <div><small>ÁNIMO</small><b>${s.mood ? icon(`mood_${s.mood}`, 'mini') : '—'}</b></div>
      <div><small>GASTO HOY</small><b>${fmt(s.todaySpent)}</b></div>
    </div>
    <div class="bp-barcode" aria-hidden="true"></div>`;
}

function renderTiles(s) {
  const care = s.nextCare;
  let gatosSub = s.cats.length ? `${s.cats.length} gatit${s.cats.length === 1 ? 'o' : 'os'}` : 'Agrega a tu gatito';
  if (care) {
    const cat = s.cats.find((c) => c.id === care.catId);
    const d = daysBetween(todayISO(), care.next);
    gatosSub = `${cat ? cat.name + ': ' : ''}${d < 0 ? 'cuidado pendiente' : d === 0 ? 'cuidado hoy' : `cuidado en ${d} día${d === 1 ? '' : 's'}`}`;
  }
  const tiles = [
    { href: 'finanzas/', icon: 'mod_finanzas', name: 'Finanzas', sub: `${fmt(s.monthSpent)} este mes` },
    { href: 'ideas/', icon: 'mod_ideas', name: 'Ideas', sub: s.ideasOpen ? `${s.ideasOpen} idea${s.ideasOpen === 1 ? '' : 's'} en el tablero` : 'Tu tablero de notas' },
    { href: 'gatos/', icon: 'mod_gatos', name: 'Gatos', sub: gatosSub },
    { href: 'habitos/', icon: 'mod_habitos', name: 'Hábitos', sub: s.habitsTotal ? `Hoy: ${s.habitsDone} de ${s.habitsTotal}` : 'Crea tus hábitos' },
    { href: 'diario/', icon: 'mod_diario', name: 'Diario', sub: s.mood ? `Hoy: ${MOODS[s.mood]}` : '¿Cómo está tu cielo hoy?' },
    { href: 'sueno/', icon: 'mod_sueno', name: 'Sueño', sub: s.sleep ? `Anoche: ${Math.floor(s.sleep.minutes / 60)} h ${Math.round(s.sleep.minutes % 60)} min` : '¿Cómo dormiste?' },
    { href: 'ajustes/', icon: 'tab_ajustes', name: 'Ajustes', sub: 'Tema, foto y respaldo', wide: true },
  ];
  $('#tiles').innerHTML = tiles.map((t, i) => `
    <a class="tile ${t.wide ? 'wide' : ''}" href="${t.href}" data-nav style="--i:${i}">
      <span class="tile-ic">${icon(t.icon)}</span>
      <b>${esc(t.name)}</b>
      <small>${esc(t.sub)}</small>
    </a>`).join('');
}

function init() {
  $('#title').textContent = `${greeting()} ✦`;
  const s = stats();
  renderHero(s);
  renderTiles(s);
  initPage({ land: '#hero' });
}

init();
