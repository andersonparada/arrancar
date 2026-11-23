# Módulo `contabilidad` — se muestra como **Contabilidad**

Estado: **en construcción** (CT-1 hecho el 2026-11-23: esqueleto, inicio y nomenclatura en el servidor). El diseño completo
y los pasos están en `docs/modulos/diseno-contabilidad.md` (§15); este documento resume lo que ya existe.

## Propósito

Nomenclatura, partidas, períodos y libros contables por empresa, para empresas de cualquier rubro y régimen. Escucha a los
demás módulos (eventos y mediador); ninguno depende de él.

**Es de este módulo:** la nomenclatura (plan de cuentas) con su máscara, el inicio de la contabilidad y, en los pasos
siguientes, enlaces, partidas, períodos, libros y estados.
**No es de este módulo:** el auxiliar de cada módulo (Bancos, Cuentas por pagar…), que guarda su propio saldo y le
responde a Contabilidad por el mediador.

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Alcance | Por empresa (`empresa_id` y RLS); sin alcance por registro |
| Dependencias | `dependeDe: ['terceros']` (CT-P1) |
| Cuenta superior | Sale del código: el código sin su último grupo; el código no cambia al editar |
| Máscara | De 4 a 6 niveles de nueves (`9.9.99.99.999`), fija desde la primera cuenta |
| Baja | Se inactiva (`activo`, con auditoría) y se elimina solo sin cuentas inferiores (ni, en CT-2/CT-3, enlaces ni líneas) |

## Recursos

| Recurso | Pantalla | Baja |
|---|---|---|
| Inicio de la contabilidad (`inicio`) | Administración (CT-1c) | no se borra |
| Cuenta (`cuentas`) | Administración, con Excel (CT-1c) | inactivar; eliminar sin uso |

## Tablas (esquema `contabilidad`)

- `inicios` (una fila por empresa): fecha de inicio contable, caso (`desde_la_carga` o `posterior`), máscara, plantilla,
  firmantes (representante y contador con su registro).
- `cuentas`: árbol por empresa (`padre_id` con llave compuesta con la empresa, `nivel`), `es_de_detalle`, naturaleza, tipo,
  rubro (44 rubros), `corriente`, clase de flujo, monetaria, auxiliares, control, tratamiento fiscal y `activo`. El
  disparador `cuentas_hoja_de_detalle` impide cuentas inferiores bajo una de detalle.

## Reglas (las garantiza el dominio)

- El código cumple la máscara de la empresa y su cuenta superior existe, es de mayor y del mismo tipo.
- Una cuenta de detalle lleva rubro (y clase de flujo si es de balance); el rubro es del tipo de la cuenta; `corriente`
  solo en activo y pasivo; el tratamiento fiscal solo en resultados.
- La máscara no cambia mientras haya cuentas. La fecha de inicio se valida contra la carga inicial (por el mediador).

## Permisos

| Permiso | Permite |
|---|---|
| `contabilidad.inicio.ver` / `.editar` | Ver el inicio; iniciar la contabilidad y cambiar fecha, máscara y firmantes |
| `contabilidad.cuentas.ver` / `.crear` / `.editar` / `.eliminar` | Ver, registrar, editar (con inactivar y reactivar) y eliminar cuentas |
| `contabilidad.cuentas.importar` / `.exportar` | Excel de la nomenclatura (la plantilla del Excel pide `importar`) |

## Pantallas

Pendientes (CT-1c): Inicio de la contabilidad y Nomenclatura (árbol, ventana de edición y Excel).

## Eventos

Ninguno todavía. Contabilidad escuchará el aviso `core.eventos_registrados` (CT-4).
