# Diseño: plazo de crédito del proveedor (fecha de pago estimada)

_Agente `arquitecto-de-datos`, 2026-11-18. Diseño corto pedido por `docs/HOJA-DE-RUTA.md`, «Plazo de crédito del
proveedor» (pedido del usuario del 2026-10-04). Estado: **propuesta**, pendiente de las preguntas del §8._

**Resumen:** casi todo ya está programado desde CP1 (2026-10-20 y 2026-11-01): los días de crédito **no** viven en
`terceros.proveedores` sino en `cuentas_por_pagar.condiciones_de_proveedor` (por cuenta), se editan en la sección «Cuentas
por pagar» del formulario de Proveedores y proponen el vencimiento al recibir cada cargo. La hoja de ruta está
desactualizada. Este diseño cierra el punto: corrige tres huecos chicos (el texto del plazo por omisión en el cliente,
cambiar el vencimiento de un cargo ya pagado y el rastro de ese cambio) y propone cómo llevar los plazos a Excel, que hoy
no los incluye.

## 1. Lo encontrado en el código

| Tema | Qué hay hoy | Dónde |
|---|---|---|
| Dónde se guarda | `cuentas_por_pagar.condiciones_de_proveedor`: `cuenta_id`, `proveedor_id` (FK compuesta a `terceros.proveedores (id, cuenta_id)`, cascade), `dias_de_credito smallint null` (check 0–365; `null` = plazo por omisión, `0` = contado), `contar_desde_la_recepcion boolean not null default false` (U14 b, migración `0002`). Único por `proveedor_id`; `politicaPorCuenta()`. Nunca se borra una fila | `infraestructura/persistencia/condiciones-de-proveedor.tablas.ts`, migraciones `0001`, `0002` |
| `terceros.proveedores` | **No** tiene el dato, y está bien así (decisión del usuario del 2026-09-29: en el esquema de Cuentas por pagar) | §3.3 y §5 de `diseno-datos-cuentas-por-pagar.md` |
| Cómo se edita | Sección aportada al formulario de Proveedores (`secciones['cuentas-por-pagar']`); el módulo escucha `terceros.proveedor_guardado` en la misma transacción y hace *upsert* (todo o nada). Permiso: el del formulario (`proveedores.crear` / `proveedores.editar`) | `composicion/condiciones.ts`, `http/condiciones.esquemas-http.ts` |
| Cómo se lee | `GET /api/cuentas-por-pagar/proveedores/:proveedorId/condiciones` (`terceros.ver`, módulo activo) | `http/condiciones.rutas.ts` |
| Plazo por omisión | Variable `cuentas-por-pagar.vencimientos.meses_por_omision` (entero 0–12, predeterminado 1, niveles instalación y empresa, no pública) | `configuracion.ts`, `dominio/plazo-por-omision.ts` |
| CP1, al recibir | `RecibirDocumento.vencimientoPara`: fecha base = emisión (o recepción si el proveedor lo pactó, nunca antes de la emisión) + días del proveedor; sin días, + meses por omisión (mes calendario, 31-ene → 28/29-feb). Solo cargos; una nota de crédito no vence | `aplicacion/casos-uso/recibir-documento.ts`, `dominio/propuesta-de-vencimiento.ts` |
| Bandeja (completar) | El documento llega `pendiente` con el vencimiento propuesto; al completar se confirma o se cambia | `completar-documentos.ts` |
| Cambiar por documento | `CambiarVencimiento` con `cuentas-por-pagar.documentos.registrar`, solo cargos `registrado` o `autorizado`, nunca antes de la emisión. **No** revisa si el cargo ya está pagado del todo (el diseño de CP1 §5 lo pedía) y **no** deja rastro aparte de `actualizado_por` | `aplicacion/casos-uso/acciones/cambiar-vencimiento.ts`, `dominio/ciclo-de-vida.ts` |
| U8, saldos iniciales | Un cargo sin vencimiento recibe la misma propuesta, contada **siempre** desde la emisión (no hay recepción) | `saldos-iniciales/preparador-de-saldo-inicial.ts` |
| CP5 y R5 (antigüedad) | Leen el `vencimiento` guardado (`corte − vencimiento = dias_vencido`); nunca recalculan con los días del proveedor | `saldos-al-corte.sql.ts`, `documentos-al-corte.drizzle.ts`, `consultas-de-saldos.drizzle.ts` |
| Recalcular lo ya recibido | Nada lo hace: guardar las condiciones solo toca su fila | `guardar-condiciones-de-proveedor.ts` |
| Retenciones | Libro de compras fecha sus retenciones con la recepción (p. ej. `estrategias-de-retencion-de-iva.ts`) y no lee nada de Cuentas por pagar: el plazo **no** fecha nada fiscal | `libro-de-compras/dominio/` |
| Cliente | Sección «Cuentas por pagar» en el formulario (días con la ayuda «vacío = un mes; 0 es de contado» y el interruptor «Contar el plazo desde la recepción») y en la ficha (plazo en palabras, por pagar, vencido). `textoDelPlazo` escribe **siempre** «Un mes … (plazo por omisión)» aunque la empresa haya puesto 0 o 2 meses | `cliente/src/modulos/cuentas-por-pagar/composables/condiciones-de-pago.ts`, `modulo.ts` (comentario «Los días de crédito se editan dentro de Proveedores») |
| Excel de proveedores | En la rama `worktree-wf_f6224bdf-ffe-1` (commits `93d697ed`, `c009ea4a`, `f8744100`), **aún no en `main`**: `terceros` importa (solo crea) y exporta proveedores «sin contactos ni secciones de otros módulos». Los días de crédito no van | `terceros/composicion/intercambios.ts`, `terceros/http/terceros.columnas.ts` (en esa rama) |
| Pendiente aparte | U14 a (vencimiento desde los abonos de la FCAM) sigue pendiente: los abonos no llegan en `DocumentoParaDestino`. Fuera de este diseño | `docs/PLAN.md`, 2026-10-20 |
| Datos de desarrollo | `condiciones_de_proveedor` tiene 0 filas (consulta de solo lectura del 2026-11-18) | |

## 2. Lo que se mantiene (ya decidido, no se vuelve a preguntar)

- Plazo **por cuenta** (U3), en el esquema de Cuentas por pagar, editado con el formulario de Proveedores.
- Fecha base: emisión; por proveedor, «contar desde la recepción» (U1, U14 b).
- Sin días: un mes calendario, ajustable por empresa con `meses_por_omision` (U1). «Un mes como máximo» del pedido del
  2026-10-04 es este valor (ver P3 si se quiere leer literal).
- El vencimiento se calcula **una vez, al recibir**, y queda guardado; se puede cambiar por documento. Cambiar el plazo
  del proveedor **no recalcula** documentos ya recibidos (ni pendientes, ni registrados, ni saldos iniciales).
- Los reportes de antigüedad (CP5, R5) usan el vencimiento guardado, nunca el plazo vigente del proveedor.
- El plazo **no** fecha las retenciones (el 5 % a pequeño contribuyente y demás llevan la fecha de recepción).
- Sirve a cualquier rubro y régimen: no depende del régimen del proveedor ni de que la empresa sea agente de retención.

## 3. Datos

**Sin tablas nuevas ni columnas nuevas.** `condiciones_de_proveedor` ya tiene todo.

- Si se aprueba P1 (b), «plazo por empresa», haría falta `cuentas_por_pagar.condiciones_por_empresa` (`empresa_id`,
  `proveedor_id`, `dias_de_credito`, `contar_desde_la_recepcion`, único `(empresa_id, proveedor_id)`, FK compuesta al
  proveedor de la cuenta, `politicaPorEmpresa()`); no se recomienda.
- **Migración de permisos** (solo si se aprueba el Excel de P4 (a)): `cuentas-por-pagar.condiciones.importar` a quien
  tenga `proveedores.editar` **y** `terceros.editar` (mismo criterio que la `0008` de Terceros), y
  `cuentas-por-pagar.condiciones.exportar` a quien tenga `terceros.ver`; en `core.rol_permisos` **y**
  `core.usuario_permisos`. Migración `--custom` de Cuentas por pagar, después de la última aplicada (`0012`); el orden
  real se fija al integrar.
- **Auditoría** (P2): si se aprueba, cambiar el vencimiento registra `auditoria.registrar` con acción
  `cambiar_vencimiento`, recurso `cuentas-por-pagar.documentos` y el DTO de antes (más el vencimiento nuevo en
  `detalles`). No pide tablas: `core.auditoria` ya existe y no se borra.

## 4. Reglas

1. **R1. Propuesta al recibir:** sin cambios (§1).
2. **R2. Cambiar el vencimiento de un cargo:** además de lo de hoy, se rechaza si el cargo **ya no tiene saldo**
   (pagado del todo o compensado): error nuevo `VencimientoDeCargoSaldado` (`ReglaDeNegocioInfringida`, código
   `vencimiento_de_cargo_saldado`). Motivo: el vencimiento de lo pagado alimenta la antigüedad a una fecha pasada (R5 al
   corte) y cambiarlo reescribe reportes ya entregados. La revisión va en el caso de uso, con la fila bloqueada y el saldo
   calculado en la misma transacción; `puedeCambiarVencimiento` lo refleja para la pantalla.
3. **R3. Rastro del cambio** (P2): cada cambio queda en la auditoría con el antes y el después.
4. **R4. Cambiar el plazo del proveedor** solo vale para lo que se reciba desde ese momento. La sección del formulario lo
   dice en su ayuda («Vale para los documentos que se reciban desde ahora; los ya recibidos conservan su vencimiento»).
5. **R5. Texto del plazo por omisión:** el cliente muestra el plazo por omisión **real** de la empresa activa («Un mes»,
   «De contado», «2 meses»), no un «un mes» fijo.

## 5. API

| Ruta | Cambio |
|---|---|
| `GET /api/cuentas-por-pagar/proveedores/:proveedorId/condiciones` | Suma `mesesPorOmision` (de la empresa activa) a la respuesta, para R5. Se prefiere a volver pública la variable: es un dato de Cuentas por pagar que solo usa esta sección |
| `PATCH /api/cuentas-por-pagar/documentos/:documentoId` (cambiar vencimiento, la de hoy) | R2 y R3; respuesta igual |
| P4 (a): `GET /api/cuentas-por-pagar/condiciones` | Lista paginada de proveedores de la cuenta con su plazo (filtro por nombre o NIT y «solo con plazo propio»); permiso `terceros.ver` |
| P4 (a): `GET …/condiciones/exportar`, `GET …/condiciones/plantilla`, `POST …/condiciones/importar?ensayo=` | `rutasDeIntercambio`; permisos `cuentas-por-pagar.condiciones.exportar` / `.importar` |

**Excel de P4 (a)**, «Plazos de proveedores» (sección **administración**: importa y exporta):

| Columna | Tipo | Regla |
|---|---|---|
| NIT | texto | Identifica al proveedor (P5). Requerido salvo que el proveedor no tenga NIT |
| Proveedor | texto | Nombre; al importar solo se usa si no hay NIT y es único en la cuenta |
| Días de crédito | número | Entero 0–365; **vacío = plazo por omisión** (como en el formulario) |
| Contar desde la recepción | siNo | Vacío = No |

Cada fila pasa por `GuardarCondicionesDeProveedor` (el mismo caso de uso del formulario, *upsert*): importar **actualiza**
plazos de proveedores existentes, nunca crea proveedores. Todo o nada, máximo 5,000 filas, ensayo, problemas por fila y
columna; NIT repetido en el archivo es error de fila. Sin auditoría (es un dato de configuración, no una baja), como el
formulario.

## 6. Cliente

- `textoDelPlazo` recibe los meses por omisión (R5) y sus pruebas cubren 0, 1 y 2 meses.
- Ayuda de R4 en `SeccionCondicionesDePago.vue`.
- `puedeCambiarVencimiento` en falso para cargos saldados (viene del servidor); el error `vencimiento_de_cargo_saldado`
  se muestra con `usarAvisos().error`.
- P4 (a): página «Plazos de proveedores» en **administración** del menú de Cuentas por pagar (permiso `terceros.ver`),
  generada como recurso de catálogo (lista y ventana con los dos campos de la sección), con `AccionesDeIntercambio` y
  `VentanaDeImportacion`. Editar desde la ventana usa el mismo caso de uso y exige `proveedores.editar`.

## 7. Pasos (un commit cada uno)

1. **PC-1 (servidor, reglas):** R2 (`VencimientoDeCargoSaldado`, `puedeCambiarVencimiento` con el saldo) y R3 (auditoría
   del cambio, si P2). Pruebas: dominio de `acciones-posibles` y `ciclo-de-vida`; integración de `CambiarVencimiento`
   (cargo con saldo, pagado del todo, compensado con nota, auditoría con antes y después).
2. **PC-2 (servidor, plazo por omisión):** `mesesPorOmision` en la lectura de condiciones. Pruebas de API con la
   variable de empresa en 0, 1 y 2. Prueba de regresión: cambiar los días de un proveedor no cambia el vencimiento de sus
   documentos ya recibidos ni la fecha de sus retenciones en Libro de compras.
3. **PC-3 (cliente):** R4, R5 y el botón de cambiar vencimiento según `puedeCambiarVencimiento`. Pruebas
   `condiciones-de-pago.prueba.ts`.
4. **PC-4 (servidor, Excel; solo si P4 (a) y después de integrar el Excel de Terceros):** permisos en `permisos.ts`,
   migración de permisos, lista, columnas (`condiciones.columnas.ts`), validación con Zod (el esquema de la sección) y
   `rutasDeIntercambio`. Pruebas de API: exportar, plantilla, importar con ensayo, NIT inexistente, NIT repetido, vacío
   vuelve al plazo por omisión, todo o nada, permiso.
5. **PC-5 (cliente, Excel):** página «Plazos de proveedores» con `AccionesDeIntercambio`. Pruebas de la lógica pura.
6. **PC-6 (QA y documentos):** de punta a punta (proveedor con 15 días, sin días con la empresa en 0 meses, cambio de
   plazo con documentos ya recibidos, cambiar vencimiento de un cargo pagado, Excel); HOJA-DE-RUTA («Hoy
   `terceros.proveedores` no tiene ese dato» se corrige) y bitácora de `docs/PLAN.md`.

## 8. Preguntas para el usuario

- **P1. Plazo por cuenta o por empresa.** El proveedor es de la cuenta y las deudas, de cada empresa.
  (a) **Por cuenta, como hoy** (U3): un plazo para todas las empresas; si una pactó otro, se cambia el vencimiento por
  documento. (b) Por cuenta con excepción por empresa (tabla nueva del §3; el formulario mostraría el de la cuenta y el de
  la empresa activa). (c) Solo por empresa.
  **Recomendación: (a).** Ya está programado y aprobado; (b) confunde en un formulario de cuenta y cuesta una tabla, una
  sección más y reglas de cuál manda. Si un cliente real lo pide, (b) se agrega sin romper (a).
- **P2. Rastro al cambiar el vencimiento de un documento.** (a) Como hoy: solo `actualizado_por`. (b) **Auditoría con
  el antes y el después**, sin motivo. (c) Auditoría con motivo obligatorio.
  **Recomendación: (b).** El vencimiento decide qué sale vencido en los reportes al corte y en qué orden se paga; un
  auditor preguntará quién lo movió. Pedir motivo cada vez estorba en la bandeja, donde se cambia a menudo.
- **P3. «Un mes como máximo».** Hoy, sin días del proveedor, se propone un mes, y la empresa puede poner de 0 a 12.
  (a) **Dejarlo así** (U1 ya aprobó «ajustable por empresa»). (b) Leerlo literal: la variable solo admite 0 o 1.
  (c) Además, que ningún vencimiento pase de un mes sin días del proveedor (rechazar al cambiar por documento).
  **Recomendación: (a).** Lo aprobado cubre el caso normal (un mes) y deja contado o un plazo mayor a la empresa que lo
  necesite; (c) chocaría con los acuerdos que se cambian por documento.
- **P4. Excel de los plazos.** El Excel de Proveedores de Terceros solo **crea** y no lleva secciones de otros módulos.
  (a) **Excel propio en Cuentas por pagar**, «Plazos de proveedores» (administración), que exporta todos los proveedores
  con su plazo e importa **actualizando** el plazo de los existentes. (b) Columnas aportadas por los módulos al Excel de
  Terceros (cambio en `core/intercambio` y en Terceros; solo servirían al crear proveedores nuevos). (c) Sin Excel: se
  edita en el formulario.
  **Recomendación: (a).** El caso real es poner el plazo a muchos proveedores que ya existen, y eso (b) no lo resuelve;
  (a) queda dentro de Cuentas por pagar, sin tocar el core ni Terceros, y cumple «administración importa y exporta».
- **P5. Cómo se identifica al proveedor en ese Excel.** (a) **Por NIT; si no tiene NIT, por nombre exacto y único en la
  cuenta** (si se repite, error de fila). (b) Solo por NIT (los proveedores sin NIT se editan en el formulario).
  (c) Por nombre, como las demás referencias del Excel.
  **Recomendación: (a).** El NIT es único y es lo que el usuario tiene en sus listas; el nombre cubre a los pocos sin NIT
  sin arriesgar que dos «Agroservicio» se confundan.
- **P6. Documentos pendientes al cambiar el plazo.** Un documento en la bandeja (`pendiente`) trae un vencimiento
  propuesto que nadie confirmó todavía. (a) **No recalcular nada**, con la ayuda de R4 (lo pedido: lo ya recibido no se
  recalcula). (b) Recalcular solo los pendientes de ese proveedor al guardar el plazo.
  **Recomendación: (a).** Es predecible y el usuario revisa el vencimiento al completar; (b) cambia documentos de todas
  las empresas de la cuenta desde un formulario de cuenta, sin que lo vean.

## Respuestas del usuario (2026-11-18)

Todas las recomendaciones: **P1** (a) por cuenta, como hoy; **P2** (b) auditoría del cambio de vencimiento con el antes y
el después, sin motivo obligatorio (y se rechaza cambiarlo en un cargo pagado); **P3** (a) de 0 a 12 meses por empresa;
**P4** (a) Excel propio «Plazos de proveedores» en Administración de Cuentas por pagar; **P5** (a) por NIT y, sin NIT, por
nombre exacto y único en la cuenta; **P6** (a) no se recalcula nada y la sección lo avisa.
