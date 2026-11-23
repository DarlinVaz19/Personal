# Personal

Apps personales para llevar distintos aspectos de mi vida.

## Mis Finanzas (`docs/finanzas/`)

Web app instalable en el celular (PWA) para registrar gastos en MXN.

- **Tipos de movimiento:** gasto personal, pagué por alguien (te debe todo o una parte), alguien pagó por mí (le debes), me pagaron, pagué una deuda, ingreso.
- **Tarjetas:** Débito Banamex, Crédito Banamex, Débito Nu y Efectivo. Se editan en *Ajustes*.
- **Deudas:** saldo por persona, con un botón para registrar cuando te pagan o pagas.
- **Resumen mensual:** tu gasto personal, lo que salió de cada tarjeta y el gasto por categoría.
- **Privacidad:** los datos se guardan **solo en el teléfono** (localStorage). Nada se sube al repo ni a ningún servidor.
- **Temas:** 8 temas a elegir en *Ajustes* (Menta, Sakura, Lavanda, Arena, Océano, Medianoche, Grafito o Automático).
- **Foto:** en *Ajustes → Foto* eliges una imagen de tu carrete para el fondo y/o la tarjeta de inicio. Se guarda solo en el teléfono.
- **Respaldo:** en *Ajustes → Exportar respaldo (.json)*. Se importa en el mismo lugar. También se puede exportar a CSV para Excel.

### Publicarla (GitHub Pages)

1. El repo debe ser público (Pages es gratis solo en repos públicos): **Settings → General → Danger Zone → Change visibility**.
2. En **Settings → Pages**, elige *Deploy from a branch*, rama `main` y carpeta `/docs`.
3. Abre `https://<tu-usuario>.github.io/Personal/finanzas/` en el celular.
4. Instálala:
   - **iPhone (Safari):** Compartir → *Agregar a pantalla de inicio*.
   - **Android (Chrome):** menú ⋮ → *Instalar app*.

> El código queda público en Pages, pero tus datos no: viven solo en tu teléfono.

### Probarla en tu computadora

```sh
cd docs && python3 -m http.server 8000
# abre http://localhost:8000/finanzas/
```

Si cambias archivos, sube la versión de `CACHE` en `docs/finanzas/sw.js` para que el teléfono descargue la actualización.
