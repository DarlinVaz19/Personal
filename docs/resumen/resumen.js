'use strict';

/* Resumen de tu mes: tarjetas para deslizar con lo más importante de cada sección. */

const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } };

const params = new URLSearchParams(location.search);
const ui = { month: /^\d{4}-\d{2}$/.test(params.get('m') || '') ? params.get('m') : monthOf(todayISO()) };

const MOOD = {
  radiante: { name: 'Radiante', score: 5, adj: 'radiante' }, feliz: { name: 'Feliz', score: 4, adj: 'feliz' },
  calma: { name: 'En calma', score: 4, adj: 'tranquilo' }, sueno: { name: 'Con sueño', score: 3, adj: 'de mucho sueño' },
  triste: { name: 'Triste', score: 2, adj: 'nublado' }, estres: { name: 'Estrés', score: 1, adj: 'tormentoso' },
};
const EMO = { alegria: 'Alegría', calma: 'Calma', gratitud: 'Gratitud', amor: 'Amor', motivacion: 'Motivación', orgullo: 'Orgullo', esperanza: 'Esperanza', nostalgia: 'Nostalgia', cansancio: 'Cansancio', ansiedad: 'Ansiedad', tristeza: 'Tristeza', enojo: 'Enojo', frustracion: 'Frustración', soledad: 'Soledad' };
const ACT = { trabajo: ['Trabajo', 'trabajo'], estudiar: ['Estudiar', 'estudiar'], ejercicio: ['Ejercicio', 'ejercicio'], caminar: ['Caminar', 'caminar'], leer: ['Leer', 'leer'], cocinar: ['Cocinar', 'cocinar'], gatos: ['Gatos', 'huella'], amigos: ['Amigos', 'tab_deudas'], familia: ['Familia', 'casa'], pareja: ['Pareja', 'salud'], series: ['Series', 'entretenimiento'], musica: ['Música', 'musica'], compras: ['Compras', 'compras'], viajar: ['Viajar', 'avion'], naturaleza: ['Naturaleza', 'plantas'], meditar: ['Meditar', 'meditar'], cuidarme: ['Cuidarme', 'skincare'], descanso: ['Descansar', 'mood_calma'] };
const FIN_CAT = { comida: 'Comida', super: 'Súper', transporte: 'Transporte', casa: 'Casa', servicios: 'Servicios', salud: 'Salud', entretenimiento: 'Entretenimiento', compras: 'Compras', suscripciones: 'Suscripciones', viajes: 'Viajes', mascotas: 'Mascotas', otros: 'Otros' };

const inMonth = (iso, ym = ui.month) => iso && iso.slice(0, 7) === ym;
const ranked = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);
const count = (arr) => arr.reduce((o, k) => { o[k] = (o[k] || 0) + 1; return o; }, {});
const hm = (min) => `${Math.floor(min / 60)} h ${Math.round(min % 60)} min`;
const monthName = (ym) => monthLabel(ym).split(' ')[0];

/* ---------------- Datos del mes ---------------- */

function personal(m) {
  if (m.type === 'gasto' || m.type === 'debo') return m.amount;
  if (m.type === 'prestado') return Math.max(0, m.amount - (m.owed ?? m.amount));
  return 0;
}

function finance(ym) {
  const f = read('finanzas.v1');
  if (!f?.movements) return null;
  const ms = f.movements.filter((m) => inMonth(m.date, ym));
  if (!ms.length) return null;
  const spent = ms.reduce((a, m) => a + personal(m), 0);
  const prev = f.movements.filter((m) => inMonth(m.date, shiftMonth(ym, -1))).reduce((a, m) => a + personal(m), 0);
  const income = ms.filter((m) => m.type === 'ingreso').reduce((a, m) => a + m.amount, 0);
  const cats = {};
  for (const m of ms) { const v = personal(m); if (v > 0) cats[m.category || 'otros'] = (cats[m.category || 'otros'] || 0) + v; }
  const cards = count(ms.filter((m) => m.cardId).map((m) => m.cardId));
  const fav = ranked(cards)[0];
  return {
    spent, prev, income, n: ms.length, topCat: ranked(cats)[0] || null,
    favCard: fav ? (f.cards.find((c) => c.id === fav[0])?.name || null) : null,
  };
}

function mood(ym) {
  const d = read('diario.v1');
  const es = Object.entries(d?.entries || {}).filter(([k]) => inMonth(k, ym));
  if (!es.length) return null;
  const moods = ranked(count(es.map(([, e]) => e.mood).filter(Boolean)));
  const emos = ranked(count(es.flatMap(([, e]) => e.emotions || []))).slice(0, 3);
  const withMood = es.filter(([, e]) => e.mood);
  const avg = withMood.length ? withMood.reduce((a, [, e]) => a + MOOD[e.mood].score, 0) / withMood.length : 0;
  let goodAct = null;
  for (const id of Object.keys(ACT)) {
    const days = withMood.filter(([, e]) => (e.activities || []).includes(id));
    if (days.length < 2) continue;
    const m = days.reduce((a, [, e]) => a + MOOD[e.mood].score, 0) / days.length;
    if (m - avg > 0.15 && (!goodAct || m > goodAct.m)) goodAct = { id, m };
  }
  const acts = ranked(count(es.flatMap(([, e]) => e.activities || [])));
  const bests = es.map(([k, e]) => [k, e.best]).filter(([, b]) => b);
  const best = bests.length ? bests[Math.floor(dateOf(ym + '-01').getTime() / 86400000) % bests.length] : null;
  return { days: es.length, mood: moods[0]?.[0] || null, emos, goodAct, topAct: acts[0]?.[0] || null, best };
}

function sleep(ym) {
  const s = read('sueno.v1');
  const ns = Object.entries(s?.nights || {}).filter(([k]) => inMonth(k, ym));
  if (!ns.length) return null;
  const avg = ns.reduce((a, [, n]) => a + n.minutes, 0) / ns.length;
  const best = ns.slice().sort((a, b) => b[1].minutes - a[1].minutes)[0];
  const goal = s.goal || 480;
  const met = ns.filter(([, n]) => n.minutes >= goal).length;
  return { n: ns.length, avg, best, met, goal };
}

function habits(ym) {
  const h = read('habitos.v1');
  if (!h?.habits?.length) return null;
  const days = Object.entries(h.log || {}).filter(([k]) => inMonth(k, ym));
  if (!days.length) return null;
  const ids = new Set(h.habits.map((x) => x.id));
  const full = days.filter(([, l]) => h.habits.every((x) => l.includes(x.id))).length;
  const per = ranked(count(days.flatMap(([, l]) => l.filter((x) => ids.has(x)))));
  const star = per[0] ? h.habits.find((x) => x.id === per[0][0]) : null;
  // Mejor racha de días completos en el mes.
  const [y, m] = ym.split('-').map(Number);
  let run = 0, bestRun = 0;
  for (let d = 1; d <= new Date(y, m, 0).getDate(); d++) {
    const l = h.log[`${ym}-${pad(d)}`] || [];
    if (h.habits.every((x) => l.includes(x.id))) { run++; bestRun = Math.max(bestRun, run); } else run = 0;
  }
  return { active: days.length, full, star, starCount: per[0]?.[1] || 0, bestRun };
}

function others(ym) {
  const ideas = read('ideas.v1')?.notes || [];
  const startT = dateOf(ym + '-01').getTime(), endT = dateOf(shiftMonth(ym, 1) + '-01').getTime();
  const inT = (t) => t >= startT && t < endT;
  const g = read('gatos.v1') || {};
  const shop = read('compras.v1')?.items || [];
  return {
    ideasNew: ideas.filter((n) => inT(n.createdAt)).length,
    ideasDone: ideas.filter((n) => n.done && inT(n.updatedAt || n.createdAt)).length,
    cats: (g.cats || []).length,
    care: (g.health || []).filter((x) => inMonth(x.date, ym)).length,
    catSpent: (g.supplies || []).filter((x) => inMonth(x.date, ym)).reduce((a, x) => a + (x.amount || 0), 0),
    shopDone: shop.filter((i) => i.done && inT(i.doneAt || 0)).length,
  };
}

function upcoming(ym) {
  const evs = read('fechas.v1')?.events || [];
  const next = shiftMonth(ym, 1);
  return evs.filter((e) => e.yearly ? e.date.slice(5, 7) === next.slice(5, 7) : inMonth(e.date, next))
    .sort((a, b) => a.date.slice(5).localeCompare(b.date.slice(5))).slice(0, 4);
}

/* ---------------- Tarjetas ---------------- */

function card(cls, iconName, body) {
  return `<section class="story ${cls}"><span class="story-ic">${icon(iconName)}</span>${body}</section>`;
}

function render() {
  renderMonthNav();
  const ym = ui.month;
  const mn = monthName(ym);
  const fin = finance(ym), md = mood(ym), sl = sleep(ym), hb = habits(ym), ot = others(ym), up = upcoming(ym);
  const cards = [];

  cards.push(card('s-cover', 'avion', `
    <small class="kicker">RESUMEN DE VUELO</small>
    <h3>Tu ${esc(mn)}<br>en Mi cielo</h3>
    <p>Desliza para ver cómo estuvo tu mes ✦</p>`));

  if (fin) {
    const diff = fin.prev ? Math.round((fin.spent - fin.prev) / fin.prev * 100) : null;
    cards.push(card('s-fin', 'mod_finanzas', `
      <small class="kicker">FINANZAS</small>
      <p>Tu gasto personal fue de</p>
      <div class="big">${fmt(fin.spent)}</div>
      ${diff !== null ? `<p class="pill">${diff > 0 ? `▲ ${diff}% más` : diff < 0 ? `▼ ${-diff}% menos` : 'Igual'} que ${esc(monthName(shiftMonth(ym, -1)))}</p>` : ''}
      <ul class="facts">
        ${fin.topCat ? `<li>${icon(fin.topCat[0] in FIN_CAT ? fin.topCat[0] : 'otros', 'mini')}Donde más gastaste: <b>${esc(FIN_CAT[fin.topCat[0]] || fin.topCat[0])}</b> (${fmt(fin.topCat[1])})</li>` : ''}
        ${fin.favCard ? `<li>${icon('avion', 'mini')}Tu avión favorito: <b>${esc(fin.favCard)}</b></li>` : ''}
        <li>${icon('tab_movs', 'mini')}<b>${fin.n}</b> movimientos registrados</li>
        ${fin.income ? `<li>${icon('ingreso', 'mini')}Ingresos: <b>${fmt(fin.income)}</b></li>` : ''}
      </ul>`));
  }

  if (md) {
    cards.push(card('s-mood', md.mood ? `mood_${md.mood}` : 'mod_diario', `
      <small class="kicker">MI DÍA</small>
      ${md.mood ? `<p>Tu cielo más frecuente fue</p><div class="big">${esc(MOOD[md.mood].name)}</div>` : '<div class="big">Tus días</div>'}
      <ul class="facts">
        <li>${icon('mod_diario', 'mini')}Escribiste <b>${md.days}</b> día${md.days === 1 ? '' : 's'}</li>
        ${md.emos.length ? `<li>${icon('salud', 'mini')}Lo que más sentiste: <b>${md.emos.map(([k]) => esc(EMO[k] || k)).join(', ')}</b></li>` : ''}
        ${md.goodAct ? `<li>${icon(ACT[md.goodAct.id][1], 'mini')}Tus días con <b>${esc(ACT[md.goodAct.id][0].toLowerCase())}</b> fueron los más soleados</li>`
          : md.topAct ? `<li>${icon(ACT[md.topAct][1], 'mini')}Lo que más hiciste: <b>${esc(ACT[md.topAct][0])}</b></li>` : ''}
      </ul>
      ${md.best ? `<blockquote>“${esc(md.best[1])}”<small>${esc(dateOf(md.best[0]).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }))}</small></blockquote>` : ''}`));
  }

  if (sl) {
    cards.push(card('s-sleep', 'mod_sueno', `
      <small class="kicker">SUEÑO</small>
      <p>Dormiste en promedio</p>
      <div class="big">${hm(sl.avg)}</div>
      <ul class="facts">
        <li>${icon('moon', 'mini')}<b>${sl.n}</b> noche${sl.n === 1 ? '' : 's'} registrada${sl.n === 1 ? '' : 's'}</li>
        <li>${icon('otros', 'mini')}Cumpliste tu meta <b>${sl.met}</b> ${sl.met === 1 ? 'vez' : 'veces'}</li>
        <li>${icon('mood_radiante', 'mini')}Tu noche más larga: <b>${hm(sl.best[1].minutes)}</b> (${esc(dateOf(sl.best[0]).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }))})</li>
      </ul>`));
  }

  if (hb) {
    cards.push(card('s-hab', 'mod_habitos', `
      <small class="kicker">HÁBITOS</small>
      <p>Días completos</p>
      <div class="big">${hb.full}</div>
      <ul class="facts">
        ${hb.star ? `<li>${icon(hb.star.icon, 'mini')}Tu hábito estrella: <b>${esc(hb.star.name)}</b> (${hb.starCount} días)</li>` : ''}
        <li>${icon('otros', 'mini')}Mejor racha: <b>${hb.bestRun}</b> día${hb.bestRun === 1 ? '' : 's'} seguidos</li>
        <li>${icon('tab_movs', 'mini')}Marcaste hábitos <b>${hb.active}</b> día${hb.active === 1 ? '' : 's'}</li>
      </ul>`));
  }

  if (ot.ideasNew || ot.ideasDone || ot.shopDone || ot.care || ot.catSpent) {
    cards.push(card('s-misc', 'mod_ideas', `
      <small class="kicker">IDEAS, COMPRAS Y GATOS</small>
      <ul class="facts big-facts">
        ${ot.ideasNew ? `<li>${icon('mod_ideas', 'mini')}<b>${ot.ideasNew}</b> idea${ot.ideasNew === 1 ? '' : 's'} nueva${ot.ideasNew === 1 ? '' : 's'}${ot.ideasDone ? ` y <b>${ot.ideasDone}</b> cumplida${ot.ideasDone === 1 ? '' : 's'}` : ''}</li>` : ''}
        ${ot.shopDone ? `<li>${icon('mod_compras', 'mini')}<b>${ot.shopDone}</b> cosa${ot.shopDone === 1 ? '' : 's'} tachada${ot.shopDone === 1 ? '' : 's'} de tu lista</li>` : ''}
        ${ot.care ? `<li>${icon('vacuna', 'mini')}<b>${ot.care}</b> cuidado${ot.care === 1 ? '' : 's'} para tus gatos</li>` : ''}
        ${ot.catSpent ? `<li>${icon('huella', 'mini')}Consentiste a tus gatos con <b>${fmt(ot.catSpent)}</b></li>` : ''}
      </ul>`));
  }

  // Cierre
  const phrase = [];
  if (md?.mood) phrase.push(`un mes ${MOOD[md.mood].adj}`);
  if (md?.goodAct) phrase.push(`con mucho de ${ACT[md.goodAct.id][0].toLowerCase()}`);
  else if (md?.topAct) phrase.push(`con mucho de ${ACT[md.topAct][0].toLowerCase()}`);
  if (sl) phrase.push(`durmiendo ${hm(sl.avg).replace(/ 0 min$/, '')} en promedio`);
  const hasAny = fin || md || sl || hb;
  cards.push(card('s-end', 'trofeo', `
    <small class="kicker">TU MES EN UNA FRASE</small>
    <h3>${hasAny ? esc((phrase.length ? phrase.join(', ') : `un mes con ${[fin && 'finanzas al día', hb && 'hábitos', md && 'días escritos'].filter(Boolean).join(' y ')}`).replace(/^./, (c) => c.toUpperCase())) + ' ✦' : 'Aún no hay datos de este mes'}</h3>
    ${up.length ? `<p class="next-title">Lo que viene en ${esc(monthName(shiftMonth(ym, 1)))}</p>
      <ul class="facts">${up.map((e) => `<li>${icon(e.kind === 'cumple' ? 'pastel' : e.kind === 'aniversario' ? 'aniversario' : e.kind === 'gato' ? 'huella' : 'evento', 'mini')}<b>${Number(e.date.slice(8, 10))}</b> · ${esc(e.name)}</li>`).join('')}</ul>` : ''}
    <p class="bye">¡Buen vuelo! ✈</p>`));

  $('#stories').innerHTML = cards.join('');
  $('#dots').innerHTML = cards.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('');
  $('#stories').scrollLeft = 0;
}

function renderMonthNav() {
  const cur = monthOf(todayISO());
  $('[data-month-nav]').innerHTML = `
    <button type="button" data-shift="-1" aria-label="Mes anterior">‹</button>
    <strong>${esc(monthLabel(ui.month))}</strong>
    <button type="button" data-shift="1" aria-label="Mes siguiente" ${ui.month >= cur ? 'disabled style="opacity:.35"' : ''}>›</button>`;
}

function bind() {
  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-shift]');
    if (!s) return;
    const next = shiftMonth(ui.month, Number(s.dataset.shift));
    if (next <= monthOf(todayISO())) { ui.month = next; render(); }
  });
  const box = $('#stories');
  box.addEventListener('scroll', () => {
    const i = Math.round(box.scrollLeft / box.clientWidth);
    $$('#dots i').forEach((d, k) => d.classList.toggle('on', k === i));
    const st = box.children[i];
    if (st && !st.dataset.seen) {
      st.dataset.seen = '1';
      if (st.classList.contains('s-end')) burstFrom(st, { count: 26, spread: 150 });
    }
  }, { passive: true });
}

bind();
render();
initPage();
