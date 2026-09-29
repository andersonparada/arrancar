# Plan de implementación: Archivos y H2 (estado de cuenta en la conciliación)

_Agente de seguridad, 2026-09-29. Se basa en `seguridad-de-archivos.md` (incluida la
decisión sobre HEIC), en la fila «Archivos» y la sección H2 de
`plan-hallazgos-contables.md`, en B5.1 de `bancos.md` y en el código actual._

## 0. Lo que se encontró en el código

| # | Gravedad | Hallazgo | Consecuencia para el plan |
|---|---|---|---|
| C1 | Media | `SubirImagen` confía en el `Content-Type` del cliente (`dominio/imagen.ts` acepta también AVIF y GIF), decodifica dos veces en paralelo, sin `limitInputPixels` (268 MP por omisión) y sin límite por minuto. | Paso F1 |
| C2 | Media | `GET /archivos/:id` solo exige sesión y empresa: un estado de cuenta en `core.archivos` lo abriría cualquiera de la empresa que conozca el id, sin permiso de Bancos. | F2 y H2b: los archivos con dueño no se sirven por esa ruta |
| C3 | Baja | `terceros.foto_archivo_id` acepta cualquier uuid; la llave foránea se revisa sin RLS y puede apuntar a un archivo de otra empresa o a un estado de cuenta. | F2: Clientes revisa que la foto exista bajo RLS y no tenga dueño |
| C4 | Info | Bancos no tiene alcance por cuenta bancaria (no declara `recursosConAlcance`). «Permiso y alcance de Bancos» hoy = RLS por empresa + `bancos.conciliaciones.ver`. | Si el archivo se sirve siempre a través de la conciliación, heredará el alcance cuando exista |
| C5 | Info | Excel con fórmulas ya toma el valor calculado; una fórmula sin valor guardado da `null` («obligatorio», mensaje engañoso) y una con error llega como objeto. | Paso X1 |
| C6 | Info | La WSL (Ubuntu 22.04) trae qpdf 10.6.3, sin JSON v2 (llegó en 11.0.0); producción (`node:22-bookworm-slim`) trae 11.3.0. | F3: qpdf 11+ también en desarrollo y pruebas |
| C7 | Baja | El logo acepta SVG (librsvg) sin límite de píxeles; solo lo sube el superacceso. | F1 le aplica el mismo `limitInputPixels` |

## 1. Orden y dependencias

```text
X1 (Excel) ── independiente
F1 imágenes ──▶ F2 core.archivos (migración) ──▶ F3 PDF con qpdf ──▶ H2b archivo (servidor) ──▶ H2c cliente ──▶ H2d QA
H2a saldo transcrito (servidor) ── independiente de F*, puede ir primero ──▶ H2c
```

Sin esperar decisiones: **X1, F1, F2, F3 y H2a**. **H2b y H2c** esperan las preguntas
1 a 4.

## 2. Pasos (un commit cada uno)

### X1 · servidor: fórmulas de Excel sin valor calculado o con error — HECHO

- `libro-de-excel.exceljs.ts` → `valorVisible`: fórmula sin `result` → error por celda
  «La celda tiene una fórmula sin valor calculado: abra el archivo en Excel y
  guárdelo»; `result` con `error` → «La celda tiene un error (#REF!)»; `sharedFormula`
  igual.
- Pruebas: fórmula con resultado, sin resultado, `#DIV/0!`; exportar un texto que
  empieza con `=cmd|...` sale como texto.

### F1 · servidor: fotos endurecidas — HECHO

- Una sola lectura: `sharp(buf, { limitInputPixels: 100_000_000, failOn: 'error' })`,
  `metadata()` y `.clone()` para foto y miniatura.
- Formato real, sin mirar el MIME del cliente: solo `jpeg`, `png` y `webp`; `heif` →
  `FotoHeicNoAceptada` («Convierte la foto a JPEG: en el iPhone, Ajustes > Cámara >
  Formatos > Más compatible»); otro formato → `FormatoDeImagenNoAceptado`; más de
  100 MP → `ImagenDemasiadoGrande`.
- `sharp.concurrency(1)`; semáforo de 2 trabajos (`Semaforo` en
  `core/compartido/infraestructura`).
- `POST /archivos`: 30 por minuto por usuario (patrón de `limitar-importaciones.ts`),
  429 `DemasiadasSubidas`; 15 MB por archivo.
- Logo: el mismo `limitInputPixels`.
- `failOn: 'warning'` solo si 10 fotos reales de Android e iPhone pasan; si no, `'error'`
  y se anota en la bitácora.
- Pruebas con archivos generados en la prueba: SVG con MIME `image/png`; PNG uniforme de
  20000×20000 (se rechaza sin agotar la RAM); GIF, TIFF y AVIF; JPEG con EXIF y GPS (la
  salida no trae EXIF); PNG con zip al final (la salida no lo trae); la petición 31 del
  minuto responde 429.

### F2 · servidor: `core.archivos` admite documentos y dueño (revisar con `arquitecto-de-datos`)

- Migración de core: `clase text not null default 'imagen'` (`imagen`/`documento`);
  `ruta_miniatura`, `ancho` y `alto` nulables con `check` para imágenes; `sha256`
  (contenido guardado) y `sha256_recibido` (tal como llegó); `paginas` (PDF);
  `recurso_dueno` (p. ej. `'bancos.conciliaciones'`: si no es nulo, solo se sirve desde
  la ruta del módulo dueño). Filas existentes: `imagen`, sin dueño, sin `sha256`.
- `RutasDeImagen` → `RutasDeArchivo` (extensión según la clase).
- `AbrirImagen` y `buscar` filtran `recurso_dueno is null and clase = 'imagen'`; lo demás,
  404.
- Clientes: crear o editar con `fotoArchivoId` revisa dentro de su unidad de trabajo que
  la foto exista, sea `imagen` y no tenga dueño, por un puerto de `core/compartido`
  (`VerificadorDeFotos`).
- Pruebas: otra empresa 404; archivo con dueño 404 en `/archivos/:id`; tercero con foto
  que apunta a un documento 400.

### F3 · servidor + Dockerfile: PDF inspeccionado con qpdf

- Dependencia `qpdf` (Apache-2.0). Producción: `apt-get install -y
  --no-install-recommends qpdf` en la etapa final del `Dockerfile` (Bookworm: 11.3.0),
  sin fijar versión. `VerificadorDeQpdf` al arrancar exige 11+ (en producción la app no
  arranca sin él). Desarrollo en WSL: binario oficial de qpdf 11/12 de GitHub (verificar
  su sha256) y variable `RUTA_QPDF`; anotarlo en `CLAUDE.md`. CVE-2024-24246 solo afecta
  `--json-input`, que nunca se usa.
- Invocación sin shell: `execFile('prlimit', ['--as=536870912', '--cpu=20', '--',
  rutaQpdf, ...args], { timeout: 15000, maxBuffer: 64 MB, env: {} })`; temporal privado
  (`mkdtemp` 0700, nombres uuid, borrado en `finally`); uno a la vez.
- Puerto `InspectorDePdf` (con doble), implementación `InspectorQpdf`:
  1. Firma `%PDF-` en el byte 0; si falta, `DocumentoNoAceptado`.
  2. `qpdf --requires-password`: salida 0 → `PdfConContrasena` con la ayuda «Ábralo y use
     Imprimir > Guardar como PDF»; 3 (solo restricciones de propietario) → se acepta y
     se reescribe con `--decrypt`; 2 → no cifrado.
  3. `qpdf [--decrypt] in.pdf out.pdf` (2 → `PdfDanado`; 3 → se sigue): desaparece lo
     pegado al final y se normaliza.
  4. Se inspecciona `out.pdf` con `qpdf --json=2 --json-key=qpdf
     --json-stream-data=none`: se rechaza `/JS`, `/JavaScript`, `/Launch`,
     `/EmbeddedFile(s)`, `/XFA`, `/RichMedia`, `/SubmitForm`, `/ImportData`, `/GoToE`,
     `/GoToR`, `/AA`, `/Rendition`, `/Movie`, `/Sound`, un `/S` con esos tipos y un
     `/OpenAction` que no sea destino o `/GoTo`; se permiten `/URI`, `/GoTo` y `/Named`.
     Error `PdfConContenidoActivo`, que dice qué encontró.
  5. `qpdf --show-npages`: tope de 300 páginas.
- Límites (constantes de seguridad, no configurables): PDF 10 MB; foto de documento
  15 MB y 100 MP, reducida a lado máximo 2400 y calidad 85; 30 subidas por minuto por
  usuario, compartidas con F1.
- Puerto `DocumentosProtegidos` (`core/compartido/aplicacion`, armado en
  `core/archivos`): `guardar(contenido, { nombre, recursoDueno })` → `{ id, tipoMime,
  sha256, tamanoBytes, paginas }` (escribe en disco antes, inserta la fila en la unidad
  de trabajo del módulo; si falla, borra el archivo), `abrir(id)` y `eliminar(id)`.
- Pruebas (PDF escritos como texto y transformados con qpdf en la prueba):
  `/OpenAction` con JavaScript en claro, en nombre hexadecimal y dentro de un object
  stream; `/Launch`, `/EmbeddedFiles`, `/XFA`, `/AA`, `/GoToR`, `/SubmitForm` rechazados;
  `/URI` aceptado; cifrado con contraseña de usuario rechazado con ayuda; solo de
  propietario aceptado y guardado sin cifrar; PDF truncado, JPEG renombrado, PDF con
  MIME de imagen, PDF con zip al final; bomba flate cortada por `prlimit` o tiempo límite
  con error propio (nunca 500); un PDF real de banco (pedirlo al usuario con datos
  tachados).

### H2a · servidor: saldo transcrito del estado de cuenta (con `arquitecto-de-datos`)

- Migración de Bancos: `saldo_estado_de_cuenta numeric(14,2) null` y `check (estado <>
  'autorizada' or saldo_estado_de_cuenta = foto_saldo_calculado_estado_de_cuenta) NOT
  VALID` (no se rellenan las viejas; una migración futura que haga `UPDATE` sobre ellas
  fallará: anotarlo en el comentario de la tabla).
- Dominio `Conciliacion`: `transcribirSaldo(monto)` solo en `en_proceso`; `elaborar`
  exige el saldo (`FaltaElSaldoDelEstadoDeCuenta`); `autorizar` lanza
  `SaldoDelEstadoDeCuentaNoCoincide` si difiere de la foto.
- `PUT /bancos/conciliaciones/:id/saldo-del-estado-de-cuenta` con
  `bancos.conciliaciones.conciliar`; DTO con `saldoEstadoDeCuenta`. Sin permisos nuevos.
- Pruebas: terminar sin saldo 400; autorizar con saldo distinto 409; transcribir en
  `elaborada` 409; primera conciliación; `UPDATE` manual de una autorizada falla.

### H2b · servidor: archivo del estado de cuenta (espera preguntas 1 a 4)

- Migración de Bancos: `estado_de_cuenta_archivo_id uuid` → `core.archivos(id)` `on
  delete restrict`, `unique`.
- `bancos.conciliaciones.exigir_estado_de_cuenta` (booleano, `['instalacion','empresa']`,
  `publica: true`).
- Rutas que cargan la conciliación bajo RLS y el archivo solo a través de ella:
  `PUT …/:id/estado-de-cuenta` (multipart, `conciliar`, solo `en_proceso`, reemplaza y
  borra el anterior), `DELETE …/:id/estado-de-cuenta` (`conciliar`, solo `en_proceso`),
  `GET …/:id/estado-de-cuenta` (`ver`; `Content-Type` de la base, `Content-Disposition:
  inline; filename="estado-de-cuenta-AAAA-MM.pdf"`, `Cache-Control: private, no-store`,
  `nosniff`).
- `elaborar` exige el archivo si la configuración lo pide; DTO con `estadoDeCuenta: {
  tipoMime, tamanoBytes, paginas, sha256, subidoEn } | null` (nunca la ruta en disco).
- Eliminar la conciliación: la auditoría guarda el DTO con `sha256`; el archivo según la
  pregunta 3.
- Visor con `<iframe>` (`frame-src 'self'`), nunca `<object>` ni `<embed>`.
- Pruebas: otra empresa 404; sin `ver` 403; `GET /archivos/:id` con ese id 404; subir en
  `elaborada`/`autorizada` 409; terminar sin archivo con la configuración en `true` 400;
  cabeceras.

### H2c · cliente: saldo y archivo junto a la conciliación (espera la pregunta 2)

- Componentes `SaldoTranscrito` (monto y marca «coincide»/«difiere»),
  `EstadoDeCuentaAdjunto` (elegir, reemplazar, quitar; mensajes del servidor) y
  `VisorDeEstadoDeCuenta` (`<iframe>` al lado en `lg:grid-cols-2`, debajo en el celular,
  botón «Abrir en otra pestaña»); composable `usarEstadoDeCuenta`.
- `accept="application/pdf,image/jpeg,image/png,image/webp"`, sin `image/heic`;
  constantes en `utilidades/archivos.ts`.
- Terminar deshabilitado sin saldo y, si se exige, sin archivo. Prueba unitaria:
  comparar el saldo en centavos.

### H2d · `pruebas-qa`: de punta a punta

Chrome, Firefox, Safari de iOS y Android: PDF real de banco, foto del celular, PDF con
JavaScript, PDF con contraseña, quien autoriza ve el archivo, imprimir sin el visor.

## 3. Riesgos

- Visor en iOS: Safari puede mostrar solo la primera página dentro del iframe (por eso
  «Abrir en otra pestaña»; pdf.js sería una dependencia nueva, ≥ 4.2.67 con
  `isEvalSupported: false`).
- qpdf procesa archivos hostiles: proceso aparte, `prlimit`, tiempo límite, uno a la vez
  y sin shell; mantener la imagen al día (`docker compose build --pull` mensual).
- Espacio en disco: sin cuota por cuenta; vigilar el volumen `archivos`.

## 4. Preguntas para el usuario

1. ¿El estado de cuenta es **obligatorio por omisión**, y cada empresa puede apagarlo?
   _Recomendación: sí._
2. ¿Se ve **al lado** de la conciliación, con botón para abrirlo en otra pestaña? _Sí,
   sin pdf.js por ahora._
3. Si se **elimina** una conciliación, ¿se conserva su archivo como evidencia (en la
   auditoría con su huella, solo visible para soporte) o se borra? _Conservarlo._
4. ¿Se puede **terminar** con el saldo transcrito distinto del calculado (y que lo frene
   quien autoriza), o se bloquea al terminar? _Bloquear al terminar._

## Fuentes

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [qpdf: línea de comandos y códigos de salida](https://qpdf.readthedocs.io/en/stable/cli.html)
- [qpdf JSON v2 (desde 11.0.0)](https://qpdf.readthedocs.io/en/stable/json.html)
- [qpdf en Ubuntu jammy (10.6.3)](https://packages.ubuntu.com/jammy/qpdf)
- [CVE-2024-24246](https://github.com/advisories/GHSA-6733-f273-8q48)
- [sharp: `limitInputPixels` y `failOn`](https://sharp.pixelplumbing.com/api-constructor)
- [PostgreSQL: RLS; las llaves foráneas se revisan sin row security](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- RFC 6266 (`Content-Disposition`); CVE-2024-4367 (PDF.js)

## Respuestas del usuario (2026-09-29)

1. **Obligatorio por omisión** y configurable por empresa: sí.
2. **Visor al lado** de la conciliación con «Abrir en otra pestaña»: sí, sin pdf.js.
3. Al **eliminar** una conciliación, su estado de cuenta **se borra** (la auditoría
   conserva el DTO con su `sha256`, sin el archivo).
4. **Saldo que no coincide:** el usuario **puede ir guardando su progreso**, pero **no
   puede enviar a autorización** (terminar/elaborar) mientras el saldo transcrito difiera
   del calculado.
