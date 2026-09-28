# Módulo `cuentas-por-pagar`

Estado: **en planificación** (2026-09-28). No se programa hasta que el usuario
apruebe este documento.

## Propósito

Controlar lo que cada empresa **debe a sus proveedores**: qué facturas tiene,
cuáles están autorizadas (provisionadas), cuándo vencen, qué se agrupó en cada
contraseña de pago y cómo se pagó.

**Depende de:** *Libro de compras* (el documento fiscal, sus líneas, el IDP y las
retenciones) y *Bancos* (los cheques y notas de débito con que se paga).
**No es de este módulo:** órdenes de compra (futuro módulo *Compras*; una factura
podrá ligarse a una orden, pero no hace falta), recepción de mercadería (futuro
*Inventario*, que funciona sin este módulo), anticipos a proveedores (otro módulo),
caja chica y cuentas por liquidar.

## Flujo

```
Ingreso de facturas (Libro de compras, destino = Cuentas por pagar)
        │
        ▼
Bandeja ──completar──▶ registrada ──autorizar──▶ autorizada ──▶ en contraseña ──▶ pagada
(pendiente)            (vencimiento)            (provisionada)
Contraseña ──crear──▶ pendiente ──pagos──▶ pagada en parte ──▶ pagada
```

1. **Ingreso**: el operador registra la factura en *Libro de compras* con destino
   Cuentas por pagar (sugerido si ese proveedor ya se usó así). El documento llega
   a la **bandeja** de este módulo.
2. **Completar en la bandeja**: el **vencimiento** se propone con la fecha + los
   días de crédito del proveedor y se puede cambiar. Queda **registrada**.
3. **Autorizar (provisionar)**: con permiso propio. **Quien registró no autoriza**,
   salvo el **Propietario** y el **superacceso**. Si *Contabilidad* está activa, se
   publica un evento con las líneas para que genere la partida de provisión; si no,
   solo cambia el estado.
4. **Notas de crédito del proveedor**: se ingresan igual (en su propia ventana de
   ingreso), siempre sobre una factura del mismo proveedor, con sus retenciones
   ajustadas. También se registran y se autorizan.
5. **Contraseña de pago**: agrupa facturas y notas de crédito **autorizadas** de
   **un proveedor**, con fecha prometida de pago. Se imprime para entregársela al
   proveedor. **Todo pago va por contraseña.**
6. **Pagos de la contraseña**: uno o varios, cada uno con **cheque** o **nota de
   débito** de una cuenta bancaria, que se crean en *Bancos* (orden por el
   mediador) con el proveedor como beneficiario. El monto a pagar es:

   > **Saldo = facturas − notas de crédito aplicadas − retenciones − pagos anteriores**

   Las notas de crédito del proveedor no son pagos: son **aplicaciones** que rebajan
   el saldo sin mover dinero.

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Ingreso | Por la pantalla única «Ingreso de facturas» de *Libro de compras*; este módulo recibe los documentos en su bandeja. |
| Pagos | Siempre por contraseña; una contraseña se paga con 1 o N pagos (cheque o nota de débito). |
| Notas de crédito | Ventana aparte; con retenciones si aplica; rebajan la factura a la que apuntan. |
| Aprobación | Toda factura se autoriza (provisiona). Con *Contabilidad* genera partida; sin ella, solo se autoriza. |
| Separación de funciones | Permisos distintos para registrar, autorizar y pagar. Quien registra no autoriza, salvo Propietario y superacceso. |
| Días de crédito | Campo en el **formulario de Proveedores**, visible **solo si este módulo está activo**. Proponen el vencimiento. |
| Documento único | En toda la instalación (lo hace cumplir *Libro de compras*). |
| Órdenes de compra | No hacen falta. Cuando exista *Compras*, la factura podrá apuntar a una orden. |
| Permisos entre módulos | El permiso de pagar de este módulo basta para crear el cheque o la nota en *Bancos*; no se pide el permiso de Bancos. |

## Reglas de contraseñas, pagos y anulaciones

| Tema | Decisión |
|---|---|
| Número de contraseña | Correlativo **por empresa**, lo asigna el sistema. |
| Contenido de la contraseña | Solo documentos autorizados, del mismo proveedor, que no estén en otra contraseña vigente. |
| Qué cubre cada pago | El **usuario elige** qué facturas de la contraseña paga (una o varias) y cuánto a cada una. |
| Retenciones en el pago | Se descuentan del saldo de la contraseña, así que el proveedor recibe el neto. |
| Eliminar una factura | Solo si **no está autorizada (provisionada)** y **no está en una contraseña**. Se borra de verdad (queda en la auditoría) y libera el número del documento. |
| Anular una factura | Si ya está autorizada: genera su **reversión** (con *Contabilidad*, la partida inversa). No se puede si está en una contraseña vigente. Libera el número del documento. |
| Eliminar una contraseña | Solo si **no tiene pagos emitidos** (vigentes). Se borra (queda en la auditoría) y **suelta sus facturas**, que vuelven a estar disponibles para otra contraseña. |
| Anular una contraseña | **No genera reversión**: solo queda marcada como anulada, con su motivo y en la auditoría (conserva su número correlativo). Solo si **no tiene pagos emitidos ni facturas relacionadas**. |
| Anular un pago desde Cuentas por pagar | Anula también el cheque o la nota de débito en *Bancos*, en la misma transacción. |
| Anular el cheque o la nota desde Bancos | **Se permite.** En la misma transacción, *Bancos* avisa al módulo que lo emitió y ese módulo **revierte lo suyo** (aquí: anula el pago y devuelve el saldo a las facturas). Antes, ese módulo **revisa sus reglas**: si algo lo bloquea (p. ej. un período cerrado), rechaza y **no se anula nada**. Si ese módulo no está activo, se anula solo en *Bancos* y queda en la auditoría. |
| Mes conciliado | Un movimiento conciliado **no se elimina**, pero **sí se anula** con su movimiento inverso, fechado en un mes no conciliado (ver B7 en `bancos.md`). |

## Tablas (esquema `cuentas_por_pagar`)

| Tabla | Contenido |
|---|---|
| `facturas` | documento (id en *Libro de compras*), proveedor, vencimiento, estado, quién y cuándo registró y autorizó, saldo |
| `notas_de_credito` | documento, factura a la que rebaja, estado, quién registró y autorizó |
| `contrasenas` | número, proveedor, fecha, fecha prometida de pago, estado, observaciones |
| `contrasena_documentos` | contraseña, factura o nota de crédito |
| `pagos` | contraseña, forma (cheque o nota de débito), cuenta bancaria, monto, fecha, movimiento en *Bancos*, estado |
| `pago_aplicaciones` | pago, factura, monto aplicado |

Los días de crédito los guarda el módulo *Clientes* con el proveedor.

## Permisos

| Permiso | Para |
|---|---|
| `cuentas-por-pagar.facturas.ver` / `.registrar` / `.autorizar` / `.anular` | Bandeja y facturas |
| `cuentas-por-pagar.notas-de-credito.ver` / `.registrar` / `.autorizar` / `.anular` | Notas de crédito |
| `cuentas-por-pagar.contrasenas.ver` / `.gestionar` / `.anular` | Contraseñas |
| `cuentas-por-pagar.pagos.emitir` / `.anular` | Pagos |
| `cuentas-por-pagar.reportes.ver` / `.exportar` | Reportes |

## Eventos y órdenes

- Atiende la orden `RecibirDocumentoEnCuentasPorPagar` (de *Libro de compras*):
  deja el documento en la bandeja.
- Envía a *Bancos* las órdenes `EmitirCheque`, `RegistrarNotaDeDebito` y
  `AnularMovimientoDeOrigen`.
- Escucha, **dentro de la transacción**, el aviso de *Bancos*
  `MovimientoDeOrigenAnulado` (origen = este módulo): anula el pago y devuelve el
  saldo a sus facturas.
- Publica: `…factura_autorizada`, `…factura_anulada`,
  `…nota_de_credito_autorizada`, `…nota_de_credito_anulada`, `…pago_emitido` y
  `…pago_anulado`, con lo que necesite *Contabilidad*.

## Pantallas

**Operación** (sin Excel):
- **Bandeja**: documentos que llegaron de Ingreso de facturas; completar vencimiento.
- **Facturas**: lista con filtros (proveedor, estado, fechas, vencidas); autorizar y
  anular desde la tarjeta.
- **Notas de crédito**: igual.
- **Contraseñas**: crear (elegir el proveedor y marcar sus documentos autorizados),
  imprimir, ver el saldo, registrar pagos y anular.

**Reportes** (imprimir y exportar):
- **Antigüedad de saldos** por proveedor: al día, 1–30, 31–60, 61–90, más de 90.
- **Estado de cuenta del proveedor**: facturas, notas, pagos y saldo corrido.
- **Facturas por vencer** (para programar pagos).
- **Pagos realizados**.

## Pasos (un commit cada uno)

*Libro de compras* L0 a L3 van primero (ver su documento). El módulo y sus
ventanas se crean con el **generador** (`npm run generar -- modulo`, `definicion` y
`recurso`) y se completan a mano.

1. **CP1 Bandeja y facturas**: días de crédito en Proveedores, recibir documentos,
   completar, autorizar con separación de funciones y anular.
2. **CP2 Notas de crédito**.
3. **CP3 Contraseñas**: crear, imprimir y anular.
4. **CP4 Pagos**: órdenes a *Bancos* para emitir y anular cheques y notas de débito
   con origen; el aviso de Bancos cuando se anulan desde allá. El usuario elige las
   facturas y montos de cada pago.
5. **CP5 Reportes**.

## Fuera de esta versión

Órdenes de compra y el cruce de tres documentos (llegan con *Compras* e
*Inventario*), anticipos a proveedores, moneda extranjera, pagos programados en
lote de varios proveedores y descuentos por pronto pago.
