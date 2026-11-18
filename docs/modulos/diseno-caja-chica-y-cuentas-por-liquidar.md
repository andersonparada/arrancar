# Diseño de Caja chica y Cuentas por liquidar — arquitecto de datos, 2026-11-18

Estado: **propuesta, por aprobar**. No se programa nada hasta que el usuario responda §15. Aterriza el punto 7 de
`HOJA-DE-RUTA.md` («Caja chica y Cuentas por liquidar») con la investigación del contador
(`dictamen-caja-chica-2026-11-18.md`, «correcto con ajustes») y el §9 de la adenda de efectivo de CP4
(`diseno-cp4-pagos-en-efectivo.md`, «Encaje con la futura Caja chica»). Lo que el arquitecto no comparte del dictamen, o
que el código ya resolvió de otra forma, está marcado **[corrige el dictamen]** y va a §16 para que lo valide el contador.

Sirve a empresas de **cualquier rubro y régimen**: nada aquí supone ganado, fincas, régimen de IVA o ISR, ni que la
empresa sea agente de retención. Donde el régimen importa (bancarización, crédito fiscal), se lee de
`libro_de_compras.datos_fiscales_de_empresa` como en CP4 §5.2.

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Destinos del libro | `caja-chica` y `cuentas-por-liquidar` ya son claves de destino de Libro de compras (`DestinoDeDocumento`, check `destino in (…)` de `libro_de_compras.documentos`); cada destino atiende `<destino>.recibir_documento` | `libro-de-compras.contratos.ts`; `destinos-de-documentos-en-mediador.ts` |
| Módulos separados que dependen del libro | «Cuentas por pagar, Caja chica y Cuentas por liquidar son módulos separados que **dependen** de este» | `libro-de-compras.md`, Decisiones |
| Destino único | Un documento del libro va a **un** destino; la nota de crédito va al de su factura | `libro-de-compras.md` |
| Retenciones | Se calculan y **fijan al registrar** en el libro; el destino solo las descuenta | `libro-de-compras.md` |
| Fondo por localidad | Puede haber **varios fondos** por empresa, cada uno con su localidad | `plan-hallazgos-contables.md` (tabla de localidades) |
| Conceptos sugeridos | «Fondo de caja chica» (sin flujo) y «Reintegro de caja chica» (Operación) ya están en la semilla de Bancos, **sin clave de sistema** | `conceptos-iniciales.ts`; base de desarrollo |
| Retiro de CP4 | Programado en Cuentas por pagar (CP4-E1 a E4 en `main`): retiro, reparto a proveedores, recibo, liquidar, reabrir, anular | `diseno-cp4-pagos-en-efectivo.md` |
| Cheques a personas | «No negociable» encendido por omisión y **nunca al portador** (beneficiario obligatorio) | CP4-E-b |
| Custodio | Texto con **usuario opcional**; aviso si el custodio cierra lo suyo | CP4-E-h, E-8 |
| Faltante | Con motivo y auditoría; flujo de **Operación**; la cuenta (por cobrar o pérdida) la decide Contabilidad | CP4-E-g, E-1 |

## 0. La propuesta en una página

- **Dos módulos nuevos** (§2.2, CCL-a): `caja-chica` (fondos fijos a cargo de un custodio) y `cuentas-por-liquidar`
  (anticipos a una persona que debe justificarlos). Los dos `dependeDe: ['libro-de-compras', 'bancos']` (el segundo
  suma `terceros`). No se importan entre sí ni con Cuentas por pagar.
- **El retiro de CP4 se queda en Cuentas por pagar** (CCL-b): paga pasivos provisionados con contraseña; Caja chica paga
  gastos menores sin provisión; Cuentas por liquidar entrega dinero a una persona. Lo único compartido es la **regla de
  bancarización por proveedor y mes**, que pasa a Libro de compras y suma los tres módulos (§3.1).
- **Caja chica:** fondo fijo (CC-c), alcance por registro **por fondo** (quién lo ve y lo opera; el custodio queda
  asignado, CC-d y CC-e), apertura y cambios de monto por órdenes a Bancos, comprobantes (documentos del libro, vales de
  gasto sin factura, faltantes y sobrantes de arqueo), vales provisionales, reposición (cheque o nota al custodio con el
  desglose por concepto), arqueo por denominación y cierre.
- **Cuentas por liquidar:** anticipo a un tercero de Clientes (empleado o no), entregado por Bancos, con fecha límite;
  gastos (documentos del libro o sin documento); liquidación con devolución, reembolso o lo no liquidado (cobrar en
  cuotas, renta del trabajo o pérdida), con la lista «por liquidar» a una fecha de corte.
- **Fuera de los dos módulos:** Libro de compras (referencia de destino y bancarización compartida), Bancos (conceptos
  de sistema nuevos, revisión del módulo de origen para cualquier módulo, conceptos «reservados» que se eligen a mano
  solo sin su módulo, leyendas del flujo), Cuentas por pagar (responde la pregunta de bancarización; sin tablas
  nuevas) y el mediador (`preguntarATodos`, el mismo de EM-2).

## 1. Lo encontrado en el código y la base (verificado contra `main` el 2026-11-18)

1. **Módulos y dependencias:** `terceros` (`[]`), `bancos` (`[]`), `libro-de-compras` (`['terceros']`),
   `cuentas-por-pagar` (`['libro-de-compras', 'bancos']`); `empresas` es esencial. La prueba `llaves-entre-esquemas`
   admite llaves hacia `core`, los esenciales y el `dependeDe` **directo o transitivo**.
2. **Destinos:** `DestinosDeDocumentosEnMediador.activos` filtra `DESTINOS_DE_DOCUMENTO` por los módulos activos de la
   cuenta; `recibir` manda `${destino}.recibir_documento` con `DocumentoParaDestino` (`documentoId`, `tipo`, `proveedorId`,
   `documentoAfectadoId`, `facturaAnterior`, `fechaEmision`, `totalCentavos`, `retencionesCentavos` —la suma de todas
   las retenciones del documento—, `tieneActivoFijo`). Solo `cuentas-por-pagar.recibir_documento` está declarada. Los
   avisos `libro-de-compras.documento_por_anular` y `…_por_eliminar` llevan el `destino`. La orden
   `libro-de-compras.marcar_procesado` deja el documento procesado (ya no se elimina, solo se anula).
3. **Libro de compras ya cubre parte de C6 y C9 [corrige el dictamen]:** registra documentos **fuera del libro**
   (`muestra_en_reportes_sat = false`, motivos `sin_fel`, `fel_a_consumidor_final`, `fel_a_otro_nit`, `recibo_fel`, con
   `nit_receptor`), así que una factura a CF o a otro NIT **ya** queda sin crédito ni deducción; y ya registra la **factura
   especial** (`factura_especial`, FESP) emitida fuera de Arrancar, con sus retenciones fijas (IVA 100 %, ISR 5 %). Lo
   que no existe es **emitirla** desde Arrancar.
4. **Bancos:** cuentas solo `monetaria` o `ahorro` (no hay cuenta de caja). Órdenes de CP4-B2a:
   `emitir_cheque_de_origen`, `registrar_nota_de_origen`, `anular_movimiento_de_origen`, `fijar_desglose_de_conceptos`
   (líneas positivas que suman el monto; el concepto visible pasa a ser el de mayor monto) y el aviso
   `bancos.movimiento_por_cambiar`. **`RevisorDeCambios` solo sabe de Cuentas por pagar**: exige que **ese** módulo esté
   activo; el mediador **salta** los avisos de módulos inactivos, así que un movimiento con origen `caja-chica` se podría
   anular en Bancos con Caja chica apagada sin que nadie revise. Hay que generalizarlo (§3.2).
5. **Conceptos:** `CONCEPTOS_DE_SISTEMA` no se eligen a mano (`exigirConceptoElegible`), con una sola excepción (P3):
   `pago_a_proveedor` se elige en un cheque manual **si Cuentas por pagar no está activo**. «Fondo de caja chica» y
   «Reintegro de caja chica» son **sugeridos sin clave** (la base de desarrollo los tiene así en varias empresas):
   volverlos de sistema sin más los quitaría del uso manual de quien no tenga el módulo (§3.2).
6. **Bancarización en Cuentas por pagar:** `dominio/bancarizacion-de-pagos.ts` y `bancarizacion-en-efectivo.ts`
   (reglas puras), `evaluador-de-bancarizacion.ts`, el bloqueo `pg_advisory_xact_lock` con la clave
   `cuentas-por-pagar.bancarizacion:<empresa>:<proveedor>` y la variable `cuentas-por-pagar.bancarizacion.umbral`
   (instalación, Q30,000). La suma del mes solo ve los pagos de Cuentas por pagar (limitación E-6).
7. **Localidades:** `empresas.localidades` con alcance propio (`ALCANCE_DE_LOCALIDADES`, `accesos_a_localidades`, único
   `localidades_id_empresa_unico (id, empresa_id)` como destino de llaves compuestas).
8. **Alcance por registro:** `politicasDelRegistroConAlcance`, `politicaPorAlcance`, `politicaPorAlcanceOpcional` (la
   fila con la columna nula se ve), `politicasDeTablaDeAccesos` y el disparador `core.asignar_registro_al_creador` (corre
   como dueño, revisa que el usuario sea miembro de la empresa; no actúa al importar).
9. **Mediador:** órdenes (un manejador, con respuesta) y avisos (cero o varios, sin respuesta). EM-2
   (`diseno-em2-cierre-de-la-carga.md` §2, por aprobar) propone `mediador.preguntarATodos` (varios responden, con
   respuesta). Este diseño la necesita también (§3.1).
10. **Terceros:** `terceros.terceros` es por cuenta (`politicaPorCuenta`), con nombre, NIT y DPI. Los trabajadores
    salieron del módulo (migración `0002`): llegarán con Planilla, que dependerá de `terceros`.
11. **Base de desarrollo** (solo lectura, 2026-11-18): no existen los esquemas `caja_chica` ni `cuentas_por_liquidar`;
    `libro_de_compras.documentos` y `cuentas_por_pagar.retiros_de_efectivo` están vacías. **No hay datos que convertir.**
12. **Migraciones** (última de cada módulo en `main`): Bancos `0034_saldos_iniciales_con_partidas`, Libro de compras
    `0036_cp5_constancias_pendientes`, Cuentas por pagar `0012_cp5_indices_de_corte`. Se vuelve a verificar al generar.

## 2. Modelo

### 2.1 Tres cosas contables distintas (dictamen §4)

| Hecho | Qué es | Dónde | Cómo se cierra |
|---|---|---|---|
| **Retiro de efectivo para pagos** (CP4) | Efectivo para pagar **pasivos ya provisionados** (con contraseña) a proveedores, con recibo | `cuentas_por_pagar.retiros_de_efectivo` | Se liquida (depósito y faltante) |
| **Fondo de caja chica** | Efectivo **fijo** a cargo de un custodio para **gastos menores sin provisión**; se repone lo gastado | `caja_chica.fondos` | Cada reposición lo devuelve a su monto; se cierra al final |
| **Anticipo por liquidar** | Dinero entregado a **una persona** (empleado u otro) que debe justificarlo con documentos | `cuentas_por_liquidar.anticipos` | Se liquida (gastos, devolución, reembolso o lo no liquidado) |

Que Caja chica absorbiera el retiro (§9, camino 2) mezclaría el pasivo provisionado con el gasto directo y obligaría a
mover datos ya programados: **descartado** (CCL-b). Tampoco se agrega a Cuentas por pagar una forma de pago «desde la
caja» (§9, camino 1): la factura que se paga por contraseña se paga en efectivo con el retiro de CP4 (CC-q).

### 2.2 Uno o dos módulos (CCL-a)

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| **A. Dos módulos** `caja-chica` y `cuentas-por-liquidar` | Cada uno con su esquema, `modulo.ts`, permisos y su orden `recibir_documento` | Coincide con las claves de destino que ya existen; se activan por separado (una empresa puede querer solo uno); cada uno más chico | Algo de código parecido (custodio o beneficiario, bandeja, bancarización); se mitiga con contratos comunes en `core/contratos` |
| B. Un módulo con los dos destinos | `caja-chica` atiende las dos órdenes | Un solo esquema | El libro supone **destino = clave de módulo** (`activos` filtra por módulos activos): habría que cambiarlo; no se activan por separado |
| C. Un módulo «Efectivo» que absorba también el retiro de CP4 | — | — | Descartado por el contador y por CCL-b |

**Recomendado: A.** Sin dependencia entre ellos: el efectivo que el custodio da desde la caja para una compra es un
**vale provisional** de Caja chica (§5.5), no un anticipo.

| Módulo | `dependeDe` | Por qué | Llaves hacia |
|---|---|---|---|
| `caja-chica` | `['libro-de-compras', 'bancos']` | Recibe documentos del libro; abre, repone y cierra por Bancos | `core.empresas`, `core.usuarios`, `empresas.localidades` (esencial), `bancos.movimientos`, `bancos.cuentas_bancarias`, `libro_de_compras.documentos`, `libro_de_compras.conceptos_de_gasto`, `terceros.proveedores` (transitiva por el libro) |
| `cuentas-por-liquidar` | `['libro-de-compras', 'bancos', 'terceros']` | Igual, y el beneficiario es un tercero (se declara directo aunque ya llegue por el libro, por claridad) | Las anteriores y `terceros.terceros` |

### 2.3 La ecuación del fondo fijo

```
monto del fondo      = Σ apertura y aumentos vigentes − Σ disminuciones vigentes
pendiente de reponer = Σ comprobantes vigentes que no están en una reposición vigente
                       (cargos, vales de gasto y faltantes suman; notas de crédito y sobrantes restan)
efectivo esperado    = monto del fondo − pendiente de reponer − Σ vales provisionales abiertos
```

Siempre: efectivo + comprobantes pendientes + vales abiertos = monto del fondo (dictamen §2). Reponer devuelve el
efectivo al monto; el arqueo compara el efectivo contado con el esperado.

### 2.4 La ecuación del anticipo

```
monto + reembolsado = Σ gastos vigentes (cargos suman, notas de crédito restan) + devuelto + no liquidado
```

Mientras está abierto: `por justificar = monto − Σ gastos vigentes` (puede ser negativo si gastó de más). Al liquidar,
lo que sobra se devuelve o queda como «no liquidado» con su destino; lo que falta se reembolsa.

### 2.5 Cómo llega una factura al fondo o al anticipo (CCL-y)

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| **A. Enlace con referencia, y bandeja** | Desde la ficha del fondo (o del anticipo), «Agregar factura» abre **Ingreso de facturas** del libro con `?destino=caja-chica&referencia=<fondoId>`; el libro pasa `referenciaDeDestino` en la orden sin interpretarla. Sin referencia (Ingreso suelto, bandeja de DTE, Excel), el documento queda en la **bandeja** del destino y allí se asigna | Un solo paso en el caso común; el libro no conoce fondos ni anticipos; la bandeja de DTE no cambia | Un campo más en la orden y en el cuerpo de registro |
| B. Solo bandeja | Todo llega sin asignar | Sin tocar el libro | Dos pasos siempre |
| C. Selector de fondo en Ingreso de facturas | El libro pregunta los fondos al destino | Un paso | El libro conocería campos del destino (contra «la pantalla de ingreso no conoce los campos de cada módulo») |

**Recomendado: A.** Si con la referencia no se puede asignar (fondo cerrado, tope, fecha), el documento **no se pierde**:
queda en la bandeja con el aviso. Solo la retención (CC-f) **rechaza** el registro, porque ese documento nunca puede ir
a caja chica.

## 3. Cambios fuera de los dos módulos

### 3.1 Libro de compras

**a) Referencia de destino (paso CCL-L1).** `referenciaDeDestino: string | null` (uuid) en el cuerpo de
`POST /libro-de-compras/documentos` y en `DocumentoParaDestino` (opcional al leer, como `facturaAnterior`). El libro no
la guarda ni la valida (no es suya): solo la pasa. La pantalla de ingreso la toma de la consulta (`referencia`) junto con
`etiqueta` (solo para mostrar «Fondo: Finca El Roble», sin confianza) y `volver`. Sin migración.

**b) Bancarización compartida (paso CCL-BZ; dictamen C1).** Hoy la suma del mes por proveedor solo ve Cuentas por pagar.
Con tres módulos pagando en efectivo hace falta que **cada uno vea a los otros**, sin importarse:

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| **A. Libro evalúa, todos responden** | Orden **`libro-de-compras.evaluar_bancarizacion`** (la regla pura, el efecto fiscal por régimen y documento, el umbral y el bloqueo por proveedor viven en el libro) que junta lo pagado con la pregunta **`libro-de-compras.pagado_al_proveedor_en_el_mes`** (`preguntarATodos`), a la que responden Cuentas por pagar, Caja chica y Cuentas por liquidar | Una sola regla y un solo texto; el efecto fiscal ya es del libro (datos fiscales, régimen copiado al documento); el bloqueo es uno para todos | Mover código de Cuentas por pagar (sin cambiar su comportamiento) |
| B. Cada módulo pregunta y evalúa | La pregunta, y cada módulo copia la regla | Sin orden nueva | Tres copias de la regla y del texto |
| C. Sin suma compartida | Cada módulo mira solo lo suyo | Nada que hacer | Justo lo que el contador corrige (C1) |

**Recomendado: A.** Contrato (en `core/contratos/libro-de-compras.contratos.ts`):

- Pregunta `libro-de-compras.pagado_al_proveedor_en_el_mes` — datos `{ proveedorId, mes }` (`AAAA-MM-01`); respuesta
  `{ efectivoCentavos, bancarizadoCentavos, comprobantes: string[] }` (vigentes al momento, antes de retenciones; las
  etiquetas son «Recibo N», «Caja chica F, vale N», «Anticipo N»). Cuentas por pagar responde con sus pagos (como hoy la
  suma de CP4 §5.3); Caja chica con sus comprobantes de documento del proveedor; Cuentas por liquidar con sus gastos de
  documento del proveedor (como efectivo: §16, V-5).
- Orden `libro-de-compras.evaluar_bancarizacion` — datos `{ proveedorId, proveedorNombre, fecha, montoEnEfectivoCentavos,
  cargos: Array<{ documentoDeCompraId: string | null; etiqueta; totalCentavos; efectoDeSaldoInicial? }> }`; respuesta
  `{ resultado: 'libre' | 'avisar' | 'bloquear', mensaje: string | null, efecto: { iva, isr } | null, pagadoEnElMesCentavos }`.
  Toma **primero** `pg_advisory_xact_lock` con la clave **`libro-de-compras.bancarizacion:<empresa>:<proveedor>`** (la
  de Cuentas por pagar se cambia a esta, para que los tres módulos esperen el mismo turno).
  El módulo que llama decide qué hace con `bloquear`: Cuentas por pagar bloquea salvo permiso y motivo (CP4-E-d, sin
  cambio); Caja chica y Cuentas por liquidar, según CC-h.
- El texto de la limitación E-6 pasa a «Arrancar solo suma los pagos registrados en Arrancar».
- **Variable:** `libro-de-compras.bancarizacion.umbral` (instalación, Q30,000) **reemplaza** a
  `cuentas-por-pagar.bancarizacion.umbral` (que también usa CP2 para compensar con notas: Cuentas por pagar la lee con
  el `LectorDeConfiguracion` del core por su clave nueva). Migración de datos del libro (`0037_bancarizacion_compartida`,
  `--custom`, repetible): copia a la clave nueva las filas de instalación de `core.configuraciones` con la clave vieja.
  El JSON de instalación (`RUTA_CONFIG_INSTALACION`) no se migra: el paso lo anota para soporte.
- La regla con la caja: el **retiro** de CP4 no cuenta (es dinero de la empresa); sí cada pago en efectivo, cada
  comprobante de caja chica y cada gasto de anticipo con proveedor.

**c) Avisos que ya existen:** `documento_por_anular` y `documento_por_eliminar` los escuchan también los dos módulos
nuevos (§5.9, §7.6). Sin cambio en el libro.

### 3.2 Bancos (paso CCL-B1, migración `0035_caja_chica_y_cuentas_por_liquidar`)

**a) Conceptos de sistema nuevos** (en `CONCEPTOS_DE_SISTEMA`, `ClaveDeConceptoDeSistema` y, en las empresas que ya
tienen catálogo, por `insert`; a uno **sin clave con el mismo nombre** se le pone la clave; repetible, como la `0033`):

| Clave | Nombre | Aplica a | Flujo | Para |
|---|---|---|---|---|
| `fondo_de_caja_chica` | Fondo de caja chica (ya existe sugerido) | débito | Sin flujo | Apertura y aumento del fondo |
| `devolucion_de_fondo_de_caja_chica` | Devolución de fondo de caja chica | crédito | Sin flujo | Disminución y cierre (depósito) |
| `reintegro_de_caja_chica` | Reintegro de caja chica (ya existe sugerido) | débito | Operación «Reintegros de caja chica» | Reposición de gastos |
| `reintegro_de_caja_chica_de_activo` | Reintegro de caja chica de activo fijo | débito | Inversión «Compra de activos» | Reposición de comprobantes con activo fijo |
| `anticipo_por_liquidar` | Anticipos por liquidar | débito | Sin flujo | La parte del anticipo sin gastar (por justificar y devuelto) |
| `gasto_de_anticipo` | Gastos liquidados de anticipos | débito | Operación «Gastos liquidados de anticipos» | Lo gastado con el anticipo y el reembolso |
| `gasto_de_anticipo_de_activo` | Gastos liquidados de anticipos de activo fijo | débito | Inversión «Compra de activos» | Ídem con activo fijo |
| `anticipo_no_liquidado` | Anticipos no liquidados | débito | Operación «Anticipos no liquidados» (**por validar**, V-7) | Lo no liquidado (cobrar, renta del trabajo o pérdida) |
| `devolucion_de_anticipo` | Devolución de anticipos | crédito | Sin flujo | El depósito de lo que sobró |

El faltante de arqueo usa el `faltante_de_efectivo` que ya existe (Operación, CP4-E-g).

**b) Conceptos reservados por módulo (generaliza P3).** Para no quitarle «Fondo de caja chica» y «Reintegro de caja chica»
a quien los usa a mano sin el módulo: un mapa `CONCEPTOS_RESERVADOS_POR_MODULO` (`pago_a_proveedor` →
`cuentas-por-pagar`; las claves de §3.2 a → su módulo). Un concepto reservado se elige a mano en un **cheque o una nota**
solo si su módulo **no está activo**; activo, `ConceptoReservadoPorSuModulo` («Lo registra Caja chica»). El error y la
tolerancia `pagoAProveedores` de hoy se vuelven el caso general (`reservado | permitido` por clave). Los movimientos que
ya tienen ese concepto no cambian.

**c) Revisión del módulo de origen para cualquier módulo.** `CuentasPorPagarActivo` pasa a `ModulosDeOrigen.estaActivo(operador,
modulo)` (sobre `ModulosActivosDeLaCuenta`): un movimiento con `modulo_de_origen` X no se cambia si X está inactivo
(`ModuloDeOrigenInactivo`, con el nombre del módulo); lo marcado para Cuentas por pagar sigue igual. El motor de
sugerencias y la emisión de cheques usan el mismo puerto.

**d) Leyendas del flujo de efectivo** (pantalla, impresión y Excel; como la de CP4, Bancos lo sabe por sus conceptos):
con `reintegro_de_caja_chica*` en el período: «Los gastos de caja chica se muestran en la fecha de su reposición, no en la
del gasto.»; con `anticipo_por_liquidar` o `gasto_de_anticipo*`: «Los gastos de anticipos se muestran en la fecha de
entrega del anticipo.» Las dos son la misma limitación que P-CPE-2 (§8).

### 3.3 Cuentas por pagar (dentro de CCL-BZ)

Sin tablas nuevas. Responde `libro-de-compras.pagado_al_proveedor_en_el_mes` con la suma de CP4 §5.3 (todas las formas
salvo la cuenta de apertura), y su evaluador (`evaluador-de-bancarizacion.ts`, CP4 §5.4 y el aviso de CP2) llama la orden
del libro en vez de sumar y bloquear por su cuenta. Las reglas puras se mudan al libro con sus pruebas. Comportamiento
igual salvo que ahora ve los otros módulos. El reporte de CP5 «Pagos en efectivo sobre el umbral» seguirá mostrando solo
Cuentas por pagar hasta P-CCL-3.

### 3.4 Core: mediador

`mediador.preguntarATodos` y `PreguntasEntreModulos` como los propone EM-2 §2 (opción A). Si EM-2 ya lo programó, se usa;
si no, lo programa el primero de los dos pasos que llegue (CCL-M) y el otro solo lo usa.

## 4. Datos de Caja chica (esquema `caja_chica`)

Toda tabla lleva `empresa_id` (FK `core.empresas` on delete cascade), `politicaPorEmpresa()`, `...marcasDeTiempo` y
`...autoria`. Las llaves a otras tablas son **no action** salvo donde se dice. Dinero en `numeric(14,2)`.

### 4.1 `caja_chica.fondos` (recurso con alcance `caja-chica.fondos`)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK; es el `documento_de_origen_id` de sus movimientos de apertura, aumento, disminución y cierre |
| `nombre` | text | no | 1–80, sin espacios a los lados; único `fondos_nombre_unico (empresa_id, nombreNormalizado(nombre))` |
| `localidad_id` | uuid | sí | FK compuesta `fondos_localidad_fk (localidad_id, empresa_id) → empresas.localidades (id, empresa_id)`; índice parcial. Informativa (CC-d) |
| `tope_por_comprobante` | numeric(14,2) | sí | `> 0`; nulo = el de la empresa (`caja-chica.comprobantes.tope_por_omision`) |
| `cuenta_bancaria_id` | uuid | sí | FK `bancos.cuentas_bancarias (id)`; la que se propone para reponer y depositar; índice parcial |
| `origen` | text | no | `in ('banco', 'saldo_inicial')`; `saldo_inicial` solo con CC-AP (§14) |
| `fecha_de_apertura` | date | no | La del movimiento de apertura |
| `estado` | text | no | `default 'abierto'`; `in ('abierto', 'cerrado')` |
| `fecha_de_cierre`, `cerrado_en`, `cerrado_por`, `motivo_de_cierre` | date, timestamptz, uuid, text | sí | `fondos_cierre_completo`: `(estado = 'cerrado') = (los cuatro no nulos)`; motivo 1–300; `fecha_de_cierre >= fecha_de_apertura` |
| `observaciones` | text | sí | 1–500 |

Únicos e índices: `fondos_id_empresa_unico (id, empresa_id)` (destino de las llaves compuestas), `fondos_lista_idx
(empresa_id, estado)`. RLS: `politicaPorEmpresa()` + `politicasDelRegistroConAlcance(ALCANCE_DE_FONDOS)`; disparador
`asignar_al_creador` (`core.asignar_registro_al_creador('caja_chica.accesos_a_fondos', 'fondo_id')`).

El **monto** no se guarda: sale de `cambios_de_monto` (pocas filas por fondo). El custodio vigente, de
`custodios_de_fondos`.

### 4.2 `caja_chica.accesos_a_fondos`

`(empresa_id, usuario_id, fondo_id)` PK; `accesos_a_fondos_fondo_fk (fondo_id, empresa_id) → fondos` **on delete
cascade**; `accesos_a_fondos_miembro_fk (empresa_id, usuario_id) → core.empresa_usuarios` **on delete cascade**; índice
`(fondo_id)`; `politicasDeTablaDeAccesos(ALCANCE_DE_FONDOS)` (sin `select` con subconsulta). `ALCANCE_DE_FONDOS` en
`alcance-de-fondos.ts` (recurso `caja-chica.fondos`, tabla de accesos `caja_chica.accesos_a_fondos`, registro
`caja_chica.fondos`, columna `fondo_id`).

### 4.3 `caja_chica.custodios_de_fondos` (historial; un vigente por fondo)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `fondo_id` | uuid | no | FK compuesta a `fondos` |
| `custodio` | text | no | 1–150, sin espacios a los lados (sale en impresiones) |
| `custodio_usuario_id` | uuid | sí | FK `core.usuarios` **on delete set null**; índice parcial |
| `desde` | date | no | |
| `hasta` | date | sí | `hasta is null or hasta >= desde` |
| `motivo_del_cambio` | text | sí | 1–300; nulo solo en el primero (lo revisa el dominio) |
| `arqueo_de_entrega_id` | uuid | sí | FK compuesta a `arqueos` (CC-o) |

Único parcial `custodios_vigente_unico (fondo_id) where hasta is null`; índice `(fondo_id, desde)`. RLS: empresa +
`politicaPorAlcance(ALCANCE_DE_FONDOS, 'fondo_id')`.

**Disparador `caja_chica.asignar_fondo_al_custodio`** (CC-e; `after insert`, `security definer`, `search_path = ''`, como
`core.asignar_registro_al_creador`): si `custodio_usuario_id` no es nulo y es miembro de la empresa, inserta su acceso
(`on conflict do nothing`). Al cambiar de custodio el anterior **conserva** su acceso (se quita en la ventana de
asignación). Lo revisa `seguridad` (§16).

### 4.4 `caja_chica.cambios_de_monto`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `fondo_id` | uuid | no | FK compuesta a `fondos` |
| `tipo` | text | no | `in ('apertura', 'aumento', 'disminucion', 'cierre')` |
| `forma` | text | no | `in ('cheque', 'nota_de_debito', 'nota_de_credito', 'saldo_inicial', 'sin_deposito')`; check por tipo: apertura y aumento → cheque o nota de débito (apertura también `saldo_inicial`); disminución → nota de crédito; cierre → nota de crédito o `sin_deposito` |
| `fecha` | date | no | No futura (dominio) |
| `monto` | numeric(14,2) | no | `> 0`, salvo `cierre` (`>= 0`: lo que se depositó al cerrar) |
| `movimiento_id` | uuid | sí | FK `bancos.movimientos (id)`; único parcial; `(forma in ('saldo_inicial', 'sin_deposito')) = (movimiento_id is null)` |
| `estado`, `anulado_en`, `anulado_por`, `motivo_de_anulacion`, `fecha_de_anulacion` | | | `vigente`/`anulado`, con los checks de anulación completa de CP2-2 y `fecha_de_anulacion >= fecha` |

Únicos parciales: `cambios_apertura_unica (fondo_id) where tipo = 'apertura' and estado = 'vigente'` y lo mismo para
`cierre`. Índice `(fondo_id, fecha)`. RLS: empresa + alcance por `fondo_id`.

### 4.5 `caja_chica.comprobantes`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `fondo_id` | uuid | sí | FK compuesta a `fondos`; **nulo = en la bandeja** (solo documentos) |
| `clase` | text | no | `in ('documento', 'vale_de_gasto', 'faltante', 'sobrante')`; `clase <> 'documento'` exige `fondo_id` |
| `documento_de_compra_id` | uuid | sí | FK `libro_de_compras.documentos (id)`; único parcial; `(clase = 'documento') = (documento_de_compra_id is not null)` |
| `resta` | boolean | no | Nota de crédito o sobrante; check `resta = (clase = 'sobrante' or es_nota_de_credito)` con `es_nota_de_credito boolean` copiada al recibir |
| `documento_afectado_id` | uuid | sí | Comprobante de la factura que rebaja la nota (FK compuesta a `comprobantes`), solo en notas |
| `proveedor_id` | uuid | sí | FK `terceros.proveedores (id)`; obligatorio en documentos (copiado del libro) |
| `fecha` | date | no | La del gasto (pago en efectivo): por omisión, la emisión del documento; no futura; no anterior a la apertura del fondo |
| `monto` | numeric(14,2) | no | `> 0`; en documentos, su total (sin retenciones: CC-f) |
| `con_activo_fijo` | boolean | no | `default false`; del documento |
| `numero`, `anio_de_numero` | integer | sí, no | Solo vales de gasto (correlativo `caja-chica.vales`); único `(empresa_id, anio_de_numero, numero)` parcial |
| `descripcion` | text | sí | Obligatoria salvo en documentos; 1–300 |
| `pagado_a` | text | sí | Vale de gasto: a quién se pagó (1–150) |
| `concepto_de_gasto_id` | uuid | sí | FK compuesta `(concepto_de_gasto_id, empresa_id) → libro_de_compras.conceptos_de_gasto (id, empresa_id)`; obligatorio en vales de gasto |
| `motivo_sin_documento` | text | sí | Vale de gasto: por qué no hay factura (1–300); `(clase = 'vale_de_gasto') = (motivo_sin_documento is not null)` |
| `sobre_el_tope`, `motivo_sobre_el_tope` | boolean, text | no, sí | `(sobre_el_tope) = (motivo_sobre_el_tope is not null)` (CC-i) |
| `sin_bancarizar`, `motivo_sin_bancarizar` | boolean, text | no, sí | Marca de CC-h; el motivo solo si se elige B |
| `arqueo_id` | uuid | sí | FK compuesta a `arqueos`; `(clase in ('faltante', 'sobrante')) = (arqueo_id is not null)` |
| `destino_del_faltante` | text | sí | `in ('perdida', 'cobrar_al_custodio')`; `(clase = 'faltante') = (destino_del_faltante is not null)` |
| `vale_provisional_id` | uuid | sí | FK compuesta a `vales_provisionales` (CC-6) |
| `asignado_en`, `asignado_por` | timestamptz, uuid | sí | `(fondo_id is null) = (asignado_en is null)` |
| `estado`, `anulado_en`, `anulado_por`, `motivo_de_anulacion`, `fecha_de_anulacion` | | | `vigente`/`anulado` (vale anulado, documento anulado en el libro) con los checks completos |

Únicos e índices: `comprobantes_llave_unica (id, empresa_id, fondo_id)` (destino desde `reposicion_comprobantes`);
`comprobantes_fondo_idx (fondo_id, estado)`; `comprobantes_bandeja_idx (empresa_id) where fondo_id is null and estado =
'vigente'`; `comprobantes_proveedor_fecha_idx (proveedor_id, fecha) where proveedor_id is not null and estado = 'vigente'`
(bancarización); `comprobantes_arqueo_idx` y `comprobantes_vale_idx` parciales. RLS: empresa +
**`politicaPorAlcanceOpcional(ALCANCE_DE_FONDOS, 'fondo_id')`** (la bandeja, sin fondo, la ve quien tiene el permiso).

«Repuesto» no es una columna: es tener una fila vigente en `reposicion_comprobantes`.

### 4.6 `caja_chica.reposiciones` y `caja_chica.reposicion_comprobantes`

`reposiciones`:

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK; documento de origen del cheque o la nota |
| `fondo_id` | uuid | no | FK compuesta a `fondos` |
| `numero`, `anio_de_numero` | integer | no | Correlativo `caja-chica.reposiciones`; único por empresa |
| `fecha` | date | no | No futura; no anterior a ningún comprobante incluido |
| `forma` | text | no | `in ('cheque', 'nota_de_debito', 'compensada_al_cerrar')` |
| `monto` | numeric(14,2) | no | `> 0`; = Σ firmado de sus comprobantes (dominio) |
| `movimiento_id` | uuid | sí | FK `bancos.movimientos`; único parcial; `(forma = 'compensada_al_cerrar') = (movimiento_id is null)` |
| `custodio` | text | no | El custodio vigente al reponer (para la impresión) |
| `la_hizo_el_custodio` | boolean | no | Registro del aviso de CC-k |
| `estado` y anulación (con `fecha_de_anulacion`) | | | `vigente`/`anulada`, checks completos |

Único `reposiciones_llave_unica (id, empresa_id, fondo_id)`; índice `(fondo_id, fecha)`. RLS: empresa + alcance.

`reposicion_comprobantes`: `reposicion_id`, `comprobante_id`, `empresa_id`, `fondo_id`, `monto` (firmado, copiado),
`vigente boolean default true`. PK `(reposicion_id, comprobante_id)`; FK `(reposicion_id, empresa_id, fondo_id) →
reposiciones` y `(comprobante_id, empresa_id, fondo_id) → comprobantes` (las dos garantizan el **mismo fondo**); único
parcial `reposicion_comprobantes_vigente_unico (comprobante_id) where vigente` (un comprobante en una sola reposición
vigente; como `contrasena_documentos` de CP3). RLS: empresa + alcance.

### 4.7 `caja_chica.arqueos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `fondo_id` | uuid | no | FK compuesta |
| `numero`, `anio_de_numero` | integer | no | Correlativo `caja-chica.arqueos` |
| `realizado_en` | timestamptz | no | Fecha y hora del conteo; no futura |
| `arqueado_por` | uuid | no | FK `core.usuarios`; el usuario que registra (quien contó) |
| `custodio` / `custodio_usuario_id` | text / uuid | no / sí | El custodio vigente, copiado (firma del acta) |
| `lo_hizo_el_custodio` | boolean | no | CC-k |
| `conteo` | jsonb | no | Arreglo `[{ denominacionCentavos, cantidad }]` validado con Zod (billetes Q200, 100, 50, 20, 10, 5, 1; monedas Q1, 0.50, 0.25, 0.10, 0.05, 0.01); check `jsonb_typeof(conteo) = 'array'` |
| `efectivo_contado` | numeric(14,2) | no | `>= 0`; = Σ del conteo (dominio) |
| `valores_por_cambiar` | numeric(14,2) | no | `default 0`, `>= 0`: cheques de reposición aún sin cambiar que están en el fondo |
| `monto_del_fondo`, `pendiente_de_reponer`, `vales_abiertos` | numeric(14,2) | no | Lo que decía el sistema al contar |
| `efectivo_esperado` | numeric(14,2) | no | check `= monto_del_fondo − pendiente_de_reponer − vales_abiertos` |
| `diferencia` | numeric(14,2) | no | check `= efectivo_contado + valores_por_cambiar − efectivo_esperado` (negativa = faltante) |
| `comprobantes_completos` | boolean | no | El arqueador vio todos los comprobantes pendientes |
| `motivo_de_diferencia` | text | sí | `(diferencia <> 0) = (motivo_de_diferencia is not null)`; 1–300 |
| `observaciones` | text | sí | |
| `estado` y anulación (con `fecha_de_anulacion`) | | | `vigente`/`anulado` |

Índice `(fondo_id, realizado_en desc)`. RLS: empresa + alcance. El `jsonb` basta porque el arqueo no se edita (se anula)
y los reportes leen totales.

### 4.8 `caja_chica.vales_provisionales` (paso CC-6, CC-m)

`id`; `fondo_id` (FK compuesta); `numero`, `anio_de_numero` (`caja-chica.vales`, el mismo talonario que los vales de
gasto); `fecha`; `entregado_a` text 1–150 y `entregado_a_usuario_id` uuid nulo (set null); `monto > 0`; `motivo` 1–300;
`estado in ('abierto', 'liquidado', 'anulado')`; `fecha_de_liquidacion`, `liquidado_en`, `liquidado_por`; `devuelto
numeric(14,2) default 0, >= 0`; anulación completa con `fecha_de_anulacion`. Índice `(fondo_id, estado, fecha)`. RLS:
empresa + alcance.

### 4.9 Migraciones y datos existentes

`npm run generar -- modulo caja-chica --nombre "Caja chica" --descripcion "…" --icono Wallet` crea el esqueleto;
`0000_esquema` (el esquema y sus permisos, como los demás) y `0001_cc1_fondos_y_comprobantes` (todas las tablas,
checks, llaves, índices, RLS y los dos disparadores). **Sin datos que convertir** (módulo nuevo). Sin migración de
permisos (todos nuevos: el rol con acceso total los recibe solo). Los correlativos no necesitan fila previa.

## 5. Reglas de Caja chica

### 5.1 Abrir un fondo (`AbrirFondo`, `fondos.crear`)

1. Datos: nombre, localidad, custodio (texto o usuario de la empresa, activo y miembro: `CustodioInvalido`), monto,
   tope (opcional), cuenta bancaria por omisión, forma (cheque con chequera, o nota de débito con cuenta y boleta),
   beneficiario del cheque (por omisión el custodio; nunca al portador, como CP4-E-b) y «no negociable» (encendido).
2. Orden a Bancos con `origen = { modulo: 'caja-chica', documentoId: <fondo> }` y `conceptos = [{ fondo_de_caja_chica,
   monto }]`. Si Bancos rechaza, nada se guarda.
3. Inserta el fondo, el primer custodio (`desde` = fecha) y el cambio `apertura`. Sin auditoría (alta). Evento
   `caja-chica.fondo_abierto`.

### 5.2 Cambiar el custodio (`CambiarCustodio`, `fondos.editar`)

Cierra el vigente (`hasta` = fecha) y crea el nuevo con motivo. CC-o: la ventana **ofrece** registrar el arqueo de
entrega en el mismo paso (aviso si no se hace). Auditoría `corregir`, recurso `caja-chica.fondos`, `anterior` =
`FondoDto`. Evento `custodio_cambiado`.

### 5.3 Aumentar o disminuir el fondo (`fondos.cambiar-monto`)

- **Aumentar:** cheque o nota de débito con `fondo_de_caja_chica` (como 5.1). Sin auditoría.
- **Disminuir:** el custodio deposita; nota de crédito con `devolucion_de_fondo_de_caja_chica`. Exige `monto <= efectivo
  esperado` (`DisminucionMayorQueElEfectivo`) y que el fondo quede `> 0` (para llegar a cero se cierra). Auditoría
  `ajustar`, recurso `caja-chica.fondos`.
- Editar nombre, localidad, tope y cuenta: `fondos.editar`, auditoría `corregir` solo si cambia el tope.

### 5.4 Comprobantes

**a) Recibir un documento del libro** (`caja-chica.recibir_documento`, dentro de la transacción del libro):

1. **Retención** (CC-f): `retencionesCentavos > 0` → `DocumentoConRetencionEnCajaChica` («Este documento lleva retención:
   regístrelo con destino Cuentas por pagar; si lo paga en efectivo, use un retiro de efectivo.»). Se deshace el registro.
2. Crea el comprobante (`clase = 'documento'`, `monto = total`, proveedor, activo fijo, nota de crédito con su factura si
   está aquí; si su factura no está en caja chica: `FacturaDeLaNotaNoRecibida`, como Cuentas por pagar).
3. Con `referenciaDeDestino`: intenta asignarlo al fondo (b). Si no se puede, queda en la bandeja y responde el aviso
   («Quedó en la bandeja de Caja chica: …»). Sin referencia, a la bandeja.
4. Sin auditoría (alta). Responde `{ avisos }` (los de b, incluida la bancarización).

**b) Asignar documentos de la bandeja a un fondo** (`AsignarDocumentos`, `comprobantes.crear`, 1–100 a la vez, todo o
nada): fondo abierto y visible; `fecha` (por omisión la emisión; editable) no futura ni anterior a la apertura; la nota
de crédito va al fondo de su factura (`NotaEnOtroFondo`); **tope** (CC-i): `monto > tope` exige
`comprobantes.sobre-el-tope` y motivo (`ComprobanteSobreElTope`); **bancarización** (CC-h) con la orden del libro: con
`bloquear`, marca `sin_bancarizar` y da el aviso (A) o exige permiso y motivo (B); con `avisar`, solo el aviso. Aviso
(no bloquea) si el documento está **fuera del libro** («No da crédito fiscal ni es deducible: …», del motivo del libro;
cubre C6). Evento `comprobante_asignado`.

**c) Devolver un documento a la bandeja** (`comprobantes.crear`): solo si no está repuesto. Auditoría `corregir`,
recurso `caja-chica.comprobantes`, con motivo.

**d) Vale de gasto** (`RegistrarValeDeGasto`, `comprobantes.crear`; CC-g): con `caja-chica.vales_de_gasto.permitidos`;
fecha, monto `<= caja-chica.vales_de_gasto.tope` (si no, `ValeDeGastoSobreElTope`; con el permiso de sobre el tope y
motivo, pasa), descripción, pagado a, concepto de gasto (activo, del libro) y motivo sin documento. Número
`caja-chica.vales`. Siempre **no deducible** (dictamen L10). Para imprimir y firmar (vale con «Recibí»).

**e) Anular un vale de gasto** (`comprobantes.anular`): no repuesto; auditoría `anular`, recurso
`caja-chica.comprobantes`, `anterior` = `ComprobanteDto`, con motivo.

**f) Que el efectivo alcance:** ninguna asignación puede dejar el **efectivo esperado** negativo
(`ComprobantesMayoresQueElEfectivo`: «Con esto el fondo gastaría Q… más de lo que tiene: registre el faltante con un
arqueo o revise los montos.»). Con el fondo bloqueado (`for update`).

### 5.5 Vales provisionales (paso CC-6)

- **Entregar** (`vales.crear`): monto `<= efectivo esperado`; número `caja-chica.vales`; para imprimir y firmar.
- **Liquidar** (`vales.liquidar`): se le asignan los documentos de la bandeja o vales de gasto que salieron de él
  (`vale_provisional_id`) y lo que regresó (`devuelto`); `devuelto = max(0, monto − Σ comprobantes)` (si gastó de más,
  la diferencia salió del fondo y la ecuación sigue cuadrando).
- **Anular** solo abierto y sin comprobantes; auditoría `anular`.
- Aviso «vale viejo» a los `caja-chica.vales_provisionales.dias_para_avisar` (5 por omisión) en la ficha, la lista y el
  arqueo.

### 5.6 Reponer (`RegistrarReposicion`, `reposiciones.crear`; CC-j: un paso)

1. Fondo abierto, bloqueado. El usuario elige los comprobantes pendientes (por omisión todos los vigentes asignados,
   menos vales provisionales abiertos), forma, cuenta o chequera, fecha y beneficiario (el custodio vigente).
2. `monto = Σ firmado > 0` (`ReposicionSinMonto`). **Desglose** (líneas positivas que suman el monto):
   `reintegro_de_caja_chica` (lo de comprobantes sin activo fijo, menos sobrantes y notas de crédito),
   `reintegro_de_caja_chica_de_activo` (con activo fijo) y `faltante_de_efectivo` (faltantes); si los que restan pasan
   de la línea de Operación, se rebajan de la de activo (regla pura con pruebas).
3. Orden `emitir_cheque_de_origen` o `registrar_nota_de_origen` (débito) con origen = la reposición y ese desglose.
4. Número `caja-chica.reposiciones`; inserta la reposición y sus líneas. Por cada documento del libro,
   `libro-de-compras.marcar_procesado` (ya no se elimina, solo se anula).
5. CC-k: si quien repone es el custodio vigente, aviso o bloqueo según `caja-chica.control.separacion_de_funciones`.
6. Sin auditoría (alta). Evento `reposicion_registrada` (con las líneas por comprobante: documento, concepto, activo,
   deducible). La impresión «Reposición N» (y antes, desde la ficha, la **solicitud** con los pendientes por concepto y
   firmas «Presentó (custodio)», «Revisó», «Autorizó») sale en el cliente.

**Anular una reposición** (`reposiciones.anular`): con motivo y fecha del inverso; `noEstarCobrado` aplica
(`ReposicionCobrada`: «El banco ya pagó el cheque de la reposición N.»); orden `anular_movimiento_de_origen`; líneas
`vigente = false` (los comprobantes vuelven a pendientes); `marcar_procesado(false)` de los documentos que no estén en
otra reposición vigente; `fecha_de_anulacion` como CP5-a. Auditoría `anular`, recurso `caja-chica.reposiciones`. Evento.

### 5.7 Arqueo (`RegistrarArqueo`, `arqueos.crear`; CC-l: opcional con aviso)

1. Fondo abierto, bloqueado. El sistema calcula monto, pendiente y vales; el arqueador escribe el conteo, los valores
   por cambiar, si los comprobantes están completos y observaciones.
2. CC-k: si el arqueador es el custodio vigente, aviso o bloqueo (misma variable).
3. Con `diferencia <> 0`: motivo obligatorio y se crea el comprobante `faltante` (con `destino_del_faltante`:
   `perdida` o `cobrar_al_custodio`, dictamen C10) o `sobrante`, con `arqueo_id`. Auditoría `ajustar`, recurso
   `caja-chica.arqueos`, `anterior` = `FondoDto` (el estado antes del ajuste). Sin diferencia, sin auditoría.
4. Impresión «Acta de arqueo» (conteo por denominación, comprobantes, vales, diferencia, firmas del arqueador y del
   custodio).
5. Aviso «sin arqueo» si el último vigente pasa de `caja-chica.arqueos.dias_para_avisar` (30; 0 = sin aviso).

**Anular un arqueo** (`arqueos.anular`): si su faltante o sobrante no está repuesto; anula también ese comprobante.
Auditoría `anular`.

### 5.8 Cerrar el fondo (`CerrarFondo`, `fondos.cerrar`; CC-n)

Sin vales provisionales abiertos (`FondoConValesAbiertos`). Lo pendiente se liquida en una **reposición compensada**
(`forma = 'compensada_al_cerrar'`, sin movimiento) y el efectivo que queda se **deposita** (cambio `cierre`, nota de
crédito con `devolucion_de_fondo_de_caja_chica`; `sin_deposito` si no queda nada). Si hay diferencia con lo contado, se
pide antes un arqueo. Fondo `cerrado` con motivo; auditoría `cerrar` (acción de EM-2; si aún no existe se suma a
`AccionAuditada`, sin migración), `anterior` = `FondoDto`. Evento `fondo_cerrado` (con la reposición compensada). El
flujo de Bancos no ve esos últimos gastos (no hubo movimiento): la leyenda de §3.2 d lo cubre como reporte de gestión.

Un fondo cerrado no se reabre (se abre otro). Antes de cerrar, la apertura se puede **anular** si el fondo no tiene
comprobantes, arqueos ni cambios vigentes (`fondos.cerrar`; orden `anular_movimiento_de_origen`; auditoría `anular`).

### 5.9 Avisos de otros módulos

| Aviso | Comprobante o movimiento | Qué hace Caja chica |
|---|---|---|
| `libro-de-compras.documento_por_anular` / `…_por_eliminar` (destino `caja-chica`) | Comprobante no repuesto | Lo anula (`estado = 'anulado'`, motivo del aviso); auditoría `anular` |
| Ídem | Comprobante repuesto | Rechaza `ComprobanteRepuesto` («Está en la reposición N: anúlela primero.») |
| `bancos.movimiento_por_cambiar` `anular` | Apertura o aumento | Rechaza si el fondo tiene comprobantes, arqueos o reposiciones vigentes; si no, anula el cambio (y el fondo, si era la apertura) |
| Ídem | Disminución o depósito de cierre | Rechaza `MovimientoDeCajaChica` (se corrige desde Caja chica) |
| Ídem | Reposición | Anula la reposición (como 5.6 sin volver a ordenar) |
| `eliminar`, `blanquear`, `corregir` | Cualquiera | Bancos ya los rechaza por tener origen; el manejador rechaza igual |

Idempotentes, en la transacción de quien avisa.

### 5.10 Estado al corte (dictamen C3)

`pendiente al corte` = comprobantes vigentes al corte (`fecha <= corte` y `fecha_de_anulacion` nula o `> corte`) que al
corte no estaban en una reposición vigente (reposición con `fecha <= corte` y no anulada al corte). Sirve para el reporte
CC-R1 (gastos por reconocer en el período) y para Contabilidad.

## 6. Datos de Cuentas por liquidar (esquema `cuentas_por_liquidar`)

Mismas convenciones que §4. **Sin alcance por registro** en esta versión (CL-u): RLS por empresa.

### 6.1 `cuentas_por_liquidar.anticipos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK; documento de origen de la entrega, la devolución y el reembolso |
| `numero`, `anio_de_numero` | integer | no | Correlativo `cuentas-por-liquidar.anticipos`; único por empresa |
| `beneficiario_id` | uuid | no | FK `terceros.terceros (id)` (CL-t); índice `(beneficiario_id, estado)`. El dominio exige que sea de la cuenta |
| `beneficiario` | text | no | Nombre como estaba (1–150) |
| `es_empleado` | boolean | no | P7: decide si cabe «renta del trabajo» |
| `beneficiario_usuario_id` | uuid | sí | FK `core.usuarios` on delete set null; aviso E-8 si liquida él mismo |
| `clase` | text | no | `in ('viatico', 'compra', 'otro')` |
| `descripcion` | text | no | 1–300 |
| `localidad_id` | uuid | sí | FK compuesta a `empresas.localidades`; informativa |
| `fecha` | date | no | La del cheque o la nota; no futura |
| `fecha_limite` | date | no | `>= fecha`; por omisión `fecha + cuentas-por-liquidar.anticipos.dias_para_liquidar` |
| `monto` | numeric(14,2) | no | `> 0` |
| `forma` | text | no | `in ('cheque', 'nota_de_debito')` (la transferencia a la cuenta del empleado es una nota de débito con su referencia) |
| `movimiento_id` | uuid | no | FK `bancos.movimientos`; único |
| `motivo_con_vencidos` | text | sí | Si se entregó a quien tenía vencidos con el permiso (CL-r) |
| `estado` | text | no | `default 'abierto'`; `in ('abierto', 'liquidado', 'anulado')` |
| `fecha_de_liquidacion`, `liquidado_en`, `liquidado_por` | | sí | Liquidación completa (como `retiros_liquidacion_completa`) |
| `devuelto` / `movimiento_de_devolucion_id` | numeric / uuid | no / sí | `(devuelto > 0) = (movimiento… is not null)`; único parcial |
| `reembolsado` / `movimiento_de_reembolso_id` | numeric / uuid | no / sí | Igual; `reembolsado > 0` exige `devuelto = 0 and no_liquidado = 0` |
| `no_liquidado` / `destino_de_no_liquidado` | numeric / text | no / sí | `in ('cobrar', 'renta_del_trabajo', 'perdida')`; `(no_liquidado > 0) = (destino… is not null)`; `renta_del_trabajo` exige `es_empleado` |
| `cuotas` | smallint | sí | Solo `cobrar`; `cuotas >= 1`; el dominio pide 5 o más salvo «pago voluntario» (L9, CL-s) |
| `motivo_de_no_liquidado` | text | sí | Obligatorio con `no_liquidado > 0` |
| anulación con `fecha_de_anulacion` | | | Completa, como en CP4 |

Checks de estado como `retiros_de_efectivo` (abierto sin liquidar: todo en cero; `devuelto + no_liquidado <= monto`).
Únicos: `anticipos_llave_unica (id, empresa_id)`; índice `anticipos_lista_idx (empresa_id, estado, fecha_limite)`.

### 6.2 `cuentas_por_liquidar.gastos`

Como `caja_chica.comprobantes` reducido: `id`; `anticipo_id` nulo (**bandeja**) con FK compuesta; `clase in ('documento',
'sin_documento')`; `documento_de_compra_id` (único parcial, FK al libro); `resta` (nota de crédito); `proveedor_id`;
`fecha`; `monto > 0`; `con_activo_fijo`; `descripcion`, `pagado_a`, `concepto_de_gasto_id` (FK compuesta al libro),
`motivo_sin_documento`, **`tratamiento_sin_documento in ('no_deducible', 'renta_del_trabajo')`** (por validar, V-6;
`renta_del_trabajo` solo si el anticipo es de un empleado, lo revisa el dominio); `sin_bancarizar`; `asignado_en`,
`asignado_por`; estado y anulación. Índices: `(anticipo_id)`, bandeja parcial, `(proveedor_id, fecha)` parcial. RLS por
empresa.

### 6.3 Migraciones

`generar -- modulo cuentas-por-liquidar`; `0000_esquema` y `0001_cl1_anticipos_y_gastos`. Sin datos que convertir; sin
migración de permisos.

## 7. Reglas de Cuentas por liquidar

### 7.1 Entregar un anticipo (`EntregarAnticipo`, `anticipos.crear`)

Beneficiario (tercero de la cuenta; alta rápida desde la ventana), es empleado, clase, descripción, monto, fecha, fecha
límite, forma (cheque a nombre del beneficiario, no negociable encendido, nunca al portador; o nota de débito con
referencia). **Vencidos** (CL-r): si el beneficiario tiene anticipos abiertos con `fecha_limite < hoy`, aviso; con
`cuentas-por-liquidar.anticipos.bloquear_con_vencidos`, rechazo `BeneficiarioConVencidos` salvo
`anticipos.con-vencidos` y motivo. Aviso C8 si no es empleado: «Las facturas deben venir a nombre y NIT de la empresa.»
Orden a Bancos con `conceptos = [{ anticipo_por_liquidar, monto }]`. Evento `anticipo_entregado`.

### 7.2 Gastos

- `cuentas-por-liquidar.recibir_documento`: igual que 5.4 a (retención → `DocumentoConRetencionEnAnticipo`, V-4;
  referencia = el anticipo abierto; si no, bandeja).
- **Asignar** (`gastos.crear`): anticipo abierto; fecha no anterior a la entrega; bancarización con la orden del libro
  (CC-h, igual que caja chica); aviso si el documento está fuera del libro (C6).
- **Gasto sin documento** (`gastos.crear`): con `cuentas-por-liquidar.gastos_sin_documento.permitidos`; concepto, motivo
  y tratamiento (por omisión `no_deducible`; ver V-6).
- **Quitar** (`gastos.anular`): solo con el anticipo abierto; documento a la bandeja o gasto sin documento anulado;
  auditoría `corregir` / `anular`, recurso `cuentas-por-liquidar.gastos`.

### 7.3 Liquidar (`LiquidarAnticipo`, `anticipos.liquidar`)

1. Anticipo abierto, bloqueado (movimiento de Bancos → anticipo → gastos). `por justificar = monto − Σ gastos`.
2. Si `por justificar > 0`: `devuelto + no_liquidado = por justificar` (`LiquidacionNoCuadra`). Devolución → orden
   `registrar_nota_de_origen` (crédito, `devolucion_de_anticipo`). No liquidado → destino (CL-s), cuotas y motivo.
3. Si `por justificar < 0`: `reembolsado = −por justificar`, por orden a Bancos (cheque o nota de débito, concepto
   `gasto_de_anticipo`/`…_de_activo` según los gastos) — CL-v.
4. **Desglose** del movimiento de entrega (`fijar_desglose_de_conceptos`, como el retiro de CP4 §4.2): `gasto_de_anticipo`
   y `…_de_activo` (lo gastado hasta el monto), `anticipo_no_liquidado` (lo no liquidado) y `anticipo_por_liquidar` (el
   resto: devuelto). Se vuelve a fijar al reabrir.
5. Fecha no futura ni anterior al último gasto. Aviso E-8 si liquida el propio beneficiario.
6. Auditoría **solo si hay no liquidado** (`ajustar`, recurso `cuentas-por-liquidar.anticipos`, con motivo). Por cada
   documento, `marcar_procesado`. Evento `anticipo_liquidado` (con destino y cuotas: lo leerá Planilla).
7. Impresión «Liquidación del anticipo N» con los gastos, deducibles y no deducibles, y firmas (beneficiario, revisó,
   autorizó), y la autorización del descuento en cuotas cuando aplica (texto del Código de Trabajo art. 99 **por
   validar**).

**Reabrir** (`anticipos.liquidar`): con motivo; anula por orden el depósito o el reembolso (si su mes está conciliado y
Bancos rechaza, no se reabre); limpia la liquidación; `marcar_procesado(false)`; fija el desglose. Auditoría `reabrir`.

**Anular** (`anticipos.anular`): abierto y sin gastos vigentes; `noEstarCobrado` (`AnticipoCobrado`); orden
`anular_movimiento_de_origen`; `fecha_de_anulacion` como CP5-a; auditoría `anular`.

### 7.4 Por liquidar con fecha de corte

Como la lista de retiros (CP4 §4.5): anticipos con `fecha <= corte`, vigentes al corte y abiertos al corte; **por
justificar al corte** y **antigüedad** (días desde la entrega y desde la fecha límite). Aviso fijo en la lista y en la ficha
de los vencidos.

### 7.5 Avisos de otros módulos

Los mismos de 5.9: documento del libro (quita el gasto si el anticipo está abierto; si está liquidado, rechaza
`AnticipoLiquidado`), y `bancos.movimiento_por_cambiar` sobre la entrega (con gastos → rechaza; sin gastos y abierto →
anula), la devolución o el reembolso (reabre).

## 8. Contabilidad y flujo de efectivo (para los eventos; Contabilidad no existe todavía)

| Hecho | Partida propuesta (**por validar**, V-1) | Flujo en Bancos |
|---|---|---|
| Abrir o aumentar el fondo | Debe Caja chica (fondo, a cargo del custodio) / Haber Bancos | Sin flujo |
| Documento asignado al fondo | Debe Gasto (+ IVA crédito fiscal si aplica) / Haber Caja chica | En la reposición |
| Vale de gasto | Debe Gasto no deducible / Haber Caja chica | En la reposición |
| Faltante de arqueo | Debe Pérdida (no deducible sin prueba, L11) o Cuenta por cobrar al custodio / Haber Caja chica | Operación (en la reposición) |
| Sobrante de arqueo | Debe Caja chica / Haber Otros ingresos | Resta de la reposición (Operación) |
| Reposición | Debe Caja chica / Haber Bancos | Operación o Inversión (desglose) |
| Disminución o cierre | Debe Bancos / Haber Caja chica | Sin flujo |
| Vale provisional | Sin partida (movimiento dentro del fondo) | — |
| Entrega del anticipo | Debe Anticipos por liquidar (cuenta por cobrar al beneficiario, C5) / Haber Bancos | Sin flujo hasta liquidar |
| Gasto del anticipo | Debe Gasto (+ IVA) / Haber Anticipos por liquidar | Desglose de la entrega |
| Gasto sin documento | Debe Gasto no deducible (o Viáticos no liquidados, renta del trabajo) / Haber Anticipos | Ídem |
| Devolución | Debe Bancos / Haber Anticipos por liquidar | Sin flujo |
| Reembolso | Debe Gasto / Haber Bancos | Operación o Inversión |
| No liquidado: cobrar / renta del trabajo / pérdida | Reclasifica a Cuentas por cobrar a empleados / Sueldos (renta gravada, ISR en planilla) / Gasto no deducible | Operación (V-7) |

**Momento del gasto de caja chica (V-1):** la propuesta lo reconoce **al asignar el documento al fondo** (contra Caja
chica) y la reposición solo repone el efectivo. Así el gasto queda en su período sin una «liquidación de corte» (C3), y
el reporte CC-R1 sirve de control. La alternativa clásica (gasto al reponer) obliga a la partida de corte de C3.

**Limitación aceptada como reporte de gestión** (igual que P-CPE-2): el flujo de Bancos pone los gastos de caja chica en
la fecha de la **reposición** y los de anticipos en la fecha de la **entrega**; el cierre compensado de un fondo no
aparece. Leyendas de §3.2 d. Debe resolverse antes de los estados financieros de Contabilidad.

## 9. Permisos, auditoría, errores, eventos y configuración

### 9.1 Permisos (`modulo.ts`, PLAN §3.5)

**Caja chica:**

| Permiso | Para |
|---|---|
| `caja-chica.fondos.ver` | Lista y ficha de los fondos que ve (alcance), bandeja, comprobantes, reposiciones, arqueos y vales |
| `caja-chica.fondos.ver-todos` | Alcance total del recurso `caja-chica.fondos` |
| `caja-chica.fondos.asignar` | Ventana de asignación de fondos a usuarios |
| `caja-chica.fondos.crear` | Abrir un fondo (crea el cheque o la nota en Bancos sin pedir permisos de Bancos) |
| `caja-chica.fondos.editar` | Nombre, localidad, tope, cuenta y cambio de custodio |
| `caja-chica.fondos.cambiar-monto` | Aumentar y disminuir |
| `caja-chica.fondos.cerrar` | Cerrar, y anular una apertura sin uso |
| `caja-chica.comprobantes.crear` | Asignar documentos, devolverlos a la bandeja, registrar vales de gasto |
| `caja-chica.comprobantes.anular` | Anular vales de gasto |
| `caja-chica.comprobantes.sobre-el-tope` | Asignar o registrar sobre el tope, con motivo |
| `caja-chica.comprobantes.efectivo-sin-bancarizar` | Solo si CC-h = B |
| `caja-chica.vales.crear` / `.liquidar` / `.anular` | Vales provisionales |
| `caja-chica.reposiciones.crear` / `.anular` | Reponer y anular |
| `caja-chica.arqueos.crear` / `.anular` | Arqueos |
| `caja-chica.reportes.ver` / `.exportar` | Reportes de §12 |

`recursosConAlcance`: `{ clave: 'caja-chica.fondos', permisoVerTodos: 'caja-chica.fondos.ver-todos', permisoAsignar:
'caja-chica.fondos.asignar', alcance: ALCANCE_DE_FONDOS }`.

**Cuentas por liquidar:** `anticipos.ver`, `.crear`, `.anular`, `.liquidar` (también reabrir), `.con-vencidos`;
`gastos.crear`, `.anular`; `reportes.ver`, `.exportar` (todos con prefijo `cuentas-por-liquidar.`).

Ninguno `soloSuperacceso`; sin `eliminar` (todo se anula). Sin Excel de importación (Operación); los reportes exportan.

### 9.2 Auditoría (todo en la unidad de trabajo del caso de uso; `core.auditoria` solo se agrega)

| Hecho | Acción | Recurso | `anterior` |
|---|---|---|---|
| Abrir, aumentar, asignar, vale de gasto, reponer, arqueo sin diferencia, entregar, gasto, liquidar sin no liquidado | ninguna (alta) | — | — |
| Cambiar custodio, cambiar tope | `corregir` | `caja-chica.fondos` | `FondoDto`; motivo |
| Disminuir | `ajustar` | `caja-chica.fondos` | `FondoDto` |
| Cerrar el fondo / anular la apertura | `cerrar` / `anular` | `caja-chica.fondos` | `FondoDto`; motivo |
| Devolver un documento a la bandeja / anular un vale de gasto o un comprobante por aviso del libro | `corregir` / `anular` | `caja-chica.comprobantes` | `ComprobanteDto`; motivo |
| Arqueo con diferencia / anular arqueo | `ajustar` / `anular` | `caja-chica.arqueos` | `FondoDto` / `ArqueoDto` |
| Anular reposición (aquí o por aviso) | `anular` | `caja-chica.reposiciones` | `ReposicionDto` |
| Anular vale provisional | `anular` | `caja-chica.vales-provisionales` | `ValeProvisionalDto` |
| Liquidar con no liquidado / reabrir / anular anticipo | `ajustar` / `reabrir` / `anular` | `cuentas-por-liquidar.anticipos` | `AnticipoDto`; motivo |
| Quitar un gasto | `corregir` / `anular` | `cuentas-por-liquidar.gastos` | `GastoDto` |

### 9.3 Errores nuevos (código propio; familias del core)

Caja chica (`dominio/errores-*.ts`): `CustodioInvalido`, `BeneficiarioInvalido` (al portador), `FondoNoDisponible`
(cerrado o no visible), `FechaDelComprobanteInvalida`, `DocumentoConRetencionEnCajaChica`, `FacturaDeLaNotaNoRecibida`,
`NotaEnOtroFondo`, `ComprobanteSobreElTope`, `ValeDeGastoSobreElTope`, `ValesDeGastoNoPermitidos`,
`ComprobantesMayoresQueElEfectivo`, `ComprobanteRepuesto`, `ReposicionSinMonto`, `ReposicionCobrada`,
`ReposicionYaAnulada`, `DisminucionMayorQueElEfectivo`, `FondoConValesAbiertos`, `SeparacionDeFunciones` (CC-k con
bloqueo), `MotivoDeDiferenciaObligatorio`, `ArqueoConComprobanteRepuesto`, `MovimientoDeCajaChica`. Cuentas por
liquidar: `BeneficiarioConVencidos`, `DocumentoConRetencionEnAnticipo`, `AnticipoNoDisponible`, `AnticipoLiquidado`,
`AnticipoCobrado`, `AnticipoConGastos`, `LiquidacionNoCuadra`, `RentaDelTrabajoSoloEmpleados`, `CuotasInsuficientes`,
`GastosSinDocumentoNoPermitidos`, `MovimientoDeCuentasPorLiquidar`. Los mensajes van en el paso de cada uno (en
español, con el número y el monto).

### 9.4 Contratos y eventos (`core/contratos/caja-chica.contratos.ts` y `cuentas-por-liquidar.contratos.ts`)

- Órdenes: `caja-chica.recibir_documento` y `cuentas-por-liquidar.recibir_documento` (`DocumentoParaDestino` →
  `{ avisos }`). Respuestas a la pregunta `libro-de-compras.pagado_al_proveedor_en_el_mes`.
- Eventos de Caja chica (dinero en centavos): `fondo_abierto`, `monto_del_fondo_cambiado`, `custodio_cambiado`,
  `comprobante_asignado` (documento o vale, con concepto, deducible, activo fijo), `comprobante_quitado`,
  `reposicion_registrada` y `reposicion_anulada` (con sus líneas), `arqueo_registrado` (con diferencia y destino),
  `arqueo_anulado`, `fondo_cerrado`. De Cuentas por liquidar: `anticipo_entregado`, `gasto_asignado`, `gasto_quitado`,
  `anticipo_liquidado` (devuelto, reembolsado, no liquidado, destino, cuotas), `anticipo_reabierto`, `anticipo_anulado`.
  Nadie los escucha todavía (Contabilidad y Planilla).
- La pregunta de EM-2 `empresas.revisar_cierre_de_carga` solo con CC-AP / CL-AP.

### 9.5 Configuración (solo `instalacion` y `empresa`, en el `configuracion.ts` de cada módulo)

| Clave | Esquema | Por omisión | Para |
|---|---|---|---|
| `caja-chica.comprobantes.tope_por_omision` | número `>= 0` (0 = sin tope) | 2,000 | Tope por comprobante si el fondo no tiene el suyo (dictamen §5: bajo Q2,500) |
| `caja-chica.vales_de_gasto.permitidos` | booleano | `true` | CC-g |
| `caja-chica.vales_de_gasto.tope` | número `>= 0` | 200 | Tope del vale de gasto |
| `caja-chica.vales_provisionales.dias_para_avisar` | entero `0–60` | 5 | Vale viejo |
| `caja-chica.arqueos.dias_para_avisar` | entero `0–365` | 30 | CC-l |
| `caja-chica.control.separacion_de_funciones` | `'avisar' \| 'bloquear'` | `'avisar'` | CC-k |
| `cuentas-por-liquidar.anticipos.dias_para_liquidar` | entero `1–365` | 15 | Fecha límite propuesta (la ley no fija plazo, L8) |
| `cuentas-por-liquidar.anticipos.bloquear_con_vencidos` | booleano | `false` | CL-r |
| `cuentas-por-liquidar.gastos_sin_documento.permitidos` | booleano | `true` | Gastos sin documento |
| `libro-de-compras.bancarizacion.umbral` | número `> 0` | 30,000 | Solo `instalacion` (reemplaza la de Cuentas por pagar, §3.1) |

## 10. API

**Caja chica** (`/api/caja-chica`):

| Método y ruta | Permiso | Cuerpo / consulta | Respuesta |
|---|---|---|---|
| `GET /fondos` | `fondos.ver` | `estado?`, `localidadId?`, `pagina`, `limite` | `FondoResumenDto` (nombre, localidad, custodio, monto, efectivo esperado, pendiente, vales, último arqueo, avisos) |
| `GET /fondos/:id` | `fondos.ver` | — | `FondoDto` (custodios, cambios de monto, pendientes, `puede*`, avisos) |
| `POST /fondos` | `fondos.crear` | `{ nombre, localidadId?, custodio?, custodioUsuarioId?, monto, topePorComprobante?, cuentaBancariaId?, forma, chequeraId?, chequeId?, beneficiario?, noNegociable?, referencia?, fecha? }` | 201, `FondoDto` con avisos de Bancos |
| `PATCH /fondos/:id` | `fondos.editar` | `{ nombre?, localidadId?, topePorComprobante?, cuentaBancariaId?, motivo? }` | `FondoDto` |
| `POST /fondos/:id/custodio` | `fondos.editar` | `{ custodio?, custodioUsuarioId?, fecha?, motivo, arqueo? }` | `FondoDto` |
| `POST /fondos/:id/aumentar` · `/disminuir` | `fondos.cambiar-monto` | forma, monto, cuenta o chequera, fecha, referencia | `FondoDto` |
| `POST /fondos/:id/cerrar` · `/anular-apertura` | `fondos.cerrar` | `{ motivo, fecha?, cuentaBancariaId?, referencia? }` | `FondoDto` |
| `GET /bandeja` | `fondos.ver` | `proveedorId?`, `desde?`, `hasta?` | Documentos sin fondo |
| `GET /fondos/:id/comprobantes` | `fondos.ver` | `estado? (pendiente \| repuesto \| anulado)`, `corte?` | `ComprobanteDto[]` con totales |
| `POST /fondos/:id/comprobantes/documentos` | `comprobantes.crear` (+ `sobre-el-tope` si trae motivo) | `{ documentos: [{ comprobanteId, fecha?, motivoSobreElTope?, motivoSinBancarizar? }] }` (1–100) | 201, comprobantes y avisos |
| `POST /comprobantes/:id/devolver-a-la-bandeja` | `comprobantes.crear` | `{ motivo }` | `ComprobanteDto` |
| `POST /fondos/:id/vales-de-gasto` | `comprobantes.crear` | `{ fecha?, monto, descripcion, pagadoA, conceptoDeGastoId, motivoSinDocumento, motivoSobreElTope?, valeProvisionalId? }` | 201 |
| `POST /comprobantes/:id/anular` | `comprobantes.anular` | `{ motivo }` | `ComprobanteDto` |
| `GET /fondos/:id/reposiciones` · `GET /reposiciones/:id` | `fondos.ver` | — | `ReposicionDto` (con líneas por concepto para imprimir) |
| `POST /fondos/:id/reposiciones` | `reposiciones.crear` | `{ comprobanteIds, forma, fecha?, chequeraId?, chequeId?, cuentaBancariaId?, beneficiario?, noNegociable?, referencia? }` | 201 |
| `POST /reposiciones/:id/anular` | `reposiciones.anular` | `{ motivo, fecha? }` | `ReposicionDto` |
| `GET /fondos/:id/arqueos` · `GET /arqueos/:id` | `fondos.ver` | — | `ArqueoDto` (para el acta) |
| `GET /fondos/:id/arqueos/propuesta` | `arqueos.crear` | — | Monto, pendiente, vales y esperado de ahora |
| `POST /fondos/:id/arqueos` | `arqueos.crear` | `{ realizadoEn?, conteo, valoresPorCambiar?, comprobantesCompletos, observaciones?, motivoDeDiferencia?, destinoDelFaltante? }` | 201 |
| `POST /arqueos/:id/anular` | `arqueos.anular` | `{ motivo }` | `ArqueoDto` |
| `GET/POST /fondos/:id/vales-provisionales`, `POST /vales-provisionales/:id/liquidar` · `/anular` | `fondos.ver`, `vales.*` | — | — |
| Accesos a fondos (como `accesos-a-localidades`) | `fondos.asignar` | — | — |
| `GET /reportes/…` y `…/exportar` (§12) | `reportes.ver` / `.exportar` | `corte`, `desde`, `hasta`, `fondoId?` | — |

**Cuentas por liquidar** (`/api/cuentas-por-liquidar`): `GET /anticipos` (`estado?`, `corte?`, `beneficiarioId?`,
`vencidos?`), `GET /anticipos/:id`, `POST /anticipos`, `POST /anticipos/:id/anular`, `GET /bandeja`, `POST
/anticipos/:id/gastos/documentos`, `POST /anticipos/:id/gastos/sin-documento`, `POST /gastos/:id/quitar`, `POST
/anticipos/:id/liquidar` (`{ fecha?, devuelto, cuentaBancariaId?, referencia?, noLiquidado, destinoDeNoLiquidado?,
cuotas?, motivoDeNoLiquidado?, reembolso?: { forma, chequeraId?, cuentaBancariaId? } }`), `POST /anticipos/:id/reabrir`,
reportes. La prueba de API cubre cada ruta sin su permiso (403) y un fondo no asignado (404 por RLS, no 403).

## 11. Cliente

**Caja chica** (`cliente/src/modulos/caja-chica/`, menú «Caja chica», sección **Operación**; reportes en **Reportes**):

- `paginas/Fondos.vue`: tarjetas (`TarjetaDeRegistro`) con monto, efectivo esperado, pendiente y avisos (sin arqueo, vale
  viejo); «Abrir fondo» (`VentanaDeFondo`: custodio texto o usuario, forma, cuenta, chequera con el siguiente número de
  `bancos.medios_de_pago`, no negociable, ayuda IVE-BA-03 como CP4).
- `paginas/FichaDeFondo.vue` (≤ 120 líneas): resumen de la ecuación, secciones plegables Comprobantes pendientes
  (con «Agregar factura» → Ingreso de facturas con referencia; «Desde la bandeja»; «Vale de gasto»), Reposiciones,
  Arqueos, Vales provisionales, Custodios; acciones «Reponer», «Arqueo», «Cambiar custodio», «Aumentar», «Disminuir»,
  «Cerrar», «Imprimir solicitud de reposición».
- `paginas/BandejaDeCajaChica.vue`: documentos sin fondo, marcar y «Asignar a…».
- `paginas/NuevaReposicion.vue` (formulario en página): comprobantes marcables con totales por concepto y el desglose
  que irá a Bancos, medio de pago, aviso de CC-k.
- `componentes/VentanaDeArqueo.vue`: conteo por denominación (cantidades → total en vivo), valores por cambiar,
  esperado, diferencia, motivo y destino del faltante. Lógica pura en `composables/arqueos/conteo.ts` con pruebas.
- Impresiones (página con `window.print()`, en claro): vale de gasto, vale provisional, solicitud de reposición,
  reposición, acta de arqueo. Total en letras con la función del core.
- Lógica pura con `*.prueba.ts`: ecuación del fondo, desglose de la reposición, armado de cuerpos, avisos.

**Cuentas por liquidar** (menú «Cuentas por liquidar», Operación): `Anticipos.vue` (lista con corte, vencidos,
antigüedad), `VentanaDeAnticipo` (beneficiario con alta rápida de tercero, es empleado, clase, monto, forma, fecha
límite propuesta, aviso de vencidos), `FichaDeAnticipo.vue` (gastos, «Agregar factura», «Gasto sin documento», por
justificar), `LiquidarAnticipo.vue` (formulario en página: devuelto, no liquidado con destino y cuotas, reembolso; cuadra
en vivo), `BandejaDeCuentasPorLiquidar.vue`, impresión de la liquidación.

**Libro de compras:** Ingreso de facturas lee `destino`, `referencia`, `etiqueta` y `volver` de la consulta, muestra
«Para: Fondo X» y, al guardar, vuelve a la ficha.

## 12. Reportes (sección Reportes: imprimir y exportar)

| # | Reporte | Contenido |
|---|---|---|
| CC-R1 | Comprobantes pendientes de reponer al corte | Por fondo: documento, proveedor, fecha, concepto, deducible, monto; total (C3) |
| CC-R2 | Reposiciones del período | Por fondo y concepto de gasto, deducible y no deducible, con su cheque o nota |
| CC-R3 | Gastos sin documento fiscal | Vales de gasto y documentos fuera del libro del período (no deducibles) |
| CC-R4 | Estado de los fondos al corte | Monto, efectivo esperado, pendiente, vales, último arqueo y su diferencia |
| CC-R5 | Arqueos del período | Con diferencias y su destino |
| CL-R1 | Anticipos por liquidar al corte | Por beneficiario, con antigüedad y vencidos |
| CL-R2 | Lo no liquidado | Por destino (cobrar en cuotas, renta del trabajo, pérdida), para Planilla y Contabilidad |

Pendiente (P-CCL-3): el reporte de bancarización consolidado (los tres módulos) con la pregunta del libro.

## 13. Convivencia y riesgos

1. **Suma de bancarización y alcance:** la respuesta de Caja chica a la pregunta debe sumar **todos** los fondos de la
   empresa, también los que el usuario no ve. Con RLS por alcance la suma saldría corta. Propuesta: una función
   `caja_chica.pagado_en_efectivo_al_proveedor(proveedor uuid, desde date, hasta date) returns numeric`, `security definer`,
   que toma la empresa de `app.empresa_id` (no por parámetro) y devuelve **solo el total**. Lo revisa `seguridad` (V-S1).
   Cuentas por liquidar no tiene alcance: no lo necesita.
2. **Orden de bloqueo:** movimiento en Bancos → fondo o anticipo → bancarización (advisory del libro) → comprobantes o
   gastos → documentos del libro (`marcar_procesado`). Igual que CP4; no invierte ningún orden existente.
3. **Libro de compras:** `referenciaDeDestino` es opcional; destinos viejos y pruebas no la traen. La orden de recibir
   corre en la transacción del libro: la retención rechaza todo; lo demás, aviso y bandeja.
4. **Bancos:** el cambio de `RevisorDeCambios` y de los conceptos reservados toca reglas de Cuentas por pagar: sus
   pruebas (P3, cheque manual sin Cuentas por pagar) deben seguir en verde.
5. **Cuentas por pagar:** CCL-BZ mueve su evaluador; no va en paralelo con otro paso de Cuentas por pagar que toque la
   bancarización (hoy, CP5-5 si sigue abierto).
6. **Rendimiento:** la ecuación de un fondo suma pocas filas con índices por `fondo_id`; la lista de fondos usa una
   consulta con sumas agrupadas (no N+1). La pregunta de bancarización usa los índices `(proveedor_id, fecha)`.
7. **Borrar la empresa:** cascadas por `empresa_id`; las llaves `no action` se revisan al final del comando.
8. **Saldos iniciales:** sin CC-AP / CL-AP, una empresa que ya tenía su caja chica la abre con un cheque nuevo o espera
   ese paso (CC-p).

## 14. Pasos (un commit cada uno; servidor y cliente por separado)

Servidor con `programador-backend`, cliente con `programador-frontend`, QA con `pruebas-qa`. Cada commit corre `npm run
revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`. **Dos carriles en paralelo** (Caja chica y Cuentas por
liquidar son módulos y esquemas distintos), cada uno con su base de pruebas; los pasos compartidos (M, L1, B1, BZ) van
uno por módulo a la vez.

| Paso | Qué | Va después de |
|---|---|---|
| **CCL-0** (docs) | Este diseño y el dictamen | — |
| **CCL-M** (core) | `preguntarATodos` y `PreguntasEntreModulos` (EM-2 §2), con pruebas | Aprobación (lo comparte con EM-2: el primero que llegue) |
| **CCL-L1** (Libro, servidor y cliente) | `referenciaDeDestino` en el cuerpo y en `DocumentoParaDestino`; Ingreso de facturas con `referencia`, `etiqueta` y `volver`. Pruebas: pasa tal cual al destino; sin ella, igual que hoy | Aprobación; en paralelo con CCL-B1 |
| **CCL-B1** (Bancos, servidor) | Migración **`0035`** (nueve conceptos, §3.2 a), `ClaveDeConceptoDeSistema`, conceptos reservados por módulo (§3.2 b), `ModulosDeOrigen` (§3.2 c), leyendas (§3.2 d). Pruebas: migración repetible (y la clave puesta al sugerido del mismo nombre), concepto reservado a mano con y sin su módulo, movimiento con origen de un módulo inactivo (rechazo), las de P3 siguen | Aprobación; nunca con otra migración de Bancos (BS-x) |
| **CC-1** (Caja chica, datos) | Esqueleto del módulo, migraciones `0000` y `0001`, tablas, RLS, alcance, disparadores, permisos declarados. Pruebas de tablas: cada check, llaves compuestas (mismo fondo en la reposición), único vigente de custodio y de reposición por comprobante, bandeja visible sin fondo, fondo no asignado invisible, disparador del custodio, `politicas-de-los-modulos`, `llaves-entre-esquemas` | Aprobación (puede ir antes de CCL-B1: solo usa tablas que existen) |
| **CL-1** (Cuentas por liquidar, datos) | Igual para su esquema | En paralelo con CC-1 |
| **CCL-BZ** (Libro y Cuentas por pagar, servidor) | Orden `evaluar_bancarizacion`, pregunta, umbral movido (`0037`), clave del bloqueo, Cuentas por pagar responde y llama la orden. Pruebas: las de CP4-E3 sin cambio de resultado; un pago en efectivo de Cuentas por pagar que ve lo de un destino de prueba | CCL-M; sin otro paso de Cuentas por pagar sobre la bancarización |
| **CC-2** (fondos) | Abrir, custodio, aumentar, disminuir, editar, anular apertura, lista, ficha, accesos, manejador de Bancos, eventos | CC-1 y CCL-B1 |
| **CC-3** (comprobantes) | Recibir, bandeja, asignar, devolver, vales de gasto, tope, retención, ecuación, avisos del libro, bancarización y su respuesta (función `security definer`) | CC-2, CCL-L1 y CCL-BZ |
| **CC-4** (reposiciones) | Reponer con desglose, anular (aquí y por aviso), `marcar_procesado`, datos de las impresiones | CC-3 |
| **CC-5** (arqueos) | Propuesta, registrar con diferencia (faltante o sobrante), anular, avisos | CC-3 |
| **CC-6** (vales provisionales) | Entregar, liquidar, anular, aviso de vale viejo | CC-3 |
| **CC-7** (cierre) | Cerrar con reposición compensada y depósito | CC-4, CC-5 y CC-6 |
| **CC-8 / CC-9** (cliente) | 8: fondos, ficha, bandeja, comprobantes, vales de gasto, Ingreso con referencia. 9: reposición, arqueo, vales provisionales, cierre, impresiones | CC-4 (8) y CC-7 (9) |
| **CC-10** (reportes, servidor y cliente) | CC-R1 a R5 | CC-7 |
| **CC-11** (QA) | Abrir con cheque no negociable; factura desde la ficha; factura con retención (rechazo); vale sobre el tope (permiso); reponer (desglose en Bancos); arqueo con faltante; custodio que repone (aviso); usuario sin el fondo asignado (no lo ve); bancarización con una factura de caja chica y un cheque de Cuentas por pagar al mismo proveedor; cerrar; celular | CC-9 y CC-10 |
| **CL-2** (anticipos) | Entregar (vencidos, aviso C8), anular, lista con corte, manejador de Bancos, eventos | CL-1 y CCL-B1 |
| **CL-3** (gastos) | Recibir, bandeja, asignar, sin documento, quitar, bancarización y su respuesta | CL-2, CCL-L1 y CCL-BZ |
| **CL-4** (liquidar) | Liquidar (devuelto, reembolso, no liquidado), desglose, reabrir, impresión | CL-3 |
| **CL-5** (cliente) | Pantallas de §11 | CL-4 |
| **CL-6** (reportes) | CL-R1 y CL-R2 | CL-4 |
| **CL-7** (QA) | Viático con dos facturas y un gasto sin documento; devolución; reembolso; no liquidado en cuotas (5 o más) y como renta (solo empleado); vencidos con bloqueo; anular desde Bancos (rechazo con gastos) | CL-5 y CL-6 |
| CC-AP / CL-AP (después) | Fondos y anticipos que ya existían a la fecha de inicio (`origen = 'saldo_inicial'`, carga abierta) y su respuesta a `empresas.revisar_cierre_de_carga` | Si el usuario elige CC-p = A; con EM-2 |

## 15. Preguntas para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| **CCL-a** | ¿Uno o dos módulos? | A. Dos (`caja-chica`, `cuentas-por-liquidar`). B. Uno con los dos. C. Uno que también absorba el retiro de CP4 | **A** (§2.2): ya son destinos separados del libro y se activan por separado |
| **CCL-b** (P8) | ¿El retiro de efectivo de CP4 se queda en Cuentas por pagar? | Se queda / Caja chica lo absorbe | **Se queda**: son tres cosas contables distintas; solo se comparte la bancarización |
| **CCL-y** | ¿Cómo llega una factura a su fondo o anticipo? | A. Enlace desde la ficha con referencia, y bandeja. B. Solo bandeja. C. Selector en Ingreso de facturas | **A** (§2.5) |
| **CCL-z** | ¿Bancarización sumada entre los tres módulos? | A. Libro evalúa y todos responden. B. Cada módulo evalúa. C. Sin suma compartida | **A** (§3.1 b) |
| **CC-c** (P1) | Tipo de fondo | Solo fijo / fijo y fluctuante | **Solo fijo** |
| **CC-d** (P2) | ¿Quién ve y opera un fondo? | A. Alcance propio por fondo (asignación por usuario). B. Por localidad (quien ve la localidad ve sus fondos). C. Las dos | **A**, con la localidad informativa: el custodio de un fondo no necesita ver toda la localidad |
| **CC-e** | ¿El custodio usuario recibe acceso a su fondo solo? | A. Sí, con un disparador al nombrarlo. B. No: lo asigna quien tiene `fondos.asignar` | **A** (revisión de seguridad) |
| **CC-f** (P3) | Factura con retención con destino Caja chica (o Cuentas por liquidar) | A. Rechazarla al registrar, sin excepción. A′. Rechazar con permiso de excepción. B. Permitir el neto. C. Aviso | **A** [corrige el dictamen, que pedía A′]: si hay que pagarla en efectivo, Cuentas por pagar ya lo hace con el retiro (constancia y entero incluidos) |
| **CC-g** (P4) | Gastos sin factura (vale de gasto) | Permitir (no deducible, motivo, tope Q200) / No | **Permitir**, configurable por empresa |
| **CC-h** | Bancarización en caja chica y anticipos (el efectivo **ya salió** cuando se registra) | A. Aviso y marca «sin bancarizar». B. Bloqueo con permiso y motivo, como CP4. C. Nada | **A** [corrige el dictamen, que pedía B]: bloquear después de pagar solo impide registrar lo que ya pasó |
| **CC-i** | Pasarse del tope por comprobante (Q2,000 por omisión, por fondo o por empresa) | A. Permiso y motivo. B. Aviso. C. Rechazo | **A** |
| **CC-j** | Reposición | Un paso (quien tiene el permiso repone; la solicitud se imprime) / Dos (solicitar y aprobar) | **Un paso**; las aprobaciones de Bancos no aplican a las órdenes de módulos (como Cuentas por pagar, P-13) |
| **CC-k** | El custodio repone o arquea su propio fondo | Avisar / Bloquear / Configurable por empresa | **Configurable**, `avisar` por omisión (empresas pequeñas con una sola persona) |
| **CC-l** (P9) | Arqueo | Obligatorio / Opcional con aviso a los N días | **Opcional, aviso a los 30 días** |
| **CC-m** | Vales provisionales en esta versión | Sí (paso CC-6) / Después | **Sí** |
| **CC-n** | Cerrar un fondo con comprobantes pendientes | A. Reposición real y depósito del monto completo. B. Compensada: se deposita lo que queda y lo pendiente se liquida sin pago (con leyenda en el flujo). C. Exigir reponer antes | **B** |
| **CC-o** | Cambio de custodio | Exigir arqueo de entrega / Ofrecerlo con aviso / Nada | **Ofrecerlo con aviso** |
| **CC-p** | Fondos y anticipos que ya existían a la fecha de inicio | A. Paso aparte después (como U8). B. En esta versión. C. No: se abren de nuevo | **A** |
| **CC-q** | ¿Pagar desde la caja chica una factura de Cuentas por pagar? | No / Sí (forma «caja» en Cuentas por pagar) | **No** (destino único; para eso está el retiro de CP4) |
| **CL-r** (P5) | Anticipo vencido | Aviso / Aviso y bloqueo configurable de nuevos anticipos | **Aviso y bloqueo configurable** (apagado por omisión), con permiso de excepción |
| **CL-s** (P6) | Salida de lo no liquidado | Devolución / cobrar en cuotas (5 o más, salvo pago voluntario) / renta del trabajo (solo empleados) / pérdida | **Las cuatro**; cuotas y renta las ejecutará Planilla |
| **CL-t** (P7) | Beneficiario del anticipo | A. Tercero de Clientes (con DPI o NIT), marca «es empleado» y usuario opcional. B. Texto libre | **A**: identifica a la persona y sirve a Planilla |
| **CL-u** | ¿Quién ve los anticipos? | Por permiso (todos) / Cada beneficiario los suyos / Por localidad | **Por permiso** en esta versión |
| **CL-v** | Si gastó más que el anticipo | Reembolso por Bancos al liquidar / Queda como saldo a favor | **Reembolso por Bancos** |
| **CL-w** | Plazo para liquidar (la ley no lo fija) | 15 días configurable / otro | **15 días**, configurable por empresa |

## 16. Para validar antes de programar

**Con `contador-guatemala`:**

- **V-1.** Momento del gasto de caja chica: al asignar el documento al fondo (contra Caja chica) en vez de al reponer
  (§8); y si con eso basta para C3.
- **V-2.** CC-h: aviso y marca en vez de bloqueo (el pago en efectivo ya ocurrió al registrar).
- **V-3.** CC-f: rechazo sin excepción, porque el retiro de CP4 ya paga en efectivo con retención y constancia.
- **V-4.** Facturas con retención en un anticipo (p. ej. un empleado de un agente de retención que compra a un pequeño
  contribuyente sobre Q2,500): ¿rechazar igual que en caja chica?
- **V-5.** Gasto de un anticipo pagado por el empleado con **su** tarjeta: ¿cuenta como efectivo para la suma de
  bancarización (el pagador no es el contribuyente) o como bancarizado?
- **V-6.** Gasto sin documento de un empleado en un viático: ¿solo no deducible para la empresa o también renta del
  trabajo del empleado (L7)? Y el tratamiento por omisión.
- **V-7.** Flujo de efectivo de `anticipo_no_liquidado` (Operación) y de la cuenta por cobrar al empleado (Operación o
  Inversión, NIC 7 párr. 16; P4 de los conceptos).
- **V-8.** C9 está desactualizado: el libro **ya registra** la factura especial emitida fuera de Arrancar, con retención
  de IVA 100 % e ISR 5 %. ¿Sirve para documentar viáticos en Cuentas por liquidar, y cómo se trata su retención si V-4
  la rechaza?
- **V-9.** C6: el libro ya deja fuera del libro una FEL a CF o a otro NIT (con `nit_receptor`); el aviso al asignar basta.
- **V-10.** Texto de la autorización del descuento en cuotas (Código de Trabajo art. 99) para la impresión de la
  liquidación.
- **V-11.** Los cinco puntos de §7 del dictamen (texto oficial) antes de ponerlos en las ayudas.

**Con `seguridad`:**

- **V-S1.** La función `security definer` que suma lo pagado al proveedor sin alcance (§13.1).
- **V-S2.** El disparador que asigna el fondo al custodio (§4.3, CC-e): quien nombra custodio da acceso sin
  `fondos.asignar`.

**Interpretaciones del arquitecto (a confirmar al programar, no frenan):** 1–100 documentos por asignación; un talonario
de vales para vales de gasto y provisionales; los sobrantes se restan de la línea de Operación de la reposición; el
anterior custodio conserva su acceso; la nota de crédito va al fondo de su factura aunque esté repuesta (el proveedor
devolvió efectivo al fondo).

## 17. Pendientes

- **P-CCL-1:** foto del vale firmado, del acta de arqueo y de la liquidación como archivos (con la revisión de archivos).
- **P-CCL-2:** flujo de efectivo con la fecha del gasto (como P-CPE-2), antes de los estados financieros.
- **P-CCL-3:** reporte de bancarización consolidado de los tres módulos (extiende el de CP5).
- **P-CCL-4:** fondo fluctuante, si CC-c lo pide después.
- **P-CCL-5:** «cambiar destino» de un documento del libro sin anularlo (hoy se anula con causa `error_de_captura` y se
  vuelve a registrar).
- **P-CCL-6:** Planilla: escuchar `anticipo_liquidado` (cuotas y renta del trabajo) cuando exista.

## Respuestas del usuario (2026-11-18)

- **CC-f:** **A′ (lo del contador):** una factura con retención se rechaza en Caja chica y en Cuentas por liquidar, salvo
  con un **permiso de excepción** y motivo (auditado).
- **CC-h:** **A (lo del arquitecto):** al llegar al umbral de bancarización, aviso y marca «sin bancarizar» (y sale en el
  reporte), sin bloquear.
- **CCL-a, CCL-b, CCL-y, CCL-z, CC-d y CC-e:** las recomendaciones: dos módulos; el retiro de CP4 se queda en Cuentas por
  pagar; «Agregar factura» desde la ficha y, si no, bandeja; Libro de compras evalúa la bancarización y los tres módulos
  responden; alcance propio por fondo; el custodio usuario recibe el acceso al nombrarlo.
- **Lo demás (CC-g, CC-i, CC-k, CC-c, CC-l, CC-m, CC-j, CC-n, CC-p, CL-r, CL-s, CL-t, CL-u, CL-v, CL-w):** todas las
  recomendaciones.
