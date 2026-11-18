# Informe de QA intermedia: CP4-B3a, reportes CP5 (R1 a R5 y R12) y EM-1 (2026-11-18)

Prueba de punta a punta en el navegador (Chromium sin cabeza, 1280 px y 390 px, claro y oscuro, impresión emulada, descargas de Excel
leídas con exceljs) contra una app y una base propias (`arrancar_qa1_dev`, puertos 3100 y 5180), con datos inventados: empresa «Empresa
Demo» con NIT, 4 proveedores (Ferretería, Pérez con ISR opcional simplificado, El Sol, Luz), 2 cuentas monetarias con chequera,
7 facturas, 1 nota de crédito, 4 contraseñas, cheques (uno posfechado y uno anulado desde Bancos), notas de débito marcadas y ligadas
(una con desglose por activo fijo). Para el alta masiva de datos se usó la API; todo lo probado va por la interfaz. Diseños:
`diseno-bancos-segunda-parte.md` §9.4, `diseno-cp5-reportes.md` y §16.1 del de Bancos (EM-1).

Usuarios de prueba: propietario, «QA Saldos» (solo `reportes-de-saldos.ver`), «QA Saldos Excel» (con `.exportar`), «QA Retenciones»
(solo `libro-de-compras.retenciones.ver`), «QA Retenciones y Saldos» (con exportar de retenciones y ver de saldos), «QA Solo Notas»
(`bancos.notas.ver` y `.crear`) y uno sin permisos.

**Resultado: ningún error de alta gravedad ni de seguridad.** Los cálculos de dinero cuadran a mano. Hay 2 errores de gravedad media y
14 de baja (más abajo). No se tocó el código de la app. Se escribieron pruebas nuevas (ver «Pruebas agregadas»).

## Cálculo a mano (corte 18/11/2026)

| Proveedor | Cargos con saldo | Saldos a favor | Neto | Comprueba |
|---|---|---|---|---|
| El Sol | S-1 1,000.00 (más de 90 días) | 0 | 1,000.00 | bien |
| Luz | L-1 560 menos nota 300 = 260; L-2 1,500 menos nota 700 = 800; L-3 224 | 0 | 1,284.00 | bien |
| Ferretería | F-2 2,240.00 (posfechado de 2,240 al 20/12); F-1 pagada con cheque | NC-1 336.00 | 1,904.00 | bien |
| Pérez | P-1 5,000 menos retención 223.21 menos nota 3,000 = 1,776.79; P-2 3,000 menos 133.93 menos nota 800 = 2,066.07 | 0 | 3,842.86 | bien |
| **Total** | **8,366.86** | **336.00** | **8,030.86** | R1, R2 (saldo 8,366.86; facturado 13,524.00; retenciones 357.14; pagado 4,800.00) y R5 (Pérez 3,842.86 y El Sol 1,000.00 vencidos) coinciden |

Estado de cuenta de Pérez (1 de enero a 18 de noviembre): cargos 7,642.86 (neto) y abonos 3,800.00 = saldo 3,842.86 (igual al de R1). En
«Para el proveedor»: cargos 8,000.00 (por el total) y abonos 4,157.14 (pagos 3,800.00 más las dos retenciones 223.21 y 133.93) = el mismo
saldo final. Constancias del ISR: la de agosto vence el 07/09 y la de octubre el 06/11 (5.º día hábil; coincide con el calendario).

## Resultados por flujo

| Flujo | Resultado |
|---|---|
| EM-1: aviso al escribir fecha de inicio que no es día 1 (15/01, 28/02), sin aviso con día 1 y con la fecha vacía; guardar con aviso funciona (no bloquea); al reabrir sigue el aviso; al pasar a día 1 desaparece; celular y oscuro | Bien |
| B3a: casilla «Pago a proveedor para Cuentas por pagar» solo en nota de débito nueva y con el módulo activo (desaparece en crédito y con el módulo apagado); marcada, oculta el concepto; la tarjeta dice «Para Cuentas por pagar» y el concepto «Pago a proveedores» | Bien |
| B3a: Marcar (confirmación con el resumen y el monto) y Desmarcar (concepto y motivo obligatorios, con errores por campo); doble clic: una sola llamada y un solo aviso | Bien |
| B3a: etiqueta, desglose «Reparto: …» en la tarjeta (Q 700.00 de activo fijo y Q 300.00) y en el reporte de Movimientos | Bien |
| B3a: nota generada por Cuentas por pagar: «Origen: Cuentas por pagar», sin Editar ni Eliminar y con la explicación; la anulación sigue disponible | Bien (ver error 8) |
| B3a: nota ligada: Eliminar y Desmarcar dan el aviso «La nota está aplicada al pago 4 de la contraseña 3: anule primero ese pago…» | Bien, pero ofrece los botones (error 15) |
| B3a: reclasificar una nota con reparto: «La nota marcada tiene el reparto por concepto que fijó Cuentas por pagar: no se reclasifica.» | Bien |
| B3a: cheque posfechado: aviso «Cheque posfechado: la fecha es posterior a hoy.» en el formulario; con sobregiro permitido sale «Cheque emitido.» y luego el aviso de fondos («se paga a la vista, Código de Comercio art. 501…»); sin sobregiro se rechaza con el saldo que quedaría | Bien |
| B3a: anular desde Bancos el cheque de un pago de Cuentas por pagar anula el pago y repone el saldo (F-1 vuelve a 1,120.00) | Bien (el diálogo no lo dice, error 9) |
| B3a: módulo de origen inactivo: sin casilla ni «Marcar»; anular una nota de Cuentas por pagar: «Active Cuentas por pagar para cambiar este movimiento: lo generó o lo marcó ese módulo.» | Bien (ofrece botones que fallan, error 15) |
| B3a: permisos: quien solo crea notas no ve Editar, Marcar, Desmarcar, Anular ni Eliminar, y sí ve la casilla al crear | Bien |
| B3a: montos 0 y -10 («El monto debe ser mayor que cero.»), 0.001 («hasta 2 decimales»), 99999999999999.99 («demasiado grande»), beneficiario de 200 caracteres («como máximo 150») | Bien |
| B3a: corregir una nota marcada (o con concepto ya inactivo) | **Error 1** |
| R1 Saldos por proveedor: cuadra con el cálculo; acreedores y deudores (corte 30/06/2027 deja a la Ferretería como deudora por 336.00); orden «mayor saldo primero»; clic en la fila lleva a R2 filtrado; corte anterior a la fecha de inicio avisa en el campo; corte en octubre avisa que 5 documentos se registraron después | Bien (errores 10 y 13) |
| R2 Documentos a una fecha: las seis vistas (Pendientes, Vencidos, Por vencer, Autorizados sin contraseña, Estado de pago, Retenciones por practicar), «Más filtros», totales de todo lo filtrado, `venceHasta`, páginas inválidas (400) | Bien (error 5) |
| R3 Estado de cuenta: interna y «Para el proveedor», «Mostrar anulados» (en gris, sin sumar), desde la ficha del proveedor, Excel con filas `Anulada (no suma)` y notas | Bien (errores 4 y 6) |
| R3: rango de más de 24 meses o antes del inicio | **Error 3** (queda el reporte viejo) |
| R4 Saldos a favor: NC-1 336.00, último movimiento 12/11/2026, posible prescripción 12/11/2031, leyendas | Bien |
| R5 Contraseñas por pagar: por omisión «ayer»; con fecha futura suma las de la semana; atraso en días; totales | Bien |
| R12 Constancias pendientes (Libro de compras): plazo de grupo y de constancia, «vencida hace N días», enlace «Ver retenciones por practicar» solo con el módulo y el permiso, Excel | Bien (errores 7 y 11) |
| Permisos por separado: sin `.exportar` no hay botón de Excel y el servidor da 403; sin `reportes-de-saldos.ver` las pantallas redirigen a «sin permiso» y la API da 403; las retenciones se ven con su propio permiso | Bien |
| Impresión (emulada): encabezado solo en papel, tablas sin sombras, leyendas | Bien (error 6) |
| Celular (390 px) y oscuro: sin desborde horizontal en los seis reportes, R1 como tarjetas, R2 como tarjetas con etiquetas | Bien |
| Excel de R1, R3, R4, R5 y R12: dinero como número, secciones, filas de totales y `Nota` | Bien (errores 7 y 16) |

## Errores y observaciones

### Gravedad media

**1. Corregir una nota marcada (o con un concepto ya inactivo) borra el concepto y obliga a elegir otro.**
- Pasos: Bancos, Notas; en una nota de débito «Para Cuentas por pagar» (concepto «Pago a proveedores») pulsar «Editar» justo al
  cargar la página.
- Se esperaba: el concepto guardado a la vista (el comentario de `usarConceptosDeNota` dice que se ofrece «el que ya tenía la nota,
  aunque hoy esté inactivo»).
- Pasó: «Concepto» sale vacío y obligatorio («Elija un concepto»). Hay que escoger uno cualquiera (p. ej. «Impuestos»); al guardar, el
  servidor deja «Pago a proveedores» y la elección se descarta sin avisar.
- Causa (por lectura del código): el observador de `edicion.tipo` en `usar-conceptos-de-nota.ts` corre al pasar de «crédito» (valor
  inicial de la ventana) a «débito» y limpia el concepto con las opciones **sin** el guardado (`paraElegir`, no
  `opcionesDeConceptos`). No pasa con una nota cuyo concepto es corriente y está activo.
- Prueba: `usar-conceptos-de-nota.prueba.ts` (dos `it.fails`; al corregir, quitar `.fails`).

**2. La ficha del proveedor y las pantallas de operación dicen una cosa y los reportes otra para un cheque posfechado.**
- Pasos: pagar F-2 (Q 2,240.00) con un cheque fechado el 20/12; abrir la ficha del proveedor (Terceros) y Saldos por proveedor.
- Ficha del proveedor: «Por pagar Q 0.00», «Vencido Q 0.00», «A favor de la empresa Q 336.00»; ficha y lista del documento: saldo 0.00,
  estado «Comprometido». R1 y R3: total de cargos 2,240.00, neto 1,904.00 y saldo final 1,904.00; R2: saldo 2,240.00, estado «Pagado en
  parte» con «Pagado Q 0.00».
- Es a propósito para los reportes (NIIF para las Pymes, sección 11: el posfechado no rebaja antes de su fecha) y lo dicen las leyendas,
  pero quien compara la ficha con el reporte verá dos deudas distintas y un documento «pagado en parte» sin nada pagado.
- Se esperaba: una decisión explícita (con el contador): mismo estado y mismas cifras en todas las pantallas, o una nota visible en la
  ficha («Q 2,240.00 comprometidos en cheques posfechados») y el estado «Comprometido» también en R2.
- Prueba: `cuentas-por-pagar-qa-intermedia.api.prueba.ts` fija el comportamiento actual para que un cambio no pase desapercibido.

### Gravedad baja

**3. Estado de cuenta con un rango inválido deja el reporte anterior en pantalla.** Pasos: elegir el proveedor, poner Desde 01/01/2023
(más de 24 meses) o 01/12/2025 (antes del inicio). Sale un aviso que desaparece solo y el reporte (con los filtros nuevos arriba) sigue
mostrando el mes anterior. Se esperaba: limpiar o marcar el reporte como desactualizado y dejar el mensaje junto al campo (como hace R1 con
el corte). El encabezado de impresión sí dice el rango que realmente se ve.

**4. Estado de cuenta: «Mostrar anulados» sigue activo al cambiar a «Para el proveedor».** El estado que se manda al proveedor puede salir
con un pago anulado en gris. Se esperaba apagarlo (o avisar) en esa presentación.

**5. Documentos a una fecha: la vista «Estado de pago» filtra con valores escondidos en «Más filtros».** Muestra solo L-3 (pendiente,
emitida este mes) sin decir que filtra por «Pendiente» y «Emitidos desde 01/11/2026»; hay que abrir «Más filtros» para entenderlo.

**6. Encabezado de impresión: falta el NIT de la empresa y «Para el proveedor» lleva «Emitido por».** El diseño pide «empresa con NIT» y,
para el estado que se manda al proveedor, «sin “emitido por”». La sesión (`sesion.empresa`) no trae el NIT; `EncabezadoDeImpresion.vue`
siempre imprime «Emitido el … por <usuario>».

**7. Excel de R12 (constancias pendientes) sin filas `Nota`** con el mes, los filtros y las leyendas (el diseño §6 las pide como en el flujo
de efectivo), y escribe el documento como «FACT A P-1» (la pantalla dice «FACT A-P-1»).

**8. Bancos: la nota de Cuentas por pagar dice «Origen: Cuentas por pagar» sin el número de pago** (§9.4 pide «Origen: Cuentas por pagar,
pago N»). Hoy no hay ruta para enlazar el pago (CP4-10), pero el número ya se podría mostrar. El cheque que genera Cuentas por pagar no dice
su origen en la tarjeta de Cheques.

**9. Bancos: el diálogo de «Anular cheque» no avisa que anulará el pago de Cuentas por pagar.** Anular el cheque A1 anuló el pago 1 y repuso
el saldo de la factura; el texto del diálogo habla solo del movimiento inverso.

**10. Mensajes del servidor con montos sin el formato común:** «La cuenta quedaría con saldo de Q -16010.00…» y «…se registraron después
(Q12,360.00)» (sin separador de miles ni espacio).

**11. Menú duplicado para quien solo tiene el permiso de retenciones:** ve «Constancias pendientes» (Libro de compras) y «Constancias de
retención pendientes» (Cuentas por pagar) apuntando a la misma pantalla. Debería mostrarse una sola.

**12. Las pantallas no aceptan filtros desde el enlace** (`desde`, `hasta`, `presentacion` en Estado de cuenta; `desde`/`hasta` en
Cheques) y la lista de Cheques corta en hoy: un cheque posfechado recién emitido no aparece en la lista hasta ampliar «Hasta».

**13. Saldos por proveedor acepta un corte futuro sin avisar** (30/06/2027 muestra todo vencido y a la Ferretería como deudora): son
saldos proyectados, no reales; convendría una leyenda o un aviso.

**14. La explicación de «Lo generó Cuentas por pagar…» sale cortada con «…»** en la tarjeta de la nota (escritorio y celular), así que no se
lee completa.

**15. Notas marcadas y ligadas ofrecen acciones que el servidor rechaza.** Una nota ligada muestra Editar, Desmarcar, Anular, Eliminar (y
Reclasificar en Movimientos) aunque `puedeDesmarcar`, `puedeEliminar` y `puedeReclasificar` siguen en `true`; con Cuentas por pagar apagado
pasa lo mismo con todas las notas marcadas. Los rechazos son claros y seguros, pero la pantalla no dice que la nota está ligada.
Prueba: `cuentas-por-pagar-qa-intermedia.api.prueba.ts` (`it.fails`).

**16. Menores de presentación:** en Movimientos a 1280 px la columna «Acciones» queda cortada (se desplaza, sin pista); la hoja
«Instrucciones» del motor de Excel aparece también en las exportaciones de reportes; en la impresión de R1 el nombre del proveedor sale en
letra más pequeña que el NIT.

## No probado

- Mes conciliado o cerrado (la conciliación no es de esta QA) y fecha de inicio con la carga inicial cerrada.
- R2 con más de 2,000 filas (tope de impresión) y rendimiento con 20,000 documentos (lo cubren pruebas existentes de rendimiento).
- «Nueva empresa» (EM-1 al registrar): el formulario de alta no trae el campo fecha de inicio; solo se probó al editar.
- R6 a R11 (CP5-9a y otros pasos en curso) y el enlace del pago a su ficha (CP4-10).

## Pruebas agregadas

- `cliente/src/modulos/bancos/composables/notas/usar-conceptos-de-nota.prueba.ts`: concepto al abrir la corrección de una nota (2 pasan,
  2 `it.fails` por el error 1).
- `servidor/src/pruebas-api/cuentas-por-pagar-qa-intermedia.api.prueba.ts`: acciones de una nota ligada (1 `it.fails`, error 15), rechazos
  del servidor y el posfechado en ficha y reporte (error 2).

Los `it.fails` pasan mientras el error exista; cuando alguien lo corrija la prueba falla y avisa que hay que quitar `.fails`.
