# Módulo `cuentas-por-liquidar` — se muestra como **Cuentas por liquidar**

Estado: **en programación** (CL-1, datos, hecho el 2026-11-18). El diseño aprobado es
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

## Pendiente (pasos siguientes del diseño §14)

La configuración (§9.5), los casos de uso, la API y las pantallas (CL-2 en adelante) y los conceptos de sistema de Bancos
(CCL-B1); la pregunta `libro-de-compras.pagado_al_proveedor_en_el_mes` (CCL-M, CCL-BZ) y la referencia de destino del
libro (CCL-L1).
