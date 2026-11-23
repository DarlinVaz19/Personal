'use strict';

/* Sueño: horas, fases y calidad. Registro manual o importado del Apple Watch
   mediante un atajo de iOS que copia las muestras de "Análisis del sueño". */

const store = createStore('sueno.v1', () => ({ nights: {}, goal: 480 }));

const QUALITY = [
  { v: 1, name: 'Pésimo', icon: 'mood_estres' },
  { v: 2, name: 'Mal', icon: 'mood_triste' },
  { v: 3, name: 'Regular', icon: 'mood_sueno' },
  { v: 4, name: 'Bien', icon: 'mood_calma' },
  { v: 5, name: 'Increíble', icon: 'mood_radiante' },
];
const STAGES = [
  { id: 'deep', name: 'Profundo' },
  { id: 'core', name: 'Núcleo' },
  { id: 'rem', name: 'REM' },
  { id: 'awake', name: 'Despierto' },
];

const qOf = (v) => QUALITY.find((q) => q.v === v);
function hm(min) {
  if (min == null || !Number.isFinite(min)) return '—';
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}
const hShort = (min) => `${(min / 60).toFixed(1).replace('.0', '')} h`;
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function nightsSorted() {
  return Object.entries(store.data.nights).sort((a, b) => b[0].localeCompare(a[0]));
}

/* ---------------- Calidad estimada ---------------- */

// Calidad 1–5 a partir de duración, sueño reparador (profundo + REM) y tiempo despierto.
function estimateQuality(n) {
  const goal = store.data.goal || 480;
  const r = Math.min(1, n.minutes / goal);
  let score = r;
  if (n.stages && n.minutes) {
    const restor = ((n.stages.deep || 0) + (n.stages.rem || 0)) / n.minutes;
    const awakePct = (n.stages.awake || 0) / (n.minutes + (n.stages.awake || 0));
    score = 0.5 * r + 0.35 * Math.min(1, restor / 0.4) + 0.15 * (1 - Math.min(1, awakePct / 0.15));
  }
  // Sin fases no se puede saber si fue reparador: como máximo "Bien".
  return Math.max(1, Math.min(n.stages && (n.stages.deep || n.stages.rem) ? 5 : 4, 1 + Math.round(score * 4)));
}

/* ---------------- Importar del Apple Watch ---------------- */

function parseWhen(s) {
  s = s.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ ,]+(\d{1,2}):(\d{2})/);
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return new Date(y, +m[2] - 1, +m[1], +m[4], +m[5]); }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function stageOf(v) {
  v = (v || '').toLocaleLowerCase('es-MX');
  if (/profund|deep/.test(v)) return 'deep';
  if (/\brem\b/.test(v)) return 'rem';
  if (/n[uú]cleo|core|ligero|light/.test(v)) return 'core';
  if (/despiert|awake/.test(v)) return 'awake';
  if (/cama|inbed|in bed/.test(v)) return 'inbed';
  if (/dorm|asleep|sue[nñ]o|sleep/.test(v)) return 'asleep';
  return null;
}

// Suma minutos de intervalos sin contar doble lo que se encima.
function unionMinutes(iv) {
  const s = iv.slice().sort((a, b) => a[0] - b[0]);
  let total = 0, cs = null, ce = null;
  for (const [a, b] of s) {
    if (cs === null || a > ce) { if (cs !== null) total += ce - cs; cs = a; ce = b; }
    else ce = Math.max(ce, b);
  }
  if (cs !== null) total += ce - cs;
  return total / 60000;
}

function parseWatch(text) {
  const samples = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split(/[;|\t]/);
    if (parts.length < 3) continue;
    const a = parseWhen(parts[0]), b = parseWhen(parts[1]), st = stageOf(parts.slice(2).join(' '));
    if (!a || !b || !st || b <= a) continue;
    samples.push({ a, b, st });
  }
  // Agrupa por noche: la fecha "de la mañana" (se suman 12 h al inicio).
  const groups = new Map();
  for (const s of samples) {
    const key = isoOf(new Date(s.a.getTime() + 12 * 3600000));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const nights = {};
  for (const [key, list] of groups) {
    const staged = list.filter((s) => ['deep', 'core', 'rem'].includes(s.st));
    const asleep = staged.length ? staged : list.filter((s) => s.st === 'asleep');
    if (!asleep.length) continue;
    const stages = {};
    for (const id of ['deep', 'core', 'rem', 'awake']) {
      const iv = list.filter((s) => s.st === id).map((s) => [s.a.getTime(), s.b.getTime()]);
      if (iv.length) stages[id] = Math.round(unionMinutes(iv));
    }
    const minutes = Math.round(unionMinutes(asleep.map((s) => [s.a.getTime(), s.b.getTime()])));
    const start = new Date(Math.min(...asleep.map((s) => s.a.getTime())));
    const end = new Date(Math.max(...asleep.map((s) => s.b.getTime())));
    nights[key] = {
      bed: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      wake: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      minutes, stages: staged.length ? stages : (stages.awake ? { awake: stages.awake } : null), source: 'watch',
    };
  }
  return { nights, samples: samples.length };
}

function importText(text) {
  const { nights, samples } = parseWatch(text);
  const keys = Object.keys(nights);
  if (!keys.length) {
    alert(samples ? 'Encontré datos, pero ninguno de sueño.' : 'No encontré datos de sueño en lo que pegaste. Revisa que el atajo copie líneas como: 2026-11-22 23:40;2026-11-23 07:05;Núcleo');
    return false;
  }
  for (const k of keys) {
    const prev = store.data.nights[k];
    const n = nights[k];
    n.quality = prev?.qualitySet ? prev.quality : estimateQuality(n);
    n.qualitySet = !!prev?.qualitySet;
    n.note = prev?.note || '';
    store.data.nights[k] = n;
  }
  store.save();
  closeSheet();
  render(true);
  celebrate('reloj', `¡${keys.length} noche${keys.length === 1 ? '' : 's'} importada${keys.length === 1 ? '' : 's'}!`, 'Desde tu Apple Watch', true);
  setTimeout(() => landOn($('#hero')), 400);
  return true;
}

function importSheet() {
  const sheet = openSheet(`
    <h3>Importar del Apple Watch</h3>
    <ol class="steps">
      <li>Abre la app <b>Atajos</b> y ejecuta <b>“Sueño a Mi cielo”</b>. Copia tus últimas noches.</li>
      <li>Regresa aquí y toca <b>Pegar del portapapeles</b>.</li>
    </ol>
    <button type="button" class="btn primary" id="pasteClip">Pegar del portapapeles</button>
    <details class="manual-paste">
      <summary>¿No funciona? Pégalo a mano</summary>
      <div class="field"><textarea id="pasteArea" placeholder="Mantén presionado aquí y elige Pegar"></textarea></div>
      <button type="button" class="btn" id="importArea">Importar lo pegado</button>
    </details>
    <details class="manual-paste">
      <summary>¿Cómo creo el atajo?</summary>
      <div class="how">${SHORTCUT_HELP}</div>
    </details>`);
  sheet.addEventListener('click', async (e) => {
    if (e.target.closest('#pasteClip')) {
      try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) { toast('El portapapeles está vacío'); return; }
        importText(text);
      } catch (err) {
        toast('No pude leer el portapapeles; pégalo a mano abajo');
        $('.manual-paste', sheet).open = true;
      }
      return;
    }
    if (e.target.closest('#importArea')) importText($('#pasteArea', sheet).value);
  });
}

const SHORTCUT_HELP = `
  <p>Se hace una sola vez, en la app <b>Atajos</b> del iPhone:</p>
  <ol>
    <li>Toca <b>+</b> para crear un atajo y llámalo <b>Sueño a Mi cielo</b>.</li>
    <li>Agrega <b>Buscar muestras de Salud</b> (<i>Find Health Samples</i>). Tipo: <b>Análisis del sueño</b>. Agrega el filtro <b>Fecha de inicio · está en los últimos · 7 días</b>. Ordenar por <b>Fecha de inicio</b>.</li>
    <li>Agrega <b>Repetir con cada</b> (<i>Repeat with Each</i>) sobre las muestras.</li>
    <li>Dentro de la repetición agrega <b>Formatear fecha</b> con <b>Elemento de repetición → Fecha de inicio</b>, formato <b>Personalizado</b>: <code>yyyy-MM-dd HH:mm</code>.</li>
    <li>Agrega otro <b>Formatear fecha</b> igual, pero con <b>Fecha de finalización</b>.</li>
    <li>Agrega <b>Texto</b> y escribe, usando las variables: <code>[fecha inicio];[fecha fin];[Elemento de repetición → Valor]</code></li>
    <li>Después de <b>Fin de repetir</b>, agrega <b>Combinar texto</b> con <b>Resultados de repetir</b>, separador <b>Nueva línea</b>.</li>
    <li>Agrega <b>Copiar al portapapeles</b>. Listo.</li>
  </ol>
  <p class="muted small">Tip: puedes agregar el atajo a tu pantalla de inicio o crear una automatización que lo ejecute cada mañana. Necesitas tener activado el seguimiento de sueño en tu Apple Watch.</p>`;

/* ---------------- Registro manual ---------------- */

function nightSheet(date) {
  const n = date ? store.data.nights[date] : null;
  const st = { quality: n?.quality || null };
  const sheet = openSheet(`
    <h3>${n ? 'Editar noche' : 'Registrar noche'}</h3>
    <div class="field"><label class="label" for="nDate">Noche que terminó el</label><input id="nDate" type="date" value="${esc(date || todayISO())}" ${n ? 'disabled' : ''}></div>
    <div class="two">
      <div class="field"><label class="label" for="nBed">Me dormí</label><input id="nBed" type="time" value="${esc(n?.bed || '23:00')}"></div>
      <div class="field"><label class="label" for="nWake">Desperté</label><input id="nWake" type="time" value="${esc(n?.wake || '07:00')}"></div>
    </div>
    <p class="dur" id="nDur"></p>
    <div class="field"><div class="label">¿Cómo dormiste?</div><div class="quality" id="nQ"></div></div>
    <div class="field"><label class="label" for="nNote">Nota</label><input id="nNote" value="${esc(n?.note || '')}" placeholder="Café tarde, soñé bonito, me desperté…" autocomplete="off"></div>
    ${n?.source === 'watch' ? '<p class="muted small">Esta noche viene del Apple Watch. Si cambias las horas, se recalcula la duración y se quitan las fases.</p>' : ''}
    <button type="button" class="btn primary" id="saveN">Guardar</button>
    ${n ? '<button type="button" class="btn danger" id="delN">Eliminar noche</button>' : ''}`);
  const dur = () => {
    let d = toMin($('#nWake', sheet).value || '07:00') - toMin($('#nBed', sheet).value || '23:00');
    if (d <= 0) d += 1440;
    return d;
  };
  const paint = () => {
    $('#nDur', sheet).innerHTML = `${icon('mod_sueno', 'mini')} ${hm(dur())}`;
    $('#nQ', sheet).innerHTML = QUALITY.map((q) =>
      `<button type="button" data-q="${q.v}" aria-pressed="${st.quality === q.v}">${icon(q.icon)}<span>${q.name}</span></button>`).join('');
  };
  paint();
  sheet.addEventListener('input', (e) => { if (e.target.type === 'time') paint(); });
  sheet.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]');
    if (q) { st.quality = Number(q.dataset.q); paint(); replay($(`[data-q="${st.quality}"]`, sheet), 'just'); return; }
    if (e.target.closest('#saveN')) {
      const key = date || $('#nDate', sheet).value || todayISO();
      const bed = $('#nBed', sheet).value || '23:00', wake = $('#nWake', sheet).value || '07:00';
      const changedTimes = !n || n.bed !== bed || n.wake !== wake;
      const night = {
        ...(n || {}), bed, wake,
        minutes: changedTimes ? dur() : n.minutes,
        stages: changedTimes ? null : n.stages,
        source: changedTimes ? 'manual' : n.source,
        note: $('#nNote', sheet).value.trim(),
      };
      night.quality = st.quality || estimateQuality(night);
      night.qualitySet = !!st.quality;
      store.data.nights[key] = night;
      store.save(); closeSheet(); render(true);
      celebrate(qOf(night.quality).icon, 'Noche guardada', `${hm(night.minutes)} · ${qOf(night.quality).name}`);
      return;
    }
    if (e.target.closest('#delN') && confirm('¿Eliminar esta noche?')) {
      delete store.data.nights[date]; store.save(); closeSheet(); render(true);
    }
  });
}

/* ---------------- Vistas ---------------- */

function stageBar(n) {
  if (!n.stages || !STAGES.some((s) => n.stages[s.id])) return '';
  const total = STAGES.reduce((a, s) => a + (n.stages[s.id] || 0), 0) || 1;
  return `
    <div class="stage-bar">${STAGES.filter((s) => n.stages[s.id]).map((s) =>
      `<span class="st-${s.id}" style="width:${(n.stages[s.id] / total * 100).toFixed(1)}%"></span>`).join('')}</div>
    <div class="stage-legend">${STAGES.filter((s) => n.stages[s.id]).map((s) =>
      `<span><i class="st-${s.id}"></i>${s.name} ${hm(n.stages[s.id])}</span>`).join('')}</div>`;
}

function renderHero(animate) {
  const list = nightsSorted();
  const hero = $('#hero');
  if (!list.length) {
    hero.innerHTML = `<span class="moon">${icon('mod_sueno')}</span>
      <div class="k">Tu sueño</div><div class="v">Sin noches todavía</div>
      <div class="meta"><span>Importa del Apple Watch o registra tu noche</span></div>`;
    return;
  }
  const [date, n] = list[0];
  const goal = store.data.goal || 480;
  const label = date === todayISO() ? 'Anoche dormiste' : `La noche del ${dateOf(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} dormiste`;
  const q = qOf(n.quality);
  hero.innerHTML = `
    <span class="shine"></span>
    <span class="moon">${icon(q ? q.icon : 'mod_sueno')}</span>
    <div class="k">${esc(label)}</div>
    <div class="v" id="heroH">${hm(n.minutes)}</div>
    <div class="meta"><span>${esc(n.bed)} → ${esc(n.wake)}</span><span>${q ? esc(q.name) : ''}</span><span>${Math.round(n.minutes / goal * 100)}% de tu meta</span></div>
    ${stageBar(n)}`;
  if (animate) replay(hero, 'bump');
}

function renderChart() {
  const goal = store.data.goal || 480;
  const days = Array.from({ length: 7 }, (_, i) => addDays(todayISO(), i - 6));
  const max = Math.max(goal + 60, ...days.map((d) => store.data.nights[d]?.minutes || 0));
  $('#chart').innerHTML = `
    <div class="bars7" style="--goal:${(goal / max * 100).toFixed(1)}">
      <span class="goal-line"><em>meta ${hShort(goal)}</em></span>
      ${days.map((d, i) => {
        const n = store.data.nights[d];
        const h = n ? (n.minutes / max * 100) : 0;
        return `<button type="button" class="b7 ${n && n.minutes >= goal ? 'met' : ''}" data-night="${d}" style="--h:${h.toFixed(1)};--i:${i}">
          <span class="b7-val">${n ? hShort(n.minutes) : ''}</span>
          <span class="b7-bar">${n && n.minutes >= goal ? '<i>✦</i>' : ''}</span>
          <small>${dateOf(d).toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '').slice(0, 3)}</small>
        </button>`;
      }).join('')}
    </div>`;

  const week = days.map((d) => store.data.nights[d]).filter(Boolean);
  const avg = week.length ? week.reduce((a, n) => a + n.minutes, 0) / week.length : null;
  const avgQ = week.length ? week.reduce((a, n) => a + (n.quality || 0), 0) / week.length : null;
  $('#stats').innerHTML = `
    <div class="stat"><div class="k">Promedio</div><div class="v">${avg ? hm(avg) : '—'}</div></div>
    <div class="stat"><div class="k">Calidad promedio</div><div class="v">${avgQ ? `${qOf(Math.round(avgQ)).name}` : '—'}</div></div>
    <button type="button" class="stat wide goal-stat" id="goalBtn"><div class="k">Meta de sueño (toca para cambiar)</div><div class="v">${hm(goal)}</div></button>`;
}

function renderNights() {
  const list = nightsSorted().slice(0, 30);
  if (!list.length) {
    $('#nights').innerHTML = `<div class="empty">${icon('mod_sueno')}<b>Dulces sueños</b>Aquí aparecerán tus noches.</div>`;
    return;
  }
  $('#nights').innerHTML = `<div class="list">${list.map(([d, n], i) => {
    const q = qOf(n.quality);
    return `<button type="button" class="item" data-night="${d}" style="--i:${i}">
      <span class="bubble">${icon(q ? q.icon : 'mod_sueno')}${n.source === 'watch' ? `<span class="src">${icon('reloj')}</span>` : ''}</span>
      <span class="main"><div class="t">${esc(dayLabel(d))}</div><div class="s">${esc(n.bed)} → ${esc(n.wake)}${q ? ' · ' + esc(q.name) : ''}${n.note ? ' · ' + esc(n.note) : ''}</div></span>
      <span class="amt">${hm(n.minutes)}</span>
    </button>`;
  }).join('')}</div>`;
}

function render(animate = false) { renderHero(animate); renderChart(); renderNights(); }

function bind() {
  $('#importWatch').addEventListener('click', importSheet);
  $('#addNight').addEventListener('click', () => nightSheet(null));
  document.addEventListener('click', (e) => {
    const n = e.target.closest('[data-night]');
    if (n && !e.target.closest('.sheet')) {
      if (store.data.nights[n.dataset.night]) nightSheet(n.dataset.night);
      else nightSheet(null);
      return;
    }
    if (e.target.closest('#goalBtn')) {
      const v = prompt('¿Cuántas horas quieres dormir? (ej. 8 o 7.5)', String((store.data.goal || 480) / 60));
      const h = parseAmount(v);
      if (Number.isFinite(h) && h >= 4 && h <= 12) { store.data.goal = Math.round(h * 60); store.save(); render(); }
    }
  });
}

bind();
render();
initPage();
