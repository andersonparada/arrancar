# Diseño de Ventas y caja (por formas de venta), Recetas y Producción — arquitecto de datos, 2026-11-23

_Agente `arquitecto-de-datos`. Base contable y fiscal: `dictamen-ventas-y-caja-2026-11-23.md` (contador-guatemala, «correcto
con ajustes»). Aterriza «Caja / ventas» de `docs/PLAN.md` §6. Lo que el arquitecto no comparte del dictamen, o que el código
ya resolvió de otra forma, va marcado **[corrige el dictamen]** y pasa a §22 para que lo valide el contador._

**Estado (2026-11-23): propuesta, con la validación del contador y la revisión de seguridad ya incorporadas. Nada de esto se
programa hasta que el usuario responda §21.** En este documento, **CV-n** es la corrección n del contador y **S-nn** el hallazgo
nn de seguridad; §22 dice dónde quedó cada uno. Los diseños aprobados no se reescriben: lo que este diseño les pide cambiar está en las **adendas de §18**, y ninguna contradice lo ya programado ni los
pasos LV-1, LV-2 y VC-0x en curso.

**Actualización (2026-11-23): Ventas/Caja y Cuentas por cobrar son un solo módulo, «Ventas y cobros» (clave `cuentas-por-cobrar`), e Inventarios es opcional.
**§24 manda sobre el resto de este documento**: clave y esquema, Inventarios apagado, interruptores de caja, crédito y cartera, y la tabla de pasos unificada.

Sirve a empresas de **cualquier rubro y régimen**, y a negocios **sin NIT**: nada aquí supone ganado, fincas, comida, régimen
de IVA o ISR, ni que la empresa sea agente de retención.

**Ya decidido por el usuario y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Sin módulo Caseta | Lo resuelve el módulo general de ventas y caja | Usuario, 2026-11-23 |
| **Formas de venta** | «Si la forma tiene configuración FEL, es formal la venta; si no, es solo para control y es informal; puedo tener ambas a la vez». Se elige la forma en cada venta. **No existe un modo de la empresa** | Usuario, 2026-11-23 |
| Quién paga | Todas las ventas llevan el control de quién debe y quién pagó, con **recibos de pago** | Usuario, 2026-11-23 |
| Recetas y producción | Entran (ejemplo: desayunos), como función general | Usuario, 2026-11-23 |
| Existencias negativas | Nunca | INV-P4 |
| Costo por artículo y empresa; recálculo hacia adelante | Sin cambio | INV-A4, INV-A5 |
| Libro fiscal aparte de la cartera; un destino por documento | Sin cambio | VC-P5, VC-P7 |
| Recibo de cobro del documento fiscal | Sin cambio («Este recibo no sustituye la factura») | VC-P12 |

## 0. La propuesta en una página

- **Dos módulos** (actualizado por §24):
  - **«Ventas y cobros»** (clave `cuentas-por-cobrar`, esquema `cuentas_por_cobrar`), `dependeDe: ['terceros']`, con Inventarios
    **opcional**: formas de venta, catálogo de lo que se vende, mostrador, cajas, turnos, arqueos, comprobante interno, paso de
    control a formal, **crédito, cartera y recibos**. Caja, crédito y cartera se encienden por empresa (§24.3).
  - **`produccion`** (esquema `produccion`), `dependeDe: ['inventarios']`: recetas con versiones, órdenes de producción, real
    contra teórico. Es activable: quien solo revende no lo ve.
- **La forma de venta es el centro** (§3): un catálogo por empresa. Con configuración FEL, la venta es **formal**; sin ella,
  es **de control**. Conviven en la misma caja, turno, cartera, inventario y reportes. Cada venta guarda su forma y una **foto
  de lo fiscal**: cambiar la forma no altera el pasado.
- **Una sola cartera por cliente** (§6), **dentro del mismo módulo** (§24): un cargo de origen «venta de control» y un cobro en
  caja, sin exigir Libro de ventas ni Bancos. Los abonos a ventas de control dan un
  **recibo de pago**; los de documentos fiscales, el **recibo de cobro** ya aprobado.
- **Cada módulo puede faltar** (§2). La pieza que lo permite es un campo nuevo en la definición del módulo, **`usaTablasDe`**:
  separa «necesito sus tablas para mis llaves» (siempre existen en toda instalación, PLAN §3.2) de «debe estar activo»
  (`dependeDe`). Con él, `inventarios` deja de exigir Libro de compras **sin mover ninguna tabla ni llave**.

| Lo que quiere el negocio | Módulos activos (funciones por empresa en §24.3) |
|---|---|
| Servicios: facturar y cobrar, sin existencias ni caja | `cuentas-por-cobrar`, `terceros` (+ `libro-de-ventas` si factura con FEL) |
| Vender de contado, solo control, sin NIT | `cuentas-por-cobrar`, `terceros`, con `inventarios` si lleva existencias |
| Además, fiar y cobrar abonos | Encender crédito y cartera (sin Bancos ni libros) |
| Además, recetas y producción | + `inventarios`, `produccion` |
| Ventas formales | + `libro-de-ventas` (trae `libro-de-compras`) y, para certificar desde Arrancar, el futuro `facturacion-fel` |
| Depositar la caja al banco | + `bancos` |
| Partidas | + `contabilidad` |

- **Pasar de control a formal** (§3.7): un DTE cubre uno o varios comprobantes; el comprobante queda enlazado y no se
  reescribe, y en la cartera **la deuda y sus abonos se trasladan** al cargo del DTE sin duplicarse.
- **Salvaguardas del dictamen** (§3.8): motivo en empresa inscrita, correlativo sin huecos, reporte que no se apaga,
  conciliación mensual, permisos propios y **un solo juego de registros**: no hay forma de sacar una venta de control del
  inventario, de los reportes ni de Contabilidad.
- **Controles contra fraude de caja** (§4.8, §5, §9.0): segunda persona para anular y retirar, ventas y pagos inmutables en la
  base, alcance por caja que falla cerrado y auditoría que el dueño puede leer.
- **Fuera de v1:** emitir FEL (módulo `facturacion-fel`, con diseño aparte; aquí queda su puerto), mesas y comandas de cocina,
  listas de precios por cliente, promociones automáticas, trabajar sin conexión (PLAN: la app solo funciona con conexión).

## 1. Lo encontrado en el código y la base (verificado contra `main` el 2026-11-23)

1. **Dependencias hoy**: `inventarios`, `activos-fijos` → `libro-de-compras`; `libro-de-compras` → `terceros`; `bancos`,
   `terceros`, `multimoneda` → nada. Tres piezas leen `dependeDe`: `RegistroModulos.validarActivacion` y
   `validarDesactivacion` (no cambian), `dependenciasDeMigracion` (orden del migrador) y la prueba `llaves-entre-esquemas`,
   que solo admite llaves hacia `core`, esenciales y `dependeDe` transitivo (estas dos cambian, §2.3).
2. **El acoplamiento real de Inventarios con el libro** son **cuatro llaves** y lecturas, todas sobre columnas **nulas**:
   `articulos.concepto_de_gasto_id`, `documentos.concepto_de_gasto_id`, `documentos.documento_de_compra_id`,
   `movimientos (linea_de_documento_de_compra_id, documento_de_compra_id)`, más `descartes_de_lineas` (solo de la bandeja) y
   una orden (`libro-de-compras.cambiar_marca_de_inventario`). No usa `terceros`. **Por tanto se puede soltar la dependencia
   sin migrar datos.**
3. **Un bloqueo que no es de llaves**: el check `documentos_concepto_segun_destino` exige concepto de gasto en toda salida
   `gasto`, y ese catálogo es del libro (INV-A10). **Sin Libro de compras no se podría registrar ningún consumo.** §7.2 lo
   resuelve con un destino nuevo, sin tocar INV-A10.
4. **`ReglaDeIva` (§6.8 de Inventarios) aún no está programada** (es INV-9). «Se asume régimen general» se puede corregir antes
   de que exista.
5. **Clases del kardex**: `CLASES_DE_DOCUMENTO` en el dominio y su check. `salida_por_venta`, `devolucion_de_venta` y
   `entrada_de_produccion` estaban **reservadas** (§3.6 de Inventarios), con órdenes reservadas en su §9.
6. **Trampa del motor de costeo**: `esDevolucion(m)` es `tipo = 'salida' y movimiento_de_origen_id no nulo`. Una salida nueva
   que use `movimiento_de_origen_id` se costearía **como devolución a proveedor**. Las clases de este diseño no lo usan en
   salidas (§7.1).
7. **Trampa del recálculo**: las entradas conservan su costo y solo se recalculan las salidas. Si una compra con fecha anterior
   cambia el costo de un insumo, cambia la salida a producción **pero no** la entrada del producto terminado (§8.5).
8. **Correlativos** (`core.correlativos`): por empresa, clave y año, dentro de la transacción: si se deshace, no queda hueco.
   La clave admite una por forma (`ventas-y-caja.formas.<id>`). El reinicio anual es **de la empresa**
   (`core.correlativos.reinicio_anual`).
9. **Clientes**: `terceros.terceros` admite persona con solo el nombre (NIT y DPI nulos), `clientes` ya tiene el único
   `(id, cuenta_id)` (VC-0a). Sirve para «doña Marta, sin NIT».
10. **NIT de la empresa**: `core.empresas.nit` es **nulo** en 2 de las 4 empresas de desarrollo. Una empresa sin NIT ya es un
    caso real del modelo.
11. **Libro de compras**: `documentos.destino` es **`not null`** con tres valores. Un gasto de caja con factura no tiene destino
    hoy (§5.5).
12. **Normativa FEL [corrige el dictamen]**: el dictamen dice que el Acuerdo 13-2018 «aún se cita en 8 documentos». Buscado en
    `docs/`: aparece en **2**, ambos dictámenes históricos (`dictamen-cp2-cp3-2026-11-08.md` y
    `dictamen-cuentas-por-cobrar-y-ventas-2026-11-18.md`). Ningún diseño ni regla depende de él, y un dictamen fechado no se
    reescribe: basta una nota (§18, A-7).
13. **En curso** (tanda 9, ramas sin unir): INV-6 ya ocupa la migración `0006` de Inventarios y agrega clases de traslado; VC-0b
    ocupa la `0039` de Bancos. **Todo número de migración aquí es «el siguiente libre» al programar.**
14. **Base de desarrollo** (solo leída): `inventarios.documentos` y `articulos` con 0 filas; no existen `libro_de_ventas`,
    `cuentas_por_cobrar`, `ventas_y_caja` ni `produccion`. **No hay datos que convertir.**

15. **Privilegios** (verificado para S-03): `sentenciasDeRestriccion` filtra por prefijo de esquema, así que
    `RESTRICCIONES_DE_PRIVILEGIOS` **ya sirve** para `ventas_y_caja.*` sin cambiar el migrador. Solo su prueba y su TSDoc hablan
    únicamente de `core`.
16. **La auditoría se lee por cuenta, no por empresa**: la política `leer_en_la_cuenta` de `core.auditoria` filtra `cuenta_id`, y
    solo hay índices `(cuenta_id, creado_en)` y `(recurso, registro_id)`. Una pantalla para la empresa (S-06) **debe filtrar
    `empresa_id` explícitamente** o mostraría lo de las demás empresas de la cuenta.
17. **Faltan únicos para las llaves compuestas de S-25**: `core.empresas (id, cuenta_id)`, `core.archivos (id, empresa_id)` y
    `bancos.movimientos (id, empresa_id)` no existen (solo su PK). Se agregan en la adenda A-9.
18. **Una llave a `core.empresa_usuarios` no sirve para la autoría**: quitar a un usuario de la empresa borra su fila, y esa llave
    impediría retirarlo o dejaría ventas sin autor. Quién vendió sigue con llave a `core.usuarios` y su pertenencia se valida al
    escribir (§9.0).
19. **El motor conserva el costo de toda entrada** (`costoRecalculado`): `devolucion_de_venta` necesita un cambio explícito (§7.1).
20. **Precedente para configurar con auditoría**: `GuardarAjustesDelAviso` (Cuentas por pagar) audita `configurar` con antes y
    después, con un permiso de cuenta propio. Ventas lo copia (§14.4).

## 2. Fronteras y dependencias

### 2.1 Qué es de cada módulo

| Pieza | Módulo dueño | Lo que hacen los demás |
|---|---|---|
| Forma de venta, venta, líneas, comprobante interno, foto fiscal | `ventas-y-caja` | Nadie más escribe |
| Caja, turno, arqueo, efectivo, gastos de caja | `ventas-y-caja` | Bancos recibe el depósito por orden |
| Catálogo de lo que se vende (precio, combo, menú) | `ventas-y-caja` | Apunta al artículo de Inventarios; no copia existencias ni costo |
| Artículo, bodega, kardex, costo, existencias | `inventarios` | Ventas y Producción **ordenan** salidas y entradas; nunca escriben el kardex |
| Compra sin factura | `inventarios` (entrada manual, §7.3) | Caja puede pagarla |
| Receta, orden de producción, real contra teórico | `produccion` | Ventas pide la receta por orden |
| Cliente | `terceros` | Llave compuesta, alta rápida |
| Deuda, abonos, saldo a favor, recibos, antigüedad, estado de cuenta, castigo | `cuentas-por-cobrar` | **Única cartera**: Ventas no guarda saldos |
| Documento fiscal, débito, retenciones, libro, declaración | `libro-de-ventas` | Recibe **solo** lo formal |
| Certificar, firmar, anular en la SAT, credenciales, XML | `facturacion-fel` (futuro) | Ventas lo llama por puerto (§16) |
| Depósitos y cuentas | `bancos` | Ventas y cartera por órdenes |
| Partidas | `contabilidad` | Escucha los eventos (§17) |

**Diferencia con Caja chica:** la caja de ventas **recibe** dinero y se vacía al depositar; el fondo de caja chica es un monto
**fijo** para gastos menores y se repone. No se comparten tablas ni se reutiliza `caja_chica.arqueos` (su ecuación es la del
fondo fijo). Se reutiliza la **forma del arqueo** (conteo por denominación en `jsonb`, diferencia con motivo).

### 2.2 Dependencias propuestas

| Módulo | `dependeDe` (debe estar activo) | `usaTablasDe` (llaves y lectura; puede estar apagado) |
|---|---|---|
| `inventarios` | **`[]`** (hoy `['libro-de-compras']`) | `['libro-de-compras']` |
| **`cuentas-por-cobrar`** («Ventas y cobros», §24.1) | **`['terceros']`** | **`['inventarios', 'libro-de-ventas', 'libro-de-compras', 'bancos']`** |
| `produccion` | `['inventarios']` | — |
| `libro-de-ventas` | `['libro-de-compras']` (sin cambio) | — |

Orden del migrador resultante, sin ciclos: `terceros` → `libro-de-compras` → `inventarios`, `libro-de-ventas`; `bancos` →
`cuentas-por-cobrar`; `inventarios` → `produccion`.

Quien solo vende de contado apaga la **cartera** en la configuración de la empresa (§24.3). Sin ella, las formas no ofrecen crédito.

### 2.3 El campo `usaTablasDe` (paso VCJ-0a)

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| A. Activar Libro de compras «oculto» | El negocio sin NIT lo tiene activo sin verlo | No toca el core | Permisos y menú de un módulo fiscal en un negocio que no lo usa; lógica de «oculto» en todas partes; arrastra `terceros` y datos fiscales |
| **B. `usaTablasDe`** | Campo nuevo: cuenta para el orden del migrador y para la prueba de llaves; **no** para activar ni desactivar | Refleja lo que ya decidió PLAN §3.2 (toda instalación crea todas las tablas); cero cambios de datos | Toca el core en 4 lugares pequeños |
| C. Quitar las llaves hacia el libro | Sin llave, con la columna suelta | Sin campo nuevo | **Pierde integridad** en la base; prohibido por el espíritu de §3.2 |
| D. Mudar conceptos de gasto a `empresas` | Catálogo común | Limpio a largo plazo | Toca tablas en producción de 5 módulos |

**Recomendado: B.** Cambios:

| Dónde | Cambio |
|---|---|
| `DefinicionModulo` | `usaTablasDe?: readonly string[]`, con TSDoc: «Módulos a cuyas tablas apunta o que lee, y que pueden estar inactivos. Quien lo declara debe comportarse bien si no lo están» |
| `dependenciasDeMigracion` | Suma `usaTablasDe` |
| `verificarDependencias` | Revisa también que estén registrados |
| Prueba `llaves-entre-esquemas` | `dependenciasTransitivas` recorre `dependeDe` y `usaTablasDe` |
| `validarActivacion` / `validarDesactivacion` | **Sin cambio**: siguen leyendo solo `dependeDe` |

Regla para quien lo declara: **leer** una tabla de un módulo apagado es seguro (existe y RLS la limita); **enviarle una orden**
lanza `ModuloNoDisponible`. Por eso, antes de ofrecer una función que necesite otro módulo, el caso de uso pregunta si está
activo (puerto `ModulosActivosDeLaCuenta`, que ya existe) y responde un error claro.

## 3. Formas de venta

### 3.1 Qué es una forma

Una forma de venta es **cómo se documenta** una venta. Ejemplos de una misma empresa: «Factura electrónica», «Factura cambiaria
a crédito», «Mostrador (control)», «Pedido (control)».

| | **Formal** | **De control** |
|---|---|---|
| Qué la define | Tiene configuración FEL | No la tiene |
| Documento | DTE aceptado por la SAT | Comprobante interno |
| Libro de ventas | **Entra** | **No entra** |
| Inventario, caja, cartera, reportes, Contabilidad | Igual | Igual |
| Requiere | `libro-de-ventas` activo, NIT, establecimiento | Nada |

La clase **no se elige**: se deduce de la configuración FEL (columna generada, §9.3), exactamente como lo dijo el usuario.

### 3.2 Configuración FEL de la forma

| Dato | Para qué |
|---|---|
| `modo_fel` | `certificador` (emite por el adaptador, §16) o `transcrito` (el DTE se emite afuera y se escribe aquí; sirve mientras no exista el módulo FEL; pregunta VJ-P2). Nulo = forma de control |
| `conexion_fel_id` | La conexión con el certificador, del futuro `facturacion-fel`. **Sin atarse a ninguno**: la forma solo guarda el id; el certificador concreto vive detrás del puerto |
| `tipo_dte` | `FACT`, `FCAM`, `FPEQ`, `FCAP`… Se valida contra el régimen del mes **al vender** (§3.5) |
| `localidad_id` | El establecimiento: la localidad con `codigo_establecimiento_sat` |

### 3.3 A quién aplica

- **El alcance se guarda explícito en la forma (S-05):** `aplica_a_todas_las_cajas` y `aplica_a_todos_los_usuarios`. Con la marca
  apagada, solo las filas de `formas_por_caja` y `formas_por_usuario` dan acceso: **sin filas = nadie**. Nunca se deduce «todas» de
  una consulta vacía, porque la RLS puede ocultar filas y la regla fallaría abierta. Se deben cumplir las dos condiciones, y lo valida
  el servidor al vender. Prueba obligatoria: forma limitada a la caja A, cajero de la caja B, rechazo.
- Una forma por caja puede ser la **predeterminada** (`formas_por_caja.predeterminada`, una por caja): el cajero no elige si no
  quiere. **[decisión del arquitecto]** La predeterminada no se fija por rol ni por empresa: sería el «modo» que el usuario
  descartó. Una forma con `aplica_a_todas_las_cajas` que sea predeterminada también lleva su fila en `formas_por_caja`.

### 3.4 Qué se puede cambiar de una forma

- Nombre, plantilla, si admite crédito, cajas y usuarios: **sí**, sin afectar ventas pasadas (tienen su foto).
- **Pasar de control a formal o al revés, con ventas ya hechas: no** (`forma_con_ventas`). Se crea otra forma y se inactiva la
  anterior. **[decisión del arquitecto]** Así un correlativo nunca mezcla comprobantes y DTE, y un reporte por forma significa
  una sola cosa. Una forma sin ventas sí se puede cambiar.
- **La base lo garantiza (S-03):** `ventas (forma_id, empresa_id, clase)` es llave compuesta hacia el único
  `formas_de_venta (id, empresa_id, clase)`. Como `clase` es generada, cambiar `modo_fel` en una forma con ventas viola la llave, aun
  con una venta simultánea. El error `forma_con_ventas` es el mensaje amable de esa misma regla.
- No se elimina si tiene ventas; se inactiva, con auditoría.
- Toda creación o cambio de forma se audita con antes y después, incluidos título, prefijo, cajas y usuarios (S-07).

### 3.5 Validaciones al vender con una forma formal

1. `libro-de-ventas` activo y la empresa con NIT; si no, `forma_formal_sin_libro`.
2. Historial fiscal del mes: el `tipo_dte` corresponde al régimen; si no, `dte_no_corresponde_al_regimen`. **Aquí se bloquea**
   (en Libro de ventas solo se avisa, porque allá el DTE ya existe; aquí todavía no se ha emitido y el certificador lo
   rechazaría).
3. Régimen derogado: `regimen_derogado`, la misma regla de LV-2.
4. Con el IVA suspendido no se puede facturar (Res. SAT-DSI-1793-2026, art. 13, M): es dato de la SAT; el adaptador devolverá
   el rechazo.
5. **Consumidor final (CV-3):** desde `ventas-y-caja.fel.tope_consumidor_final` (Q2,500.00, Reglamento del IVA art. 30 num. 9, Ac.
   245-2022) la venta exige identificar al receptor: `cf_sobre_el_limite`. Vale en toda venta formal y en toda regularización.
6. **Pedido de bienes (CV-19):** el DTE se emite **al entregar**, no al registrar el pedido (§4.5).

### 3.6 La foto de cada venta

Cada venta copia al guardarse: forma (id y nombre), clase, `tipo_dte`, establecimiento, modo, NIT y nombre del negocio, régimen
de IVA e ISR del mes (si hay), plantilla del comprobante, condición de inscrita (§3.9). Va en columnas las que se filtran y en
`foto_fiscal jsonb` el resto. **La venta nunca relee la forma.** Cada línea copia **siempre** su clase fiscal y su concepto de ingreso,
también en control (CV-5): sin ellos no se podría armar el DTE al regularizar y el IVA pendiente se calcularía sobre lo exento.

### 3.7 Pasar una venta de control a formal (regularizar)

Caso de uso `RegularizarVentas` (permiso `regularizaciones.crear`):

1. Se eligen comprobantes de control vigentes, **entregados** y sin regularizar. La suma debe ser **exactamente** el total del DTE
   (`regularizacion_no_cuadra`). No se regulariza una parte de un comprobante. Qué se puede agrupar en un DTE (CV-3):

   | Caso | Un DTE cubre |
   |---|---|
   | Cliente identificado | Uno o varios comprobantes **de ese cliente, de una misma caja** (`regularizacion_de_cajas_distintas`; con ventas en dos cajas, un DTE por caja) |
   | Cliente de mostrador | **Uno solo**, salvo el caso siguiente |
   | Factura diaria de **pequeño contribuyente** (Ley del IVA art. 49; Reglamento art. 55) | Varias ventas del **mismo día**, cada una **menor de Q50**, con régimen de pequeño contribuyente ese mes (`consolidacion_no_permitida` si no). Si el cliente pidió factura, la suya va individual |

2. Se valida el tope de consumidor final (§3.5, paso 5). **Ventas de antes de inscribirse** (`inscrita_al_vender = false`): según
   VJ-P11, no entran por este flujo (`regularizacion_anterior_a_inscripcion`) y se remiten al contador.
3. La forma formal de destino da el tipo de DTE. Se emite (certificador) o se transcribe, con las reglas de `dte_de_ventas` (§9.11).
4. En la misma transacción (con el DTE ya aceptado):
   - `libro-de-ventas.registrar_documento` (§13.1) crea el documento, con `sustituyeCargos` si había deuda y con
     **`origenDeRegularizacion: true`**: Contabilidad asienta **solo** IVA pendiente contra IVA débito (§17, CV-1).
   - La cartera crea el cargo del DTE, **traslada** las aplicaciones vigentes de los cargos de control y los marca
     `sustituido` (§6.4). El saldo del cliente no cambia ni un centavo.
   - Se guarda `regularizaciones` y `regularizacion_ventas`. **El comprobante no se reescribe.**
5. **Fechas:** se conservan la **fecha real de entrega** y la **fecha del DTE**; nunca se retrofecha. Si caen en meses distintos,
   aviso: «La entrega fue en {mes}: revise con su contador si debe rectificar ese mes». El texto **no** dice que la emisión tardía
   corrija la infracción (dictamen §2.4).
6. Inventario no se toca: la mercadería ya salió.

**Un DTE de la bandeja que ya estaba en una venta de control (CV-2).** `fel_externa` guarda la autorización como **uuid**. Si al
importar la bandeja de DTE emitidos aparece esa autorización en una venta de control, el Libro **no crea otro documento**: la fila se
marca «Corresponde a una venta de control» y se resuelve con `RegularizarVentas`. Así no nacen un segundo cargo ni un segundo ingreso.

### 3.8 Salvaguardas (dictamen §2.2)

| Salvaguarda | Cómo queda |
|---|---|
| Nada se borra | Las ventas no se eliminan; correlativo por forma en la transacción; anular con motivo; auditoría **permanente** |
| Motivo (VJ-P1) | En empresa inscrita, cada venta de control lleva `motivo_de_control`: `pedido_sin_entrega` (**solo** con `entrega = 'pendiente'`, CV-4), `fel_externa` (exige la autorización), `consolidar_al_cierre` (solo pequeño contribuyente y venta menor de Q50, CV-3 y S-27), `contingencia`, `pendiente_de_fel`, `otro` (con texto). Un toque. **No se preselecciona ninguno** (S-27): el motivo es una declaración |
| Reporte | «Ventas de control» siempre disponible: sin configuración que lo apague, con motivo, antigüedad y estado |
| Conciliación | §15.2: ventas totales = Libro de ventas + control, con las diferencias a la vista |
| Permisos | `formas.configurar-control` (CV-20: CLAUDE.md prohíbe `gestionar`), `ventas.vender-control`, `reportes.ver-control`. El último se puede dar **solo** al contador externo |
| Aviso | Al crear la forma, siempre. Al vender, una línea discreta en empresa inscrita: «Si entrega el bien, esta venta requiere factura». No es ventana ni pide confirmar |
| Un solo juego de registros | **No existe** ninguna columna, permiso o configuración para excluir una venta de inventario, reportes o Contabilidad, ni para ocultarla por rol. El permiso de ver reportes da todas las ventas de la caja que el usuario ve |
| Reporte parcial o filtrado (S-12, CV-20) | Quien no tiene `cajas.ver-todas` ve **«PARCIAL: n cajas de m»** en pantalla, PDF y Excel. Todo reporte filtrado imprime el filtro y **el total excluido**: una exportación «solo formales» no puede pasar por el total de ventas |
| Pequeño contribuyente (CV-20) | Acumulado anual (formal + control) contra el techo de Q500,285, a la vista en Ventas de control y Conciliación |

**Lo que el sistema no hace:** no decide si una venta de control es legítima ni la bloquea por eso. Registra, avisa y deja la
evidencia, igual que `ReglaDeIva` en Inventarios.

**Casos que el dictamen dice que no son venta de control:**

| Caso | Dónde va en Arrancar |
|---|---|
| Consumo interno del negocio | Salida por consumo de Inventarios (no es venta) |
| Cortesía, donación, muestra, retiro del dueño | Salida especial de Inventarios, con su aviso de IVA (§6.6 de Inventarios) |
| Negocio de **otro dueño** (otro NIT o persona) | Debe ser otra empresa en la cuenta; si le pasan mercadería, es una venta. El aviso de la forma lo dice |

### 3.9 Empresa inscrita (sin crear un «modo»)

El dictamen pide un estado fiscal «sin inscripción». **[corrige el dictamen]** No se agrega estado ni columna: se **deduce** de datos
que ya existen. Con la corrección CV-11 y S-04, quitar el NIT **ya no apaga** las salvaguardas:

```
inscrita = (core.empresas.nit es válido y distinto de 'CF')
           o (la empresa tiene alguna fila en libro_de_compras.datos_fiscales_de_empresa)
```

`CF` no cuenta porque el objeto `Nit` lo acepta como válido. El historial se lee aunque Libro de compras esté apagado (`usaTablasDe`).

| Situación | Salvaguardas de §3.8 | Avisos de IVA en Inventarios |
|---|---|---|
| Sin NIT, o `CF`, y sin historial fiscal | Sin motivo; sin aviso al vender. Una nota fija con el texto del dictamen §1 en la ayuda de Formas | **Ninguno** |
| Con NIT y datos fiscales | Todas | Según el régimen del mes |
| Con NIT, sin datos fiscales | Todas | Aviso genérico: «Registre su régimen para saber si esto genera IVA». **Ya no se asume régimen general** en silencio (§7.5) |
| **Sin NIT, con historial fiscal** (lo quitaron) | **Todas** | Según el régimen guardado |

- Agregar un NIT después no cambia las ventas anteriores: cada una guardó `inscrita_al_vender`. Se confirma en VJ-P3.
- **Cambiar el NIT (A-10):** `ActualizarEmpresa` audita todo cambio con valor anterior y nuevo, aparte de `auditarCambioDeEstado`
  (que sale sin registrar si `activa` no cambió). Quitarlo o reemplazarlo exige `empresas.nit.corregir` y motivo (VJ-P14). La regla vive
  en `empresas`, sin preguntar a Ventas, y funciona aunque Ventas esté apagado.
- La conciliación muestra los períodos en que la empresa estuvo sin NIT.

## 4. Venta de mostrador

### 4.1 Flujo en el celular

Pantalla única, pensada para una mano. Arriba, caja y forma (se cambia con un toque; la clase se ve con una etiqueta **Formal** o
**Control**). En medio, buscador, categorías, lector de código de barras y «Menú de hoy». Abajo, el carrito con el total y
**Cobrar**.

1. Tocar productos (cantidad con + y −).
2. **Cobrar**: Efectivo (con «recibe» y «vuelto»), otro medio, **Mixto** o **Al crédito** (exige cliente; alta rápida con solo el
   nombre).
3. Listo: pantalla con **Imprimir** y **Compartir** (WhatsApp o PDF) y **Nueva venta**.

Una venta común no debe pasar de **tres toques** después de elegir productos.

### 4.2 Qué se vende (`productos`)

| Tipo | Ejemplo | Qué descarga |
|---|---|---|
| `articulo` | Gaseosa | El artículo de Inventarios |
| `platillo` | Desayuno típico | Según `descarga`: el terminado (lote ya producido) o su **receta al vender** |
| `servicio` | Corte de cabello, flete | Nada |
| `combo` | Desayuno + café | Sus componentes, cada uno según su tipo |

Un **platillo siempre apunta a un artículo** (tipo `producto_terminado`), aunque no se guarde en existencia: es lo que une la venta
con la receta sin que Ventas dependa de Producción.

### 4.3 Precios, combos, menú y descuentos

- **Precio**: uno por producto, **con IVA incluido** si aplica; se copia a la línea. Una sola lista en v1 **[decisión del
  arquitecto]**: precios distintos por forma serían un incentivo a mover ventas hacia control. **El servidor calcula todos los
  precios (S-09):** el cliente manda producto, cantidad y el descuento pedido, nunca un precio.
- **Combo (CV-15):** tiene su propio precio. **Solo la línea padre suma** a la venta; los componentes reparten ese total en
  proporción a su precio individual, en centavos, y **el residuo va al componente de mayor valor**. Check: la suma de los componentes =
  total del padre (dominio y prueba). Si el total no alcanza para un centavo por componente, se rechaza (`combo_sin_reparto`).
- **Menú del día**: por fecha, lista de productos con precio opcional del día (`> 0`, auditado, S-09) y **cupo** opcional (quedan 12).
  Agotar el cupo avisa; no bloquea, salvo que la existencia lo haga.
- **Descuentos**: por línea o por total, en monto o porcentaje. Hasta `ventas-y-caja.descuentos.tope_sin_permiso` los da cualquier
  vendedor; más arriba exige `ventas.descontar` **y no pasa de** `ventas-y-caja.descuentos.tope_maximo`. Sobre el tope sin permiso, si
  quien vende no tiene el permiso, autoriza un encargado (§4.8). Quedan en la línea con quién los dio. Un descuento por total se reparte
  entre las líneas.
- **Precio cero (CV-10, S-09):** se rechaza **por línea** (`linea_sin_precio`), con check `total > 0` en cada una. Una cortesía no es una
  venta con descuento del 100 %: es una salida especial (dictamen §2.1). Una venta **bajo el costo** se permite, con aviso y en el
  reporte de Descuentos y anulaciones.

### 4.4 Contado, crédito y mixto

| Condición | Qué pasa |
|---|---|
| Contado | `pagos_de_venta` cubre el total. No toca la cartera aunque tenga cliente |
| Crédito | Exige cliente, forma que admite crédito y `cuentas-por-cobrar` activo. Crea el cargo |
| Mixto | Pago parcial más crédito. El cargo es **por el total** y el pago entra como su primer abono, con recibo: el estado de cuenta muestra la venta completa |

### 4.5 Pedidos y apartados (entrega pendiente)

Es el caso legítimo principal del dictamen, y obliga a una distinción que el resto del diseño respeta:

- `entrega = 'pendiente'`: **no** descarga inventario, **no** es ingreso, **no** crea cargo. Lo pagado es **anticipo**: un cobro sin
  aplicar en la cartera (saldo a favor), y por eso exige cliente y `cuentas-por-cobrar` activo si hay pago. Su recibo dice
  **«Anticipo»** (CV-17).
- **Crear un pedido en empresa inscrita** exige `ventas.crear-pedido` (S-13), y sale en la conciliación y en una alerta por antigüedad.
- `EntregarVenta` pone `entregada_en`: descarga, crea el cargo y aplica el anticipo. Solo entonces hay venta para Contabilidad.
- **Al entregar con forma de control en empresa inscrita (CV-4):** `pedido_sin_entrega` ya no es válido, y un check lo impide. El caso
  de uso exige un motivo nuevo (normalmente `pendiente_de_fel`) y audita el cambio: la obligación de facturar nace al entregar (Ley del
  IVA art. 34).
- En una forma **formal**, el DTE de bienes se emite **al entregar**. En **servicios** el IVA nace al cobrar: con un anticipo de
  servicios en empresa inscrita, aviso.
- **Con `libro-de-ventas.anticipos.tratamiento = factura_obligatoria` (CV-17):** la regla aprobada (§8.3 de ese diseño) rechaza **todo**
  cobro sin cargos, de bienes o de servicios (`anticipo_sin_factura`). En esa empresa, un pedido solo admite pago si ya tiene documento.

### 4.6 Comprobante interno e impresión

Con los datos, la leyenda y las prohibiciones del dictamen §3, **fijas en el código** y no editables por plantilla:

- Leyenda: «Documento de control interno. No es factura ni documento tributario. No genera crédito fiscal.»
- **No lleva**: las palabras factura, serie, DTE, autorización o certificación; IVA desglosado; NIT del emisor.
- **Título de lista cerrada (S-22, CV-18):** «Comprobante de venta», «Nota de venta», «Ticket», «Comprobante de pedido». No hay texto libre.
- **`prefijo` y nombre de la forma se validan** si se imprimen, normalizando acentos, mayúsculas y sustituciones (`F4CTURA`):
  `titulo_no_permitido`. Una forma de control **no** se puede llamar «Factura». El recibo de pago lleva las mismas prohibiciones.
- **Sin saldos por omisión (S-26):** el comprobante que se comparte por WhatsApp no muestra lo que debe el cliente.
- Anulado: marca visible. Reimpresión: dice «Reimpresión» y, si la venta se regularizó, **muestra el comprobante original** (CV-17).

Plantillas: `ticket_58`, `ticket_80`, `media_carta`. PDF con `core/impresion/pdf` (VC-0d). «Compartir» genera el PDF con la Web Share
API; sin ella, descarga.

### 4.7 Doble toque y conexión inestable

En un mostrador con mala señal, el reintento es lo normal. Cada venta lleva `clave_de_idempotencia` (uuid generado por el cliente al
abrir la venta). Con S-20:

1. **Primero se autoriza** (sesión, permiso, caja), y solo después se busca la clave.
2. La clave es única por `(empresa_id, caja_id, vendida_por, clave)`, y se guarda `hash_del_contenido` (sha-256 de lo pedido, en forma
   canónica). Igual contenido: responde la venta ya creada. **Distinto: 409** `clave_de_idempotencia_reutilizada`.
3. La carrera `23505` responde igual que un reintento normal, sin revelar ventas de otra caja o usuario.

Vale también para pagos en caja. **Las fechas las pone el servidor (S-24):** `vendida_en` y `fecha` nunca vienen del cliente. Registrar con
otra fecha exige `ventas.retrofechar`, motivo y auditoría.

### 4.8 Autorización de una segunda persona (S-11)

La sesión dura 30 días y se renueva con el uso, en un celular que suele ser compartido: «pedir permiso» no puede ser que el encargado
tenga su sesión abierta.

- **Autorización puntual:** el encargado escribe su usuario y contraseña en el momento. El servidor verifica con el cifrador de
  `core/identidad` (A-13), comprueba que tenga el permiso y la caja, y guarda una fila en `autorizaciones_de_caja` (§9.0): **un solo uso**,
  ligada a acción, operación y monto, y vence en 2 minutos. Límite de intentos por usuario y caja; **no abre sesión**.
- **Exige segunda persona:** anular (VJ-P12), retirar (VJ-P13), gasto sobre el tope, descuento sobre el tope, exceder límite de crédito
  (VJ-P7), devolver por otro medio.
- **Negocio de una sola persona:** si no existe otro usuario activo con el permiso y acceso a la caja, se permite y queda
  **`autoaprobada`**, visible en el reporte de Descuentos y anulaciones.
- **En Mostrador:** bloqueo por inactividad (`ventas-y-caja.mostrador.minutos_de_bloqueo`) y **cambio rápido de usuario**, para que
  `vendida_por` y `descuento_dado_por` sigan probando quién fue.

## 5. Caja

### 5.1 Cajas y turnos

- **Caja**: punto de cobro de una localidad, con **una bodega** de la que descarga. Recurso **con alcance** propio
  (`accesos_a_cajas`), como los fondos: el cajero solo ve la suya.
- **Turno**: una apertura y un cierre. **Un solo turno abierto por caja** (único parcial). Toda venta y todo movimiento de efectivo
  caen en un turno abierto.
- Tiene un **responsable**, quien responde por el arqueo; quienes tengan acceso a la caja pueden vender en él (VJ-P8).
- **El responsable es quien abre** (S-19). Abrir a nombre de otro exige que esa persona **acepte** con su credencial (§4.8) y tenga acceso
  a la caja: nadie carga un faltante sobre un compañero.

```
abrir (fondo inicial)              cerrar (arqueo)
───────────────────► abierto ─────────────────────► cerrado ──(reabrir con permiso y motivo)──► abierto
```

### 5.2 La ecuación del turno

```
efectivo_esperado = fondo_inicial
                  + Σ pagos en efectivo de ventas
                  + Σ abonos en efectivo a la cartera
                  + Σ ingresos de caja
                  − Σ gastos y retiros de caja
                  − Σ depósitos al banco y traslados que salen (desde que salen)
                  + Σ traslados recibidos (desde que se aceptan)
                  − Σ devoluciones en efectivo
diferencia = efectivo_contado − efectivo_esperado        (negativa = faltante)
```

Los medios que no son efectivo (tarjeta, transferencia) se suman **por medio** y se comparan con lo que el cajero declara, sin
entrar a la ecuación.

### 5.3 Arqueo y cierre

- **Arqueo**: conteo por denominación (billetes y monedas, como Caja chica). Se puede hacer a media jornada (`parcial`) sin cerrar.
- **Cierre** (`turnos.cerrar`): exige un arqueo `de_cierre`. Con diferencia, motivo obligatorio. Deja una **foto** de los totales.
  Después del cierre, el turno no recibe nada.
- **Ciego** (`ventas-y-caja.cierre.arqueo_ciego`, VJ-P16): con `segun_usuarios`, se enciende si más de una persona tiene acceso a la
  caja. **Se oculta en la API, no solo en pantalla (S-18):** sin `arqueos.ver-esperado`, las respuestas no traen esperado, diferencia ni
  totales de efectivo del turno, y el arqueo parcial tampoco. Un arqueo anulado **se conserva** y lo anula **otra persona** (§4.8): no se
  puede probar conteos hasta cuadrar.
- **Reabrir**: solo el último turno de la caja, con permiso, motivo y auditoría.

### 5.4 Faltantes y sobrantes

Se registran en el arqueo y viajan en el evento. **No se descuentan solos a nadie**: un descuento de salario tiene sus límites
legales (dictamen §4). `ventas-y-caja.cierre.tolerancia` define hasta cuánto no pide motivo (por omisión, Q0.00).

### 5.5 Movimientos de caja

| Tipo | Qué es | Permiso (S-02) | Control |
|---|---|---|---|
| `ingreso` | Dinero que entra y no es venta (cambio, aporte) | `movimientos.ingresar` | Concepto |
| `gasto` | Se paga algo con la caja | `movimientos.gastar` | Concepto. **Comprobante obligatorio** y segunda persona sobre `ventas-y-caja.movimientos.tope_de_gasto` |
| `compra_de_inventario` | Se compra mercadería con la caja | `movimientos.comprar` | Orden a Inventarios (§7.3); mismo tope y comprobante que el gasto |
| `retiro` | El dueño saca dinero | `movimientos.retirar` | Segunda persona desde Q0 (VJ-P13). Queda como retiro, no como gasto |
| `deposito` | Se lleva al banco | `movimientos.depositar` | Queda **en tránsito** hasta confirmarse |
| `traslado` | Pasa a otra caja | `movimientos.trasladar` | Queda **en tránsito** hasta que quien recibe acepte (§5.6) |

**Depósito (S-02):** con Bancos, se confirma al ligarse con `bancos.registrar_nota_de_origen`. Sin Bancos, lo confirma **otra persona**
(`movimientos.confirmar`) con la boleta adjunta. El reporte «Efectivo en tránsito» muestra lo no confirmado, con antigüedad: un depósito
inventado queda ahí a la vista.

**Gasto de caja con factura en empresa inscrita:** el libro exige un `destino` (§1.11). V1 **no** agrega uno nuevo: se registra el
gasto en caja y un aviso sugiere registrar la factura en Libro de compras. El destino `ventas-y-caja` queda como paso VCJ-16,
porque toca un `check` de compras y a Contabilidad.

### 5.6 Varias cajas

Cada una con su turno, bodega y accesos. **Mover efectivo entre cajas (S-02)** tiene dos pasos: un `traslado` sale de la caja A y queda
en tránsito; cuando el responsable de la caja B **acepta**, nace un `ingreso` en su turno abierto, ligado con
`movimiento_relacionado_id`. Si lo rechaza, un contramovimiento lo devuelve al turno abierto de A. Hasta aceptar, el dinero no está en
ninguna de las dos cajas y se ve en «Efectivo en tránsito».

## 6. Clientes y crédito (una sola cartera)

### 6.1 La decisión

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| **A. Extender `cuentas-por-cobrar`** | Cargo de origen `venta_de_control`, cobro `caja`, sin exigir Libro ni Bancos | **Una sola cartera** por cliente; reutiliza saldos derivados, antigüedad, estado de cuenta, saldo a favor y castigos; aún no está programado, así que cuesta poco | Hay que ajustar su diseño antes de CXC-1 |
| B. Cartera propia en Ventas | Tablas `ventas_y_caja.creditos` | Sin tocar CxC | **Dos carteras**: un cliente con factura y comprobante tendría dos saldos. Lo que el usuario pidió evitar |
| C. Toda venta de control entra a Libro de ventas con una marca | Una sola tabla de documentos | Sin cargo nuevo | **Mete documentos no fiscales en el libro legal**. Descartada |

**Recomendado: A.** Detalle en §18 (A-2).

### 6.2 Qué agrega a la cartera

- `documentos.origen` suma `venta_de_control`: `documento_id` (del libro) queda nulo y se guarda `referencia_de_origen_id` (la venta,
  sin llave, porque Ventas apunta a la cartera y no al revés). `tipo = 'comprobante_interno'`. El vencimiento sale de los días de
  crédito del cliente, como cualquier cargo.
- `cobros.forma` suma `caja`: dinero recibido en un turno, **sin** movimiento de Bancos. Atiende lo que VC-P10 dejó para después:
  «efectivo que se deposita después». El dinero llega a Bancos con el depósito del turno, no por cada cobro.
- El **saldo del cliente** suma todo: fiscal y de control. Filtro «formal / control» en las pantallas y reportes.

### 6.3 Recibos

| Lo que se abona | Documento | Numeración |
|---|---|---|
| Solo comprobantes de control | **Recibo de pago**, con la leyenda del dictamen §3 | Correlativo `cuentas-por-cobrar.recibos-de-pago` |
| Solo documentos fiscales | **Recibo de cobro** (VC-P12, sin cambio) | Correlativo `cuentas-por-cobrar.cobros` |
| **Las dos clases en un mismo pago** | **Dos recibos**, uno de cada clase, unidos por `grupo_de_pago_id`, en una transacción | Cada uno el suyo |

**[decisión del arquitecto]** Se separan porque cada uno lleva una leyenda distinta y un recibo de control no debe listar DTE. El
cajero ve **un solo pago**, con un botón que imprime los dos.

Contenido del recibo de pago: número, fecha, recibí de, monto en cifras y letras, medio, comprobantes abonados, saldo anterior y
nuevo, quién recibe y firma. Un abono **sin cargos** dice «Anticipo» (CV-17). **Cada recibo interrumpe la prescripción** (dictamen §4),
así que se conserva y no se borra. Lleva las prohibiciones del comprobante (CV-18).

**Anular un recibo (S-08):**

| Situación | Qué pasa |
|---|---|
| Quién | La misma regla de §4.8: otra persona autoriza; en negocio de una sola persona, `autoaprobada` |
| Turno abierto | Revierte el movimiento y las aplicaciones |
| Turno cerrado | Exige `pagos.anular-turno-cerrado`; el dinero sale con un contramovimiento en el **turno abierto de hoy**. El turno cerrado no se toca |
| Recibo de un `grupo_de_pago_id` | Se anula **el grupo completo**: fue un solo pago |
| Control | Reporte de **recibos anulados** y de **abonos aplicados fuera de antigüedad** (para detectar jineteo) |

### 6.4 Trasladar la deuda al pasar a FEL

Al regularizar con deuda (§3.7), en una sola transacción:

1. Se bloquean los cargos de control (`for update`, en orden de id).
2. Se crea el cargo del DTE, con el **vencimiento más antiguo** de los sustituidos (regularizar no le da más plazo al cliente) y
   conservando la **fecha del cargo original** de cada uno, para la prescripción (CV-13).
3. Cada aplicación vigente de cobro o abono pasa a `vigente = false` en el cargo viejo y nace igual en el cargo nuevo, con su **fecha
   original**.
4. Los cargos viejos pasan a `estado = 'sustituido'`, con `sustituido_por_id` y `sustituido_el`.
5. Una prueba exige: saldo del cliente antes = saldo después, a cualquier fecha de corte.

**Reportes a una fecha de corte:** un cargo sustituido cuenta hasta `sustituido_el` (exclusive) y el nuevo desde esa fecha. Una
aplicación trasladada se lee en el cargo que estaba vivo en el corte.

### 6.5 Límite, antigüedad y estado de cuenta

- **Límite de crédito**: `condiciones_de_cliente.limite_de_credito`, que ya existe y hoy «solo avisa». Comportamiento en caja según
  VJ-P7.
- **Antigüedad y estado de cuenta**: los de CXC-7, con la columna «Clase». Un cliente sin NIT sale por su nombre.
- **Prescripción** (dictamen §4, CV-13): se cuenta **por cargo**, desde su vencimiento o su último abono. Aviso a los **2 años**
  (configurable): «Esta deuda podría estar prescrita si el cliente lo alega». **Regularizar no es reconocimiento del deudor y no reinicia
  el plazo.** **Nunca cancela el saldo.** El castigo ya aprobado tiene la causa `prescripcion`.
- **Reconocimiento de deuda**: documento imprimible opcional con el saldo, para firma (y legalización, dictamen §4). Paso VCJ-15.

### 6.6 Intereses y trabajadores

- **Interés** (VJ-P5): por omisión no hay. Si se aprueba, simple, pactado por cliente, **nunca compuesto**, y nunca a trabajadores.
- **Trabajadores** (VJ-P6): `condiciones_de_cliente.es_trabajador` y la autorización escrita (archivo). V1 solo la registra y registra
  los pagos. **Arrancar no descuenta del salario**: Planilla no existe. Cuando exista, aplicará `descuento ≤ menor(35 % del salario,
  salario − salario mínimo)`; quien gana el mínimo, Q0.

## 7. Inventarios (adenda)

### 7.1 Clases y órdenes nuevas

| Clase | Movimiento | Costo | La pide |
|---|---|---|---|
| `salida_por_venta` | Salida | Del método (`costo_del_metodo = true`) | Ventas |
| `devolucion_de_venta` | **Entrada**, con `movimiento_de_origen_id` a la salida | **Sigue el costo vigente de su salida** (CV-7) | Ventas |
| `salida_a_produccion` | Salida | Del método | Producción |
| `entrada_de_produccion` | Entrada | Lo que calcula Producción (§8.4), fijo | Producción |

**Ninguna salida nueva usa `movimiento_de_origen_id`** (§1.6): se ligan a su origen con dos columnas nuevas en `documentos`:
`modulo_de_origen` y `documento_de_origen_id` (sin llave, como `bancos.movimientos`), con el único parcial
`(empresa_id, clase, modulo_de_origen, documento_de_origen_id) where estado = 'vigente'`, que hace **idempotente** la orden. Check:
las cuatro clases nuevas exigen las dos columnas, y las demás las dejan nulas.

**Cambio en el motor (CV-7):** `costoRecalculado` hoy conserva el costo de toda entrada. Para `devolucion_de_venta`, el recorrido toma el
costo unitario **ya recalculado** de su salida de origen, que siempre va antes en el kardex. Prueba obligatoria: venta, compra con fecha
anterior, devolución; el saldo y el costo de ventas deben quedar como si la venta nunca hubiera salido.

Órdenes en `core/contratos/inventarios.contratos.ts`, las reservadas en §9 de Inventarios más dos:
`registrar_salida_por_venta`, `registrar_devolucion_de_venta`, `registrar_salida_a_produccion`, `registrar_entrada_de_produccion`,
`anular_documento_de_origen` y la pregunta `existencias_para_vender`. Responden el costo; el cajero no lo ve (§14.1).

### 7.2 Soltar la dependencia de Libro de compras (paso VCJ-0b)

| Tema | Con Libro de compras apagado |
|---|---|
| Llaves y columnas | Sin cambio; quedan nulas |
| Bandeja «Por recibir», devoluciones, rebajas | No se ofrecen; la ruta responde `requiere_libro_de_compras` |
| Conceptos de gasto en el artículo | No se muestra |
| Salida por consumo | Destino nuevo **`consumo_interno`**, sin concepto (`documentos_concepto_segun_destino` ya lo admite: solo exige concepto en `gasto` y `mantenimiento_de_activo_fijo`; basta sumar el valor a `documentos_destino_valido`). **Solo se ofrece con el libro apagado**: con el libro activo sigue valiendo INV-A10 |
| Cierre mensual | No revisa la bandeja |
| Avisos de anular o eliminar del libro | No llegan; tampoco hay documentos que anular |

- **Si se apaga el libro con recepciones ya hechas**: las recepciones quedan, las llaves las protegen y el kardex no cambia.
- **Si se enciende después**: las salidas `consumo_interno` anteriores quedan como están y Contabilidad las lleva a un rol propio.
- **`activos-fijos` sigue** con su dependencia (no es objeto de este diseño).
- Pruebas: una cuenta con Inventarios activo y Libro apagado recorre catálogo → entrada → salida → traslado → conteo → cierre.

### 7.3 Compras sin factura

Se resuelven con la **entrada manual** que ya existe:

- `CAUSAS_DE_ENTRADA` suma `compra_sin_factura`.
- `documentos.proveedor_libre` (text 1–150, nulo; solo con esa causa) y `documentos.foto_archivo_id` (FK `core.archivos`,
  `recurso_dueno = 'inventarios.compras-sin-factura'`, imagen o PDF). Texto libre porque quien vende en el mercado no es un proveedor
  registrado, e Inventarios ya no exige Terceros.
- El `soporte` (obligatorio por check) se propone: «Compra sin factura».
- **Desde caja**, la controla §5.5 (permiso, tope y comprobante, S-02). Una compra **con fecha anterior** exige
  `inventarios.documentos.retrofechar`, motivo y auditoría (S-24): puede tapar merma y recalcula costos.
- Aviso **solo en empresa inscrita**: «Sin factura este costo puede no ser deducible (ISR art. 21) y no da crédito fiscal. Si el
  vendedor no está inscrito, puede emitirle una factura especial desde Libro de compras».

### 7.4 Sin existencia al vender

INV-P4 (nunca negativas) **no se toca**. Pero en un mostrador, muchas veces lo vendido no se ha ingresado todavía. Opciones en VJ-P4.
La recomendada es **descarga pendiente**: la venta se guarda con `estado_de_descarga = 'pendiente'` en esa línea, el kardex no se
mueve, y queda en la bandeja **«Por descargar»**, con antigüedad (S-24). El cierre del mes de Inventarios **bloquea** con descargas
pendientes de ese mes: no se puede cerrar con ventas sin costo.

**La descarga puede ser imposible (CV-6):** el motor recorre todo el kardex y falla con `existencia_negativa` si en algún punto no alcanza.
Una compra con fecha **posterior** a la venta no la cubre. La bandeja ofrece tres salidas, y solo tres:

| Salida | Cuándo |
|---|---|
| Registrar la **compra real**, con su fecha real anterior o igual a la venta | La mercadería ya estaba y faltó ingresarla |
| **Entrada por ajuste o conteo**, con causa y soporte | La existencia real era mayor a la registrada |
| **Anular la venta** (§11.2) | La venta fue un error |

**Nunca se cambia la fecha de una compra para que cuadre.** La pantalla lo dice y el error explica cuál fecha falta cubrir.

### 7.5 `ReglaDeIva` (cambio a §6.8 de Inventarios, antes de INV-9)

Se quita «si la empresa no tiene datos fiscales, se asume régimen general». Con CV-11, la regla usa el **régimen guardado aunque Libro de
compras esté apagado** y aunque se haya quitado el NIT:

| Situación | `requiere_factura` | Aviso |
|---|---|---|
| No inscrita (§3.9) | `false` | Ninguno |
| Con régimen guardado que genera débito | Según la tabla actual | El actual |
| Con régimen guardado sin débito | `false` | Ninguno |
| Inscrita, sin régimen guardado | `false` | «Registre su régimen para saber si esto genera IVA» |

El dato se lee de `libro_de_compras.datos_fiscales_de_empresa` con `usaTablasDe` (la tabla existe aunque el módulo esté apagado).

## 8. Recetas y producción (módulo `produccion`)

### 8.1 Por qué un módulo aparte

| Opción | A favor | En contra |
|---|---|---|
| Dentro de Inventarios | Menos módulos | Crece un módulo ya grande; todos ven pantallas que no usan |
| **Módulo `produccion`** | Activable; general (panadería, carpintería, abono, desayunos); Inventarios no cambia | Una dependencia más |
| Dentro de Ventas | Cerca del platillo | Quien produce sin vender en mostrador tendría que activar Ventas |

**Recomendado: módulo aparte.** Inventarios ya lo previó («Producción y costeo de transformación: módulo de Producción»). Nada de
cocina en los nombres: receta = **fórmula** de cualquier producto.

### 8.2 Recetas con versiones

- Una **receta** produce **un artículo**. Una **versión** tiene rendimiento, merma, ingredientes y sustitutos.
- Una versión **usada no se edita**: se crea otra (`Duplicar y editar`). Solo una vigente por receta a una fecha.
- **Rendimiento**: cuánto sale de una tanda (10 desayunos). **Merma normal**: porcentaje por ingrediente, dentro del rendimiento
  (NIIF 13.13). **La `cantidad` del ingrediente es neta**, lo que queda útil. Lo que hay que sacar de bodega es
  `cantidad_bruta = cantidad ÷ (1 − merma)` (CV-9): 100 g útiles con 20 % de merma son **125 g**, no 120.
- **Sustitutos**: cada ingrediente puede tener otros artículos con un **factor** (1 lb de A = 0.9 lb de B) y prioridad. Se usan **solo**
  si se elige o, al vender, si el principal no alcanza.
- **Subrecetas**: un ingrediente puede ser un artículo que tiene su propia receta (salsa). Se consume **como existencia**, no se
  explota en cascada, y se rechaza un ciclo directo o indirecto (`receta_circular`).

**Costo teórico de una porción:**

```
costo_porcion = ( Σ (cantidad_neta ÷ (1 − merma)) × costo_vigente + mano_de_obra + indirectos ) ÷ rendimiento
```

Con un margen sugerido contra el precio de venta, si Ventas está activo. Mano de obra e indirectos son **opcionales** y por omisión 0
en un negocio de control; en una empresa formal, el aviso de la NIIF 13.8-13.11 recuerda incluirlos.

### 8.3 Dos formas de producir (VJ-P9)

| | **Por lote** | **Al vender** |
|---|---|---|
| Ejemplo | 50 desayunos a las 5 a. m. | Plato a pedido |
| Inventario | Consume insumos y crea terminado **antes** de vender | Descarga los ingredientes **con la venta** |
| Producto de venta | `descarga = 'existencia'` | `descarga = 'receta'` |
| Control | Real contra teórico por orden | Exige conteos físicos periódicos: lo teórico nunca «se entera» de lo que se desperdició |

### 8.4 Orden de producción

```
              producir (consume y entra)           
abierta ───────────────────────────────► terminada ───(anular, mes abierto)───► anulada
```

1. **Abrir**: receta (usa la versión vigente), cantidad planeada, bodega de insumos y de terminado. Propone el consumo teórico.
2. **Registrar lo real**: cantidades reales por ingrediente (precargadas con la teórica, con sustitutos y lote), cantidad **producida**.
3. **Terminar**, en una transacción: `salida_a_produccion` por lo consumido, y `entrada_de_produccion` con
   `costo = Σ costo de lo consumido + mano de obra + indirectos`, repartido en lo producido.
4. **Real contra teórico** se guarda: por ingrediente (`teorico`, `real`, diferencia en cantidad y en valor) y el rendimiento real.
5. **Sobrantes al final del día** (desayunos que no se vendieron): quedan como existencia. Sacarlos usa lo que ya existe: ajuste con causa
   `perecedero_o_vencimiento` si se botan, salida por consumo si los comen en el negocio y salida especial si se regalan o los lleva el
   dueño (dictamen §5). No se crea un destino nuevo.
6. **Anular**: mes abierto; primero la entrada y luego la salida. Si el terminado ya se vendió, no alcanza y falla con
   `existencia_negativa`.

### 8.5 Compra con fecha anterior que cambia el costo de un insumo

Es el problema de §1.7. Opciones:

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| **A. La entrada queda fija y la diferencia va a variación** | El recálculo cambia la salida a producción; `inventarios.costo_recalculado` ya publica la diferencia; Producción la guarda en `variaciones_de_orden`; Contabilidad la lleva a un rol «Variación de producción» | No toca el motor; sin cascadas; consistente con VC-4 (costo fijo al aprobar) | El costo del terminado queda levemente desviado |
| B. Recalcular en cascada | Insumo → orden → terminado → sus ventas | Costo exacto | Recálculo entre artículos, con ciclos posibles, bloqueos largos y reescritura de costos ya vendidos en cadena |

**Recomendado: A, validado por el contador con este ajuste:** si la variación es **inmaterial**, va a costo de ventas; si es **material**,
se reparte entre la existencia que queda y lo vendido (NIIF Pymes 13.16: el estándar debe aproximarse al real). El umbral es
`produccion.variaciones.umbral_de_materialidad`; **su valor por omisión lo fija el contador antes de REC-4**.

### 8.6 Venta directa de un platillo (al vender)

Ventas pide `produccion.consumo_para_venta { articuloId, cantidad, ventaId }`. Producción responde los renglones (cantidad neta del ingrediente × cantidad vendida ÷
rendimiento ÷ (1 − merma), con sustitutos si el principal no alcanza) y anota `consumos_por_venta` con la versión usada. Ventas manda
**una sola** orden `registrar_salida_por_venta` con todos los renglones de la venta.

Sin Producción activa, un producto con `descarga = 'receta'` responde `requiere_produccion` y la pantalla de Productos no ofrece esa
opción.

## 9. Datos de Ventas y caja (esquema `ventas_y_caja`)

_Actualizado por §24: las tablas viven en el esquema `cuentas_por_cobrar`; `cajas.bodega_id` y el `turno_id` de ventas y pagos pasan a nulos, con caja directa (§24.2, §24.3)._

Toda tabla lleva `empresa_id` (FK `core.empresas` on delete cascade), `politicaPorEmpresa()`, `...marcasDeTiempo` y `...autoria`. Llaves
compuestas con `empresa_id` hacia el único `<tabla>_id_empresa_unico (id, empresa_id)`, **un índice por llave**, `no action` salvo donde se
dice. Dinero `numeric(14,2)`; cantidades `numeric(14,4)` en la unidad del producto. Anulación completa = `estado`, `anulado_en`,
`anulado_por`, `motivo_de_anulacion` (1–300), con el check `(estado = 'anulada') = (los tres no nulos)`.

**RLS con alcance por caja (S-15):** `cajas` usa `politicasDelRegistroConAlcance`; `accesos_a_cajas`, `politicasDeTablaDeAccesos`; `turnos`, `arqueos`,
`movimientos_de_caja`, `ventas`, **`lineas_de_venta`**, `pagos_de_venta`, **`regularizaciones`**, `autorizaciones_de_caja`, con `politicaPorAlcance`
sobre su propio `caja_id`. Una regularización cubre ventas de **una sola caja** (§3.7), para que su alcance nunca dependa de una columna nula. **`formas_por_caja` queda solo por
empresa**: su alcance ya no decide nada por ausencia de filas (§3.3). Los catálogos, solo por empresa.

### 9.0 Inmutabilidad, llaves y autorizaciones

**Privilegios (S-03).** `RESTRICCIONES_DE_PRIVILEGIOS` suma estas tablas (un `revoke` dentro de una migración se desharía). El permiso por
columna hace el trabajo que un disparador duplicaría: **no se agrega disparador**.

| Tabla | Sin | `update` solo en (más `actualizado_en` y `actualizado_por`) |
|---|---|---|
| `ventas` | `delete` | `entrega`, `entregada_en`, `motivo_de_control`, `motivo_de_control_texto`, `autorizacion_externa`, `estado_fiscal`, `autorizacion_fel`, `serie_dte`, `numero_dte`, `fecha_dte`, `documento_de_libro_id`, `cargo_id`, `documento_de_inventario_id`, `costo_al_registrar`, `estado`, `anulado_en`, `anulado_por`, `motivo_de_anulacion`, `fecha_de_anulacion`, `autorizacion_de_anulacion_id` |
| `lineas_de_venta` | `delete` | `estado_de_descarga`, `costo_al_registrar` |
| `pagos_de_venta` | `delete` | `vigente` |
| `movimientos_de_caja` | `delete` | `confirmacion`, `confirmado_por`, `confirmado_en`, `movimiento_de_banco_id`, `movimiento_relacionado_id`, `estado` y anulación |
| `arqueos` | `delete` | `estado` y anulación |
| `turnos` | `delete` | `estado`, `cerrado_en`, `foto_de_cierre` |
| `regularizaciones`, `regularizacion_ventas` | `delete` | `estado` y anulación; `vigente` |
| `autorizaciones_de_caja`, `dte_de_ventas` | `delete` | `usada_en`; `verificacion`, `verificado_por`, `verificado_en` |

`select … for update` sigue funcionando, porque PostgreSQL solo exige `update` en alguna columna. La prueba que clasifica las tablas de
`core` se extiende a estas.

**Llaves compuestas (S-15, S-25).**

| Llave | Hacia | Evita |
|---|---|---|
| `(turno_id, caja_id, empresa_id)` en ventas, pagos, movimientos y arqueos | Único nuevo `turnos (id, caja_id, empresa_id)` | Fila con caja propia y turno ajeno |
| `(venta_id, caja_id, empresa_id)` en líneas y pagos | Único nuevo `ventas (id, caja_id, empresa_id)` | Línea visible desde otra caja |
| `(forma_id, empresa_id, clase)` en ventas | Único nuevo `formas_de_venta (id, empresa_id, clase)` | Cambiar la clase de una forma con ventas |
| `(empresa_id, cuenta_id)` en ventas | `core.empresas (id, cuenta_id)` (A-9) | Cuenta que no es la de la empresa |
| `(cargo_id, empresa_id)`, `(cobro_id, empresa_id)` | Únicos de la cartera (A-2) | Id de otra empresa, porque las llaves evitan la RLS |
| `(movimiento_de_banco_id, empresa_id)` | `bancos.movimientos (id, empresa_id)` (A-9) | Igual |
| `(…_archivo_id, empresa_id)` | `core.archivos (id, empresa_id)` (A-9) | Igual; además se verifica `recurso_dueno` antes de enlazar |

Las columnas de **usuario** (`vendida_por`, `responsable_id`, etc.) siguen con llave simple a `core.usuarios` (§1.18); el caso de uso valida
pertenencia y acceso a la caja al escribir.

**`autorizaciones_de_caja`** (§4.8):

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id`, `caja_id` | uuid | no | FK compuesta |
| `accion` | text | no | `in ('anular_venta', 'anular_recibo', 'anular_arqueo', 'retiro', 'gasto', 'descuento', 'exceder_limite', 'devolver_otro_medio', 'aceptar_turno', 'aceptar_devolucion')` |
| `hash_de_operacion` | text | no | sha-256 de la operación |
| `monto` | numeric(14,2) | sí | `>= 0` |
| `solicitada_por`, `autorizada_por` | uuid | no | FK `core.usuarios` |
| `autoaprobada` | boolean | no | Check `autoaprobada = (autorizada_por = solicitada_por)` |
| `expira_en`, `usada_en` | timestamptz | no, sí | Se consume con `update … where usada_en is null and expira_en > now()` |

Índices: `(caja_id, creado_en)`, `(autorizada_por)`, `(empresa_id, autoaprobada, creado_en)`.

### 9.1 `cajas` y `accesos_a_cajas`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `nombre` | text | no | 1–80; único `(empresa_id, nombre normalizado)` |
| `localidad_id` | uuid | sí | FK compuesta a `empresas.localidades` |
| `bodega_id` | uuid | no | FK compuesta a `inventarios.bodegas`. Índice |
| `activa` | boolean | no | `default true`; no se inactiva con turno abierto |

`accesos_a_cajas`: la forma estándar (`caja_id`, `usuario_id`, `empresa_id`). Ojo: dar acceso a la caja **no** da acceso a su bodega, y la orden al
kardex corre con la RLS del cajero. Al asignar, si el usuario no tiene la bodega, aviso `usuario_sin_bodega_de_la_caja`; al vender, error claro.

### 9.2 `medios_de_pago` y `conceptos_de_caja`

`medios_de_pago`: `nombre`, `clave_de_sistema in ('efectivo', 'tarjeta', 'transferencia', 'cheque')` nula, `es_efectivo boolean`, `pide_referencia boolean`,
`activo`. Semilla perezosa con los cuatro. `conceptos_de_caja`: `nombre`, `tipo in ('ingreso', 'gasto')`, `activo`; semilla con «Compras menores», «Servicios»,
«Otros». Sin rubro.

### 9.3 `formas_de_venta`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `nombre` | text | no | 1–80; único `(empresa_id, nombre normalizado)` |
| `activa` | boolean | no | `default true` |
| `modo_fel` | text | sí | `in ('certificador', 'transcrito')`; nulo = control |
| `clase` | text | no | **Generada**: `case when modo_fel is null then 'control' else 'formal' end` stored |
| `conexion_fel_id` | uuid | sí | Sin llave hasta que exista `facturacion-fel`. Check `(modo_fel = 'certificador') = (conexion_fel_id is not null)` con `coalesce` |
| `tipo_dte` | text | sí | `in ('FACT', 'FCAM', 'FPEQ', 'FCAP', 'FARP', 'FCRP', 'FPEC', 'FCPC', 'RECI')` (sin los de regímenes derogados: una forma es para vender de hoy en adelante); check `(modo_fel is null) = (tipo_dte is null)` |
| `localidad_id` | uuid | sí | FK compuesta a `empresas.localidades`; check `(modo_fel is null) = (localidad_id is null)` |
| `titulo_del_comprobante` | text | no | `default 'Comprobante de venta'`; check con la lista cerrada de §4.6 |
| `aplica_a_todas_las_cajas`, `aplica_a_todos_los_usuarios` | boolean | no | `default true`. §3.3: apagadas, sin filas = nadie |
| `plantilla` | text | no | `in ('ticket_58', 'ticket_80', 'media_carta')` |
| `admite_credito` | boolean | no | `default false` |
| `prefijo` | text | sí | 1–6, `^[A-Z0-9-]+$`; solo para mostrar el correlativo interno |

El correlativo vive en `core.correlativos` con la clave `ventas-y-caja.formas.<id>` (sin huecos). Índice `(empresa_id, activa)`. Único
`formas_de_venta_id_empresa_clase_unico (id, empresa_id, clase)` (§9.0).

`formas_por_caja` (`forma_id`, `caja_id`, `predeterminada`; PK de las dos; único parcial `(caja_id) where predeterminada`). `formas_por_usuario` (`forma_id`,
`usuario_id` FK `core.usuarios`; PK de las dos). Índice por la segunda columna de cada una.

### 9.4 `productos`, `componentes_de_combo`, `menus_del_dia`, `renglones_de_menu`

**`productos`**

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id`, `nombre` | uuid, text | no | Nombre 1–120; único normalizado por empresa; índice trigram para el buscador |
| `codigo` | text | sí | Único parcial por empresa |
| `tipo` | text | no | `in ('articulo', 'platillo', 'servicio', 'combo')` |
| `articulo_id` | uuid | sí | FK compuesta a `inventarios.articulos`. Check: no nulo en `articulo` y `platillo`; nulo en `servicio` y `combo` |
| `descarga` | text | no | `in ('existencia', 'receta', 'ninguna')`. Check: `articulo` → `existencia`; `platillo` → `existencia` o `receta`; `servicio` y `combo` → `ninguna` (el combo descarga por sus componentes) |
| `precio` | numeric(14,2) | no | `> 0`; con IVA incluido si aplica |
| `categoria_de_venta` | text | sí | 1–40, para las pestañas del mostrador |
| `concepto_de_ingreso_id` | uuid | sí | FK compuesta a `libro_de_ventas.conceptos_de_ingreso`. Obligatorio solo al vender con forma formal (dominio) |
| `clase_fiscal` | text | no | `default 'gravada'`; `in ('gravada', 'exenta')`. Se copia a toda línea, formal o de control (CV-5) |
| `foto_archivo_id` | uuid | sí | FK `core.archivos` |
| `activo` | boolean | no | `default true` |

`componentes_de_combo`: `combo_id`, `producto_id` (FK compuestas; check distintos), `cantidad > 0`; un componente no puede ser combo (dominio).
`menus_del_dia`: `fecha`, `nombre`, `activo`; único `(empresa_id, fecha, nombre)`. `renglones_de_menu`: `menu_id`, `producto_id`, `precio_del_dia` nulo o `> 0` (check, S-09), `cupo` nulo o `>= 0`.

### 9.5 `turnos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id`, `caja_id` | uuid | no | FK compuesta |
| `numero`, `anio_de_numero` | integer | no | Correlativo `ventas-y-caja.turnos` |
| `responsable_id` | uuid | no | FK `core.usuarios`; quien abre, o quien aceptó (§5.1) |
| `abierto_en`, `cerrado_en` | timestamptz | no, sí | |
| `fecha_de_operacion` | date | no | En la zona de la empresa, al abrir |
| `fondo_inicial` | numeric(14,2) | no | `>= 0` |
| `estado` | text | no | `in ('abierto', 'cerrado')`; `(estado = 'cerrado') = (cerrado_en is not null)` |
| `foto_de_cierre` | jsonb | sí | Totales por medio, forma y clase; `(estado = 'cerrado') = (no nula)` |

Único `(id, caja_id, empresa_id)`. Único parcial `turnos_uno_abierto (caja_id) where estado = 'abierto'`. Índice `(empresa_id, fecha_de_operacion)`.

**Concurrencia:** registrar una venta toma `for share` del turno y cerrar toma `for update`; así ninguna venta entra a un turno que se está cerrando.

### 9.6 `arqueos`

Como `caja_chica.arqueos`: `turno_id`, **`caja_id`** (S-15), `clase in ('parcial', 'de_cierre')`, `realizado_en`, `arqueado_por`, `conteo jsonb` (array, hasta 40 denominaciones; **el servidor recalcula** `efectivo_contado`, S-27), `efectivo_contado`, `efectivo_esperado`,
`diferencia` con check `= contado − esperado`, `otros_medios jsonb` (validado, hasta 20 entradas), `motivo_de_diferencia` (obligatorio fuera de la tolerancia: dominio), `era_ciego boolean`, anulación completa.
Único parcial `(turno_id) where clase = 'de_cierre' and estado = 'vigente'`.

### 9.7 `movimientos_de_caja`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id`, `turno_id`, `caja_id` | uuid | no | FK compuestas; el `caja_id` para RLS |
| `numero`, `anio_de_numero` | integer | no | Correlativo `ventas-y-caja.movimientos` |
| `tipo` | text | no | `in ('ingreso', 'gasto', 'compra_de_inventario', 'retiro', 'deposito', 'traslado', 'abono_de_cartera', 'devolucion')` |
| `confirmacion` | text | no | `in ('no_aplica', 'en_transito', 'confirmado', 'rechazado')`; check: `deposito` y `traslado` ⇔ distinto de `no_aplica` |
| `confirmado_por`, `confirmado_en` | uuid, timestamptz | sí | Check: los dos con `confirmado` o `rechazado`. En un traslado, o en un depósito sin Bancos, distinto de `creado_por` (dominio; en negocio de una persona, autoaprobado) |
| `autorizacion_id` | uuid | sí | FK compuesta a `autorizaciones_de_caja`; obligatoria en dominio según §5.5 |
| `medio_id` | uuid | no | FK compuesta |
| `monto` | numeric(14,2) | no | `> 0`; el signo lo da el tipo |
| `concepto_id` | uuid | sí | FK compuesta; obligatorio en `ingreso` y `gasto` |
| `descripcion`, `referencia` | text | sí | 1–200, 1–60 |
| `foto_archivo_id` | uuid | sí | FK compuesta a `core.archivos`, `recurso_dueno = 'ventas-y-caja.movimientos'`; obligatoria sobre el tope (§5.5) |
| `movimiento_de_banco_id` | uuid | sí | FK compuesta a `bancos.movimientos`; solo en `deposito` |
| `cobro_id` | uuid | sí | FK compuesta a `cuentas_por_cobrar.cobros`; `(tipo = 'abono_de_cartera') = (no nulo)` |
| `documento_de_inventario_id` | uuid | sí | FK compuesta a `inventarios.documentos`; solo en `compra_de_inventario` |
| `movimiento_relacionado_id` | uuid | sí | Autorreferencia (entre cajas, reverso) |
| `clave_de_idempotencia` | uuid | sí | Único parcial por empresa |
| `estado` + anulación completa | | | `vigente`/`anulado` |

Índices: `(turno_id, tipo)`, `(empresa_id, creado_en)`, `(empresa_id, confirmacion, creado_en) where confirmacion = 'en_transito'`. El pago inicial de una venta mixta **no** crea movimiento `abono_de_cartera`: ya está en `pagos_de_venta`, y contarlo en los dos descuadraría el turno.

### 9.8 `ventas`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK; `ventas_id_empresa_unico`; único `(id, caja_id, empresa_id)` |
| `clave_de_idempotencia` | uuid | no | Único `(empresa_id, caja_id, vendida_por, clave_de_idempotencia)` (§4.7) |
| `hash_del_contenido` | text | no | sha-256 de lo pedido |
| `caja_id`, `turno_id` | uuid | no | FK compuesta `(turno_id, caja_id, empresa_id)` |
| `forma_id` | uuid | no | FK compuesta `(forma_id, empresa_id, clase)` |
| `clase` | text | no | `in ('formal', 'control')`; copiada, **y la llave impide que difiera de la forma** |
| `numero`, `anio_de_numero` | integer | no | Correlativo de la forma; único `(empresa_id, forma_id, anio_de_numero, numero)` |
| `vendida_en` | timestamptz | no | |
| `fecha` | date | no | En la zona de la empresa |
| `entrega` | text | no | `in ('entregada', 'pendiente')` |
| `entregada_en` | timestamptz | sí | `(entrega = 'entregada') = (no nula)`: la **fecha real de entrega** |
| `cuenta_id` | uuid | no | `default deLaTransaccion.cuenta()`; FK `(empresa_id, cuenta_id)` a `core.empresas`; para la llave del cliente |
| `cliente_id` | uuid | sí | FK compuesta a `terceros.clientes (id, cuenta_id)`. Nulo = «Cliente de mostrador» |
| `nombre_del_cliente` | text | no | Copiado; `'Cliente de mostrador'` sin cliente |
| `nit_receptor` | text | sí | Solo en formal |
| `condicion` | text | no | `in ('contado', 'credito', 'mixto')`; check: `credito` y `mixto` exigen `cliente_id` |
| `subtotal`, `descuento`, `total` | numeric(14,2) | no | `total = subtotal − descuento`; `total > 0`; `descuento >= 0` |
| `costo_al_registrar` | numeric(14,2) | sí | Lo que respondió Inventarios; nulo sin descarga. **Es una foto**: un recálculo lo deja viejo, y los reportes de margen leen el kardex (CV-14) |
| `moneda`, `tipo_de_cambio` | char(3), numeric(16,8) | no | FK `core.monedas`, `default 'GTQ'`, 1. Check GTQ en v1 (`solo_quetzales_por_ahora`) |
| `inscrita_al_vender` | boolean | no | Foto de §3.9 |
| `motivo_de_control` | text | sí | Lista de §3.8; check `clase = 'control' or nulo`. Con VJ-P1 a: `not (clase = 'control' and inscrita_al_vender and motivo is null)`. Check (CV-4): `motivo <> 'pedido_sin_entrega' or entrega = 'pendiente'` |
| `motivo_de_control_texto` | text | sí | 1–200; obligatorio con `otro` |
| `autorizacion_externa` | uuid | sí | Obligatoria con `fel_externa` (CV-2, S-14); registrada en `dte_de_ventas` |
| `regimen_iva`, `regimen_isr` | text | sí | Copiados del mes |
| `foto_fiscal` | jsonb | no | §3.6; check `jsonb_typeof = 'object'` y hasta 8 KB |
| `estado_fiscal` | text | no | `in ('no_aplica', 'por_certificar', 'en_contingencia', 'certificado', 'aceptado', 'transcrito', 'rechazado')`; check: `clase = 'control'` ⇔ `no_aplica` |
| `autorizacion_fel` | uuid | sí | Único parcial por empresa; registrada en `dte_de_ventas` |
| `serie_dte`, `numero_dte` | text | sí | Del DTE |
| `fecha_dte` | date | sí | Fecha del DTE, separada de la entrega |
| `documento_de_libro_id` | uuid | sí | FK compuesta a `libro_de_ventas.documentos`; solo `formal` |
| `cargo_id` | uuid | sí | FK compuesta a `cuentas_por_cobrar.documentos`; el cargo vigente **original** de la venta |
| `autorizacion_de_anulacion_id` | uuid | sí | FK compuesta a `autorizaciones_de_caja` (§4.8) |
| `documento_de_inventario_id` | uuid | sí | FK compuesta a `inventarios.documentos` |
| `vendida_por` | uuid | no | FK `core.usuarios` |
| `estado` + anulación completa + `fecha_de_anulacion` | | | `vigente`/`anulada` |

Índices: `(empresa_id, fecha, clase)`, `(turno_id)`, `(empresa_id, cliente_id, fecha)`, `(empresa_id, estado_fiscal) where estado_fiscal in ('por_certificar', 'en_contingencia', 'rechazado')`,
`(empresa_id, entrega) where entrega = 'pendiente'` y `(empresa_id, motivo_de_control, fecha) where clase = 'control'`.

### 9.9 `lineas_de_venta`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id`, `venta_id`, `caja_id` | uuid | no | FK compuesta `(venta_id, caja_id, empresa_id)`, **on delete no action** (no se borran) |
| `orden` | smallint | no | Único `(venta_id, orden)` |
| `producto_id` | uuid | no | FK compuesta |
| `linea_de_combo_id` | uuid | sí | Autorreferencia: el componente apunta a la línea del combo |
| `descripcion` | text | no | Copiada |
| `tipo`, `descarga` | text | no | Copiados del producto |
| `articulo_id` | uuid | sí | FK compuesta a `inventarios.articulos`; copiado |
| `cantidad` | numeric(14,4) | no | `> 0` |
| `precio_unitario`, `descuento`, `total` | numeric(14,2) | no | Checks: `total > 0`; `0 <= descuento <= round(cantidad × precio, 2)`; y **sin padre de combo** `total = round(cantidad × precio, 2) − descuento`. En un componente, `total` es su parte del combo (§4.3) y `precio_unitario` es informativo |
| `descuento_dado_por` | uuid | sí | Con `descuento > 0` |
| `clase_fiscal`, `concepto_de_ingreso_id` | text, uuid | no, sí | Copiados **siempre** (CV-5). El concepto es obligatorio al pasar a formal |
| `costo_al_registrar` | numeric(14,2) | sí | Foto (CV-14); solo con `ventas-y-caja.costos.ver` en el DTO |
| `estado_de_descarga` | text | no | `in ('no_aplica', 'pendiente', 'hecha', 'revertida')` |

Índices: `(producto_id)`, `(empresa_id, estado_de_descarga) where estado_de_descarga = 'pendiente'`, `(articulo_id) where articulo_id is not null`.

### 9.10 `pagos_de_venta`

`venta_id`, `caja_id`, `turno_id` (FK compuestas de §9.0), `medio_id`, `monto > 0`, `recibido` (efectivo entregado), `vuelto` (check `vuelto = recibido − monto` y `>= 0` si hay `recibido`), `referencia`, `cobro_id` (FK compuesta a `cuentas_por_cobrar.cobros`, en
mixto o anticipo), `vigente`. Índices `(venta_id)`, `(turno_id, medio_id) where vigente`.

### 9.11 `regularizaciones` y `regularizacion_ventas`

`regularizaciones`: `numero`, `anio_de_numero`, `caja_id` (FK compuesta, no nula), `forma_id` (la formal), `fecha`, `documento_de_libro_id` (FK compuesta, **único**), `total`, `autorizacion_fel`, anulación completa.
`regularizacion_ventas`: `regularizacion_id`, `venta_id`, `caja_id`, `monto`; único parcial `(venta_id) where vigente`. Check en dominio: `Σ monto = total`.

**`dte_de_ventas` (CV-2, S-14)**: un solo lugar para que una autorización no se use dos veces entre ventas, regularizaciones y libro.

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `empresa_id`, `autorizacion` | uuid | no | **PK**. Valida el formato uuid |
| `origen` | text | no | `in ('venta_formal', 'fel_externa', 'regularizacion')` |
| `venta_id`, `regularizacion_id` | uuid | sí | FK compuestas; exactamente una |
| `documento_de_libro_id` | uuid | sí | FK compuesta |
| `verificacion` | text | no | `in ('sin_verificar', 'verificado', 'no_encontrado')`, `default 'sin_verificar'` |
| `verificado_por`, `verificado_en` | uuid, timestamptz | sí | Juntos; `verificado` llega al cruzar con la bandeja |

Antes de registrar, se pregunta al libro si ya tiene esa autorización. Si está y no está ligada: `dte_ya_en_el_libro` con el camino para
ligarla (A-8). **Transcribir exige `dte.transcribir`**, un permiso separado de vender. Índice `(empresa_id, verificacion)`.

### 9.12 Migraciones

`npm run generar -- modulo ventas-y-caja --nombre "Ventas y caja" --icono ShoppingCart` crea el esqueleto. `0001_vcj1_catalogos` (con auditoría permanente), `0002_vcj2_cajas_y_turnos`,
`0003_vcj4_ventas_y_autorizaciones`, `0004_vcj5_movimientos_de_caja`, `0005_vcj8_credito` (las llaves a la cartera), `0006_vcj9_regularizaciones_y_dte`. **Sin datos que convertir.** Auditoría permanente (S-07):
`ventas-y-caja.ventas`, `.turnos`, `.arqueos`, `.formas`, `.regularizaciones`, **`.movimientos`, `.cajas`, `.productos`**, y en la migración de la cartera, **sus cobros y recibos**, con el motivo «Conservación de libros y documentos (Código de Comercio art. 382; Código Tributario, por confirmar)».

## 10. Datos de Producción (esquema `produccion`)

Mismas convenciones. RLS por empresa. **Las órdenes llevan además la política de alcance por bodega** (`politicaPorAlcanceOpcional(ALCANCE_DE_BODEGAS, 'bodega_de_insumos_id')`): el bodeguero no produce con una bodega que no ve.

| Tabla | Columnas principales | Reglas |
|---|---|---|
| `recetas` | `nombre`, `articulo_id` (FK compuesta a `inventarios.articulos`), `activa` | Único parcial `(empresa_id, articulo_id) where activa` |
| `versiones_de_receta` | `receta_id`, `version int`, `estado in ('borrador', 'vigente', 'reemplazada')`, `vigente_desde date`, `rendimiento numeric(14,4) > 0`, `unidad_de_rendimiento_id`, `mano_de_obra`, `indirectos` (numeric(14,2) `default 0`), `notas` | Único `(receta_id, version)`; único parcial `(receta_id) where estado = 'vigente'`; no se edita si tiene usos |
| `ingredientes` | `version_id`, `orden`, `articulo_id`, `cantidad numeric(14,4) > 0` (**neta**, CV-9), `unidad_id`, `cantidad_base` (en la unidad base del artículo), `merma_porcentaje numeric(5,2)` 0–99.99, `opcional boolean` | Único `(version_id, articulo_id)`; el artículo no es el producido |
| `sustitutos` | `ingrediente_id`, `articulo_id`, `factor numeric(10,4) > 0`, `prioridad smallint` | Único `(ingrediente_id, articulo_id)` |
| `ordenes` | `numero`, `anio_de_numero`, `version_id`, `fecha`, `bodega_de_insumos_id`, `bodega_de_terminado_id`, `cantidad_planeada`, `cantidad_producida`, `mano_de_obra`, `indirectos`, `costo_total`, `documento_de_consumo_id`, `documento_de_entrada_id` (FK compuestas a `inventarios.documentos`), `estado in ('abierta', 'terminada', 'anulada')` + anulación | `(estado = 'terminada') = (producida y los dos documentos no nulos)`. Índice `(empresa_id, fecha, estado)` |
| `consumos_de_orden` | `orden_id`, `ingrediente_id` (nulo si se agregó), `articulo_id`, `es_sustituto`, `cantidad_teorica`, `cantidad_real`, `costo` | Único `(orden_id, articulo_id)` |
| `variaciones_de_orden` | `orden_id`, `documento_id`, `diferencia` numeric(14,2), `causa`, `registrada_en` | Solo se agrega; la llena la escucha de `costo_recalculado` |
| `consumos_por_venta` | `venta_id` (**sin llave**: Ventas no es dependencia), `linea_de_venta_id`, `version_id`, `cantidad`, `vigente` | Único parcial `(linea_de_venta_id) where vigente` |

Migraciones: `0001_rec1_recetas`, `0002_rec3_ordenes`, `0003_rec5_consumos_por_venta`. Auditoría permanente: `produccion.ordenes`.

## 11. Reglas principales (un caso de uso por acción)

### 11.1 Registrar una venta (`RegistrarVenta`, `ventas.crear`)

En una transacción:

1. **Autoriza** (permiso y caja) y después revisa la idempotencia (§4.7).
2. Turno abierto de la caja (`for share`); forma activa y permitida para esa caja y usuario (§3.3); con forma de control, además `ventas.vender-control`.
3. Reglas de la forma (§3.5) y del motivo (§3.8); **el servidor calcula** precios y descuentos (§4.3); condición (§4.4), límite de crédito (§6.5).
4. Correlativo de la forma. Guarda venta, líneas, pagos y foto.
5. Si `entrega = 'entregada'`: arma los renglones (existencia, receta o componentes), manda `inventarios.registrar_salida_por_venta` y guarda el costo. Sin existencia: según VJ-P4.
6. Si es a **crédito o mixto, de control**: `cuentas-por-cobrar.recibir_venta_de_control`; lo pagado va como cobro `caja`, con su recibo de pago.
7. **Formal:** se hace **cuando nace la obligación** (CV-19). En bienes, al entregar; si es un pedido, este paso lo hace `EntregarVenta`. Con `transcrito`, valida el DTE y manda `libro-de-ventas.registrar_documento` en esta misma transacción, y queda `sin_verificar` (§9.11). Con `certificador`, queda `por_certificar` (§16.2).
8. **Formal a crédito o mixto (CV-19):** el cargo **no** lo crea Ventas: nace de `libro-de-ventas.registrar_documento` con destino `cuentas-por-cobrar`. El pago inicial entra como cobro `caja` aplicado a ese cargo. Con `certificador`, ambos ocurren en la transacción 2 (§16.2); mientras tanto, el pago queda como anticipo.
9. Publica `ventas-y-caja.venta_registrada` dentro de la unidad de trabajo (`PublicadorDeEventos`).

### 11.2 Anular una venta (`AnularVenta`, `ventas.anular`)

**Siempre se pregunta «¿Volvió la mercadería?»** (CV-8, S-01). La anulación **no** revierte el kardex por omisión.

| Situación | Qué pasa |
|---|---|
| **Quién** | Nadie anula su propia venta si existe otro usuario con el permiso y la caja: autoriza esa persona (§4.8, VJ-P12). En negocio de una sola persona, `autoaprobada` |
| **Volvió** | Revierte el kardex (`anular_documento_de_origen`) o, con el mes cerrado, `devolucion_de_venta` con fecha de hoy |
| **No volvió** | Se debe elegir la causa: **error de registro sin entrega real** (revierte, con constancia de que nunca salió); **merma con soporte** (salida por ajuste); **salida especial** (cortesía o retiro, con su aviso de IVA art. 3 nums. 7 y 9). Si el cliente simplemente no pagó, **no se anula**: se gestiona como incobrable en la cartera |
| Turno **abierto**, sin abonos posteriores | Anula con motivo y revierte pagos, cargo y receta. El efectivo sale del esperado |
| Turno **cerrado** | Exige `ventas.anular-turno-cerrado`. El dinero devuelto es un movimiento `devolucion` en el **turno abierto** de hoy: **el turno cerrado no se toca**. Si el turno es de otra persona, su responsable **acepta** (S-10) |
| **Medio de devolución (S-10)** | Por el **medio original**. Otro medio exige autorización (§4.8) |
| Con abonos a su cargo | Rechaza (`venta_con_abonos`, con los recibos): primero se anulan los recibos (§6.3) |
| **Con Cartera apagada y cargo (S-21)** | Falla cerrado (`requiere_cuentas_por_cobrar`): no se anula dejando viva la deuda |
| **Formal** | No se anula aquí sola. Va al adaptador (anulación firmada, art. 9) o, si está fuera de plazo, pide **nota de crédito** (V-11 de ventas). Anula en Libro con `documento_por_anular` |
| Ya **regularizada** | Rechaza: se anula primero la regularización |

### 11.3 Otros casos de uso

- **Anular regularización**: anula el documento del libro (con su regla) y **deshace el traslado** de la cartera (§6.4 al revés). Rechaza si el cargo del DTE recibió abonos después.
- **Devolución parcial** (VCJ-14): `devoluciones_de_venta` con sus líneas. En formal exige nota de crédito.
- **Buscar cliente en Mostrador (S-17)**: ruta propia, no `terceros.ver`. Mínimo 3 caracteres, hasta 10 resultados, solo nombre e identificador parcial, con límite de solicitudes. El saldo se pide **solo del cliente elegido**.
- **Cerrar turno**: `for update`; pagos, gastos y arqueo. Rechaza con ventas `por_certificar` del turno **solo si** llevan más que el plazo configurado; si no, avisa.
- **Procesar descargas pendientes** (`ventas.descargar-pendientes`): por línea o todas; con la fecha de la venta y las tres salidas de §7.4.
- **Recibir un abono en caja** (`pagos.recibir`): movimiento `abono_de_cartera` + orden `cuentas-por-cobrar.registrar_cobro_de_caja`; aplicado **a lo más viejo por omisión**; aplicarlo a otro cargo queda en el reporte de §6.3 (S-08). Un cajero **no necesita** `cuentas-por-cobrar.cobros.crear`: el permiso lo exige la ruta de origen (ARQUITECTURA §4.8).

## 12. Adenda a la cartera: tablas

Antes de CXC-1, en las tablas del diseño aprobado (§6.2, §6.3 de ese diseño):

| Tabla | Cambio |
|---|---|
| `documentos.origen` | Suma `venta_de_control` |
| `documentos.tipo` | Suma `comprobante_interno` |
| `documentos.referencia_de_origen_id` (uuid, nula) | `(origen = 'venta_de_control') = (no nula)`; único parcial `(empresa_id, referencia_de_origen_id) where estado = 'vigente'` |
| `documentos.estado` | Suma `sustituido` |
| `documentos.sustituido_por_id`, `sustituido_el` | Autorreferencia compuesta y fecha; `(estado = 'sustituido') = (los dos no nulos)`. Índice parcial |
| `cobros.forma` | Suma `caja`, con `medio` obligatorio y sin `movimiento_id` |
| `cobros.clase_de_recibo` (text, no nula) | `in ('cobro', 'pago_de_control')`. El único pasa a `(empresa_id, clase_de_recibo, anio_de_numero, numero)` |
| `cobros.grupo_de_pago_id` (uuid, nula) | §6.3; índice parcial |
| `cobros.referencia_de_caja_id` (uuid, nula) | El movimiento de caja o el pago de la venta (mixto o anticipo), sin llave; `(forma = 'caja') = (no nula)` |
| `aplicaciones_de_cobros` y `aplicaciones_de_abonos` | `trasladada_de_id` (autorreferencia, nula): de qué aplicación viene |
| `condiciones_de_cliente` | `es_trabajador boolean default false`, `autorizacion_de_descuento_archivo_id` (FK compuesta a `core.archivos`, nula). Se sube **solo** por `DocumentosProtegidos` con `recurso_dueno = 'cuentas-por-cobrar.autorizaciones-de-descuento'` y ruta con permiso propio (S-16): `GET /archivos/:id` solo exige sesión para imágenes sin dueño |
| `documentos`, `cobros` | Único `(id, empresa_id)`, destino de las llaves compuestas de Ventas (§9.0) |

**Regla sobre anular cobros `caja`:** `AnularCobro` directo los rechaza (`cobro_de_caja`, «Anúlelo desde Caja»), para que el efectivo del turno y la cartera no se desencuadren. Ventas lo anula con la orden `cuentas-por-cobrar.anular_cobro_de_caja`.

**Regla en el dueño del dato (S-21):** los avisos del mediador no llegan a módulos apagados, así que la protección no puede depender de ellos. Un documento de Inventarios, Libro o Cartera con `modulo_de_origen` **solo se anula por la orden del origen**, con Ventas encendido o apagado.

**Sin Bancos:** las formas `deposito`, `nota_ligada` y `tarjeta` no se ofrecen. **Sin Libro de ventas:** `RecibirDocumento` nunca se llama; retenciones y cuadre no se muestran.

## 13. Contratos entre módulos

### 13.1 Órdenes (dentro de la transacción)

| Orden | Atiende | Datos → respuesta |
|---|---|---|
| `inventarios.registrar_salida_por_venta` | Inventarios | `{ ventaId, bodegaId, fecha, renglones }` → `{ documentoId, costoCentavos, porLinea }` |
| `inventarios.registrar_devolucion_de_venta` | Inventarios | `{ ventaId, renglones con movimiento de origen }` → `{ documentoId }` |
| `inventarios.registrar_salida_a_produccion` / `registrar_entrada_de_produccion` | Inventarios | Orden, bodega, renglones (y costo fijo en la entrada) → `{ documentoId, costoCentavos }` |
| `inventarios.registrar_compra_sin_factura` | Inventarios | Bodega, renglones, `proveedorLibre`, foto → `{ documentoId }` |
| `inventarios.anular_documento_de_origen` | Inventarios | `{ modulo, documentoDeOrigenId, clase, motivo }` |
| `produccion.consumo_para_venta` / `produccion.anular_consumo_de_venta` | Producción | §8.6 |
| `cuentas-por-cobrar.recibir_venta_de_control` | Cartera | `{ ventaId, clienteId, fecha, totalCentavos, pagoInicial? }` → `{ cargoId, cobroId?, recibo? }` |
| `cuentas-por-cobrar.registrar_cobro_de_caja` / `anular_cobro_de_caja` | Cartera | Cliente, monto, medio, aplicaciones, `referenciaDeCaja` → recibos |
| `cuentas-por-cobrar.anular_cargo_de_venta` | Cartera | Rechaza con abonos |
| `libro-de-ventas.registrar_documento` | Libro de ventas | La orden que §20 de ese diseño dejó «a definir»: tipo, DTE, cliente, líneas, `destino`, `sustituyeCargos?`, **`origenDeRegularizacion?`** → `{ documentoId }` |
| `libro-de-ventas.buscar_autorizacion` | Libro de ventas | `{ autorizacion }` → `{ documentoId?, ligado }` (§9.11) |
| `bancos.registrar_nota_de_origen` | Bancos | Ya existe: depósito del turno |

`DocumentoDeVentaParaDestino` suma el opcional `sustituyeCargos: string[]`: `RecibirDocumento` aplica §6.4 si viene.

### 13.2 Avisos y preguntas

| Mensaje | Quién | Para qué |
|---|---|---|
| `libro-de-ventas.documento_por_anular` / `_por_eliminar` | Ventas escucha | Rechaza si el documento viene de una venta vigente («Anúlelo desde Ventas») |
| `bancos.movimiento_por_cambiar` | Ventas escucha | Rechaza cambios a un depósito del turno |
| `inventarios.documento_por_anular` (nuevo) | Ventas y Producción escuchan | Mensaje claro. **La regla no depende de este aviso** (§12, S-21) |
| `empresas.revisar_cierre_de_carga` | Ventas responde | Turnos abiertos antes de la fecha de corte |
| `inventarios.revisar_cierre_del_mes` (pregunta nueva) | Ventas responde | **Bloquea** con descargas pendientes del mes (§7.4) |

### 13.3 Eventos (dinero en centavos; por `PublicadorDeEventos`)

| Evento | Datos propios |
|---|---|
| `ventas-y-caja.venta_registrada` | Clase, forma, condición, `entrega`, líneas, medios, cliente, régimen, inscrita, motivo |
| `ventas-y-caja.venta_entregada` | `ventaId`, fecha, clase, condición, líneas (clase fiscal, concepto, monto, costo), anticipo aplicado, régimen (CV-16) |
| `ventas-y-caja.venta_anulada` | Lo que revierte, `fechaDeAnulacion` |
| `ventas-y-caja.venta_regularizada` / `regularizacion_anulada` | Ventas, documento del libro, IVA pendiente que se traslada |
| `ventas-y-caja.movimiento_de_caja_registrado` / `_anulado` | Tipo, medio, concepto, monto |
| `ventas-y-caja.turno_cerrado` / `turno_reabierto` | Totales, diferencia |
| `produccion.orden_terminada` / `orden_anulada` | Consumos, entrada, mano de obra, indirectos |
| `produccion.variacion_registrada` | Orden, diferencia |

## 14. Permisos, auditoría, errores y configuración

### 14.1 Permisos (PLAN §3.5; ninguno `soloSuperacceso`)

| Recurso | Permisos |
|---|---|
| Formas | `ventas-y-caja.formas.ver`, `.crear`, `.editar`, `.eliminar`, **`.configurar-control`** (crear o editar formas sin FEL en empresa inscrita, VJ-P10) |
| Productos | `ventas-y-caja.productos.ver`, `.crear`, `.editar`, `.eliminar`, `.importar`, `.exportar` |
| Menú del día | `ventas-y-caja.menus.ver`, `.crear`, `.editar`, `.eliminar` |
| Medios y conceptos | `ventas-y-caja.medios-de-pago.*`, `ventas-y-caja.conceptos-de-caja.*` (`ver`, `crear`, `editar`, `eliminar`, `importar`, `exportar`) |
| Cajas | `ventas-y-caja.cajas.ver`, `.ver-todas`, `.crear`, `.editar`, `.eliminar`, `.asignar`, `.importar`, `.exportar` |
| Turnos | `ventas-y-caja.turnos.ver`, `.abrir`, `.cerrar`, `.reabrir` |
| Arqueos | `ventas-y-caja.arqueos.ver`, `.ver-esperado`, `.crear`, `.anular` |
| Movimientos de caja (S-02) | `ventas-y-caja.movimientos.ver`, `.ingresar`, `.gastar`, `.comprar`, `.retirar`, `.depositar`, `.trasladar`, `.confirmar`, `.anular` |
| Ventas | `ventas-y-caja.ventas.ver`, `.crear`, **`.crear-pedido`**, **`.vender-control`**, `.credito`, `.descontar`, `.exceder-limite`, `.retrofechar`, `.anular`, `.anular-turno-cerrado`, `.descargar-pendientes` |
| DTE (S-14) | `ventas-y-caja.dte.transcribir`, `.verificar` |
| Controles (S-23) | `ventas-y-caja.controles.configurar` |
| Auditoría (S-06) | `ventas-y-caja.auditoria.ver` |
| Costos | `ventas-y-caja.costos.ver` |
| Pagos en caja | `ventas-y-caja.pagos.recibir`, `.anular`, `.anular-turno-cerrado` |
| Regularización | `ventas-y-caja.regularizaciones.ver`, `.crear`, `.anular` |
| Reportes | `ventas-y-caja.reportes.ver`, **`.ver-control`**, `.ver-faltantes-por-persona` (S-26), `.exportar` |
| Recetas | `produccion.recetas.ver`, `.crear`, `.editar`, `.eliminar`, `.importar`, `.exportar` |
| Órdenes | `produccion.ordenes.ver`, `.crear`, `.terminar`, `.anular` |
| Costos y reportes | `produccion.costos.ver`, `produccion.reportes.ver`, `.exportar` |

- `recursosConAlcance`: `ventas-y-caja.cajas` (`ALCANCE_DE_CAJAS`, `.ver-todas`, `.asignar`).
- Un permiso propio de costos porque el módulo no puede depender de que `inventarios.costos.ver` signifique lo mismo: sin él, los DTO **no** traen costo ni margen.
- **`reportes.ver-control` no se puede quitar para ocultar**: las ventas de control siguen en todos los totales. Sirve para dar el detalle a un contador externo sin darle más.
- **Contador externo y RLS por caja (S-12):** `reportes.ver-control` no abre cajas por sí solo. Para ver la conciliación completa necesita `cajas.ver-todas`; sin él, sale marcada **PARCIAL**.
- Un rol «Cajero» de fábrica no se crea: PLAN §3.5 no depende de tipos de rol.

### 14.2 Auditoría (en la unidad de trabajo; `core.auditoria` solo se agrega)

| Caso de uso | `recurso` | `accion` | `anterior` |
|---|---|---|---|
| Inactivar, reactivar, eliminar catálogos | `ventas-y-caja.<plural>`, `produccion.recetas` | `inactivar` / `reactivar` / `eliminar` | DTO |
| **Crear** o cambiar una forma: FEL, crédito, título, prefijo, cajas, usuarios (S-07) | `ventas-y-caja.formas` | `configurar` | Antes y después |
| **Cambiar precio** de producto o precio del día (S-07, S-09) | `ventas-y-caja.productos` / `.menus` | `corregir` | Antes y después |
| **Cambiar controles** de §14.4 (S-23) | `ventas-y-caja.controles` | `configurar` | Antes y después |
| **Cambiar el NIT** (S-04) | `empresas.empresas` | `corregir` | Valor anterior, nuevo y motivo |
| Autorización de segunda persona, usada o fallida (S-11) | `ventas-y-caja.autorizaciones` | `autorizar` | Acción, monto, quién pide y quién autoriza |
| Entregar con cambio de motivo (CV-4) | `ventas-y-caja.ventas` | `corregir` | Motivo anterior y nuevo |
| Registrar con otra fecha (S-24) | `ventas-y-caja.ventas` | `ajustar` | Fecha real y fecha registrada |
| Anular venta o devolución | `ventas-y-caja.ventas` | `anular` | DTO con líneas, pagos y foto |
| Reimprimir comprobante o recibo | `ventas-y-caja.ventas` | `reimprimir` | Número y usuario |
| Descuento sobre el tope | `ventas-y-caja.ventas` | `ajustar` | Precio antes y quién |
| Exceder el límite de crédito | `ventas-y-caja.ventas` | `ajustar` | Límite, saldo y monto |
| Regularizar y anularla | `ventas-y-caja.regularizaciones` | `corregir` / `anular` | Ventas y cargos antes |
| Cerrar y reabrir turno | `ventas-y-caja.turnos` | `cerrar` / `reabrir` | Foto de cierre; motivo |
| Anular arqueo o movimiento de caja | `ventas-y-caja.arqueos` / `.movimientos` | `anular` | DTO |
| Cambiar acceso a una caja | `ventas-y-caja.cajas` | `asignar` / `quitar` | Usuario y caja |
| Publicar versión de receta; anular orden | `produccion.recetas` / `.ordenes` | `corregir` / `anular` | DTO |
| Sustituir cargos (cartera) | `cuentas-por-cobrar.documentos` | `corregir` | Cargos y aplicaciones antes |

**Datos personales en auditoría permanente (S-26):** se guarda el **id** del cliente y su identificador, sin dirección, teléfono ni correo.

**Quién la lee (S-06):** pantalla «Auditoría de Ventas», con `ventas-y-caja.auditoria.ver`, filtros por usuario, caja, acción y fechas. La consulta
**filtra siempre `empresa_id` de la sesión**, porque la política de `core.auditoria` solo limita por cuenta (§1.16), y se apoya en un índice nuevo (A-12). Quien
no tiene `cajas.ver-todas` solo ve lo de sus cajas, con la marca PARCIAL.

### 14.3 Errores nuevos (código propio, familias del core)

`forma_no_permitida`, `forma_inactiva`, `forma_con_ventas`, `forma_formal_sin_libro`, `dte_no_corresponde_al_regimen`, `motivo_de_control_obligatorio`, `autorizacion_externa_obligatoria`, `titulo_no_permitido`, `turno_no_abierto`,
`turno_ya_abierto`, `turno_con_arqueo_pendiente`, `solo_se_reabre_el_ultimo_turno`, `venta_repetida`, `venta_sin_precio`, `venta_con_abonos`, `venta_regularizada`, `venta_no_entregada`, `credito_sin_cliente`, `credito_no_disponible`,
`limite_de_credito_excedido`, `descuento_sin_permiso`, `pago_no_cuadra`, `regularizacion_no_cuadra`, `regularizacion_de_clientes_distintos`, `usuario_sin_bodega_de_la_caja`, `requiere_libro_de_compras`, `requiere_produccion`,
`producto_sin_concepto`, `cobro_de_caja`, `receta_circular`, `version_en_uso`, `orden_no_abierta`, `linea_sin_precio`, `combo_sin_reparto`, `cf_sobre_el_limite`,
`consolidacion_no_permitida`, `regularizacion_anterior_a_inscripcion`, `motivo_no_corresponde_a_la_entrega`, `mercaderia_sin_definir`, `clave_de_idempotencia_reutilizada`,
`autorizacion_requerida`, `autorizacion_invalida`, `autoanulacion_no_permitida`, `medio_de_devolucion_no_permitido`, `movimiento_sin_comprobante`, `movimiento_ya_confirmado`,
`dte_ya_usado`, `dte_ya_en_el_libro`, `regularizacion_de_cajas_distintas`, `requiere_cuentas_por_cobrar`, `anulacion_solo_desde_el_origen`, `descuento_sobre_el_maximo`.

### 14.4 Configuración (solo `instalacion` y `empresa`)

| Clave | Nivel | Por omisión | Para qué |
|---|---|---|---|
| `ventas-y-caja.descuentos.tope_sin_permiso` | empresa | `0` | Porcentaje que cualquiera puede descontar. Zod: 0–100 |
| `ventas-y-caja.descuentos.tope_maximo` | empresa | `100` | Máximo aun con permiso (S-09). Zod: 0–100, y una línea nunca llega a total 0 |
| `ventas-y-caja.movimientos.tope_de_gasto` | empresa | `0` (VJ-P13) | Sobre este monto, comprobante y segunda persona |
| `ventas-y-caja.mostrador.minutos_de_bloqueo` | empresa | `5` | Bloqueo por inactividad. Zod: 1–60 |
| `ventas-y-caja.inventario.sin_existencia` | empresa | Según VJ-P4 | `bloquear` o `descarga_pendiente` |
| `ventas-y-caja.credito.al_exceder_limite` | empresa | Según VJ-P7 | `avisar`, `pedir_permiso` o `bloquear` |
| `ventas-y-caja.cierre.arqueo_ciego` | empresa | `segun_usuarios` (VJ-P16) | `segun_usuarios`, `siempre` o `nunca` (§5.3) |
| `ventas-y-caja.cierre.tolerancia` | empresa | `0.00` | Diferencia sin motivo. Zod: máximo Q100 (S-23) |
| `ventas-y-caja.fel.tope_consumidor_final` | instalación | `2500` | §3.5 paso 5 (CV-3) |
| `ventas-y-caja.control.techo_pequeno_contribuyente` | instalación | `500285` | Acumulado anual (CV-20) |
| `ventas-y-caja.control.tope_de_venta_menor` | instalación | `50` | Motivo `consolidar_al_cierre`: ventas menores a este monto en pequeño contribuyente (Ley del IVA art. 49) |
| `ventas-y-caja.fel.horas_de_contingencia` | instalación | `null` | **No se programa fijo** (dictamen §2.4); se llena al confirmar la Documentación Técnica FEL. Con `null`, el sistema avisa y no calcula vencimiento |
| `cuentas-por-cobrar.prescripcion.anios_de_aviso` | empresa, instalación | `2` | §6.5 |
| `produccion.recetas.incluir_mano_de_obra` | empresa | `false` | Muestra los campos de mano de obra e indirectos |
| `produccion.variaciones.umbral_de_materialidad` | empresa, instalación | Lo fija el contador antes de REC-4 | §8.5 |

**Quién cambia las claves de empresa (S-23):** `configuracion.gestionar` es solo de superacceso y `EstablecerValor` no audita. Ventas sigue el precedente de
`GuardarAjustesDelAviso`: una ruta propia con `ventas-y-caja.controles.configurar`, que audita `configurar` con antes y después. Las claves de instalación siguen siendo de soporte.

## 15. Reportes y Excel

### 15.1 Reportes (sección Reportes: imprimir y exportar)

| Módulo | Reporte | Contenido |
|---|---|---|
| Ventas | **Ventas del período** | Por día, forma, clase, caja, vendedor; filtro **formal / control / todas** |
| Ventas | **Ventas de control** | Motivo, antigüedad, estado (pendiente, regularizada, FEL externa); no se puede apagar |
| Ventas | **Conciliación con el Libro de ventas** | §15.2 |
| Ventas | **Ventas por producto** | Cantidad, ingreso, costo y margen (con `costos.ver`) |
| Ventas | **Cierres de caja** | Por turno: esperado, contado, diferencia, por medio |
| Ventas | **Faltantes y sobrantes** | Por caja; por persona solo con `reportes.ver-faltantes-por-persona` (S-26) |
| Ventas | **Movimientos de caja** | Gastos, retiros, depósitos |
| Ventas | **Por descargar** y **Pedidos sin entregar** | Antigüedad |
| Ventas | **Descuentos y anulaciones** | Quién, cuánto y por qué, autoaprobadas y bajo el costo: es el control antifraude del mostrador |
| Ventas | **Efectivo en tránsito** | Depósitos y traslados sin confirmar, con antigüedad (S-02) |
| Ventas | **Recibos anulados y abonos fuera de antigüedad** | §6.3 (S-08) |
| Ventas | **Autorizaciones repetidas o sin verificar** | DTE usados dos veces o sin cruzar con la bandeja (S-14) |
| Cartera | **Antigüedad, saldos, estado de cuenta, cobros** | Los de CXC-7, con la columna «Clase» y el aviso de prescripción |
| Producción | **Costo de recetas** | Costo por porción y margen |
| Producción | **Real contra teórico** | Por orden, ingrediente y período; con las ventas al vender, contra el conteo físico |
| Producción | **Rendimiento y variaciones** | Producido contra planeado |

### 15.2 Conciliación mensual

Se cuadra **por mes de entrega y por mes del DTE** (CV-12), con la marca PARCIAL si no se ven todas las cajas (S-12):

```
Ventas registradas del mes (entregadas)
  = A. Formales aceptadas                        → en el libro
  + A2. Formales por certificar o rechazadas     → NO están en el libro: se listan
  + B. De control ya regularizadas               → en el libro, por su DTE
  + C. De control con FEL externa                → se cruza por autorización con el libro
  + D. De control pendientes                     → NO están en el libro: se listan
Informativo, fuera de la suma:
  E. Documentos del libro sin venta en Ventas    (facturas manuales o de la bandeja)
  F. Ventas anuladas del mes
  G. DTE con fecha de otro mes
  H. Pedidos sin entregar con anticipo, por antigüedad (S-13)
  I. Autorizaciones transcritas sin verificar (S-14)
  J. Períodos en que la empresa estuvo sin NIT (S-04)
```

Diferencias a la vista: montos que no coinciden, DTE externo que no aparece en el libro y regularizaciones con fecha de otro mes. **Con Libro de ventas apagado** solo se muestra el total y D, sin la palabra «diferencia».

### 15.3 Excel (según la sección del menú)

| Pantalla | Sección | Importar | Exportar |
|---|---|---|---|
| Productos | Administración | Sí: nombre, tipo, artículo por código, precio, categoría; todo o nada, ensayo, 5,000 filas | Sí |
| Medios de pago, Conceptos de caja, Cajas | Administración | Sí | Sí |
| Formas de venta | Administración | **No** (excepción, como Política de costeo en Inventarios): son pocas y llevan configuración fiscal y permisos propios | Sí |
| Recetas | Administración | Sí: una fila por ingrediente, agrupadas por receta; crea **borradores** | Sí |
| Mostrador, menú del día, turnos, arqueos, movimientos, regularizar, órdenes | Operación | No | No |
| Reportes | Reportes | No | Sí |

### 15.4 Pantallas (`cliente/src/modulos/ventas-y-caja/` y `produccion/`)

| Sección | Pantalla | Forma |
|---|---|---|
| Operación | **Mostrador** | §4.1, a pantalla completa en el celular; `usarMostrador`, lógica pura en `edicion-de-venta.ts` (totales, descuentos, vuelto, reparto del combo) con pruebas |
| Operación | **Caja** | Turno actual: abrir, totales, movimientos, arqueo, cerrar |
| Operación | **Ventas** | Lista con filtro formal / control → ficha con comprobante, pagos, entrega, anular y regularizar |
| Operación | **Recibir pago** | Cliente (búsqueda de §11.3) → qué debe → monto («a lo más viejo») → recibo(s) |
| Reportes | **Auditoría de Ventas** | §14.2 (S-06) |
| Operación | **Pedidos**, **Por descargar**, **Por certificar** | Bandejas; la última solo con formas `certificador` |
| Operación | **Menú del día** | Por fecha, copiar el de ayer |
| Administración | **Formas de venta** | Formulario en página: datos, «Factura electrónica (FEL)» con interruptor, crédito, cajas y usuarios, con la etiqueta Formal o Control y los avisos de §3.8 |
| Administración | **Productos**, **Cajas**, **Medios de pago**, **Conceptos de caja** | Catálogos con Excel |
| Reportes | §15.1 | Imprimir y exportar |
| Producción, Operación | **Órdenes de producción** | Abrir → consumo real → terminar, usable en el celular |
| Producción, Administración | **Recetas** | Lista → ficha con versiones, ingredientes, sustitutos y costo por porción |

`v-permiso` y `sesion` solo ocultan; el servidor valida. Toda opción que requiera otro módulo (crédito, FEL, depósito, receta) se oculta si no está activo.

### 15.5 API (todas con `proteger({ permiso })`; dinero como texto)

| Método y ruta | Permiso |
|---|---|
| `GET/POST /ventas-y-caja/formas`, `PUT …/:id`, `POST …/:id/inactivar` y `/reactivar`, `DELETE …/:id`, `GET …/exportar` | `formas.*` (`.configurar-control` si queda sin FEL y la empresa está inscrita, §3.9) |
| CRUD de `/productos`, `/medios-de-pago`, `/conceptos-de-caja`, `/cajas`, `/menus`, con Excel | Los de cada recurso; accesos con `cajas.asignar` |
| `GET /ventas-y-caja/mostrador/:cajaId` (formas, productos, menú, turno) | `ventas.crear` |
| `GET /ventas-y-caja/mostrador/:cajaId/clientes?q=` y `…/clientes/:id/saldo` (§11.3, con límite de solicitudes) | `ventas.crear` o `pagos.recibir` |
| `POST /ventas-y-caja/autorizaciones` (§4.8, con límite de intentos) | La sesión de quien pide; se valida el permiso de quien autoriza |
| `GET/PUT /ventas-y-caja/controles` | `controles.configurar` |
| `GET /ventas-y-caja/auditoria` | `auditoria.ver` |
| `POST /ventas-y-caja/movimientos/:id/confirmar` y `/rechazar` | `movimientos.confirmar`, o el responsable del turno destino |
| `POST /ventas-y-caja/dte/:autorizacion/verificar` | `dte.verificar` |
| `GET/POST /ventas-y-caja/ventas`, `GET …/:id`, `GET …/:id/comprobante`, `POST …/:id/entregar`, `POST …/:id/anular` | `ventas.*` |
| `POST /ventas-y-caja/ventas/descargar-pendientes` | `ventas.descargar-pendientes` |
| `POST /ventas-y-caja/pagos`, `POST …/:id/anular` | `pagos.*` |
| `GET/POST /ventas-y-caja/turnos`, `POST …/:id/cerrar`, `/reabrir`, `GET/POST …/:id/arqueos`, `POST /ventas-y-caja/arqueos/:id/anular` | `turnos.*`, `arqueos.*` |
| `GET/POST /ventas-y-caja/movimientos`, `POST …/:id/anular`, `POST …/:id/foto` | `movimientos.*`, **según el tipo** |
| `GET/POST /ventas-y-caja/regularizaciones`, `POST …/:id/anular` | `regularizaciones.*` |
| `GET /ventas-y-caja/reportes/<reporte>` y `…/exportar` | `reportes.*` (`.ver-control` para el detalle de control) |
| CRUD de `/produccion/recetas`, `POST …/:id/versiones`, `POST /produccion/versiones/:id/publicar`; `GET/POST /produccion/ordenes`, `POST …/:id/terminar`, `/anular`; `GET /produccion/reportes/<reporte>` | `recetas.*`, `ordenes.*`, `reportes.*` |

## 16. Integración futura con FEL

### 16.1 Puerto (Strategy + Adapter)

El módulo `facturacion-fel` (diseño aparte) registra un adaptador por certificador. Ventas conoce solo órdenes del mediador; **ningún nombre de certificador aparece en Ventas**:

| Orden | Responde |
|---|---|
| `facturacion-fel.emitir` | `{ estado, autorizacion?, serie?, numero?, fecha?, motivoDeRechazo? }` |
| `facturacion-fel.consultar` | El estado por `ventaId` (idempotencia) |
| `facturacion-fel.anular` | Transacción firmada (Res. SAT-DSI-1793-2026, art. 9) |

Credenciales cifradas con `CLAVE_SECRETOS`, XML conservado durante la prescripción (art. 24) y revisión de `seguridad`: son de ese módulo.

### 16.2 Nunca una llamada externa dentro de la transacción

Una llamada al certificador tarda segundos y puede fallar. Mantener abierta la transacción dejaría bloqueado el kardex. Por eso:

1. **Transacción 1**: la venta queda `por_certificar`, con inventario y caja.
2. **Fuera de la transacción**: se llama al adaptador con el `ventaId` como **clave idempotente**. Si se corta, se consulta antes de reintentar: nunca dos DTE.
3. **Transacción 2**: con la respuesta. Solo `aceptado` registra en el Libro y crea la cartera formal. `rechazado` queda en la bandeja «Por certificar», para corregir o anular. Hasta entonces **no se imprime nada que parezca factura**.

**Transcrito no prueba aceptación (CV-19):** se muestra **«Sin verificar con la SAT»** hasta cruzarlo con la bandeja de DTE emitidos (§9.11).

`certificado` **no es estado final**: el DTE solo vale si la SAT lo acepta (art. 7, M). La **contingencia** (`en_contingencia`) guarda la prueba de la falla (arts. 2 lit. g y 5); su plazo es configuración (§14.4).

## 17. Integración futura con Contabilidad

Contabilidad escucha los eventos de §13.3 con el mecanismo CT-0 (registro de eventos). Roles nuevos en su catálogo: `ingresos_por_ventas` (por concepto o tipo de producto), `costo_de_ventas` (tipo de inventario), `clientes` (ya previsto con la cartera),
`anticipos_de_clientes`, **`iva_pendiente_de_documentar`** (pasivo), **`ventas_por_certificar`** (transitoria), `caja_de_ventas` (por caja), `faltantes_de_caja`, `sobrantes_de_caja`, `variacion_de_produccion`, `consumo_sin_concepto`, `produccion_absorbida`.

**Una sola fuente por cada parte (CV-1).** `libro-de-ventas.documento_registrado` ya asienta Clientes o Caja contra Ventas + IVA débito (§10.3 de la cartera):

| Parte | Venta de control | Venta formal | Regularización |
|---|---|---|---|
| Ingreso | Ventas | **Libro** | No se mueve |
| IVA | Ventas (pendiente) | **Libro** (débito) | **Solo** IVA pendiente → IVA débito |
| Caja o Clientes | Ventas | **Libro** | No se mueve |
| Costo | Ventas | Ventas | No se mueve |

| Hecho | Debe | Haber |
|---|---|---|
| Control **entregada**, bienes, régimen con débito | Caja o Clientes | Ingresos por `gravado ÷ 1.12` + exento + **IVA pendiente** por `gravado ÷ 1.12 × 0.12` (solo sobre lo gravado, CV-5) |
| Control, **servicios**, régimen con débito (CV-16) | Caja o Clientes | Al contado, como bienes. **A crédito**, el IVA pendiente nace **al cobrar**; la cuenta que lo espera hasta entonces la define el contador (§22, P-4) antes de VCJ-12 |
| Control, sin débito (pequeño contribuyente, no inscrita) | Caja o Clientes | Ingresos por el total |
| Control, **régimen desconocido** (CV-16) | Caja o Clientes | Ingresos por el total, con **alerta** de revisión; se corrige al registrar el régimen |
| Formal aceptada | La hace `documento_registrado` | (no se duplica) |
| **Formal por certificar** (CV-16) | Caja | Ventas por certificar; al aceptarse, se cancela contra el asiento del Libro |
| Regularizar (evento con `origenDeRegularizacion`) | IVA pendiente | IVA débito |
| Costo, al entregar | Costo de ventas | Inventario |
| Pedido con anticipo | Caja | Anticipos de clientes |
| **Entregar con anticipo** (CV-16) | Anticipos de clientes | Clientes |
| Faltante / sobrante | Faltantes / Caja | Caja / Sobrantes |
| Orden terminada | Inventario (terminado) | Inventario (insumos) + Producción absorbida |

**Pruebas obligatorias:** una venta formal y una regularización producen **un solo** ingreso, un solo IVA y una sola entrada de caja o clientes. El importe de la venta y del IVA nunca sale de dos eventos.

## 18. Adendas a los diseños aprobados

| # | Diseño | Qué cambia | Contradice lo programado | Antes de |
|---|---|---|---|---|
| A-1 | Core | `usaTablasDe` (§2.3) | No: campo opcional | VCJ-0b |
| A-2 | `diseno-cuentas-por-cobrar-y-ventas.md` §0, §6, §8 | `dependeDe: ['terceros']`, `usaTablasDe: ['libro-de-ventas', 'bancos']`; tablas de §12 de este diseño; formas de cobro según módulos activos | No: **CXC-1 no se ha programado** | **CXC-1** |
| A-3 | Mismo, §10.1 | `sustituyeCargos` opcional en `DocumentoDeVentaParaDestino`; orden `libro-de-ventas.registrar_documento` | No: se suma a LV-2 sin cambiar nada | VCJ-9 |
| A-4 | `diseno-inventarios.md` §0, INV-A1 | `dependeDe: []`; §7.2. **Cambia una respuesta del usuario (INV-A1)**, que él mismo pidió al decir que un negocio informal debe funcionar sin libros | No: sin migración de datos | VCJ-0b |
| A-5 | Mismo, §3.6, §3.7, §9 | Clases, destino `consumo_interno`, causa `compra_sin_factura`, columnas de origen, proveedor libre y foto | No: solo agrega valores. **Coordinar** con INV-6 a INV-8, en curso (mismo `check`) | VCJ-0b, VCJ-3 y VCJ-5, cada uno lo suyo |
| A-6 | Mismo, §6.8 | `ReglaDeIva` de §7.5 | No: es INV-9, sin programar | **INV-9** |
| A-7 | Normativa FEL | Nota en `HOJA-DE-RUTA.md`: la Res. SAT-DSI-1793-2026 sustituyó al Acuerdo 13-2018. Los dos dictámenes históricos no se editan | No | `facturacion-fel` |
| A-8 | Mismo diseño de ventas, §7.4 | Al importar la bandeja: un DTE **transcrito desde Ventas** se liga al documento existente y pasa a `verificado`, en vez de dar `documento_repetido`. Si la autorización está en una **venta de control** (`fel_externa`), no crea documento y remite a `RegularizarVentas` (CV-2). Orden `buscar_autorizacion` | No | LV-4 |
| A-9 | Core y Bancos | Únicos `core.empresas (id, cuenta_id)`, `core.archivos (id, empresa_id)`, `bancos.movimientos (id, empresa_id)` (§1.17). Una migración por módulo | No: solo agrega | VCJ-1 |
| A-10 | `empresas` | Auditar todo cambio de NIT; permiso `empresas.nit.corregir` y motivo para quitarlo o reemplazarlo (§3.9) | **Sí, en conducta**: hoy lo hace `empresas.editar` sin rastro | VCJ-1 |
| A-11 | Core, privilegios | Clasificar las tablas de `ventas_y_caja` en `RESTRICCIONES_DE_PRIVILEGIOS` y extender su prueba y su TSDoc (§9.0). El migrador no cambia | No | VCJ-2 |
| A-12 | Core, auditoría | Índice `(empresa_id, recurso, creado_en)` en `core.auditoria` (§14.2) | No | VCJ-7 |
| A-13 | Core, identidad | Puerto para verificar la contraseña de otro usuario **sin abrir sesión**, con límite de intentos (§4.8) | No | VCJ-4 |
| A-14 | Inventarios, Libro, Cartera | Un documento con origen en otro módulo solo se anula por la orden de ese origen, aunque el módulo esté apagado (§12, S-21) | No | VCJ-3 y VCJ-8 |
| A-15 | `diseno-inventarios.md`, motor de costeo | `devolucion_de_venta` sigue el costo recalculado de su salida (§7.1, CV-7) | No: clase nueva | VCJ-3 |

## 19. Convivencia y riesgos

| # | Riesgo | Qué se hace |
|---|---|---|
| R-1 | Mover ventas a control para no facturar | No se impide; se deja **a la vista**: motivo, reporte, conciliación, permisos propios, auditoría permanente, IVA pendiente en Contabilidad. El sistema no ofrece ninguna forma de ocultarlas |
| R-2 | Un comprobante que parezca factura (CT art. 85) | Leyenda y prohibiciones fijas en código; título validado; sin NIT ni IVA |
| R-3 | Doble deuda al regularizar | Traslado en una transacción, prueba de saldo igual a cualquier corte |
| R-4 | Doble DTE por reintento | Clave idempotente y consulta antes de reintentar |
| R-5 | Doble venta por mala señal | `clave_de_idempotencia` |
| R-6 | Doble partida de lo formal | §17 y su prueba |
| R-7 | Bloqueos en hora pico | Candados por artículo (ya existen), en orden de id; **la transacción de venta no llama a servicios externos**. Prueba de carga: 20 ventas simultáneas del mismo artículo |
| R-8 | Recálculo pesado por descargas con fecha anterior | Se procesan por artículo, en tandas, con aviso de cuántas salidas recalculará |
| R-9 | Volumen | Una caseta con 150 ventas al día = 55,000 ventas y unas 165,000 líneas al año por empresa. Índices por `(empresa_id, fecha)`; reportes por rango; turno con foto de totales |
| R-10 | Cajero sin acceso a la bodega | Aviso al asignar y error claro al vender (§9.1) |
| R-11 | Costos a la vista del cajero | Permiso propio; el DTO no los trae |
| R-12 | Función o módulo apagado con datos | Las tablas y los saldos quedan siempre. La **cartera** no se apaga con saldos (`cartera_con_saldos`); apagar el **crédito** no afecta lo ya prestado. Si soporte desactiva el **módulo** completo, `validarDesactivacion` no lo impide: los saldos se conservan y vuelven al reactivarlo, y lo que dependa de él falla cerrado (S-21). Detalle en §24.3 |
| R-13 | Teórico que nunca se compara con lo real (al vender) | Reporte de real contra teórico con los conteos; aviso si pasan N días sin conteo de los ingredientes |
| R-14 | Reimpresión usada para engañar | Dice «Reimpresión» y queda en auditoría |
| R-15 | Recursos de auditoría permanente | Declarados en las migraciones de cada módulo |
| R-16 | Cajero anula, se queda el dinero y la existencia sube (S-01) | Segunda persona, «¿volvió la mercadería?» y reporte de autoaprobadas |
| R-17 | Faltante tapado con gasto o depósito inventado (S-02) | Permiso por tipo, tope, comprobante, efectivo en tránsito |
| R-18 | Una consulta vacía por RLS se lee como «todas las cajas» (S-05) | Alcance explícito en la forma; prueba con dos cajeros |
| R-19 | La pantalla de auditoría muestra otra empresa de la cuenta (§1.16) | Filtro obligatorio por `empresa_id`, con prueba de dos empresas en una cuenta |
| R-20 | Doble ingreso, IVA o deuda (CV-1, CV-2) | Una fuente por parte (§17), `dte_de_ventas`, pruebas obligatorias |
| R-21 | La autorización con contraseña es lenta en hora pico | Solo aparece en excepciones. Si estorba en la práctica, se evalúa un PIN con diseño de `seguridad` (§23) |

## 20. Pasos (un commit cada uno; servidor y cliente por separado, con pruebas)

_**La tabla vigente de VCJ-\* y CXC-\* está en §24.5.** Esta se conserva por trazabilidad; de ella siguen vigentes los pasos `REC-*` (REC-5 depende de VCJ-4i)._

**Se puede empezar sin esperar a Cuentas por cobrar:** VCJ-0a a VCJ-7 y todo REC. Solo el crédito (VCJ-8) y lo que viene después esperan a CXC-3b.

**Tras la validación:** VCJ-0a, VCJ-0b y VCJ-0c no cambian y no esperan ninguna respuesta de fondo. Lo demás se programa **ya con las correcciones de este documento**, una vez respondida §21.

| Paso | Qué | Quién | Depende de | Espera del usuario |
|---|---|---|---|---|
| **VCJ-0a** | Core: `usaTablasDe` en la definición, migrador, verificación y prueba de llaves; pruebas de orden y de activación | backend | — | — |
| **VCJ-0b** | Inventarios sin `dependeDe`: rutas de recepción con `requiere_libro_de_compras`, destino `consumo_interno` y su migración, prueba de punta a punta con el libro apagado | backend | VCJ-0a, INV-8 unido | VJ-P3 no bloquea |
| VCJ-0c | Cliente de Inventarios con el libro apagado (ocultar bandeja y concepto, destino nuevo) | frontend | VCJ-0b, INV-5c | — |
| **VCJ-0d** | Adendas A-9 (únicos) y A-10 (NIT auditado, permiso y motivo); `inscrita` de §3.9 | backend | VCJ-0a | VJ-P3, VJ-P14 |
| **VCJ-1** | Esqueleto, `0001`, configuración, formas de venta (solo control) con **alcance explícito, llave de clase, títulos de lista cerrada y validación de prefijo y nombre**, medios, conceptos, productos con combos y Excel; precios auditados; controles con permiso y auditoría; pruebas de checks | backend | VCJ-0b, VCJ-0d | VJ-P10 |
| VCJ-1c | Formas, Productos, Medios, Conceptos | frontend | VCJ-1 | — |
| **VCJ-2** | Cajas con alcance, accesos, turnos, abrir y cerrar, responsable con aceptación; privilegios (A-11); llaves `(turno, caja, empresa)`; pruebas de RLS con dos cajeros y de un solo turno abierto | backend | VCJ-1 | VJ-P8 |
| VCJ-2c | Cajas, abrir turno | frontend | VCJ-2 | — |
| **VCJ-3** | Inventarios: clases de venta, columnas de origen, órdenes de salida, devolución y anulación, idempotencia, **costo de la devolución (A-15)** y **anular solo desde el origen (A-14)**; prueba de que el motor no las toma como devolución a proveedor y prueba venta → compra anterior → devolución | backend | VCJ-0b | — |
| **VCJ-3b** | Core: verificar credencial sin abrir sesión (A-13); `autorizaciones_de_caja` y su caso de uso (§4.8) | backend | VCJ-2 | VJ-P12 |
| **VCJ-4** | `RegistrarVenta` de contado de control: idempotencia con hash, correlativo, precios del servidor, checks por línea, combo, motivo, foto, fechas del servidor; `AnularVenta` con segunda persona y «¿volvió?»; pruebas de concurrencia | backend | VCJ-2, VCJ-3, VCJ-3b | VJ-P1, VJ-P3, VJ-P4, VJ-P12 |
| VCJ-4c | **Mostrador** en celular, comprobante, compartir, autorización de encargado, bloqueo y cambio de usuario | frontend | VCJ-4 | — |
| **VCJ-5** | Movimientos con permiso por tipo, tope, comprobante y **efectivo en tránsito**; arqueos con ciego en la API; cierre, reabrir; compra sin factura (causa, proveedor libre, foto; revisión de `seguridad` del archivo) | backend | VCJ-4 | VJ-P13, VJ-P16 |
| VCJ-5c | Caja: movimientos, arqueo, cierre | frontend | VCJ-5 | — |
| **VCJ-6** | Menú del día; bandeja «Por descargar» **con sus tres salidas** y la pregunta al cierre de Inventarios | backend + frontend | VCJ-4, INV-8 | VJ-P4 |
| **VCJ-7** | Reportes de ventas, caja y ventas de control, con marca PARCIAL y total excluido; **Auditoría de Ventas** con índice (A-12) y filtro por empresa | backend + frontend | VCJ-5 | VJ-P15 |
| **CXC-A** | Adenda A-2 **dentro** de CXC-1 a CXC-3 (dependencias, origen `venta_de_control`, forma `caja`, recibo de pago, `sustituido`); se llama **CXC-3b** lo que completa cobro en caja y recibo | backend | CXC-1 a CXC-3 | — |
| **VCJ-8** | Crédito y mixto, abonos en caja, recibos de pago **y su anulación por grupo**, pedidos con anticipo y entrega con cambio de motivo; búsqueda de clientes de Mostrador | backend + frontend | CXC-3b, VCJ-5 | VJ-P7, VJ-P17 |
| **VCJ-9** | Forma formal `transcrito`, `dte_de_ventas`, tope de CF, `registrar_documento`, regularización con sus reglas de agrupación y traslado de deuda; conciliación completa | backend + frontend | VCJ-8, LV-3, LV-4, CXC-4 | VJ-P2, VJ-P11 |
| **VCJ-10** | Depósito de turno con Bancos | backend + frontend | VCJ-5, VC-0b | — |
| **VCJ-11** | Avisos de prescripción y estado de cuenta con clase | backend + frontend | VCJ-8, CXC-7 | — |
| VCJ-12 | Eventos y reglas de Contabilidad, una fuente por parte (§17); servicios por definir con el contador | backend | VCJ-9, CT-3 | Contador (§22) |
| VCJ-13 | Trabajadores (autorización como documento protegido, marca) | backend + frontend | VCJ-8 | VJ-P6 |
| VCJ-14 | Devolución parcial | backend + frontend | VCJ-9 | — |
| VCJ-15 | Reconocimiento de deuda imprimible; intereses (si VJ-P5 = a) | backend + frontend | VCJ-8 | VJ-P5 |
| VCJ-16 | (Después) Destino `ventas-y-caja` en Libro de compras para gastos de caja con factura | backend + frontend | VCJ-5 | — |
| VCJ-17 | (Después) Forma con `certificador` y bandeja «Por certificar», cuando exista `facturacion-fel` | backend + frontend | Módulo FEL | VC-P4 (certificador) |
| VCJ-QA | Punta a punta: negocio sin NIT → venta de control → fiado → abono con recibo; empresa inscrita con las dos formas en la misma caja → regularizar con abono → conciliación | pruebas-qa | VCJ-9 | — |
| **REC-1** | Esqueleto de `produccion`, recetas, versiones, ingredientes (cantidad neta), sustitutos, costo teórico con `÷ (1 − merma)`; Excel | backend | VCJ-0b | VJ-P9 |
| REC-1c | Recetas y costo por porción | frontend | REC-1 | — |
| **REC-2** | Inventarios: clases `salida_a_produccion` y `entrada_de_produccion`, sus órdenes | backend | VCJ-3 | — |
| **REC-3** | Órdenes de producción: consumo, entrada, real contra teórico, anular | backend | REC-1, REC-2 | — |
| REC-3c | Órdenes en el celular | frontend | REC-3 | — |
| **REC-4** | Variaciones por `costo_recalculado`, con umbral de materialidad | backend | REC-3 | Umbral del contador (§22) |
| **REC-5** | Venta con receta: `consumo_para_venta`, sustitutos, anular | backend | REC-1, VCJ-4 | VJ-P9 |
| **REC-6** | Reportes: costo, real contra teórico, rendimiento | backend + frontend | REC-4, REC-5 | — |
| REC-QA | Lote de 50 desayunos → ventas → sobrantes → conteo → real contra teórico; plato al vender con sustituto | pruebas-qa | REC-6 | — |

**En paralelo:** VCJ-0a no choca con nada. REC-1 y VCJ-1 van a la par después de VCJ-0b. **Dos migraciones del mismo módulo no van en paralelo**: VCJ-3 y REC-2 tocan el mismo `check` de `inventarios.documentos`, en fila y detrás de INV-8.

## 21. Preguntas para el usuario

**La primera opción de cada pregunta es la recomendada.**

| # | Pregunta | Opciones (la primera es la recomendada) | Por qué se recomienda |
|---|---|---|---|
| **VJ-P1** | En una empresa **con NIT**, ¿cada venta de control debe decir por qué no lleva factura? | a) Sí, obligatorio (un toque); b) opcional | Es lo que hace defendible la venta de control ante la SAT. Un negocio no inscrito nunca lo ve |
| **VJ-P2** | Todavía no existe la emisión FEL desde Arrancar. ¿Qué hacen las formas formales mientras tanto? | a) **Transcribir**: emite el DTE en su certificador, escribe aquí la autorización, entra al Libro y queda «sin verificar» hasta cruzarlo con la bandeja; b) esperar al módulo FEL y usar solo control; c) programar primero el módulo FEL | Da ventas formales ya, y el adaptador se suma después sin cambiar tablas |
| **VJ-P3** | ¿Cómo sabe Arrancar que un negocio **no** está inscrito? | a) Se deduce: no tiene un NIT válido (distinto de CF) **ni** historial fiscal; b) una casilla nueva «No inscrito en la SAT» | No agrega un modo de empresa, y quitar el NIT ya no apaga las salvaguardas |
| **VJ-P4** | Si se vende **sin existencia registrada** | a) Se vende y queda «por descargar»; para cerrar el mes hay que registrar la compra real, ajustar con soporte o anular; b) bloquear la venta | El mostrador no se detiene y el inventario sigue sin negativos |
| **VJ-P5** | ¿Se cobra **interés** en el crédito informal? | a) Simple, pactado por cliente, apagado por omisión, nunca compuesto y nunca a trabajadores; b) sin interés | Lo recomienda el contador. Si nadie lo va a usar pronto, b ahorra un paso |
| **VJ-P6** | ¿**Descuento a trabajadores** en v1? | a) Solo registrar su autorización y sus pagos; b) esperar a Planilla para todo | Arrancar no descuenta del salario hasta que exista Planilla, y quien gana el mínimo no puede tener descuento |
| **VJ-P7** | Cuando un cliente **pasa su límite de crédito** en caja | a) Autoriza un encargado con su credencial; b) solo avisar; c) bloquear | Un límite que no frena no sirve, y bloquear del todo molesta con el cliente de siempre. Configurable por empresa |
| **VJ-P8** | ¿Cómo se reparte la responsabilidad del **turno**? | a) Un responsable por turno y varios pueden vender en él; b) un turno por persona en la misma caja | Es como trabaja una caseta o tienda. La b exige contar el dinero en cada cambio de persona. Ser responsable **no autoriza descontarle** un faltante |
| **VJ-P9** | ¿Qué **producción** entra en v1? | a) Por lote y al vender; b) solo por lote; c) solo al vender | Comparten recetas y solo cambia cuándo se descarga |
| **VJ-P10** | En una empresa **con NIT**, ¿quién puede crear formas **sin FEL**? | a) Solo quien tenga un permiso propio; b) cualquier administrador | Separa quién configura de quién vende |
| **VJ-P11** | ¿Se pueden pasar a FEL ventas hechas **antes de inscribirse**? | a) No desde el flujo normal: se remite al contador; b) sí, con aviso | Un DTE de hoy no documenta bien una operación anterior a la inscripción; el contador lo define caso por caso |
| **VJ-P12** | ¿Quién puede **anular** una venta o un recibo? | a) En efectivo, siempre otra persona si existe otro usuario con el permiso; en negocio de una persona se permite y queda marcado; b) otra persona solo sobre un monto; c) quien tenga el permiso, aunque sea su propia venta | Anular la venta propia es la forma más simple de quedarse con el efectivo sin que la caja descuadre |
| **VJ-P13** | ¿Qué tope sin aprobación tienen **gastos y retiros**? | a) Retiros: Q0, siempre con segunda persona; gastos: el tope que fije cada empresa, Q0 hasta que lo configure; b) un mismo tope para ambos; c) sin tope | Un retiro no tiene comprobante externo; el gasto sí puede tenerlo, y cada negocio maneja montos distintos |
| **VJ-P14** | ¿Se puede **quitar o cambiar el NIT** con ventas ya hechas? | a) Sí, con permiso propio y motivo, auditado, y las salvaguardas siguen; b) bloquearlo | Permite corregir errores de captura sin abrir una forma de apagar los controles |
| **VJ-P15** | ¿El **dueño de la cuenta** puede ver la auditoría de Ventas? | a) Sí, con permiso propio; b) solo soporte | Sin esto, reimpresiones, anulaciones y cambios de acceso quedan registrados pero nadie del negocio los ve |
| **VJ-P16** | ¿**Arqueo ciego** por omisión? | a) Encendido cuando varias personas usan la caja; b) apagado, que cada empresa lo encienda | Es el control más barato contra faltantes, y en un negocio de una persona no estorba |
| **VJ-P17** | ¿Qué se hace con los **datos personales** de clientes de mostrador? | a) Guardar lo mínimo, conservar solo lo que exige la ley y publicar un aviso de privacidad revisado por un abogado; b) guardar lo mínimo, sin aviso por ahora | No hay una ley general vigente clara, pero sí jurisprudencia de hábeas data y una iniciativa en trámite: conviene la opinión de un abogado |

## 22. Validaciones

**Contador: «correcto con ajustes». Seguridad: «aprobado con cambios obligatorios».** Ambas revisaron el commit `3e2f0971`. Sus 20 correcciones y 27 hallazgos
quedan incorporados así. Ninguna revisión ejecutó el módulo, porque aún no existe: **cada corrección se comprueba con su prueba al programarse**.

| Corrección del contador | Dónde | Corrección del contador | Dónde |
|---|---|---|---|
| CV-1 Una fuente por parte | §3.7, §17 | CV-11 Inscrita y `ReglaDeIva` | §3.9, §7.5 |
| CV-2 `fel_externa` | §3.7, §9.11, A-8 | CV-12 Conciliación | §15.2 |
| CV-3 Consolidar y CF | §3.5, §3.7, §3.8 | CV-13 Prescripción | §6.4, §6.5 |
| CV-4 Pedido entregado | §4.5, §9.8 | CV-14 Costo viejo | §9.8, §9.9 |
| CV-5 Clase fiscal siempre | §3.6, §9.9, §17 | CV-15 Combo | §4.3, §9.9 |
| CV-6 Descarga imposible | §7.4 | CV-16 Partidas | §13.3, §17 |
| CV-7 Costo de la devolución | §7.1, A-15 | CV-17 Anticipos | §4.5, §4.6, §6.3 |
| CV-8 ¿Volvió la mercadería? | §11.2 | CV-18 Prefijo y nombre | §4.6, §6.3 |
| CV-9 Merma | §8.2, §8.6 | CV-19 Transcrito, entrega, crédito formal | §3.5, §11.1, §16.2 |
| CV-10 Total por línea | §4.3, §9.9 | CV-20 Techo, permiso, filtro, VJ-P8 | §3.8, §14.1, §14.4, §21 |

| Hallazgo | Dónde | Hallazgo | Dónde | Hallazgo | Dónde |
|---|---|---|---|---|---|
| S-01 | §4.8, §11.2 | S-10 | §11.2 | S-19 | §5.1, §9.5 |
| S-02 | §5.5, §5.6, §9.7 | S-11 | §4.8, §9.0, A-13 | S-20 | §4.7, §9.8 |
| S-03 | §3.4, §9.0, A-11 | S-12 | §3.8, §14.1, §15.2 | S-21 | §11.2, §12, A-14 |
| S-04 | §3.9, §14.2, A-10 | S-13 | §4.5, §15.2 | S-22 | §4.6 |
| S-05 | §3.3, §9.3 | S-14 | §9.11, §14.1, §15.1 | S-23 | §14.1, §14.4 |
| S-06 | §14.2, §15.4, A-12 | S-15 | §9, §9.0, §9.6 | S-24 | §4.7, §7.3, §7.4 |
| S-07 | §3.4, §9.12, §14.2 | S-16 | §12 | S-25 | §9.0, A-9 |
| S-08 | §6.3, §11.3 | S-17 | §11.3, §15.5 | S-26 | §4.6, §14.1, §14.2, §15.1 |
| S-09 | §4.3, §9.4, §9.9 | S-18 | §5.3 | S-27 | §3.8, §9.6, §9.9 |

**Dos ajustes del arquitecto a lo que propuso seguridad:**

- **S-03:** no se agrega el disparador de columnas, porque el privilegio por columna ya lo impide en la base y un segundo mecanismo se desincronizaría.
- **S-25:** las columnas de usuario **no** llevan llave a `core.empresa_usuarios` (§1.18); se validan al escribir.

**Sigue pendiente con `contador-guatemala`:**

| # | Punto | Antes de |
|---|---|---|
| P-1 | Texto oficial de la Res. SAT-DSI-1793-2026: **plazo de contingencia**. No se programa ningún plazo fijo | VCJ-17 |
| P-2 | CT arts. 85, 86 y 94 tras el Decreto 31-2024, C. Penal art. 358 B, C. de Trabajo arts. 62, 96 y 99, Ley del IVA arts. 2 y 34. **Ningún monto de multa se muestra en pantalla** | VCJ-1c (textos) |
| P-3 | Valor por omisión del umbral de materialidad de producción (§8.5) | REC-4 |
| P-4 | Partida de una venta de control de **servicios** a crédito: cómo nace el IVA pendiente al cobrar (§17) | VCJ-12 |
| P-5 | Confirmar el techo de Q500,285 y los topes de Q50 y Q2,500 contra texto oficial: el contador los citó de copias o de firmas que los mencionan | VCJ-4 |

## 23. Pendientes que este diseño deja anotados

- Módulo `facturacion-fel` (diseño aparte): adaptadores, credenciales, XML, contingencia y la Res. SAT-DSI-1793-2026.
- Mesas, comandas y pantalla de cocina; listas de precios por cliente; promociones automáticas.
- Destino `ventas-y-caja` en Libro de compras (VCJ-16).
- Descuento en Planilla, y el trato de la **comida gratis a trabajadores** (dictamen §5, abierto: prestación o transferencia gratuita).
- Tarjeta (POS) en caja con su retención: se une a CXC-5t cuando alguien la use (VC-P27).
- Multimoneda en mostrador (hoy solo quetzales).
- PIN de encargado en vez de contraseña, si la autorización estorba en la práctica (R-21), con diseño de `seguridad`.
- Política de retención de datos de clientes y aviso de privacidad, según VJ-P17 y la opinión de un abogado.
- `docs/PLAN.md` §6 y `docs/HOJA-DE-RUTA.md`: anotar este diseño y sus adendas cuando el usuario lo apruebe.

## Respuestas del usuario (2026-11-23)

Regla del módulo, dicha por el usuario: «formas de ventas: si la forma tiene configuración FEL, es formal la venta; si no, es solo
para control y es informal; puedo tener ambas a la vez». No hay módulo Caseta.

El usuario aceptó la **opción recomendada (a) de VJ-P1 a VJ-P17**:

- **VJ-P2:** transcribir la autorización del DTE hasta que exista la emisión FEL.
- **Mostrador:** VJ-P4, VJ-P7, VJ-P8, VJ-P9 y VJ-P16.
- **Controles:** VJ-P10, VJ-P12, VJ-P13, VJ-P14 y VJ-P15.
- **Fiscal y crédito:** VJ-P1, VJ-P3, VJ-P5, VJ-P6, VJ-P11 y VJ-P17.

Antes de VCJ-4 sigue pendiente confirmar contra texto oficial las citas de IVA (Q50, Q2,500) y el techo de Q500,285. No se programa
ningún plazo de contingencia ni monto de multa mientras no se lea la Res. SAT-DSI-1793-2026. El aviso de privacidad lo revisa un
abogado antes de publicarse.

## 24. Adenda: módulo único «Ventas y cobros» (2026-11-23)

_Decisión del usuario, que no se reabre: Ventas/Caja y Cuentas por cobrar son **un solo módulo**, con formas de venta, caja, crédito, cartera y
recibos. **Inventarios es opcional** para él: una empresa de servicios que solo factura y cobra no debe necesitarlo. Caja y crédito se usan según
configuración y permisos. Libro de ventas sigue aparte por ser fiscal, y Producción sigue aparte y depende de Inventarios._

**Esta sección manda sobre el resto del documento** y sobre `diseno-cuentas-por-cobrar-y-ventas.md` donde se contradigan. Verificado contra `main`
(`48b8dad9`), `integracion` (`9c8c4440`), la rama de VCJ-0d (`worktree-wf_05a0b7b8-de7-3`) y las ramas de la tanda 9.

### 24.1 Clave, esquema y dependencias

**Dónde está escrita hoy la clave `cuentas-por-cobrar`:**

| Lugar | Estado | Tipo de dato |
|---|---|---|
| `libro_de_ventas.documentos_destino_valido` (migración `0002_lv2`, y su snapshot) | Ramas `-77` y `-111` | **`check` en una migración** |
| `DestinoDeDocumentoDeVenta`, `DESTINOS_DE_DOCUMENTO`, orden `cuentas-por-cobrar.recibir_documento`, doble de pruebas | Ramas `-77` y `-111` | Contrato entre módulos |
| `MODULO_CUENTAS_POR_COBRAR`, conceptos reservados, nota marcada | Ramas `-6` y `-61` (VC-0b) | Quedará en `bancos.movimientos.modulo_de_origen` |
| `origen-y-causa.ts` (nombre visible) y un comentario de `terceros.contratos.ts` | `main` | Texto |

La clave `ventas-y-caja` **no aparece en ningún código** (solo en documentos). `cuentas_por_cobrar` en Contabilidad (`rubros`, `roles-de-enlace`) es un
**rubro del catálogo de cuentas**, no la clave del módulo: no se relaciona con esta decisión.

| Opción | Migraciones ya escritas | A favor | En contra |
|---|---|---|---|
| **A. Conservar `cuentas-por-cobrar`**, con nombre visible «Ventas y cobros» | **Ninguna cambia** | Cero datos que convertir; contratos y checks siguen válidos | La clave técnica dice menos de lo que hace el módulo (solo se ve en permisos y URL) |
| B. Clave nueva `ventas-y-cobros` antes de unir la tanda 9 | Reescribir `0002_lv2` y su snapshot en dos ramas ya revisadas | Nombre exacto | Rehacer y volver a probar LV-2 y VC-0b |
| C. Clave nueva y migración que cambie el `check` | Una más en Libro de ventas | Sin reescribir | Dos valores válidos a la vez o conversión de datos, por un nombre interno |
| D. Clave nueva con alias de la vieja | Ninguna | Nombre exacto | Un mecanismo de alias en el core, el mediador y Bancos para siempre |

**Decisión: A.** Queda así:

| Dato | Valor |
|---|---|
| `clave` | **`cuentas-por-cobrar`** |
| `nombre` (lo que ve el usuario) | **«Ventas y cobros»** |
| Esquema | **`cuentas_por_cobrar`**: aquí viven también las tablas de §9. **No se crea `ventas_y_caja`** |
| Carpetas | `servidor/src/modulos/cuentas-por-cobrar/`, `cliente/src/modulos/cuentas-por-cobrar/` |
| `dependeDe` | **`['terceros']`** |
| `usaTablasDe` | **`['inventarios', 'libro-de-ventas', 'libro-de-compras', 'bancos']`** |
| Generador | `npm run generar -- modulo cuentas-por-cobrar --nombre "Ventas y cobros" --icono ShoppingCart` |

| Módulo | `dependeDe` | `usaTablasDe` |
|---|---|---|
| `inventarios` | `[]` (con VCJ-0b) | `['libro-de-compras']` |
| **`cuentas-por-cobrar`** | **`['terceros']`** | **`['inventarios', 'libro-de-ventas', 'libro-de-compras', 'bancos']`** |
| `produccion` | `['inventarios']` | — |
| `libro-de-ventas` | `['libro-de-compras']` (sin cambio) | — |

- **Sin ciclos.** Libro de ventas no tiene llave hacia la cartera (`retenciones_recibidas.cobro_id` va sin llave, §5.7 de ese diseño), Inventarios guarda el
  origen sin llave y `produccion.consumos_por_venta.venta_id` también. Orden del migrador: `terceros` → `libro-de-compras` → `inventarios`, `libro-de-ventas`;
  `bancos` → `cuentas-por-cobrar`; `inventarios` → `produccion`.
- **`libro-de-compras` se declara** aunque ya llegue de forma transitiva, porque el módulo lee directamente `datos_fiscales_de_empresa` (§3.9).
- **Una empresa con FEL sigue necesitando `libro-de-ventas`** (§3.5). Sin él, el módulo funciona solo con formas de control.

**Cómo leer el resto del documento:**

| Donde dice | Se lee |
|---|---|
| Módulo, permiso, evento, correlativo, configuración o recurso de auditoría `ventas-y-caja.<x>` | `cuentas-por-cobrar.<x>` |
| Esquema `ventas_y_caja.<tabla>` | `cuentas_por_cobrar.<tabla>` (ningún nombre de tabla choca: revisadas las de §6 de cartera y §9) |
| Rutas `/ventas-y-caja/…` | `/cuentas-por-cobrar/…` |
| `ventas-y-caja.reportes.*` y `cuentas-por-cobrar.reportes.*` | **Es el único choque de claves.** Pasan a `cuentas-por-cobrar.reportes-de-ventas.*` y `cuentas-por-cobrar.reportes-de-cartera.*` |
| «Cuentas por cobrar» como módulo | «Ventas y cobros». Como función sigue siendo **la cartera** |

### 24.2 Con Inventarios apagado

**Hay dos niveles, y el segundo era un vacío del diseño.** Los módulos se activan **por cuenta** (`core.cuenta_modulos`), pero una cuenta puede tener una empresa con
bodegas y otra de servicios. Por eso «esta empresa controla existencias» no se puede deducir de que el módulo esté activo, y **tampoco de si se ven bodegas**:
`inventarios.bodegas` tiene RLS por alcance, así que un cajero sin bodegas asignadas vería cero filas y la regla fallaría abierta (el mismo error de S-05). Se guarda
explícito:

```
controla_existencias = (módulo inventarios activo en la cuenta)
                       y (cuentas-por-cobrar.funciones.control_de_existencias de la empresa)
```

**Catálogo.** `servicio` no basta para quien vende un bien sin llevar inventario: bien y servicio tienen **distinto nacimiento del IVA** (al entregar o al percibir, §4.5 y
CV-16). Se agrega un tipo:

| `productos.tipo` | `articulo_id` | `descarga` | Con `controla_existencias` | Sin `controla_existencias` |
|---|---|---|---|---|
| `articulo` | Obligatorio | `existencia` | Se vende y descarga | **No se ofrece**; `requiere_inventarios` |
| `platillo` | Obligatorio | `existencia` o `receta` | Se vende y descarga | **No se ofrece**; `requiere_inventarios` |
| `servicio` | Nulo | `ninguna` | Se vende | Se vende |
| **`bien_sin_existencia`** (nuevo) | Nulo | `ninguna` | **No se vende** (`producto_por_vincular`; VU-P3) | Se vende, sin costo ni kardex |
| `combo` | Nulo | `ninguna` | Por sus componentes | Solo si todos sus componentes se pueden vender |

**Cambios de tablas** (entran en VYC-E1, antes de que exista ninguna fila):

| Tabla | Cambio |
|---|---|
| `productos.tipo` | Suma `bien_sin_existencia`. Check: `articulo_id` no nulo ⇔ `tipo in ('articulo', 'platillo')`; `descarga = 'ninguna'` en `servicio`, `combo` y `bien_sin_existencia` |
| `productos.articulo_id` | Sigue con su FK compuesta a `inventarios.articulos`: la tabla existe en toda instalación (PLAN §3.2) y queda nula |
| `cajas.bodega_id` | Pasa a **nula**. Es obligatoria en dominio solo para vender algo con `descarga <> 'ninguna'`: sin bodega, `caja_sin_bodega` |
| `lineas_de_venta` | Sin columna nueva: `tipo` y `descarga` copiados distinguen bien de servicio, y `estado_de_descarga = 'no_aplica'` |

**Lectura.** Con Inventarios apagado **no se envía ninguna orden** (`existencias_para_vender` lanzaría `ModuloNoDisponible`): el caso de uso consulta antes `controla_existencias`.
Las lecturas de `articulos` para mostrar un nombre son seguras. El costo queda nulo y el margen dice «sin costo registrado».

**Qué se oculta sin `controla_existencias`:** existencias y bodega en Mostrador, «Por descargar», selector de artículo, compra de inventario desde caja (§5.5), recetas, costo y
margen por producto. **Sigue visible** el reporte «Ventas de bienes sin descarga», que no se puede apagar.

**Apagar y encender:**

| Situación | Qué pasa |
|---|---|
| Apagar el interruptor de la empresa con líneas `pendiente` o pedidos sin entregar que descargan | Se rechaza (`existencias_con_pendientes`) hasta resolverlos |
| Soporte desactiva el **módulo** Inventarios (no se le puede impedir: `validarDesactivacion` solo mira `dependeDe`) | Las líneas pendientes quedan así y `EntregarVenta` falla cerrado (`requiere_inventarios`): **nunca se marca entregado sin descargar** |
| Seguir vendiendo lo que antes llevaba existencia | Acción explícita **«Vender sin control de existencia»**: pasa los productos elegidos a `bien_sin_existencia`, con `productos.editar` y auditoría `corregir` |
| Encender Inventarios después | Acción **«Vincular a un artículo»** (`bien_sin_existencia` → `articulo`). **Las ventas pasadas no se descargan**: la existencia inicial entra por saldo inicial o conteo |

Son las **únicas** transiciones de `tipo` en un producto con ventas; cada línea ya guardó su copia, así que el pasado no cambia.

**Regla de que nada se descuenta dos veces, con Inventarios activo:**

1. **Una sola puerta.** Solo `RegistrarVenta` y `EntregarVenta` (y la bandeja «Por descargar») ordenan una salida. **Libro de ventas nunca toca el kardex**, ni al registrar, ni desde la
   bandeja de DTE, ni al regularizar (§3.7, paso 6).
2. **Idempotencia en la base.** El único parcial `(empresa_id, clase, modulo_de_origen, documento_de_origen_id) where estado = 'vigente'` (§7.1), con `modulo_de_origen = 'cuentas-por-cobrar'`.
3. **[corrige §7.1 y §7.4]** Con ese único y el id de la venta como origen, **una venta con una línea pendiente no podría descargarse después** (sería un segundo documento de la misma
   venta). Por eso: la descarga inicial usa como origen **la venta**, y la descarga posterior usa como origen **la línea** (`lineas_de_venta.id`), con la línea bloqueada `for update` y solo la
   transición `pendiente → hecha`.
4. **Decisión fijada al vender.** `descarga` se copia a la línea. Vincular un producto o encender Inventarios no reprocesa líneas `no_aplica`.
5. **Combo:** descargan solo los componentes; la línea padre lleva `ninguna`. **Receta:** una sola orden con todos los renglones (§8.6).
6. **Entrega única:** `EntregarVenta` exige `entrega = 'pendiente'` con la fila bloqueada.

### 24.3 Encender y apagar caja, crédito y cartera (reemplaza R-12 y las filas de §0 y §2.2)

**Por empresa**, nivel `empresa` únicamente, `publica: true` para que el cliente oculte el menú; **la regla la aplica siempre el servidor**:

| Clave | Por omisión (VU-P1) | Qué enciende |
|---|---|---|
| `cuentas-por-cobrar.funciones.caja` | `false` | Cajas con turno, arqueos, movimientos de efectivo, cierre |
| `cuentas-por-cobrar.funciones.credito` | `true` | Vender con condición `credito` o `mixto`. Exige `cartera` |
| `cuentas-por-cobrar.funciones.cartera` | `true` | Recibir cargos, cobros, recibos, saldo a favor, estado de cuenta |
| `cuentas-por-cobrar.funciones.control_de_existencias` | `true` | §24.2 |

**Configuración y permisos son dos llaves distintas:** el interruptor dice si **la empresa** usa la función; el permiso, si **esa persona** puede. Se necesitan las dos. Apagar una función no
quita permisos, así que al encenderla de nuevo no hay que reasignar nada.

- Se cambian por `PUT /cuentas-por-cobrar/controles` con `cuentas-por-cobrar.controles.configurar`, y se **auditan** (`configurar`, antes y después), como §14.4 (S-23).
- **Carrera:** `CambiarFunciones` toma un candado consultivo exclusivo por empresa; abrir turno, registrar venta, recibir documento y cobrar lo toman compartido (precedente:
  `activos-fijos/infraestructura/persistencia/cierres.drizzle.ts`). Así ninguna venta a crédito entra mientras se apaga la cartera.

**Vender sin caja: la «caja directa».** Hoy `ventas.caja_id` y `turno_id` son obligatorios, y sobre `caja_id` descansan la RLS (S-15) y la idempotencia.

| Opción | A favor | En contra |
|---|---|---|
| A. `caja_id` nula | Simple a primera vista | **Rompe la RLS por caja** y el único de idempotencia (los nulos no chocan: volverían las ventas dobles) |
| **B. Una caja de sistema `directa` por empresa, sin turnos** | RLS, llaves, idempotencia y autorizaciones quedan iguales; solo `turno_id` pasa a nula | Una fila de sistema |
| C. Tabla aparte de ventas sin caja | Sin nulos | Dos juegos de ventas: contradice «un solo juego de registros» (§3.8) |

**Recomendado y adoptado: B.**

| Tabla | Cambio |
|---|---|
| `cajas` | `clase text not null default 'con_turno'`, `in ('con_turno', 'directa')`. Único parcial `(empresa_id) where clase = 'directa'`. Único `(id, empresa_id, clase)`. Semilla perezosa «Ventas directas». No se edita su clase ni se inactiva |
| `ventas`, `pagos_de_venta` | `turno_id` **nula**; `clase_de_caja text not null`, con FK compuesta `(caja_id, empresa_id, clase_de_caja)` a ese único. Check `(clase_de_caja = 'con_turno') = (turno_id is not null)`. Con `turno_id` nulo la FK de §9.0 no se evalúa, y es lo correcto |
| `turnos` | `clase_de_caja text not null default 'con_turno'`, check `= 'con_turno'`, misma FK: **la base impide abrir un turno en la caja directa** |
| `arqueos`, `movimientos_de_caja` | Sin cambio: siempre tienen turno |
| `cobros.forma` | Suma **`directo`**: cobro recibido sin caja ni banco, con `medio` obligatorio y sin `movimiento_id` ni referencia de caja. Permiso propio `cobros.directo` |

**Uso de la caja directa:**

| `funciones.caja` | Qué se puede registrar en la directa |
|---|---|
| Apagada | Contado (según VU-P2), crédito y mixto |
| Encendida | **Solo crédito sin pago**, con `ventas.vender-sin-turno`. Si no, sería una salida para que el efectivo no pase por el arqueo |

Anular una venta o un cobro `directo` sigue exigiendo segunda persona (§4.8); `autorizaciones_de_caja` usa el id de la caja directa. El reporte **«Cobrado sin caja ni banco»** no se puede apagar.

**Apagar y encender:**

| Función | Al apagar | Con datos | Al encender |
|---|---|---|---|
| **Caja** | Rechaza con turno abierto (`caja_con_turno_abierto`), efectivo en tránsito (`caja_con_efectivo_en_transito`) o efectivo contado en el último cierre (`caja_con_efectivo_sin_retirar`): primero se deposita o se retira | Turnos y arqueos quedan de solo lectura en reportes | Hay que crear una caja y abrir turno |
| **Crédito** | **Siempre se puede.** Solo impide ventas nuevas a crédito (`credito_no_disponible`) | **Los saldos siguen vivos** y se siguen cobrando | Inmediato |
| **Cartera** | Rechaza con **cualquier saldo** por cobrar o a favor, incluidos anticipos de pedidos (`cartera_con_saldos`, con cuánto y de cuántos clientes). Exige apagar crédito en el mismo cambio (`credito_sin_cartera`) | Estado de cuenta, recibos y reportes quedan **de solo lectura**. Se sale de los saldos cobrando, con nota de crédito o con castigo: **nunca se borran** | Los documentos registrados mientras estuvo apagada no entran solos (R-1 de la cartera) |

**Reemplazo de R-12** (ya aplicado en §19):

> **R-12. Función o módulo apagado con datos.** Las tablas y los saldos quedan siempre. La **cartera** no se apaga con saldos (`cartera_con_saldos`); apagar el **crédito** no afecta lo ya
> prestado. Si soporte desactiva el **módulo** completo, `validarDesactivacion` no lo impide; los saldos se conservan y vuelven al reactivarlo, Libro de ventas registra sin destino y lo que
> dependa del módulo **falla cerrado** (S-21).

**Libro de ventas con la cartera apagada.** Hoy el destino sale de «módulo activo en la cuenta», y ya no alcanza: una empresa con el módulo activo y la cartera apagada vería cada factura como
deuda. El cambio exacto está en §24.6:

- Un documento nuevo se registra **sin destino**.
- **Anular o eliminar** un documento viejo sigue funcionando: el módulo está activo y atiende el aviso.
- Una **nota sobre una factura que pasó por la cartera** se rechaza con `cartera_apagada` («Encienda la cartera para registrar esta nota»), porque crearía un saldo a favor en una cartera apagada.

**Combinaciones:**

| Negocio | Caja | Crédito | Cartera | Existencias | Otros módulos |
|---|---|---|---|---|---|
| Servicios: factura y cobra | No | Sí | Sí | No | `libro-de-ventas` si factura con FEL; `bancos` si deposita |
| Tienda de contado sin NIT | Sí | No | No | Sí | `inventarios` |
| Tienda que fía | Sí | Sí | Sí | Sí | `inventarios` |
| Solo cobra facturas del Libro | No | No | Sí | No | `libro-de-ventas` |
| Restaurante | Sí | Opcional | Opcional | Sí | `inventarios`, `produccion` |

### 24.4 Lo que deja de ser entre módulos

**Órdenes que pasan a ser casos de uso internos** (misma unidad de trabajo, sin mediador y sin contrato en `core/contratos`):

| Antes | Ahora |
|---|---|
| `cuentas-por-cobrar.recibir_venta_de_control` | Servicio interno `CargosDeVenta` |
| `cuentas-por-cobrar.registrar_cobro_de_caja` / `anular_cobro_de_caja` | Casos de uso internos. `AnularCobro` sigue rechazando un cobro `caja` directo (`cobro_de_caja`) |
| `cuentas-por-cobrar.anular_cargo_de_venta` | Servicio interno |
| Preguntar a `ModulosActivosDeLaCuenta` si hay cartera | Lectura de `funciones.cartera` |
| Error `requiere_cuentas_por_cobrar` | `cartera_apagada` |

**Siguen por el mediador** (son de otros módulos): `cuentas-por-cobrar.recibir_documento`, las órdenes a `libro-de-ventas`, `inventarios`, `produccion` y `bancos`. **Nueva:**
`cuentas-por-cobrar.admite_documentos_nuevos` → `{ admite }`.

**Un manejador por mensaje.** Para el mediador ahora es un solo módulo: responder dos veces la misma pregunta **lanza** `ManejadorDuplicadoParaLaPregunta` al arrancar, y dos escuchas de un aviso dejarían la regla partida y dependiente del orden de registro. Se unen:

| Mensaje | Une |
|---|---|
| `empresas.revisar_cierre_de_carga` (pregunta) | Turnos abiertos (§13.2) + saldos iniciales de clientes (§8.9 de cartera) |
| `libro-de-ventas.documento_por_anular` / `_por_eliminar` | «Viene de una venta» + reglas del cargo (§8.8 de cartera). Primero la venta |
| `bancos.movimiento_por_cambiar` | Depósito de turno + cobro. Distingue por el id del movimiento en `movimientos_de_caja` y `cobros` |

**Tablas.** Las llaves de `ventas`, `pagos_de_venta` y `movimientos_de_caja` hacia `documentos` y `cobros` ya son **dentro del esquema**. Las referencias que iban sin llave porque cruzaban módulos **ganan llave compuesta**:

| Antes (§12) | Ahora |
|---|---|
| `documentos.referencia_de_origen_id` | **`documentos.venta_id`** (uuid, nula), FK compuesta a `ventas`; `(origen = 'venta_de_control') = (venta_id is not null)`; único parcial `(empresa_id, venta_id) where estado = 'vigente'` |
| `cobros.referencia_de_caja_id` | **`cobros.movimiento_de_caja_id`** y **`cobros.pago_de_venta_id`** (uuid, nulas), FK compuestas; `(forma = 'caja') = (exactamente una no nula)` |

**Permisos.** Se conservan separados `pagos.*` (cajero, en turno) y `cobros.*` (cartera, en oficina): un cajero sigue sin poder hacer un cobro por banco. **Nuevos:** `ventas.vender-sin-turno`, `cobros.directo`. **Renombrados:**
`reportes-de-ventas.*`, `reportes-de-cartera.*`. Recursos de auditoría permanente, con el prefijo `cuentas-por-cobrar.`: `ventas`, `turnos`, `arqueos`, `formas`, `regularizaciones`, `movimientos`, `cajas`, `productos`, `cobros`, `castigos`.

**Eventos** (Contabilidad aún no escucha ninguno de estos): `ventas-y-caja.*` pasa a `cuentas-por-cobrar.*`, sin choques con los de §10.3 de cartera. **La regla de una sola fuente por parte (§17) no cambia.**

**Una sola numeración de migraciones.** Antes eran dos series (`0001…0006` de Ventas, `0001…0007` de cartera). Como **dos migraciones del mismo módulo no van en paralelo**, juntar los módulos crearía una fila india. Para evitarla, las tablas entran **por bloques, antes
que la lógica**:

| Migración | Paso | Contenido |
|---|---|---|
| `0000_vyc_e1_ventas_y_caja` | VYC-E1 | Catálogos, formas, productos, menús, cajas y accesos, turnos, arqueos, autorizaciones, movimientos, ventas, líneas, pagos (sin las FK a cartera) |
| `0001_vyc_e1_auditoria_permanente` (`--custom`) | VYC-E1 | Recursos permanentes de ventas y caja |
| `0002_vyc_e2_cartera` | VYC-E2 | Tablas de §6 de cartera con §12 y §24.3, y las FK entre ventas y cartera |
| `0003_vyc_e2_auditoria_permanente` (`--custom`) | VYC-E2 | `cobros`, `castigos` |
| `0004_vyc_e3_regularizaciones_y_dte` | VYC-E3 | `regularizaciones`, `regularizacion_ventas`, `dte_de_ventas` |
| Siguiente libre | VCJ-14, CXC-5t, CXC-9 | Solo lo que nazca después (`devoluciones_de_venta`, tarjeta, estimaciones) |

Los pasos E declaran **todos** los permisos y la configuración en `modulo.ts`, para que los pasos de lógica no choquen en ese archivo. Reemplaza las listas de §9.12 y de §6.12 de cartera. A-11 (privilegios) entra en VYC-E1 y VYC-E2.

### 24.5 Tabla de pasos unificada (reemplaza §20 y, de cartera, los pasos CXC-*)

Se conservan las claves. Los pasos `LV-*`, `VC-0*` y `VC-10/11` siguen en la tabla de `diseno-cuentas-por-cobrar-y-ventas.md` §16; los `REC-*`, en §20 de este documento, con el único cambio de que **REC-5 depende de VCJ-4i**. **CXC-A desaparece:** su contenido entra en VYC-E2 y CXC-3b.

**Lo que destraba esta decisión:** VCJ-1 ya **no espera a INV-8**, porque el módulo no depende de Inventarios. Solo la descarga (VCJ-3 y VCJ-4i) sigue detrás de VCJ-0b.

| Paso | Qué | Quién | Depende de | Va en paralelo con | Espera del usuario |
|---|---|---|---|---|---|
| **VCJ-0a** | **Hecho** (en `integracion`) | backend | — | — | — |
| **VCJ-0d** | **Hecho** (en la rama `worktree-wf_05a0b7b8-de7-3`, falta unir) | backend | VCJ-0a | — | — |
| VCJ-0e | Cliente de Empresas para A-10; unir antes de publicar VCJ-0d | frontend | VCJ-0d | Todo lo demás | — |
| **VCJ-0b** | Inventarios sin `dependeDe` | backend | VCJ-0a, **INV-8** | VYC-E1, VCJ-1, VCJ-2 | — |
| VCJ-0c | Cliente de Inventarios con el libro apagado | frontend | VCJ-0b, INV-5c | Cualquiera | — |
| **VYC-0** | Ajustes a lo ya programado (§24.6, grupos A y B) | backend + frontend | Tanda 9 unida (LV-2, VC-0b) | VYC-E1 | — |
| **VYC-E1** | Esqueleto, permisos, configuración y tablas de ventas y caja, con caja directa, `bien_sin_existencia` y checks; pruebas de checks y de RLS | backend | VCJ-0a, VCJ-0d | VCJ-0b, VYC-0 | — |
| **VYC-E2** | Tablas de cartera con §12 y §24.3; privilegios; pruebas de checks | backend | VYC-E1, **LV-2** | Lógica de VCJ-1 y VCJ-2 | — |
| **VYC-E3** | Regularizaciones y `dte_de_ventas` | backend | VYC-E2 | Lógica | — |
| **VYC-F** | `CambiarFunciones`: reglas de §24.2 y §24.3, candado, auditoría, ruta de controles, `admite_documentos_nuevos` y §24.6 grupo C | backend | VYC-E2, VYC-0 | CXC-1, VCJ-2 | VU-P1, VU-P4 |
| VYC-Fc | Pantalla «Funciones de Ventas y cobros» y menú según interruptores | frontend | VYC-F | Cualquier `c` | — |
| **VCJ-1** | Formas (solo control), medios, conceptos, productos con combos y Excel; precios auditados | backend | VYC-E1 | VCJ-2, CXC-1 | — |
| VCJ-1c | Formas, Productos, Medios, Conceptos | frontend | VCJ-1 | VCJ-2 | — |
| **VCJ-2** | Cajas con alcance, **caja directa**, turnos, responsable; pruebas de RLS con dos cajeros | backend | VYC-E1 | VCJ-1, CXC-1 | — |
| VCJ-2c | Cajas, abrir turno | frontend | VCJ-2 | CXC-1c | — |
| **VCJ-3** | Inventarios: clases de venta, órdenes, idempotencia, A-14, A-15, **origen por línea** (§24.2) | backend | VCJ-0b | VCJ-3b, VCJ-4 | — |
| **VCJ-3b** | Verificar credencial sin abrir sesión (A-13); autorizaciones | backend | VCJ-2 | VCJ-3 | — |
| **VCJ-4** | `RegistrarVenta` de contado de control **sin descarga** (`servicio`, `bien_sin_existencia`), con turno o en caja directa; `AnularVenta`; concurrencia | backend | VCJ-1, VCJ-2, VCJ-3b | VCJ-3, CXC-2 | VU-P2 |
| **VCJ-4i** (nuevo) | Venta con descarga: `articulo`, `platillo`, combo; «¿volvió la mercadería?» con kardex; acciones de §24.2 | backend | VCJ-3, VCJ-4 | VCJ-5 | VU-P3 |
| VCJ-4c | Mostrador, comprobante, autorización, bloqueo | frontend | VCJ-4 (lo de existencia, con VCJ-4i) | VCJ-5 | — |
| **VCJ-5** | Movimientos, arqueos, cierre, reabrir; compra sin factura solo con `controla_existencias` | backend | VCJ-4 | VCJ-4i, CXC-3 | — |
| VCJ-5c | Caja: movimientos, arqueo, cierre | frontend | VCJ-5 | — | — |
| **VCJ-6** | Menú del día; «Por descargar» con sus tres salidas y pregunta al cierre | backend + frontend | VCJ-4i, INV-8 | VCJ-7 | — |
| **VCJ-7** | Reportes de ventas y caja, «Ventas de bienes sin descarga», «Cobrado sin caja ni banco», Auditoría (A-12) | backend + frontend | VCJ-5 | CXC-7 | — |
| **CXC-1** | Condiciones, `recibir_documento` (rechaza con cartera apagada), documentos, vencimiento, contraseña, avisos | backend | VYC-E2, LV-2 | VCJ-1, VCJ-2 | — |
| CXC-1c | Por cobrar, estado de cuenta, sección del cliente | frontend | CXC-1 | VCJ-2c | — |
| **CXC-2** | Abonos, aplicaciones, saldos derivados con fechas de corte | backend | CXC-1 | VCJ-4 | — |
| **CXC-3** | Cobros: depósito, nota ligada, solo retenciones y **`directo`**; recibo, anular, escucha de Bancos unida | backend | CXC-2, LV-3, VC-0b | VCJ-5 | VU-P2 |
| CXC-3c | Cobrar, cobros, recibo | frontend | CXC-3 | — | — |
| **CXC-3b** | Cobro `caja`, recibo de pago, `grupo_de_pago_id`, `sustituido` | backend | CXC-3, VCJ-5 | CXC-4, CXC-5 | — |
| **CXC-4** / CXC-4c | Saldo a favor, devolución, diferencia menor | backend / frontend | CXC-3 | CXC-5, CXC-6, CXC-8 | — |
| **CXC-5** / CXC-5c | Cheque rechazado | backend / frontend | CXC-3 | CXC-4, CXC-6, CXC-8 | — |
| CXC-5t | Tarjeta (solo si VC-P27 dice que sí) | backend + frontend | CXC-5 | — | VC-P27 |
| **CXC-6** / CXC-6c | Saldos iniciales, cuenta de apertura, pregunta de EM-2 **unida con turnos** | backend / frontend | CXC-3 | CXC-4, CXC-5, CXC-8 | — |
| **CXC-7** / CXC-7c | Reportes de cartera con «Clase» | backend / frontend | CXC-4 | VCJ-7 | — |
| **CXC-8** / CXC-8c | Castigos y recuperaciones | backend / frontend | CXC-3 | CXC-4, CXC-5, CXC-6 | — |
| **VCJ-8** | Crédito y mixto, abonos en caja, recibos y anulación por grupo, pedidos con anticipo, búsqueda de clientes | backend + frontend | CXC-3b, VCJ-5 | CXC-7 | — |
| **VCJ-9** | Forma formal `transcrito`, regularización con traslado de deuda, conciliación | backend + frontend | VYC-E3, VCJ-8, LV-3, LV-4, CXC-4 | VCJ-10, VCJ-11 | — |
| **VCJ-10** | Depósito de turno con Bancos | backend + frontend | VCJ-5, VC-0b | VCJ-8 | — |
| **VCJ-11** | Avisos de prescripción y estado de cuenta con clase | backend + frontend | VCJ-8, CXC-7 | VCJ-9 | — |
| VCJ-12 | Eventos y reglas de Contabilidad | backend | VCJ-9, CT-3 | — | Contador |
| VCJ-13 | Trabajadores | backend + frontend | VCJ-8 | VCJ-14, VCJ-15 | — |
| VCJ-14 | Devolución parcial (migración propia) | backend + frontend | VCJ-9 | VCJ-13 | — |
| VCJ-15 | Reconocimiento de deuda; intereses | backend + frontend | VCJ-8 | VCJ-13 | — |
| VCJ-16 | (Después) Destino en Libro de compras para gastos de caja. **El valor del destino será `cuentas-por-cobrar`** | backend + frontend | VCJ-5 | — | — |
| VCJ-17 | (Después) Forma con `certificador` | backend + frontend | Módulo FEL | — | VC-P4 |
| CXC-9 | (Después) Estimación de incobrables | backend + frontend | CXC-8 | — | — |
| VC-QA | Punta a punta del Libro y la cartera, **también con la cartera apagada** | pruebas-qa | LV-*, CXC-1 a CXC-8 | — | — |
| VCJ-QA | Punta a punta: **empresa de servicios sin Inventarios ni caja** que factura y cobra; negocio sin NIT que fía; empresa inscrita con dos formas; apagar y encender cada función | pruebas-qa | VCJ-9, VYC-Fc | — | — |

**Carriles en paralelo** (tocan carpetas distintas y, tras los pasos E, no generan migraciones):

| Carril | Pasos |
|---|---|
| Catálogo y venta | VCJ-1 → VCJ-4 → VCJ-4i |
| Caja | VCJ-2 → VCJ-3b → VCJ-5 |
| Cartera | CXC-1 → CXC-2 → CXC-3 → CXC-4, CXC-5, CXC-6, CXC-8 |
| Inventarios (otro módulo) | VCJ-0b → VCJ-3 |
| Pantallas | Cada `c` detrás de su paso |

**En fila:** VYC-E1 → VYC-E2 → VYC-E3 entre sí, y VCJ-3 con REC-2, porque tocan el mismo `check` de `inventarios.documentos`.

### 24.6 Cambios exactos a código ya programado

**No cambia ninguna migración ni ningún dato.** Quedan intactos: `0002_lv2` y su snapshot, `0039_cobros_a_clientes`, `DestinoDeDocumentoDeVenta`, `DESTINOS_DE_DOCUMENTO`, `MODULO_CUENTAS_POR_COBRAR`, los conceptos reservados y
`terceros.contratos.ts`. A `core/contratos/cuentas-por-cobrar.contratos.ts` solo se le **suma** una orden. Todo se hace **después de unir la tanda 9**: no hay que reabrir sus ramas. Los números de línea son los de las ramas indicadas.

**A. Nombre visible, en VYC-0** (sin esto, la app pediría «Active Cuentas por cobrar», un módulo que ya no se llama así):

| Archivo | Dónde está | Cambio |
|---|---|---|
| `cliente/src/modulos/bancos/composables/movimientos/origen-y-causa.ts:5` | `main` | `'Ventas y cobros'` |
| `cliente/src/modulos/bancos/composables/notas/marca-de-nota.prueba.ts:28` | `-6`, `-61` | Espera `'Para Ventas y cobros'` |
| `servidor/src/modulos/bancos/dominio/conceptos-reservados.ts:14` | `-6`, `-61` | `'Ventas y cobros'` |
| `servidor/src/modulos/bancos/dominio/asignacion-de-concepto.prueba.ts:145,160` | `-6`, `-61` | Espera `/Ventas y cobros/` |
| `servidor/src/modulos/libro-de-ventas/aplicacion/casos-uso/documentos/bajas-con-el-destino.ts:13` | `-77`, `-111` | `'Ventas y cobros'` |
| `servidor/src/modulos/libro-de-ventas/dominio/destino-del-documento.ts:33,56` | `-77`, `-111` | `DestinoInactivo('Ventas y cobros')` |

**Se quedan como están**, porque describen la función y no el módulo: «no puede ir a Cuentas por cobrar» y «Para ir a Cuentas por cobrar» (`destino-del-documento.ts:29,32`), «saldo inicial en Cuentas por cobrar» (`errores-de-documento.ts:27`), «En cuentas por cobrar»
(`textos-de-documentos.ts:49`) y el valor `cuentas_por_cobrar` de `libro-de-ventas.destino.consumidor_final`.

**B. Libro de ventas con la cartera apagada, en VYC-0** (código de las ramas `-77` y `-111`; rutas bajo `servidor/src/modulos/` salvo donde se indica):

| Archivo | Cambio |
|---|---|
| `core/contratos/cuentas-por-cobrar.contratos.ts` | Suma la orden `cuentas-por-cobrar.admite_documentos_nuevos` → `{ admite: boolean }` |
| `libro-de-ventas/aplicacion/puertos/puertos-de-documentos.ts` | `DestinosDeVenta.admitenNuevos(operador)` |
| `libro-de-ventas/infraestructura/vecinos-en-mediador.ts` | Lo implementa: si el módulo no está activo, `false`; si lo está, manda la orden. **`activos()` no cambia**, porque también protege anular y eliminar |
| `libro-de-ventas/aplicacion/casos-uso/documentos/cargador-de-contexto.ts:59` | Carga `admiteDocumentosNuevos` |
| `libro-de-ventas/dominio/armado-del-documento.ts` (`:66`, `:130`) | Pasa el dato a `resolverDestino` |
| `libro-de-ventas/dominio/destino-del-documento.ts` | `destinoAutomatico` devuelve `null` si no admite. Lo pedido a mano y las notas siguen su camino, y los rechaza `recibir_documento` con `cartera_apagada` |
| `libro-de-ventas/pruebas/vecinos-de-ventas-en-memoria.soporte.ts` y `servidor/src/pruebas-api/soporte/escenario-de-ventas.ts` | El doble responde la orden nueva |
| `libro-de-ventas/dominio/destino-del-documento.prueba.ts` | Caso nuevo: cartera apagada, sin destino automático |
| `cliente/src/modulos/libro-de-ventas/composables/documentos/usar-catalogos-del-registro.ts:71` | `conCartera` = módulo activo **y** `sesion.config('cuentas-por-cobrar.funciones.cartera', true)` |

Hasta que exista el módulo, la orden no tiene quien la atienda, pero tampoco se envía: `DESTINOS_DE_DOCUMENTO` solo cuenta módulos activos.

**C. Bancos con la cartera apagada, en VYC-F.** Con el módulo activo, Bancos reserva `cobro_a_cliente`, `cobro_a_cliente_de_activo`, `devolucion_a_cliente` y `cheque_rechazado`. En una empresa con la cartera apagada **nadie los registraría, y tampoco se podrían elegir a mano**: no podría clasificar un cheque devuelto.

| Archivo (ramas `-6`, `-61`) | Cambio |
|---|---|
| `servidor/src/modulos/bancos/infraestructura/modulos-de-origen-en-modulos-activos.ts` | `activos()` deja fuera `cuentas-por-cobrar` si `admite_documentos_nuevos` es falso. **`estaActivo()` pasa a leer directo los módulos de la cuenta**: `RevisorDeCambios` debe seguir avisando al módulo |
| `cliente/src/modulos/bancos/composables/conceptos/opciones-de-concepto.ts` (`liberarReservados`) | Recibe una función que considera el interruptor; sus 6 llamados pasan a usarla. `moduloInactivoQueEspera` **no cambia** |

**Comentario desactualizado** (se corrige al pasar): `vecinos-en-mediador.ts` dice que el destino «es un módulo que depende de este»; desde A-2 no es así.

### 24.7 Preguntas y validaciones

**Para el usuario** (la primera opción es la recomendada; ninguna frena VYC-E1, VCJ-1, VCJ-2 ni CXC-1):

| # | Pregunta | Opciones | Por qué | Antes de |
|---|---|---|---|---|
| **VU-P1** | Al activar Ventas y cobros en una empresa, ¿qué viene encendido? | a) Crédito, cartera y control de existencias, con **caja apagada**; b) todo encendido; c) todo apagado | Una empresa de servicios empieza a facturar y cobrar sin abrir turnos. Una tienda enciende la caja al crear la primera | VYC-F |
| **VU-P2** | Sin caja, ¿se puede registrar un pago **en efectivo**? | a) Sí, con recibo, segunda persona para anular y un reporte que no se apaga; b) no: solo banco, tarjeta o cheque | Sin esto, un profesional sin Bancos no podría dar recibo de lo que le pagan en efectivo. El costo: ese efectivo no tiene arqueo | VCJ-4, CXC-3 |
| **VU-P3** | Si la empresa **sí** controla existencias, ¿se puede vender un bien sin ligarlo a un artículo? | a) No, hay que vincularlo; b) sí, y sale en un reporte | Con b habría una forma simple de sacar ventas del inventario, justo lo que prohíbe §3.8 | VCJ-4i |
| **VU-P4** | ¿Se puede apagar la cartera con **saldos pendientes**? | a) No: primero se cobra, se acredita o se castiga, y mientras tanto se puede apagar solo el crédito; b) sí, quedando de solo lectura | Con b quedarían deudas sin pantalla para cobrarlas | VYC-F |

**Para `contador-guatemala`** (antes del paso indicado):

| # | Punto | Antes de |
|---|---|---|
| VU-C1 | `bien_sin_existencia`: ingreso sin costo de ventas en la partida; la compra queda en gasto. ¿Aceptable en empresa inscrita, o solo con aviso? | VCJ-12 |
| VU-C2 | Cobro `directo` y venta de contado en caja directa: ¿a qué cuenta va el efectivo sin arqueo? | VCJ-12 |
| VU-C3 | Apagar `control_de_existencias` en una empresa inscrita con existencias: ¿es compatible con «un solo juego de registros» (dictamen §2.2) si queda auditado y con un reporte que no se apaga? | VYC-F |

**Para `seguridad`** (antes de VYC-F): el interruptor de existencias, la caja directa como vía para esquivar el arqueo, el cobro `directo` y el candado de `CambiarFunciones`.
