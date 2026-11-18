# Diseño: defensa en profundidad para las tablas de `core` sin RLS

_Agente `arquitecto-de-datos`, 2026-11-18. Diseño corto pedido en `docs/DONDE-QUEDAMOS.md` («Pendiente de diseño
(seguridad, defensa en profundidad)»). No cambia reglas de producto: endurece la base para que un error de programación
no pueda mezclar cuentas. Preguntas al final (§9); se puede programar R-1 y R-2 con lo recomendado sin esperarlas._

## 0. Qué protege y qué no

- **Amenaza que cubre:** un error en el código de la aplicación (una consulta sin filtro, una `cuenta_id` equivocada, un
  `update` que arrastra columnas que no debía). Hoy `core.empresas` y otras 15 tablas dependen solo de que cada consulta
  filtre bien.
- **Lo que no cubre:** quien ejecuta SQL arbitrario como `arrancar_app` puede fijar `app.cuenta_id` a su gusto. Igual que
  la RLS de los módulos, esto es defensa contra errores, no contra una inyección de SQL (contra esa: consultas con
  parámetros, Drizzle, y que `arrancar_app` no tenga privilegios que no use).
- Por eso hay dos herramientas que se complementan: **privilegios** (lo que `arrancar_app` nunca debe hacer, ni con las
  variables bien puestas) y **RLS por cuenta** (lo que solo puede hacer dentro de la cuenta de la transacción).

## 1. Lo que hay hoy (revisado en el código y en la base de desarrollo, solo lectura)

**Tablas de `core` (19):** con RLS `archivos`, `auditoria`, `correlativos`; **sin RLS las otras 16**: `cuentas`,
`cuenta_modulos`, `empresas`, `empresa_usuarios`, `usuarios`, `sesiones`, `roles`, `rol_permisos`, `usuario_roles`,
`usuario_permisos`, `configuraciones`, `bitacora_superacceso`, `monedas`, `feriados`, `departamentos`, `municipios`.
Ninguna tiene disparadores. `relforcerowsecurity` está apagado en todas (el dueño es `arrancar`, superusuario).

**Privilegios:** `arrancar_app` tiene `select, insert, update, delete` sobre **las 19**, porque el migrador corre después de
cada módulo `grant select, insert, update, delete on all tables in schema <esquema>` (`core/base-datos/migrador.ts`,
`otorgarPermisosAplicacion`). **Consecuencia para este diseño:** un `revoke` dentro de una migración se deshace en la
siguiente corrida del migrador; las restricciones tienen que aplicarse **en el migrador, después del grant** (§3).

**Quién usa cada tabla y con qué conexión** (clave para saber si la RLS puede leer `app.cuenta_id`):

| Uso | Conexión | Variables `app.*` | Tablas |
|---|---|---|---|
| Inicio de sesión, cookie, cambio de empresa (`RepositorioSesionesDrizzle`, `EmpresasDeLaSesionDrizzle`) | `bd` directa | **ninguna** (aún no hay empresa activa) | `sesiones`, `usuarios`, `empresas`, `cuentas`, `empresa_usuarios`, `cuenta_modulos` |
| Permisos de la sesión (`PermisosDeUsuarioDrizzle`, `ConsultasRolesDrizzle`) | `bd` | ninguna | `roles`, `rol_permisos`, `usuario_roles`, `usuario_permisos` |
| Superacceso: lista de todas las empresas (`EmpresasDeLaSesionDrizzle.todas`) | `bd` | ninguna | `empresas`, `cuentas` |
| Soporte: cuentas (`ConsultasCuentasDrizzle`, `RepositorioCuentasDrizzle`), bitácora (`BitacoraDrizzle`) | `bd` | ninguna | `cuentas`, `cuenta_modulos`, `empresas`, `bitacora_superacceso`, `usuarios` |
| **Alta de cuenta** (`DarDeAltaCuenta` → `TransaccionDeAltaPostgres`) | transacción propia | **ninguna** | `cuentas`, `empresas`, `roles`, `rol_permisos`, `usuarios`, `empresa_usuarios`, `usuario_roles` |
| Configuración (`RepositorioConfiguracionesDrizzle`) | `bd` | ninguna | `configuraciones` |
| Usuarios de la cuenta (`ConsultasUsuariosDrizzle.listarDeCuenta`) | `bd` | ninguna | `usuarios`, `empresa_usuarios`, `empresas`, `usuario_roles`… |
| Empresas (registrar, editar, Excel), accesos de usuarios, roles, asignaciones | `UnidadDeTrabajo` | **sí** | `empresas`, `empresa_usuarios`, `roles`, `rol_permisos`, `usuario_roles`, `usuario_permisos`, `usuarios` |
| `ejecutarEnEmpresaNueva` (`exigirQueSeCreoAqui`) | punto de guardado de la UdT | sí (la cuenta del operador) | `empresas`, filtrando `id`, `cuenta_id = contexto.cuentaId` y `creado_en = now()` |
| Módulos (nombre y NIT en reportes, accesos, custodios) | `UnidadDeTrabajo` | sí | `empresas`, `empresa_usuarios`, `usuarios` (uniones) |
| Siembra (`sembrar.ts`) | `bd` (`arrancar_app`) | ninguna | `usuarios` (crea a `supergod` con `es_superacceso = true`) |
| ~20 andamios de pruebas (`escenario.soporte.ts`, `alcance-datos.soporte.ts`…) | `bd` (`arrancar_app`) | ninguna | `insert` en `cuentas`, `usuarios`, `empresas` |

**Escrituras reales de la aplicación** (lo que fija qué privilegios sobran):

| Tabla | insert | update (columnas) | delete |
|---|---|---|---|
| `empresas` | sí | `nombre, nit, direccion, telefono, correo, moneda_base, activa, actualizado_en, actualizado_por` | **nunca** |
| `cuentas` | sí (alta) | `nombre, activa, actualizado_en` | **nunca** |
| `cuenta_modulos` | sí | **nunca** | sí |
| `empresa_usuarios` | sí | **nunca** | sí |
| `usuarios` | sí | `correo, nombres, apellidos, hash_contrasena, activo, ultimo_acceso_en, actualizado_en` (el repositorio ya excluye `usuario` y `es_superacceso`) | **nunca** |
| `sesiones` | sí | `empresa_activa_id, expira_en` | sí |
| `roles` | sí | `nombre, descripcion, acceso_total, actualizado_en` | sí |
| `rol_permisos`, `usuario_roles`, `usuario_permisos` | sí | **nunca** | sí |
| `configuraciones` | sí | `valor, actualizado_por, actualizado_en` (upsert) | sí |
| `bitacora_superacceso` | sí | **nunca** | **nunca** |
| `feriados` | sí (soporte) | **nunca** | sí |
| `monedas`, `departamentos`, `municipios` | **nunca** (las siembra la migración) | **nunca** | **nunca** |
| `auditoria` (con RLS) | sí | nunca (RLS lo niega) | nunca (solo `core.depurar_auditoria`, `security definer`) |

**Hallazgos que el diseño debe respetar:**

1. **`usuarioDeLaCuenta` necesita ver todas las cuentas del usuario.** `RepositorioUsuariosDrizzle.cuentasDe` une
   `empresa_usuarios` con `empresas` sin filtro de cuenta y decide `soloEnEstaCuenta` (si el administrador puede cambiar
   nombre o contraseña de alguien que también trabaja en otra cuenta). Corre dentro de la unidad de trabajo: **si
   `core.empresas` filtrara la lectura por cuenta, `cuentasDe` siempre devolvería solo la cuenta actual** y un
   administrador podría cambiar la contraseña de un usuario compartido con otra cuenta. Cualquier RLS de lectura sobre
   `empresas` o `empresa_usuarios` exige antes una función `security definer` para esto (§5).
2. `exigirQueSeCreoAqui` filtra por `cuenta_id = contexto.cuentaId`, que es la misma `app.cuenta_id` de la transacción:
   **con RLS de lectura por cuenta sigue funcionando** (la empresa de otra cuenta tampoco se ve, que es lo que se quiere).
   El comentario que pide «una función `security definer` si algún día tiene RLS» sobra; la prueba
   «core.empresas no tiene seguridad por filas» se cambia por «una empresa de otra cuenta no es nueva» (§5).
3. Hoy un `update core.empresas set creado_en = now()` sobre una empresa vieja la haría pasar por «nueva» en
   `ejecutarEnEmpresaNueva`. Lo impide solo el código. Es el caso más delicado y lo cierra R-1.
4. El error `42501` se traduce siempre a `RecursoNoEncontrado` (`errores-de-postgres.ts`), sea RLS o privilegio negado.
   Un privilegio negado es siempre un error de programación: debe salir como fallo inesperado (500 y registro), no como
   un 404 silencioso que lo esconda (R-1).
5. La empresa inicial del alta queda hoy con `creado_por` nulo (la transacción del alta no fija `app.usuario_id`).

## 2. Opciones para `core.empresas`

| Opción | Qué es | A favor | En contra |
|---|---|---|---|
| A. Solo privilegios y disparador | Sin `delete`; `update` solo de las columnas editables; disparador que rechaza cambiar `id`, `cuenta_id`, `creado_en`, `creado_por` (también al dueño) | Ninguna consulta cambia; cierra el hallazgo 3 | No impide **insertar** con otra `cuenta_id` ni editar una empresa de otra cuenta |
| **B. A + RLS de escritura por cuenta** (lectura abierta) | Políticas `insert`/`update` con `cuenta_id = app.cuenta_id`; `select using (true)`; sin política de `delete` | Cierra insertar en otra cuenta y editar empresas ajenas; la sesión, el superacceso y soporte siguen leyendo igual; solo cambia el alta (fijar la cuenta) y los andamios de pruebas | La lectura entre cuentas sigue dependiendo del filtro de cada consulta |
| C. B + RLS de lectura por cuenta | `select` con `cuenta_id = app.cuenta_id`; lo que necesita ver todo pasa por funciones `security definer` | Un `join` olvidado en un módulo ya no puede mostrar nombre y NIT de otra cuenta | 5 funciones nuevas, 6 adaptadores que cambian, `ListarUsuarios` entra a una unidad de trabajo; hallazgo 1 obligatorio |

**Recomendación: B ahora (R-1 a R-3) y C como paso aparte (R-4), con revisión de `seguridad`.** B cierra todo lo que el
pendiente pide (insertar con otra cuenta, mover `cuenta_id`/`creado_en`, `delete`) con cambios chicos; C protege la
lectura, que es un riesgo menor (los módulos leen `core.empresas` dentro de la unidad de trabajo y casi siempre por el id
de la empresa activa) y cuesta más. Separarlas deja R-1 a R-3 sin riesgo para el inicio de sesión.

## 3. Privilegios: dónde viven y qué sobra (R-1)

**Opción elegida:** un mapa en TypeScript que el migrador aplica **en la misma consulta** que el `grant` (es atómica):
`core/base-datos/privilegios-restringidos.ts`, `RESTRICCIONES_DE_PRIVILEGIOS: Record<'<esquema>.<tabla>', { sin:
('insert'|'update'|'delete')[]; actualizarSolo?: readonly string[] }>`. Para cada entrada el migrador emite `revoke
<sin> on <tabla> from arrancar_app` y, si hay `actualizarSolo`, `revoke update on <tabla>` seguido de `grant update
(<columnas>) on <tabla>` (al quitar el `update` de la tabla, PostgreSQL quita también los de columna; así el orden es
idempotente). La alternativa (una función SQL `core.restringir_privilegios()` reemplazada en cada migración que agrega
una tabla) deja el historial en las migraciones pero obliga a reescribirla entera cada vez; el mapa es una sola fuente
que la prueba también lee. No necesita migración.

**Por qué no hay `actualizarSolo` en `insert`:** Drizzle escribe todas las columnas en el `insert` (con `default` las que
faltan) y PostgreSQL exige privilegio sobre cada columna nombrada aunque el valor sea `default`. Lo del `insert` se cuida
con RLS (§4) y con el disparador.

| Tabla | Quitar a `arrancar_app` | `update` solo de |
|---|---|---|
| `core.empresas` | `delete` | `nombre, nit, direccion, telefono, correo, moneda_base, activa, actualizado_en, actualizado_por` |
| `core.cuentas` | `delete` | `nombre, activa, actualizado_en` |
| `core.cuenta_modulos` | `update` | — |
| `core.empresa_usuarios` | `update` | — |
| `core.usuarios` | `delete` | `correo, nombres, apellidos, hash_contrasena, activo, ultimo_acceso_en, actualizado_en` (nunca `id`, `usuario`, `es_superacceso`, `creado_en`) |
| `core.sesiones` | — | `empresa_activa_id, expira_en` |
| `core.roles` | — | `nombre, descripcion, acceso_total, actualizado_en` (nunca `cuenta_id`) |
| `core.rol_permisos`, `core.usuario_roles`, `core.usuario_permisos` | `update` | — |
| `core.configuraciones` | — | `valor, actualizado_por, actualizado_en` (nunca `nivel`, `cuenta_id`, `empresa_id`, `clave`) |
| `core.bitacora_superacceso` | `update, delete` (solo crece, como la auditoría) | — |
| `core.auditoria` | `update, delete` (hoy lo niega la RLS; esto lo niega también sin RLS) | — |
| `core.feriados` | `update` | — |
| `core.departamentos`, `core.municipios` | `insert, update, delete` | — |
| `core.monedas` | `delete` (insertar y cambiar lo decide MM-1, que les da API) | — |
| `core.archivos`, `core.correlativos` | sin cambio | — |

Las tablas nuevas de EM-2 (`core.recursos_de_auditoria_permanente`: `insert, update, delete`), del correo y de
Multimoneda entran al mapa en su propio paso; la prueba de R-1 falla si una tabla de `core` no está clasificada.

**Disparador de `core.empresas`** (en la migración de R-1, `--custom`): `core.proteger_columnas_de_empresas()`,
`before update for each row`, `language plpgsql`, sin `security definer`: si `new.id`, `new.cuenta_id`, `new.creado_en` o
`new.creado_por` son `distinct from` los de `old`, `raise exception 'No se puede cambiar % de una empresa', <columna>
using errcode = 'check_violation', constraint = 'empresas_columnas_fijas'`. Corre también para el dueño: una migración de
datos que de verdad necesite mover una empresa tendría que desactivarlo a la vista (§9, P-2). Con el privilegio de
columna ya basta para `arrancar_app`; el disparador agrega el mensaje claro y cubre al dueño. Mismo disparador, misma
función genérica con la lista de columnas por argumento (`tg_argv`), para `core.roles` (`id`, `cuenta_id`, `creado_en`).

**Usuario de soporte** (P-3): disparador `core.proteger_superacceso()`, `before insert or update` en `core.usuarios`:
si `current_user = 'arrancar_app'` y `new.es_superacceso` (en `insert`, o en `update` con `old.es_superacceso` falso),
rechaza. Hoy el repositorio ya no actualiza esa columna (y el privilegio de columna lo impedirá), pero `insert` no tiene
privilegio por columna: sin este disparador, un error que cree un usuario con `es_superacceso = true` da acceso a todas
las cuentas. Exige que `sembrar.ts` cree a `supergod` con `DATABASE_URL_PROPIETARIO`.

**Errores** (hallazgo 4): `interpretarErrorDePostgres` traduce `42501` a `RecursoNoEncontrado` solo si el mensaje es de
política RLS (`new row violates row-level security policy…`); `permission denied for …` queda como error inesperado.

## 4. RLS de escritura por cuenta (R-3)

**Piezas nuevas en `core/base-datos/columnas.ts`** (junto a `politicaPorCuenta`):

- `politicasDeEscrituraPorCuenta()`: `leer_sin_filtro` (`for select using (true)`), `crear_en_la_cuenta` (`for insert
  with check (cuenta_id = <cuenta de la transacción>)`), `cambiar_en_la_cuenta` (`for update using (…) with check (…)`) y
  `borrar_en_la_cuenta` (`for delete using (…)`). Todas `to arrancar_app`.
- `politicasDeEscrituraPorCuentaDe(padre, llave)`: lo mismo para tablas sin `cuenta_id`, con la condición `exists (select
  1 from <padre> p where p.id = <llave> and p.cuenta_id = <cuenta de la transacción>)`. La subconsulta va a **otra**
  tabla (no hay recursión, a diferencia de las tablas de accesos), y su `select` está abierto (o filtrado por cuenta en
  R-4, que da el mismo resultado).

| Tabla | Políticas | Índice que la sirve | Notas |
|---|---|---|---|
| `core.empresas` | `politicasDeEscrituraPorCuenta()` | `empresas_cuenta_idx` (existe) | Sin política de `delete` (y sin privilegio): nadie borra empresas desde la aplicación |
| `core.empresa_usuarios` | `…De('core.empresas', 'empresa_id')` | PK de `empresas` | Un error que meta a un usuario en una empresa de otra cuenta le daría entrada a esa cuenta (`esMiembro`): es la escritura más peligrosa |
| `core.roles` | `politicasDeEscrituraPorCuenta()` | `roles_id_cuenta_unico` | |
| `core.rol_permisos` | `…De('core.roles', 'rol_id')` | PK de `roles` | |
| `core.usuario_roles` | `politicasDeEscrituraPorCuenta()` | PK `(cuenta_id, …)` | La llave compuesta ya ata el rol a la cuenta |
| `core.usuario_permisos` | `politicasDeEscrituraPorCuenta()` | PK `(cuenta_id, …)` | |

**Se quedan sin RLS** (se escriben o leen sin variables y el riesgo se cubre con privilegios): `cuentas` y
`cuenta_modulos` (solo soporte, por encima de las cuentas), `usuarios` (son de todo el servidor: el inicio de sesión busca
por nombre en todas), `sesiones` (se buscan por la huella del token antes de saber la empresa), `configuraciones` (se
escribe con `bd`; pasarla a la unidad de trabajo es otro paso, P-4), `bitacora_superacceso` (de soporte, solo crece),
`feriados`, `monedas`, `departamentos`, `municipios` (catálogos de la instalación). La prueba de R-1 deja escrito por qué.

**Lo que cambia en el código para que la RLS de escritura no rompa nada (R-2, antes que R-3):**

- **Alta de cuenta:** `TransaccionDeAltaPostgres.ejecutar` recibe la cuenta nueva (su id sale del dominio, `Cuenta.registrar`,
  antes de insertar) y el usuario de soporte, y fija `app.cuenta_id` y `app.usuario_id` (sin `app.empresa_id`) al abrir
  la transacción, con `fijarVariablesDeSeguridad` o una variante sin empresa. Arregla de paso el hallazgo 5 (`creado_por`
  de la empresa inicial). `sembrar --demo` pasa por el mismo caso de uso.
- **Andamios de pruebas:** los ~20 que insertan `cuentas`/`usuarios`/`empresas` con `bd` pasan a una pieza común
  (`core/base-datos/sembrado-de-prueba.soporte.ts`, por ejemplo `crearCuentasYEmpresas(...)`) que lo hace como dueño.
  Es mecánico; se puede hacer con `haiku`.
- `RegistrarEmpresa` y `ejecutarEnEmpresaNueva`: sin cambio de lógica (la empresa se inserta con la cuenta del operador,
  que es `app.cuenta_id`); se corrigen los comentarios que dicen «la tabla no tiene seguridad por filas».

## 5. RLS de lectura de `core.empresas` (R-4, opcional, P-1)

Política `leer_en_la_cuenta` (`for select using (cuenta_id = <cuenta de la transacción>)`) en lugar de `leer_sin_filtro`.
Lo que necesita ver más allá de la cuenta pasa por funciones `security definer` del dueño, `language sql stable`,
`set search_path = pg_catalog, core`, `revoke execute … from public` y `grant execute … to arrancar_app`, que devuelven
solo las columnas que el llamador usa hoy:

| Función | Reemplaza | Devuelve |
|---|---|---|
| `core.empresa_de_la_sesion(empresa uuid)` | `EmpresasDeLaSesionDrizzle.buscar` | `id, nombre, nit, cuenta_id, cuenta_nombre` |
| `core.empresas_del_usuario(usuario uuid)` | `disponiblesPara` y `esMiembro` (solo empresas y cuentas activas) | lo mismo, ordenado |
| `core.todas_las_empresas()` | `todas` (superacceso) | lo mismo |
| `core.pertenencia_del_usuario(usuario uuid, cuenta uuid)` | `RepositorioUsuariosDrizzle.cuentasDe` (hallazgo 1) | `en_la_cuenta boolean, otras_cuentas integer` (no revela cuáles) |
| `core.resumen_de_cuentas()` | `ConsultasCuentasDrizzle.listar` (conteo de empresas) | `cuenta_id, total_empresas` |
| `core.nombres_de_empresas(ids uuid[])` | unión de `BitacoraDrizzle.listar` | `id, nombre` |

Además, `ListarUsuarios` corre dentro de la unidad de trabajo del operador (hoy usa `bd`). Con eso, en `core.empresas`
ya no hay lectura del código fuera de RLS. La misma idea para `empresa_usuarios` **no** se recomienda: casi todos sus
lectores son de la sesión y ya irían por esas funciones; el riesgo restante es bajo.

## 6. Migración y datos existentes

- **Orden en el core:** EM-2 (`0024_auditoria_permanente`) → **esta** → correo (pasos 2 y 4) → Multimoneda (MM-1). Va
  pegada a EM-2 porque es corta y solo toca tablas que ya existen; el número es el siguiente libre al programar (`0025`
  si nada se adelanta). R-1 y R-3 tienen una migración cada uno (o una sola si se unen en el mismo paso); R-4, la suya.
- **R-1:** `bd:generar -w servidor -- core columnas_fijas_de_empresas --custom` (funciones y disparadores). Los privilegios
  no van en migración (§3).
- **R-3:** se generan desde los `*.tablas.ts` (`bd:generar -w servidor -- core rls_de_escritura_de_core`): drizzle-kit
  activa la RLS y crea las políticas.
- **Datos:** no hay que mover nada. La RLS y los disparadores no revisan filas existentes; las relaciones actuales ya son
  coherentes por construcción (llave compuesta de `usuario_roles`). Antes de desplegar R-3 en producción, consulta de
  control (solo lectura): `empresa_usuarios` cuyo usuario tenga `usuario_roles` en otra cuenta que la de la empresa no es
  un error (un usuario puede estar en varias cuentas); no hay invariante que verificar.
- **Llaves foráneas** desde los módulos hacia `core.empresas`: PostgreSQL las revisa sin RLS; el `on delete cascade` desde
  `core.cuentas` lo ejecuta el dueño (la baja de cliente). Nada cambia.
- Permisos de la aplicación, configuración, Excel y auditoría: **sin cambios** (no hay permisos ni variables nuevas; el
  Excel de Empresas pasa por `RegistrarEmpresa`; la bitácora de superacceso pasa a solo crecer, como la auditoría).

## 7. Pasos (un commit cada uno, con sus pruebas)

| Paso | Qué | Pruebas | Depende de |
|---|---|---|---|
| **R-1** (servidor, core) | Mapa `RESTRICCIONES_DE_PRIVILEGIOS` y su aplicación en `otorgarPermisosAplicacion`; migración `--custom` con `core.proteger_columnas()` en `empresas` y `roles` y `core.proteger_superacceso()` en `usuarios`; `sembrar.ts` crea a soporte como dueño; `42501` por privilegio ya no es 404 | `seguridad-de-core.prueba.ts`: cada tabla de `core` está en el mapa de lo esperado (RLS sí/no y privilegios de `arrancar_app` leídos de `information_schema.role_table_grants` y `column_privileges`), también tras migrar **dos veces**; como `arrancar_app`: `delete from core.empresas` → `42501`; `update … set cuenta_id`, `set creado_en = now()` → `42501`; editar nombre, nit, activa → bien; `update`/`delete` en `bitacora_superacceso` y `auditoria` → `42501`; `insert` en `departamentos` → `42501`; `insert` de usuario con `es_superacceso` → rechazo; como dueño: `update core.empresas set cuenta_id` → `empresas_columnas_fijas`; `ejecutarEnEmpresaNueva` sobre una empresa vieja sigue en `EmpresaNoEsNueva`; el error de privilegio llega como inesperado | EM-2.2 (por el número de migración) |
| **R-2** (servidor, core) | Alta de cuenta con `app.cuenta_id` y `app.usuario_id`; pieza común de sembrado como dueño en los andamios de pruebas | El alta deja `creado_por` = soporte en la empresa inicial; toda la batería pasa sin cambios de comportamiento | R-1 |
| **R-3** (servidor, core) | `politicasDeEscrituraPorCuenta` y `…De` en `columnas.ts`; políticas en `empresas`, `empresa_usuarios`, `roles`, `rol_permisos`, `usuario_roles`, `usuario_permisos`; migración generada; comentarios de `RegistrarEmpresa` y la unidad de trabajo | En una unidad de trabajo de la cuenta A: insertar empresa con cuenta B → rechazo RLS; `update` de una empresa de B → 0 filas; dar acceso a un usuario en una empresa de B → rechazo; quitarlo → 0 filas; crear rol en B, permiso a un rol de B, `usuario_roles`/`usuario_permisos` en B → rechazo; registrar empresa, Excel de Empresas, asignar empresas, roles y permisos en A → bien; inicio de sesión, cambio de empresa, superacceso y alta → bien (pruebas de API existentes) | R-2 |
| **R-4** (servidor, core; opcional) | Lectura por cuenta en `core.empresas`; las 6 funciones `security definer`; adaptadores de sesión, soporte, bitácora y `cuentasDe`; `ListarUsuarios` en la unidad de trabajo. **Revisión de `seguridad` antes de unirlo** | Leer `core.empresas` en una unidad de trabajo de A no muestra B; `usuarioDeLaCuenta` con un usuario compartido entre A y B sigue dando `soloEnEstaCuenta = false` (prueba que hoy no existe y protege el hallazgo 1); «una empresa de otra cuenta no es nueva» reemplaza a «core.empresas no tiene seguridad por filas»; funciones sin `execute` para `public` | R-3 |
| **R-5** (documentos) | `CLAUDE.md` (Multiempresa y seguridad: privilegios en el migrador, tablas de `core` con RLS de escritura), `docs/PLAN.md` (bitácora) y `docs/ARQUITECTURA.md` | — | R-3 (o R-4) |

## 8. Convivencia con lo que está en curso

- **EM-2:** su tabla `core.recursos_de_auditoria_permanente` va al mapa de R-1 sin `insert, update, delete` para la
  aplicación (ya lo niega su RLS). Si R-1 se programa antes que EM-2.2 se une, la entrada se agrega en EM-2.2.
- **Correo y Multimoneda:** sus tablas nuevas de `core` tienen que entrar al mapa (la prueba lo obliga). MM-1 decide los
  privilegios de `core.monedas` (hoy solo se le quita `delete`).
- **Excel de Empresas y `ejecutarEnOtraEmpresa`:** trabajan dentro de la cuenta del operador; R-3 no los afecta.
- **Rendimiento:** las políticas leen `current_setting` y, en dos tablas, una subconsulta por la llave primaria; las
  escrituras de estas tablas son pocas.

## 9. Preguntas para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| P-1 | ¿Hasta dónde llegamos con `core.empresas`? | (a) Solo privilegios y disparador (R-1); (b) además RLS de escritura por cuenta (R-1 a R-3); (c) además RLS de lectura con funciones `security definer` (R-4) | **(c) en dos tiempos:** R-1 a R-3 ya; R-4 después, con revisión de seguridad. (b) cierra todo lo pendiente; (c) protege también que un `join` olvidado muestre nombre y NIT de otra cuenta |
| P-2 | ¿Alguna vez se necesitará mover una empresa de una cuenta a otra (venta del negocio, unir dos suscriptores)? | (a) Nunca; (b) sí, por soporte, con un procedimiento propio | **(a) por ahora.** Si llega, es un procedimiento de soporte que corre como dueño, desactiva el disparador a la vista y deja auditoría en las dos cuentas; no se abre desde la aplicación |
| P-3 | ¿El usuario de soporte solo lo crea el dueño de la base (siembra con `DATABASE_URL_PROPIETARIO`)? | (a) Sí, y la aplicación nunca puede crear ni volver superacceso a nadie; (b) se deja como hoy | **(a)**: un superacceso creado por error ve todas las cuentas. Exige que en producción la siembra tenga la URL del dueño (ya la tiene el migrador) |
| P-4 | ¿`core.configuraciones` también lleva RLS (por cuenta y empresa, con el nivel instalación solo para soporte)? | (a) No por ahora: solo privilegios por columna; (b) sí, pasando el repositorio a la unidad de trabajo | **(a)**: el riesgo es menor (cada fila ya está atada a su nivel por un `check`) y (b) cambia la lectura de la configuración pública de la sesión, que hoy se hace sin empresa. Queda como pendiente |
| P-5 | ¿La bitácora de superacceso queda como la auditoría: solo crece, nunca se cambia ni se borra desde la aplicación? | (a) Sí; (b) se le define una conservación con depuración como la auditoría | **(a)** ahora; si después se quiere depurar, se hace con una función `security definer` como `core.depurar_auditoria` |

## Respuestas del usuario (2026-11-18)

Todas las recomendaciones: protección completa en dos tiempos (R-1 a R-3 ya; R-4, RLS de lectura por cuenta con funciones
`security definer`, después y con revisión de seguridad); una empresa **nunca** se mueve de cuenta por ahora (si hace falta,
procedimiento de soporte con el dueño de la base y auditoría en las dos cuentas); el superacceso **solo lo crea el dueño de
la base** (la siembra con `DATABASE_URL_PROPIETARIO`); `core.configuraciones` por ahora solo con privilegios por columna
(RLS pendiente); la bitácora de superacceso solo crece y la aplicación no la cambia ni la borra.
