# Módulo `cuentas-por-pagar`

Estado: **en planificación** (2026-09-28). No se programa hasta que el usuario
apruebe este documento.

## Propósito

Controlar lo que cada empresa **debe a sus proveedores**: qué facturas tiene,
cuáles están autorizadas (provisionadas), cuándo vencen, qué se agrupó en cada
contraseña de pago y cómo se pagó.

**Depende de:** *Libro de compras* (el documento fiscal, su clasificación y sus
retenciones) y *Bancos* (los cheques y notas de débito con que se paga).
**No es de este módulo:** órdenes de compra (futuro módulo *Compras*; una factura
podrá ligarse a una orden, pero no hace falta), recepción de mercadería (futuro
*Inventario*), anticipos a proveedores (otro módulo), caja chica y cuentas por
liquidar.

## Flujo

```
Factura ──registrar──▶ registrada ──autorizar──▶ autorizada ──▶ en contraseña ──▶ pagada
Nota de crédito ─────▶ registrada ──autorizar──▶ autorizada ──▶ en contraseña ──▶ aplicada
Contraseña ──crear──▶ pendiente ──pagos──▶ pagada en parte ──▶ pagada
```

1. **Registrar la factura** (Operación): proveedor, documento fiscal (serie,
   número, UUID, fecha, líneas por concepto, IVA, retenciones propuestas) y
   **vencimiento** (fecha + días de crédito del proveedor, se puede cambiar). El
   documento se guarda en *Libro de compras* con origen `cuentas-por-pagar`.
2. **Autorizar (provisionar)**: con permiso propio. **Quien registró no autoriza**,
   salvo el **Propietario** y el **superacceso**. Si *Contabilidad* está activa, se
   publica un evento con las líneas para que genere la partida de provisión; si no,
   solo cambia el estado.
3. **Nota de crédito del proveedor** (ventana aparte): siempre sobre una factura del
   mismo proveedor, con sus retenciones ajustadas. También se registra y se autoriza.
4. **Contraseña de pago**: agrupa facturas y notas de crédito **autorizadas** de
   **un proveedor**, con fecha prometida de pago. Se imprime para entregársela al
   proveedor. **Todo pago va por contraseña.**
5. **Pagos de la contraseña**: uno o varios, cada uno con **cheque** o **nota de
   débito** de una cuenta bancaria, que se crean en *Bancos* con el proveedor como
   beneficiario. El monto a pagar es:

   > **Saldo = facturas − notas de crédito aplicadas − retenciones − pagos anteriores**

   Las notas de crédito del proveedor no son pagos: son **aplicaciones** que rebajan
   el saldo sin mover dinero.

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Pagos | Siempre por contraseña; una contraseña se paga con 1 o N pagos (cheque o nota de débito). |
| Notas de crédito | Ventana aparte; con retenciones si aplica; rebajan la factura a la que apuntan. |
| Aprobación | Toda factura se autoriza (provisiona). Con *Contabilidad* genera partida; sin ella, solo se autoriza. |
| Separación de funciones | Permisos distintos para registrar, autorizar y pagar. Quien registra no autoriza, salvo Propietario y superacceso. |
| Clasificación | Por líneas, con los conceptos de *Libro de compras*. |
| Días de crédito | En la ficha del proveedor, sección «Cuentas por pagar», **solo si el módulo está activo**. Proponen el vencimiento. |
| Documento único | En toda la instalación (lo hace cumplir *Libro de compras*). |
| Órdenes de compra | No hacen falta. Cuando exista *Compras*, la factura podrá apuntar a una orden. |

## Propuestas a confirmar

| Tema | Propuesta |
|---|---|
| Número de contraseña | Correlativo **por empresa**, lo asigna el sistema. |
| Contenido de la contraseña | Solo documentos autorizados, del mismo proveedor, que no estén en otra contraseña vigente. |
| Reparto de los pagos | Un pago de la contraseña se reparte entre sus facturas **por vencimiento** (la más antigua primero), para que la antigüedad de saldos sea exacta por factura. |
| Retenciones en el pago | Se descuentan del saldo de la contraseña, así que el proveedor recibe el neto. |
| Anular una factura | Solo si no está en una contraseña vigente. Si estaba autorizada y hay *Contabilidad*, se publica el evento para revertir la partida. Libera el número del documento. |
| Anular una contraseña | Solo si no tiene pagos vigentes; libera sus documentos. |
| Anular un pago | Desde **Cuentas por pagar**: anula el cheque o la nota de débito en *Bancos* en la misma transacción. En *Bancos*, esos movimientos se ven con su origen y **no se anulan desde allá** (mensaje: «anúlelo desde el pago en Cuentas por pagar»). |
| Mes conciliado | Un pago no se anula si su movimiento está en un mes conciliado de *Bancos* (ya lo impide Bancos). |

## Tablas (esquema `cuentas_por_pagar`)

| Tabla | Contenido |
|---|---|
| `facturas` | documento (id en *Libro de compras*), proveedor, vencimiento, estado, quién y cuándo registró y autorizó, saldo |
| `notas_de_credito` | documento, factura a la que rebaja, estado, quién registró y autorizó |
| `contrasenas` | número, proveedor, fecha, fecha prometida de pago, estado, observaciones |
| `contrasena_documentos` | contraseña, factura o nota de crédito |
| `pagos` | contraseña, forma (cheque o nota de débito), cuenta bancaria, monto, fecha, movimiento en *Bancos*, estado |
| `pago_aplicaciones` | pago, factura, monto aplicado |
| `proveedores` | proveedor, días de crédito (la sección de la ficha) |

## Permisos

| Permiso | Para |
|---|---|
| `cuentas-por-pagar.facturas.ver` / `.registrar` / `.autorizar` / `.anular` | Facturas |
| `cuentas-por-pagar.notas-de-credito.ver` / `.registrar` / `.autorizar` / `.anular` | Notas de crédito |
| `cuentas-por-pagar.contrasenas.ver` / `.gestionar` / `.anular` | Contraseñas |
| `cuentas-por-pagar.pagos.emitir` / `.anular` | Pagos (el cheque o la nota los crea el caso de uso; no pide el permiso de Bancos) |
| `cuentas-por-pagar.proveedores.gestionar` | Días de crédito en la ficha |
| `cuentas-por-pagar.reportes.ver` / `.exportar` | Reportes |

## Eventos

- Publica: `cuentas-por-pagar.factura_autorizada`, `…factura_anulada`,
  `…nota_de_credito_autorizada`, `…nota_de_credito_anulada`, `…pago_emitido` y
  `…pago_anulado`, con las líneas y montos que necesite *Contabilidad*.
- Escucha: nada en esta versión. Los movimientos de Bancos no se anulan desde allá.

## Pantallas

**Operación** (sin Excel):
- **Facturas**: lista con filtros (proveedor, estado, fechas, vencidas) y ventana
  de registro con líneas y retenciones. Autorizar y anular desde la tarjeta.
- **Notas de crédito**: igual, eligiendo la factura.
- **Contraseñas**: crear (elegir el proveedor y marcar sus documentos
  autorizados), imprimir, ver el saldo, registrar pagos y anular.

**Reportes** (imprimir y exportar):
- **Antigüedad de saldos** por proveedor: al día, 1–30, 31–60, 61–90, más de 90.
- **Estado de cuenta del proveedor**: facturas, notas, pagos y saldo corrido.
- **Facturas por vencer** (para programar pagos).
- **Pagos realizados**.

**Ficha del proveedor**: sección «Cuentas por pagar» con días de crédito y saldo.

## Pasos (un commit cada uno)

*Libro de compras* L0 a L2 van primero (ver su documento).

1. **CP1 Facturas**: servidor y cliente. Registrar, autorizar con separación de
   funciones, anular y días de crédito en la ficha.
2. **CP2 Notas de crédito**.
3. **CP3 Contraseñas**: crear, imprimir y anular.
4. **CP4 Pagos**: fachada pública de *Bancos* para emitir y anular cheques y notas
   de débito con origen, más el bloqueo de anulación desde Bancos. Reparto por
   vencimiento.
5. **CP5 Reportes**.

## Fuera de esta versión

Órdenes de compra y el cruce de tres documentos (llegan con *Compras* e
*Inventario*), anticipos a proveedores, moneda extranjera, pagos programados en
lote de varios proveedores y descuentos por pronto pago.
