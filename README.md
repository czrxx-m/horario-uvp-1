# Mi Horario · Ing. Agronomía (UVP)

Mi horario de clases como página web instalable (PWA). Funciona sin internet
una vez abierta la primera vez.

## Archivos

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | Estructura de la página |
| `style.css` | Diseño |
| `horario.js` | **Tus clases.** Es el único archivo que editas cuando cambia el horario |
| `script.js` | Lógica (día actual, próxima clase, progreso, buscador…) |
| `sw.js` | Service worker: guarda los archivos para usar la app sin internet |
| `manifest.json` | Datos para instalarla como app (nombre, colores, íconos) |
| `uvp.png` | Logo de la UVP |
| `icons/` | Íconos de la app, generados a partir del logo |

> En GitHub Pages las mayúsculas importan: `uvp.png` y `UVP.png` son archivos
> distintos. Deja todos los nombres en minúsculas, tal como están aquí.

## Subirlo a GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `mi-horario`).
2. Sube **todo el contenido de esta carpeta** a la raíz del repositorio
   (`index.html` debe quedar en la raíz, junto con la carpeta `icons`).
3. En el repositorio entra a **Settings → Pages**.
4. En *Build and deployment* elige **Deploy from a branch**, rama `main`,
   carpeta `/ (root)` y guarda.
5. En uno o dos minutos tu página queda en
   `https://TU-USUARIO.github.io/mi-horario/`.

## Instalarla en el celular

- **Android (Chrome):** abre la página y toca **Instalar como app** (aparece
  al final de la página) o el menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari):** botón **Compartir** → **Añadir a pantalla de inicio**.

## Cambiar el horario

Edita `horario.js` (las instrucciones están al inicio del archivo) y súbelo a
GitHub. Al abrir la app con internet se descarga la versión nueva
automáticamente; no hace falta borrar nada.

## Detalles útiles

- **Abrir en un día concreto:** `index.html?dia=martes`.
- **Accesos directos:** al mantener presionado el ícono de la app en Android
  salen *Mi semana* y *Mis materias*.
- **Teclado:** en el selector de días, las flechas ← → cambian de día.
- **Buscador:** acepta varias palabras, por ejemplo `martes química`.
- **Privacidad:** `index.html` incluye `noindex` para que Google no indexe tu
  horario. Si quieres lo contrario, borra esa línea.
- **Si agregas archivos nuevos** a la app, añádelos también a la lista
  `ARCHIVOS` de `sw.js` para que funcionen sin internet.
