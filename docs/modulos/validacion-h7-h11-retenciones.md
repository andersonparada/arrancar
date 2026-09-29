# Validación contable de H7, H11 y el momento de las retenciones (contador-guatemala, 2026-09-29)

Solo lectura de documentos y normas. No se pudo leer el reglamento vigente del IVA (AG 5-2013); se citan los
reglamentos anteriores (AG 311-97 y AG 425-2006), cuyos artículos equivalentes en el AG 5-2013 hay que confirmar.

## H7 Comisiones bancarias con IVA — incorrecto como está planteado

- **Ley del IVA, art. 7.4:** exentos los servicios de instituciones fiscalizadas por la SIB y bolsas de valores
  (en seguros y fianzas solo reaseguro y reafianzamiento). Art. 7.5: cooperativas de ahorro y crédito, exentas.
- **Decreto 10-2012, art. 22.4.e:** los gastos cobrados por entidades supervisadas por la SIB se respaldan con
  recibo de caja o nota de débito; no hace falta factura.
- Conclusión: comisiones, manejo de cuenta, cheques rechazados, transferencias, cambio de moneda e intereses de
  bancos, financieras, casas de cambio y almacenes de depósito están **exentos**: no hay crédito fiscal que perder.
  Chequeras: probablemente dentro del 7.4 (sin criterio SAT expreso).
- Hay que corregir en el plan «servicios gravados, arts. 3 y 16» y «si el IVA se deja dentro de la nota de débito,
  se pierde», y la fila H7 de `HOJA-DE-RUTA.md`.

Cargos debitados que **sí** llevan IVA: primas de seguro (la aseguradora emite FEL), débitos automáticos de terceros
(luz, teléfono, arrendamiento de empresa no bancaria) y comisiones de entidades no fiscalizadas por la SIB.

Ajustes al diseño:
1. El destino «Bancos» en Ingreso de facturas sirve para facturas de **terceros** pagadas por nota de débito sin
   contraseña. Contrapartida: la cuenta bancaria, sin provisión.
2. Una comisión bancaria sin factura no pasa por Libro de compras: solo Bancos, concepto «Comisiones bancarias».
3. FEL exenta del banco: registro opcional como compra exenta (columna sin crédito fiscal).
4. `admite_factura` apagado por omisión en «Comisiones bancarias», encendido en «Seguros» y «Débito automático».

Asientos: comisión exenta → Debe gasto / Haber Bancos. Factura ligada a la nota → Debe gasto + IVA crédito fiscal /
Haber Bancos. Nota antes que factura → Debe «Cargos bancarios por documentar» / Haber Bancos; al llegar la factura,
Debe gasto + IVA / Haber la transitoria.

Una factura mensual por varias notas: el diseño actual (`unique (documento_id)`, un `movimiento_id`) no lo soporta.
Propuesta: tabla documento ↔ nota con `monto_aplicado`, `unique (documento_id, movimiento_id)`; lo aplicado no supera
el monto de la nota ni el total del documento; el período del IVA sigue la fecha de emisión de la factura (art. 20).

Retenciones en el destino «Bancos»: no se proponen (el banco ya pagó el total; entre agentes de retención no se
retiene, Decreto 20-2006 art. 9; régimen sobre utilidades sin retención ISR, Decreto 10-2012 art. 48). **Avisar** si
el proveedor sería sujeto de retención (responsabilidad solidaria, Decreto 20-2006 art. 7).

## H11 Plazo del crédito fiscal — correcto con ajustes

- **Ley del IVA, art. 20:** la factura puede reportarse como máximo en los dos meses siguientes al período de su
  operación; después no hay derecho a compensación ni devolución. Se cuenta por **fecha de emisión** (DTE), no de
  recepción. Factura de enero: períodos de enero, febrero o marzo (el de marzo se declara en abril). La `check`
  `periodo <= mes de emisión + 2` es correcta; redactar el ejemplo como «período de marzo, declarado en abril».
- IVA fuera de plazo: Decreto 10-2012 art. 21.15 da argumento para tratarlo como costo o gasto deducible
  (interpretación, sin criterio SAT). **Quitar la fuente de Lexology** (trata del vencimiento de facturas en papel).

Ajustes:
1. Registrar con aviso, `iva_acreditable = false` e IVA al costo es correcto; además: cuenta del IVA no acreditable
   **configurable** (deducible o no deducible), y el documento **va en el Libro de compras** del período de registro
   en la columna sin crédito fiscal (AG 311-97 art. 38; confirmar en AG 5-2013).
2. Convertir `iva_acreditable` en un **motivo**: `fuera_de_plazo`, `no_vinculado`, `pequeno_contribuyente`, `exento`.
3. Notas de crédito del proveedor (Ley del IVA art. 17; AG 311-97 art. 21): rebajan el crédito del **período en que
   se reciben** (diseño correcto). Faltan: sin los dos meses de gracia; si la factura quedó sin crédito fiscal, la
   nota rebaja el costo y no el crédito; la nota lleva número y fecha de la factura; avisar si la nota es más de dos
   meses posterior a la factura (art. 17, párrafo 3).

## Momento de la retención — la HOJA-DE-RUTA está equivocada («nace al autorizar»)

| Retención | Norma | Momento | Constancia y entero |
|---|---|---|---|
| IVA por agente (exportador, especial, otro), al crédito | Decreto 20-2006 arts. 1, 5, 6; AG 425-2006 art. 10 | Al **recibir la factura** | Fecha de recepción; entero en 15 días hábiles del mes siguiente |
| IVA al contado | Decreto 20-2006 arts. 5, 6 | Al pagar (coincide con la factura) | Igual |
| IVA 5 % a pequeño contribuyente | Ley del IVA art. 48 | Al acreditar en cuenta o poner a disposición, lo primero entre provisionar y pagar | 15 días del mes siguiente |
| ISR régimen opcional simplificado | Decreto 10-2012 art. 48 | Constancia **con la fecha de la factura** | Entregar a más tardar el 5 del mes siguiente; entero en 10 días; mínimo Q2,500 sin IVA |

Recomendación: las retenciones se calculan y **fijan al registrar el documento en Libro de compras** (ISR con la
fecha de la factura; IVA general con la de recepción; pequeño contribuyente con la de autorizar o pagar, la primera).
Cuentas por pagar solo las **descuenta** del saldo en el primer pago. Avisar si el plazo de entero de ese mes ya
pasó (multa e intereses).

## Preguntas para el usuario

1. En «DTE recibidos» de la SAT: ¿sus bancos emiten FEL por comisiones o chequeras? ¿Con IVA o exentas?
2. ¿Qué cargos debitados en las cuentas sí traen factura (seguros, servicios, arrendamiento)?
3. ¿Acepta ligar varios documentos por nota y varias notas por documento, con monto aplicado?
4. IVA fuera de plazo: ¿cuenta de gasto deducible o no deducible? (recomendado: configurable).
5. ¿Confirma que las retenciones se fijan al registrar la factura y no al autorizar?
6. El plan pone un mínimo de Q2,500.01 para la retención del 5 % a pequeños contribuyentes; el art. 48 de la Ley del
   IVA no trae mínimo. Confirmar en el AG 5-2013 antes de programarlo.

## Fuentes

Ley del IVA (Decreto 27-92) con reformas; Decreto 10-2012 con reformas del 19-2013; Decreto 20-2006; AG 425-2006;
AG 213-2013; AG 311-97; vescco.tax (crédito fiscal después de dos meses).
