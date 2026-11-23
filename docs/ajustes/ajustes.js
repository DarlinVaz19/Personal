'use strict';

/* Ajustes generales: tema, foto, respaldo de todas las secciones. */

function renderThemes() {
  $('#themes').innerHTML = THEMES.map((t) => `
    <button type="button" class="theme-opt" data-theme-id="${t.id}" aria-pressed="${(settings.data.theme || 'auto') === t.id}">
      <span class="sw" style="background:${t.swatch}"></span>${esc(t.name)}
    </button>`).join('');
}

function renderPhoto() {
  const img = getPhoto();
  const ps = photoSettings();
  $('#photoPreview').textContent = img ? '' : 'Sin foto';
  const where = [['fondo', 'Fondo'], ['tarjeta', 'Tarjeta de inicio'], ['ambos', 'Ambos']];
  $('#photoControls').innerHTML = `
    <button type="button" class="btn" data-photo="pick">${img ? 'Cambiar foto' : 'Elegir foto'}</button>
    ${img ? `
      <div class="label" style="margin-top:10px">¿Dónde se muestra?</div>
      <div class="chips">${where.map(([id, name]) =>
        `<button type="button" class="chip" data-photo-where="${id}" aria-pressed="${ps.where === id}">${name}</button>`).join('')}</div>
      <label class="label" for="photoVis" style="margin-top:10px">Qué tanto se ve en el fondo</label>
      <input type="range" id="photoVis" min="10" max="80" step="5" value="${ps.visibility}">
      <button type="button" class="btn danger" data-photo="remove">Quitar foto</button>` : ''}`;
}

function sizeKB(key) { return Math.round(((localStorage.getItem(key) || '').length * 2) / 1024); }

function renderBackup() {
  const p = backupPayload();
  const counts = [];
  const f = p.data['finanzas.v1']; if (f?.movements?.length) counts.push(`${f.movements.length} movimientos`);
  const i = p.data['ideas.v1']; if (i?.notes?.length) counts.push(`${i.notes.length} ideas`);
  const g = p.data['gatos.v1']; if (g?.cats?.length) counts.push(`${g.cats.length} gatos`);
  const h = p.data['habitos.v1']; if (h?.habits?.length) counts.push(`${h.habits.length} hábitos`);
  const d = p.data['diario.v1']; if (d?.entries && Object.keys(d.entries).length) counts.push(`${Object.keys(d.entries).length} días en Mi día`);
  const sh = p.data['compras.v1']; if (sh?.items?.length) counts.push(`${sh.items.length} cosas en la lista de compras`);
  const sl = p.data['sueno.v1']; if (sl?.nights && Object.keys(sl.nights).length) counts.push(`${Object.keys(sl.nights).length} noches de sueño`);
  const last = settings.data.lastBackup;
  $('#backupInfo').textContent = `${counts.length ? counts.join(', ') + '. ' : 'Aún no hay datos. '}` +
    (last ? `Último respaldo: ${new Date(last).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.` : 'Aún no has exportado un respaldo.');
  const used = DATA_KEYS.reduce((s, k) => s + sizeKB(k), 0) + sizeKB(PHOTO_KEY);
  if (navigator.storage?.persisted) {
    navigator.storage.persisted().then((ok) => {
      $('#storageInfo').textContent = `Usando unos ${used} KB. ` + (ok
        ? 'Almacenamiento persistente activado: el navegador no borrará tus datos.'
        : 'Consejo: instala la app en tu pantalla de inicio para que el navegador conserve tus datos.');
    });
  } else $('#storageInfo').textContent = `Usando unos ${used} KB.`;
}

function render() { renderThemes(); renderPhoto(); renderBackup(); }

async function exportJson() {
  settings.data.lastBackup = Date.now();
  settings.save();
  const json = JSON.stringify(backupPayload(), null, 2);
  const filename = `mi-cielo-respaldo-${todayISO()}.json`;
  try {
    const file = new File([json], filename, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Respaldo de Mi cielo' });
      renderBackup();
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }
  download(filename, json, 'application/json');
  renderBackup();
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      if (!confirm('Esto reemplazará los datos actuales con los del respaldo. ¿Continuar?')) return;
      const n = restoreBackup(obj);
      settings.data = { ...settings.data, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) };
      applyTheme(); applyPhoto(); render();
      celebrate('check', 'Respaldo importado', `${n} sección${n === 1 ? '' : 'es'}`, true);
    } catch (e) {
      alert('Ese archivo no parece un respaldo válido de esta app.');
    }
  };
  reader.readAsText(file);
}

function bind() {
  $('#themes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme-id]');
    if (!b) return;
    settings.data.theme = b.dataset.themeId;
    settings.save();
    applyTheme();
    renderThemes();
    replay($(`#themes [data-theme-id="${settings.data.theme}"]`), 'just');
  });

  $('#photoControls').addEventListener('click', (e) => {
    if (e.target.closest('[data-photo="pick"]')) { $('#photoFile').click(); return; }
    if (e.target.closest('[data-photo="remove"]')) {
      if (!confirm('¿Quitar la foto?')) return;
      localStorage.removeItem(PHOTO_KEY);
      applyPhoto(); renderPhoto();
      return;
    }
    const w = e.target.closest('[data-photo-where]');
    if (w) { settings.data.photo = { ...photoSettings(), where: w.dataset.photoWhere }; settings.save(); applyPhoto(); renderPhoto(); }
  });
  $('#photoControls').addEventListener('input', (e) => {
    if (e.target.id !== 'photoVis') return;
    settings.data.photo = { ...photoSettings(), visibility: Number(e.target.value) };
    applyPhoto();
  });
  $('#photoControls').addEventListener('change', (e) => { if (e.target.id === 'photoVis') settings.save(); });
  $('#photoFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      let data = await resizeImage(file, 1400, 0.82);
      try { localStorage.setItem(PHOTO_KEY, data); } catch (err) {
        data = await resizeImage(file, 1000, 0.6);
        localStorage.setItem(PHOTO_KEY, data);
      }
      applyPhoto(); renderPhoto(); renderBackup();
      toast('Foto aplicada');
    } catch (err) {
      alert('No se pudo guardar esa foto. Prueba con otra.');
    }
  });

  $('#exportJson').addEventListener('click', exportJson);
  $('#importJson').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importJson(file);
    e.target.value = '';
  });
  $('#wipe').addEventListener('click', () => {
    if (!confirm('¿Borrar TODO (finanzas, ideas, gatos, hábitos, diario y ajustes) de este teléfono? No se puede deshacer.')) return;
    if (prompt('Escribe BORRAR para confirmar') !== 'BORRAR') return;
    for (const k of [...DATA_KEYS, PHOTO_KEY]) localStorage.removeItem(k);
    settings.reset();
    applyTheme(); applyPhoto(); render();
    toast('Datos borrados');
  });
}

bind();
render();
initPage();
