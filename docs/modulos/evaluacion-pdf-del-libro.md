# Evaluación de la biblioteca para el PDF del libro de compras (agente de seguridad, 2026-10-20)

Revisión pedida para la §3.9.5 de `docs/modulos/diseno-datos-libro-de-compras.md` (PDF del libro con folios,
generado en el servidor). Solo lectura sobre el código; las medidas se hicieron en un directorio temporal fuera del
repositorio (Node 22, WSL, 5,000 filas de 10 columnas en oficio horizontal). No se instaló nada en el proyecto.

## Recomendación

1. **Sí al PDF en el servidor** (decisión (C) de la §3.9.5.1): es lo único que permite saber las páginas antes de
   consumir los folios. `window.print()` (como Bancos) no sirve para el libro foliado y se queda para los demás reportes.
2. **Preferida: `pdfkit` directo, versión exacta `0.20.2`**, con la paginación propia que ya diseñó la §3.9.5 (filas
   fijas por página, una línea por fila, nombres recortados). Con filas fijas el motor de maquetación de `pdfmake`
   casi no aporta, y a cambio trae superficie de ataque y consumo que no hacen falta (ver comparación).
3. **Alternativa aceptable: `pdfmake` `0.3.12` exacta**, solo si el usuario prefiere ahorrar código de dibujo de
   tablas, **con** todos los controles de abajo (política de URL y de archivos locales denegadas, textos recortados
   antes de entregarlos, límite de filas). No usar versiones anteriores a 0.3.8.
4. No usar `pdf-lib` (sin versión nueva desde mayo de 2022) ni `jsPDF`/PDF en el cliente (el folio no sería confiable).

## Hallazgos

| # | Gravedad | Hallazgo | Escenario | Corrección |
|---|---|---|---|---|
| P1 | **Alta** | Un texto largo del usuario tumba el servidor al maquetar con `pdfmake`: 5,000 caracteres sin espacio tardan 0.75 s; 20,000 tardan 11.8 s y 1.7 GB de RAM; 100,000 no terminan en 40 s; 10 MB agotan el heap de 4 GB y matan el proceso. El tiempo crece más que lineal | Un usuario con permiso de crear compras guarda un proveedor o descripción enorme (el campo de la API no tiene tope bajo) y otro emite el libro: el proceso cae para todas las empresas | Recortar **cada** texto a un máximo fijo (p. ej. 60 caracteres, con «…») **en el dominio, antes** de dibujar; y validar el largo de los campos de texto en la API. Con `pdfkit` y `lineBreak: false` + `ellipsis` el costo no depende del largo, pero se recorta igual |
| P2 | Media | Todo el proceso queda bloqueado mientras se genera (el bucle de eventos no atiende nada): 5,000 filas = 0.45 s (`pdfmake`) a 0.7 s (`pdfkit`); un libro de 20,000 filas, varios segundos | Varias emisiones simultáneas (límite 5 por minuto por usuario, pero hay muchos usuarios) congelan la API | Tope de filas por emisión (5,000, igual que la importación) con error claro; límite de 1 generación a la vez en el proceso (cola de 1 con `p-limit` o similar, o semáforo propio); evaluar un `worker_thread` si el uso crece |
| P3 | Media | `pdfmake` ≥ 0.3.0 incluye un resolvedor de URL y de archivos locales: imágenes, fuentes o SVG pueden apuntar a `http://…` o a rutas del disco. Fue el SSRF CVE-2026-26801 (GHSA-wp52-r2fp-4vmr, alta, versiones 0.3.0-beta.2 a 0.3.5, corregido en 0.3.6); el control del archivo local llegó en 0.3.8 y un rodeo por imágenes dentro de SVG se corrigió en 0.3.12 | Si algún día un texto o logotipo de la empresa llega al documento como imagen o `src`, se leen archivos del servidor o se hace una solicitud a la red interna | Con `pdfmake`: `setUrlAccessPolicy(() => false)` y `setLocalAccessPolicy` que solo permita la carpeta de fuentes (se comprobó: `/etc/passwd` y `http://127.0.0.1` fallan con ese ajuste); jamás pasar datos del usuario como `image`, `svg`, `qr` ni `link`. Con `pdfkit` directo esta superficie no existe |
| P4 | Media | `pdfmake`/`pdfkit` escriben tal cual un `link` con `javascript:` (se comprobó: sale `/URI (javascript:alert(1))`) | Un nombre de proveedor usado como enlace queda como acción del PDF | No usar `link` ni `goTo` con datos del usuario. Mantener el rechazo de `/JS`, `/Launch` y similares de `core/archivos`; el PDF propio no los lleva (se comprobó: sin `/JS`, `/OpenAction`, `/Launch`, `/EmbeddedFile`, `/AA`, `/Encrypt`) |
| P5 | Media | Consumo de memoria: `pdfmake` 5,000 filas = 154 MB de heap y 245 MB de RSS (la app usa ~72 MB); `pdfkit` directo = 35 MB de heap y 123 MB de RSS, y funciona con el heap limitado a 100 MB. El contenedor de producción no tiene límite de memoria | Una emisión grande más otras tareas agotan la RAM del servidor | Límite de filas y de concurrencia (P2); poner `mem_limit` al servicio `app` de `infra/docker-compose.yml` y comprobar que 5,000 filas caben con holgura |
| P6 | Baja | Caracteres que la fuente no tiene (japonés, emoji, algunos símbolos): no hay error, salen vacíos o con un recuadro. Controles Unicode como U+202E (inversión de texto) o U+0000 | Un proveedor con nombre en otro alfabeto sale ilegible en un documento tributario; texto invertido engaña al leer | Normalizar a NFC, quitar caracteres de control y de dirección (U+0000–U+001F, U+007F–U+009F, U+200B–U+200F, U+202A–U+202E, U+2066–U+2069) antes de dibujar; si la fuente no tiene un carácter, reemplazarlo por `?`. Fuente con buena cobertura latina (ver P7) |
| P7 | Baja | Licencia de la fuente: `pdfmake` trae Roboto (4 `.ttf`, 640 KB) sin archivo de licencia. Roboto se distribuyó bajo Apache 2.0 (Font Squirrel, avisos de terceros); una fuente de la Wikipedia dice que Google la cambió a SIL OFL en 2020, **no confirmado** | Incumplir el aviso de licencia al redistribuir la imagen | Copiar al repositorio solo `Regular` y `Bold` (≈ 320 KB), con su archivo de licencia en la misma carpeta (`servidor/recursos/fuentes/`). Para no depender de Roboto, Noto Sans o Liberation Sans (ambas SIL OFL 1.1, uso comercial y embebido permitido) |
| P8 | Baja | Dependencias transitorias: `fflate` (de `pdfkit`) tuvo GHSA-px8p-9vwx-vf98 (CVE-2026-45820, bucle infinito en `unzipSync`, hasta 0.8.2); `pdfkit` 0.20.2 usa 0.8.3 (corregido) y de todos modos solo comprime | Ninguno hoy | `npm audit` en CI; no actualizar sin revisar |
| P9 | Info | `pdfmake` 0.3.x avisa en consola si no hay política de URL/archivos y nada más. Sin scripts de instalación (`hasInstallScript` ausente en `pdfmake`, `pdfkit` y `fontkit`) | — | Mantener `npm ci --ignore-scripts` si el proyecto lo permite |

## Datos revisados

### Versión y mantenimiento (consultado hoy con `npm view` y OSV)

| Paquete | Versión | Última publicación | Licencia | Notas |
|---|---|---|---|---|
| `pdfmake` | 0.3.12 | 2026-10-17 | MIT | Versiones 0.3.8 a 0.3.12 entre mayo y octubre de 2026; mantenido |
| `pdfkit` | 0.20.2 | 2026-09-07 | MIT | Mantenido; lo usa `pdfmake` |
| `fontkit` | 2.0.4 | 2026-09-30 | MIT | Lee `.ttf`/`.otf`/`.woff`; solo fuentes nuestras |
| `pdf-lib` | 1.17.1 | 2022-05-12 | MIT | **Sin mantenimiento hace 4 años**; descartada |

### Vulnerabilidades conocidas (OSV, GitHub Advisories y `npm audit`)

- `pdfmake`: GHSA-wp52-r2fp-4vmr / CVE-2026-26801 (SSRF, alta, corregido en 0.3.6) y GHSA-rj3r-r7hh-jxfq /
  CVE-2025-11362 (denegación de servicio por redirecciones al incrustar archivos, solo `0.3.0-beta.1` a `beta.17`).
  CVE-2022-46161 (código en el campo de pruebas del repositorio, hasta 0.2.5) no está en el paquete de npm.
- `pdfkit`, `fontkit`, `linebreak`, `xmldoc`, `sax`, `png-js`, `restructure`, `brotli`, `unicode-trie`, `dfa`: **sin
  avisos** en OSV. `fflate`: ver P8.
- `npm audit` con `pdfmake@0.3.12` instalado limpio: **0 vulnerabilidades**.

### Peso

| | Instalado (incluye todo) | Paquetes | Observaciones |
|---|---|---|---|
| `pdfmake` | 38 MB | 25 | 12 MB propios (incluye navegador, `vfs_fonts`, fuentes estándar) más `pdfkit` 11 MB y `fontkit` 6 MB |
| `pdfkit` solo | ≈ 26 MB | ≈ 20 | Sin `xmldoc`/`sax`, sin código de URL ni SVG |

El peso en disco no es problema (la imagen ya lleva `sharp`); importa la cantidad de código que lee entradas.

### Cómo trata los textos (medido)

- Acentos y eñes: bien con Roboto. Emoji y japonés: no hay glifos (P6).
- `=cmd|…`, `<script>`, `{{ a }}`, `%s`, `${x}`: salen como texto literal, sin ejecución (el PDF no interpreta plantillas).
- Cadena de 100,000 caracteres en 55 filas dentro de una tabla de 500 filas: 1.6 s y 267 MB (con ancho de columna fijo
  en una sola línea); un solo párrafo sin ancho fijo, mucho peor (P1).
- Metadatos: pone `Producer` y `Creator` propios; se pueden fijar con `info` (título, autor = razón social).

### Comparación

| Criterio | `pdfkit` directo | `pdfmake` | `pdf-lib` | `window.print()` |
|---|---|---|---|---|
| Páginas conocidas antes de dibujar | Sí (paginación propia) | Sí si se pagina igual | Sí | **No** (lo decide el navegador) |
| Folio confiable | Sí | Sí | Sí | No |
| Mismo resultado en cualquier equipo | Sí | Sí | Sí | No |
| Heap, 5,000 filas | 35 MB | 154 MB | no medido | 0 en servidor |
| Lee red o disco por indicación del documento | No | Sí (hay que bloquearlo) | No | No |
| Texto largo | Se recorta (`ellipsis`) | Maqueta todo: P1 | Manual | El navegador |
| Código propio a escribir | Más (tabla, encabezado, pie) | Menos | Más | Ninguno |
| Mantenimiento | Activo | Activo | Detenido | — |

### Ejecución en el contenedor (`Dockerfile`)

- JavaScript puro: no necesita paquetes del sistema, ni Chromium, ni Ghostscript (a diferencia de Puppeteer, que
  se descarta: pide ~400 MB y ejecuta HTML). La imagen `node:22-bookworm-slim` y `USER node` sirven tal cual.
- `npm ci --omit=dev` instala `pdfkit` o `pdfmake` solo si están en `dependencies` de `servidor/package.json`.
- Las fuentes deben estar **dentro de la imagen** (carpeta del servidor copiada en el `Dockerfile`); no se descarga
  nada en tiempo de ejecución. Hoy `COPY --from=construccion /app/servidor/dist` solo copia `dist`: la carpeta de fuentes
  tendrá que copiarse a mano o generarse dentro de `dist` en `npm run construir` (decisión del programador).
- No hay límite de memoria ni de CPU en `infra/docker-compose.yml`: agregar `mem_limit` (ver P5).
- Salida: el PDF generado debe pasar por el mismo camino de `DocumentosProtegidos.guardar` (qpdf `--check` y reglas
  de contenido activo). Sin enlaces, pasa; es una prueba de integración útil.

### Cómo imprime Bancos hoy

Cada reporte de `cliente/src/modulos/bancos/paginas/Reporte*.vue` llama a `window.print()` y usa las clases de Tailwind
`print:hidden` y `print:block` para ocultar filtros y mostrar un encabezado. Es seguro (no toca el servidor) pero
el navegador corta las páginas donde quiere, de modo que no sirve para folios consecutivos y verificables.

## Controles a aplicar

1. **Dependencia:** una sola (`pdfkit` o `pdfmake`), en `dependencies` del servidor, **versión exacta** (sin `^`):
   `0.20.2` o `0.3.12`. Subir de versión solo con `npm audit` limpio y leyendo el CHANGELOG.
2. **`npm audit --omit=dev`** en `npm run revisar` o en la integración continua; fallar con gravedad alta.
3. **Fuentes en el repositorio:** `Regular` y `Bold` (Latin) en `servidor/recursos/fuentes/` con su licencia; se
   registran por ruta absoluta construida con `import.meta.url`; nunca una ruta ni una URL que venga de la base o la API.
4. **Entradas del dominio:** límite de 5,000 filas por emisión (error 422 claro) y 160–200 páginas; cada texto
   normalizado (NFC), sin caracteres de control o de dirección, y recortado a su máximo por columna; montos solo desde
   `numeric` ya formateados por el servidor. Ningún `image`, `svg`, `qr`, `link` ni `goTo` con datos del usuario.
5. **Con `pdfmake`:** `setUrlAccessPolicy(() => false)` y `setLocalAccessPolicy` limitada a la carpeta de fuentes,
   configurados una sola vez al arrancar; prueba que lo fije.
6. **Concurrencia y tiempo:** una generación a la vez por proceso (cola de 1), tiempo máximo medido (≤ 5 s para 5,000
   filas) y registro de duración; `mem_limit` en el contenedor.
7. **Pruebas:** libro con nombre de 100,000 caracteres (se recorta y termina rápido), con `=cmd`, `<script>`, emoji,
   U+202E y U+0000; 5,000 filas dentro del tiempo y memoria; el PDF no contiene `/JS`, `/URI`, `/Launch`, `/OpenAction`,
   `/EmbeddedFile` y pasa `qpdf --check`; la paginación no depende del contenido (mismo número de páginas que calcula
   `paginarLibro`).
8. **Metadatos:** fijar `Title`, `Author` (razón social) y `Subject`; sin datos personales del usuario que emite.
9. **Error sin fuga:** si el dibujo falla, responder un código propio sin pila ni rutas, y no consumir folios (el dibujo
   ocurre dentro de la transacción de la §3.9.5.3, que se revierte).

## Preguntas para el usuario

1. **¿`pdfkit` directo (recomendado) o `pdfmake`?** Recomiendo `pdfkit`: menos memoria (35 frente a 154 MB), sin
   lectura de red ni disco por indicación del documento, y la paginación ya es propia. Cuesta algo más de código de
   dibujo (una tabla de 10 columnas con encabezado y pie).
2. **¿Se acepta recortar los nombres a 60 caracteres con «…» en el PDF?** Recomiendo que sí (ya lo prevé la §3.9.5);
   el libro completo con el nombre entero queda en pantalla y en Excel. Si un auditor exige el nombre completo, habría
   que dar dos líneas por fila y menos filas por página.
3. **¿Tope de 5,000 filas por emisión?** Recomiendo que sí (igual que la importación; unas 160 páginas). Un período con
   más compras se tendría que dividir, lo cual para este tipo de empresas es muy improbable.
4. **¿Fuente Roboto (la que trae `pdfmake`) o Noto Sans/Liberation Sans (SIL OFL)?** Recomiendo Noto Sans Regular y
   Bold: licencia OFL confirmable y mejor cobertura de acentos latinos; pesa cerca de 600 KB. (Si se usa Roboto, guardar
   su licencia junto a los archivos.)
5. **¿Ponemos `mem_limit` (p. ej. 1 GB) al servicio `app`?** Recomiendo que sí; hoy no hay límite y cualquier tarea
   pesada puede tumbar al resto.
6. **¿Aceptan un nombre de proveedor en otro alfabeto como `?` en el PDF?** Recomiendo que sí; el dato completo queda en
   la base, la pantalla y el Excel.

## Fuentes

- GitHub Advisory Database / OSV: [GHSA-wp52-r2fp-4vmr](https://api.osv.dev/v1/vulns/GHSA-wp52-r2fp-4vmr) (CVE-2026-26801,
  pdfmake SSRF), [CVE-2025-11362](https://advisories.gitlab.com/npm/pdfmake/CVE-2025-11362/) (pdfmake denegación de
  servicio), [CVE-2022-46161](https://advisories.gitlab.com/npm/pdfmake/CVE-2022-46161/) (falso positivo para el paquete
  de npm), [GHSA-px8p-9vwx-vf98](https://api.osv.dev/v1/vulns/GHSA-px8p-9vwx-vf98) (fflate).
- CHANGELOG de `pdfmake` 0.3.6 a 0.3.12 (incluido en el paquete: `setUrlAccessPolicy`, `setLocalAccessPolicy`).
- Registro de npm (`npm view`) para versiones, fechas, licencias y dependencias; `npm audit` sobre una instalación limpia.
- OWASP: Denial of Service Cheat Sheet, File Upload Cheat Sheet, SSRF Prevention Cheat Sheet; CWE-400, CWE-918, CWE-117.
- Licencia de Roboto: [Font Squirrel](https://www.fontsquirrel.com/fonts/roboto) (Apache 2.0); el cambio a OFL en 2020 solo
  lo menciona [Wikipedia](https://en.wikipedia.com/wiki/Roboto) y no se pudo confirmar.
- Documento propio: `docs/modulos/seguridad-de-archivos.md` (qpdf, límites de archivos).
