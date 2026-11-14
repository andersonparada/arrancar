# Dictamen CP4: pagos a proveedores y reintegros (contador-guatemala, 2026-11-13)

Sobre `diseno-cp4-pagos.md`. Versión condensada por el coordinador a partir de la respuesta completa del contador (sin
cambiar conclusiones). Marcas: **[Ley]**, **[SAT]**, **[Práctica]**, **[Opinión]**.

**Verificación (2026-11-13):** con fuentes secundarias; Código de Comercio arts. 501–502 y Código Penal art. 268,
certeza media-alta; Decreto 20-2006 art. 20, media-alta; AG 425-2006 art. 32 reformado por AG 125-2022, solo la
existencia de la reforma (texto por confirmar); suma de pagos por mes calendario, media. Lo marcado «confirmar» se
coteja con el texto oficial antes de ponerlo en la ayuda.

## Resumen

| # | Tema | Conclusión |
|---|---|---|
| C-CP4-1 | Retención y cheque posfechado | Mostrar la retención completa en el primer pago: **correcto**. El aviso de entero va **por mes de retención** (la empresa la debe desde que la practicó, aunque no pague), con un reporte de constancias pendientes. **Posfechado mal planteado:** el cheque se paga a la vista (Código de Comercio art. 501), así que Bancos debe revisar el saldo de **hoy** menos los posfechados y avisar (riesgo del Código Penal art. 268); el documento queda **comprometido** desde hoy y **pagado en la fecha del cheque** (NIIF Pymes 11.36) |
| C-CP4-2 | Bancarización | Umbral desde Q30,000 y suma por mes: bien. **«No negociable» no lo exige la ley** (es buena práctica): cambiar el texto. Beneficiario = nombre del NIT emisor, nunca el comercial. Cuentan cheques, notas de débito y notas ligadas; no la cuenta de apertura. Reintegro en efectivo: sin efecto de bancarización, solo aviso de depositarlo |
| C-CP4-3 | Ligar al cheque de saldo inicial de Bancos | **Premisa incorrecta:** un cheque entregado antes del corte ya pagó la factura (no va en el saldo inicial); uno sin entregar se registra como cheque nuevo. **Quitar** la forma `saldo_inicial_de_bancos`, su permiso y CP4-13; el cheque de apertura anulado (revive el pasivo) va en *Bancos, segunda parte* |
| C-CP4-4 | Nota ligada con activo fijo | Es **Inversión** (NIIF Pymes 7.5). A (solo aviso) aceptable ahora; **B (desglose)** lo correcto |
| C-CP4-5 | Centavos en un cargo | **Otros ingresos**, no menor costo; sin IVA. **Error:** ofrecerlo fuera de un pago deja «saldar» facturas pequeñas sin pagarlas: solo como **residuo** de un pago vigente. Aviso si viene de una retención mal calculada. Variable de tope aparte para cargos (opcional) |
| C-CP4-6 | Reintegro | Debe Bancos o Caja / Haber Proveedores; Operación (Inversión si la nota es de activo fijo). Recibo **no tributario**; del proveedor basta la NCRE y la boleta |
| C-CP4-7 | Cuenta de apertura | Carga abierta: contra la puente **con la fecha de inicio**; rechazar también el saldo autorizado sin movimientos (se desautoriza y corrige). Carga cerrada: corrección de error (NIIF Pymes 10.19–10.23); la cuenta la elige el contador |
| C-CP4-8 | Anular un pago cobrado | Rechazar es correcto, pero falta **«reaplicar pago»** (mismo proveedor y contraseña, auditoría `corregir`). El evento `pago_anulado` lleva `anulacionEnBancos` (`sin_inverso`/`con_inverso`) y la fecha original |

## Otros errores

| # | Problema | Corrección | Gravedad |
|---|---|---|---|
| 1 | Posfechado «pagado desde hoy» | «Comprometido»; Bancos avisa de fondos | **Media-alta** |
| 2 | Nota ligada (débito automático) contra un cargo con retención: el banco debitó el bruto | Aviso: la retención no se descontó; queda saldo por aplicar; revisar en Libro de compras | Media |
| 3 | Fecha mínima del pago = recepción | **Emisión del DTE**, con aviso si es anterior a la recepción (en el agro se paga antes de recibir el DTE) | Media |
| 4 | Ajuste de diferencia fuera de un pago | Solo como residuo | Media |
| 5 | `pago_anulado` sin forma de anulación ni fecha original | C-CP4-8 | Media |
| 6 | Cuenta de apertura con carga abierta fechada hoy | Fecha de inicio | Media-baja |
| 7 | Forma sin caso legítimo | Quitarla | Media |
| 8 | Reintegro siempre en Operación | Inversión si la nota es de activo fijo | Baja |
| 9 | Comprobante y recibo | Leyenda «no es documento tributario» | Baja |
| 10 | Aviso de entero atado al pago | Por mes de retención; reporte de constancias pendientes | Media-baja |
| 11 | Texto de bancarización con «no negociable» obligatorio | Texto nuevo | Baja |

## Opinión sobre las preguntas al usuario

CP4-a, b, g, h, j, k, l, m: de acuerdo (b: el activo fijo se corrige con el desglose; j: solo permisos distintos y el
reporte; k: con Caja chica, avisar bancarización en efectivo; l: con retención, constancia y leyenda no tributaria;
m: «Recibo de reintegro»). **CP4-c: no** (quitar la forma). CP4-d: sí, con fecha de inicio y rechazo del autorizado
sin movimientos. CP4-e: sí, con «REIMPRESIÓN» al quitar un documento de una contraseña impresa. CP4-f: rechazar **y**
reaplicar. **CP4-i: sí, con fuerza.**

## Cambios que el diseño debe recibir

1. Posfechado «comprometido», bancarización con la fecha del cheque, aviso de fondos en Bancos (CP4-B2).
2. Aviso de entero por mes de retención; reporte de constancias pendientes.
3. Texto nuevo de bancarización; beneficiario = nombre del NIT emisor.
4. Quitar `saldo_inicial_de_bancos` y CP4-13; anotar el cheque de apertura anulado para *Bancos, segunda parte*.
5. Desglose de la nota ligada por activo fijo (o aviso con pendiente); aviso de retención no descontada.
6. Diferencia de un cargo solo como residuo; aviso de retención mal calculada; variable de tope para cargos (opcional).
7. Cuenta de apertura: fecha de inicio con carga abierta; rechazar el autorizado sin movimientos; aviso nuevo.
8. `pago_anulado` con `anulacionEnBancos` y fecha original; «reaplicar pago».
9. Fecha mínima del pago = emisión del DTE.
10. Concepto del reintegro según el activo fijo de la factura de la nota.
11. Leyenda «no es documento tributario» en comprobante y recibo.

## Veredicto

**Correcto con ajustes.** El modelo (pagos y líneas, saldos calculados, retención descontada una sola vez con garantía
en la base, anulación por estado, reintegro como cobro, nota de crédito para descuentos) está bien. Corregir antes de
programar los puntos de arriba.

## Fuentes

- Código de Comercio (Decreto 2-70) arts. 501–502: [Living in Guatemala](https://livinginguatemala.com/es/tramites/cheque-sin-fondos-guatemala/); [ICNL](https://www.icnl.org/wp-content/uploads/codcomercio.pdf).
- Código Penal art. 268: [Living in Guatemala](https://livinginguatemala.com/es/tramites/cheque-sin-fondos-guatemala/).
- Decreto 20-2006 art. 20 y Criterio SAT 5-2021: [vLex / Consortium Legal](https://vlex.com/vid/guatemala-bancarizacion-materia-tributaria-913237446); [Deloitte 21-21](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%2021-21.pdf); [Deloitte, nov. 2018](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/GUATEMALA/Taxnewsletter/181119-taxnewsletter-noviembre.pdf); [Deloitte 22-07](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%2022-07.pdf).
- NIIF para las Pymes (2.6, 7.5, 10.19–10.23, 11.36): [IFRS](https://www.ifrs.org/issued-standards/ifrs-for-smes/).
- Ley del IVA (arts. 3, 16–20, 29): [TSE](https://www.tse.org.gt/images/UECFFPP/leyes/decreto_27-92-iva.pdf).
