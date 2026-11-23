'use strict';

/* ============================================================
   Iconos propios estilo "cielo soñado".
   Todos en una cuadrícula de 32×32. Los colores salen del tema
   (variables --ic-*), así cambian con cada tema.
     .f  relleno principal       .a  relleno secundario
     .s  destello / estrella     .h  corazón / cereza
     .c  nube                    .o  contorno (se suma a un relleno)
     .l  solo línea
   ============================================================ */

const sp = (x, y, r) =>
  `<path class="s" d="M${x} ${y - r}Q${x + r * 0.22} ${y - r * 0.22} ${x + r} ${y}Q${x + r * 0.22} ${y + r * 0.22} ${x} ${y + r}Q${x - r * 0.22} ${y + r * 0.22} ${x - r} ${y}Q${x - r * 0.22} ${y - r * 0.22} ${x} ${y - r}Z"/>`;

function star5(cx, cy, R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + (cx + rad * Math.cos(a)).toFixed(2) + ' ' + (cy + rad * Math.sin(a)).toFixed(2);
  }
  return d + 'Z';
}

const heart = (x, y, s) =>
  `M${x} ${y + s * 0.9}C${x - s * 1.6} ${y - s * 0.1} ${x - s * 0.7} ${y - s * 1.3} ${x} ${y - s * 0.35}C${x + s * 0.7} ${y - s * 1.3} ${x + s * 1.6} ${y - s * 0.1} ${x} ${y + s * 0.9}Z`;

const cloud = (x, y, w) => {
  const r1 = w * 0.22, r2 = w * 0.3, r3 = w * 0.2;
  return `<g class="c"><circle cx="${x - w * 0.25}" cy="${y - r1}" r="${r1}"/><circle cx="${x + w * 0.02}" cy="${y - w * 0.36}" r="${r2}"/><circle cx="${x + w * 0.3}" cy="${y - r3}" r="${r3}"/><rect x="${x - w * 0.47}" y="${y - w * 0.22}" width="${w * 0.97}" height="${w * 0.22}" rx="${w * 0.11}"/></g>`;
};

const ICONS = {
  /* ---- Tipos de movimiento ---- */
  gasto: () => `
    <path class="a o" d="M7 10L20 5.5a2 2 0 0 1 2.6 1.3L23.5 10Z"/>
    <rect class="f o" x="4" y="10" width="22" height="16.5" rx="4.5"/>
    <path class="a o" d="M27 15h-5.5a3 3 0 0 0 0 6H27z"/>
    <circle class="s" cx="21.8" cy="18" r="1.3"/>
    ${sp(27.5, 5, 3.2)}`,
  prestado: () => `
    <circle class="f o" cx="13" cy="18" r="9.5"/>
    <circle class="l" cx="13" cy="18" r="6.6" stroke-dasharray="1.4 2.2"/>
    <path class="h o" d="${heart(13, 17.6, 3.6)}"/>
    <path class="h o" d="${heart(25.5, 8.5, 2.6)}"/>
    <path class="l" d="M21 13.5l1.6-1.4M19.5 10.5l.8-.5"/>
    ${sp(27.5, 18.5, 2.2)}`,
  debo: () => `
    <path class="f o" d="M7 4.5h13l6.5 6.5v15a2.5 2.5 0 0 1-2.5 2.5H7a2.5 2.5 0 0 1-2.5-2.5V7A2.5 2.5 0 0 1 7 4.5z"/>
    <path class="a o" d="M20 4.5V11h6.5"/>
    <path class="l" d="M9 15.5h11M9 20h7"/>
    <path class="h o" d="${heart(21.5, 22.5, 2.8)}"/>`,
  cobro: () => `
    <rect class="f o" x="4" y="10" width="24" height="17" rx="3.5"/>
    <path class="l" d="M5 12l11 8 11-8"/>
    <path class="h o" d="${heart(16, 19.6, 2.4)}"/>
    ${sp(24.5, 5, 3.4)}
    <circle class="s" cx="18.5" cy="4.5" r="1"/>`,
  pago: () => `
    <path class="f o" d="M3.5 14.5L28 4.5l-6.5 22.5-6.5-8z"/>
    <path class="a o" d="M15 19l13-14.5-15 17.5z"/>
    <path class="l" d="M3.5 24.5c2-1.3 3.6-1.3 5.2 0M6 29c1.6-1 2.8-1 4.2 0" stroke-dasharray="1.5 2.4"/>
    ${sp(8, 6.5, 2.6)}`,
  ingreso: () => `
    <path class="l" d="M3.5 28.5l8.5-8.5M3 21.5l5.5-5.5M10.5 30l5-5"/>
    <path class="s o" d="${star5(19.5, 12.5, 9.5, 4.4)}"/>
    <circle class="h" cx="16.6" cy="12.8" r="1"/><circle class="h" cx="22.4" cy="12.8" r="1"/>
    <path class="l" d="M17.8 15.6c1 .9 2.4.9 3.4 0"/>`,

  /* ---- Categorías ---- */
  comida: () => `
    <ellipse class="a o" cx="14.5" cy="26.5" rx="11" ry="2.4"/>
    <path class="f o" d="M5.5 13.5h18v4a9 9 0 0 1-18 0z"/>
    <path class="l" d="M23.5 15h1.3a3.2 3.2 0 0 1 0 6.4H22.5"/>
    <path class="h o" d="${heart(14.5, 18.2, 2.4)}"/>
    <path class="l" d="M11 10c-1.6-1.6 1.6-2.6 0-4.8M17.5 10c-1.6-1.6 1.6-2.6 0-4.8"/>`,
  super: () => `
    <path class="l" d="M9 13.5a7 7 0 0 1 14 0"/>
    <path class="l" d="M12 7.8c0-2 1.4-3.6 3.2-4.3M16.4 7.6c0-1.6-.2-2.8-1.2-4"/>
    <circle class="h o" cx="12" cy="9.6" r="2.5"/><circle class="h o" cx="16.6" cy="9.4" r="2.5"/>
    <path class="f o" d="M3.5 13.5h25l-2.6 11.6a3 3 0 0 1-2.9 2.4H9a3 3 0 0 1-2.9-2.4z"/>
    <path class="l" d="M10.5 18v5M16 18v5M21.5 18v5"/>
    <path class="a o" d="M3 13.5h26"/>`,
  transporte: () => `
    ${cloud(7, 27, 9)}
    <path class="f o" d="M16 3a9.5 9.5 0 0 0-9.5 9.5c0 5.2 5.2 8.6 6.8 11h5.4c1.6-2.4 6.8-5.8 6.8-11A9.5 9.5 0 0 0 16 3z"/>
    <path class="h" d="M16 3.6c-2.4 2.6-3.4 5.8-3.4 8.9 0 3.2 1.1 7.4 1.9 10.8h3c.8-3.4 1.9-7.6 1.9-10.8 0-3.1-1-6.3-3.4-8.9z"/>
    <path class="l" d="M13.5 23.5l.6 2.5M18.5 23.5l-.6 2.5"/>
    <rect class="h o" x="13" y="26" width="6" height="4" rx="1.3"/>
    ${sp(27.5, 22, 2.4)}`,
  casa: () => `
    <path class="a o" d="M21.5 10V5.5h3.2v7.3"/>
    <path class="f o" d="M4.5 15L16 5l11.5 10v10.3a2.5 2.5 0 0 1-2.5 2.5H7a2.5 2.5 0 0 1-2.5-2.5z"/>
    <path class="a o" d="M12.8 27.8v-5.6a3.2 3.2 0 0 1 6.4 0v5.6"/>
    <path class="h o" d="${heart(16, 14.6, 2.6)}"/>
    ${sp(28, 4.5, 2.4)}`,
  servicios: () => `
    <path class="f o" d="M8.5 21.5h15a5 5 0 0 0 .4-10A7.3 7.3 0 0 0 10 10.6a5.5 5.5 0 0 0-1.5 10.9z"/>
    <path class="s o" d="M17.5 16.5l-4 6.5h3.8l-2 6 6.5-8h-4l2.4-4.5z"/>
    <circle class="s" cx="6" cy="27" r="1"/><circle class="s" cx="25" cy="26" r="1.2"/>`,
  salud: () => `
    <path class="h o" d="${heart(16, 15, 10.5)}"/>
    <path class="lw" d="M16 11v8M12 15h8"/>
    ${sp(27, 5.5, 2.6)}`,
  entretenimiento: () => `
    <path class="f o" d="M4 10a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v3a3 3 0 0 0 0 6v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a3 3 0 0 0 0-6z"/>
    <path class="l" d="M21.5 9.5v13" stroke-dasharray="1.5 2"/>
    <path class="s o" d="${star5(12.8, 16.3, 5, 2.3)}"/>
    ${sp(27.5, 4, 2.4)}`,
  compras: () => `
    <path class="l" d="M11.5 11.5V9a4.5 4.5 0 0 1 9 0v2.5"/>
    <path class="f o" d="M5.5 11.5h21l-1.4 14.4a2.5 2.5 0 0 1-2.5 2.3H9.4a2.5 2.5 0 0 1-2.5-2.3z"/>
    <path class="h o" d="M16 18c-2-2.6-5.2-2.6-5.2 0s3.2 2.6 5.2 0zm0 0c2-2.6 5.2-2.6 5.2 0s-3.2 2.6-5.2 0z"/>
    <path class="l" d="M15 19l-1.6 4.2M17 19l1.6 4.2"/>
    <circle class="h o" cx="16" cy="18" r="1.4"/>`,
  suscripciones: () => `
    <ellipse class="l" cx="16" cy="17" rx="14" ry="4.4" transform="rotate(-18 16 17)"/>
    <circle class="f o" cx="16" cy="17" r="8"/>
    <path class="a" d="M9.2 13.2c4.4 1.6 9.2 1.6 13.6 0a8 8 0 0 1 .9 2.6c-5 1.6-10.4 1.6-15.4 0a8 8 0 0 1 .9-2.6z"/>
    <path class="l" d="M2.6 22.8c1.6 1.3 7 .2 13-2.3"/>
    ${sp(27, 5, 2.6)}<circle class="s" cx="5" cy="7" r="1.1"/>`,
  avion: () => `
    <path class="a o" d="M6.5 14.2L4.6 7.6h3.3l4.4 6"/>
    <path class="f o" d="M3.8 17.2c0-2.1 1.6-3.6 4.2-3.6h13.2c3.1 0 5.6 1.5 6.8 3.6-1.2 2.1-3.7 3.6-6.8 3.6H8c-2.6 0-4.2-1.5-4.2-3.6z"/>
    <path class="h o" d="M12.5 17.8L9.4 25.6h3.8l6-7.8z"/>
    <path class="c o" d="M23 13.9c1.9.4 3.5 1.4 4.6 2.8h-5.2z"/>
    <circle class="c o" cx="13.4" cy="16.3" r="1.15"/><circle class="c o" cx="17.2" cy="16.3" r="1.15"/>
    <path class="l" d="M29.8 12.6v9.2"/><circle class="s o" cx="28.7" cy="17.2" r="1.3"/>
    ${sp(9, 4.2, 2.4)}`,
  viajes: () => ICONS.avion(),
  otros: () => `
    <path class="s o" d="${star5(16, 17, 11, 5)}"/>
    ${sp(27.5, 5, 2.4)}${sp(4.5, 26.5, 2)}`,

  /* ---- Barra de navegación ---- */
  tab_nuevo: () => `
    <path class="f o" d="M16 3Q18.2 13.8 29 16Q18.2 18.2 16 29Q13.8 18.2 3 16Q13.8 13.8 16 3Z"/>
    <circle class="s" cx="26" cy="6" r="1.6"/><circle class="s" cx="6.5" cy="26" r="1.2"/>`,
  tab_movs: () => `
    <path class="f o" d="M16 8.5c-3.2-2.2-7.6-2.6-11.5-1.6v18.4c3.9-1 8.3-.6 11.5 1.6 3.2-2.2 7.6-2.6 11.5-1.6V6.9C23.6 5.9 19.2 6.3 16 8.5z"/>
    <path class="l" d="M16 8.5v18.4M8 12.5c1.8-.3 3.6-.1 5 .6M8 16.5c1.8-.3 3.6-.1 5 .6"/>
    <path class="h o" d="M21 6.2v7.3l1.7-1.4 1.7 1.4V6.3"/>`,
  tab_deudas: () => `
    <path class="f o" d="${heart(12, 14, 8)}"/>
    <path class="h o" d="${heart(21, 19, 7)}"/>`,
  tab_resumen: () => `
    <rect class="a o" x="4.5" y="17" width="6" height="10.5" rx="2.2"/>
    <rect class="f o" x="13" y="11" width="6" height="16.5" rx="2.2"/>
    <rect class="a o" x="21.5" y="14.5" width="6" height="13" rx="2.2"/>
    <path class="s o" d="${star5(16, 5.2, 3.6, 1.7)}"/>`,
  tab_ajustes: () => `
    <path class="f o" d="M16 4C9.2 4 4 9 4 15.5S9 28 15 28c2 0 2.6-1.2 2.6-2.5 0-1.8-1.3-2.3-1.3-3.8 0-1.4 1.1-2.2 2.7-2.2H22c3.6 0 6-2.3 6-5.8C28 8.4 22.6 4 16 4z"/>
    <circle class="h" cx="9.5" cy="15" r="2"/><circle class="s" cx="12" cy="9.3" r="2"/>
    <circle class="a o" cx="18.8" cy="8.6" r="2"/><circle class="c" cx="23.5" cy="13" r="2"/>`,

  /* ---- Otros ---- */
  moon: () => `
    <path class="s o" d="M20 3.5a12.5 12.5 0 1 0 8.6 19.6A10.2 10.2 0 0 1 20 3.5z"/>
    ${sp(24.5, 10, 2.6)}`,
  check: () => `
    <path class="s o" d="${star5(16, 16.5, 13, 6.2)}"/>
    <path class="lw" d="M11.5 16.8l3.2 3.2 6-6.4"/>`,
};

function icon(name, cls = '') {
  const draw = ICONS[name] || ICONS.otros;
  return `<svg class="ic ${cls}" viewBox="0 0 32 32" aria-hidden="true">${draw()}</svg>`;
}
