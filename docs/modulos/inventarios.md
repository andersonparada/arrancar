# Módulo `inventarios` — se muestra como **Inventarios**

Estado: **en programación** (INV-1 hecho en el servidor el 2026-11-19). El diseño aprobado y sus pasos están en
`docs/modulos/diseno-inventarios.md`; este documento resume lo que ya existe.

## Propósito

Existencias, kardex y costeo de la mercadería, materias primas y suministros de la empresa.

**Es de este módulo:** los catálogos (unidades, categorías, artículos con sus conversiones y lotes) y, en los pasos
siguientes del diseño, las bodegas, el kardex, el costeo, los ajustes, el inventario físico, el cierre y el deterioro.
**No es de este módulo:** la compra (Libro de compras), el pago, los bienes de uso (Activos fijos, aunque se guarden
en una bodega) ni la contabilidad.

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Alcance | Por empresa: `empresa_id` y RLS solo por empresa. El alcance por bodega llega con INV-2 |
| Dependencia | Solo `libro-de-compras` (INV-A1); trae `terceros` de forma transitiva |
| Unidades | Semilla perezosa de 17 al abrir el catálogo vacío; masa, volumen y longitud traen su factor a libra, galón y metro |
| Artículos | Tipo de inventario de la SAT (V-4); código propuesto con el prefijo y el correlativo `inventarios.articulos` |
| Auditoría permanente | `inventarios.metodos-de-costeo`, `.cierres` y `.ajustes` (migración `0001`) |

## Recursos

| Recurso | Pantalla | Baja |
|---|---|---|
| Unidad | Unidades (INV-1c) | Inactivar; eliminar solo si ningún artículo la usa |
| Categoría | Categorías (INV-1c) | Inactivar; eliminar solo sin artículos |
| Artículo | Artículos (INV-1c) | Inactivar; eliminar con sus conversiones y lotes (INV-4 agrega la guardia de movimientos) |

## Tablas (esquema `inventarios`)

- `unidades`: únicos por nombre normalizado y por símbolo en mayúsculas; `check` de magnitud y de factor
  (`(magnitud con factor) = (factor no nulo)`, mayor que cero). `numeric(18,8)`.
- `categorias`: único por nombre normalizado y tipo de inventario por omisión.
- `articulos`: único por código (mayúsculas), nombre normalizado y código de barras (parcial); llaves compuestas con la
  empresa a categoría, unidad base y concepto de gasto del Libro de compras; `check` de código, vencimiento con lotes,
  existencia mínima y peso. Índice `pg_trgm` por nombre (migración `0002`).
- `conversiones`: PK `(articulo_id, unidad_id)`, factor mayor que cero, una sola `para_compras` por artículo.
- `lotes`: único `(articulo_id, código en mayúsculas)`; índice parcial de vencimientos.

## Reglas (las garantiza el dominio)

- Una unidad de masa, volumen, longitud o superficie lleva factor mayor que cero; las demás, ninguno.
- El artículo con vencimiento maneja lotes; la existencia mínima no es negativa; el peso por unidad es mayor que cero.
- Una conversión no repite unidad ni convierte la unidad base; solo una es «para compras».
- Un lote solo se registra en un artículo que maneja lotes, con vencimiento si lo maneja, y sin fabricación posterior a él.

## Permisos

| Permiso | Permite |
|---|---|
| `inventarios.unidades.*`, `.categorias.*`, `.articulos.*` | `ver`, `crear`, `editar` (inactivar y reactivar), `eliminar`, `importar` y `exportar` |

Las conversiones y los lotes cuelgan del artículo: se leen con `articulos.ver` y se cambian con `articulos.editar`.
El código propuesto pide `articulos.crear`. `GET /inventarios/articulos/conceptos-de-gasto` ofrece al formulario los conceptos del
Libro de compras con `articulos.ver`, para que quien registra artículos no necesite ver el libro.

## Configuración

Las ocho variables de `diseno-inventarios.md` §10.4 (`inventarios.costeo.metodo_inicial`, `.traslados.con_transito`,
`.ajustes.*`, `.conteos.bloquear_bodega`, `.vencimientos.dias_de_aviso` y `.codigos.prefijo`, la única pública), solo en
los niveles empresa e instalación. Las usan los pasos INV-4 en adelante; INV-1 solo lee el prefijo.

## Pantallas

Unidades, Categorías y Artículos (INV-1c).

## Eventos

Los del diseño §9, en pasos posteriores.
