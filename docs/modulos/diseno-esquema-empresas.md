# Diseño del esquema `empresas` (H5a, H5b, H5c) — arquitecto de datos, 2026-09-29

Reemplaza a `core.localidades` y `core.areas` del plan de hallazgos, según la decisión
del usuario (esquema `empresas`, nombre «departamentos», Bancos sin filtro por localidad,
tipos de localidad editables).

> **Nota (2026-09-29, PLAN §3.5):** donde este documento dice `gestionar` léase `crear`, `editar` y `eliminar` (el que corresponda a cada acción; inactivar y reactivar van con `editar`), y `reabrir` ya no es solo de acceso total: `soloAccesoTotal` se eliminó.

## Lo encontrado

1. El módulo `empresas` es de negocio y **esencial**, sin tablas propias: administra
   `core.empresas` y `core.empresa_usuarios` importando tablas del core. No hay esquema
   `empresas` ni carpeta `migraciones/`.
2. `politicaPorAlcance` no la usa ninguna tabla real; nadie declara `recursosConAlcance`;
   `core.accesos_datos` está vacía y **no hay pantalla ni endpoint para asignar accesos a
   datos**. Localidades será su primer uso real.
3. ESLint (`prohibirOtrosModulos`) solo exceptúa a `core`.
4. El migrador corre `core` primero y luego según `dependeDe`; los `grant` van sobre el
   esquema con el nombre del módulo (encaja con `empresas`).
5. La alta de cuenta inserta la empresa directo en el core, sin `RegistrarEmpresa` ni
   evento `empresas.registrada` (afecta semillas).
6. `nit` se queda en `core.empresas`.

## Decisión: módulo con esquema propio, declarado «módulo base» (pregunta 1)

- `pgSchema('empresas')`, migraciones en `empresas/migraciones/`, control en
  `drizzle.migraciones_empresas`. `core.empresas` y `core.empresa_usuarios` siguen en el core.
- **Módulo base:** esencial, no depende de módulos de negocio y otros pueden depender de él:
  - Otros módulos pueden importar **solo** `modulos/empresas/infraestructura/persistencia/*.tablas.js`
    y solo desde su `infraestructura/` (FK compuestas `(localidad_id, empresa_id)` y `join`
    de solo lectura). Escribir en `empresas.*` solo lo hace `empresas` (convención).
  - Lo demás, por el mediador.
  - ESLint: para `otro === 'empresas'`, excepción del patrón de tablas en la capa
    `infraestructura`.
  - Migrador: todo módulo no esencial depende también de los esenciales.
- Por qué FK y no mediador: localidades es una dimensión maestra compartida (como
  `core.municipios`); los reportes agrupan y ordenan por su nombre en SQL, se necesita saber
  si está en uso y garantizar «misma empresa». **Enmienda la regla «entre módulos, sin llave
  foránea»**: documentarlo en `ARQUITECTURA.md` §2 cuando el usuario lo apruebe.

## Tablas

Todas con `marcasDeTiempo`, `autoria`, `politicaPorEmpresa()` y
`empresa_id → core.empresas(id) on delete cascade`. Las FK entre tablas de la misma empresa
(y las de otros módulos hacia localidades) quedan en **`no action`** (no `restrict`), para que
la cascada al borrar una empresa se verifique al final del comando.

### H5a. Datos de la empresa (1 a 1, fila creada al guardar)

- `empresas.datos_fiscales (empresa_id pk, razon_social, nombre_comercial)`, textos 1–200.
- `empresas.cargas_iniciales (empresa_id pk, fecha_de_inicio date not null, cerrada_en,
  cerrada_por, check cierre completo)`. Tabla aparte porque Bancos (y luego Cuentas por pagar
  e Inventario) la bloquean `for share` al registrar saldos iniciales y cerrarla es
  `for update`.
- Reglas: la fecha solo cambia con la carga abierta; cerrar exige la fecha; reabrir pide
  permiso, motivo y auditoría (`'reabrir'` en `AccionAuditada`).
- Mediador: `empresas.obtener_carga_inicial` → `{ fechaDeInicio, cerrada }` y
  `empresas.obtener_datos_de_empresa` (nombre, NIT, razón social, nombre comercial).
- Queda en `core.empresas`: `nombre`, `nit`, `moneda_base`, `activa`. Regímenes y agentes de
  retención van en `libro_de_compras.datos_fiscales_de_empresa` (L1). Pendiente para L1: un
  «espacio» para que los módulos aporten secciones al formulario de Empresas.

### H5b. Tipos de localidad y localidades

- `empresas.tipos_de_localidad (id, empresa_id, nombre 1–60, activo)`, únicos
  `(empresa_id, nombre)` y `(id, empresa_id)`.
- `empresas.localidades (id, empresa_id, tipo_id, codigo ^[A-Z0-9-]{1,12}$, nombre 1–120,
  codigo_establecimiento_sat > 0, nombre_comercial_sat, departamento_codigo,
  municipio_codigo, direccion, activa)`; únicos `(empresa_id, codigo)`,
  `(empresa_id, nombre)`, `(id, empresa_id)`, establecimiento SAT único cuando no es nulo;
  FK `(tipo_id, empresa_id)` a tipos, FK a `core.municipios`; checks de ubicación completa y
  nombre SAT solo con código. RLS: `politicaPorEmpresa()` +
  `politicaPorAlcance('empresas.localidades')`.
- Eliminar solo si nadie la usa (`RecursoEnUso`); si no, inactivar. Al eliminar, borrar sus
  filas de `core.accesos_datos` (puerto `AccesosADatos.quitarRegistro`).
- Otros módulos: `localidad_id` + FK `(localidad_id, empresa_id)` + índice.

### H5c. Departamentos (localidad opcional)

- `empresas.departamentos (id, empresa_id, codigo, nombre, localidad_id null, activo)`,
  únicos `(empresa_id, codigo)`, `(empresa_id, nombre)`, `(id, empresa_id)`; FK compuesta a
  localidades (MATCH SIMPLE). RLS: `politicaPorEmpresa()` +
  `politicaPorAlcanceOpcional('empresas.localidades', 'localidad_id')`.
- Sin acceso por departamento. Inactivar una localidad no inactiva sus departamentos (aviso).

## Accesos a localidades

- Reusa `core.accesos_datos` con el recurso `empresas.localidades`; `empresas/modulo.ts`
  declara `recursosConAlcance` con `permisoVerTodos: 'empresas.localidades.ver-todas'`.
- Crear o importar localidades exige `ver-todas` (la política rechaza el `insert` de un id
  aún no asignado); editar una asignada solo `gestionar`.
- Falta en el core: `PUT /usuarios/:id/accesos-a-datos/:recurso` (reemplaza el conjunto de
  la empresa activa, auditado, permiso `usuarios.gestionar`) y `listarOpciones(contexto)` en
  `DefinicionRecursoConAlcance`, para que la pantalla de Usuarios muestre opciones sin
  importar el módulo.
- `politicaPorAlcanceOpcional(recurso, columna)` en `core/base-datos/columnas.ts`:
  `(columna is null or <condición de politicaPorAlcance>)`, restrictiva, `for all`, con
  `(select …)` para que se evalúe una vez por consulta. Las políticas se nombran por recurso
  para que una tabla pueda llevar dos.

## Semillas, permisos, menú

- Tipos sugeridos (editables): Finca, Planta, Oficina, Bodega, Beneficio, Tienda, Taller.
  Sembrados en la migración para las empresas existentes, en `RegistrarEmpresa` y, para las de
  la alta de cuenta, al abrir el catálogo vacío (como Conceptos).
- Permisos: `empresas.tipos-de-localidad.{ver,gestionar,importar,exportar}`,
  `empresas.localidades.{ver,gestionar,importar,exportar,ver-todas}`,
  `empresas.departamentos.{ver,gestionar,importar,exportar}`,
  `empresas.carga-inicial.{cerrar,reabrir}`; razón social, nombre comercial y fecha de inicio
  con `empresas.gestionar`. `reabrir` solo para roles de acceso total.
- Menú en Administración (importan y exportan): Tipos de localidad, Localidades,
  Departamentos. El formulario de Empresas suma «Datos fiscales» y «Fecha de inicio y carga
  inicial».

## Pasos (un commit cada uno)

1. **H5a-1** Módulo base: excepción de ESLint, migrador con esenciales primero,
   `esquema.tablas.ts`, documentación. *(Requiere la pregunta 1.)*
2. **H5a-2** `datos_fiscales` y `cargas_iniciales`, formulario, cerrar y reabrir, órdenes del
   mediador.
3. **H5b-1** `politicaPorAlcanceOpcional` y nombres de política por recurso.
4. **H5b-2** Asignación de accesos a datos en el core (ruta, `listarOpciones`, pantalla de
   Usuarios).
5. **H5b-3** Tipos de localidad y semilla.
6. **H5b-4** Localidades.
7. **H5c** Departamentos.

## Riesgos y pruebas

- RLS sobre las tablas reales (sin asignación nada, con asignación lo suyo, `ver-todas`
  todo, `insert` sin `ver-todas` rechazado, departamentos sin localidad visibles, otra
  empresa nada) y una prueba que falle si una tabla de módulo no tiene RLS.
- Reportes de módulos que no filtran por localidad: el `left join` da nulo si el usuario no
  la ve; mostrar «(sin acceso)» y recomendar `ver-todas` a roles contables.
- Rendimiento: `EXPLAIN ANALYZE` con ~100 mil filas y ~50 asignaciones.
- Baja: borrar una empresa sin datos con tipos sembrados pasa; eliminar una localidad usada
  da `RecursoEnUso`; accesos huérfanos al quitar un usuario de una empresa (riesgo existente).
- Concurrencia: cerrar la carga mientras Bancos registra un saldo inicial.
- Migrador en base vacía: `empresas` antes que `bancos`, con `grant` sobre el esquema.

## Preguntas para el usuario

1. ¿Se aprueba `empresas` como **módulo base** (otros módulos ponen FK y leen sus tablas en
   SQL)? Es una excepción a «entre módulos, sin FK».
2. ¿Los accesos a localidades van en `core.accesos_datos` y `core.empresa_usuarios` se queda en
   el core?
3. ¿Tipos de localidad por **empresa** (propuesto) o por **cuenta**?
4. ¿El código interno de localidad y departamento es obligatorio?
5. ¿El nombre de departamento es único en la empresa aunque sean de localidades distintas?
6. ¿Crear localidades exige `ver-todas`?
7. ¿Una empresa con localidades cuenta como «con datos» (ya no se elimina, solo se inactiva)?
