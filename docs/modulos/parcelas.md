# Módulo `parcelas` — se muestra como **Parcelas**

Estado: **PA-1 programado (2026-11-23)**: esqueleto, configuración, tipos de parcela, parcelas, mediciones y ligas con
inmuebles. El diseño completo, los pasos y sus pendientes están en `docs/modulos/diseno-parcelas.md`.

## Propósito

Fincas, potreros y lotes: superficie, uso y tenencia. Es un **módulo de rubro** (`dependeDe: ['terceros']`): no calcula
impuestos ni supone régimen fiscal.

**Es de este módulo:** las parcelas en árbol bajo una localidad, su superficie (con la cifra original y la unidad en
que se midió), el punto en el mapa y las colindancias, y la liga con los inmuebles registrales de Empresas.
**No es de este módulo:** el inmueble registral y sus valores (Empresas), el costo del terreno (Activos fijos), los
ciclos y cosechas (Cultivos) y la carga animal (Ganadería).

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Alcance | Por empresa, con el alcance por localidad de `empresas.localidades` (`politicaPorAlcance` en `parcelas`) |
| Superficie | Se guarda en m² (`numeric(14,2)`); en el código, en centésimas de m² enteras (`dominio/superficie.ts`, con `BigInt`) |
| Caballería | 645,816 varas² (64.5816 manzanas), en la misma base que la manzana (PA-23, opción a) |
| Árbol | Hasta 3 niveles (configurable de 1 a 5); la madre es de la misma localidad por llave compuesta; no se cambia la madre ni la localidad |

## Recursos

| Recurso | Pantalla | Baja |
|---|---|---|
| Tipos de parcela | Catálogo (generado) | Inactivar o eliminar si no están en uso |
| Parcelas | Árbol, formulario y ficha (PA-1c) | Inactivar (sin hijas activas) o eliminar (sin hijas ni mediciones vigentes) |
| Mediciones | Dentro de la ficha | Anular (queda como rastro) |

## Tablas (esquema `parcelas`)

`tipos_de_parcela`, `parcelas`, `mediciones` y `parcelas_de_inmuebles` (migración `0000_pa1_parcelas`, que también
registra `parcelas.contratos` como auditoría permanente). Usos, contratos y cuotas llegan en PA-2 a PA-4.

## Reglas (las garantiza el dominio)

- Código en mayúsculas, único en la empresa; nombre único por localidad (sin importar mayúsculas ni tildes).
- La superficie útil no pasa de la total; la cuerda necesita sus varas por lado y las otras unidades no las llevan.
- La superficie de la parcela es la de la medición vigente más reciente; anular una medición la recalcula.
- El punto en el mapa lleva latitud y longitud juntas; fuera de Guatemala solo se avisa.

## Permisos

`parcelas.tipos-de-parcela.*`, `parcelas.parcelas.*` (ver, crear, editar, eliminar, importar, exportar) y
`parcelas.mediciones.crear` y `.anular`. Contratos, rentas y reportes llegan con sus pasos.

## Pantallas

El catálogo de tipos de parcela (generado). Árbol, formulario con calculadora de superficie y ficha: paso PA-1c.

## Eventos

Ninguno todavía (los de §9.2 del diseño llegan con sus pasos). Por el mediador: la orden
`parcelas.obtener_parcela_en_fecha` y los avisos `parcelas.parcela_por_inactivar` y `parcelas.parcela_por_eliminar`
(`core/contratos/parcelas.contratos.ts`).
