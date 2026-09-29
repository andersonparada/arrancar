# Seguridad de la subida de archivos (investigación del agente de seguridad, 2026-09-28)

Investigación para el paso «Archivos PDF en `core/archivos`» del plan de hallazgos.
Solo lectura; se midió en memoria en WSL (exceljs con bomba zip, sharp con imagen
gigante, exportar textos con `=`). Versiones: sharp 0.35.4 (libvips 8.18.6,
librsvg 2.62.91, libheif 1.23.2), exceljs 4.4.0 (jszip 3.10.2),
`@fastify/multipart` 10.1.2, `@fastify/helmet` 13.1.1; `npm audit --omit=dev` = 0.

## Resumen

- **Alta, hoy:** un `.xlsx` de 405 KB hace subir la RAM del proceso en 1.27 GB al
  importar (bomba zip; exceljs sin límite descomprimido). Un usuario con permiso de
  importar tumba el servidor para **todas** las empresas.
- El servidor confía en el `Content-Type` del cliente para imágenes; sharp decodifica
  además SVG, TIFF, GIF, AVIF…: más superficie de ataque que la lista blanca.
- Re-codificar a WebP (ya se hace) elimina EXIF/GPS, polyglots, datos pegados al final
  y esteganografía LSB. Faltan límite de píxeles, concurrencia y formato real.
- **El PDF es el tipo peligroso** (no se transforma y otro usuario lo abre). Validar
  `%PDF` no alcanza: **inspeccionar con `qpdf` y rechazar** lo activo; guardar la
  versión reescrita por qpdf. No Ghostscript ni rasterizar en el contenedor.
- **ClamAV no cabe** (pide 3–4 GiB; la app usa ~72 MB). Recomendación: no por ahora.
- `GET /archivos/:id` lo abre cualquier usuario de la empresa con el id: insuficiente
  para estados de cuenta.

## Hallazgos

| # | Gravedad | Hallazgo | Corrección |
|---|---|---|---|
| A1 | **Alta** | Bomba zip en importar Excel (sin límite descomprimido) | Pre-validar el zip, límite 5 MB, límite de tasa |
| A2 | Media | MIME del cliente; sharp acepta cualquier formato | `metadata()` y exigir `jpeg/png/webp` |
| A3 | Media | `limitInputPixels` por omisión (268 MP), dos decodificaciones, sin cola | 50–100 MP, `.clone()`, cola de 1–2, `sharp.concurrency(1)` |
| A4 | Media | Sin límite de tasa en subir e importar | Límite por usuario y cuota por cuenta |
| A5 | Media | Archivos sin autorización por recurso dueño | Servir desde la ruta del módulo dueño |
| A6 | Baja | `failOn: 'error'` | `'warning'` (probar fotos de celular) |
| A7 | Baja | Plan: PDF solo con firma y sin transformar | qpdf (ver abajo) |
| A8 | Info | Exportar Excel ya es seguro contra inyección de fórmulas (se guardan como texto) | Prueba que lo fije; escapar si algún día hay CSV |
| A9 | Info | Bien hecho: nombres UUID, fuera del estático, sin path traversal, `nosniff`, `files: 1`, Excel importado no se guarda | — |

## Diseño propuesto

- **Lista blanca por caso de uso:** foto = JPEG/PNG/WebP; documento = PDF (o foto);
  importar = solo `.xlsx`. Quitar AVIF y GIF salvo que se necesiten. HEIC: se
  rechaza con mensaje; Safari de iOS convierte a JPEG si el `<input>` usa
  `accept="image/jpeg,image/png,image/webp"` (sin `image/heic`).
- **Firma real:** imagen con `sharp().metadata().format`; PDF con `%PDF-` en el byte 0
  y `qpdf --check`; xlsx con `PK\3\4`, `[Content_Types].xml` de hoja normal y sin
  `macroEnabled`. `file-type` solo para mensajes.
- **PDF con qpdf** (en el `Dockerfile`, `execFile` sin shell, tiempo límite 15 s,
  temporal privado que se borra siempre): `--check`, luego `--json
  --json-stream-data=none` (ve dentro de object streams y con nombres canónicos) y
  **rechazar** si hay `/JS`, `/JavaScript`, `/Launch`, `/EmbeddedFile(s)`, `/XFA`,
  `/RichMedia`, `/SubmitForm`, `/ImportData`, `/GoToE`, `/GoToR`, `/AA` u
  `/OpenAction` que no sea un destino; permitir `/URI` (a confirmar). Rechazar PDF
  con contraseña. Guardar la salida de `qpdf in.pdf out.pdf`. Puerto
  `InspectorDePdf` con su doble.
- **Excel:** antes de exceljs, leer el directorio del zip: ≤ ~100 entradas, rechazar
  `vbaProject.bin`, `embeddings`, `externalLinks`, `media`, `macroEnabled`; inflar en
  streaming con tope solo las partes necesarias y pasarle ese zip a exceljs (los
  tamaños declarados pueden mentir; un worker con `resourceLimits` no basta).
- **Servir:** `Content-Type` exacto de la base, `nosniff`; imágenes `inline`; PDF con
  `Content-Disposition` generado por el servidor (RFC 6266/5987); `Cache-Control:
  private, no-store` en documentos financieros; probar la CSP global con el visor de
  PDF de Chrome (una CSP `sandbox` impide mostrarlo); si se usa `pdfjs-dist`, versión
  ≥ 4.2.67 con `isEvalSupported: false`.
- **Autorización:** los documentos de un recurso sensible (estado de cuenta) se
  descargan por la ruta del módulo dueño (`GET /bancos/conciliaciones/:id/estado-de-cuenta`)
  con su permiso y alcance; opcionalmente, `GET /archivos/:id` los rechaza.
- **Baja de un cliente:** borrar también sus archivos del disco.
- **Límites (a confirmar):** foto 15 MB y 50–100 MP; PDF 10 MB; xlsx 5 MB y 50 MB
  descomprimido; 30 subidas/min y 5 importaciones/min por usuario; cuota por cuenta
  2–5 GB con aviso al 80 %.
- `core.archivos`: columnas `clase` (`imagen`/`documento`), `tipo_mime`, `sha256`
  (evidencia de integridad), miniatura y medidas nulables.

## Orden de cambios en el código

1. **Prioridad 1 (A1):** pre-validar el zip en `core/intercambio`, límite 5 MB y tasa.
2. `optimizador-sharp.ts`: formato real, `limitInputPixels`, `failOn`, `.clone()`.
3. `imagen.ts` y `leer-imagen.ts`: lista blanca por formato real y límites por ruta.
4. `SubirDocumento` + `InspectorDePdf` (qpdf), migración de `core.archivos`, `Dockerfile`.
5. Cabeceras por clase en el controlador; límite de tasa y cola de concurrencia.
6. Cliente: `accept` correctos.
7. Pruebas: SVG disfrazado, PNG gigante, xlsx bomba, xlsm, PDF con JS (en claro, en
   hex y en object streams), PDF de banco real aceptado, exportar `=cmd` como texto,
   otra empresa 404, usuario sin alcance bancario no ve el estado de cuenta.

## Preguntas para el usuario

1. ¿Solo JPEG, PNG y WebP (quitar AVIF y GIF)? ¿HEIC rechazado y convertido por Safari?
2. ¿50 o 100 megapíxeles?
3. PDF con contenido activo: ¿rechazar (recomendado) o sanear? ¿Se permiten enlaces?
4. PDF con contraseña: ¿rechazar pidiendo «imprimir a PDF», o pedir la contraseña?
5. ¿El estado de cuenta se ve al lado de la conciliación o se descarga?
6. ¿Estados de cuenta solo desde la conciliación, con permiso y alcance de Bancos?
7. ¿ClamAV descartado por ahora?
8. ¿Cuota por cuenta y tamaños máximos?
9. Importar Excel: ¿rechazar celdas con fórmula o tomar el valor calculado?
10. ¿Guardar el `sha256` del estado de cuenta como evidencia?

## Fuentes

OWASP File Upload Cheat Sheet; OWASP CSV Injection; documentación de sharp
(constructor y salida) y su issue 4479 (HEIC); file-type; qpdf JSON; PDFiD de Didier
Stevens; CVE-2024-29510 (Ghostscript, explotada); CVE-2024-4367 (PDF.js); issues de
Chromium 41131921 y 40328564 (CSP sandbox y PDF); ClamAV en Docker (3 GiB mínimo).
