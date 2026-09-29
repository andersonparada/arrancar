# Diseño de permisos por usuario y de la ventana de asignación de localidades — arquitecto de datos, 2026-09-29

Aplica las «Respuestas del usuario (2026-09-29, tarde)» de `docs/DONDE-QUEDAMOS.md` y de
`diseno-accesos-por-modulo.md`. **Se confirma con el usuario antes de programar**
(sección 11). Donde choque con `diseno-accesos-por-modulo.md` (pasos 5, 7 y 8, y las
políticas de la tabla de accesos), manda este documento.

## 1. Lo encontrado

1. **El rol vive en la empresa.** `core.empresa_usuarios (empresa_id, usuario_id, rol_id not
   null → core.roles on delete restrict)`, llave `(empresa_id, usuario_id)`. Un usuario tiene
   un solo rol por empresa y puede tener roles distintos en empresas distintas de la misma
   cuenta. `core.roles` (por cuenta, `acceso_total`) y `core.rol_permisos (rol_id, permiso)`
   no tienen RLS: se leen antes de saber la empresa activa y se filtra por cuenta en código.
2. **El resolutor se ejecuta en cada petición** (`ValidarSesion` → `ResolutorDeAcceso.resolver`):
   `accesoDe(usuario, empresa)` da el rol de esa empresa; los permisos son los del rol (o
   todos los disponibles si tiene acceso total) limitados a los módulos activos, menos los
   `soloSuperacceso`; con eso calcula `recursosAlcanceTotal`. El superacceso usa
   `ROL_DE_SOPORTE`. Como no hay caché, un cambio de permisos vale desde la petición siguiente.
3. **Quién escribe `empresa_usuarios`:** `AccesosAEmpresasDrizzle.reemplazarEnCuenta` (crear y
   editar usuario, `accesos: [{ empresaId, rolId }]`), `EmpresaInicialDrizzle` (alta de cuenta:
   propietario), `empresas/…/accesos-a-empresas.drizzle.ts` (`RegistrarEmpresa` copia al creador
   **el rol que tiene en la empresa activa**) y la semilla. Lo leen además `usoDe` del rol
   (`usuariosAsignados`), `ConsultasRolesDrizzle` (`totalUsuarios`) y `ConsultasUsuariosDrizzle`.
4. **Escalada posible hoy:** con `usuarios.crear` o `usuarios.editar` se puede dar a otro un rol
   con acceso total; solo impide cambiarse a sí mismo (`NoPuedeCambiarseASiMismo`). Los cambios
   de accesos a empresas y de permisos de un rol **no se auditan**.
5. **Invariante actual:** «al menos un rol con acceso total» por cuenta; no garantiza que alguien
   lo tenga asignado.
6. **Las migraciones de permisos** (`bancos/0010`, `0020`, `0023`, `core/0015`…) solo tocan
   `core.rol_permisos` («quien tenía X recibe Y»).
7. **Alcance por registro:** `alcance.ts` ya existe, pero **ninguna tabla lo usa todavía**
   (`pg_policies` de `empresas` solo tiene `aislamiento_por_empresa`); localidades es el paso 5
   del otro diseño. Cambiar las políticas ahora no requiere migrar políticas existentes; solo
   `alcance.ts` y `alcance-datos.prueba.ts`.
8. **Datos:** la base de desarrollo tiene `core.empresa_usuarios`, `roles` y `rol_permisos`
   vacías (0 filas). Producción puede tener datos: la migración debe ser correcta con cualquier
   contenido.
9. **Journals:** `core` llega a `when` 1790701976622 (0015), `empresas` a 1790701978161 (0005),
   `bancos` a 1790701982970 (0023). El reloj hoy da ~1790703269000: lo generado desde ahora
   queda en orden. Revisar el `when` antes de cada commit.

## 2. Decisiones de diseño (permisos)

### 2.1 Modelo

| Nivel | Qué decide | Dónde |
|---|---|---|
| Empresa | En qué empresas entra (y ve sus datos) | `core.empresa_usuarios` (sin `rol_id`) |
| Cuenta | Qué acciones puede hacer, en todas sus empresas | `core.usuario_roles` + `core.usuario_permisos` (nuevas) |
| Registro | Qué registros ve dentro de la empresa | `<esquema>.accesos_a_<plural>` (sin cambios) |

- **Varios roles por usuario en la cuenta** (recomendado; pregunta 2). Un rol es un atajo: los
  permisos efectivos son la **unión** de los permisos de sus roles y de sus permisos directos.
- Los permisos directos **solo suman**; no hay permisos «negados».
- El acceso total se obtiene **solo por un rol** con `acceso_total` (no hay «permiso directo de
  acceso total»).
- Un usuario puede quedar sin roles y con solo permisos directos, o sin nada (entra a sus
  empresas y no ve ninguna opción).

Alternativas evaluadas:

| Opción | Pros | Contras |
|---|---|---|
| **A. Varios roles por usuario en la cuenta + directos (recomendada)** | La migración conserva cada rol que el usuario ya tenía; encaja con «el rol es un atajo»; no obliga a crear roles combinados | La pantalla muestra varios roles; el conteo «usuarios del rol» cambia de fuente |
| B. Un rol por usuario en la cuenta + directos | Más simple de mostrar | Migrar a quien tiene roles distintos obliga a elegir uno (pierde) o a crear roles «Contador + Bodega» (se multiplican) |
| C. Mantener el rol por empresa y sumar directos por cuenta | Sin migración de roles | Contradice la decisión 3 (el permiso vale para toda la cuenta); dos lógicas a la vez |

### 2.2 Tablas nuevas (esquema `core`, contexto `autorizacion`)

Archivo: `core/autorizacion/infraestructura/persistencia/permisos-de-usuario.tablas.ts`.

**`core.usuario_roles`**

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `cuenta_id` | uuid | no | fk `core.cuentas` on delete cascade |
| `usuario_id` | uuid | no | fk `core.usuarios` on delete cascade |
| `rol_id` | uuid | no | fk compuesta `(rol_id, cuenta_id)` → `core.roles(id, cuenta_id)` **on delete restrict** |
| `creado_en`, `actualizado_en`, `creado_por`, `actualizado_por` | | | `marcasDeTiempo` + `autoria` (quién lo asignó) |

- Llave primaria `(cuenta_id, usuario_id, rol_id)`: sirve a la consulta del resolutor
  (búsqueda por `cuenta_id, usuario_id`).
- Índice `usuario_roles_rol_idx (rol_id)`: la fk y «cuántos usuarios tienen el rol».
- `core.roles` suma el único `roles_id_cuenta_unico (id, cuenta_id)`, destino de la fk
  compuesta: así la base **impide** dar a un usuario un rol de otra cuenta (hoy solo lo impide
  `exigirAccesosDeLaCuenta`).
- `restrict` en el rol: igual que hoy (`RolAsignadoAUsuarios`), no se borra un rol con usuarios.

**`core.usuario_permisos`**

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `cuenta_id` | uuid | no | fk `core.cuentas` on delete cascade |
| `usuario_id` | uuid | no | fk `core.usuarios` on delete cascade |
| `permiso` | text | no | `check permiso ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'` |
| marcas y autoría | | | como arriba |

- Llave primaria `(cuenta_id, usuario_id, permiso)`.
- Índice `usuario_permisos_permiso_idx (permiso)`: para las migraciones de permisos
  («quien tenga X recibe Y») y la prueba de claves huérfanas.
- Sin fk al catálogo (los permisos se declaran en código, como en `rol_permisos`). Que exista y
  no sea `soloSuperacceso` lo valida el caso de uso con `CatalogoDePermisos.existe`, y el
  resolutor además filtra por los disponibles.

**RLS de las dos tablas: ninguna**, igual que `core.roles`, `core.rol_permisos` y
`core.empresa_usuarios`: el resolutor las lee con la conexión directa antes de fijar
`app.cuenta_id`. Control: cada consulta filtra por `cuenta_id` (TSDoc en la clase, como
`RepositorioRolesDrizzle`) y una prueba de API comprueba que una cuenta no ve ni cambia
permisos de otra. El `grant` lo da el migrador como a las demás tablas de `core`.

**Sin tabla `core.cuenta_usuarios`.** La pertenencia a la cuenta sigue saliendo de
`empresa_usuarios` (tener al menos una empresa). Roles y permisos de un usuario que ya no
está en ninguna empresa de la cuenta no tienen efecto (no puede entrar a ninguna empresa); el
caso de uso que le quite la última empresa los borra en la misma transacción. Hoy la API exige
al menos una empresa, así que no ocurre.

**`core.empresa_usuarios`**: pierde `rol_id` en dos migraciones (sección 4): primero pasa a
nulable y se deja de usar; después se elimina.

### 2.3 Cómo calcula el resolutor los permisos efectivos

```
resolver(usuario, empresaId):
  empresa = buscar(empresaId)                                  // como hoy
  si superacceso: rol de soporte (todos los permisos, también soloSuperacceso)   // como hoy
  si no:
    exigir fila en core.empresa_usuarios (empresa y cuenta activas)   → si falta, null
    { roles, directos } = permisosDeUsuario.enCuenta(usuario.id, empresa.cuentaId)   // 1 consulta
    accesoTotal = roles.some(r => r.accesoTotal)
    disponibles = permisos de los módulos activos de la cuenta
    base = accesoTotal ? disponibles
                       : (∪ permisos de cada rol ∪ directos) ∩ disponibles
    permisos = base − permisosDeSuperacceso(módulos activos)     // también si vienen directos
    recursosAlcanceTotal = registro.recursosConAlcanceTotal(activos, permisos, accesoTotal)
    recursosParaAsignar  = registro.recursosParaAsignar(activos, permisos)   // sección 3
  devuelve { empresa, roles: nombres ordenados, modulosActivos, permisos, recursosAlcanceTotal, recursosParaAsignar }
```

- Puerto nuevo en `identidad`: `PermisosDeUsuario.enCuenta(usuarioId, cuentaId): Promise<{ roles:
  { nombre, accesoTotal, permisos }[]; directos: string[] }>`, implementado en
  `autorizacion/infraestructura` con **una** consulta (`usuario_roles ⨝ roles ⟕ rol_permisos`
  `union all` `usuario_permisos`). Reemplaza a `PermisosDeRoles.permisosDelRol`, y
  `EmpresasDeLaSesion.accesoDe` pasa a devolver solo si es miembro (sin rol).
- La lógica pura (unión, acceso total, filtros) se extrae a una función sin E/S
  (`permisosEfectivos(...)`) para probarla sin base y reutilizarla en la consulta «de dónde viene
  cada permiso» (2.5) y en «¿este usuario ya ve todas las localidades?» (sección 3).
- Costo: una consulta más por petición que hoy (antes, `accesoDe` ya traía el rol); todas por
  llave primaria. Sin caché por ahora.

### 2.4 Sesión

- `ContextoDeSesion.rolNombre: string | null` → `roles: readonly string[]` (nombres). También en
  `ResumenDeSesionDto`. El cliente muestra los nombres unidos por coma («Contador, Bodega») o
  «Permisos personalizados» si no tiene roles; `PanelInicio` dice «Roles» en lugar de «Rol en
  esta empresa».
- `ContextoDeSesion` y `ContextoEmpresa` suman `recursosParaAsignar` (sección 3).
- `permisos`, `modulosActivos` y `recursosAlcanceTotal` no cambian de forma.

### 2.5 API

**Permiso nuevo en `core/modulo.ts`:** `usuarios.asignar-permisos` («Asignar roles y permisos
directos a los usuarios»). Separa «editar datos de una persona» de «darle poder». Migración: lo
reciben los roles que hoy tienen `usuarios.crear` o `usuarios.editar` (hoy esos permisos ya
asignan roles; nadie pierde). Pregunta 3.

**Usuarios** (`core/identidad`):

| Ruta | Cambio |
|---|---|
| `GET /usuarios` | `UsuarioDto`: `empresas: { empresaId, empresaNombre }[]`, `roles: { rolId, rolNombre, accesoTotal }[]`, `totalPermisosDirectos: number` (en lugar de `accesos` con rol por empresa) |
| `POST /usuarios` | `empresaIds: uuid[]` (mínimo 1) en lugar de `accesos`; `rolIds?: uuid[]` y `permisos?: string[]` opcionales, que exigen además `usuarios.asignar-permisos` (el caso de uso lo revisa con los permisos del operador; si no lo tiene y los manda → `AccesoDenegado`) |
| `PATCH /usuarios/:id` | `empresaIds?` en lugar de `accesos?`; ya no toca roles |
| `GET /usuarios/:id/permisos` (nueva, `usuarios.ver`) | `{ roles: [{ rolId, rolNombre, accesoTotal }], directos: string[], efectivos: [{ clave, descripcion, modulo, origenes: [{ tipo: 'rol', rolId, rolNombre } \| { tipo: 'directo' } \| { tipo: 'acceso-total', rolNombre }], moduloActivo: boolean }] }` |
| `PUT /usuarios/:id/permisos` (nueva, `usuarios.asignar-permisos`) | `{ rolIds: uuid[], permisos: string[] }`: reemplaza ambos conjuntos, calcula la diferencia, inserta y borra, audita cada cambio |

Reglas del `PUT` (dominio y caso de uso `AsignarPermisosAUsuario`):

1. El usuario debe ser de la cuenta (`usuarioDeLaCuenta`) y no puede ser el mismo operador
   (`NoPuedeCambiarseASiMismo`, como hoy con sus accesos).
2. Roles de la cuenta (`RolAjeno`); permisos existentes y asignables (`PermisoDesconocido`, que
   ya rechaza los `soloSuperacceso`).
3. **No dar más de lo que se tiene** (recomendado; pregunta 4): lo que el operador agregue (roles
   nuevos y permisos directos nuevos) debe estar contenido en sus permisos efectivos; un rol con
   acceso total solo lo asigna o quita quien tiene acceso total. Quitar sí puede cualquiera con
   el permiso, salvo la regla 4. Error nuevo `PermisoQueNoTiene` (`ReglaDeNegocioInfringida`).
4. **Siempre queda alguien con acceso total** (recomendado; pregunta 5): al quitar un rol con
   acceso total, al inactivar un usuario o al quitarle la última empresa, la cuenta debe
   conservar al menos un usuario activo, miembro de alguna empresa, con un rol de acceso total.
   Error nuevo `SeNecesitaUnUsuarioConAccesoTotal`. Se suma a la regla de roles que ya existe.

**Roles** (`core/autorizacion`): sin rutas nuevas. `RolDto.totalUsuarios` y
`UsoDelRol.usuariosAsignados` cuentan en `usuario_roles`. El texto del rol deja de decir «en
cada empresa». `ActualizarRol` audita los permisos que agrega o quita (2.6).

**Módulo `empresas`:** `RegistrarEmpresa` deja de copiar el rol; solo da la membresía al creador
(`darAcceso({ empresaId, usuarioId })`). Sus permisos ya valen en la empresa nueva porque son de
la cuenta. El puerto pierde `rolEnEmpresa`.

**Alta de cuenta** (`EmpresaInicialDrizzle`): inserta la membresía y la fila de `usuario_roles`
con el rol Propietario. La semilla (`sembrar.ts`) igual.

### 2.6 Auditoría

`AccionAuditada` ya tiene `asignar` y `quitar`. Una entrada por cada cambio, dentro de la unidad
de trabajo del caso de uso:

| Recurso | `registroId` | `anterior` | Cuándo |
|---|---|---|---|
| `core.roles-de-usuario` | id del usuario | `{ usuarioId, usuario, rolId, rolNombre, accesoTotal }` | `PUT /usuarios/:id/permisos`, `POST /usuarios` con roles |
| `core.permisos-de-usuario` | id del usuario | `{ usuarioId, usuario, permiso, descripcion }` | igual, con permisos directos |
| `core.empresas-de-usuario` | id del usuario | `{ usuarioId, usuario, empresaId, empresaNombre }` | crear y editar usuario (hoy no se audita; quitar una empresa borra en cascada sus accesos a localidades) |
| `core.permisos-de-rol` | id del rol | `{ rolId, rolNombre, permiso }` o `{ accesoTotal }` | `ActualizarRol` (hoy no se audita; cambia lo que pueden hacer todos los usuarios del rol) |

Recomendado auditar las dos últimas (pregunta 7). Nunca se guardan contraseñas.

## 3. Ventana de asignación de localidades

### 3.1 Lo que pide el usuario

Quien tiene `empresas.localidades.asignar` ve **todas** las localidades de la empresa activa
**solo en esa ventana**, puede asignarlas y quitarlas a cualquier miembro de la empresa (también
a sí mismo), todo auditado. En el resto del sistema sigue viendo solo las suyas (salvo
`ver-todas`).

Hoy las políticas no lo permiten: `alcance_ver` de la tabla protegida solo muestra lo asignado, y
`asignar_con_alcance` / `quitar_con_alcance` de la tabla de accesos exigen que el registro sea
visible para quien asigna.

### 3.2 Alternativas

| Opción | Cómo | Riesgos |
|---|---|---|
| **A. Variable de sesión «para asignar», puesta solo por los casos de uso de la ventana (recomendada)** | El resolutor calcula `recursosParaAsignar` (recursos cuyo `permisoAsignar` tiene el usuario). **No** se fija en todas las transacciones: solo cuando el caso de uso de la ventana lo pide con `operadorParaAsignar(solicitud, recurso)`. La unidad de trabajo fija `app.alcance_para_asignar`. Las políticas lo leen **solo** en el `select` de la tabla protegida y en la escritura de la tabla de accesos | Un programador podría usar `operadorParaAsignar` en otro caso de uso: se controla con un solo punto de construcción, que exige el permiso, y con una prueba. Aun así, en esa transacción solo se abre **leer** la tabla protegida: no cambiar, eliminar ni las tablas dependientes |
| B. Función `security definer` acotada (`empresas.localidades_para_asignar()` y `empresas.asignar_localidad(...)`) | Lee y escribe como dueño, sin RLS, filtrando a mano por `app.empresa_id` | Salta **toda** la RLS (también la de empresa): un error de filtro filtra datos entre empresas; la base no sabe de permisos, así que la función tendría que confiar en una variable igual que A; una función por recurso (o SQL dinámico con `format`); drizzle-kit no las maneja (migraciones a mano); la escritura pasaría por la función y no por la tabla con sus políticas |
| C. Sumar el recurso a `app.alcance_total` en los casos de uso de la ventana | Sin políticas nuevas | En esa transacción se abre todo: cambiar y eliminar localidades, y cada tabla dependiente (departamentos, futuras bodegas). Red de seguridad mucho más ancha que la necesaria |
| D. Leer con la conexión del dueño desde el código | Trivial | Rompe el principio: consulta sin RLS en la aplicación |
| E. Fijar `app.alcance_para_asignar` en todas las transacciones de quien tenga el permiso | Sin paso extra en el caso de uso | Viola «solo en esa ventana»: vería todas las localidades en todo el sistema |

**Recomendación: A.** Mantiene la RLS por empresa siempre activa, abre lo mínimo (lectura de la
tabla protegida y escritura de la tabla de accesos), no usa `security definer` nuevo y lo decide
el servidor a partir del permiso de la sesión, nunca el cliente.

### 3.3 Cambios en el core (A)

- `DefinicionRecursoConAlcance` suma `permisoAsignar: string` (del mismo módulo; lo valida
  `verificarDeclaracion`). Localidades: `empresas.localidades.asignar`.
- `RegistroModulos.recursosParaAsignar(activos, permisos)`: recursos cuyo `permisoAsignar` está en
  los permisos (el superacceso y el acceso total los tienen todos por tener todos los permisos).
- `ContextoDeSesion.recursosParaAsignar: readonly string[]` (lo llena el resolutor).
- `ContextoEmpresa.recursosParaAsignar?: readonly string[]`, **vacío por omisión**:
  `empresaActivaDe` y `operadorDe` no lo copian.
- `operadorParaAsignar(solicitud, recurso): Operador` en `core/compartido/http`: único lugar que lo
  llena; si el recurso no está en `contexto.recursosParaAsignar` lanza `AccesoDenegado`.
- `fijarVariablesDeSeguridad` fija además `app.alcance_para_asignar` (lista con comas);
  `mismoContexto` lo compara (una unidad anidada no puede ampliarlo).
- `alcance.ts`:

```sql
-- <para asignar>(recurso)
'<recurso>' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ','))

-- tabla protegida (politicasDelRegistroConAlcance)
alcance_ver       select  using  <total> or <para asignar> or id in (select … accesos del usuario)
alcance_cambiar   update  using/with check  <total> or id in (…)          -- sin cambios
alcance_eliminar  delete  using  <total> or id in (…)                     -- sin cambios

-- tabla de accesos (politicasDeTablaDeAccesos)
aislamiento_por_empresa  (la de siempre, permissive for all)
asignar_para_asignar  insert  with check  <para asignar>
cambiar_para_asignar  update  using/with check  <para asignar>
quitar_para_asignar   delete  using  <para asignar>

-- tablas que apuntan (politicaPorAlcance, …Opcional): sin cambios, no leen <para asignar>
```

Por qué así:

- **La escritura de accesos ya no depende de «lo que ve»** ni del alcance total: solo de estar en
  la ventana con el permiso. Tener `ver-todas` no da derecho a asignar (hoy sí lo daba la rama
  `<total>`). Se quita la subconsulta a la tabla protegida, así que desaparece también ese camino
  de posible recursión; la regla «una tabla de accesos nunca lleva una política de `select` con
  subconsulta» sigue en pie.
- La localidad asignada es de la empresa activa por la fk `(localidad_id, empresa_id)` y el
  `with check` de `aislamiento_por_empresa`; el usuario, por la fk a `core.empresa_usuarios`. No
  hace falta más condición.
- Quien no tiene `para asignar` no puede escribir en la tabla de accesos por ningún camino. Los
  únicos otros escritores son el disparador `core.asignar_registro_al_creador` (`security definer`,
  no pasa por RLS) y las cascadas de las fk, que tampoco pasan por RLS.
- `update` y `delete` de localidades y las tablas dependientes no se abren: aunque el caso de uso
  de la ventana tuviera un error, no podría cambiar ni borrar localidades ajenas.

**Consecuencia aceptada por la decisión del usuario:** como puede asignarse a sí mismo, el permiso
`asignar` equivale en la práctica a poder ver todas (en dos pasos, y queda auditado). La auditoría
marca `aSiMismo: true` y la ventana lo advierte antes de guardar.

### 3.4 Rutas de la ventana (reemplazan las del paso 7 de `diseno-accesos-por-modulo.md`)

Todas con `proteger({ permiso: 'empresas.localidades.asignar' })` y el operador de
`operadorParaAsignar(solicitud, 'empresas.localidades')`.

- `GET /api/empresas/localidades/accesos/localidades`: **todas** las localidades de la empresa
  (id, código, nombre, tipo, activa), también inactivas, marcadas.
- `GET /api/empresas/localidades/accesos/usuarios`: miembros de la empresa con sus roles y
  `veTodas` (acceso total o `ver-todas`, calculado con la función pura de permisos efectivos de
  2.3 sobre roles **y** permisos directos; el core expone la consulta `PermisosDeUsuario`, que el
  módulo puede usar porque importa de `core`).
- `GET /api/empresas/localidades/accesos/:usuarioId`: ids de **todas** sus localidades asignadas.
- `PUT /api/empresas/localidades/accesos/:usuarioId` `{ localidadIds }`: reemplaza el conjunto
  completo (ya no «dentro de lo que ve»); diferencia, inserción, borrado y una entrada de
  auditoría por cambio. Id inexistente o de no miembro → `RecursoNoEncontrado` antes de escribir.
  Se permite `usuarioId` igual al operador.
- `GET /api/empresas/localidades/:id/usuarios` (ficha): con el operador normal (la ficha solo se
  abre para localidades que ve), mismo permiso.

Auditoría: recurso `empresas.accesos-a-localidades`, `registroId` = id de la localidad,
`anterior` = `{ usuarioId, usuario, localidadId, codigo, nombre, aSiMismo }`, acciones `asignar`
y `quitar`.

### 3.5 Cliente (ventana)

Botón «Accesos» en la lista de Localidades (`v-permiso`). Elegir usuario → casillas con **todas**
las localidades (buscador, inactivas en gris) → Guardar. Si el usuario ya ve todas, lo dice y no
muestra casillas. Si el elegido es uno mismo, aviso con `usarAvisos().confirmar` («Se dará acceso
a usted mismo; quedará en la auditoría»). Al cerrar la ventana, la lista de Localidades sigue
mostrando solo las propias.

## 4. Migraciones (orden, datos existentes y `when`)

| # | Módulo | Archivo | Tipo | Contenido |
|---|---|---|---|---|
| 1 | core | `0016_roles_y_permisos_por_usuario` | generada | `usuario_roles`, `usuario_permisos`, único `roles (id, cuenta_id)` |
| 2 | core | `0017_roles_de_la_empresa_a_la_cuenta` | `--custom` | copia de datos, auditoría de la migración, `rol_id` nulable, permiso `usuarios.asignar-permisos` |
| 3 | core | `0018_quitar_rol_de_empresa_usuarios` | generada (+ guarda) | `drop column rol_id` (paso P4) |

Contenido de la #2:

```sql
-- 1. Cada rol que el usuario tenía en alguna empresa pasa a la cuenta (unión: nadie pierde).
INSERT INTO core.usuario_roles (cuenta_id, usuario_id, rol_id)
SELECT DISTINCT e.cuenta_id, eu.usuario_id, eu.rol_id
FROM core.empresa_usuarios eu JOIN core.empresas e ON e.id = eu.empresa_id
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- 2. Quien tenía roles distintos según la empresa gana, en algunas empresas, los permisos
--    de sus otros roles: queda una entrada por usuario en la auditoría (sin usuario: la migración).
INSERT INTO core.auditoria (cuenta_id, usuario_id, recurso, registro_id, accion, motivo, anterior)
SELECT e.cuenta_id, NULL, 'core.roles-de-usuario', eu.usuario_id::text, 'asignar',
       'Migración: el rol pasó de cada empresa a toda la cuenta',
       jsonb_agg(jsonb_build_object('empresaId', e.id, 'empresa', e.nombre, 'rolId', r.id, 'rol', r.nombre))
FROM core.empresa_usuarios eu
JOIN core.empresas e ON e.id = eu.empresa_id
JOIN core.roles r ON r.id = eu.rol_id
GROUP BY e.cuenta_id, eu.usuario_id
HAVING count(DISTINCT eu.rol_id) > 1;
--> statement-breakpoint
ALTER TABLE core.empresa_usuarios ALTER COLUMN rol_id DROP NOT NULL;
--> statement-breakpoint
INSERT INTO core.rol_permisos (rol_id, permiso)
SELECT DISTINCT rol_id, 'usuarios.asignar-permisos' FROM core.rol_permisos
WHERE permiso IN ('usuarios.crear', 'usuarios.editar')
ON CONFLICT DO NOTHING;
```

- La auditoría se escribe como dueño: `cuenta_id` explícito (la variable no está fijada) y
  `empresa_id`/`usuario_id` nulos. Así cada caso de «ganó permisos» queda consultable en la
  pantalla de auditoría de la cuenta. La migración emite además un `RAISE NOTICE` con cuántos
  usuarios quedaron así (se ve en el log del despliegue).
- Si el usuario elige **intersección** o **revisión a mano** (pregunta 1), cambia solo el paso 1
  (y, para revisión a mano, la migración se detiene con `RAISE EXCEPTION` listando los casos).
- **#3** lleva una guarda: aborta si alguna fila de `empresa_usuarios` con `rol_id` no tiene su
  `(cuenta_id, usuario_id, rol_id)` en `usuario_roles` (no debería: la #2 los copió y el código de
  P1 en adelante escribe en `usuario_roles`).
- **`when`:** las tres por encima de 1790701976622 (core). Se generan en commits distintos (#1 y
  #2 en P1; #3 en P4); revisar que cada una quede mayor que la anterior.
- **Orden en una base vacía:** `core` completo (tablas nuevas antes que cualquier módulo), luego
  `empresas` y el resto. Las migraciones de permisos ya aplicadas de otros módulos solo tocan
  `rol_permisos`, que en una base vacía no tiene filas: sin efecto.
- **Regla nueva para migraciones futuras de permisos** (va a `PLAN.md` §3.5 y `CLAUDE.md`):
  «quien tenía X recibe Y» se escribe para `core.rol_permisos` **y** `core.usuario_permisos`
  (este último con `(cuenta_id, usuario_id)`), y un permiso que se elimina se borra de las dos.
  Lo respalda una prueba de claves huérfanas (sección 6).
- Las localidades (paso 5 del otro diseño) **no** dan permisos a ningún rol en su migración
  (decisión del usuario: solo el acceso total los recibe, y eso ya es automático).

## 5. Pantallas (alto nivel)

- **Usuarios** (Administración del core): la tarjeta muestra empresas y roles como insignias, y
  «+N permisos directos». La ventana de usuario reemplaza «Acceso por empresa» (un selector de rol
  por empresa) por casillas de empresas; al crear, si el operador tiene
  `usuarios.asignar-permisos`, también casillas de roles.
- **Página «Permisos de <usuario>»** (`/usuarios/:id/permisos`, página y no ventana por su
  tamaño; botón «Permisos» en la tarjeta, `v-permiso="'usuarios.asignar-permisos'"`, y en solo
  lectura con `usuarios.ver`):
  - Sección **Roles**: casillas con los roles de la cuenta; el de acceso total con aviso.
  - Sección **Permisos**, agrupados por módulo como `SelectorDePermisos`. Cada permiso muestra
    su **origen**: insignia «Por rol: Contador» (casilla marcada y bloqueada: se quita desde el
    rol), «Directo» (casilla editable) o nada. Si un rol da acceso total, se muestra «Tiene todos
    los permisos por el rol Propietario» en lugar de la lista. Los de módulos inactivos, en gris.
  - Filtro «Solo los que tiene» y contador de permisos efectivos.
  - Los permisos que el operador no tiene aparecen deshabilitados, con la razón (regla 3).
  - Lógica pura en `edicion-de-permisos-de-usuario.ts` con pruebas; la página no pasa de 120
    líneas (componentes `SeccionDeRoles`, `ListaDePermisosConOrigen`).
- **Roles:** el texto de la ventana dice que el rol vale en toda la cuenta; la tarjeta muestra
  cuántos usuarios lo tienen.
- **Menú / inicio:** los nombres de los roles en lugar de «Rol en esta empresa».

Excel: ninguno (Usuarios y Roles no importan ni exportan hoy; no se agrega).

## 6. Pruebas necesarias

Servidor:
- `permisosEfectivos` (pura): unión de dos roles; directos suman; acceso total por cualquiera de
  los roles; `soloSuperacceso` quitado aunque venga directo o por acceso total; permiso de
  módulo inactivo ignorado; clave desconocida ignorada.
- `ResolutorDeAcceso`: sin membresía en la empresa → `null` aunque tenga roles en la cuenta;
  roles de otra cuenta no cuentan; superacceso igual que hoy; `recursosParaAsignar`.
- Migración (`migrador.prueba.ts` o una prueba dedicada que carga datos antes de la #2): usuario
  con el mismo rol en dos empresas → una fila; con roles distintos → dos filas y una entrada de
  auditoría; `usuarios.asignar-permisos` para quien tenía `usuarios.editar`.
- API de usuarios: `PUT /usuarios/:id/permisos` exige el permiso; no a sí mismo; rol de otra
  cuenta → `RolAjeno` (y la fk lo impide aunque el caso de uso fallara); `soloSuperacceso` →
  `PermisoDesconocido`; dar lo que no se tiene → `PermisoQueNoTiene`; quitar el último acceso
  total → `SeNecesitaUnUsuarioConAccesoTotal`; auditoría por cambio; el permiso directo vale en
  la petición siguiente y en **todas** las empresas del usuario, pero no le da entrada a una
  empresa donde no es miembro.
- Roles: `totalUsuarios` y «rol con usuarios no se elimina» con `usuario_roles`.
- `RegistrarEmpresa`: el creador entra a la nueva con sus mismos permisos.
- Claves huérfanas: después de migrar y sembrar, ninguna fila de `rol_permisos` ni de
  `usuario_permisos` tiene una clave que no declare algún módulo.
- `alcance-datos.prueba.ts` (reescrita en lo que cambia): sin la variable, no ve lo no asignado;
  con `app.alcance_para_asignar` ve todo en `select` pero **no** puede `update` ni `delete` lo no
  asignado, y la tabla dependiente sigue filtrada; escribir en accesos sin la variable falla aun
  con alcance total; con la variable puede asignar cualquier registro de la empresa (también a sí
  mismo); otra empresa, nada; sin recursión.
- `operadorParaAsignar` sin el permiso → `AccesoDenegado`; unidad anidada con otro
  `recursosParaAsignar` → `ContextoDistintoEnLaTransaccion`.
- API de la ventana (paso 7): un usuario con `asignar` y sin `ver-todas` lista todas las
  localidades en la ventana y solo las suyas en `GET /localidades`; se asigna a sí mismo y la
  auditoría lleva `aSiMismo`.

Cliente: lógica pura de la página de permisos (origen, bloqueados, deshabilitados, diferencia a
enviar), ventana de usuario con casillas de empresas, sesión con `roles`.

## 7. Riesgos

| Riesgo | Control |
|---|---|
| Usuarios con roles distintos por empresa ganan permisos al migrar (unión) | Pregunta 1; entrada de auditoría por usuario y aviso en el log; revisar la lista después de desplegar |
| Escalada: quien asigna permisos se da poder a través de otro | Permiso propio `usuarios.asignar-permisos`; «no dar lo que no se tiene»; no a sí mismo; auditoría |
| La cuenta se queda sin nadie con acceso total | Regla 4 en quitar rol, inactivar usuario y quitar empresas |
| `asignar` localidades equivale a ver todas | Decisión del usuario; `aSiMismo` en la auditoría y aviso en la ventana |
| Alguien usa `operadorParaAsignar` fuera de la ventana | Un solo punto que lo arma y exige el permiso; solo abre lectura de la tabla protegida y escritura de accesos; revisión en código |
| Migraciones futuras de permisos olvidan `usuario_permisos` | Regla escrita en `PLAN.md`/`CLAUDE.md` y prueba de claves huérfanas |
| Tablas nuevas sin RLS | Igual que `roles`; filtro por cuenta en cada consulta y prueba entre cuentas; fk compuesta del rol a su cuenta |
| Una consulta más por petición | Por llave primaria; medir si hiciera falta caché |
| Quitar una empresa a un usuario borra en cascada sus accesos a localidades sin detalle | Se audita `core.empresas-de-usuario` (`quitar`); el detalle por localidad queda implícito |
| Orden: si localidades (paso 5) se programa antes de 3.3, su migración nacería con las políticas viejas | P-L1 va antes del paso 5 (sección 8) |

## 8. Pasos de implementación (un commit cada uno)

Permisos por usuario:

1. **P1 (servidor, core) Roles y permisos en la cuenta. [HECHO 2026-09-29]** Tablas y migraciones #1 y #2;
   `PermisosDeUsuario` y `permisosEfectivos`; resolutor y sesión (`roles`); todas las escrituras
   (crear y editar usuario, alta de cuenta, `RegistrarEmpresa`, semilla) mantienen
   `usuario_roles` y dejan de leer `rol_id` (la API de usuarios **aún** recibe
   `accesos: [{ empresaId, rolId }]` y guarda la unión de sus roles en la cuenta); `usoDe` y
   `totalUsuarios` desde `usuario_roles`; permiso `usuarios.asignar-permisos`. Pruebas del
   resolutor, de la migración y de roles.
2. **P2 (servidor, core) API de usuarios y permisos directos. [HECHO 2026-09-29]** `empresaIds`, `GET`/`PUT
   /usuarios/:id/permisos` con origen, reglas 1 a 4, auditoría (2.6, incluida la de empresas y la
   de permisos de rol), prueba de claves huérfanas.
3. **P3 (cliente, core) Usuarios, permisos y sesión.** Ventana de usuario con empresas, página de
   permisos con origen, tarjetas, roles en el menú e inicio.
4. **P4 (servidor, core) Quitar `rol_id`.** Migración #3 con guarda, código muerto, y documentos:
   `PLAN.md` §3.3 («usuarios con permisos por cuenta y acceso por empresa»), §3.5 (roles por
   usuario, permisos directos, regla de migraciones), `CLAUDE.md`, `ARQUITECTURA.md`, bitácora.

Ventana de localidades (antes del paso 5 de `diseno-accesos-por-modulo.md`):

5. **L1 (servidor, core) Alcance para asignar.** `permisoAsignar`, `recursosParaAsignar`
   (registro, resolutor, sesión, contexto), `app.alcance_para_asignar`, `operadorParaAsignar`,
   políticas de 3.3 en `alcance.ts`, pruebas. Sin migración (ninguna tabla usa aún estas
   políticas). Puede ir en paralelo a P1–P4; si va antes de P1, el resolutor calcula
   `recursosParaAsignar` con los permisos del rol.
6. Paso 5 del otro diseño (localidades) sin migración de permisos para roles, con
   `permisoAsignar` en `recursosConAlcance`.
7. Paso 7 del otro diseño con las rutas de 3.4 (necesita P1 para `veTodas`).
8. Paso 8 del otro diseño con la ventana de 3.5.

## 9. Convivencia con otros módulos

- Ningún módulo lee `empresa_usuarios.rol_id` salvo `empresas` (P1 lo cambia). Bancos y terceros
  solo usan `proteger({ permiso })`: no cambian.
- Las órdenes del mediador y los eventos no cambian.
- `terceros` (tablas por cuenta) no cambia: el acceso a la cuenta sigue saliendo de la empresa
  activa.

## 10. Lo que no cambia

- `soloSuperacceso`: ningún usuario de cuenta lo recibe, ni por rol, ni por acceso total, ni
  directo; el catálogo no lo ofrece.
- Superacceso: todos los permisos en cualquier empresa, con `core.bitacora_superacceso`.
- Guardias: sesión → empresa → módulo → permiso, sin cambios; los permisos del contexto ya son
  los efectivos.
- `v-permiso` y `sesion.puede()` en el cliente: sin cambios.

## 11. Preguntas para el usuario

1. **Personas con roles distintos en distintas empresas.** Hoy alguien puede ser «Contador» en la
   Finca A y «Bodeguero» en la Finca B. Como ahora el permiso vale para toda la cuenta, al migrar
   hay que elegir: **(a) darle los dos roles en toda la cuenta** (no pierde nada, pero en la Finca
   A también podrá hacer lo de bodeguero, con los datos que ya ve ahí); (b) darle solo lo que
   tienen en común (no gana nada, pero pierde); (c) detener la actualización y que usted los
   revise uno por uno. **Recomiendo (a)**, dejando anotado en la auditoría a cada persona que
   ganó permisos para que usted la revise. (Bloquea P1.)
2. **¿Varios roles por persona?** Recomiendo que una persona pueda tener **varios roles** a la
   vez (p. ej. «Contador» y «Bodega») y que se sumen, además de sus permisos sueltos. (Bloquea P1.)
3. **¿Quién puede dar permisos?** Recomiendo un permiso nuevo, «Asignar roles y permisos a los
   usuarios», separado de «Editar usuarios», y dárselo en la actualización a quien hoy puede
   crear o editar usuarios (ya podían asignar roles; nadie pierde). (Bloquea P1.)
4. **¿Se puede dar un permiso que uno no tiene?** Recomiendo que **no**: quien asigna solo puede
   dar permisos que él mismo tiene, y el rol con acceso total solo lo da quien tiene acceso
   total. Así nadie se da más poder a través de un compañero. (Bloquea P2.)
5. **Nunca quedarse sin dueño.** Recomiendo exigir que en la cuenta siempre quede al menos una
   persona activa con un rol de acceso total (no se le puede quitar ese rol ni inactivar si es la
   última). (Bloquea P2.)
6. **Persona sin rol.** Recomiendo permitir que alguien no tenga ningún rol y solo permisos
   sueltos. ¿De acuerdo? (No bloquea: si no, se exige al menos un rol.)
7. **Más auditoría.** Recomiendo que también queden en la auditoría: a qué empresas se le da o
   quita acceso a una persona, y qué permisos se agregan o quitan a un rol (cambia lo que pueden
   hacer todos los que lo tienen). ¿De acuerdo? (No bloquea: se decide en P2.)

## Respuestas del usuario (2026-09-29)

Mandan sobre las preguntas de arriba.

1. **Roles distintos por empresa al migrar:** no importa; **no hay nada en
   producción** (todo es desarrollo). Se usa la unión, sin más cuidado.
2. **Varios roles por persona:** sí.
3. **Permiso propio para asignar permisos** (`usuarios.asignar-permisos`): sí.
4. **¿Solo se dan los permisos que uno tiene?:** **no**; quien tiene
   `usuarios.asignar-permisos` puede dar cualquier permiso asignable (nunca los
   `soloSuperacceso`). Queda en la auditoría.
5. **¿Siempre al menos una persona con acceso total?:** **no es necesario** (soporte
   siempre puede entrar).
6. **Persona sin roles, solo con permisos directos:** sí.
7. **Auditar** los cambios de empresas de un usuario y de permisos de un rol: sí.

## Decisiones al programar P1 y P2 (2026-09-29)

- **Migraciones:** la `0016` (generada) incluye también `ALTER COLUMN rol_id DROP NOT NULL` porque
  `empresa_usuarios.rolId` se declaró nulable en las tablas; la `0017` (`--custom`) solo lleva los
  datos (unión de roles, auditoría de la migración y permiso nuevo). La `0018` sigue siendo P4.
  Se ordenó a mano el `UNIQUE (id, cuenta_id)` de `roles` antes de la fk que lo usa.
- **P1 ya cambia la API de usuarios** (no se dejó `accesos: [{ empresaId, rolId }]` un paso más):
  crear y editar reciben `empresaIds` de una vez, porque P2 va en el mismo bloque. La ventana de
  usuarios del cliente queda rota hasta P3.
- **Sin las reglas 3 y 4** del diseño (no dar lo que no se tiene; siempre un acceso total), por las
  respuestas del usuario. Quedan: no a sí mismo, rol de la cuenta, permiso existente y asignable.
- `CrearUsuario` recibe `puedeAsignarPermisos` (lo calcula el controlador con los permisos de la
  sesión) y responde `AccesoDenegado` si piden `rolIds` o `permisos` sin él.
- `PermisosDeUsuario.enCuenta` usa dos consultas en paralelo (roles con sus permisos, y directos) en
  vez de una sola con `union all`: más simple y también por llave primaria.
- `EmpresasDeLaSesion.accesoDe` pasó a `esMiembro` (booleano); `AccesosAEmpresas` de `empresas`
  pierde `rolEnEmpresa`; `RegistrarEmpresa` da acceso al creador solo si es miembro de la activa.
- La lista de usuarios (`GET /usuarios`) ordena los roles por nombre y `GET /usuarios/:id/permisos`
  también (el orden de los orígenes sigue el de los roles, y luego el directo).
- Cliente (mínimo): `ResumenSesion.roles`; la tienda de sesión sigue exponiendo `rolNombre` como los
  nombres unidos por coma («Permisos personalizados» si no hay roles).
- Quitar la última empresa de un usuario no borra sus roles y permisos: la API sigue exigiendo al
  menos una empresa, así que no ocurre.
