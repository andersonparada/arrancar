# Diseño U8: saldos iniciales de Cuentas por pagar — arquitecto de datos, 2026-11-08

Estado: **aprobado por el usuario el 2026-11-08** (respuestas en §11); falta aplicar los cambios del dictamen. Aterriza la pregunta **U8** de `diseno-datos-cuentas-por-pagar.md` (respuesta del
usuario del 2026-10-20: «saldos iniciales justo después de CP1»; las dos formas de pago extra van con CP4), su §8, la
sección «Saldos iniciales de cuentas por pagar» y «Fecha de inicio y carga inicial» de `HOJA-DE-RUTA.md`, y la carga
inicial de Empresas (H5a, `diseno-esquema-empresas.md`). Si algo de aquí choca con esos documentos, mandan ellos; lo
que falta decidir está en §11 (usuario) y §12 (contador).

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Cuándo | La carga (alta, edición, eliminación, Excel, ligada a la carga inicial) justo después de CP1; las dos formas de pago extra («ligar al cheque o nota de saldo inicial de Bancos» y «aplicar a la cuenta de apertura»), con CP4 | U8, 2026-10-20 |
| Cómo se carga | **Factura por factura**, las que siguen pendientes a la fecha de inicio, con su fecha y vencimiento reales; no un saldo global por proveedor | Hoja de ruta, 2026-09-28 |
| Qué son | Marcados «de saldo inicial»: no piden concepto de gasto ni entran al Libro de compras; sus retenciones se hicieron con el sistema anterior y solo se consultan | Hoja de ruta |
| Proceso | Hacen **todo su proceso**: autorizar, contraseña y pago | Hoja de ruta |
| Dónde viven | En `cuentas_por_pagar.documentos` (una sola tabla), con `origen` y `documento_id` nulable; `documentos.id` ya es propio para esto | §3.1 y §8 del diseño de CP1 |
| Ventana | De **Administración**, con Excel (importa y exporta) | Hoja de ruta y regla de secciones |
| Carga inicial | Abierta: se corrige libremente; cerrada: ya no se agregan saldos; reabrir es de Empresas (permiso, motivo y auditoría) | Hoja de ruta y H5a |

## 1. Lo encontrado en el código y la base

1. **`cuentas_por_pagar.documentos`** (migración `0001`) tiene `documento_id uuid not null`, la llave compuesta
   `documentos_documento_fk (documento_id, empresa_id, proveedor_id, destino) → libro_de_compras.documentos` y el único
   `documentos_documento_unico (documento_id)`. Las dos aceptan `null` sin cambios: con `MATCH SIMPLE` una llave con una
   columna nula no se revisa, y un único admite varios nulos.
2. **Todo el módulo supone que hay documento en Libro de compras:**
   - `ConsultaBaseDeDocumentos.seleccionar()` hace `innerJoin(documentosDeCompra)` para serie, número, recepción,
     período y anulación; igual `consultaDeAplicaciones()` (dos `innerJoin`), la lista de notas de la ficha y
     `consultas-de-saldos.drizzle.ts` (notas con saldo libre). Un saldo inicial **desaparecería** de todas.
   - `AutorizarDocumentos` y `DesautorizarDocumento` mandan `libroDeCompras.marcarProcesado(documentoId)`;
     `AnularDocumento` manda `libroDeCompras.anular`; `EliminarDocumento` bloquea y elimina en Libro de compras. Con
     `documentoId = null` las cuatro fallarían.
   - `netoDe()` (dominio) y `saldoDelCargo()` (SQL) calculan `total − retenciones`.
   - Los eventos `documento_autorizado`, `documento_desautorizado` y `documento_anulado` llevan
     `documentoDeCompraId: string`. Nadie los escucha todavía (Contabilidad no existe): cambiarlos no rompe nada.
   - El DTO tiene `documentoId`, `fechaRecepcion` y `periodo` como `string` (no nulos), y el cliente enlaza a la ficha
     de Libro de compras con `documentoId`.
3. **El nombre `origen` ya se usa** en el código con otro sentido: `OrigenDelDocumento` (serie, número y proveedor
   leídos de Libro de compras, para `etiquetaDe`) y el `origen: 'cuentas-por-pagar'` de las órdenes de baja a Libro de
   compras. §8 propuso la columna `origen`; se mantiene, y el paso 2 renombra el tipo interno (§10).
4. **`proveedor_id` no tiene llave propia**: hoy lo cubre la llave compuesta hacia Libro de compras. Un saldo inicial
   quedaría sin ninguna llave hacia `terceros.proveedores`.
5. **Carga inicial de Empresas** (`empresas.cargas_iniciales`): la orden del mediador `empresas.obtener_carga_inicial`
   responde `{ fechaDeInicio: string | null, cerrada: boolean }` y toma `for share` (cerrar o cambiar la fecha hace
   `for update` y espera). **Ningún módulo la usa todavía**: Cuentas por pagar será el primero (Bancos lo hará en su
   segunda parte). La fecha de inicio **se puede cambiar** mientras la carga esté abierta, sin avisar a nadie.
6. **Libro de compras** no tiene ninguna regla con la fecha de inicio (registra documentos de cualquier fecha) y exige
   que toda nota de crédito o de débito apunte a una factura **suya** (`documentos_nota_con_factura` y su llave). Ver
   §9.3: hay un hueco que U8 deja a la vista.
7. **Unicidad en Libro de compras:** `documentos_del_proveedor_unico (empresa_id, proveedor_id, tipo, coalesce(serie,''),
   numero) where estado = 'vigente'`. Serie y número se guardan en mayúsculas, sin espacios, de 1 a 40 caracteres
   (`documentos_serie_valida`, `documentos_numero_valido`).
8. `MENSAJES_POR_RESTRICCION` (`core/compartido/infraestructura/errores-de-postgres.ts`) traduce por **nombre de
   restricción, sin esquema**: los nombres nuevos no deben repetir uno de otro módulo (`documentos_del_proveedor_unico`
   ya es de Libro de compras).
9. Bancos ya resolvió su saldo inicial a mano (`composicion/saldos-iniciales.ts`, `http/saldos-iniciales.*`, y en el
   cliente `VentanaDeSaldoInicial`, `CamposDeSaldoInicial`, `edicion-de-saldo-inicial.ts`): eliminar pide motivo, la
   corrección se audita como `corregir` y el intercambio reutiliza el caso de uso del formulario. Es el modelo a copiar.
10. **Base de desarrollo** (consulta de solo lectura del 2026-11-08): `cuentas_por_pagar.documentos` tiene 0 filas; una
    empresa tiene fecha de inicio 2026-10-04 con la carga abierta. La migración igual se escribe para bases con datos.
11. Último `when` del journal de Cuentas por pagar: `1792547740190` (`0002`). El más alto del repositorio es el de
    Libro de compras `0034`: `1794151754950`.

## 2. Modelo: qué es un saldo inicial

Una fila de `cuentas_por_pagar.documentos` con `origen = 'saldo_inicial'`:

| Dato | Saldo inicial | Documento de Libro de compras |
|---|---|---|
| `documento_id` | nulo | el del libro |
| Serie y número | propios (se escriben) | del libro (ver U8-a) |
| Recepción, período, anulación del libro | no tiene | del libro |
| `tipo` | lo elige quien carga (§3.2) | copia |
| `documento_afectado_id` | siempre nulo | la factura de una nota |
| `total`, `retenciones` | se escriben (las retenciones son informativas) | copia |
| **`saldo_al_inicio`** | **lo que faltaba pagarle al proveedor** en la fecha de inicio | nulo |
| Estado al nacer | **`registrado`** (no pasa por la bandeja: ya trae su vencimiento) | `pendiente` |
| Vencimiento | se escribe; vacío = la propuesta de siempre desde la emisión | se propone al recibir |
| Anular | **no** (no es un registro fiscal) | sí |
| Corregir y eliminar | solo con la carga abierta, en `registrado` y sin movimientos (§5) | eliminar, según CP1 |

**Saldo derivado** (sigue sin guardarse, U4): el **neto** de un saldo inicial es `saldo_al_inicio` en vez de
`total − retenciones`. Todo lo demás (aplicaciones de notas, pagos de CP4) se resta igual:

```
neto  = coalesce(saldo_al_inicio, total − retenciones)        -- cargos
neto  = coalesce(saldo_al_inicio, total)                      -- nota de crédito (saldo libre al inicio)
saldo = neto − aplicado (− pagos en CP4)
```

Por qué guardar `saldo_al_inicio` y no solo el total: una factura **pagada en parte** antes de la fecha de inicio es
común, y la antigüedad y el estado de cuenta deben mostrar la factura con su total real y lo que de verdad se debe. Es
además el dato que se cuadra contra el balance de apertura (cuenta Proveedores). Ver U8-c.

**Consecuencia para CP4 (dejar escrito):** el saldo de un saldo inicial **ya es neto de retenciones**; la regla «las
retenciones se descuentan en el primer pago» **no** se aplica a las filas `saldo_inicial` (la `retencion_descontada` de
`pago_aplicaciones` va en cero para ellas).

## 3. Datos

### 3.1 Cambios en `cuentas_por_pagar.documentos`

Sin tablas nuevas. RLS sin cambios (`politicaPorEmpresa()`); sin alcance por registro. Autoría y marcas de tiempo ya
están (`creado_por` = quien cargó o importó).

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `origen` | text | no | `default 'libro_de_compras'`. Las filas existentes quedan como `libro_de_compras` sin rellenar nada |
| `documento_id` | uuid | **sí** (antes no) | ver `documentos_origen_y_documento` |
| `serie` | text | sí | Opción recomendada de U8-a: en **toda** fila (copiada del libro al recibir; rellenada en la migración). Opción §8: solo en el saldo inicial |
| `numero` | text | no (opción recomendada) / sí (opción §8) | igual |
| `saldo_al_inicio` | numeric(14,2) | sí | solo el saldo inicial |

Checks nuevos (nombres `documentos_<regla>`, todos únicos en el repositorio):

| Nombre | Definición |
|---|---|
| `documentos_origen_valido` | `origen in ('libro_de_compras', 'saldo_inicial')` |
| `documentos_origen_y_documento` | `(origen = 'libro_de_compras') = (documento_id is not null)` |
| `documentos_saldo_al_inicio_de_saldos` | `(origen = 'saldo_inicial') = (saldo_al_inicio is not null)` |
| `documentos_saldo_al_inicio_valido` | `saldo_al_inicio is null or (saldo_al_inicio > 0 and saldo_al_inicio <= total - retenciones)` (en la nota de crédito `retenciones = 0`, así que el tope es su total) |
| `documentos_saldo_inicial_sin_nota_afectada` | `origen = 'libro_de_compras' or documento_afectado_id is null` |
| `documentos_saldo_inicial_completado` | `origen = 'libro_de_compras' or estado in ('registrado', 'autorizado')` (nunca pendiente ni anulado) |
| `documentos_serie_valida` → **`documentos_serie_de_compra_valida`** | `serie is null or (char_length(btrim(serie)) between 1 and 40 and btrim(serie) = upper(btrim(serie)) and btrim(serie) !~ '\s')` — mismo texto que Libro de compras; el nombre cambia porque `documentos_serie_valida` ya existe en otro esquema y los mensajes se buscan sin esquema |
| `documentos_numero_de_compra_valido` | igual para `numero` (con la opción §8: `numero is null or …` y además `(origen = 'saldo_inicial') = (numero is not null) or origen = 'libro_de_compras'`) |

Check que **cambia**:

| Nombre | Antes | Después |
|---|---|---|
| `documentos_nota_con_factura` | `(tipo in ('nota_de_credito','nota_de_debito')) = (documento_afectado_id is not null)` | `origen = 'saldo_inicial' or (tipo in ('nota_de_credito','nota_de_debito')) = (documento_afectado_id is not null)` |

Los demás checks de CP1 valen igual para el saldo inicial: total positivo, retenciones entre 0 y el total, nota de
crédito sin retenciones, **nota de crédito sin vencimiento y cargo con vencimiento**, vencimiento desde la emisión,
registro y autorización completos y la separación de funciones.

Llaves e índices nuevos:

| Nombre | Definición | Para |
|---|---|---|
| `documentos_proveedor_fk` | `(proveedor_id) → terceros.proveedores (id)`, **no action** | Hoy solo la cubre la llave hacia el libro; un saldo inicial quedaría sin llave. No action: un proveedor con documentos en Cuentas por pagar no se borra (el `23503` lleva mensaje: «El proveedor tiene documentos en Cuentas por pagar: inactívelo.»). La cuenta del proveedor la garantiza el caso de uso (lo busca con RLS por cuenta); la llave no la mira |
| `documentos_proveedor_idx` | `(proveedor_id)` | Índice de la llave (§3.1 de CP1 lo dejó como opcional; ahora hace falta) |
| `documentos_numero_por_proveedor_unico` | unique `(empresa_id, proveedor_id, tipo, coalesce(serie, ''), numero) where estado <> 'anulado'` (opción recomendada de U8-a) **o** `… where origen = 'saldo_inicial'` (opción §8) | Un documento no se debe dos veces: ni dos saldos iniciales iguales ni (opción recomendada) un saldo inicial y el mismo documento registrado en el libro. Mensaje: «Ese documento ya está en Cuentas por pagar (como saldo inicial o desde el libro de compras).» |
| `documentos_saldos_iniciales_idx` | `(empresa_id, proveedor_id, fecha_emision) where origen = 'saldo_inicial'` | Lista de la ventana de Administración y exportación |

Con la opción recomendada, el único nuevo coincide con `documentos_del_proveedor_unico` de Libro de compras para las
filas que vienen del libro (vigente en el libro ⇔ no anulado aquí, porque las bajas van en la misma transacción), así
que el relleno no puede chocar.

### 3.2 Tipos admitidos

Todos los cargos (`factura`, las cuatro familias sin crédito, `factura_especial`, `recibo` y `nota_de_debito` sin
factura afectada) y, según U8-b, la `nota_de_credito` con saldo a favor. La `factura_especial` lleva sus retenciones
(informativas); el recibo, cero.

### 3.3 Migración

`0003_u8_saldos_iniciales` en `servidor/src/modulos/cuentas-por-pagar/migraciones/`, con
`npm run bd:generar -w servidor -- cuentas-por-pagar u8_saldos_iniciales` y revisada a mano. Su `when` lo pone
drizzle-kit con la hora (hoy ≈ `1794155…`): debe quedar **mayor que `1792547740190`** (último de este módulo) y, para
que el orden global no engañe, mayor que `1794151754950` (Libro de compras `0034`); revisarlo en el commit.

Orden de las sentencias (las que drizzle-kit no escribe van a mano al final del archivo generado):

1. `add column origen text default 'libro_de_compras' not null`, `serie text`, `numero text`, `saldo_al_inicio
   numeric(14,2)`.
2. **(Opción recomendada U8-a, a mano)** relleno con el propietario (la tabla no tiene `force row level security`, así
   que el dueño ve todas las empresas):
   `update cuentas_por_pagar.documentos d set serie = l.serie, numero = l.numero from libro_de_compras.documentos l
   where l.id = d.documento_id;` y después `alter column numero set not null`.
3. `alter column documento_id drop not null`.
4. `drop constraint documentos_nota_con_factura` y `add` con la definición nueva.
5. `add constraint` de los checks nuevos, la llave `documentos_proveedor_fk` y los índices.

Sin migración de permisos (son nuevos: el acceso total los recibe solo). Ninguna migración en otro esquema. Es
reversible solo hacia adelante (como todas): no se edita después de aplicada en producción.

### 3.4 Mensajes de restricciones (`MENSAJES_POR_RESTRICCION`)

| Restricción | Mensaje |
|---|---|
| `documentos_numero_por_proveedor_unico` | «Ese documento ya está en Cuentas por pagar (como saldo inicial o desde el libro de compras).» Lo verá también quien registre en **Libro de compras** un documento que ya es saldo inicial (la orden `recibir_documento` corre en su transacción) |
| `documentos_proveedor_fk` (`23503` al borrar un proveedor) | «El proveedor tiene documentos en Cuentas por pagar: inactívelo.» |
| `documentos_saldo_al_inicio_valido` y demás checks | Error de programación si ocurre (el dominio valida antes); no llevan mensaje propio |

## 4. Integración con CP1 (lo que cambia en el código existente)

| Pieza | Cambio |
|---|---|
| Dominio `DocumentoPorPagar` | `documentoId: string \| null`; `origen: 'libro_de_compras' \| 'saldo_inicial'`; `saldoAlInicioCentavos: number \| null`; `serie`, `numero` (opción recomendada) |
| `netoDe()` | `saldoAlInicioCentavos ?? total − retenciones` (cargos); `saldoDe()` para la nota usa `saldoAlInicioCentavos ?? total` |
| `saldoDelCargo()` (SQL) | `coalesce(saldo_al_inicio, total − retenciones) − coalesce(aplicado, 0)`; igual en `consultas-de-saldos` y en el saldo libre de las notas |
| Consultas (`seleccionar`, aplicaciones, notas de la ficha, saldos) | `innerJoin(documentosDeCompra)` → **`leftJoin`**; serie y número salen de la fila propia (opción recomendada) o de `coalesce(documentos.serie, libro.serie)` (opción §8) |
| `HechosDelDocumento` / `accionesDelDocumento` | Recibe `origen`; para el saldo inicial `puedeAnular = false` y `puedeEliminar = false` (se elimina desde su ventana). `puedeAutorizar`, `puedeDesautorizar` y `puedeCambiarVencimiento`, igual que cualquier cargo |
| `AutorizarDocumentos` / `DesautorizarDocumento` | Si `origen = 'saldo_inicial'`, **no** mandan `marcar_procesado` (no hay documento en el libro); el resto igual (separación de funciones, auditoría de lo propio, `devolver`) |
| `AnularDocumento` / `EliminarDocumento` (rutas de Documentos) | Rechazan el saldo inicial con `EsUnSaldoInicial` antes de hablar con Libro de compras |
| Bajas por aviso de Libro de compras | Sin cambio: buscan por `documento_id`, que el saldo inicial no tiene |
| `RecibirDocumento` | (Opción recomendada) copia `serie` y `numero` leyéndolos con el puerto `DocumentosDeCompra` (hoy ya lee la fecha de recepción; pasa a leer `{ fechaRecepcion, serie, numero }` de una vez). Si el documento ya es saldo inicial, el único lo rechaza y Libro de compras no registra nada |
| Bandeja | Sin cambio: el saldo inicial nunca está `pendiente` |
| Eventos (`core/contratos/cuentas-por-pagar.contratos.ts` y `dominio/eventos.ts`) | `documentoDeCompraId: string \| null` y `origen` en `documento_autorizado`, `documento_desautorizado` y `documento_anulado` (este último nunca saldrá de un saldo inicial). Contabilidad tratará el saldo inicial como apertura, no como compra |
| DTO `DocumentoPorPagarDto` y ficha | `origen`; `documentoId`, `fechaRecepcion` y `periodo` pasan a `string \| null`; `saldoAlInicio: string \| null`. Lista de Documentos con filtro opcional `origen` |
| `OrigenDelDocumento` y `etiquetaDe` | Se renombra a `DatosDelLibro` (o similar) para no confundirlo con la columna; `etiquetaDe` usa la serie y el número de la fila |
| Reglas de baja (`REGLAS_PARA_*`) | Sin cambio en CP1. CP3 y CP4 sumarán sus reglas; las del saldo inicial (§5) son una lista aparte, ampliable igual |

**Libro de compras no cambia en U8.** Un saldo inicial no es un documento del libro: no aparece en el libro, en sus
reportes, en sus retenciones ni en la conciliación de DTE. Lo único que Libro de compras «nota» es que registrar el
mismo documento con destino Cuentas por pagar falla por el único (opción recomendada de U8-a).

## 5. Reglas del saldo inicial

Al **crear** (y en cada fila importada), en la transacción del caso de uso:

1. Pide `empresas.obtener_carga_inicial` por el mediador (bloqueo compartido: nadie cierra la carga ni cambia la fecha
   hasta que termine). Sin fecha de inicio → `FechaDeInicioSinRegistrar`; cerrada → `CargaInicialCerradaParaSaldos`.
2. **Fecha de emisión anterior a la fecha de inicio** (`fecha_emision < fecha_de_inicio`; ver C-U8-1) →
   `EmisionNoAnteriorAlInicio`.
3. Proveedor: existe en la cuenta (consulta con RLS a `terceros.proveedores` desde `infraestructura`) y está activo →
   si no, `ProveedorNoDisponible`.
4. Serie y número: se limpian como en Libro de compras (`btrim`, mayúsculas, sin espacios, 1–40; la serie es
   opcional). Lo hace una función del dominio de Cuentas por pagar (no se importa del libro).
5. Montos: `total > 0`; `0 <= retenciones <= total`; nota de crédito con retenciones = 0;
   `0 < saldo pendiente <= total − retenciones` → `SaldoPendienteInvalido`.
6. Vencimiento: la nota de crédito no lleva (`VencimientoInvalido`, ya existe); un cargo sin vencimiento recibe la
   **propuesta de siempre** (`proponerVencimiento` con los días de crédito del proveedor o el plazo por omisión, contado
   desde la emisión porque no hay recepción); con vencimiento, `>= fecha_emision`. Puede ser anterior a la fecha de
   inicio (ya venció).
7. Inserta con `origen = 'saldo_inicial'`, `estado = 'registrado'`, `registrado_en = now()`, `registrado_por` =
   quien carga. Sin aplicación automática ni avisos (no hay factura afectada).
8. El único `documentos_numero_por_proveedor_unico` rechaza el repetido.

Al **corregir** (`PUT`) y al **eliminar**: además de 1 (carga abierta), con la fila bloqueada (`for update`):

- Es un saldo inicial (si no, `RecursoNoEncontrado`: por esta ruta no existe).
- `estado = 'registrado'` → si está `autorizado`, `SaldoInicialAutorizado` («desautorícelo antes»; la autorización
  aprobó un monto y no se cambia por debajo).
- Sin aplicaciones de notas (hechas ni recibidas) → `SaldoInicialConMovimientos`. CP3 suma «no está en una contraseña
  vigente» y CP4 «no tiene pagos», en la lista `REGLAS_PARA_CORREGIR_SALDO_INICIAL` (Chain of Responsibility, como las
  reglas de baja).
- Corregir vuelve a correr las validaciones 2 a 6 y deja `registrado_en/por` = quien corrige, para que tampoco pueda
  autorizar lo que corrigió sin `autorizar-propios` (la separación de funciones ya mira `registrado_por` y
  `creado_por`).
- Eliminar exige motivo (1–300, `motivoValido` de CP1), como el saldo inicial de Bancos.

Con la carga **cerrada**: el saldo inicial sigue su proceso (autorizar, desautorizar, cambiar el vencimiento,
contraseña y pago), pero no se agrega, corrige ni elimina. Lo cargado por error se arregla reabriendo la carga
(Empresas) o, desde CP4, con la forma de pago «aplicar a la cuenta de apertura».

**Si cambia la fecha de inicio** (la carga sigue abierta): ver U8-e. Recomendado: Empresas avisa
`empresas.fecha_de_inicio_por_cambiar { empresaId, fechaDeInicio }` dentro de su transacción y Cuentas por pagar
rechaza si algún saldo inicial quedaría con `fecha_emision >= fecha nueva` (`SaldosInicialesPosterioresALaFecha`, con
cuántos son). Bancos podrá escuchar el mismo aviso.

## 6. Permisos, auditoría y errores

### 6.1 Permisos (`modulo.ts`, PLAN §3.5)

| Permiso | Para |
|---|---|
| `cuentas-por-pagar.saldos-iniciales.ver` | La ventana de Administración (lista y ficha del saldo inicial). En Documentos por pagar se siguen viendo con `documentos.ver` |
| `cuentas-por-pagar.saldos-iniciales.crear` | Cargar uno |
| `cuentas-por-pagar.saldos-iniciales.editar` | Corregirlo |
| `cuentas-por-pagar.saldos-iniciales.eliminar` | Eliminarlo |
| `cuentas-por-pagar.saldos-iniciales.importar` | Importar (y bajar la plantilla) |
| `cuentas-por-pagar.saldos-iniciales.exportar` | Exportar |

Autorizar, desautorizar y cambiar el vencimiento usan los permisos de `documentos` (es el mismo proceso). Los permisos
de la carga inicial (cerrar, reabrir) son de Empresas. Ninguno es `soloSuperacceso`. Sin migración de permisos.

### 6.2 Auditoría

| Hecho | Acción | Recurso | `anterior` |
|---|---|---|---|
| Eliminar | `eliminar` | `cuentas-por-pagar.saldos-iniciales` | `SaldoInicialDto` como estaba; con el motivo |
| Corregir | `corregir` (ya existe; Bancos la usa igual) | igual | `SaldoInicialDto` como estaba |
| Alta (formulario o Excel) | ninguna | — | queda en `creado_por` |
| Autorizar lo propio, desautorizar | como en CP1 | `cuentas-por-pagar.documentos` | ficha |

### 6.3 Errores nuevos (`dominio/errores.ts` o `aplicacion/errores.ts`, código propio)

| Clase | Familia | Código | Mensaje |
|---|---|---|---|
| `FechaDeInicioSinRegistrar` | `ReglaDeNegocioInfringida` | `fecha_de_inicio_sin_registrar` | «Registre la fecha de inicio de la empresa (Empresas → Fecha de inicio y carga inicial) antes de cargar saldos iniciales.» |
| `CargaInicialCerradaParaSaldos` | `ReglaDeNegocioInfringida` | `carga_inicial_cerrada_para_saldos` | «La carga inicial de la empresa está cerrada: reábrala en Empresas para agregar, corregir o eliminar saldos iniciales.» |
| `EmisionNoAnteriorAlInicio` | `DatoInvalido` (campo `fechaEmision`) | `emision_no_anterior_al_inicio` | «Un saldo inicial es un documento de antes de la fecha de inicio (dd/mm/aaaa). Lo emitido desde esa fecha se registra en el Libro de compras.» |
| `SaldoPendienteInvalido` | `DatoInvalido` (campo `saldoPendiente`) | `saldo_pendiente_invalido` | «El saldo pendiente debe ser mayor que cero y no pasar del total menos las retenciones (Q…).» |
| `RetencionesInvalidas` | `DatoInvalido` (campo `retenciones`) | `retenciones_invalidas` | «Las retenciones no pueden pasar del total; una nota de crédito no lleva retenciones.» |
| `ProveedorNoDisponible` | `DatoInvalido` (campo `proveedorId`) | `proveedor_no_disponible` | «Ese proveedor no existe o está inactivo.» |
| `SaldoInicialAutorizado` | `ReglaDeNegocioInfringida` | `saldo_inicial_autorizado` | «El saldo inicial … ya está autorizado: desautorícelo para corregirlo o eliminarlo.» |
| `SaldoInicialConMovimientos` | `ReglaDeNegocioInfringida` | `saldo_inicial_con_movimientos` | «El saldo inicial … ya tiene notas aplicadas (o está en una contraseña, o tiene pagos): no se corrige ni se elimina.» |
| `EsUnSaldoInicial` | `ReglaDeNegocioInfringida` | `es_un_saldo_inicial` | «El documento … es un saldo inicial: no se anula; corríjalo o elimínelo en Administración → Saldos iniciales mientras la carga inicial esté abierta.» |
| `SaldosInicialesPosterioresALaFecha` (U8-e) | `ReglaDeNegocioInfringida` | `saldos_iniciales_posteriores_a_la_fecha` | «Hay N saldos iniciales de Cuentas por pagar emitidos desde esa fecha: corríjalos o elimínelos antes de cambiar la fecha de inicio.» |

Un saldo inicial que no existe (o es un documento del libro, por la ruta de saldos) responde `RecursoNoEncontrado`.

## 7. Contrato de la API

Prefijo `/api/cuentas-por-pagar/saldos-iniciales`. Dinero como texto con dos decimales; fechas `AAAA-MM-DD`.

**Solicitud** (`esquemaSaldoInicial`, Zod; la misma para crear, corregir e importar):

```ts
{
  proveedorId: uuid;
  tipo: TipoDeDocumento;          // §3.2 (sin nota de crédito si U8-b dice que no)
  serie: string | null;           // 1–40; se limpia como en el libro
  numero: string;                 // 1–40
  fechaEmision: string;           // fecha
  vencimiento: string | null;     // null = propuesta; prohibido en nota de crédito
  total: string;                  // dinero > 0
  retenciones: string;            // dinero >= 0, por omisión '0.00'
  saldoPendiente: string;         // dinero > 0
  tieneActivoFijo: boolean;       // por omisión false
}
```

**Respuesta** `SaldoInicialDto`: `id`, `proveedorId`, `proveedorNombre`, `proveedorNit`, `tipo`, `serie`, `numero`,
`fechaEmision`, `vencimiento`, `total`, `retenciones`, `saldoPendiente` (el de la fecha de inicio), `saldo` (el de hoy,
tras notas y pagos), `estado`, `tieneActivoFijo`, `creadoEn`, y calculados en el servidor `puedeCorregir` y
`puedeEliminar` (carga abierta, estado y movimientos; el permiso lo mira el cliente con `v-permiso`).

| Método y ruta | Permiso | Cuerpo / consulta | Respuesta |
|---|---|---|---|
| `GET /saldos-iniciales` | `saldos-iniciales.ver` | `proveedorId?`, `pagina`, `limite` | `{ carga: { fechaDeInicio, cerrada }, elementos, total, pagina, limite }` (la carga viene del mediador, para que la ventana diga si se puede cargar) |
| `GET /saldos-iniciales/:id` | `saldos-iniciales.ver` | — | `SaldoInicialDto` |
| `POST /saldos-iniciales` | `saldos-iniciales.crear` | solicitud | 201, `SaldoInicialDto` |
| `PUT /saldos-iniciales/:id` | `saldos-iniciales.editar` | solicitud | `SaldoInicialDto` |
| `DELETE /saldos-iniciales/:id` | `saldos-iniciales.eliminar` | `{ motivo }` (1–300) | 204 |
| `GET /saldos-iniciales/exportar` | `saldos-iniciales.exportar` | — | `.xlsx` |
| `GET /saldos-iniciales/plantilla` | `saldos-iniciales.importar` | — | `.xlsx` |
| `POST /saldos-iniciales/importar?ensayo=true\|false` | `saldos-iniciales.importar` | archivo | `ResultadoDeImportacion` |

Cambios en rutas de CP1: `GET /cuentas-por-pagar/documentos` acepta `origen?` (`libro_de_compras` | `saldo_inicial`);
la lista, la ficha y la bandeja devuelven el DTO con los campos de §4. `POST …/documentos/:id/anular` y
`DELETE …/documentos/:id` responden `es_un_saldo_inicial` para un saldo inicial.

### 7.1 Excel (`http/saldos-iniciales.columnas.ts`, `crearIntercambio`)

Mismas columnas y orden que el formulario; cada fila pasa por `CrearSaldoInicial` (todo o nada, 5,000 filas, ensayo que
deshace; el único revela los repetidos dentro del archivo y contra lo ya cargado).

| Clave | Título | Requerido | Tipo |
|---|---|---|---|
| `proveedorId` | Proveedor | sí | referencia (`campoDeNombre: 'proveedorNombre'`, **`tambienPorCodigo: true`** con el **NIT** como código, porque dos terceros pueden llamarse igual; los nombres repetidos ya dan «Hay varios con el nombre…») |
| `tipo` | Tipo | sí | lista (los tipos de §3.2 con sus nombres de pantalla) |
| `serie` | Serie | no | texto |
| `numero` | Número | sí | texto |
| `fechaEmision` | Fecha de emisión | sí | fecha |
| `vencimiento` | Vencimiento | no | fecha (vacío = propuesta) |
| `total` | Total | sí | decimal |
| `retenciones` | Retenciones | no | decimal |
| `saldoPendiente` | Saldo pendiente | sí | decimal |
| `tieneActivoFijo` | Activo fijo | no | siNo |

Las opciones de proveedor las da una consulta propia de Cuentas por pagar (`opciones-de-proveedores.drizzle.ts`, en
`infraestructura`, lee `terceros.proveedores` + `terceros.terceros` activos de la cuenta con RLS; es una lectura
permitida porque Terceros llega por el `dependeDe` transitivo). Sin `sinAsignarAlCrear` (no hay alcance). La hoja de
instrucciones debe decir que la fecha de emisión va antes de la fecha de inicio y que el saldo pendiente es lo que falta
pagarle al proveedor, ya sin retenciones.

Rendimiento: 5,000 filas × (mediador + proveedor + condiciones + insert) en una transacción, del orden de lo que ya hace
Bancos. Si molesta, `CrearSaldoInicial` puede recibir la carga ya leída del primer llamado de la misma transacción
(memoria por transacción); no hace falta para empezar.

## 8. Cliente

**No conviene `npm run generar -- recurso`:** genera una tabla, una migración y un recurso de servidor propios, y el
saldo inicial vive en `documentos` con reglas que no son de catálogo (carga inicial, estado, movimientos). Bancos hizo
lo mismo a mano. Se copia la forma de Bancos (`VentanaDeSaldoInicial`, `CamposDeSaldoInicial`,
`edicion-de-saldo-inicial.ts` con su prueba, `usar-eliminacion-de-saldo-inicial.ts`) y la lista de `terceros`.

- `servicios/`: `ApiSaldosIniciales` (`saldos-iniciales.api.ts`) e `intercambioDe('/cuentas-por-pagar/saldos-iniciales')`;
  tipos en `servicios/tipos.ts` (`origen`, nulos de §4).
- `paginas/SaldosIniciales.vue` (Administración, ≤ 120 líneas): encabezado con el estado de la carga («Fecha de inicio:
  04/10/2026 · Carga abierta», o el aviso de que falta la fecha o de que está cerrada, con enlace a Empresas);
  `AccionesDeIntercambio` (importar, exportar) y «Nuevo saldo inicial» solo con la carga abierta y su permiso; filtro
  por proveedor; tarjetas `TarjetaDeRegistro` con proveedor, documento, emisión, vencimiento, total, saldo pendiente y
  saldo de hoy, y la etiqueta «Autorizado» si lo está; total de saldos pendientes de la lista (para cuadrar con el
  balance de apertura).
- `componentes/VentanaDeSaldoInicial.vue` y `CamposDeSaldoInicial.vue` (`defineModel`, emiten `guardar` y `cerrar`):
  proveedor (selector), tipo, serie, número, emisión, vencimiento (ayuda: «vacío = según los días de crédito del
  proveedor»), total, retenciones, saldo pendiente (se propone `total − retenciones` al escribir el total, editable),
  activo fijo. El tipo nota de crédito oculta el vencimiento.
- `composables/edicion-de-saldo-inicial.ts` (lógica pura, con `*.prueba.ts`): formulario ↔ API, propuesta del saldo
  pendiente, campos visibles por tipo. `usar-saldos-iniciales.ts` (`usarCarga`) y `usar-formulario-de-saldo-inicial.ts`
  (`usarFormulario`, errores por campo, incluidos `fechaEmision` y `saldoPendiente`).
- Eliminar con `usarAvisos().confirmar` y motivo (ventana pequeña, como Bancos).
- `modulo.ts`: ruta `/cuentas-por-pagar/saldos-iniciales` (permiso `saldos-iniciales.ver`), entrada de menú en
  `seccion: 'administracion'`; `textos.ts`: «Saldos iniciales».
- **Documentos por pagar y su ficha:** etiqueta «Saldo inicial» en la tarjeta; la ficha no enlaza a Libro de compras
  si `documentoId` es nulo, muestra «Saldo al inicio» y, con permiso, «Corregir en Saldos iniciales»; sin «Anular» ni
  «Eliminar» (ya vienen en falso del servidor); filtro «Origen» en la lista.

## 9. Convivencia y riesgos

1. **Libro de compras:** sin cambios de código en U8. Con la opción recomendada de U8-a, registrar en el libro un
   documento que ya es saldo inicial (mismo proveedor, tipo, serie y número, destino Cuentas por pagar) falla con el
   mensaje de §3.4 y no se guarda nada; la conciliación de DTE de la SAT podría mostrarlo como «pendiente de registrar»
   (mejora futura: que lo reconozca; fuera de U8).
2. **Bancos:** sin cambios. La forma de pago «ligar al cheque o nota de saldo inicial de Bancos» es de CP4.
3. **Nota de crédito o de débito del proveedor sobre una factura de saldo inicial (hueco):** Libro de compras exige
   que la nota apunte a una factura **suya**, y la factura de saldo inicial no está en el libro. Hoy esa nota **no se
   puede registrar**, aunque fiscalmente sí va en el libro del mes en que se recibe (rebaja o aumenta el crédito
   fiscal). U8 no lo resuelve; ver U8-l y C-U8-5. Mientras tanto, con la carga abierta se corrige el saldo pendiente.
4. **Proveedores:** la llave nueva impide borrar un proveedor con documentos en Cuentas por pagar (antes lo impedía la
   llave de Libro de compras para los suyos). Terceros ya ofrece inactivar.
5. **Empresas:** primer uso real de `empresas.obtener_carga_inicial`. Con U8-e, Empresas suma un aviso al cambiar la
   fecha de inicio (cambio pequeño en su caso de uso y en `core/contratos/empresas.contratos.ts`).
6. **Concurrencia:** cerrar la carga o cambiar su fecha espera a la importación en curso (bloqueo compartido); dos
   importaciones del mismo documento a la vez: una gana y la otra recibe el `23505` traducido.
7. **Borrar la empresa:** `empresa_id … on delete cascade` ya existe; la llave del proveedor es `no action` pero se
   revisa al final del comando, como el resto.

## 10. Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`. Pasos 1 a 6, servidor
(`programador-backend`); 7 y 8, cliente (`programador-frontend`); 9, QA (`pruebas-qa`).

1. **U8-1 (servidor, datos):** columnas, checks, llave e índices de §3.1 en `documentos.tablas.ts` y
   `documentos.restricciones.ts`; migración `0003_u8_saldos_iniciales` (§3.3, con el relleno si se aprueba U8-a);
   mensajes de §3.4; `DocumentoPorPagar` y el mapeador con `origen`, `documentoId` nulable, `saldoAlInicioCentavos`
   (y serie y número); `netoDe` y `saldoDe`. Para que compile, las cuatro acciones de §4 rechazan ya el saldo inicial o
   saltan `marcar_procesado`. **Pruebas de tablas:** cada check nuevo con un caso que lo viola (saldo inicial con
   `documento_id`, del libro sin él, saldo al inicio mayor que el neto, saldo inicial `pendiente`, saldo inicial con
   nota afectada, serie con espacios), llave del proveedor, único repetido (dos saldos iniciales; saldo inicial y
   documento del libro), RLS por empresa con un saldo inicial; `politicas-de-los-modulos` y `llaves-entre-esquemas`.
2. **U8-2 (servidor, CP1 con dos orígenes):** `leftJoin` en las consultas, `saldoDelCargo` con `coalesce`, DTO y ficha
   con `origen` y nulos, filtro `origen`, `accionesDelDocumento` con `origen`, renombre de `OrigenDelDocumento`,
   eventos con `documentoDeCompraId` nulable, `RecibirDocumento` copia serie y número (U8-a), `EsUnSaldoInicial` en
   anular y eliminar. **Pruebas:** un saldo inicial (sembrado en la prueba) aparece en la lista, la ficha y el saldo del
   proveedor con el neto correcto; autorizarlo y desautorizarlo no tocan Libro de compras; anularlo y eliminarlo por
   Documentos se rechazan; registrar en el libro el mismo documento falla y no guarda nada; todas las de CP1 siguen
   pasando.
3. **U8-3 (servidor, casos de uso):** puerto `CargaInicial` en `aplicacion/puertos` implementado con el mediador;
   puerto de proveedores; dominio `SaldoInicial` (validaciones de §5) y `REGLAS_PARA_CORREGIR_SALDO_INICIAL`;
   `CrearSaldoInicial`, `CorregirSaldoInicial`, `EliminarSaldoInicial`, `ListarSaldosIniciales`,
   `ObtenerSaldoInicial`; errores de §6.3; auditoría de §6.2. **Pruebas puras** (validaciones, reglas) **y de
   integración** (sin fecha, carga cerrada, emisión igual a la fecha de inicio, proveedor inactivo, saldo mayor que el
   neto, vencimiento propuesto, autorizado no se corrige, con nota aplicada no se elimina, corregir cambia
   `registrado_por`, auditoría `corregir` y `eliminar` con su `anterior`).
4. **U8-4 (servidor, rutas y permisos):** permisos de §6.1 en `modulo.ts`, `composicion/saldos-iniciales.ts`,
   `http/saldos-iniciales.{rutas,controlador,esquemas-http}.ts`. **Pruebas de API** (`app.inject`): cada ruta con y sin
   su permiso, 201/204, errores por campo, la carga en la lista.
5. **U8-5 (servidor, Excel):** columnas, opciones de proveedores por nombre o NIT, `crearIntercambio` y
   `rutasDeIntercambio`. **Pruebas:** plantilla, exportar, importar con ensayo, una fila mala no guarda nada, repetido
   dentro del archivo y contra lo cargado, proveedor por NIT y por nombre repetido, carga cerrada.
6. **U8-6 (servidor, fecha de inicio; solo si se aprueba U8-e):** aviso `empresas.fecha_de_inicio_por_cambiar` en el
   contrato y en `EstablecerFechaDeInicio`, escucha de Cuentas por pagar. **Pruebas:** cambiar la fecha con saldos
   posteriores (rechazo, nada cambia) y sin ellos (pasa); módulo inactivo (no escucha).
7. **U8-7 (cliente, Documentos con dos orígenes):** tipos y servicio, etiqueta «Saldo inicial», ficha sin enlace al
   libro, filtro «Origen»; pruebas de la lógica pura que cambie.
8. **U8-8 (cliente, ventana de Administración):** página, ventana, campos, composables y pruebas de §8; menú y textos.
9. **U8-9 (QA):** de punta a punta: sin fecha de inicio (aviso), fecha 01/11, cargar a mano una factura pagada en
   parte y una de pequeño contribuyente, importar 20 filas con dos errores (ensayo) y luego bien, corregir, eliminar
   con motivo, autorizar con otro usuario, verlos en Documentos por pagar y en el saldo del proveedor, registrar en
   Libro de compras el mismo documento (rechazo), cerrar la carga (ya no se agrega ni corrige) y reabrirla.

## 11. Preguntas para el usuario (con recomendación)

> **Respuestas del usuario (2026-11-08):** acepta **todas las recomendaciones** de U8-a a U8-l con las precisiones del
> dictamen del contador (`dictamen-u8-saldos-iniciales-2026-11-08.md`): U8-a copiar serie y número en todos (el
> arquitecto evalúa `tipo` en el único de los cargos); U8-b sí, y un anticipo no es nota de crédito; U8-c total,
> **todas** las retenciones y saldo pendiente; U8-d, U8-f, U8-g y U8-h como se recomiendan; U8-e **indispensable**
> (paso U8-6 aprobado); U8-i **sí**, una «referencia» corta y opcional del sistema anterior; U8-l se resuelve en Libro
> de compras **después de U8 y antes de producción con una empresa con historia**. De las depuradas del contador:
> retenciones pendientes al corte con la **opción B** (columna informativa `retenciones_por_practicar`, su total y
> aviso en CP4, sin efecto en el saldo); fecha de inicio = «primer día en Arrancar», recomendando el día 1 de un mes,
> con aviso sin prohibir; aviso en Libro de compras para facturas con emisión anterior a la fecha de inicio; cuadre al
> cerrar la carga: con Contabilidad **bloquear** si la puente no está en cero, con salida por permiso y motivo
> auditado (mientras tanto, solo confirmación); **solo quetzales** por ahora (moneda extranjera, más adelante).

- **U8-a. Serie y número en todos los documentos o solo en el saldo inicial.** §8 propuso guardarlos solo en el saldo
  inicial y leer los del libro con `coalesce`. **Recomendado: copiarlos en todos** (al recibir y con un relleno en la
  migración). Así un único índice impide en la base que el mismo documento se deba dos veces (una como saldo inicial y
  otra desde el libro), sin depender de revisiones en dos módulos que pueden cruzarse; y las listas ya no necesitan el
  libro para nombrar el documento. Copiar es seguro porque un documento del libro **no se edita nunca**. Alternativa
  (§8): solo en el saldo inicial, con una revisión en el código en los dos sentidos (al cargar y al recibir), sin
  garantía en la base ante dos transacciones a la vez.
- **U8-b. Notas de crédito con saldo a favor como saldo inicial.** **Recomendado: sí**, como abono sin factura
  afectada y sin vencimiento: el saldo de cada proveedor queda bien desde el inicio y su saldo libre se aplica con CP2 o
  la contraseña (CP3). Alternativa: solo cargos, y lo a favor se rebaja a mano del saldo pendiente de alguna factura
  (pierde el rastro). Los anticipos a proveedores siguen fuera (otro módulo). Depende de C-U8-4.
- **U8-c. Cómo se escribe el monto.** **Recomendado: total, retenciones y saldo pendiente** (el saldo se propone como
  total menos retenciones y se puede bajar si estaba pagada en parte). Alternativa: solo el saldo pendiente como
  total (más simple, pero la antigüedad y el estado de cuenta mostrarían un «total» que no es el de la factura).
- **U8-d. Corregir y eliminar.** **Recomendado:** solo con la carga abierta, en `registrado` y sin notas aplicadas,
  contraseña ni pagos; un saldo autorizado se desautoriza primero (con su motivo). Alternativa: también autorizados
  mientras no tengan pagos (más cómodo, pero el autorizador aprobó otro monto).
- **U8-e. Cambiar la fecha de inicio con saldos ya cargados.** **Recomendado:** Empresas avisa y Cuentas por pagar
  rechaza el cambio si algún saldo inicial quedaría con emisión igual o posterior a la fecha nueva (paso U8-6; Bancos
  podrá usar el mismo aviso). Alternativa: no revisar y que la incoherencia se vea en los reportes.
- **U8-f. Motivo al eliminar.** **Recomendado: obligatorio**, como el saldo inicial de Bancos, y la corrección
  auditada como `corregir`.
- **U8-g. Vencimiento vacío.** **Recomendado:** se propone con los días de crédito del proveedor desde la emisión (como
  al recibir); también en Excel. Alternativa: obligatorio.
- **U8-h. Proveedor inactivo.** **Recomendado:** no se le cargan saldos iniciales (se reactiva antes).
- **U8-i. Observaciones o referencia del sistema anterior.** No se proponen (cada columna nueva en `documentos` es de
  todos los orígenes). ¿Hace falta una «referencia» para cuadrar contra el sistema anterior?
- **U8-l. Notas sobre facturas de saldo inicial (hueco de §9.3).** **Recomendado:** planificarlo aparte, después de
  U8 y con el dictamen de C-U8-5: Libro de compras aceptaría una nota cuya factura es «anterior a la fecha de inicio»
  (con los datos de la factura escritos) y Cuentas por pagar la aplicaría al saldo inicial de esa factura. No frena U8.

## 12. Para `contador-guatemala` (validar antes de programar los pasos 3 y 5)

- **C-U8-1. Corte.** ¿Un saldo inicial debe tener fecha de emisión **anterior** a la fecha de inicio (propuesto:
  estrictamente anterior; lo del día de inicio va al libro del período) o «igual o anterior», como el saldo inicial de
  Bancos? Y una factura **emitida antes** pero **recibida después** de la fecha de inicio (no registrada en el sistema
  anterior): ¿va al Libro de compras del período (propuesto) o como saldo inicial?
- **C-U8-2. Retenciones de un saldo inicial.** Se propone que el «saldo pendiente» sea lo que falta pagarle al
  proveedor **ya sin retenciones**, y que las retenciones solo se muestren. ¿Qué pasa con una retención que al corte
  **todavía no se practicó** (IVA o ISR que se retiene al pagar): quién emite la constancia y la entera si el documento
  no está en el Libro de compras de Arrancar? ¿Basta con advertir que el saldo pendiente debe ir neto y que esa
  retención se gestiona fuera, o hace falta una columna «retención por practicar» que CP4 descuente al pagar?
- **C-U8-3. Pagos parciales anteriores.** ¿Es correcto cargar el total de la factura y su saldo pendiente (y no el
  saldo como si fuera el total) para la antigüedad y el estado de cuenta?
- **C-U8-4. Saldos a favor al inicio.** ¿Una nota de crédito pendiente de aplicar al corte se carga como saldo inicial
  (abono) del proveedor? ¿Y un pago anticipado al proveedor sin factura (anticipo) queda fuera de Cuentas por pagar?
- **C-U8-5. Nota de crédito o de débito sobre una factura de antes de la fecha de inicio.** ¿Cómo se registra en el
  Libro de compras del mes en que se recibe (el libro exige hoy la factura en el sistema) y cómo debe rebajar o aumentar
  el saldo inicial en Cuentas por pagar?
- **C-U8-6. Activo fijo.** El pago de un saldo inicial que era una compra de activo fijo, ¿se clasifica como
  **inversión** en el flujo de efectivo (P2) o como operación, dado que el activo ya estaba en el balance de apertura?
- **C-U8-7. Cuadre con el balance de apertura.** ¿Debe la ventana mostrar el total de saldos pendientes (por
  proveedor) para cuadrarlo con la cuenta Proveedores del balance de apertura, y debe exigirse ese cuadre antes de
  cerrar la carga (cuando exista Contabilidad)?
