# Concepto de notas y cheques (paso H3b) — informe del contador, 2026-09-29

Investigación del agente `contador-guatemala` para cerrar el punto 3 de «Pendiente de
investigar» del plan de hallazgos. Veredicto sobre H3 y H6: **correcto con ajustes**.

## Hallazgos críticos

| # | Hallazgo | Corrección |
|---|---|---|
| C1 | `cheque_caduco` sembrado con `actividad_de_flujo = ninguna`: el flujo por método directo deja de cuadrar (NIC 7 párr. 45) cuando el cheque salió en un período y su inverso entra en otro. | El inverso resta en la **misma línea** que su original (ver P1). |
| C2 | El inverso hereda el concepto, pero un concepto de débito no sirve para la nota de crédito inversa. | `aplica_a` se valida solo en originales (`revierte_a_id is null`); el inverso hereda sin validar `aplica_a` ni si está activo. |
| C3 | `pago_a_proveedor` siempre de operación. | Pagos de activos son de inversión (NIC 7 párr. 16a): Cuentas por pagar manda el concepto según lo que paga (P2). |
| C4 | `bancos.movimientos` no sabe de qué módulo viene. | `modulo_de_origen text null`, `documento_de_origen_id uuid null`, sin llave foránea (P6). |
| C5 | Si `sin_clasificar` se puede elegir, se vuelve el valor cómodo. | Solo lo asigna la migración; nunca en una captura. |

## Concepto según el origen (NIC 7, NIIF para PYMES sección 7)

| Origen | Quién lo fija | Concepto | Actividad |
|---|---|---|---|
| Pago de contraseña (Cuentas por pagar) | El módulo, bloqueado en Bancos | `pago_a_proveedor` o uno de inversión si es activo | Operación / inversión |
| Impuestos (retenciones, ISR, IVA, ISO, IUSI, multas) | Usuario | Impuestos | Operación (párr. 35) |
| Anticipo a proveedor | Usuario (futuro módulo) | Anticipo a proveedores | Operación / inversión si es activo |
| Apertura de caja chica | Usuario (futuro módulo) | Fondo de caja chica | Ninguna (traslado dentro del efectivo, párr. 9) |
| Reintegro de caja chica | Usuario (futuro módulo) | Reintegro de caja chica | Operación |
| Planilla, IGSS, IRTRA, INTECAP | Usuario (futuro módulo) | Planilla / IGSS, IRTRA e INTECAP | Operación (párr. 14d) |
| Préstamo a empleado | Usuario | Préstamos a empleados y su cobro | Inversión (párr. 16e/f); anticipo de sueldo en la práctica operación (P4) |
| Dividendos y retiros | Usuario | Dividendos pagados / Retiro de socios | Financiamiento (párr. 34; único bajo NIIF 18 desde 2027) |
| Cheque manual en Bancos | Usuario, obligatorio; se sugiere el último usado con ese beneficiario | Cualquier activo compatible, no de sistema | — |

El origen **fija** el concepto (como SAP Business One con la línea de flujo): se corrige
en el módulo de origen, no en Bancos.

## Anular, blanquear y cheques caducos

| Caso | Concepto | Flujo |
|---|---|---|
| Anular nota (inverso) | El inverso hereda; reclasificar el original arrastra al inverso | Resta en la línea del original |
| Anular transferencia | `transferencia` en los dos inversos | Fuera del flujo de la empresa |
| Cheque anulado en mes no conciliado (sin inverso) | Conserva el suyo | Se excluye (`anulado_en`), igual que el saldo |
| Cheque anulado en mes conciliado | El inverso hereda | Resta en la línea del cheque |
| Blanquear | Desaparece con el movimiento (queda en auditoría) | Nada |
| Cheque caduco (H6) | **A (recomendada):** hereda y la caducidad es una causa del cheque (`causa_de_anulacion`). **B:** lleva `cheque_caduco` y el reporte lo ubica por `revierte_a_id` en la línea del original | Resta en la línea del original |

La caducidad no extingue la deuda (Código de Comercio arts. 502 y 508): el asiento del
inverso acredita un pasivo (Proveedores o «Cheques caducos por pagar»), no el gasto.

## Flujo de efectivo (H3c)

- Transferencias propias fuera del reporte de la empresa (párr. 9); en el de una
  cuenta, línea aparte. A otra empresa del mismo dueño no es transferencia.
- Saldo inicial: apertura, no flujo.
- Anulaciones: se netean en la línea del original.
- `sin_clasificar`: línea visible «Sin clasificar (pendiente)», no excluida.
- Control: saldo inicial + operación + inversión + financiamiento + sin clasificar =
  saldo final en libros.

## Migración (reglas deterministas, nada inferido)

| Datos | Concepto |
|---|---|
| Notas de transferencia y sus inversos | `transferencia` |
| Saldo inicial | `saldo_inicial` |
| Inversos | El de su original, después de clasificar los originales |
| El resto (notas y cheques emitidos, incluidos anulados a la antigua) | `sin_clasificar` |

Antes, `SembrarConceptos` en cada empresa con movimientos; después `not null`. Los
cheques sin movimiento no llevan concepto.

Bandeja de reclasificación: filtro «Sin clasificar» con conteo y monto; columna
«Sugerido» (último concepto del beneficiario o por texto) que solo se muestra;
selección múltiple «Clasificar como…» filtrando por `aplica_a`; auditoría `corregir`
por movimiento; permitido en meses conciliados; prohibido en inversos,
transferencias, saldo inicial y lo que viene de otro módulo.

## Conceptos de sistema

Un concepto es de sistema solo si un proceso lo asigna sin que el usuario elija.
`anulacion` **no** (es una marca, hereda). Planilla, caja chica y anticipos serán de
sistema cuando existan sus módulos. Sugeridos nuevos para la semilla: Anticipo a
proveedores, Fondo de caja chica (ninguna), Reintegro de caja chica, IGSS/IRTRA/INTECAP,
Préstamos a empleados y su cobro (inversión), Dividendos pagados (financiamiento),
Venta de activo (inversión), Préstamo a / de empresa relacionada. A las empresas ya
sembradas solo se les agregan, sin tocar lo editado.

## Diseño de H3b

Datos: `bancos.movimientos.concepto_id` (nulable → relleno → `not null`), índice
`(empresa_id, concepto_id, fecha)`; `estaEnUso` revisa movimientos. Columnas de origen
y `causa_de_anulacion` según P6 y P1.

Reglas: original exige concepto activo, compatible y no de sistema (excepto
transferencia, saldo inicial, inversos y órdenes de otro módulo); el inverso hereda;
`sin_clasificar` solo por migración; reclasificar con auditoría `corregir`, arrastra al
inverso; sugerencia por beneficiario al capturar.

## Preguntas para el usuario

1. **P1** Cheque caduco: ¿opción A (recomendada) o B?
2. **P2** ¿Cuentas por pagar manda concepto de inversión cuando la factura es de un
   activo? ¿De dónde sale el dato (Libro de compras o al pagar)? ¿O todo operación?
3. **P3** ¿Un cheque manual puede usar «Pago a proveedores»? Recomendado: solo si
   Cuentas por pagar no está activo; si lo está, aviso o bloqueo.
4. **P4** Préstamos a empleados: ¿inversión o operación si es anticipo de sueldo?
5. **P5** Dividendos y retiros: ¿uno o dos conceptos? ¿Siempre financiamiento?
6. **P6** Columnas de origen: ¿en H3b o en CP4?
7. **P7** ¿Sugerencias en la bandeja «Sin clasificar», siempre con confirmación?
8. **P8** ¿Se aceptan los sugeridos nuevos y «Cheque rechazado» en «Cobros a clientes»?

## Fuentes

NIC 7 (párr. 9, 14, 16, 17, 22–24, 31–36, 45); NIIF para PYMES sección 7; NIIF 18
(vigente 2027); Código de Comercio arts. 368, 374, 502 y 508; SAP Business One, línea
de flujo de efectivo obligatoria.
