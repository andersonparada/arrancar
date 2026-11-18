# Informe de QA en el navegador — 2026-11-08

Alcance: lo programado el 2026-11-08 sobre `main` (`59ab954`): las 74 cuadrículas `grid-cols-1`, los mensajes de fecha
en español, fechas futuras, «Abrir en el formulario» desde la bandeja de la SAT, el resumen de «Confirmar», el DTE
anulado en la vista previa, «Anulado por» y los avisos al anular desde Cuentas por pagar, el aviso de NIT repetido en
Empresas, la unicidad de DTE por cuenta, el formato RTU con 4 comas, tandas de confirmación y el lote de constancias.

Herramientas: Chromium con Playwright (escritorio 1280 px y 768/1024/1440/1920; celular 380 y 320 px; claro y oscuro) y
la API con sesiones reales. Base propia `arrancar_qa3` (migrada y sembrada con `--demo`), API en :3400 y PWA en :5480;
pruebas con `BD_PRUEBAS=arrancar_pruebas_qa3`. El archivo real de la SAT (17 DTE de octubre de 2026) se usó solo en la
base local: aquí no hay nombres ni NIT. Para las tandas se generó un CSV sintético de 220 filas (fuera del repo).

Escenario: cuenta demo con tres empresas (receptora con el NIT del archivo, una con NIT único y una agente de IVA e
ISR con retenciones), una «gemela» con el mismo NIT; segunda cuenta con una empresa del mismo NIT.

## Resultado por flujo

| Flujo | Resultado |
|---|---|
| Barrido a 380 px (y 320 px) de las rutas del menú y las fichas (54 pantallas, claro y oscuro) con datos de nombres largos, y los paneles de soporte (cuentas, apariencia, bitácora, configuración), usuarios y roles: sin desborde horizontal ni errores de consola | Bien |
| Barrido a 380 px con 115 documentos, 100 proveedores nuevos y la bandeja de 222 DTE, claro y oscuro | Bien |
| Burbuja nativa en español: nota bancaria con la fecha vacía dice «Elija o escriba la fecha.»; campo numérico vacío «Complete este campo.» | Bien |
| Fecha de pago futura en la ventana de pago del entero: el campo trae `max` = hoy, no envía y muestra «La fecha de pago no puede ser posterior a hoy (08/11/2026).»; mañana también se rechaza y hoy se acepta | Bien |
| Constancia con fecha futura (una y en lote): mismo mensaje bajo el campo, no se envía nada; con una fila futura el lote entero no se envía | Bien |
| Lote de constancias desde la pantalla («Marcar las 4 sin constancia», «Misma fecha para todas», doble clic en guardar): una sola petición, 4 constancias | Bien |
| Importar el `.xls` real: 17 filas; proveedores nuevos con tipo de persona propuesto | Bien |
| Formato RTU con 4 comas (`PARADA,ALVIZURES,,ANDERSON,MAGDIEL` y con apellido de casada): nombres y apellidos bien partidos | Bien |
| «Abrir en el formulario»: precarga serie, número, fechas, NIT, autorización, total, exento, IVA y observaciones; avisos «Datos traídos del DTE…», proveedor sin registrar, destino y concepto; la NCRE trae su tipo y pide la factura | Bien (ver errores 2 y 3) |
| Resumen de «Confirmar»: «Se registrarán 15 de 17 documentos por Q 9,524.06»; a mano: 12,302.06 menos la anulada (1,660.00) y la NCRE sin factura (1,118.00) = 9,524.06 | Bien (ver error 4) |
| DTE anulado en la vista previa: «El DTE está anulado en la SAT: no se registra.» y no cuenta en el total; en celular y oscuro sin desborde | Bien |
| Confirmar con doble clic: una vista previa y un solo confirmar; «Se registraron 15 documentos.» | Bien (ver error 5) |
| Conciliación de octubre: 14 cuadran, 1 en la SAT y no registrada (la NCRE), 1 anulada en la SAT, 1 «No va en el libro» (RDON) | Bien |
| Dos tandas: se registraron 100 documentos desde la pantalla en dos confirmaciones de 50 (la página de la bandeja es de 50); 115 documentos, 51 terceros, ningún NIT repetido | Bien (ver error 6) |
| Unicidad por cuenta: el mismo archivo se registra en la empresa de la cuenta demo y en la de la segunda cuenta (15 y 15) | Bien |
| Unicidad en la misma cuenta: en una empresa «gemela» del mismo NIT, 14 DTE quedan `Bloqueado` («Ya está registrado en otra empresa de su cuenta»), completar da 422 `dte_no_esta_pendiente` y la pestaña explica que se liberan si esa empresa anula | Bien |
| Ficha de Cuentas por pagar anulada: «Anulación: causa, motivo, Anulado por Dueño Demo, Anulado el 08/11/2026 11:52 a. m.» (hora de Guatemala); saldo Q 0.00; doble clic en anular, una sola petición | Bien |
| Anular desde CxP con retenciones constanciadas: avisos «Ese período puede estar declarado…» y «Quedan 2 retenciones por resolver…» (retención 250.00 de ISR + 90.00 de IVA = 340.00 a mano) | Bien |
| Empresas: guardar con un NIT que ya tiene otra empresa de la cuenta muestra «Empresa actualizada.» y el aviso (sin nombrar a la otra); el aviso dura unos 15 s y se quita solo; crear una empresa con NIT repetido también avisa; con NIT único no avisa; claro, oscuro y 380 px | Bien (ver error 7) |
| Libro: subtítulo «NIT … · octubre de 2026»; hoja «Anulados» del Excel con causa en texto y hora de Guatemala | Bien |
| Retenciones: nombre de grupo sin «(5 %)» y cifras del mes (IVA de agentes 15 % de 600.00 = 90.00 por documento; ISR simplificado 5 % de 5,000.00 = 250.00) | Bien |
| Archivo vacío (0 bytes) en la bandeja | Error bajo (error 8) |
| Línea del formulario de factura en escritorio | Error medio, corregido (error 1) |

## Errores

### 1. Medio (corregido): en «Registrar factura», los interruptores de la línea se salen de su tarjeta en escritorio

Pasos: abrir `/libro-de-compras/documentos/nuevo` a 1024, 1280 o 1440 px de ancho.

Esperado: «Es activo fijo» y «Es combustible» dentro de la tarjeta de la línea.

Pasó: la cuadrícula de la línea usaba `lg:grid-cols-4` según el ancho de la pantalla, pero la columna del formulario mide
la mitad (la otra es la vista previa): cuatro columnas de unos 100 px. A 1024 px el interruptor quedaba 113 px fuera
de la tarjeta, encima de la vista previa; a 1280, 49 px; a 1920, 9 px.

Corrección: `FilaDeLinea.vue` usa consultas de contenedor (`@container`, `@sm:grid-cols-2`, `@2xl:grid-cols-4`): ahora el
número de columnas depende del ancho de la tarjeta. Medido otra vez a 768, 1024, 1280, 1440 y 1920: el interruptor queda
dentro. Misma causa, sin corregir: el encabezado (`lg:grid-cols-3` en `CamposDelEncabezado.vue`) y la FEL
(`CamposDeLaFel.vue`) muestran tres columnas de ~140 px (el selector de proveedor se ve «Elija un pro…»); no se sale,
pero es incómodo (bajo).

### 2. Medio: «Abrir en el formulario» de un DTE anulado en la SAT no avisa y deja registrarlo como vigente

Pasos: cargar un archivo con un DTE anulado (en el real, la fila de la tarjeta «Anulado en la SAT»), «Abrir en el
formulario», elegir proveedor y registrar. (Por API: `GET …/dte-recibidos/{id}/solicitud` da `avisos: []`; un `POST
/documentos` con esos datos responde 201.)

Esperado: aviso en el formulario («El DTE está anulado en la SAT») y, como en «Confirmar», que no se registre (o que
pida confirmación).

Pasó: ningún aviso y el documento se registra vigente. La conciliación lo detecta después («1 anulada en la SAT»), y
«Confirmar» sí lo bloquea con `dte_anulado_en_la_sat`.

### 3. Bajo: el aviso «Elija el destino del documento» sale aunque el selector ya muestra «Cuentas por pagar»

Pasos: «Abrir en el formulario» de un DTE sin destino elegido. El aviso pide elegir el destino, pero «Destino» aparece con
«Cuentas por pagar» (el valor por omisión del formulario). Esperado: un solo criterio (o no avisar, o dejarlo en blanco).
El encabezado de la página dice «Registrar factura» también para una nota de crédito.

### 4. Bajo: la barra de marcados no usa el mismo criterio que «Confirmar»

La barra dice «17 marcados por Q 12,302.06» (suma la anulada y la NCRE con signo positivo); «Confirmar» dice «15 de
17 documentos por Q 9,524.06». Ambas cifras son correctas según su criterio, pero se ven dos totales distintos para
lo mismo.

### 5. Bajo: dos avisos de éxito casi iguales y uno muy largo tras confirmar

Tras confirmar 15 DTE salen «Se registraron 15 documentos.» y «Se registraron 15 facturas.» con 45 líneas (3 por
documento: «Montos del resumen de la SAT…», «La SAT no dice si es un bien o un servicio…», «Ese período puede estar
declarado…»). Esperado: un solo mensaje y los avisos repetidos agrupados («15 documentos: …»).

### 6. Bajo (observación): no se puede marcar más de una página de la bandeja

La selección se limpia al cambiar de página (50 por página): las «dos tandas de 100» solo se alcanzan por la API
(máximo 100 por confirmación). Para registrar 200 hay que hacer 4 confirmaciones. Funciona bien, pero conviene decidir
si se quiere «marcar todas las N» o conservar la selección.

### 7. Bajo: el NIT se ve sin guion en la ficha de la empresa y con guion en el aviso

Ficha: NIT sin guion (p. ej. `12345678`); aviso: con guion (`1234567-8`). Esperado: el mismo formato (`Nit.formateado()`).

### 8. Bajo: archivo vacío en la bandeja de la SAT

Pasos: subir un archivo de 0 bytes en «Cargar el archivo de la SAT». Pasó: «El archivo no es un Excel válido. Suba un
Excel (.xlsx) con datos.» (`archivo_no_es_excel`). Esperado: un texto que no mencione solo .xlsx, porque la pantalla
acepta .xls, .xlsx y CSV («El archivo está vacío»). Un archivo con solo encabezados responde 200 con 0 filas.

## Lo que no se probó

Roles con permisos parciales (esta ronda se centró en lo del 2026-11-08), anular una constancia desde «Por resolver», y
exportar/imprimir los reportes de retenciones. No se escribieron pruebas nuevas: los errores son de maquetación o de
decisión de producto y las rutas que los cubren ya tienen pruebas de API.
