# Informe de QA en el navegador — 2026-11-01 (segunda ronda)

Alcance: lo programado el 2026-11-01 sobre `main` (`6933592`): **PN-7 / L4-14** con el archivo real de la SAT del usuario,
**errores 2 y 3** de Cuentas por pagar y **E45-6** (errores 4 y 5: fechas futuras y accesorios del entero de retenciones).

Herramientas: Chromium con Playwright (escritorio 1280 px; celular 380 px; claro y oscuro) y la API con sesiones reales.
Base propia `arrancar_qa2` (migrar y sembrar), API en :3300 y PWA en :5380 (los puertos 3100 y 5180 son del usuario),
pruebas con `BD_PRUEBAS=arrancar_pruebas_qa2`. El archivo real (17 DTE de octubre de 2026) se usó solo en la base local:
aquí se citan filas por su posición y tipo, sin nombres ni NIT. Cuentas de prueba: una empresa receptora con el NIT del
archivo (persona individual, régimen general, no agente), otra igual para el caso de permisos, y una empresa agente de IVA
(contribuyente especial) con cuatro facturas para las retenciones. Usuarios con permisos parciales: sin
`proveedores.crear`, solo ver, Cuentas por pagar sin permisos de Terceros, retenciones solo ver y solo constancias.

## Resultado por flujo

### PN-7 / L4-14 con el archivo real

| Flujo | Resultado |
|---|---|
| Importar el `.xls` real (17 filas, 0 rechazos, 1 anulada en la SAT, fechas con y sin zona, IVA con 6 a 8 decimales) | Bien, pero con un aviso falso (error 2) |
| Reimportar el mismo archivo (antes y después de registrar): 17 sin cambio, aviso «Este mismo archivo ya se había subido» | Bien |
| Completar las 17 filas (concepto, destino, «usar fecha de emisión») y la NCRE con su factura (tres facturas del mismo NIT entre las que elegir) | Bien |
| Vista previa y confirmar con 12 proveedores nuevos: una tarjeta por NIT, tipo de persona, tres facturas del mismo NIT crean un solo proveedor | **Error alto (error 1: nada se podía confirmar)**; corregido |
| Propuestas de nombre: persona con coma «NOMBRES , APELLIDOS» (FPEQ) a nombres y apellidos; persona con nombre de negocio (sin coma) con aviso «Revíselo contra el RTU»; empresas (S.A., FOUNDATION) a razón social | Bien |
| Tarjeta: vaciar el nombre (no envía, foco en el campo, «Escriba los nombres.»), 81 caracteres («Máximo 80 caracteres (tiene 81)»), ida y vuelta de tipo sin perder lo escrito, doble clic en «Registrar» (una sola petición) | Bien |
| Se guardó lo editado en la tarjeta (nombres y apellidos escritos a mano) y el FPEQ quedó con nombres y apellidos separados | Bien |
| `agregar_papel`: NIT que ya es cliente («Ya está en Terceros como …: se le agregará el papel de proveedor»); se conserva el nombre del tercero y queda proveedor | Bien |
| Usuario sin `proveedores.crear`: 17 filas con `proveedor_nuevo_sin_permiso`, «Registrar 0 facturas» deshabilitado, filtro dice «falta crearlo en Proveedores»; confirmar por API da el error por fila | Bien (ver error 6) |
| NCRE: pide su factura, se registra con el cuadro «Neto a pagar» | Bien (ver error 8) |
| Anulado en la SAT: confirmar da `dte_anulado_en_la_sat` y no crea su proveedor | Bien en confirmar; la vista previa no lo avisa (error 3) |
| Descartar (motivo obligatorio, 400 sin él) y conciliación de octubre | Bien (ver error 7) |
| Permisos: solo ver 403 en descartar, confirmar y lista | Bien |
| Celular 380 px y oscuro: ventana de confirmar | Bien; la lista de la bandeja se desbordaba (error 4, corregido) |

### Errores 2 y 3 de Cuentas por pagar

| Flujo | Resultado |
|---|---|
| Autorizar lo ya autorizado: 422 `documento_ya_autorizado` («El documento … ya está autorizado.»), también en lote mixto (todo o nada) | Bien |
| Misma situación en pantalla (otra persona autoriza mientras se tiene la ventana abierta): aviso con el nombre del documento, «No se autorizó ningún documento: revise la lista, que ya se actualizó» y la lista se recarga | Bien |
| «Documentos por pagar» con un usuario sin permisos de Terceros: `GET /api/cuentas-por-pagar/proveedores` 200 con los proveedores, filtro lleno, sin errores en la consola (Terceros sigue dando 403) | Bien |

### E45-6: fechas futuras y accesorios del entero

| Flujo | Resultado |
|---|---|
| Constancia con fecha futura (una y en lote): 400 `constancia_con_fecha_futura` con el campo `fecha`; el lote señala la fila y no guarda ninguna; el campo de fecha de la ventana trae `max` = hoy | Bien |
| Pago con fecha futura: 400 `fecha_de_pago_futura` con el campo `fechaDePago` (también al corregir); el campo de la ventana no deja y el formulario no se envía | Bien (la burbuja nativa sale en el idioma del navegador) |
| Pago anterior al cierre del mes: se guarda y avisa «La fecha de pago (15/10/2026) es anterior al cierre del mes…» | Bien |
| Pago con impuesto + multa + intereses + mora: total de la boleta en vivo (10.00 + 5.00 + 2.50 + 1.25 = 18.75), un solo envío con doble clic | Bien |
| Estado «enterado» con accesorios: impuesto 218.57 igual a lo retenido más multa 100.00, intereses 10.50 y mora 5.25: `enterado`, pagado 218.57, accesorios 115.75 | Bien |
| Lista de pagos: «impuesto Q 218.57 + multa Q 100.00» y «impuesto Q 10.00 + multa Q 5.00 + intereses Q 2.50 + mora Q 1.25»; matriz del año «Q 328.57 de Q 218.57 + Q 108.75 extra» | Bien |
| Exceso de impuesto: confirmación antes de enviar («El impuesto pasa lo retenido … por Q 110.00»), aviso del servidor con la misma cifra; estado «Con diferencia», diferencia -100.00 | Bien en «Del mes»; **error medio al corregir desde «Pagos» (error 5)**, corregido |
| Corregir (sin enviar un accesorio queda en 0; el cálculo de «pagaría de más» descuenta el mismo pago) y anular (motivo obligatorio, doble anulación 422, el mes vuelve a «pendiente») | Bien |
| Validaciones: impuesto 0, multa negativa, tres decimales y texto en accesorios, `monto` del cuerpo viejo | Bien (400 por campo) |
| Permisos: solo ver y solo constancias no tienen botones de pago y reciben 403 en entero; «solo constancias» sí puede anotar constancias | Bien |
| Celular 380 px y oscuro: ventana de pago | Bien |

## Errores

### Alta
1. **El archivo real de la SAT no se podía confirmar en lote: todas las filas fallaban con «El archivo trae montos en
   columnas desconocidas (Código de establecimiento, NIT del Certificador)».** Pasos: cargar el `.xls` real, completar,
   marcar todo y «Confirmar» (la vista previa decía «Se registrarán 16 de 17» y todo era verde; al registrar: «Se
   registraron 0 facturas. 16 facturas no se registraron»). Esperado: registrar. Pasó: `columnasDesconocidasConMonto`
   trata como monto cualquier número en una columna que el mapa no conoce, y el archivo real trae dos columnas con números
   que no son dinero: el código de establecimiento y el NIT del certificador (además hay seis columnas de texto sin mapa).
   El aviso de la carga («Hay montos en columnas que el sistema no conoce») también era falso. **Corregido:** el servidor
   ignora esas ocho columnas conocidas (`COLUMNAS_SIN_MONTO`, sin tildes ni mayúsculas), también en lotes ya cargados;
   prueba en `bandeja-de-dte-reglas.prueba.ts`. Tras la corrección se registraron las 15 filas confirmables.

### Media
2. **(Corregido con el 1.)** El aviso de la carga y el error por fila decían «montos» cuando eran códigos y NIT.
3. **La vista previa no avisa que un DTE anulado en la SAT no se registra.** Pasos: marcar todo con una fila anulada y
   «Confirmar». Esperado: la fila sale en rojo con `dte_anulado_en_la_sat` (como al confirmar) y el contador no la cuenta.
   Pasó: la vista previa la da por buena («Se registrarán 16 de 17»; se registran 15), pide crear el proveedor de ese
   anulado (una tarjeta más en «Proveedores nuevos») y recién al registrar sale el error. El texto rojo
   «1 anuladas en la SAT no se pueden registrar» sí aparece, pero el contador y la tarjeta quedan mal. Prueba:
   `libro-de-compras-qa2-hallazgos.api.prueba.ts` (`it.fails`). No se corrigió (cambia la vista previa del servidor).
4. **La lista de la bandeja «DTE de la SAT» se desbordaba en celular (380 px)** con nombres largos de emisor: la
   lista era una cuadrícula de una columna sin `minmax(0, 1fr)`, así que se ensanchaba hasta el nombre sin cortar y el monto
   y los datos de la derecha quedaban fuera de la pantalla (la página se podía mover de lado). **Corregido:** `grid-cols-1`
   en `PanelDeLaBandeja.vue`. El mismo patrón (`grid gap-3 md:grid-cols-2` sin columna base) está en una decena de listas de
   Bancos: pendiente de revisar con nombres largos.
5. **Al corregir un pago desde la ventana «Pagos», la confirmación de «El impuesto pasa lo retenido» quedaba escondida
   detrás de la ventana de corrección** (misma capa `z-[60]`; gana la última en el DOM). Pasos: matriz del año, abrir un
   mes con diferencia, «Corregir» un pago, dejar un impuesto que pase lo retenido y «Guardar pago»: no pasa nada visible y
   el botón «Registrar de todos modos» no se puede pulsar. Desde «Del mes» sí se veía (solo hay una ventana abierta).
   **Corregido:** `VentanaModal` acepta `encima="maxima"` (`z-[70]`) y la capa de confirmaciones la usa. No hay prueba
   automática (es de capas CSS); se comprobó en el navegador con `elementFromPoint`.
6. **El total del resumen de «Confirmar los DTE marcados» suma todo lo marcado**, aunque no se vaya a registrar y con las
   notas de crédito en positivo: «Se registrarán 16 de 17 facturas por Q 12,302.06» cuando lo registrable suma Q 11,184.06
   (sin la NCRE sin factura) y, descontando la NCRE y el anulado, menos; con el usuario sin permiso para crear proveedores:
   «Se registrarán 0 de 17 facturas por Q 12,302.06». Esperado: el total de las filas que sí se registran (con la nota
   restando). No se corrigió (hay que decidir si va con el total o con el neto a pagar del cálculo).

### Baja
7. La conciliación llama «En otro período» (1) al recibo por donación (RDON), que está registrado en el mismo mes pero
   «fuera del libro» (`documentoFueraDelLibro`).
8. En la ventana de confirmar, una nota de crédito sale con «Neto a pagar Q 1,118.00» en positivo y el texto dice
   «Se registrarán 1 de 1 facturas» (y «Se registró 1 factura» al terminar) aunque sea una nota.
9. Sin `proveedores.crear` y con un NIT que ya es cliente, el mensaje dice «aún no existe» aunque el tercero existe (solo
   le falta el papel de proveedor).
10. El pago con multa negativa (`-1.00`) responde «Escriba el monto con hasta dos decimales.» (no dice que no puede ser
    negativo). La burbuja nativa de la fecha máxima sale en el idioma del navegador («Value must be 11/01/2026 or earlier.»
    en el Chromium de prueba) en lugar de un texto de la app.
11. Persiste del QA anterior: el grupo de retenciones se llama «IVA de agentes de retención y pequeño contribuyente (5 %)»
    aunque las filas son de IVA 15 % (contribuyente especial).
12. En la ventana de confirmar cada factura registrada repite tres avisos casi iguales («Montos del resumen…», «La SAT no
    dice si es bien o servicio…», «Ese período puede estar declarado…»): 45 líneas para 15 facturas.
13. Observación de diseño: el índice único del número de autorización del DTE es global (entre empresas y cuentas):
    importar el mismo archivo en una segunda empresa deja todas las filas en «duplicado»; además el proveedor nuevo ya
    se había creado (queda, como dice el diseño §2.5).

## Cuadres a mano

- Octubre, 17 DTE: 225.00 + 220.00 + 1,118.00 + 1,118.00 + 10.00 + 3,288.40 + 12.40 + 353.80 + 40.00 + 1,660.00 +
  1,148.00 + 160.00 + 948.00 + 100.00 + 553.46 + 229.00 = 11,184.06 (16 DTE sin la NCRE), más la NCRE de 1,118.00 = 12,302.06.
- Registrados (15, sin el anulado ni la NCRE aún): 11,184.06 − 1,660.00 = 9,524.06, igual a la suma de los documentos.
- Libro de octubre con la NCRE (16 registrados, el RDON queda fuera del libro): 9,524.06 − 40.00 − 1,118.00 = 8,366.06;
  bienes 7,380.43 + pequeño contribuyente 100.00 + IVA con crédito 885.63 = 8,366.06. IVA con crédito: 24.11 + 23.57 +
  119.79 + 119.79 + 1.07 + 352.31 + 1.33 + 37.90 + 123.00 + 17.14 + 101.57 + 59.30 + 24.54 = 1,005.42, menos la NCRE
  119.79 = 885.63.
- Retención de IVA 15 % (empresa contribuyente especial): 5,600 a 90.00; 3,000 a 48.21; 2,500.00 y 2,500.01 a 40.18 cada
  una = 218.57 (base 1,457.15).
- Pago con accesorios: impuesto 218.57 + multa 100.00 + intereses 10.50 + mora 5.25: pagado 218.57,
  accesorios 115.75, total de la boleta 334.32. Impuesto 218.57 + 100.00 = 318.57, pasa lo retenido por 100.00; con otro pago
  de 10.00 más: 328.57, pasa por 110.00 y los accesorios suman 100.00 + 8.75 = 108.75; total de la boleta 10.00 + 5.00 + 2.50
  + 1.25 = 18.75.

## Pruebas agregadas y cambios

- `servidor/src/modulos/libro-de-compras/dominio/bandeja-de-dte-reglas.prueba.ts`: las columnas del archivo real con
  códigos y NIT no cuentan como montos (regresión del error 1).
- `servidor/src/pruebas-api/libro-de-compras-qa2-hallazgos.api.prueba.ts`: la vista previa de un anulado en la SAT debe
  decirlo (`it.fails` hasta corregir el error 3; al corregirlo fallará y hay que quitar la marca).
- Correcciones: `montos-en-columnas-desconocidas.ts` (error 1), `PanelDeLaBandeja.vue` (error 4),
  `VentanaModal.vue` y `CapaAvisos.vue` (error 5).

## Sin probar

- El formato del RTU de cuatro comas (`APELLIDO,APELLIDO,CASADA,NOMBRE,NOMBRE`): el archivo real no lo trae; solo lo cubren
  las pruebas unitarias de `propuesta-de-proveedor-nuevo`.
- Dos tandas de 100 filas (120 DTE): el archivo real tiene 17.
- Lote de constancias desde la pantalla (las cuatro retenciones ya tenían constancia): se probó por API.
- PDF y Excel del libro, SAT-2237 y análisis de compras de este archivo (no estaban en el alcance).
- Pago de solo accesorios (el impuesto debe ser mayor que cero por decisión del usuario) y la tabla de enteros con filas
  anteriores a la migración (la base de desarrollo tenía 0 filas).
