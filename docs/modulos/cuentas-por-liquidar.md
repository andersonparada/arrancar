# Módulo `cuentas-por-liquidar` — se muestra como **Cuentas por liquidar**

Estado: **en programación** (CL-1, datos, y CL-2, anticipos del servidor, hechos el 2026-11-18). El diseño aprobado es
`diseno-caja-chica-y-cuentas-por-liquidar.md` (con el dictamen `dictamen-caja-chica-2026-11-18.md` y las respuestas del
usuario al final del diseño); lo que sigue de este documento resume lo ya programado.

## Propósito

Anticipos de dinero a una persona (un tercero de la cuenta, empleado o no) que debe justificarlos con documentos, con
liquidación por devolución, reembolso o lo no liquidado (cobrar en cuotas, renta del trabajo o pérdida).

**Depende de:** *Libro de compras*, *Bancos* y *Terceros*. **No es de este módulo:** los fondos fijos (*Caja chica*) ni el
retiro de efectivo para pagar pasivos (*Cuentas por pagar*).

## Decisiones acordadas (2026-11-18)

| Tema | Decisión |
|---|---|
| Quién ve los anticipos | Por permiso, sin alcance por registro en esta versión (CL-u); RLS por empresa |
| Factura con retención | Se rechaza, salvo con el permiso de excepción `cuentas-por-liquidar.gastos.con-retencion` y motivo, auditado (CC-f A′) |
| Bancarización | Aviso y marca `sin_bancarizar`, sin bloquear (CC-h A) |
| Lo no liquidado | Cobrar (cuotas), renta del trabajo (solo empleados) o pérdida (CL-s); lo ejecutará Planilla |

## Tablas (esquema `cuentas_por_liquidar`, migraciones `0000_esquema` y `0001_cl1_anticipos_y_gastos`)

`anticipos` (la entrega, la liquidación completa o abierta, la devolución, el reembolso y lo no liquidado con su destino)
y `gastos` (documento del libro o gasto sin documento; la bandeja es `anticipo_id` nulo). Con `empresa_id`, RLS por
empresa, `marcasDeTiempo` y `autoria`. Llaves compuestas: el gasto es de un anticipo de su misma empresa, y el concepto de
gasto y la localidad, de la misma empresa.

## Permisos

`cuentas-por-liquidar.anticipos.{ver, crear, anular, liquidar, con-vencidos}`,
`cuentas-por-liquidar.gastos.{crear, anular, con-retencion}` y `cuentas-por-liquidar.reportes.{ver, exportar}`.

## Anticipos (CL-2, servidor)

- `POST /api/cuentas-por-liquidar/anticipos` (`anticipos.crear`): beneficiario (tercero de la cuenta, activo), `esEmpleado`,
  usuario y localidad opcionales, clase, descripción, monto, fecha (no futura), fecha límite (por omisión la entrega más
  `cuentas-por-liquidar.anticipos.dias_para_liquidar`, 15) y forma: cheque (a nombre del beneficiario, no negociable por
  omisión, nunca al portador) o nota de débito. Ordena a Bancos con el anticipo como origen y el concepto «Anticipos por
  liquidar». Responde con los avisos de Bancos, el de vencidos y el C8 (no empleado: facturas a nombre y NIT de la empresa).
- **Vencidos:** aviso; con `cuentas-por-liquidar.anticipos.bloquear_con_vencidos` se rechaza (`BeneficiarioConVencidos`)
  salvo con `anticipos.con-vencidos` y un motivo (queda en el anticipo).
- `POST …/anticipos/:id/anular` (`anticipos.anular`): abierto, sin gastos vigentes y con el cheque sin cobrar; audita `anular`.
  Lo mismo ocurre si se anula el cheque desde Bancos (aviso `bancos.movimiento_por_cambiar`); otros cambios en Bancos se
  rechazan (`MovimientoDeCuentasPorLiquidar`).
- `GET …/anticipos` (`estado`, `corte`, `beneficiarioId`, `vencidos`, paginación) con lo que falta por justificar y la
  antigüedad (al corte o a hoy) y `GET …/anticipos/:id`.
- Eventos: `cuentas-por-liquidar.anticipo_entregado` y `cuentas-por-liquidar.anticipo_anulado`.

## Pendiente (pasos siguientes del diseño §14)

Los gastos (CL-3), liquidar (CL-4), las pantallas (CL-5) y los reportes (CL-6); queda la configuración de gastos sin
documento (CL-3); la pregunta `libro-de-compras.pagado_al_proveedor_en_el_mes` (CCL-M, CCL-BZ) y la referencia de destino del
libro (CCL-L1).
