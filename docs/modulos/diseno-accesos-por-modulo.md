# Diseño de H5b/H5c con accesos en el esquema de cada módulo — arquitecto de datos, 2026-09-29

Aplica las «Respuestas del usuario (2026-09-29)» de `plan-hallazgos-contables.md`, que
mandan sobre `diseno-esquema-empresas.md`. De ese diseño **se conservan** las tablas de
tipos de localidad, localidades y departamentos (con los ajustes de abajo) y **se
reemplaza** todo lo que usaba `core.accesos_datos` (sección «Accesos a localidades»,
pasos H5b-1 y H5b-2, `AccesosADatos.quitarRegistro`, ruta
`PUT /usuarios/:id/accesos-a-datos/:recurso` y `listarOpciones`).

## 1. Lo encontrado

1. **Nadie usa hoy `core.accesos_datos`.** Ninguna tabla real lleva
   `politicaPorAlcance` (en la base de desarrollo, `pg_policies` solo tiene
   `aislamiento_por_empresa`, `aislamiento_por_cuenta` y las de la auditoría); ningún
   módulo declara `recursosConAlcance`; la tabla está vacía y no hay ruta ni caso de uso
   que la escriba. El alcance por cuenta bancaria (`bancos.cuentas`) que citan
   `PLAN.md` §3.5 y `bancos.md` quedó «pendiente para B2» y **nunca se programó**.
   Por lo tanto **no hay datos que migrar**; solo código y pruebas.
2. Quién toca `core.accesos_datos` (todo en pruebas, más la definición):
   - `core/autorizacion/infraestructura/persistencia/accesos-datos.tablas.ts` (la tabla).
   - `core/base-datos/columnas.ts` (`politicaPorAlcance` la lee).
   - `core/base-datos/alcance-datos.prueba.ts` (prueba del alcance).
   - `core/base-datos/aislamiento-empresas.prueba.ts`,
     `core/compartido/infraestructura/unidad-de-trabajo-postgres.prueba.ts` y
     `core/mediador/mediador.integracion.prueba.ts`: la usan **solo como tabla de
     ejemplo con RLS por empresa**.
   - Documentación: `CLAUDE.md` («Permisos de datos por registro»), `PLAN.md` §3.3 y
     §3.5, `ARQUITECTURA.md` (bitácora de autorización), `definicion-modulo.ts` (TSDoc).
3. Lo que sí funciona y se conserva: `DefinicionRecursoConAlcance` +
   `RegistroModulos.recursosConAlcanceTotal` + `app.alcance_total` (lo fija
   `fijarVariablesDeSeguridad`). Los módulos esenciales siempre cuentan como activos,
   así que `empresas.localidades` entra en `app.alcance_total` para roles con acceso
   total, el superacceso y quien tenga `empresas.localidades.ver-todas`.
4. La excepción de ESLint del módulo base **no se hizo en H5a**: `prohibirOtrosModulos`
   (raíz, `eslint.config.js`) solo exceptúa a `core`. ESLint es 10.11, que admite
   `regex` en `no-restricted-imports`.
5. `core.empresa_usuarios` tiene llave primaria `(empresa_id, usuario_id)`: sirve de
   destino para una llave foránea compuesta desde las tablas de accesos.
6. Journals: `core` llega a `when` 1790664992135, `empresas` a 1790683469516 y
   `bancos` a 1790700800000 (sintético, en el futuro). El reloj de hoy da
   ~1790689790000: una migración nueva de `core` o de `empresas` generada hoy queda en
   orden; **una de `bancos` necesitaría `when` > 1790700800000** (este diseño no toca
   `bancos`). El migrador aplica `core`, luego los esenciales (`empresas`) y luego el
   resto; cada módulo lleva su propio control, así que el orden entre módulos lo da el
   migrador y no el `when`.
7. Las llaves foráneas y sus acciones (`cascade`) **no pasan por RLS**. Por eso la
   generación de código ya usa `exigirReferencias` (consulta con RLS) antes de guardar
   una referencia; con alcance por registro, además, la política de la tabla que
   referencia debe revisar el alcance en el `with check`.

## 2. Decisiones de diseño

### 2.1 Forma general: cada recurso con alcance tiene su tabla de accesos

Para cada recurso con alcance, el módulo dueño crea en **su** esquema una tabla
`<esquema>.accesos_a_<plural>` con `(empresa_id, usuario_id, <registro>_id)` y llave
foránea al registro. El core no guarda asignaciones: solo sabe **construir las
políticas** a partir de un descriptor que le pasa el módulo.

```ts
// core/base-datos/alcance.ts (nuevo; columnas.ts pasaría de 200 líneas)
/** Dónde guarda un módulo las asignaciones de un recurso con alcance. */
export interface AlcanceDeRegistros {
  /** Clave del recurso, igual a la de `recursosConAlcance`: `empresas.localidades`. */
  recurso: string;
  /** Tabla de accesos, con esquema: `empresas.accesos_a_localidades`. */
  tablaDeAccesos: string;
  /** Tabla protegida, con esquema: `empresas.localidades`. */
  tablaDelRegistro: string;
  /** Columna de la tabla de accesos con el id del registro: `localidad_id`. */
  columna: string;
}
```

Las cuatro cadenas se validan con expresión regular al construir (como hoy:
`^[a-z0-9_.-]+$` para el recurso y `^[a-z_]+(\.[a-z_]+)?$` para tablas y columna),
porque van dentro de SQL crudo.

El descriptor de localidades vive en el módulo dueño, junto a su tabla, para que los
demás módulos lo importen por la excepción del módulo base (sección 5):

```ts
// empresas/infraestructura/persistencia/accesos-a-localidades.tablas.ts
export const ALCANCE_DE_LOCALIDADES: AlcanceDeRegistros = {
  recurso: 'empresas.localidades',
  tablaDeAccesos: 'empresas.accesos_a_localidades',
  tablaDelRegistro: 'empresas.localidades',
  columna: 'localidad_id',
};
```

`DefinicionRecursoConAlcance` suma el campo `alcance: AlcanceDeRegistros` (su `clave`
sale de `alcance.recurso`, o se valida que coincidan). Sirve para una prueba de
integración que recorre los recursos declarados y comprueba que la tabla de accesos y
sus políticas existen (sección 9).

### 2.2 Las tres familias de políticas (en el core)

Todas `restrictive` (se suman con AND a `aislamiento_por_empresa`), `to arrancar_app`.
Condición común, con `(select …)` para que PostgreSQL calcule las variables una sola
vez por consulta (initplan):

```sql
-- <condición de alcance>(col), para ALCANCE_DE_LOCALIDADES
'empresas.localidades' = any ((select string_to_array(current_setting('app.alcance_total', true), ',')))
or col in (
  select a.localidad_id from empresas.accesos_a_localidades a
  where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
    and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
)
```

(El filtro `a.empresa_id` repite lo que ya pone la RLS de la tabla de accesos; se
escribe para que el índice `(empresa_id, usuario_id, localidad_id)` se use completo.)

| Función del core | Para qué tabla | Políticas que devuelve |
|---|---|---|
| `politicasDelRegistroConAlcance(alcance)` | la **tabla protegida** (`empresas.localidades`) | `alcance_ver` (select, using), `alcance_cambiar` (update, using + with check), `alcance_eliminar` (delete, using) con la condición sobre `id`. **Ninguna para `insert`.** |
| `politicaPorAlcance(alcance, columna)` | una tabla que **apunta** al registro y debe filtrarse (futuro: bodegas, fincas, ventas) | `alcance_<recurso con _>` `for all`, using + with check con la condición sobre `columna` |
| `politicaPorAlcanceOpcional(alcance, columna)` | igual, cuando la columna admite nulo (`empresas.departamentos.localidad_id`) | `alcance_<recurso con _>` `for all`: `columna is null or <condición>` |
| `politicasDeTablaDeAccesos(alcance)` | la **tabla de accesos** | `aislamiento_por_empresa` (la de siempre) y `asignar_con_alcance` (insert, with check), `cambiar_con_alcance` (update, using + with check), `quitar_con_alcance` (delete, using) con `<total> or <columna> in (select r.id from <tablaDelRegistro> r)` |

Las tres primeras reemplazan a la `politicaPorAlcance(recurso, columnaId)` de hoy (que
devolvía una sola política `alcance_por_usuario`). Devuelven arreglos: en las tablas se
usan con `...` como `politicasDeSoloAgregar()`. Nombres por recurso: una tabla puede
llevar el alcance de dos recursos (p. ej. una venta por localidad y por caja).

Por qué así:

- **Sin política de alcance en `insert` de la tabla protegida.** Es la decisión «crear
  localidades: cualquiera con permiso de gestionar». Además es obligatorio: el id nuevo
  aún no está asignado a nadie, así que un `with check` de alcance rechazaría toda
  alta de quien no tiene alcance total. Crear lo limita el permiso `gestionar` (guardia
  de la ruta) y la RLS por empresa.
- **Asignar solo lo que uno ve.** El `with check` de la tabla de accesos exige que el
  registro sea visible para quien asigna (la subconsulta sobre la tabla protegida pasa
  por su RLS). Así, con el permiso `asignar`, un encargado con dos fincas solo puede
  dar acceso a esas dos, ni siquiera a sí mismo a otra: no hay escalada aunque el caso
  de uso tuviera un error. Quitar, igual.
- **Sin recursión de políticas.** PostgreSQL rechaza con *infinite recursion detected
  in policy* cuando, al expandir las políticas **con subconsultas** de una tabla, vuelve
  a encontrar esa misma tabla. Aquí: la política de escritura de accesos consulta
  localidades → las políticas de lectura de localidades consultan accesos → las
  políticas **de lectura** de accesos son solo `aislamiento_por_empresa`, sin
  subconsulta, y la expansión termina. **Regla que no se puede romper:** una tabla de
  accesos nunca lleva una política de `select` con subconsulta (queda escrito en el
  TSDoc de `politicasDeTablaDeAccesos` y lo cubre una prueba).
- **Consecuencia de esa regla:** quien lee la tabla de accesos ve todas las filas de la
  empresa, también las de localidades que no ve (solo ids). Las consultas del módulo
  siempre hacen `inner join` con la tabla protegida, que sí filtra; así nunca se
  muestra un id que el usuario no ve.

### 2.3 Asignar al creador: disparador genérico del core

La decisión «al crearla se asigna al creador» no se puede hacer con un `insert` normal
del caso de uso cuando el creador no tiene alcance total: la localidad recién creada
todavía no le es visible y el `with check` de la tabla de accesos lo rechaza. Opciones:

| Opción | Pros | Contras |
|---|---|---|
| **A. Disparador `after insert` `security definer` (recomendada)** | Garantía en la base (también en la importación de Excel y en el ensayo, que se deshace); políticas simples; no abre huecos | Lógica en un disparador; hay que documentarla |
| B. Rama extra en el `with check` de accesos: «puedo asignarme un registro que aún no tiene accesos» | Sin disparador | Cualquiera con un endpoint que inserte accesos podría reclamar una localidad que quedó sin asignaciones |
| C. Función `security definer` «¿lo creé yo?» en la política | Precisa | La función debe existir antes que la política (migración a mano) y se evalúa por fila |

**Recomendación: A**, con una sola función genérica en el core:

```sql
-- core, migración --custom
create function core.asignar_registro_al_creador() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  usuario uuid := nullif(current_setting('app.usuario_id', true), '')::uuid;
begin
  if usuario is null then return null; end if;          -- migraciones y semillas del dueño
  execute format(
    'insert into %s (empresa_id, usuario_id, %I, creado_por, actualizado_por)
     select $1, $2, $3, $2, $2
     where exists (select 1 from core.empresa_usuarios eu
                   where eu.empresa_id = $1 and eu.usuario_id = $2)
     on conflict do nothing',
    tg_argv[0]::regclass, tg_argv[1])
  using new.empresa_id, usuario, new.id;
  return null;
end $$;
revoke all on function core.asignar_registro_al_creador() from public;
```

```sql
-- empresas, migración --custom, después de crear las tablas
create trigger asignar_al_creador after insert on empresas.localidades
  for each row execute function core.asignar_registro_al_creador('empresas.accesos_a_localidades', 'localidad_id');
```

- El `where exists` salta al **superacceso** que no es miembro de la empresa (la llave
  a `core.empresa_usuarios` fallaría); él ve todo por alcance total.
- Corre como el dueño (`arrancar`), que no está sujeto a RLS porque las tablas usan
  `enable` y no `force row level security`. Si algún día se fuerza RLS, este disparador
  deja de funcionar: queda anotado en su comentario.
- Quien tiene alcance total también queda asignado. Es inofensivo y conserva su acceso
  si luego pierde `ver-todas`.
- **Auditoría** (la pide el usuario): la escribe el caso de uso `CrearLocalidad` después
  del `insert`: consulta si quedó la asignación del operador y, si existe, registra
  `accion: 'asignar'` (sección 6). Así la auditoría sigue en la aplicación, como todas.
- **El repositorio no usa `returning` ni `on conflict do update` al insertar
  localidades**: con `returning`, PostgreSQL exige que la fila nueva pase las políticas
  de `select`, y para el creador sin alcance total aún no pasa (el disparador corre
  después). Los repositorios actuales ya insertan sin `returning` (el id lo pone el
  dominio); el caso de uso vuelve a leer la localidad al final, ya asignada.

### 2.4 Qué pasa con `core.accesos_datos`

Se **elimina** (tabla, archivo `accesos-datos.tablas.ts`, TSDoc y documentación). La
migración de `core` lleva una guarda por si alguna instalación tuviera filas (no
debería: nada las escribe):

```sql
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM core.accesos_datos) THEN
    RAISE EXCEPTION 'core.accesos_datos tiene filas: revisar antes de quitarla';
  END IF;
END $$;
DROP TABLE core.accesos_datos;
```

Las tres pruebas que la usaban como «tabla de ejemplo con RLS por empresa» pasan a
`core.correlativos` (RLS por empresa, `clave` de texto libre, sin llaves a otras tablas
de negocio): `insert (empresa_id, clave) values (…, 'dato.de.a')` en lugar de
`recurso`. `alcance-datos.prueba.ts` se reescribe con un esquema `prueba` propio
(registros, accesos y una tabla dependiente) creado con el SQL de las nuevas funciones.

Si en el futuro Bancos quiere alcance por cuenta bancaria, será
`bancos.accesos_a_cuentas_bancarias` con su `ALCANCE_DE_CUENTAS_BANCARIAS`, la misma
receta; no hay nada que migrar hoy.

## 3. Tablas del esquema `empresas`

Todas con `...marcasDeTiempo`, `...autoria`, `empresa_id uuid not null → core.empresas(id)
on delete cascade` y `politicaPorEmpresa()`. Las llaves entre tablas del módulo (y las
que vengan de otros módulos hacia localidades) quedan en **`no action`**, no `restrict`,
para que la cascada al borrar una empresa se revise al final del comando. Así una empresa
con tipos, localidades, departamentos y accesos, pero sin movimientos, **se puede
eliminar** (decisión del usuario); lo que la impida serán las tablas de movimientos de
otros módulos, no la configuración.

### 3.1 `empresas.tipos_de_localidad`

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `id` | uuid | no | pk, `default gen_random_uuid()` |
| `empresa_id` | uuid | no | fk `core.empresas` cascade |
| `nombre` | text | no | `check char_length(trim(nombre)) between 1 and 60` |
| `activo` | boolean | no | `default true` |

- Únicos: `tipos_de_localidad_nombre_unico (empresa_id, nombre)` y
  `tipos_de_localidad_id_empresa_unico (id, empresa_id)` (destino de la fk compuesta).
- RLS: `politicaPorEmpresa()`. Sin alcance.
- Por empresa (decisión del usuario). Semilla editable: Finca, Planta, Oficina, Bodega,
  Beneficio, Tienda, Taller. Se siembra: (1) en la migración, para las empresas que ya
  existen (como dueño, `on conflict do nothing`); (2) en `RegistrarEmpresa`; (3) para las
  empresas de la alta de cuenta (que el core inserta directo), al listar el catálogo
  vacío, como Conceptos de Bancos.
- Baja: eliminar si nadie la usa (fk desde localidades → `RecursoEnUso`), si no,
  inactivar; ambas con auditoría.

### 3.2 `empresas.localidades`

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `id` | uuid | no | pk (lo genera el dominio) |
| `empresa_id` | uuid | no | fk `core.empresas` cascade |
| `tipo_id` | uuid | no | fk `(tipo_id, empresa_id)` → `tipos_de_localidad(id, empresa_id)` no action |
| `codigo` | text | no | **obligatorio**; `check codigo ~ '^[A-Z0-9-]{1,12}$'` (el dominio lo pasa a mayúsculas) |
| `nombre` | text | no | `check char_length between 1 and 120` |
| `codigo_establecimiento_sat` | integer | sí | `check > 0` |
| `nombre_comercial_sat` | text | sí | `check null or char_length between 1 and 200` |
| `departamento_codigo`, `municipio_codigo` | char(2) | sí | fk compuesta → `core.municipios` (como terceros) |
| `direccion` | text | sí | `check null or char_length between 1 and 300` |
| `activa` | boolean | no | `default true` |

- Únicos: `localidades_codigo_unico (empresa_id, codigo)`,
  `localidades_nombre_unico (empresa_id, nombre)`, `localidades_id_empresa_unico
  (id, empresa_id)`, `localidades_establecimiento_sat_unico (empresa_id,
  codigo_establecimiento_sat) where codigo_establecimiento_sat is not null`.
- Checks: `localidades_ubicacion_completa` (departamento y municipio los dos o ninguno);
  `localidades_nombre_sat_con_codigo` (`nombre_comercial_sat is null or
  codigo_establecimiento_sat is not null`).
- Índices: `localidades_tipo_idx (tipo_id)` (fk y «en uso»).
- RLS: `politicaPorEmpresa()` + `...politicasDelRegistroConAlcance(ALCANCE_DE_LOCALIDADES)`.
- Disparador `asignar_al_creador` (2.3).
- **«Si ya existe, alerta»:** los únicos de código y nombre ven filas que el usuario no
  ve (los índices no pasan por RLS). Mensajes en `MENSAJES_POR_RESTRICCION`:
  `localidades_codigo_unico` → «Ya existe una localidad con ese código. Si no la ve,
  pida acceso a quien administra las localidades.»; igual para el nombre y para el
  establecimiento SAT. Revela solo que el código o el nombre existen (aceptado por el
  usuario al pedir la alerta).
- Baja: eliminar solo si nadie la usa (fk de departamentos u otros módulos →
  `RecursoEnUso`); si no, inactivar. Sus accesos se borran solos (cascade). La auditoría
  de `eliminar` guarda el DTO **y la lista de usuarios con acceso** que tenía.
  Inactivar no quita accesos.

### 3.3 `empresas.accesos_a_localidades` (nueva)

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `empresa_id` | uuid | no | fk `core.empresas` cascade |
| `usuario_id` | uuid | no | parte de la fk a `core.empresa_usuarios` |
| `localidad_id` | uuid | no | parte de la fk a localidades |
| `creado_en`, `actualizado_en`, `creado_por`, `actualizado_por` | | | `marcasDeTiempo` y `autoria` (quién asignó) |

- Llave primaria `(empresa_id, usuario_id, localidad_id)`: sirve a la subconsulta de la
  política (búsqueda solo por índice) y a la fk hacia `core.empresa_usuarios`.
- Fk `(localidad_id, empresa_id)` → `empresas.localidades(id, empresa_id)` **on delete
  cascade** (borrar una localidad borra sus accesos).
- Fk `(empresa_id, usuario_id)` → `core.empresa_usuarios(empresa_id, usuario_id)` **on
  delete cascade**: quitar a un usuario de una empresa (o borrar el usuario o la
  empresa) quita sus accesos; resuelve el «acceso huérfano» que tenía
  `core.accesos_datos`. Implica que solo se asignan localidades a miembros de la
  empresa, que es lo correcto.
- Índice `accesos_a_localidades_localidad_idx (localidad_id)`: cascada al borrar la
  localidad y «usuarios con acceso a esta localidad».
- RLS: `...politicasDeTablaDeAccesos(ALCANCE_DE_LOCALIDADES)` (incluye
  `aislamiento_por_empresa`).
- `core.empresa_usuarios` se queda en el core (decisión del usuario).

### 3.4 `empresas.departamentos`

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `id` | uuid | no | pk |
| `empresa_id` | uuid | no | fk `core.empresas` cascade |
| `codigo` | text | no | **obligatorio**; `check ~ '^[A-Z0-9-]{1,12}$'` |
| `nombre` | text | no | `check char_length between 1 and 120` |
| `localidad_id` | uuid | sí | fk `(localidad_id, empresa_id)` → localidades no action (MATCH SIMPLE: con nulo no se revisa) |
| `activo` | boolean | no | `default true` |

- Únicos: `departamentos_codigo_unico (empresa_id, codigo)`,
  `departamentos_nombre_unico (empresa_id, nombre)` (**único en la empresa aunque sean
  de localidades distintas**, decisión del usuario), `departamentos_id_empresa_unico
  (id, empresa_id)`.
- Índice `departamentos_localidad_idx (localidad_id)`.
- RLS: `politicaPorEmpresa()` +
  `politicaPorAlcanceOpcional(ALCANCE_DE_LOCALIDADES, 'localidad_id')`: se ven los de toda
  la empresa (sin localidad) y los de las localidades visibles; crear o mover uno a una
  localidad no visible lo rechaza el `with check` (además de `exigirReferencias`).
- Mismo manejo de «ya existe» que localidades (mensajes por restricción).
- Sin acceso por departamento. Inactivar una localidad no inactiva sus departamentos
  (la pantalla avisa).

## 4. Otros módulos que apunten a localidades (desde ya, para cuando lleguen)

- Columna `localidad_id uuid` + fk compuesta `(localidad_id, empresa_id)` →
  `empresas.localidades(id, empresa_id)` **no action** + índice.
- Si la tabla debe filtrarse por localidad: `politicaPorAlcance(ALCANCE_DE_LOCALIDADES,
  'localidad_id')` (u `…Opcional`). Si solo es informativa (notas de Bancos, Libro de
  compras), **sin** política de alcance; sus reportes hacen `left join` a localidades y
  muestran «(sin acceso)» cuando el usuario no la ve.
- Leer nombres en SQL con `join` a `localidades` (importando la tabla por la excepción
  de ESLint). **Escribir** en `empresas.*` solo lo hace el módulo `empresas`.
- `app.usuario_id` vacío (tareas programadas sin usuario) = ninguna localidad visible
  salvo alcance total. Hoy ninguna tarea lee localidades; quien la programe debe fijar
  alcance total para su recurso.

## 5. Excepción de ESLint del módulo base

Hoy `reglasDeDependencias()` aplica `prohibirOtrosModulos(modulo)` a todo el módulo y,
por capa, a `dominio`, `aplicacion` y `http`; `infraestructura` solo recibe la regla
general. Propuesta (en `eslint.config.js`):

```js
/** Módulos base: otros módulos pueden leer sus tablas (y poner llaves foráneas) solo desde su infraestructura. */
const MODULOS_BASE = ['empresas'];
const TABLAS_DEL_MODULO_BASE = (otro) =>
  `(^|/)(modulos/)?${otro}/(?!infraestructura/persistencia/[^/]+\\.tablas\\.js$)`;

function prohibirOtrosModulos(modulo, { permitirTablasBase = false } = {}) {
  return modulos
    .filter((otro) => otro !== modulo && otro !== 'core')
    .map((otro) =>
      permitirTablasBase && MODULOS_BASE.includes(otro)
        ? { regex: TABLAS_DEL_MODULO_BASE(otro), message: `De ${otro} (módulo base) solo se importan sus *.tablas.js, y solo desde infraestructura.` }
        : { group: [/* los cuatro patrones de hoy */], message: '…' },
    );
}
```

y en `reglasDeDependencias()`, **después** de las reglas por capa, una más para
`servidor/src/modulos/${modulo}/infraestructura/**/*.ts` con
`prohibirOtrosModulos(modulo, { permitirTablasBase: true })` (la última gana en flat
config). Así:

- `bancos/infraestructura/persistencia/movimientos.tablas.ts` puede importar
  `../../../empresas/infraestructura/persistencia/localidades.tablas.js`.
- Cualquier otro archivo de `empresas` (casos de uso, repositorios, rutas) sigue
  prohibido, y en `dominio`, `aplicacion`, `http`, `modulo.ts` y el cliente sigue
  prohibido todo `empresas`.
- Se usa `regex` con búsqueda negativa porque la negación `!` de `group` (semántica de
  gitignore) no vuelve a incluir un archivo cuando ya se excluyó su carpeta padre.
- Prueba manual del paso: un archivo temporal en `bancos/infraestructura` que importe
  una tabla (pasa) y un repositorio de `empresas` (falla), y otro en
  `bancos/aplicacion` que importe la tabla (falla).

Se documenta en `ARQUITECTURA.md` §2 (fila «otro módulo» de la tabla de dependencias:
«nunca, salvo las tablas de un módulo base desde `infraestructura`») y se enmienda la
regla «entre módulos, sin llave foránea» (hoy en `.claude/agents/arquitecto-de-datos.md`
y en el plan) para el módulo base.

## 6. Permisos, auditoría y rutas

### Permisos (declarados en `empresas/modulo.ts`)

| Permiso | Para qué |
|---|---|
| `empresas.tipos-de-localidad.{ver,gestionar,importar,exportar}` | catálogo |
| `empresas.localidades.{ver,gestionar,importar,exportar}` | ver las asignadas; crear (y quedar asignado), editar, inactivar, eliminar las que ve |
| `empresas.localidades.ver-todas` | ver y usar todas (alcance total). Es el `permisoVerTodos` de `recursosConAlcance` |
| `empresas.localidades.asignar` | **nuevo**: dar y quitar acceso a localidades a usuarios de la empresa (solo las que el que asigna ve) |
| `empresas.departamentos.{ver,gestionar,importar,exportar}` | catálogo |

`recursosConAlcance: [{ clave: 'empresas.localidades', descripcion: 'Localidades',
permisoVerTodos: 'empresas.localidades.ver-todas', alcance: ALCANCE_DE_LOCALIDADES }]`.

Migración de permisos (como `0002_h5a_permisos_de_carga_inicial.sql`), recomendación:
quien tiene `empresas.ver` recibe los tres `.ver`; quien tiene `empresas.gestionar`
recibe `gestionar`, `importar`, `exportar`, `asignar` y `ver-todas` (ver pregunta 2).

### Auditoría

- `AccionAuditada` suma `'asignar'` y `'quitar'` (core; la columna es texto sin
  `check`, no hace falta migración).
- Recurso `empresas.accesos-a-localidades`, `registroId` = id de la localidad,
  `anterior` = `{ usuarioId, usuario, localidadId, codigo, nombre }`. Una entrada por
  cada par que cambia.
- Crear localidad: la asignación al creador se audita (`asignar`) en `CrearLocalidad`.
- Eliminar e inactivar/reactivar tipos, localidades y departamentos: como siempre
  (`eliminar` o `auditarCambioDeEstado`), recurso `empresas.<plural>`.

### Rutas nuevas (servidor, módulo `empresas`)

- CRUD + intercambio de `tipos-de-localidad`, `localidades` y `departamentos`
  (generador).
- Accesos (ventana aparte, asigna a través del módulo):
  - `GET /api/empresas/localidades/accesos/usuarios` — miembros de la empresa activa
    (`core.empresa_usuarios` + `core.usuarios` + `core.roles`, leídos desde la
    infraestructura del módulo, que puede importar del core) con su rol y si ya ven
    todas (rol con acceso total o con `ver-todas` en `core.rol_permisos`). Permiso
    `empresas.localidades.asignar`.
  - `GET /api/empresas/localidades/accesos/:usuarioId` — ids de las localidades
    asignadas **que el operador ve** (`inner join`).
  - `PUT /api/empresas/localidades/accesos/:usuarioId` `{ localidadIds: string[] }` —
    reemplaza el conjunto **dentro de las localidades que el operador ve**: calcula la
    diferencia, inserta y borra, audita cada cambio. Las asignaciones del usuario a
    localidades que el operador no ve no se tocan (la política tampoco lo dejaría). Un
    id no visible o de un no miembro → `RecursoNoEncontrado` (404), antes de escribir.
  - `GET /api/empresas/localidades/:id/usuarios` — quién tiene acceso a una localidad
    (para la ficha), mismo permiso.

### Órdenes del mediador

**Ninguna nueva para H5b/H5c.** Los otros módulos leen localidades por SQL (módulo base)
y la seguridad la pone la RLS. Quitar un usuario de una empresa ya limpia sus accesos
por la llave en cascada, sin aviso entre módulos. (Si más adelante un módulo necesita
validar o describir una localidad sin su tabla, se agregaría
`empresas.obtener_localidad`; no hace falta ahora.)

## 7. Cliente (resumen)

- Menú de Empresas, sección Administración (importan y exportan): **Tipos de
  localidad** (catálogo: lista y ventana), **Localidades** (completa: lista, formulario
  en página y ficha con «Usuarios con acceso»), **Departamentos** (catálogo con
  selector de localidad opcional). Generados con `npm run generar -- recurso` y
  ajustados a mano donde el generador no llega (fk compuesta, municipio, mensajes).
- **Ventana de accesos a localidades** (`VentanaDeAccesosALocalidades`), abierta desde
  la lista de Localidades (botón «Accesos», `v-permiso="'empresas.localidades.asignar'"`):
  elegir usuario → casillas con las localidades que el operador ve → Guardar. Si el
  usuario ya ve todas por su rol, la ventana lo dice y no muestra casillas.
- Al crear una localidad sin `ver-todas`, el aviso de éxito dice «Quedó asignada a
  usted». Si el servidor responde `duplicado`, se muestra su mensaje (la alerta).

## 8. Orden de migraciones

| # | Módulo | Archivo | Tipo | Contenido |
|---|---|---|---|---|
| 1 | core | `0013_quitar_accesos_datos` | generada + guarda arriba | `DO $$ … $$` + `DROP TABLE core.accesos_datos` |
| 2 | core | `0014_asignar_registro_al_creador` | `--custom` | función `core.asignar_registro_al_creador()` |
| 3 | empresas | `0003_h5b_tipos_de_localidad` | generada | tabla y políticas |
| 4 | empresas | `0004_h5b_sembrar_tipos_y_permisos` | `--custom` | tipos sugeridos para las empresas existentes; permisos de tipos |
| 5 | empresas | `0005_h5b_localidades_y_accesos` | generada | `localidades`, `accesos_a_localidades`, políticas |
| 6 | empresas | `0006_h5b_asignar_al_creador_y_permisos` | `--custom` | `create trigger`; permisos de localidades (incluido `asignar`) |
| 7 | empresas | `0007_h5c_departamentos` | generada (+ permisos en otra `--custom` o al final a mano) | tabla, políticas y permisos |

- Las políticas de las migraciones 5 y 7 solo nombran tablas del propio esquema y
  funciones de PostgreSQL; no dependen de la función de la #2 (esa solo la usa el
  disparador de la #6). Así drizzle-kit genera el SQL sin editarlo a mano.
- `when`: todas generadas hoy o después quedan por encima de 1790664992135 (core) y
  1790683469516 (empresas). Revisar el `when` antes de cada commit; si una custom se
  genera antes que la generada anterior (reloj corrido), subirlo a mano.
- En una base vacía el migrador corre `core` (1, 2), luego `empresas` (3–7), luego
  `bancos` y `terceros`: la función existe antes del disparador y las localidades
  antes de cualquier fk futura de otro módulo. Los `grant` sobre `empresas` los da el
  migrador después de cada módulo (la tabla de accesos la necesita `arrancar_app` para
  la subconsulta de la política, también cuando la política esté en otro esquema).

## 9. Riesgos y pruebas

| Riesgo | Control |
|---|---|
| Recursión de políticas si alguien agrega una política de `select` con subconsulta a la tabla de accesos | Regla en el TSDoc + prueba que hace `select`, `insert` y `delete` en las tres tablas como usuario común (una recursión rompe la consulta) |
| `returning` en el alta de una localidad falla para quien no tiene alcance total | Repositorio sin `returning`; prueba de API: usuario sin `ver-todas` crea, la ve y queda asignado |
| Error 42501 (*new row violates row-level security policy*) sale como 500 | Traducirlo en `interpretarErrorDePostgres` a `RecursoNoEncontrado` (no revela nada); los casos de uso validan antes con `exigirQueExista` |
| Fuga de existencia por los únicos de código y nombre | Aceptada por la decisión «si ya existe, alerta»; mensaje que sugiere pedir acceso |
| El disparador `security definer` | `search_path = ''`, nombres con esquema, `revoke … from public`, argumentos solo desde migraciones; se rompe si se usa `force row level security` (documentado) |
| Roles sin `ver-todas` dejan de ver localidades que antes no existían | No hay localidades hoy; la migración de permisos da `ver-todas` a quien gestiona empresas (pregunta 2) |
| Reportes de otros módulos con `left join` a localidades no visibles | «(sin acceso)» en pantalla; recomendar `ver-todas` a roles contables |
| Rendimiento | Subconsulta con índice de la llave primaria, calculada una vez por consulta; `EXPLAIN ANALYZE` con ~100 mil filas dependientes y ~50 asignaciones cuando llegue el primer módulo que filtre |
| Quitar a un usuario de la empresa borra sus accesos sin auditoría (cascada) | Hoy no hay caso de uso para quitar miembros; cuando exista, auditar sus accesos antes |
| Borrar una empresa con configuración | Prueba: empresa con tipos, localidades, departamentos y accesos se borra (cascada con fk `no action` internas) |

Pruebas del core (`alcance-datos.prueba.ts`, reescrita): solo lo asignado; sin
asignación nada; alcance total todo; alcance total de otro recurso no sirve; no puede
cambiar ni borrar lo no asignado; puede insertar en la tabla protegida sin alcance y el
disparador lo asigna (y no asigna a quien no es miembro); dependiente opcional muestra
nulos; no puede asignar ni quitar lo que no ve; otra empresa nada; sin recursión.
Prueba nueva: toda tabla de los esquemas de módulos tiene RLS activa, y cada recurso
declarado en `recursosConAlcance` tiene su tabla de accesos con las cuatro políticas.

## 10. Pasos de implementación (un commit cada uno)

Requisito previo: el punto 1 de «Siguiente» (unificar `soloAccesoTotal` con
`soloSuperacceso`) puede ir antes o después; no se cruzan.

1. **[HECHO] H5b-1 (servidor, core) Alcance con tablas de cada módulo.** `core/base-datos/alcance.ts`
   con `AlcanceDeRegistros`, `politicasDelRegistroConAlcance`, `politicaPorAlcance`,
   `politicaPorAlcanceOpcional` y `politicasDeTablaDeAccesos`; quitar la vieja de
   `columnas.ts`; `alcance` en `DefinicionRecursoConAlcance`; `'asignar' | 'quitar'` en
   `AccionAuditada`; 42501 → `RecursoNoEncontrado`; quitar `core.accesos_datos`
   (migraciones 1 y 2 de la sección 8, función del disparador incluida); reescribir
   `alcance-datos.prueba.ts` y pasar las otras tres pruebas a `core.correlativos`;
   actualizar `CLAUDE.md`, `PLAN.md` §3.3/§3.5 y bitácora, `ARQUITECTURA.md`.
2. **[HECHO] H5b-2 (herramientas) Excepción de ESLint del módulo base.** Sección 5, con su
   documentación en `ARQUITECTURA.md` §2 y la enmienda de «sin llave foránea entre
   módulos».
3. **H5b-3 (servidor) Tipos de localidad.** Tabla, semilla (migración, `RegistrarEmpresa`
   y catálogo vacío), casos de uso, rutas, Excel, permisos (migraciones 3 y 4).
4. **H5b-3 (cliente) Tipos de localidad.** Pantalla de catálogo y menú.
5. **H5b-4 (servidor) Localidades.** Tablas `localidades` y `accesos_a_localidades`,
   `ALCANCE_DE_LOCALIDADES`, `recursosConAlcance`, disparador, casos de uso (crear con
   auditoría de la asignación, editar, inactivar, eliminar con usuarios con acceso en la
   auditoría), mensajes de duplicado, Excel, permisos (migraciones 5 y 6). Pruebas de
   API con un usuario sin `ver-todas`.
6. **H5b-4 (cliente) Localidades.** Lista, formulario (tipo, SAT, municipio), ficha.
7. **H5b-5 (servidor) Accesos a localidades.** Las cuatro rutas de accesos, casos de uso
   `ListarUsuariosParaAccesos`, `ObtenerAccesosDeUsuario`, `ReemplazarAccesosDeUsuario`
   (diferencia, auditoría por cambio), `ListarUsuariosDeLocalidad`.
8. **H5b-5 (cliente) Ventana de accesos.** `VentanaDeAccesosALocalidades`, botón en la
   lista y «Usuarios con acceso» en la ficha.
9. **H5c (servidor) Departamentos.** Tabla con alcance opcional, casos de uso, Excel,
   permisos (migración 7).
10. **H5c (cliente) Departamentos.** Pantalla de catálogo con selector de localidad.
11. **Docs.** `DONDE-QUEDAMOS.md`, bitácora de `PLAN.md`, marcar H5b/H5c en el plan de
    hallazgos y en `diseno-esquema-empresas.md` («reemplazado por
    `diseno-accesos-por-modulo.md`» en su sección de accesos).

## 12. Notas de implementación de los pasos 1 y 2 (2026-09-29)

- La condición de alcance total del diseño (`= any ((select string_to_array(...)))`) falla en
  PostgreSQL (`malformed array literal`: lo lee como subconsulta). Quedó
  `= any (string_to_array((select current_setting('app.alcance_total', true)), ','))`, que
  conserva el initplan de la variable.
- `0013_quitar_accesos_datos` se generó con drizzle-kit y se le antepuso la guarda a mano (aún no
  estaba aplicada en producción); `0014_asignar_registro_al_creador` es `--custom`. Los `when`
  quedan por encima del último de core.
- `AccionAuditada` suma `asignar` y `quitar`; el 42501 se traduce a `RecursoNoEncontrado('El registro')`.
- `DefinicionRecursoConAlcance` suma `alcance`; `verificarDeclaracion` exige que `alcance.recurso`
  sea igual a `clave`. `usuarioDeLaTransaccion` y `empresaDeLaTransaccion` se exportan de `columnas.ts`.
- La prueba «toda tabla de módulo tiene RLS / cada recurso con alcance tiene su tabla de accesos»
  de la sección 9 no se escribió: hoy ningún módulo declara alcance; se agrega en H5b-4.
- ESLint: `MODULOS_BASE` y `excepcionDelModuloBase` en `eslint.config.js`; no se aplica a `core`.
  Comprobado con archivos temporales (ya borrados): desde `bancos/infraestructura` pasa
  `empresas/infraestructura/persistencia/*.tablas.js`; fallan otros archivos de `empresas`
  (repositorios, aplicación, `modulo.ts`), subcarpetas de persistencia, `terceros` y cualquier
  importación desde `aplicacion`, `http` o la raíz del módulo.

## 11. Preguntas para el usuario

Ninguna bloquea el paso 1 ni el 2. Si no hay respuesta, se sigue con lo recomendado.

1. **Quién puede asignar.** Propuesto: con `empresas.localidades.asignar`, cada quien
   asigna y quita **solo las localidades que ve** (un encargado con dos fincas reparte
   esas dos). ¿O asignar debe exigir ver todas? (Bloquea el paso 7.)
2. **Permisos iniciales.** Propuesto: quien hoy gestiona empresas recibe `ver-todas` y
   `asignar`; quien solo ve empresas recibe los `.ver` y, al no tener `ver-todas`, solo
   verá las localidades que le asignen. ¿De acuerdo? (Bloquea la migración de permisos
   del paso 5.)
3. **Dónde se abre la ventana de accesos.** Propuesto: botón «Accesos» en la lista de
   Localidades (elige usuario → marca localidades) y, en la ficha de una localidad, la
   lista de usuarios con acceso. ¿Hace falta también entrar desde la pantalla de
   Usuarios del core? (Eso pediría que el core muestre acciones que aportan los
   módulos; no está previsto.) (Bloquea el paso 8.)
4. **Asignar al creador con disparador.** Se propone que la base de datos asigne la
   localidad a quien la crea (disparador), también al importar desde Excel, y que la
   aplicación lo audite. Es la única forma de cumplirlo sin abrir un hueco en la
   seguridad; confirmar que está bien que al importar 200 localidades todas queden
   asignadas a quien importa (y 200 entradas de auditoría `asignar`).
