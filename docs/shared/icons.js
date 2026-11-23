'use strict';

/* ============================================================
   Iconos propios estilo "cielo soñado".
   Todos en una cuadrícula de 32×32. Los colores salen del tema
   (variables --ic-*), así cambian con cada tema.
     .f  relleno principal       .a  relleno secundario
     .s  destello / estrella     .h  corazón / cereza
     .c  nube                    .o  contorno (se suma a un relleno)
     .w  agua / lluvia
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
  meprestaron: () => `
    <path class="a o" d="M3.5 19.5h7l2 3h7l2-3h7v6.6a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2z"/>
    <circle class="s o" cx="16" cy="9" r="6"/>
    <circle class="l" cx="16" cy="9" r="3.6" stroke-dasharray="1.2 1.8"/>
    <path class="l" d="M16 16.5v2.5M8.5 9.5l-2-1M23.5 9.5l2-1"/>
    <path class="h o" d="${heart(26.5, 4.5, 2.2)}"/>`,
  preste: () => `
    <path class="a o" d="M3.5 19.5h7l2 3h7l2-3h7v6.6a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2z"/>
    <path class="l" d="M10 16.5l7-7M14.5 9.5h2.5V12"/>
    <circle class="s o" cx="22" cy="7.5" r="5.5"/>
    <circle class="l" cx="22" cy="7.5" r="3.2" stroke-dasharray="1.2 1.8"/>
    ${sp(6, 7, 2.4)}`,
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
    <path class="a o" d="M14.6 14.2l-3.4-4.6h2.6l5.4 4.6"/>
    <path class="a o" d="M6 14.4L3.4 7.6h2.8l5.6 6.8"/>
    <path class="f o" d="M3 17.2c0-1.7 1.3-3 3.2-3h16.6c2.8 0 5.3 1.2 6.6 3-1.3 1.8-3.8 3-6.6 3H6.2c-1.9 0-3.2-1.3-3.2-3z"/>
    <path class="h o" d="M15.6 18.2L10.4 26.2h3.4l7.6-8z"/>
    <rect class="a o" x="13.4" y="20.6" width="5.6" height="2.6" rx="1.3"/>
    <path class="c o" d="M23.6 15.1c1.8.3 3.3 1 4.3 2.1h-4.9z"/>
    <circle class="c" cx="8.6" cy="16.6" r=".8"/><circle class="c" cx="11.2" cy="16.6" r=".8"/><circle class="c" cx="13.8" cy="16.6" r=".8"/><circle class="c" cx="16.4" cy="16.6" r=".8"/><circle class="c" cx="19" cy="16.6" r=".8"/>
    ${sp(26, 6, 2.4)}`,

  /* ---- Secciones (pantalla de inicio) ---- */
  mod_finanzas: () => `
    <circle class="s o" cx="15" cy="17" r="10.5"/>
    <circle class="l" cx="15" cy="17" r="7.4" stroke-dasharray="1.4 2.2"/>
    <path class="l" d="M17.6 13.6c-.6-1-1.7-1.5-2.8-1.5-1.5 0-2.7.8-2.7 2.1 0 3 5.8 1.6 5.8 4.6 0 1.3-1.3 2.2-2.9 2.2-1.3 0-2.5-.6-3-1.6M15 10.6v1.5M15 21.9v1.5"/>
    ${sp(27, 5.5, 3)}<circle class="h" cx="27.5" cy="13" r="1.2"/>`,
  mod_ideas: () => `
    <path class="f o" d="M5.5 7.5h21v13.5l-6 6h-15z"/>
    <path class="a o" d="M20.5 27v-6h6"/>
    <rect class="h" x="11.5" y="4.6" width="9" height="4.4" rx="1" transform="rotate(-7 16 6.8)" opacity=".85"/>
    <path class="s o" d="${star5(15.5, 16.5, 5, 2.3)}"/>`,
  mod_gatos: () => `
    <path class="f o" d="M6 12.5L5.4 4.4 12 9q4-1.2 8 0l6.6-4.6-.6 8.1q2 3.5 1 7.5-1.5 7-11 7T5 20q-1-4 1-7.5z"/>
    <path class="h" d="M7.5 10.6l-.3-3.6 3 2.3zM24.5 10.6l.3-3.6-3 2.3z"/>
    <path class="l" d="M10.4 16.6q1.6-1.7 3.2 0M18.4 16.6q1.6-1.7 3.2 0"/>
    <path class="h o" d="M14.8 19.2h2.4L16 20.6z"/>
    <path class="l" d="M16 20.6q-1 1.6-2.6 1M16 20.6q1 1.6 2.6 1M3.5 18.4l4 .6M3.5 21.6l4-.6M28.5 18.4l-4 .6M28.5 21.6l-4-.6"/>
    <circle class="h" cx="10" cy="20.3" r="1.3" opacity=".6"/><circle class="h" cx="22" cy="20.3" r="1.3" opacity=".6"/>`,
  mod_habitos: () => `
    <circle class="f o" cx="15" cy="17" r="11"/>
    <path class="l" d="M10 17.2l3.6 3.6 7-7.6" stroke-width="2.4"/>
    ${sp(27, 5, 3.2)}<circle class="s" cx="4.5" cy="6" r="1.2"/>`,
  mod_diario: () => `
    <rect class="f o" x="6" y="3.5" width="20" height="24.5" rx="3"/>
    <path class="a o" d="M6 6.5a3 3 0 0 1 3-3h1.6V28H9a3 3 0 0 1-3-3z"/>
    <path class="s o" d="M20.3 9.5a5 5 0 1 0 3.9 8.1 4.1 4.1 0 0 1-3.9-8.1z"/>
    <circle class="s" cx="15" cy="10" r=".9"/><circle class="s" cx="16" cy="21" r=".9"/>
    <path class="h o" d="M21 28v3.4l1.6-1.2 1.6 1.2V28"/>`,

  /* ---- Estados de ánimo (cielo) ---- */
  mood_radiante: () => `
    <path class="l" d="M16 2.5v3.6M16 25.9v3.6M2.5 16h3.6M25.9 16h3.6M6.5 6.5l2.6 2.6M22.9 22.9l2.6 2.6M6.5 25.5l2.6-2.6M22.9 9.1l2.6-2.6"/>
    <circle class="s o" cx="16" cy="16" r="7.6"/>
    <path class="l" d="M12.6 15.2q1.3-1.4 2.6 0M16.8 15.2q1.3-1.4 2.6 0M13.2 18.4q2.8 2.4 5.6 0"/>`,
  mood_feliz: () => `
    <path class="l" d="M21 3v2.6M27.5 6.5l-1.8 1.8M29.5 13h-2.6"/>
    <circle class="s o" cx="20.5" cy="12.5" r="6.2"/>
    <path class="f o" d="M7.5 26.5h14a4.6 4.6 0 0 0 .4-9.2A6.8 6.8 0 0 0 9 16.4a5 5 0 0 0-1.5 10.1z"/>
    <path class="l" d="M11.2 21.2q1.1-1.2 2.2 0M15.6 21.2q1.1-1.2 2.2 0M12.6 23.6q1.9 1.4 3.8 0"/>`,
  mood_calma: () => `
    <path class="f o" d="M7 24.5h18a5.6 5.6 0 0 0 .5-11.2A8.3 8.3 0 0 0 9.2 12a6.3 6.3 0 0 0-2.2 12.5z"/>
    <path class="l" d="M11.4 18.6q1.4 1.2 2.8 0M17.8 18.6q1.4 1.2 2.8 0M14.4 21.4q1.6 1 3.2 0"/>
    <circle class="h" cx="10.4" cy="20.8" r="1.1" opacity=".6"/><circle class="h" cx="21.6" cy="20.8" r="1.1" opacity=".6"/>
    ${sp(27, 6, 2.4)}`,
  mood_sueno: () => `
    <path class="s o" d="M17 5a11.5 11.5 0 1 0 9.6 17.8A9.4 9.4 0 0 1 17 5z"/>
    <path class="l" d="M10.4 17.6q1.3 1.2 2.6 0M15.6 19.2q1.3 1.2 2.6 0"/>
    <path class="l" d="M21 4h4l-4 4h4M25.5 10.5h2.6l-2.6 2.6h2.6"/>`,
  mood_triste: () => `
    <path class="a o" d="M7 19.5h18a5.6 5.6 0 0 0 .5-11.2A8.3 8.3 0 0 0 9.2 7a6.3 6.3 0 0 0-2.2 12.5z"/>
    <path class="l" d="M11.6 14.4q1.3-1.2 2.6 0M17.8 14.4q1.3-1.2 2.6 0M13.8 17.4q2.2-1.6 4.4 0"/>
    <path class="w o" d="M10 22.5q-1.4 2.2-1.4 3.2a1.4 1.4 0 0 0 2.8 0q0-1-1.4-3.2zM16 24q-1.4 2.2-1.4 3.2a1.4 1.4 0 0 0 2.8 0q0-1-1.4-3.2zM22 22.5q-1.4 2.2-1.4 3.2a1.4 1.4 0 0 0 2.8 0q0-1-1.4-3.2z"/>`,
  mood_estres: () => `
    <path class="a o" d="M7 18.5h18a5.6 5.6 0 0 0 .5-11.2A8.3 8.3 0 0 0 9.2 6a6.3 6.3 0 0 0-2.2 12.5z"/>
    <path class="l" d="M11.4 12.4l2.4 1.2M20.6 12.4l-2.4 1.2M13.6 16.2q2.4-1.4 4.8 0"/>
    <path class="s o" d="M17 17.5l-3.6 6h3.4l-1.8 6 6-7.6h-3.6l2.2-4.4z"/>`,

  /* ---- Gatos ---- */
  huella: () => `
    <path class="h o" d="M16 16.5c-4.2 0-7.2 3.7-7.2 6.8 0 2 1.6 3.2 3.6 3.2 1.6 0 2.4-.8 3.6-.8s2 .8 3.6.8c2 0 3.6-1.2 3.6-3.2 0-3.1-3-6.8-7.2-6.8z"/>
    <ellipse class="h o" cx="7.6" cy="13" rx="2.6" ry="3.2" transform="rotate(-18 7.6 13)"/>
    <ellipse class="h o" cx="12.8" cy="8" rx="2.6" ry="3.3" transform="rotate(-6 12.8 8)"/>
    <ellipse class="h o" cx="19.2" cy="8" rx="2.6" ry="3.3" transform="rotate(6 19.2 8)"/>
    <ellipse class="h o" cx="24.4" cy="13" rx="2.6" ry="3.2" transform="rotate(18 24.4 13)"/>`,
  vacuna: () => `
    <g transform="rotate(45 16 16)">
      <path class="l" d="M16 1.5v4M11 5.5h10"/>
      <rect class="f o" x="12" y="5.5" width="8" height="15" rx="1.6"/>
      <path class="w" d="M13.4 12h5.2v7.2h-5.2z" opacity=".8"/>
      <path class="l" d="M12 9.5h3M12 13h3M12 16.5h3"/>
      <rect class="a o" x="14.4" y="20.5" width="3.2" height="3" rx=".8"/>
      <path class="l" d="M16 23.5v6"/>
    </g>
    <path class="h o" d="${heart(25.5, 25.5, 2.6)}"/>`,
  pastilla: () => `
    <g transform="rotate(-35 16 16)">
      <rect class="f o" x="5.5" y="11" width="21" height="10" rx="5"/>
      <path class="h o" d="M16 11h5.5a5 5 0 0 1 0 10H16z"/>
    </g>
    ${sp(26.5, 5.5, 2.6)}`,
  medicina: () => `
    <rect class="a o" x="10" y="3.5" width="12" height="5" rx="1.6"/>
    <rect class="f o" x="8" y="8.5" width="16" height="20" rx="4"/>
    <rect class="c o" x="10.5" y="13" width="11" height="10" rx="2"/>
    <path class="h" d="M14.8 15.2h2.4v1.9h1.9v2.4h-1.9v1.9h-2.4v-1.9h-1.9v-2.4h1.9z"/>`,
  bascula: () => `
    <rect class="f o" x="4" y="8.5" width="24" height="19" rx="5"/>
    <path class="a o" d="M9 15.5a7 7 0 0 1 14 0z"/>
    <path class="l" d="M16 15.5l2.6-3.4"/>
    <path class="h" d="M16 24.6c-1.6 0-2.8 1.2-2.8 2"/>
    <circle class="h" cx="13.4" cy="21.4" r=".9"/><circle class="h" cx="16" cy="20.4" r=".9"/><circle class="h" cx="18.6" cy="21.4" r=".9"/>
    <path class="h" d="M16 22.2c-1.5 0-2.6 1-2.6 2s1 1.2 2.6 1.2 2.6-.2 2.6-1.2-1.1-2-2.6-2z"/>`,
  plato: () => `
    <path class="s o" d="M9 11.5c3-3.2 8.4-3.2 11.4 0-3 3.2-8.4 3.2-11.4 0z"/>
    <path class="s o" d="M20.4 11.5l3.8-2.8v5.6z"/>
    <circle class="l" cx="12.4" cy="11.2" r=".4"/>
    <circle class="a" cx="10" cy="17" r="1.4"/><circle class="a" cx="14" cy="16.4" r="1.4"/><circle class="a" cx="18" cy="17" r="1.4"/><circle class="a" cx="22" cy="16.6" r="1.4"/>
    <path class="f o" d="M3.5 17.5h25l-2 7.4a3 3 0 0 1-2.9 2.2H8.4a3 3 0 0 1-2.9-2.2z"/>
    <path class="h o" d="${heart(16, 22.2, 2)}"/>`,
  arena: () => `
    <path class="l" d="M21 4.5l4.5 9M23.8 12.4l3.8-1.8 1.4 3-3.8 1.8z"/>
    <path class="a" d="M4.5 15.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0 3.5 2 5 0V17H4.5z"/>
    <path class="f o" d="M3.5 15.5h25l-2 10.2a2.6 2.6 0 0 1-2.6 2.1H8.1a2.6 2.6 0 0 1-2.6-2.1z"/>
    <path class="h" d="M16 21.4c-1.4 0-2.4.9-2.4 1.8s.9 1.1 2.4 1.1 2.4-.2 2.4-1.1-1-1.8-2.4-1.8z"/>
    <circle class="h" cx="13.6" cy="20.2" r=".8"/><circle class="h" cx="16" cy="19.3" r=".8"/><circle class="h" cx="18.4" cy="20.2" r=".8"/>`,
  premio: () => `
    <path class="s o" d="M4 16c4.6-6.2 13-6.2 17.6 0-4.6 6.2-13 6.2-17.6 0z"/>
    <path class="s o" d="M21.6 16l5.8-4.8v9.6z"/>
    <circle class="h" cx="9" cy="15" r="1.1"/>
    <path class="l" d="M13 12.6q1.6 3.4 0 6.8"/>
    ${sp(26, 5, 2.4)}`,

  /* ---- Hábitos ---- */
  agua: () => `
    <path class="w o" d="M16 3.5C12 9 8 13.5 8 18.8a8 8 0 0 0 16 0c0-5.3-4-9.8-8-15.3z"/>
    <path class="lw" d="M12.4 19.4a4 4 0 0 0 3.2 3.6"/>
    ${sp(26.5, 7, 2.4)}`,
  leer: () => ICONS.tab_movs(),
  ejercicio: () => `
    <rect class="a o" x="2.5" y="11.5" width="4.5" height="9" rx="1.5"/>
    <rect class="f o" x="6.5" y="8.5" width="4.5" height="15" rx="1.6"/>
    <rect class="f o" x="21" y="8.5" width="4.5" height="15" rx="1.6"/>
    <rect class="a o" x="25" y="11.5" width="4.5" height="9" rx="1.5"/>
    <path class="l" d="M11 16h10" stroke-width="2.4"/>`,
  meditar: () => `
    <path class="f o" d="M16 19.5c-3.4-.6-9-1.6-12-6 3.6-1 9 .6 12 6z"/>
    <path class="f o" d="M16 19.5c3.4-.6 9-1.6 12-6-3.6-1-9 .6-12 6z"/>
    <path class="h o" d="M16 5.5c3.2 3.2 4.2 7.6 0 14-4.2-6.4-3.2-10.8 0-14z"/>
    <path class="l" d="M5 23.5c4.6 2.4 17.4 2.4 22 0"/>
    ${sp(26, 4.5, 2.2)}`,
  dormir: () => ICONS.mood_sueno(),
  caminar: () => `
    <path class="f o" d="M4 22c0-3.2 1-7.4 3-9.6l5.2 2.2c2 1 4.2 2 7.2 2 5.2 0 8.6 2 8.6 5.2v1.6H4z"/>
    <path class="a o" d="M4 23.4h24v2.6H4z"/>
    <path class="l" d="M10.4 14.4l-1.2 3M14 15.8l-1.2 3"/>
    ${sp(26, 8, 2.4)}`,
  vitaminas: () => ICONS.pastilla(),
  skincare: () => `
    <rect class="a o" x="12" y="3.5" width="8" height="5" rx="1.3"/>
    <rect class="f o" x="9" y="8.5" width="14" height="20" rx="4.5"/>
    <path class="h o" d="${heart(16, 18.2, 3.2)}"/>
    ${sp(27, 12, 2.6)}<circle class="s" cx="5" cy="9" r="1.1"/>`,
  estudiar: () => `
    <g transform="rotate(45 16 16)">
      <rect class="h o" x="12" y="1.5" width="8" height="3.6" rx="1.2"/>
      <rect class="s o" x="12" y="5.1" width="8" height="18" rx="1"/>
      <path class="f o" d="M12 23.1h8l-4 6.6z"/>
      <path class="l" d="M15 27.5l1 1.6 1-1.6"/>
    </g>`,
  plantas: () => `
    <path class="l" d="M16 19.5v-7.5"/>
    <path class="f o" d="M16 13.5c-1-4.2-5-6.4-9.2-5.4 1 4.2 5 6.4 9.2 5.4z"/>
    <path class="f o" d="M16 11.5c1-4.2 5-6.4 9.2-5.4-1 4.2-5 6.4-9.2 5.4z"/>
    <path class="a o" d="M8.5 19.5h15l-2 9h-11z"/>
    <path class="h" d="M8 19h16v2.6H8z" opacity=".75"/>`,
  viajes: () => ICONS.avion(),
  mascotas: () => ICONS.huella(),
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
