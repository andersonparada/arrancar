# Informe de QA en el navegador — 2026-11-01

Alcance: **CP1-11** (Cuentas por pagar de punta a punta), **L4-14** (DTE de la SAT: importar, proveedores nuevos,
completar, confirmar, descartar, conciliar) y **L5-10** (libro, SAT-2237, retenciones, períodos; empresa general
agente de IVA y empresa de pequeño contribuyente). Código en `main` (`b395fcd`).

Herramientas: Chromium con Playwright (escritorio 1280 px; celular 380 px; claro y oscuro) y la API con sesiones
reales. Base propia `arrancar_qa` (migrar y sembrar `--demo`), API en :3200 y PWA en :5280 (los puertos 3100 y 5180
eran del usuario). Pruebas con `BD_PRUEBAS=arrancar_pruebas_qa`. Cuentas: `qagen` («Distribuidora El Quiroa, S.A.»,
jurídica, régimen general, agente de IVA contribuyente especial) y `qapeq` («Tienda Doña Rosa», individual,
pequeño contribuyente). Usuarios de `qagen`: `ccompleta` (ver, completar, autorizar), `aautoriza` (ver, autorizar),
`ssolover` (solo ver), `nnada` (solo libro), `llectura` (solo ver libro, retenciones y períodos). Contraseña de todos:
`QaClave-12345`.

Nota sobre `qpdf`: el encargo decía que no estaba, pero existe en `~/.local/opt/qpdf/bin/qpdf` (v12.4.2, es el
`RUTA_QPDF` del `.env` de desarrollo). Con él pasaron las pruebas del PDF del libro y se revisó con `qpdf --check`
el borrador y la copia emitida del libro.

## Resultado por flujo

### CP1-11 Cuentas por pagar

| Flujo | Resultado |
|---|---|
| Proveedor con 15 días de crédito (formulario, ficha «15 días desde la emisión», saldo) | Bien |
| Días de crédito: -5, 1.5, 1000, 366 dan «entero de 0 a 365»; 0, vacío y 30 se guardan | Bien (ver error 9) |
| Vencimiento propuesto: 15 d desde emisión, 15 d desde recepción, contado, un mes (31/ene → 28/feb), cruce de año, 365 d | Bien |
| Factura con retención (Q5,600 → IVA 600 × 15 % = 90.00, neto 5,510.00; Q3,000 → 48.21; Q2,500.00 y Q2,500.01 → 40.18; Q2,240 sin retención) | Bien, cuadra a mano |
| NDEB Q560 sobre una factura y NCRE Q560 sobre otra; NCRE de Q1,500 sobre factura de Q1,120 | Bien (422 claro: «El IVA de las notas de crédito no puede pasar…») |
| Bandeja: marcar, vencimiento vacío o anterior a la emisión, doble clic en «Completar» (una sola petición), confirmar con resumen | Bien |
| Lista de documentos: saldos (factura Q1,120 con NCRE Q560 → saldo 560.00; NCRE «Saldo a favor Q 0.00»), filtros, «Solo vencidos» | Bien |
| Autorizar en lote: resumen «aprueban a pagar Q 6,630.00» = 5,510 + 560 + 560 | Bien |
| Separación de funciones: `ccompleta` no autoriza lo que completó (403 `autorizacion_de_lo_propio`, tarjeta sin casilla con «Lo ingresó o completó usted…»); otro usuario sí; el propietario (con `autorizar-propios`) sí y queda auditado («Autorizó un documento que ingresó o completó.») | Bien |
| Lote de 101 ids, vacío, inexistente (404), todo o nada | Bien |
| Desautorizar (motivo vacío, 301 caracteres, válido), cambiar vencimiento (vacío, anterior a la emisión) | Bien (ver error 10) |
| Anular desde Cuentas por pagar (causa y motivo, confirma) y desde Libro de compras; doble anulación 422; con nota vigente 422 | Bien (ver error 8) |
| Eliminar un pendiente o completado desde aquí (204) y desde Libro; autorizado o procesado 422 con mensaje claro | Bien |
| Permisos: `ssolover` sin casillas ni botones y 403 en completar y autorizar; `nnada` sin menú y `/sin-permiso`; 403 por API | Bien (ver errores 6 y 7) |
| Sección «Cuentas por pagar» en Proveedores (formulario, ficha, saldo y vencido) | Bien |
| Celular 380 px y oscuro (bandeja, lista, ficha) sin desborde horizontal | Bien |

### L4-14 DTE de la SAT

| Flujo | Resultado |
|---|---|
| Cargar `.xls` (17 filas con 5 inválidas: otra empresa, fecha ilegible, total «abc», `CF`, USD): resultado por fila y columna, doble clic en «Cargar» (una petición) | Bien |
| Reimportar: 0 nuevos, 4 cambiados (NIT e IVA corregidos), 8 iguales, 5 rechazados | Bien |
| `.xlsx`, CSV con `;` y un `.xls` renombrado `.txt` (se detecta por contenido); vacío, HTML disfrazado y CSV ajeno dan 400 | Bien |
| Sin permiso: `ssolover` y `nnada` 403 | Bien |
| Completar varias filas (fecha de recepción para agente de IVA, «Usar la fecha de emisión», concepto, destino) | Bien |
| Vista previa y confirmar 3 facturas con proveedor existente (una sola petición con doble clic); preguntas fiscales del proveedor sin datos; IDP: Q1,500 = base 1,205.36 + IDP 150.00 + IVA 144.64 | Bien |
| **Confirmar DTE de proveedor nuevo («crear proveedores»)** | **Error alto (error 1)** |
| Descartar (motivo obligatorio), pestaña «Descartados» con «Restaurar» | Bien |
| Conciliación de octubre (cuadra, diferencias por monto y fecha, no registradas, anuladas, descartadas) | Bien |
| Celular 380 px y oscuro | Bien |

### L5-10 Libro, SAT-2237, retenciones y períodos

| Flujo | Resultado |
|---|---|
| Libro general de octubre (20 filas, 17 FACT, FPEQ, NCRE negativa, NDEB, IDP y combustible): totales a mano = 24,212.01; crédito fiscal 2,524.50 | Bien |
| Excel del libro (hojas Libro, Resumen, Anulados) | Bien (ver error 12) |
| Borrador PDF, emitir con folios (doble clic: 1 emisión, folios 1–2), copia idéntica, reemitir sin cambios 409, corregir folio (validaciones) | Bien; `qpdf --check` sin errores. No se vio el PDF renderizado |
| SAT-2237 «Por rubros» y «Como en el formulario» (casillas con la advertencia de nombres sin confirmar); cuadra con el libro y con el detalle de proveedores | Bien |
| Retenciones del mes (4 × IVA 15 %: 218.57), anotar constancia una y en lote, quitar, fecha anterior a la retención 400, todo o nada | Bien (ver error 11) |
| Enteros: monto exacto 218.57 → «enterado»; otros montos, negativos y 3 decimales; anular entero | Bien (ver error 11) |
| Anular con constancia y entero → «Por resolver» (pantalla y «Resolver» con cómo y nota) | Bien |
| Períodos: declarar (doble clic: 1 petición), historial, registrar en el período declarado con el control apagado (aviso) y encendido (se propone y se registra en el mes siguiente), reabrir (motivo), rectificar, anular o eliminar en período declarado 409 | Bien |
| Empresa de pequeño contribuyente: libro simplificado (IVA informativo 1,029.43 = 120 + 600 + 321.43 − 12; total 9,608.00), todo el IVA al costo (`empresa_sin_credito`), SAT-2237 «no lleva» con enlace al SAT-2046, página «Datos para el SAT-2046» con los dos caminos | Bien |
| Permisos del libro (22 rutas con un usuario de solo lectura): todo 403 menos ver; el borrador PDF va con `libro.ver` (así lo dice el plan) | Bien |
| Imprimir (menú oculto con `@media print`) y celular 380 px y oscuro en 11 pantallas | Bien (ver error 13) |

## Errores

### Alta
1. **Un DTE de proveedor nuevo no se puede confirmar desde la bandeja «DTE de la SAT».** Pasos: cargar un archivo con
   un emisor cuyo NIT no esté en Proveedores; completar concepto, destino y recepción; marcarlo y «Confirmar».
   Esperado (plan L4-k): crear el proveedor al confirmar, con la ventana de tipo de persona. Pasó: la ventana dice
   «Se crearán N proveedores nuevos…» pero cada fila sale en rojo («El proveedor de este DTE aún no existe: escoja
   uno o confirme el DTE para crearlo») y «Registrar 0 facturas» queda deshabilitado. Causa: la vista previa del
   servidor responde `dte_sin_proveedor` (necesita un `proveedorId`), el cliente lo trata como error
   (`separarVistaPrevia`) y `usarConfirmacionDeFilas` solo manda los ids de `listas`. El servidor sí confirma:
   `POST …/dte-recibidos/confirmar` con `datosFiscalesPorProveedor` por NIT crea el proveedor y registra la factura.
   **No se corrigió:** hace falta decidir cómo se piden el tipo de persona y los datos fiscales de un proveedor que
   aún no existe (el diseño pide la ventana y no está). Salida mientras tanto: crear el proveedor en Proveedores y
   la fila lo toma sola (`propuesta.proveedorId`). Prueba: `datos-de-la-confirmacion-qa.prueba.ts` (`it.fails`).

### Media
2. **Autorizar un documento ya autorizado da un mensaje engañoso.** Pasos: autorizar un documento y volver a
   autorizarlo (otra pestaña o persona). Esperado: «ya está autorizado». Pasó: 422 «El documento B-105 no está
   completado: complételo en la bandeja antes de autorizarlo.» Con un lote mixto el lote entero se rechaza con ese
   texto. Prueba: `cuentas-por-pagar-qa-hallazgos.api.prueba.ts` (`it.fails`).
3. **«Documentos por pagar» pide la lista de proveedores a Terceros y falla con 403 si el usuario no tiene
   permisos de Terceros.** Pasos: entrar como `ccompleta` (solo permisos de Cuentas por pagar). Pasó:
   `GET /api/terceros?papel=proveedor` 403 en cada carga; el filtro «Proveedor» queda sin opciones y hay un error en
   la consola (la pantalla no avisa).
4. **Fecha de constancia o de pago futura se acepta.** `PUT …/constancia` con fecha 2027-01-01 y un entero con fecha
   de pago 2027-06-01 responden 200/201 sin aviso (el entero cuenta como pagado y deja el mes «enterado»).
5. **Se puede registrar un entero mayor a lo retenido sin aviso** (pagado 537.14 de 218.57 → «con diferencia»). Es
   permitido por el diseño (varios pagos), pero al registrar no se avisa del exceso.

### Baja
6. En la bandeja de Cuentas por pagar, un usuario sin permiso de completar ve las fechas de vencimiento editables
   (9 campos sin función) y los enlaces «Ver en el libro de compras» que llevan a `/sin-permiso`.
7. La ficha de un documento anulado no muestra la causa, el motivo ni quién lo anuló (solo «Anulado»).
8. Anular desde Cuentas por pagar un documento de un período con retenciones constanciadas o enteradas no avisa en
   la respuesta de que quedaron «por resolver» (ya anotado como pendiente en `DONDE-QUEDAMOS.md`).
9. Al fallar la sección «Cuentas por pagar» del proveedor (días de crédito inválidos) el proveedor ya quedó guardado
   (`PUT /terceros/:id` 200 y luego `PUT …/proveedor` 400): el mensaje sale en su campo, pero la ficha cambió.
10. «Cambiar vencimiento» con la fecha vacía muestra la burbuja nativa del navegador («Please fill out this field.»,
    en inglés según el navegador) en lugar del texto de la app; el título de la ficha se parte («Factura B-» / «104»)
    cuando hay cuatro botones.
11. Retenciones: el grupo se llama «IVA de agentes de retención y pequeño contribuyente (5 %)» aunque las filas son
    de 15 % (contribuyente especial); en la tarjeta del grupo (1280 px) «Retenido Q 218.57» se pisa con «Pagado».
    Además el número del entero se guarda en mayúsculas y sin espacios («Boleta 123» → «BOLETA123»).
12. Libro: el subtítulo dice «Compras del período 2026-10-01» (fecha cruda); en el Excel, la hoja «Anulados» trae la
    fecha de anulación en UTC con formato ISO (`2026-11-02T01:25:53.867Z`, ya es 1 de noviembre en Guatemala) y la
    causa como código (`error_de_captura`).
13. La vista previa de una fila con IVA mayor al correspondiente junta dos mensajes casi iguales («…ábralo en el
    formulario…» y «…regístrela a mano…»); el primero manda a un botón que aún no existe («Abrir en el formulario»).
14. El mensaje de un archivo vacío dice «Suba un Excel (.xlsx), por ejemplo la plantilla» aunque en «DTE de la SAT»
    no hay plantilla.
15. Observación: un proveedor con el mismo NIT que la empresa (autofactura) se acepta sin aviso.

Las cifras negativas del archivo de la SAT se guardan sin signo (`-100.00` → `100.00`): es lo previsto
(las notas pueden venir negativas), pero también ocurre con una factura.

## Cuadres a mano

- Retención IVA 15 % (contribuyente especial): 5,600 → base 5,000, IVA 600, retención 90.00, neto 5,510.00;
  3,000 → 2,678.57 + 321.43, retención 48.21; 2,500.00 y 2,500.01 → 40.18 cada una; total retenido 218.57 y base
  1,457.15 (600 + 321.43 + 267.86 + 267.86).
- Saldo de A-102: 1,120.00 − NCRE 560.00 = 560.00. Autorizar en lote: 5,510.00 + 560.00 + 560.00 = 6,630.00.
- Libro de octubre: bienes 19,832.15 + combustibles 1,205.36 + pequeño contribuyente 500.00 + IDP 150.00 +
  IVA con crédito 2,524.50 = 24,212.01 (= suma de totales, con la NCRE restando 560 y la NDEB sumando 560). SAT-2237:
  otras compras 19,832.15 / 2,379.86 + combustibles 1,205.36 / 144.64 = 2,524.50 de crédito.
- Pequeño contribuyente: 1,120 + 5,600 + 3,000 − 112 = 9,608.00; IVA informativo 120 + 600 + 321.43 − 12 = 1,029.43.

## Pruebas agregadas

- `servidor/src/pruebas-api/cuentas-por-pagar-qa-hallazgos.api.prueba.ts`: autorizar un documento ya autorizado debe
  decirlo (`it.fails` hasta corregirlo; al corregirlo fallará y habrá que quitar la marca).
- `cliente/src/modulos/libro-de-compras/composables/bandeja/datos-de-la-confirmacion-qa.prueba.ts`: un DTE de
  proveedor nuevo no debe impedir confirmar (`it.fails`).

No se corrigió ningún error de código: el único alto necesita una decisión de diseño.

## Sin probar

- **El archivo real de la SAT:** no hay uno en el repositorio. Todo L4-14 se hizo con `.xls`, `.xlsx` y CSV
  generados con el escritor de prueba de `core/intercambio` y el mapa de encabezados del lector. **Falta repetirlo
  con el archivo real del usuario** (nombres de columnas, formatos de fecha y de monto, NIT de otras empresas).
- «Abrir en el formulario» desde la bandeja (aún no existe), ventana de tipo de persona del proveedor nuevo (error 1),
  pantalla «Análisis de compras», análisis con IDP y galones, facturas especiales (FESP) y sus retenciones al
  5 %/ISR, régimen que cambia a mitad de año y emisión del libro simplificado con folios.
- El PDF del libro no se vio renderizado (no hay visor en WSL): solo `qpdf --check`, el número de páginas y las
  pruebas automáticas. La impresión se probó emulando `@media print` (menú oculto, 2 páginas A4 horizontales).
- Declarar un período de pequeño contribuyente (SAT-2046), «Encender/apagar el control» desde la pantalla y la
  rectificación con «Cambios desde la declaración» distinto de cero se probaron por API o solo se vieron vacíos.
- Límite de 10 solicitudes por minuto en la importación de la SAT y tamaño máximo (no se forzaron).
