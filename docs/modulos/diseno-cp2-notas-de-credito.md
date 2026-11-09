# Diseño CP2: notas de crédito de Cuentas por pagar — arquitecto de datos, 2026-11-08

Estado: **aprobado, listo para programar** (2026-11-08). El usuario aceptó todas las recomendaciones (CP2-a a i, §11) y
las preguntas depuradas del dictamen del contador (`dictamen-cp2-cp3-2026-11-08.md`, «correcto con ajustes») con su
recomendación; este documento ya trae aplicados los «Cambios que los diseños deben recibir» y lo «Para el arquitecto de
datos» del dictamen. Aterriza el paso **CP2** de `cuentas-por-pagar.md` tal como quedó tras CP1
(`diseno-datos-cuentas-por-pagar.md` §2: «su pantalla propia y aplicar el **saldo libre** de una nota a otra factura del
mismo proveedor (fuera de una contraseña)») y la respuesta **U13** del usuario (2026-10-20). Convive con U8
(`diseno-u8-saldos-iniciales-cuentas-por-pagar.md`: U8-1 y U8-2 ya en `main`) y deja preparado CP3
(`diseno-cp3-contrasenas.md`). Lo nuevo que aparezca al programar va a §13.

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Recibir, autorizar, anular y eliminar notas | Ya está en CP1, con el mismo código que los cargos, en `cuentas_por_pagar.documentos` | U2, 2026-10-20 |
| Aplicación automática | Al recibirla, la nota rebaja su factura, luego las NDEB de esa factura; lo que sobra es **saldo libre** | CP1 §4.3 |
| Desde cuándo rebaja | Desde que se recibe, aunque esté pendiente de autorizar | U7 |
| Saldo libre | Es un **derecho de cobro frente al proveedor** (saldo deudor), no algo «por resolver» con la SAT; los reportes lo muestran aparte | C1, U13 |
| Cómo se liquida | (1) compensándolo con otra factura del mismo proveedor (**CP2**), (2) con un **reintegro** del proveedor (**CP4**, por Bancos **o en efectivo**), (3) con un **ajuste manual** con permiso, motivo y auditoría (**CP2**) | U13; usuario, 2026-11-08 |
| Aviso al recibir | «Esta nota deja Q… a favor de la empresa…» (ya programado en `dominio/avisos.ts`) | U13 |
| Saldos | Calculados, no guardados | U4 |
| Separación de funciones | Permisos distintos por acción; ningún permiso depende del tipo de rol. Sin segunda aprobación del ajuste: basta su permiso, el tope de «diferencia menor» y el reporte mensual de ajustes (CP5) | PLAN §3.5; CP2-f |
| Pantallas de Operación | Sin Excel | Regla de secciones |
| Saldos iniciales | Una nota de crédito de saldo inicial (U8-b) tiene saldo libre `saldo_al_inicio` y se aplica igual que cualquier otra | U8 §2, §3.2 |
| Causas del ajuste | `no_recuperable` y `diferencia_menor` (con pérdida) y `compensado_con_otra_cuenta` (sin pérdida, transitoria). **Sin** «liquidado fuera del sistema» (si el proveedor devolvió dinero es un cobro: reintegro de CP4) **ni** «otra» | Dictamen C-CP2-2; usuario, 2026-11-08 |
| Cargo con aplicaciones manuales recibidas | Anularlo o eliminarlo (desde aquí o por aviso de Libro de compras) se **rechaza**: «quite primero la aplicación de la nota N» | Dictamen C-CP2-3; usuario, 2026-11-08 |
| Bancarización | Aviso sin bloquear al compensar contra un cargo de total ≥ umbral (variable de instalación, Q30,000) y campo opcional «referencia del acuerdo» | Dictamen C-CP2-1; usuario, 2026-11-08 |
| Ajustar una nota pendiente | No: el ajuste exige la nota **registrada o autorizada**. Aplicarla a otros cargos sí se puede desde pendiente | Dictamen, otros errores 12; usuario, 2026-11-08 |

## 1. Lo encontrado en el código y la base

1. **`cuentas_por_pagar.aplicaciones_de_notas`** (migración `0001`): `id`, `empresa_id`, `proveedor_id`, `nota_id`,
   `cargo_id`, `monto`, autoría y marcas; checks `aplicaciones_distintos` y `aplicaciones_monto_positivo`; único
   `aplicaciones_nota_cargo_unico (nota_id, cargo_id)`; índice `aplicaciones_cargo_idx (cargo_id)`; llaves compuestas
   `aplicaciones_nota_fk` (**on delete cascade**) y `aplicaciones_cargo_fk` (no action) hacia
   `documentos (id, empresa_id, proveedor_id)` (`documentos_id_proveedor_unico`). **No guarda fecha ni de dónde salió
   la aplicación**: hoy toda aplicación es automática.
2. El único `(nota_id, cargo_id)` **impide** aplicar dos veces la misma nota al mismo cargo en fechas distintas, que es
   lo normal con aplicaciones manuales (se compensa una parte hoy y otra el mes siguiente).
3. **Quién escribe aplicaciones:** solo `RecibirDocumento` (por `RepositorioDeAplicaciones.agregar`; la fecha de recepción
   ya la lee con `DocumentosDeCompra.datosDeRecepcion`, que responde `{ fechaRecepcion, serie, numero }`). Quién las
   borra: `deshacerAplicaciones` (`bajas/preparar-la-baja.ts`): `borrarDeLaNota` al dar de baja una nota de crédito y
   **`borrarDelCargo` al dar de baja una NDEB** (borra todo lo que la NDEB recibió).
4. **Fórmulas de saldo** (dominio `saldos.ts`, `netoDe` y SQL `ConsultaBaseDeDocumentos`, ya con U8-2): cargo =
   `coalesce(saldo_al_inicio, total − retenciones) − Σ aplicaciones recibidas` (subconsulta `aplicado_al_cargo`); saldo
   libre de la nota = `coalesce(saldo_al_inicio, total) − Σ aplicaciones hechas` (`aplicado_por_la_nota`). Los datos del
   libro entran por la subconsulta `datos_del_libro` con `leftJoin` (Drizzle confunde la nulabilidad si se une directo
   otra tabla llamada `documentos`). `ConsultasDeSaldosDrizzle.notasConSaldoLibre` y `SaldoDelProveedorDto`
   (`saldosDeudores`, `notasConSaldoLibre`) ya muestran aparte los saldos deudores (U13).
5. **Reglas de baja** (`dominio/reglas-de-baja.ts`): `REGLAS_PARA_ANULAR = [noTenerNotasAplicadas]`,
   `REGLAS_PARA_ELIMINAR = [noEstarAutorizado, noTenerNotasAplicadas]`, `REGLAS_PARA_DESAUTORIZAR = []`, armadas en la
   composición. `noTenerNotasAplicadas` solo mira **facturas** (excluye NDEB) y lanza `CargoConNotasAplicadas` («anúlelas
   primero») ante cualquier aplicación recibida: hoy solo pueden ser automáticas, que Libro de compras ya cuida (no anula
   una factura con notas vigentes). Con CP2 una factura **o una NDEB** puede recibir aplicaciones **manuales** de otra
   nota, que el libro no conoce: sin regla nueva, eliminar choca con `aplicaciones_cargo_fk` (error genérico) y anular
   una NDEB las borraría sin aviso (dictamen C-CP2-3). `REGLAS_PARA_CORREGIR_SALDO_INICIAL` de U8 todavía no está en
   `main` (llega con U8-3).
6. **`DocumentoPorPagar`** no trae la fecha de recepción del libro; `DocumentoConAplicaciones` trae `hechas` y `recibidas`
   como `AplicacionDeNota { notaId, cargoId, montoCentavos }` (sin id, forma, fecha ni serie y número del otro documento).
   Serie y número viven en la fila propia de `documentos` desde U8-1.
7. **Fecha de inicio:** la orden `empresas.obtener_carga_inicial` (`core/contratos/empresas.contratos.ts`) responde
   `{ fechaDeInicio: string | null; cerrada: boolean }` con un bloqueo compartido; U8 la pide **antes** de bloquear
   documentos (orden de bloqueo: Empresas, luego Cuentas por pagar).
8. **Pantallas:** las notas se ven hoy en «Documentos por pagar» (filtro `tipo`) y en su ficha
   (`NotasYAplicaciones.vue`). No hay pantalla propia ni acción sobre el saldo libre.
9. **`AccionAuditada`** (`core/compartido/aplicacion/auditoria.ts`) tiene `eliminar`, `inactivar`, `reactivar`, `anular`,
   `devolver`, `blanquear`, `corregir`, `reabrir`, `descartar`, `autorizar`, `asignar` y `quitar`. No hay una para
   «ajustar»; la tabla `core.auditoria` no tiene `check` sobre la acción (solo el tipo de TypeScript).
10. **Configuración:** `configuracion.ts` del módulo declara `cuentas-por-pagar.vencimientos.meses_por_omision`
    (`instalacion` y `empresa`). Libro de compras declara montos con `z.number().nonnegative().multipleOf(0.01)` (en
    quetzales) y las variables de ley solo en `instalacion`.
11. **Base de desarrollo** (consulta de solo lectura del 2026-11-08): `documentos` y `aplicaciones_de_notas` con 0
    filas. La migración igual se escribe para bases con datos.
12. **Migraciones del módulo** (verificado en `migraciones/meta/_journal.json`): la última es
    `0003_u8_saldos_iniciales` (`when` 1794189030355), ya en `main`; los pasos U8-3 a U8-8 no traen otra migración de
    Cuentas por pagar. Esta es la **`0004_cp2_notas_de_credito`**, con `when` mayor que el de la `0003`.

## 2. Modelo

Tres maneras de consumir el saldo libre de una nota, cada una con su rastro:

| Forma | Qué es | Dónde se guarda | Paso |
|---|---|---|---|
| **Aplicación automática** | Al recibirla, a su factura y a sus NDEB | `aplicaciones_de_notas`, `forma = 'automatica'` | CP1 (ya existe) |
| **Aplicación manual** | El usuario compensa el saldo libre contra otro cargo del **mismo proveedor** | `aplicaciones_de_notas`, `forma = 'manual'` | **CP2** |
| Aplicación en una contraseña | La contraseña reparte las notas que incluye entre sus cargos | `aplicaciones_de_notas`, `forma = 'contrasena'` | CP3 |
| **Ajuste** | Se da de baja (todo o parte) el saldo libre que no se va a compensar ni a cobrar | `ajustes_de_saldo` | **CP2** |
| Reintegro | El proveedor devuelve el dinero, por Bancos **o en efectivo** | Tabla de CP4 | CP4 |

**Saldo derivado** (sigue sin guardarse):

```
saldo de un cargo        = neto − Σ aplicaciones recibidas (todas las formas) (− pagos, CP4)
   con neto = coalesce(saldo_al_inicio, total − retenciones)   (U8)
saldo libre de una nota  = base − Σ aplicaciones hechas (todas las formas) − Σ ajustes vigentes (− reintegros, CP4)
   con base = coalesce(saldo_al_inicio, total)   (U8)
```

Una aplicación manual **no cambia nada fiscal**: el efecto de la nota ya quedó en el Libro de compras del mes en que se
recibió; la compensación solo dice qué deuda con el proveedor se da por saldada (Código Civil art. 1469; antes del
vencimiento es una compensación **por acuerdo**, de ahí la referencia del acuerdo). Lo compensado no pasa del saldo del
cargo, que ya va neto de retenciones: nunca se «paga» por compensación la retención que se debe a la SAT, y compensar no
genera retención nueva. Un ajuste **sí** tiene efecto contable (baja de un derecho de cobro o traslado a otra cuenta):
publica un evento para Contabilidad con su **efecto** (§6.4).

**Por qué los ajustes van en otra tabla y no como aplicación sin cargo:** un ajuste se **anula** (no se borra), lleva
causa y motivo, y tiene efecto contable propio; una aplicación manual se **quita** (se borra con auditoría) y no lo
tiene. Mezclarlos obligaría a columnas nulables por forma y a checks cruzados. La tabla se llama `ajustes_de_saldo`
(no «de notas») para que, si CP4 aprueba ajustar diferencias de centavos de un cargo (CP2-e), no haya que renombrarla.

### 2.1 Causas del ajuste y su efecto (dictamen C-CP2-2)

`CAUSAS_DE_AJUSTE` y `EFECTO_DE_LA_CAUSA` son constantes del dominio (`dominio/ajustes.ts`); el efecto **no se guarda**:
sale de la causa, porque ya no existe una causa «otra» de efecto libre.

| Clave | Nombre en pantalla | Efecto | Cuándo | Ayuda en la ventana | Reglas propias |
|---|---|---|---|---|---|
| `no_recuperable` | No se recuperará | `perdida` (otros gastos, «pérdida en saldos de proveedores») | El proveedor no lo compensará ni lo devolverá (cerró, se perdió el contacto, no vale la pena cobrarlo) | «Es un gasto **no deducible** del ISR: no es una cuenta incobrable (esas son de clientes, art. 21 num. 20 del Decreto 10-2012).» | — |
| `diferencia_menor` | Diferencia menor | `perdida` (otros gastos o diferencias) | Centavos o diferencias pequeñas que no se van a perseguir | «Hasta Q{tope} (configuración de la empresa).» | `monto <= cuentas-por-pagar.ajustes.tope_diferencia_menor` → `DiferenciaMenorSobreElTope` |
| `compensado_con_otra_cuenta` | Compensado con otra cuenta del tercero | `transitoria` (contra Clientes u otra cuenta por cobrar; transitoria «Saldos de proveedores por regularizar» hasta que exista Cuentas por cobrar) | El proveedor también es cliente o deudor de la empresa y el saldo se cruzó con lo que él debe por otro lado | «No es una pérdida: el saldo pasa a otra cuenta del mismo tercero. Escriba la referencia (factura de venta, recibo, acuerdo).» | `referencia` **obligatoria** (check `ajustes_referencia_de_compensacion`) |

Aviso fijo arriba de la ventana: «Si el saldo a favor se debe a un error al registrar la nota, no lo ajuste: anule o
corrija la nota en el Libro de compras.» Si el proveedor **devolvió el dinero** (efectivo o banco), tampoco es un ajuste:
es un reintegro (CP4); la ventana lo dice en la ayuda general.

## 3. Datos

### 3.1 Cambios en `cuentas_por_pagar.aplicaciones_de_notas`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `forma` | text | no | `default 'automatica'` (las filas existentes son automáticas); check `aplicaciones_forma_valida`: `forma in ('automatica', 'manual')` (CP3 agrega `'contrasena'`) |
| `fecha` | date | **no** (tras el relleno) | Desde cuándo rebaja el cargo. Automática: la **fecha de recepción** de la nota en Libro de compras (C2). Manual: la que se escribe (§5.1). La usarán el estado de cuenta y la antigüedad de CP5 |
| `referencia` | text | sí | **Referencia del acuerdo** de compensación (correo, carta, estado de cuenta conciliado). Solo en `forma = 'manual'`: check `aplicaciones_referencia_valida`: `referencia is null or (forma = 'manual' and char_length(referencia) between 1 and 100 and referencia = btrim(referencia))` |

Restricciones que cambian:

| Nombre | Antes | Después |
|---|---|---|
| `aplicaciones_nota_cargo_unico` | unique `(nota_id, cargo_id)` | **se borra** (§1.2) |
| `aplicaciones_automatica_unica` (nuevo) | — | unique `(nota_id, cargo_id) where forma = 'automatica'`: la automática sigue siendo una por par |
| `aplicaciones_nota_idx` (nuevo) | — | `(nota_id)`: índice de la llave `aplicaciones_nota_fk` (antes lo cubría el único) |

RLS sin cambios (`politicaPorEmpresa()`). Autoría: `creado_por` = quien aplicó a mano (o quien registró en el libro,
en la automática). Una petición de aplicación manual lleva una sola `referencia`, que se copia en cada fila que crea.

### 3.2 Tabla nueva `cuentas_por_pagar.ajustes_de_saldo`

Baja (todo o parte) del saldo libre de una nota de crédito, con causa y motivo. No se borra: se anula.

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK (`idPrimario`) |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `proveedor_id` | uuid | no | solo para la llave compuesta |
| `documento_id` | uuid | no | la nota; FK `ajustes_documento_fk (documento_id, empresa_id, proveedor_id) → documentos (id, empresa_id, proveedor_id)` **on delete cascade** (ver la decisión de abajo) |
| `monto` | numeric(14,2) | no | check `ajustes_monto_positivo`: `> 0` |
| `fecha` | date | no | fecha contable del ajuste (§5.3) |
| `causa` | text | no | check `ajustes_causa_valida`: `causa in ('no_recuperable', 'diferencia_menor', 'compensado_con_otra_cuenta')` (§2.1) |
| `motivo` | text | no | check `ajustes_motivo_rango`: `char_length(motivo) between 1 and 300` |
| `referencia` | text | sí | check `ajustes_referencia_valida`: `referencia is null or (char_length(referencia) between 1 and 100 and referencia = btrim(referencia))`; check `ajustes_referencia_de_compensacion`: `causa <> 'compensado_con_otra_cuenta' or referencia is not null` |
| `estado` | text | no | `default 'vigente'`; check `ajustes_estado_valido`: `in ('vigente', 'anulado')` |
| `anulado_en` | timestamptz | sí | |
| `anulado_por` | uuid | sí | |
| `motivo_de_anulacion` | text | sí | check `ajustes_motivo_de_anulacion_rango`: `is null or char_length between 1 and 300` |
| `...marcasDeTiempo`, `...autoria` | | | `creado_por` = quien ajustó |

Checks de estado: `ajustes_anulacion_completa`: `(estado = 'anulado') = (anulado_en is not null and anulado_por is not
null and motivo_de_anulacion is not null)`.

Índices: `ajustes_documento_idx (documento_id)` (llave y suma por nota). Sin índice por fecha todavía: lo agrega CP5 con
el reporte mensual de ajustes si el plan de la consulta lo pide (`(empresa_id, fecha)`). RLS: `politicaPorEmpresa()`.
Sin alcance por registro (el plan no lo pide).

**Lo que revisa el dominio y no la base** (con la nota bloqueada `for update`): que `documento_id` sea una **nota de
crédito** registrada o autorizada, que la suma de aplicaciones y ajustes vigentes no pase de su base y el tope de
«diferencia menor». Es la misma razón de CP1 §3.2 (la clase no es columna de la llave; el tope es configuración); se
cubre con pruebas de integración y con la prueba de consistencia.

**Decisión: `on delete cascade` hacia la nota (CP2-i).** Un ajuste **vigente** impide dar de baja la nota (regla de
§5.3), así que la cascada solo se lleva ajustes **anulados**, que quedan en el `anterior` de la auditoría de la nota
eliminada. Con `no action` una nota de saldo inicial (U8) con un ajuste anulado no se podría eliminar nunca (un saldo
inicial no se anula): quedaría atascada. Contabilidad guarda en su partida los datos que necesita (vienen en el evento),
sin depender de la fila borrada.

### 3.3 Migración

`0004_cp2_notas_de_credito` (§1.12), con `npm run bd:generar -w servidor -- cuentas-por-pagar cp2_notas_de_credito`,
revisada a mano. Orden:

1. `add column forma text default 'automatica' not null`, `add column fecha date`, `add column referencia text`.
2. **Relleno (a mano)**, con el propietario: `update cuentas_por_pagar.aplicaciones_de_notas a set fecha =
   l.fecha_recepcion from cuentas_por_pagar.documentos n join libro_de_compras.documentos l on l.id = n.documento_id
   where n.id = a.nota_id;` y, para lo que no tenga documento en el libro (no debería haber: las notas de saldo inicial
   no tienen aplicaciones automáticas), `update … set fecha = creado_en::date where fecha is null;`. Después
   `alter column fecha set not null`. Solo **lee** `libro_de_compras.documentos`; no cambia otro esquema.
3. `drop constraint aplicaciones_nota_cargo_unico`; `create unique index aplicaciones_automatica_unica … where forma =
   'automatica'`; `create index aplicaciones_nota_idx`; `add constraint aplicaciones_forma_valida` y
   `aplicaciones_referencia_valida`.
4. `create table ajustes_de_saldo` con sus checks, llaves, índice, RLS (`enable row level security` y la política).

Sin migración de permisos (son nuevos). El `when` del journal debe quedar mayor que 1794189030355 (`0003`).

### 3.4 Mensajes de restricciones

Ninguno nuevo: `aplicaciones_automatica_unica` solo salta por un error de programación (la orden llega una vez), los
checks los adelantan el Zod y el dominio (también la referencia obligatoria de `compensado_con_otra_cuenta`), y la
llave `ajustes_documento_fk` no se viola por la cascada. `aplicaciones_cargo_fk` tampoco debe saltar: la regla de §5.4
rechaza antes la baja del cargo.

## 4. Integración con CP1 y U8 (lo que cambia en el código existente)

| Pieza | Cambio |
|---|---|
| `aplicaciones-de-notas.tablas.ts` | `forma`, `fecha`, `referencia`, checks, único parcial, índice; tabla nueva `ajustes-de-saldo.tablas.ts` |
| Dominio `AplicacionDeNota` | `id`, `forma`, `fecha`, `referencia` y la **serie y número del otro documento** (de la nota en `recibidas`, del cargo en `hechas`; los trae el repositorio con un join a `documentos`, que desde U8-1 tienen serie y número en la fila propia), además de `notaId`, `cargoId`, `montoCentavos`. Los usan la regla de §5.4, la auditoría de quitar y la ficha |
| `RepositorioDeAplicaciones.agregar` | Recibe `forma`, `fecha` y `referencia` (la automática: `forma = 'automatica'`, `fecha` = recepción, sin referencia) |
| `RecibirDocumento` | Guarda la aplicación automática con `fecha` = la `fechaRecepcion` que ya lee de `datosDeRecepcion` |
| Puerto nuevo `FechasDeEntrada` (infraestructura con la subconsulta `datos_del_libro`) | `deDocumentos(ids): Map<id, string \| null>`: la fecha de recepción en el libro de cada documento; `null` en un saldo inicial (su límite es la fecha de inicio). Lectura sin bloqueo de la fila del libro (no invierte el orden «libro, luego Cuentas por pagar»). Lo usan §5.1, §5.3 y CP3 |
| Puerto nuevo `CargaInicial` (sobre el mediador, `empresas.obtener_carga_inicial`) | Da la fecha de inicio para los límites cuando algún documento es saldo inicial. Se pide **antes** de bloquear documentos, como U8 |
| `saldoDe()` / `AplicadoAlDocumento` | Suma `ajustadoCentavos` (lo ajustado de la nota): `saldo libre = base − porLaNota − ajustado` |
| SQL (`ConsultaBaseDeDocumentos`) | Subconsulta `ajustado_de_la_nota` (Σ `monto` de ajustes `vigente` por `documento_id`), unida con `leftJoin` como `aplicado_por_la_nota`; la fila trae `ajustado`. Igual en `consultas-de-saldos.drizzle.ts` (`notasConSaldoLibre` y `saldosDeudores`) |
| `ConsultasDeCargos.paraAplicarUnaNota` | Sin cambio de lógica (la aplicación automática sigue igual) |
| DTO `DocumentoPorPagarDto` | `ajustado: string` (cero en cargos); `AplicacionDelDocumentoDto` gana `id`, `forma`, `fecha`, `referencia` y `puedeQuitar`; la ficha gana `ajustes: AjusteDto[]` y, en la nota, `puedeAplicar` y `puedeAjustar` (calculados en el servidor, como las demás acciones) |
| `FichaDelDocumentoDto` (auditoría) | `aplicacionesHechas`/`Recibidas` con `forma`, `fecha` y `referencia`; `ajustes` |
| `HechosDelDocumento` / `accionesDelDocumento` | Recibe `saldoLibreCentavos`, `ajustesVigentes` y `aplicacionesManualesRecibidas`; `puedeAplicar` = nota no anulada con saldo libre > 0; `puedeAjustar` = nota **registrada o autorizada** con saldo libre > 0 (CP3 suma a las dos «y no está en una contraseña vigente»); `puedeAnular` y `puedeEliminar` falsos en una nota con ajustes vigentes y en un cargo con aplicaciones manuales recibidas |
| Reglas de baja | `noTenerAplicacionesManualesRecibidas` y `noTenerAjustesVigentes` en `REGLAS_PARA_ANULAR` y `REGLAS_PARA_ELIMINAR` (§5.3, §5.4), **antes** de `noTenerNotasAplicadas` |
| `noTenerNotasAplicadas` / `CargoConNotasAplicadas` | Siguen para las aplicaciones **automáticas** de una factura (las cuida también el libro). Su TSDoc deja de decir que el caso «no ocurre» con manuales: esas las ataja antes la regla nueva |
| `deshacerAplicaciones` | Sin cambio: anular una nota sigue borrando **todas** sus aplicaciones hechas (también las manuales, que quedan en el `anterior`); en una NDEB, `borrarDelCargo` ya solo encuentra automáticas, porque la regla nueva rechaza antes la baja de una NDEB con manuales |
| Filtro de la lista | `conSaldo?: boolean`: cargos con saldo > 0 y notas con saldo libre > 0 |
| U8 `REGLAS_PARA_CORREGIR_SALDO_INICIAL` (llega con U8-3) | Suma `noTenerAjustesVigentes` («ya tiene ajustes»): `SaldoInicialConMovimientos`. Las aplicaciones manuales ya las cubre «sin aplicaciones de notas (hechas ni recibidas)» |
| U8, saldo libre de una nota de saldo inicial | La base es `saldo_al_inicio`; todo lo demás igual |

## 5. Reglas

### 5.1 Aplicar manualmente el saldo libre de una nota

Una petición aplica una nota a **uno o varios** cargos (máximo 100, todo o nada), en la transacción del caso de uso:

1. Pide la carga inicial (`CargaInicial`, bloqueo compartido), antes de bloquear nada aquí.
2. Carga la nota y la bloquea (`for update`). Debe ser `nota_de_credito`, no `anulada` → si no, `NoEsNotaConSaldo`. Vale
   en `pendiente`, `registrado` o `autorizado` (U7: rebaja desde que se recibe; CP2-b).
3. CP3: si la nota está en una contraseña vigente → `NotaEnContrasena` (la reparte la contraseña).
4. Bloquea los cargos (`for update`, **en orden de id** para no cruzarse con otra aplicación). Cada uno: del **mismo
   proveedor** y la misma empresa, de clase cargo, no `anulado` → si no, `CargoNoDisponible` (nombra el documento). Vale
   en cualquier estado vigente, incluidos los de la bandeja y los no autorizados (CP2-b). Sin repetidos en la petición.
5. Montos: cada uno `> 0` y `<=` el saldo del cargo → `AplicacionMayorQueElSaldo`; la suma `<=` el saldo libre de la nota
   → `AplicacionMayorQueElSaldoLibre`. Ambos saldos se recalculan con las filas bloqueadas.
6. **Fecha** (CP2-c, dictamen C-CP2-1): la que se escribe (la del acuerdo), por omisión **hoy** (`reloj`). No futura, y no
   anterior a **ninguna** de estas → `FechaDeAplicacionInvalida`:
   - la fecha de recepción de la nota en el Libro de compras (desde ahí existe el saldo);
   - la fecha de recepción de cada cargo en el Libro de compras;
   - la **fecha de inicio** de la empresa, si la nota o algún cargo es saldo inicial (una compensación anterior al corte
     cambiaría la apertura). Si hay un saldo inicial y la empresa no tiene fecha de inicio (no debería pasar: U8 la
     exige para cargarlos), se rechaza con el mismo error.

   Las fechas salen de `FechasDeEntrada`; el mensaje dice la fecha mínima.
7. Referencia del acuerdo: opcional; se recorta, vacía = nula, hasta 100.
8. Inserta una fila por cargo con `forma = 'manual'`, la fecha y la referencia. Sin auditoría (es un alta; queda
   `creado_por`). Sin evento (§6.4; dictamen C-CP2-4).

**Propuesta de reparto** (solo pantalla; el usuario la cambia; dictamen C-CP2-3): los cargos con saldo del proveedor,
**primero los autorizados**, y dentro de cada grupo por vencimiento (el más viejo primero) y fecha de emisión; se reparte
con `repartirNotaDeCredito` (ya existe y es pura). Los no autorizados llevan la etiqueta «Sin autorizar».

**Aviso de bancarización** (sin bloquear; dictamen C-CP2-1): cada cargo trae `sobreUmbralDeBancarizacion` = `total >=
cuentas-por-pagar.bancarizacion.umbral` (§6.5). Si la persona compensa algo contra uno de ellos, la ventana muestra:
«Esta factura es de Q30,000 o más; guarde por escrito el acuerdo de compensación con el proveedor (bancarización,
Decreto 20-2006)», con el umbral real, y resalta el campo «Referencia del acuerdo». No se suman los pagos del mes a un
mismo proveedor (lo que la SAT trata como una sola operación): eso queda para CP4, si el contador lo pide.

### 5.2 Quitar una aplicación manual

1. Bloquea la nota y el cargo de la aplicación (en orden de id). La aplicación debe ser `manual` → si es automática o de
   una contraseña, `AplicacionNoSeQuita` (la automática es parte de la nota; la de contraseña se quita desde la
   contraseña).
2. CP3: si la nota está en una contraseña vigente → `NotaEnContrasena`. CP4 sumará «el cargo ya tiene pagos».
   Van en `REGLAS_PARA_QUITAR_APLICACION` (lista ampliable, como las de baja).
3. Motivo obligatorio (1–300, `motivoValido`).
4. Auditoría `quitar`, recurso `cuentas-por-pagar.aplicaciones-de-notas`, `anterior` = la aplicación (con fecha y
   referencia) con la serie y el número de los dos documentos; con el motivo. Borra la fila.

### 5.3 Ajustar el saldo libre (U13)

Crear, con `ajustes.crear`:

1. Pide la carga inicial (`CargaInicial`) y bloquea la nota. Nota de crédito **registrada o autorizada** →
   si está `pendiente`, `NotaPendienteNoSeAjusta`; si está anulada o no es nota, `NoEsNotaConSaldo`. Con CP3, fuera de
   una contraseña vigente (`NotaEnContrasena`).
2. `0 < monto <= saldo libre` → `AjusteMayorQueElSaldoLibre`. Por omisión, la pantalla propone **todo** el saldo libre.
3. Causa de §2.1 y motivo (1–300). Con `diferencia_menor`, `monto <= tope_diferencia_menor` de la empresa (§6.5) →
   `DiferenciaMenorSobreElTope`. Con `compensado_con_otra_cuenta`, referencia obligatoria → `ReferenciaObligatoria`.
   En las demás causas, la referencia es opcional (1–100).
4. **Fecha** (dictamen C-CP2-5): por omisión hoy; no futura, no anterior a la **fecha de recepción** de la nota, ni a la
   **fecha de inicio** si la nota es saldo inicial → `FechaDeAjusteInvalida` (dice la fecha mínima). Si cae en un **año
   anterior** al de hoy, la ventana avisa sin bloquear: «Esta fecha afecta los estados financieros de un año que quizá
   ya se cerró» (lo calcula el cliente). Cuando exista Contabilidad, no en un mes cerrado (regla que sumará ese
   módulo).
5. Inserta con `estado = 'vigente'`; auditoría `ajustar` (**acción nueva** en `AccionAuditada`), recurso
   `cuentas-por-pagar.ajustes`, `anterior` = la ficha de la nota **antes** del ajuste, con el motivo; evento
   `cuentas-por-pagar.ajuste_registrado` al confirmar, con su `efecto`.

Anular un ajuste, con `ajustes.anular`: con el ajuste bloqueado; `vigente` → si no, `AjusteYaAnulado`; motivo
obligatorio; con CP3, la nota fuera de una contraseña vigente. `estado = 'anulado'`, `anulado_en/por`,
`motivo_de_anulacion`; auditoría `anular`, recurso `cuentas-por-pagar.ajustes`, `anterior` = el ajuste como estaba;
evento `cuentas-por-pagar.ajuste_anulado`. El saldo libre vuelve a la nota.

**Bajas de la nota con ajustes:** `noTenerAjustesVigentes` rechaza anularla o eliminarla (desde aquí o por aviso de Libro
de compras) mientras tenga ajustes vigentes → `NotaConAjustes` («anule primero el ajuste»). Con ajustes solo anulados,
anular la nota los deja como están (rastro) y eliminarla se los lleva por la cascada, con su `anterior` en la auditoría.

### 5.4 Bajas de un cargo con aplicaciones manuales recibidas (dictamen C-CP2-3; usuario, 2026-11-08)

Regla nueva `noTenerAplicacionesManualesRecibidas` en `REGLAS_PARA_ANULAR` y `REGLAS_PARA_ELIMINAR`, **antes** de
`noTenerNotasAplicadas`: un **cargo** (factura u otro cargo, **también una NDEB**) con aplicaciones `forma = 'manual'`
recibidas no se anula ni se elimina → `CargoConAplicacionesManuales`: «El documento … recibió saldo a favor de la nota
N: quite primero la aplicación de la nota N.» (si son varias notas, las nombra todas: «de las notas N1 y N2»). Corre
igual cuando la baja llega por **aviso de Libro de compras** (`documento_por_anular` y la eliminación corren las mismas
listas): el libro muestra el mensaje y no cambia nada. Quitar la aplicación (§5.2) devuelve el monto al saldo libre de la
nota; después la baja procede.

Las listas quedan, tras CP2: `REGLAS_PARA_ANULAR = [noTenerAplicacionesManualesRecibidas, noTenerAjustesVigentes,
noTenerNotasAplicadas]` y `REGLAS_PARA_ELIMINAR = [noEstarAutorizado, noTenerAplicacionesManualesRecibidas,
noTenerAjustesVigentes, noTenerNotasAplicadas]` (CP3 pone `noEstarEnContrasena` al principio de las dos).

### 5.5 Pantalla propia

«Notas de crédito» (Operación): las notas de crédito de la empresa, por omisión **las que tienen saldo libre**, con
filtros (proveedor, estado, con saldo libre o todas, fechas de emisión). Cada tarjeta: proveedor, serie y número, fecha,
total, aplicado, ajustado y **saldo libre**; etiqueta «Saldo inicial» si lo es (U8). Arriba, el total de saldos a favor
por proveedor (sale de la misma consulta del saldo del proveedor). La ficha es la de «Documentos por pagar» con las
secciones nuevas (§8).

## 6. Permisos, auditoría, errores, eventos y configuración

### 6.1 Permisos (`modulo.ts`, PLAN §3.5)

| Permiso | Para |
|---|---|
| `cuentas-por-pagar.documentos.ver` (ya existe) | La pantalla «Notas de crédito», la ficha, los cargos para aplicar |
| `cuentas-por-pagar.documentos.aplicar-notas` | Aplicar manualmente el saldo libre y quitar una aplicación manual |
| `cuentas-por-pagar.ajustes.crear` | Ajustar el saldo libre de una nota |
| `cuentas-por-pagar.ajustes.anular` | Anular un ajuste |

Los ajustes no tienen `.ver` propio ni lista: se ven en la ficha de la nota (con `documentos.ver`) y en los reportes de
CP5 (con sus permisos de reporte). Sin `editar` (un ajuste no se corrige: se anula y se hace otro) ni `eliminar`.
Ninguno es `soloSuperacceso`. Sin migración de permisos.

### 6.2 Auditoría

| Hecho | Acción | Recurso | `anterior` |
|---|---|---|---|
| Aplicar a mano | ninguna (alta; `creado_por`) | — | — |
| Quitar una aplicación manual | `quitar` | `cuentas-por-pagar.aplicaciones-de-notas` | La aplicación (fecha, referencia) con los dos documentos; con motivo |
| Ajustar | `ajustar` (**nueva**; TSDoc: «se dio de baja o se trasladó un saldo a favor, con su causa») | `cuentas-por-pagar.ajustes` | Ficha de la nota antes del ajuste; con motivo |
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
| `FechaDeAplicacionInvalida` | `DatoInvalido` (campo `fecha`) | `fecha_de_aplicacion_invalida` | «La fecha no puede ser futura ni anterior al dd/mm/aaaa (recepción de los documentos o fecha de inicio).» |
| `AplicacionNoSeQuita` | `ReglaDeNegocioInfringida` | `aplicacion_no_se_quita` | «Esa aplicación se hizo al recibir la nota (o en una contraseña): no se quita aquí.» |
| `AjusteMayorQueElSaldoLibre` | `DatoInvalido` (campo `monto`) | `ajuste_mayor_que_el_saldo_libre` | «La nota … solo tiene Q… a favor.» |
| `NotaPendienteNoSeAjusta` | `ReglaDeNegocioInfringida` | `nota_pendiente_no_se_ajusta` | «La nota … está pendiente en la bandeja: complétela antes de ajustar su saldo a favor.» |
| `DiferenciaMenorSobreElTope` | `DatoInvalido` (campo `monto`) | `diferencia_menor_sobre_el_tope` | «Una diferencia menor llega hasta Q… (configuración de la empresa); para más, elija otra causa.» |
| `ReferenciaObligatoria` | `DatoInvalido` (campo `referencia`) | `referencia_obligatoria` | «Escriba con qué se compensó (factura de venta, recibo o acuerdo).» |
| `FechaDeAjusteInvalida` | `DatoInvalido` (campo `fecha`) | `fecha_de_ajuste_invalida` | «La fecha no puede ser futura ni anterior al dd/mm/aaaa (recepción de la nota o fecha de inicio).» |
| `AjusteYaAnulado` | `ReglaDeNegocioInfringida` | `ajuste_ya_anulado` | «Ese ajuste ya está anulado.» |
| `NotaConAjustes` | `ReglaDeNegocioInfringida` | `nota_con_ajustes` | «La nota … tiene ajustes vigentes: anúlelos primero.» |
| `CargoConAplicacionesManuales` | `ReglaDeNegocioInfringida` | `cargo_con_aplicaciones_manuales` | «El documento … recibió saldo a favor de la nota N: quite primero la aplicación de la nota N.» (§5.4) |
| `NotaEnContrasena` (CP3) | `ReglaDeNegocioInfringida` | `nota_en_contrasena` | «La nota … está en la contraseña N: se reparte allí; quítela de la contraseña para aplicarla o ajustarla aquí.» |

Una aplicación o un ajuste que no existe responde `RecursoNoEncontrado`. `MotivoInvalido` ya existe.

### 6.4 Eventos (`core/contratos/cuentas-por-pagar.contratos.ts` y `dominio/eventos.ts`)

```ts
type EfectoDeAjuste = 'perdida' | 'transitoria';

'cuentas-por-pagar.ajuste_registrado': {
  empresaId: string; ajusteId: string; documentoId: string; proveedorId: string;
  serie: string | null; numero: string;          // de la nota, para la glosa
  montoCentavos: number; fecha: string; causa: CausaDeAjuste; efecto: EfectoDeAjuste; referencia: string | null;
};
'cuentas-por-pagar.ajuste_anulado': {
  empresaId: string; ajusteId: string; documentoId: string; fecha: string;
  montoCentavos: number; efecto: EfectoDeAjuste;
};
```

Para Contabilidad (nadie los escucha todavía). `efecto` le dice qué cuenta usar sin adivinar: `perdida` → otros gastos
(no deducible en el régimen sobre utilidades); `transitoria` → «Saldos de proveedores por regularizar» o la cuenta por
cobrar del tercero. `fecha` en el anulado es la de la anulación (C5: la reversión va con la fecha de la anulación). El
anulado repite monto y efecto para que la reversión no dependa de la fila (CP2-i). La aplicación manual **no** publica
evento (dictamen C-CP2-4): mientras las dos partidas vivan en la cuenta de control Proveedores, compensar mueve el
auxiliar y no el mayor; la reclasificación de los saldos deudores es una partida de cierre sacada del reporte de CP5.

### 6.5 Configuración (`configuracion.ts`)

| Clave | Esquema | Niveles | Por omisión | Pública | Para |
|---|---|---|---|---|---|
| `cuentas-por-pagar.bancarizacion.umbral` | `z.number().positive().multipleOf(0.01)` (quetzales) | `instalacion` (la ley es igual para todas las empresas; solo soporte la cambia) | `30000` | no | Desde qué total del cargo se muestra el aviso de bancarización al compensar (§5.1; CP3 lo usa igual). El servidor lo resuelve en `sobreUmbralDeBancarizacion` |
| `cuentas-por-pagar.ajustes.tope_diferencia_menor` | `z.number().nonnegative().multipleOf(0.01)` (quetzales) | `instalacion`, `empresa` | `25` | no | Monto máximo de un ajuste con causa «Diferencia menor» (§5.3). Con `0`, la causa no se puede usar. La ventana lo recibe en la respuesta de la ficha de la nota (`topeDiferenciaMenor`) |

## 7. Contrato de la API

Prefijo `/api/cuentas-por-pagar`. Dinero como texto con dos decimales; fechas `AAAA-MM-DD`.

| Método y ruta | Permiso | Cuerpo / consulta | Respuesta |
|---|---|---|---|
| `GET /documentos?tipo=nota_de_credito&conSaldo=true` | `documentos.ver` | filtro nuevo `conSaldo` | página de `DocumentoPorPagarDto` (con `ajustado`) |
| `GET /documentos/:documentoId/cargos-para-aplicar` | `documentos.ver` | — | `{ saldoLibre, fechaMinima, cargos: CargoParaAplicarDto[] }` con `propuesto` por cargo |
| `POST /documentos/:documentoId/aplicaciones` | `documentos.aplicar-notas` | `{ fecha?: string; referencia?: string \| null; aplicaciones: [{ cargoId, monto }] }` (1–100) | ficha de la nota |
| `DELETE /aplicaciones/:aplicacionId` | `documentos.aplicar-notas` | `{ motivo }` | 204 |
| `POST /documentos/:documentoId/ajustes` | `ajustes.crear` | `{ monto, fecha?, causa, motivo, referencia?: string \| null }` | 201, ficha de la nota |
| `POST /ajustes/:ajusteId/anular` | `ajustes.anular` | `{ motivo }` | ficha de la nota |

`CargoParaAplicarDto`: `id`, `tipo`, `serie`, `numero`, `fechaEmision`, `fechaRecepcion` (nula en un saldo inicial),
`vencimiento`, `estado`, `total`, `saldo`, `propuesto`, `origen` (U8), `sobreUmbralDeBancarizacion`. `fechaMinima` es la
de la nota (recepción o fecha de inicio); la ventana sube el mínimo según los cargos elegidos. `AjusteDto`: `id`,
`monto`, `fecha`, `causa`, `efecto`, `motivo`, `referencia`, `estado`, `creadoPor` (nombre), `creadoEn`, `anulacion`
(`{ motivo, anuladoPorNombre, anuladoEn } | null`), `puedeAnular`. La ficha de una nota trae además `fechaMinimaDeAjuste`
y `topeDiferenciaMenor`.

**Excel:** ninguno (Operación). Los saldos a favor y los ajustes se exportan en los reportes de CP5.

## 8. Cliente

- `servicios/`: métodos nuevos en `ApiCuentasPorPagar` (`cargosParaAplicar`, `aplicar`, `quitarAplicacion`, `ajustar`,
  `anularAjuste`); tipos en `servicios/tipos.ts`.
- `paginas/NotasDeCredito.vue` (Operación, ≤ 120 líneas): reutiliza `FiltrosDeDocumentosPorPagar`,
  `TarjetaDeDocumentoPorPagar` y `PaginacionDeLista` con el tipo fijo y el filtro «Con saldo a favor» activo; resumen de
  saldos a favor por proveedor. Ruta `/cuentas-por-pagar/notas-de-credito` (permiso `documentos.ver`), menú en
  `seccion: 'operacion'`, textos «Notas de crédito».
- **Ficha** (`FichaDelDocumentoPorPagar.vue`): en una nota con saldo libre, botones «Aplicar a otro documento»
  (`v-permiso` `aplicar-notas`, con `puedeAplicar`) y «Ajustar saldo» (`ajustes.crear`, con `puedeAjustar`; en una nota
  pendiente, la ficha explica «complétela antes de ajustar»); la sección de aplicaciones (`NotasYAplicaciones.vue`)
  muestra forma («Al recibirla», «Manual», «En contraseña N»), fecha y referencia, con «Quitar» en las manuales;
  sección «Ajustes» con causa, efecto («Pérdida» o «Traslado»), referencia, estado y «Anular».
- `componentes/VentanaDeAplicacion.vue`: los cargos del proveedor con saldo (autorizados primero; etiqueta «Sin
  autorizar» en los demás), el monto propuesto editable por fila, la fecha (mínimo según los documentos elegidos), la
  referencia del acuerdo, el aviso de bancarización si toca y el total contra el saldo libre (no deja confirmar si se
  pasa). Lógica pura en `composables/aplicacion-de-nota.ts` (reparto propuesto, totales, fecha mínima, aviso de
  bancarización, armado del cuerpo) con su `*.prueba.ts`.
- `componentes/VentanaDeAjuste.vue`: aviso fijo «si es un error de la nota, corríjala en el Libro de compras»; monto
  (propuesto: todo el saldo libre), fecha (aviso de año anterior), causa (lista de §2.1 con su ayuda; «Diferencia
  menor» dice el tope), referencia (obligatoria con «Compensado con otra cuenta»), motivo; aviso «El ajuste da de baja
  dinero que el proveedor le debe a la empresa; queda en la auditoría». Lógica pura en
  `composables/ajuste-de-saldo.ts` (año anterior, tope, referencia) con su prueba. Anular un ajuste y quitar una
  aplicación usan la ventana de motivo que ya existe (como `VentanaDeDesautorizacion`).
- La ficha de un cargo muestra en sus aplicaciones recibidas las manuales con su nota (enlace a la ficha de la nota) y,
  si las tiene, explica por qué no se anula ni se elimina («quite primero la aplicación de la nota N»).
- Errores por campo con `usarFormulario`; avisos con `usarAvisos()`.

## 9. Convivencia y riesgos

1. **CP1:** la aplicación automática no cambia (solo guarda `forma` y `fecha`). Anular una nota sigue borrando sus
   aplicaciones, ahora también las manuales: el cargo que las recibió vuelve a deber. Es lo correcto (la nota dejó de
   existir) y queda en el `anterior`. Al revés, un **cargo** con aplicaciones manuales recibidas no se da de baja hasta
   quitarlas (§5.4), venga la baja de aquí o del libro.
2. **U8:** una nota de saldo inicial se aplica y se ajusta igual; su base es `saldo_al_inicio` y la fecha mínima es la
   fecha de inicio. Aplicar o ajustar la deja «con movimientos» y ya no se corrige ni elimina en Saldos iniciales (U8
   §5). Un cargo de saldo inicial puede recibir aplicaciones manuales, con la misma consecuencia. Con la carga cerrada,
   aplicar y ajustar siguen permitidos (es el proceso, no la carga). Pedir la carga inicial con bloqueo compartido solo
   hace esperar un cierre o un cambio de fecha en curso.
3. **CP3:** una nota en una contraseña vigente no se aplica, ni se ajusta, ni se le quitan aplicaciones aquí
   (`NotaEnContrasena`); un **cargo** en una contraseña vigente **sí** recibe aplicaciones manuales (los montos de la
   contraseña se leen vivos, CP3 §2).
4. **CP4 (anotado, no se diseña aquí):** sumará a `REGLAS_PARA_QUITAR_APLICACION` y a las de baja «el cargo ya tiene
   pagos». El **reintegro** del proveedor restará del saldo libre igual que el ajuste y debe aceptar **Bancos o
   efectivo (caja)**: reemplaza la causa «liquidado fuera del sistema» que se quitó (usuario, 2026-11-08). Un
   **descuento sin nota** no se resuelve con un ajuste: si rebaja el precio, la ley pide nota de crédito del proveedor
   (Ley del IVA arts. 17 y 29 lit. d); las diferencias de centavos al pagar sí pueden ser ajuste (CP2-e, en la misma
   tabla). Posible suma mensual por proveedor para la bancarización, si el contador la pide.
5. **CP5 (anotado):** reporte **mensual de ajustes** (fecha, nota, proveedor, causa, efecto, monto, referencia, quién y
   estado) para que el contador lo revise, en lugar de una segunda aprobación (CP2-f); saldo neto por proveedor a una
   fecha de corte, separado en acreedores y deudores, para la reclasificación de cierre (C-CP2-4); antigüedad de los
   saldos a favor (el saldo a favor prescribe; dictamen, otros errores 13).
6. **Libro de compras:** sin cambios. Anular o eliminar desde el libro una nota con ajustes vigentes se rechaza con
   `NotaConAjustes`, y un cargo con aplicaciones manuales con `CargoConAplicacionesManuales` (el aviso
   `documento_por_anular` y la eliminación corren las reglas de baja).
7. **Concurrencia:** aplicar, quitar y ajustar piden primero la carga inicial (Empresas) y después bloquean nota y
   cargos en orden de id; ninguno bloquea filas de Libro de compras (las fechas de recepción se leen sin bloqueo), así
   que no invierten el orden «libro, luego Cuentas por pagar» de CP1 §4 ni el «Empresas, luego Cuentas por pagar» de U8.
8. **Saldos deudores en reportes:** C1 ya pidió mostrarlos aparte; CP5 los toma de la misma fórmula (con ajustes).

## 10. Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`. Va **después de U8** (U8-1 y
U8-2 ya en `main`; CP2-2 suma su regla a `REGLAS_PARA_CORREGIR_SALDO_INICIAL` si U8-3 ya entró, y si no, U8-3 la
incluye).

1. **CP2-1 (servidor, datos):** `forma`, `fecha`, `referencia`, checks, único parcial e índice en
   `aplicaciones-de-notas.tablas.ts`; tabla `ajustes-de-saldo.tablas.ts`; `CAUSAS_DE_AJUSTE` y `EFECTO_DE_LA_CAUSA` en
   `dominio/ajustes.ts`; migración `0004` (§3.3, con relleno); `RecibirDocumento` y `RepositorioDeAplicaciones.agregar`
   guardan `forma` y `fecha`. **Pruebas de tablas:** dos manuales del mismo par (pasa), dos automáticas del mismo par
   (falla), forma inválida, referencia en una automática (falla) y con espacios (falla), ajuste con monto 0, causa
   inválida (incluida `liquidado_fuera_del_sistema`), `compensado_con_otra_cuenta` sin referencia (falla), anulación
   incompleta, ajuste entre proveedores distintos (falla), cascada al eliminar la nota, RLS por empresa; relleno de
   `fecha`; `politicas-de-los-modulos` y `llaves-entre-esquemas`.
2. **CP2-2 (servidor, saldos y bajas):** `saldoDe` y SQL con ajustes (`ajustado_de_la_nota`), DTO con `ajustado`,
   `AplicacionDeNota` con `id`, `forma`, `fecha`, `referencia` y serie y número del otro documento, filtro `conSaldo`,
   `accionesDelDocumento` con `puedeAplicar`/`puedeAjustar`, reglas `noTenerAplicacionesManualesRecibidas` y
   `noTenerAjustesVigentes` (§5.4; también en la lista de U8), error `CargoConAplicacionesManuales`, TSDoc de
   `noTenerNotasAplicadas`. **Pruebas:** saldo libre con ajuste vigente y anulado; anular una nota con ajuste (rechazo,
   desde aquí y desde Libro de compras); anular y eliminar una factura y una NDEB con una aplicación manual recibida
   (rechazo con el número de la nota, desde aquí y desde Libro de compras; nada cambia) y después de quitarla (pasa);
   saldo del proveedor; filtro. Las aplicaciones manuales de estas pruebas se siembran en la base (el caso de uso llega
   en CP2-3).
3. **CP2-3 (servidor, aplicar y quitar):** dominio de §5.1–5.2 (validaciones, fecha mínima, propuesta con autorizados
   primero), puertos `FechasDeEntrada` y `CargaInicial`, `AplicarNota`, `QuitarAplicacion`, `ListarCargosParaAplicar`
   (con `sobreUmbralDeBancarizacion`), variable `cuentas-por-pagar.bancarizacion.umbral`, errores, permiso
   `aplicar-notas`, rutas. **Pruebas** puras (validaciones, fecha mínima, propuesta) y de API: varios cargos, uno de
   otro proveedor, monto mayor que el saldo, suma mayor que el saldo libre, fecha futura, fecha anterior a la recepción
   de la nota y a la de un cargo, nota de saldo inicial con fecha anterior a la fecha de inicio (rechazo) y posterior
   (pasa), nota anulada, cargo pendiente (pasa), referencia guardada, umbral (cargo de Q30,000 marcado, de Q29,999.99
   no; umbral de instalación cambiado), quitar automática (rechazo), quitar manual con auditoría `quitar`, sin permiso
   (403), todo o nada.
4. **CP2-4 (servidor, ajustes):** `AjustarSaldo`, `AnularAjuste`, acción `ajustar` en `AccionAuditada`, eventos con
   `efecto`, variable `cuentas-por-pagar.ajustes.tope_diferencia_menor`, permisos `ajustes.crear`/`.anular`, rutas.
   **Pruebas:** ajuste total y parcial, mayor que el saldo libre, nota pendiente (rechazo), diferencia menor sobre el
   tope (rechazo) y con tope de la empresa distinto, compensado sin referencia (rechazo), fecha anterior a la recepción
   o a la fecha de inicio (rechazo), auditoría del alta y de la anulación con `anterior`, eventos tras confirmar con su
   `efecto` por causa, anular dos veces, sin permiso.
5. **CP2-5 (cliente, pantalla):** `NotasDeCredito.vue`, menú, textos, servicio y tipos.
6. **CP2-6 (cliente, ficha):** ventanas de aplicación y de ajuste (avisos de bancarización, de año anterior y de «error
   de la nota»), quitar y anular con motivo, secciones nuevas de la ficha, mensaje de la ficha de un cargo con
   aplicaciones manuales, lógica pura con pruebas.
7. **CP2-7 (QA):** factura con retención y nota de devolución total (saldo libre = retención), aplicarla a otra factura
   del proveedor (una de ellas sin autorizar y otra de más de Q30,000, con el aviso) en dos partes y fechas, con
   referencia; intentar una fecha anterior a la recepción (rechazo); intentar anular desde Libro de compras la factura
   que recibió la aplicación (rechazo con «quite primero la aplicación de la nota N»), quitarla y anular (pasa); ajustar
   el resto como «No se recuperará» (ayuda «no deducible»); diferencia menor sobre el tope (rechazo); intentar ajustar
   una nota pendiente (rechazo); anular el ajuste; intentar anular la nota con ajuste (rechazo desde Cuentas por pagar y
   desde Libro de compras); nota de saldo inicial aplicada a una factura del libro; permisos por separado.

## 11. Preguntas para el usuario (respondidas el 2026-11-08)

El usuario aceptó todas las recomendaciones. Quedan como registro:

- **CP2-a. Pantalla propia.** **Respondida:** página «Notas de crédito» en Operación, por omisión con las que tienen
  saldo a favor.
- **CP2-b. A qué cargos y desde qué nota.** **Respondida:** a cualquier cargo vigente del proveedor (también los de la
  bandeja y los no autorizados, marcados «Sin autorizar» y propuestos después de los autorizados) y desde cualquier
  nota vigente, también pendiente. Con la regla de §5.4 para dar de baja un cargo que recibió aplicaciones manuales.
- **CP2-c. Fecha de la aplicación manual.** **Respondida:** la escribe el usuario (la del acuerdo), por omisión hoy; no
  futura ni anterior a la recepción de la nota y de los cargos, ni a la fecha de inicio si hay saldos iniciales.
- **CP2-d. Quitar una aplicación manual.** **Respondida:** con motivo obligatorio y auditoría `quitar`. Las automáticas no
  se quitan nunca.
- **CP2-e. Ajuste solo del saldo libre de notas.** **Respondida:** solo notas en CP2; las diferencias al pagar se deciden
  en CP4 (un descuento de precio exige nota de crédito; los centavos pueden ser ajuste).
- **CP2-f. Causas del ajuste.** **Respondida:** la lista corregida del contador (§2.1: No se recuperará, Diferencia
  menor con tope, Compensado con otra cuenta del tercero), sin «Otra» ni «Liquidado fuera del sistema». Sin aprobación
  aparte: basta el permiso propio, más el tope y el reporte mensual de ajustes de CP5.
- **CP2-g. Varias aplicaciones a la vez.** **Respondida:** sí, una nota a varios cargos en una petición (máx. 100, todo
  o nada) con el reparto propuesto.
- **CP2-h. Permisos.** **Respondida:** `documentos.aplicar-notas`, `ajustes.crear` y `ajustes.anular`.
- **CP2-i. Ajustes anulados al eliminar la nota.** **Respondida:** se van con ella (cascada) y quedan en el `anterior` de
  la auditoría.

Preguntas depuradas del dictamen que tocan CP2, todas respondidas con la recomendación: (1) «liquidado fuera del
sistema» se quita y el reintegro de CP4 acepta efectivo; (2) lista corregida sin «Otra»; (3) cargo con aplicaciones
manuales: rechazar con «quite primero la aplicación de la nota N»; (4) aviso de bancarización y referencia del acuerdo;
(5) el ajuste exige la nota registrada o autorizada; (8) reporte mensual de ajustes en CP5.

## 12. Lo que debía validar `contador-guatemala` (validado el 2026-11-08)

Dictamen `dictamen-cp2-cp3-2026-11-08.md`: **correcto con ajustes**, ya aplicados.

- **C-CP2-1. Compensación con otra factura.** Válida, sin efecto en IVA ni ISR; antes del vencimiento es compensación por
  acuerdo: referencia del acuerdo y aviso de bancarización (§5.1). Fecha la del acuerdo, con el límite inferior por
  recepción y fecha de inicio.
- **C-CP2-2. Ajuste del saldo a favor.** Causas con efecto `perdida`/`transitoria` (§2.1); la baja es gasto no deducible
  en el régimen sobre utilidades, no una cuenta incobrable; evento con `efecto` (§6.4).
- **C-CP2-3. Aplicar a un cargo no autorizado.** Aceptable; regla de §5.4 y marca «Sin autorizar».
- **C-CP2-4. Saldos deudores.** Se reclasifican al cierre por proveedor con una partida sacada del reporte de CP5; la
  aplicación manual no necesita evento.
- **C-CP2-5. Ajuste en un mes declarado o cerrado.** Sin efecto en el IVA; aviso si cae en un año anterior; Contabilidad
  sumará la regla del mes cerrado.

## 13. Pendiente nuevo

- **P-CP2-1 (para el usuario, no frena CP2-1 a CP2-3): adjuntos.** El dictamen recomienda un **adjunto opcional** con el
  acuerdo de compensación (C-CP2-1) y con lo hecho para cobrar en un ajuste «No se recuperará» (C-CP2-2). Las preguntas
  depuradas solo aprobaron la **referencia** escrita, así que CP2 no lleva adjuntos. Si se quieren, se diseñan aparte
  sobre `core.archivos` (con el agente de seguridad), sin cambiar estas tablas.
- **P-CP2-2 (confirmar, no frena): tope por omisión de «Diferencia menor».** Se dejó en **Q25** (el ejemplo del
  dictamen), cambiable por empresa y por instalación.
