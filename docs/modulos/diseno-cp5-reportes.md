# Diseño CP5: reportes de Cuentas por pagar — arquitecto de datos, 2026-11-15

Estado: **aprobado, listo para programar** (2026-11-15). El usuario aceptó CP5-a a CP5-i como se recomiendan (§12) y
**todos** los «Cambios que el diseño debe recibir» del dictamen del contador (`dictamen-cp5-2026-11-15.md`, «correcto con
ajustes»), con tres precisiones: R1 **agrupa por NIT**; R3 tiene una versión **para el proveedor** con la retención como
**abono**; y, cuando exista Contabilidad, la factura se provisiona **al registrarla**, no al autorizarla (corrige
«autorizar = provisionar» de `cuentas-por-pagar.md`). Este documento ya trae todo aplicado (tabla de abajo); lo que
cambia en CP4 está escrito en `diseno-cp4-pagos.md` (§5.9 y pasos) y en la adenda de efectivo (§4.4, §4.6 y pasos).

**Decidido el 2026-11-15 (aprobación, con el dictamen del contador):**

| Tema | Decisión | Dónde |
|---|---|---|
| Anulaciones al corte | **B**: `pagos`, `reintegros` y `retiros_de_efectivo` guardan `fecha_de_anulacion` (fecha contable); migración `0011` de Cuentas por pagar **antes de CP4-4**; la llenan CP4-4, CP4-7, CP4-E2 y CP4-E3 | CP5-a, §2.3, §3.1, §11 |
| Fecha de efecto | **Emisión**; los documentos del libro emitidos antes de la fecha de inicio cuentan **desde la fecha de inicio**; aviso de documentos registrados después del corte | CP5-b, dictamen 1, §2.2 |
| Posfechado cobrado antes de su fecha | Cuenta desde el **fin del mes de la conciliación autorizada** que lo marcó, si es antes de su fecha; si no se puede saber, leyenda | Dictamen 5 y cambio 2, §2.1 |
| Sin autorizar | Entran al saldo, con columna y filtro | CP5-c, dictamen 4 |
| Provisión en Contabilidad | **Al registrar** el documento (ingreso en Libro de compras, ya en la bandeja), con la fecha de efecto; autorizar es solo «aprobado para pago» (U12 del 2026-10-20). Con «Retenciones por pagar» en la misma partida | Usuario; dictamen 2 y O-1; §10.7 |
| R1 | **Neto por NIT** (fichas como subrenglones, aviso de NIT repetido); % por tramo **sobre el total de cargos**; conciliación con R11 al pie | Usuario; dictamen 3 y 8 |
| R3 | Dos presentaciones: **interna** (total, retenciones y neto en una línea) y **para el proveedor** (cargo por el total y abono por la retención con su constancia, misma fecha) | Usuario; dictamen 2 y cambio 4 |
| R4 | «**Posible prescripción desde**» = último movimiento + 5 años (Código Civil art. 1508), columna «Último movimiento», leyendas | Dictamen 7 y cambio 5 |
| R6 | Columna «**Registró el documento**» | Dictamen O-9 y cambio 9 |
| R8 | Sección 5: **documentos anulados o desautorizados en el mes** | CP5-e, dictamen 9 |
| R9 | Criterio **por cargo** de Q30,000 o más pagado en parte en efectivo; **IVA completo** del cargo; **costo no deducible**; máximo **48 meses** | Dictamen 10 y cambio 7 |
| R12 | En Libro de compras (CP5-f = A); columna «**Plazo de la constancia**» (ISR); enlace a la vista de **retenciones por practicar** de saldos iniciales (R2) | CP5-f, dictamen 11 y cambio 8 |
| Permisos | Por audiencia (CP5-d) | §5 |
| Leyendas | NIIF para las Pymes citada **por sección** (la 3.ª edición rige desde 2027); umbral de bancarización con «verifique el vigente» | Dictamen O-10 y cambio 11 |
| CP5-e, g, h, i | Como se recomendaron (ajustes con secciones 3 a 5, R2 con vistas, impresión hasta 2,000 filas, R7 propio) | §12 |

Aterriza el paso **CP5** de `cuentas-por-pagar.md` («Reportes: antigüedad de saldos, estado de cuenta del proveedor,
facturas por vencer, pagos realizados») con todo lo que le dejaron anotado los diseños y dictámenes anteriores
(búsqueda «CP5» en `docs/modulos/`, verificada el 2026-11-15) y los nombres de reportes de `HOJA-DE-RUTA.md`
(«Reportes (imprimir y exportar)»). Va en la sección **Reportes** del menú: se imprime y se exporta, **no** se importa.

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Antigüedad | Por **«Vence»** (`documentos.vencimiento`); la fecha prometida de la contraseña **no** cambia «Vence» ni la antigüedad | Dictamen C-CP3-5; `diseno-cp3-contrasenas.md` §9.6 |
| Tramos | Al día, 1–30, 31–60, 61–90, más de 90 | `cuentas-por-pagar.md`, Pantallas |
| Saldo neto por proveedor | A una **fecha de corte**, **separado en acreedores y deudores**; nunca se netea un proveedor con otro; de ahí sale la partida de reclasificación de cierre (reversible) | Dictamen C-CP2-4; `diseno-cp2-notas-de-credito.md` §9.5 |
| Saldos iniciales | El estado de cuenta (y la ficha) muestran la línea derivada **«Pagos y notas anteriores a la fecha de inicio»** = neto − `saldo_al_inicio` (sin guardarla) | U8 §2, consecuencia 4; dictamen U8 cambio 8 |
| Cheque posfechado | Un reporte a una fecha de corte usa `pagos.fecha <= corte`: un posfechado **no** rebaja el pasivo antes de su fecha | `diseno-cp4-pagos.md` §2.4 (C-CP4-1) |
| Ajustes | **Reporte mensual de ajustes** para que lo revise el contador, en vez de una segunda aprobación | CP2-f; dictamen CP2-CP3 cambio 8 |
| Pago prometido vencido | Reporte de contraseñas **vigentes, con saldo y fecha prometida antes de hoy**, con «Vence» y «Pago prometido» lado a lado | CP3 §9.6; dictamen C-CP3-5 |
| Facturas sin contraseña | «Facturas autorizadas sin contraseña» (filtro `sinContrasena`, ya existe en la lista) | CP3 §9.6; hoja de ruta |
| Saldos a favor | Con **antigüedad**: el saldo a favor prescribe (Código Civil art. 1508, 5 años; el contador confirma si hay uno mercantil más corto) | Dictamen CP2-CP3, otros 13 |
| Constancias pendientes | Reporte de **constancias pendientes de todos los meses**, con su **plazo de entero** (además del filtro por mes de Libro de compras → Retenciones) | P-CP4-2 (usuario, 2026-11-14); dictamen CP4 cambio 2 |
| Bancarización | Reporte **«Pagos en efectivo sobre el umbral»** calculado **en vivo** por mes y proveedor, con la marca **«crédito fiscal en riesgo por bancarización»** en cada factura con efecto de IVA y la leyenda E-6. Arrancar **no** rectifica ni toca el Libro de compras | Adenda de efectivo §5.5, P-CPE-3; dictamen de efectivo cambio 5 |
| Retiros por liquidar | Con **fecha de corte** (efectivo en manos de custodios al cierre), imprimible y exportable | Adenda §4.5 (E-7), P-CPE-3 |
| Pagos realizados | Muestran **quién autorizó y quién pagó** (control de separación de funciones) | CP4-j |
| Notas marcadas sin aplicar | Son de CP5 (la versión imprimible; el desmarque al cierre vive en la conciliación, CP4-B2b) | `diseno-cp4-pagos.md` §8 |
| Saldos | **Calculados**, no guardados | U4 |
| Excel | Reportes: **imprimir y exportar**, nunca importar | CLAUDE.md, regla de secciones |
| Todo régimen | Nada supone rubro, régimen ni que la empresa sea agente de retención: sin retenciones, esas columnas salen en cero | CLAUDE.md |

## 1. Lo encontrado en el código y la base (verificado contra `main`, `a186bb8`, el 2026-11-15)

1. **Tablas de Cuentas por pagar** (migraciones `0000` a `0010`): `documentos` (cargos y notas de crédito, del libro o
   saldo inicial; `fecha_emision`, `vencimiento`, `total`, `retenciones`, `saldo_al_inicio`,
   `retenciones_por_practicar`, `estado` `pendiente|registrado|autorizado|anulado`, `autorizado_en/por`, `anulado_en`),
   `aplicaciones_de_notas` (con `fecha` y `forma` `automatica|manual|contrasena`; **se borran** al quitarlas o al anular
   la contraseña: el rastro queda solo en la auditoría), `ajustes_de_saldo` (`fecha`, `causa`, `estado`, `anulado_en`,
   `pago_id` en las diferencias menores), `contrasenas` (`fecha_de_pago`), `contrasena_documentos`, `pagos` (`forma`
   `cheque|nota_de_debito|nota_ligada|cuenta_de_apertura|efectivo`, `fecha`, `estado`, `anulado_en`, `retiro_id`,
   `motivo_sin_bancarizar`), `aplicaciones_de_pagos` (`monto`, `retencion_descontada`, `vigente`), `reintegros` y
   `aplicaciones_de_reintegros`, `retiros_de_efectivo` (`fecha_de_liquidacion`, `devuelto`, `faltante`) y
   `condiciones_de_proveedor` (por cuenta). Todas con `politicaPorEmpresa()` salvo la última (`politicaPorCuenta()`).
2. **Ninguna fila guarda la fecha contable de una anulación.** `pagos`, `reintegros`, `retiros_de_efectivo`, `ajustes` y
   `documentos` guardan `anulado_en` (`timestamptz`, el momento del clic). La fecha del inverso de un pago con cheque o
   nota vive en Bancos (`movimientos.revertido_en` y el movimiento inverso con su `fecha`; `anulado_en` en Bancos es la
   anulación «a la antigua», sin inverso). `AnularPago` (CP4-4), `AnularReintegro` (CP4-7) y `AnularRetiro` (CP4-E2)
   **todavía no están programados**. **Verificado el 2026-11-15 contra `main` (`826a308`):** CP4-3 ya está (sin
   migración); la última migración de Cuentas por pagar es la `0010_cp4_pagos_en_efectivo` y **ninguna rama** tiene una
   `0011`; la de Libro de compras es la `0035_u8l_facturas_anteriores`.
   La orden `bancos.anular_movimiento_de_origen` responde `{ forma, inversoId }` (**sin la fecha del inverso**, que Bancos
   puede cambiar por la variable `bancos.anulaciones.misma_fecha`); el aviso `bancos.movimiento_por_cambiar` sí trae
   `formaDeAnulacion` y `fecha` (la del inverso con `con_inverso`; nula con `sin_inverso`).
3. **Fórmulas de saldo** (`dominio/saldos.ts` y `ConsultaBaseDeDocumentos.saldoDelCargo` / `saldoLibreDeLaNota`):
   cargo = `coalesce(saldo_al_inicio, total − retenciones)` − aplicaciones de notas − pagos vigentes (también los
   posfechados) − ajustes vigentes; nota = `coalesce(saldo_al_inicio, total)` − aplicaciones − ajustes − reintegros.
   Son **saldos de hoy**: ninguna subconsulta filtra por fecha, y lo posfechado ya resta (comprometido). `pagos.ts`
   separa `pagado` y `comprometido` con «hoy» (`estaPosfechado`).
4. **`ConsultaBaseDeDocumentos`** agrupa **toda** la tabla en cada subconsulta (`group by cargo_id` sin filtro) y une
   nueve subconsultas con `count(*) over ()`. Sirve a la lista (página de 25–100) y tiene su prueba de rendimiento
   (`cuentas-por-pagar-pagos-rendimiento.api.prueba.ts`: 20,000 documentos y 30,000 pagos, tope 1.5 s). Hay una
   investigación abierta por lentitud en una base de pruebas reutilizada (`DONDE-QUEDAMOS.md`). **CP5 no la reutiliza**
   (§9).
5. **Índices que ya sirven:** `documentos_estado_idx (empresa_id, estado, fecha_emision)`,
   `documentos_proveedor_vencimiento_idx (empresa_id, proveedor_id, vencimiento) where estado <> 'anulado'` (pensado
   para CP5), `documentos_vencimiento_idx`, `pagos_lista_idx (empresa_id, estado, fecha)`,
   `pagos_proveedor_fecha_idx (proveedor_id, fecha)`, `contrasenas_pago_idx (empresa_id, fecha_de_pago) where vigente`,
   `retiros_lista_idx`, `reintegros_lista_idx`. **Faltan** índices que empiecen por `empresa_id` en
   `aplicaciones_de_notas`, `ajustes_de_saldo`, `aplicaciones_de_pagos` y `aplicaciones_de_reintegros`: hoy toda suma
   por empresa recorre las filas de **todas** las empresas y RLS las descarta después (CP2 ya dejó anotado el de
   `ajustes`, §3.2 de su diseño).
6. **Libro de compras:** `retenciones` (`monto`, `fecha`, `constancia_numero`, `constancia_fecha`, `resolucion`; índice
   `retenciones_mes_idx (empresa_id, fecha)`), `enteros_de_retenciones` (por mes y grupo) y el **plazo de entero** en su
   dominio (`plazoDelGrupo`, con días hábiles por variable `libro-de-compras.plazos.dias_habiles_entero_iva|isr` y el
   calendario de feriados). El reporte de retenciones del mes (`consultar-retenciones-del-mes.ts`) ya filtra
   «con/sin constancia» por mes. `documentos` del libro guarda `fecha_recepcion`, `periodo`, `iva`,
   `iva_no_acreditable` y `regimen_iva_de_la_empresa`; `datos_fiscales_de_empresa` tiene `regimen_isr` por vigencia.
7. **Efecto fiscal por régimen** (adenda de efectivo §5.2): se programa en **CP4-E3** (puerto `DatosFiscalesDeLaEmpresa`);
   no existe todavía. El reporte de bancarización lo reutiliza, no lo reescribe.
8. **Reportes de Bancos (la forma a copiar):** caso de uso `Reporte…` en `aplicacion/casos-uso/`, columnas
   `http/<reporte>.columnas.ts` con `aFilasExportadas…` (filas planas; los totales y las notas como filas con
   «Sección», como `flujo-de-efectivo.columnas.ts`), `crearIntercambio` con `validar` vacío y `crear` que lanza, y
   `rutasDeIntercambio` solo con `exportar` y el `filtro` Zod. Permisos **por reporte**
   (`bancos.flujo-de-efectivo.ver/.exportar`, `bancos.intereses.*`, `bancos.cheques-caducos.*`). En el cliente, página
   `Reporte…vue` con `EncabezadoPagina`, `AccionesDeIntercambio`, botón «Imprimir» (`window.print()`), una
   `TarjetaBase` solo para impresión (`hidden print:block`) con empresa y filtros, y los filtros con `print:hidden`.
   Libro de compras ya usa `seccion: 'reportes'` en su menú.
9. **El motor de Excel** (`core/intercambio`): `exportar` no tiene tope de filas (el de 5,000 es de importar); el
   nombre del archivo es `<archivo>-<fecha de hoy>.xlsx`.
10. **Permisos de Cuentas por pagar hoy:** `documentos.*`, `ajustes.*`, `saldos-iniciales.*`, `contrasenas.*` (los de
    `pagos.*`, `reintegros.*` y `retiros.*` llegan con CP4). `cuentas-por-pagar.md` proponía
    `cuentas-por-pagar.reportes.ver/.exportar`; `diseno-datos-cuentas-por-pagar.md` dejó abierto «o uno por reporte».

## 2. Modelo: el saldo a una fecha de corte

### 2.1 Fórmula (la misma de hoy, con fechas)

```
cargo vigente al corte  = documento no nota, con fecha de efecto <= corte y no anulado al corte (§2.3)
saldo del cargo al corte = neto
                         − Σ aplicaciones de notas recibidas con fecha <= corte
                         − Σ líneas de pagos con fecha de efecto del pago <= corte y pago vigente al corte
                         − Σ ajustes del cargo con fecha <= corte y vigentes al corte
   neto = coalesce(saldo_al_inicio, total − retenciones)

saldo libre de la nota al corte = base
                         − Σ aplicaciones hechas con fecha <= corte
                         − Σ ajustes con fecha <= corte y vigentes al corte
                         − Σ líneas de reintegros con reintegro.fecha <= corte y vigente al corte
   base = coalesce(saldo_al_inicio, total)

saldo neto del proveedor = Σ saldos de sus cargos − Σ saldos libres de sus notas
   > 0  acreedor (Proveedores, pasivo);  < 0  deudor (reclasificación de cierre, activo)
```

Con `corte = hoy` el saldo **no** es el de la lista de Documentos: la lista resta lo comprometido (cheques posfechados,
para que nadie lo vuelva a pagar) y el reporte no (el pasivo sigue hasta la fecha del cheque, NIIF para las Pymes,
sección 11). Por eso los reportes de saldo llevan la columna **«Comprometido (cheques posfechados)»** = líneas de pagos
vigentes con fecha de efecto `> corte` y emitidos (`creado_en`) hasta el corte, y **«Disponible para pagar» = saldo −
comprometido**, que sí coincide con la lista. Así nadie ve dos cifras sin explicación.

**Fecha de efecto del pago (dictamen 5, cambio 2: posfechado cobrado antes de su fecha).** El cheque se paga a la vista
(Código de Comercio art. 501): si el banco lo cobró antes de su fecha, el pasivo se extinguió con el cobro. Bancos no
guarda el **día** del cobro, solo en qué conciliación mensual quedó marcado (`bancos.movimientos.conciliacion_id` →
`bancos.conciliaciones (anio, mes, estado)`). Regla:

```
fecha de efecto del pago = least(pagos.fecha, último día del mes de la conciliación del movimiento)
   solo si esa conciliación está «autorizada» (la única que ya no cambia); si no, pagos.fecha
```

- Corte en o después del fin de ese mes: el posfechado cobrado ya rebaja el saldo (y sale de «Comprometido»).
- Corte dentro del mes conciliado y antes de la fecha del cheque: no se sabe el día; sigue como comprometido, con la
  leyenda «El cheque N se cobró en el estado de cuenta de mm/aaaa, antes de su fecha; Bancos no guarda el día del
  cobro.»
- Solo cambia algo en cheques posfechados (`fecha` posterior al fin del mes de su conciliación). La lectura de
  `bancos.movimientos` y `bancos.conciliaciones` es desde `infraestructura` (Bancos es `dependeDe`), con su RLS.
- R1, R2, R3 (fecha de la línea del pago) y R7 usan la **misma** fecha de efecto, para que los invariantes de §2.5
  sigan cuadrando.

### 2.2 Fecha de efecto de un documento (CP5-b: **emisión**, decidido)

La fecha desde la que un documento cuenta en un corte: **`fecha_emision`** para cargos y notas, del libro y de saldo
inicial, con una excepción (dictamen 1, O-4):

```
fecha de efecto = fecha_emision                                   saldo inicial (U8)
                = greatest(fecha_emision, fecha de inicio)        documento del libro (con fecha de inicio)
                = fecha_emision                                   documento del libro (empresa sin fecha de inicio)
```

Un documento del libro emitido **antes** de la fecha de inicio (factura vieja que llegó después; U8-l) no estaba en la
carga inicial: si contara desde su emisión, el saldo al día anterior a la fecha de inicio ya no sería el del cuadre de
saldos iniciales (invariante 5). Cuenta desde la fecha de inicio y el reporte lo avisa (§2.4).

**Aviso de registros tardíos** (dictamen 1): R1 y R2 cuentan los documentos con fecha de efecto `<= corte` registrados
**después** del corte (`documentos.creado_en`, en hora de Guatemala, `> corte`) y avisan: «N documentos con fecha hasta
el dd/mm/aaaa se registraron después (Q…): si ya cerró ese mes con este reporte, el saldo cambió.» Es la excepción
esperada del invariante 4 (devengo: la factura es del mes de su emisión aunque llegue tarde).

Por qué la emisión:

- Es la que usa el proveedor en **su** estado de cuenta: el nuestro se puede cotejar con el suyo línea por línea.
- Es la base del vencimiento (o la recepción, si el proveedor tiene `contarDesdeLaRecepcion`) y de la antigüedad.
- La fecha mínima de un pago es la emisión del DTE (dictamen CP4, otros 3): un pago nunca queda antes de su cargo, así
  que no aparecen saldos deudores falsos entre la emisión y la recepción.
- Toda aplicación de nota tiene fecha `>=` las recepciones de la nota y del cargo (CP2 C2, CP3 «la mayor»), que son
  `>=` sus emisiones: la suma por proveedor siempre cuadra.
- No necesita unir el Libro de compras para el saldo (rendimiento).

Descartadas: `fecha_recepcion` y `periodo` del libro. **Contabilidad** (cuando exista) provisiona cada documento **al
registrarlo**, con **esta misma fecha de efecto** y con «Retenciones por pagar» en la misma partida (dictamen 2), para
que el auxiliar (R1) cuadre con el mayor (§10.7).

### 2.3 Lo anulado y lo quitado después del corte (CP5-a: **B**, decidido)

Un corte del pasado debe dar **siempre la misma cifra**: el contador cierra octubre con este reporte y saca de él la
partida de reclasificación; si en noviembre se anula un pago de octubre, octubre no debe cambiar (Contabilidad hará la
reversa en noviembre). Para eso cada fila necesita su **fecha contable de anulación**:

| Fila | «Vigente al corte» si… | Fecha de anulación |
|---|---|---|
| Documento | `estado <> 'anulado'` o `anulado_en` (en hora de Guatemala) `> corte` | `anulado_en::date` (la anulación revierte en su día) |
| Ajuste | Igual | `anulado_en::date` (`AnularAjuste` ya lo fecha hoy) |
| Pago | `fecha_de_anulacion is null or fecha_de_anulacion > corte` | **Columna nueva** `pagos.fecha_de_anulacion` (§3.1): la fecha del inverso en Bancos; la **fecha del pago** si Bancos lo anuló sin inverso (cheque de mes abierto: «nunca existió», su anulación no aparece en ningún corte); el día de la anulación en nota ligada, cuenta de apertura y efectivo |
| Reintegro | Igual | **Columna nueva** `reintegros.fecha_de_anulacion` (misma regla) |
| Retiro de efectivo | Igual | **Columna nueva** `retiros_de_efectivo.fecha_de_anulacion` |

**Lo que no se puede reconstruir** (limitación, con leyenda en el reporte): las aplicaciones de notas **quitadas** o
borradas al anular una contraseña, y las líneas cambiadas al **reaplicar** un pago, se ven como están hoy. Eso solo
mueve el saldo **entre documentos del mismo proveedor** (antigüedad y saldos a favor), **nunca** el saldo neto del
proveedor ni el total.

**Documento eliminado (corrección de CT-0f, dictamen §0.4):** un documento eliminado **sí** estaba provisionado y
eliminarlo cancela su partida, así que **sí cambia** el saldo neto del proveedor y el total de los cortes pasados que lo
incluían. Hoy solo se puede eliminar un documento **no autorizado** (`noEstarAutorizado`, entre las
`REGLAS_PARA_ELIMINAR`) y lo frena `exigirPeriodoAbierto` del Libro de compras (período declarado con el bloqueo
encendido); no hay período contable que lo impida. Regla futura: con Contabilidad activa, eliminar solo se permite con
el período contable abierto, y entonces un corte de un período cerrado ya no cambia. Tampoco se reconstruye una
**desautorización** (el reporte usa el estado de autorización de hoy). Leyendas: «Las aplicaciones de notas y los pagos
reaplicados se muestran como están hoy; el saldo neto de cada proveedor no depende de eso.» y «Un documento eliminado
después del corte ya no aparece: los cortes pasados que lo incluían cambian.» (decisión tomada sin consultar al
`contador-guatemala`, por ser solo una advertencia; queda por validar).

Descartada la alternativa A (estado de hoy, sin columnas nuevas). Pendiente para más adelante (dictamen 3, fuera de
CP5): marcar las aplicaciones de notas **no vigentes** en vez de borrarlas, para quitar esta limitación (§14).

### 2.4 Corte mínimo y saldos iniciales

- Corte mínimo: el **día anterior a la fecha de inicio** de la empresa (orden `empresas.obtener_carga_inicial`, como
  hoy). Antes no hay datos completos: el reporte rechaza con `CorteAnteriorAlInicio`. Sin fecha de inicio, no hay
  mínimo.
- En ese corte, el saldo de Proveedores debe ser **igual al cuadre de saldos iniciales** (U8). Los documentos del
  libro con emisión anterior a la fecha de inicio (facturas viejas que llegaron después) cuentan desde la fecha de
  inicio (§2.2) y el reporte los lista en un aviso: «Emitidos antes de la fecha de inicio: cuentan desde el dd/mm/aaaa.
  No estaban en la carga inicial: revise si faltaban en el saldo de apertura.»
- Corte máximo: ninguno (un corte futuro sirve para proyectar con los posfechados).

### 2.5 Invariantes que prueban los pasos

1. Σ saldos netos por proveedor (R1) = Σ saldos de cargos − Σ saldos libres (R2 y R4) al mismo corte.
2. Saldo final del estado de cuenta (R3) del proveedor P al día `hasta` = saldo neto de P en R1 con `corte = hasta`.
3. Con `corte = hoy`, «Disponible para pagar» de cada documento = saldo de la lista de Documentos. **Cambia con la
   adenda del 2026-11-18 de `diseno-cp4-pagos.md`:** después de CP4-D3, el saldo de R2 es igual al saldo de la lista (la
   deuda), y lo disponible de R2, a lo disponible de la lista.
4. Un corte pasado no cambia al anular después un pago, un reintegro, un ajuste o un documento (§2.3). Excepciones
   esperadas (también un documento eliminado después, con su leyenda), con su aviso o leyenda: un documento con fecha de efecto hasta el corte registrado después (§2.2) y un
   cheque posfechado cuya conciliación se autoriza después (§2.1).
5. Al día anterior a la fecha de inicio, el total de R1 = total del cuadre de saldos iniciales.

## 3. Datos

**Sin tablas nuevas.** Los reportes calculan; no guardan fotos. Si el contador pidiera congelar el cierre (guardar el
saldo de cada proveedor al cierre de mes), sería tarea de Contabilidad, no de CP5.

### 3.1 Columnas nuevas (CP5-a = B)

| Tabla | Columna | Tipo | Nula | Regla |
|---|---|---|---|---|
| `cuentas_por_pagar.pagos` | `fecha_de_anulacion` | `date` | sí | check `pagos_fecha_de_anulacion_de_su_estado`: `(estado = 'anulado') = (fecha_de_anulacion is not null)`; check `pagos_fecha_de_anulacion_valida`: `fecha_de_anulacion is null or fecha_de_anulacion >= fecha` (igual a `fecha` = nunca existió) |
| `cuentas_por_pagar.reintegros` | `fecha_de_anulacion` | `date` | sí | Los dos checks equivalentes (`reintegros_…`) |
| `cuentas_por_pagar.retiros_de_efectivo` | `fecha_de_anulacion` | `date` | sí | `(estado = 'anulado') = (fecha_de_anulacion is not null)` y `>= fecha` |

Las crea **CP5-1** (migración `0011`, §3.3), que va **antes de CP4-4**: así ningún caso de uso de anulación se programa
sin la columna y no hace falta volver a tocarlos. Mensajes en `MENSAJES_POR_RESTRICCION` para los checks nuevos (un
`fecha_de_anulacion` que falta es un error de programación: mensaje genérico de datos inconsistentes).

**Quién las llena** (escrito también en `diseno-cp4-pagos.md` §5.9 y en la adenda de efectivo §4.4 y §4.6):

| Paso de CP4 | Caso | `fecha_de_anulacion` |
|---|---|---|
| **CP4-4** | `AnularPago` de cheque o nota de débito, desde Cuentas por pagar | `forma = 'sin_inverso'` → `pagos.fecha`; `con_inverso` → la `fecha` del inverso, **leída** de `bancos.movimientos` por el `inversoId` de la respuesta (lectura desde `infraestructura`; no se supone la fecha mandada, porque `bancos.anulaciones.misma_fecha` puede cambiarla) |
| **CP4-4** | Manejador de `bancos.movimiento_por_cambiar` (`anular`, también cheques caducos en lote) | `formaDeAnulacion = 'sin_inverso'` → `pagos.fecha`; `con_inverso` → la `fecha` del aviso |
| **CP4-4** (`cuenta_de_apertura`, al anularla) y **CP4-5** (`nota_ligada`) | Sin movimiento en Bancos | `greatest(hoy en Guatemala, pagos.fecha)` |
| **CP4-E3** | `AnularPago` de un pago en **efectivo** | `greatest(hoy, pagos.fecha)` |
| **CP4-7** | `AnularReintegro` (y su caso en el manejador): depósito / efectivo | Depósito: como el pago con Bancos (`reintegros.fecha` sin inverso, fecha del inverso con él); efectivo: `greatest(hoy, reintegros.fecha)` |
| **CP4-E2** | `AnularRetiro` y su caso en el manejador | Como el pago con Bancos (`retiros_de_efectivo.fecha` sin inverso; fecha del inverso con él) |

`ReaplicarPago` no la toca (el pago sigue vigente). `ReabrirRetiro` (CP4-E4) tampoco: reabrir no anula el retiro (la
devolución anulada vive en Bancos con su propia fecha). Cada paso prueba la columna en sus casos de anular.

### 3.2 Índices nuevos (Cuentas por pagar)

| Índice | Columnas | Para |
|---|---|---|
| `aplicaciones_de_notas_corte_idx` | `(empresa_id, fecha)` | Sumar lo aplicado hasta el corte solo de la empresa |
| `ajustes_corte_idx` | `(empresa_id, fecha)` | Lo ajustado hasta el corte y el reporte del mes (lo pidió CP2) |
| `aplicaciones_de_pagos_empresa_idx` | `(empresa_id, pago_id)` | Unir con `pagos` filtrados por empresa y fecha sin recorrer las de otras empresas |
| `aplicaciones_de_reintegros_empresa_idx` | `(empresa_id, reintegro_id)` | Igual con `reintegros` |
| `pagos_anulados_corte_idx` | `(empresa_id, fecha_de_anulacion) where estado = 'anulado'` | Los anulados después del corte (va en la `0011`, con la columna) |

No hace falta índice nuevo en `documentos` (`documentos_estado_idx` empieza por `empresa_id` y lleva `fecha_emision`;
`documentos_proveedor_vencimiento_idx` sirve al estado de cuenta). Los cuatro primeros se confirman con `EXPLAIN` en la
prueba de rendimiento de CP5-2 (§9): si el plan no los usa, no se crean; por eso van en su propia migración (`0012`).

**Resultado del `EXPLAIN` (CP5-2, 2026-11-15, dos empresas con 20,000 documentos y 30,000 pagos):** el plan usa
`aplicaciones_de_notas_corte_idx` y `ajustes_corte_idx`; **no** usa `aplicaciones_de_pagos_empresa_idx` ni
`aplicaciones_de_reintegros_empresa_idx` (prefiere recorrer enteras esas tablas, que son la mitad de cada empresa). La
`0012` trae solo los dos primeros. Si con muchas empresas el plan cambiara, se agregan en una migración nueva.

### 3.3 Migraciones (números verificados en `main` el 2026-11-15)

- Cuentas por pagar **`0011_cp5_fecha_de_anulacion`** (paso **CP5-1**, antes de CP4-4): `npm run bd:generar -w
  servidor -- cuentas-por-pagar cp5_fecha_de_anulacion` y completar a mano el relleno (`--custom` no hace falta: las
  columnas y checks los genera drizzle-kit desde las tablas; el `update` se agrega antes de los checks). Orden: columnas
  nulas → relleno de las filas `anulado` que existan (en producción no hay: CP4 no se ha desplegado, y hasta CP4-4 nadie
  anula; en desarrollo puede haber filas sembradas): pago con movimiento anulado a la antigua (`bancos.movimientos.anulado_en
  is not null`) → `fecha`; con inverso (`revertido_en is not null`) → `fecha` del movimiento con `revierte_a_id` = ese
  movimiento; sin movimiento → `greatest(fecha, (anulado_en at time zone 'America/Guatemala')::date)`; igual en
  reintegros y retiros → los checks de §3.1 → `pagos_anulados_corte_idx`. Prueba de la migración: repetible sobre una
  base con un pago, un reintegro y un retiro anulados sembrados.
- Cuentas por pagar **`0012_cp5_indices_de_corte`** (paso **CP5-2**): los índices de §3.2 que confirme el `EXPLAIN`.
  CP4-4 a CP4-12 y CP4-E2 a E5 no traen migración; si alguno la necesitara, toma el número siguiente libre y CP5-2 se
  corre después (nunca dos migraciones de Cuentas por pagar a la vez; se avisa en `DONDE-QUEDAMOS.md`).
- Libro de compras **`0036_cp5_constancias_pendientes`** (paso **CP5-6**, CP5-f = A) con
  `retenciones_sin_constancia_idx (empresa_id, fecha) where constancia_numero is null and monto > 0`.
- Ninguna toca permisos guardados (§5): los permisos son nuevos.

### 3.4 RLS, llaves y convivencia

Sin tablas nuevas no hay políticas nuevas: todas las consultas corren en `UnidadDeTrabajo.ejecutar` y RLS limita a la
empresa activa (también lo que se lee de `libro_de_compras`, `bancos` y `terceros`, todos con su política). Lecturas
entre esquemas solo desde `infraestructura` y solo hacia el `dependeDe` (`libro-de-compras`, `bancos`) y `terceros` /
`core`, como hoy. Sin alcance por registro (el módulo no tiene `recursosConAlcance`).

## 4. Los reportes

Doce reportes. Para cada uno: datos, filtros, columnas, totales, permiso (§5) y lo propio de Excel e impresión (lo
común está en §6). «Proveedor» es siempre nombre y NIT de Terceros.

### R1. Saldos por proveedor y antigüedad (a una fecha de corte)

Junta lo que la hoja de ruta llama «Saldos por proveedor», «Antigüedad de saldos» y el saldo neto separado en
acreedores y deudores (C-CP2-4).

- **Datos:** §2.1 por documento, agregado por proveedor en SQL. Tramo de cada cargo por `corte − vencimiento`: «Por
  vencer» (`<= 0`), 1–30, 31–60, 61–90, «Más de 90»; sin vencimiento (todavía en la bandeja): columna «Sin vencimiento».
  Las notas no se reparten en tramos: van en «Saldos a favor» (su antigüedad es R4).
- **Filtros:** `corte` (por omisión hoy), `proveedorId?`, `autorizacion` (`todos` por omisión, `autorizados`,
  `sin_autorizar`; CP5-c), `incluirSinSaldo` (no).
- **Columnas:** NIT y nombre, Por vencer, 1–30, 31–60, 61–90, Más de 90, Sin vencimiento, **Total cargos**, Saldos a
  favor, **Saldo neto**, Comprometido (posfechados), Disponible para pagar, Sin autorizar (parte del total que no está
  autorizada).
- **Agrupa por NIT** (decidido; Código Civil art. 1469 y NIIF para las Pymes, sección 11: la compensación es entre el
  mismo acreedor y deudor): la fila es el **NIT** (normalizado, `terceros.terceros.nit`) y el acreedor o deudor se decide
  con el neto del NIT; si un NIT tiene más de una ficha de proveedor, cada ficha va como **subrenglón** debajo y sale el
  aviso «El NIT … está en N fichas de proveedor: revise si son el mismo y únalas en Terceros.». Los proveedores sin NIT
  o con «CF» **no** se agrupan entre sí: cada uno es su propio grupo (clave `coalesce(nit real, proveedor_id)`). Hoy
  Terceros no deja repetir un NIT en la cuenta (`terceros_nit_por_cuenta_idx`, salvo «CF») y un tercero tiene a lo sumo
  una ficha de proveedor (`proveedores_tercero_idx`), así que el subrenglón y el aviso son defensivos: la consulta los
  soporta y una prueba los cubre sembrando las filas, aunque en la práctica casi nunca salgan.
- **Dos bloques:** «Proveedores con saldo acreedor» (neto `> 0`) y «Proveedores con saldo deudor» (neto `< 0`, en
  positivo, para la partida de reclasificación). Cada bloque con su total; al pie, «Saldo neto de Proveedores» =
  acreedores − deudores, y el **% por tramo sobre el total de cargos** (no sobre el neto: los saldos a favor no tienen
  tramo).
- **Conciliación al pie** (dictamen 12, se agrega en CP5-5 con R11): «Saldo neto de Proveedores (auxiliar)» − «Pagos a
  proveedores por aplicar (R11 al mismo corte)» = «Proveedores, neto de pagos por aplicar». La transitoria resta de
  Proveedores al presentar.
- **Avisos y leyendas:** limitación de §2.3; documentos emitidos antes de la fecha de inicio (§2.4); registros tardíos
  (§2.2); posfechados cobrados antes de su fecha sin día conocido (§2.1); «Los cheques posfechados no rebajan el saldo
  antes de su fecha (NIIF para las Pymes, sección 11).»
- **Orden:** por nombre; opción «mayor saldo primero».
- **Pantalla:** sin paginar (una fila por proveedor; aun con 2,000 proveedores es liviano). Cada fila lleva a R2
  filtrado por ese proveedor y corte.

### R2. Documentos por pagar a una fecha (detalle)

Junta «Facturas pendientes de pago», «Estado de pago de facturas», «Facturas por vencer» y «Facturas autorizadas sin
contraseña» en **una** pantalla con **vistas** (CP5-g).

- **Datos:** un documento por fila con §2.1; la contraseña vigente, su pago prometido y el estado de pago
  (`estadoDePagoDe`, con lo pagado y comprometido al corte).
- **Vistas** (preajustes de filtros; el usuario puede cambiarlos):

| Vista | Filtros que pone |
|---|---|
| Pendientes de pago (por omisión) | Cargos con saldo al corte |
| Vencidos | Cargos con saldo y `vencimiento < corte` |
| Por vencer | Cargos con saldo y `vencimiento` entre `corte` y `corte + días` (`dias`, 7 por omisión) |
| Autorizados sin contraseña | Corte = hoy, autorizados, con saldo, sin contraseña vigente |
| Estado de pago | Cargos con emisión en `desde`–`hasta` y `estadoDePago` elegido (pagados, en parte, comprometidos, pendientes) |
| Retenciones por practicar (saldos iniciales) | Corte = hoy, origen saldo inicial, `retenciones_por_practicar > 0` (dictamen 11, O-3; R12 enlaza aquí) |

- **Filtros:** `corte`, `proveedorId?`, `tipo?`, `origen?` (libro o saldo inicial), `autorizacion`, `vencidos`,
  `venceHasta?`, `sinContrasena`, `estadoDePago?`, `emitidosDesde/Hasta?`, `conRetencionesPorPracticar`, `pagina`,
  `limite` (25–100; 2,000 para imprimir, §6).
- **Columnas:** proveedor, tipo, serie y número, emisión, **Vence**, días vencido, tramo, total, retenciones, neto,
  **«Pagos y notas anteriores a la fecha de inicio»** (solo saldos iniciales), notas aplicadas, pagado, ajustado, saldo,
  comprometido, estado de pago, autorizado (sí/no), contraseña y pago prometido, retenciones por practicar (saldos
  iniciales, informativa).
- **Totales** (de todas las filas del filtro, no solo la página): cantidad, total, retenciones, pagado, saldo,
  comprometido.

### R3. Estado de cuenta del proveedor

- **Filtros:** `proveedorId` (obligatorio), `desde`, `hasta` (por omisión, del primer día del mes a hoy),
  `presentacion` (`interna` por omisión, `para_el_proveedor`).
- **Saldo anterior** = saldo neto del proveedor al día `desde − 1` (§2.1).
- **Líneas** del rango, por fecha y después por hora de registro:

| Hecho | Fecha | Cargo (aumenta lo que se debe) | Abono (lo rebaja) |
|---|---|---|---|
| Factura, nota de débito, recibo… | Fecha de efecto (§2.2) | Neto (con total y retenciones en columnas) | — |
| Saldo inicial (cargo) | Su emisión | Neto, con la columna **«Pagos y notas anteriores a la fecha de inicio»** (neto − saldo al inicio) ya restada: el cargo efectivo es `saldo_al_inicio` | — |
| Nota de crédito (del libro o saldo inicial) | Fecha de efecto | — | Base («aplicada a F-123» como referencia, sin línea aparte: aplicar no cambia el saldo del proveedor) |
| Pago | Fecha de efecto del pago (§2.1) | — | Monto de las líneas (forma, número de cheque o recibo, cuenta) |
| Diferencia menor de un cargo | Su fecha | — | Monto |
| Ajuste del saldo a favor de una nota | Su fecha | Monto (el saldo a favor se da de baja) | — |
| Reintegro del proveedor | Su fecha | Monto (devolvió lo que tenía a favor) | — |
| Anulación posterior (con B) | Fecha de anulación | La reversa de un pago o reintegro anulado **dentro** del rango cuya fecha original quedó antes | — |

- **Columnas (interna):** fecha, documento o pago, concepto, total, retenciones, cargo, abono, **saldo corrido**.
- **Para el proveedor** (decidido; dictamen 2 y cambio 4): es lo que se le manda para cotejar con **su** estado de
  cuenta, que lleva la factura por el total. Cada cargo con retenciones sale en **dos líneas con la misma fecha**: el
  cargo por el **total** y, debajo, un **abono** «Retención de IVA/ISR, constancia N» por cada retención
  (`libro_de_compras.retenciones`, con su número de constancia o «constancia pendiente»). Las notas de crédito, como en la
  interna: abono por su base (§2.1). El saldo corrido y el final
  son **los mismos** que en la interna (total − retenciones = neto): el invariante 2 no cambia. Sin las columnas
  «total» y «retenciones» ni «Comprometido/Disponible» (son internas); un saldo inicial sale por su `saldo_al_inicio`
  (sus retenciones ya practicadas en el sistema anterior no se detallan; las **por practicar** no se muestran como abono
  porque aún no se han hecho). Encabezado de impresión con los datos de la empresa y del proveedor, sin «emitido por».
  Excel con la misma forma.
- **Totales:** saldo anterior, cargos, abonos, saldo final (= R1 a `hasta`, invariante 2), y debajo, al día `hasta`:
  comprometido y disponible.
- **Un pago anulado dentro del rango** con su anulación también dentro no aparece (no tuvo efecto), salvo con la
  casilla «Mostrar anulados» (en gris, sin sumar).
- **Pantalla:** sin paginar hasta 2,000 líneas; si hay más, se pide acortar el rango (o Excel, que no tiene tope).

### R4. Saldos a favor (notas de crédito) y su antigüedad

- **Datos:** notas vigentes al corte con saldo libre al corte (§2.1), del libro o saldo inicial.
- **Filtros:** `corte`, `proveedorId?`, `incluirSinSaldo` (no; así cubre también «Notas de crédito de proveedores» de la
  hoja de ruta).
- **Columnas:** proveedor, serie y número, emisión, base, aplicado, ajustado, reintegrado, saldo libre, **«Último
  movimiento»** = la mayor fecha entre la emisión y las de sus aplicaciones, ajustes y reintegros vigentes al corte
  (un pago parcial o un reconocimiento interrumpe la prescripción, Código Civil arts. 1506–1507), **años desde el último
  movimiento**, tramo (menos de 1 año, 1–2, 2–3, 3–4, 4–5, 5 o más), **«Posible prescripción desde»** = último
  movimiento + **5 años** (Código Civil art. 1508; sin plazo mercantil más corto), en contraseña (sí/no).
- **Totales:** por tramo y total; los de «5 o más» en un renglón aparte «Posiblemente prescritos: consulte a su
  contador.»
- **Leyendas** (dictamen 7, O-7): «La prescripción no opera sola: debe alegarse, y se interrumpe con un reconocimiento
  del proveedor o un pago parcial; Arrancar solo conoce los movimientos registrados aquí.» y «Un saldo a favor prescrito
  no es por eso una cuenta incobrable deducible: consulte a su contador.»
- El plazo (5 años) se codifica en el dominio (`plazoDePrescripcion`), no en configuración. La limitación de §2.3 (las
  aplicaciones quitadas no dejan fecha) puede adelantar el «último movimiento»: la leyenda de §2.3 la cubre.

### R5. Contraseñas por pagar y con pago prometido vencido

- **Datos:** contraseñas **vigentes** con saldo (el mismo cálculo de hoy de `dto-de-contrasena.ts`, que ya da
  `pagoVencido`). Es un reporte **de hoy** (operativo), sin corte.
- **Filtros:** `pagoPrometidoHasta` (por omisión **ayer**: las vencidas; con una fecha futura sirve como «por pagar esta
  semana»), `proveedorId?`.
- **Columnas:** número, proveedor, fecha de la contraseña, **Pago prometido**, días de atraso, **Vence** (el más
  antiguo de sus documentos con saldo), documentos con saldo, saldo, autorizado (lo que ya se puede pagar), sin
  autorizar, comprometido, impresa (sí/no).
- **Totales:** cantidad y saldo, autorizado, sin autorizar.
- Usa `contrasenas_pago_idx`.

### R6. Pagos realizados

- **Datos:** `pagos` con fecha en el rango, con sus líneas, el movimiento de Bancos (cuenta, número de cheque o nota,
  conciliado) o el retiro, y por línea el documento con **quién lo autorizó**.
- **Filtros:** `desde`, `hasta` (obligatorios; por omisión el mes en curso), `proveedorId?`, `forma?`,
  `cuentaBancariaId?`, `estado` (`vigentes` por omisión, `anulados`, `todos`), `posfechados?`, `mismaPersona?`
  (control: líneas cuyo documento autorizó quien registró el pago).
- **Columnas** (una fila por línea; el pago se repite): número de pago, fecha, forma, documento bancario o recibo,
  cuenta, proveedor, contraseña, documento pagado, monto, retención descontada, **cubre** (monto + retención),
  **registró el documento** (quien lo ingresó en Libro de compras, `documentos.creado_por`, y quien lo completó,
  `registrado_por`, si es otro), **autorizó el documento**, **registró el pago**, «misma persona» (marca: quien registró
  o autorizó el documento también registró el pago), estado y, si anulado, fecha de anulación (`fecha_de_anulacion`) y
  motivo.
- **Totales:** por forma y total (monto y retenciones descontadas); vigentes y anulados separados.
- Usa `pagos_lista_idx`; paginado en pantalla.

### R7. Cheques posfechados a una fecha de corte

- **Datos:** pagos vigentes al corte con `forma = 'cheque'`, `fecha > corte` y `creado_en` (Guatemala) `<= corte`: ya se
  entregaron pero aún no rebajan el pasivo.
- **Filtros:** `corte` (hoy), `proveedorId?`, `cuentaBancariaId?`.
- **Columnas:** fecha del cheque, días que faltan, cuenta, número de cheque, proveedor, pago, monto, cobrado (si Bancos
  ya lo concilió: se pagó a la vista).
- **Totales:** por cuenta y total; por semana de vencimiento. Es la cifra de «Comprometido» de R1 (invariante).
- Un posfechado cobrado antes de su fecha con conciliación autorizada que termina hasta el corte **no** sale (ya rebajó,
  §2.1); si su conciliación es del mes del corte, sale con la marca «cobrado en mm/aaaa».
- Leyenda: «El cheque se paga a la vista (Código de Comercio art. 501): el proveedor puede cobrarlo antes de su fecha.»

### R8. Ajustes del mes (para el contador)

- **Filtros:** `mes` (por omisión, el **anterior**: se revisa al cerrar), `proveedorId?`, `causa?`.
- **Sección 1, ajustes del mes:** `ajustes_de_saldo` con `fecha` en el mes (vigentes y anulados): fecha, documento
  (nota o cargo), proveedor, causa, **efecto** (de `EFECTO_DE_LA_CAUSA`; la diferencia menor de un cargo es `ingreso`, C-CP4-5),
  monto, referencia, motivo, pago (si es diferencia), registró, estado y, si se anuló, quién, cuándo y motivo. Aviso
  «Año anterior» si el documento es de un año anterior (C-CP2-5).
- **Sección 2, anulaciones del mes de ajustes de otros meses** (`anulado_en` en el mes y `fecha` fuera): para que el
  contador vea lo que cambia un mes ya revisado.
- **Secciones 3 y 4 (CP5-e, recomendadas):** **aplicaciones manuales** del mes (compensaciones sin dinero: nota, cargo,
  monto, referencia del acuerdo, quién) y **pagos a la cuenta de apertura** del mes (la excepción con permiso propio:
  motivo, carga abierta o cerrada, quién).
- **Sección 5, documentos anulados o desautorizados en el mes** (decidido; dictamen 9): anulados con `anulado_en` en el
  mes (documento, proveedor, emisión, total, si estaba autorizado, motivo, quién) y desautorizados en el mes, leídos de
  `core.auditoria` (acción `devolver`, recurso `cuentas-por-pagar.documentos`, con su motivo y quién; el documento como
  estaba en `anterior`). Para que el contador vea lo que se revirtió o volvió a revisión.
- **Totales:** por causa y efecto (vigentes), anulados aparte; por sección.
- Usa `ajustes_corte_idx` y `aplicaciones_de_notas_corte_idx`.

### R9. Pagos en efectivo sobre el umbral de bancarización

- **Datos, en vivo:** por proveedor y mes calendario, la **suma del mes** de CP4 §5.7 (cheques, notas de débito, notas
  ligadas y efectivo vigentes; lo aplicado a cargos antes de retenciones; sin la cuenta de apertura) con la **misma
  consulta** que CP4-3 (no otra fórmula). Se listan los meses del proveedor que llegan al umbral
  (`cuentas-por-pagar.bancarizacion.umbral`, el valor de hoy: limitación escrita) **y** tienen pagos en efectivo
  (criterio **por proveedor y mes**).
- **Criterio por cargo** (decidido; dictamen 10, O-2; Decreto 20-2006 art. 20 reformado: una operación de Q30,000 o más
  pagada en partes): además, todo **cargo** con total (antes de retenciones, como la suma de CP4 §5.7; un saldo inicial, por su `saldo_al_inicio`) `>=` umbral que tenga **alguna** línea de pago en
  efectivo vigente, aunque la suma del mes del proveedor no llegue al umbral (pagado en varios meses). Sale en una
  sección propia «Documentos sobre el umbral pagados en parte en efectivo», con todos sus pagos (forma, fecha, monto).
- **Por cada pago en efectivo** de esos meses o cargos: recibo, fecha, retiro, monto, si se registró con la excepción
  (permiso y `motivo_sin_bancarizar`), y sus cargos con el **efecto fiscal** (el de CP4-E3, §5.2 de la adenda): con
  efecto de IVA, la marca **«Crédito fiscal en riesgo por bancarización»** y el monto = **IVA completo del cargo**
  (`iva − iva_no_acreditable` del documento del libro, aunque solo una parte se haya pagado en efectivo; en un saldo
  inicial, «IVA no conocido»); con efecto de ISR, **«Costo no deducible»** con su monto = el **cargo completo sin IVA**
  (`total − iva` del documento del libro; en un saldo inicial, su neto con la nota «IVA no conocido»). Sin efecto, no
  sale.
- **Filtros:** `desde`, `hasta` (meses; por omisión los últimos 12; **máximo 48 meses**, los que la SAT puede revisar,
  Código Tributario art. 47), `proveedorId?`, `soloConEfecto` (sí).
- **Totales:** por mes y proveedor (suma del mes, efectivo, IVA en riesgo, costo no deducible), por sección y total.
- **Leyendas:** E-6 «Arrancar solo suma los pagos registrados en Cuentas por pagar.»; «Arrancar no rectifica el Libro
  de compras: si ya tomó el crédito fiscal, consulte a su contador (Código Tributario art. 106).»; «Umbral usado:
  Q… (el configurado hoy); verifique el vigente para cada mes.»
- **No toca** el Libro de compras ni sus reportes.
- Depende de CP4-E3 (efecto fiscal) y del índice `pagos_proveedor_fecha_idx`.

### R10. Retiros de efectivo por liquidar a una fecha de corte

- La lista con corte de la adenda §4.5 (E-7) en versión imprimible y exportable, con la regla de §2.3: retiros con
  `fecha <= corte`, vigentes al corte y que al corte seguían abiertos (`fecha_de_liquidacion is null or > corte`);
  **disponible al corte** = monto − pagos en efectivo vigentes al corte con `fecha <= corte`.
- **Filtros:** `corte`, `custodio?`.
- **Columnas:** número, fecha, forma y documento bancario, custodio, monto, pagado al corte, disponible al corte, días
  abierto, «de un mes anterior» (el aviso de CP4-E-f).
- **Total:** efectivo en manos de custodios al corte (Caja – Efectivo para pagos a proveedores, adenda §6).
- Reutiliza la consulta de `ListarRetiros` (CP4-E2); CP5 solo le suma lo de §2.3, Excel e impresión.

### R11. Notas de débito para proveedores sin aplicar a una fecha de corte

- **Datos:** las notas de débito de Bancos **marcadas** (concepto de sistema `pago_a_proveedor` sin origen, CP4-b) con
  fecha `<= corte` y no anuladas al corte, menos lo aplicado por pagos `nota_ligada` vigentes al corte con fecha `<=
  corte`. Se listan las que tienen **disponible**. Es el **saldo de la transitoria** «Pagos a proveedores por aplicar»
  al corte.
- **Filtros:** `corte` (por omisión, fin del mes anterior), `cuentaBancariaId?`.
- **Columnas:** cuenta, fecha, número, referencia, monto, aplicado, disponible, días sin aplicar, conciliada.
- **Total:** disponible (lo que debería tener la transitoria).
- Reutiliza la lectura de `NotasParaLigar` (CP4-5) con fecha.

### R12. Constancias de retención pendientes (todos los meses) — dónde vive: CP5-f

- **Datos:** `libro_de_compras.retenciones` con `monto > 0`, `constancia_numero is null`, de documentos vigentes; las
  de documentos anulados con `resolucion = 'pendiente'` van en una sección aparte (ya tienen su pantalla «Por
  resolver»).
- **Columnas:** mes, grupo de entero, **plazo de entero** (`plazoDelGrupo`), días para el plazo o «Vencido», enterado
  (el mes y grupo tiene entero vigente), proveedor, documento, fecha, impuesto, regla, base, retenido, **«Plazo de la
  constancia»** (decidido; dictamen 11): ISR → el **5.º día (hábil, por confirmar con el contador, §14) del mes siguiente** a la fecha de la retención (Decreto
  10-2012 art. 48, reformado por el Decreto 19-2013: constancia en los primeros 5 días del mes siguiente), con «Vencida»
  si ya pasó; IVA → «Sin plazo propio confirmado» (se guía por el del entero; AG 425-2006 art. 32 sin confirmar).
  El plazo se calcula en el dominio de Libro de compras (`plazoDeLaConstancia`), junto a `plazoDelGrupo`.
- **Enlace** (dictamen 11, O-3): «Retenciones por practicar de saldos iniciales» lleva a la vista de R2 del mismo
  nombre, **solo** si Cuentas por pagar está activo y el usuario tiene `reportes-de-saldos.ver` (el cliente lo decide
  con la sesión; Libro de compras no importa nada de Cuentas por pagar).
- **Filtros:** `hasta` (mes; por omisión el en curso), `grupo?`, `proveedorId?`.
- **Totales:** por mes y grupo, y total pendiente.
- **Decidido (CP5-f = A):** vive en **Libro de compras** (Reportes, «Constancias pendientes»), con
  `libro-de-compras.retenciones.ver/.exportar`. Razones: las retenciones y su plazo son de Libro de compras (su dominio
  calcula el plazo con su calendario y sus variables), y una empresa agente de retención **sin** Cuentas por pagar
  también las debe emitir. Cuentas por pagar enlaza a esa pantalla desde su menú de reportes y desde el aviso de entero
  (como ya hace CP4). Alternativa B (en Cuentas por pagar): puede agregar «se descontó en el pago N», pero necesita una
  orden nueva por el mediador para el plazo (un módulo no importa a otro) y no sirve a quien no tiene el módulo.

## 5. Permisos (`modulo.ts`, PLAN §3.5; CP5-d)

Decidido (CP5-d): **cuatro recursos de reporte por audiencia**, cada uno con `.ver` y `.exportar` (imprimir va con `.ver`:
lo que se ve se puede imprimir; Excel es aparte porque «ver una lista no da derecho a llevársela entera»):

| Permiso | Reportes | Para |
|---|---|---|
| `cuentas-por-pagar.reportes-de-saldos.ver` / `.exportar` | R1, R2, R3, R4, R5 | Tesorería, compras, contador |
| `cuentas-por-pagar.reportes-de-pagos.ver` / `.exportar` | R6, R7, R10, R11 | Tesorería, contador |
| `cuentas-por-pagar.reportes-de-control.ver` / `.exportar` | R8, R9 | Contador, auditoría interna |
| `libro-de-compras.retenciones.ver` / `.exportar` (ya existen) | R12 (CP5-f = A) | Quien lleva las retenciones |

Ninguno es `soloSuperacceso`. Quien tiene acceso total los recibe solos (son asignables). **Sin migración de permisos**:
son nuevos y no reemplazan a ninguno; el administrador los asigna. Alternativas: uno por reporte, como Bancos (22
permisos, más fino pero una lista larga en la pantalla de roles), o uno solo `reportes` (como decía
`cuentas-por-pagar.md`: no separa lo del contador de lo de tesorería).

Ningún reporte cambia datos: **no hay auditoría** (la auditoría es de bajas, anulaciones y cambios de estado). Exportar
tampoco se audita hoy en ningún módulo; no se agrega aquí.

## 6. Excel e impresión (común a todos)

- **Excel** con el motor `core/intercambio`, como Bancos: por reporte, `http/reporte-<nombre>.columnas.ts` (tipo
  `Columna`, `decimal` para el dinero, `fecha` para fechas) y `aFilasExportadasDe<Reporte>`; `crearIntercambio` con
  `validar` vacío y `crear` que lanza; `rutasDeIntercambio` con **solo** `permisos.exportar` y el `filtro` Zod de la
  pantalla (exporta **todo** lo filtrado, sin paginar). Los totales van como filas con la columna «Sección» (`Total`,
  `Acreedores`, `Deudores`…) y, al final, filas `Nota` con el **corte o rango, los filtros y las leyendas**, como el flujo
  de efectivo. Sin plantilla ni importar.
- **Impresión** con `window.print()` y clases `print:`: encabezado solo para imprimir (empresa con NIT, título, corte o
  rango, filtros, «Emitido el dd/mm/aaaa hh:mm por usuario»), tablas sin sombras, totales al pie, leyendas. Las
  pantallas paginadas (R2, R6) imprimen pidiendo hasta **2,000 filas**; si el filtro trae más, el botón avisa «Son N
  filas: acote el filtro o use Excel» (CP5-h). Formatos de fecha y dinero solo con `utilidades/formato.ts`.
- Nombre del archivo: `<reporte>-<fecha de hoy>.xlsx` (el motor no cambia); el corte va dentro (filas `Nota`).

## 7. Contrato de la API

Prefijo `/api/cuentas-por-pagar/reportes`. Dinero como texto con dos decimales; fechas `AAAA-MM-DD`. Cada ruta tiene su
`GET …/exportar` con el mismo filtro.

| Ruta | Permiso (ver / exportar) | Consulta | Respuesta |
|---|---|---|---|
| `GET /saldos-por-proveedor` | `reportes-de-saldos` | `corte?`, `proveedorId?`, `autorizacion?`, `incluirSinSaldo?`, `orden?` | `{ corte, acreedores: FilaDeSaldoDto[], deudores: FilaDeSaldoDto[], totales, conciliacion?, avisos, leyendas }` (cada fila es un NIT con `fichas: FilaDeSaldoDto[]` si tiene más de una; `conciliacion: { saldoNetoDelAuxiliar, pagosPorAplicar, proveedoresNetoDePagosPorAplicar }` solo sin filtro de proveedor ni de autorización; CP5-5) |
| `GET /documentos` | `reportes-de-saldos` | §4 R2 (`vista?` solo la usa el cliente para preajustar) | página `{ filas, total, totales }` |
| `GET /estado-de-cuenta` | `reportes-de-saldos` | `proveedorId`, `desde`, `hasta`, `mostrarAnulados?`, `presentacion?` | `{ proveedor, presentacion, saldoAnterior, lineas, totales, alCorte?: { comprometido, disponible } }` (`alCorte` solo en la interna) |
| `GET /saldos-a-favor` | `reportes-de-saldos` | `corte?`, `proveedorId?`, `incluirSinSaldo?` | `{ filas, totalesPorTramo, total }` |
| `GET /contrasenas-por-pagar` | `reportes-de-saldos` | `pagoPrometidoHasta?`, `proveedorId?` | `{ filas, totales }` |
| `GET /pagos` | `reportes-de-pagos` | §4 R6 | página `{ filas, total, totales }` |
| `GET /cheques-posfechados` | `reportes-de-pagos` | `corte?`, `proveedorId?`, `cuentaBancariaId?` | `{ filas, totalesPorCuenta, total }` |
| `GET /retiros-por-liquidar` | `reportes-de-pagos` | `corte?`, `custodio?` | `{ filas, total }` |
| `GET /notas-sin-aplicar` | `reportes-de-pagos` | `corte?`, `cuentaBancariaId?` | `{ filas, total }` |
| `GET /ajustes-del-mes` | `reportes-de-control` | `mes?`, `proveedorId?`, `causa?` | `{ mes, ajustes, anulacionesDeOtrosMeses, aplicacionesManuales, pagosAApertura, totales }` |
| `GET /bancarizacion` | `reportes-de-control` | `desde?`, `hasta?`, `proveedorId?`, `soloConEfecto?` | `{ desde, hasta, umbral, meses: [{ proveedorId, proveedorNombre, mes, sumaDelMes, efectivo, ivaEnRiesgo, costoNoDeducible, pagos: [...] }], documentosSobreElUmbral: [...], totales: { meses, documentos, total }, leyendas }` (CP5-5: `desde` y `hasta` son meses `AAAA-MM`; `soloConEfecto` sí por omisión) |
| `GET /api/libro-de-compras/retenciones/pendientes` | `libro-de-compras.retenciones` | `hasta?`, `grupo?`, `proveedorId?` | `{ grupos, retenciones, porResolver }` |

Errores nuevos (`dominio/errores-de-reportes.ts`, código propio, familia `DatoInvalido`): `CorteAnteriorAlInicio`
(«La fecha de corte no puede ser anterior al dd/mm/aaaa, el día antes de la fecha de inicio.»), `RangoDeReporteInvalido`
(`desde > hasta`), `RangoDeReporteMuyLargo` (estado de cuenta y pagos: más de 24 meses; bancarización: más de 48),
`ProveedorDelReporteNoExiste` (`RecursoNoEncontrado`).

## 8. Cliente

- `servicios/reportes.api.ts` (`ApiReportesDeCuentasPorPagar`, con `intercambioDe(ruta)` por reporte) y sus tipos.
- Componentes comunes en `componentes/reportes/`: `EncabezadoDeImpresion` (empresa, título, corte o rango, filtros,
  emitido), `FiltroDeCorte` (fecha con el mínimo de la fecha de inicio), `TablaDeAntiguedad`, `TotalesDelReporte`,
  `LeyendasDelReporte`. Si `EncabezadoDeImpresion` sirve a Bancos y Libro de compras, se sube a `core/componentes` en
  un paso aparte (no en CP5).
- Páginas en `seccion: 'reportes'` (≤ 120 líneas, cada una con su composable `usarReporteDe…` y la lógica pura en
  `composables/reportes/<reporte>.ts` con `*.prueba.ts`: tramos, armado de bloques acreedor y deudor, saldo corrido,
  vistas de R2, tope de impresión): `SaldosPorProveedor`, `DocumentosAUnaFecha`, `EstadoDeCuentaDelProveedor`,
  `SaldosAFavor`, `ContrasenasPorPagar`, `PagosRealizados`, `ChequesPosfechados`, `RetirosPorLiquidar`,
  `NotasSinAplicar`, `AjustesDelMes`, `PagosEnEfectivoSobreElUmbral`; en Libro de compras, `ConstanciasPendientes`.
- Navegación entre reportes: fila de R1 → R2 del proveedor; proveedor en R2 → R3; documento → su ficha; pago → su
  ficha; contraseña → su ficha. La ficha del proveedor (Terceros, sección aportada de Cuentas por pagar) gana
  «Estado de cuenta».
- `v-permiso` oculta el menú y los botones de Excel; el servidor valida siempre.
- Celular: tablas con desplazamiento horizontal y totales arriba; R1 como tarjetas por proveedor.

## 9. Rendimiento (20,000 documentos por empresa)

- **Una consulta propia** `ConsultaDeSaldosAlCorte` (`infraestructura/persistencia/saldos-al-corte.drizzle.ts`), no
  `ConsultaBaseDeDocumentos`: CTE de documentos vigentes al corte (`documentos_estado_idx`), y por separado las sumas
  hasta el corte de aplicaciones de notas, líneas de pagos (unidas a `pagos` filtrados por fecha y vigencia), ajustes y
  reintegros, cada una por empresa con los índices de §3.2, unidas por id con *hash join*; tramos y bloques con `case` y
  `group by proveedor_id` en SQL. R1, R2, R4 y R3 (saldo anterior) usan la misma consulta. Sin `count(*) over ()` sobre
  nueve uniones: el total de R2 sale de la misma CTE.
- Las fórmulas de §2.1 y los tramos viven también en el dominio (`dominio/saldo-al-corte.ts`, funciones puras con
  pruebas); una prueba de integración compara el SQL con el dominio en un escenario con todo (saldos iniciales, notas,
  ajustes, pagos posfechados y anulados, reintegros).
- **Prueba de rendimiento** (`cuentas-por-pagar-reportes-rendimiento.api.prueba.ts`, base recién creada): **dos
  empresas** (para comprobar que no se recorren las filas de la otra), cada una con 20,000 documentos en 500
  proveedores, 3,000 notas, 10,000 aplicaciones, 2,000 ajustes, 30,000 pagos (500 anulados, 300 posfechados) y 1,000
  reintegros. Tope 1.5 s (objetivo 300 ms): R1 a un corte, R2 página de 100, R3 de un proveedor con 2,000 documentos en
  un año, R6 de un mes; Excel de R2 con 20,000 filas en menos de 8 s. `EXPLAIN (analyze, buffers)` de R1 en la prueba
  (impreso si falla): sin *seq scan* de las tablas de aplicaciones.
- Si aun así no alcanza, se evalúa guardar el saldo (U4) o una vista materializada por empresa; **no** antes.

## 10. Convivencia y riesgos

1. **CP4 en curso** (CP4-3 en `main`; CP4-4 es el siguiente). R1–R5 y R8 (secciones 1, 2 y 5) solo necesitan lo que ya
   está en `main`. R6, R7 y R8 (secciones 3 y 4) piden CP4-4 a CP4-6; R10 pide CP4-E2/E4; R11, CP4-5; R9, CP4-E3. Los
   pasos de §11 lo respetan.
2. **Columnas de anulación (B):** las crea CP5-1 **antes de CP4-4** y las llenan CP4-4, CP4-5, CP4-7, CP4-E2 y CP4-E3
   (tabla de §3.1, copiada en los diseños de CP4). Si por algún motivo un paso de anulación se programara antes de CP5-1,
   el relleno de la `0011` lo cubre.
3. **Migraciones:** la `0011` de Cuentas por pagar es de CP5-1 y la `0012` de CP5-2 (CP4 no trae más); nadie genera otra
   de Cuentas por pagar a la vez (se avisa en `DONDE-QUEDAMOS.md`). Libro de compras `0036` no choca con U8-l (`0035` en
   `main`).
4. **Saldos distintos a la lista** con `corte = hoy` (posfechados): explicado con «Comprometido» y «Disponible para
   pagar» (§2.1) y probado (invariante 3).
5. **Umbral de bancarización de hoy** aplicado a meses pasados (R9): leyenda «verifique el vigente»; si el contador pide
   el histórico, la variable tendría vigencias (fuera de CP5).
6. **NIT:** R1 netea por NIT (decidido). Terceros ya impide dos fichas con el mismo NIT en una cuenta, así que hoy el NIT
   y la ficha coinciden salvo «CF» y los terceros sin NIT, que no se agrupan.
7. **Contabilidad** (futura; anotado en `cuentas-por-pagar.md`, `HOJA-DE-RUTA.md` y la bitácora de `PLAN.md`):
   provisiona cada documento **al registrarlo** (ingreso en Libro de compras, ya en la bandeja de Cuentas por pagar), con
   la **fecha de efecto** de §2.2 y «Retenciones por pagar» en la misma partida; autorizar solo aprueba el pago (U12 del
   2026-10-20; corrige «autorizar = provisionar», hallazgo O-1). Revierte toda anulación de un documento registrado
   (no solo de los autorizados: `documentos.estaba_autorizado` deja de decidir la reversa) y también lo que se
   **elimina** (un documento no autorizado ya tenía su provisión). Fecha las reversas de pagos, reintegros y retiros con
   su `fecha_de_anulacion`. Usa R1 al cierre para la reclasificación y R11 para cuadrar la transitoria.
8. **Borrar la empresa:** sin tablas nuevas, nada cambia.

## 11. Pasos (un commit cada uno; servidor y cliente por separado)

Servidor con `programador-backend`, cliente con `programador-frontend`, QA con `pruebas-qa`. Cada commit corre `npm run
revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`.

| Paso | Qué | Va después de |
|---|---|---|
| **CP5-1** (servidor, datos) | Migración **`0011_cp5_fecha_de_anulacion`** (§3.1 y §3.3: tres columnas, relleno, checks y `pagos_anulados_corte_idx`), `pagos.tablas.ts`, `reintegros` y `retiros-de-efectivo.tablas.ts`, mensajes de los checks; `fechaDeAnulacion` en las entidades y mapeadores (nula; nadie la llena todavía). **Pruebas de tablas:** cada check (anulado sin fecha, vigente con fecha, fecha anterior a la del pago: fallan), RLS, `politicas-de-los-modulos`, relleno repetible | CP4-3 en `main` (ya está). **Antes de CP4-4**, que la llena |
| CP4-4, CP4-5, CP4-7, CP4-E2, CP4-E3 | Llenan `fecha_de_anulacion` (tabla de §3.1) y lo prueban | CP5-1 |
| **CP5-2** (servidor, saldos) | `dominio/saldo-al-corte.ts` (fecha de efecto del documento y del pago, vigente al corte, saldo al corte, tramo, prescripción) con pruebas puras; `ConsultaDeSaldosAlCorte`; migración **`0012_cp5_indices_de_corte`** (§3.2, los que confirme el `EXPLAIN`); R1 (por NIT, avisos) y R2 (vistas, también «retenciones por practicar») con sus Excel; permisos `reportes-de-saldos.*`, errores, rutas. **Pruebas:** invariantes 1, 3, 4 y 5 de §2.5, tramos y % sobre cargos, acreedor y deudor, NIT con dos fichas (sembradas) y «CF», posfechado (comprometido, cobrado antes de su fecha con conciliación autorizada y en proceso), documento del libro emitido antes de la fecha de inicio, registro tardío (aviso), autorización, corte anterior al inicio (rechazo), sin permiso (403), exportar sin `.exportar` (403); prueba de rendimiento de §9 | CP5-1; en paralelo con los pasos de CP4 que no traen migración (las pruebas siembran pagos anulados) |
| **CP5-3** (servidor, proveedor y contraseñas) | R3 (interna y para el proveedor), R4 y R5 con sus Excel. **Pruebas:** invariante 2 en las dos presentaciones, retención como abono con y sin constancia, saldo inicial con «anteriores a la fecha de inicio», anulado dentro y fuera del rango, último movimiento y posible prescripción, contraseña vencida y por vencer | CP5-2 |
| **CP5-4** (servidor, pagos) | R6 (con «registró el documento»), R7 y R8 (las cinco secciones), permisos `reportes-de-pagos.*` y `reportes-de-control.*`. **Pruebas:** quién registró, autorizó y pagó («misma persona»), posfechado al corte y cobrado antes, ajustes anulados de otro mes, aplicaciones manuales y apertura, documento anulado y desautorizado en el mes | CP5-3 y CP4-6 |
| **CP5-5** (servidor, efectivo y transitoria) | R9 (efecto fiscal de CP4-E3, criterio por cargo, IVA completo, costo no deducible, 48 meses), R10, R11 y la conciliación al pie de R1. **Pruebas:** proveedor-mes con cheque más efectivo sobre el umbral (marca y montos), cargo de Q30,000 o más pagado en dos meses con una parte en efectivo (sale aunque ningún mes llegue), pequeño contribuyente (no sale), excepción con permiso, rango de 49 meses (rechazo), retiro anulado o liquidado después del corte, nota marcada con aplicación parcial, R1 − R11 | CP5-4, CP4-E4 y CP4-5 |
| **CP5-6** (servidor, Libro de compras) | Migración **`0036_cp5_constancias_pendientes`**, `ConsultarConstanciasPendientes` con `plazoDelGrupo` y `plazoDeLaConstancia`, Excel, ruta. **Pruebas:** varios meses y grupos, enterado, plazo de entero y de constancia vencidos, anuladas aparte | CP5-1 (independiente de los demás; nunca a la vez que otra migración de Libro de compras) |
| **CP5-7** (cliente, saldos) | Componentes comunes, R1 (NIT con subrenglones) y R2 (vistas), enlaces, impresión con tope, lógica pura con pruebas | CP5-2 |
| **CP5-8** (cliente, proveedor y contraseñas) | R3 con las dos presentaciones (y «Estado de cuenta» en la ficha del proveedor), R4, R5 | CP5-3 y CP5-7 |
| **CP5-9** (cliente, pagos y control) | R6, R7, R8, R9, R10, R11 y la conciliación al pie de R1 | CP5-4, CP5-5 y CP5-7 |
| **CP5-10** (cliente, Libro de compras) | R12, su enlace desde Cuentas por pagar y el de R12 a la vista de retenciones por practicar | CP5-6 y CP5-7 |
| **CP5-11** (QA) | Empresa con fecha de inicio y saldos iniciales, factura del libro emitida antes de la fecha de inicio, facturas de varios proveedores con notas y retenciones, pagos (uno posfechado cobrado antes de su fecha, uno anulado al mes siguiente), ajustes, efectivo sobre el umbral (por mes y por cargo), retiro abierto, nota marcada; R1 al cierre del mes antes y después de anular (no cambia), acreedores y deudores, R1 − R11, R3 interno y para el proveedor cuadran con R1, impresión y Excel de cada reporte, permisos por separado, celular | CP5-8 a CP5-10 y CP4-12 |

Orden con CP4: CP4-3 (hecho) → **CP5-1** → CP4-4 → CP4-5 → CP4-E2 → CP4-E3 → CP4-6 → CP4-7 → CP4-8 → CP4-E4 → … (el
de la adenda, sin cambios). CP5-2, CP5-3 y CP5-6 pueden avanzar en paralelo con CP4 desde que CP5-1 esté en `main`;
CP5-4 y CP5-5 esperan sus pasos de CP4.

## 12. Preguntas para el usuario (respondidas el 2026-11-15)

El usuario aceptó todas las recomendaciones, con las correcciones del contador. Quedan como registro:

- **CP5-a. Lo anulado después del corte.** **B**: cada anulación guarda su fecha contable y el corte la respeta (tres
  columnas, §3.1).
- **CP5-b. Desde qué fecha cuenta un documento.** **Emisión**, con la fecha de inicio para los del libro emitidos antes
  (§2.2).
- **CP5-c. Sin autorizar en los saldos.** **A**: entran todos, con columna y filtro.
- **CP5-d. Permisos.** **Por audiencia** (§5), sin migración de permisos.
- **CP5-e. Reporte de ajustes.** **También** aplicaciones manuales y pagos a la cuenta de apertura, y la sección 5 del
  contador.
- **CP5-f. Constancias pendientes.** **A**: en Libro de compras, con enlaces.
- **CP5-g. Documentos por pagar.** **Una pantalla con vistas**.
- **CP5-h. Imprimir reportes grandes.** Hasta 2,000 filas; con más, acotar o Excel.
- **CP5-i. Cheques posfechados.** **Reporte propio** (R7), con la regla del cobro anticipado.
- **Además:** R1 agrupa por NIT; R3 para el proveedor con la retención como abono; Contabilidad provisiona al registrar.

## 13. Validado por `contador-guatemala` (2026-11-15)

Dictamen `dictamen-cp5-2026-11-15.md`, «correcto con ajustes»; todos sus cambios están aplicados:

| Cambio del dictamen | Dónde |
|---|---|
| 1. Fecha de efecto con la fecha de inicio; aviso de registros tardíos | §2.2, §2.4, R1 |
| 2. Posfechado cobrado antes de su fecha | §2.1, R7 |
| 3. R1 por NIT, % sobre cargos, conciliación con R11 | R1, CP5-5 |
| 4. R3 para el proveedor con la retención como abono | R3 |
| 5. R4 «Posible prescripción desde», último movimiento, leyendas | R4 |
| 6. R8 sección 5 | R8 |
| 7. R9: criterio por cargo, IVA completo, costo no deducible, 48 meses | R9, §7 |
| 8. R12: plazo de la constancia ISR; vista de retenciones por practicar | R12, R2 |
| 9. R6: «Registró el documento» | R6 |
| 10. PLAN: pendiente de Contabilidad | §10.7, `cuentas-por-pagar.md`, `HOJA-DE-RUTA.md`, bitácora |
| 11. Leyendas NIIF por sección; umbral «verifique el vigente» | §2.1, R1, R9 |

## 14. Pendiente nuevo

- Si el contador pide **congelar** los saldos de cierre (foto por mes), es de Contabilidad.
- `EncabezadoDeImpresion` común a todos los módulos (Bancos, Libro de compras y Cuentas por pagar): paso aparte del core.
- Histórico del umbral de bancarización (variable con vigencias), si el contador lo pide (R9).
- Aviso de pago por correo (hoja de ruta) podría adjuntar el estado de cuenta (R3): fuera de CP5.
- Aplicaciones de notas marcadas **no vigentes** en vez de borradas (dictamen 3), para que un corte pasado también
  reconstruya la antigüedad y los saldos a favor por documento: cambio de CP2/CP3, fuera de CP5.
- **Para el contador (no frena CP5-1 a CP5-4; sí CP5-5 y CP5-6), interpretaciones del arquitecto:**
  (a) el plazo de la constancia de ISR, ¿5 días **hábiles** (Código Tributario art. 6) o calendario? Se propone hábiles
  con el calendario de Libro de compras; (b) el «costo no deducible» de R9 es el **cargo completo sin IVA**, como el IVA
  completo, y la marca sigue solo en los cargos con alguna parte pagada en efectivo (no en los demás cargos del mismo
  proveedor y mes); (c) el criterio por cargo usa el total antes de retenciones, como la suma del mes.
- **Para el usuario (no frena):** «al registrarla» se interpreta como el **ingreso en Libro de compras** (el documento
  ya está en la bandeja), como U12; si quiso decir «al completarla en la bandeja» (estado `registrado`), lo de la
  bandeja quedaría fuera del mayor y R1 tendría que separarlo.
- **Cheque posfechado cobrado antes:** solo cuenta con la conciliación **autorizada** (la elaborada o en proceso aún
  puede cambiar). Si Bancos llegara a guardar el día del cobro, la regla de §2.1 se cambia por esa fecha.
