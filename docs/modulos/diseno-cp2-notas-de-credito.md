# Diseño CP2: notas de crédito de Cuentas por pagar — arquitecto de datos, 2026-11-08

Estado: **propuesta para aprobar**. Aterriza el paso **CP2** de `cuentas-por-pagar.md` tal como quedó tras CP1
(`diseno-datos-cuentas-por-pagar.md` §2: «su pantalla propia y aplicar el **saldo libre** de una nota a otra factura del
mismo proveedor (fuera de una contraseña)») y la respuesta **U13** del usuario (2026-10-20): el saldo libre que no se
compensa se liquida con un **reintegro** del proveedor por Bancos (CP4) o con un **ajuste manual con permiso, motivo y
auditoría (CP2)**. Convive con U8 (`diseno-u8-saldos-iniciales-cuentas-por-pagar.md`, aprobado y en programación) y
deja preparado CP3 (`diseno-cp3-contrasenas.md`). Lo nuevo que aparezca al programar va a §13.

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Recibir, autorizar, anular y eliminar notas | Ya está en CP1, con el mismo código que los cargos, en `cuentas_por_pagar.documentos` | U2, 2026-10-20 |
| Aplicación automática | Al recibirla, la nota rebaja su factura, luego las NDEB de esa factura; lo que sobra es **saldo libre** | CP1 §4.3 |
| Desde cuándo rebaja | Desde que se recibe, aunque esté pendiente de autorizar | U7 |
| Saldo libre | Es un **derecho de cobro frente al proveedor** (saldo deudor), no algo «por resolver» con la SAT; los reportes lo muestran aparte | C1, U13 |
| Cómo se liquida | (1) compensándolo con otra factura del mismo proveedor (**CP2**), (2) con un reintegro del proveedor que entra por Bancos (**CP4**), (3) con un **ajuste manual** con permiso, motivo y auditoría (**CP2**) | U13 |
| Aviso al recibir | «Esta nota deja Q… a favor de la empresa…» (ya programado en `dominio/avisos.ts`) | U13 |
| Saldos | Calculados, no guardados | U4 |
| Separación de funciones | Permisos distintos por acción; ningún permiso depende del tipo de rol | PLAN §3.5 |
| Pantallas de Operación | Sin Excel | Regla de secciones |
| Saldos iniciales | Una nota de crédito de saldo inicial (U8-b) tiene saldo libre `saldo_al_inicio` y se aplica igual que cualquier otra | U8 §2, §3.2 |

## 1. Lo encontrado en el código y la base

1. **`cuentas_por_pagar.aplicaciones_de_notas`** (migración `0001`): `id`, `empresa_id`, `proveedor_id`, `nota_id`,
   `cargo_id`, `monto`, autoría y marcas; checks `aplicaciones_distintos` y `aplicaciones_monto_positivo`; único
   `aplicaciones_nota_cargo_unico (nota_id, cargo_id)`; índice `aplicaciones_cargo_idx (cargo_id)`; llaves compuestas
   `aplicaciones_nota_fk` (**on delete cascade**) y `aplicaciones_cargo_fk` (no action) hacia
   `documentos (id, empresa_id, proveedor_id)` (`documentos_id_proveedor_unico`). **No guarda fecha ni de dónde salió
   la aplicación**: hoy toda aplicación es automática.
2. El único `(nota_id, cargo_id)` **impide** aplicar dos veces la misma nota al mismo cargo en fechas distintas, que es
   lo normal con aplicaciones manuales (se compensa una parte hoy y otra el mes siguiente).
3. **Quién escribe aplicaciones:** solo `RecibirDocumento.aplicarALaFactura` (por `RepositorioDeAplicaciones.agregar`).
   Quién las borra: las bajas (`borrarDeLaNota`, `borrarDelCargo`) al anular una nota o una NDEB.
4. **Fórmulas de saldo** (dominio `saldos.ts` y SQL `ConsultaBaseDeDocumentos`): cargo = `total − retenciones −
   Σ aplicaciones recibidas`; saldo libre de la nota = `total − Σ aplicaciones hechas`. U8 las cambia a
   `coalesce(saldo_al_inicio, …)`. `ConsultasDeSaldosDrizzle.notasConSaldoLibre` y `SaldoDelProveedorDto`
   (`saldosDeudores`, `notasConSaldoLibre`) ya muestran aparte los saldos deudores (U13).
5. **Reglas de baja** (`dominio/reglas-de-baja.ts`): `REGLAS_PARA_ANULAR`, `REGLAS_PARA_ELIMINAR`,
   `REGLAS_PARA_DESAUTORIZAR`, armadas en la composición para que cada paso sume las suyas.
6. **Pantallas:** las notas se ven hoy en «Documentos por pagar» (filtro `tipo`) y en su ficha
   (`NotasYAplicaciones.vue`). No hay pantalla propia ni acción sobre el saldo libre.
7. **`AccionAuditada`** (`core/compartido/aplicacion/auditoria.ts`) tiene `eliminar`, `inactivar`, `reactivar`, `anular`,
   `devolver`, `blanquear`, `corregir`, `reabrir`, `descartar`, `autorizar`, `asignar` y `quitar`. No hay una para
   «ajustar»; la tabla `core.auditoria` no tiene `check` sobre la acción (solo el tipo de TypeScript).
8. **Base de desarrollo** (consulta de solo lectura del 2026-11-08): `documentos` y `aplicaciones_de_notas` con 0
   filas. La migración igual se escribe para bases con datos.
9. **Migraciones del módulo:** la última aplicada es `0002_condiciones_desde_la_recepcion`; U8 reserva la **`0003`**.
   Esta es la **`0004_cp2_notas_de_credito`** si U8 entra antes (lo previsto). Si el orden cambia, se renumera al
   generarla; su `when` debe quedar mayor que el de la `0003` de U8.

## 2. Modelo

Tres maneras de consumir el saldo libre de una nota, cada una con su rastro:

| Forma | Qué es | Dónde se guarda | Paso |
|---|---|---|---|
| **Aplicación automática** | Al recibirla, a su factura y a sus NDEB | `aplicaciones_de_notas`, `forma = 'automatica'` | CP1 (ya existe) |
| **Aplicación manual** | El usuario compensa el saldo libre contra otro cargo del **mismo proveedor** | `aplicaciones_de_notas`, `forma = 'manual'` | **CP2** |
| Aplicación en una contraseña | La contraseña reparte las notas que incluye entre sus cargos | `aplicaciones_de_notas`, `forma = 'contrasena'` | CP3 |
| **Ajuste** | Se da de baja (todo o parte) el saldo libre que no se va a compensar ni a cobrar | `ajustes_de_saldo` | **CP2** |
| Reintegro | El proveedor devuelve el dinero; entra por Bancos | Tabla de CP4 | CP4 |

**Saldo derivado** (sigue sin guardarse):

```
saldo de un cargo        = neto − Σ aplicaciones recibidas (todas las formas) (− pagos, CP4)
saldo libre de una nota  = base − Σ aplicaciones hechas (todas las formas) − Σ ajustes vigentes (− reintegros, CP4)
   con base = coalesce(saldo_al_inicio, total)   (U8)
```

Una aplicación manual **no cambia nada fiscal**: el efecto de la nota ya quedó en el Libro de compras del mes en que se
recibió; la compensación solo dice qué deuda con el proveedor se da por saldada. Un ajuste **sí** tiene efecto contable
(baja de un derecho de cobro): publica un evento para Contabilidad (§6.4).

**Por qué los ajustes van en otra tabla y no como aplicación sin cargo:** un ajuste se **anula** (no se borra), lleva
causa y motivo, y tiene efecto contable propio; una aplicación manual se **quita** (se borra con auditoría) y no lo
tiene. Mezclarlos obligaría a columnas nulables por forma y a checks cruzados. La tabla se llama `ajustes_de_saldo`
(no «de notas») para que, si después se aprueba ajustar el saldo de un cargo (pregunta CP2-e), no haya que renombrarla.

## 3. Datos

### 3.1 Cambios en `cuentas_por_pagar.aplicaciones_de_notas`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `forma` | text | no | `default 'automatica'` (las filas existentes son automáticas); check `aplicaciones_forma_valida`: `forma in ('automatica', 'manual')` (CP3 agrega `'contrasena'`) |
| `fecha` | date | **no** (tras el relleno) | Desde cuándo rebaja el cargo. Automática: la **fecha de recepción** de la nota en Libro de compras (C2: «desde que se recibe, con fecha de recepción»). Manual: la que se escribe (§5.1). La usarán el estado de cuenta y la antigüedad de CP5 |

Restricciones que cambian:

| Nombre | Antes | Después |
|---|---|---|
| `aplicaciones_nota_cargo_unico` | unique `(nota_id, cargo_id)` | **se borra** (§1.2) |
| `aplicaciones_automatica_unica` (nuevo) | — | unique `(nota_id, cargo_id) where forma = 'automatica'`: la automática sigue siendo una por par |
| `aplicaciones_nota_idx` (nuevo) | — | `(nota_id)`: índice de la llave `aplicaciones_nota_fk` (antes lo cubría el único) |

RLS sin cambios (`politicaPorEmpresa()`). Autoría: `creado_por` = quien aplicó a mano (o quien registró en el libro,
en la automática).

### 3.2 Tabla nueva `cuentas_por_pagar.ajustes_de_saldo`

Baja (todo o parte) del saldo libre de una nota de crédito, con causa y motivo. No se borra: se anula.

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK (`idPrimario`) |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `proveedor_id` | uuid | no | solo para la llave compuesta |
| `documento_id` | uuid | no | la nota; FK `ajustes_documento_fk (documento_id, empresa_id, proveedor_id) → documentos (id, empresa_id, proveedor_id)` **on delete cascade** (ver la decisión de abajo) |
| `monto` | numeric(14,2) | no | check `ajustes_monto_positivo`: `> 0` |
| `fecha` | date | no | fecha contable del ajuste (§5.2) |
| `causa` | text | no | check `ajustes_causa_valida`: `in (<CAUSAS_DE_AJUSTE>)`; lista propuesta en §5.2, **la valida el contador** |
| `motivo` | text | no | check `ajustes_motivo_rango`: `char_length(motivo) between 1 and 300` |
| `estado` | text | no | `default 'vigente'`; check `ajustes_estado_valido`: `in ('vigente', 'anulado')` |
| `anulado_en` | timestamptz | sí | |
| `anulado_por` | uuid | sí | |
| `motivo_de_anulacion` | text | sí | check `ajustes_motivo_de_anulacion_rango`: `is null or char_length between 1 and 300` |
| `...marcasDeTiempo`, `...autoria` | | | `creado_por` = quien ajustó |

Checks de estado: `ajustes_anulacion_completa`: `(estado = 'anulado') = (anulado_en is not null and anulado_por is not
null and motivo_de_anulacion is not null)`.

Índices: `ajustes_documento_idx (documento_id)` (llave y suma por nota). Sin índice por fecha todavía: lo agrega CP5 si
un reporte lo pide. RLS: `politicaPorEmpresa()`. Sin alcance por registro (el plan no lo pide).

**Lo que revisa el dominio y no la base** (con la nota bloqueada `for update`): que `documento_id` sea una **nota de
crédito** vigente y que la suma de aplicaciones y ajustes vigentes no pase de su base. Es la misma razón de CP1 §3.2
(la clase no es columna de la llave); se cubre con pruebas de integración y con la prueba de consistencia.

**Decisión: `on delete cascade` hacia la nota.** Un ajuste **vigente** impide dar de baja la nota (regla de §5.3), así
que la cascada solo se lleva ajustes **anulados**, que quedan en el `anterior` de la auditoría de la nota eliminada. Con
`no action` una nota de saldo inicial (U8) con un ajuste anulado no se podría eliminar nunca (un saldo inicial no se
anula): quedaría atascada. Es la misma regla que CP3 usa para las contraseñas anuladas (pregunta CP2-i).

### 3.3 Migración

`0004_cp2_notas_de_credito` (§1.9), con `npm run bd:generar -w servidor -- cuentas-por-pagar cp2_notas_de_credito`,
revisada a mano. Orden:

1. `add column forma text default 'automatica' not null`, `add column fecha date`.
2. **Relleno (a mano)**, con el propietario: `update cuentas_por_pagar.aplicaciones_de_notas a set fecha =
   l.fecha_recepcion from cuentas_por_pagar.documentos n join libro_de_compras.documentos l on l.id = n.documento_id
   where n.id = a.nota_id;` y, para lo que no tenga documento en el libro (no debería haber: las notas de saldo inicial
   no tienen aplicaciones automáticas), `update … set fecha = creado_en::date where fecha is null;`. Después
   `alter column fecha set not null`.
3. `drop constraint aplicaciones_nota_cargo_unico`; `create unique index aplicaciones_automatica_unica … where forma =
   'automatica'`; `create index aplicaciones_nota_idx`; `add constraint aplicaciones_forma_valida`.
4. `create table ajustes_de_saldo` con sus checks, llaves, índice, RLS (`enable row level security` y la política).

Sin migración de permisos (son nuevos). Ninguna migración en otro esquema.

### 3.4 Mensajes de restricciones

Ninguno nuevo: `aplicaciones_automatica_unica` solo salta por un error de programación (la orden llega una vez) y los
checks los adelantan el Zod y el dominio. La llave `ajustes_documento_fk` no se viola por la cascada.

## 4. Integración con CP1 y U8 (lo que cambia en el código existente)

| Pieza | Cambio |
|---|---|
| `aplicaciones-de-notas.tablas.ts` | `forma`, `fecha`, único parcial, índice; tabla nueva `ajustes-de-saldo.tablas.ts` |
| Dominio `AplicacionDeNota` | `id`, `forma`, `fecha` (además de `notaId`, `cargoId`, `montoCentavos`) |
| `RecibirDocumento` | Guarda la aplicación automática con `fecha` = fecha de recepción de la nota (el puerto `DocumentosDeCompra` ya la lee; U8 lo cambia a `{ fechaRecepcion, serie, numero }`) |
| `saldoDe()` / `AplicadoAlDocumento` | Suma `ajustadoCentavos` (lo ajustado de la nota): `saldo libre = base − porLaNota − ajustado` |
| SQL (`ConsultaBaseDeDocumentos`) | Subconsulta `ajustadoDeLaNota` (Σ `monto` de ajustes `vigente` por `documento_id`), unida con `leftJoin`; la fila trae `ajustado`. Igual en `consultas-de-saldos.drizzle.ts` (`notasConSaldoLibre` y `saldosDeudores`) |
| `ConsultasDeCargos.paraAplicarUnaNota` | Sin cambio de lógica (la aplicación automática sigue igual) |
| DTO `DocumentoPorPagarDto` | `ajustado: string` (cero en cargos); `AplicacionDelDocumentoDto` gana `id`, `forma`, `fecha` y `puedeQuitar`; la ficha gana `ajustes: AjusteDto[]` y, en la nota, `puedeAplicar` y `puedeAjustar` (calculados en el servidor, como las demás acciones) |
| `FichaDelDocumentoDto` (auditoría) | `aplicacionesHechas`/`Recibidas` con `forma` y `fecha`; `ajustes` |
| `HechosDelDocumento` / `accionesDelDocumento` | Recibe `saldoLibreCentavos` y `ajustesVigentes`; `puedeAplicar = puedeAjustar = nota vigente con saldo libre > 0` (CP3 suma «y no está en una contraseña vigente»); `puedeAnular` y `puedeEliminar` falsos con ajustes vigentes |
| Reglas de baja | `noTenerAjustesVigentes` en `REGLAS_PARA_ANULAR` y `REGLAS_PARA_ELIMINAR` (§5.3) |
| Bajas de la nota (anular) | Como hoy, borra **todas** sus aplicaciones (también las manuales) y las deja en el `anterior` |
| Filtro de la lista | `conSaldo?: boolean`: cargos con saldo > 0 y notas con saldo libre > 0 |
| U8 `REGLAS_PARA_CORREGIR_SALDO_INICIAL` | Suma `noTenerAjustesVigentes` («ya tiene ajustes»): `SaldoInicialConMovimientos`. Las aplicaciones manuales ya las cubre «sin aplicaciones de notas (hechas ni recibidas)» |
| U8, saldo libre de una nota de saldo inicial | La base es `saldo_al_inicio`; todo lo demás igual |

**Si U8 no ha entrado cuando se programe CP2:** la base es `total` en vez de `coalesce(saldo_al_inicio, total)`; el
resto no cambia. Lo previsto es U8 primero.

## 5. Reglas

### 5.1 Aplicar manualmente el saldo libre de una nota

Una petición aplica una nota a **uno o varios** cargos (máximo 100, todo o nada), en la transacción del caso de uso:

1. Carga la nota y la bloquea (`for update`). Debe ser `nota_de_credito`, no `anulada` → si no, `NoEsNotaConSaldo`. Vale
   en `pendiente`, `registrado` o `autorizado` (U7: rebaja desde que se recibe; pregunta CP2-b).
2. CP3: si la nota está en una contraseña vigente → `NotaEnContrasena` (la reparte la contraseña).
3. Bloquea los cargos (`for update`, **en orden de id** para no cruzarse con otra aplicación). Cada uno: del **mismo
   proveedor** y la misma empresa, de clase cargo, no `anulado` → si no, `CargoNoDisponible` (nombra el documento). Vale
   en cualquier estado vigente, incluidos los de la bandeja (pregunta CP2-b). Sin repetidos en la petición.
4. Montos: cada uno `> 0` y `<=` el saldo del cargo → `AplicacionMayorQueElSaldo`; la suma `<=` el saldo libre de la nota
   → `AplicacionMayorQueElSaldoLibre`. Ambos saldos se recalculan con las filas bloqueadas.
5. Fecha (pregunta CP2-c): la que se escribe, por omisión **hoy** (`reloj`), no futura y no anterior a la fecha de
   emisión de la nota ni a la de ningún cargo → `FechaDeAplicacionInvalida`.
6. Inserta una fila por cargo con `forma = 'manual'`. Sin auditoría (es un alta; queda `creado_por`). Sin evento (§6.4).

**Propuesta de reparto** (solo pantalla; el usuario la cambia): los cargos con saldo del proveedor ordenados por
vencimiento (el más viejo primero), luego fecha de emisión; se reparte con `repartirNotaDeCredito` (ya existe y es pura).

### 5.2 Quitar una aplicación manual

1. Bloquea la nota y el cargo de la aplicación (en orden de id). La aplicación debe ser `manual` → si es automática o de
   una contraseña, `AplicacionNoSeQuita` (la automática es parte de la nota; la de contraseña se quita desde la
   contraseña).
2. CP3: si la nota está en una contraseña vigente → `NotaEnContrasena`. CP4 sumará «el cargo ya tiene pagos».
   Van en `REGLAS_PARA_QUITAR_APLICACION` (lista ampliable, como las de baja).
3. Motivo obligatorio (1–300, `motivoValido`).
4. Auditoría `quitar`, recurso `cuentas-por-pagar.aplicaciones-de-notas`, `anterior` = la aplicación con la serie y el
   número de los dos documentos; con el motivo. Borra la fila.

### 5.3 Ajustar el saldo libre (U13)

Crear:

1. Bloquea la nota; nota de crédito no anulada y, con CP3, fuera de una contraseña vigente (`NotaEnContrasena`).
2. `0 < monto <= saldo libre` → `AjusteMayorQueElSaldoLibre`. Por omisión, la pantalla propone **todo** el saldo libre.
3. Fecha: por omisión hoy; no futura ni anterior a la emisión de la nota → `FechaDeAjusteInvalida`. Cuando exista
   Contabilidad, no en un mes cerrado (regla que sumará ese módulo).
4. Causa de la lista y motivo (1–300).
5. Inserta con `estado = 'vigente'`; auditoría `ajustar` (**acción nueva** en `AccionAuditada`), recurso
   `cuentas-por-pagar.ajustes`, `anterior` = la ficha de la nota **antes** del ajuste, con el motivo; evento
   `cuentas-por-pagar.ajuste_registrado` al confirmar.

**Causas propuestas** (`CAUSAS_DE_AJUSTE`, constante del dominio; **por validar con el contador**, C-CP2-2):

| Clave | Nombre en pantalla | Cuándo |
|---|---|---|
| `incobrable` | No se recuperará | El proveedor no lo compensará ni lo devolverá (cerró, se perdió el contacto, no vale la pena cobrarlo) |
| `diferencia_menor` | Diferencia menor | Centavos o diferencias pequeñas que no se van a perseguir |
| `liquidado_fuera_del_sistema` | Liquidado fuera del sistema | Se arregló por un medio que Arrancar todavía no registra (p. ej. efectivo a caja, antes de Caja chica) |
| `otra` | Otra | Lo dice el motivo |

Anular un ajuste: con el ajuste bloqueado; `vigente` → si no, `AjusteYaAnulado`; motivo obligatorio; con CP3, la nota
fuera de una contraseña vigente. `estado = 'anulado'`, `anulado_en/por`, `motivo_de_anulacion`; auditoría `anular`,
recurso `cuentas-por-pagar.ajustes`, `anterior` = el ajuste como estaba; evento `cuentas-por-pagar.ajuste_anulado`. El
saldo libre vuelve a la nota.

**Bajas de la nota con ajustes:** `noTenerAjustesVigentes` rechaza anularla o eliminarla (desde aquí o por aviso de Libro
de compras) mientras tenga ajustes vigentes → `NotaConAjustes` («anule primero el ajuste»). Con ajustes solo anulados,
anular la nota los deja como están (rastro) y eliminarla se los lleva por la cascada, con su `anterior` en la auditoría.

### 5.4 Pantalla propia

«Notas de crédito» (Operación): las notas de crédito de la empresa, por omisión **las que tienen saldo libre**, con
filtros (proveedor, estado, con saldo libre o todas, fechas de emisión). Cada tarjeta: proveedor, serie y número, fecha,
total, aplicado, ajustado y **saldo libre**; etiqueta «Saldo inicial» si lo es (U8). Arriba, el total de saldos a favor
por proveedor (sale de la misma consulta del saldo del proveedor). La ficha es la de «Documentos por pagar» con las
secciones nuevas (§8).

## 6. Permisos, auditoría, errores y eventos

### 6.1 Permisos (`modulo.ts`, PLAN §3.5)

| Permiso | Para |
|---|---|
| `cuentas-por-pagar.documentos.ver` (ya existe) | La pantalla «Notas de crédito», la ficha, los cargos para aplicar |
| `cuentas-por-pagar.documentos.aplicar-notas` | Aplicar manualmente el saldo libre y quitar una aplicación manual |
| `cuentas-por-pagar.ajustes.crear` | Ajustar el saldo libre de una nota |
| `cuentas-por-pagar.ajustes.anular` | Anular un ajuste |

Los ajustes no tienen `.ver` propio ni lista: se ven en la ficha de la nota (con `documentos.ver`) y en el reporte de
notas de crédito de CP5 (con sus permisos de reporte). Sin `editar` (un ajuste no se corrige: se anula y se hace otro) ni
`eliminar`. Ninguno es `soloSuperacceso`. Sin migración de permisos.

### 6.2 Auditoría

| Hecho | Acción | Recurso | `anterior` |
|---|---|---|---|
| Aplicar a mano | ninguna (alta; `creado_por`) | — | — |
| Quitar una aplicación manual | `quitar` | `cuentas-por-pagar.aplicaciones-de-notas` | La aplicación con los dos documentos; con motivo |
| Ajustar | `ajustar` (**nueva**) | `cuentas-por-pagar.ajustes` | Ficha de la nota antes del ajuste; con motivo |
| Anular un ajuste | `anular` | `cuentas-por-pagar.ajustes` | El ajuste; con motivo |
| Anular o eliminar la nota | como en CP1 | `cuentas-por-pagar.documentos` | La ficha, ahora con aplicaciones manuales y ajustes |

Se audita el **alta** del ajuste (no solo su baja) porque lo pidió U13: es dar de baja dinero a favor de la empresa.

### 6.3 Errores nuevos (código propio)

| Clase | Familia | Código | Mensaje |
|---|---|---|---|
| `NoEsNotaConSaldo` | `ReglaDeNegocioInfringida` | `no_es_nota_con_saldo` | «El documento … no es una nota de crédito vigente con saldo a favor.» |
| `CargoNoDisponible` | `DatoInvalido` (campo `aplicaciones.<i>.cargoId`) | `cargo_no_disponible` | «El documento … no es un cargo vigente de este proveedor.» |
| `AplicacionMayorQueElSaldo` | `DatoInvalido` (campo `aplicaciones.<i>.monto`) | `aplicacion_mayor_que_el_saldo` | «El documento … solo debe Q….» |
| `AplicacionMayorQueElSaldoLibre` | `DatoInvalido` (campo `aplicaciones`) | `aplicacion_mayor_que_el_saldo_libre` | «La nota … solo tiene Q… a favor.» |
| `FechaDeAplicacionInvalida` | `DatoInvalido` (campo `fecha`) | `fecha_de_aplicacion_invalida` | «La fecha no puede ser futura ni anterior a la emisión de la nota o de los documentos.» |
| `AplicacionNoSeQuita` | `ReglaDeNegocioInfringida` | `aplicacion_no_se_quita` | «Esa aplicación se hizo al recibir la nota (o en una contraseña): no se quita aquí.» |
| `AjusteMayorQueElSaldoLibre` | `DatoInvalido` (campo `monto`) | `ajuste_mayor_que_el_saldo_libre` | «La nota … solo tiene Q… a favor.» |
| `FechaDeAjusteInvalida` | `DatoInvalido` (campo `fecha`) | `fecha_de_ajuste_invalida` | «La fecha no puede ser futura ni anterior a la emisión de la nota.» |
| `AjusteYaAnulado` | `ReglaDeNegocioInfringida` | `ajuste_ya_anulado` | «Ese ajuste ya está anulado.» |
| `NotaConAjustes` | `ReglaDeNegocioInfringida` | `nota_con_ajustes` | «La nota … tiene ajustes vigentes: anúlelos primero.» |
| `NotaEnContrasena` (CP3) | `ReglaDeNegocioInfringida` | `nota_en_contrasena` | «La nota … está en la contraseña N: se reparte allí; quítela de la contraseña para aplicarla o ajustarla aquí.» |

Una aplicación o un ajuste que no existe responde `RecursoNoEncontrado`. `MotivoInvalido` ya existe.

### 6.4 Eventos (`core/contratos/cuentas-por-pagar.contratos.ts` y `dominio/eventos.ts`)

```ts
'cuentas-por-pagar.ajuste_registrado': {
  empresaId: string; ajusteId: string; documentoId: string; proveedorId: string;
  montoCentavos: number; fecha: string; causa: CausaDeAjuste;
};
'cuentas-por-pagar.ajuste_anulado': { empresaId: string; ajusteId: string; documentoId: string; fecha: string };
```

Para Contabilidad (nadie los escucha todavía). `fecha` en el anulado es la de la anulación (C5: la reversión va con la
fecha de la anulación). La aplicación manual **no** publica evento: no mueve cuentas mientras los saldos deudores sigan
en Proveedores; si el contador dice que deben reclasificarse (C-CP2-4), se agrega `nota_aplicada` sin tocar datos.

## 7. Contrato de la API

Prefijo `/api/cuentas-por-pagar`. Dinero como texto con dos decimales; fechas `AAAA-MM-DD`.

| Método y ruta | Permiso | Cuerpo / consulta | Respuesta |
|---|---|---|---|
| `GET /documentos?tipo=nota_de_credito&conSaldo=true` | `documentos.ver` | filtro nuevo `conSaldo` | página de `DocumentoPorPagarDto` (con `ajustado`) |
| `GET /documentos/:documentoId/cargos-para-aplicar` | `documentos.ver` | — | `{ saldoLibre, cargos: CargoParaAplicarDto[] }` con `propuesto` por cargo |
| `POST /documentos/:documentoId/aplicaciones` | `documentos.aplicar-notas` | `{ fecha?: string; aplicaciones: [{ cargoId, monto }] }` (1–100) | ficha de la nota |
| `DELETE /aplicaciones/:aplicacionId` | `documentos.aplicar-notas` | `{ motivo }` | 204 |
| `POST /documentos/:documentoId/ajustes` | `ajustes.crear` | `{ monto, fecha?, causa, motivo }` | 201, ficha de la nota |
| `POST /ajustes/:ajusteId/anular` | `ajustes.anular` | `{ motivo }` | ficha de la nota |

`CargoParaAplicarDto`: `id`, `tipo`, `serie`, `numero`, `fechaEmision`, `vencimiento`, `estado`, `saldo`, `propuesto`,
`origen` (U8). `AjusteDto`: `id`, `monto`, `fecha`, `causa`, `motivo`, `estado`, `creadoPor` (nombre), `creadoEn`,
`anulacion` (`{ motivo, anuladoPorNombre, anuladoEn } | null`), `puedeAnular`.

**Excel:** ninguno (Operación). Los saldos a favor se exportan en los reportes de CP5.

## 8. Cliente

- `servicios/`: métodos nuevos en `ApiCuentasPorPagar` (`cargosParaAplicar`, `aplicar`, `quitarAplicacion`, `ajustar`,
  `anularAjuste`); tipos en `servicios/tipos.ts`.
- `paginas/NotasDeCredito.vue` (Operación, ≤ 120 líneas): reutiliza `FiltrosDeDocumentosPorPagar`,
  `TarjetaDeDocumentoPorPagar` y `PaginacionDeLista` con el tipo fijo y el filtro «Con saldo a favor» activo; resumen de
  saldos a favor por proveedor. Ruta `/cuentas-por-pagar/notas-de-credito` (permiso `documentos.ver`), menú en
  `seccion: 'operacion'`, textos «Notas de crédito».
- **Ficha** (`FichaDelDocumentoPorPagar.vue`): en una nota con saldo libre, botones «Aplicar a otro documento»
  (`v-permiso` `aplicar-notas`) y «Ajustar saldo» (`ajustes.crear`); la sección de aplicaciones muestra forma («Al
  recibirla», «Manual», «En contraseña N») y fecha, con «Quitar» en las manuales; sección «Ajustes» con su estado y
  «Anular».
- `componentes/VentanaDeAplicacion.vue`: los cargos del proveedor con saldo, el monto propuesto editable por fila, la
  fecha y el total contra el saldo libre (no deja confirmar si se pasa). Lógica pura en
  `composables/aplicacion-de-nota.ts` (reparto propuesto, totales, armado del cuerpo) con su `*.prueba.ts`.
- `componentes/VentanaDeAjuste.vue`: monto (propuesto: todo el saldo libre), fecha, causa (lista con ayuda de cada una),
  motivo; aviso «El ajuste da de baja dinero que el proveedor le debe a la empresa; queda en la auditoría». Anular un
  ajuste y quitar una aplicación usan la ventana de motivo que ya existe (como `VentanaDeDesautorizacion`).
- La ficha de un cargo muestra en sus aplicaciones recibidas las manuales con su nota (enlace a la ficha de la nota).
- Errores por campo con `usarFormulario`; avisos con `usarAvisos()`.

## 9. Convivencia y riesgos

1. **CP1:** la aplicación automática no cambia (solo guarda `forma` y `fecha`). Anular una nota sigue borrando sus
   aplicaciones, ahora también las manuales: el cargo que las recibió vuelve a deber. Es lo correcto (la nota dejó de
   existir) y queda en el `anterior`.
2. **U8:** una nota de saldo inicial se aplica y se ajusta igual; su base es `saldo_al_inicio`. Aplicar o ajustar la
   deja «con movimientos» y ya no se corrige ni elimina en Saldos iniciales (U8 §5). Un cargo de saldo inicial puede
   recibir aplicaciones manuales, con la misma consecuencia. Con la carga cerrada, aplicar y ajustar siguen permitidos
   (es el proceso, no la carga).
3. **CP3:** una nota en una contraseña vigente no se aplica, ni se ajusta, ni se le quitan aplicaciones aquí
   (`NotaEnContrasena`); un **cargo** en una contraseña vigente **sí** recibe aplicaciones manuales (los montos de la
   contraseña se leen vivos, CP3 §2).
4. **CP4:** sumará a `REGLAS_PARA_QUITAR_APLICACION` y a las de baja «el cargo ya tiene pagos», y el **reintegro**
   restará del saldo libre igual que el ajuste. Si se aprueba ajustar cargos (CP2-e), la misma tabla sirve.
5. **Libro de compras:** sin cambios. Anular desde el libro una nota con ajustes vigentes se rechaza con `NotaConAjustes`
   (el aviso `documento_por_anular` corre las reglas de baja).
6. **Concurrencia:** aplicar y quitar bloquean nota y cargos en orden de id; ninguna de las dos toca Libro de compras,
   así que no invierten el orden «libro, luego Cuentas por pagar» de CP1 §4.
7. **Saldos deudores en reportes:** C1 ya pidió mostrarlos aparte; CP5 los toma de la misma fórmula (con ajustes).

## 10. Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`. Va **después de U8**.

1. **CP2-1 (servidor, datos):** `forma`, `fecha`, único parcial e índice en `aplicaciones-de-notas.tablas.ts`; tabla
   `ajustes-de-saldo.tablas.ts` con `CAUSAS_DE_AJUSTE` en el dominio; migración `0004` (§3.3, con relleno);
   `RecibirDocumento` guarda `forma` y `fecha`. **Pruebas de tablas:** dos manuales del mismo par (pasa), dos
   automáticas del mismo par (falla), forma inválida, ajuste con monto 0, causa inválida, anulación incompleta, ajuste
   entre proveedores distintos (falla), cascada al eliminar la nota, RLS por empresa; relleno de `fecha`;
   `politicas-de-los-modulos` y `llaves-entre-esquemas`.
2. **CP2-2 (servidor, saldos y bajas):** `saldoDe` y SQL con ajustes, DTO con `ajustado`, aplicaciones con `id`, `forma`
   y `fecha`, filtro `conSaldo`, `accionesDelDocumento` con `puedeAplicar`/`puedeAjustar`, regla `noTenerAjustesVigentes`
   (también en la lista de U8). **Pruebas:** saldo libre con ajuste vigente y anulado; anular una nota con ajuste
   (rechazo, desde aquí y desde Libro de compras); saldo del proveedor; filtro.
3. **CP2-3 (servidor, aplicar y quitar):** dominio de §5.1–5.2, `AplicarNota`, `QuitarAplicacion`,
   `ListarCargosParaAplicar`, errores, permiso `aplicar-notas`, rutas. **Pruebas** puras (validaciones, propuesta) y de
   API: varios cargos, uno de otro proveedor, monto mayor que el saldo, suma mayor que el saldo libre, fecha futura,
   nota anulada, cargo pendiente (pasa), nota de saldo inicial (pasa), quitar automática (rechazo), quitar manual con
   auditoría `quitar`, sin permiso (403), todo o nada.
4. **CP2-4 (servidor, ajustes):** `AjustarSaldo`, `AnularAjuste`, acción `ajustar` en `AccionAuditada`, eventos,
   permisos `ajustes.crear`/`.anular`, rutas. **Pruebas:** ajuste total y parcial, mayor que el saldo libre, auditoría del
   alta y de la anulación con `anterior`, eventos tras confirmar, anular dos veces, sin permiso.
5. **CP2-5 (cliente, pantalla):** `NotasDeCredito.vue`, menú, textos, servicio y tipos.
6. **CP2-6 (cliente, ficha):** ventanas de aplicación y de ajuste, quitar y anular con motivo, secciones nuevas de la
   ficha, lógica pura con pruebas.
7. **CP2-7 (QA):** factura con retención y nota de devolución total (saldo libre = retención), aplicarla a otra factura
   del proveedor en dos partes y fechas, quitar una, ajustar el resto como «No se recuperará», anular el ajuste, intentar
   anular la nota con ajuste (rechazo desde Cuentas por pagar y desde Libro de compras), nota de saldo inicial aplicada a
   una factura del libro, permisos por separado.

## 11. Preguntas para el usuario (con recomendación)

- **CP2-a. Pantalla propia.** ¿Página «Notas de crédito» en Operación, por omisión con las que tienen saldo a favor
  (recomendado), o basta el filtro por tipo de «Documentos por pagar»? *Recomendado: página propia; reutiliza los
  componentes y deja a la vista lo que el proveedor le debe a la empresa.*
- **CP2-b. A qué cargos y desde qué nota.** ¿Se aplica a cualquier cargo vigente del proveedor (también los de la
  bandeja y los no autorizados) y desde cualquier nota vigente (también pendiente)? *Recomendado: sí, como U7 (rebaja
  desde que se recibe); autorizar sigue siendo aprobar el pago.*
- **CP2-c. Fecha de la aplicación manual.** ¿La escribe el usuario (por omisión hoy, no futura ni anterior a los
  documentos) o es siempre la de hoy? *Recomendado: la escribe, por omisión hoy* (la compensación se acuerda con el
  proveedor y a veces se registra días después). El contador lo confirma (C-CP2-1).
- **CP2-d. Quitar una aplicación manual.** ¿Con motivo obligatorio y auditoría `quitar`? *Recomendado: sí.* Las
  automáticas no se quitan nunca (son parte de la nota).
- **CP2-e. Ajuste solo del saldo libre de notas.** ¿O también del saldo de un cargo (por ejemplo, centavos que no se
  van a pagar o un descuento que el proveedor aceptó sin nota)? *Recomendado: solo notas en CP2* (es lo que pidió U13);
  las diferencias al pagar se deciden en CP4, donde la misma tabla puede servir.
- **CP2-f. Causas del ajuste.** ¿La lista de §5.3 (No se recuperará, Diferencia menor, Liquidado fuera del sistema,
  Otra) más motivo libre? ¿Hace falta que otra persona apruebe el ajuste (separación de funciones), o basta el permiso
  propio? *Recomendado: la lista que valide el contador y sin aprobación aparte* (el permiso es distinto del de
  registrar y autorizar, y todo queda en la auditoría).
- **CP2-g. Varias aplicaciones a la vez.** ¿Una nota a varios cargos en una petición (máx. 100, todo o nada) con el
  reparto propuesto por vencimiento? *Recomendado: sí.*
- **CP2-h. Permisos.** ¿`documentos.aplicar-notas`, `ajustes.crear` y `ajustes.anular` (recomendado) o un solo permiso
  para todo lo de notas?
- **CP2-i. Ajustes anulados al eliminar la nota.** ¿Se van con ella (cascada, quedan en el `anterior` de la auditoría;
  recomendado, porque si no una nota de saldo inicial con un ajuste anulado no se podría eliminar nunca) o bloquean la
  eliminación?

## 12. Lo que debe validar `contador-guatemala`

- **C-CP2-1. Compensación con otra factura.** Compensar el saldo a favor de una nota (por ejemplo, la retención que sobró
  de una devolución total) contra otra factura del mismo proveedor: ¿hace falta algún respaldo (acuerdo escrito,
  constancia del proveedor)? ¿La fecha de la compensación es la del acuerdo (que se escribe) o la del registro?
- **C-CP2-2. Ajuste del saldo a favor.** ¿Son correctas las causas propuestas? ¿Cómo se contabiliza cada una cuando
  exista Contabilidad (gasto, otros gastos, pérdida en cuentas incobrables) y qué requisitos pide la Ley del ISR para
  que una baja de un derecho de cobro sea deducible (art. 21 del Decreto 10-2012 u otro; confirmar)? ¿Debe pedir un
  documento de respaldo?
- **C-CP2-3. Aplicar a un cargo no autorizado o pendiente.** ¿Hay algún inconveniente de control en compensar contra una
  factura que todavía no se aprobó para pago?
- **C-CP2-4. Presentación de los saldos deudores.** Si un proveedor queda con saldo a favor de la empresa, ¿se
  reclasifica al cierre como cuenta por cobrar (NIIF para las Pymes, presentación de activos y pasivos sin compensar)?
  Si sí, la aplicación manual moverá cuentas y necesitará su evento (§6.4).
- **C-CP2-5. Ajuste con fecha en un mes ya declarado o cerrado.** ¿Algún efecto fiscal? (Se espera que no: el ajuste no
  toca el crédito fiscal de la nota.)

## 13. Pendiente nuevo

(Vacío: lo que aparezca al programar.)
