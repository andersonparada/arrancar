# Diseño de datos de Cuentas por pagar (CP1) — arquitecto de datos, 2026-10-20

Estado: **propuesta para aprobar**. Aterriza en tablas, reglas y pasos el CP1 de `cuentas-por-pagar.md` (con sus
«Respuestas del usuario (2026-09-29, tarde)», que mandan sobre el resto de ese documento), las notas recientes (la NDEB
como cargo, sin `fechar_retencion`, el plazo de crédito del 2026-10-04 y el aviso de pago por correo de
`HOJA-DE-RUTA.md`), la §3.2c, la §3.9 y la §7 de `diseno-datos-libro-de-compras.md`, los contratos de
`core/contratos/` y las decisiones de `validacion-h7-h11-retenciones.md`. Si algo de aquí choca con esos documentos,
mandan ellos; los huecos están en las preguntas del final.

## 1. Lo encontrado en el código y la base

1. **No existe nada del módulo**: ni esquema `cuentas_por_pagar`, ni carpeta, ni `modulo.ts`. Sí existe su contrato,
   `core/contratos/cuentas-por-pagar.contratos.ts`, con una sola orden: `cuentas-por-pagar.recibir_documento`
   (`DocumentoParaDestino`, respuesta `void`).
2. **Hoy Libro de compras no puede registrar nada de verdad**: exige un destino activo en la cuenta y ninguno está
   instalado (sus pruebas usan dobles). CP1 es lo que lo vuelve usable de punta a punta. En la base de desarrollo
   no hay documentos (consulta de solo lectura del 2026-10-20): **no hay datos que convertir**.
3. `DocumentoParaDestino` trae `documentoId`, `tipo` (las 9 familias, incluidas `nota_de_credito`, `nota_de_debito` y
   `recibo`), `proveedorId`, `documentoAfectadoId`, `fechaEmision`, `totalCentavos`, `retencionesCentavos` y
   `tieneActivoFijo`. No trae serie, número ni fecha de recepción: se leen de `libro_de_compras.documentos` con la
   llave (abajo).
4. **Orden de las cosas en Libro de compras** (`RegistrarDocumento.guardar`): inserta el documento, lo audita y
   **después** envía `<destino>.recibir_documento` en la misma transacción. Por eso la llave foránea de Cuentas por
   pagar hacia el documento siempre encuentra la fila.
5. **Bajas en Libro de compras**: `AnularDocumento` y `EliminarDocumento` bloquean el documento (`for update`), revisan
   sus reglas y el período, y **avisan al destino antes** de cambiar nada (`documento_por_anular` /
   `documento_por_eliminar`), salvo que la baja la pida el mismo destino (`origen`). Eliminar exige
   `procesado_en_destino_en is null`; anular, no. Las retenciones del documento **no cambian nunca** después de
   registrar (no hay «editar»; al anular quedan «por resolver» dentro de Libro de compras).
6. **Llaves útiles que ya existen** en `libro_de_compras.documentos`: `documentos_id_empresa_unico (id, empresa_id)` y
   `documentos_para_notas_unico (id, empresa_id, proveedor_id, destino)`. La segunda deja que Cuentas por pagar
   garantice en la base que su copia del proveedor y del destino es la del documento.
7. **Notas**: la nota de crédito no lleva retenciones y **no cambia** la retención de su factura (decisión del
   2026-09-29); la NDEB tampoco lleva retenciones hasta R3-5. La NDEB es un **cargo** con su propia fecha (§3.2c).
8. `terceros.proveedores` es de la **cuenta** (`politicaPorCuenta`, `unique (id, cuenta_id)`); la sección de un módulo
   en el formulario de Proveedores ya existe (aviso `terceros.proveedor_guardado`, que escucha Libro de compras) y en
   el cliente, `secciones` del `modulo.ts`.
9. `bancos` no depende de nadie (`dependeDe: []`) y ya tiene, de P6, `movimientos.modulo_de_origen` y
   `documento_de_origen_id` (sin llave), y el puerto `CuentasPorPagarActivo` con la clave `cuentas-por-pagar`.
10. `AccionAuditada` (solo un tipo de TypeScript; la tabla no tiene `check`) no tiene `autorizar`.
11. La prueba `llaves-entre-esquemas` acepta llaves hacia los módulos del `dependeDe` **directo o transitivo**.

## 2. Qué entra en CP1 y qué queda para después

| Paso del plan | Contenido | Dónde queda |
|---|---|---|
| **CP1 Bandeja y documentos** | Módulo, tablas, días de crédito en Proveedores, recibir **todos** los tipos (facturas, notas de crédito como abonos con su aplicación automática a la factura, NDEB como cargos), completar el vencimiento, autorizar con separación de funciones, anular y eliminar en los dos sentidos, saldo por documento y por proveedor (consulta, sin reporte) | **Este documento** |
| CP2 Notas de crédito | Lo que queda de las notas: su pantalla propia y aplicar el **saldo libre** de una nota a otra factura del mismo proveedor (fuera de una contraseña) | Recibirlas, autorizarlas y aplicarlas a su factura ya entra en CP1 (pregunta U2) |
| CP3 Contraseñas | Crear, imprimir y anular; documentos pendientes, registrados o autorizados | Después |
| CP4 Pagos | Extraer `Reversible`, órdenes a Bancos, aviso `movimiento_de_origen_anulado`, pagos con sus aplicaciones y la retención en el primer pago | Después (§7) |
| CP5 Reportes | Antigüedad, estado de cuenta, por vencer, pagos realizados y los de la hoja de ruta | Después |
| Saldos iniciales | Ventana de Administración con Excel, sus dos formas de pago extra | Después (§8, pregunta U8) |
| Aviso de pago por correo | Al pagar | Con CP4 o después; necesita SMTP por instalación (§7.4) |

**Por qué CP1 recibe ya las notas:** Libro de compras ya envía `nota_de_credito` y `nota_de_debito` a su destino. Si
CP1 las rechazara, nadie podría registrar una nota de una factura que va a Cuentas por pagar. Con una sola tabla
(§3.1) recibirlas, autorizarlas y anularlas es el mismo código que para la factura; lo único propio de la nota de
crédito, su aplicación, cabe en una tabla pequeña (§3.2).

## 3. Tablas (esquema `cuentas_por_pagar`)

Decisiones generales:

| Tema | Decisión | Por qué |
|---|---|---|
| Una tabla o varias | **Una**: `documentos`, con el `tipo` copiado de Libro de compras y la **clase** (cargo o abono) derivada del tipo | Bandeja, autorizar, anular, contraseña (CP3) y saldos tratan igual a los tres; la contraseña apunta a una sola tabla. El plan proponía `facturas` y `notas_de_credito` y dejaba abierto dónde va la NDEB (`cuentas-por-pagar.md`, CP1): con una tabla no hay que decidirlo. Es como lo hacen Odoo (`account.move` con `move_type`) y SAP B1 (documentos A/P con su clase) |
| Qué se copia | Solo lo del contrato (`DocumentoParaDestino`); serie, número, nombre del emisor y fecha de recepción se leen con un `join` a `libro_de_compras.documentos` | Lo copiado no cambia nunca en Libro de compras (no hay «editar»); lo de pantalla no hace falta duplicarlo |
| Saldos | **Derivados** (consulta), no guardados | Como el «total ajustado» de la §3.2c: guardarlo pide mantenerlo en cada alta y baja. Los índices de §3.1 bastan para la antigüedad. Se revisa en CP4 si los pagos lo vuelven lento (pregunta U4) |
| Empresa o cuenta | `documentos` y `aplicaciones_de_notas` **por empresa**; `condiciones_de_proveedor` **por cuenta** (pregunta U3) | Lo que se debe es de cada empresa; el proveedor es de la cuenta |
| Alcance por registro | Ninguno | El plan no lo pide |

### 3.1 `cuentas_por_pagar.documentos`

Un documento de Libro de compras con destino Cuentas por pagar. Nace en la orden `recibir_documento`.

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK (`idPrimario`). Propia: los saldos iniciales (§8) no tendrán documento en Libro de compras |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade (como Libro de compras) |
| `documento_id` | uuid | no | el de Libro de compras; FK compuesta abajo |
| `destino` | text | no | `default 'cuentas-por-pagar'`; check `documentos_destino_propio`: `destino = 'cuentas-por-pagar'`. Solo existe para la llave |
| `tipo` | text | no | check `documentos_tipo_valido`: las 9 familias de `TipoDeDocumentoDeCompra` |
| `proveedor_id` | uuid | no | copia; la llave compuesta la ata al documento |
| `documento_afectado_id` | uuid | sí | la factura (id de **Libro de compras**) de una nota; check `documentos_nota_con_factura`: `(tipo in ('nota_de_credito','nota_de_debito')) = (documento_afectado_id is not null)` |
| `fecha_emision` | date | no | copia |
| `total` | numeric(14,2) | no | check `> 0` |
| `retenciones` | numeric(14,2) | no | `default 0`; check `documentos_retenciones_validas`: `retenciones >= 0 and retenciones <= total`; check `documentos_nota_de_credito_sin_retenciones`: `tipo <> 'nota_de_credito' or retenciones = 0` |
| `tiene_activo_fijo` | boolean | no | copia; en CP4 elige el concepto de Inversión (P2) |
| `vencimiento` | date | sí | check `documentos_vencimiento_de_cargos`: `(tipo = 'nota_de_credito') = (vencimiento is null)`; check `documentos_vencimiento_desde_emision`: `vencimiento is null or vencimiento >= fecha_emision`. Se propone al recibir (§5) |
| `estado` | text | no | `default 'pendiente'`; check `documentos_estado_valido`: `in ('pendiente','registrado','autorizado','anulado')` |
| `registrado_en` | timestamptz | sí | al completar en la bandeja |
| `registrado_por` | uuid | sí | |
| `autorizado_en` | timestamptz | sí | |
| `autorizado_por` | uuid | sí | |
| `autorizacion_propia` | boolean | no | `default false`; `true` si quien autoriza también lo registró o lo ingresó (con `autorizar-propios`, §6) |
| `anulado_en` | timestamptz | sí | |
| `anulado_por` | uuid | sí | |
| `motivo_de_anulacion` | text | sí | 1–300 (el motivo que llega en el aviso o el que se escribe aquí) |
| `estaba_autorizado` | boolean | sí | al anular: si estaba provisionado (Contabilidad revierte solo esos); check `documentos_anulacion_completa` abajo |
| `...marcasDeTiempo`, `...autoria` | | | `creado_por` = quien registró en Libro de compras (es su transacción) |

Checks de estado (nombres `documentos_<regla>`):
- `registro_completo`: `(registrado_en is null) = (registrado_por is null)` **y**
  `estado not in ('registrado','autorizado') or registrado_en is not null`.
- `autorizacion_completa`: `(autorizado_en is null) = (autorizado_por is null)` **y**
  `estado <> 'autorizado' or autorizado_en is not null` **y** `autorizado_en is not null or not autorizacion_propia`.
- `separacion_de_funciones`: `autorizado_por is null or autorizacion_propia or (autorizado_por is distinct from
  registrado_por and autorizado_por is distinct from creado_por)`. La base no sabe si el usuario tenía el permiso;
  sí garantiza que la excepción quedó marcada.
- `anulacion_completa`: `(estado = 'anulado') = (anulado_en is not null and anulado_por is not null and
  motivo_de_anulacion is not null and estaba_autorizado is not null)`.

Llaves:

| Nombre | Definición | Para |
|---|---|---|
| `documentos_documento_fk` | `(documento_id, empresa_id, proveedor_id, destino) → libro_de_compras.documentos (id, empresa_id, proveedor_id, destino)` (`documentos_para_notas_unico`), **no action** | El documento es de la misma empresa, del mismo proveedor y va a este destino; Libro de compras no puede borrarlo mientras exista aquí (por eso, al eliminar, el aviso borra primero esta fila) |
| `documentos_factura_fk` | `(documento_afectado_id, empresa_id, proveedor_id) → cuentas_por_pagar.documentos (documento_id, empresa_id, proveedor_id)`, MATCH SIMPLE, no action | La factura de la nota también está aquí y es del mismo proveedor (Libro de compras ya garantiza el mismo destino) |

Únicos e índices:

| Nombre | Definición | Para |
|---|---|---|
| `documentos_documento_unico` | unique `(documento_id)` | Un documento entra una sola vez (también cubre la llave hacia Libro de compras) |
| `documentos_para_notas_unico` | unique `(documento_id, empresa_id, proveedor_id)` | Destino de `documentos_factura_fk` |
| `documentos_id_proveedor_unico` | unique `(id, empresa_id, proveedor_id)` | Destino de las llaves de `aplicaciones_de_notas` (y de la contraseña en CP3) |
| `documentos_afectado_idx` | `(documento_afectado_id) where documento_afectado_id is not null` | Llave de la nota y «notas de esta factura» |
| `documentos_bandeja_idx` | `(empresa_id, creado_en) where estado = 'pendiente'` | Bandeja |
| `documentos_estado_idx` | `(empresa_id, estado, fecha_emision)` | Lista con filtros |
| `documentos_proveedor_vencimiento_idx` | `(empresa_id, proveedor_id, vencimiento) where estado <> 'anulado'` | Saldo por proveedor y antigüedad (CP5) |
| `documentos_vencimiento_idx` | `(empresa_id, vencimiento) where estado <> 'anulado' and vencimiento is not null` | Por vencer y vencidas |
| `documentos_proveedor_idx` | `(proveedor_id)` | Búsqueda por proveedor sin empresa (no hace falta para la llave, que empieza por `documento_id`) — **opcional**, se agrega solo si una consulta lo usa |

RLS: `politicaPorEmpresa()`. Sin alcance.

Mensajes (`MENSAJES_POR_RESTRICCION`): `documentos_documento_unico` → «Ese documento ya está en Cuentas por pagar.»
(error de programación si ocurre: la orden llega una vez por registro); `documentos_documento_fk` al borrar desde Libro
de compras → «El documento está en Cuentas por pagar: dé la baja desde allí o active el módulo.» (ver pregunta U6).

**Estados:**

```
recibir ─▶ pendiente ──completar──▶ registrado ──autorizar──▶ autorizado
               │                        │                         │
               └──────── anular (desde aquí o desde Libro de compras) ───▶ anulado
               └──── eliminar (solo pendiente o registrado) ──▶ la fila se borra
```

«Pagado» y «pagado en parte» no son estados: salen del saldo (CP4). Una nota de crédito sigue los mismos estados (sin
vencimiento). La pregunta U5 propone además **desautorizar** (autorizado → registrado).

### 3.2 `cuentas_por_pagar.aplicaciones_de_notas`

Cuánto de cada nota de crédito rebaja cada cargo. Una nota sin aplicar del todo tiene **saldo libre** (a favor de la
empresa). En CP4 los pagos tendrán su propia tabla de aplicaciones (`pago_aplicaciones`), con la misma forma.

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK `core.empresas` cascade |
| `proveedor_id` | uuid | no | solo para las llaves (garantiza el mismo proveedor) |
| `nota_id` | uuid | no | FK `(nota_id, empresa_id, proveedor_id) → documentos (id, empresa_id, proveedor_id)` **on delete cascade** (si la nota se elimina, su aplicación se va con ella; la auditoría de la nota la lleva, §4.5) |
| `cargo_id` | uuid | no | FK `(cargo_id, empresa_id, proveedor_id) → documentos (id, empresa_id, proveedor_id)` no action; check `aplicaciones_distintos`: `nota_id <> cargo_id` |
| `monto` | numeric(14,2) | no | check `> 0` |
| `...marcasDeTiempo`, `...autoria` | | | |

Únicos e índices: unique `aplicaciones_nota_cargo_unico (nota_id, cargo_id)` (cubre la llave de la nota);
`aplicaciones_cargo_idx (cargo_id)`. RLS: `politicaPorEmpresa()`.

**Lo que revisa el dominio y no la base** (son otras filas; se hace con la fila del cargo y la de la nota bloqueadas
`for update`): que `nota_id` sea una nota de crédito vigente y `cargo_id` un cargo vigente; que Σ aplicaciones de una
nota `<=` su total; que Σ aplicaciones de un cargo (más sus pagos, en CP4) `<=` su neto. Garantizarlo en la base
pediría la clase como columna en la llave (lo que R3-g ya descartó) o disparadores; se cubre con pruebas de
integración y con una prueba de consistencia (§9).

### 3.3 `cuentas_por_pagar.condiciones_de_proveedor`

Los días de crédito de cada proveedor (decisión del usuario del 2026-09-29: en el esquema de Cuentas por pagar, con
llave al proveedor).

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `cuenta_id` | uuid | no | `default` cuenta de la transacción (`deLaTransaccion.cuenta()`); FK `core.cuentas` cascade |
| `proveedor_id` | uuid | no | FK `(proveedor_id, cuenta_id) → terceros.proveedores (id, cuenta_id)` **on delete cascade** (es un dato del papel; si el tercero se borra, se va) |
| `dias_de_credito` | smallint | sí | check `between 0 and 365`; `null` = el plazo por omisión (un mes); `0` = contado |
| `...marcasDeTiempo`, `...autoria` | | | |

Únicos: `condiciones_proveedor_unico (proveedor_id)` (cubre la llave). RLS: `politicaPorCuenta()`. Nunca se borra
una fila: dejar el campo vacío guarda `null`.

Es un nombre más amplio que «días de crédito» a propósito: si después se pide el límite de crédito o el descuento por
pronto pago (fuera de esta versión), van aquí.

## 4. Cómo recibe y sigue a los documentos de Libro de compras

Todo corre por el mediador **dentro de la transacción de Libro de compras** (ARQUITECTURA §4.8): el manejador de
Cuentas por pagar abre su `UnidadDeTrabajo`, que se une a la transacción en curso (misma empresa). Si lanza, no se
registra ni se da de baja nada.

**Orden de bloqueo (para no tener interbloqueos):** siempre **primero la fila de Libro de compras y después la de
Cuentas por pagar**. Libro de compras ya lo hace así (bloquea su documento y luego avisa). Las acciones que nacen aquí
(autorizar, anular, eliminar) mandan **primero** su orden a Libro de compras y **después** bloquean y cambian su fila,
revisando de nuevo sus reglas con la fila bloqueada.

### 4.1 `cuentas-por-pagar.recibir_documento`

Caso de uso `RecibirDocumento` (lo atiende `mediador.atender('cuentas-por-pagar', 'cuentas-por-pagar.recibir_documento', …)`):

1. Si ya existe una fila con ese `documento_id`, error de programación (`DocumentoYaRecibido`); no se ignora en
   silencio.
2. Vencimiento (solo cargos): `fecha_emision + días de crédito` del proveedor; sin fila o con `null`, **un mes**
   (§5).
3. Inserta en `estado = 'pendiente'` con la copia del contrato (centavos → `numeric`).
4. **Nota de crédito**: bloquea (`for update`) su factura en Cuentas por pagar y la aplica sola (§4.3).
5. **NDEB**: entra como un cargo más, **pendiente nuevo**, con su vencimiento contado desde **su** fecha de emisión;
   no se mezcla con su factura (si la factura ya se pagó, la NDEB va a otra contraseña, como dice el plan). Su
   `documento_afectado_id` solo la liga para la ficha y el estado de cuenta.
6. Sin auditoría (es un alta) y sin `marcar_procesado` (el documento sigue «pendiente en el destino»: Libro de compras
   lo puede eliminar).

`recibo` y `factura_especial` son cargos como cualquier factura (la factura especial trae todo el IVA y el ISR
retenidos en `retenciones`; el recibo, cero).

### 4.2 Saldo por documento y por proveedor (derivado)

| Qué | Fórmula (solo documentos no anulados) |
|---|---|
| **Neto** de un cargo | `total − retenciones` (lo que se le paga al proveedor; las retenciones son de la SAT) |
| **Aplicado** a un cargo | Σ `aplicaciones_de_notas.monto` del cargo (+ Σ pagos vigentes en CP4) |
| **Saldo** de un cargo | `neto − aplicado` (nunca negativo: lo cuida la aplicación) |
| **Saldo libre** de una nota de crédito | `total − Σ sus aplicaciones` |
| **Saldo del proveedor** en la empresa | Σ saldos de sus cargos − Σ saldos libres de sus notas |

Es la fórmula del plan reescrita por documento: **facturas + notas de débito − notas de crédito − retenciones −
pagos**. Las retenciones se restan siempre del neto; que se «descuenten en el primer pago» es una regla de cómo se
reparte cada pago en CP4 (`pago_aplicaciones.retencion_descontada`), no del saldo.

La lista y la ficha traen, por documento, `neto`, `aplicado` y `saldo` (texto, como todo dinero en la API) y, en la
ficha de la factura, sus notas (crédito y débito) con lo aplicado. El saldo del proveedor sale con una consulta
agregada (`consultas-de-saldos.drizzle.ts`) que usa `documentos_proveedor_vencimiento_idx`; la sección «Cuentas por
pagar» de la ficha del proveedor lo muestra para la empresa activa (paso CP1-9).

### 4.3 Aplicación automática de la nota de crédito

Al recibir una nota de crédito, con su factura bloqueada:

1. Aplica a **su factura** hasta el saldo de la factura.
2. Si sobra, aplica a las **NDEB vigentes de esa misma factura**, de la más antigua a la más nueva, hasta su saldo.
3. Lo que sobre queda como **saldo libre** de la nota (CP2 y CP3 lo aplican a otras facturas del proveedor).

Sobra en dos casos reales: la factura tenía retenciones (una devolución total deja libre lo retenido: el proveedor
debe eso a la empresa, porque la retención ya se le acreditó; pregunta C1) o la nota se apoya en NDEB (Libro de
compras permite notas de crédito hasta la factura **más** sus NDEB).

La nota se aplica **aunque esté pendiente de autorizar**: rebaja lo que se debe desde que se recibe, como rebaja el
crédito fiscal desde que se registra. Autorizarla solo provisiona (pregunta U7).

### 4.4 Respuesta a `libro-de-compras.documento_por_anular`

Manejador `mediador.escuchar('cuentas-por-pagar', 'libro-de-compras.documento_por_anular', …)`; ignora los avisos con
otro `destino`. Es **idempotente**: si no hay fila o ya está anulada, no hace nada.

1. Bloquea su fila (`for update`).
2. **Reglas que pueden rechazar** (lanzan su error y Libro de compras no anula nada), en una lista que crece con cada
   paso (patrón Chain of Responsibility, o una función por regla):
   - CP1: una nota de crédito con aplicaciones a cargos que **ya tienen pagos** (CP4) — no aplica todavía.
   - CP1: un **cargo con notas de crédito aplicadas**: no ocurre (Libro de compras no anula una factura con notas
     vigentes), pero se revisa igual (`CargoConNotasAplicadas`).
   - CP3: el documento está en una contraseña vigente (`DocumentoEnContrasena`).
   - CP4: el cargo tiene pagos vigentes (`DocumentoConPagos`).
3. Si es nota de crédito, **borra sus aplicaciones** (lo aplicado vuelve al saldo de sus cargos). Si es una NDEB con
   aplicaciones de notas, también las borra: lo aplicado vuelve al saldo libre de esas notas.
4. `estado = 'anulado'`, `anulado_en/por`, `motivo_de_anulacion` = el del aviso, `estaba_autorizado` = si estaba
   `autorizado`.
5. Auditoría `anular`, recurso `cuentas-por-pagar.documentos`, con el DTO de la ficha **como estaba** (incluidas sus
   aplicaciones) y el motivo. (Libro de compras audita aparte lo suyo.)
6. Después de confirmar, evento `cuentas-por-pagar.documento_anulado` (§6.3); si `estaba_autorizado`, Contabilidad
   revierte la provisión.

### 4.5 Respuesta a `libro-de-compras.documento_por_eliminar`

Igual de idempotente. Libro de compras solo lo manda si el documento está **sin procesar** (aquí: no autorizado).

1. Bloquea su fila; rechaza si está `autorizado` (no debería pasar: lo cuida `procesado_en_destino_en`; error
   `DocumentoAutorizado`), en una contraseña (CP3) o con aplicaciones de **pagos** (CP4).
2. Una factura con notas aplicadas no llega aquí (Libro de compras no elimina con notas). Una nota de crédito: sus
   aplicaciones se borran en cascada con ella.
3. Auditoría `eliminar` con el DTO como estaba (con sus aplicaciones).
4. `delete` de su fila. Después, Libro de compras borra la suya (la llave `documentos_documento_fk` ya no lo frena).

Sin evento de Cuentas por pagar: Libro de compras ya publica `documento_eliminado`, y un documento no autorizado no
tiene provisión que revertir.

### 4.6 Cuándo manda `libro-de-compras.marcar_procesado`

| Momento | Orden | Por qué |
|---|---|---|
| **Autorizar** | `marcar_procesado { procesado: true }` | Desde aquí el documento está provisionado: Libro de compras ya no lo deja eliminar, solo anular (coincide con «eliminar solo si no está autorizada» del plan) |
| Desautorizar (si se aprueba U5) | `marcar_procesado { procesado: false }` | Vuelve a ser eliminable |
| Completar, cambiar vencimiento, entrar en contraseña (CP3) | Ninguna | La contraseña protege por su cuenta: el aviso de baja la rechaza mientras esté vigente |

### 4.7 Bajas que nacen aquí

| Acción | Permiso | Qué hace, en una transacción |
|---|---|---|
| **Anular** (`POST /cuentas-por-pagar/documentos/:id/anular { causa, motivo }`) | `cuentas-por-pagar.documentos.anular` | Revisa sus reglas sin bloquear (para un mensaje temprano); manda `libro-de-compras.anular_documento { documentoId, causa, motivo, origen: 'cuentas-por-pagar' }` (Libro de compras bloquea, revisa período, notas y retenciones, y **no** le devuelve el aviso); bloquea su fila, revisa de nuevo y hace lo mismo que §4.4 pasos 3 a 6. Responde con los avisos de Libro de compras (período declarado, retenciones por resolver) |
| **Eliminar** (`DELETE /cuentas-por-pagar/documentos/:id`) | `cuentas-por-pagar.documentos.eliminar` | Solo `pendiente` o `registrado`. Bloquea su fila, revisa, audita, borra su fila y **después** manda `libro-de-compras.eliminar_documento { documentoId, origen }` (al revés que anular: la llave obliga a borrar primero aquí). Libro de compras revisa sus reglas; si rechaza, se deshace todo |

En eliminar el orden de bloqueo se invierte (Cuentas por pagar primero) porque la llave lo exige. Para no cruzarse con
un `anular` desde Libro de compras sobre el mismo documento, eliminar **lee primero el documento de Libro de compras
`for update`** por su tabla (lectura permitida desde `infraestructura`, solo para bloquear) y luego el suyo. Así el
orden sigue siendo «Libro de compras, luego Cuentas por pagar».

La pantalla de anular explica, como en Libro de compras, que se anula **el registro**, no la FEL, y ofrece eliminar
cuando todavía se puede.

## 5. Vencimientos y días de crédito

| Tema | Decisión propuesta |
|---|---|
| Dónde | `cuentas_por_pagar.condiciones_de_proveedor` (§3.3). **No se toca Libro de compras** ni `terceros.proveedores` |
| Nivel | Por **cuenta** (como el proveedor y su formulario; pregunta U3) |
| Cómo se edita | Sección «Cuentas por pagar» del formulario de Proveedores, visible solo con el módulo activo: el cuerpo trae `secciones: { 'cuentas-por-pagar': { diasDeCredito: number \| null } }`; el módulo escucha `terceros.proveedor_guardado`, valida con su Zod (entero 0–365 o `null`) y hace *upsert*; un error va como `DatoInvalido` con `detalles` en `secciones.cuentas-por-pagar.diasDeCredito`. Permiso: el del formulario (`proveedores.crear` / `proveedores.editar`) |
| Cómo se lee | `GET /api/cuentas-por-pagar/proveedores/:proveedorId/condiciones` (permiso `terceros.ver`, como la sección de Libro de compras), para el formulario y la ficha |
| Sin dato | **Un mes calendario** desde la fecha de emisión (decisión del usuario del 2026-10-04: «a un mes como máximo»). El día se ajusta al fin de mes: 31-ene → 28 o 29-feb. Variable `cuentas-por-pagar.vencimientos.meses_por_omision` (entero 0–12, por omisión 1, niveles `instalacion` y `empresa`, no pública) por si una empresa quiere otro plazo (pregunta U1) |
| Desde qué fecha | **Fecha de emisión** de la factura (la práctica y lo que trae el contrato; pregunta U1) |
| Cuándo se calcula | Al **recibir** (queda guardado y la antigüedad funciona desde la bandeja); al completar, la pantalla propone el guardado y se puede cambiar |
| Cambiar después | Con `cuentas-por-pagar.documentos.registrar`, en `registrado` o `autorizado`, hasta que el documento esté pagado del todo (CP4). No se audita (no es dinero ni baja; queda `actualizado_por`) |
| Retenciones | Los días de crédito **no** fechan nada fiscal: el 5 % a pequeño contribuyente lleva la fecha de recepción (2026-10-04) |

Una NDEB vence con su propia fecha más los días del proveedor. Una nota de crédito no vence.

## 6. Autorización, permisos y eventos de CP1

### 6.1 Completar y autorizar

| Acción | Ruta | Regla |
|---|---|---|
| **Completar** uno o varios (máx. 100) | `POST /cuentas-por-pagar/documentos/registrar { documentos: [{ id, vencimiento }] }` | `pendiente` → `registrado`; fija `registrado_en/por` y el vencimiento (cargos). Todo o nada |
| **Autorizar** uno o varios (máx. 100) | `POST /cuentas-por-pagar/documentos/autorizar { ids }` | `registrado` → `autorizado`. Por cada uno: `marcar_procesado(true)` (bloquea en Libro de compras), luego bloquea su fila y revisa. **Separación de funciones**: si el usuario es `registrado_por` o `creado_por` (quien lo ingresó en Libro de compras), necesita `cuentas-por-pagar.documentos.autorizar-propios`; si lo tiene, `autorizacion_propia = true` y se audita (pregunta U9). Si no, error `AutorizacionDeLoPropio` (403, `ReglaDeNegocioInfringida`) que nombra el documento. Todo o nada |
| Cambiar vencimiento | `PATCH /cuentas-por-pagar/documentos/:id { vencimiento }` | §5 |

**«Salvo el Propietario y el superacceso»** del plan se resuelve con el permiso `autorizar-propios`: PLAN §3.5 prohíbe
reglas por tipo de rol, y un rol con acceso total ya recibe todos los permisos asignables (el Propietario de una
empresa de una sola persona lo tiene). El superacceso tiene todos.

Autorizar **no** recalcula ni fecha retenciones (ya vienen fijadas). Con Contabilidad activa, el evento de §6.3 le
da lo necesario para la partida de provisión; sin ella, solo cambia el estado.

### 6.2 Permisos (PLAN §3.5)

Un solo recurso, `documentos` (lo que el plan llamaba `facturas` y `notas-de-credito`):

| Permiso | Para |
|---|---|
| `cuentas-por-pagar.documentos.ver` | Bandeja, lista, ficha y saldo del proveedor |
| `cuentas-por-pagar.documentos.registrar` | Completar en la bandeja y cambiar el vencimiento |
| `cuentas-por-pagar.documentos.autorizar` | Autorizar (y desautorizar, si se aprueba U5) |
| `cuentas-por-pagar.documentos.autorizar-propios` | Autorizar lo que uno mismo ingresó o completó |
| `cuentas-por-pagar.documentos.anular` | Anular (anula también el registro en Libro de compras, sin pedir su permiso: §4.8) |
| `cuentas-por-pagar.documentos.eliminar` | Eliminar (también en Libro de compras) |

No hay `crear` (los documentos llegan de Libro de compras), ni `importar`/`exportar` (Bandeja y Documentos son de
**Operación**: sin Excel). Los días de crédito usan los permisos de Proveedores. CP3 suma `contrasenas.*`, CP4
`pagos.*` y CP5 `reportes.*` (o uno por reporte, como el análisis de compras). Sin migración de permisos: son nuevos.

### 6.3 Contratos (`core/contratos/cuentas-por-pagar.contratos.ts`)

Se agregan, junto a la orden que ya está:

```ts
declare module '../eventos/bus-eventos.js' {
  interface EventosDominio {
    'cuentas-por-pagar.documento_autorizado': {
      empresaId: string; documentoId: string; documentoDeCompraId: string;
      tipo: TipoDeDocumentoDeCompra; proveedorId: string; totalCentavos: number; retencionesCentavos: number;
    };
    'cuentas-por-pagar.documento_anulado': {
      empresaId: string; documentoId: string; documentoDeCompraId: string; estabaAutorizado: boolean;
    };
  }
}
```

(Más `documento_desautorizado` si se aprueba U5.) Sin órdenes nuevas que atienda este módulo en CP1. Escucha los dos
avisos de Libro de compras y `terceros.proveedor_guardado`.

### 6.4 Auditoría

| Hecho | Acción | Recurso | `anterior` |
|---|---|---|---|
| Anular (desde aquí o por aviso) | `anular` | `cuentas-por-pagar.documentos` | Ficha con aplicaciones; con motivo |
| Eliminar (desde aquí o por aviso) | `eliminar` | igual | Ficha con aplicaciones |
| Autorizar lo propio | `autorizar` (**nueva** en `AccionAuditada`; pregunta U9) | igual | Ficha antes de autorizar; motivo «autorizó un documento que ingresó o completó» |
| Desautorizar (U5) | `devolver` (ya existe) | igual | Ficha; con motivo obligatorio |
| Borrar aplicaciones al anular una nota | Va dentro del `anterior` de la nota | — | — |

## 7. Pagos y Bancos (no entran en CP1)

Se deja escrito para que CP1 no cierre puertas.

1. **Sin importar entre módulos.** Cuentas por pagar declara puertos en `aplicacion/puertos/` y los implementa con el
   mediador. Bancos atiende órdenes nuevas en `core/contratos/bancos.contratos.ts`:
   `bancos.emitir_cheque`, `bancos.registrar_nota_de_debito` (transferencia o débito) y
   `bancos.anular_movimiento_de_origen`, todas con `{ origen: { modulo: 'cuentas-por-pagar', documentoId: <pago> },
   concepto, beneficiario }`; y avisa `bancos.movimiento_de_origen_anulado` dentro de su transacción, que Cuentas por
   pagar escucha para anular el pago (o rechazar). `documento_de_origen_id` de Bancos no lleva llave (PLAN §3.2);
   `cuentas_por_pagar.pagos.movimiento_id` **sí** puede llevarla hacia `bancos.movimientos`, porque Bancos está en el
   `dependeDe` (abajo).
2. **Separación de funciones**: tres permisos distintos (`documentos.registrar`, `documentos.autorizar`,
   `pagos.emitir`); el de pagar basta para crear el cheque o la nota en Bancos (decisión del plan). Si Bancos, segunda
   parte, agrega la **aprobación** de cheques y transferencias, la orden de Cuentas por pagar dejará el movimiento
   «por aprobar» igual que uno manual (se decide allí).
3. **`dependeDe: ['libro-de-compras', 'bancos']`** desde CP1, como dice el plan (pregunta U10): así las llaves de
   CP4 hacia `bancos` pasan la prueba y activar el módulo ya exige lo que necesitará. `terceros` llega por Libro de
   compras (la prueba acepta dependencias transitivas).
4. **Aviso de pago por correo** (2026-10-04): después de CP4, como paso propio (CP7). Necesita SMTP por instalación
   (`soloSuperacceso`), marcar contactos «recibe avisos de pago» en Terceros (sección de este módulo o columna de
   Terceros, por decidir), bitácora de envíos con reintentos (`cuentas_por_pagar.avisos_de_pago`) y adjuntos. CP1 no
   necesita nada de esto.

## 8. Saldos iniciales

El plan de CP1 **no** los incluye; la hoja de ruta los pide como agregado (factura por factura, de la carga inicial de
la empresa, sin pasar por el Libro de compras del período, con dos formas de pago extra que necesitan CP4). Lo que este
diseño deja listo:

- `documentos.id` es propio y `documento_id` es solo único (no la llave primaria): un saldo inicial podrá ser una fila
  **sin** documento de Libro de compras.
- Su paso agregará, en una migración propia: `origen text not null default 'libro_de_compras'` (check
  `in ('libro_de_compras','saldo_inicial')`), `documento_id` nulable con check `(origen = 'libro_de_compras') =
  (documento_id is not null)`, y las columnas que hoy se leen de Libro de compras (`serie`, `numero`), con check de que
  solo las lleva el saldo inicial. Las consultas pasan a `coalesce` entre las dos fuentes.
- Pregunta U8: cuándo. Recomendación: la **carga** (alta, edición, eliminación, Excel, ligada a la carga inicial
  abierta de Empresas) justo después de CP1, porque una empresa que empieza no puede usar el módulo sin sus facturas
  pendientes; las dos formas de pago extra, con CP4.

## 9. Migraciones, registro del módulo y pruebas

**Generar el módulo:** `npm run generar -- modulo cuentas-por-pagar --nombre "Cuentas por pagar" --descripcion "Lo que
cada empresa debe a sus proveedores: documentos, vencimientos, autorización, contraseñas y pagos" --icono
HandCoins` (el icono es una propuesta). Crea `servidor/src/modulos/cuentas-por-pagar/` con `modulo.ts`,
`infraestructura/persistencia/esquema.tablas.ts` (`pgSchema('cuentas_por_pagar')`), su `0000_esquema.sql` y la entrada
en `modulos/indice.ts` (después de `moduloLibroDeCompras`). A mano: `dependeDe: ['libro-de-compras', 'bancos']`,
permisos de §6.2 y `configuracion` (§5).

**Migraciones** (`modulos/cuentas-por-pagar/migraciones`, con `npm run bd:generar -w servidor -- cuentas-por-pagar
<nombre>`; el migrador da los `grant`):

| Migración | Contenido | Tipo |
|---|---|---|
| `0000_esquema` | `create schema` (la crea el generador) | generada |
| `0001_cp1_documentos` | `documentos`, `aplicaciones_de_notas`, `condiciones_de_proveedor`, con checks, únicos, índices, llaves (incluidas las que van a `libro_de_compras` y `terceros`) y RLS | generada y revisada a mano (las llaves compuestas entre esquemas, como en Libro de compras `0007`, pueden pedir `--custom` si drizzle-kit no las escribe) |

Sin datos que convertir; sin migración de permisos; ninguna migración de otros esquemas. Si se aprueba U6 (bajas con
destino inactivo), el cambio en Libro de compras es solo de código.

**Pruebas de integración (PostgreSQL real, `arrancar_pruebas`):**

- *Tablas:* checks de cada regla de §3.1 (nota de crédito con vencimiento o con retenciones, factura sin vencimiento,
  vencimiento anterior a la emisión, `autorizado` sin `registrado`, autorizado por quien registró sin
  `autorizacion_propia`, anulación incompleta); llave hacia Libro de compras con otro proveedor u otro destino
  (falla); nota cuya factura no está en Cuentas por pagar (falla); aplicación entre proveedores distintos (falla);
  RLS por empresa en `documentos` y `aplicaciones_de_notas`, por cuenta en `condiciones_de_proveedor`.
- *Recibir (API de Libro de compras con el módulo activo, `app.inject`):* factura → fila `pendiente` con vencimiento
  de un mes y con los días del proveedor; factura especial con sus retenciones; recibo; NDEB como cargo propio; nota
  de crédito aplicada a su factura, con sobrante por retenciones y con sobrante que pasa a la NDEB; si el manejador
  falla, Libro de compras no guarda nada.
- *Bajas desde Libro de compras:* anular factura autorizada (queda anulada, `estaba_autorizado`, auditoría, evento);
  anular nota de crédito (sus aplicaciones se borran, el saldo de la factura vuelve); eliminar pendiente (las dos
  filas se van, auditoría en los dos módulos); eliminar autorizada (rechazada por Libro de compras); avisos repetidos
  (idempotente).
- *Bajas desde Cuentas por pagar:* anular con `origen` (Libro de compras no devuelve el aviso), en período declarado
  (rechazo y nada cambia); eliminar pendiente; eliminar autorizado (rechazo).
- *Autorizar:* separación de funciones (quien ingresó, quien completó, otro usuario, con `autorizar-propios`);
  `procesado_en_destino_en` lleno; en lote todo o nada; evento.
- *Días de crédito:* sección en el formulario de Proveedores (guardar, vaciar, valor inválido con el error en su
  campo, módulo inactivo: la sección se ignora).
- *Consistencia:* una prueba que, tras una serie de altas y bajas, compara el saldo de cada documento con lo que
  sale de recalcular desde Libro de compras (total, retenciones, notas vigentes), y que la copia de cada fila
  coincide con su documento.
- `politicas-de-los-modulos` y `llaves-entre-esquemas` siguen pasando.

**Pruebas puras:** propuesta de vencimiento (fin de mes, 0 días, año bisiesto), aplicación automática (los tres
casos de §4.3), reglas de baja, separación de funciones.

## 10. Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`.

1. **CP1-1 (servidor, módulo y datos):** generar el módulo; `dependeDe`, permisos y configuración; tablas de §3 con
   migración `0001`; mensajes de restricciones; pruebas de tablas y RLS.
2. **CP1-2 (servidor, recibir):** `RecibirDocumento` con propuesta de vencimiento y aplicación automática; manejador
   de la orden; pruebas puras y de API a través de Libro de compras.
3. **CP1-3 (servidor, bajas por aviso):** manejadores de `documento_por_anular` y `documento_por_eliminar`, reglas de
   baja ampliables, auditoría, evento `documento_anulado`; pruebas.
4. **CP1-4 (servidor, días de crédito):** escucha de `terceros.proveedor_guardado`, ruta de lectura; pruebas.
5. **CP1-5 (servidor, consultas):** bandeja, lista con filtros (proveedor, estado, tipo, fechas, vencidas), ficha con
   notas y aplicaciones, saldo del proveedor; DTO con `puedeAutorizar`, `puedeAnular`, `puedeEliminar` calculados en
   el servidor (como Bancos); pruebas.
6. **CP1-6 (servidor, completar y autorizar):** completar en lote, cambiar vencimiento, autorizar en lote con
   separación de funciones y `marcar_procesado`, evento, auditoría de lo propio (y desautorizar si se aprueba U5);
   pruebas.
7. **CP1-7 (servidor, bajas desde aquí):** anular y eliminar con las órdenes a Libro de compras y el orden de
   bloqueo de §4.7; pruebas (y, si se aprueba U6, el guardia de destino inactivo en Libro de compras).
8. **CP1-8 (cliente, módulo y días de crédito):** `cliente/src/modulos/cuentas-por-pagar/` (textos, menú, servicio),
   sección «Cuentas por pagar» en el formulario de Proveedores (días de crédito, con la ayuda «vacío = un mes») y en
   la ficha (días y saldo con la empresa activa).
9. **CP1-9 (cliente, bandeja):** página de Operación «Bandeja de cuentas por pagar»: documentos pendientes con el
   vencimiento propuesto editable, selección y «Completar», enlace a la ficha del documento en Libro de compras.
10. **CP1-10 (cliente, documentos):** página de Operación «Documentos por pagar»: lista con filtros y saldos,
    selección y «Autorizar» (con el mensaje de lo propio), ficha con notas, aplicaciones, saldo, cambiar vencimiento,
    anular (registro, no FEL) y eliminar.
11. **CP1-11 (QA):** de punta a punta: proveedor con 15 días, factura con retención, NDEB, nota de crédito que sobra,
    completar, autorizar con otro usuario y con el mismo (rechazo y excepción), anular desde Libro de compras y desde
    Cuentas por pagar, eliminar pendiente, período declarado.

## 11. Preguntas para el usuario (con recomendación)

- **U1. Vencimiento por omisión y fecha base.** Sin días de crédito: ¿un mes **calendario** (recomendado) o 30 días? ¿Se
  cuenta desde la **fecha de emisión** (recomendado; es lo usual y lo que trae el documento) o desde la de recepción?
  ¿Se deja la variable por empresa `meses_por_omision` (recomendado: cuesta poco y deja poner 0 = contado)?
- **U2. Notas en CP1.** ¿Recibir, autorizar y anular notas de crédito y NDEB ya en CP1 (recomendado: Libro de compras ya
  las envía y es el mismo código), y dejar para CP2 solo aplicar el saldo libre de una nota a otra factura?
- **U3. Días de crédito por cuenta o por empresa.** El proveedor y su formulario son de la cuenta. Recomendado: **por
  cuenta** (un valor para todas las empresas); si una empresa negocia otro plazo, se cambia el vencimiento al completar.
  Alternativa: por empresa (la sección mostraría el de la empresa activa, lo que confunde en un formulario de cuenta).
- **U4. Saldos guardados o calculados.** Recomendado: **calculados** en CP1 y revisarlo en CP4 con datos de prueba
  grandes (decenas de miles de documentos). Guardarlos obliga a mantenerlos en cada alta, baja, aplicación y pago.
- **U5. Desautorizar.** El plan solo prevé anular un documento autorizado, pero anular borra también el registro fiscal y
  deja sus retenciones «por resolver». Recomendado: **sí**, «Desautorizar» (autorizado → registrado) con el permiso de
  autorizar, motivo obligatorio y auditoría, solo sin pagos; Contabilidad revierte la provisión.
- **U6. Bajas con Cuentas por pagar desactivado.** Si el módulo se desactiva, Libro de compras anularía sin avisarle (los
  avisos no llegan a módulos inactivos) y no podría eliminar (la llave lo impide). Recomendado: Libro de compras
  **rechaza** las bajas de documentos cuyo destino no está activo, con el mensaje «Active Cuentas por pagar para dar de
  baja este documento».
- **U7. Nota de crédito sin autorizar.** ¿Rebaja el saldo desde que se recibe (recomendado: lo que se debe ya cambió y el
  crédito fiscal también) o solo al autorizarla?
- **U8. Saldos iniciales.** ¿La carga justo después de CP1 (recomendado) y sus formas de pago extra con CP4?
- **U9. Autorizar lo propio.** ¿Se audita cada vez con una acción nueva `autorizar` (recomendado: es la excepción a la
  separación de funciones y un auditor la pedirá) y se completa en lote igual que lo demás?
- **U10. Bancos obligatorio.** Activar Cuentas por pagar exigirá Bancos activo desde CP1 (recomendado, porque los pagos
  son cheques y notas de Bancos). ¿Hay clientes que paguen solo en efectivo y quieran Cuentas por pagar sin Bancos?
- **U11. Lote.** ¿Completar y autorizar varios a la vez, máximo 100, todo o nada (recomendado), o uno a uno?

## 12. Preguntas para el contador (llevar a `contador-guatemala`; ninguna frena CP1-1 ni CP1-2)

- **C1. Nota de crédito mayor que el neto de su factura.** Factura con retención (IVA de agente, 5 % o ISR) y devolución
  total: el diseño deja el monto retenido como **saldo a favor** de la empresa frente al proveedor (la retención ya se
  le acreditó y la empresa la entera). ¿Es correcto, o debe quedar como «por resolver» contra la SAT? ¿Cómo se liquida
  en la práctica (descuento en la próxima factura, reintegro)?
- **C2. Provisión de la nota de crédito.** ¿Autorizar una nota de crédito sin pagos genera la partida inversa de la
  provisión en ese momento (Proveedores contra gasto, activo o IVA), aunque la factura aún no esté autorizada? Si no,
  ¿debe exigirse la factura autorizada antes de autorizar su nota?
- **C3. NDEB de intereses.** La NDEB entra como cargo propio con su vencimiento. ¿Hay algo en Cuentas por pagar (además
  de lo anotado en R3 sobre el ISR de rentas de capital) que cambie cuando el cargo es por intereses?
- **C4. Vencimiento desde la emisión o desde la recepción** en la práctica guatemalteca, y si la contraseña de pago cambia
  la fecha desde la que corre el crédito.
- **C5. Anular un documento autorizado en un mes de Contabilidad cerrado.** Para cuando llegue Contabilidad: ¿la
  reversión de la provisión va en el mes de la anulación (recomendado) o en el del documento?

## Respuestas del usuario (2026-10-20)

Todas las recomendadas: **U1** vencimiento = emisión + días de crédito del proveedor (por cuenta, **U3**), sin dato un mes
calendario ajustable por empresa (C4 del contador puede afinar el origen); **U2** CP1 recibe todo tipo de documento
(cargos y abonos, notas aplicadas solas a su factura); **U4** saldos calculados; **U5** «Desautorizar» mientras no haya
pago, con motivo y auditoría; **U6** Libro de compras rechaza las bajas si CxP está inactivo; **U7** la nota de crédito
rebaja desde que se recibe; **U8** saldos iniciales justo después de CP1; **U9** acción de auditoría `autorizar`;
**U10** `dependeDe` incluye `bancos`; **U11** completar y autorizar en lote hasta 100; separación de funciones con el
permiso `documentos.autorizar-propios` (no «salvo el Propietario»). Dudas C1–C5: en revisión por el contador.
