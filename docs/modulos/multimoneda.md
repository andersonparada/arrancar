# Módulo `multimoneda` — se muestra como **Multimoneda**

Estado: **esqueleto programado (MM-5, 2026-11-18)**. El diseño completo y sus pasos están en
`docs/modulos/diseno-multimoneda.md`; este documento resume lo que ya existe.

## Propósito

Cuentas, facturas y pagos en dólares u otras monedas, con el tipo de cambio del Banco de Guatemala.

**Es de este módulo:** la orden `multimoneda.monedas_disponibles`, el reporte de tipos de cambio y, en sus pasos
siguientes, el diferencial cambiario y el cierre cambiario.
**No es de este módulo:** el catálogo de monedas, los tipos de cambio y su carga automática desde el Banguat: son del
núcleo (`core/monedas`) porque los usan todos los módulos aunque Multimoneda esté inactivo.

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Alcance | Sin tablas propias en esta etapa: lee las monedas y los tipos del núcleo (de toda la instalación, sin empresa) |
| Módulo inactivo | Ninguna pantalla ofrece otra moneda y los demás módulos, al preguntar `multimoneda.monedas_disponibles`, reciben `ModuloNoDisponible` y solo aceptan quetzales; lo ya registrado en otra moneda sigue funcionando |
| Monedas disponibles | Las activas del catálogo distintas de GTQ; sin lista por empresa en la versión 1 |

## Recursos

| Recurso | Pantalla | Baja |
|---|---|---|
| Reporte «Tipos de cambio» | Reportes (MM-6) | No aplica: es de lectura |

## Reglas (las garantiza el dominio)

- El reporte lleva siempre la leyenda «Fuente: Banco de Guatemala» (condición del servicio) y dice si cada tipo viene del
  Banguat o de un ingreso manual de soporte; nunca muestra el motivo ni el usuario de soporte.
- El rango del reporte es de máximo 366 días.

## Permisos

| Permiso | Permite |
|---|---|
| `multimoneda.tipos-de-cambio.ver` | Ver el reporte de tipos de cambio |
| `multimoneda.tipos-de-cambio.exportar` | Bajar el reporte a Excel (solo exporta: no hay plantilla ni importación) |

## Configuración

| Clave | Valores | Niveles |
|---|---|---|
| `multimoneda.diferencial.metodo` | `acumulativo` (por omisión) o `reversion` | instalación, empresa; pública |

## API

- `GET /api/multimoneda/tipos-de-cambio?moneda=&desde=&hasta=` y `…/exportar`.
- Orden del mediador `multimoneda.monedas_disponibles` (`core/contratos/multimoneda.contratos.ts`), sin ruta HTTP.

## Pantallas

Menú, reporte de tipos, `almacenes/monedas`, `CampoDeMoneda` y `TipoDeCambioDeLaOperacion`: paso MM-6.

## Eventos

Los del cierre cambiario (`multimoneda.cierre_cambiario_registrado` y `…_anulado`) llegan con MM-E.
