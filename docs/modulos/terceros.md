# Módulo `terceros` — clientes, proveedores y trabajadores

Estado: **programado** (2026-09-26). Servidor y cliente implementados según este plan;
ver la bitácora de `docs/PLAN.md` para detalles y decisiones tomadas durante la
implementación.

## Propósito

Registrar una sola vez a las personas y empresas con las que se trata, y los
**papeles** que cumplen (cliente, proveedor, trabajador). En el campo una misma
persona suele ser varias cosas a la vez: el vecino que compra maíz y también
alquila su tractor, o el trabajador que vende leña.

**Es de terceros:** identidad, datos de contacto y papeles.
**No es de terceros:** saldos, créditos, ventas, pagos, jornales. Esos módulos
agregan sus propias tablas apuntando al tercero (como ganado hará con el fierro
sobre la empresa).

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Alcance | **Por cuenta**: un tercero se registra una vez y lo usan todas las empresas de la cuenta. Lo que ocurre con él (ventas, saldos, jornales) es por empresa en cada módulo. |
| Trabajadores | ~~Son un papel de terceros.~~ **Cambio (2026-09-26): los trabajadores salen de este módulo y pasan al futuro módulo de planilla**, que dependerá de `terceros` para la identidad de la persona (nombre, DPI, teléfono) y tendrá su propia tabla de trabajadores. |
| Nombre para el usuario | **Cambio (2026-09-26):** en el menú el módulo se llama **Clientes**. "Terceros" queda solo como nombre técnico (clave, esquema y carpetas). |
| Pantallas | **Cambio (2026-09-26):** pantallas propias de **Clientes** y **Proveedores**, cada una con su listado y su formulario de alta, organizadas en las secciones del menú (ver abajo). |
| Dato mínimo | **Solo el nombre.** NIT, DPI y teléfono se completan después. Ventas exigirá NIT o CF al facturar. |
| Clases de cliente | Consumidor directo, intermediario o acopiador, empresa compradora, subasta o feria. |

## Dependencias

- `dependeDe: []`: solo usa el core.
- **Requisitos nuevos en el core** (se hacen antes que el módulo):
  - `app.cuenta_id` en `ejecutarEnEmpresa` (la cuenta de la empresa activa) y
    una política `politicaPorCuenta()`, para tablas compartidas por cuenta.
  - Catálogo de **departamentos y municipios** de Guatemala (también lo usará la
    ficha de la empresa).
  - Validación de **DPI (CUI)**: 13 dígitos, dígito verificador y código de
    departamento y municipio válidos. Junto a `nit.ts` en `core/utilidades`.

## Tablas (esquema `terceros`)

Todas llevan `cuenta_id`, `politicaPorCuenta()` y marcas de tiempo.

### `terceros`
| Columna | Notas |
|---|---|
| `tipo` | `individual` o `juridica`. |
| `nombres`, `apellidos` | Persona individual. |
| `razon_social`, `nombre_comercial` | Persona jurídica (el comercial también sirve para individuales con negocio). |
| `nombre_mostrar` | Calculado: nombre comercial, razón social o nombres + apellidos. Se usa para buscar y listar. |
| `nit` | Opcional. Único por cuenta salvo `CF`. Validado con el dígito verificador. |
| `dpi` | Opcional. Único por cuenta. Validado. |
| `telefono`, `whatsapp`, `correo` | Opcionales. |
| `departamento_id`, `municipio_id`, `direccion` | Opcionales (catálogo del core). |
| `foto_archivo_id` | Foto o logo (archivos del core, WebP). |
| `notas` | Texto libre. |
| `activo` | Nunca se borra un tercero; se inactiva. |

### `contactos`
Personas de contacto de un tercero (normalmente jurídico): nombre, cargo,
teléfono, WhatsApp, correo, notas.

### `clientes` (papel)
`tercero_id` (único), `clase` (`directo`, `intermediario`, `empresa`, `subasta`),
`activo`, `notas`.

### `proveedores` (papel)
`tercero_id` (único), `categoria` (catálogo editable por cuenta: insumos,
veterinario, transporte, maquinaria, servicios…), `activo`, `notas`.

### `trabajadores` (papel)
`tercero_id` (único), `cargo`, `fecha_ingreso`, `fecha_salida`, `activo`, `notas`.

## Reglas

- Un papel se puede quitar (se inactiva) sin afectar a los demás papeles.
- Inactivar un tercero inactiva sus papeles; no se puede elegir en otros módulos,
  pero su historial se conserva.
- Búsqueda por nombre, NIT, DPI o teléfono (índice de trigramas `pg_trgm` sobre
  `nombre_mostrar`).
- Aviso de posible duplicado al crear: mismo NIT, mismo DPI o nombre muy parecido.
- Otros módulos referencian `terceros.terceros(id)` con llave foránea; pueden
  hacerlo porque declaran `dependeDe: ['terceros']`.

## Permisos

| Permiso | Permite |
|---|---|
| `terceros.ver` | Ver el listado y la ficha (sin DPI de trabajadores). |
| `terceros.gestionar` | Crear, editar e inactivar terceros y contactos. |
| `clientes.gestionar` | Asignar o quitar el papel cliente. |
| `proveedores.gestionar` | Asignar o quitar el papel proveedor y editar categorías. |
| `trabajadores.ver` | Ver el papel trabajador y sus datos sensibles (DPI, teléfono). |
| `trabajadores.gestionar` | Asignar o quitar el papel trabajador. |

No hay alcance por registro (`recursosConAlcance`) en esta versión.

## Configuración (por instalación, cuenta o empresa)

| Clave | Valor predeterminado |
|---|---|
| `terceros.papeles.habilitados` | `["cliente", "proveedor", "trabajador"]` |
| `terceros.trabajadores.dpi_obligatorio` | `false` |
| `terceros.clientes.permitir_consumidor_final` | `true` |

## Eventos

`terceros.creado`, `terceros.actualizado`, `terceros.inactivado`,
`terceros.papel_asignado`, `terceros.papel_quitado`.

## Pantallas

**Nuevo menú (acordado el 2026-09-26, se aplica en las fases 4 y 6 del refactor):**

```
Clientes
  Trabajo diario
    Buscar contacto        búsqueda rápida de clientes y proveedores para llamar o escribir
  Administración
    Clientes               listado + alta de clientes (con su clase)
    Proveedores            listado + alta de proveedores (con su categoría)
    Categorías de proveedor
  Reportes
    Clientes por clase     (directo, intermediario, empresa, subasta)
    Proveedores por categoría
```

Las pantallas de Clientes y Proveedores comparten componentes (formulario de
datos generales, contactos, búsqueda); cada una solo agrega lo propio de su papel.

Pantallas de la primera versión (se reemplazan con el menú anterior):

- **Listado**: búsqueda, filtro por papel y por estado, chips de papeles.
- **Ficha**: datos generales, contactos y una pestaña por papel. Los módulos que
  se activen después (cuentas por cobrar, ventas, planilla) agregan sus propias
  pestañas, solo si están activos.
- **Alta rápida**: ventana reutilizable para crear un tercero desde otro módulo
  (por ejemplo al registrar una venta) sin salir de la pantalla.

## Fuera de esta versión

- Consulta del NIT en la SAT (llega con el certificador FEL en ventas).
- Importar desde Excel.
- Unir terceros duplicados.

## Orden de trabajo

1. Core: `app.cuenta_id` + `politicaPorCuenta()`, departamentos y municipios,
   validación de DPI, con sus pruebas.
2. Servidor de terceros: esquemas, migración, repositorios, servicios, rutas y
   pruebas de aislamiento entre cuentas.
3. Cliente: listado, ficha, alta rápida.
4. Actualizar `PLAN.md` y la bitácora.
