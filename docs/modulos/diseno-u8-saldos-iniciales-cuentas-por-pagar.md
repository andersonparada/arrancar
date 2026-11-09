# Diseño U8: saldos iniciales de Cuentas por pagar — arquitecto de datos, 2026-11-08

Estado: **aprobado, listo para programar** (2026-11-08). El usuario respondió todas las preguntas (§11) y ya están
aplicados los cambios del dictamen del contador (`dictamen-u8-saldos-iniciales-2026-11-08.md`, «correcto con
ajustes»). Aterriza la pregunta **U8** de `diseno-datos-cuentas-por-pagar.md` (respuesta del usuario del 2026-10-20:
«saldos iniciales justo después de CP1»; las dos formas de pago extra van con CP4), su §8, las secciones «Saldos
iniciales de cuentas por pagar» y «Fecha de inicio y carga inicial» de `HOJA-DE-RUTA.md`, y la carga inicial de
Empresas (H5a, `diseno-esquema-empresas.md`). Lo nuevo que aparezca al programar va a §13.

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Cuándo | La carga (alta, edición, eliminación, Excel, ligada a la carga inicial) justo después de CP1; las dos formas de pago extra («ligar al cheque o nota de saldo inicial de Bancos» y «aplicar a la cuenta de apertura»), con CP4 | U8, 2026-10-20 |
| Qué se carga | **Documento por documento**, los **registrados en el sistema anterior** que siguen pendientes al cierre del día anterior a la fecha de inicio, con su fecha y vencimiento reales; no un saldo global por proveedor | Hoja de ruta, 2026-09-28; C-U8-1 |
| Qué son | Marcados «de saldo inicial»: no piden concepto de gasto ni entran al Libro de compras; su efecto fiscal ya ocurrió en el sistema anterior | Hoja de ruta; C-U8-1 |
| Retenciones | «Retenciones» = **todas** las del documento; el saldo pendiente va **neto de todas**; las que la empresa todavía no practicó se anotan aparte (`retenciones_por_practicar`, informativa) y CP4 **no** las descuenta | C-U8-2, U8-c, respuesta de 2026-11-08 |
| Proceso | Hacen **todo su proceso**: autorizar, contraseña y pago | Hoja de ruta |
| Dónde viven | En `cuentas_por_pagar.documentos` (una sola tabla), con `origen` y `documento_id` nulable; `documentos.id` ya es propio para esto | §3.1 y §8 del diseño de CP1 |
| Ventana | De **Administración**, con Excel (importa y exporta), y su cuadre exportable | Hoja de ruta, regla de secciones, C-U8-7 |
| Carga inicial | Abierta: se corrige libremente; cerrada: ya no se agregan saldos; reabrir es de Empresas (permiso, motivo y auditoría) | Hoja de ruta y H5a |
| Fecha de inicio | «Primer día que se registra en Arrancar; los saldos iniciales son los del cierre del día anterior». Se recomienda el día 1 de un mes (mejor el 1 de enero); se advierte, no se prohíbe | C-U8-1, respuesta de 2026-11-08 |
| Moneda | **Solo quetzales** (moneda extranjera, más adelante) | Respuesta de 2026-11-08 |
| Contabilización | Autorizar o desautorizar un saldo inicial **no genera partida**; la partida de apertura sale de la carga inicial con la fecha del corte | Dictamen, «Otros errores» 2 |

## 1. Lo encontrado en el código y la base

1. **`cuentas_por_pagar.documentos`** (migración `0001`) tiene `documento_id uuid not null`, la llave compuesta
   `documentos_documento_fk (documento_id, empresa_id, proveedor_id, destino) → libro_de_compras.documentos`, el único
   `documentos_documento_unico (documento_id)` y el único `documentos_para_notas_unico (documento_id, empresa_id,
   proveedor_id)`. Las tres aceptan `null` sin cambios: con `MATCH SIMPLE` una llave con una columna nula no se revisa,
   y un único admite varios nulos.
2. **La llave de las notas apunta al id del libro:** `documentos_factura_fk (documento_afectado_id, empresa_id,
   proveedor_id) → cuentas_por_pagar.documentos (documento_id, empresa_id, proveedor_id)` (a mano en la `0001`). Una
   nota del libro **no puede** apuntar a un saldo inicial (no tiene `documento_id`): es parte del hueco de §9.3 y U8-l
   tendrá que cambiar esa llave (o la columna) para que apunte a `documentos.id`.
3. **Todo el módulo supone que hay documento en Libro de compras:**
   - `ConsultaBaseDeDocumentos.seleccionar()` hace `innerJoin` con los documentos del libro para serie, número,
     recepción, período y anulación; igual las consultas de aplicaciones, la lista de notas de la ficha y
     `consultas-de-saldos.drizzle.ts` (notas con saldo libre). Un saldo inicial **desaparecería** de todas.
   - `AutorizarDocumentos` y `DesautorizarDocumento` llaman `marcarProcesado` del puerto de Libro de compras;
     `AnularDocumento` y `EliminarDocumento` hablan con el libro. Con `documentoId = null` las cuatro fallarían.
   - `netoDe()` (dominio, `saldos.ts` y `documento-por-pagar.ts`) y `saldoDelCargo()` (SQL) calculan
     `total − retenciones`.
   - Los eventos `cuentas-por-pagar.documento_autorizado`, `documento_desautorizado` y `documento_anulado`
     (`dominio/eventos.ts` y `servidor/src/modulos/core/contratos/cuentas-por-pagar.contratos.ts`) llevan
     `documentoDeCompraId: string`. Nadie los escucha todavía (Contabilidad no existe): cambiarlos no rompe nada.
   - El DTO tiene `documentoId`, `fechaRecepcion` y `periodo` como `string` (no nulos), y el cliente enlaza a la ficha
     de Libro de compras con `documentoId`.
4. **El nombre `origen` ya se usa** en el código con otro sentido: `OrigenDelDocumento` (`aplicacion/puertos/
   puertos-de-consultas.ts`; serie, número y proveedor leídos del libro, para `etiquetaDe`) y el
   `origen: 'cuentas-por-pagar'` de las órdenes de baja a Libro de compras. La columna se llama `origen`; el paso
   U8-2 renombra el tipo interno.
5. **`proveedor_id` no tiene llave propia**: hoy lo cubre la llave compuesta hacia el libro. Un saldo inicial quedaría
   sin ninguna llave hacia `terceros.proveedores`.
6. **Nombres de restricciones ya usados en Libro de compras** (mismo nombre de tabla `documentos`, otro esquema):
   `documentos_proveedor_fk`, `documentos_proveedor_idx`, `documentos_serie_valida`, `documentos_numero_valido`,
   `documentos_del_proveedor_unico`. `MENSAJES_POR_RESTRICCION` (`core/compartido/infraestructura/
   errores-de-postgres.ts`) busca **sin esquema**, y solo para `23505` (únicos) y `23P01` (exclusión); el `23503`
   (llave foránea) siempre responde `RecursoEnUso` sin mirar el nombre, y los `check` (`23514`) no se traducen. Aun
   así, los nombres nuevos de este diseño no repiten ninguno del repositorio.
7. **Carga inicial de Empresas** (`empresas.cargas_iniciales`): la orden del mediador `empresas.obtener_carga_inicial`
   (`core/contratos/empresas.contratos.ts`, atendida en `empresas/composicion/datos-de-empresa.ts` por
   `AtenderOrdenesDeDatosDeEmpresa`) responde `{ fechaDeInicio: string | null, cerrada: boolean }` y toma un bloqueo
   compartido (cerrar o cambiar la fecha espera). **Ningún módulo la usa todavía**: Cuentas por pagar será el primero.
   `EstablecerFechaDeInicio` cambia la fecha mientras la carga esté abierta **sin avisar a nadie**. Los avisos entre
   módulos dentro de la transacción ya existen (`AvisosEntreModulos`, p. ej. `empresas.empresa_guardada`).
8. **Libro de compras** no tiene ninguna regla con la fecha de inicio y exige que toda nota apunte a una factura
   **suya** (`documentos_nota_con_factura`, `documentos_nota_factura_fk`). Sus avisos que no bloquean se arman en
   `avisos-del-documento.ts` con el `ContextoFiscal` (`cargador-de-contexto-fiscal.ts`) y salen al calcular, al
   registrar y al confirmar la bandeja de DTE; el cliente ya los muestra (`AvisosDelRegistro`,
   `ResultadosDeLaConfirmacion`).
9. **Unicidad en Libro de compras:** `documentos_del_proveedor_unico (empresa_id, proveedor_id, tipo,
   coalesce(serie,''), numero) where estado = 'vigente'`. Serie y número en mayúsculas, sin espacios, de 1 a 40
   (`documentos_serie_valida`, `documentos_numero_valido`).
10. Bancos ya resolvió su saldo inicial a mano (`composicion/saldos-iniciales.ts`, `http/saldos-iniciales.*`, y en el
    cliente `VentanaDeSaldoInicial`, `CamposDeSaldoInicial`, `edicion-de-saldo-inicial.ts`): eliminar pide motivo, la
    corrección se audita como `corregir` y el intercambio reutiliza el caso de uso del formulario. Es el modelo a
    copiar. Un reporte que solo exporta se registra con `rutasDeIntercambio` y solo el permiso `exportar`
    (`bancos/http/correlativos.rutas.ts`): así sale el cuadre.
11. **Base de desarrollo** (consulta de solo lectura del 2026-11-08): `cuentas_por_pagar.documentos` tiene 0 filas; una
    empresa tiene fecha de inicio 2026-10-04 con la carga abierta. La migración igual se escribe para bases con datos.
12. **Migraciones:** Cuentas por pagar va en la `0002_condiciones_desde_la_recepcion` (`when` `1792547740190`); la
    siguiente es la **`0003`**. El `when` más alto del repositorio es el de Libro de compras
    `0034_u17_documentos_unicos_por_cuenta`: `1794151754950`.

## 2. Modelo: qué es un saldo inicial

Una fila de `cuentas_por_pagar.documentos` con `origen = 'saldo_inicial'`:

| Dato | Saldo inicial | Documento de Libro de compras |
|---|---|---|
| `documento_id` | nulo | el del libro |
| Serie y número | propios (se escriben) | copiados del libro al recibir (U8-a) |
| Recepción, período, anulación del libro | no tiene | del libro |
| `tipo` | lo elige quien carga (§3.2) | copia |
| `documento_afectado_id` | siempre nulo | la factura de una nota |
| `total`, `retenciones` | se escriben; `retenciones` = **todas** las del documento | copia |
| **`saldo_al_inicio`** | **lo que faltaba pagarle al proveedor** al cierre del día anterior a la fecha de inicio, sin retenciones | nulo |
| **`retenciones_por_practicar`** | la parte de `retenciones` que la empresa todavía no practicó (0 si ninguna); informativa | nulo |
| **`referencia`** | opcional: cómo se llama el documento en el sistema anterior | nulo |
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

`retenciones_por_practicar` **no entra** en ninguna de las dos fórmulas.

Por qué guardar `saldo_al_inicio` y no solo el total: una factura **pagada en parte** antes de la fecha de inicio es
común, y la antigüedad y el estado de cuenta deben mostrar la factura con su total real y lo que de verdad se debe
(C-U8-3). La ficha y el estado de cuenta muestran además la línea **derivada, sin guardarla**: «Pagos y notas
anteriores a la fecha de inicio» = `total − retenciones − saldo_al_inicio` (cero si no hubo).

**Consecuencias para CP4 y CP5 (dejar escrito en sus diseños):**

1. El saldo de un saldo inicial **ya es neto de todas las retenciones**: la regla «las retenciones se descuentan en el
   primer pago» **no** se aplica a las filas `saldo_inicial` (la `retencion_descontada` de `pago_aplicaciones` va en
   cero para ellas). Descontar `retenciones_por_practicar` sería una resta doble.
2. Al pagar un saldo inicial con `retenciones_por_practicar > 0`, CP4 **avisa sin descontar**: «Este documento tiene
   Q… de retenciones por practicar del sistema anterior: emita la constancia en Retenciones Web y entérela. Arrancar
   no las descuenta del pago.»
3. Ajustar un saldo de apertura con la carga **cerrada** («aplicar a la cuenta de apertura») es una **corrección de
   error de períodos anteriores** (NIIF para las Pymes, secc. 10.21) o un ajuste del período, **no** un movimiento
   contra la cuenta puente de apertura (dictamen, U8-d).
4. CP5 (estado de cuenta, antigüedad) y la ficha muestran «Pagos y notas anteriores a la fecha de inicio». En el flujo
   de efectivo (P2), el pago de un saldo inicial con `tiene_activo_fijo` va a **inversión** (C-U8-6).

## 3. Datos

### 3.1 Cambios en `cuentas_por_pagar.documentos`

Sin tablas nuevas. RLS sin cambios (`politicaPorEmpresa()`); sin alcance por registro. Autoría y marcas de tiempo ya
están (`creado_por` = quien cargó o importó).

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `origen` | text | no | `default 'libro_de_compras'`. Las filas existentes quedan como `libro_de_compras` sin rellenar nada |
| `documento_id` | uuid | **sí** (antes no) | ver `documentos_origen_y_documento` |
| `serie` | text | sí | En **toda** fila (U8-a): copiada del libro al recibir y rellenada en la migración |
| `numero` | text | **no** (tras el relleno) | igual |
| `saldo_al_inicio` | numeric(14,2) | sí | solo el saldo inicial |
| `retenciones_por_practicar` | numeric(14,2) | sí | solo el saldo inicial (ahí no nulo, 0 si no hay) |
| `referencia` | text | sí | solo el saldo inicial; opcional; 1–60 caracteres sin espacios al inicio ni al final |

**Largo de `referencia`: 60.** Es un texto libre corto para cuadrar contra el sistema anterior («Póliza 2025-12-0345
línea 12», «CXP-004512»); 60 caben en una columna de Excel y en una tarjeta sin cortar. No se pasa a mayúsculas ni
se le quitan espacios internos. No entra en ningún único (dos documentos pueden venir de la misma póliza).

Checks nuevos (nombres `documentos_<regla>`, ninguno repetido en el repositorio):

| Nombre | Definición |
|---|---|
| `documentos_origen_valido` | `origen in ('libro_de_compras', 'saldo_inicial')` |
| `documentos_origen_y_documento` | `(origen = 'libro_de_compras') = (documento_id is not null)` |
| `documentos_saldo_al_inicio_de_saldos` | `(origen = 'saldo_inicial') = (saldo_al_inicio is not null)` |
| `documentos_saldo_al_inicio_valido` | `saldo_al_inicio is null or (saldo_al_inicio > 0 and saldo_al_inicio <= total - retenciones)` (en la nota de crédito `retenciones = 0`, así que el tope es su total) |
| `documentos_por_practicar_de_saldos` | `(origen = 'saldo_inicial') = (retenciones_por_practicar is not null)` |
| `documentos_por_practicar_valido` | `retenciones_por_practicar is null or (retenciones_por_practicar >= 0 and retenciones_por_practicar <= retenciones)` (la nota de crédito y el recibo, con `retenciones = 0`, quedan en 0) |
| `documentos_referencia_de_saldos` | `origen = 'saldo_inicial' or referencia is null` |
| `documentos_referencia_valida` | `referencia is null or (char_length(referencia) between 1 and 60 and referencia = btrim(referencia))` |
| `documentos_saldo_inicial_sin_nota_afectada` | `origen = 'libro_de_compras' or documento_afectado_id is null` |
| `documentos_saldo_inicial_completado` | `origen = 'libro_de_compras' or estado in ('registrado', 'autorizado')` (nunca pendiente ni anulado) |
| `documentos_serie_de_compra_valida` | `serie is null or (char_length(btrim(serie)) between 1 and 40 and btrim(serie) = upper(btrim(serie)) and btrim(serie) !~ '\s')` — mismo texto que `documentos_serie_valida` de Libro de compras, con otro nombre |
| `documentos_numero_de_compra_valido` | igual para `numero` (sin `is null`: es obligatorio) |

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
| `documentos_proveedor_por_pagar_fk` | `(proveedor_id) → terceros.proveedores (id)`, **no action** | Un saldo inicial quedaría sin llave al proveedor. No action: un proveedor con documentos en Cuentas por pagar no se borra (responde el `RecursoEnUso` genérico; ver §1.6). La cuenta del proveedor la garantiza el caso de uso (lo busca con RLS por cuenta). Terceros es `dependeDe` transitivo (`libro-de-compras` → `terceros`) |
| `documentos_proveedor_por_pagar_idx` | `(proveedor_id)` | Índice de la llave (el de `(empresa_id, proveedor_id, vencimiento)` no sirve al borrar un proveedor) |
| `documentos_numero_por_proveedor_unico` | unique `(empresa_id, proveedor_id, (familia), coalesce(serie, ''), numero) where estado <> 'anulado'`, con `familia` = `case when tipo in (<los seis tipos de factura>) then 'factura' else tipo end` | Un documento no se debe dos veces: ni dos saldos iniciales iguales ni un saldo inicial y el mismo documento recibido del libro. Ver la decisión de abajo |
| `documentos_saldos_iniciales_idx` | `(empresa_id, proveedor_id, fecha_emision) where origen = 'saldo_inicial'` | Lista de la ventana, exportación y cuadre |

**Decisión: `tipo` en el único (pedido por el contador, U8-a).** Si el único lleva `tipo` tal cual, quien carga una
factura de pequeño contribuyente como «factura» (o al revés) y después la registra en el libro con su tipo correcto
la debería dos veces sin que la base lo note. Quitar `tipo` del todo tampoco sirve: el único vale para **todas** las
filas, también las que vienen del libro, y un recibo o una nota de débito en papel del mismo proveedor pueden repetir
el número de una factura sin serie; el único bloquearía un registro legítimo en el libro (la orden
`recibir_documento` corre en su transacción). **Se agrupa por familia**: los seis tipos de factura (`factura`,
`factura_pequeno_contribuyente`, `factura_pequeno_contribuyente_electronico`, `factura_contribuyente_agropecuario`,
`factura_primario_pecuario`, `factura_especial`) cuentan como uno; `nota_de_credito`, `nota_de_debito` y `recibo`
siguen por su tipo. Es justo donde está el error probable (elegir la variante equivocada de factura) y donde no hay
coincidencias legítimas: un mismo proveedor no emite dos facturas con la misma serie y número aunque cambie de
régimen (en FEL la serie y el número salen de la autorización; en papel, cada resolución trae su serie). La lista de
la familia sale de una constante del dominio de Cuentas por pagar (`TIPOS_DE_FACTURA`, en `tipos-de-documento.ts`)
que arma el `case` del índice; una prueba revisa que los tipos de la familia más los otros tres sean
`TIPOS_DE_DOCUMENTO`.

El único nuevo es más estricto que `documentos_del_proveedor_unico` del libro solo en la familia: dos documentos
vigentes del libro con destino Cuentas por pagar, mismo proveedor, serie y número y distinta variante de factura
chocarían. Es un error de datos, no un caso real; la migración lo revisa antes de crear el índice (§3.3).

### 3.2 Tipos admitidos

Todos los cargos (`factura`, las cuatro familias sin crédito, `factura_especial`, `recibo` y `nota_de_debito` sin
factura afectada) y la `nota_de_credito` con saldo a favor (U8-b), como abono sin factura afectada ni vencimiento. La
`factura_especial` lleva sus retenciones; el recibo, cero. **Un anticipo a proveedor sin factura no es una nota de
crédito** y no se carga aquí (es un activo; cuando CP4 defina los anticipos, los del corte se cargarán con esa forma).

### 3.3 Migración

`0003_u8_saldos_iniciales` en `servidor/src/modulos/cuentas-por-pagar/migraciones/`, con
`npm run bd:generar -w servidor -- cuentas-por-pagar u8_saldos_iniciales` y revisada a mano. Su `when` lo pone
drizzle-kit con la hora: debe quedar **mayor que `1792547740190`** (`0002` de este módulo) y mayor que
`1794151754950` (Libro de compras `0034`); revisarlo en el commit.

Orden de las sentencias (las que drizzle-kit no escribe van a mano en el archivo generado, en este orden):

1. `add column origen text default 'libro_de_compras' not null`, `serie text`, `numero text`, `saldo_al_inicio
   numeric(14,2)`, `retenciones_por_practicar numeric(14,2)`, `referencia text`.
2. **Relleno (a mano)** con el propietario (la tabla no tiene `force row level security`, así que el dueño ve todas
   las empresas): `update cuentas_por_pagar.documentos d set serie = l.serie, numero = l.numero from
   libro_de_compras.documentos l where l.id = d.documento_id;` y después `alter column numero set not null`.
3. **Revisión previa del único (a mano):** un bloque `do $$ … $$` que cuenta los grupos que violarían
   `documentos_numero_por_proveedor_unico` y, si hay alguno, lanza `raise exception` con un mensaje en español («Hay N
   documentos por pagar repetidos con distinto tipo de factura: corríjalos en Libro de compras antes de migrar»). Así
   el fallo dice qué pasa en vez del `23505` genérico.
4. `alter column documento_id drop not null`.
5. `drop constraint documentos_nota_con_factura` y `add` con la definición nueva.
6. `add constraint` de los checks nuevos, la llave `documentos_proveedor_por_pagar_fk` y los índices.

Sin migración de permisos (son nuevos: el acceso total los recibe solo). Ninguna migración en otro esquema. No se edita
después de aplicada en producción.

### 3.4 Mensajes de restricciones (`MENSAJES_POR_RESTRICCION`)

| Restricción | Mensaje |
|---|---|
| `documentos_numero_por_proveedor_unico` | «Ese documento ya está en Cuentas por pagar (como saldo inicial o desde el libro de compras).» Lo verá también quien registre en **Libro de compras** un documento que ya es saldo inicial (la orden `recibir_documento` corre en su transacción) |
| `documentos_proveedor_por_pagar_fk` | Sin mensaje propio: el `23503` responde `RecursoEnUso` genérico (§1.6). Cambiarlo es del core y no hace falta para U8 |
| Checks (`documentos_saldo_al_inicio_valido`, `documentos_por_practicar_valido`, `documentos_referencia_valida`…) | Error de programación si ocurre (el esquema Zod y el dominio validan antes con los errores de §6.3); no llevan mensaje |

## 4. Integración con CP1 (lo que cambia en el código existente)

| Pieza | Cambio |
|---|---|
| Dominio `DocumentoPorPagar` | `documentoId: string \| null`; `origen: 'libro_de_compras' \| 'saldo_inicial'`; `saldoAlInicioCentavos`, `retencionesPorPracticarCentavos` y `referencia`, nulos fuera del saldo inicial; `serie`, `numero` |
| `netoDe()` | `saldoAlInicioCentavos ?? total − retenciones` (cargos); `saldoDe()` para la nota usa `saldoAlInicioCentavos ?? total` |
| `saldoDelCargo()` (SQL) | `coalesce(saldo_al_inicio, total − retenciones) − coalesce(aplicado, 0)`; igual en `consultas-de-saldos` y en el saldo libre de las notas |
| Consultas (`seleccionar`, aplicaciones, notas de la ficha, saldos) | `innerJoin` con el libro → **`leftJoin`**; serie y número salen de la fila propia |
| `HechosDelDocumento` / `accionesDelDocumento` | Recibe `origen`; para el saldo inicial `puedeAnular = false` y `puedeEliminar = false` (se elimina desde su ventana). `puedeAutorizar`, `puedeDesautorizar` y `puedeCambiarVencimiento`, igual que cualquier cargo |
| `AutorizarDocumentos` / `DesautorizarDocumento` | Si `origen = 'saldo_inicial'`, **no** llaman `marcarProcesado` (no hay documento en el libro); el resto igual (separación de funciones, auditoría de lo propio, `devolver`) |
| `AnularDocumento` / `EliminarDocumento` (rutas de Documentos) | Rechazan el saldo inicial con `EsUnSaldoInicial` antes de hablar con Libro de compras |
| Bajas por aviso de Libro de compras | Sin cambio: buscan por `documento_id`, que el saldo inicial no tiene |
| `RecibirDocumento` | Copia `serie` y `numero`: el puerto `DocumentosDeCompra` (hoy lee la fecha de recepción) pasa a leer `{ fechaRecepcion, serie, numero }` de una vez. Si el documento ya es saldo inicial, el único lo rechaza y Libro de compras no registra nada |
| Bandeja | Sin cambio: el saldo inicial nunca está `pendiente` |
| Eventos (`dominio/eventos.ts` y `core/contratos/cuentas-por-pagar.contratos.ts`) | `documentoDeCompraId: string \| null` y `origen` en `documento_autorizado`, `documento_desautorizado` y `documento_anulado` (este último nunca saldrá de un saldo inicial). El TSDoc del contrato dice: **con `origen = 'saldo_inicial'` no generan partida**; el pasivo de apertura lo contabiliza la carga inicial con la fecha del corte (y la cuenta puente) |
| DTO `DocumentoPorPagarDto` y ficha | `origen`; `documentoId`, `fechaRecepcion` y `periodo` pasan a `string \| null`; `saldoAlInicio`, `retencionesPorPracticar`, `referencia` y `anterioresAlInicio` (la línea derivada «Pagos y notas anteriores a la fecha de inicio», dinero) como `string \| null`. Lista de Documentos con filtro opcional `origen` |
| `OrigenDelDocumento` y `etiquetaDe` | Se renombra a `DatosDelLibro` para no confundirlo con la columna; `etiquetaDe` usa la serie y el número de la fila |
| Reglas de baja (`REGLAS_PARA_*`) | Sin cambio en CP1. CP3 y CP4 sumarán sus reglas; las del saldo inicial (§5) son una lista aparte, ampliable igual |

**Libro de compras no cambia en la parte de datos de U8.** Un saldo inicial no es un documento del libro: no aparece
en el libro, en sus reportes, en sus retenciones ni en la conciliación de DTE. Lo que el libro «nota» es que registrar
el mismo documento con destino Cuentas por pagar falla por el único. El único cambio que U8 le pide es el **aviso de
fecha anterior a la fecha de inicio** (paso U8-8, §9.1).

## 5. Reglas del saldo inicial

Al **crear** (y en cada fila importada), en la transacción del caso de uso:

1. Pide `empresas.obtener_carga_inicial` por el mediador (bloqueo compartido: nadie cierra la carga ni cambia la fecha
   hasta que termine). Sin fecha de inicio → `FechaDeInicioSinRegistrar`; cerrada → `CargaInicialCerradaParaSaldos`.
2. **Fecha de emisión estrictamente anterior a la fecha de inicio** (`fecha_emision < fecha_de_inicio`) →
   `EmisionNoAnteriorAlInicio`. Es condición necesaria, no suficiente (C-U8-1): el criterio de fondo es que el
   documento **ya esté registrado en el sistema anterior**. Uno emitido antes y recibido después, sin registrar allá,
   **va al Libro de compras** de Arrancar. El sistema no puede saberlo: lo dicen la ventana, la ayuda y la hoja de
   instrucciones del Excel (§7.1, §8).
3. Proveedor: existe en la cuenta (consulta con RLS a `terceros.proveedores` desde `infraestructura`) y está activo →
   si no, `ProveedorNoDisponible`.
4. Serie y número: se limpian como en Libro de compras (`btrim`, mayúsculas, sin espacios, 1–40; la serie es
   opcional). Lo hace una función del dominio de Cuentas por pagar (no se importa del libro).
5. Montos: `total > 0`; `0 <= retenciones <= total` (**todas** las retenciones del documento, practicadas o no); nota
   de crédito con retenciones = 0 (`RetencionesInvalidas`); `0 < saldo pendiente <= total − retenciones`
   (`SaldoPendienteInvalido`): el saldo pendiente es **lo que falta pagarle al proveedor, sin retenciones**;
   `0 <= retenciones por practicar <= retenciones` (`RetencionesPorPracticarInvalidas`; vacío = 0).
6. Referencia: se recorta; vacía = nula; más de 60 caracteres la rechaza el esquema Zod (error por campo).
7. Vencimiento: la nota de crédito no lleva (`VencimientoInvalido`, ya existe); un cargo sin vencimiento recibe la
   **propuesta de siempre** (`proponerVencimiento` con los días de crédito del proveedor o el plazo por omisión, contado
   desde la emisión porque no hay recepción); con vencimiento, `>= fecha_emision`. Puede ser anterior a la fecha de
   inicio (ya venció). La ventana recomienda escribir el real cuando se conozca; el ensayo del Excel muestra el
   propuesto.
8. Inserta con `origen = 'saldo_inicial'`, `estado = 'registrado'`, `registrado_en = now()`, `registrado_por` =
   quien carga. Sin aplicación automática ni avisos (no hay factura afectada).
9. El único `documentos_numero_por_proveedor_unico` rechaza el repetido.

Al **corregir** (`PUT`) y al **eliminar**: además de 1 (carga abierta), con la fila bloqueada (`for update`):

- Es un saldo inicial (si no, `RecursoNoEncontrado`: por esta ruta no existe).
- `estado = 'registrado'` → si está `autorizado`, `SaldoInicialAutorizado` («desautorícelo antes»; la autorización
  aprobó un monto y no se cambia por debajo).
- Sin aplicaciones de notas (hechas ni recibidas) → `SaldoInicialConMovimientos`. CP3 suma «no está en una contraseña
  vigente» y CP4 «no tiene pagos», en la lista `REGLAS_PARA_CORREGIR_SALDO_INICIAL` (Chain of Responsibility, como las
  reglas de baja).
- Corregir vuelve a correr las validaciones 2 a 7 y deja `registrado_en/por` = quien corrige, para que tampoco pueda
  autorizar lo que corrigió sin `autorizar-propios` (la separación de funciones ya mira `registrado_por` y
  `creado_por`).
- Eliminar exige motivo (1–300, `motivoValido` de CP1), como el saldo inicial de Bancos.

**Corregir sirve para errores de carga**, incluida una nota de crédito o de débito **anterior al corte** que se olvidó
restar o sumar. **No** sirve para reflejar una nota recibida **después** de la fecha de inicio: esa va al Libro de
compras del mes en que se recibe (C-U8-5) y hoy todavía no se puede registrar (§9.3).

Con la carga **cerrada**: el saldo inicial sigue su proceso (autorizar, desautorizar, cambiar el vencimiento,
contraseña y pago), pero no se agrega, corrige ni elimina. Lo cargado por error se arregla reabriendo la carga
(Empresas) o, desde CP4, con la forma de pago «aplicar a la cuenta de apertura» (corrección de error, §2).

**Si cambia la fecha de inicio** (la carga sigue abierta; U8-e, paso U8-6): `EstablecerFechaDeInicio`, cuando ya había
carga y la fecha cambia, manda por el mediador el aviso `empresas.fecha_de_inicio_por_cambiar { empresaId,
fechaDeInicio }` dentro de su transacción (nuevo en `AvisosEntreModulos` de `core/contratos/empresas.contratos.ts`).
Cuentas por pagar lo escucha y rechaza si algún saldo inicial quedaría con `fecha_emision >= fecha nueva`
(`SaldosInicialesPosterioresALaFecha`, con cuántos son); el error corta la transacción y la fecha no cambia. Bancos
podrá escuchar el mismo aviso. Mover la fecha **hacia atrás** con saldos anteriores a la fecha nueva pasa sin más.

## 6. Permisos, auditoría y errores

### 6.1 Permisos (`modulo.ts`, PLAN §3.5)

| Permiso | Para |
|---|---|
| `cuentas-por-pagar.saldos-iniciales.ver` | La ventana de Administración (lista, ficha y cuadre). En Documentos por pagar se siguen viendo con `documentos.ver` |
| `cuentas-por-pagar.saldos-iniciales.crear` | Cargar uno |
| `cuentas-por-pagar.saldos-iniciales.editar` | Corregirlo |
| `cuentas-por-pagar.saldos-iniciales.eliminar` | Eliminarlo |
| `cuentas-por-pagar.saldos-iniciales.importar` | Importar (y bajar la plantilla) |
| `cuentas-por-pagar.saldos-iniciales.exportar` | Exportar la lista y el cuadre |

Autorizar, desautorizar y cambiar el vencimiento usan los permisos de `documentos` (es el mismo proceso). Los permisos
de la carga inicial (cerrar, reabrir) son de Empresas. Ninguno es `soloSuperacceso`. Sin migración de permisos.

### 6.2 Auditoría

| Hecho | Acción | Recurso | `anterior` |
|---|---|---|---|
| Eliminar | `eliminar` | `cuentas-por-pagar.saldos-iniciales` | `SaldoInicialDto` como estaba; con el motivo |
| Corregir | `corregir` (ya existe; Bancos la usa igual) | igual | `SaldoInicialDto` como estaba |
| Alta (formulario o Excel) | ninguna | — | queda en `creado_por` |
| Autorizar lo propio, desautorizar | como en CP1 | `cuentas-por-pagar.documentos` | ficha |

Cambiar la fecha de inicio, cerrar y reabrir la carga se auditan en Empresas, como hoy.

### 6.3 Errores nuevos (`dominio/errores.ts` o `aplicacion/errores.ts`, código propio)

| Clase | Familia | Código | Mensaje |
|---|---|---|---|
| `FechaDeInicioSinRegistrar` | `ReglaDeNegocioInfringida` | `fecha_de_inicio_sin_registrar` | «Registre la fecha de inicio de la empresa (Empresas → Fecha de inicio y carga inicial) antes de cargar saldos iniciales.» |
| `CargaInicialCerradaParaSaldos` | `ReglaDeNegocioInfringida` | `carga_inicial_cerrada_para_saldos` | «La carga inicial de la empresa está cerrada: reábrala en Empresas para agregar, corregir o eliminar saldos iniciales.» |
| `EmisionNoAnteriorAlInicio` | `DatoInvalido` (campo `fechaEmision`) | `emision_no_anterior_al_inicio` | «Un saldo inicial es un documento registrado en el sistema anterior, emitido antes de la fecha de inicio (dd/mm/aaaa). Lo emitido desde esa fecha, o lo que no se registró en el sistema anterior, va al Libro de compras.» |
| `SaldoPendienteInvalido` | `DatoInvalido` (campo `saldoPendiente`) | `saldo_pendiente_invalido` | «El saldo pendiente es lo que falta pagarle al proveedor, sin retenciones: debe ser mayor que cero y no pasar del total menos las retenciones (Q…).» |
| `RetencionesInvalidas` | `DatoInvalido` (campo `retenciones`) | `retenciones_invalidas` | «Las retenciones (todas las del documento) no pueden pasar del total; una nota de crédito no lleva retenciones.» |
| `RetencionesPorPracticarInvalidas` | `DatoInvalido` (campo `retencionesPorPracticar`) | `retenciones_por_practicar_invalidas` | «Las retenciones por practicar son parte de las retenciones del documento: no pueden pasar de Q….» |
| `ProveedorNoDisponible` | `DatoInvalido` (campo `proveedorId`) | `proveedor_no_disponible` | «Ese proveedor no existe o está inactivo.» |
| `SaldoInicialAutorizado` | `ReglaDeNegocioInfringida` | `saldo_inicial_autorizado` | «El saldo inicial … ya está autorizado: desautorícelo para corregirlo o eliminarlo.» |
| `SaldoInicialConMovimientos` | `ReglaDeNegocioInfringida` | `saldo_inicial_con_movimientos` | «El saldo inicial … ya tiene notas aplicadas (o está en una contraseña, o tiene pagos): no se corrige ni se elimina.» |
| `EsUnSaldoInicial` | `ReglaDeNegocioInfringida` | `es_un_saldo_inicial` | «El documento … es un saldo inicial: no se anula; corríjalo o elimínelo en Administración → Saldos iniciales mientras la carga inicial esté abierta.» |
| `SaldosInicialesPosterioresALaFecha` | `ReglaDeNegocioInfringida` | `saldos_iniciales_posteriores_a_la_fecha` | «Hay N saldos iniciales de Cuentas por pagar emitidos desde esa fecha: corríjalos o elimínelos antes de cambiar la fecha de inicio.» |

Un saldo inicial que no existe (o es un documento del libro, por la ruta de saldos) responde `RecursoNoEncontrado`.

## 7. Contrato de la API

Prefijo `/api/cuentas-por-pagar/saldos-iniciales`. Dinero como texto con dos decimales, en quetzales; fechas
`AAAA-MM-DD`.

**Solicitud** (`esquemaSaldoInicial`, Zod; la misma para crear, corregir e importar):

```ts
{
  proveedorId: uuid;
  tipo: TipoDeDocumento;              // §3.2
  serie: string | null;               // 1–40; se limpia como en el libro
  numero: string;                     // 1–40
  fechaEmision: string;               // fecha
  vencimiento: string | null;         // null = propuesta; prohibido en nota de crédito
  total: string;                      // dinero > 0
  retenciones: string;                // dinero >= 0, todas las del documento; por omisión '0.00'
  retencionesPorPracticar: string;    // dinero >= 0, parte de las retenciones; por omisión '0.00'
  saldoPendiente: string;             // dinero > 0, lo que falta pagarle al proveedor
  referencia: string | null;          // hasta 60; vacía = null
  tieneActivoFijo: boolean;           // por omisión false
}
```

**Respuesta** `SaldoInicialDto`: `id`, `proveedorId`, `proveedorNombre`, `proveedorNit`, `tipo`, `serie`, `numero`,
`referencia`, `fechaEmision`, `vencimiento`, `total`, `retenciones`, `retencionesPorPracticar`, `saldoPendiente` (el de
la fecha de inicio), `anterioresAlInicio` (derivado), `saldo` (el de hoy, tras notas y pagos), `estado`,
`tieneActivoFijo`, `creadoEn`, y calculados en el servidor `puedeCorregir` y `puedeEliminar` (carga abierta, estado y
movimientos; el permiso lo mira el cliente con `v-permiso`).

**Cuadre** `CuadreDeSaldosIniciales` (C-U8-7; suma `saldo_al_inicio`, no el saldo de hoy):

```ts
{
  carga: { fechaDeInicio: string | null; cerrada: boolean };
  proveedores: Array<{
    proveedorId; proveedorNombre; proveedorNit; documentos: number;
    cargos: string;                   // suma de saldos al inicio de los cargos
    notasAFavor: string;              // suma de saldos al inicio de las notas de crédito
    neto: string;                     // cargos − notas a favor (puede ser negativo: saldo deudor)
    retencionesPorPracticar: string;
  }>;
  general: { documentos; cargos; notasAFavor; neto; retencionesPorPracticar };
}
```

| Método y ruta | Permiso | Cuerpo / consulta | Respuesta |
|---|---|---|---|
| `GET /saldos-iniciales` | `saldos-iniciales.ver` | `proveedorId?`, `pagina`, `limite` | `{ carga: { fechaDeInicio, cerrada }, elementos, total, pagina, limite }` (la carga viene del mediador, para que la ventana diga si se puede cargar) |
| `GET /saldos-iniciales/cuadre` | `saldos-iniciales.ver` | — | `CuadreDeSaldosIniciales` |
| `GET /saldos-iniciales/cuadre/exportar` | `saldos-iniciales.exportar` | — | `.xlsx` (una fila por proveedor y la del total; `rutasDeIntercambio` solo con `exportar`, como los correlativos de Bancos) |
| `GET /saldos-iniciales/:id` | `saldos-iniciales.ver` | — | `SaldoInicialDto` |
| `POST /saldos-iniciales` | `saldos-iniciales.crear` | solicitud | 201, `SaldoInicialDto` |
| `PUT /saldos-iniciales/:id` | `saldos-iniciales.editar` | solicitud | `SaldoInicialDto` |
| `DELETE /saldos-iniciales/:id` | `saldos-iniciales.eliminar` | `{ motivo }` (1–300) | 204 |
| `GET /saldos-iniciales/exportar` | `saldos-iniciales.exportar` | — | `.xlsx` |
| `GET /saldos-iniciales/plantilla` | `saldos-iniciales.importar` | — | `.xlsx` |
| `POST /saldos-iniciales/importar?ensayo=true\|false` | `saldos-iniciales.importar` | archivo | `ResultadoDeImportacion` |

Las rutas fijas (`cuadre`, `exportar`, `plantilla`) ganan a `/:id` en Fastify, y `:id` se valida como uuid.

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
| `referencia` | Referencia del sistema anterior | no | texto (hasta 60) |
| `fechaEmision` | Fecha de emisión | sí | fecha |
| `vencimiento` | Vencimiento | no | fecha (vacío = propuesta) |
| `total` | Total | sí | decimal |
| `retenciones` | Retenciones (todas) | no | decimal (vacío = 0) |
| `retencionesPorPracticar` | Retenciones por practicar | no | decimal (vacío = 0) |
| `saldoPendiente` | Saldo pendiente | sí | decimal |
| `tieneActivoFijo` | Activo fijo | no | siNo |

Las opciones de proveedor las da una consulta propia de Cuentas por pagar (`opciones-de-proveedores.drizzle.ts`, en
`infraestructura`, lee `terceros.proveedores` + `terceros.terceros` activos de la cuenta con RLS; lectura permitida
porque Terceros llega por el `dependeDe` transitivo). Sin `sinAsignarAlCrear` (no hay alcance).

**Hoja de instrucciones** (textos del contador, C-U8-1 a C-U8-4):

- «Cargue solo los documentos **registrados en el sistema anterior** que siguen pendientes de pago al cierre del día
  anterior a la fecha de inicio (dd/mm/aaaa). Lo emitido antes pero no registrado allá va al Libro de compras.»
- «Retenciones: **todas** las del documento, ya practicadas o no.»
- «Saldo pendiente: **lo que falta pagarle al proveedor, sin retenciones** (total menos retenciones menos lo pagado y
  las notas anteriores a la fecha de inicio).»
- «Retenciones por practicar: la parte de las retenciones que la empresa todavía no practicó. Es informativa: no
  cambia el saldo pendiente; al pagar, la empresa emite la constancia y la entera.»
- «Una nota de crédito con saldo a favor se carga con su saldo libre. **Un anticipo a proveedor no es una nota de
  crédito**: no se carga aquí.»
- «Solo quetzales.»

Rendimiento: 5,000 filas × (mediador + proveedor + condiciones + insert) en una transacción, del orden de lo que ya hace
Bancos. Si molesta, `CrearSaldoInicial` puede recibir la carga ya leída del primer llamado de la misma transacción
(memoria por transacción); no hace falta para empezar.

## 8. Cliente

**No conviene `npm run generar -- recurso`:** genera una tabla, una migración y un recurso de servidor propios, y el
saldo inicial vive en `documentos` con reglas que no son de catálogo (carga inicial, estado, movimientos). Bancos hizo
lo mismo a mano. Se copia la forma de Bancos (`VentanaDeSaldoInicial`, `CamposDeSaldoInicial`,
`edicion-de-saldo-inicial.ts` con su prueba, la eliminación con motivo) y la lista de `terceros`.

- `servicios/`: `ApiSaldosIniciales` (`saldos-iniciales.api.ts`, con `cuadre()`) e
  `intercambioDe('/cuentas-por-pagar/saldos-iniciales')` y `intercambioDe('/cuentas-por-pagar/saldos-iniciales/cuadre')`
  (solo exportar); tipos en `servicios/tipos.ts` (`origen`, nulos de §4).
- `paginas/SaldosIniciales.vue` (Administración, ≤ 120 líneas): encabezado con el estado de la carga («Fecha de inicio:
  04/10/2026 · Carga abierta», o el aviso de que falta la fecha o de que está cerrada, con enlace a Empresas);
  `AccionesDeIntercambio` (importar, exportar) y «Nuevo saldo inicial» solo con la carga abierta y su permiso; filtro
  por proveedor; tarjetas `TarjetaDeRegistro` con proveedor, documento (y referencia), emisión, vencimiento, total,
  saldo pendiente y saldo de hoy, y la etiqueta «Autorizado» si lo está.
- **Cuadre** (`componentes/CuadreDeSaldosIniciales.vue`): totales generales siempre a la vista (cargos, notas a favor,
  neto y retenciones por practicar, por separado; no un solo neto) y la tabla por proveedor al desplegar, con su botón
  de exportar (permiso `exportar`). Texto: «Compare estos totales con el balance de apertura: cargos menos notas a
  favor contra Proveedores; las retenciones por practicar, contra Retenciones por pagar si los libros anteriores
  llevaban Proveedores sin descontarlas».
- **Avisos fijos de la ventana** (textos del contador): «Cargue solo documentos registrados en el sistema anterior que
  siguen pendientes al cierre del día anterior a la fecha de inicio» y «Las notas de crédito o de débito recibidas
  desde la fecha de inicio sobre estos documentos todavía no se pueden registrar: no corrija el saldo pendiente por
  ellas» (§9.3).
- `componentes/VentanaDeSaldoInicial.vue` y `CamposDeSaldoInicial.vue` (`defineModel`, emiten `guardar` y `cerrar`):
  proveedor (selector), tipo, serie, número, referencia («cómo se llama en el sistema anterior», opcional), emisión,
  vencimiento (ayuda: «vacío = según los días de crédito del proveedor; mejor escriba el real si lo conoce»), total,
  retenciones (ayuda: «todas las del documento»), retenciones por practicar (ayuda: «la parte que la empresa todavía
  no practicó; no cambia el saldo»), saldo pendiente (se propone `total − retenciones` al escribir el total, editable;
  ayuda: «lo que falta pagarle al proveedor, sin retenciones»), activo fijo. La nota de crédito oculta el vencimiento y
  las retenciones; ayuda del tipo: «un anticipo no es una nota de crédito».
- `composables/edicion-de-saldo-inicial.ts` (lógica pura, con `*.prueba.ts`): formulario ↔ API, propuesta del saldo
  pendiente, campos visibles por tipo, tope de las retenciones por practicar. `usar-saldos-iniciales.ts` (`usarCarga`),
  `usar-cuadre-de-saldos-iniciales.ts` y `usar-formulario-de-saldo-inicial.ts` (`usarFormulario`, errores por campo,
  incluidos `fechaEmision`, `saldoPendiente` y `retencionesPorPracticar`).
- Eliminar con `usarAvisos().confirmar` y motivo (ventana pequeña, como Bancos).
- `modulo.ts`: ruta `/cuentas-por-pagar/saldos-iniciales` (permiso `saldos-iniciales.ver`), entrada de menú en
  `seccion: 'administracion'`; `textos.ts`: «Saldos iniciales».
- **Documentos por pagar y su ficha:** etiqueta «Saldo inicial» en la tarjeta; la ficha no enlaza a Libro de compras
  si `documentoId` es nulo, muestra «Saldo al inicio», «Pagos y notas anteriores a la fecha de inicio», la referencia y
  las retenciones por practicar, y, con permiso, «Corregir en Saldos iniciales»; sin «Anular» ni «Eliminar» (ya vienen
  en falso del servidor); filtro «Origen» en la lista.
- **Empresas** (`SeccionDeCargaInicial.vue`, `usar-cierre-de-carga.ts`): ayuda de la fecha de inicio «Primer día que se
  registra en Arrancar; los saldos iniciales son los del cierre del día anterior»; si la fecha no es día 1 de un mes,
  aviso que no bloquea: «Se recomienda el día 1 de un mes (mejor el 1 de enero, inicio del período del ISR): partir un
  mes entre dos sistemas obliga a armar a mano el libro de compras y la declaración de ese mes»; la confirmación de
  cerrar la carga añade «Antes de cerrar, compare el cuadre de los saldos iniciales de cada módulo con el balance de
  apertura». Es lógica de pantalla (sin servidor) y va en su propio paso.

## 9. Convivencia y riesgos

1. **Libro de compras — aviso de crédito fiscal doble (paso U8-8):** cuando un documento tiene `fecha_emision` anterior
   a la fecha de inicio de la empresa, el libro avisa (sin bloquear): «Esta factura es de antes de la fecha de inicio
   (dd/mm/aaaa). Regístrela solo si no estaba en el libro de compras del sistema anterior.» Va en
   `avisos-del-documento.ts`, con la fecha de inicio cargada en el `ContextoFiscal` por la orden
   `empresas.obtener_carga_inicial` (Empresas es esencial; el bloqueo compartido solo hace esperar un cierre de la
   carga durante esa transacción). Sale al calcular, al registrar y al confirmar la bandeja de DTE, que ya muestran
   los avisos; vale con la carga abierta o cerrada, y sin fecha de inicio no hay aviso. Es código de Libro de
   compras, pedido por U8.
2. **Libro de compras — único compartido:** registrar en el libro un documento que ya es saldo inicial (mismo
   proveedor, familia de tipo, serie y número, destino Cuentas por pagar) falla con el mensaje de §3.4 y no se guarda
   nada. Un documento del libro con otro destino (pagado de contado) no se cruza con los saldos iniciales: lo cubre el
   aviso del punto 1.
3. **Nota de crédito o de débito del proveedor sobre una factura de antes de la fecha de inicio (hueco U8-l):** va al
   **Libro de compras del mes en que se recibe** (rebaja o aumenta el crédito fiscal; C-U8-5), pero el libro exige
   que la nota apunte a una factura **suya** y la de antes del corte no está ahí. **Hoy no se puede registrar**, y
   **no** se corrige el saldo pendiente del saldo inicial en su lugar (falsearía la apertura y la nota nunca entraría
   al libro). Mientras tanto, solo el aviso «Las notas sobre facturas de antes de la fecha de inicio todavía no se
   pueden registrar» (ventana de Saldos iniciales, §8). **U8-l es de Libro de compras**, va después de U8 y **antes de
   producción con una empresa con historia** (lo sufre cualquier empresa con historia, use o no Cuentas por pagar).
   Propuesta del contador para planificarlo: el libro acepta una nota con «factura anterior a la fecha de inicio» y
   sus datos escritos (serie, número, fecha, si tuvo crédito), solo si esa fecha es anterior a la fecha de inicio;
   Cuentas por pagar la busca entre sus saldos iniciales y la aplica, para lo que `documento_afectado_id` y
   `documentos_factura_fk` (§1.2) deberán poder apuntar a una fila propia.
4. **Conciliación de DTE de la SAT:** mostraría lo emitido antes del corte como «pendiente de registrar». Mejora
   futura (fuera de U8): excluirlo o marcarlo con la fecha de inicio. Ver P-U8-1 en §13.
5. **Bancos:** sin cambios. La forma de pago «ligar al cheque o nota de saldo inicial de Bancos» es de CP4. Cuando
   Bancos ligue su saldo inicial a la carga inicial, debe usar la misma definición de fecha de inicio.
6. **Proveedores:** la llave nueva impide borrar un proveedor con documentos en Cuentas por pagar (antes lo impedía la
   llave de Libro de compras para los suyos). Terceros ya ofrece inactivar.
7. **Empresas:** primer uso real de `empresas.obtener_carga_inicial`; suma el aviso `empresas.fecha_de_inicio_por_cambiar`
   (paso U8-6) y los textos de §8 (paso U8-11).
8. **Cuadre y cierre de la carga:** por ahora, cerrar la carga es **solo confirmación** (con el recordatorio de §8).
   **Cuando exista Contabilidad:** los saldos iniciales de cada módulo se contabilizan contra la **cuenta puente de
   apertura**, y Empresas **bloquea** el cierre si la puente no queda en cero, con salida por un permiso propio y un
   motivo auditado. El control vive en Empresas porque el cuadre es de todos los módulos. Queda para el diseño de
   Contabilidad.
9. **Concurrencia:** cerrar la carga o cambiar su fecha espera a la importación en curso (bloqueo compartido); dos
   importaciones del mismo documento a la vez: una gana y la otra recibe el `23505` traducido.
10. **Borrar la empresa:** `empresa_id … on delete cascade` ya existe; la llave del proveedor es `no action` y se
    revisa al final del comando, como el resto.

## 10. Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`. Servidor: 1 a 8
(`programador-backend`); cliente: 9 a 11 (`programador-frontend`); 12, QA (`pruebas-qa`). U8-6 (fecha de inicio)
conserva su número y es obligatorio.

1. **U8-1 (servidor, datos):** columnas, checks, llave e índices de §3.1 en `documentos.tablas.ts` y
   `documentos.restricciones.ts` (con `TIPOS_DE_FACTURA` en `tipos-de-documento.ts` para el único); migración
   `0003_u8_saldos_iniciales` (§3.3: relleno, revisión previa del único, `when` mayor que `1794151754950`); mensaje de
   §3.4; `DocumentoPorPagar` y el mapeador con `origen`, `documentoId` nulable, `saldoAlInicioCentavos`,
   `retencionesPorPracticarCentavos`, `referencia`, serie y número; `netoDe` y `saldoDe`. Para que compile, las
   cuatro acciones de §4 rechazan ya el saldo inicial o saltan `marcarProcesado`. **Pruebas de tablas:** cada check
   nuevo con un caso que lo viola (saldo inicial con `documento_id`, del libro sin él, saldo al inicio mayor que el
   neto, por practicar mayor que las retenciones, por practicar o referencia en una fila del libro, referencia con
   espacios al borde o de 61, saldo inicial `pendiente`, saldo inicial con nota afectada, serie con espacios), llave
   del proveedor, único repetido (dos saldos iniciales; saldo inicial y documento del libro; «factura» contra
   «factura de pequeño contribuyente» choca; factura contra recibo del mismo número no choca), relleno de serie y
   número, RLS por empresa con un saldo inicial; `politicas-de-los-modulos` y `llaves-entre-esquemas`.
2. **U8-2 (servidor, CP1 con dos orígenes):** `leftJoin` en las consultas, `saldoDelCargo` con `coalesce`, DTO y ficha
   con `origen`, nulos y `anterioresAlInicio`, filtro `origen`, `accionesDelDocumento` con `origen`, renombre de
   `OrigenDelDocumento`, eventos con `documentoDeCompraId` nulable y `origen` (TSDoc: el saldo inicial no genera
   partida), `RecibirDocumento` copia serie y número, `EsUnSaldoInicial` en anular y eliminar. **Pruebas:** un saldo
   inicial (sembrado en la prueba) aparece en la lista, la ficha y el saldo del proveedor con el neto correcto y sin
   restar las retenciones por practicar; autorizarlo y desautorizarlo no tocan Libro de compras y el evento lleva
   `origen`; anularlo y eliminarlo por Documentos se rechazan; registrar en el libro el mismo documento falla y no
   guarda nada; todas las de CP1 siguen pasando.
3. **U8-3 (servidor, casos de uso):** puerto `CargaInicial` en `aplicacion/puertos` implementado con el mediador;
   puerto de proveedores; dominio `SaldoInicial` (validaciones de §5) y `REGLAS_PARA_CORREGIR_SALDO_INICIAL`;
   `CrearSaldoInicial`, `CorregirSaldoInicial`, `EliminarSaldoInicial`, `ListarSaldosIniciales`,
   `ObtenerSaldoInicial`; errores de §6.3; auditoría de §6.2. **Pruebas puras** (validaciones, reglas, retenciones por
   practicar, referencia) **y de integración** (sin fecha, carga cerrada, emisión igual a la fecha de inicio,
   proveedor inactivo, saldo mayor que el neto, por practicar mayor que las retenciones, vencimiento propuesto,
   autorizado no se corrige, con nota aplicada no se elimina, corregir cambia `registrado_por`, auditoría `corregir` y
   `eliminar` con su `anterior`).
4. **U8-4 (servidor, rutas y permisos):** permisos de §6.1 en `modulo.ts`, `composicion/saldos-iniciales.ts`,
   `http/saldos-iniciales.{rutas,controlador,esquemas-http}.ts`. **Pruebas de API** (`app.inject`): cada ruta con y sin
   su permiso, 201/204, errores por campo, la carga en la lista.
5. **U8-5 (servidor, Excel):** columnas de §7.1, opciones de proveedores por nombre o NIT, hoja de instrucciones con
   los textos de §7.1, `crearIntercambio` y `rutasDeIntercambio`. **Pruebas:** plantilla, exportar, importar con
   ensayo, una fila mala no guarda nada, repetido dentro del archivo y contra lo cargado, proveedor por NIT y por
   nombre repetido, carga cerrada, retenciones por practicar vacías = 0.
6. **U8-6 (servidor, cambio de la fecha de inicio; obligatorio):** aviso `empresas.fecha_de_inicio_por_cambiar` en
   `core/contratos/empresas.contratos.ts` y en `EstablecerFechaDeInicio` (solo si ya había carga y la fecha cambia);
   escucha de Cuentas por pagar con `SaldosInicialesPosterioresALaFecha`. **Pruebas:** cambiar la fecha con saldos
   posteriores (rechazo, nada cambia), sin ellos o hacia atrás (pasa); módulo inactivo (no escucha).
7. **U8-7 (servidor, cuadre):** consulta del cuadre (§7, por proveedor y general, sobre `documentos_saldos_iniciales_idx`),
   `GET /saldos-iniciales/cuadre` y su exportación con `rutasDeIntercambio` (solo `exportar`). **Pruebas:** totales
   separados con cargos, una nota a favor y retenciones por practicar; proveedor con neto negativo; el saldo de hoy
   no cambia el cuadre (suma el saldo al inicio); permisos de ver y exportar; el `.xlsx` trae la fila del total.
8. **U8-8 (servidor, Libro de compras: aviso de fecha anterior a la fecha de inicio):** fecha de inicio en el
   `ContextoFiscal` por el mediador y el aviso de §9.1 en `avisos-del-documento.ts`. **Pruebas:** emisión anterior a
   la fecha (aviso al calcular, registrar y confirmar desde la bandeja), igual o posterior (sin aviso), empresa sin
   fecha de inicio (sin aviso), carga cerrada (sigue el aviso).
9. **U8-9 (cliente, Documentos con dos orígenes):** tipos y servicio, etiqueta «Saldo inicial», ficha sin enlace al
   libro y con «Saldo al inicio», «Pagos y notas anteriores a la fecha de inicio», referencia y retenciones por
   practicar; filtro «Origen»; pruebas de la lógica pura que cambie.
10. **U8-10 (cliente, ventana de Administración y cuadre):** página, ventana, campos, cuadre, avisos fijos,
    composables y pruebas de §8; menú y textos.
11. **U8-11 (cliente, Empresas):** ayuda de la fecha de inicio, aviso si no es día 1 de un mes (lógica pura con prueba
    en `datos-de-empresa.ts`) y el recordatorio del cuadre en la confirmación de cierre (§8).
12. **U8-12 (QA):** de punta a punta: sin fecha de inicio (aviso), fecha de inicio el 15 (aviso de día 1) y luego
    01/11; cargar a mano una factura pagada en parte (ver «Pagos y notas anteriores»), una de pequeño contribuyente
    con retenciones por practicar y una nota de crédito a favor; revisar el cuadre y exportarlo; importar 20 filas con
    dos errores (ensayo) y luego bien; corregir, eliminar con motivo; autorizar con otro usuario; verlos en Documentos
    por pagar y en el saldo del proveedor; registrar en Libro de compras el mismo documento (rechazo) y otro de
    octubre (aviso de fecha anterior); cambiar la fecha de inicio a una anterior a un saldo (rechazo); cerrar la carga
    (ya no se agrega ni corrige) y reabrirla.

## 11. Decisiones del usuario (respondidas el 2026-11-08)

El usuario aceptó todas las recomendaciones con las precisiones del dictamen del contador. Quedan aplicadas en este
diseño:

| Pregunta | Respuesta | Dónde |
|---|---|---|
| U8-a. Serie y número | En **todos** los documentos (copiados al recibir y rellenados en la migración); el arquitecto evaluó `tipo` en el único: se agrupa la familia de factura | §3.1, §3.3 |
| U8-b. Notas de crédito a favor | Sí, como abono sin factura afectada ni vencimiento; un anticipo no es nota de crédito | §3.2 |
| U8-c. Monto | Total, **todas** las retenciones y saldo pendiente (sin retenciones) | §2, §5 |
| U8-d. Corregir y eliminar | Solo con la carga abierta, en `registrado` y sin movimientos; autorizado se desautoriza primero | §5 |
| U8-e. Cambio de la fecha de inicio | **Indispensable**: paso U8-6 obligatorio | §5, §10 |
| U8-f. Motivo al eliminar | Obligatorio; la corrección se audita como `corregir` | §6.2 |
| U8-g. Vencimiento vacío | Se propone desde la emisión; se recomienda el real; el ensayo muestra el propuesto | §5, §8 |
| U8-h. Proveedor inactivo | No se le cargan saldos | §5 |
| U8-i. Referencia | **Sí**, corta (60) y opcional | §3.1, §7 |
| U8-l. Notas sobre facturas de antes del corte | Hueco de **Libro de compras**; después de U8 y **antes de producción con una empresa con historia** | §9.3 |
| Retenciones pendientes al corte | **Opción B**: `retenciones_por_practicar` informativa, total en la ventana y en el cuadre, aviso en CP4 sin descontar | §2, §3.1, §7, §8 |
| Fecha de inicio | «Primer día en Arrancar», recomendando el día 1 de un mes, con aviso sin prohibir | §8 (Empresas) |
| Aviso en Libro de compras | Sí, para emisión anterior a la fecha de inicio | §9.1, paso U8-8 |
| Cuadre al cerrar la carga | Ahora solo confirmación; con Contabilidad, bloquear si la puente no está en cero, con salida por permiso y motivo auditado | §9.8 |
| Moneda | Solo quetzales | «Ya decidido» |

## 12. Validación del contador (C-U8-1 a C-U8-7, respondidas)

Dictamen `dictamen-u8-saldos-iniciales-2026-11-08.md`, aplicado así: C-U8-1 (corte: estrictamente anterior y
registrado en el sistema anterior) en §5 y textos; C-U8-2 (neto de todas las retenciones, por practicar informativas)
en §2, §3.1 y §7.1; C-U8-3 (total, retenciones y saldo; línea derivada) en §2; C-U8-4 (nota a favor sí, anticipo no)
en §3.2; C-U8-5 (notas posteriores al libro del mes; sin corrección provisional) en §5 y §9.3; C-U8-6 (activo fijo a
inversión) en §2; C-U8-7 (totales separados, cuadre exportable, puente en cero con Contabilidad) en §7, §8 y §9.8.

## 13. Pendiente nuevo (no frena U8)

- **P-U8-1 (usuario):** la bandeja de DTE de la SAT de Libro de compras traerá, al empezar, los DTE emitidos antes de
  la fecha de inicio (ya registrados en el sistema anterior). Con U8-8 cada uno avisa al confirmarlo. ¿Además se
  ocultan o se marcan en la bandeja y en la conciliación de DTE? *Recomendado: marcarlos «anterior a la fecha de
  inicio» y dejarlos fuera de la conciliación, en un paso de Libro de compras junto con U8-l.*
