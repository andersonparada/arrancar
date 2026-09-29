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

Acordado el 2026-09-28, después de investigar cómo se hace:

- Ventana de **Administración** «Saldos iniciales» (con Excel) para cargar,
  **factura por factura**, las que **siguen pendientes** a la fecha de inicio, con
  su fecha y vencimiento reales (así la antigüedad de saldos sale bien). No se carga
  un saldo global por proveedor.
- Se marcan **«de saldo inicial»**: no piden concepto de gasto ni entran al Libro de
  compras del período (son de meses anteriores). Su contrapartida contable es una
  **cuenta puente de apertura**, no gasto. Sus retenciones, si las hubo, se hicieron
  con el sistema anterior: solo se consultan, no se recalculan.
- Hacen **todo su proceso** (autorizar, contraseña, pago). En la contraseña tienen
  **dos formas de pago extra**, con permiso propio:
  - **Ligar al cheque o nota de saldo inicial de Bancos**: una factura vieja que se
    pagó con un cheque emitido antes de empezar y todavía en circulación. No se
    emite un cheque nuevo ni se duplica la salida de dinero.
  - **Aplicar a la cuenta de apertura** (sin banco): para lo que ya estaba pagado y
    se cargó por historial o por error. Es la excepción.

### Fecha de inicio y carga inicial (por empresa)

Así lo recomiendan los contadores: todos los saldos iniciales se toman a **una sola
fecha de corte por empresa** y deben cuadrar entre sí y con el balance de apertura.

- **Fecha de inicio** de la empresa en el sistema: campo en Empresas.
- **Carga inicial** por empresa, **abierta** o **cerrada**. La usan Bancos y Cuentas
  por pagar (después Cuentas por cobrar, Inventario y Activos fijos). Abierta, se
  corrige libremente; al **cerrarla** ya no se agregan saldos iniciales.
- **Reabrirla** pide un permiso propio, motivo y queda en la auditoría. Lo
  olvidado también puede entrar como ajuste del período (con Contabilidad).
- **Bancos**: un saldo inicial por cuenta bancaria, con fecha igual o anterior a la
  fecha de inicio, solo con la carga abierta; con **notas y cheques** (cheques en
  circulación y depósitos en tránsito al empezar). Una cuenta abierta **después** de
  la fecha de inicio **no lleva saldo inicial**: empieza en cero y su primer
  depósito es un movimiento normal.
- La **primera conciliación** de cada cuenta es la del mes de la fecha de inicio
  (o del mes en que se abrió la cuenta, si es posterior).

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

## Revisión contable: puntos por definir (2026-09-28)

Repaso de lo hecho y lo planificado. Nada de esto rompe lo programado, pero hay que
resolverlo antes de seguir.

### Bancos (programado)

| Tema | Estado | Qué falta |
|---|---|---|
| Cargos del banco no registrados en libros (comisiones, intereses, cheques rechazados) | Funciona: se registra la nota antes de conciliar | Poder marcar esas notas como **ajuste de conciliación** para que el documento las muestre en su propia sección. |
| Primera conciliación | Incompleto | Se resuelve con la fecha de inicio y la carga inicial (arriba). |
| Cheques posfechados | Sin definir | ¿Se permiten? ¿Cuentan en el saldo desde su fecha o desde que se emiten? |
| Cheque impreso o entregado | Sin definir | Lo necesita la regla de blanquear; llega con la impresión de cheques. |

### Revisión a fondo de lo programado (2026-09-28): hallazgos por decidir

Revisadas las tablas y reglas reales de Bancos, Empresas y Clientes/Proveedores
contra la práctica contable y la ley de Guatemala.

| # | Hallazgo | Por qué importa | Solución propuesta | Gravedad |
|---|---|---|---|---|
| H1 | La **auditoría se conserva un año** | El Código Tributario pide conservar registros 4 años (prescripción) y el Código de Comercio 5. Lo eliminado o anulado solo queda en la auditoría: a los 12 meses se pierde la evidencia. | Conservación por omisión de **5 años**, y nunca purgar lo de módulos financieros (Bancos, Libro de compras, Cuentas por pagar) mientras no prescriba. | Alta |
| H2 | La conciliación **no guarda el saldo del estado de cuenta** del banco | Es la evidencia externa de que cuadró: el sistema calcula «lo que debería decir el banco», pero no queda registrado lo que el banco **sí** dijo. Un auditor lo pide. | El usuario **no decide** ningún saldo de libros; solo **transcribe** el saldo final del estado de cuenta (y adjunta su foto o PDF). Se autoriza solo si es igual al calculado. | Alta |
| H3 | Las notas **no tienen concepto** (comisión, intereses, depósito de ventas, planilla…) | Sin clasificación no salen el **flujo de efectivo**, ni el gasto por comisiones, ni la partida contable. | Catálogo de **conceptos bancarios** por empresa, obligatorio en cada nota (y en cheques y transferencias según el caso). | Alta |
| H4 | **Número de cuenta único por empresa**, no por banco | Dos bancos pueden usar el mismo número de cuenta; hoy se rechazaría la segunda. | Único por empresa **y banco**. | Media |
| H5 | **Empresas** sin razón social, NIT obligatorio, régimen, fecha de inicio ni establecimientos | Libro de compras, retenciones y FEL los necesitan. Los **establecimientos** de la SAT (cada uno con su código) son justamente las **localidades** planificadas. | Agregar razón social, nombre comercial, NIT obligatorio (si hay módulos fiscales), régimen, fecha de inicio y **localidades = establecimientos SAT** (con su código). | Media |
| H6 | **Cheques en circulación viejos** | El banco no está obligado a pagar un cheque presentado **después de seis meses** de su fecha. Quedan como pendientes para siempre. | Reporte y alerta de cheques en circulación con más de 6 meses, para revisarlos y anularlos (con su inverso si el mes ya se concilió). | Media |
| H7 | **Comisiones bancarias con IVA** | Las comisiones y la venta de chequeras llevan IVA y el banco emite factura: es **crédito fiscal**. Hoy la nota de débito no llega al Libro de compras. | Cuando exista Libro de compras: la nota de débito por comisión puede ligarse a su factura (destino «Bancos» en Ingreso de facturas). | Media |
| H8 | **Intereses con ISR retenido** | El banco acredita el interés **neto**; el 10 % de ISR sobre rentas de capital ya va retenido. Para contabilidad y el ISR anual hay que conocer el bruto y la retención. | En la nota de crédito por intereses, campos opcionales de **interés bruto** y **ISR retenido** (el neto es el monto). | Baja |
| H9 | Las notas **no tienen correlativo interno** | Práctica de control: cada comprobante (voucher) lleva número interno consecutivo para detectar faltantes. | Correlativo por empresa y tipo, asignado por el sistema (independiente de la referencia del banco). | Baja |
| H10 | **Proveedores sin NIT** o con «CF» | En el Libro de compras cada factura necesita el NIT del emisor; a quien no tiene NIT se le hace factura especial. | Exigir NIT (distinto de CF) al usar un proveedor en Libro de compras. | Baja |
| H11 | **Crédito fiscal fuera de plazo** | El crédito fiscal se puede reportar a más tardar en los **dos meses siguientes** al período de la factura. | En Libro de compras: guardar el **mes del libro** y avisar o impedir registrar facturas fuera de ese plazo. | Media (plan) |

### Libro de compras y Cuentas por pagar (planificados): corregir en el plan

1. **Momento de la retención**: la ley manda retener al **pagar o acreditar en
   cuenta**, lo que ocurra primero. Con provisión, acreditar en cuenta es
   **autorizar**. La retención nace al autorizar (o al pagar si no hay provisión),
   no al registrar; la constancia y el reporte mensual van por esa fecha.
   **Investigar a fondo** y ajustar el plan.
2. **Contraseña de pago en la práctica**: en Guatemala se entrega **cuando el
   proveedor trae la factura** (comprobante de recibido con fecha de pago), antes de
   aprobarla. Propuesta: la contraseña puede tener facturas **registradas**; solo se
   **paga** lo autorizado. **Confirmar con el usuario.**
3. **Período del crédito fiscal**: el IVA va en el Libro de compras del mes que
   corresponde y la ley da un plazo para facturas atrasadas. Investigar el plazo y
   guardar el **mes del libro** además de la fecha de emisión.
4. **Pagos parciales con retención**: la retención se aplica una sola vez (al
   provisionar o en el primer pago), no en cada pago.
5. **Notas de crédito del proveedor**: restan del IVA crédito fiscal del mes en que
   se reciben (confirmar en la investigación).

### Módulos grandes que faltan planificar

- **Contabilidad**: nomenclatura por empresa, partidas de provisión, reversión y
  apertura, períodos cerrados y en qué casos se permite eliminar.
- **Cuentas por cobrar / Ventas**: incluye las **retenciones que les hacen** a las
  empresas (p. ej. en la venta de tabaco) y sus constancias.

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
