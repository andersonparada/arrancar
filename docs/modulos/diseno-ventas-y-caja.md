# Diseño de Ventas y caja (por formas de venta), Recetas y Producción — arquitecto de datos, 2026-11-23

_Agente `arquitecto-de-datos`. Base contable y fiscal: `dictamen-ventas-y-caja-2026-11-23.md` (contador-guatemala, «correcto
con ajustes»). Aterriza «Caja / ventas» de `docs/PLAN.md` §6. Lo que el arquitecto no comparte del dictamen, o que el código
ya resolvió de otra forma, va marcado **[corrige el dictamen]** y pasa a §22 para que lo valide el contador._

**Estado (2026-11-23): propuesta. Nada de esto se programa hasta que el usuario responda §21.** Los diseños aprobados no se
reescriben: lo que este diseño les pide cambiar está en las **adendas de §18**, y ninguna contradice lo ya programado ni los
pasos LV-1, LV-2 y VC-0x en curso.

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

- **Dos módulos nuevos:**
  - **`ventas-y-caja`** (esquema `ventas_y_caja`), `dependeDe: ['inventarios', 'terceros']`: formas de venta, catálogo de lo
    que se vende, venta de mostrador, cajas, turnos, arqueos, comprobante interno y paso de control a formal.
  - **`produccion`** (esquema `produccion`), `dependeDe: ['inventarios']`: recetas con versiones, órdenes de producción, real
    contra teórico. Es activable: quien solo revende no lo ve.
- **La forma de venta es el centro** (§3): un catálogo por empresa. Con configuración FEL, la venta es **formal**; sin ella,
  es **de control**. Conviven en la misma caja, turno, cartera, inventario y reportes. Cada venta guarda su forma y una **foto
  de lo fiscal**: cambiar la forma no altera el pasado.
- **Una sola cartera por cliente** (§6): se **extiende `cuentas-por-cobrar`** (diseñado y aún sin programar) con un cargo de
  origen «venta de control» y un cobro en caja, sin exigirle Libro de ventas ni Bancos. Los abonos a ventas de control dan un
  **recibo de pago**; los de documentos fiscales, el **recibo de cobro** ya aprobado.
- **Cada módulo puede faltar** (§2). La pieza que lo permite es un campo nuevo en la definición del módulo, **`usaTablasDe`**:
  separa «necesito sus tablas para mis llaves» (siempre existen en toda instalación, PLAN §3.2) de «debe estar activo»
  (`dependeDe`). Con él, `inventarios` deja de exigir Libro de compras **sin mover ninguna tabla ni llave**.

| Lo que quiere el negocio | Módulos activos |
|---|---|
| Vender de contado, solo control, sin NIT | `ventas-y-caja`, `inventarios`, `terceros` |
| Además, fiar y cobrar abonos | + `cuentas-por-cobrar` (sin Bancos ni libros) |
| Además, recetas y producción | + `produccion` |
| Ventas formales | + `libro-de-ventas` (trae `libro-de-compras`) y, para certificar desde Arrancar, el futuro `facturacion-fel` |
| Depositar la caja al banco | + `bancos` |
| Partidas | + `contabilidad` |

- **Pasar de control a formal** (§3.7): un DTE cubre uno o varios comprobantes; el comprobante queda enlazado y no se
  reescribe, y en la cartera **la deuda y sus abonos se trasladan** al cargo del DTE sin duplicarse.
- **Salvaguardas del dictamen** (§3.8): motivo en empresa inscrita, correlativo sin huecos, reporte que no se apaga,
  conciliación mensual, permisos propios y **un solo juego de registros**: no hay forma de sacar una venta de control del
  inventario, de los reportes ni de Contabilidad.
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
| `cuentas-por-cobrar` | **`['terceros']`** (el aprobado decía `['libro-de-ventas', 'bancos']`) | `['libro-de-ventas', 'bancos']` |
| `ventas-y-caja` | `['inventarios', 'terceros']` | `['cuentas-por-cobrar', 'libro-de-ventas', 'bancos']` |
| `produccion` | `['inventarios']` | — |
| `libro-de-ventas` | `['libro-de-compras']` (sin cambio) | — |

Orden del migrador resultante, sin ciclos: `terceros` → `libro-de-compras` → `inventarios`, `libro-de-ventas`; `bancos` →
`cuentas-por-cobrar` → `ventas-y-caja`; `inventarios` → `produccion`.

`cuentas-por-cobrar` **no** es dependencia de Ventas: quien solo vende de contado no la necesita. Sin ella, las formas no ofrecen
crédito.

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

- **A qué cajas** (`formas_por_caja`) y **a qué usuarios** (`formas_por_usuario`). **Sin filas = todas / todos.** Con filas en
  las dos, deben cumplirse las dos. Lo valida el servidor al vender, no solo la pantalla.
- Una forma por caja puede ser la **predeterminada** (`formas_por_caja.predeterminada`, una por caja): el cajero no elige si no
  quiere. **[decisión del arquitecto]** La predeterminada no se fija por rol ni por empresa: sería el «modo» que el usuario
  descartó.

### 3.4 Qué se puede cambiar de una forma

- Nombre, plantilla, si admite crédito, cajas y usuarios: **sí**, sin afectar ventas pasadas (tienen su foto).
- **Pasar de control a formal o al revés, con ventas ya hechas: no** (`forma_con_ventas`). Se crea otra forma y se inactiva la
  anterior. **[decisión del arquitecto]** Así un correlativo nunca mezcla comprobantes y DTE, y un reporte por forma significa
  una sola cosa. Una forma sin ventas sí se puede cambiar.
- No se elimina si tiene ventas; se inactiva, con auditoría.

### 3.5 Validaciones al vender con una forma formal

1. `libro-de-ventas` activo y la empresa con NIT; si no, `forma_formal_sin_libro`.
2. Historial fiscal del mes: el `tipo_dte` corresponde al régimen; si no, `dte_no_corresponde_al_regimen`. **Aquí se bloquea**
   (en Libro de ventas solo se avisa, porque allá el DTE ya existe; aquí todavía no se ha emitido y el certificador lo
   rechazaría).
3. Régimen derogado: `regimen_derogado`, la misma regla de LV-2.
4. Con el IVA suspendido no se puede facturar (Res. SAT-DSI-1793-2026, art. 13, M): es dato de la SAT; el adaptador devolverá
   el rechazo.

### 3.6 La foto de cada venta

Cada venta copia al guardarse: forma (id y nombre), clase, `tipo_dte`, establecimiento, modo, NIT y nombre del negocio, régimen
de IVA e ISR del mes (si hay), plantilla del comprobante, condición de inscrita (§3.9). Va en columnas las que se filtran y en
`foto_fiscal jsonb` el resto. **La venta nunca relee la forma.**

### 3.7 Pasar una venta de control a formal (regularizar)

Caso de uso `RegularizarVentas` (permiso `regularizaciones.crear`):

1. Se eligen uno o varios comprobantes de control vigentes, entregados, **del mismo cliente** (o todos de mostrador) y sin
   regularizar. La suma debe ser **exactamente** el total del DTE (`regularizacion_no_cuadra`). No se regulariza una parte de un
   comprobante.
2. La forma formal de destino da el tipo de DTE. Se emite (certificador) o se transcribe.
3. En la misma transacción (con el DTE ya aceptado):
   - `libro-de-ventas.registrar_documento` (§13.1) crea el documento, con `sustituyeCargos` si había deuda.
   - La cartera crea el cargo del DTE, **traslada** las aplicaciones vigentes de los cargos de control y los marca
     `sustituido` (§6.4). El saldo del cliente no cambia ni un centavo.
   - Se guarda `regularizaciones` y `regularizacion_ventas`. **El comprobante no se reescribe.**
4. **Fechas:** se conservan la **fecha real de entrega** y la **fecha del DTE**; nunca se retrofecha. Si caen en meses distintos,
   aviso: «La entrega fue en {mes}: revise con su contador si debe rectificar ese mes». El texto **no** dice que la emisión tardía
   corrija la infracción (dictamen §2.4).
5. Inventario no se toca: la mercadería ya salió.

### 3.8 Salvaguardas (dictamen §2.2)

| Salvaguarda | Cómo queda |
|---|---|
| Nada se borra | Las ventas no se eliminan; correlativo por forma en la transacción; anular con motivo; auditoría **permanente** |
| Motivo (VJ-P1) | En empresa inscrita, cada venta de control lleva `motivo_de_control`: `pedido_sin_entrega`, `fel_externa` (exige el número del DTE), `consolidar_al_cierre`, `contingencia`, `pendiente_de_fel`, `otro` (con texto). Un toque, con el último usado propuesto |
| Reporte | «Ventas de control» siempre disponible: sin configuración que lo apague, con motivo, antigüedad y estado |
| Conciliación | §15.2: ventas totales = Libro de ventas + control, con las diferencias a la vista |
| Permisos | `formas.gestionar-control`, `ventas.vender-control`, `reportes.ver-control`. El último se puede dar **solo** al contador externo |
| Aviso | Al crear la forma, siempre. Al vender, una línea discreta en empresa inscrita: «Si entrega el bien, esta venta requiere factura». No es ventana ni pide confirmar |
| Un solo juego de registros | **No existe** ninguna columna, permiso o configuración para excluir una venta de inventario, reportes o Contabilidad, ni para ocultarla por rol. El permiso de ver reportes da todas las ventas de la caja que el usuario ve |

**Lo que el sistema no hace:** no decide si una venta de control es legítima ni la bloquea por eso. Registra, avisa y deja la
evidencia, igual que `ReglaDeIva` en Inventarios.

**Casos que el dictamen dice que no son venta de control:**

| Caso | Dónde va en Arrancar |
|---|---|
| Consumo interno del negocio | Salida por consumo de Inventarios (no es venta) |
| Cortesía, donación, muestra, retiro del dueño | Salida especial de Inventarios, con su aviso de IVA (§6.6 de Inventarios) |
| Negocio de **otro dueño** (otro NIT o persona) | Debe ser otra empresa en la cuenta; si le pasan mercadería, es una venta. El aviso de la forma lo dice |

### 3.9 Empresa inscrita (sin crear un «modo»)

El dictamen pide un estado fiscal «sin inscripción». **[corrige el dictamen]** No se agrega estado ni columna: se **deduce** del
dato que ya existe.

```
inscrita = core.empresas.nit no es nulo
```

| Situación | Salvaguardas de §3.8 | Avisos de IVA en Inventarios |
|---|---|---|
| Sin NIT | Sin motivo; sin aviso al vender. Una nota fija con el texto del dictamen §1 en la ayuda de Formas | **Ninguno** |
| Con NIT y datos fiscales | Todas | Según el régimen del mes |
| Con NIT, sin datos fiscales (o Libro de compras apagado) | Todas | Aviso genérico: «Registre su régimen para saber si esto genera IVA». **Ya no se asume régimen general** en silencio (§7.5) |

Agregar un NIT después no cambia las ventas anteriores: cada una guardó `inscrita_al_vender`. Se confirma en VJ-P3.

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
  arquitecto]**: precios distintos por forma serían un incentivo a mover ventas hacia control.
- **Combo**: tiene su propio precio. La línea guarda sus componentes para descargar y reportar. El reparto del precio entre
  componentes se hace en proporción a su precio individual (hace falta para el DTE y para el ingreso por concepto).
- **Menú del día**: por fecha, lista de productos con precio opcional del día y **cupo** opcional (quedan 12). Agotar el cupo avisa;
  no bloquea, salvo que la existencia lo haga.
- **Descuentos**: por línea o por total, en monto o porcentaje. Hasta el tope de `ventas-y-caja.descuentos.tope_sin_permiso` los da
  cualquier vendedor; más arriba exige `ventas.descontar`. Quedan en la línea con quién los dio.
- **Precio cero** en una venta: rechazado (`venta_sin_precio`). Una cortesía no es una venta con descuento del 100 %: es una salida
  especial (dictamen §2.1). Es la forma más fácil de esconder una transferencia gratuita.

### 4.4 Contado, crédito y mixto

| Condición | Qué pasa |
|---|---|
| Contado | `pagos_de_venta` cubre el total. No toca la cartera aunque tenga cliente |
| Crédito | Exige cliente, forma que admite crédito y `cuentas-por-cobrar` activo. Crea el cargo |
| Mixto | Pago parcial más crédito. El cargo es **por el total** y el pago entra como su primer abono, con recibo: el estado de cuenta muestra la venta completa |

### 4.5 Pedidos y apartados (entrega pendiente)

Es el caso legítimo principal del dictamen, y obliga a una distinción que el resto del diseño respeta:

- `entrega = 'pendiente'`: **no** descarga inventario, **no** es ingreso, **no** crea cargo. Lo pagado es **anticipo**: un cobro sin
  aplicar en la cartera (saldo a favor), y por eso exige cliente y `cuentas-por-cobrar` activo si hay pago.
- `EntregarVenta` pone `entregada_en`: descarga, crea el cargo y aplica el anticipo. Solo entonces hay venta para Contabilidad.
- En una forma **formal**, el DTE de bienes se emite **al entregar** (Ley del IVA art. 34, M). En **servicios** el IVA nace al cobrar:
  con un anticipo de servicios en empresa inscrita, aviso y, con `libro-de-ventas.anticipos.tratamiento = factura_obligatoria`,
  rechazo (`anticipo_sin_factura`), la regla ya aprobada de §8.3 de ese diseño.

### 4.6 Comprobante interno e impresión

Con los datos, la leyenda y las prohibiciones del dictamen §3, **fijas en el código** y no editables por plantilla:

- Leyenda: «Documento de control interno. No es factura ni documento tributario. No genera crédito fiscal.»
- **No lleva**: las palabras factura, serie, DTE, autorización o certificación; IVA desglosado; NIT del emisor. El título por omisión
  es «Comprobante de venta» y el campo se valida contra esas palabras (`titulo_no_permitido`).
- Anulado: marca visible.

Plantillas: `ticket_58`, `ticket_80`, `media_carta`. PDF con `core/impresion/pdf` (VC-0d). «Compartir» genera el PDF con la Web Share
API; sin ella, descarga.

### 4.7 Doble toque y conexión inestable

En un mostrador con mala señal, el reintento es lo normal. Cada venta lleva `clave_de_idempotencia` (uuid generado por el cliente al
abrir la venta): único por empresa. Si llega dos veces, responde la venta ya creada. Vale también para pagos en caja.

## 5. Caja

### 5.1 Cajas y turnos

- **Caja**: punto de cobro de una localidad, con **una bodega** de la que descarga. Recurso **con alcance** propio
  (`accesos_a_cajas`), como los fondos: el cajero solo ve la suya.
- **Turno**: una apertura y un cierre. **Un solo turno abierto por caja** (único parcial). Toda venta y todo movimiento de efectivo
  caen en un turno abierto.
- Tiene un **responsable**, quien responde por el arqueo; quienes tengan acceso a la caja pueden vender en él (VJ-P8).

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
                  − Σ depósitos al banco
                  − Σ devoluciones en efectivo
diferencia = efectivo_contado − efectivo_esperado        (negativa = faltante)
```

Los medios que no son efectivo (tarjeta, transferencia) se suman **por medio** y se comparan con lo que el cajero declara, sin
entrar a la ecuación.

### 5.3 Arqueo y cierre

- **Arqueo**: conteo por denominación (billetes y monedas, como Caja chica). Se puede hacer a media jornada (`parcial`) sin cerrar.
- **Cierre** (`turnos.cerrar`): exige un arqueo `de_cierre`. Con diferencia, motivo obligatorio. Deja una **foto** de los totales.
  Después del cierre, el turno no recibe nada.
- **Ciego (opcional)**: con `ventas-y-caja.cierre.arqueo_ciego` (apagado por omisión), el cajero cuenta sin ver lo esperado. Es el
  control más barato contra faltantes; se deja apagado porque en un negocio de una sola persona no aporta.
- **Reabrir**: solo el último turno de la caja, con permiso, motivo y auditoría.

### 5.4 Faltantes y sobrantes

Se registran en el arqueo y viajan en el evento. **No se descuentan solos a nadie**: un descuento de salario tiene sus límites
legales (dictamen §4). `ventas-y-caja.cierre.tolerancia` define hasta cuánto no pide motivo (por omisión, Q0.00).

### 5.5 Movimientos de caja

| Tipo | Qué es | Con otros módulos |
|---|---|---|
| `ingreso` | Dinero que entra y no es venta (cambio, aporte) | — |
| `gasto` | Se paga algo con la caja | Concepto propio de caja y foto opcional |
| `compra_de_inventario` | Se compra mercadería con la caja | Orden a Inventarios: compra sin factura (§7.3) |
| `retiro` | El dueño saca dinero | Queda como retiro, no como gasto |
| `deposito` | Se lleva al banco | Con Bancos: `bancos.registrar_nota_de_origen`; sin Bancos: solo la referencia |

**Gasto de caja con factura en empresa inscrita:** el libro exige un `destino` (§1.11). V1 **no** agrega uno nuevo: se registra el
gasto en caja y un aviso sugiere registrar la factura en Libro de compras. El destino `ventas-y-caja` queda como paso VCJ-16,
porque toca un `check` de compras y a Contabilidad.

### 5.6 Varias cajas

Cada una con su turno, bodega y accesos. Mover efectivo entre cajas es **retiro** en una e **ingreso** en la otra, ligados por
`movimiento_relacionado_id`, en la misma transacción.

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
nuevo, quién recibe y firma. **Cada recibo interrumpe la prescripción** (dictamen §4), así que se conserva y no se borra.

### 6.4 Trasladar la deuda al pasar a FEL

Al regularizar con deuda (§3.7), en una sola transacción:

1. Se bloquean los cargos de control (`for update`, en orden de id).
2. Se crea el cargo del DTE, con el **vencimiento más antiguo** de los sustituidos (regularizar no le da más plazo al cliente).
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
- **Prescripción** (dictamen §4): en antigüedad y estado de cuenta, aviso cuando pasaron **2 años** (configurable) desde el último
  reconocimiento (cargo o abono): «Esta deuda podría estar prescrita si el cliente lo alega». **Nunca cancela el saldo.** El castigo ya
  aprobado tiene la causa `prescripcion`.
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
| `devolucion_de_venta` | **Entrada**, con `movimiento_de_origen_id` a la salida | El de la salida original, fijo | Ventas |
| `salida_a_produccion` | Salida | Del método | Producción |
| `entrada_de_produccion` | Entrada | Lo que calcula Producción (§8.4), fijo | Producción |

**Ninguna salida nueva usa `movimiento_de_origen_id`** (§1.6): se ligan a su origen con dos columnas nuevas en `documentos`:
`modulo_de_origen` y `documento_de_origen_id` (sin llave, como `bancos.movimientos`), con el único parcial
`(empresa_id, clase, modulo_de_origen, documento_de_origen_id) where estado = 'vigente'`, que hace **idempotente** la orden. Check:
las cuatro clases nuevas exigen las dos columnas, y las demás las dejan nulas.

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
- Aviso **solo en empresa inscrita**: «Sin factura este costo puede no ser deducible (ISR art. 21) y no da crédito fiscal. Si el
  vendedor no está inscrito, puede emitirle una factura especial desde Libro de compras».

### 7.4 Sin existencia al vender

INV-P4 (nunca negativas) **no se toca**. Pero en un mostrador, muchas veces lo vendido no se ha ingresado todavía. Opciones en VJ-P4.
La recomendada es **descarga pendiente**: la venta se guarda con `estado_de_descarga = 'pendiente'` en esa línea, el kardex no se
mueve, y queda en la bandeja **«Por descargar»**. Al ingresar la compra se procesa **con la fecha de la venta** (el recálculo hacia
adelante ya existe). El cierre del mes de Inventarios **bloquea** con descargas pendientes de ese mes: no se puede cerrar con ventas
sin costo.

### 7.5 `ReglaDeIva` (cambio a §6.8 de Inventarios, antes de INV-9)

Se quita «si la empresa no tiene datos fiscales, se asume régimen general». Queda:

| Situación | `requiere_factura` | Aviso |
|---|---|---|
| Sin NIT | `false` | Ninguno |
| Con NIT y régimen con débito | Según la tabla actual | El actual |
| Con NIT y régimen sin débito | `false` | Ninguno |
| Con NIT, sin datos fiscales o libro apagado | `false` | «Registre su régimen para saber si esto genera IVA» |

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
  (NIIF 13.13).
- **Sustitutos**: cada ingrediente puede tener otros artículos con un **factor** (1 lb de A = 0.9 lb de B) y prioridad. Se usan **solo**
  si se elige o, al vender, si el principal no alcanza.
- **Subrecetas**: un ingrediente puede ser un artículo que tiene su propia receta (salsa). Se consume **como existencia**, no se
  explota en cascada, y se rechaza un ciclo directo o indirecto (`receta_circular`).

**Costo teórico de una porción:**

```
costo_porcion = ( Σ cantidad_ingrediente × (1 + merma) × costo_vigente + mano_de_obra + indirectos ) ÷ rendimiento
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

**Recomendado: A**, a validar con el contador (§22, C-2). La NIIF 13.16 admite costo estándar «si se aproxima al real», y la variación
queda a la vista en el reporte.

### 8.6 Venta directa de un platillo (al vender)

Ventas pide `produccion.consumo_para_venta { articuloId, cantidad, ventaId }`. Producción responde los renglones (ingredientes × cantidad ÷
rendimiento × (1 + merma), con sustitutos si el principal no alcanza) y anota `consumos_por_venta` con la versión usada. Ventas manda
**una sola** orden `registrar_salida_por_venta` con todos los renglones de la venta.

Sin Producción activa, un producto con `descarga = 'receta'` responde `requiere_produccion` y la pantalla de Productos no ofrece esa
opción.

## 9. Datos de Ventas y caja (esquema `ventas_y_caja`)

Toda tabla lleva `empresa_id` (FK `core.empresas` on delete cascade), `politicaPorEmpresa()`, `...marcasDeTiempo` y `...autoria`. Llaves
compuestas con `empresa_id` hacia el único `<tabla>_id_empresa_unico (id, empresa_id)`, **un índice por llave**, `no action` salvo donde se
dice. Dinero `numeric(14,2)`; cantidades `numeric(14,4)` en la unidad del producto. Anulación completa = `estado`, `anulado_en`,
`anulado_por`, `motivo_de_anulacion` (1–300), con el check `(estado = 'anulada') = (los tres no nulos)`.

**RLS con alcance por caja:** `cajas` usa `politicasDelRegistroConAlcance`; `accesos_a_cajas`, `politicasDeTablaDeAccesos`; `turnos`, `arqueos`,
`movimientos_de_caja`, `ventas`, `pagos_de_venta`, `formas_por_caja`, con `politicaPorAlcance` sobre `caja_id`. `lineas_de_venta` lleva solo la
política por empresa y **se lee siempre unida a su venta** (la misma regla que `movimientos` en Inventarios). Los catálogos, solo por empresa.

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
| `titulo_del_comprobante` | text | no | `default 'Comprobante de venta'`; 1–40 |
| `plantilla` | text | no | `in ('ticket_58', 'ticket_80', 'media_carta')` |
| `admite_credito` | boolean | no | `default false` |
| `prefijo` | text | sí | 1–6, `^[A-Z0-9-]+$`; solo para mostrar el correlativo interno |

El correlativo vive en `core.correlativos` con la clave `ventas-y-caja.formas.<id>` (sin huecos). Índice `(empresa_id, activa)`.

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
| `clase_fiscal` | text | no | `default 'gravada'`; `in ('gravada', 'exenta')`. Solo se usa en formas formales |
| `foto_archivo_id` | uuid | sí | FK `core.archivos` |
| `activo` | boolean | no | `default true` |

`componentes_de_combo`: `combo_id`, `producto_id` (FK compuestas; check distintos), `cantidad > 0`; un componente no puede ser combo (dominio).
`menus_del_dia`: `fecha`, `nombre`, `activo`; único `(empresa_id, fecha, nombre)`. `renglones_de_menu`: `menu_id`, `producto_id`, `precio_del_dia` nulo, `cupo` nulo.

### 9.5 `turnos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id`, `caja_id` | uuid | no | FK compuesta |
| `numero`, `anio_de_numero` | integer | no | Correlativo `ventas-y-caja.turnos` |
| `responsable_id` | uuid | no | FK `core.usuarios` |
| `abierto_en`, `cerrado_en` | timestamptz | no, sí | |
| `fecha_de_operacion` | date | no | En la zona de la empresa, al abrir |
| `fondo_inicial` | numeric(14,2) | no | `>= 0` |
| `estado` | text | no | `in ('abierto', 'cerrado')`; `(estado = 'cerrado') = (cerrado_en is not null)` |
| `foto_de_cierre` | jsonb | sí | Totales por medio, forma y clase; `(estado = 'cerrado') = (no nula)` |

Único parcial `turnos_uno_abierto (caja_id) where estado = 'abierto'`. Índice `(empresa_id, fecha_de_operacion)`.

**Concurrencia:** registrar una venta toma `for share` del turno y cerrar toma `for update`; así ninguna venta entra a un turno que se está cerrando.

### 9.6 `arqueos`

Como `caja_chica.arqueos`: `turno_id`, `clase in ('parcial', 'de_cierre')`, `realizado_en`, `arqueado_por`, `conteo jsonb` (array), `efectivo_contado`, `efectivo_esperado`,
`diferencia` con check `= contado − esperado`, `otros_medios jsonb`, `motivo_de_diferencia` (obligatorio fuera de la tolerancia: dominio), `era_ciego boolean`, anulación completa.
Único parcial `(turno_id) where clase = 'de_cierre' and estado = 'vigente'`.

### 9.7 `movimientos_de_caja`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id`, `turno_id`, `caja_id` | uuid | no | FK compuestas; el `caja_id` para RLS |
| `numero`, `anio_de_numero` | integer | no | Correlativo `ventas-y-caja.movimientos` |
| `tipo` | text | no | `in ('ingreso', 'gasto', 'compra_de_inventario', 'retiro', 'deposito', 'abono_de_cartera', 'devolucion')` |
| `medio_id` | uuid | no | FK compuesta |
| `monto` | numeric(14,2) | no | `> 0`; el signo lo da el tipo |
| `concepto_id` | uuid | sí | FK compuesta; obligatorio en `ingreso` y `gasto` |
| `descripcion`, `referencia` | text | sí | 1–200, 1–60 |
| `foto_archivo_id` | uuid | sí | FK `core.archivos`, `recurso_dueno = 'ventas-y-caja.movimientos'` |
| `movimiento_de_banco_id` | uuid | sí | FK `bancos.movimientos`; solo en `deposito` |
| `cobro_id` | uuid | sí | FK `cuentas_por_cobrar.cobros`; `(tipo = 'abono_de_cartera') = (no nulo)` |
| `documento_de_inventario_id` | uuid | sí | FK compuesta a `inventarios.documentos`; solo en `compra_de_inventario` |
| `movimiento_relacionado_id` | uuid | sí | Autorreferencia (entre cajas, reverso) |
| `clave_de_idempotencia` | uuid | sí | Único parcial por empresa |
| `estado` + anulación completa | | | `vigente`/`anulado` |

Índices: `(turno_id, tipo)`, `(empresa_id, creado_en)`. El pago inicial de una venta mixta **no** crea movimiento `abono_de_cartera`: ya está en `pagos_de_venta`, y contarlo en los dos descuadraría el turno.

### 9.8 `ventas`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK; `ventas_id_empresa_unico` |
| `clave_de_idempotencia` | uuid | no | Único `(empresa_id, clave_de_idempotencia)` |
| `caja_id`, `turno_id` | uuid | no | FK compuestas |
| `forma_id` | uuid | no | FK compuesta |
| `clase` | text | no | `in ('formal', 'control')`; **copiada** de la forma |
| `numero`, `anio_de_numero` | integer | no | Correlativo de la forma; único `(empresa_id, forma_id, anio_de_numero, numero)` |
| `vendida_en` | timestamptz | no | |
| `fecha` | date | no | En la zona de la empresa |
| `entrega` | text | no | `in ('entregada', 'pendiente')` |
| `entregada_en` | timestamptz | sí | `(entrega = 'entregada') = (no nula)`: la **fecha real de entrega** |
| `cuenta_id` | uuid | no | `default deLaTransaccion.cuenta()`; solo para la llave del cliente |
| `cliente_id` | uuid | sí | FK compuesta a `terceros.clientes (id, cuenta_id)`. Nulo = «Cliente de mostrador» |
| `nombre_del_cliente` | text | no | Copiado; `'Cliente de mostrador'` sin cliente |
| `nit_receptor` | text | sí | Solo en formal |
| `condicion` | text | no | `in ('contado', 'credito', 'mixto')`; check: `credito` y `mixto` exigen `cliente_id` |
| `subtotal`, `descuento`, `total` | numeric(14,2) | no | `total = subtotal − descuento`; `total > 0`; `descuento >= 0` |
| `costo_total` | numeric(14,2) | sí | Lo que respondió Inventarios; nulo sin descarga |
| `moneda`, `tipo_de_cambio` | char(3), numeric(16,8) | no | FK `core.monedas`, `default 'GTQ'`, 1. Check GTQ en v1 (`solo_quetzales_por_ahora`) |
| `inscrita_al_vender` | boolean | no | Foto de §3.9 |
| `motivo_de_control` | text | sí | Lista de §3.8; check `clase = 'control' or nulo`. Con VJ-P1 a: `not (clase = 'control' and inscrita_al_vender and motivo is null)` |
| `motivo_de_control_texto` | text | sí | 1–200; obligatorio con `otro` |
| `dte_externo` | text | sí | 1–80; obligatorio con `fel_externa` |
| `regimen_iva`, `regimen_isr` | text | sí | Copiados del mes |
| `foto_fiscal` | jsonb | no | §3.6; check `jsonb_typeof = 'object'` y hasta 8 KB |
| `estado_fiscal` | text | no | `in ('no_aplica', 'por_certificar', 'en_contingencia', 'certificado', 'aceptado', 'transcrito', 'rechazado')`; check: `clase = 'control'` ⇔ `no_aplica` |
| `autorizacion_fel` | uuid | sí | Único parcial por empresa |
| `serie_dte`, `numero_dte` | text | sí | Del DTE |
| `fecha_dte` | date | sí | Fecha del DTE, separada de la entrega |
| `documento_de_libro_id` | uuid | sí | FK compuesta a `libro_de_ventas.documentos`; solo `formal` |
| `cargo_id` | uuid | sí | FK a `cuentas_por_cobrar.documentos`; el cargo vigente **original** de la venta |
| `documento_de_inventario_id` | uuid | sí | FK compuesta a `inventarios.documentos` |
| `vendida_por` | uuid | no | FK `core.usuarios` |
| `estado` + anulación completa + `fecha_de_anulacion` | | | `vigente`/`anulada` |

Índices: `(empresa_id, fecha, clase)`, `(turno_id)`, `(empresa_id, cliente_id, fecha)`, `(empresa_id, estado_fiscal) where estado_fiscal in ('por_certificar', 'en_contingencia', 'rechazado')`,
`(empresa_id, entrega) where entrega = 'pendiente'` y `(empresa_id, motivo_de_control, fecha) where clase = 'control'`.

### 9.9 `lineas_de_venta`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id`, `venta_id` | uuid | no | FK compuesta **on delete no action** (no se borran) |
| `orden` | smallint | no | Único `(venta_id, orden)` |
| `producto_id` | uuid | no | FK compuesta |
| `linea_de_combo_id` | uuid | sí | Autorreferencia: el componente apunta a la línea del combo |
| `descripcion` | text | no | Copiada |
| `tipo`, `descarga` | text | no | Copiados del producto |
| `articulo_id` | uuid | sí | FK compuesta a `inventarios.articulos`; copiado |
| `cantidad` | numeric(14,4) | no | `> 0` |
| `precio_unitario`, `descuento`, `total` | numeric(14,2) | no | Check `total = round(cantidad × precio, 2) − descuento`; los componentes llevan su parte del combo |
| `descuento_dado_por` | uuid | sí | Con `descuento > 0` |
| `clase_fiscal`, `concepto_de_ingreso_id` | text, uuid | sí | Copiados, en formal |
| `costo` | numeric(14,2) | sí | Solo con `ventas-y-caja.costos.ver` en el DTO |
| `estado_de_descarga` | text | no | `in ('no_aplica', 'pendiente', 'hecha', 'revertida')` |

Índices: `(producto_id)`, `(empresa_id, estado_de_descarga) where estado_de_descarga = 'pendiente'`, `(articulo_id) where articulo_id is not null`.

### 9.10 `pagos_de_venta`

`venta_id`, `caja_id`, `turno_id`, `medio_id`, `monto > 0`, `recibido` (efectivo entregado), `vuelto` (check `vuelto = recibido − monto` y `>= 0` si hay `recibido`), `referencia`, `cobro_id` (FK a `cuentas_por_cobrar.cobros`, en
mixto o anticipo), `vigente`. Índices `(venta_id)`, `(turno_id, medio_id) where vigente`.

### 9.11 `regularizaciones` y `regularizacion_ventas`

`regularizaciones`: `numero`, `anio_de_numero`, `forma_id` (la formal), `fecha`, `documento_de_libro_id` (FK compuesta, **único**), `total`, `autorizacion_fel`, anulación completa.
`regularizacion_ventas`: `regularizacion_id`, `venta_id`, `monto`; único parcial `(venta_id) where vigente`. Check en dominio: `Σ monto = total`.

### 9.12 Migraciones

`npm run generar -- modulo ventas-y-caja --nombre "Ventas y caja" --icono ShoppingCart` crea el esqueleto. `0001_vcj1_catalogos` (con auditoría permanente), `0002_vcj2_cajas_y_turnos`,
`0003_vcj3_ventas`, `0004_vcj4_movimientos_de_caja`, `0005_vcj8_credito` (las llaves a la cartera), `0006_vcj9_regularizaciones`. **Sin datos que convertir.** Auditoría permanente:
`ventas-y-caja.ventas`, `.turnos`, `.arqueos`, `.formas`, `.regularizaciones`, con el motivo «Conservación de libros y documentos (Código de Comercio art. 382; Código Tributario, por confirmar)».

## 10. Datos de Producción (esquema `produccion`)

Mismas convenciones. RLS por empresa. **Las órdenes llevan además la política de alcance por bodega** (`politicaPorAlcanceOpcional(ALCANCE_DE_BODEGAS, 'bodega_de_insumos_id')`): el bodeguero no produce con una bodega que no ve.

| Tabla | Columnas principales | Reglas |
|---|---|---|
| `recetas` | `nombre`, `articulo_id` (FK compuesta a `inventarios.articulos`), `activa` | Único parcial `(empresa_id, articulo_id) where activa` |
| `versiones_de_receta` | `receta_id`, `version int`, `estado in ('borrador', 'vigente', 'reemplazada')`, `vigente_desde date`, `rendimiento numeric(14,4) > 0`, `unidad_de_rendimiento_id`, `mano_de_obra`, `indirectos` (numeric(14,2) `default 0`), `notas` | Único `(receta_id, version)`; único parcial `(receta_id) where estado = 'vigente'`; no se edita si tiene usos |
| `ingredientes` | `version_id`, `orden`, `articulo_id`, `cantidad numeric(14,4) > 0`, `unidad_id`, `cantidad_base` (en la unidad base del artículo), `merma_porcentaje numeric(5,2)` 0–99.99, `opcional boolean` | Único `(version_id, articulo_id)`; el artículo no es el producido |
| `sustitutos` | `ingrediente_id`, `articulo_id`, `factor numeric(10,4) > 0`, `prioridad smallint` | Único `(ingrediente_id, articulo_id)` |
| `ordenes` | `numero`, `anio_de_numero`, `version_id`, `fecha`, `bodega_de_insumos_id`, `bodega_de_terminado_id`, `cantidad_planeada`, `cantidad_producida`, `mano_de_obra`, `indirectos`, `costo_total`, `documento_de_consumo_id`, `documento_de_entrada_id` (FK compuestas a `inventarios.documentos`), `estado in ('abierta', 'terminada', 'anulada')` + anulación | `(estado = 'terminada') = (producida y los dos documentos no nulos)`. Índice `(empresa_id, fecha, estado)` |
| `consumos_de_orden` | `orden_id`, `ingrediente_id` (nulo si se agregó), `articulo_id`, `es_sustituto`, `cantidad_teorica`, `cantidad_real`, `costo` | Único `(orden_id, articulo_id)` |
| `variaciones_de_orden` | `orden_id`, `documento_id`, `diferencia` numeric(14,2), `causa`, `registrada_en` | Solo se agrega; la llena la escucha de `costo_recalculado` |
| `consumos_por_venta` | `venta_id` (**sin llave**: Ventas no es dependencia), `linea_de_venta_id`, `version_id`, `cantidad`, `vigente` | Único parcial `(linea_de_venta_id) where vigente` |

Migraciones: `0001_rec1_recetas`, `0002_rec3_ordenes`, `0003_rec5_consumos_por_venta`. Auditoría permanente: `produccion.ordenes`.

## 11. Reglas principales (un caso de uso por acción)

### 11.1 Registrar una venta (`RegistrarVenta`, `ventas.crear`)

En una transacción:

1. Idempotencia: si existe la clave, responde esa venta.
2. Turno abierto de la caja (`for share`); forma activa y permitida para esa caja y usuario (§3.3); con forma de control, además `ventas.vender-control`.
3. Reglas de la forma (§3.5) y del motivo (§3.8); precios, descuentos (§4.3), condición (§4.4), límite de crédito (§6.5).
4. Correlativo de la forma. Guarda venta, líneas, pagos y foto.
5. Si `entrega = 'entregada'`: arma los renglones (existencia, receta o componentes), manda `inventarios.registrar_salida_por_venta` y guarda el costo. Sin existencia: según VJ-P4.
6. Si es a **crédito o mixto, de control**: `cuentas-por-cobrar.recibir_venta_de_control`; lo pagado va como cobro `caja`, con su recibo de pago.
7. **Formal con `transcrito`**: valida el DTE escrito y manda `libro-de-ventas.registrar_documento`, en esta misma transacción. **Formal con `certificador`**: queda `por_certificar` (§16.2).
8. Publica `ventas-y-caja.venta_registrada` dentro de la unidad de trabajo (`PublicadorDeEventos`).

### 11.2 Anular una venta (`AnularVenta`, `ventas.anular`)

| Situación | Qué pasa |
|---|---|
| Turno **abierto**, sin abonos posteriores | Anula con motivo: revierte kardex (`anular_documento_de_origen`), pagos, cargo y receta. El efectivo sale del esperado |
| Turno **cerrado** | Exige `ventas.anular-turno-cerrado`. El dinero devuelto es un movimiento `devolucion` en el **turno abierto** de hoy: **el turno cerrado no se toca** |
| Con abonos a su cargo | Rechaza (`venta_con_abonos`, con los recibos): primero se anulan los recibos |
| Mes de inventario **cerrado** | No se puede anular el documento: se registra `devolucion_de_venta` con fecha de hoy, si la mercadería volvió. Si no volvió, la venta se anula sin entrada y el costo queda en resultados con aviso |
| **Formal** | No se anula aquí sola. Va al adaptador (anulación firmada, art. 9) o, si está fuera de plazo, pide **nota de crédito** (V-11 de ventas). Anula en Libro con `documento_por_anular` |
| Ya **regularizada** | Rechaza: se anula primero la regularización |

### 11.3 Otros casos de uso

- **Anular regularización**: anula el documento del libro (con su regla) y **deshace el traslado** de la cartera (§6.4 al revés). Rechaza si el cargo del DTE recibió abonos después.
- **Devolución parcial** (VCJ-14): `devoluciones_de_venta` con sus líneas. En formal exige nota de crédito.
- **Cerrar turno**: `for update`; pagos, gastos y arqueo. Rechaza con ventas `por_certificar` del turno **solo si** llevan más que el plazo configurado; si no, avisa.
- **Procesar descargas pendientes** (`ventas.descargar-pendientes`): por línea o todas; con la fecha de la venta.
- **Recibir un abono en caja** (`pagos.recibir`): movimiento `abono_de_cartera` + orden `cuentas-por-cobrar.registrar_cobro_de_caja`; aplicado a lo más viejo o a elección. Un cajero **no necesita** `cuentas-por-cobrar.cobros.crear`: el permiso lo exige la ruta de origen (ARQUITECTURA §4.8).

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
| `condiciones_de_cliente` | `es_trabajador boolean default false`, `autorizacion_de_descuento_archivo_id` (FK `core.archivos`, nula) |

**Regla sobre anular cobros `caja`:** `AnularCobro` directo los rechaza (`cobro_de_caja`, «Anúlelo desde Caja»), para que el efectivo del turno y la cartera no se desencuadren. Ventas lo anula con la orden `cuentas-por-cobrar.anular_cobro_de_caja`.

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
| `libro-de-ventas.registrar_documento` | Libro de ventas | La orden que §20 de ese diseño dejó «a definir»: tipo, DTE, cliente, líneas, `destino`, `sustituyeCargos?` → `{ documentoId }` |
| `bancos.registrar_nota_de_origen` | Bancos | Ya existe: depósito del turno |

`DocumentoDeVentaParaDestino` suma el opcional `sustituyeCargos: string[]`: `RecibirDocumento` aplica §6.4 si viene.

### 13.2 Avisos y preguntas

| Mensaje | Quién | Para qué |
|---|---|---|
| `libro-de-ventas.documento_por_anular` / `_por_eliminar` | Ventas escucha | Rechaza si el documento viene de una venta vigente («Anúlelo desde Ventas») |
| `bancos.movimiento_por_cambiar` | Ventas escucha | Rechaza cambios a un depósito del turno |
| `inventarios.documento_por_anular` (nuevo) | Ventas y Producción escuchan | Impide anular desde Inventarios un documento con origen |
| `empresas.revisar_cierre_de_carga` | Ventas responde | Turnos abiertos antes de la fecha de corte |
| `inventarios.revisar_cierre_del_mes` (pregunta nueva) | Ventas responde | **Bloquea** con descargas pendientes del mes (§7.4) |

### 13.3 Eventos (dinero en centavos; por `PublicadorDeEventos`)

| Evento | Datos propios |
|---|---|
| `ventas-y-caja.venta_registrada` | Clase, forma, condición, `entrega`, líneas, medios, cliente, régimen, inscrita, motivo |
| `ventas-y-caja.venta_entregada` | `ventaId`, fecha, costo |
| `ventas-y-caja.venta_anulada` | Lo que revierte, `fechaDeAnulacion` |
| `ventas-y-caja.venta_regularizada` / `regularizacion_anulada` | Ventas, documento del libro, montos |
| `ventas-y-caja.movimiento_de_caja_registrado` / `_anulado` | Tipo, medio, concepto, monto |
| `ventas-y-caja.turno_cerrado` / `turno_reabierto` | Totales, diferencia |
| `produccion.orden_terminada` / `orden_anulada` | Consumos, entrada, mano de obra, indirectos |
| `produccion.variacion_registrada` | Orden, diferencia |

## 14. Permisos, auditoría, errores y configuración

### 14.1 Permisos (PLAN §3.5; ninguno `soloSuperacceso`)

| Recurso | Permisos |
|---|---|
| Formas | `ventas-y-caja.formas.ver`, `.crear`, `.editar`, `.eliminar`, **`.gestionar-control`** (crear o editar formas sin FEL en empresa inscrita, VJ-P10) |
| Productos | `ventas-y-caja.productos.ver`, `.crear`, `.editar`, `.eliminar`, `.importar`, `.exportar` |
| Menú del día | `ventas-y-caja.menus.ver`, `.crear`, `.editar`, `.eliminar` |
| Medios y conceptos | `ventas-y-caja.medios-de-pago.*`, `ventas-y-caja.conceptos-de-caja.*` (`ver`, `crear`, `editar`, `eliminar`, `importar`, `exportar`) |
| Cajas | `ventas-y-caja.cajas.ver`, `.ver-todas`, `.crear`, `.editar`, `.eliminar`, `.asignar`, `.importar`, `.exportar` |
| Turnos | `ventas-y-caja.turnos.ver`, `.abrir`, `.cerrar`, `.reabrir` |
| Arqueos | `ventas-y-caja.arqueos.ver`, `.crear`, `.anular` |
| Movimientos de caja | `ventas-y-caja.movimientos.ver`, `.crear`, `.anular`, `.depositar` |
| Ventas | `ventas-y-caja.ventas.ver`, `.crear`, **`.vender-control`**, `.credito`, `.descontar`, `.exceder-limite`, `.anular`, `.anular-turno-cerrado`, `.descargar-pendientes` |
| Costos | `ventas-y-caja.costos.ver` |
| Pagos en caja | `ventas-y-caja.pagos.recibir`, `.anular` |
| Regularización | `ventas-y-caja.regularizaciones.ver`, `.crear`, `.anular` |
| Reportes | `ventas-y-caja.reportes.ver`, **`.ver-control`**, `.exportar` |
| Recetas | `produccion.recetas.ver`, `.crear`, `.editar`, `.eliminar`, `.importar`, `.exportar` |
| Órdenes | `produccion.ordenes.ver`, `.crear`, `.terminar`, `.anular` |
| Costos y reportes | `produccion.costos.ver`, `produccion.reportes.ver`, `.exportar` |

- `recursosConAlcance`: `ventas-y-caja.cajas` (`ALCANCE_DE_CAJAS`, `.ver-todas`, `.asignar`).
- Un permiso propio de costos porque el módulo no puede depender de que `inventarios.costos.ver` signifique lo mismo: sin él, los DTO **no** traen costo ni margen.
- **`reportes.ver-control` no se puede quitar para ocultar**: las ventas de control siguen en todos los totales. Sirve para dar el detalle a un contador externo sin darle más.
- Un rol «Cajero» de fábrica no se crea: PLAN §3.5 no depende de tipos de rol.

### 14.2 Auditoría (en la unidad de trabajo; `core.auditoria` solo se agrega)

| Caso de uso | `recurso` | `accion` | `anterior` |
|---|---|---|---|
| Inactivar, reactivar, eliminar catálogos | `ventas-y-caja.<plural>`, `produccion.recetas` | `inactivar` / `reactivar` / `eliminar` | DTO |
| Cambiar la configuración FEL, el crédito o las cajas de una forma | `ventas-y-caja.formas` | `configurar` | DTO anterior |
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

### 14.3 Errores nuevos (código propio, familias del core)

`forma_no_permitida`, `forma_inactiva`, `forma_con_ventas`, `forma_formal_sin_libro`, `dte_no_corresponde_al_regimen`, `motivo_de_control_obligatorio`, `dte_externo_obligatorio`, `titulo_no_permitido`, `turno_no_abierto`,
`turno_ya_abierto`, `turno_con_arqueo_pendiente`, `solo_se_reabre_el_ultimo_turno`, `venta_repetida`, `venta_sin_precio`, `venta_con_abonos`, `venta_regularizada`, `venta_no_entregada`, `credito_sin_cliente`, `credito_no_disponible`,
`limite_de_credito_excedido`, `descuento_sin_permiso`, `pago_no_cuadra`, `regularizacion_no_cuadra`, `regularizacion_de_clientes_distintos`, `usuario_sin_bodega_de_la_caja`, `requiere_libro_de_compras`, `requiere_produccion`,
`producto_sin_concepto`, `cobro_de_caja`, `receta_circular`, `version_en_uso`, `orden_no_abierta`.

### 14.4 Configuración (solo `instalacion` y `empresa`)

| Clave | Nivel | Por omisión | Para qué |
|---|---|---|---|
| `ventas-y-caja.descuentos.tope_sin_permiso` | empresa | `0` | Porcentaje que cualquiera puede descontar |
| `ventas-y-caja.inventario.sin_existencia` | empresa | Según VJ-P4 | `bloquear` o `descarga_pendiente` |
| `ventas-y-caja.credito.al_exceder_limite` | empresa | Según VJ-P7 | `avisar`, `pedir_permiso` o `bloquear` |
| `ventas-y-caja.cierre.arqueo_ciego` | empresa | `false` | §5.3 |
| `ventas-y-caja.cierre.tolerancia` | empresa | `0.00` | Diferencia sin motivo |
| `ventas-y-caja.control.tope_de_venta_menor` | instalación | `50` | Motivo `consolidar_al_cierre`: ventas menores a este monto en pequeño contribuyente (Ley del IVA art. 49) |
| `ventas-y-caja.fel.horas_de_contingencia` | instalación | `null` | **No se programa fijo** (dictamen §2.4); se llena al confirmar la Documentación Técnica FEL. Con `null`, el sistema avisa y no calcula vencimiento |
| `cuentas-por-cobrar.prescripcion.anios_de_aviso` | empresa, instalación | `2` | §6.5 |
| `produccion.recetas.incluir_mano_de_obra` | empresa | `false` | Muestra los campos de mano de obra e indirectos |

## 15. Reportes y Excel

### 15.1 Reportes (sección Reportes: imprimir y exportar)

| Módulo | Reporte | Contenido |
|---|---|---|
| Ventas | **Ventas del período** | Por día, forma, clase, caja, vendedor; filtro **formal / control / todas** |
| Ventas | **Ventas de control** | Motivo, antigüedad, estado (pendiente, regularizada, FEL externa); no se puede apagar |
| Ventas | **Conciliación con el Libro de ventas** | §15.2 |
| Ventas | **Ventas por producto** | Cantidad, ingreso, costo y margen (con `costos.ver`) |
| Ventas | **Cierres de caja** | Por turno: esperado, contado, diferencia, por medio |
| Ventas | **Faltantes y sobrantes** | Por caja y responsable |
| Ventas | **Movimientos de caja** | Gastos, retiros, depósitos |
| Ventas | **Por descargar** y **Pedidos sin entregar** | Antigüedad |
| Ventas | **Descuentos y anulaciones** | Quién, cuánto y por qué: es el control antifraude del mostrador |
| Cartera | **Antigüedad, saldos, estado de cuenta, cobros** | Los de CXC-7, con la columna «Clase» y el aviso de prescripción |
| Producción | **Costo de recetas** | Costo por porción y margen |
| Producción | **Real contra teórico** | Por orden, ingrediente y período; con las ventas al vender, contra el conteo físico |
| Producción | **Rendimiento y variaciones** | Producido contra planeado |

### 15.2 Conciliación mensual

```
Ventas registradas del mes (entregadas)
  = A. Formales                                  → en el libro
  + B. De control ya regularizadas               → en el libro, por su DTE
  + C. De control con FEL externa                → se cruza por autorización con el libro
  + D. De control pendientes                     → NO están en el libro: se listan
Documentos del libro sin venta en Ventas (E)     → informativo (facturas manuales o de la bandeja)
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
| Operación | **Recibir pago** | Cliente → qué debe → monto («a lo más viejo») → recibo(s) |
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
| `GET/POST /ventas-y-caja/formas`, `PUT …/:id`, `POST …/:id/inactivar` y `/reactivar`, `DELETE …/:id`, `GET …/exportar` | `formas.*` (`.gestionar-control` si queda sin FEL y la empresa tiene NIT) |
| CRUD de `/productos`, `/medios-de-pago`, `/conceptos-de-caja`, `/cajas`, `/menus`, con Excel | Los de cada recurso; accesos con `cajas.asignar` |
| `GET /ventas-y-caja/mostrador/:cajaId` (formas, productos, menú, turno) | `ventas.crear` |
| `GET/POST /ventas-y-caja/ventas`, `GET …/:id`, `GET …/:id/comprobante`, `POST …/:id/entregar`, `POST …/:id/anular` | `ventas.*` |
| `POST /ventas-y-caja/ventas/descargar-pendientes` | `ventas.descargar-pendientes` |
| `POST /ventas-y-caja/pagos`, `POST …/:id/anular` | `pagos.*` |
| `GET/POST /ventas-y-caja/turnos`, `POST …/:id/cerrar`, `/reabrir`, `GET/POST …/:id/arqueos`, `POST /ventas-y-caja/arqueos/:id/anular` | `turnos.*`, `arqueos.*` |
| `GET/POST /ventas-y-caja/movimientos`, `POST …/:id/anular`, `POST …/:id/foto` | `movimientos.*` |
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

`certificado` **no es estado final**: el DTE solo vale si la SAT lo acepta (art. 7, M). La **contingencia** (`en_contingencia`) guarda la prueba de la falla (arts. 2 lit. g y 5); su plazo es configuración (§14.4).

## 17. Integración futura con Contabilidad

Contabilidad escucha los eventos de §13.3 con el mecanismo CT-0 (registro de eventos). Roles nuevos en su catálogo: `ingresos_por_ventas` (por concepto o tipo de producto), `costo_de_ventas` (tipo de inventario), `clientes` (ya previsto con la cartera),
`anticipos_de_clientes`, **`iva_pendiente_de_documentar`** (pasivo), `caja_de_ventas` (por caja), `faltantes_de_caja`, `sobrantes_de_caja`, `variacion_de_produccion`, `consumo_sin_concepto`, `produccion_absorbida`.

| Hecho | Debe | Haber |
|---|---|---|
| Venta **entregada**, de control, régimen general | Caja o Clientes | Ingresos por `precio ÷ 1.12` + **IVA pendiente de documentar** por `precio ÷ 1.12 × 0.12` |
| Igual, sin débito (pequeño contribuyente, sin inscripción) | Caja o Clientes | Ingresos por el total |
| Venta formal | La hace el evento del Libro de ventas | (no se duplica) |
| Regularizar | IVA pendiente de documentar | IVA débito: el ingreso no se mueve |
| Costo, al entregar | Costo de ventas | Inventario |
| Pedido con anticipo | Caja | Anticipos de clientes |
| Faltante / sobrante | Faltantes / Caja | Caja / Sobrantes |
| Orden terminada | Inventario (terminado) | Inventario (insumos) + Producción absorbida |

**Ojo con la doble partida de lo formal**: Ventas publica su evento y el Libro el suyo. La regla de `venta_registrada` **ignora las formales** en ingreso e IVA y solo toma el costo y la caja. Prueba obligatoria.

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
| A-8 | Mismo diseño de ventas, §7.4 | Al importar la bandeja, un DTE **transcrito desde Ventas** se liga al documento existente por `autorizacion_fel`, en vez de dar `documento_repetido` | No | LV-4 |

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
| R-12 | Módulo apagado con datos | Las tablas quedan. Apagar la cartera con saldos: `validarDesactivacion` **no** lo impide porque no es `dependeDe`. Ventas deja de ofrecer crédito y muestra «Hay saldos de clientes: active Cuentas por cobrar para cobrarlos». Los saldos no se pierden |
| R-13 | Teórico que nunca se compara con lo real (al vender) | Reporte de real contra teórico con los conteos; aviso si pasan N días sin conteo de los ingredientes |
| R-14 | Reimpresión usada para engañar | Dice «Reimpresión» y queda en auditoría |
| R-15 | Recursos de auditoría permanente | Declarados en las migraciones de cada módulo |

## 20. Pasos (un commit cada uno; servidor y cliente por separado, con pruebas)

**Se puede empezar sin esperar a Cuentas por cobrar:** VCJ-0a a VCJ-7 y todo REC. Solo el crédito (VCJ-8) y lo que viene después esperan a CXC-3b.

| Paso | Qué | Quién | Depende de | Espera del usuario |
|---|---|---|---|---|
| **VCJ-0a** | Core: `usaTablasDe` en la definición, migrador, verificación y prueba de llaves; pruebas de orden y de activación | backend | — | — |
| **VCJ-0b** | Inventarios sin `dependeDe`: rutas de recepción con `requiere_libro_de_compras`, destino `consumo_interno` y su migración, prueba de punta a punta con el libro apagado | backend | VCJ-0a, INV-8 unido | VJ-P3 no bloquea |
| VCJ-0c | Cliente de Inventarios con el libro apagado (ocultar bandeja y concepto, destino nuevo) | frontend | VCJ-0b, INV-5c | — |
| **VCJ-1** | Esqueleto, `0001`, configuración, formas de venta (solo control), medios, conceptos, productos con combos y Excel; pruebas de checks | backend | VCJ-0b | VJ-P10 |
| VCJ-1c | Formas, Productos, Medios, Conceptos | frontend | VCJ-1 | — |
| **VCJ-2** | Cajas con alcance, accesos, turnos, abrir y cerrar; pruebas de RLS con dos cajeros y de un solo turno abierto | backend | VCJ-1 | VJ-P8 |
| VCJ-2c | Cajas, abrir turno | frontend | VCJ-2 | — |
| **VCJ-3** | Inventarios: clases de venta, columnas de origen, órdenes de salida, devolución y anulación, idempotencia; prueba de que el motor no las toma como devolución a proveedor | backend | VCJ-0b | — |
| **VCJ-4** | `RegistrarVenta` de contado de control: idempotencia, correlativo, descuentos, motivo, foto; `AnularVenta` en turno abierto; pruebas de concurrencia | backend | VCJ-2, VCJ-3 | VJ-P1, VJ-P3, VJ-P4 |
| VCJ-4c | **Mostrador** en celular, comprobante, compartir | frontend | VCJ-4 | — |
| **VCJ-5** | Movimientos de caja, arqueos, cierre, reabrir, compra sin factura (causa, proveedor libre, foto; revisión de `seguridad` del archivo) | backend | VCJ-4 | — |
| VCJ-5c | Caja: movimientos, arqueo, cierre | frontend | VCJ-5 | — |
| **VCJ-6** | Menú del día; bandeja «Por descargar» y la pregunta al cierre de Inventarios | backend + frontend | VCJ-4, INV-8 | VJ-P4 |
| **VCJ-7** | Reportes de ventas, caja y ventas de control | backend + frontend | VCJ-5 | — |
| **CXC-A** | Adenda A-2 **dentro** de CXC-1 a CXC-3 (dependencias, origen `venta_de_control`, forma `caja`, recibo de pago, `sustituido`); se llama **CXC-3b** lo que completa cobro en caja y recibo | backend | CXC-1 a CXC-3 | — |
| **VCJ-8** | Crédito y mixto, abonos en caja, recibos de pago, pedidos con anticipo y entrega | backend + frontend | CXC-3b, VCJ-5 | VJ-P7 |
| **VCJ-9** | Forma formal `transcrito`, `registrar_documento`, regularización y traslado de deuda; conciliación | backend + frontend | VCJ-8, LV-3, CXC-4 | VJ-P2 |
| **VCJ-10** | Depósito de turno con Bancos | backend + frontend | VCJ-5, VC-0b | — |
| **VCJ-11** | Avisos de prescripción y estado de cuenta con clase | backend + frontend | VCJ-8, CXC-7 | — |
| VCJ-12 | Eventos y reglas de Contabilidad | backend | VCJ-9, CT-3 | — |
| VCJ-13 | Trabajadores (autorización, marca) | backend + frontend | VCJ-8 | VJ-P6 |
| VCJ-14 | Devolución parcial | backend + frontend | VCJ-9 | — |
| VCJ-15 | Reconocimiento de deuda imprimible; intereses (si VJ-P5 = b) | backend + frontend | VCJ-8 | VJ-P5 |
| VCJ-16 | (Después) Destino `ventas-y-caja` en Libro de compras para gastos de caja con factura | backend + frontend | VCJ-5 | — |
| VCJ-17 | (Después) Forma con `certificador` y bandeja «Por certificar», cuando exista `facturacion-fel` | backend + frontend | Módulo FEL | VC-P4 (certificador) |
| VCJ-QA | Punta a punta: negocio sin NIT → venta de control → fiado → abono con recibo; empresa inscrita con las dos formas en la misma caja → regularizar con abono → conciliación | pruebas-qa | VCJ-9 | — |
| **REC-1** | Esqueleto de `produccion`, recetas, versiones, ingredientes, sustitutos, costo teórico; Excel | backend | VCJ-0b | VJ-P9 |
| REC-1c | Recetas y costo por porción | frontend | REC-1 | — |
| **REC-2** | Inventarios: clases `salida_a_produccion` y `entrada_de_produccion`, sus órdenes | backend | VCJ-3 | — |
| **REC-3** | Órdenes de producción: consumo, entrada, real contra teórico, anular | backend | REC-1, REC-2 | — |
| REC-3c | Órdenes en el celular | frontend | REC-3 | — |
| **REC-4** | Variaciones por `costo_recalculado` | backend | REC-3 | C-2 del contador |
| **REC-5** | Venta con receta: `consumo_para_venta`, sustitutos, anular | backend | REC-1, VCJ-4 | VJ-P9 |
| **REC-6** | Reportes: costo, real contra teórico, rendimiento | backend + frontend | REC-4, REC-5 | — |
| REC-QA | Lote de 50 desayunos → ventas → sobrantes → conteo → real contra teórico; plato al vender con sustituto | pruebas-qa | REC-6 | — |

**En paralelo:** VCJ-0a no choca con nada. REC-1 y VCJ-1 van a la par después de VCJ-0b. **Dos migraciones del mismo módulo no van en paralelo**: VCJ-3 y REC-2 tocan el mismo `check` de `inventarios.documentos`, en fila y detrás de INV-8.

## 21. Preguntas para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| **VJ-P1** | En una empresa **con NIT**, ¿cada venta de control debe decir por qué no lleva factura? | a) Sí, obligatorio (un toque); b) opcional | **a**: es lo que hace defendible la venta de control ante la SAT. Un negocio sin NIT nunca lo ve |
| **VJ-P2** | Todavía no existe la emisión FEL desde Arrancar. ¿Qué hacen las formas formales mientras tanto? | a) **Transcribir**: emite el DTE en su certificador y escribe aquí el número, y la venta entra al Libro; b) esperar al módulo FEL y usar solo control; c) programar primero el módulo FEL | **a**: da ventas formales ya, sin esperar, y el adaptador se suma después sin cambiar tablas |
| **VJ-P3** | ¿Cómo sabe Arrancar que un negocio **no** está inscrito? | a) Por el NIT: empresa sin NIT = no inscrita; b) una casilla nueva «No inscrito en la SAT» | **a**: no agrega un modo de empresa ni un dato que se pueda contradecir con el NIT |
| **VJ-P4** | Si al vender **no hay existencia** registrada (la compra no se ha ingresado), ¿qué pasa? | a) Se bloquea la venta; b) **Se vende y queda «por descargar»**, y no se puede cerrar el mes sin resolverlo; c) permitir existencias negativas | **b**: el mostrador no se detiene y el inventario sigue sin negativos. La c contradice lo que ya decidió (INV-P4) |
| **VJ-P5** | ¿Se cobra **interés** en el crédito informal? | a) Sin interés; b) simple, pactado por cliente, apagado por omisión y nunca compuesto | **b** (contador), y nunca a trabajadores. Si nadie lo va a usar pronto, **a** ahorra un paso |
| **VJ-P6** | ¿**Descuento a trabajadores** en v1? | a) Solo registrar su autorización y sus pagos; b) esperar a Planilla para todo | **a**: Arrancar no descuenta del salario hasta que exista Planilla, y quien gana el mínimo no puede tener descuento |
| **VJ-P7** | Cuando un cliente **pasa su límite de crédito** en caja | a) Solo avisar; b) pide permiso de un encargado; c) bloquear | **b**, configurable por empresa: en un fiado, el límite que no frena no sirve, y bloquear del todo molesta con el cliente de siempre |
| **VJ-P8** | ¿Cómo se reparte la responsabilidad del **turno**? | a) Un responsable por turno y varios pueden vender en él; b) un turno por persona en la misma caja | **a**: es como trabaja una caseta o tienda; el faltante es de quien recibió la caja. La b exige contar el dinero en cada cambio de persona |
| **VJ-P9** | ¿Qué **producción** entra en v1? | a) Por lote; b) al vender; c) ambas | **c** (contador): comparten recetas y solo cambia cuándo se descarga |
| **VJ-P10** | En una empresa **con NIT**, ¿quién puede crear formas **sin FEL**? | a) Solo quien tenga un permiso propio; b) cualquier administrador | **a** (contador): separa quién configura de quién vende |

## 22. Para validar antes de programar

Con `contador-guatemala`:

| # | Punto | Propuesta del diseño | Antes de |
|---|---|---|---|
| C-1 | Empresa inscrita = tiene NIT (§3.9), en vez de un estado explícito | Una persona con NIT sin actividad registrada verá las salvaguardas, lo que es prudente | VCJ-4 |
| C-2 | Costo del terminado fijo y diferencia a «Variación de producción» cuando una compra con fecha anterior cambia un insumo (§8.5) | Sin recálculo en cascada | REC-4 |
| C-3 | Cartera: cargo por el total y pago como abono en la venta mixta (§4.4); vencimiento más antiguo al regularizar (§6.4) | | VCJ-8 |
| C-4 | Reparto del precio del combo en proporción al precio individual, para el DTE (§4.3) | | VCJ-9 |
| C-5 | Partidas de §17, sobre todo el traslado de «IVA pendiente» a débito al regularizar, y si el IVA pendiente aplica solo con entrega | | VCJ-12 |
| C-6 | Mes del inventario cerrado y venta que se anula sin que la mercadería vuelva (§11.2) | El costo queda en resultados con aviso | VCJ-4 |
| C-7 | Del dictamen, por confirmar con texto oficial: plazo de contingencia, CT arts. 85, 86 y 94 tras el Decreto 31-2024, C. Penal art. 358 B, C. de Trabajo arts. 62, 96 y 99, Ley del IVA arts. 2 y 34. **Ningún monto de multa se muestra en pantalla hasta confirmarlo** | | VCJ-1c (textos) |

Con `seguridad`: fotos de compras y gastos (`core.archivos`, qpdf, `recurso_dueno`), idempotencia (que la clave no permita leer la venta de otro usuario u otra empresa), RLS de caja junto con la de bodega en las órdenes, DTO sin costos, y que ningún permiso o parámetro permita excluir ventas de control de un reporte.

## 23. Pendientes que este diseño deja anotados

- Módulo `facturacion-fel` (diseño aparte): adaptadores, credenciales, XML, contingencia y la Res. SAT-DSI-1793-2026.
- Mesas, comandas y pantalla de cocina; listas de precios por cliente; promociones automáticas.
- Destino `ventas-y-caja` en Libro de compras (VCJ-16).
- Descuento en Planilla, y el trato de la **comida gratis a trabajadores** (dictamen §5, abierto: prestación o transferencia gratuita).
- Tarjeta (POS) en caja con su retención: se une a CXC-5t cuando alguien la use (VC-P27).
- Multimoneda en mostrador (hoy solo quetzales).
- `docs/PLAN.md` §6 y `docs/HOJA-DE-RUTA.md`: anotar este diseño y sus adendas cuando el usuario lo apruebe.
