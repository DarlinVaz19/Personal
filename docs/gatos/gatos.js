'use strict';

/* Gatos: pasaporte felino, salud y veterinario, peso y compras. */

const store = createStore('gatos.v1', () => ({ cats: [], health: [], weights: [], supplies: [] }));

const HEALTH = {
  vacuna: { name: 'Vacuna', icon: 'vacuna' },
  desparasitacion: { name: 'Desparasitación', icon: 'pastilla' },
  veterinario: { name: 'Veterinario', icon: 'salud' },
  medicina: { name: 'Medicina', icon: 'medicina' },
};
const SUPPLY = {
  comida: { name: 'Comida', icon: 'plato' },
  arena: { name: 'Arena', icon: 'arena' },
  premios: { name: 'Premios', icon: 'premio' },
  otro: { name: 'Otro', icon: 'huella' },
};

const ui = { catId: null, tab: 'salud' };

const catById = (id) => store.data.cats.find((c) => c.id === id);
const byDateDesc = (a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0);

function ageText(birth) {
  if (!birth) return '—';
  const b = dateOf(birth), n = new Date();
  let months = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
  if (n.getDate() < b.getDate()) months--;
  if (months < 0) return '—';
  const y = Math.floor(months / 12), m = months % 12;
  if (!y) return `${m} mes${m === 1 ? '' : 'es'}`;
  return `${y} año${y === 1 ? '' : 's'}${m ? ` ${m} m` : ''}`;
}

function lastWeight(catId) {
  return store.data.weights.filter((w) => w.catId === catId).sort(byDateDesc)[0];
}

function dueBadge(next) {
  const d = daysBetween(todayISO(), next);
  if (d < 0) return `<span class="badge late">venció hace ${-d} día${d === -1 ? '' : 's'}</span>`;
  if (d === 0) return '<span class="badge soon">¡hoy!</span>';
  if (d <= 14) return `<span class="badge soon">en ${d} día${d === 1 ? '' : 's'}</span>`;
  return `<span class="badge">${esc(shortDate(next))}</span>`;
}

// Zona "legible por máquina" del pasaporte, solo decorativa.
function mrz(cat) {
  const clean = (s) => (s || '').normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase();
  const l1 = `P<GATO<${clean(cat.name)}<<${clean(cat.breed)}`.padEnd(32, '<').slice(0, 32);
  const b = cat.birth ? cat.birth.replace(/-/g, '').slice(2) : '000000';
  const l2 = `${clean(cat.name).slice(0, 4).padEnd(4, '<')}${b}${cat.sex === 'macho' ? 'M' : cat.sex === 'hembra' ? 'F' : '<'}<MICIELO`.padEnd(32, '<').slice(0, 32);
  return `${l1}<br>${l2}`;
}

function passport(cat, { big = false } = {}) {
  const w = lastWeight(cat.id);
  return `
    <article class="passport ${big ? 'big' : ''}" data-cat="${esc(cat.id)}">
      <div class="pp-head"><span>PASAPORTE FELINO</span><span>${icon('avion', 'mini')} MI CIELO</span></div>
      <div class="pp-body">
        <div class="pp-photo">${cat.photo ? `<img src="${cat.photo}" alt="">` : icon('mod_gatos')}</div>
        <div class="pp-fields">
          <div class="pp-name">${esc(cat.name)}</div>
          <div class="pp-grid">
            <div><small>EDAD</small><b>${esc(ageText(cat.birth))}</b></div>
            <div><small>PESO</small><b>${w ? `${w.kg} kg` : '—'}</b></div>
            <div><small>RAZA</small><b>${esc(cat.breed || '—')}</b></div>
            <div><small>COLOR</small><b>${esc(cat.color || '—')}</b></div>
            ${big ? `<div><small>NACIMIENTO</small><b>${cat.birth ? esc(shortDate(cat.birth)) : '—'}</b></div>
            <div><small>SEXO</small><b>${cat.sex === 'macho' ? 'Macho' : cat.sex === 'hembra' ? 'Hembra' : '—'}</b></div>` : ''}
          </div>
        </div>
      </div>
      ${big && cat.notes ? `<p class="pp-notes">${esc(cat.notes)}</p>` : ''}
      <div class="pp-mrz">${mrz(cat)}</div>
    </article>`;
}

/* ---------------- Vistas ---------------- */

function renderList() {
  $('#title').textContent = 'Gatos';
  const cats = store.data.cats;
  if (!cats.length) {
    $('#view').innerHTML = `<div class="empty">${icon('mod_gatos')}<b>Tu primer pasaporte felino</b>Toca + para agregar a tu gatito.</div>`;
    return;
  }
  const today = todayISO();
  const upcoming = store.data.health
    .filter((h) => h.next && daysBetween(today, h.next) <= 45 && catById(h.catId))
    .sort((a, b) => a.next.localeCompare(b.next)).slice(0, 6);
  $('#view').innerHTML = `
    ${upcoming.length ? `<h2>Próximos cuidados</h2>
    <div class="list">${upcoming.map((h, i) => `
      <button type="button" class="item" data-open-cat="${esc(h.catId)}" data-tab-go="salud" style="--i:${i}">
        <span class="bubble">${icon(HEALTH[h.type]?.icon || 'salud')}</span>
        <span class="main"><div class="t">${esc(h.title || HEALTH[h.type]?.name)}</div><div class="s">${esc(catById(h.catId).name)}${h.title ? ' · ' + esc(HEALTH[h.type]?.name || '') : ''}</div></span>
        ${dueBadge(h.next)}
      </button>`).join('')}</div>` : ''}
    <h2>Pasaportes</h2>
    <div class="passports">${cats.map((c) => passport(c)).join('')}</div>`;
}

function weightChart(ws) {
  if (ws.length < 2) return '';
  const pts = ws.slice().sort((a, b) => a.date.localeCompare(b.date));
  const W = 320, H = 130, P = 18;
  const min = Math.min(...pts.map((p) => p.kg)), max = Math.max(...pts.map((p) => p.kg));
  const span = Math.max(0.2, max - min);
  const t0 = dateOf(pts[0].date).getTime(), t1 = dateOf(pts[pts.length - 1].date).getTime();
  const x = (d) => P + ((dateOf(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - P * 2);
  const y = (kg) => H - P - ((kg - min) / span) * (H - P * 2);
  const line = pts.map((p) => `${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');
  const area = `${P},${H - P} ${line} ${W - P},${H - P}`;
  return `
    <div class="card chart">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="Peso en el tiempo">
        <polygon points="${area}" class="chart-area"/>
        <polyline points="${line}" class="chart-line"/>
        ${pts.map((p) => `<circle cx="${x(p.date).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="4" class="chart-dot"/>`).join('')}
      </svg>
      <div class="chart-legend"><span>mín ${min} kg</span><span>máx ${max} kg</span></div>
    </div>`;
}

function renderDetail() {
  const cat = catById(ui.catId);
  if (!cat) { ui.catId = null; render(); return; }
  $('#title').textContent = cat.name;
  const tabs = [['salud', 'Salud', 'salud'], ['peso', 'Peso', 'bascula'], ['compras', 'Compras', 'plato']];
  let body = '';

  if (ui.tab === 'salud') {
    const items = store.data.health.filter((h) => h.catId === cat.id).sort(byDateDesc);
    body = items.length ? `<div class="list">${items.map((h, i) => `
      <button type="button" class="item" data-edit-health="${esc(h.id)}" style="--i:${i}">
        <span class="bubble">${icon(HEALTH[h.type]?.icon || 'salud')}</span>
        <span class="main"><div class="t">${esc(h.title || HEALTH[h.type]?.name)}</div>
          <div class="s">${esc(HEALTH[h.type]?.name || '')} · ${esc(shortDate(h.date))}${h.note ? ' · ' + esc(h.note) : ''}</div></span>
        ${h.next ? `<span class="next"><small>PRÓXIMA</small>${dueBadge(h.next)}</span>` : ''}
      </button>`).join('')}</div>`
      : `<div class="empty">${icon('vacuna')}<b>Sin registros de salud</b>Agrega vacunas, desparasitaciones, visitas o medicinas con +.</div>`;
  }
  if (ui.tab === 'peso') {
    const ws = store.data.weights.filter((w) => w.catId === cat.id).sort(byDateDesc);
    const diff = ws.length >= 2 ? Math.round((ws[0].kg - ws[1].kg) * 100) / 100 : null;
    body = ws.length ? `
      <div class="totals">
        <div class="stat"><div class="k">Último peso</div><div class="v">${ws[0].kg} kg</div></div>
        <div class="stat"><div class="k">Cambio</div><div class="v ${diff > 0 ? 'neutral' : diff < 0 ? 'in' : ''}">${diff === null ? '—' : `${diff > 0 ? '+' : ''}${diff} kg`}</div></div>
      </div>
      ${weightChart(ws)}
      <div class="list" style="margin-top:14px">${ws.map((w, i) => `
        <button type="button" class="item" data-edit-weight="${esc(w.id)}" style="--i:${i}">
          <span class="bubble">${icon('bascula')}</span>
          <span class="main"><div class="t">${w.kg} kg</div><div class="s">${esc(shortDate(w.date))}</div></span>
        </button>`).join('')}</div>`
      : `<div class="empty">${icon('bascula')}<b>Sin pesos todavía</b>Registra su peso con + para ver cómo cambia.</div>`;
  }
  if (ui.tab === 'compras') {
    const ss = store.data.supplies.filter((s) => s.catId === cat.id).sort(byDateDesc);
    const ym = monthOf(todayISO());
    const month = ss.filter((s) => monthOf(s.date) === ym).reduce((a, s) => a + (s.amount || 0), 0);
    body = ss.length ? `
      <div class="totals"><div class="stat wide"><div class="k">Gastado este mes en ${esc(cat.name)}</div><div class="v">${fmt(month)}</div></div></div>
      <div class="list">${ss.map((s, i) => `
        <button type="button" class="item" data-edit-supply="${esc(s.id)}" style="--i:${i}">
          <span class="bubble">${icon(SUPPLY[s.type]?.icon || 'huella')}</span>
          <span class="main"><div class="t">${esc(s.brand || SUPPLY[s.type]?.name)}</div><div class="s">${esc(SUPPLY[s.type]?.name || '')} · ${esc(shortDate(s.date))}</div></span>
          <span class="amt">${s.amount ? fmt(s.amount) : ''}</span>
        </button>`).join('')}</div>`
      : `<div class="empty">${icon('plato')}<b>Sin compras registradas</b>Anota la comida, arena o premios que compras con +.</div>`;
  }

  $('#view').innerHTML = `
    <button type="button" class="link back" data-back>‹ Todos los gatos</button>
    ${passport(cat, { big: true })}
    <button type="button" class="btn small edit-cat" data-edit-cat>Editar pasaporte</button>
    <div class="segmented">${tabs.map(([id, name, ic]) =>
      `<button type="button" data-tab="${id}" aria-pressed="${ui.tab === id}">${icon(ic)}${name}</button>`).join('')}</div>
    <div class="view-body enter">${body}</div>`;
}

function render() {
  if (ui.catId) renderDetail(); else renderList();
}

/* ---------------- Formularios ---------------- */

function catSheet(id) {
  const c = id ? catById(id) : null;
  const st = { photo: c?.photo || null, sex: c?.sex || null };
  const sheet = openSheet(`
    <h3>${c ? 'Editar pasaporte' : 'Nuevo gatito'}</h3>
    <div class="photo-pick">
      <button type="button" class="pp-photo big-pick" id="pickPhoto" aria-label="Elegir foto"></button>
      <input type="file" id="catPhoto" accept="image/*" hidden>
      <span class="muted small">Toca para elegir una foto</span>
    </div>
    <div class="field"><label class="label" for="cName">Nombre</label><input id="cName" value="${esc(c?.name || '')}" placeholder="Ej. Michi" autocomplete="off"></div>
    <div class="two">
      <div class="field"><label class="label" for="cBirth">Nacimiento</label><input id="cBirth" type="date" value="${esc(c?.birth || '')}"></div>
      <div class="field"><div class="label">Sexo</div><div class="chips" id="cSex"></div></div>
    </div>
    <div class="two">
      <div class="field"><label class="label" for="cBreed">Raza</label><input id="cBreed" value="${esc(c?.breed || '')}" placeholder="Ej. Mestizo" autocomplete="off"></div>
      <div class="field"><label class="label" for="cColor">Color</label><input id="cColor" value="${esc(c?.color || '')}" placeholder="Ej. Atigrado" autocomplete="off"></div>
    </div>
    <div class="field"><label class="label" for="cNotes">Notas</label><textarea id="cNotes" placeholder="Alergias, carácter, chip…">${esc(c?.notes || '')}</textarea></div>
    <button type="button" class="btn primary" id="saveCat">${c ? 'Guardar cambios' : 'Crear pasaporte'}</button>
    ${c ? '<button type="button" class="btn danger" id="delCat">Eliminar gatito y sus registros</button>' : ''}`);

  const paint = () => {
    $('#pickPhoto', sheet).innerHTML = st.photo ? `<img src="${st.photo}" alt="">` : icon('mod_gatos');
    $('#cSex', sheet).innerHTML = [['hembra', 'Hembra'], ['macho', 'Macho']].map(([v, n]) =>
      `<button type="button" class="chip" data-sex="${v}" aria-pressed="${st.sex === v}">${n}</button>`).join('');
  };
  paint();

  $('#catPhoto', sheet).addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { st.photo = await resizeImage(f, 480, 0.8); paint(); } catch (err) { alert('No se pudo abrir esa imagen.'); }
  });
  sheet.addEventListener('click', (e) => {
    if (e.target.closest('#pickPhoto')) { $('#catPhoto', sheet).click(); return; }
    const sx = e.target.closest('[data-sex]');
    if (sx) { st.sex = st.sex === sx.dataset.sex ? null : sx.dataset.sex; paint(); return; }
    if (e.target.closest('#saveCat')) {
      const name = $('#cName', sheet).value.trim();
      if (!name) { toast('Escribe su nombre'); return; }
      const data = { name, birth: $('#cBirth', sheet).value || null, sex: st.sex, breed: $('#cBreed', sheet).value.trim(), color: $('#cColor', sheet).value.trim(), notes: $('#cNotes', sheet).value.trim(), photo: st.photo };
      let isNew = false;
      if (c) Object.assign(c, data);
      else { const nc = { id: uid(), createdAt: Date.now(), ...data }; store.data.cats.push(nc); isNew = true; }
      if (!store.save()) return;
      closeSheet();
      render();
      if (isNew) celebrate('mod_gatos', `¡Hola, ${name}!`, 'Pasaporte felino listo', true);
      else toast('Pasaporte actualizado');
      return;
    }
    if (e.target.closest('#delCat')) {
      if (!confirm(`¿Eliminar a ${c.name} y todos sus registros?`)) return;
      store.data.cats = store.data.cats.filter((x) => x.id !== c.id);
      for (const k of ['health', 'weights', 'supplies']) store.data[k] = store.data[k].filter((x) => x.catId !== c.id);
      store.save();
      ui.catId = null;
      closeSheet();
      render();
      toast('Eliminado');
    }
  });
}

function healthSheet(id) {
  const h = id ? store.data.health.find((x) => x.id === id) : null;
  const st = { type: h?.type || 'vacuna' };
  const sheet = openSheet(`
    <h3>${h ? 'Editar cuidado' : 'Nuevo cuidado'}</h3>
    <div class="field"><div class="label">Tipo</div><div class="chips" id="hType"></div></div>
    <div class="field"><label class="label" for="hTitle">Detalle</label><input id="hTitle" value="${esc(h?.title || '')}" placeholder="Ej. Triple felina, revisión anual…" autocomplete="off"></div>
    <div class="two">
      <div class="field"><label class="label" for="hDate">Fecha</label><input id="hDate" type="date" value="${esc(h?.date || todayISO())}"></div>
      <div class="field"><label class="label" for="hNext">Próxima (opcional)</label><input id="hNext" type="date" value="${esc(h?.next || '')}"></div>
    </div>
    <div class="chips quick" id="hQuick">
      <button type="button" class="chip" data-plus="30">+1 mes</button>
      <button type="button" class="chip" data-plus="90">+3 meses</button>
      <button type="button" class="chip" data-plus="182">+6 meses</button>
      <button type="button" class="chip" data-plus="365">+1 año</button>
    </div>
    <div class="field"><label class="label" for="hNote">Nota</label><input id="hNote" value="${esc(h?.note || '')}" placeholder="Veterinaria, dosis, costo…" autocomplete="off"></div>
    <button type="button" class="btn primary" id="saveH">${h ? 'Guardar cambios' : 'Guardar'}</button>
    ${h ? '<button type="button" class="btn danger" id="delH">Eliminar</button>' : ''}`);
  const paint = () => {
    $('#hType', sheet).innerHTML = Object.entries(HEALTH).map(([k, v]) =>
      `<button type="button" class="chip" data-type="${k}" aria-pressed="${st.type === k}">${icon(v.icon)}${v.name}</button>`).join('');
  };
  paint();
  sheet.addEventListener('click', (e) => {
    const t = e.target.closest('[data-type]');
    if (t) { st.type = t.dataset.type; paint(); replay($(`[data-type="${st.type}"]`, sheet), 'just'); return; }
    const plus = e.target.closest('[data-plus]');
    if (plus) { $('#hNext', sheet).value = addDays($('#hDate', sheet).value || todayISO(), Number(plus.dataset.plus)); return; }
    if (e.target.closest('#saveH')) {
      const data = { type: st.type, title: $('#hTitle', sheet).value.trim(), date: $('#hDate', sheet).value || todayISO(), next: $('#hNext', sheet).value || null, note: $('#hNote', sheet).value.trim() };
      if (h) Object.assign(h, data); else store.data.health.push({ id: uid(), catId: ui.catId, createdAt: Date.now(), ...data });
      store.save(); closeSheet(); render();
      celebrate(HEALTH[st.type].icon, h ? 'Cuidado actualizado' : '¡Cuidado registrado!', data.next ? `Próximo: ${shortDate(data.next)}` : '');
      burst(window.innerWidth / 2, window.innerHeight / 2, { count: 16, spread: 120 });
      return;
    }
    if (e.target.closest('#delH') && confirm('¿Eliminar este registro?')) {
      store.data.health = store.data.health.filter((x) => x.id !== h.id); store.save(); closeSheet(); render();
    }
  });
}

function weightSheet(id) {
  const w = id ? store.data.weights.find((x) => x.id === id) : null;
  const sheet = openSheet(`
    <h3>${w ? 'Editar peso' : 'Nuevo peso'}</h3>
    <label class="amount"><input id="wKg" inputmode="decimal" placeholder="0.0" value="${w ? w.kg : ''}" aria-label="Peso en kilos"><span class="currency">kg</span></label>
    <div class="field"><label class="label" for="wDate">Fecha</label><input id="wDate" type="date" value="${esc(w?.date || todayISO())}"></div>
    <button type="button" class="btn primary" id="saveW">Guardar</button>
    ${w ? '<button type="button" class="btn danger" id="delW">Eliminar</button>' : ''}`);
  if (!w) setTimeout(() => $('#wKg', sheet)?.focus(), 300);
  sheet.addEventListener('click', (e) => {
    if (e.target.closest('#saveW')) {
      const kg = parseAmount($('#wKg', sheet).value);
      if (!Number.isFinite(kg) || kg <= 0 || kg > 30) { toast('Escribe un peso válido'); return; }
      const data = { kg, date: $('#wDate', sheet).value || todayISO() };
      if (w) Object.assign(w, data); else store.data.weights.push({ id: uid(), catId: ui.catId, createdAt: Date.now(), ...data });
      store.save(); closeSheet(); render();
      celebrate('bascula', `${kg} kg`, 'Peso registrado');
      return;
    }
    if (e.target.closest('#delW') && confirm('¿Eliminar este peso?')) {
      store.data.weights = store.data.weights.filter((x) => x.id !== w.id); store.save(); closeSheet(); render();
    }
  });
}

function financeCards() {
  try {
    const f = JSON.parse(localStorage.getItem('finanzas.v1'));
    return f && Array.isArray(f.cards) && Array.isArray(f.movements) ? f : null;
  } catch (e) { return null; }
}

function supplySheet(id) {
  const s = id ? store.data.supplies.find((x) => x.id === id) : null;
  const fin = s ? null : financeCards();
  const st = { type: s?.type || 'comida', toFin: false, cardId: fin?.lastCardId || fin?.cards?.[0]?.id || null };
  const sheet = openSheet(`
    <h3>${s ? 'Editar compra' : 'Nueva compra'}</h3>
    <div class="field"><div class="label">¿Qué compraste?</div><div class="chips" id="sType"></div></div>
    <div class="field"><label class="label" for="sBrand">Marca o detalle</label><input id="sBrand" value="${esc(s?.brand || '')}" placeholder="Ej. Croquetas 3 kg" autocomplete="off"></div>
    <div class="two">
      <div class="field"><label class="label" for="sAmount">Monto</label><input id="sAmount" inputmode="decimal" value="${s?.amount ?? ''}" placeholder="$0.00"></div>
      <div class="field"><label class="label" for="sDate">Fecha</label><input id="sDate" type="date" value="${esc(s?.date || todayISO())}"></div>
    </div>
    ${fin ? `<label class="check"><input type="checkbox" id="sFin"> Registrar también en Finanzas</label>
      <div class="chips" id="sCards" hidden></div>` : ''}
    <button type="button" class="btn primary" id="saveS">Guardar</button>
    ${s ? '<button type="button" class="btn danger" id="delS">Eliminar</button>' : ''}`);
  const paint = () => {
    $('#sType', sheet).innerHTML = Object.entries(SUPPLY).map(([k, v]) =>
      `<button type="button" class="chip" data-type="${k}" aria-pressed="${st.type === k}">${icon(v.icon)}${v.name}</button>`).join('');
    if (fin) {
      $('#sCards', sheet).hidden = !st.toFin;
      $('#sCards', sheet).innerHTML = fin.cards.map((c) =>
        `<button type="button" class="chip" data-card="${esc(c.id)}" aria-pressed="${st.cardId === c.id}"><span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}</button>`).join('');
    }
  };
  paint();
  sheet.addEventListener('change', (e) => { if (e.target.id === 'sFin') { st.toFin = e.target.checked; paint(); } });
  sheet.addEventListener('click', (e) => {
    const t = e.target.closest('[data-type]');
    if (t) { st.type = t.dataset.type; paint(); return; }
    const c = e.target.closest('[data-card]');
    if (c) { st.cardId = c.dataset.card; paint(); return; }
    if (e.target.closest('#saveS')) {
      const amount = parseAmount($('#sAmount', sheet).value);
      const data = { type: st.type, brand: $('#sBrand', sheet).value.trim(), amount: Number.isFinite(amount) ? amount : null, date: $('#sDate', sheet).value || todayISO() };
      if (s) Object.assign(s, data); else store.data.supplies.push({ id: uid(), catId: ui.catId, createdAt: Date.now(), ...data });
      store.save();
      let extra = '';
      if (!s && st.toFin && fin && data.amount > 0 && st.cardId) {
        const cat = catById(ui.catId);
        fin.movements.push({ id: uid(), createdAt: Date.now(), type: 'gasto', amount: data.amount, cardId: st.cardId, person: null, owed: null, category: 'mascotas', note: `${SUPPLY[st.type].name}${data.brand ? ' ' + data.brand : ''} (${cat?.name || 'gato'})`, date: data.date });
        fin.lastCardId = st.cardId;
        localStorage.setItem('finanzas.v1', JSON.stringify(fin));
        extra = ' · también en Finanzas';
      }
      const btn = $('#saveS', sheet).getBoundingClientRect();
      closeSheet(); render();
      celebrate(SUPPLY[st.type].icon, '¡Compra guardada!', `${data.amount ? fmt(data.amount) : ''}${extra}`);
      if (extra) takeoff(btn);
      return;
    }
    if (e.target.closest('#delS') && confirm('¿Eliminar esta compra?')) {
      store.data.supplies = store.data.supplies.filter((x) => x.id !== s.id); store.save(); closeSheet(); render();
    }
  });
}

/* ---------------- Eventos ---------------- */

function bind() {
  $('#add').addEventListener('click', () => {
    if (!ui.catId) return catSheet(null);
    if (ui.tab === 'salud') healthSheet(null);
    else if (ui.tab === 'peso') weightSheet(null);
    else supplySheet(null);
  });
  $('#view').addEventListener('click', (e) => {
    const open = e.target.closest('[data-open-cat]');
    if (open) { ui.catId = open.dataset.openCat; ui.tab = open.dataset.tabGo || 'salud'; render(); window.scrollTo(0, 0); return; }
    const pp = e.target.closest('.passport');
    if (pp && !ui.catId) { ui.catId = pp.dataset.cat; ui.tab = 'salud'; render(); window.scrollTo(0, 0); burstFrom(pp, { count: 10, spread: 80 }); return; }
    if (e.target.closest('[data-back]')) { ui.catId = null; render(); return; }
    if (e.target.closest('[data-edit-cat]')) { catSheet(ui.catId); return; }
    const tab = e.target.closest('.segmented [data-tab]');
    if (tab) { ui.tab = tab.dataset.tab; render(); replay($(`.segmented [data-tab="${ui.tab}"]`), 'just'); return; }
    const eh = e.target.closest('[data-edit-health]'); if (eh) { healthSheet(eh.dataset.editHealth); return; }
    const ew = e.target.closest('[data-edit-weight]'); if (ew) { weightSheet(ew.dataset.editWeight); return; }
    const es = e.target.closest('[data-edit-supply]'); if (es) { supplySheet(es.dataset.editSupply); }
  });
}

bind();
render();
initPage();
