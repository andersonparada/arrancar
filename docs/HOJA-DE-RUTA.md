# Hoja de ruta y pendientes por planificar

Recogido con el usuario el 2026-09-28. **Nada de esto se programa sin planificarlo
antes**, y cada tema se **investiga a fondo** (procesos reales, leyes de Guatemala,
cómo lo resuelven otros sistemas) hasta dominarlo: el objetivo es vender algo que
resuelva el trabajo diario de verdad, no pantallas vacías.

## Orden acordado

1. **Bancos B7** (hecho): anular con movimiento inverso, eliminar lo limpio y
   blanquear cheques.
2. **Libro de compras** (`docs/modulos/libro-de-compras.md`; L0 hecho).
3. **Cuentas por pagar** (`docs/modulos/cuentas-por-pagar.md`).
4. **Bancos, segunda parte** (abajo).
5. **Empresas: localidades y departamentos** (abajo).
6. **Multimoneda** (abajo).
7. Caja chica y Cuentas por liquidar.
8. Activos fijos e Inventarios.
9. Parcelas, Cultivos y Ganadería.

Contabilidad va cuando haga falta para las partidas (provisión, reversión, ajuste
diferencial cambiario).

## Cuentas por pagar: agregados

### Saldos iniciales de cuentas por pagar

- Ventana para cargar las facturas que ya se debían al empezar a usar el sistema.
- Es **una sola carga por empresa** (no se repite como hoy se puede con las notas
  de saldo inicial en Bancos).
- **Por investigar y confirmar:** el usuario dijo «quedarán pagados con la
  nota/partida inicial». Hay que definir si son facturas **pendientes** que se
  pagan después por contraseña (lo normal: la deuda viene de antes y se paga ahora)
  y la partida inicial solo evita que se registren como gasto del período, o si
  entran ya pagadas.

### Reportes (imprimir y exportar)

| Idea del usuario | Nombre propuesto | Módulo |
|---|---|---|
| Facturas sin pagos | **Facturas pendientes de pago** | Cuentas por pagar |
| Facturas pagadas / no pagadas | **Estado de pago de facturas** (filtro: pagadas, en parte, pendientes) | Cuentas por pagar |
| Facturas con retención ISR | **Retenciones de ISR** (y su par **Retenciones de IVA**) | Libro de compras |
| Reporte general (SAT) | **Libro de compras y servicios** | Libro de compras |
| IVA por cobrar | **IVA crédito fiscal** | Libro de compras |
| Saldos de proveedores | **Saldos por proveedor** (con su **Antigüedad de saldos**) | Cuentas por pagar |
| Facturas sin contraseña | **Facturas autorizadas sin contraseña** | Cuentas por pagar |
| Notas de crédito | **Notas de crédito de proveedores** | Cuentas por pagar |

Ya planificados: Estado de cuenta del proveedor, Facturas por vencer y Pagos
realizados.

## Bancos, segunda parte

| Tema | Idea | Por investigar |
|---|---|---|
| Aprobación de transferencias | Variable de configuración: si está activa, las transferencias pasan por una ventana de **aprobación**; si no, se aprueban solas. | Flujo de aprobación (quién solicita, quién aprueba, límites por monto). |
| Solicitud de cheques y de notas | Igual, con su variable: se **solicita** y otro **aprueba** antes de emitir. | Idem; relación con las contraseñas de Cuentas por pagar. |
| Formato de impresión de cheques | Administración del formato (posición de cada campo) por banco o chequera. Cada **cuenta cliente** puede tener el suyo: **override** sobre uno de fábrica. | Opción propuesta: plantillas en capas (instalación → cuenta → chequera), la más específica gana; monto en letras; voucher. Cómo lo hacen otros sistemas; medidas de los cheques de los bancos de Guatemala. |
| Ventana de saldos iniciales | Carga inicial de la cuenta con **notas y cheques** (cheques en circulación al empezar), y se quita de la emisión de notas. | Cómo se hace realmente la carga inicial de bancos (saldo según libros + cheques en circulación + depósitos en tránsito) y cómo cuadra con la primera conciliación. |
| Tarjeta de crédito | Nuevo **tipo de cuenta**: tarjeta de crédito. | Cómo se maneja: saldo deudor, corte, pago de la tarjeta desde una cuenta, estado de cuenta. |
| Ajuste por diferencial cambiario | Con *Multimoneda* y *Contabilidad* activos: ventana que genera la **partida de ajuste** por diferencia de tipo de cambio. | Método (mensual, al pago), cuentas contables, NIIF/ley de Guatemala. |
| Reportes | **Saldos por cuenta**, **Movimiento bancario** (ya existe como Movimientos), **Flujo de efectivo**, **Estado de cuenta** por cuenta. | Formato del flujo de efectivo (directo, por concepto). |

## Empresas

- **Localidades** de cada empresa (fincas, sedes, bodegas…).
- **Departamentos**, cada uno de una localidad (por confirmar).
- **Accesos a empresas** (ya existe) y **accesos a localidades**: qué usuario ve
  qué localidad.
- Por investigar: qué registros se filtran por localidad (movimientos, facturas,
  inventario, ganado…) y cómo se combina con el alcance por registro que ya existe.

## Multimoneda

- Ventanas: **Monedas**, **Tipos de cambio** e **ingreso diario** del tipo de cambio.
- Evaluar consumir el **servicio web del Banco de Guatemala** (tipo de cambio de
  referencia) para cargarlo solo.
- Por investigar: qué tipo de cambio usa cada operación (compra, venta,
  referencia), cuentas bancarias en USD, facturas en USD, pagos cruzados y el
  diferencial cambiario.

## Otros pendientes anotados

- Bancos: foto del comprobante, elegir el beneficiario desde Clientes, alcance por
  cuenta, impresión de cheques y vouchers.
- Conciliación: probarla completa en el navegador (la demo de septiembre es del
  diseño viejo: eliminarla y rehacerla).
- Excel de Clientes, Proveedores, Categorías de proveedor y Empresas (sin empezar).
- Selector de empresa del encabezado sin buscador (no usa `CampoSelector`).
- Con Contabilidad: en qué otros casos se permite eliminar (registros no
  contabilizados de un período abierto); cuenta contable por defecto del proveedor
  por empresa; partidas de provisión y reversión.
- Excel de DTE recibidos de la SAT: investigar su formato; después, traerlos
  directo de la SAT.
