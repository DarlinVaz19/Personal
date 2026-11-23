# Personal

## Mi cielo (`docs/`)

App privada para el celular (PWA) con estilo de cielo, nubes, estrellas y jets ✈.
Funciona sin internet y **todos los datos viven solo en el teléfono** (localStorage); nada se sube a ningún servidor.

Se abre en `https://darlinvaz19.github.io/Personal/` y se instala desde Safari con *Compartir → Agregar a pantalla de inicio*.

### Secciones

| Sección | Qué hace |
|---|---|
| **Inicio** | Pase de abordar del día (hábitos, ánimo y gasto de hoy) y accesos a cada sección. Al tocar una, el jet despega. |
| **Finanzas** | Gastos con tarjeta (Débito/Crédito Banamex, Débito Nu, Efectivo), préstamos y deudas en ambos sentidos ("Me prestaron", "Presté dinero", "Pagué por alguien"…), ingresos. Movimientos como pase de abordar y resumen como bitácora de vuelo. |
| **Ideas** | Tablero de notas adhesivas con colores, etiquetas, favoritas y "¡Hecho!". |
| **Gatos** | Pasaporte felino por gato, salud y veterinario (con próxima fecha), peso con gráfica y compras (se pueden registrar también en Finanzas). |
| **Hábitos** | Marca tus hábitos del día, rachas, semana a la vista y pista de despegue. |
| **Diario** | Nota del día y estado de ánimo con iconos de cielo, calendario del mes. |
| **Ajustes** | Tema (Cielo, Noche estrellada y más), foto de fondo y respaldo de todo en un solo `.json`. |

### Estructura

```
docs/
  index.html, hub.js, hub.css     pantalla de inicio
  sw.js, manifest.webmanifest     app instalable y sin internet
  shared/                         estilos, iconos, temas, efectos y jets compartidos
  finanzas/ ideas/ gatos/ habitos/ diario/ ajustes/
```

### Publicar cambios

GitHub Pages publica desde la rama `main`, carpeta `/docs`. Al cambiar archivos, sube la versión de `CACHE` en `docs/sw.js` para que el teléfono descargue la actualización.

Para probar en la computadora: `cd docs && python3 -m http.server 8000` y abre `http://localhost:8000/`.
