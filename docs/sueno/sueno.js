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
function estimateQualityOld(n) {
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

function estimateQuality(n, date = todayISO()) {
  const s = sleepScore(date, n);
  if (!s) return estimateQualityOld(n);
  const q = s.score >= 85 ? 5 : s.score >= 70 ? 4 : s.score >= 55 ? 3 : s.score >= 40 ? 2 : 1;
  return n.stages && (n.stages.deep || n.stages.rem) ? q : Math.min(4, q);
}

/* ---------------- Importar del Apple Watch ---------------- */

function parseWhen(s) {
  s = s.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ ,]+(\d{1,2}):(\d{2})/);
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return new Date(y, +m[2] - 1, +m[1], +m[4], +m[5]); }
  // Formato en español de iOS: "22 nov 2026, 11:40 p.m." o "22 de noviembre de 2026, 23:40"
  const MES = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11 };
  m = s.toLocaleLowerCase('es-MX').match(/(\d{1,2})(?: de)? ([a-zé]{3})[a-zé]*\.?(?: de)? (\d{4}),?(?: a las)? (\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])?/);
  if (m && MES[m[2]] !== undefined) {
    let h = +m[4];
    if (m[6] === 'p' && h < 12) h += 12;
    if (m[6] === 'a' && h === 12) h = 0;
    return new Date(+m[3], MES[m[2]], +m[1], h, +m[5]);
  }
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
    samples.push({ a: a.getTime(), b: b.getTime(), st });
  }
  samples.sort((x, y) => x.a - y.a);

  // Bloques de sueño: muestras separadas por menos de 2 h pertenecen al mismo bloque.
  const GAP = 2 * 3600000;
  const blocks = [];
  for (const s of samples) {
    const cur = blocks[blocks.length - 1];
    if (cur && s.a - cur.end <= GAP) { cur.list.push(s); cur.end = Math.max(cur.end, s.b); }
    else blocks.push({ list: [s], end: s.b });
  }

  const ASLEEP = ['asleep', 'core', 'deep', 'rem'];
  const sessions = [];
  for (const blk of blocks) {
    const sleep = blk.list.filter((s) => ASLEEP.includes(s.st));
    if (!sleep.length) continue;
    const iv = (id) => blk.list.filter((s) => s.st === id).map((s) => [s.a, s.b]);
    const staged = sleep.some((s) => s.st !== 'asleep');
    const stages = {};
    for (const id of ['deep', 'core', 'rem', 'awake']) {
      const v = iv(id);
      if (v.length) stages[id] = Math.round(unionMinutes(v));
    }
    // Si hay partes sin fase ("Dormido"), cuentan como núcleo para que la barra cuadre.
    if (staged) {
      const plain = iv('asleep');
      if (plain.length) stages.core = (stages.core || 0) + Math.round(unionMinutes(plain));
    }
    const start = new Date(Math.min(...sleep.map((s) => s.a)));
    const end = new Date(Math.max(...sleep.map((s) => s.b)));
    sessions.push({
      key: isoOf(end),
      bed: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      wake: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      minutes: Math.round(unionMinutes(sleep.map((s) => [s.a, s.b]))),
      stages: staged ? stages : (stages.awake ? { awake: stages.awake } : null),
    });
  }

  // Por día: el bloque más largo es la noche; los demás son siestas.
  const nights = {};
  for (const s of sessions) {
    const n = nights[s.key];
    if (!n) { nights[s.key] = { ...s, naps: [], source: 'watch' }; continue; }
    if (s.minutes > n.minutes) {
      nights[s.key] = { ...s, naps: [...n.naps, { bed: n.bed, wake: n.wake, minutes: n.minutes }], source: 'watch' };
    } else n.naps.push({ bed: s.bed, wake: s.wake, minutes: s.minutes });
  }
  for (const n of Object.values(nights)) {
    delete n.key;
    n.napMinutes = n.naps.reduce((a, x) => a + x.minutes, 0);
    if (!n.naps.length) { delete n.naps; delete n.napMinutes; }
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
    n.quality = prev?.qualitySet ? prev.quality : estimateQuality(n, k);
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
    <li>Agrega <b>Buscar muestras de Salud</b> (<i>Find Health Samples</i>). Tipo: <b>Sueño</b>. Agrega el filtro <b>Fecha de inicio · está en los últimos · 7 días</b>. Ordenar por <b>Fecha de inicio</b>.</li>
    <li>Agrega <b>Repetir con cada</b> (<i>Repeat with Each</i>) sobre las muestras.</li>
    <li>Dentro de la repetición agrega <b>Texto</b>. Toca el cuadro, inserta la variable <b>Elemento de repetición</b>, tócala y elige <b>Fecha de inicio</b>; en el formato elige <b>ISO 8601</b> (con hora).</li>
    <li>Escribe <code>;</code> e inserta otra vez <b>Elemento de repetición</b> → <b>Fecha de finalización</b> → <b>ISO 8601</b>.</li>
    <li>Escribe <code>;</code> e inserta <b>Elemento de repetición</b> → <b>Valor</b>.</li>
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
      night.quality = st.quality || estimateQuality(night, key);
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

/* ---------------- Calificación, consejos y datos curiosos ---------------- */

// Promedio "circular" de horas de dormir (para que 23:30 y 00:30 promedien 00:00).
function bedOffset(t) { let m = toMin(t); if (m < 12 * 60) m += 1440; return m; }

// Calificación 0–100. Cada parte vale puntos; si falta un dato (p. ej. sin fases),
// se reparte el puntaje entre las partes disponibles.
function sleepScore(date, n) {
  if (!n || !n.minutes) return null;
  const parts = [];
  const m = n.minutes;
  const dur = m >= 420 && m <= 540 ? 1 : m < 420 ? Math.max(0, (m - 240) / 180) : Math.max(0.6, 1 - (m - 540) / 240);
  parts.push({ id: 'dur', name: 'Duración', w: 40, v: dur, detail: hm(m) });
  const st = n.stages;
  if (st && st.awake != null && (st.core || st.deep || st.rem)) {
    const eff = m / (m + st.awake);
    parts.push({ id: 'eff', name: 'Eficiencia', w: 20, v: Math.max(0, Math.min(1, (eff - 0.75) / 0.15)), detail: `${Math.round(eff * 100)}% dormido` });
  }
  if (st && (st.deep || st.core || st.rem)) {
    const dp = (st.deep || 0) / m, rp = (st.rem || 0) / m;
    parts.push({ id: 'deep', name: 'Profundo', w: 15, v: dp >= 0.13 ? 1 : dp / 0.13, detail: `${Math.round(dp * 100)}% (ideal 13–23%)` });
    parts.push({ id: 'rem', name: 'REM', w: 15, v: rp >= 0.2 ? (rp > 0.3 ? 0.85 : 1) : rp / 0.2, detail: `${Math.round(rp * 100)}% (ideal 20–25%)` });
  }
  const prev = Array.from({ length: 7 }, (_, i) => store.data.nights[addDays(date, -(i + 1))]).filter((x) => x && x.bed);
  if (prev.length >= 3 && n.bed) {
    const avg = prev.reduce((a, x) => a + bedOffset(x.bed), 0) / prev.length;
    const diff = Math.abs(bedOffset(n.bed) - avg);
    parts.push({ id: 'cons', name: 'Constancia', w: 10, v: Math.max(0, Math.min(1, 1 - (diff - 30) / 90)), detail: `${Math.round(diff)} min de tu hora habitual` });
  }
  const totalW = parts.reduce((a, p) => a + p.w, 0);
  const score = Math.round(parts.reduce((a, p) => a + p.w * p.v, 0) / totalW * 100);
  const label = score >= 85 ? 'Excelente' : score >= 70 ? 'Buena' : score >= 55 ? 'Regular' : 'A mejorar';
  return { score, label, parts };
}

function scoreRing(s, size = 112) {
  const r = 44, c = 2 * Math.PI * r;
  return `
    <svg class="ring" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="50" cy="50" r="${r}" class="ring-bg"/>
      <circle cx="50" cy="50" r="${r}" class="ring-fg" style="stroke-dasharray:${c.toFixed(1)};--off:${(c * (1 - s.score / 100)).toFixed(1)}"/>
    </svg>`;
}

// Consejos según lo más bajo de la noche (máximo 3) y un consejo general del día.
function tipsFor(date, n, s) {
  const tips = [];
  const by = Object.fromEntries((s?.parts || []).map((p) => [p.id, p]));
  const st = n?.stages || {};
  if (by.dur && n.minutes < 420) tips.push({ icon: 'mod_sueno', t: `Dormiste ${hm(n.minutes)}. A los adultos se les recomienda entre 7 y 9 horas: prueba acostarte 30 minutos antes esta semana.` });
  if (by.dur && n.minutes > 600) tips.push({ icon: 'mood_sueno', t: 'Dormiste más de 10 horas. Si te pasa seguido y aun así amaneces con cansancio, vale la pena comentarlo con tu médico.' });
  if (by.eff && by.eff.v < 0.6) {
    tips.push({ icon: 'reloj', t: `Tu noche tuvo ${hm(st.awake)} sin dormir. Si no logras dormirte en unos 20 minutos, levántate, haz algo tranquilo con luz tenue y regresa cuando tengas sueño.` });
  }
  if (by.deep && by.deep.v < 0.8) tips.push({ icon: 'ejercicio', t: 'Tu sueño profundo salió bajo. El ejercicio regular (no muy cerca de dormir), un cuarto fresco y evitar alcohol en la noche suelen ayudar.' });
  if (by.rem && by.rem.v < 0.8) tips.push({ icon: 'mood_feliz', t: 'Tu REM salió bajo. El REM se concentra al final de la noche, así que dormir completo ayuda; el alcohol también lo reduce.' });
  if (by.cons && by.cons.v < 0.7) tips.push({ icon: 'moon', t: 'Te dormiste lejos de tu hora habitual. Acostarte y despertar a la misma hora, también en fin de semana, ayuda a tu reloj biológico.' });
  if (n?.napMinutes > 45) tips.push({ icon: 'mood_calma', t: `Tu siesta duró ${hm(n.napMinutes)}. Las siestas cortas (20–30 min) y antes de las 3 p. m. afectan menos el sueño de la noche.` });
  const general = [
    { icon: 'comida', t: 'La cafeína puede seguir en tu cuerpo 5 horas o más: intenta tu último café antes de las 2 p. m.' },
    { icon: 'mood_radiante', t: 'Recibir luz natural en la mañana ayuda a que en la noche te dé sueño a buena hora.' },
    { icon: 'casa', t: 'Un cuarto fresco, oscuro y silencioso favorece dormir de corrido.' },
    { icon: 'leer', t: 'Una rutina tranquila antes de dormir (leer, estirarte, luz tenue) le avisa a tu cuerpo que ya es hora.' },
    { icon: 'tab_movs', t: 'Bajar el brillo y alejar el celular 30–60 min antes de dormir ayuda a desconectarte.' },
    { icon: 'meditar', t: 'Respirar lento (inhala 4, exhala 6) unos minutos puede ayudarte a relajarte al acostarte.' },
  ];
  const dayIdx = Math.floor(Date.now() / 86400000);
  const out = tips.slice(0, 3);
  out.push(general[dayIdx % general.length]);
  if (!tips.length) out.unshift({ icon: 'otros', t: '¡Tu noche se ve muy bien! Sigue con tu rutina ✦' });
  return out;
}

const FACTS = [
  'Pasamos cerca de un tercio de la vida durmiendo.',
  'El sueño se organiza en ciclos de unos 90 minutos; en una noche completa hay entre 4 y 6.',
  'El sueño profundo se concentra en la primera mitad de la noche y el REM en la segunda.',
  'Durante el REM tus ojos se mueven rápido, pero tus músculos quedan casi paralizados para que no "actúes" tus sueños.',
  'Los sueños más vívidos y con historia suelen ocurrir durante el REM.',
  'Despertarte brevemente varias veces en la noche es normal; casi nunca lo recuerdas.',
  'Los gatos duermen entre 12 y 16 horas al día. 🐾',
  'Los delfines duermen con la mitad del cerebro a la vez, para seguir nadando y salir a respirar.',
  'En 1964, Randy Gardner estuvo 264 horas (11 días) sin dormir, uno de los récords más conocidos.',
  'Estudios en ratones muestran que durante el sueño el cerebro "limpia" desechos con más eficiencia.',
  'Pasar unas 17–19 horas seguidas sin dormir puede afectar los reflejos de forma parecida a haber bebido alcohol.',
  'El olfato casi no te despierta: por eso las alarmas de humo usan sonido.',
  'Al dormir, tu temperatura corporal baja un poco; por eso un cuarto fresco ayuda.',
  'La adolescencia retrasa el reloj biológico: a los adolescentes les da sueño más tarde de forma natural.',
  'Las siestas de unos 20 minutos pueden mejorar la atención sin causar esa sensación de aturdimiento al despertar.',
  'Mucha gente sueña a color, pero algunas personas reportan soñar en blanco y negro.',
];
let factIdx = Math.floor(Date.now() / 86400000) % FACTS.length;

function renderInsights() {
  const list = nightsSorted();
  const box = $('#insights');
  if (!list.length) { box.innerHTML = ''; return; }
  const [date, n] = list[0];
  const s = sleepScore(date, n);
  const tips = tipsFor(date, n, s);
  box.innerHTML = `
    ${s ? `<h2>Calificación</h2>
    <div class="card score-card">
      <div class="score-main">
        <div class="ring-wrap">${scoreRing(s)}<div class="ring-num"><b id="scoreNum">0</b><small>de 100</small></div></div>
        <div class="score-txt"><b>${esc(s.label)}</b><span>${esc(dayLabel(date))}</span>
          ${!n.stages ? '<small class="muted">Con datos del Apple Watch la calificación incluye fases y eficiencia.</small>' : ''}</div>
      </div>
      <div class="score-parts">${s.parts.map((p) => `
        <div class="sp"><div class="sp-top"><span>${esc(p.name)}</span><small>${esc(p.detail)}</small></div>
          <div class="track"><div class="fill" style="width:${Math.round(p.v * 100)}%"></div></div></div>`).join('')}</div>
      <p class="muted small disclaimer">Estimación orientativa basada en rangos generales para adultos; no es un diagnóstico.</p>
    </div>` : ''}
    <h2>Consejos para ti</h2>
    <div class="tips">${tips.map((t, i) => `<div class="tip" style="--i:${i}">${icon(t.icon)}<p>${esc(t.t)}</p></div>`).join('')}</div>
    <h2>¿Sabías que…?</h2>
    <div class="card fact">
      <span class="fact-ic">${icon('moon')}</span>
      <p id="factText">${esc(FACTS[factIdx])}</p>
      <button type="button" class="link" id="nextFact">Otro dato ✦</button>
    </div>`;
  if (s) countUp($('#scoreNum'), 0, s.score, (v) => String(Math.round(v)));
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
    <div class="meta"><span>${esc(n.bed)} → ${esc(n.wake)}</span><span>${q ? esc(q.name) : ''}</span><span>${Math.round(n.minutes / goal * 100)}% de tu meta</span>${n.napMinutes ? `<span>+ siesta ${hm(n.napMinutes)}</span>` : ''}</div>
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
      <span class="main"><div class="t">${esc(dayLabel(d))}</div><div class="s">${esc(n.bed)} → ${esc(n.wake)}${q ? ' · ' + esc(q.name) : ''}${n.napMinutes ? ' · siesta ' + hm(n.napMinutes) : ''}${n.note ? ' · ' + esc(n.note) : ''}</div></span>
      <span class="amt">${hm(n.minutes)}${(() => { const sc = sleepScore(d, n); return sc ? `<small class="score-badge">${sc.score} pts</small>` : ''; })()}</span>
    </button>`;
  }).join('')}</div>`;
}

function render(animate = false) { renderHero(animate); renderInsights(); renderChart(); renderNights(); }

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
    if (e.target.closest('#nextFact')) {
      factIdx = (factIdx + 1) % FACTS.length;
      const p = $('#factText');
      p.textContent = FACTS[factIdx];
      replay(p, 'enter');
      replay($('.fact-ic'), 'just');
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
