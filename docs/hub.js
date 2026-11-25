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
  out.shopping = (read('compras.v1')?.items || []).filter((i) => !i.done).length;

  const nights = read('sueno.v1')?.nights || {};
  const lastKey = Object.keys(nights).sort().pop();
  out.sleep = lastKey && daysBetween(lastKey, today) <= 1 ? nights[lastKey] : null;
  // Próxima fecha importante (para el mosaico)
  const evs = (read('fechas.v1')?.events || []).map((e) => ({ e, d: daysBetween(today, nextOccurrence(e, today)) })).filter((x) => x.d >= 0).sort((a, b) => a.d - b.d);
  out.nextDate = evs[0] ? { name: evs[0].e.name, when: evs[0].d === 0 ? 'hoy' : evs[0].d === 1 ? 'mañana' : `en ${evs[0].d} días` } : null;
  return out;
}


/* ---------------- "Hoy": lo pendiente del día ---------------- */

function nextOccurrence(ev, today) {
  if (!ev.yearly) return ev.date;
  const md = ev.date.slice(5);
  let d = `${today.slice(0, 4)}-${md}`;
  if (d < today) d = `${Number(today.slice(0, 4)) + 1}-${md}`;
  return d;
}

function todayRows(s) {
  const today = todayISO();
  const rows = [];
  const when = (n) => (n < 0 ? `hace ${-n} día${n === -1 ? '' : 's'}` : n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`);

  // Fechas importantes en las próximas 2 semanas
  for (const ev of read('fechas.v1')?.events || []) {
    const d = daysBetween(today, nextOccurrence(ev, today));
    if (d < 0 || d > 14) continue;
    const ic = ev.kind === 'cumple' ? 'pastel' : ev.kind === 'aniversario' ? 'aniversario' : ev.kind === 'gato' ? 'huella' : ev.kind === 'tablero' ? 'mod_ideas' : 'evento';
    rows.push({ d, href: 'fechas/', icon: ic, text: ev.name, sub: d === 0 ? '¡Es hoy! ✦' : when(d), hot: d <= 2 });
  }

  // Cuidados de los gatos (próximos 7 días o vencidos)
  const g = read('gatos.v1') || {};
  for (const h of g.health || []) {
    if (!h.next) continue;
    const d = daysBetween(today, h.next);
    if (d > 7 || d < -60) continue;
    const cat = (g.cats || []).find((c) => c.id === h.catId);
    if (!cat) continue;
    rows.push({ d, href: 'gatos/', icon: 'vacuna', text: `${cat.name}: ${h.title || 'cuidado'}`, sub: d < 0 ? `venció ${when(d)}` : when(d), hot: d <= 1 });
  }

  // Hábitos de hoy
  if (s.habitsTotal) {
    const done = s.habitsDone >= s.habitsTotal;
    rows.push({ d: 50, href: 'habitos/', icon: 'mod_habitos', text: done ? '¡Hábitos completos!' : `Hábitos: ${s.habitsDone} de ${s.habitsTotal}`, sub: done ? 'Día completo ✦' : `te falta${s.habitsTotal - s.habitsDone === 1 ? '' : 'n'} ${s.habitsTotal - s.habitsDone}`, ok: done });
  }

  // Mi día y sueño
  if (!s.mood) rows.push({ d: 51, href: 'diario/', icon: 'mod_diario', text: '¿Cómo está tu cielo hoy?', sub: 'Registra tu día' });
  const nights = read('sueno.v1')?.nights || {};
  if (!nights[today] && new Date().getHours() >= 6) rows.push({ d: 52, href: 'sueno/', icon: 'mod_sueno', text: 'Tu sueño de anoche', sub: 'Impórtalo del Apple Watch' });

  // Lista de compras
  const shop = (read('compras.v1')?.items || []).filter((i) => !i.done);
  if (shop.length) {
    const names = shop.slice(0, 2).map((i) => i.name).join(', ');
    rows.push({ d: 53, href: 'compras/', icon: 'mod_compras', text: `${shop.length} por comprar`, sub: names + (shop.length > 2 ? ` y ${shop.length - 2} más` : '') });
  }

  // Deudas abiertas
  const fin = read('finanzas.v1');
  if (fin?.movements?.length) {
    const bal = {};
    const delta = { prestado: (m) => m.owed ?? m.amount, pago: (m) => m.amount, preste: (m) => m.amount, debo: (m) => -m.amount, cobro: (m) => -m.amount, meprestaron: (m) => -m.amount };
    for (const m of fin.movements) if (m.person && delta[m.type]) { const k = m.person.trim().toLowerCase(); bal[k] = (bal[k] || 0) + delta[m.type](m); }
    // Una línea por persona (máximo 4), para saber cuánto con quién.
    const names = {};
    for (const m of fin.movements) if (m.person && !names[m.person.trim().toLowerCase()]) names[m.person.trim().toLowerCase()] = m.person.trim();
    const open = Object.entries(bal).filter(([, v]) => Math.abs(v) > 0.004).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    open.slice(0, 4).forEach(([k, v], i) => rows.push({
      d: 54 + i / 10, href: 'finanzas/', icon: 'tab_deudas',
      text: v > 0 ? `${names[k]} te debe ${fmt(v)}` : `Le debes ${fmt(-v)} a ${names[k]}`,
      sub: v > 0 ? 'Toca para ver el detalle o mandarle su pase' : 'Toca para ver el detalle',
    }));
    if (open.length > 4) rows.push({ d: 54.9, href: 'finanzas/', icon: 'tab_deudas', text: `Y ${open.length - 4} persona${open.length - 4 === 1 ? '' : 's'} más`, sub: 'Ver todas tus deudas' });
  }

  // Resumen del mes: los últimos 3 días del mes y los primeros 5 del siguiente
  const day = Number(today.slice(8, 10));
  const last = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
  if (day >= last - 2 || day <= 5) {
    const ym = day <= 5 ? shiftMonth(monthOf(today), -1) : monthOf(today);
    rows.push({ d: -1, href: `resumen/?m=${ym}`, icon: 'trofeo', text: `Tu resumen de ${monthLabel(ym).split(' ')[0]}`, sub: 'Ya está listo ✦', hot: true });
  }
  return rows.sort((a, b) => a.d - b.d);
}

function renderToday(s) {
  const rows = todayRows(s);
  $('#today').innerHTML = rows.length ? `
    <h2>Hoy</h2>
    <div class="today">${rows.map((r, i) => `
      <a class="today-row ${r.hot ? 'hot' : ''} ${r.ok ? 'ok' : ''}" href="${r.href}" data-nav style="--i:${i}">
        <span class="bubble">${icon(r.icon)}</span>
        <span class="main"><span class="t">${esc(r.text)}</span><span class="s">${esc(r.sub)}</span></span>
        <span class="chev">›</span>
      </a>`).join('')}</div>` : '';
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
    { href: 'ideas/', icon: 'mod_ideas', name: 'Vision board', sub: s.ideasOpen ? `${s.ideasOpen} nota${s.ideasOpen === 1 ? '' : 's'} en tu tablero` : 'Tus sueños y metas' },
    { href: 'gatos/', icon: 'mod_gatos', name: 'Gatos', sub: gatosSub },
    { href: 'habitos/', icon: 'mod_habitos', name: 'Hábitos', sub: s.habitsTotal ? `Hoy: ${s.habitsDone} de ${s.habitsTotal}` : 'Crea tus hábitos' },
    { href: 'diario/', icon: 'mod_diario', name: 'Mi día', sub: s.mood ? `Hoy: ${MOODS[s.mood]}` : '¿Cómo está tu cielo hoy?' },
    { href: 'compras/', icon: 'mod_compras', name: 'Compras', sub: s.shopping ? `${s.shopping} por comprar` : 'Tu lista de compras' },
    { href: 'fechas/', icon: 'mod_fechas', name: 'Countdown', sub: s.nextDate ? `${s.nextDate.name} · ${s.nextDate.when}` : 'Cumpleaños y eventos' },
    { href: 'sueno/', icon: 'mod_sueno', name: 'Sueño', sub: s.sleep ? `Anoche: ${Math.floor(s.sleep.minutes / 60)} h ${Math.round(s.sleep.minutes % 60)} min` : '¿Cómo dormiste?' },
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
  renderToday(s);
  renderTiles(s);
  initPage({ land: '#hero' });
}

init();
