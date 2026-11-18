# Informe de QA de Bancos H2: saldo transcrito y estado de cuenta adjunto (2026-11-18)

Prueba de punta a punta en el navegador (Chromium con visor de PDF, 1280 px y 380 px, claro y oscuro, impresión emulada) contra una
base y una app propias, con datos inventados (empresa «Empresa Demo», cuentas «Monetaria QA-A…D», PDF y fotos generados por la
prueba; ningún estado de cuenta real). Referencias: `diseno-h2-evidencia-de-conciliacion.md` y `bancos.md` (sección H2). Usuarios:
propietario (todos los permisos), uno que solo concilia, uno que solo autoriza y uno de solo lectura.

**Resultado: no se encontró ningún error que bloquee el flujo ni de seguridad.** Hay 8 observaciones menores y 5 decisiones del usuario
(abajo). No se tocó el código de la app, y no hacía falta una prueba nueva: ninguna observación es un defecto con regla clara. Sí se corrigió una prueba del cliente que fallaba en este equipo (`marca-de-nota.prueba.ts`, «el reparto se muestra línea por línea»): comparaba «Q 100.00» con espacio normal y `formatearMonto` devuelve un espacio duro (U+00A0) con el ICU de este Node; ahora normaliza igual que `edicion-de-factura-anterior.prueba.ts`.

## Resultados por flujo

| Flujo | Resultado |
|---|---|
| H2a: escribir el saldo del banco; se guarda al salir del campo; «Coincide con el saldo calculado» (verde) o «Difiere en…» (rojo) en vivo | Bien (ver observación 1 por el signo) |
| H2a: formato inválido («12,270.5x»): aviso «Escriba el saldo como 1250.50…» y no se envía; «12,270.00» y «Q12,270.00» se aceptan | Bien |
| H2a: Terminar deshabilitado con la lista de lo que falta (saldo, diferencia, archivo) | Bien |
| H2a (API, bordes): 12270.01, -5.00 (sobregiro), 0, vacío y null se guardan; 1e3, 3 decimales, 14 enteros, «12 270.00» y «12,270.00» dan 400; terminar con saldo distinto 422; sin saldo 400; autorizar en proceso 422; saldo y archivo en elaborada 422; terminar dos veces 422 | Bien |
| Doble clic en «Terminar» y en «Autorizar»: una sola llamada | Bien |
| Terminar y autorizar con el saldo que coincide; «Autorizó» con nombre y fecha; la conciliación autorizada conserva archivo y comparación | Bien |
| Devolver (motivo obligatorio, «Campo obligatorio.» sin motivo): vuelve a «En proceso» y conserva el archivo | Bien |
| H2b: subir PDF, subir foto PNG y JPEG (queda WebP, «Foto · 16 KB»), reemplazar (PDF por foto por JPEG por PDF), ver y quitar con confirmación | Bien |
| H2b: el nombre del archivo se muestra tal cual, escapado (`<img onerror>` + 250 letras: 200 caracteres, sin inyección, se parte en líneas) | Bien |
| H2b: rechazos con mensaje claro: «no es PDF», HEIC (sin llamada, en el cliente), 11 MB (sin llamada), PDF con JavaScript (explica «Imprimir > Guardar como PDF»), PDF con contraseña (igual) | Bien (ver observación 3) |
| Terminar exige el archivo con `exigir_estado_de_cuenta = true` y no lo exige en `false` (cambiado como soporte y recargando); sin motivo «falta el archivo» al apagarlo | Bien |
| 429 `demasiadas_subidas` (la subida 31 en un minuto) mostrando su mensaje | Bien (ver observación 4) |
| 429 `revision_de_pdf_saturada`: 14 PDF a la vez de una cuenta dan 3 aceptados y 11 con 429 (`cuenta_al_tope`, `Retry-After: 30`); el mensaje se mostró con esa respuesta real reproducida en la pantalla (no se pudo provocar la espera en la pantalla misma) | Bien |
| Conciliación previa elaborada (se marcó por SQL, como la deja la migración): texto de «Autorizada antes…/devuélvala», sin botón Autorizar, `autorizar` por API da 400 «Devuélvala…»; al devolver sigue el flujo nuevo | Bien |
| Permisos: solo lectura ve la ficha, el archivo y el visor y ningún botón (403 en subir, quitar, saldo y autorizar); quien solo concilia no ve Autorizar (403) ni puede subir en elaborada (422); quien solo autoriza ve Devolver y Autorizar, y 403 en subir, quitar y saldo | Bien |
| Eliminar la conciliación (motivo): borra la fila y el archivo del disco; la auditoría guarda `estadoDeCuenta` con `nombreOriginal` y `sha256`; en el disco no quedó ningún archivo suelto | Bien |
| Reemplazar y quitar auditan `quitar` con el `sha256` anterior | Bien |
| Visor del PDF en Chromium con la CSP global: **se ve** dentro del `iframe`, tanto en el servidor de desarrollo como en la PWA compilada servida por la app (con la CSP también en la página) y en «Abrir en otra pestaña» | Bien |
| Visor en Firefox y WebKit de Playwright | No concluyente (ver decisión 3) |
| Celular 380 px, claro y oscuro: una columna en orden (documento, saldo, archivo, visor), sin desborde de la página, botones de acción visibles | Bien (observación 5) |
| Escritorio 1280 px, claro y oscuro: dos columnas | Bien |
| Imprimir (emulado): el visor y los botones se ocultan; salen saldo transcrito, «Coincide…» y datos del archivo | Bien en claro; ver observación 6 en oscuro |
| Lista de conciliaciones: ícono de clip en las que tienen archivo | Bien (observación 8) |
| CP4-B2b, desmarcar una nota desde la conciliación (API): sin motivo, motivo de 501 letras y sin concepto 400; bien 200 con auditoría «corregir» y motivo; ya sin marca 422 `nota_no_marcada`; nota de otra cuenta o mes 422 `movimiento_no_conciliable` | Bien |
| Desmarcar desde Notas (ventana con concepto y motivo obligatorios) | Bien |
| Dinero cuadrado a mano: cuenta A = 10,000 + 2,500 − 80 − 150 = 12,270.00; cuenta B = 5,000 + 1,000.50 − 20 − 33 − 33 = 5,914.50; coinciden con la pantalla | Bien |
| Montos en cero: saldo 0 se guarda; sobregiro al registrar una nota (saldo −200) lo rechaza la empresa («no permite sobregiros») | Bien |

## Observaciones (ninguna bloquea)

1. **Baja, redacción.** Con el saldo del banco mayor que el calculado sale «Difiere en **-Q 33.00**» (el servidor define la diferencia
   como calculado menos transcrito). Un monto negativo en «Difiere en» confunde. Pasos: transcribir 5947.50 con calculado 5914.50.
   Se esperaba «Difiere en Q 33.00» (idealmente diciendo si el banco muestra más o menos).
2. **Baja, formato.** El mensaje del servidor al terminar con diferencia dice «(Q12270.01) … (Q12270.00)» sin miles ni espacio; la
   pantalla usa «Q 12,270.00».
3. **Baja, mensaje.** Un archivo de texto con nombre `.pdf` responde «La imagen está dañada o no se puede leer.»; en un estado de cuenta
   convendría «El archivo no es un PDF ni una foto válidos».
4. **Baja, tono.** `demasiadas_subidas` trata de tú («Subiste… Espera… inténtalo»); el resto de la app trata de usted.
5. **Baja, celular.** En 380 px el cuadro «Según libros / Según banco» se desplaza de lado (por diseño: `overflow-x-auto`); la columna
   «Según banco» queda cortada y sin pista de que hay más a la derecha.
6. **Media, general (no solo H2).** El modo oscuro se decide con la clase `.oscuro`, sin regla `@media print`: al imprimir con el
   sistema en oscuro la hoja sale con los colores oscuros (sin «gráficos de fondo», texto claro sobre blanco). Se vio con la
   impresión emulada. Afecta a todos los reportes imprimibles. Propuesta: forzar la paleta clara bajo `@media print`.
7. **Media-baja, huella.** La «Huella» que muestra el archivo es el `sha256` del PDF **ya normalizado por qpdf** y cambia en cada
   subida del mismo archivo (el mismo PDF dio 78b3a9…, 9463f7… y dae680…; `sha256_recibido`, el de lo que mandó el usuario, es
   estable —857bfa…— y no se muestra). Así la huella no sirve para comprobar que es el PDF del banco.
8. **Baja, visual.** En la tarjeta de la lista, el enlace «Ver» queda unos píxeles más arriba que el clip y «Eliminar».

## Decisiones abiertas del usuario

1. **Tope de tamaño de solicitud en Caddy** (~20 MB para toda la instalación). Hoy lo limita la app (10 MB por PDF y 15 MB por foto);
   un cuerpo mayor llega hasta la app antes de rechazarse.
2. **Conservar 60 meses el `nombreOriginal`** del archivo en la auditoría (seguridad recomienda conservarlo; hoy el DTO auditado lo
   trae y la depuración lo borra con el resto a los 60 meses).
3. **Firefox y Safari con el PDF dentro de la página.** No se pudo comprobar: el Firefox de Playwright **no trae visor de PDF** (sale
   «This PDF can't be displayed here» también con un PDF servido sin ninguna CSP, prueba de control) y WebKit de Playwright no arranca
   en este equipo (faltan bibliotecas del sistema, sin permiso para instalarlas). Firefox solo avisó que ignora `X-Frame-Options` por
   `frame-ancestors` (inofensivo). Falta una prueba a mano en Firefox y Safari reales (en el celular también). Si alguno no muestra el
   PDF: CSP propia de esa respuesta (`default-src 'none'; frame-ancestors 'self'`) o dejar solo «Abrir en otra pestaña». No se relajó
   la CSP global ni se puso `sandbox`.
4. **La huella** (observación 7): mostrar la de lo recibido, o pedir a qpdf un resultado estable (`--deterministic-id`), o ambas.
5. **Desmarcar desde la conciliación** (CP4-B2b) solo existe en el servidor; no hay botón en la pantalla de la conciliación (se hace en
   Notas). Decidir si hace falta en pantalla.

## Notas de la prueba

- La base compartida de desarrollo dio `ECONNRESET` por puentes de Docker huérfanos (dos redes con 172.19.0.0/16, sin permiso para
  borrarlas); se usó un PostgreSQL propio en otro puerto y se retiró al terminar. El coordinador avisó luego que ya responde.
- Las bibliotecas del sistema que faltaban para Chromium (`libnss3`, `libnspr4`, `libasound2`) se bajaron sin instalar (`apt-get
  download` y `dpkg -x`) a una carpeta temporal. Todo lo de la prueba (capturas, archivos, scripts) está fuera del repositorio.
