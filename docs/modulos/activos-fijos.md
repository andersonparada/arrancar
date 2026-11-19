# Módulo `activos-fijos` — se muestra como **Activos fijos**

Estado: **en programación** (AF-1 hecho en el servidor el 2026-11-19). El diseño aprobado y sus pasos están en
`docs/modulos/diseno-activos-fijos.md`; este documento resume lo que ya existe.

## Propósito

Control, capitalización y depreciación contable y fiscal de los bienes de la empresa.

**Es de este módulo:** las clases de activos, los activos, sus costos, mejoras, traslados, bajas y ventas, los cierres de
depreciación y el inventario físico (los pasos siguientes del diseño).
**No es de este módulo:** la compra (Libro de compras), el pago (Bancos, Cuentas por pagar) ni la contabilidad.

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Alcance | Por empresa: `empresa_id` y RLS solo por empresa; sin alcance por localidad (AF-P2 a) |
| Dependencia | Solo `libro-de-compras` (AF-P1 a) |
| Clases | Inciso del art. 28 del ISR, porcentaje fiscal con tope de ley en la configuración de la instalación, vida útil y valor residual por omisión |
| Semilla | 14 clases al abrir el catálogo vacío; el tope de la instalación recorta la sugerida |

## Recursos

| Recurso | Pantalla | Baja |
|---|---|---|
| Clase | Clases de activos (AF-1c) | Inactivar; eliminar solo sin conceptos ni activos |

## Tablas (esquema `activos_fijos`)

- `clases`: único `(empresa_id, nombre normalizado)`, `check` de inciso, porcentaje, terrenos, vida útil y residual.
- `clases_por_concepto`: la clase que la bandeja propone para cada concepto de gasto (PK `(empresa_id, concepto_de_gasto_id)`).

## Reglas (las garantiza el dominio)

- El porcentaje fiscal no pasa del máximo del inciso (`activos-fijos.isr.maximo.<inciso>`).
- Los terrenos llevan porcentaje 0 y sin vida útil; los demás incisos, más de 0.
- Cambiar el porcentaje o la vida de una clase no cambia a los activos que ya tiene.

## Permisos

| Permiso | Permite |
|---|---|
| `activos-fijos.clases.ver` | Ver las clases y sus conceptos de gasto |
| `activos-fijos.clases.crear` | Registrar clases |
| `activos-fijos.clases.editar` | Editar, inactivar y reactivar clases y fijar sus conceptos de gasto |
| `activos-fijos.clases.eliminar` | Eliminar clases sin activos ni conceptos ligados |
| `activos-fijos.clases.importar` / `.exportar` | Excel de clases |

## Pantallas

Pendientes (AF-1c).

## Eventos

Los de la futura Contabilidad (diseño §9), en pasos posteriores.
