// Aplica el tema guardado antes de pintar la página, para que no parpadee.
(function () {
  try {
    var s = JSON.parse(localStorage.getItem('cielo.ajustes')) || JSON.parse(localStorage.getItem('finanzas.v1')) || {};
    var t = s.theme || 'auto';
    if (t === 'auto') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'nocheestrellada' : 'cielo';
    document.documentElement.dataset.theme = t;
    if (t === 'cielo' || t === 'nocheestrellada') document.documentElement.dataset.style = 'journal';
  } catch (e) { /* sin datos */ }
  try {
    var pin = JSON.parse(localStorage.getItem('cielo.pin'));
    if (pin && pin.hash && sessionStorage.getItem('cielo.unlocked') !== '1') document.documentElement.classList.add('locked');
  } catch (e) { /* sin PIN */ }
})();
