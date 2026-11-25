'use strict';

/* ============================================================
   Finanzas — sección de "Mi cielo". Usa shared/core.js e
   shared/icons.js. Los datos viven solo en este teléfono.
   ============================================================ */

const STORAGE_KEY = 'finanzas.v1';

const DEFAULT_CARDS = [
  { id: 'banamex-debito', name: 'Débito Banamex', kind: 'debito', color: '#c8102e' },
  { id: 'banamex-credito', name: 'Crédito Banamex', kind: 'credito', color: '#1d3c78' },
  { id: 'nu-debito', name: 'Débito Nu', kind: 'debito', color: '#820ad1' },
  { id: 'efectivo', name: 'Efectivo', kind: 'efectivo', color: '#2f8f5b' },
];

const CATEGORIES = [
  { id: 'comida', name: 'Comida', icon: '🍽️' },
  { id: 'super', name: 'Súper', icon: '🛒' },
  { id: 'transporte', name: 'Transporte', icon: '🚗' },
  { id: 'casa', name: 'Casa', icon: '🏠' },
  { id: 'servicios', name: 'Servicios', icon: '💡' },
  { id: 'salud', name: 'Salud', icon: '💊' },
  { id: 'entretenimiento', name: 'Entretenimiento', icon: '🎬' },
  { id: 'compras', name: 'Compras', icon: '🛍️' },
  { id: 'suscripciones', name: 'Suscripciones', icon: '🔁' },
  { id: 'viajes', name: 'Viajes', icon: '✈' },
  { id: 'mascotas', name: 'Mascotas', icon: '🐾' },
  { id: 'otros', name: 'Otros', icon: '•' },
];

/*
 * Tipos de movimiento.
 *  card:     'required' | 'optional' | false
 *  person:   pide nombre de persona (deudas)
 *  category: pide categoría (es gasto tuyo, total o parcial)
 *  flow:     'out' sale dinero de tu cuenta, 'in' entra, 'none' no se mueve dinero tuyo
 *  debt:     efecto en el saldo con la persona (+ = te debe, − = le debes)
 */
const TYPES = {
  gasto:    { label: 'Gasto personal',      icon: '🧾', card: 'required', person: false, category: true,  flow: 'out' },
  prestado: { label: 'Pagué por alguien',   icon: '🤝', card: 'required', person: true,  category: true,  flow: 'out' },
  debo:     { label: 'Alguien pagó por mí', icon: '🙋', card: false,      person: true,  category: true,  flow: 'none' },
  cobro:    { label: 'Me pagaron',          icon: '📥', card: 'optional', person: true,  category: false, flow: 'in' },
  pago:     { label: 'Pagué una deuda',     icon: '📤', card: 'required', person: true,  category: false, flow: 'out' },
  meprestaron: { label: 'Me prestaron',   icon: '🏦', card: 'optional', person: true,  category: false, flow: 'in' },
  preste:   { label: 'Presté dinero',       icon: '🪙', card: 'required', person: true,  category: false, flow: 'out' },
  ingreso:  { label: 'Ingreso',             icon: '💰', card: 'optional', person: false, category: false, flow: 'in' },
};
const TYPE_ORDER = ['gasto', 'prestado', 'debo', 'meprestaron', 'preste', 'cobro', 'pago', 'ingreso'];

const TITLES = {
  nuevo: 'Nuevo movimiento',
  movs: 'Movimientos',
  deudas: 'Deudas',
  resumen: 'Resumen',
  ajustes: 'Ajustes',
};


/* ---------------- Datos ---------------- */

function emptyDb() {
  return { version: 1, cards: DEFAULT_CARDS.map((c) => ({ ...c })), movements: [], lastCardId: null, lastBackup: null, theme: 'auto', photo: { where: 'ambos', visibility: 35 } };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDb();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.movements) || !Array.isArray(data.cards)) return emptyDb();
    return { ...emptyDb(), ...data };
  } catch (e) {
    console.error('No se pudo leer el almacenamiento', e);
    return emptyDb();
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    console.error(e);
    alert('No se pudo guardar en este dispositivo. Exporta un respaldo desde Ajustes.');
    return false;
  }
}

let db = load();

const ui = {
  tab: 'nuevo',
  month: monthOf(todayISO()),
  filterCard: '',
  editingId: null,
  form: { type: 'gasto', cardId: null, category: null },
};

function personKey(name) { return String(name || '').trim().toLocaleLowerCase('es-MX'); }
function cardById(id) { return db.cards.find((c) => c.id === id); }
function cardName(id) { return cardById(id)?.name ?? (id ? 'Tarjeta eliminada' : ''); }
function categoryById(id) { return CATEGORIES.find((c) => c.id === id); }

/* Lo que realmente gastaste tú (para resumen por categoría). */
function personalExpense(m) {
  if (m.type === 'gasto' || m.type === 'debo') return m.amount;
  if (m.type === 'prestado') return Math.max(0, m.amount - (m.owed ?? m.amount));
  return 0;
}

/* Efecto en el saldo con la persona: + te debe, − le debes. */
function debtDelta(m) {
  switch (m.type) {
    case 'prestado': return m.owed ?? m.amount;
    case 'pago': return m.amount;
    case 'debo': return -m.amount;
    case 'cobro': return -m.amount;
    case 'meprestaron': return -m.amount;
    case 'preste': return m.amount;
    default: return 0;
  }
}

function peopleBalances() {
  const map = new Map();
  for (const m of db.movements) {
    if (!TYPES[m.type]?.person || !m.person) continue;
    const k = personKey(m.person);
    if (!map.has(k)) map.set(k, { key: k, name: m.person.trim(), balance: 0, last: m.date, count: 0 });
    const p = map.get(k);
    p.balance += debtDelta(m);
    p.count += 1;
    if (m.date > p.last) p.last = m.date;
  }
  for (const p of map.values()) p.balance = Math.round(p.balance * 100) / 100;
  return Array.from(map.values());
}

function sortedMovements(list) {
  return list.slice().sort((a, b) => (b.date.localeCompare(a.date)) || (b.createdAt - a.createdAt));
}


/* ---------------- Navegación ---------------- */

function setTab(tab) {
  ui.tab = tab;
  for (const v of $$('.view')) v.hidden = v.id !== `view-${tab}`;
  for (const b of $$('#tabbar button')) {
    if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  $('#title').textContent = tab === 'nuevo' && ui.editingId ? 'Editar movimiento' : TITLES[tab];
  $('#subtitle').textContent = `${new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} ☁︎ ✦`;
  render();
  window.scrollTo(0, 0);
  replay($(`#view-${tab}`), 'enter');
  replay($(`#tabbar [data-tab="${tab}"]`), 'just');
}

function render() {
  if (ui.tab === 'nuevo') renderForm();
  if (ui.tab === 'movs') renderMovements();
  if (ui.tab === 'deudas') renderDebts();
  if (ui.tab === 'resumen') renderSummary();
  if (ui.tab === 'ajustes') renderSettings();
}

function renderMonthNavs() {
  for (const nav of $$('[data-month-nav]')) {
    const isCurrent = ui.month === monthOf(todayISO());
    nav.innerHTML = `
      <button type="button" data-shift="-1" aria-label="Mes anterior">‹</button>
      <strong>${esc(monthLabel(ui.month))}</strong>
      <button type="button" data-shift="1" aria-label="Mes siguiente" ${isCurrent ? 'disabled style="opacity:.35"' : ''}>›</button>`;
  }
}

/* ---------------- Formulario ---------------- */

function renderHero() {
  const hero = $('#hero');
  applyPhoto();
  hero.hidden = !!ui.editingId;
  if (ui.editingId) return;
  const ym = monthOf(todayISO());
  const spent = db.movements.filter((m) => monthOf(m.date) === ym).reduce((s, m) => s + personalExpense(m), 0);
  const people = peopleBalances();
  const owedToMe = people.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0);
  const iOwe = people.filter((p) => p.balance < 0).reduce((s, p) => s - p.balance, 0);
  if (!hero.dataset.ready) {
    hero.dataset.ready = '1';
    const stars = [12, 30, 52, 70, 86].map((x, i) =>
      `<span class="float-star" style="--x:${x}%;--d:${(i * 0.75).toFixed(2)}s"></span>`).join('');
    hero.innerHTML = `
      <span class="shine"></span>${stars}
      <span class="moon">${icon('moon')}</span>
      <div class="k">Tu gasto en ${esc(new Date().toLocaleDateString('es-MX', { month: 'long' }))}</div>
      <div class="v" id="heroAmount">${fmt(spent)}</div>
      <div class="meta"><span id="heroOwed"></span><span id="heroOwe"></span></div>`;
    ui.heroSpent = spent;
  }
  $('#heroOwed').textContent = `Te deben ${fmt(owedToMe)}`;
  $('#heroOwe').textContent = `Debes ${fmt(iOwe)}`;
  if (ui.heroSpent !== spent) {
    countUp($('#heroAmount'), ui.heroSpent || 0, spent);
    ui.heroSpent = spent;
    replay(hero, 'bump');
  }
}

function renderForm() {
  const f = ui.form;
  const t = TYPES[f.type];
  renderHero();

  $('#types').innerHTML = TYPE_ORDER.map((k) => `
    <button type="button" class="type" role="radio" data-type="${k}" aria-checked="${k === f.type}">
      ${icon(k)}${esc(TYPES[k].label)}
    </button>`).join('');

  // Tarjeta
  const cardField = $('[data-field="card"]');
  cardField.hidden = !t.card;
  $('#cardLabel').textContent = {
    cobro: '¿A qué cuenta te pagaron? (opcional)',
    meprestaron: '¿A qué cuenta te depositaron? (opcional)',
    preste: '¿De qué cuenta salió?',
    ingreso: '¿A qué cuenta entró? (opcional)',
  }[f.type] || '¿Con qué pagaste?';
  $('#cards').innerHTML = db.cards.map((c) => `
    <button type="button" class="chip" data-card="${esc(c.id)}" aria-pressed="${c.id === f.cardId}">
      <span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}
    </button>`).join('') || '<span class="muted">Agrega tarjetas en Ajustes.</span>';

  // Persona
  $('[data-field="person"]').hidden = !t.person;
  $('#personLabel').textContent = {
    prestado: '¿Por quién pagaste?',
    meprestaron: '¿Quién te prestó?',
    preste: '¿A quién le prestaste?',
    debo: '¿Quién pagó por ti?',
    cobro: '¿Quién te pagó?',
    pago: '¿A quién le pagaste?',
  }[f.type] || 'Persona';
  $('#peopleList').innerHTML = peopleBalances()
    .sort((a, b) => b.last.localeCompare(a.last))
    .map((p) => `<option value="${esc(p.name)}"></option>`).join('');

  // Monto que te deben
  $('[data-field="owed"]').hidden = f.type !== 'prestado';
  updateOwedHint();

  // Categoría
  $('[data-field="category"]').hidden = !t.category;
  $('#catLabel').textContent = f.type === 'prestado' ? 'Categoría (de tu parte)' : 'Categoría';
  $('#categories').innerHTML = CATEGORIES.map((c) => `
    <button type="button" class="chip" data-cat="${c.id}" aria-pressed="${c.id === f.category}">${icon(c.id)}${esc(c.name)}</button>`).join('');

  $('#editBanner').hidden = !ui.editingId;
  $('#delete').hidden = !ui.editingId;
  $('#save').textContent = ui.editingId ? 'Guardar cambios' : 'Guardar';
  if (!$('#date').value) $('#date').value = todayISO();
}

function updateOwedHint() {
  const amount = parseAmount($('#amount').value);
  const owedInput = $('#owed');
  const owed = parseAmount(owedInput.value);
  owedInput.placeholder = Number.isFinite(amount) ? `Todo (${fmt(amount)})` : 'Todo';
  const hint = $('#owedHint');
  if (!Number.isFinite(amount)) { hint.textContent = 'Si pagaste una cuenta compartida, pon solo la parte que te deben.'; return; }
  const effective = Number.isFinite(owed) ? owed : amount;
  if (effective > amount) { hint.innerHTML = '<span class="out">No puede ser mayor que el monto pagado.</span>'; return; }
  const mine = amount - effective;
  hint.textContent = mine > 0 ? `Tu parte: ${fmt(mine)} · Te deben: ${fmt(effective)}` : `Te deben todo: ${fmt(effective)}`;
}

function resetForm(keepType = true) {
  const type = keepType ? ui.form.type : 'gasto';
  ui.editingId = null;
  ui.form = { type, cardId: TYPES[type].card === 'required' ? (db.lastCardId && cardById(db.lastCardId) ? db.lastCardId : null) : null, category: null };
  $('#amount').value = '';
  $('#owed').value = '';
  $('#person').value = '';
  $('#note').value = '';
  $('#date').value = todayISO();
  $('#title').textContent = TITLES.nuevo;
}

function startEdit(id) {
  const m = db.movements.find((x) => x.id === id);
  if (!m) return;
  ui.editingId = id;
  ui.form = { type: m.type, cardId: m.cardId || null, category: m.category || null };
  $('#amount').value = m.amount;
  $('#owed').value = m.type === 'prestado' && m.owed != null && m.owed !== m.amount ? m.owed : '';
  $('#person').value = m.person || '';
  $('#note').value = m.note || '';
  $('#date').value = m.date;
  setTab('nuevo');
}

function prefillPayment(person, balance) {
  resetForm();
  ui.form.type = balance > 0 ? 'cobro' : 'pago';
  ui.form.cardId = ui.form.type === 'pago' ? (db.lastCardId && cardById(db.lastCardId) ? db.lastCardId : null) : null;
  $('#person').value = person;
  $('#amount').value = Math.abs(balance).toFixed(2);
  setTab('nuevo');
  toast(balance > 0 ? 'Registra lo que te pagaron' : 'Registra lo que pagaste');
}

function submitForm() {
  const f = ui.form;
  const t = TYPES[f.type];
  const amount = parseAmount($('#amount').value);
  if (!Number.isFinite(amount) || amount <= 0) { toast('Escribe un monto válido'); $('#amount').focus(); return; }
  if (t.card === 'required' && !f.cardId) { toast('Elige con qué pagaste'); return; }
  const person = $('#person').value.trim();
  if (t.person && !person) { toast('Escribe el nombre de la persona'); $('#person').focus(); return; }
  let owed = null;
  if (f.type === 'prestado') {
    const o = parseAmount($('#owed').value);
    owed = Number.isFinite(o) ? o : amount;
    if (owed <= 0 || owed > amount) { toast('Revisa cuánto te deben'); $('#owed').focus(); return; }
  }
  const date = $('#date').value || todayISO();

  // Si la persona ya existe con otra capitalización, reusa el nombre existente.
  let personName = person;
  if (t.person) {
    const existing = peopleBalances().find((p) => p.key === personKey(person));
    if (existing) personName = existing.name;
  }

  const record = {
    type: f.type,
    amount,
    cardId: t.card ? f.cardId : null,
    person: t.person ? personName : null,
    owed,
    category: t.category ? (f.category || 'otros') : null,
    note: $('#note').value.trim(),
    date,
  };

  const balanceBefore = t.person ? (peopleBalances().find((p) => p.key === personKey(personName))?.balance ?? 0) : 0;

  if (ui.editingId) {
    const idx = db.movements.findIndex((x) => x.id === ui.editingId);
    if (idx >= 0) db.movements[idx] = { ...db.movements[idx], ...record, updatedAt: Date.now() };
  } else {
    db.movements.push({ id: uid(), createdAt: Date.now(), ...record });
  }
  if (record.cardId) db.lastCardId = record.cardId;
  if (!save()) return;

  const wasEditing = !!ui.editingId;
  const balanceAfter = t.person ? (peopleBalances().find((p) => p.key === personKey(personName))?.balance ?? 0) : 0;
  const settled = t.person && balanceBefore !== 0 && balanceAfter === 0;
  const btn = $('#save').getBoundingClientRect();
  resetForm(false);
  renderForm();
  if (settled) {
    celebrate('tab_deudas', `¡A mano con ${personName}!`, 'Deuda saldada', true);
  } else if (wasEditing) {
    celebrate('check', 'Cambios guardados', '');
  } else {
    celebrate(TYPES[record.type].category && record.category ? record.category : record.type, '¡Guardado!', fmt(amount));
  }
  burst(btn.left + btn.width / 2, btn.top + btn.height / 2, { count: settled ? 40 : 16, spread: settled ? 190 : 110, size: [10, 18] });
  if (wasEditing) { setTab('movs'); return; }
  if (TYPES[record.type].flow === 'in') {
    // Entra dinero: el avión aterriza en tu tarjeta de inicio.
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => { if (ui.tab === 'nuevo') landOn($('#hero')); }, 450);
  } else {
    // Sale dinero: el avión despega desde el botón.
    takeoff(btn);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 900);
  }
}

function deleteCurrent() {
  if (!ui.editingId) return;
  if (!confirm('¿Eliminar este movimiento?')) return;
  db.movements = db.movements.filter((m) => m.id !== ui.editingId);
  save();
  resetForm();
  toast('Movimiento eliminado');
  setTab('movs');
}

/* ---------------- Movimientos ---------------- */

function movementRow(m, i = 0) {
  const t = TYPES[m.type] || { label: m.type, icon: '•', flow: 'none' };
  const cat = categoryById(m.category);
  const title = m.note || (m.person && m.type !== 'gasto' ? `${t.label}: ${m.person}` : cat?.name) || t.label;
  const cls = t.flow === 'out' ? 'out' : t.flow === 'in' ? 'in' : 'neutral';
  const sign = t.flow === 'out' ? '−' : t.flow === 'in' ? '+' : '';
  let sub = '';
  if (m.type === 'prestado') sub = `<small>te debe ${fmt(m.owed ?? m.amount)}</small>`;
  if (m.type === 'debo') sub = '<small>le debes</small>';
  const card = cardById(m.cardId);
  // Ruta del "vuelo": de dónde sale el dinero → a dónde va.
  const from = t.flow === 'in' ? (m.person || 'Ingreso') : (card?.name || (m.type === 'debo' ? m.person : 'Sin tarjeta'));
  const to = t.flow === 'in' ? (card?.name || 'Tu bolsillo') : (m.type === 'pago' || m.type === 'preste' ? m.person : (cat?.name || t.label));
  return `
    <button type="button" class="item" data-edit="${esc(m.id)}" style="--i:${i}">
      <span class="bubble">${icon(cat && t.category ? cat.id : m.type)}${card ? `<span class="dot" style="background:${esc(card.color)}"></span>` : ''}</span>
      <span class="main">
        <div class="t">${esc(title)}</div>
        <div class="s route"><span>${esc(from)}</span>${icon('avion', 'mini')}<span>${esc(to)}</span></div>
        ${title !== t.label ? `<div class="s">${esc([t.label, m.person].filter(Boolean).join(' · '))}</div>` : ''}
      </span>
      <span class="amt ${cls}"><small class="gate">${t.flow === 'in' ? 'LLEGADA' : t.flow === 'out' ? 'SALIDA' : 'PENDIENTE'}</small>${sign}${fmt(m.amount)}${sub}</span>
    </button>`;
}

function renderMovements() {
  renderMonthNavs();
  const sel = $('#filterCard');
  sel.innerHTML = `<option value="">Todas las tarjetas y cuentas</option>` +
    db.cards.map((c) => `<option value="${esc(c.id)}" ${c.id === ui.filterCard ? 'selected' : ''}>${esc(c.name)}</option>`).join('');

  const list = sortedMovements(db.movements.filter((m) =>
    monthOf(m.date) === ui.month && (!ui.filterCard || m.cardId === ui.filterCard)));

  if (!list.length) {
    $('#movList').innerHTML = `<div class="empty">${icon('avion')}<b>Pista despejada</b>No hay movimientos en ${esc(monthLabel(ui.month))}.</div>`;
    return;
  }
  const groups = new Map();
  for (const m of list) {
    if (!groups.has(m.date)) groups.set(m.date, []);
    groups.get(m.date).push(m);
  }
  $('#movList').innerHTML = Array.from(groups.entries()).map(([date, items]) => `
    <div class="day">${esc(dayLabel(date))}</div>
    <div class="passes">${items.map(movementRow).join('')}</div>`).join('');
}

/* ---------------- Deudas ---------------- */

const r2 = (v) => Math.round(v * 100) / 100;

// Cómo se ve cada movimiento en la lista de una persona (desde tu lado).
const DEBT_LABEL = { prestado: 'Pagué yo', debo: 'Pagó por mí', meprestaron: 'Me prestó', preste: 'Le presté', cobro: 'Me pagó', pago: 'Le pagué' };
// Y en el pase de abordar, que se le manda a esa persona.
const PASS_LABEL = { prestado: 'Pagué por ti', debo: 'Pagaste por mí', meprestaron: 'Me prestaste', preste: 'Te presté', cobro: 'Me pagaste', pago: 'Te pagué' };

// Solo lo pendiente: los movimientos desde la última vez que quedaron a mano.
function openItems(p) {
  const ms = db.movements
    .filter((m) => personKey(m.person) === p.key && debtDelta(m) !== 0)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0));
  let bal = 0, items = [];
  for (const m of ms) {
    bal = r2(bal + debtDelta(m));
    items.push({ m, d: r2(debtDelta(m)) });
    if (Math.abs(bal) < 0.005) items = [];
  }
  return items;
}

function conceptOf(m) {
  if (!m.note && (m.type === 'cobro' || m.type === 'pago')) return 'Abono';
  return m.note || categoryById(m.category)?.name || TYPES[m.type]?.label || '';
}

function shortDay(iso) {
  return dateOf(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '');
}

function debtCard(p, i) {
  const owesMe = p.balance > 0;
  const items = openItems(p);
  return `
    <article class="debt-card ${owesMe ? 'owes-me' : 'i-owe'}" style="--i:${i}">
      <div class="dc-head">
        <span class="avatar">${esc(p.name.charAt(0).toUpperCase())}</span>
        <div class="dc-name"><b>${esc(p.name)}</b><small>${owesMe ? 'te debe' : 'le debes'}</small></div>
        <div class="dc-amt">${fmt(Math.abs(p.balance))}</div>
      </div>
      <div class="dc-items">${items.map(({ m, d }) => `
        <button type="button" class="dc-item" data-edit="${esc(m.id)}">
          <span class="dc-date">${esc(shortDay(m.date))}</span>
          <span class="dc-what"><b>${esc(conceptOf(m))}</b><small>${esc(DEBT_LABEL[m.type] || '')}</small></span>
          <span class="dc-d ${(d > 0) === owesMe ? 'plus' : 'minus'}">${(d > 0) === owesMe ? '+' : '−'}${fmt(Math.abs(d))}</span>
        </button>`).join('')}</div>
      <div class="dc-actions">
        <button type="button" class="btn small" data-settle="${esc(p.name)}" data-balance="${p.balance}">${owesMe ? 'Me pagó' : 'Le pagué'}</button>
        <button type="button" class="btn small pass-btn" data-pass="${esc(p.key)}">${icon('avion', 'mini')} Pase de abordar</button>
      </div>
    </article>`;
}

function renderDebts() {
  const people = peopleBalances();
  const inList = people.filter((p) => p.balance > 0.004).sort((a, b) => b.balance - a.balance);
  const outList = people.filter((p) => p.balance < -0.004).sort((a, b) => a.balance - b.balance);
  const settled = people.filter((p) => Math.abs(p.balance) <= 0.004).sort((a, b) => b.last.localeCompare(a.last));
  const owedToMe = inList.reduce((s, p) => s + p.balance, 0);
  const iOwe = outList.reduce((s, p) => s - p.balance, 0);
  $('#debtTotals').innerHTML = `
    <div class="stat"><div class="k">Te deben</div><div class="v in">${fmt(owedToMe)}</div><small class="muted">${inList.length} persona${inList.length === 1 ? '' : 's'}</small></div>
    <div class="stat"><div class="k">Debes</div><div class="v out">${fmt(iOwe)}</div><small class="muted">${outList.length} persona${outList.length === 1 ? '' : 's'}</small></div>`;

  if (!people.length) {
    $('#debtList').innerHTML = `<div class="empty">${icon('tab_deudas')}<b>Sin deudas</b>Registra un préstamo con los botones de arriba, o usa “Pagué por alguien” al registrar un gasto.</div>`;
    return;
  }
  let i = 0;
  $('#debtList').innerHTML =
    (inList.length ? `<h2>Te deben</h2>${inList.map((p) => debtCard(p, i++)).join('')}` : '') +
    (outList.length ? `<h2>Les debes</h2>${outList.map((p) => debtCard(p, i++)).join('')}` : '') +
    (!inList.length && !outList.length ? `<div class="empty">${icon('avion')}<b>Cielo despejado</b>Estás a mano con todos.</div>` : '') +
    (settled.length ? `<details class="settled"><summary>A mano (${settled.length})</summary>
      <div class="list">${settled.map((p) => `<div class="item"><span class="main"><div class="t">${esc(p.name)}</div><div class="s">${p.count} movimiento${p.count === 1 ? '' : 's'}</div></span><span class="amt muted">a mano</span></div>`).join('')}</div>
    </details>` : '');
}

/* ---------------- Pase de abordar para compartir ---------------- */

function airportCode(name) {
  const clean = (name || '').normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase();
  return (clean + 'XXX').slice(0, 3);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Dibuja el pase en un canvas y lo devuelve.
function drawPass(p, myName) {
  const items = openItems(p);
  const owesMe = p.balance > 0;
  const shown = items.slice(-8);
  const W = 1080, rowH = 74;
  const H = 1180 + shown.length * rowH + (items.length > shown.length ? 50 : 0);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const F = (w, s) => `${w} ${s}px -apple-system, "SF Pro Rounded", system-ui, "Segoe UI", Roboto, sans-serif`;
  const MONO = (w, s) => `${w} ${s}px ui-monospace, "SF Mono", Menlo, monospace`;
  const ink = '#2f2850', muted = '#7b7398', accent = '#6c5fb8';

  // Fondo de cielo
  let g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f8dccf'); g.addColorStop(0.5, '#e6dcf5'); g.addColorStop(1, '#cfdff5');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 40; i++) { x.beginPath(); x.arc((i * 337) % W, (i * 211) % H, (i % 3) + 1.5, 0, Math.PI * 2); x.fill(); }

  // Tarjeta
  const cx = 60, cy = 70, cw = W - 120, ch = H - 140;
  x.save(); x.shadowColor = 'rgba(60,40,110,.25)'; x.shadowBlur = 40; x.shadowOffsetY = 14;
  roundRect(x, cx, cy, cw, ch, 40); x.fillStyle = '#fffdfb'; x.fill(); x.restore();

  // Franja superior
  x.save(); roundRect(x, cx, cy, cw, ch, 40); x.clip();
  g = x.createLinearGradient(cx, 0, cx + cw, 0); g.addColorStop(0, '#6c5fb8'); g.addColorStop(1, '#b46e9f');
  x.fillStyle = g; x.fillRect(cx, cy, cw, 130); x.restore();
  x.fillStyle = '#fff'; x.font = MONO('bold', 34); x.textBaseline = 'middle';
  x.fillText('PASE DE ABORDAR', cx + 50, cy + 66);
  x.textAlign = 'right'; x.fillText('MI CIELO ✈', cx + cw - 50, cy + 66); x.textAlign = 'left';

  // Ruta
  let y = cy + 200;
  const from = owesMe ? p.name : (myName || 'Yo');
  const to = owesMe ? (myName || 'Yo') : p.name;
  x.fillStyle = muted; x.font = MONO('bold', 26);
  x.fillText('DE', cx + 50, y); x.textAlign = 'right'; x.fillText('PARA', cx + cw - 50, y); x.textAlign = 'left';
  y += 62;
  x.fillStyle = ink; x.font = F('800', 96);
  x.fillText(airportCode(from), cx + 50, y); x.textAlign = 'right'; x.fillText(airportCode(to), cx + cw - 50, y); x.textAlign = 'left';
  x.strokeStyle = 'rgba(108,95,184,.45)'; x.setLineDash([14, 12]); x.lineWidth = 4;
  x.beginPath(); x.moveTo(cx + 290, y); x.lineTo(cx + cw - 290, y); x.stroke(); x.setLineDash([]);
  x.font = F('400', 72); x.textAlign = 'center'; x.fillStyle = accent; x.fillText('✈', W / 2, y - 4); x.textAlign = 'left';
  y += 58;
  x.fillStyle = muted; x.font = F('600', 30);
  x.fillText(from, cx + 50, y); x.textAlign = 'right'; x.fillText(to, cx + cw - 50, y); x.textAlign = 'left';

  // Campos
  y += 80;
  const today = new Date();
  const fields = [['PASAJERO', p.name], ['FECHA', today.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '').toUpperCase()], ['VUELO', `MC${String(Math.abs(Math.round(p.balance))).padStart(4, '0').slice(-4)}`]];
  const fw = (cw - 100) / 3;
  fields.forEach(([k, v], i) => {
    x.fillStyle = muted; x.font = MONO('bold', 24); x.fillText(k, cx + 50 + i * fw, y);
    x.fillStyle = ink; x.font = F('700', 34); x.fillText(v.length > 14 ? v.slice(0, 13) + '…' : v, cx + 50 + i * fw, y + 46);
  });

  // Monto
  y += 120;
  roundRect(x, cx + 40, y, cw - 80, 190, 28);
  g = x.createLinearGradient(cx, y, cx + cw, y + 190); g.addColorStop(0, '#efeafc'); g.addColorStop(1, '#fbe7ef');
  x.fillStyle = g; x.fill();
  x.fillStyle = accent; x.font = MONO('bold', 30); x.textAlign = 'center';
  x.fillText(owesMe ? 'ME DEBES' : 'TE DEBO', W / 2, y + 52);
  x.fillStyle = ink; x.font = F('800', 92); x.fillText(fmt(Math.abs(p.balance)), W / 2, y + 128);
  x.textAlign = 'left';

  // Detalle
  y += 250;
  x.fillStyle = muted; x.font = MONO('bold', 26); x.fillText('DETALLE', cx + 50, y);
  y += 30;
  if (items.length > shown.length) {
    x.fillStyle = muted; x.font = F('500', 26);
    x.fillText(`… y ${items.length - shown.length} movimiento${items.length - shown.length === 1 ? '' : 's'} antes`, cx + 50, y + 24);
    y += 50;
  }
  for (const { m, d } of shown) {
    x.strokeStyle = 'rgba(108,95,184,.15)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx + 50, y); x.lineTo(cx + cw - 50, y); x.stroke();
    x.fillStyle = muted; x.font = F('600', 26); x.fillText(shortDay(m.date), cx + 50, y + 45);
    let what = conceptOf(m);
    x.fillStyle = ink; x.font = F('600', 30);
    const maxW = cw - 520;
    while (x.measureText(what).width > maxW && what.length > 4) what = what.slice(0, -2);
    if (what !== conceptOf(m)) what += '…';
    x.fillText(what, cx + 180, y + 34);
    x.fillStyle = muted; x.font = F('500', 22); x.fillText(PASS_LABEL[m.type] || '', cx + 180, y + 62);
    const iOweLine = (d > 0) !== owesMe;
    x.fillStyle = iOweLine ? '#2f7d62' : ink; x.font = F('700', 30); x.textAlign = 'right';
    x.fillText(`${iOweLine ? '−' : '+'}${fmt(Math.abs(d))}`, cx + cw - 50, y + 45); x.textAlign = 'left';
    y += rowH;
  }

  // Perforación y talón
  y += 40;
  x.strokeStyle = 'rgba(108,95,184,.35)'; x.setLineDash([12, 10]); x.lineWidth = 3;
  x.beginPath(); x.moveTo(cx + 40, y); x.lineTo(cx + cw - 40, y); x.stroke(); x.setLineDash([]);
  g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f8dccf'); g.addColorStop(0.5, '#e6dcf5'); g.addColorStop(1, '#cfdff5');
  x.fillStyle = g;
  x.beginPath(); x.arc(cx, y, 26, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(cx + cw, y, 26, 0, Math.PI * 2); x.fill();
  y += 50;
  x.fillStyle = ink;
  let bx = cx + 50;
  const pattern = [3, 6, 2, 8, 3, 3, 5, 2, 7, 3, 2, 6, 4, 2, 3, 8, 2, 5];
  for (let i = 0; bx < cx + cw - 470; i++) { const w = pattern[i % pattern.length]; if (i % 2 === 0) x.fillRect(bx, y, w, 80); bx += w + 3; }
  x.fillStyle = accent; x.font = F('700', 28); x.textAlign = 'right';
  x.fillText(owesMe ? 'Sin prisa, ¡buen vuelo!' : '¡Gracias por el aventón!', cx + cw - 50, y + 32);
  x.fillStyle = muted; x.font = F('500', 24);
  x.fillText('Hecho con Mi cielo ✦', cx + cw - 50, y + 70);
  x.textAlign = 'left';
  return c;
}

function passSheet(key) {
  const p = peopleBalances().find((x) => x.key === key);
  if (!p) return;
  const st = { myName: settings.data.myName || '' };
  const sheet = openSheet(`
    <h3>Pase de abordar para ${esc(p.name)}</h3>
    <div class="field"><label class="label" for="myName">Tu nombre (aparece en el pase)</label><input id="myName" value="${esc(st.myName)}" placeholder="Opcional" autocomplete="off"></div>
    <img class="pass-preview" id="passImg" alt="Vista previa del pase">
    <button type="button" class="btn primary" id="sharePass">Compartir</button>
    <button type="button" class="btn" id="savePass">Descargar imagen</button>`);
  let canvas;
  const paint = () => { canvas = drawPass(p, st.myName.trim()); $('#passImg', sheet).src = canvas.toDataURL('image/png'); };
  paint();
  let t;
  $('#myName', sheet).addEventListener('input', (e) => {
    st.myName = e.target.value;
    clearTimeout(t);
    t = setTimeout(() => { settings.data.myName = st.myName.trim(); settings.save(); paint(); }, 300);
  });
  const filename = `pase-${airportCode(p.name).toLowerCase()}-${todayISO()}.png`;
  const text = p.balance > 0 ? `${p.name}, aquí va el detalle de lo que me debes: ${fmt(p.balance)} ✈` : `${p.name}, aquí va el detalle de lo que te debo: ${fmt(-p.balance)} ✈`;
  $('#sharePass', sheet).addEventListener('click', () => {
    canvas.toBlob(async (blob) => {
      const file = new File([blob], filename, { type: 'image/png' });
      try {
        if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      } catch (e) { if (e.name === 'AbortError') return; }
      download(filename, blob, 'image/png');
      toast('Imagen descargada');
    }, 'image/png');
  });
  $('#savePass', sheet).addEventListener('click', () => {
    canvas.toBlob((blob) => { download(filename, blob, 'image/png'); toast('Imagen descargada'); }, 'image/png');
  });
}

/* ---------------- Resumen ---------------- */

function renderSummary() {
  renderMonthNavs();
  const ms = db.movements.filter((m) => monthOf(m.date) === ui.month);

  const personal = ms.reduce((s, m) => s + personalExpense(m), 0);
  const income = ms.filter((m) => m.type === 'ingreso').reduce((s, m) => s + m.amount, 0);
  const repaid = ms.filter((m) => m.type === 'cobro').reduce((s, m) => s + m.amount, 0);
  const lentOut = ms.filter((m) => m.type === 'prestado').reduce((s, m) => s + (m.owed ?? m.amount), 0);

  // Lo que salió de cada tarjeta/cuenta
  const byCard = new Map();
  for (const m of ms) {
    if (TYPES[m.type]?.flow !== 'out' || !m.cardId) continue;
    byCard.set(m.cardId, (byCard.get(m.cardId) || 0) + m.amount);
  }
  const cardRows = Array.from(byCard.entries()).sort((a, b) => b[1] - a[1]);
  const cardMax = Math.max(1, ...cardRows.map((r) => r[1]));

  // Gasto personal por categoría
  const byCat = new Map();
  for (const m of ms) {
    const v = personalExpense(m);
    if (v <= 0) continue;
    const k = m.category || 'otros';
    byCat.set(k, (byCat.get(k) || 0) + v);
  }
  const catRows = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]);
  const catMax = Math.max(1, ...catRows.map((r) => r[1]));

  const bar = (label, value, max, color) => `
    <div class="bar">
      <div class="top"><span>${label}</span><span>${fmt(value)}</span></div>
      <div class="track"><div class="fill" style="width:${(value / max * 100).toFixed(1)}%;${color ? `background:${esc(color)}` : ''}"></div></div>
    </div>`;

  if (!ms.length) {
    $('#summary').innerHTML = `<div class="empty">${icon('avion')}<b>Pista despejada</b>Sin movimientos en ${esc(monthLabel(ui.month))}.</div>`;
    return;
  }

  const outs = ms.filter((m) => TYPES[m.type]?.flow === 'out');
  const ins = ms.filter((m) => TYPES[m.type]?.flow === 'in');
  const cardUse = new Map();
  for (const m of ms) if (m.cardId) cardUse.set(m.cardId, (cardUse.get(m.cardId) || 0) + 1);
  const favCard = Array.from(cardUse.entries()).sort((a, b) => b[1] - a[1])[0];
  const topCat = catRows[0] ? (categoryById(catRows[0][0]) || { name: catRows[0][0] }) : null;
  const fuel = outs.reduce((s, m) => s + m.amount, 0);
  const [y, mo] = ui.month.split('-').map(Number);
  const logMonth = new Date(y, mo - 1, 1).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }).replace('.', '').toUpperCase();

  $('#summary').innerHTML = `
    <div class="logbook">
      <div class="lb-head"><span>${icon('avion')}BITÁCORA DE VUELO</span><span>${esc(logMonth)}</span></div>
      <div class="lb-row"><span>Despegues <em>(salidas de dinero)</em></span><b>${outs.length}</b></div>
      <div class="lb-row"><span>Aterrizajes <em>(entradas)</em></span><b>${ins.length}</b></div>
      <div class="lb-row"><span>Combustible usado</span><b>${fmt(fuel)}</b></div>
      <div class="lb-row"><span>Ruta más volada</span><b>${topCat ? esc(topCat.name) : '—'}</b></div>
      <div class="lb-row"><span>Avión favorito</span><b>${favCard ? esc(cardName(favCard[0])) : '—'}</b></div>
      <div class="lb-sign">Capitán(a) de tus finanzas ✦</div>
    </div>
    <div class="totals">
      <div class="stat wide"><div class="k">Tu gasto personal</div><div class="v">${fmt(personal)}</div></div>
      <div class="stat"><div class="k">Ingresos</div><div class="v in">${fmt(income)}</div></div>
      <div class="stat"><div class="k">Prestado este mes</div><div class="v neutral">${fmt(lentOut)}</div></div>
      ${repaid ? `<div class="stat wide"><div class="k">Te devolvieron este mes</div><div class="v in">${fmt(repaid)}</div></div>` : ''}
    </div>
    <h2>Salió de cada tarjeta</h2>
    <div class="bars">${cardRows.length ? cardRows.map(([id, v]) => {
      const c = cardById(id);
      return bar(esc(c?.name || 'Tarjeta eliminada') + (c?.kind === 'credito' ? ' <span class="muted small">(a pagar)</span>' : ''), v, cardMax, c?.color);
    }).join('') : '<div class="empty" style="padding:16px">Sin pagos con tarjeta.</div>'}</div>
    <h2>Gasto personal por categoría</h2>
    <div class="bars">${catRows.length ? catRows.map(([id, v]) => {
      const c = categoryById(id) || { id: 'otros', name: id };
      return bar(`${icon(c.id)}${esc(c.name)}`, v, catMax);
    }).join('') : '<div class="empty" style="padding:16px">Sin gastos personales.</div>'}</div>`;
}


/* ---------------- Ajustes ---------------- */

function renderSettings() {
  $('#cardAdmin').innerHTML = `<div class="list">${db.cards.map((c) => `
    <div class="card-row" data-card-row="${esc(c.id)}">
      <input type="color" value="${esc(c.color)}" data-card-color aria-label="Color">
      <input type="text" value="${esc(c.name)}" data-card-name aria-label="Nombre">
      <select data-card-kind aria-label="Tipo">
        <option value="debito" ${c.kind === 'debito' ? 'selected' : ''}>Débito</option>
        <option value="credito" ${c.kind === 'credito' ? 'selected' : ''}>Crédito</option>
        <option value="efectivo" ${c.kind === 'efectivo' ? 'selected' : ''}>Efectivo</option>
        <option value="otra" ${c.kind === 'otra' ? 'selected' : ''}>Otra</option>
      </select>
      <button type="button" class="icon-btn" data-card-del aria-label="Eliminar">×</button>
    </div>`).join('') || '<div class="empty">Sin tarjetas.</div>'}</div>`;
}

function exportCsv() {
  const head = ['fecha', 'tipo', 'monto', 'tarjeta', 'persona', 'te_deben', 'tu_gasto', 'categoria', 'nota'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = sortedMovements(db.movements).reverse().map((m) => [
    m.date, TYPES[m.type]?.label || m.type, m.amount.toFixed(2), cardName(m.cardId), m.person || '',
    m.type === 'prestado' ? (m.owed ?? m.amount).toFixed(2) : '',
    personalExpense(m).toFixed(2), categoryById(m.category)?.name || '', m.note || '',
  ].map(q).join(','));
  download(`finanzas-${todayISO()}.csv`, '\ufeff' + [head.join(','), ...rows].join('\n'), 'text/csv');
}

/* ---------------- Eventos ---------------- */

function bind() {
  $('#tabbar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) setTab(b.dataset.tab);
  });

  $('#types').addEventListener('click', (e) => {
    const b = e.target.closest('[data-type]');
    if (!b) return;
    const prev = ui.form.type;
    ui.form.type = b.dataset.type;
    const t = TYPES[ui.form.type];
    if (!t.card) ui.form.cardId = null;
    else if (t.card === 'required' && !ui.form.cardId && db.lastCardId && cardById(db.lastCardId)) ui.form.cardId = db.lastCardId;
    else if (t.card === 'optional' && TYPES[prev].card === 'required') ui.form.cardId = null;
    if (!t.category) ui.form.category = null;
    renderForm();
    replay($(`#types [data-type="${ui.form.type}"]`), 'just');
  });

  $('#cards').addEventListener('click', (e) => {
    const b = e.target.closest('[data-card]');
    if (!b) return;
    const id = b.dataset.card;
    ui.form.cardId = ui.form.cardId === id && TYPES[ui.form.type].card === 'optional' ? null : id;
    renderForm();
    replay($(`#cards [data-card="${CSS.escape(id)}"]`), 'just');
  });

  $('#categories').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    ui.form.category = ui.form.category === b.dataset.cat ? null : b.dataset.cat;
    renderForm();
    replay($(`#categories [data-cat="${b.dataset.cat}"]`), 'just');
  });

  $('#amount').addEventListener('input', updateOwedHint);
  $('#owed').addEventListener('input', updateOwedHint);
  $$('[data-owed]').forEach((b) => b.addEventListener('click', () => {
    const amount = parseAmount($('#amount').value);
    if (!Number.isFinite(amount)) { toast('Primero escribe el monto'); return; }
    $('#owed').value = b.dataset.owed === 'half' ? (amount / 2).toFixed(2) : '';
    updateOwedHint();
  }));

  $('#save').addEventListener('click', submitForm);
  $('#delete').addEventListener('click', deleteCurrent);
  $('#cancelEdit').addEventListener('click', () => { const back = !!ui.editingId; resetForm(); renderForm(); if (back) setTab('movs'); });

  document.addEventListener('click', (e) => {
    const shift = e.target.closest('[data-shift]');
    if (shift) {
      const next = shiftMonth(ui.month, Number(shift.dataset.shift));
      if (next <= monthOf(todayISO())) { ui.month = next; render(); }
      return;
    }
    const edit = e.target.closest('[data-edit]');
    if (edit) {
      if (edit.tagName === 'SUMMARY') return;
      startEdit(edit.dataset.edit);
      return;
    }
    const nd = e.target.closest('[data-newdebt]');
    if (nd) {
      resetForm(false);
      ui.form.type = nd.dataset.newdebt;
      if (TYPES[ui.form.type].card === 'required') ui.form.cardId = db.lastCardId && cardById(db.lastCardId) ? db.lastCardId : null;
      setTab('nuevo');
      replay($(`#types [data-type="${ui.form.type}"]`), 'just');
      setTimeout(() => $('#amount').focus(), 350);
      return;
    }
    const pass = e.target.closest('[data-pass]');
    if (pass) { passSheet(pass.dataset.pass); return; }
    const settle = e.target.closest('[data-settle]');
    if (settle) prefillPayment(settle.dataset.settle, Number(settle.dataset.balance));
  });

  $('#filterCard').addEventListener('change', (e) => { ui.filterCard = e.target.value; renderMovements(); });

  // Administrar tarjetas
  $('#cardAdmin').addEventListener('change', (e) => {
    const row = e.target.closest('[data-card-row]');
    if (!row) return;
    const c = cardById(row.dataset.cardRow);
    if (!c) return;
    if (e.target.matches('[data-card-name]')) c.name = e.target.value.trim() || c.name;
    if (e.target.matches('[data-card-kind]')) c.kind = e.target.value;
    if (e.target.matches('[data-card-color]')) c.color = e.target.value;
    save();
    toast('Tarjeta actualizada');
  });
  $('#cardAdmin').addEventListener('click', (e) => {
    const del = e.target.closest('[data-card-del]');
    if (!del) return;
    const id = del.closest('[data-card-row]').dataset.cardRow;
    const used = db.movements.filter((m) => m.cardId === id).length;
    const msg = used
      ? `Esta tarjeta tiene ${used} movimiento${used === 1 ? '' : 's'}. Se conservarán pero aparecerán como “Tarjeta eliminada”. ¿Eliminarla?`
      : '¿Eliminar esta tarjeta?';
    if (!confirm(msg)) return;
    db.cards = db.cards.filter((c) => c.id !== id);
    if (db.lastCardId === id) db.lastCardId = null;
    if (ui.form.cardId === id) ui.form.cardId = null;
    save();
    renderSettings();
  });
  $('#addCard').addEventListener('click', () => {
    const name = prompt('Nombre de la tarjeta o cuenta (ej. Crédito Nu):');
    if (!name || !name.trim()) return;
    const palette = ['#0f766e', '#b45309', '#be185d', '#4338ca', '#0369a1', '#4d7c0f'];
    db.cards.push({ id: uid(), name: name.trim(), kind: /cr[eé]dito/i.test(name) ? 'credito' : 'debito', color: palette[db.cards.length % palette.length] });
    save();
    renderSettings();
  });

  $('#exportCsv').addEventListener('click', exportCsv);
}

/* ---------------- Inicio ---------------- */

function init() {
  // Primera vez: guardar tarjetas por defecto.
  if (!localStorage.getItem(STORAGE_KEY)) save();
  for (const b of $$('#tabbar [data-tab]')) b.querySelector('svg').outerHTML = icon(`tab_${b.dataset.tab}`);
  initPage();
  bind();
  resetForm(false);
  setTab('nuevo');
  setTimeout(() => landOn($('#hero')), 700);
}

init();
