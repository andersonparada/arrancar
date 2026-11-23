# Diseño de Libro de ventas y Cuentas por cobrar — arquitecto de datos, 2026-11-18

_Agente `arquitecto-de-datos`. Base contable y fiscal: `dictamen-cuentas-por-cobrar-y-ventas-2026-11-18.md`
(contador-guatemala, mismo día, «correcto con ajustes»). Aterriza «Cuentas por cobrar / Ventas» de `docs/HOJA-DE-RUTA.md`
(«Módulos grandes que faltan planificar»: incluye las **retenciones que les hacen** a las empresas y sus constancias).
Lo que el arquitecto no comparte del dictamen, o que el código ya resolvió de otra forma, va marcado **[corrige el
dictamen]** y pasó a §18 para que lo validara el contador._

**Estado (2026-11-19):** el usuario aceptó todas las recomendaciones de §17 y el contador validó §17 y §18
(`dictamen-cuentas-por-cobrar-y-ventas-validacion-2026-11-19.md`, «correcto con ajustes»). Las correcciones ya están en el
texto, marcadas **[validación 2026-11-19]**; el resumen, lo pendiente y las preguntas nuevas, al final («Respuestas del
usuario (2026-11-19)», «Validación del contador (2026-11-19)» y «Preguntas nuevas (2026-11-19)»). **La tabla de §16 está
lista para programar**: empieza por VC-0a.

Sirve a empresas de **cualquier rubro y régimen**: nada aquí supone ganado, fincas, tabaco, régimen de IVA o ISR, ni que
la empresa o sus clientes sean agentes de retención. Lo que cambia según el régimen de la empresa (columnas del libro,
retenciones que puede sufrir, formulario) se lee del historial fiscal que ya existe
(`libro_de_compras.datos_fiscales_de_empresa`, con vigencia mensual), igual que hacen Caja chica, CP4 y Activos fijos.

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Destinos y avisos | El libro fiscal manda cada documento a **un** destino con una orden `<destino>.recibir_documento`; antes de anular o eliminar avisa a todos (`documento_por_anular` / `…_por_eliminar`) y el destino revierte o rechaza | `libro-de-compras.contratos.ts`; CP1 |
| Saldos derivados | Los saldos no se guardan: se calculan de documentos, aplicaciones, ajustes y bajas (U4) | `diseno-datos-cuentas-por-pagar.md` |
| Plazo por cuenta | Los días de crédito viven en el módulo de cartera, por cuenta, y se editan como **sección aportada** en el formulario del tercero | `diseno-plazo-de-credito-del-proveedor.md` |
| Carga inicial | Una sola fecha de corte por empresa; saldos iniciales documento por documento, solo con la carga **abierta**; cada módulo responde la «pregunta a todos» del cierre y el aviso de cambio de fecha de inicio | `HOJA-DE-RUTA.md`; `diseno-em2-cierre-de-la-carga.md` |
| Bancos por órdenes | Un módulo de cartera crea sus movimientos con `bancos.registrar_nota_de_origen` / `bancos.emitir_cheque_de_origen` y conceptos de sistema; Bancos le avisa antes de cambiarlos (`bancos.movimiento_por_cambiar`) | `bancos.contratos.ts`; CP4 |
| Multimoneda | Monto en su moneda y equivalente en quetzales al lado, guardado al hacerlo; los montos fiscales en GTQ; un módulo futuro con partidas monetarias «solo se suscribe» a la pregunta del diferencial | `diseno-multimoneda.md` §2, §6.4, §6.5, §9.2 |
| Pequeño contribuyente | Aviso de ventas del año frente al límite anual, monto configurable por año (Q500,285 en 2026) | `dictamen-pendientes-libro-de-compras-2026-11-08.md` P-8; `investigacion-sat-2237-y-2046.md` |
| Lector de `.xls` de la SAT | Lector propio CFB + BIFF8, sin dependencias | `evaluacion-lectura-xls.md` (ya vive en `core/intercambio/infraestructura/lectura/`) |

## 0. La propuesta en una página

- **Dos módulos nuevos** (espejo de compras, dictamen §1 y V-5):
  - **`libro-de-ventas`** (esquema `libro_de_ventas`), `dependeDe: ['libro-de-compras']` (trae `terceros`): documentos
    emitidos (FEL o papel), débito fiscal, bandeja de **DTE emitidos** importados de la SAT, **retenciones recibidas** y
    sus **constancias**, el libro del período con folios, el cuadre «SAT contra libro» y los datos para el SAT-2237, el
    SAT-2046 y el ISR mensual del opcional simplificado.
  - **`cuentas-por-cobrar`** (esquema `cuentas_por_cobrar`), `dependeDe: ['libro-de-ventas', 'bancos']`: lo que cada
    cliente debe; vencimientos y contraseña del cliente; **cobros** con Bancos (depósito o transferencia registrada desde
    aquí, o un depósito que ya está en Bancos) con su **recibo de cobro** numerado; la retención recibida como medio de
    cobro; saldo a favor (anticipos) aplicable o devolvible; cheque rechazado; ajustes; **castigo** de incobrables; saldos
    iniciales; antigüedad y estado de cuenta.
- **Por qué el libro depende de Libro de compras** (§2.2): el historial fiscal de la empresa (régimen con vigencia, agente
  de retención) y los **períodos declarados** ya viven allí, y el SAT-2237 es **una** declaración con débito y crédito.
  Moverlos a `empresas` es la alternativa (VC-P1 b).
- **Fuera de los dos módulos**: `terceros` (llave única de clientes, aviso de cliente guardado para las secciones, orden
  para crear el cliente desde un DTE), `bancos` (conceptos de sistema de cobro y la revisión del módulo de origen para
  cualquier módulo, que ya pide Caja chica), `libro-de-compras` (la declaración del período pregunta las cifras de ventas)
  y `core` (contratos).
- **Fuera de v1**: emitir FEL desde Arrancar (módulo `facturacion-fel` con un adaptador por certificador, diseño aparte),
  punto de venta y caja (PLAN §6), cartera de cheques posfechados recibidos, cobro en efectivo sin depósito, estimación de
  incobrables (paso CXC-9, después del castigo), abonos de la factura cambiaria, partidas contables (Contabilidad).

## 1. Lo encontrado en el código y la base (verificado contra `main` el 2026-11-18)

1. **Módulos y dependencias**: `terceros` (`[]`), `bancos` (`[]`), `libro-de-compras` (`['terceros']`),
   `cuentas-por-pagar` (`['libro-de-compras', 'bancos']`), `caja-chica` (`['libro-de-compras', 'bancos']`),
   `cuentas-por-liquidar` (`['libro-de-compras', 'bancos', 'terceros']`); `empresas` es esencial. La prueba
   `llaves-entre-esquemas` admite llaves hacia `core`, los esenciales y el `dependeDe` directo o transitivo, y el código de
   un módulo puede **leer** las `*.tablas.js` de su `dependeDe` desde `infraestructura/`.
2. **Historial fiscal de la empresa** (`libro_de_compras.datos_fiscales_de_empresa`): una fila por vigencia mensual
   (`vigente_desde` nulo = «desde el inicio»), `tipo_de_persona`, `regimen_iva in ('general', 'pequeno_contribuyente',
   'pequeno_contribuyente_electronico', 'contribuyente_agropecuario', 'primario_pecuario', 'no_afiliado')`,
   `regimen_isr in ('utilidades', 'opcional_simplificado', 'exento')` (solo con IVA general o no afiliado),
   `agente_de_retencion_iva in ('ninguno', 'exportador', 'contribuyente_especial', 'sector_publico', 'otro')`,
   `es_agente_de_retencion_isr`. **[corrige el dictamen §3 y §9.3]**: el régimen **ya está fechado por período** y el
   **régimen agropecuario ya está en el catálogo** (`contribuyente_agropecuario`, solo persona individual por check), con
   sus familias de documento en compras (`FACA`, `FCCA`, `FAAE`, `FCAE`). **[validación 2026-11-19, V-4]**: ese régimen
   y el `pequeno_contribuyente_electronico` están **derogados** (Decreto 31-2024) desde
   `libro-de-compras.regimenes.fecha_de_derogacion` (`2025-07-09`); compras ya impide abrir una vigencia de esos regímenes
   en esa fecha o después (`problemasDeLaDerogacion`). Solo sirven para meses anteriores.
3. **Datos fiscales del proveedor** (`libro_de_compras.datos_fiscales_de_proveedor`, por cuenta, llave compuesta a
   `terceros.proveedores (id, cuenta_id)`, sección aportada al formulario de Proveedores): es el molde de los datos
   fiscales del **cliente** (§5.2).
4. **Períodos** (`libro_de_compras.periodos` y `declaraciones_de_periodos`): una fila por mes declarado, con la «foto»
   de los totales, `formulario in ('SAT-2237', 'SAT-2046', 'sin_formulario')`, reapertura y rectificación. Es la
   declaración **del IVA de la empresa**, no solo de las compras: el SAT-2237 lleva el débito, el crédito y las
   retenciones recibidas (sección 7, `investigacion-sat-2237-y-2046.md`). **[corrige el dictamen]**: no hace falta otra
   declaración en ventas; hace falta que esta incluya las cifras de ventas (§3.3).
5. **Retenciones en compras** (`libro_de_compras.retenciones`): una por documento y regla, con `base`, `porcentaje`,
   `monto_propuesto`, `monto`, `motivo_del_ajuste`, constancia (número y fecha) y resolución si se anula el documento. Las
   reglas (`iva_exportador_agropecuario`, `iva_exportador`, `iva_contribuyente_especial`, `iva_otro_agente`,
   `iva_sector_publico`, `iva_pequeno_contribuyente`, `isr_opcional_simplificado`, `iva_factura_especial`,
   `isr_factura_especial`) son **las mismas** que la empresa sufre al vender, vistas al revés (dictamen §4.1).
6. **Tasas** en configuración de **instalación** sin vigencia (`libro-de-compras.iva.tasa`,
   `libro-de-compras.retenciones_iva.*`, `libro-de-compras.retenciones_isr.*`). Cada retención guarda su porcentaje al
   registrarse, así que un cambio de tasa no altera lo ya registrado.
7. **Bandeja de DTE recibidos** (`lotes_de_dte`, `dte_recibidos`): único `(empresa_id, autorizacion_fel)`, estado en la
   SAT (`vigente`/`anulado`, `anulado_en_la_sat_el`), estado en la bandeja (`pendiente`, `registrado`, `descartado`,
   `bloqueado` por «registrado en otra empresa»), la fila original en `jsonb`, el proveedor creado desde el DTE
   (`terceros.crear_proveedor_desde_dte`). El lector de `.xls`, `.xlsx` y `.csv` está en **`core/intercambio`**: Libro de
   ventas lo usa sin copiarlo.
8. **Libro en PDF con folios** (`libro_de_compras.foliacion_del_libro`, `emisiones_del_libro` de solo agregar, con
   exclusión de folios traslapados) y el generador `pdfkit` en `libro-de-compras/infraestructura/pdf/` (pincel, tabla,
   monto, hoja de resumen): **dentro** del módulo; para reusarlo hay que subir las piezas genéricas a `core` (paso VC-0d).
9. **Terceros**: `terceros.clientes` (papel por tercero: `clase`, `activo`, `notas`, `politicaPorCuenta()`) **no tiene**
   el único `(id, cuenta_id)` que necesitan las llaves compuestas (sí lo tiene `proveedores`). Existe el aviso
   `terceros.proveedor_guardado` con secciones, pero **no** uno de cliente. La configuración
   `terceros.clientes.permitir_consumidor_final` ya existe (el NIT `CF` se repite).
10. **Bancos**: movimientos `credito` / `debito` / `cheque` (emitido); `modulo_de_origen` + `documento_de_origen_id` sin
    llave; conceptos de sistema solo de pagos (`pago_a_proveedor`, `reintegro_de_proveedor`…). Sugeridos **sin clave**:
    «Depósito de ventas» (crédito, Operación «Cobros a clientes») y «Cheque rechazado» (débito, cargo bancario, Operación
    «Cobros a clientes»). Una nota está «marcada para Cuentas por pagar» si es suelta y su concepto es el de pago a
    proveedores; `RevisorDeCambios` solo conoce a Cuentas por pagar (Caja chica ya pidió generalizarlo, CCL-B1, aún no
    programado: la última migración de Bancos es la `0034`). **[corrige el dictamen §6]**: lo que existe «posfechado» es el
    **cheque emitido**; no hay cartera de cheques **recibidos**.
11. **Empresas**: `localidades.codigo_establecimiento_sat` (único por empresa): el establecimiento del DTE emitido se
    puede ligar a su localidad. `cargas_iniciales` y la pregunta `empresas.revisar_cierre_de_carga` (EM-2) en `main`.
12. **Cuentas por pagar** (molde de la cartera): `documentos` (origen libro o saldo inicial, vencimiento, saldo derivado),
    `pagos` con `forma` y `movimiento_id` (FK a `bancos.movimientos`), `aplicaciones_de_pagos`, `aplicaciones_de_notas`,
    `ajustes_de_saldo` (diferencia menor y baja de notas), cuenta de apertura, eventos en
    `core/contratos/cuentas-por-pagar.contratos.ts`.
13. **Base de desarrollo (solo leída)**: 4 empresas, 3 con datos fiscales (una general sobre utilidades desde el inicio; una
    **contribuyente agropecuario** desde el inicio que pasa a general sobre utilidades el 2025-07-01, antes de la
    derogación; y una **pequeño contribuyente**), 3 clientes (clases directo, intermediario y subasta), monedas GTQ y USD.
    Ninguna queda en un régimen derogado después del 2025-07-09. La bandeja de recibidos no tiene ninguna `FESP`
    (revisado el 2026-11-19). No hay tablas de ventas: nada que convertir.

## 2. Alcance y forma de los módulos

### 2.1 Qué entra en v1

| Entra en v1 | No entra (y dónde va) |
|---|---|
| Documentos emitidos de cualquier régimen: facturas (`FACT`, `FCAM` y las de cada régimen especial), notas de crédito, de débito y de abono, recibos, factura especial recibida del comprador | Emitir FEL (módulo `facturacion-fel`, adaptador por certificador; diseño aparte cuando se responda V-2) |
| Importar los **DTE emitidos** de la SAT (`.xls`, `.xlsx`, `.csv`) y captura manual | Punto de venta, caja de ventas, ventas desde Inventario, Ganadería o Cultivos (publicarán o pedirán; Libro de ventas no depende de ellos) |
| Líneas por **concepto de ingreso** (bien o servicio; gravada, exenta, exportación) | Complemento de exportación completo (Incoterm, aduana): solo la columna de exportación |
| Retenciones recibidas calculadas o informadas, constancias, período de aplicación, «descontadas sin constancia» | Estimación de incobrables (CXC-9, después) |
| Libro del período (pantalla, Excel, PDF con folios), cuadre SAT contra libro, datos para SAT-2237, SAT-2046 e ISR mensual del opcional simplificado | Abonos pactados de la factura cambiaria (tabla reservada, §6.10) |
| Cartera: vencimientos, contraseña del cliente, cobros con Bancos, recibo de cobro, retención como medio de cobro, saldo a favor, devolución, cheque rechazado, ajustes, castigo y recuperación, saldos iniciales | Cartera de cheques posfechados recibidos y cobro en efectivo sin depósito (VC-P10) |
| Reportes de cartera: antigüedad, estado de cuenta, cobros, por vencer, saldos a favor | Partidas contables: Contabilidad escuchará los eventos de §10 |

### 2.2 Dónde vive cada cosa (VC-P1, VC-P2)

| Pieza | Módulo | Por qué |
|---|---|---|
| Régimen de la empresa por mes, agente de retención | `libro-de-compras` (ya existe) | Libro de ventas lo **lee** (dependencia) |
| Período declarado y su foto | `libro-de-compras` (ya existe) | Una sola declaración de IVA por mes; la foto suma las cifras de ventas con una pregunta (§3.3) |
| Datos fiscales del cliente (si retiene y qué) | `libro-de-ventas` | Es lo fiscal del cliente, como `datos_fiscales_de_proveedor` |
| Documento emitido, débito, retención recibida, constancia | `libro-de-ventas` | Es lo fiscal; existe aunque la venta sea de contado y la cartera esté apagada |
| Días de crédito del cliente, saldo, cobro, saldo a favor, castigo | `cuentas-por-cobrar` | Es lo financiero |
| Depósito, transferencia, cheque rechazado, devolución | `bancos` (por órdenes) | Como CP4 |

**Alternativa VC-P1 b**: mudar `datos_fiscales_de_empresa` y `periodos` a `empresas` (esencial). Es más limpio a largo
plazo (Libro de ventas no dependería de compras) pero toca tablas en producción, sus llaves, los casos de uso de
Libro de compras y de tres módulos que las leen (Caja chica, Activos fijos, CP4). No se recomienda ahora: una empresa que
vende y declara IVA también lleva libro de compras (Ley del IVA art. 37), así que activar los dos no es una carga real.

## 3. Modelo

### 3.1 Qué es cada cosa

| Concepto | Qué es | Dónde vive |
|---|---|---|
| **Documento de venta** | Un DTE emitido (o factura de papel histórica) con sus totales fijos; nunca se edita: se anula o se elimina | `libro_de_ventas.documentos` |
| **Línea** | Parte del documento con su concepto de ingreso, su clase fiscal y sus montos | `libro_de_ventas.lineas_de_documento` |
| **Concepto de ingreso** | Catálogo por empresa (Venta de bienes, Servicios, Venta de activo fijo…), bien o servicio | `libro_de_ventas.conceptos_de_ingreso` |
| **DTE emitido** | Una fila de la bandeja tal como la dio la SAT, antes de registrarse | `libro_de_ventas.dte_emitidos` |
| **Retención recibida** | Lo que un cliente retiene a la empresa por un documento y una regla; nace **esperada** o **informada** | `libro_de_ventas.retenciones_recibidas` |
| **Constancia recibida** | El papel del agente que ampara una o varias retenciones | `libro_de_ventas.constancias_recibidas` |
| **Cargo / abono** | El documento de venta visto como deuda del cliente (factura y nota de débito: cargo; nota de crédito y de abono: abono) o un saldo inicial | `cuentas_por_cobrar.documentos` |
| **Cobro** | Dinero recibido del cliente (con su movimiento de Bancos) o solo retenciones; con número de recibo | `cuentas_por_cobrar.cobros` |
| **Aplicación** | Cuánto de un cobro, de un abono o de una retención baja cada cargo | `aplicaciones_de_cobros`, `aplicaciones_de_abonos`, `retenciones_aplicadas` |
| **Saldo a favor** | Lo cobrado y no aplicado (anticipo o pago de más) y los abonos libres | Derivado |

### 3.2 Ciclo de un documento

```
           registrar (manual o desde la bandeja)                     anular (FEL anulada, error, no es de la empresa)
DTE ──────────────────────────────────────────► vigente ───────────────────────────────────────────► anulado
                                                   │  └── eliminar (sin cobros ni retenciones aplicadas, período sin declarar)
                                                   │
                       destino = cuentas-por-cobrar │ recibir_documento
                                                   ▼
                                    cargo con vencimiento ── cobros / abonos / retenciones / ajustes / castigo ──► saldo 0
```

- **Período** del documento = mes de **emisión** (dictamen §2, débito). Siempre; no hay plazo de gracia como en el crédito.
- **Anulado**: aparece en el libro de su mes con montos en cero y la marca (dictamen §5). Si su mes ya se declaró, aviso
  «el período ya se declaró: rectifique» (como compras).
- **Destino** (VC-P5): `cuentas-por-cobrar` o ninguno («sin cartera»: contado que se depositó por Bancos con «Depósito de
  ventas»). Por omisión: con cliente identificado y la cartera activa, `cuentas-por-cobrar`; a consumidor final sin
  cliente, según `libro-de-ventas.destino.consumidor_final`.

### 3.3 El período y la declaración (VC-P2)

- Libro de ventas **lee** `libro_de_compras.periodos`: con el mes `declarado`, registrar, anular o eliminar un documento
  de ese mes pide reabrir (como en compras); con el control de declarados apagado
  (`libro-de-compras.periodos.control_de_declarados`), solo avisa.
- **La foto de la declaración incluye ventas.** Libro de compras, al declarar o rectificar, pregunta a todos
  `libro-de-compras.cifras_para_la_declaracion` (`{ periodo }`); Libro de ventas responde con débito por rubro, ventas
  exentas, exportaciones, cantidad y monto de operaciones (con notas de crédito y de débito; **sin** notas de abono ni
  facturas especiales recibidas) y retenciones recibidas aplicadas al período. Libro de compras guarda la respuesta dentro
  de su `foto` (clave `ventas`) y la diferencia de la rectificación la compara también. Con Libro de ventas inactivo, la
  foto sale como hoy.
- **Qué retenciones cuentan** **[validación 2026-11-19, V-2 y V-1]**: solo las de IVA **con constancia** cuyo
  `periodo_de_aplicacion` es el mes; nunca las esperadas sin constancia, y nunca las de `origen = 'factura_especial'`
  (definitivas e informativas, §4.5).
- **Remanente de retenciones** **[validación 2026-11-19, V-2]**: lo que las retenciones pasan del impuesto del mes se
  traslada al mes siguiente y **no se mezcla** con el remanente del crédito fiscal. La foto guarda aparte tres cifras:
  `retenciones_del_periodo` (la respuesta de ventas), `remanente_de_retenciones_anterior` (el `…_al_siguiente` de la foto
  del mes anterior; sin foto anterior, lo escribe el usuario al declarar, `0` por omisión) y
  `remanente_de_retenciones_al_siguiente` = máx(0, retenciones del período + remanente anterior − impuesto del mes después
  del crédito). Lo calcula **Libro de compras**, que tiene débito y crédito. En el SAT-2046, lo mismo con las constancias
  del 5 % (`constancias_del_periodo`, `saldo_de_constancias_anterior`, `saldo_de_constancias_al_siguiente`). La casilla
  exacta del SAT-2237 queda por confirmar con una captura (pregunta VC-P29); las cifras se guardan igual.
- Las pantallas «Datos para el SAT-2237» y «Datos para el SAT-2046» de Libro de compras muestran la sección de ventas
  con la misma pregunta. El cálculo del impuesto del pequeño contribuyente (5 % de los ingresos − constancias − remanente)
  llega aquí (estaba esperando a Ventas, `investigacion-sat-2237-y-2046.md`).

### 3.4 Régimen de la empresa y columnas del libro

El régimen se toma del historial fiscal vigente **en el mes del documento** y se copia al documento
(`regimen_iva_de_la_empresa`, `regimen_isr_de_la_empresa`): no cambia aunque después se corrija el historial.

| Régimen de IVA de la empresa | Tipos de DTE que emite (familia) | Columnas del libro | Débito |
|---|---|---|---|
| `general` | `FACT`, `FCAM`, `NCRE`, `NDEB`, `NABN`, `RECI`, `RDON` | Gravadas bienes, gravadas servicios, exentas, exportación (bienes y servicios), IVA débito, total; anexo de notas de abono | 12 % incluido en el total de lo gravado |
| `pequeno_contribuyente` | `FPEQ`, `FCAP`, notas | Ingresos del mes (sin débito) | No hay; el impuesto es 5 % de ingresos (SAT-2046) |
| `pequeno_contribuyente_electronico`, `contribuyente_agropecuario` (**derogados**) | `FAPE`, `FCPE` / `FACA`, `FCCA`, `FAAE`, `FCAE`, notas | Ingresos del mes | **Solo meses anteriores a la derogación** (histórico, sin cálculo; SAT-2241). En un mes de esa fecha en adelante, registrar se **rechaza** con `regimen_derogado` («Ese régimen fue derogado por el Decreto 31-2024; actualice los datos fiscales de la empresa») |
| `primario_pecuario` | `FARP`, `FCRP`, `FPEC`, `FCPC` (las de compras), notas | Ventas locales y exportaciones (por la clase fiscal de la línea); el margen del intermediario de bovinos, después de VC-P24 (necesita el costo de lo comprado); sin débito | Impuesto a la Confianza Tributaria (ICT): 1.5 % de las ventas brutas, 2 % de ciertas exportaciones, 10 % del margen bovino. En v1 solo las cifras separadas (LV-5); el cálculo, después de VC-P24 (paso LV-7) |
| `no_afiliado` | `RECI` y la `FESP` que le emite el comprador (§4.5) | Ingresos sin débito | No hay |

**[validación 2026-11-19, V-4]** La derogación se lee de `libro-de-compras.regimenes.fecha_de_derogacion` con
`LectorDeConfiguracion` (la misma variable de compras, no una copia). Fuera de eso, el tipo de DTE que no corresponde al
régimen del mes se **avisa** (no se bloquea: la SAT ya lo certificó y puede haber un cambio de régimen mal cargado). La
factura especial recibida del comprador (`FESP`, §4.5) se registra en todos los regímenes, pero fuera de `no_afiliado`
lleva aviso (§4.5).

**Libro de cada régimen** **[validación 2026-11-19, V-10]**: en el régimen general son dos libros habilitados (compras y
ventas) y la foliación propia de ventas es la legal. En **primario y pecuario** el libro legal es el **electrónico de la
SAT**: el de Arrancar se titula «Auxiliar: el libro legal es el electrónico de la SAT». En el **pequeño contribuyente** el
libro habilitado es **uno solo** de compras y ventas. Cómo se folia en esos dos regímenes es la pregunta nueva VC-P25
(choca con la respuesta VC-P23 a); mientras no se responda, rige VC-P23 a (foliación propia) con el título de auxiliar.

### 3.5 Retenciones recibidas (dictamen §4.3)

- **Esperada**: al registrar el documento, el dominio la propone con las reglas de §7.3 (régimen de la empresa en el mes,
  datos fiscales del cliente, tasas de la configuración, mínimos). Se puede ajustar con motivo (permiso propio, auditoría).
- **Informada**: la registra el usuario (o la cartera al cobrar) porque el cliente retuvo sin estar marcado como agente o
  con otra tasa. Lleva aviso si es indebida (p. ej. ISR a una empresa sobre utilidades; dictamen §4.1).
- **Descontada**: un cobro la aplicó al saldo (`descontada_en` y `cobro_id`, que pone la cartera con una orden).
- **Con constancia**: ligada a una `constancias_recibidas` (número, fecha, archivo).
- **Aplicada**: tiene `periodo_de_aplicacion` y ese período está declarado.
- **Anulada**: con su documento, o por error (motivo y auditoría). Una retención aplicada a un cobro no se anula sin
  quitar antes la aplicación.

El estado que ve el usuario se **deduce** de esas columnas (no se guarda: igual que el «totalmente depreciado» de
Activos fijos), salvo `vigente`/`anulada`. El libro muestra las retenciones como **columnas informativas**: el débito
siempre es completo (dictamen §4.3).

**Período de aplicación** (VC-P8 a, **validado 2026-11-19, V-2**): IVA de agente (exportador, especial, sector público,
otro, tarjeta) → mes de la **constancia**; 5 % del pequeño contribuyente → mes de la constancia (se resta en el SAT-2046 de
ese mes); ISR del opcional simplificado → mes de la **factura**. Se puede cambiar mientras ese período no esté declarado.

- Si el mes de la constancia **ya está declarado**, no se propone el «primer período abierto» (eso es del crédito del
  art. 20, no de las retenciones): con el control de declarados encendido, registrar la constancia se rechaza con
  `periodo_de_aplicacion_declarado` («La constancia es de un período declarado: reabra el período para rectificarlo, o
  elija otro período con su contador»); el usuario puede elegir **a mano** otro período sin declarar, con motivo
  (auditoría `corregir`). Con el control apagado, solo el aviso.
- Una retención **esperada** sin constancia tiene período propuesto, pero **no entra** en las cifras de IVA de la
  declaración (§3.3). Para el ISR del opcional simplificado sí cuenta desde que es esperada (§7.6, V-6).
- Las retenciones de la factura especial recibida (`origen = 'factura_especial'`) son **definitivas e informativas**: nunca
  entran en las retenciones acreditables (§4.5).

### 3.6 Saldo de un cargo (derivado)

```
saldo = total
      − Σ aplicaciones de cobros vigentes
      − Σ aplicaciones de abonos vigentes (NCRE, NABN)
      − Σ retenciones aplicadas vigentes
      − Σ ajustes vigentes (diferencia menor)
      − Σ castigos vigentes + Σ recuperaciones vigentes
```

Saldo a favor del cliente = Σ (cobro − Σ sus aplicaciones − Σ devoluciones) + Σ abonos libres. Nunca se suman monedas
distintas (§5.12).

## 4. Cambios fuera de los dos módulos

### 4.1 Terceros (paso VC-0a, migración `0010_clientes_para_ventas`)

| Cambio | Detalle |
|---|---|
| Llave para referenciar clientes | `unique clientes_id_cuenta_unico (id, cuenta_id)` en `terceros.clientes` (como `proveedores_id_cuenta_unico`). Sin datos que convertir |
| Aviso `terceros.cliente_guardado` | `{ clienteId, terceroId, secciones }`, en la misma transacción que guarda el papel de cliente (como `proveedor_guardado`); el formulario de Clientes acepta `secciones['libro-de-ventas']` y `secciones['cuentas-por-cobrar']` |
| Orden `terceros.crear_cliente_desde_dte` | Igual que la del proveedor: por NIT; si el tercero existe le asigna el papel de cliente; `puedeCrearClientes` del usuario (`clientes.crear`); inactivo → `cliente_inactivo`. NIT `CF` no crea nada (responde `null`) |
| Cliente (pantalla) | Las secciones aportadas en el formulario y la ficha del cliente (como en Proveedores) |

### 4.2 Bancos (paso VC-0b, migración `0039_cobros_a_clientes`: la siguiente libre al programar; hoy la última es la `0038`)

**a) Conceptos de sistema nuevos** (en `CONCEPTOS_DE_SISTEMA`, `ClaveDeConceptoDeSistema` y, en las empresas que ya tienen
catálogo, por `insert`; a uno sin clave con el **mismo nombre normalizado** (`core.nombre_normalizado`) se le pone la clave,
se le alinea la clasificación y se reactiva, exactamente como la `0037` de CCL-B1; repetible):

| Clave | Nombre | Aplica a | Flujo | Para |
|---|---|---|---|---|
| `cobro_a_cliente` | Cobros a clientes | crédito | Operación «Cobros a clientes» | Depósito o transferencia de un cobro, y la nota «marcada para Cuentas por cobrar» |
| `cobro_a_cliente_de_activo` | Cobro de venta de activo fijo | crédito | Inversión «Venta de activos» | La parte del cobro aplicada a líneas con concepto de ingreso «Venta de activo fijo» (§7.6) |
| `devolucion_a_cliente` | Devoluciones a clientes | débito | Operación «Cobros a clientes» | Devolver un saldo a favor |
| `cheque_rechazado` | Cheque rechazado (ya existe sugerido) | débito | Operación «Cobros a clientes» | El débito del banco por un cheque del cliente devuelto |

«Depósito de ventas» se queda **sin clave** y libre: es el de las ventas de contado sin cartera.

**b) Nota marcada para un módulo.** Hoy «marcada» = nota suelta con el concepto de pago a proveedores. Se generaliza a un
mapa `CONCEPTO_QUE_MARCA_PARA_MODULO` (`pago_a_proveedor` → `cuentas-por-pagar`; `cobro_a_cliente` →
`cuentas-por-cobrar`): una nota de crédito suelta con «Cobros a clientes» queda marcada para la cartera, que la puede
**ligar** a un cobro (forma `nota_ligada`). `marcadaParaCuentasPorPagar` del DTO pasa a `marcadaParaModulo: string | null`
(el cliente se ajusta en el mismo paso).

**c) Revisión del módulo de origen para cualquier módulo**: **ya está en `main`** (CCL-B1, `ModulosDeOrigen.estaActivo` y
`activos`, verificado el 2026-11-19). VC-0b solo suma `cuentas-por-cobrar` a lo que revisa `RevisorDeCambios` (hoy suma
Cuentas por pagar a mano para la nota marcada: pasa a leer el mapa de b).

**d) Concepto reservado**: también **ya está en `main`** (`CONCEPTOS_RESERVADOS_POR_MODULO`, `dominio/conceptos-reservados.ts`).
VC-0b agrega `cobro_a_cliente`, `cobro_a_cliente_de_activo` y `devolucion_a_cliente` → `cuentas-por-cobrar`: se eligen a
mano en una nota **solo** si Cuentas por cobrar no está activo; también `cheque_rechazado` (que antes se elegía a mano como sugerido y no debe dejar de poder elegirse ni de poder corregirse). `cobro_a_cliente` no entra: es la marca.

**e) La marca vale en su dirección y no adopta notas viejas.** `CONCEPTO_QUE_MARCA_PARA_MODULO` trae el módulo **y** el tipo de nota (`pago_a_proveedor` solo débito; `cobro_a_cliente` solo crédito). La `0039` no adopta por nombre un concepto «Cobros a clientes» que ya tiene movimientos (sus notas quedarían marcadas para un módulo que quizá no existe, sin salida): lo renombra «… (anterior)» y el de sistema se inserta aparte.

### 4.3 Libro de compras (paso VC-0c)

| Cambio | Detalle |
|---|---|
| Pregunta `libro-de-compras.cifras_para_la_declaracion` | Declarada en `core/contratos/libro-de-compras.contratos.ts`; respuesta `{ modulo, clave, cifras: CifraDeDeclaracion[] } \| null` (paso VC-0c1) |
| Foto de la declaración | `DeclararPeriodo` y `RectificarPeriodo` guardan las respuestas en `foto.ventas` (el check de 1 MB alcanza: son decenas de cifras) (VC-0c1) |
| Remanente de retenciones **[validación 2026-11-19, V-2]** | La foto guarda `retenciones_del_periodo`, `remanente_de_retenciones_anterior` y `remanente_de_retenciones_al_siguiente`, aparte del remanente de crédito; en el SAT-2046, `constancias_del_periodo`, `saldo_de_constancias_anterior` y `saldo_de_constancias_al_siguiente` (§3.3). El anterior sale de la foto del mes previo o lo escribe el usuario al declarar el primer mes. Viven dentro del `jsonb` de la foto: **sin migración** (paso VC-0c2) |
| Datos para el SAT-2237 / SAT-2046 | Muestran la sección de ventas cuando hay respuesta; el SAT-2046 calcula el impuesto del mes (5 % de ingresos − constancias del período − saldo anterior) (VC-0c2) |
| Bandeja de recibidos **[validado 2026-11-19, V-1]** | En la `FESP` el emisor es el comprador y el receptor es el vendedor: toda `FESP` que llega a la bandeja de **recibidos** de la empresa es una **venta**. La bandeja la **bloquea** con el motivo nuevo `factura_especial_de_venta` («Es una venta: regístrela en Libro de ventas»). Migración `0040_factura_especial_de_venta` (la siguiente libre; hoy la última es la `0039`): amplía el check `dte_recibidos_motivo_de_bloqueo_valido` y bloquea las filas `FESP` en `pendiente` (en la base de desarrollo no hay ninguna). Una `FESP` ya **registrada** como compra no se toca: el cuadre de compras la lista como «factura especial de venta registrada como compra» para que el usuario la elimine (VC-0c1) |

### 4.4 Core

| Cambio | Detalle |
|---|---|
| `core/contratos/libro-de-ventas.contratos.ts` y `cuentas-por-cobrar.contratos.ts` | Órdenes, avisos, preguntas y eventos de §10 |
| Piezas del PDF (VC-0d) | `pincel-del-pdf`, `tabla-del-pdf`, `monto-del-pdf` y la foliación genérica pasan de `libro-de-compras/infraestructura/pdf` a `core/impresion/pdf` (sin cambiar su comportamiento; las pruebas se mudan con ellas). Así Libro de ventas emite su libro con folios sin importar a compras |
| Auditoría permanente | Las migraciones `0001` de cada módulo insertan en `core.recursos_de_auditoria_permanente`: `libro-de-ventas.documentos`, `libro-de-ventas.retenciones`, `cuentas-por-cobrar.cobros`, `cuentas-por-cobrar.castigos`, con motivo «Conservación de libros y documentos (Código de Comercio art. 382; Código Tributario, por confirmar)» **[validación 2026-11-19]** |

### 4.5 Factura especial recibida del comprador (dictamen §4.1 última fila y §4.2 c)

Cuando el comprador emite la `FESP` al vendedor, ese documento **es** la venta y la constancia a la vez. Libro de ventas lo
registra como tipo `factura_especial_recibida` (manual, o desde la fila que la bandeja de recibidos bloqueó: Libro de
ventas **lee** `libro_de_compras.dte_recibidos`, que es de su `dependeDe`, para proponer los datos; §4.3), con dos retenciones recibidas automáticas (`iva_factura_especial` al 100 % del IVA e
`isr_factura_especial`) con `origen = 'factura_especial'`, ligadas a una constancia que es el mismo documento
(`es_el_documento = true`).

**[validación 2026-11-19, V-1]**
- **Fuera del débito y fuera de las retenciones acreditables.** El comprador ya enteró el 100 % del IVA (SAT-2085); si el
  vendedor declarara débito y retención, el SAT-2237 quedaría inflado y descuadrado contra lo que prellena la SAT. El
  documento no suma al débito ni a «cantidad y monto de operaciones» (§3.3), y sus dos retenciones son **definitivas e
  informativas**. El libro lo muestra en una columna propia, «Ventas con factura especial (IVA retenido en su totalidad)».
- **Aviso de empresa inscrita**: en todo régimen distinto de `no_afiliado`, «Su empresa está inscrita en el IVA: debe
  emitir su propia factura (Ley del IVA art. 52). Revise con su contador.» (no bloquea: hay salvedades, como la negativa
  del vendedor del art. 52).
- **ISR de la FESP en una empresa sobre utilidades**: se guarda, informativo, **pendiente de confirmar** si se acredita a
  los pagos trimestrales. No entra en ninguna cifra de ISR.
- Una nota de crédito sobre una `factura_especial_recibida` es error (`nota_sobre_factura_especial`), como R2-e en compras
  (V-9).

## 5. Datos de Libro de ventas (esquema `libro_de_ventas`)

Toda tabla de empresa lleva `empresa_id` (FK `core.empresas` on delete cascade), `politicaPorEmpresa()`,
`...marcasDeTiempo` y `...autoria`; las de cuenta, `cuenta_id` (`default deLaTransaccion.cuenta()`) y
`politicaPorCuenta()`. Llaves `no action` salvo donde se dice; las compuestas con `empresa_id` (o `cuenta_id`) para no
cruzar de empresa. Dinero `numeric(14,2)`; porcentajes `numeric(5,2)`; períodos `date` con check de primer día del mes.
Anulación completa = `estado`, `anulado_en`, `anulado_por`, `motivo_de_anulacion` (1–300) con el check
`(estado = 'anulado') = (los tres no nulos)`. Toda tabla con `id` que reciba llaves lleva `<tabla>_id_empresa_unico (id,
empresa_id)` y toda llave lleva su índice.

### 5.1 `libro_de_ventas.conceptos_de_ingreso`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `nombre` | text | no | 1–80 recortado; único `(empresa_id, nombreNormalizado(nombre))` |
| `tipo` | text | no | `in ('bien', 'servicio')`: la columna del libro por omisión de sus líneas |
| `clave_de_sistema` | text | sí | `in ('venta_de_activo_fijo')`; único parcial `(empresa_id, clave_de_sistema) where not null`; no se edita ni inactiva |
| `activo` | boolean | no | `default true`; inactivar con auditoría; no se elimina si tiene líneas |

Semilla perezosa (como `SembrarConceptosDeGasto`): Venta de bienes, Prestación de servicios, Venta de activo fijo
(sistema), Otros ingresos. Sin rubro: «Venta de ganado» o «Venta de cosecha» las agrega cada empresa.

### 5.2 `libro_de_ventas.datos_fiscales_de_cliente` (por cuenta; sección aportada al formulario de Clientes)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `cliente_id` | uuid | no | PK; FK compuesta `(cliente_id, cuenta_id) → terceros.clientes (id, cuenta_id)` **on delete cascade** |
| `cuenta_id` | uuid | no | `default deLaTransaccion.cuenta()`; índice |
| `agente_de_retencion_iva` | text | no | `default 'ninguno'`; `in ('ninguno', 'exportador', 'contribuyente_especial', 'sector_publico', 'otro')` |
| `exporta_productos_agropecuarios` | boolean | no | `default false`; solo con `exportador` (check): propone el 65 % sobre líneas de bien |
| `retiene_isr` | boolean | no | `default false`: lleva contabilidad completa y retiene al opcional simplificado |
| `retiene_iva_a_pequeno_contribuyente` | boolean | no | `default false`; check: solo si `agente_de_retencion_iva <> 'ninguno'` |

Sin fila = no retiene nada (no se supone). La ficha del cliente lo muestra en «Datos fiscales (ventas)».

### 5.3 `libro_de_ventas.documentos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `cuenta_id` | uuid | no | `default deLaTransaccion.cuenta()`; solo para la llave del cliente |
| `tipo` | text | no | `in ('factura', 'factura_cambiaria', 'factura_pequeno_contribuyente', 'factura_pequeno_contribuyente_electronico', 'factura_contribuyente_agropecuario', 'factura_primario_pecuario', 'factura_especial_recibida', 'nota_de_credito', 'nota_de_debito', 'nota_de_abono', 'recibo')`. Los dos derogados se quedan en el check para los meses anteriores a la derogación; el dominio rechaza (`regimen_derogado`) su uso en un período de `fecha_de_derogacion` en adelante, como compras (§3.4) |
| `tipo_dte` | text | sí | Código SAT de cuatro letras (`FACT`, `FCAM`, `NABN`, `RECI`…); nulo en papel; check de familia contra `tipo` (como compras) |
| `origen` | text | no | `in ('manual', 'bandeja_sat', 'fel')` (`fel` reservado para el módulo de emisión) |
| `dte_emitido_id` | uuid | sí | FK compuesta a `dte_emitidos`; `(origen = 'bandeja_sat') = (dte_emitido_id is not null)`; único parcial |
| `cliente_id` | uuid | sí | FK compuesta a `terceros.clientes (id, cuenta_id)`; índice. Nulo solo con `nit_receptor = 'CF'` (check) |
| `tipo_de_identificacion` | text | no | `in ('nit', 'cui', 'extranjero', 'cf')` |
| `nit_receptor` | text | no | 1–20; `'CF'` si `tipo_de_identificacion = 'cf'` (check) |
| `nombre_receptor` | text | no | 1–200 (como lo dice el DTE) |
| `serie`, `numero` | text | sí, no | 1–40; único `(empresa_id, tipo_dte, serie, numero) nulls not distinct` entre vigentes y anulados |
| `autorizacion_fel` | uuid | sí | Único parcial `(empresa_id, autorizacion_fel) where not null` |
| `localidad_id` | uuid | sí | FK compuesta a `empresas.localidades (id, empresa_id)`; la del código de establecimiento del DTE; índice parcial |
| `fecha_emision` | date | no | No anterior a la fecha de inicio de la empresa (dominio, §7.1) |
| `periodo` | date | no | `= date_trunc('month', fecha_emision)` (check) |
| `regimen_iva_de_la_empresa`, `regimen_isr_de_la_empresa` | text | no, sí | Copiados del historial fiscal del mes |
| `documento_afectado_id` | uuid | sí | FK compuesta `(documento_afectado_id, empresa_id) → documentos`; obligatoria en notas salvo `factura_anterior_*` (check); índice parcial |
| `factura_anterior_serie`, `factura_anterior_numero`, `factura_anterior_fecha` | text, text, date | sí | La factura del sistema anterior que corrige una nota (VC-P18); los tres juntos (número y fecha), `< fecha de inicio` (dominio); excluyente con `documento_afectado_id` |
| `destino` | text | sí | `in ('cuentas-por-cobrar')`; nulo = sin cartera. Único `documentos_destino_unico (id, empresa_id, destino)` (destino de la llave de la cartera) |
| `procesado_en_destino_en` | timestamptz | sí | Lo pone la cartera (`marcar_procesado`): ya no se elimina, solo se anula |
| `muestra_en_reportes_sat` | boolean | no | `default true`; `false` solo en `recibo` (como compras) |
| `moneda`, `tipo_de_cambio`, `fecha_del_tipo_de_cambio`, `total_en_moneda` | char(3), numeric(16,8), date, numeric(14,2) | no, no, sí, no | Como `diseno-multimoneda.md` §6.4 (FK `core.monedas`, `default 'GTQ'`, 1, relleno = `total`); solo GTQ hasta Multimoneda (VC-P19) |
| `total`, `gravado_bienes`, `gravado_servicios`, `exento`, `exportacion`, `iva`, `otros_impuestos` | numeric(14,2) | no | En GTQ; sumas de las líneas (dominio); check `total = gravado_bienes + gravado_servicios + exento + exportacion + iva + otros_impuestos`; todos `>= 0` (el signo lo da el tipo: las notas de crédito y de abono restan en el libro) |
| `observaciones` | text | sí | 1–500 |
| anulación completa + `causa_de_anulacion` | | | `in ('fel_anulada_en_la_sat', 'error_de_captura', 'no_corresponde_a_la_empresa')`; `fecha_de_anulacion date` (la del DTE en la SAT o la del día) |

Índices: `(empresa_id, periodo, estado)` (el libro), `(empresa_id, cliente_id, fecha_emision)`, `(empresa_id, destino)
where destino is not null`. RLS: empresa (VC-P15: sin alcance por registro en v1).

### 5.4 `libro_de_ventas.lineas_de_documento`

`id`; `documento_id` (FK compuesta `(documento_id, empresa_id) → documentos` **on delete cascade**); `orden smallint`;
`concepto_de_ingreso_id` (FK compuesta; índice); `tipo in ('bien', 'servicio')`; `clase_fiscal in ('gravada', 'exenta',
'exportacion', 'no_afecta')`; `descripcion` 1–300 nula; `total`, `base`, `iva`, `otros_impuestos` numeric(14,2) con check
`total = base + iva + otros_impuestos` y `(clase_fiscal = 'gravada') or iva = 0`. Único `(documento_id, orden)` y
`lineas_llave_unica (id, documento_id, empresa_id)` (para que Activos fijos o Inventario puedan referenciar una línea
vendida después). RLS: empresa. La bandeja crea **una** línea con el concepto propuesto (§7.4); el usuario la puede partir.

### 5.5 `libro_de_ventas.lotes_de_dte` y `libro_de_ventas.dte_emitidos` (bandeja)

`lotes_de_dte`: como el de compras (`formato in ('xls', 'xlsx', 'csv')`, nombre y huella del archivo, filas leídas,
nuevas, repetidas, rechazadas, `jsonb` de errores acotado). Solo se agrega.

`dte_emitidos` (como `dte_recibidos`, del lado del emisor):

| Columna | Regla |
|---|---|
| `autorizacion_fel` uuid, `tipo_dte`, `serie`, `numero`, `fecha_emision`, `nit_emisor`, `codigo_establecimiento` (int, nulo) | Único `(empresa_id, autorizacion_fel)`; `nit_emisor` debe ser el de la empresa (si no, la fila se rechaza en el lote) |
| `tipo_de_identificacion`, `nit_receptor`, `nombre_receptor` | Como el documento |
| `total`, `iva`, `otros_impuestos`, `otros_impuestos_detalle` jsonb, `moneda` | Tal como vienen |
| `fila_original` jsonb | La fila sin tocar |
| `estado_sat in ('vigente', 'anulado')`, `anulado_en_la_sat_el` date | Se actualiza al reimportar |
| `lote_id`, `primer_lote_id` | FK a `lotes_de_dte` |
| `estado in ('pendiente', 'registrado', 'descartado', 'bloqueado')`, `motivo_de_bloqueo in ('registrado_en_otra_empresa', 'anterior_a_la_fecha_de_inicio', 'factura_especial_de_compra')` | Transiciones como compras. `factura_especial_de_compra`: el espejo de §4.3 (V-1): una `FESP` en los **emitidos** de la empresa la emitió ella como **compradora**; es una compra («Es una compra: regístrela en Libro de compras») |
| `documento_id` | FK compuesta a `documentos`; `(estado = 'registrado') = (documento_id is not null)` |
| Borrador: `cliente_id`, `concepto_de_ingreso_id`, `tipo_de_linea`, `clase_fiscal`, `destino`, `documento_afectado_id` | Lo que el usuario completa antes de registrar |
| `motivo_de_descarte`, `descartado_en`, `descartado_por` | Descartar audita |

Índices: `(empresa_id, estado, fecha_emision)`, `(empresa_id, nit_receptor)`, `(lote_id)`. RLS: empresa. Nunca se borra.

### 5.6 `libro_de_ventas.constancias_recibidas`

`id`; `cliente_id` (FK compuesta, índice); `impuesto in ('iva', 'isr')`; `numero` 1–40; `fecha` date; `total` numeric
`> 0` (la suma de sus retenciones: dominio); `archivo_id` FK `core.archivos` (`recurso_dueno =
'libro-de-ventas.constancias'`, PDF revisado con qpdf o imagen), único parcial; `es_el_documento boolean default false`
(la FESP); anulación completa. Único `(empresa_id, cliente_id, impuesto, numero) where estado = 'vigente'`. RLS: empresa.

### 5.7 `libro_de_ventas.retenciones_recibidas`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK; `retenciones_recibidas_id_empresa_unico (id, empresa_id)` (destino de la llave de la cartera) |
| `documento_id` | uuid | sí | FK compuesta a `documentos`; nulo solo con `origen in ('saldo_inicial', 'liquidacion_de_tarjeta')` (check). **[validación 2026-11-19, V-8]**: la adquirente retiene **por liquidación** (lote de vouchers, muchos a consumidor final), no por documento; LV-3 deja el check abierto desde la `0003` |
| `cliente_id` | uuid | no | FK compuesta; índice (el reporte por cliente). Es **quien retiene**: en `liquidacion_de_tarjeta`, la adquirente registrada con papel de cliente en Terceros (decisión de CXC-5, VC-P27) |
| `regla` | text | no | Las nueve de compras más `iva_tarjeta` (VC-P10); `impuesto = split_part(regla, '_', 1)` (check); `(origen = 'liquidacion_de_tarjeta') = (regla = 'iva_tarjeta')` (check) |
| `origen` | text | no | `in ('calculada', 'informada', 'factura_especial', 'saldo_inicial', 'liquidacion_de_tarjeta')`. `liquidacion_de_tarjeta` queda **reservado** (el dominio no lo produce) hasta CXC-5, como el `fel` de `documentos.origen`; CXC-5 agrega, en su migración, `referencia_de_liquidacion` (text 1–60) y `fecha_de_liquidacion` (date), nulas y obligatorias con ese origen. `factura_especial`: definitiva e informativa, nunca acreditable (§4.5) |
| `referencia_de_saldo_inicial` | text | sí | Serie y número del documento de la cartera de saldo inicial; `(origen = 'saldo_inicial') = (not null)` |
| `base`, `porcentaje`, `monto_propuesto`, `monto` | numeric | no, sí, no, no | Como compras: `monto between 0 and base`; `monto = monto_propuesto or motivo_del_ajuste is not null`. En `iva_tarjeta`, la base es el IVA **contenido en el monto bruto** de los vouchers (lo que pagó el tarjetahabiente), declarada por el usuario, no el neto depositado (V-8) |
| `motivo_del_ajuste` | text | sí | 1–300 |
| `es_indebida` | boolean | no | `default false`; la marca el dominio (aviso). **No** se marca indebida la de `iva_sector_publico` o `iva_tarjeta` a una empresa agente (V-3, por confirmar: aviso «Verifique si procede: entre agentes no se retiene, salvo excepciones por confirmar») |
| `constancia_id` | uuid | sí | FK compuesta a `constancias_recibidas`; índice parcial |
| `periodo_de_aplicacion` | date | no | Primer día del mes (check); propuesto según §3.5 |
| `descontada_en` | date | sí | Lo pone la cartera; con `cobro_id` |
| `cobro_id` | uuid | sí | Sin llave (el cobro vive en un módulo que depende de este); `(descontada_en is null) = (cobro_id is null)` |
| `estado` + anulación completa | | | `vigente`/`anulada` |

Únicos: parcial `(documento_id, regla) where estado = 'vigente'`. Índices: `(empresa_id, periodo_de_aplicacion) where
vigente`; **`retenciones_descontadas_sin_constancia_idx (empresa_id, cliente_id, descontada_en) where estado = 'vigente'
and constancia_id is null and descontada_en is not null`** (el reporte diario del dictamen). RLS: empresa.

### 5.8 Folios del libro

`libro_de_ventas.foliacion_del_libro` y `libro_de_ventas.emisiones_del_libro` iguales a las de compras (una por empresa;
solo agregar; exclusión de traslapes en migración propia). Foliación **separada** de la de compras (VC-P23 a), que el
contador confirmó para el **régimen general** (V-10). Para el pequeño contribuyente (un solo libro habilitado de compras
y ventas) y el primario y pecuario (libro electrónico de la SAT, sin folios) la corrección del contador choca con VC-P23 a:
queda como pregunta nueva **VC-P25**; mientras tanto rige VC-P23 a, y el PDF de esos regímenes se titula «Auxiliar» (§3.4).
`emisiones_del_libro` guarda el régimen del período (`regimen_iva`) para que una respuesta posterior no cambie lo ya
emitido.

### 5.9 Migraciones y datos existentes

- `npm run generar -- modulo libro-de-ventas --nombre "Libro de ventas" --descripcion "…" --icono ReceiptText` crea el
  esqueleto y `0000_esquema`. Después: `0001_lv1_conceptos_y_datos_de_cliente` (con la auditoría permanente de §4.4),
  `0002_lv2_documentos_y_lineas`, `0003_lv3_retenciones_y_constancias` (con `documento_id` nulo también en
  `liquidacion_de_tarjeta`, §5.7), `0004_lv4_bandeja_de_dte`, `0005_lv5_folios` (con la exclusión de traslapes a mano,
  `--custom`), `0006_lv5_isr_mensual` (`pagos_de_isr_mensual`, §7.6).
- **Sin datos que convertir**. Permisos nuevos: el rol con acceso total los recibe solo; no hay migración «quien tenía X».
- Orden del migrador: `terceros` (VC-0a, `0010`) → `libro-de-compras` → `libro-de-ventas`.

## 6. Datos de Cuentas por cobrar (esquema `cuentas_por_cobrar`)

Mismas convenciones de §5.

### 6.1 `cuentas_por_cobrar.condiciones_de_cliente` (por cuenta; sección aportada)

Como `condiciones_de_proveedor`: `cliente_id` (FK compuesta a `terceros.clientes (id, cuenta_id)` on delete cascade, único);
`dias_de_credito smallint null` (0–365; `null` = plazo por omisión, `0` = contado); `limite_de_credito numeric(14,2) null`
(`> 0`; **solo aviso** al recibir un cargo que lo pasa); `politicaPorCuenta()`. Nunca se borra una fila.

### 6.2 `cuentas_por_cobrar.documentos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK; `documentos_id_cliente_unico (id, empresa_id, cliente_id)` y, con Multimoneda, `(…, moneda)` |
| `origen` | text | no | `in ('libro_de_ventas', 'saldo_inicial')` |
| `documento_id`, `destino` | uuid, text | sí, no | FK compuesta `(documento_id, empresa_id, destino) → libro_de_ventas.documentos (id, empresa_id, destino)`; `destino default 'cuentas-por-cobrar'`; único parcial `(documento_id)`; `(origen = 'libro_de_ventas') = (documento_id is not null)` |
| `clase` | text | no | `in ('cargo', 'abono')`: factura y nota de débito son cargo; nota de crédito y de abono, abono |
| `tipo` | text | no | El del libro (copiado) o, en saldo inicial, `in ('factura', 'factura_cambiaria', 'nota_de_debito', 'nota_de_credito', 'nota_de_abono', 'otro_cargo')` |
| `cliente_id` | uuid | no | FK compuesta a `terceros.clientes`; índice `(empresa_id, cliente_id)` |
| `serie`, `numero` | text | sí, no | Copiados o escritos (saldo inicial) |
| `documento_afectado_id` | uuid | sí | El cargo que corrige un abono o una nota de débito (por su id de aquí) |
| `fecha_emision` | date | no | |
| `vencimiento` | date | sí | Solo cargos (check `(clase = 'cargo') = (vencimiento is not null)`); `>= fecha_emision` |
| `total` | numeric(14,2) | no | `> 0`; en la moneda del documento |
| `saldo_al_inicio` | numeric(14,2) | sí | Solo saldo inicial: lo que faltaba cobrar al corte (`> 0`, `<= total`) |
| `referencia` | text | sí | Solo saldo inicial: cómo se llama en el sistema anterior |
| `contrasena_del_cliente`, `fecha_de_contrasena`, `fecha_probable_de_pago` | text, date, date | sí | Lo que entrega el cliente al recibir la factura (VC-P16); los dos primeros juntos; solo cargos |
| `moneda`, `tipo_de_cambio`, `total_en_quetzales` | | no | Como CxP en `diseno-multimoneda.md` §6.5 |
| `estado` + anulación completa | | | `vigente`/`anulado` (el anulado del libro, o el saldo inicial anulado) |

Índices: `documentos_vencimiento_idx (empresa_id, vencimiento) where estado = 'vigente' and clase = 'cargo'` (antigüedad y
por vencer), `(empresa_id, origen)`. RLS: empresa.

### 6.3 `cuentas_por_cobrar.cobros`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK; `cobros_id_cliente_unico (id, empresa_id, cliente_id)` |
| `cliente_id` | uuid | no | FK compuesta a clientes |
| `numero`, `anio_de_numero` | integer | no | Correlativo `cuentas-por-cobrar.cobros` = **número del recibo de cobro** (VC-P12); único `(empresa_id, anio_de_numero, numero)` |
| `forma` | text | no | `in ('deposito', 'nota_ligada', 'solo_retenciones', 'cuenta_de_apertura', 'saldo_inicial')`; con VC-P10: `'tarjeta'` |
| `medio` | text | sí | Informativo del depósito: `in ('efectivo', 'cheque', 'transferencia', 'tarjeta')`; obligatorio en `deposito` y `nota_ligada` |
| `fecha` | date | no | La del movimiento de Bancos, o la de inicio en saldo inicial |
| `monto` | numeric(14,2) | no | Dinero recibido: `> 0` salvo en `solo_retenciones` (`= 0`) (check) |
| `movimiento_id` | uuid | sí | FK `bancos.movimientos (id)`; índice; `(forma in ('deposito', 'nota_ligada', 'tarjeta')) = (movimiento_id is not null)`; único parcial `where forma = 'deposito'` |
| `referencia` | text | sí | Número de boleta, de cheque del cliente y su banco, de transferencia |
| `comision` | numeric(14,2) | sí | Solo `tarjeta` (CXC-5): comisión de la adquirente, **informativa** (bruto = `monto` + `comision` + retención). **[validación 2026-11-19, V-8]**: no es «exenta siempre»: H7 exime solo a las entidades fiscalizadas por la SIB. Arrancar no supone el trato: la comisión se registra con la FEL de la adquirente en Libro de compras (con crédito, si lo hay); en Bancos solo va el monto |
| `motivo` | text | sí | Obligatorio en `cuenta_de_apertura` (lo ya cobrado antes del corte, como CxP) |
| `estado` | text | no | `in ('vigente', 'anulado', 'rechazado')` |
| `fecha_de_anulacion` + anulación completa | | | Como CxP (CP5): la del inverso en Bancos o la del día |
| `rechazado_en`, `rechazado_por`, `motivo_de_rechazo`, `fecha_de_rechazo`, `movimiento_de_rechazo_id` | | sí | `(estado = 'rechazado') = (todos no nulos)`; solo `medio = 'cheque'`; FK al débito de Bancos |

Índices: `(empresa_id, cliente_id, fecha)`, `(empresa_id, fecha)`. RLS: empresa.

### 6.4 `cuentas_por_cobrar.aplicaciones_de_cobros`

`id`; `cobro_id`, `cargo_id`, `cliente_id` (llaves compuestas con `(…, empresa_id, cliente_id)` hacia `cobros` y
`documentos`: la base garantiza que el cargo es del cliente del cobro); `monto numeric > 0`; `fecha` (la del cobro o la de
la reaplicación del saldo a favor); `vigente boolean default true` (pasa a `false` al anular o rechazar). Únicos:
`(cobro_id, cargo_id) where vigente`. Índices: `(cargo_id) where vigente`, `(cobro_id)`. Que el monto no pase del saldo y
que la suma no pase del cobro lo cuida el dominio con las filas bloqueadas (`for update` del cargo y del cobro), como CP4.

### 6.5 `cuentas_por_cobrar.aplicaciones_de_abonos`

Como `cuentas_por_pagar.aplicaciones_de_notas`: `abono_id` (documento de clase `abono`), `cargo_id`, `cliente_id`, `monto`,
`fecha`, `vigente`. Al recibir una nota de crédito o de abono con documento afectado, se aplica **sola** a su cargo hasta
el saldo; el resto queda libre.

### 6.6 `cuentas_por_cobrar.retenciones_aplicadas`

`id`; `cobro_id` (FK compuesta); `cargo_id` (FK compuesta); `retencion_recibida_id` (FK compuesta
`(retencion_recibida_id, empresa_id) → libro_de_ventas.retenciones_recibidas (id, empresa_id)`); `monto` (copiado de la
retención, `> 0`); `vigente`. Único parcial `(retencion_recibida_id) where vigente`: una retención baja el saldo **una
vez**. Índices `(cargo_id) where vigente`, `(cobro_id)`.

### 6.7 `cuentas_por_cobrar.devoluciones`

`id`; `numero`, `anio_de_numero` (correlativo `cuentas-por-cobrar.devoluciones`); `cliente_id`; `fecha`; `monto > 0`;
`movimiento_id` (FK a Bancos: cheque o nota de débito creados por orden con `devolucion_a_cliente`); `motivo` 1–300;
anulación completa. `devoluciones_de_saldo` (`devolucion_id`, `cobro_id` **o** `abono_id`, `monto`, `vigente`): de qué
saldo a favor sale. RLS: empresa.

### 6.8 `cuentas_por_cobrar.ajustes_de_saldo`

Como el de CxP: `documento_id` (cargo o abono), `monto > 0`, `fecha`, `causa in ('diferencia_menor', 'baja_de_abono')`,
`motivo`, `cobro_id` nulo (la diferencia menor nace de un cobro y se anula con él), anulación completa. Tope de la diferencia
menor por configuración. **No** sustituye la nota de crédito: un descuento por pronto pago va por NCRE (dictamen §6), y el
ajuste lo dice en su ayuda.

### 6.9 `cuentas_por_cobrar.castigos` y `cuentas_por_cobrar.recuperaciones`

`castigos`: `id`; `numero`, `anio_de_numero` (correlativo `cuentas-por-cobrar.castigos`); `cargo_id` (FK compuesta);
`fecha`; `monto > 0` (≤ saldo: dominio); `causa in ('gestion_agotada', 'cobro_judicial', 'prescripcion', 'insolvencia',
'otra')`; `motivo` 1–500; `respaldo` text 1–200 (número de demanda, gestiones); `archivo_id` (FK `core.archivos`,
`recurso_dueno = 'cuentas-por-cobrar.castigos'`); `regimen_isr_de_la_empresa` (copiado: dice si puede tener efecto fiscal);
anulación completa. Índice `(empresa_id, fecha)`, `(cargo_id)`.

`recuperaciones`: `castigo_id`, `fecha`, `monto > 0` (Σ ≤ castigo), `motivo`, anulación completa. Una recuperación
**reabre** saldo por su monto para que el cobro se aplique como cualquier otro. **[validación 2026-11-19, V-12]**: es renta
gravada **del período en que se recupera** solo si el castigo se dedujo (régimen `utilidades` copiado en el castigo); en el
opcional simplificado no tiene efecto fiscal (la venta ya tributó). No genera débito de IVA. Asiento que sugiere el
contador: cobro Bancos / Clientes; recuperación Clientes / «Recuperación de cuentas castigadas» (otros ingresos) o contra
la estimación si se usó reserva (NIIF para las Pymes 11.26).

### 6.10 Reservadas para después

- `cuentas_por_cobrar.estimaciones` (CXC-9): `periodo`, `metodo in ('directo', 'reserva', 'solo_contable')`,
  `saldos_deudores`, `porcentaje`, `monto_contable`, `parte_deducible`, `regimen_isr`, cierre y reapertura con motivo
  (como `activos_fijos.cierres`).
- `cuentas_por_cobrar.abonos_pactados` (FCAM): `documento_id`, `numero`, `vencimiento`, `monto`; con ellos la antigüedad
  usa cada abono (es el U14 a de CxP, del lado del cobro).

### 6.11 `cuentas_por_cobrar.saldos_del_balance_de_apertura`

Como el de CxP en EM-2 (una fila por empresa, cifras del balance para el cuadre), cuando EM-2 pida comparar (hoy solo
avisos).

### 6.12 Multimoneda y migraciones

- Columnas de moneda en `documentos`, `cobros`, `aplicaciones_*`, `retenciones_aplicadas`, `devoluciones` y `ajustes`
  **desde el primer día**, como CxP en `diseno-multimoneda.md` §6.5 (con `default 'GTQ'` y el check «GTQ ⇒ tipo 1 y
  equivalente igual»). El dominio solo acepta GTQ hasta que Multimoneda esté en `main` (VC-P19). Nunca se suman monedas.
- `npm run generar -- modulo cuentas-por-cobrar --nombre "Cuentas por cobrar" --icono HandCoins`; luego
  `0001_cxc1_condiciones_y_documentos` (con auditoría permanente), `0002_cxc2_abonos`, `0003_cxc3_cobros_y_retenciones`,
  `0004_cxc4_saldo_a_favor_y_ajustes`, `0005_cxc5_rechazos`, `0006_cxc6_saldos_iniciales`, `0007_cxc8_castigos`.
- Sin datos que convertir. Orden del migrador: `bancos`, `libro-de-ventas` → `cuentas-por-cobrar`. La prueba
  `llaves-entre-esquemas` acepta las llaves a `libro_de_ventas`, `bancos`, `terceros` (transitivo), `empresas` y `core`.

## 7. Reglas de Libro de ventas (un caso de uso por acción)

### 7.1 Registrar un documento (`RegistrarDocumentoDeVenta`, `documentos.crear`)

1. Empresa con NIT y con historial fiscal para el mes; sin historial → `empresa_sin_datos_fiscales` (no se supone régimen).
2. `fecha_emision >= fecha de inicio` (si la hay): si no, `documento_anterior_a_la_fecha_de_inicio` («cárguelo como saldo
   inicial en Cuentas por cobrar»). Si la fecha de inicio no es día 1, aviso: «el libro de ese mes queda incompleto».
3. Período declarado → `periodo_declarado` (o aviso con el control apagado).
4. Régimen derogado (`pequeno_contribuyente_electronico` o `contribuyente_agropecuario`, o su familia de documento) en un
   período de `libro-de-compras.regimenes.fecha_de_derogacion` en adelante → `regimen_derogado` (V-4). Fuera de eso,
   familia del tipo contra el régimen del mes → aviso si no coincide.
5. Líneas: suma = total; el IVA del documento es el del DTE (si viene de la bandeja) y se reparte en las líneas gravadas
   en proporción (centavos al final); gravada con IVA = `round(base × tasa)` ± 1 centavo por línea.
6. Notas: con documento afectado del mismo cliente, vigente, emitido antes; una nota de crédito no pasa del total de su
   factura menos las notas anteriores (como compras). Sin documento afectado → datos de la factura anterior.
   **[validación 2026-11-19, V-9 y V-5]**:
   - Nota de crédito emitida en o después del día en que se cumplen **dos meses** desde la fecha de su factura (la misma
     regla «vence la víspera» de compras): aviso, sin bloqueo, «Fuera del plazo del art. 17: la SAT podría rechazar la
     rebaja del débito». Rebaja el débito **del mes de la nota**, sin rectificar el mes de la factura.
   - Nota de crédito sobre una `factura_especial_recibida` → `nota_sobre_factura_especial`.
   - Retenciones de la factura afectada por una **nota de crédito**: las que **no** tienen constancia ni están descontadas
     se **ajustan en proporción** (`monto_propuesto` y `monto` = original × (total de la factura − Σ notas de crédito
     vigentes) ÷ total, redondeado al centavo; queda en el motivo del ajuste «Ajuste por la nota de crédito serie-número»),
     como compras. Las que ya tienen constancia **no se tocan**: lo que se devuelve de más queda como saldo a favor del
     cliente (lo produce solo la cartera). Las descontadas sin constancia tampoco se tocan, con aviso «El cliente ya
     descontó esa retención: pídale la constancia por el monto descontado» **[opinión del arquitecto, V-13 en §18]**.
     Anular la nota recalcula la proporción.
   - `nota_de_abono`: aviso «Si es un descuento o una devolución, use nota de crédito: la nota de abono no rebaja el IVA
     (art. 17)». No toca el débito ni las retenciones; en el libro va en un **anexo**, fuera de los totales y de la cantidad
     y el monto de operaciones.
7. Retenciones esperadas (§7.3) y, en `factura_especial_recibida`, las dos de §4.5 con su constancia y el aviso de empresa
   inscrita.
8. Destino: `cuentas-por-cobrar` si la cartera está activa y el documento tiene cliente (o según configuración); manda
   `cuentas-por-cobrar.recibir_documento` en la misma transacción (si responde con error, se deshace todo).
9. Evento `libro-de-ventas.documento_registrado` después de confirmar.

### 7.2 Anular y eliminar (`AnularDocumentoDeVenta` / `EliminarDocumentoDeVenta`)

- **Anular** (`documentos.anular`): causa y motivo; avisa `libro-de-ventas.documento_por_anular` (la cartera rechaza si el
  cargo tiene cobros o retenciones aplicadas vigentes: `documento_con_cobros`, con los números de recibo; si no, anula su
  cargo). Las retenciones del documento se anulan con él; una ya **con constancia** queda «por resolver» (como compras:
  `resolucion` pendiente) — la constancia existe y el cliente la tiene que anular. Período declarado → aviso de
  rectificación. Auditoría `anular` con el DTO.
- **Plazo de anulación en la SAT** **[validación 2026-11-19, V-11]**: desde el 1-09-2023 un DTE solo se anula en la SAT
  hasta el **vencimiento de la declaración mensual del IVA** de su período; después solo cabe la nota de crédito. Hoy no
  hay en el código un cálculo de ese vencimiento (compras solo lo menciona en un aviso de períodos): LV-2 lo agrega en el
  dominio de ventas como el último día del mes siguiente al período, corrido al siguiente día hábil con
  `core/calendario` (Ley del IVA art. 40, **por confirmar** con el contador en §18 V-14). Al anular con causa `error_de_captura` un
  documento que sigue vigente en la SAT (o sin dato de la SAT) y cuyo plazo pasó: aviso «Ya no se puede anular en la SAT:
  emita una nota de crédito». Solo avisa; no bloquea.
- **Eliminar** (`documentos.eliminar`): solo sin `procesado_en_destino_en`, período sin declarar, sin retenciones con
  constancia; avisa `…_por_eliminar`. Auditoría `eliminar`. Si vino de la bandeja, su fila vuelve a `pendiente`.

### 7.3 Retenciones esperadas (dominio puro, `dominio/retenciones/*.ts`, con pruebas)

| Régimen de la empresa en el mes | Dato del cliente | Regla | Base y monto | Mínimo |
|---|---|---|---|---|
| Cualquiera | Documento `nota_de_debito` | **Ninguna propuesta** (espejo de compras, hasta confirmarlo en Retenciones Web); se puede **informar** | — | — |
| Cualquiera | Documento `nota_de_credito` o `nota_de_abono` | Ninguna propia; la nota de crédito ajusta en proporción las de su factura (§7.1 paso 6) | — | — |
| IVA general | `agente_de_retencion_iva = 'exportador'` y `exporta_productos_agropecuarios`, línea de bien | `iva_exportador_agropecuario` | IVA de esas líneas × 65 % | Total ≥ `libro-de-compras.retenciones_iva.minimo` |
| IVA general | `exportador` (resto) / `contribuyente_especial` / `otro` | `iva_exportador` / `iva_contribuyente_especial` / `iva_otro_agente` | IVA × 15 % | Ídem |
| IVA general | `sector_publico` | `iva_sector_publico` | IVA × 25 % | Total ≥ `…minimo_sector_publico` |
| Pequeño contribuyente (y electrónico) | Agente de IVA y `retiene_iva_a_pequeno_contribuyente` | `iva_pequeno_contribuyente` | Total × 5 % | Total > `…umbral_pequeno_contribuyente` |
| ISR opcional simplificado | `retiene_isr` | `isr_opcional_simplificado` | Base sin IVA: 5 % hasta el límite del tramo y 7 % del excedente | Base > `…retenciones_isr.minimo` |
| Empresa agente de retención de IVA | Cualquiera | Ninguna de IVA (Decreto 20-2006 art. 9) | — | **Pendiente** (V-3) si el sector público o la tarjeta retienen igual: regla provisional, se puede **informar** sin marca de indebida y con el aviso «Verifique si procede: entre agentes no se retiene, salvo excepciones por confirmar» |
| Primario y pecuario (ICT) | — | Ninguna propuesta (el comprador no retiene, salvo quien emite la FEPE afiliado al ICT) | El usuario puede informar | V-4 |
| No afiliado | — | Ninguna propuesta; las de la `FESP` son las de §4.5 | El usuario puede informar | V-1 |
| Derogados (agropecuario, pequeño contribuyente electrónico) | — | Ninguna (solo histórico, antes de la derogación) | — | V-4 |

Las tasas y mínimos **son las mismas claves** de Libro de compras (`libro-de-compras.iva.tasa`,
`libro-de-compras.retenciones_iva.*`, `libro-de-compras.retenciones_isr.*`), leídas con `LectorDeConfiguracion` por su
clave: la ley es una sola y soporte la cambia en un lugar (VC-P9). Solo `iva_tarjeta` es nueva (§11.3).

### 7.4 Bandeja de DTE emitidos (`ImportarDteEmitidos`, `RegistrarDesdeLaBandeja`, `DescartarDte`, `RestaurarDte`)

- Importar (`documentos.importar`): lee con el lector de `core/intercambio` (mismos topes: 5 MB, 10,000 filas, validador de
  `.xlsx`/`.xls`), mapa de encabezados de «DTE emitidos» (confirmar con un archivo real, §17 VC-P3), fechas con o sin zona
  en hora de la empresa, montos con 2 decimales como mínimo. Por fila: NIT emisor = el de la empresa; si ya existe por
  autorización, actualiza `estado_sat` (un DTE **anulado** en la SAT cuyo documento está vigente queda en la lista «Anulados
  en la SAT y vigentes en el libro» del cuadre, §7.6, para que el usuario lo anule; no se anula solo).
- Si la misma autorización está registrada en **otra empresa de la cuenta** (dos empresas con el mismo NIT, p. ej. una
  persona individual con dos fincas), la fila queda `bloqueada` como en compras; el código de establecimiento ayuda a
  decidir de cuál es.
- Proponer: cliente por NIT (o crearlo con la orden de Terceros si el usuario tiene `clientes.crear`; CF → sin cliente),
  localidad por código de establecimiento, concepto = el último usado con ese cliente o el primero de su tipo, clase fiscal
  `gravada` (si IVA > 0) o `exenta`, destino según §3.2.
- Registrar uno o varios seleccionados (`documentos.crear`): el mismo caso de uso de §7.1, todo o nada por selección.

### 7.5 Retenciones y constancias

- `RegistrarRetencionInformada` (`retenciones.crear`): sobre un documento vigente del cliente; aviso `es_indebida` según
  §7.3.
- `AjustarRetencion` (`retenciones.ajustar`): monto con motivo; auditoría `ajustar`.
- `AnularRetencion` (`retenciones.anular`): sin aplicación vigente en la cartera (la cartera responde el aviso
  `libro-de-ventas.retencion_por_anular`); auditoría `anular`.
- `RegistrarConstancia` (`retenciones.constancias`): cliente, impuesto, número, fecha, archivo y las retenciones que
  ampara (del mismo cliente e impuesto, vigentes, sin constancia); la suma debe dar el total (si no:
  `constancia_no_cuadra`, con la diferencia). Propone el período de aplicación de §3.5. Anular la constancia
  (`retenciones.constancias`, motivo, auditoría) suelta sus retenciones.
- `CambiarPeriodoDeAplicacion` (`retenciones.ajustar`): solo a un período sin declarar.

### 7.6 Libro, cuadre y declaración

- **Libro del período** (`libro.ver`, `libro.exportar`, `libro.emitir`): una fila por documento (vigentes y anulados en
  cero), columnas de §3.4, notas de crédito y de débito con signo, retenciones informativas, totales; tipo de libro según
  el régimen del mes. Emitir con folios igual que compras (PDF de `core/impresion`, emisión que solo se agrega, huella de
  datos). **[validación 2026-11-19]**: las **notas de abono** van en un anexo fuera de los totales (V-5); las **facturas
  especiales recibidas**, en la columna «Ventas con factura especial (IVA retenido en su totalidad)», fuera del débito
  (V-1); en primario y pecuario y en el pequeño contribuyente el PDF se titula «Auxiliar» (§3.4, VC-P25).
- **Cuadre SAT contra libro** (`libro.ver`): con lo importado del mes: DTE de la SAT sin registrar, registrados que la SAT
  no tiene (manuales), anulados en la SAT y vigentes en el libro, montos distintos. Recomendado por el dictamen §2. Un DTE
  anulado en la SAT de un mes **ya declarado** lleva «hay que rectificar ese mes» (V-11); un archivo importado antes del
  vencimiento de la declaración no es definitivo (aviso, como L4 en compras).
- **Cifras para la declaración** (pregunta de §3.3): débito por rubro, exentas, exportaciones, cantidad y monto de
  operaciones (con notas de crédito y de débito; sin notas de abono ni facturas especiales recibidas), retenciones de IVA
  **con constancia** aplicadas al período (sin `factura_especial`). Para el pequeño contribuyente: ingresos del mes y
  constancias del período. Para `primario_pecuario`: ventas locales y exportaciones por separado (V-4); el margen bovino y
  el cálculo del ICT con `libro-de-ventas.ict.*`, en LV-7 si VC-P24 lo pide.
- **Datos para el ISR mensual** del opcional simplificado (pantalla propia) **[validación 2026-11-19, V-6, corrige la
  regla]**: por cada factura (y nota) del **mes de emisión**, base sin IVA. La factura es **«sujeta a retención»** si tiene
  una retención `isr_opcional_simplificado` **vigente** (esperada, informada o con constancia; **no** importa si ya se
  descontó) **y** su base pasa de `libro-de-compras.retenciones_isr.minimo`; las demás van a **«pago directo»**. El
  impuesto del pago directo = 5 % de la suma del mes hasta el tramo y 7 % del excedente, **sobre el total mensual** (lo que
  hace el SAT-1311; el contador pide confirmarlo con una captura, VC-P29). Muestra también rentas totales, exentas y con
  retención (lo que informa el SAT-1311) y el vencimiento (10 días hábiles del mes siguiente, `core/calendario`). Avisos:
  - factura de un cliente que retiene sin constancia al cierre: «Si el cliente no retiene, usted debe pagar ese ISR (con
    multa e intereses si ya venció)»;
  - retención informada o constancia nueva sobre una factura de un mes cuyo ISR ya se pagó como pago directo: «Posible
    pago doble: rectifique o pida la devolución». Para saberlo, la pantalla permite **marcar el mes como pagado**: tabla
    `libro_de_ventas.pagos_de_isr_mensual` (`periodo`, `pagado_en`, `foto jsonb` con la clasificación de cada factura,
    `numero_de_formulario` text nulo, anulación completa; único `(empresa_id, periodo) where vigente`; RLS empresa;
    migración `0006_lv5_isr_mensual`). Sin esa marca, el aviso no se puede dar.
- **Límite anual del pequeño contribuyente**: aviso en la lista de documentos y en el libro cuando las ventas del año
  pasan del 80 % y del 100 % del límite del año (`libro-de-ventas.pequeno_contribuyente.limites_anuales`).
- **Venta de activo fijo**: las líneas con el concepto de sistema `venta_de_activo_fijo` alimentan el concepto de Bancos
  `cobro_a_cliente_de_activo` cuando se cobran (flujo de Inversión) y el reporte «Ventas de activos fijos» para cruzarlo con
  las ventas que transcribe Activos fijos (AF-P11). Sin llave entre los dos módulos (ninguno depende del otro).

## 8. Reglas de Cuentas por cobrar

### 8.1 Recibir un documento (`RecibirDocumento`, orden `cuentas-por-cobrar.recibir_documento`)

Crea el cargo o el abono con el cliente, el total, la moneda y el vencimiento = emisión + días del cliente (o + meses por
omisión; `0` = contado: vence el mismo día). Un abono con cargo afectado se aplica solo hasta el saldo. Aviso si el saldo
del cliente pasa su límite de crédito. Idempotente por `documento_id`. Llama `libro-de-ventas.marcar_procesado` solo
cuando el cargo recibe su primera aplicación (antes se puede eliminar en el libro).

### 8.2 Documentos (`documentos.ver`, `documentos.editar`)

`CambiarVencimiento` (no antes de la emisión; aviso si ya está saldado; auditoría `corregir` con el vencimiento anterior),
`RegistrarContrasenaDelCliente` (número, fecha, fecha probable de pago; varias facturas a la vez con el mismo número).

### 8.3 Cobrar (`RegistrarCobro`, `cobros.crear`)

1. Cliente, fecha, forma y medio; cargos del cliente con saldo (de una sola moneda) y cuánto a cada uno; retenciones a
   aplicar (las esperadas o con constancia del cliente en esos cargos, y las que se informan aquí con
   `libro-de-ventas.registrar_retencion_recibida`).
2. Forma `deposito`: orden `bancos.registrar_nota_de_origen` (crédito, cuenta elegida, fecha, monto, beneficiario = el
   cliente, conceptos: `cobro_a_cliente` y, por la parte aplicada a líneas de venta de activo, `cobro_a_cliente_de_activo`;
   lo no aplicado va a `cobro_a_cliente`). Forma `nota_ligada`: una nota de crédito marcada para la cartera
   (§4.2 b), vigente, sin otro cobro; fija su desglose con `bancos.fijar_desglose_de_conceptos`. Forma
   `solo_retenciones`: sin movimiento. Forma `cuenta_de_apertura`: solo sobre cargos de saldo inicial, con motivo y permiso
   propio (`cobros.aplicar-a-apertura`), como CxP.
3. Σ aplicaciones ≤ monto; lo que sobra queda como **saldo a favor** con aviso («quedan Q x a favor del cliente»). Con la
   configuración de anticipos en `aviso` (VC-P13 a), si el cliente no tenía cargos, el aviso dice **[validación
   2026-11-19]**: «Si es un anticipo por **servicios**, el IVA nace al recibirlo: debe emitir la factura (Ley del IVA arts.
   4 y 29). Si es por **bienes**, lo prudente es facturarlo también. Revise con su contador.» Con `factura_obligatoria`,
   el cobro sin cargos se rechaza (`anticipo_sin_factura`) salvo que se aplique a un documento ya registrado. Qué empresas
   llevan `factura_obligatoria` por omisión es la pregunta nueva VC-P26.
4. Cada retención aplicada: orden `libro-de-ventas.marcar_retencion_descontada` (pone `descontada_en` y `cobro_id`).
5. Diferencia menor (opcional): un ajuste `diferencia_menor` hasta el tope de la configuración.
6. Recibo de cobro numerado (imprimible, sin efecto fiscal: «Este recibo no sustituye la factura»).
7. Evento `cuentas-por-cobrar.cobro_registrado`.

### 8.4 Anular un cobro (`AnularCobro`, `cobros.anular`)

Motivo y fecha; orden `bancos.anular_movimiento_de_origen` (inverso, o «nunca existió» si el mes no está conciliado, como
CP5) en `deposito`; en `nota_ligada` solo se suelta la nota (vuelve a quedar marcada). Las aplicaciones y retenciones
aplicadas pasan a `vigente = false`; orden `marcar_retencion_descontada(false)`; el ajuste de diferencia menor se anula.
Rechaza si de su saldo a favor ya salió una devolución vigente. Auditoría `anular` con el DTO.

### 8.5 Cheque rechazado (`RegistrarChequeRechazado`, `cobros.rechazar`)

Solo `medio = 'cheque'`, vigente. Orden `bancos.registrar_nota_de_origen` (débito, misma cuenta, `cheque_rechazado`, la
fecha del banco). Las aplicaciones **de dinero** pasan a `false` (el cargo vuelve a deber); las **retenciones aplicadas se
quedan** (validado 2026-11-19, V-7: la retención nace al pagar o acreditar, no al cobrar el cheque; el cliente solo debe
el neto). Una retención solo esperada también se queda; si el cliente después dice que no retendrá, el usuario la quita
con la acción que ya existe (auditoría `quitar`). Estado `rechazado`. El recargo al cliente, si se cobra, es una
**nota de débito** que se emite y se registra en Libro de ventas (VC-P11), no un ajuste. Auditoría `anular` con causa
«rechazo». El cargo bancario por el rechazo (comisión) lo registra Bancos aparte.

### 8.6 Saldo a favor (`AplicarSaldoAFavor`, `cobros.aplicar`; `DevolverSaldoAFavor`, `devoluciones.crear`)

- Aplicar: lo libre de un cobro o de un abono a cargos del mismo cliente y moneda, con su fecha. Auditoría al quitar una
  aplicación (`quitar`).
- Devolver: cheque (`bancos.emitir_cheque_de_origen`) o nota de débito (`bancos.registrar_nota_de_origen`) con
  `devolucion_a_cliente`; anular la devolución anula el movimiento (orden) y devuelve el saldo a favor.

### 8.7 Castigo y recuperación (`castigos.crear`, `.anular`, `.recuperar`)

Castigo sobre el saldo de un cargo con causa, motivo, respaldo y archivo (aviso si falta el respaldo, no bloqueo). Muestra
el aviso del dictamen: «El IVA de esta factura no se recupera; el castigo no toca el Libro de ventas» y, según el régimen
de ISR copiado, «Puede ser deducible (ISR art. 21) si: es del giro habitual, hubo gestión de cobro o un procedimiento
judicial iniciado **antes de la prescripción** (dos años para el comerciante) y el método no cambió sin autorización de la
SAT» o «No tiene efecto fiscal en su régimen» **[validación 2026-11-19, V-12]**. Recuperar reabre saldo, con el aviso
«Lo recuperado es renta gravada de este período (ISR art. 21 num. 20)» solo si el castigo es de régimen `utilidades`, y
«No tiene efecto fiscal en su régimen» en los demás; en ninguno genera débito de IVA. Auditoría `anular` del castigo con el
DTO.

### 8.8 Avisos de otros módulos

| Aviso | Qué hace la cartera |
|---|---|
| `libro-de-ventas.documento_por_anular` / `…_por_eliminar` | Rechaza si el cargo tiene aplicaciones vigentes; si no, anula o borra su cargo (o su abono, soltando sus aplicaciones) |
| `libro-de-ventas.retencion_por_anular` | Rechaza si la retención está aplicada (`retencion_aplicada`, con el recibo) |
| `bancos.movimiento_por_cambiar` (origen `cuentas-por-cobrar` o marcada) | `anular`: rechaza si el cobro tiene aplicaciones vigentes (`anular desde Cuentas por cobrar`); `desmarcar` de una nota ligada: rechaza si está ligada; `eliminar`: igual que anular; `reclasificar`: rechaza (lo fija la cartera) |
| `empresas.fecha_de_inicio_por_cambiar` | Rechaza si algún saldo inicial tiene emisión igual o posterior a la nueva fecha |
| `terceros.cliente_guardado` | Guarda su sección (días y límite) |

### 8.9 Saldos iniciales y la carga inicial (EM-2)

- Pantalla de Administración **«Saldos iniciales de clientes»** (con Excel): solo con fecha de inicio y carga abierta
  (`empresas.obtener_carga_inicial`, que bloquea `for share`). Por fila: cliente, tipo, serie y número, fecha de emisión y
  vencimiento reales, total, saldo al corte, moneda, referencia, contraseña del cliente. Un **saldo a favor** inicial del
  cliente es un cobro `forma = 'saldo_inicial'` sin movimiento (anticipos recibidos antes del corte).
- Una retención que el cliente todavía va a descontar de un saldo inicial se registra en Libro de ventas con
  `origen = 'saldo_inicial'` y la referencia del documento, al cobrar (§8.3 paso 1): su período de aplicación es el de la
  constancia, ya dentro del sistema.
- Respuesta a `empresas.revisar_cierre_de_carga` (`RevisarCierreDeCargaEnCuentasPorCobrar`):

| Código | Nivel | Mensaje |
|---|---|---|
| `sin_saldos_iniciales` | aviso | «No hay ningún saldo inicial de clientes. Si le debían algo al dd/mm/aaaa, cárguelo antes de cerrar.» |
| `cliente_con_saldo_a_favor` | aviso | «N clientes quedan con saldo a favor por Q x (anticipos o pagos de más al corte).» |
| `vencidos_hace_mucho` | aviso | «N documentos de saldo inicial vencieron hace más de 12 meses por Q x: revise si se cobran o se castigan.» |

  Cifras: Documentos y Clientes (cantidades), Cargos, Saldos a favor, **Saldo de clientes** (Σ netos positivos por
  cliente) y **Saldo a favor de clientes** (Σ |netos negativos|), como CxP. Resumen «N documentos de M clientes». Ruta
  `/cuentas-por-cobrar/saldos-iniciales`.

## 9. Integración sin importarse entre sí (resumen)

| Con | Cómo | Dirección |
|---|---|---|
| Terceros | Llave compuesta a `clientes`; aviso `cliente_guardado` (secciones); orden `crear_cliente_desde_dte` | Ventas y cartera → Terceros |
| Libro de compras | Lectura de `datos_fiscales_de_empresa` y `periodos` (dependencia); pregunta `cifras_para_la_declaracion` | Ventas lee; Compras pregunta |
| Empresas | Llave a `localidades`; `obtener_carga_inicial`; responde `revisar_cierre_de_carga`; escucha `fecha_de_inicio_por_cambiar` | Ambos sentidos por el mediador |
| Bancos | Órdenes de nota, cheque, anulación y desglose; llave a `movimientos`; escucha `movimiento_por_cambiar` | Cartera → Bancos |
| Libro de ventas ↔ Cuentas por cobrar | `recibir_documento`, `marcar_procesado`, `registrar_retencion_recibida`, `marcar_retencion_descontada`, avisos de anular | Ventas ordena a la cartera al registrar; la cartera ordena a ventas al cobrar |
| Multimoneda (futuro) | Responder `multimoneda.partidas_en_moneda_extranjera` con los cargos y saldos a favor en moneda extranjera (naturaleza nueva `cuenta_por_cobrar`) | Cartera responde |
| Activos fijos | Ninguna llave; concepto de sistema `venta_de_activo_fijo` y reporte de cruce (§7.6) | — |
| Correo (aviso de pago) | Por simetría con CxP, «Enviar el recibo de cobro» a los contactos que reciben avisos (paso posterior, VC-P21) | Cartera → core/correo |
| Contabilidad (futuro) | Eventos de §10.3 | Contabilidad escucha |

## 10. Contratos (`core/contratos/libro-de-ventas.contratos.ts` y `cuentas-por-cobrar.contratos.ts`)

### 10.1 Órdenes

| Orden | Atiende | Datos → respuesta |
|---|---|---|
| `cuentas-por-cobrar.recibir_documento` | Cartera | `DocumentoDeVentaParaDestino` (`documentoId`, `tipo`, `clase`, `clienteId`, `documentoAfectadoId`, `facturaAnterior`, `fechaEmision`, `totalCentavos`, `moneda`, `tieneVentaDeActivo`) → `{ avisos }` |
| `libro-de-ventas.marcar_procesado` | Ventas | `{ documentoId, procesado }` |
| `libro-de-ventas.registrar_retencion_recibida` | Ventas | `{ documentoId \| referenciaDeSaldoInicial, clienteId, regla, base, montoCentavos, motivo? }` → `{ retencionId, avisos }` |
| `libro-de-ventas.marcar_retencion_descontada` | Ventas | `{ retencionId, cobroId \| null, fecha \| null }` |
| `libro-de-ventas.retenciones_del_cliente` | Ventas | `{ clienteId, documentoIds }` → retenciones vigentes no descontadas, con constancia o sin ella |

### 10.2 Avisos y preguntas

- Avisos de ventas: `libro-de-ventas.documento_por_anular`, `…_por_eliminar`, `…retencion_por_anular`.
- Pregunta de compras: `libro-de-compras.cifras_para_la_declaracion` (§3.3).
- Respuestas: cartera a `empresas.revisar_cierre_de_carga`; cartera (futuro) a `multimoneda.partidas_en_moneda_extranjera`.

### 10.3 Eventos para la futura Contabilidad (bus, después de confirmar; dinero en centavos)

| Evento | Datos propios | Asiento que sugiere el dictamen §7 |
|---|---|---|
| `libro-de-ventas.documento_registrado` | Tipo, cliente, período, líneas (concepto, clase fiscal, base, IVA), moneda y equivalentes, destino | Clientes (o Caja si no hay destino) / Ventas + IVA débito; NCRE al revés; NABN solo Clientes contra la cuenta del abono |
| `libro-de-ventas.documento_anulado` / `…_eliminado` | `documentoId`, `fechaDeAnulacion` | Reverso |
| `libro-de-ventas.retencion_registrada` / `…_anulada` / `…_ajustada` | Regla, impuesto, monto, período de aplicación | (Se contabiliza al aplicarse en la cartera o, sin cartera, contra Caja/Bancos) |
| `libro-de-ventas.constancia_registrada` / `…_anulada` | Retenciones que ampara | Sin asiento (control) |
| `cuentas-por-cobrar.cobro_registrado` | Forma, medio, movimiento, aplicaciones, retenciones aplicadas, comisión, saldo a favor | Bancos + IVA/ISR retenido por aplicar + comisión / Clientes + Anticipos de clientes |
| `cuentas-por-cobrar.cobro_anulado` / `…_rechazado` | Lo que revierte, `fechaDeAnulacion` o `fechaDeRechazo` | Reverso; rechazo: Clientes / Bancos |
| `cuentas-por-cobrar.saldo_a_favor_aplicado` / `…_desaplicado` | Cobro o abono, cargo, monto | Anticipos de clientes / Clientes |
| `cuentas-por-cobrar.devolucion_registrada` / `…_anulada` | Movimiento, saldos de los que sale | Anticipos de clientes / Bancos |
| `cuentas-por-cobrar.ajuste_registrado` / `…_anulado` | Causa, monto | Según la causa |
| `cuentas-por-cobrar.castigo_registrado` / `…_anulado`, `…recuperacion_registrada` / `…_anulada` | Cargo, monto, causa, régimen | Estimación o gasto / Clientes; recuperación: ingreso |

## 11. Permisos, auditoría, errores y configuración

### 11.1 Permisos (PLAN §3.5; ninguno `soloSuperacceso`)

| Recurso | Permisos |
|---|---|
| Conceptos de ingreso | `libro-de-ventas.conceptos-de-ingreso.ver`, `.crear`, `.editar`, `.eliminar`, `.importar`, `.exportar` |
| Documentos | `libro-de-ventas.documentos.ver`, `.crear`, `.anular`, `.eliminar`, `.importar` (bandeja de la SAT y Excel); `libro-de-ventas.dte-emitidos.descartar` |
| Retenciones | `libro-de-ventas.retenciones.ver`, `.crear`, `.ajustar`, `.anular`, `.constancias`, `.exportar` |
| Libro | `libro-de-ventas.libro.ver`, `.exportar`, `.emitir` |
| ISR mensual | `libro-de-ventas.isr-mensual.pagar` (marcar y anular la marca de «pagado», §7.6); verlo va con `libro.ver` |
| Reportes | `libro-de-ventas.reportes.ver`, `.exportar` |
| Documentos de la cartera | `cuentas-por-cobrar.documentos.ver`, `.editar` (vencimiento y contraseña del cliente) |
| Cobros | `cuentas-por-cobrar.cobros.ver`, `.crear`, `.anular`, `.rechazar`, `.aplicar` (saldo a favor), `.aplicar-a-apertura` |
| Devoluciones | `cuentas-por-cobrar.devoluciones.crear`, `.anular` |
| Ajustes | `cuentas-por-cobrar.ajustes.crear`, `.anular` |
| Castigos | `cuentas-por-cobrar.castigos.ver`, `.crear`, `.anular`, `.recuperar` |
| Saldos iniciales | `cuentas-por-cobrar.saldos-iniciales.ver`, `.crear`, `.editar`, `.eliminar`, `.importar`, `.exportar` |
| Reportes | `cuentas-por-cobrar.reportes.ver`, `.exportar` |

Los datos fiscales del cliente y sus condiciones se guardan con el permiso del formulario de Clientes (`clientes.crear` /
`clientes.editar`), como las secciones de Proveedores. Imprimir (recibo, libro, estado de cuenta) va con `.ver`. Sin
`recursosConAlcance` en v1 (VC-P15).

### 11.2 Auditoría (en la unidad de trabajo del caso de uso; `core.auditoria` solo se agrega)

| Caso de uso | `recurso` | `accion` | `anterior` |
|---|---|---|---|
| Inactivar, reactivar, eliminar concepto | `libro-de-ventas.conceptos-de-ingreso` | `inactivar` / `reactivar` / `eliminar` | DTO |
| Anular, eliminar documento | `libro-de-ventas.documentos` | `anular` / `eliminar` | DTO con líneas y retenciones |
| Descartar, restaurar DTE | `libro-de-ventas.dte-emitidos` | `descartar` / `devolver` | La fila |
| Ajustar, anular retención; cambiar período | `libro-de-ventas.retenciones` | `ajustar` / `anular` / `corregir` | DTO |
| Anular constancia | `libro-de-ventas.constancias` | `anular` | DTO con sus retenciones |
| Ajuste proporcional por nota de crédito (y su recálculo al anularla) | `libro-de-ventas.retenciones` | `ajustar` | DTO de la retención antes del ajuste |
| Período de aplicación elegido a mano por constancia de un mes declarado | `libro-de-ventas.retenciones` | `corregir` | DTO con el período propuesto |
| Anular la marca de ISR mensual pagado | `libro-de-ventas.isr-mensual` | `anular` | La marca con su foto |
| Cambiar vencimiento | `cuentas-por-cobrar.documentos` | `corregir` | Vencimiento anterior |
| Anular, rechazar cobro | `cuentas-por-cobrar.cobros` | `anular` (con `causa`: `anulacion` o `rechazo`) | DTO con aplicaciones |
| Quitar una aplicación de saldo a favor | `cuentas-por-cobrar.aplicaciones` | `quitar` | La aplicación |
| Anular devolución, ajuste | `cuentas-por-cobrar.devoluciones` / `.ajustes` | `anular` | DTO |
| Anular castigo o recuperación | `cuentas-por-cobrar.castigos` | `anular` | DTO |
| Editar, eliminar saldo inicial | `cuentas-por-cobrar.saldos-iniciales` | `corregir` / `eliminar` | DTO |
| Cobro a la cuenta de apertura | `cuentas-por-cobrar.cobros` | `ajustar` | El cobro (deja rastro de la excepción) |

Permanentes (§4.4): `libro-de-ventas.documentos`, `libro-de-ventas.retenciones`, `cuentas-por-cobrar.cobros`,
`cuentas-por-cobrar.castigos`.

### 11.3 Configuración (solo niveles `instalacion` y `empresa`)

| Clave | Nivel | Por omisión | Para qué |
|---|---|---|---|
| `libro-de-ventas.retenciones_iva.tarjeta` | instalación | 15 | Retención de IVA de la operadora de tarjeta (VC-P10), sobre el IVA contenido en el bruto de los vouchers (V-8). Se declara en CXC-5 |
| `libro-de-ventas.retenciones_iva.tarjeta_combustibles` | instalación | 1.5 | La misma en ventas de combustibles (V-8). Del 1-10 al 31-12-2026 está **suspendida** (Decreto 22-2026): como las tasas no tienen vigencia (VC-P9 a), soporte la pone en 0 ese trimestre si CXC-5 entra antes. Se declara en CXC-5 |
| `libro-de-ventas.ict.tasa_general` | instalación | 1.5 | ICT sobre ventas brutas del primario y pecuario (V-4); se declara en LV-1 aunque el cálculo llegue en LV-7 |
| `libro-de-ventas.ict.tasa_exportacion` | instalación | 2 | ICT de ciertas exportaciones (V-4) |
| `libro-de-ventas.ict.tasa_margen_bovino` | instalación | 10 | ICT sobre el margen del intermediario de bovinos (V-4) |
| `libro-de-ventas.pequeno_contribuyente.limites_anuales` | instalación | `{ "2026": 500285 }` | Límite por año (P-8); un año sin valor toma el último |
| `libro-de-ventas.destino.consumidor_final` | empresa, instalación | `sin_cartera` | VC-P5 |
| `libro-de-ventas.anticipos.tratamiento` | empresa | `aviso` | `aviso` o `factura_obligatoria` (VC-P13 a). `aviso`: el texto de §8.3 paso 3 (servicios exige factura); `factura_obligatoria`: el cobro sin cargos se rechaza. El valor por omisión en empresas de servicios es la pregunta nueva VC-P26 |
| `cuentas-por-cobrar.vencimientos.meses_por_omision` | empresa, instalación | 1 | Plazo del cliente sin días (como CxP) |
| `cuentas-por-cobrar.antiguedad.tramos` | empresa | `[30, 60, 90]` | Tramos del reporte (dictamen §6) |
| `cuentas-por-cobrar.ajustes.tope_diferencia_menor` | empresa, instalación | 1.00 | Diferencia menor que se puede ajustar al cobrar |
| `cuentas-por-cobrar.incobrables.metodo` (CXC-9) | empresa | `directo` | VC-P14 |
| `cuentas-por-cobrar.incobrables.porcentaje_reserva_fiscal` (CXC-9) | instalación | 3 | Dictamen §6, [Confirmar] |

Las tasas de IVA y retenciones se **leen** de las claves de Libro de compras (§7.3); el dictamen pide vigencia por fecha
(veredicto 2): **[corrige el dictamen]** cada retención guarda su porcentaje y su base al registrarse, así que un cambio de
tasa no reescribe el pasado; la vigencia en configuración sería un cambio del core para todos los módulos (VC-P9).

### 11.4 Errores nuevos (código propio, familias del core)

`empresa_sin_datos_fiscales`, `documento_anterior_a_la_fecha_de_inicio`, `periodo_declarado`, `documento_repetido`
(autorización o serie y número), `nota_sin_factura`, `nota_excede_la_factura`, `cliente_de_otra_cuenta`,
`dte_de_otro_emisor`, `documento_con_cobros` (con los recibos), `documento_procesado` (eliminar), `retencion_aplicada`,
`retencion_con_constancia`, `constancia_no_cuadra`, `constancia_repetida`, `periodo_de_aplicacion_declarado`,
`cargo_sin_saldo`, `aplicacion_excede_el_saldo`, `aplicacion_excede_el_cobro`, `monedas_distintas`,
`nota_no_marcada_para_cobros`, `nota_ya_ligada`, `cobro_con_devoluciones`, `cobro_no_es_cheque`,
`diferencia_menor_sobre_el_tope`, `castigo_excede_el_saldo`, `recuperacion_excede_el_castigo`, `carga_inicial_cerrada`,
`saldos_con_fecha_fuera_de_la_carga`, `solo_quetzales_por_ahora`. **[validación 2026-11-19]**: `regimen_derogado` (V-4),
`nota_sobre_factura_especial` (V-9), `anticipo_sin_factura` (VC-P13, con `factura_obligatoria`), `isr_mensual_ya_pagado`
(marcar dos veces el mismo mes).

## 12. API (todas con `proteger({ permiso })`; dinero como texto)

| Método y ruta | Permiso |
|---|---|
| `GET/POST /libro-de-ventas/conceptos-de-ingreso`, `PUT …/:id`, `POST …/:id/inactivar` y `/reactivar`, `DELETE …/:id`; `GET …/exportar`, `…/plantilla`, `POST …/importar` | `conceptos-de-ingreso.*` |
| `GET /libro-de-ventas/clientes/:clienteId/datos-fiscales` | `terceros.ver` |
| `GET /libro-de-ventas/documentos` (filtros: período, cliente, tipo, estado, destino, texto), `GET …/:id` | `documentos.ver` |
| `POST /libro-de-ventas/documentos`, `POST …/:id/anular`, `DELETE …/:id` | `documentos.crear` / `.anular` / `.eliminar` |
| `POST /libro-de-ventas/dte-emitidos/importar` (multipart), `GET /libro-de-ventas/dte-emitidos`, `GET …/lotes`, `PUT …/:id/borrador`, `POST …/registrar` (varios), `POST …/:id/descartar`, `POST …/:id/restaurar` | `documentos.importar`, `.ver`, `.crear`; `dte-emitidos.descartar` |
| `GET /libro-de-ventas/retenciones` (filtros: estado deducido, cliente, período), `POST …`, `POST …/:id/ajustar`, `POST …/:id/anular`, `POST …/:id/periodo` | `retenciones.*` |
| `GET/POST /libro-de-ventas/constancias`, `POST …/:id/anular`, `POST …/:id/archivo`, `GET …/:id/archivo` | `retenciones.constancias` / `.ver` |
| `GET /libro-de-ventas/libro/:periodo`, `…/exportar`, `POST …/emitir`, `GET …/emisiones` | `libro.*` |
| `GET /libro-de-ventas/cuadre-sat/:periodo`, `GET /libro-de-ventas/isr-mensual/:periodo` | `libro.ver` |
| `POST /libro-de-ventas/isr-mensual/:periodo/pagado`, `POST …/pagado/anular` | `isr-mensual.pagar` |
| `GET /libro-de-ventas/reportes/<reporte>` y `…/exportar` | `reportes.*` |
| `GET /cuentas-por-cobrar/clientes/:clienteId/condiciones`, `GET …/estado-de-cuenta` | `terceros.ver` / `documentos.ver` |
| `GET /cuentas-por-cobrar/documentos`, `GET …/:id`, `POST …/:id/vencimiento`, `POST …/contrasena` (varios) | `documentos.*` |
| `GET /cuentas-por-cobrar/clientes/:clienteId/por-cobrar` (cargos con saldo, saldo a favor, retenciones disponibles, notas marcadas en Bancos) | `cobros.crear` |
| `GET/POST /cuentas-por-cobrar/cobros`, `GET …/:id`, `GET …/:id/recibo`, `POST …/:id/anular`, `POST …/:id/rechazar`, `POST …/:id/aplicar`, `POST /cuentas-por-cobrar/aplicaciones/:id/quitar` | `cobros.*` |
| `POST /cuentas-por-cobrar/devoluciones`, `POST …/:id/anular` | `devoluciones.*` |
| `POST /cuentas-por-cobrar/ajustes`, `POST …/:id/anular` | `ajustes.*` |
| `GET/POST /cuentas-por-cobrar/castigos`, `POST …/:id/anular`, `POST …/:id/recuperaciones`, `POST /cuentas-por-cobrar/recuperaciones/:id/anular`, `POST …/castigos/:id/archivo` | `castigos.*` |
| `GET/POST /cuentas-por-cobrar/saldos-iniciales`, `PUT …/:id`, `DELETE …/:id`, `GET …/exportar`, `…/plantilla`, `POST …/importar`, `GET …/cuadre` | `saldos-iniciales.*` |
| `GET /cuentas-por-cobrar/reportes/<reporte>` y `…/exportar` | `reportes.*` |

Límites: importar la bandeja usa el límite de importaciones del core (10 por minuto por usuario); archivos con
`limitarSubidas`.

## 13. Cliente

### 13.1 Libro de ventas (`cliente/src/modulos/libro-de-ventas/`)

| Sección | Pantalla | Forma |
|---|---|---|
| Operación | **Documentos de venta** | Lista (tarjetas: tipo, serie y número, cliente, fecha, total, estado, etiquetas «Anulado», «Sin cartera», «Con retención») → ficha con líneas, retenciones y, si la cartera está activa, el saldo |
| Operación | **Nuevo documento** | Formulario en página con `CamposDeDocumentoDeVenta` y las líneas; retenciones propuestas a la vista con «Ajustar» |
| Operación | **DTE emitidos (SAT)** | Subir el archivo; lista por estado con el borrador editable por fila; registrar seleccionados; descartar con motivo; avisos (bloqueados, anulados en la SAT) |
| Operación | **Retenciones recibidas** | Lista con el estado deducido y filtros («Descontadas sin constancia» por omisión); registrar constancia (elegir retenciones del cliente, adjuntar PDF o foto) |
| Operación | **Libro de ventas** | Período → libro con totales, cuadre SAT contra libro, emitir con folios, Excel |
| Administración | **Conceptos de ingreso** (con Excel) | Catálogo (lista y ventana) |
| Reportes | §14.1 | Imprimir y exportar |

Formulario de Clientes: sección «Datos fiscales (ventas)» (agente de IVA, exporta productos agropecuarios, retiene ISR,
retiene a pequeño contribuyente) con ayuda de qué retención propone cada uno.

### 13.2 Cuentas por cobrar (`cliente/src/modulos/cuentas-por-cobrar/`)

| Sección | Pantalla | Forma |
|---|---|---|
| Operación | **Por cobrar** | Lista por cliente (saldo, vencido, a favor, próximo vencimiento) → **estado de cuenta** del cliente con sus documentos, cobros y acciones |
| Operación | **Cobrar** | Página: cliente → cargos con saldo (marcar y repartir; «Aplicar a lo más viejo»), retenciones disponibles y «Informar una retención», forma (depositar ahora: cuenta y fecha; o ligar un depósito que ya está en Bancos), diferencia menor, total a la vista con lo que queda a favor; al guardar, recibo imprimible |
| Operación | **Cobros** | Lista con filtros → ficha con recibo, aplicaciones y acciones (anular, cheque rechazado, aplicar saldo a favor, devolver) |
| Operación | **Castigos** | Lista y ventana de castigo desde el estado de cuenta |
| Administración | **Saldos iniciales de clientes** (con Excel) | Lista con el cuadre y avisos de la carga |
| Reportes | §14.2 | Imprimir y exportar |

Formulario de Clientes: sección «Cuentas por cobrar» (días de crédito con la ayuda «vacío = el plazo por omisión; 0 es de
contado», límite de crédito). Lógica pura en `edicion-de-cobro.ts` (reparto, «a lo más viejo», saldo a favor, tope de la
diferencia menor) con pruebas; composables `usarCobro`, `usarEstadoDeCuenta`, `usarBandejaDeVentas`.

## 14. Reportes (sección Reportes: imprimir y exportar)

### 14.1 Libro de ventas

| Reporte | Contenido |
|---|---|
| **Libro de ventas y servicios** | El del período (también en Operación) |
| **Débito fiscal** | Por mes: débito por rubro, notas, exportaciones y exentas; para cuadrar con el SAT-2237 |
| **Retenciones recibidas** | Por cliente, regla y período de aplicación; con constancia o sin ella |
| **Retenciones descontadas sin constancia** | Por cliente y antigüedad (desde `descontada_en`): el reporte diario del dictamen §4.3 |
| **Ventas por cliente** y **Ventas por concepto** | Del período, con notas netas |
| **Ventas de activos fijos** | Líneas con el concepto de sistema, para cruzar con Activos fijos |
| **Ventas del año del pequeño contribuyente** | Mes a mes contra el límite anual |

### 14.2 Cuentas por cobrar

| Reporte | Contenido |
|---|---|
| **Antigüedad de saldos** | Por cliente y tramo de vencimiento (configurables); opción por fecha de emisión; a una fecha de corte |
| **Saldos por cliente** | Saldo, vencido, a favor; deudores y acreedores por separado (cuadre con Clientes de Contabilidad) |
| **Estado de cuenta del cliente** | Movimientos con saldo corrido; se puede mandar por correo después (VC-P21) |
| **Documentos por vencer** | Próximos N días, con contraseña del cliente y fecha probable de pago |
| **Cobros realizados** | Por período, forma, medio y cuenta bancaria; recibos anulados y rechazados aparte |
| **Saldos a favor de clientes** | Anticipos y pagos de más, con su antigüedad |
| **Castigos y recuperaciones** | Por período, con su causa y el régimen de ISR del momento |

Todos «a una fecha de corte» usan la fecha de cada hecho (emisión, cobro, anulación, rechazo), como R1 de CxP.

## 15. Excel (según la sección del menú)

| Pantalla | Sección | Importar | Exportar |
|---|---|---|---|
| Conceptos de ingreso | Administración | Sí (nombre, tipo, activo) | Sí |
| Saldos iniciales de clientes | Administración | Sí: una fila por documento o saldo a favor; cliente por NIT o nombre; todo o nada, ensayo, 5,000 filas | Sí |
| DTE emitidos (SAT) | Operación | Es la **bandeja**, no el Excel de Administración: archivo de la SAT con su propio límite y sus reglas (§7.4) | No |
| Documentos, retenciones, cobros, castigos | Operación | No | No (se consulta en los reportes) |
| Libro de ventas | Operación | No | Sí (es el libro; permiso `libro.exportar`, como compras) |
| Reportes | Reportes | No | Sí |

## 16. Pasos (un commit cada uno; servidor y cliente por separado, con pruebas)

**Lista para programar (2026-11-19).** Todas las dependencias de la columna «Depende de» son pasos de esta tabla o cosas
que ya están en `main` (CCL-B1, EM-2, el lector de `core/intercambio`). La última columna dice qué **dato del usuario**
falta; un paso sin nada ahí se puede programar en cuanto entren sus dependencias. **El primer paso es VC-0a**: no depende
de nada ni espera ningún dato. Números de migración: los de hoy (siguiente libre); si otro paso ocupa uno antes, se toma el
siguiente al programar.

| Paso | Qué | Quién | Depende de | Espera del usuario |
|---|---|---|---|---|
| **VC-0a** (hecho 2026-11-19) | Terceros, migración `0010_clientes_para_ventas`: único `clientes_id_cuenta_unico (id, cuenta_id)`, aviso `terceros.cliente_guardado` con secciones, orden `terceros.crear_cliente_desde_dte` (§4.1); pruebas de la llave entre cuentas, del aviso y de la orden (CF no crea nada) | backend | — | — |
| VC-0a-c (hecho 2026-11-23) | Secciones aportadas en el formulario y la ficha de Clientes | frontend | VC-0a | — |
| **VC-0b** (hecho 2026-11-23, con correcciones de la revisión) | Bancos, migración `0039_cobros_a_clientes`: conceptos de sistema de cobro (como la `0037`), mapa de nota marcada por módulo (`marcadaParaModulo`), conceptos reservados de `cuentas-por-cobrar`, `RevisorDeCambios` con el mapa (§4.2); pruebas | backend | — (CCL-B1 ya está en `main`) | — |
| VC-0b-c (hecho 2026-11-23) | `marcadaParaModulo` en las pantallas de Bancos (etiqueta «Para Cuentas por cobrar») | frontend | VC-0b | — |
| **VC-0c1** | Libro de compras: pregunta `cifras_para_la_declaracion` y `foto.ventas` (§3.3, §4.3); migración `0040_factura_especial_de_venta` (bloqueo de toda `FESP` en recibidos, y las pendientes que ya estén); la `FESP` registrada como compra en el cuadre; pruebas con un doble que responde | backend | — | — |
| **VC-0c2** | Libro de compras: remanente de retenciones del SAT-2237 y saldo de constancias del SAT-2046 en la foto (sin migración), el anterior escrito por el usuario en el primer mes, cálculo del impuesto del SAT-2046; pruebas de varios meses seguidos y de la rectificación | backend | VC-0c1 | La casilla exacta sale de la captura (VC-P29), pero **no bloquea**: las cifras se guardan igual y la casilla se ajusta después |
| VC-0c-c | Sección de ventas y remanentes en «Datos para el SAT-2237 / SAT-2046»; campo del remanente anterior al declarar | frontend | VC-0c2 | — |
| **VC-0d** | Core: piezas del PDF y foliación genérica a `core/impresion/pdf` (sin cambiar el comportamiento; mudar las pruebas) | backend | — | — |
| **LV-1** | Esqueleto, `0001` (auditoría permanente con el motivo corregido), configuración (incluidas las tres `libro-de-ventas.ict.*`), conceptos de ingreso (semilla, Excel), datos fiscales de cliente (sección); pruebas de tablas y API | backend | VC-0a | — |
| LV-1c | Conceptos de ingreso; sección «Datos fiscales (ventas)» | frontend | LV-1, VC-0a-c | — |
| **LV-2** | Documentos y líneas: registrar, anular, eliminar; régimen del mes y **`regimen_derogado`**, período declarado, notas (plazo de dos meses, nota sobre FESP, aviso de NABN), fecha de inicio, plazo de anulación en la SAT, `factura_especial_recibida` con el aviso de empresa inscrita; avisos a la cartera (sin escucha aún); pruebas de dominio (cálculo de líneas, familias contra régimen, derogación con la fecha de la configuración, vencimiento de la declaración) e integración | backend | LV-1 | — |
| LV-2c | Lista, formulario y ficha de documentos | frontend | LV-2 | — |
| **LV-3** | Retenciones esperadas (dominio puro con §7.3, sin propuesta en nota de débito), informadas (regla provisional V-3), ajustes, **ajuste proporcional por nota de crédito**, las dos de la FESP (`origen = 'factura_especial'`), constancias con archivo, período de aplicación con la regla del mes declarado, órdenes de §10.1; `0003` con el check de `documento_id` abierto a `liquidacion_de_tarjeta`; pruebas por régimen y regla. Pide revisión de `seguridad` del archivo de constancias antes de unir | backend | LV-2 | — |
| LV-3c | Retenciones recibidas y constancias | frontend | LV-3 | — |
| **LV-4** | Bandeja de DTE emitidos (lote, lector del core, borrador, registrar, descartar, bloqueados incluido `factura_especial_de_compra`, anulados en la SAT); pruebas con `xls-de-prueba.ts` | backend | LV-2 | **Sí: archivo real de «DTE emitidos» (VC-P3)** |
| LV-4c | Bandeja | frontend | LV-4 | — |
| **LV-5** | Libro del período (anexo de NABN, columna de FESP, título de auxiliar según el régimen), PDF con folios, cifras para la declaración (respuesta), datos del ISR mensual con la regla de V-6 y `0006` (marca de pagado), límite del pequeño contribuyente, cifras separadas del primario y pecuario | backend | LV-3, VC-0c2, VC-0d | — (el tramo mensual del ISR se confirma con VC-P29 sin bloquear) |
| LV-5c | Libro y datos para la declaración y el ISR mensual | frontend | LV-5 | — |
| **LV-5b** | Cuadre SAT contra libro (con el «rectifique ese mes» de V-11) | backend y frontend | LV-4, LV-5 | Lo de LV-4 |
| **LV-6** | Reportes de §14.1 | backend | LV-5 | — |
| LV-6c | Pantallas de reportes | frontend | LV-6 | — |
| LV-7 | (Solo si VC-P24 dice que sí) ICT: cálculo con `libro-de-ventas.ict.*`, margen del intermediario de bovinos | backend y frontend | LV-5 | **Sí: VC-P24** |
| LV-8 | (Solo si VC-P25 elige la foliación única) Libro único de compras y ventas del pequeño contribuyente | backend y frontend | LV-5 | **Sí: VC-P25** |
| **CXC-1** | Esqueleto, `0001`, condiciones (sección), `recibir_documento`, documentos, vencimiento, contraseña del cliente, avisos de anular/eliminar; pruebas | backend | LV-2 | — |
| CXC-1c | Por cobrar, estado de cuenta, sección del cliente | frontend | CXC-1 | — |
| **CXC-2** | Abonos (NCRE y NABN), aplicación automática y manual, saldos derivados; pruebas de saldo con fechas de corte | backend | CXC-1 | — |
| **CXC-3** | Cobros: depósito, nota ligada, solo retenciones; aplicaciones, retenciones aplicadas, recibo, anular; aviso de anticipo de §8.3 paso 3; escucha de Bancos; pruebas de concurrencia (dos cobros al mismo cargo) | backend | CXC-2, LV-3, VC-0b | — |
| CXC-3c | Cobrar, cobros, recibo imprimible | frontend | CXC-3 | — |
| **CXC-4** | Saldo a favor: aplicar, quitar, devolver; ajustes de diferencia menor | backend | CXC-3 | — |
| CXC-4c | Acciones de saldo a favor y devolución | frontend | CXC-4 | — |
| **CXC-5** | Cheque rechazado (las retenciones se quedan, V-7) | backend | CXC-3 | — |
| CXC-5c | Acción de rechazo | frontend | CXC-5 | — |
| CXC-5t | (Solo si VC-P27 dice que alguien cobra con POS) Forma `tarjeta`, retención `iva_tarjeta` por liquidación (columnas de §5.7), comisión informativa, configuración de la tarjeta | backend y frontend | CXC-5 | **Sí: VC-P27 (liquidación y constancia reales)** |
| **CXC-6** | Saldos iniciales, cuenta de apertura, pregunta de EM-2, aviso de fecha de inicio, Excel | backend | CXC-3 | — |
| CXC-6c | Saldos iniciales de clientes | frontend | CXC-6 | — |
| **CXC-7** | Reportes de §14.2 | backend | CXC-4 | — |
| CXC-7c | Pantallas de reportes | frontend | CXC-7 | — |
| **CXC-8** | Castigos y recuperaciones con archivo y los avisos de V-12; revisión de `seguridad` del archivo antes de unir | backend | CXC-3 | — |
| CXC-8c | Castigos | frontend | CXC-8 | — |
| VC-QA | Punta a punta: importar DTE emitidos → registrar → retención esperada → nota de crédito con ajuste proporcional → cobrar con depósito y retención → constancia → libro y declaración con remanente → ISR mensual → cheque rechazado → saldo inicial y cierre de la carga; con la cartera apagada | pruebas-qa | Todo lo anterior | — |
| CXC-9 | (Después, VC-P14 a) Estimación de incobrables | backend y frontend | CXC-8 | — |
| VC-10 | (Después) Respuesta a Multimoneda, quitar `solo_quetzales_por_ahora` | backend | MM en `main` | — |
| VC-11 | (Después) Enviar recibo y estado de cuenta por correo | backend y frontend | correo pasos 2 y 4 | — |

**En paralelo desde ya:** VC-0a, VC-0b, VC-0c1 y VC-0d no dependen de nada ni entre sí (tocan módulos distintos:
Terceros, Bancos, Libro de compras y core), pero **dos migraciones del mismo módulo no van en paralelo** (VC-0c1 y VC-0c2
en fila). LV-1 empieza en cuanto entra VC-0a. Los pasos `c` corren detrás de su paso de servidor. CXC-1 puede ir en
paralelo con LV-3 y LV-4. Lo único que espera datos del usuario es LV-4 (y LV-5b), LV-7, LV-8 y CXC-5t: el resto del
camino crítico (VC-0a → LV-1 → LV-2 → LV-3 → LV-5 y CXC-1 → CXC-3 → …) no se detiene.

## 17. Preguntas para el usuario

**Respondidas el 2026-11-19:** el usuario aceptó todas las recomendaciones (ver «Respuestas del usuario (2026-11-19)» al
final). Quedan datos por mandar en VC-P3, VC-P4, VC-P22 y VC-P24; la tabla se conserva como estaba al preguntar.

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| VC-P1 | ¿De qué depende Libro de ventas? | a) De Libro de compras (lee el régimen y los períodos de allí); b) mudar régimen y períodos a Empresas primero; c) que tenga su propia copia | **a**. Toda empresa que vende con IVA lleva los dos libros; b es más limpio pero toca tablas en producción de tres módulos |
| VC-P2 | ¿Una sola declaración de IVA por mes para compras y ventas? | a) Sí: el período de Libro de compras vale para los dos y su foto suma las cifras de ventas; b) cada libro declara su período | **a**: el SAT-2237 es un formulario; dos «declarado» del mismo mes se pueden contradecir |
| VC-P3 | ¿Cómo entran las ventas al principio? (V-1) | a) Importar DTE emitidos de la SAT; b) captura manual; c) emitir FEL desde Arrancar | **a + b** ahora; c en un módulo aparte. **Necesitamos un archivo real de «DTE emitidos»** (sin datos sensibles o con datos de prueba) para fijar el mapa de columnas |
| VC-P4 | ¿Qué certificador FEL usan sus empresas? (V-2) | Infile, Digifact, Guatefacturas, otro, la herramienta gratuita de la SAT | Saberlo antes de diseñar el módulo de emisión |
| VC-P5 | ¿Toda venta va a Cuentas por cobrar? | a) Sí, todas (las de contado se cobran el mismo día); b) solo las de crédito, a mano; c) con cliente identificado sí; a consumidor final, según configuración (por omisión, sin cartera) | **c**: las ventas a CF de mostrador no son cartera y llenarían la lista; las de contado a un cliente conocido sí conviene controlarlas hasta depositarlas |
| VC-P6 | ¿Las ventas llevan líneas con concepto de ingreso? | a) Sí (la bandeja crea una y se puede partir); b) solo totales por documento | **a**: separa bienes y servicios para el libro, da el ingreso por concepto a Contabilidad y marca la venta de activo fijo para el flujo de efectivo |
| VC-P7 | ¿Dónde viven las retenciones que les hacen? | a) En Libro de ventas (fiscal) y la cartera las aplica como medio de cobro; b) solo en Cuentas por cobrar | **a**: existen aunque la venta sea de contado o la cartera esté apagada, y van en la declaración |
| VC-P8 | ¿En qué mes se aplica la retención de IVA recibida? | a) El de la constancia (propuesto, editable hasta declarar); b) el de la factura | **a**, como dice la práctica del dictamen; lo confirma el contador (§18 V-2) |
| VC-P9 | ¿Tasas con vigencia por fecha? (veredicto 2 del dictamen) | a) Como en compras: sin vigencia, cada retención guarda su porcentaje; b) vigencias en la configuración (cambio del core) | **a**: el pasado ya queda guardado; b es un cambio grande para un caso raro |
| VC-P10 | ¿Cómo cobran sus empresas? (V-10) | Marque las que apliquen: depósito o transferencia; cheque al día; cheques posfechados que se guardan; efectivo que se deposita después; tarjeta (POS) | v1: **depósito, transferencia y cheque al día** (se registra al depositar). Tarjeta, solo si alguien la usa (paso CXC-5). Posfechados en cartera y efectivo por depositar, después (son «caja») |
| VC-P11 | ¿Cobran recargo por cheque rechazado? (V-8) | a) No; b) sí, con nota de débito | **b opcional**: la nota de débito se emite y se registra en Libro de ventas como cualquier otra |
| VC-P12 | ¿Arrancar emite recibos de cobro numerados? (V-9) | a) Sí, por empresa; b) no | **a**, sin efecto fiscal y con la leyenda «no sustituye la factura» |
| VC-P13 | ¿Cómo se tratan los anticipos de clientes? (V-6) | a) Saldo a favor con aviso (configurable a «factura obligatoria»); b) siempre exigir factura antes | **a**, y que su contador decida el trato del IVA |
| VC-P14 | Incobrables (V-7) | a) Solo castigo en v1; b) castigo y estimación (directo, reserva del 3 % o solo contable) en v1 | **a**; la estimación en CXC-9, configurable por empresa |
| VC-P15 | ¿Quién ve qué ventas y qué clientes? | a) Todos los de la empresa (solo permisos); b) por localidad (establecimiento); c) por cliente (cada vendedor los suyos) | **a**. Se guarda el establecimiento para filtrar; con b o c un cobro de facturas de dos establecimientos quedaría a medias para quien no ve uno |
| VC-P16 | Contraseña del cliente | a) Número, fecha y fecha probable de pago en cada factura (varias a la vez); b) un registro de contraseña que agrupa facturas, como en compras | **a**: aquí la entrega el cliente, no la empresa; basta con anotarla |
| VC-P17 | Factura cambiaria con abonos pactados | a) En v1 vence con el plazo del cliente; b) cargar sus abonos ya | **a**; los abonos después (tabla reservada) |
| VC-P18 | Nota de crédito sobre una factura de antes de la fecha de inicio | a) Escribir en la nota la serie, número y fecha de la factura anterior; b) una tabla de facturas anteriores como en compras | **a**: en ventas la factura vieja está en la cartera como saldo inicial; basta con la referencia |
| VC-P19 | Moneda extranjera (exportaciones) | a) Columnas de moneda desde el inicio, solo quetzales hasta que entre Multimoneda; b) solo quetzales y migrar después | **a**, como ya decidió Multimoneda |
| VC-P20 | Venta de activo fijo | a) Se registra en Libro de ventas (débito) y Activos fijos la transcribe (resultado), con un reporte que las cruza; b) Activos fijos espera a Libro de ventas | **a**: ninguno depende del otro |
| VC-P21 | ¿Enviar el recibo y el estado de cuenta por correo? | a) Sí, después de los pasos del correo; b) no | **a**, como el aviso de pago de compras |
| VC-P22 | Venta de tabaco (V-3) | — | **Mándenos una liquidación y una constancia reales del comprador** (sin datos sensibles): con eso el contador confirma si es 65 % de IVA, ISR o factura especial |
| VC-P23 | ¿El libro de ventas lleva su propia foliación? | a) Sí, separada de la de compras; b) un solo libro habilitado de compras y ventas | **a** si la SAT habilitó dos libros (lo usual); que el contador lo confirme |
| VC-P24 | ¿Alguna empresa está en el régimen agropecuario? (V-4) | Sí / No | Ya está en el catálogo de Arrancar; si alguna lo usa, el contador investiga cómo declara sus ventas antes de LV-5 |

## 18. Para validar antes de programar

**Validado el 2026-11-19** por `contador-guatemala` (`dictamen-cuentas-por-cobrar-y-ventas-validacion-2026-11-19.md`):
V-1 a V-12 con su dictamen en «Validación del contador (2026-11-19)» al final. Quedan **dos puntos nuevos** del arquitecto
(V-13 y V-14, al final de la tabla), que no bloquean ningún paso. La tabla se conserva como estaba al preguntar.

Con `contador-guatemala`:

| # | Punto | Propuesta del diseño |
|---|---|---|
| V-1 | `FESP` recibida por la empresa como vendedora: ¿en qué lista de la SAT aparece (recibidos o emitidos), declara el débito y acredita el 100 % retenido? | §4.3 y §4.5: bloquearla en compras y registrarla en ventas con dos retenciones automáticas |
| V-2 | Mes de aplicación de la retención de IVA recibida (constancia o factura) y del 5 % del pequeño contribuyente | §3.5: el de la constancia |
| V-3 | Empresa que es agente de retención de IVA: ¿el sector público o la tarjeta le retienen igual? | §7.3: no se propone ninguna de IVA |
| V-4 | Régimen agropecuario, primario y no afiliado al vender: formulario, base (margen en ganado de engorde), retenciones | §3.4: solo ingresos, sin cálculo |
| V-5 | Nota de abono (`NABN`) en el libro y en el SAT-2237 (¿cuenta en «cantidad y monto de operaciones»?) | Fuera del débito; aparece en el libro informativa |
| V-6 | Datos para el ISR mensual del opcional simplificado (ingresos del mes, retenciones de facturas del mes, lo que se paga directo) | §7.6 |
| V-7 | Cheque rechazado con retención aplicada: ¿la retención sigue valiendo? | §8.5: se queda |
| V-8 | Liquidación de tarjeta: base de la retención del 15 % y si la comisión es exenta siempre | `iva_tarjeta` sobre el IVA de lo cobrado; comisión exenta (H7) |
| V-9 | Nota de crédito emitida sobre una factura de un período ya declarado | Rebaja el débito del mes de la nota (dictamen §2): sin rectificar el mes de la factura |
| V-10 | Libro de ventas: uno o dos libros habilitados (VC-P23) y el artículo del AG 5-2013 | Dos, con foliación propia |
| V-11 | Plazo para anular un DTE en la SAT (dictamen, pendiente) | Solo informa en el aviso de §7.4 |
| V-12 | Recuperación de un castigo: renta gravada y su asiento | §6.9 |
| V-13 (nuevo, 2026-11-19) | Nota de crédito sobre una factura cuya retención el cliente ya **descontó sin constancia**: ¿se ajusta en proporción o se deja y se pide la constancia por lo descontado? | §7.1 paso 6: no se toca, con aviso [opinión del arquitecto]. Validar antes de LV-3; si cambia, es una regla del dominio sin migración |
| V-14 (nuevo, 2026-11-19) | Vencimiento de la declaración mensual del IVA (para el plazo de anulación de V-11): ¿último día del mes siguiente, corrido al hábil siguiente? | §7.2: Ley del IVA art. 40, por confirmar. Validar antes de LV-2; es solo un aviso |

Con `seguridad`: archivos de constancias y castigos (`core.archivos`, qpdf, `recurso_dueno`), el lector de la bandeja con
archivos de la SAT (mismos controles que recibidos), y la futura guarda de credenciales del certificador FEL (fuera de v1).

## 19. Convivencia y riesgos

| # | Tema | Qué pasa | Qué se hace |
|---|---|---|---|
| R-1 | Cartera apagada | El libro registra sin destino; al encender la cartera, los documentos anteriores no están en ella | Cargar como saldo inicial (si la carga está abierta) o una acción «Enviar a Cuentas por cobrar» para los vigentes sin destino (paso posterior si hace falta) |
| R-2 | Anular en Bancos un depósito de un cobro | Con la cartera activa la escucha rechaza; inactiva, la revisión de origen (VC-0b) rechaza | Igual que CxP |
| R-3 | Libro de compras inactivo | Libro de ventas no se activa (dependencia) | Mensaje claro al activar |
| R-4 | Dos empresas con el mismo NIT en la cuenta | La misma autorización en dos bandejas | Bloqueo «registrado en otra empresa» y el establecimiento (§7.4) |
| R-5 | Concurrencia en cobros | Dos cobros al mismo cargo o la misma retención en dos cobros | Bloqueo `for update` del cargo; único parcial de la retención aplicada; prueba de concurrencia |
| R-6 | Volumen | Una empresa de mostrador con miles de DTE CF al mes | Sin cartera para CF (VC-P5); la bandeja registra en tandas de 500; índices por `(empresa_id, periodo)` |
| R-7 | Declaración y ventas | Libro de compras declara sin Libro de ventas activo | La foto sale sin ventas; si después se activa, el aviso «el período ya se declaró sin ventas» en el libro de ese mes |
| R-8 | Contabilidad futura | Necesita cuentas por concepto de ingreso y por regla de retención | Sus propios enlaces, como con Bancos y Activos fijos |

## 20. Pendientes que este diseño deja anotados

- Módulo `facturacion-fel` (emitir con un adaptador por certificador; credenciales por empresa; revisión de seguridad).
- Cartera de cheques posfechados recibidos y cobro en efectivo por depositar (con la futura Caja / ventas).
- Estimación de incobrables (CXC-9), abonos de la factura cambiaria, «Enviar a Cuentas por cobrar» de lo registrado sin
  destino.
- Multimoneda: naturaleza `cuenta_por_cobrar` en la pregunta del diferencial (VC-10).
- Activos fijos: cruzar su venta con la línea de Libro de ventas (por autorización FEL) cuando los dos estén activos.
- Ganadería, Cultivos e Inventario: cómo mandan sus ventas al libro (orden `libro-de-ventas.registrar_documento` a definir
  con ellos).
- `docs/HOJA-DE-RUTA.md`: «Cuentas por cobrar / Ventas» marcado como planificado (hecho el 2026-11-19).

## Respuestas del usuario (2026-11-19)

- **VC-P1 a VC-P24:** el usuario aceptó **todas las recomendaciones** de §17: a (VC-P1), a (VC-P2), a + b (VC-P3), c
  (VC-P5), a (VC-P6, VC-P7, VC-P8, VC-P9), v1 con depósito, transferencia y cheque al día y tarjeta solo si alguien la usa
  (VC-P10), b opcional (VC-P11), a (VC-P12 a VC-P21) y a (VC-P23).
- **Quedan pendientes los datos del usuario:**
  - **VC-P3:** un archivo real de «DTE emitidos» de la SAT (sin datos sensibles o de prueba). Bloquea solo **LV-4** (y
    LV-5b).
  - **VC-P4:** qué certificador FEL usan. No bloquea nada de v1: es para el futuro módulo `facturacion-fel`.
  - **VC-P22:** una liquidación y una constancia reales de la venta de tabaco. No bloquea ningún paso: hasta tenerlas, la
    retención del comprador se **informa** a mano (§7.5).
  - **VC-P24:** si alguna empresa está en el régimen agropecuario. **El contador corrigió la premisa** (V-4): ese régimen
    está derogado desde el 2025-07-09, así que la pregunta útil pasa a ser «¿alguna empresa está o pasará al régimen
    **primario o pecuario** (ICT)? ¿Alguna es intermediaria de bovinos?». Bloquea solo **LV-7**.
- **Lo que la validación del contador corrige sin contradecir ninguna respuesta** ya está en el texto (sección siguiente).
  Lo que **sí** choca con una respuesta no se cambió: va en «Preguntas nuevas (2026-11-19)» (VC-P25 y VC-P26).

## Validación del contador (2026-11-19)

Dictamen completo: `dictamen-cuentas-por-cobrar-y-ventas-validacion-2026-11-19.md`. Veredicto: **correcto con ajustes**;
la estructura (libro fiscal aparte de la cartera, retención como medio de cobro, una declaración por mes) se sostiene.

| # | Dictamen | Qué cambió en el diseño | Pendiente |
|---|---|---|---|
| V-1 FESP recibida | Corregir | §4.3 bloqueo validado (toda `FESP` en recibidos es venta; migración `0040` de compras); §4.5 fuera del débito y de las retenciones acreditables, columna propia, aviso de empresa inscrita; §5.5 espejo `factura_especial_de_compra` en emitidos | ISR de la FESP en empresa sobre utilidades (informativo); VC-P28 |
| V-2 Mes de aplicación | Correcto con ajustes | §3.3 solo retenciones con constancia, remanente de retenciones aparte (y saldo de constancias del 2046); §3.5 constancia de un mes declarado: rechazo o período a mano con motivo, nunca el «primer abierto» | Casilla del SAT-2237 (VC-P29) |
| V-3 Agente de IVA | Pendiente | §7.3 y §5.7: regla provisional (informada sin marca de indebida, con aviso) | Texto del Decreto 20-2006 y AG 425-2006, o la liquidación de VC-P27 |
| V-4 Regímenes | Corregir | §1, §3.4, §5.3, §7.1 paso 4: derogados solo antes de `fecha_de_derogacion` (error `regimen_derogado`); primario y pecuario con ICT (configuración `libro-de-ventas.ict.*`, cifras separadas en LV-5, cálculo en LV-7); no afiliado con RECI y FESP | VC-P24 (reformulada) |
| V-5 NABN | Correcto con ajustes | §7.1 paso 6 aviso; anexo del libro; fuera de cantidad y monto de operaciones (§3.3, §7.6) | Confirmar con la captura (VC-P29) |
| V-6 ISR mensual | Corregir la regla | §7.6: «sujeta a retención» por retención ISR **vigente** (no la descontada); 5 %/7 % sobre el total mensual del pago directo; avisos; marca de pagado (`pagos_de_isr_mensual`, `0006`) | Tramo mensual o por factura (VC-P29) |
| V-7 Cheque rechazado | Correcto | §8.5 sin cambio de regla | — |
| V-8 Tarjeta | Corregir | §5.7 `documento_id` nulo con `origen = 'liquidacion_de_tarjeta'` (reservado desde la `0003`), base = IVA del bruto; §6.3 comisión informativa y no «exenta siempre»; §11.3 tasa de combustibles | VC-P27; paso CXC-5t |
| V-9 NCRE de mes declarado | Correcto con ajustes | §7.1 paso 6: aviso del plazo de dos meses, ajuste proporcional de las esperadas, nota sobre FESP es error | V-13 (nuevo, §18) |
| V-10 Libros | Corregir (fuera del general) | §3.4 y §5.8: general con foliación propia (confirmado); título «Auxiliar» en primario y pecuario y en pequeño contribuyente | VC-P25 (choca con VC-P23 a) |
| V-11 Anular un DTE | Correcto con ajustes | §7.2 aviso «emita una nota de crédito»; §7.6 cuadre «rectifique ese mes» | V-14 (nuevo, §18): vencimiento de la declaración |
| V-12 Recuperación | Correcto con ajustes | §6.9 y §8.7: renta gravada solo con castigo de régimen `utilidades`; sin débito; requisitos del castigo deducible en el aviso | — |
| VC-P13 anticipos | Correcto con ajustes | §8.3 paso 3 aviso corregido (servicios exige factura) | VC-P26 (choca con el valor por omisión) |
| Nota de débito | Hallazgo | §7.3: sin retención propuesta, se puede informar | — |
| Auditoría permanente | Hallazgo | §4.4 motivo «Conservación de libros y documentos (Código de Comercio art. 382; Código Tributario, por confirmar)» | Artículos del Código Tributario |

**Lo que el contador pide antes de LV-3** (modelo de la tarjeta y de la FESP; regímenes derogados y ICT) y **antes de
LV-5** (regla del ISR mensual, libros fuera del general, remanente de retenciones) ya está en el diseño y en §16. Lo único
que queda abierto antes de LV-5 es la foliación fuera del general (VC-P25); mientras no se responda, rige VC-P23 a y LV-5
no se detiene.

## Preguntas nuevas (2026-11-19)

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| VC-P25 | **Choca con VC-P23 a.** El contador dice que la foliación propia de ventas solo vale para el régimen general: el **pequeño contribuyente** tiene **un solo libro habilitado** de compras y ventas, y el **primario y pecuario** lleva el **libro electrónico de la SAT** (el de Arrancar es auxiliar, sin folios). ¿Qué hacemos en esos dos regímenes? Y, para el pequeño contribuyente: ¿imprimen el libro habilitado desde Arrancar? | a) Dejar VC-P23 a para todos (foliación propia; el PDF fuera del general dice «Auxiliar»); b) primario y pecuario sin folios, y pequeño contribuyente con **una sola foliación** de compras y ventas (paso LV-8: lo emite Libro de compras, que le pide a Libro de ventas sus filas con una pregunta, porque compras no puede leer ventas); c) primario y pecuario sin folios, y pequeño contribuyente con dos PDF auxiliares («su libro habilitado es uno solo») | **c** si el pequeño contribuyente **no** imprime su libro habilitado desde Arrancar; **b** si lo imprime. En los dos casos, primario y pecuario **sin folios**: foliar un libro que no es el legal confunde. Mientras no responda, rige a |
| VC-P26 | **Choca con el valor por omisión de VC-P13 a.** El contador dice que en **servicios** el IVA nace al recibir el anticipo, así que facturarlo no es opción del contador, y recomienda `factura_obligatoria` por omisión en las empresas de servicios. Arrancar no sabe qué empresa vende servicios. ¿Cómo queda el valor por omisión? ¿Qué empresas venden servicios con anticipo? | a) `aviso` por omisión en todas (lo aceptado), con el aviso ya corregido, y usted o su contador ponen `factura_obligatoria` en la empresa que venda servicios con anticipo; b) `factura_obligatoria` por omisión en todas; c) `factura_obligatoria` por omisión si la empresa tiene conceptos de ingreso de servicio activos | **a**: no cambia lo aceptado, el aviso ya dice que en servicios es obligatorio, y basta con decirnos qué empresas venden servicios con anticipo para dejarlas en `factura_obligatoria`. La c adivina con un dato que no es para eso (una empresa de bienes puede tener un concepto de servicio) |
| VC-P27 | ¿Alguna empresa cobra con **tarjeta (POS)**? (VC-P10 lo dejó para «si alguien la usa») | Sí (cuál) / No. Si sí: mande una liquidación real de la adquirente y una constancia de su retención (sin datos sensibles), y confirme que la adquirente se registre como **cliente** en Terceros (es quien retiene y quien liquida) | Si nadie la usa, CXC-5t no se programa; el modelo ya queda abierto desde la `0003`. La liquidación cierra también V-3 |
| VC-P28 | ¿Alguna empresa recibe **facturas especiales** de sus compradores? ¿Está inscrita en el IVA o es una persona individual sin inscripción? | Sí (cuál y régimen) / No | Es informativa: el diseño ya cubre los dos casos (aviso si está inscrita). Sirve para probar con un caso real |
| VC-P29 | Pendiente desde L5: una **captura** del SAT-2237 y del SAT-1311 vigentes | — | Con ellas se fijan la casilla del remanente de retenciones, si la nota de abono cuenta en las operaciones y si el tramo de Q30,000 del ISR mensual es del total del mes. No bloquea: VC-0c2 y LV-5 guardan las cifras y se ajusta la casilla después |
