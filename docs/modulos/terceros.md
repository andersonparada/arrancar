# Módulo `terceros` — se muestra como **Clientes**

Estado: **en arquitectura limpia** (fase 4 del refactor, 2026-09-26). Las pantallas
propias de clientes y proveedores se hacen en la fase 6 (ver "Pantallas").

## Propósito

Registrar una sola vez a las personas y empresas a las que la cuenta les vende o
les compra, y los **papeles** que cumplen (cliente, proveedor). En el campo una
misma persona suele ser las dos cosas: el vecino que compra maíz y también
alquila su tractor.

**Es de este módulo:** identidad, datos de contacto, contactos y papeles.
**No es de este módulo:** saldos, créditos, ventas, pagos. Esos módulos agregan
sus propias tablas apuntando al tercero.

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Nombre | El usuario lo ve como **Clientes**; "terceros" es solo el nombre técnico (clave, esquema, carpetas, rutas y permisos). |
| Alcance | **Por cuenta**: se registra una vez y lo usan todas las empresas de la cuenta. |
| Trabajadores | **No son de este módulo** (2026-09-26): pasan al futuro módulo de planilla, que dependerá de `terceros` para la identidad (nombre, DPI, teléfono) y tendrá su propia tabla de trabajadores. La tabla `terceros.trabajadores` se eliminó (migración `0002`). |
| Dato mínimo | **Solo el nombre.** NIT, DPI y teléfono se completan después. Ventas exigirá NIT o CF al facturar. |
| Clases de cliente | Consumidor directo, intermediario o acopiador, empresa compradora, subasta o feria. |
| Contacto normalizado | Teléfono y WhatsApp sin separadores (`55551234`, `+50255551234`); correo en minúsculas. El cliente muestra los locales como "5555-1234". |

## Arquitectura

```
dominio/          Tercero (raíz, con sus papeles), IdentidadDeTercero, Contacto,
                  CategoriaDeProveedor, papeles, eventos, errores
aplicacion/       13 casos de uso (terceros/, papeles/, contactos/, categorias/),
                  AvisoDeParecidos, puertos (repositorios y consultas), DTO
infraestructura/  tablas (persistencia/*.tablas.ts), repositorios y consultas con
                  Drizzle, mapeadores, catálogo de eventos
http/             controladores, rutas y esquemas de entrada
modulo.ts         definición del módulo y raíz de composición
```

## Tablas (esquema `terceros`)

Todas llevan `cuenta_id`, `politicaPorCuenta()` y marcas de tiempo.

| Tabla | Contenido |
|---|---|
| `terceros` | Tipo (individual o jurídica), nombres, apellidos, razón social, nombre comercial, `nombre_mostrar` (calculado por el dominio), NIT (único por cuenta salvo CF), DPI (único por cuenta), teléfono, WhatsApp, correo, departamento, municipio, dirección, foto, notas, activo. |
| `contactos` | Personas de contacto de un tercero: nombre, cargo, teléfono, WhatsApp, correo, notas. |
| `clientes` | Papel de cliente (uno por tercero): clase, activo, notas. |
| `proveedores` | Papel de proveedor (uno por tercero): categoría, activo, notas. |
| `categorias_proveedor` | Categorías editables por cuenta, con nombre único. |

## Reglas (las garantiza el dominio)

- Nunca se borra un tercero: se inactiva. **Inactivarlo inactiva sus papeles.**
- Un papel quitado queda inactivo con su historial; los demás papeles no cambian.
- No se asignan papeles a un tercero inactivo.
- Una persona necesita nombres; una empresa, razón social o nombre comercial.
- Aviso de posible duplicado (mismo NIT, mismo DPI o nombre parecido con
  trigramas de `pg_trgm`) salvo que el usuario confirme.
- Un contacto solo se cambia o se borra a través de su propio tercero.
- Los eventos se publican después de guardar.

## Permisos

| Permiso | Permite |
|---|---|
| `terceros.ver` | Ver clientes y proveedores, sus fichas, contactos y categorías. |
| `terceros.gestionar` | Registrar, editar e inactivar; agregar y cambiar contactos. |
| `clientes.gestionar` | Asignar o quitar el papel de cliente. |
| `proveedores.gestionar` | Asignar o quitar el papel de proveedor y editar sus categorías. |

## Configuración (por instalación, cuenta o empresa)

| Clave | Valor predeterminado |
|---|---|
| `terceros.papeles.habilitados` | `["cliente", "proveedor"]` |
| `terceros.clientes.permitir_consumidor_final` | `true` |

## Eventos

`terceros.creado`, `terceros.actualizado`, `terceros.inactivado`,
`terceros.papel_asignado`, `terceros.papel_quitado` (papel: `cliente` o `proveedor`).

## Pantallas

Menú acordado (se construye en la fase 6.2 del refactor; el módulo es plegable):

```
▾ Clientes
    Operación
      Buscar contacto        búsqueda rápida de clientes, proveedores y sus contactos para llamar o escribir
    Administración
      Clientes               listado con su clase; botón "Nuevo cliente"
      Proveedores            listado con su categoría; botón "Nuevo proveedor"
      Categorías de proveedor
    Reportes                 (después: clientes por clase, proveedores por categoría)
```

- **Alta y edición en página completa** (`/clientes/nuevo`, `/clientes/:id/editar`,
  y lo mismo para proveedores): datos generales, el papel con su clase o categoría y
  los contactos, guardados en un solo paso. El aviso de posible duplicado se
  mantiene.
- **Ficha** (`/clientes/:id`, `/proveedores/:id`): la misma, dividida en
  componentes (datos generales, contactos, papel de cliente, papel de proveedor).
  Si la persona también es proveedor (o cliente), la ficha lo muestra y permite
  agregar o quitar el otro papel.
- Clientes y Proveedores comparten los componentes (formulario de datos generales,
  contactos, buscador); cada pantalla solo agrega lo propio de su papel.
- Cambios en el servidor: el listado trae la clase del cliente y la categoría del
  proveedor; búsqueda de contactos; alta en un paso (datos, papel y contactos).

Mientras tanto sigue la primera versión: listado general "Clientes y
proveedores", ficha con cliente y proveedor, y alta rápida.

## Fuera de esta versión

- Consulta del NIT en la SAT (llega con el certificador FEL en ventas).
- Importar desde Excel.
- Unir registros duplicados.
