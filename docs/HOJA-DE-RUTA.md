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

### Aviso de pago por correo (pedido del usuario, 2026-10-04)

- Al **pagar una factura** (y, por simetría, al cobrar una de Cuentas por cobrar) se puede **enviar
  el aviso por correo** al proveedor o cliente.
- Un tercero puede tener **n correos**: hoy hay uno en `terceros.terceros.correo` y uno por contacto
  (`terceros.contactos.correo`). Por planificar: elegir a cuáles se envía (marcar contactos «recibe
  avisos de pago»), copia a la empresa, plantilla del correo, adjuntos (constancia de retención,
  comprobante), servidor de correo por instalación (SMTP en la configuración, solo superacceso),
  bitácora de envíos y reintentos. Relacionado: el correo de usuarios es opcional (solo informes).

### Plazo de crédito del proveedor (2026-10-04)

- El usuario pidió que la **fecha de pago estimada** salga de lo configurado en el proveedor (días de
  crédito) y, si no tiene, a **un mes como máximo**. Hoy `terceros.proveedores` no tiene ese dato.
  Sirve para fechar las retenciones a pequeño contribuyente (L3) y para los vencimientos de CP1;
  pendiente de validar con el contador.

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
| Cheques posfechados | **Decidido (2026-09-29)** | Se permiten y cuentan en el saldo **en su fecha** (también los que emite Cuentas por pagar). |
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
| H5 | **Empresas** sin razón social, NIT obligatorio, régimen, fecha de inicio ni establecimientos | Libro de compras, retenciones y FEL los necesitan. Los **establecimientos** de la SAT (cada uno con su código) son justamente las **localidades** planificadas. | Agregar razón social, nombre comercial, NIT obligatorio (si hay módulos fiscales), régimen, fecha de inicio y **localidades = establecimientos SAT** (con su código). **H5a hecho** (razón social, nombre comercial, fecha de inicio y carga inicial en el esquema `empresas`); régimen y agentes de retención, en Libro de compras L1; localidades, en H5b/H5c. | Media |
| H6 | **Cheques en circulación viejos** | El banco no está obligado a pagar un cheque presentado **después de seis meses** de su fecha. Quedan como pendientes para siempre. | Reporte y alerta de cheques en circulación con más de 6 meses, para revisarlos y anularlos (con su inverso si el mes ya se concilió). | Media |
| H7 | **Comisiones bancarias** | *Corregido por el contador (2026-09-29):* los servicios de entidades fiscalizadas por la SIB están **exentos** de IVA (Ley del IVA art. 7.4): no hay crédito fiscal que perder. Sí traen IVA los seguros y los débitos automáticos de terceros. | La comisión se registra en Bancos; la FEL exenta del banco, opcional en Libro de compras como compra exenta. Las facturas con IVA pagadas por nota de débito se ligan por la **contraseña** de Cuentas por pagar. Sin destino «Bancos» ni tabla factura ↔ nota. | Baja |
| H8 | **Intereses con ISR retenido** | El banco acredita el interés **neto**; el 10 % de ISR sobre rentas de capital ya va retenido. Para contabilidad y el ISR anual hay que conocer el bruto y la retención. | En la nota de crédito por intereses, campos opcionales de **interés bruto** y **ISR retenido** (el neto es el monto). | Baja |
| H9 | Las notas **no tienen correlativo interno** | Práctica de control: cada comprobante (voucher) lleva número interno consecutivo para detectar faltantes. | Correlativo por empresa y tipo, asignado por el sistema (independiente de la referencia del banco). | Baja |
| H10 | **Proveedores sin NIT** o con «CF» | En el Libro de compras cada factura necesita el NIT del emisor; a quien no tiene NIT se le hace factura especial. | Exigir NIT (distinto de CF) al usar un proveedor en Libro de compras. Manda el del DTE: si no coincide con el del proveedor, **se rechaza** (decidido). | Baja |
| H11 | **Crédito fiscal fuera de plazo** | El crédito fiscal se puede reportar a más tardar en los **dos meses siguientes** al período de la factura. | En Libro de compras: guardar el **mes del libro**; fuera de plazo **se registra con aviso** y el IVA va al costo, a una cuenta **configurable por empresa** (validado con ajustes por el contador). Estado «declarado» opcional por empresa, apagado por omisión. | Media (plan) |

Plan de base de datos, opciones, recomendaciones y preguntas de cada hallazgo:
[`docs/modulos/plan-hallazgos-contables.md`](modulos/plan-hallazgos-contables.md).

### Libro de compras y Cuentas por pagar (planificados): corregido en el plan

Resuelto el 2026-09-29 con `docs/modulos/validacion-h7-h11-retenciones.md` y las
respuestas del usuario; ya está en `libro-de-compras.md` y `cuentas-por-pagar.md`.

1. **Momento de la retención**: lo que decía este punto («nace al autorizar») era
   **incorrecto**. Las retenciones se calculan y **fijan al registrar** la factura en
   Libro de compras: ISR con la **fecha de la factura**, IVA con la de **recepción**
   y el 5 % a pequeño contribuyente **al autorizar o pagar** (lo primero). Cuentas por
   pagar solo las descuenta. El mínimo del 5 %: solo facturas **mayores a Q2,500.00**
   (art. 49 del AG 5-2013; ver `validacion-h7-h11-retenciones.md`).
2. **Contraseña de pago**: **confirmado**. Puede incluir facturas sin autorizar; solo
   se **paga** lo autorizado. También liga las facturas con las notas de débito que
   las pagaron (H7).
3. **Período del crédito fiscal**: plazo de dos meses después del de emisión (Ley del
   IVA art. 20); se guarda el **período** y, si no da crédito, el **motivo**. Ver H11.
4. **Pagos parciales con retención**: la retención se descuenta una sola vez, en el
   **primer pago**.
5. **Notas de crédito del proveedor**: **confirmado**, rebajan el crédito del mes en
   que se reciben, sin los dos meses de gracia; si su factura no dio crédito, rebajan
   el costo.
6. **Casilla «Se muestra en reportes SAT»** (nueva, sí por omisión): desmarcada (recibo
   o documento no FEL), sin crédito fiscal ni retenciones; todo al costo, solo para el
   control de pagos.
7. **Activos fijos (P2)**: la línea de la factura dice si es activo fijo; su pago va a
   un concepto de Inversión en Bancos.

Quedan preguntas abiertas en la sección «Preguntas para el usuario» de cada plan.

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
