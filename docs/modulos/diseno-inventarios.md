# Diseño de Inventarios — arquitecto de datos, 2026-11-18

_Agente `arquitecto-de-datos`. Base contable y fiscal: `dictamen-inventarios-2026-11-18.md` (contador-guatemala, mismo
día, «correcto con ajustes»). Aterriza la segunda parte del punto 8 de `docs/HOJA-DE-RUTA.md` («Activos fijos e
Inventarios»). **Nada de esto se programa hasta que el usuario responda §17.** Lo que el arquitecto no comparte del
dictamen, o que el código ya resolvió de otra forma, va marcado **[corrige el dictamen]** y pasa a §18 para que lo valide
el contador._

Sirve a empresas de **cualquier rubro y régimen**: nada aquí supone fincas, ganado, régimen de IVA o ISR, ni que la
empresa sea agente de retención. El kardex y el costeo son iguales para todas; lo que depende del régimen (si el faltante
genera débito de IVA, si el reporte semestral obliga) se lee de `libro_de_compras.datos_fiscales_de_empresa` (con su
vigencia), como hacen Caja chica, CP4 y Activos fijos, y se presenta como **aviso**, nunca como bloqueo.

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Métodos admitidos | Promedio ponderado y PEPS; **nunca UEPS** | ISR art. 41; NIIF Pymes 13.18; dictamen §1.1 |
| Consistencia del método | Fijo desde el primer movimiento; cambiarlo exige la autorización previa de la SAT | ISR art. 41; dictamen §3 |
| Costo de la compra | `costoDeLinea = total − iva + iva_no_acreditable` (el IVA no acreditable y el IDP van al costo) | `calculo-de-linea.ts`; `diseno-activos-fijos.md`; dictamen §1.2 |
| Moneda | El inventario es partida **no monetaria**: queda al tipo histórico en GTQ y nunca entra al diferencial | `diseno-multimoneda.md` §2.5; dictamen §4 |
| Carga inicial | Una sola fecha de corte por empresa; saldos iniciales solo con la carga **abierta**; cada módulo responde la «pregunta a todos» del cierre | `HOJA-DE-RUTA.md`; `diseno-em2-cierre-de-la-carga.md` |
| Ubicación | Localidades y departamentos de Empresas (el departamento puede ser de toda la empresa o de una localidad) | `empresas.localidades`, `empresas.departamentos` |
| Destino único del documento | Un documento del libro va a **un** destino de pago (Cuentas por pagar, Caja chica o Cuentas por liquidar); Inventarios **no** es un destino de pago: lee las **líneas** | `libro-de-compras.contratos.ts` |
| Módulos de rubro | Ganadería y Cultivos dependerán de los generales, nunca al revés | `HOJA-DE-RUTA.md` punto 9 |

## 0. La propuesta en una página

- **Un módulo nuevo**, `inventarios` (esquema `inventarios`), con `dependeDe: ['libro-de-compras']` (trae `terceros` de
  forma transitiva) (INV-A1). No depende de Bancos, Cuentas por pagar, Caja chica ni Activos fijos, y no se importa con
  ninguno (§15).
- **Catálogos por empresa** (INV-A2): unidades de medida, categorías, **artículos** (con su tipo de inventario para el
  reporte semestral, su unidad base, conversiones, lote y vencimiento opcionales) y **bodegas** (varias por localidad,
  INV-P5), con **alcance por registro propio por bodega** (INV-A3): el bodeguero ve y mueve solo su bodega.
- **Un solo kardex** (`movimientos`) para todo lo que cambia cantidades o valor, agrupado en **documentos de inventario**
  numerados: saldo inicial, recepción de compra, entrada manual (producción propia, donación recibida, aporte),
  devolución a proveedor, rebaja de costo (nota de crédito), costo adicional (flete, DAI), salida por consumo (con su
  destino: localidad, departamento, concepto de gasto, obra o mantenimiento de un activo fijo), salida especial (retiro
  del dueño, donación, muestra), traslado (salida y entrada ligadas, con tránsito opcional) y ajuste aprobado.
- **Costeo por artículo y empresa** (INV-A4), no por bodega: promedio ponderado móvil o PEPS con capas (INV-P1 b); el
  método vive en una tabla con historia (`metodos_de_costeo`), no en la configuración, para registrar la autorización de
  la SAT cuando se cambie. **Existencias negativas: nunca** (INV-P4), comprobado en toda la línea del tiempo.
- **Movimientos con fecha anterior** dentro de meses abiertos **recalculan hacia adelante** el costo de las salidas del
  artículo (INV-A5), con un registro del recálculo y un evento con las diferencias para Contabilidad.
- **Bandeja «Por recibir»** (como la de Activos fijos): las líneas del Libro de compras marcadas **inventario** con costo
  sin recibir. Una línea se reparte entre uno o varios artículos con su cantidad, y se puede recibir en partes. Las
  notas de crédito sobre facturas recibidas aparecen ahí como devolución o rebaja.
- **Ajustes** (faltantes y sobrantes) con causa, soporte (acta, denuncia) y **aprobación** (INV-A6); el faltante sin causa
  exceptuada avisa «hay que facturar» y guarda la FEL emitida afuera (INV-P7 a).
- **Inventario físico** por bodega: existencia teórica congelada, conteo desde el teléfono por código o código de
  barras, diferencias que se vuelven un ajuste por aprobar, y acta imprimible.
- **Cierre mensual** por empresa (como la depreciación de Activos fijos): congela las existencias valuadas del mes; nada
  con fecha de un mes cerrado se mueve; se reabre solo el último, con permiso, motivo y auditoría.
- **Deterioro a VNR** (INV-P10 a) en una tabla aparte del kardex: el costo fiscal no se toca.
- **Reportes**: kardex, existencias valuadas a una fecha, por vencer, rotación, **reporte semestral** (cuando se tenga la
  plantilla oficial, INV-P8) y el detalle de inventario del **Libro de inventarios**.
- **Fuera del módulo**: Libro de compras gana la marca **inventario** en la línea y en el concepto de gasto, excluyente
  con la de activo fijo (paso INV-0); Activos fijos, si está activo, recibe los materiales que van a una obra (orden por
  el mediador, §4.3); el **préstamo de herramientas pasa a Activos fijos** (INV-P3, corrige `PLAN.md` §6).
- **Fuera de v1**: identificación específica por serie, salida por venta y devolución de cliente (llegan con Ventas),
  entrada de cosecha automática (llega con Cultivos), consignación y mercadería pignorada, costo estándar, emitir la FEL.

## 1. Lo encontrado en el código y la base (verificado contra `main` el 2026-11-18)

1. **Líneas del libro** (`libro_de_compras.lineas_de_documento`): `tipo in ('bien','servicio')`, `es_activo_fijo`,
   combustible (`vigencia_de_combustible_id`, `galones`), montos fijos (`total`, `base`, `iva`, `iva_no_acreditable`,
   `idp`, `exento`, `otros_impuestos`). **No hay cantidad, unidad ni artículo** por línea, y la línea no tiene un único
   `(id, documento_id, empresa_id)` (el diseño de Activos fijos lo agrega en AF-0). El documento **no se edita**: se
   anula o se elimina.
2. **Conceptos de gasto** (`libro_de_compras.conceptos_de_gasto`): `tipo_por_omision`, `es_producto_agropecuario`,
   `es_activo_fijo` (propone la marca de la línea), único `conceptos_de_gasto_id_empresa_unico`. La base de desarrollo
   tiene 35 conceptos.
3. **Documentos del libro**: `destino in ('cuentas-por-pagar','caja-chica','cuentas-por-liquidar')`; único
   `documentos_id_empresa_unico (id, empresa_id)`. Caja chica (`comprobantes.documento_de_compra_id`) y Cuentas por
   liquidar (`gastos.documento_de_compra_id`) apuntan al **documento** del libro, no a sus líneas: la marca de inventario
   en la línea vale igual para los tres destinos sin tocar esos módulos.
4. **Avisos del libro**: `libro-de-compras.documento_por_anular` y `…_por_eliminar` llegan a **todos** los módulos que
   escuchan (cada uno filtra); un error del que escucha deshace la anulación; el mediador salta a los módulos inactivos.
5. **Empresas**: `localidades` con alcance propio (`ALCANCE_DE_LOCALIDADES`), `departamentos` con localidad opcional,
   ambos con su único `(id, empresa_id)`; `cargas_iniciales` (fecha de inicio, cerrada); orden
   `empresas.obtener_carga_inicial`, pregunta `empresas.revisar_cierre_de_carga` (`RevisionDeCierreDeModulo`, hasta 200
   cifras) y aviso `empresas.fecha_de_inicio_por_cambiar`. `mediador.preguntarATodos` ya existe.
6. **Alcance por registro** (`core/base-datos/alcance.ts`): `politicasDelRegistroConAlcance`, `politicaPorAlcance`,
   `politicaPorAlcanceOpcional` (la fila con la columna nula se ve), `politicasDeTablaDeAccesos`, disparador
   `core.asignar_registro_al_creador` y la ventana `operadorParaAsignar`. Caja chica lo usa por fondo (`accesos_a_fondos`).
7. **Correlativos** (`core.correlativos`: `empresa_id`, `clave`, `anio`, `siguiente`), **archivos** (`core.archivos` con
   `recurso_dueno`, PDF revisado con qpdf) y **auditoría** (`AccionAuditada`: `eliminar`, `inactivar`, `reactivar`,
   `anular`, `devolver`, `corregir`, `reabrir`, `cerrar`, `descartar`, `autorizar`, `asignar`, `quitar`, `adjuntar`,
   `ajustar`…; `core.recursos_de_auditoria_permanente` desde la migración del core 0024).
8. **Datos fiscales de la empresa** (`libro_de_compras.datos_fiscales_de_empresa`): `regimen_iva`, `regimen_isr`
   (`utilidades` por omisión), con `vigente_desde`.
9. **Activos fijos** está **diseñado, no programado** (`diseno-activos-fijos.md`, pendiente de las respuestas del usuario).
   Su tabla de alcance y su riesgo R-9 mandan el préstamo de herramientas a Inventario: este diseño propone lo contrario
   (INV-P3).
10. **Base de desarrollo** (solo leída, 2026-11-18): no existe el esquema `inventarios`; 0 líneas en el libro, 1
    localidad, 0 departamentos. **No hay datos que convertir.** Última migración del libro: `0036_cp5_constancias_pendientes`.

## 2. Alcance

| Entra en v1 | No entra (y dónde va) |
|---|---|
| Artículos de cualquier tipo de inventario: mercadería, materia prima, suministros e insumos de consumo interno, producto en proceso y terminado (cuando entran con valor manual), repuestos menores, empaques | Producción y costeo de transformación (NIIF 13.8-13.11): módulo de **Producción** o **Cultivos** |
| Bodegas por localidad con su responsable y alcance por bodega | Préstamo de herramientas y equipo: **Activos fijos** (INV-P3) |
| Promedio ponderado móvil y PEPS, con historia del método y su autorización de la SAT | Identificación específica por serie (INV-P1 c): paso posterior |
| Unidades y conversiones por artículo; lotes y vencimientos opcionales por artículo | Salida por venta, devolución del cliente, consignación: **Ventas** (futuro) |
| Recepción desde las líneas del libro (parcial o total), devolución a proveedor, rebajas por nota de crédito, costos adicionales repartidos | Emitir la FEL del faltante, del retiro o de la donación (INV-P7): **Ventas/FEL**; en v1 se transcribe la emitida afuera |
| Salidas por consumo con destino; salidas especiales (retiro del dueño, donación, muestra) con aviso de IVA | Cosecha automática desde **Cultivos** y animales: **Ganadería** (el ganado no se lleva por cabeza aquí) |
| Traslados entre bodegas de la **misma** empresa, con tránsito opcional y boleta | Traslado entre empresas: **no existe** (es una venta, dictamen §3) |
| Ajustes con causa, soporte y aprobación; inventario físico con acta | Partidas contables: **Contabilidad** escuchará los eventos de §9 |
| Cierre mensual, deterioro a VNR manual, saldos iniciales con Excel | Costo estándar y método minorista (NIIF 13.16) |
| Reportes: kardex, existencias valuadas, por vencer, rotación, reporte semestral, detalle para el Libro de inventarios | Alertas por correo o WhatsApp de vencimientos (PLAN §6): llegan con el correo saliente y Tareas; en v1 el aviso está en la pantalla y en el reporte |

## 3. Modelo

### 3.1 Qué es cada cosa

| Concepto | Qué es | Dónde vive |
|---|---|---|
| **Unidad** | Unidad de medida de la empresa (lb, qq, galón, caja), con su magnitud y su factor a la unidad de referencia de esa magnitud | `unidades` |
| **Categoría** | Agrupa artículos para buscar y reportar; propone el tipo de inventario | `categorias` |
| **Artículo** | Lo que se cuenta y se valúa. Tiene una **unidad base** (todo se guarda en ella), su tipo de inventario y si maneja lotes o vencimiento | `articulos`, `conversiones` |
| **Lote** | Grupo físico del mismo artículo con su vencimiento. **No es una capa de costo** (dictamen §4) | `lotes` |
| **Bodega** | Lugar físico donde hay existencias; de una localidad (o de toda la empresa), con responsable; recurso con alcance | `bodegas`, `accesos_a_bodegas` |
| **Documento de inventario** | Cada operación numerada (recepción, salida, traslado…) con su fecha, su bodega y su estado | `documentos` |
| **Movimiento** | Una línea del kardex: un artículo, una bodega, un lote, cantidad con signo y valor con signo | `movimientos` |
| **Existencia** | Cantidad actual por bodega, artículo y lote (caché que mantienen los casos de uso) | `existencias` |
| **Saldo del artículo** | Cantidad y valor del artículo en toda la empresa, y su costo promedio (caché) | `saldos_de_articulos` |
| **Capa** | Con PEPS: lo que queda de cada entrada, a su costo | `capas`, `consumos_de_capas` |
| **Ajuste** | Faltantes y sobrantes con causa y soporte; al aprobarse genera su documento | `ajustes`, `lineas_de_ajuste` |
| **Conteo** | Inventario físico de una bodega | `conteos`, `lineas_de_conteo` |
| **Cierre** | El mes de una empresa con sus existencias valuadas congeladas | `cierres`, `existencias_al_cierre` |
| **Deterioro** | Estimación contable a VNR y su reversión, fuera del kardex | `deterioros` |

### 3.2 Costeo por artículo y empresa (INV-A4)

El costo promedio (o las capas PEPS) se lleva **por artículo en toda la empresa**, no por bodega. La bodega solo dice
**dónde** están las cantidades. Así:

- Un traslado **no cambia** ningún costo (dictamen §3: «no tienen efecto fiscal ni partida»), ni siquiera con PEPS.
- El reporte semestral y el Libro de inventarios dan **un** costo unitario por artículo, que es lo que pide la SAT.
- El valor por bodega es `cantidad en la bodega × costo promedio de la empresa` (con PEPS, el mismo costo medio de las
  capas vigentes); el último renglón absorbe el redondeo para que la suma por bodega dé el valor del artículo.

La alternativa, promedio **por bodega**, la usan los ERP para empresas con sucursales que se evalúan por separado; aquí
complicaría los traslados (llevarían costo) y no lo pide ninguna regla fiscal. Queda como INV-A4 b.

### 3.3 Métodos y su historia

- `metodos_de_costeo` guarda el método de la empresa **desde** un mes. La primera fila se elige en Administración
  («Política de costeo») antes del primer movimiento; si nadie la eligió, el primer movimiento la crea con el valor de
  la variable `inventarios.costeo.metodo_inicial` (`promedio_ponderado`). Con el primer movimiento se marca `fijado_en`
  y ya no se edita.
- **Cambiarlo** (`CambiarMetodoDeCosteo`, permiso propio) crea una fila nueva con el número y la fecha de la
  **autorización de la SAT** (obligatorios) y su archivo opcional, desde el **1.º de enero** de un año (INV-A14) sin
  meses cerrados ni movimientos con esa fecha o posterior. Al pasar de promedio a PEPS, la existencia de cada artículo
  a esa fecha forma una sola capa al costo promedio; de PEPS a promedio, el promedio es valor ÷ cantidad de las capas.
  **No cambia el valor** de nada: no hay evento de dinero, solo `inventarios.metodo_cambiado`.
- Un método **por categoría** (INV-P2 b) se dejaría con una columna `categoria_id` nula en la misma tabla; no entra en
  v1.

### 3.4 Unidades y cantidades

- Cada empresa tiene su catálogo de unidades, sembrado la primera vez que se lista (como `SembrarConceptosDeGasto`):
  Unidad, Docena, Libra, Kilogramo, Onza, Quintal (100 lb), Arroba (25 lb), Tonelada métrica, Galón, Litro, Mililitro,
  Metro, Caja, Fardo, Saco, Bolsa, Botella. Las de una misma **magnitud** (masa, volumen, longitud) traen su factor a la
  unidad de referencia (libra, galón, metro), así un artículo en libras acepta quintales sin configurar nada.
- Las demás (caja, fardo, saco) dependen del artículo: «caja de 24», «saco de 50 kg». Van en `conversiones` por artículo
  (cuántas unidades base hay en una).
- **Cantidad**: `numeric(14,4)` en la unidad base; se guarda también la cantidad **como se escribió** y su unidad, para
  mostrar el documento igual que el papel. **Costo unitario**: `numeric(15,6)` en la unidad base. **Totales**:
  `numeric(14,2)`.
- En el código: cantidades en **diezmilésimas enteras**, costos unitarios en **millonésimas enteras** y dinero en
  centavos; los productos y divisiones se hacen con `BigInt` y se redondean al final (mitad hacia arriba), nunca con
  números de coma flotante. `numeric(15,6)` cabe en un entero seguro de JavaScript; sus productos no, por eso `BigInt`.

### 3.5 Bodegas y alcance (INV-A3)

- Una bodega pertenece a una **localidad** (o a toda la empresa si la empresa no usa localidades) y una localidad puede
  tener varias (INV-P5 b). Lleva responsable (texto con usuario opcional, como el custodio de Caja chica).
- **Alcance propio** `inventarios.bodegas` (tabla `inventarios.accesos_a_bodegas`, permiso `inventarios.bodegas.ver-todas`
  y ventana de asignación con `inventarios.bodegas.asignar`): quien crea una bodega queda asignado (disparador del core)
  y el responsable con usuario se asigna al guardarla. Es más fino que el alcance por localidad: en una finca, el
  encargado de combustible no tiene por qué ver la bodega de agroquímicos.
- Lo que el usuario no ve, no lo puede mover: documentos, existencias, ajustes y conteos llevan la política de alcance
  sobre su `bodega_id` (con `with check`), así que no se puede sacar, ajustar ni contar en una bodega ajena.
- Un **traslado sin tránsito** exige ver las dos bodegas; **con tránsito**, el que envía solo ve la de origen y la
  entrada la registra quien recibe en la de destino (§6.7).

### 3.6 Documentos y movimientos

| Clase de documento (`documentos.clase`) | Movimientos | Costo de cada movimiento |
|---|---|---|
| `saldo_inicial` | Entradas | El escrito (con PEPS, una capa por renglón con su fecha real) |
| `recepcion_de_compra` | Entradas, cada una ligada a una línea del libro | Parte del costo de la línea (Σ por línea ≤ `costoDeLinea`) |
| `entrada_manual` | Entradas, con causa `produccion_propia`, `donacion_recibida`, `aporte`, `otra` y soporte escrito | El escrito (no puede ser cero salvo `donacion_recibida` con aviso) |
| `devolucion_a_proveedor` | Salidas, cada una ligada a la entrada de la recepción que devuelve | Al costo unitario de esa entrada |
| `rebaja_de_costo` | Solo valor (cantidad 0), por una nota de crédito sin devolución física | Se reparte entre las entradas de la factura (§7.5) |
| `costo_adicional` | Solo valor, repartido entre recepciones elegidas | Por valor, cantidad, peso o a mano (§7.5) |
| `salida_por_consumo` | Salidas, con destino (§3.7) | Del método |
| `salida_especial` | Salidas, con causa `retiro_del_dueno`, `donacion`, `muestra` | Del método; aviso de IVA (§6.8) |
| `salida_de_traslado` / `entrada_de_traslado` | Una salida en el origen y una entrada en el destino, ligadas | Del método en la salida; la entrada toma el mismo costo |
| `ajuste` | Salidas (faltantes) y entradas (sobrantes) de un ajuste aprobado | Faltante: del método. Sobrante: el costo promedio vigente (con PEPS, el costo de la última entrada; §7.4) |

Reservadas para módulos futuros (el `check` las admitirá cuando lleguen, con su migración): `salida_por_venta`,
`devolucion_de_venta` (Ventas) y `entrada_de_produccion` (Cultivos, Producción).

### 3.7 Destino de la salida por consumo

Cada salida por consumo dice **para qué** fue (dictamen §4: «destino obligatorio»):

| `destino` | Datos | Para |
|---|---|---|
| `gasto` | `concepto_de_gasto_id` (del libro, obligatorio, propuesto por el artículo), `localidad_id` y `departamento_id` (opcionales, centro de costo) | Insumos y suministros que se gastan; Contabilidad sacará la cuenta del concepto |
| `obra_de_activo_fijo` | `activo_fijo_id` (sin llave, §4.3) | Materiales que forman parte de una obra en construcción (NIIF 13.21). Solo con Activos fijos activo |
| `mantenimiento_de_activo_fijo` | `activo_fijo_id` y `concepto_de_gasto_id` | Repuestos menores y lubricantes de una máquina: es gasto, ligado al activo para su historial (y para el futuro Maquinaria) |
| `otro_modulo` | Reservado: `modulo_de_destino` y `referencia_de_destino` (siembra, lote de ganado) | Cultivos y Ganadería, cuando existan, con su orden |

El destino va en el **documento** (una salida = un destino); si una requisición abarca varios destinos, son varias
salidas.

### 3.8 Ciclo de un documento

```
               anular (mes abierto)
vigente ─────────────────────────────► anulado
```

- Todo documento nace **vigente** y sus movimientos entran al kardex al guardarse. No hay borradores en el kardex: lo
  que necesita aprobación (los ajustes) vive en `ajustes` hasta aprobarse.
- **Anular** solo en mes abierto, con motivo; sus movimientos quedan `vigente = false` y el costo se recalcula desde su
  fecha (§7.3). Si al quitarlos alguna existencia quedara negativa en alguna fecha, no se anula (`existencia_negativa`
  con el artículo y la fecha).
- **Nunca se elimina** un documento ni un movimiento: el kardex es evidencia (Código Tributario art. 47 y 112). En un mes
  cerrado se corrige con un ajuste o un documento nuevo.
- Un traslado en tránsito se anula entero (las dos mitades) si la entrada aún no se registró; recibido, se anula la
  entrada y luego la salida.

## 4. Cambios fuera del módulo

### 4.1 Libro de compras (paso INV-0, migración `00xx_inv_marca_de_inventario`)

| Cambio | Detalle |
|---|---|
| Marca en la línea | `lineas_de_documento.es_inventario boolean not null default false`; checks `lineas_de_documento_inventario_es_bien (not es_inventario or tipo = 'bien')` y `lineas_de_documento_un_solo_destino_del_costo (not (es_activo_fijo and es_inventario))`. Sin datos que convertir (0 líneas en desarrollo; en producción el relleno es `false`) |
| Marca en el concepto | `conceptos_de_gasto.es_inventario boolean not null default false` con los mismos dos checks (`conceptos_de_gasto_…`). El concepto **propone** la marca de la línea, como `es_activo_fijo`; la semilla perezosa no cambia (el usuario marca «Insumos agrícolas», «Alimento para ganado»… si los lleva en inventario) |
| Llave para referenciar líneas | `unique lineas_de_documento_llave_unica (id, documento_id, empresa_id)`: la misma de AF-0. **La crea el primero de los dos pasos que se programe**; el segundo la omite |
| Dominio, Zod y cliente | Casilla «Inventario (entra a una bodega)» en la línea, excluyente con «Activo fijo»; columna «Inventario» en el Excel de líneas del libro (si existe) y en la bandeja de DTE. Error `linea_con_dos_destinos_del_costo` |
| SAT-2237 y libro | **Sin cambio**: una línea de inventario es un **bien** (compras de bienes) |
| `DocumentoParaDestino` | Sin cambio (Inventarios no es destino de pago). CP4 sigue mandando a Operación lo pagado a un documento sin activo fijo, que es lo correcto para el inventario (NIIF 7.14) |

La alternativa (INV-A9 b) es reemplazar `es_activo_fijo` por `naturaleza in ('gasto','activo_fijo','inventario')`:
más limpia, pero toca CP4, Caja chica, Cuentas por liquidar, el SAT-2237 y el diseño de Activos fijos. No vale el costo
en v1.

### 4.2 Core

| Cambio | Detalle |
|---|---|
| `core/contratos/inventarios.contratos.ts` | Eventos del bus (§9) y, cuando lleguen Ventas o Cultivos, sus órdenes |
| Auditoría permanente | La migración `0001` de Inventarios inserta en `core.recursos_de_auditoria_permanente` `inventarios.metodos-de-costeo` (el método vale mientras exista la empresa; ISR art. 41), `inventarios.cierres` e `inventarios.ajustes` (soporte de faltantes y su IVA mientras no prescriba; Código Tributario arts. 47 y 112), con su cita |
| `AccionAuditada` | Agregar `aprobar` (aprobar un ajuste) y `cambiar_metodo`. Si se prefiere no tocar el tipo, se usan `autorizar` y `corregir` (INV-A6 decide si hay aprobación) |

### 4.3 Activos fijos (solo si está activo; paso INV-AF, después de AF-3)

Inventarios **no depende** de Activos fijos ni Activos fijos de Inventarios: se hablan por el mediador.

| Contrato | Quién atiende | Para qué |
|---|---|---|
| Orden `activos-fijos.obtener_activo` (`{ activoId }` → código, descripción, estado o `null`) | Activos fijos | Validar el activo de una salida `obra_de_activo_fijo` (debe estar `en_construccion`) o `mantenimiento_de_activo_fijo` (no dado de baja) y mostrarlo |
| Orden `activos-fijos.recibir_costo_de_inventario` (`{ activoId, documentoDeInventarioId, fecha, montoCentavos }`) | Activos fijos | Crea un costo con `origen = 'inventario'` (valor nuevo del `check` de `activos_fijos.costos.origen`) y `referencia_de_origen` sin llave. Corre en la misma transacción |
| Aviso `inventarios.salida_por_anular` (`{ documentoId, activoId }`) | Activos fijos | Anula su costo o lanza su error (p. ej. el activo ya se puso en uso y el mes de depreciación se cerró); el error deshace la anulación |

Con Activos fijos inactivo, los destinos `obra_de_activo_fijo` y `mantenimiento_de_activo_fijo` no se ofrecen. El
`activo_fijo_id` no lleva llave (no está en `dependeDe`; PLAN §3.2).

**Préstamo de herramientas (INV-P3 a):** si el usuario lo aprueba, se corrige la tabla de alcance y el riesgo R-9 de
`diseno-activos-fijos.md` y la idea de `PLAN.md` §6, y el préstamo se diseña como un paso de Activos fijos (préstamo y
devolución de un activo o bien de control a un responsable, con boleta). No se hace en este commit.

### 4.4 Empresas, Bancos, Cuentas por pagar, Caja chica, Cuentas por liquidar

**Sin cambios.** La factura pagada por caja chica o por un anticipo llega al libro igual que las demás; su línea
marcada inventario aparece en la bandeja «Por recibir». Un **vale sin documento** de caja chica no entra al inventario
(no tiene línea): si se compró un artículo inventariable sin factura, se registra la entrada manual con su soporte o,
mejor, la factura especial en el libro (dictamen §5).

## 5. Datos (esquema `inventarios`)

Toda tabla lleva `empresa_id` (FK `core.empresas` on delete cascade), `politicaPorEmpresa()`, `...marcasDeTiempo` y
`...autoria`. Llaves compuestas con `empresa_id` (destino: el único `<tabla>_id_empresa_unico (id, empresa_id)` de cada
tabla que las recibe) y **un índice por llave**, como en los demás módulos. Llaves `no action` salvo donde se dice.
Nombres únicos con `core.nombre_normalizado` (sin mayúsculas ni acentos). Anulación completa = `estado`, `anulado_en`,
`anulado_por`, `motivo_de_anulacion` (1–300) con el check `(estado = 'anulado') = (los tres no nulos)`. Períodos `date`
con check de primer día del mes.

### 5.1 `inventarios.unidades`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `nombre` | text | no | 1–40 recortado; único `unidades_nombre_unico (empresa_id, nombre_normalizado(nombre))` |
| `simbolo` | text | no | 1–10; único `(empresa_id, upper(simbolo))` |
| `magnitud` | text | no | `in ('cantidad','masa','volumen','longitud','superficie','empaque')` |
| `factor_a_la_referencia` | numeric(18,8) | sí | `> 0`; `(magnitud in ('masa','volumen','longitud','superficie')) = (factor is not null)`. Referencias: libra, galón, metro, metro cuadrado |
| `activo` | boolean | no | `default true` |

Único `unidades_id_empresa_unico`. Índice `(empresa_id, activo)`.

### 5.2 `inventarios.categorias`

`id`; `nombre` 1–80 (único normalizado por empresa); `tipo_de_inventario_por_omision` (los valores de §5.3); `activo`.
Un solo nivel en v1. Único `categorias_id_empresa_unico`.

### 5.3 `inventarios.articulos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `codigo` | text | no | 1–30, `^[A-Za-z0-9./-]+$`; único `articulos_codigo_unico (empresa_id, upper(codigo))`. Propuesto por el correlativo `inventarios.articulos` con el prefijo de la empresa |
| `nombre` | text | no | 1–150; único `articulos_nombre_unico (empresa_id, nombre_normalizado(nombre))` (evita el mismo artículo dos veces) |
| `descripcion` | text | sí | 1–500 |
| `categoria_id` | uuid | no | FK compuesta a `categorias`; índice |
| `tipo_de_inventario` | text | no | `in ('mercaderia','materia_prima','suministros','producto_en_proceso','producto_terminado','repuestos','empaques')` (dictamen §4; confirmar contra la plantilla, V-4) |
| `unidad_base_id` | uuid | no | FK compuesta a `unidades`; índice. **No cambia** después del primer movimiento (dominio) |
| `maneja_lotes` | boolean | no | `default false`; no cambia con existencias |
| `maneja_vencimiento` | boolean | no | `default false`; check `not maneja_vencimiento or maneja_lotes` |
| `codigo_de_barras` | text | sí | 1–60; único parcial `(empresa_id, codigo_de_barras) where codigo_de_barras is not null` |
| `concepto_de_gasto_id` | uuid | sí | FK compuesta a `libro_de_compras.conceptos_de_gasto (id, empresa_id)`; propone el concepto de las salidas a gasto; índice parcial |
| `existencia_minima` | numeric(14,4) | sí | `>= 0`; aviso de reorden en la lista y en el reporte |
| `peso_kg_por_unidad_base` | numeric(14,4) | sí | `> 0`; para repartir costos adicionales por peso |
| `activo` | boolean | no | `default true`; se inactiva con auditoría (no con existencias, dominio) |

Únicos e índices: `articulos_id_empresa_unico (id, empresa_id)`, `(empresa_id, activo, categoria_id)` y un índice GIN
`pg_trgm` sobre `nombre` para la búsqueda (como Terceros). RLS: empresa. No hay marca «inventariable»: lo que no se
inventaría no tiene artículo (se gasta directo en el libro).

### 5.4 `inventarios.conversiones`

`(articulo_id, unidad_id)` PK; FK compuestas; `factor numeric(18,8) not null check (factor > 0)` (unidades base en una);
`para_compras boolean default false` (la que propone la recepción; único parcial `(articulo_id) where para_compras`).
Check (dominio) `unidad_id <> unidad_base_id`. Las unidades de la misma magnitud que la base no necesitan fila: se
convierten por `factor_a_la_referencia`. Índice `(unidad_id)`. RLS: empresa.

### 5.5 `inventarios.bodegas` (recurso con alcance `inventarios.bodegas`)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `codigo` | text | no | `^[A-Z0-9-]{1,12}$`; único por empresa |
| `nombre` | text | no | 1–120; único normalizado por empresa |
| `localidad_id` | uuid | sí | FK compuesta a `empresas.localidades (id, empresa_id)`; índice parcial |
| `responsable` | text | sí | 1–150 |
| `responsable_usuario_id` | uuid | sí | FK `core.usuarios` on delete set null; índice parcial |
| `activo` | boolean | no | `default true`; no se inactiva con existencias ni conteos en curso |

Único `bodegas_id_empresa_unico`. RLS: `politicaPorEmpresa()` + `politicasDelRegistroConAlcance(ALCANCE_DE_BODEGAS)`.

### 5.6 `inventarios.accesos_a_bodegas`

`(empresa_id, usuario_id, bodega_id)` PK; FK compuesta a `bodegas` **on delete cascade**; FK `core.usuarios` on delete
cascade; índice `(bodega_id)`. RLS: `politicasDeTablaDeAccesos(ALCANCE_DE_BODEGAS)` (sin subconsulta en `select`).
Quitar o asignar audita `quitar`/`asignar` como en Caja chica.

### 5.7 `inventarios.metodos_de_costeo`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `metodo` | text | no | `in ('promedio_ponderado','peps')` |
| `desde` | date | no | Primer día de mes; único `(empresa_id, desde)` |
| `fijado_en` | timestamptz | sí | Cuándo lo usó el primer movimiento; desde ahí no se edita ni se elimina |
| `autorizacion_sat_numero` | text | sí | 1–60 |
| `autorizacion_sat_fecha` | date | sí | `(autorizacion_sat_numero is null) = (autorizacion_sat_fecha is null)`; obligatorios en toda fila que no sea la primera (dominio) |
| `autorizacion_archivo_id` | uuid | sí | FK `core.archivos`, `recurso_dueno = 'inventarios.metodos-de-costeo'`; único parcial |
| `motivo` | text | sí | 1–500 |

Índice `(empresa_id, desde desc)`. RLS: empresa. El método de un día es la fila de mayor `desde <=` ese día.

### 5.8 `inventarios.lotes`

`id`; `articulo_id` (FK compuesta; índice); `codigo` 1–40 (único `(articulo_id, upper(codigo))`); `fecha_de_vencimiento`
date nula (obligatoria si el artículo `maneja_vencimiento`, dominio); `fecha_de_fabricacion` date nula; `observaciones`.
Índice parcial `(empresa_id, fecha_de_vencimiento) where fecha_de_vencimiento is not null` (por vencer). Único
`lotes_id_empresa_unico`. RLS: empresa.

### 5.9 `inventarios.documentos` (con alcance por bodega)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `clase` | text | no | Las de §3.6 |
| `numero` | integer | no | Correlativo `inventarios.<clase>` por empresa; único `(empresa_id, clase, numero)` |
| `fecha` | date | no | No futura; `>=` fecha de inicio (salvo `saldo_inicial`, que es el día anterior); mes abierto |
| `bodega_id` | uuid | sí | FK compuesta a `bodegas`; `(clase in ('rebaja_de_costo','costo_adicional')) = (bodega_id is null)`; índice parcial |
| `documento_relacionado_id` | uuid | sí | FK compuesta a `documentos`: la otra mitad del traslado, o la recepción que devuelve o rebaja; índice parcial |
| `estado_de_traslado` | text | sí | `in ('en_transito','recibido')`; solo en `salida_de_traslado` (`(clase = 'salida_de_traslado') = (estado_de_traslado is not null)`) |
| `documento_de_compra_id` | uuid | sí | FK compuesta a `libro_de_compras.documentos (id, empresa_id)`: la factura o nota de una recepción, devolución, rebaja o costo adicional del libro; índice parcial (para los avisos del libro) |
| `causa` | text | sí | `entrada_manual`: `in ('produccion_propia','donacion_recibida','aporte','otra')`; `salida_especial`: `in ('retiro_del_dueno','donacion','muestra')`; nula en las demás (check por clase) |
| `destino` | text | sí | Solo `salida_por_consumo`: `in ('gasto','obra_de_activo_fijo','mantenimiento_de_activo_fijo')` |
| `concepto_de_gasto_id` | uuid | sí | FK compuesta al libro; obligatorio con `destino in ('gasto','mantenimiento_de_activo_fijo')`; índice parcial |
| `localidad_id`, `departamento_id` | uuid | sí | FK compuestas a Empresas; centro de costo de la salida; índices parciales |
| `activo_fijo_id` | uuid | sí | **Sin llave** (§4.3); `(destino in ('obra_de_activo_fijo','mantenimiento_de_activo_fijo')) = (activo_fijo_id is not null)` |
| `entregado_a` | text | sí | 1–150: quien recibe la salida o el traslado (firma de la boleta) |
| `soporte` | text | sí | 1–150: «Requisición 45», «Acta de donación»; obligatorio en `entrada_manual` y `salida_especial` |
| `requiere_factura` | boolean | no | `default false`; en `salida_especial` y `ajuste`, calculado al guardar (§6.8) |
| `serie_fel`, `numero_fel`, `autorizacion_fel` | text, text, uuid | sí | La FEL emitida afuera (INV-P7 a); se completan después con `editar` (auditoría `corregir`) |
| `ajuste_id` | uuid | sí | FK compuesta a `ajustes`; `(clase = 'ajuste') = (ajuste_id is not null)`; único parcial |
| `observaciones` | text | sí | 1–500 |
| anulación completa | | | `vigente`/`anulado` |

Índices: `(empresa_id, fecha, clase)`, `(bodega_id, fecha)`. RLS: `politicaPorEmpresa()` +
`politicaPorAlcanceOpcional(ALCANCE_DE_BODEGAS, 'bodega_id')` (los documentos solo de valor, sin bodega, los ve quien
tenga el permiso de su pantalla).

### 5.10 `inventarios.movimientos` (el kardex)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `documento_id` | uuid | no | FK compuesta a `documentos`; índice |
| `articulo_id` | uuid | no | FK compuesta; ver índices |
| `bodega_id` | uuid | sí | FK compuesta; nulo solo en los de valor |
| `lote_id` | uuid | sí | FK compuesta a `lotes`; obligatorio si el artículo `maneja_lotes` y el movimiento tiene cantidad (dominio); índice parcial |
| `fecha` | date | no | Copia de la del documento (para ordenar sin unir) |
| `orden_del_dia` | smallint | no | `0` entradas y saldo inicial, `1` valor, `2` salidas: dentro de un día, primero entra y luego sale (§7.2) |
| `secuencia` | bigint | no | `generated always as identity`: el orden de registro dentro del mismo día y orden |
| `tipo` | text | no | `in ('entrada','salida','valor')` |
| `cantidad` | numeric(14,4) | no | Con signo en la unidad base: `entrada > 0`, `salida < 0`, `valor = 0` (check por tipo) |
| `cantidad_escrita`, `unidad_escrita_id` | numeric(14,4), uuid | sí | Como se escribió; FK compuesta a `unidades`; los dos o ninguno |
| `costo_unitario` | numeric(15,6) | no | `>= 0`; en la unidad base (0 en los de valor) |
| `costo_total` | numeric(14,2) | no | Con signo: `>= 0` en entradas, `<= 0` en salidas, cualquiera en valor |
| `costo_del_metodo` | boolean | no | `true` en las salidas cuyo costo lo calcula el método (las que el recálculo puede cambiar); `false` en entradas y en las devoluciones a proveedor (costo de su entrada) |
| `saldo_cantidad`, `saldo_valor` | numeric(16,4), numeric(14,2) | no | Del **artículo en la empresa** después de este movimiento; `>= 0` los dos; check `saldo_cantidad > 0 or saldo_valor = 0` |
| `linea_de_documento_de_compra_id`, `documento_de_compra_id` | uuid | sí | FK compuesta `(linea, documento, empresa_id) → libro_de_compras.lineas_de_documento (id, documento_id, empresa_id)`; los dos o ninguno; índices parciales |
| `movimiento_de_origen_id` | uuid | sí | FK compuesta a `movimientos`: la entrada que devuelve una devolución, o la salida del traslado que origina la entrada; índice parcial |
| `monto_a_resultados` | numeric(14,2) | no | `default 0`; en los de valor, la parte que no absorbió la existencia (§7.5) |
| `vigente` | boolean | no | `default true`; `false` cuando se anula su documento |

Índices: `movimientos_kardex_idx (articulo_id, fecha, orden_del_dia, secuencia) where vigente` (el que usa el costeo),
`(bodega_id, articulo_id, fecha) where vigente` (kardex por bodega), `(empresa_id, fecha) where vigente` (reportes del
período). Único `movimientos_id_empresa_unico`.

**RLS: solo empresa, sin alcance** [decisión del arquitecto]. El recálculo (§7.3) reescribe el costo y los saldos de las
salidas del artículo en **todas** las bodegas, también las que el usuario que registró el documento no ve; con la
política de alcance, PostgreSQL ocultaría esas filas y el `update` las saltaría en silencio, dejando un kardex
incorrecto. Por eso el alcance se aplica en `documentos`, `existencias`, `ajustes` y `conteos`, y los movimientos se
**leen siempre unidos a su documento** (el repositorio no expone otra consulta), como los costos de Activos fijos. Una
prueba de aislamiento con dos bodegueros lo cubre (R-3).

### 5.11 `inventarios.existencias` (caché por bodega)

`(empresa_id, bodega_id, articulo_id, lote_clave)` PK, con `lote_clave uuid not null default
'00000000-0000-0000-0000-000000000000'` (sin lote) y `lote_id` nulo con su FK compuesta (`lote_clave = coalesce(lote_id,
cero)`, check). `cantidad numeric(16,4) not null check (cantidad >= 0)`. La mantienen los casos de uso en la misma
transacción que el movimiento; nunca se calcula por fuera. Índice `(articulo_id) where cantidad > 0`. RLS: empresa +
`politicaPorAlcance(ALCANCE_DE_BODEGAS, 'bodega_id')`. El reporte «Cuadre del kardex» (§13) compara con la suma de los
movimientos vigentes.

### 5.12 `inventarios.saldos_de_articulos` (caché por empresa)

`(empresa_id, articulo_id)` PK; `cantidad numeric(16,4)`, `valor numeric(14,2)`, `costo_promedio numeric(15,6)` (todos
`>= 0`; `cantidad > 0 or valor = 0`); `ultimo_movimiento_id` uuid nulo. Es el saldo después del último movimiento vigente
(igual al `saldo_*` de ese movimiento). RLS: empresa.

### 5.13 `inventarios.capas` y `inventarios.consumos_de_capas` (solo PEPS)

**`capas`**: `id`; `articulo_id`; `movimiento_de_entrada_id` (FK compuesta, único); `fecha` (con saldos iniciales, la
fecha real de compra del renglón, para el orden PEPS); `secuencia` (la de la entrada); `cantidad_inicial`, `valor_inicial`;
`cantidad_restante`, `valor_restante` (`>= 0`; `cantidad_restante > 0 or valor_restante = 0`); `vigente`. Índice
`(articulo_id, fecha, secuencia) where vigente and cantidad_restante > 0`.

**`consumos_de_capas`**: `(movimiento_de_salida_id, capa_id)` PK; `cantidad`, `valor` (`> 0`). Índice `(capa_id)`.

Son **derivados**: el recálculo los regenera desde la fecha afectada. Borrar un consumo derivado no es borrar un registro
de negocio (no se audita fila por fila); el recálculo deja su rastro en `recalculos`.

### 5.14 `inventarios.recalculos`

`id`; `articulo_id`; `desde_fecha`; `documento_causa_id` (FK compuesta a `documentos`); `causa in
('registro_con_fecha_anterior','anulacion','saldo_inicial_corregido')`; `salidas_afectadas integer`; `diferencia_de_costo
numeric(14,2)` (Σ nuevo − anterior de las salidas). Índice `(articulo_id, creado_en desc)`. RLS: empresa. Solo se agrega.

### 5.15 `inventarios.repartos_de_costo` (costos adicionales y rebajas)

`(documento_id, movimiento_de_entrada_id)` PK (el documento de valor y la entrada de recepción que recibe parte);
`base_del_reparto in ('valor','cantidad','peso','manual')`; `monto numeric(14,2)` (con signo: positivo en costo
adicional, negativo en rebaja); `absorbido numeric(14,2)` y `a_resultados numeric(14,2)` (check `absorbido +
a_resultados = monto`). Índice `(movimiento_de_entrada_id)`. RLS: empresa (se lee unido al documento). El documento de
`costo_adicional` lleva su origen: una línea del libro (`documento_de_compra_id` + la línea en su movimiento de valor) o
un soporte manual (`soporte`: «DUCA 26-0000123»), para lo que no pasa por el libro.

### 5.16 `inventarios.descartes_de_lineas`

Como en Activos fijos: `id`; `documento_de_compra_id`, `linea_de_documento_id` (FK compuesta al libro); `motivo` 1–300;
`vigente`, `devuelto_en`, `devuelto_por`. Único parcial `(linea_de_documento_id) where vigente`. Saca de la bandeja una
línea marcada inventario que en realidad era gasto. Audita `descartar`/`devolver`.

### 5.17 `inventarios.ajustes` y `inventarios.lineas_de_ajuste`

**`ajustes`** (alcance por bodega):

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `numero` | integer | no | Correlativo `inventarios.ajustes`; único por empresa |
| `fecha` | date | no | Fecha del hecho; mes abierto al aprobar |
| `bodega_id` | uuid | no | FK compuesta; índice |
| `origen` | text | no | `in ('manual','conteo')`; `conteo_id` FK compuesta, `(origen = 'conteo') = (conteo_id is not null)` |
| `estado` | text | no | `in ('por_aprobar','aprobado','rechazado','anulado')` |
| `aprobado_en`, `aprobado_por` | | sí | `(estado = 'aprobado') = (los dos no nulos)`; `aprobado_por <> creado_por` si la variable `inventarios.ajustes.aprobar_lo_propio` es `false` (dominio) |
| `rechazado_en`, `rechazado_por`, `motivo_de_rechazo` | | sí | Los tres juntos con `rechazado` |
| `observaciones` | text | sí | 1–500 |
| anulación completa | | | Anular uno **aprobado** anula su documento (mes abierto) |

**`lineas_de_ajuste`**:

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `ajuste_id`, `articulo_id`, `lote_id` | uuid | no, no, sí | FK compuestas |
| `cantidad` | numeric(14,4) | no | `<> 0`: negativa faltante, positiva sobrante |
| `causa` | text | no | `in ('perecedero_o_vencimiento','caso_fortuito','robo_o_hurto','error_de_registro','sin_causa_exceptuada','sobrante')`; `(cantidad > 0) = (causa in ('sobrante','error_de_registro'))` para el sobrante, y faltantes con las demás (check) |
| `soporte_numero` | text | sí | 1–60: número del acta o de la denuncia |
| `soporte_archivo_id` | uuid | sí | FK `core.archivos`, `recurso_dueno = 'inventarios.ajustes'`; único parcial |
| `costo_total` | numeric(14,2) | sí | Copiado del movimiento al aprobar |
| `requiere_factura` | boolean | no | Calculado al aprobar (§6.8) |
| `observacion` | text | sí | 1–300 |

Índice `(ajuste_id)`. RLS de las líneas: empresa (se leen unidas al ajuste).

### 5.18 `inventarios.conteos` y `inventarios.lineas_de_conteo`

**`conteos`** (alcance por bodega): `id`; `numero` (correlativo); `bodega_id`; `categoria_id` nula (conteo parcial por
categoría); `congelado_en timestamptz not null` (el momento de la existencia teórica); `fecha date` (la del acta y del
ajuste); `estado in ('en_curso','cerrado','anulado')`; `cerrado_en`, `cerrado_por`; `participantes` 1–500;
`observaciones`; anulación completa. Único parcial `(bodega_id) where estado = 'en_curso'` (uno abierto por bodega).

**`lineas_de_conteo`**: `(conteo_id, articulo_id, lote_clave)` PK (con `lote_id` nulo y su FK, como en existencias);
`existencia_teorica numeric(16,4)` (congelada); `contado numeric(16,4)` nulo; `contado_en`, `contado_por` (los tres
juntos); `leido_por_codigo boolean default false`; `observacion` 1–300. Índice `(conteo_id) where contado is null`
(pendientes). RLS: empresa.

### 5.19 `inventarios.cierres` y `inventarios.existencias_al_cierre`

**`cierres`**: `(empresa_id, periodo)` PK; `estado in ('cerrado','reabierto')`; `cerrado_en`, `cerrado_por`;
`reabierto_en`, `reabierto_por`, `motivo_de_reapertura` (los tres con `reabierto`); `metodo` (el del mes); `regimen_isr`
(copiado de los datos fiscales vigentes, nulo si no hay); `valor_total numeric(14,2)`; `articulos_con_existencia
integer`. Nunca se borra.

**`existencias_al_cierre`**: `id`; `periodo` (FK a `cierres`); `articulo_id`, `bodega_id` (FK compuestas);
`tipo_de_inventario` (copiado: el reporte semestral no cambia si se reclasifica el artículo después); `cantidad
numeric(16,4)`, `costo_unitario numeric(15,6)`, `valor numeric(14,2)`; `vigente` (`false` al reabrir; no se borra, como
las cuotas de Activos fijos). Único parcial `(articulo_id, bodega_id, periodo) where vigente`. Índice `(empresa_id,
periodo) where vigente`. RLS: empresa + `politicaPorAlcance(ALCANCE_DE_BODEGAS, 'bodega_id')`.

### 5.20 `inventarios.deterioros`

`id`; `numero` (correlativo); `fecha` (último día de un mes); `articulo_id`; `clase in ('deterioro','reversion')`;
`monto numeric(14,2) > 0`; `cantidad_evaluada numeric(16,4)`, `valor_neto_realizable_unitario numeric(15,6)` (el cálculo
que lo sustenta); `motivo` 1–500; anulación completa. Índice `(articulo_id, fecha)`. RLS: empresa. **Regla** (dominio):
estimación vigente del artículo (Σ deterioros − Σ reversiones) entre 0 y su valor en el kardex a la fecha. No toca
`movimientos` ni `saldos_de_articulos`: el costo fiscal sigue igual (ISR art. 41, dictamen §1.1).

### 5.21 `inventarios.autorizaciones_del_libro`

`id`; `numero_de_autorizacion` 1–60; `fecha_de_autorizacion`; `folio_desde`, `folio_hasta` (`1 <= desde <= hasta`);
`vigente`. Exclusión de traslape de folios con `btree_gist` (ya instalada por el libro). Sirve al reporte semestral y al
detalle del Libro de inventarios (dictamen §1.1, «Plataforma»). Cuando exista Contabilidad, el Libro de inventarios
completo (con activo fijo, bancos y pasivos) será suyo y esta tabla podrá pasar allá.

### 5.22 Migraciones y datos existentes

- `npm run generar -- modulo inventarios --nombre "Inventarios" --descripcion "…" --icono Warehouse` crea el esqueleto y
  `0000_esquema`. Luego, con `bd:generar -w servidor -- inventarios <nombre>`: `0001_inv1_catalogos` (unidades,
  categorías, artículos, conversiones, lotes, auditoría permanente), `0002_inv2_bodegas_y_accesos`,
  `0003_inv4_kardex` (métodos, documentos, movimientos, existencias, saldos, capas, consumos, recálculos),
  `0004_inv5_recepciones` (repartos, descartes), `0005_inv8_cierres`, `0006_inv9_ajustes`, `0007_inv10_conteos`,
  `0008_inv12_deterioros`, `0009_inv13_autorizaciones_del_libro`. El `check` de clases de `documentos` se amplía en la
  migración del paso que trae la clase nueva.
- **Sin datos que convertir** ni migración de permisos (todos nuevos: el rol con acceso total los recibe solo).
- Libro de compras: `00xx_inv_marca_de_inventario` (§4.1, el número libre al programar), **antes** de `0004_inv5`.
- La prueba `llaves-entre-esquemas` acepta las llaves a `core`, `empresas` (esencial), `libro_de_compras` (directo) y
  `terceros` (transitivo). Ninguna a `activos_fijos`.

## 6. Reglas (un caso de uso por acción)

Todo corre en `UnidadDeTrabajo.ejecutar`. Todo lo que mueve el kardex toma, en este orden: el **candado compartido del
cierre** `pg_advisory_xact_lock_shared(hashtext('inventarios.cierre:<empresa>'))` (cerrar y reabrir toman el exclusivo)
y el **candado de cada artículo** `pg_advisory_xact_lock(hashtext('inventarios.articulo:<articulo_id>'))`, **ordenados
por id** para que dos documentos con los mismos artículos no se bloqueen entre sí. «Mes abierto» = no hay fila en
`cierres` con `estado = 'cerrado'` para ese mes.

### 6.1 Catálogos

`CrearUnidad`/`EditarUnidad`/`InactivarUnidad`/`EliminarUnidad` (sin uso), lo mismo para categorías y artículos. El
artículo no cambia su unidad base ni `maneja_lotes` con movimientos; eliminar solo sin movimientos ni conversiones
usadas; con existencias no se inactiva (`articulo_con_existencias`). Las conversiones se editan en la ficha del artículo
y no se borran si un movimiento las usó (se inactivan quitándolas de la lista, con el factor guardado en el movimiento
porque `cantidad` ya está en la unidad base).

### 6.2 Bodegas

`CrearBodega` (asigna al creador por el disparador y al responsable con usuario), `EditarBodega`, `InactivarBodega` (sin
existencias ni conteos ni traslados en tránsito), `EliminarBodega` (sin documentos). Asignar y quitar usuarios con la
ventana de asignación (`operadorParaAsignar`), como Caja chica.

### 6.3 Recepción desde el libro (`ListarPorRecibir`, `RecibirLineas`, `DescartarLinea`, `DevolverLineaALaBandeja`)

- **Bandeja**: líneas con `es_inventario` de documentos **vigentes** (de cualquier destino de pago), cuyo costo recibido
  vigente ≠ `costoDeLinea`, sin descarte vigente; y notas de crédito sobre facturas con recepciones vigentes, aunque su
  línea no esté marcada (con la recepción propuesta). Muestra documento, proveedor, emisión, concepto, costo, recibido,
  pendiente y el artículo propuesto (el último recibido de ese concepto y proveedor). Aviso en las líneas de documentos
  emitidos antes de la fecha de inicio («si ya estaba en el saldo inicial, descártela»).
- `RecibirLineas` (`recepciones.crear`): `{ fecha, bodegaId, renglones: [{ lineaId, articuloId, loteId | loteNuevo,
  cantidad, unidadId, montoCentavos }] }`. Crea un documento `recepcion_de_compra` por bodega y documento del libro.
  Regla de la línea con `pg_advisory_xact_lock('inventarios.linea:<linea_id>')`: Σ montos vigentes ≤ `costoDeLinea`. La
  fecha puede ser anterior a la emisión (la mercadería llegó antes que la factura) con aviso si la diferencia pasa de 30
  días. Recibir en partes deja el resto en la bandeja.
- Nota de crédito: **devolución** (con cantidad: `devolucion_a_proveedor`, al costo de la entrada) o **rebaja** (sin
  cantidad: `rebaja_de_costo`, §7.5). El monto no pasa del costo de su línea.

### 6.4 Entradas manuales (`RegistrarEntradaManual`, `entradas.crear`)

Causa, soporte, costo escrito por renglón. `donacion_recibida` admite costo 0 con aviso («la NIIF pide el valor
razonable; consulte a su contador»). Una entrada manual no puede referirse a algo que está en el libro (aviso, como el
costo manual de Activos fijos).

### 6.5 Salidas por consumo (`RegistrarSalida`, `salidas.crear`)

Destino (§3.7), renglones con artículo, lote (si lo maneja; se propone el que vence primero, FEFO) y cantidad. El costo
lo pone el método (§7). Con `obra_de_activo_fijo` manda la orden de §4.3 en la misma transacción.

### 6.6 Salidas especiales (`RegistrarSalidaEspecial`, `salidas-especiales.crear`)

Retiro del dueño, donación o muestra, con soporte. Calcula `requiere_factura` (§6.8) y avisa: «El retiro y la donación
son hechos generadores del IVA (Ley del IVA art. 3 nums. 6 y 9): emita la factura con base no menor que el costo de Q x
y anote su número aquí». La FEL se anota al guardar o después (`salidas-especiales.editar`, auditoría `corregir`).

### 6.7 Traslados (`TrasladarArticulos`, `RecibirTraslado`, `AnularTraslado`)

- Origen y destino de la **misma empresa** (la llave compuesta con `empresa_id` lo garantiza; un traslado entre empresas
  no existe: se vende, dictamen §3). Destino ≠ origen.
- Sin tránsito (`inventarios.traslados.con_transito = false`, por omisión): un paso; crea las dos mitades con la misma
  fecha; exige ver las dos bodegas.
- Con tránsito: la salida queda `en_transito` (la cantidad sale del origen y no entra a ninguna bodega; el valor sigue
  en el artículo). `RecibirTraslado` (`traslados.recibir`, lo hace quien ve el destino) crea la entrada con fecha ≥ la de
  la salida y pasa la salida a `recibido`. Una recepción con diferencia de cantidad se registra completa y lo que faltó
  va a un ajuste (no se recibe «menos»).
- Boleta imprimible (número, fecha, origen, destino, artículos, cantidades, quién entrega y quién recibe). El costo **no**
  aparece en la boleta.

### 6.8 IVA del faltante, del retiro y de la donación (`ReglaDeIva`, dominio puro con pruebas)

`requiere_factura = true` si la empresa está en un **régimen de IVA con débito** a la fecha (no `pequeno_contribuyente`;
dictamen §1.2, V-3) **y** además:

| Caso | Requiere factura |
|---|---|
| Faltante `sin_causa_exceptuada` | Sí |
| Faltante `perecedero_o_vencimiento`, `caso_fortuito`, `robo_o_hurto` **sin** soporte (número y archivo) | Sí, con el aviso «sin el acta (o la certificación de la denuncia ratificada) el faltante genera IVA» |
| Los mismos **con** soporte | No |
| `error_de_registro` | No (no es un faltante real: V-6) |
| Salida especial (retiro, donación) | Sí; muestra: V-7 |

El sistema **no decide la exención** (dictamen §3): guarda causa, soporte y la marca, y avisa. Libro de compras siempre
está activo (es la dependencia); si la empresa no tiene datos fiscales, se asume régimen general y el aviso lo dice.

### 6.9 Ajustes (`RegistrarAjuste`, `AprobarAjuste`, `RechazarAjuste`, `AnularAjuste`)

- Registrar (`ajustes.crear`): renglones con causa y soporte; nace `por_aprobar` (INV-A6). No mueve nada.
- Aprobar (`ajustes.aprobar`): mes abierto; exige soporte en causas exceptuadas solo como aviso; crea el documento
  `ajuste` (faltantes al costo del método, sobrantes según §7.4), copia costos y `requiere_factura` a las líneas, y
  publica `inventarios.ajuste_aprobado`. Con `aprobar_lo_propio = false`, quien registró no aprueba.
- Rechazar con motivo. Anular uno aprobado: mes abierto, anula su documento, audita `anular`.
- Si la empresa apaga la aprobación (`inventarios.ajustes.requiere_aprobacion = false`), registrar aprueba en el mismo
  paso con el permiso `ajustes.aprobar` (las dos cosas quedan con el mismo usuario).

### 6.10 Inventario físico (`AbrirConteo`, `RegistrarConteo`, `CerrarConteo`, `AnularConteo`)

- Abrir (`conteos.crear`): copia las existencias de la bodega (o de una categoría) con `congelado_en = now()`. Con
  `inventarios.conteos.bloquear_bodega = true` (por omisión, INV-A8), la bodega **no admite movimientos** mientras el
  conteo esté en curso (`bodega_en_conteo`); si es `false`, la existencia teórica de cierre se recalcula al cerrar con los
  movimientos registrados después de `congelado_en`, y el acta lo dice.
- Contar (`conteos.contar`): por código, código de barras o búsqueda; un artículo que no estaba en la lista se agrega con
  teórica 0. Se puede volver a contar (gana el último, con su hora).
- Cerrar (`conteos.cerrar`): los no contados se confirman como 0 (con confirmación); las diferencias crean un **ajuste
  `por_aprobar`** con `origen = 'conteo'`, con causa `sin_causa_exceptuada` por omisión en los faltantes (quien aprueba
  la cambia y adjunta el soporte) y `sobrante` en los sobrantes. Acta imprimible con participantes y firmas.
- Anular un conteo en curso audita `anular`.

### 6.11 Cierre mensual (`RevisarCierre`, `CerrarMes`, `ReabrirMes`)

- **Orden**: el mes siguiente al último cerrado; el primero, el de la fecha de inicio (o el del primer movimiento).
- **Alcance**: cerrar exige alcance total de bodegas (`cierre_sin_alcance_total`), como Activos fijos.
- **Revisar** — `bloquea`: el mes anterior sin cerrar; carga inicial abierta con saldos iniciales; recepciones vigentes
  de documentos del libro **anulados** (R-1). `aviso`: líneas en la bandeja con emisión del mes o anterior; ajustes por
  aprobar; conteos en curso; traslados en tránsito; lotes vencidos con existencia; en diciembre, ningún conteo cerrado
  en el año («art. 42 num. 3: levante el inventario al 31 de diciembre») y deterioros sin revisar.
- **Cerrar**: candado exclusivo; guarda `existencias_al_cierre` (por artículo y bodega, valor repartido como en §3.2),
  el método y el régimen; publica `inventarios.mes_cerrado`.
- **Reabrir**: solo el último, con motivo; marca su foto `vigente = false`; audita `reabrir`; publica
  `inventarios.mes_reabierto`.

### 6.12 Deterioro (`RegistrarDeterioro`, `AnularDeterioro`; `deterioros.crear`, `.anular`)

Al final de un mes abierto, por artículo: cantidad evaluada, VNR unitario y el monto (lo propone `max(0, valor del kardex
− cantidad × VNR) − estimación vigente`); la reversión, hasta la estimación vigente. Publica el evento con la marca «no
deducible».

### 6.13 Cambio de método (`CambiarMetodoDeCosteo`, `metodo-de-costeo.cambiar`)

§3.3. Audita con la fila anterior; publica `inventarios.metodo_cambiado`. El aviso de la pantalla cita el art. 41.

## 7. Motor de costeo (dominio puro, `dominio/costeo/*.ts`, con pruebas)

Todo en enteros (§3.4); redondeo al centavo «mitad hacia arriba».

### 7.1 Promedio ponderado móvil

Estado del artículo: `C` (cantidad) y `V` (valor). Entrada de `q` con costo `v`: `C += q`, `V += v`. Valor (`m`):
`V += absorbido`. Salida de `q`: si `q = C`, costo = `V` (se lleva el residuo del redondeo); si no, costo =
`round(V × q / C)`; `C −= q`, `V −= costo`. Si `q > C` → `existencia_negativa` (con la fecha). Costo unitario mostrado
= `V / C` con 6 decimales.

### 7.2 Orden del kardex

`(fecha, orden_del_dia, secuencia)`: dentro del día, primero las entradas, luego los valores y al final las salidas, cada
grupo en el orden en que se registró. Así una compra registrada en la tarde después de la salida de la mañana del mismo
día no da una existencia negativa falsa. La boleta y el kardex impreso usan el mismo orden.

### 7.3 Recálculo hacia adelante

Cuando se inserta un movimiento con posición `P` anterior al último del artículo, o se anula uno: se toma el saldo del
movimiento vigente inmediatamente anterior a `P` (sus `saldo_*`; o cero), se recorren en orden los vigentes desde `P`,
se recalculan el costo de las salidas `costo_del_metodo` y los saldos de todos, y se actualizan **solo** las filas que
cambian. Con PEPS, antes se deshacen los consumos de las salidas desde `P` (devolviendo cantidad y valor a sus capas) y
se vuelven a consumir. Si en algún punto la cantidad queda negativa, todo se deshace con `existencia_negativa` (con el
artículo y la fecha). Se revisan dos líneas del tiempo: la cantidad del artículo en la empresa (la del costo) y la de
la bodega y el lote del movimiento nuevo o anulado (una suma acumulada solo de cantidades, sin costo): una salida con
fecha anterior a la entrada de **su** bodega se rechaza aunque otra bodega tuviera existencia. Todo `P` está en un mes abierto (los cerrados quedan antes),
así que nunca se reescribe un mes cerrado. Al final: fila en `recalculos`, `saldos_de_articulos` al día y el evento
`inventarios.costo_recalculado` con `[{ movimientoId, documentoId, diferenciaCentavos }]` si alguna salida cambió.

Las existencias por bodega no cambian en un recálculo (solo cantidades de su propio documento), así que no se tocan.

### 7.4 PEPS

Cada entrada crea su capa. La salida consume las capas vigentes con cantidad, de la más antigua (`fecha`, `secuencia`), y
de cada una toma `round(valor_restante × q / cantidad_restante)` (la capa que se agota entrega todo su valor restante).
El sobrante de un ajuste entra con el costo unitario de la **última entrada** del artículo (con promedio, al promedio
vigente); si nunca hubo entrada, pide el costo a mano. **[corrige el dictamen §4]**, que dice «al costo promedio
vigente» para todos: con PEPS no hay un promedio que sea del método (V-5).

### 7.5 Costos adicionales y rebajas

El monto se reparte entre las entradas elegidas por la base (valor, cantidad, peso con `peso_kg_por_unidad_base`, o a
mano; el último renglón absorbe el redondeo). Para cada entrada, la parte **absorbida** por la existencia es:

- **PEPS**: la proporción de su capa que queda (`cantidad_restante / cantidad_inicial`).
- **Promedio**: `min(1, C del artículo a la fecha del documento / cantidad de la entrada)`.

Lo absorbido entra como movimiento de valor (con su fecha: la del documento de costo, nunca hacia atrás) y lo demás va a
`a_resultados` (costo de ventas o gasto de lo que ya salió, dictamen §4), que Contabilidad toma del evento. Una rebaja
nunca deja el valor del artículo negativo: el exceso va a resultados. La regla del promedio es una aproximación
aceptada por la práctica (los ERP la aplican igual); se valida con el contador (V-2).

### 7.6 Ejemplos para las pruebas

- **Promedio**: entra 100 lb a Q2.00 (Q200.00) y 50 lb a Q2.30 (Q115.00): `C = 150`, `V = 315.00`, promedio
  2.100000. Sale 40 lb: `round(315.00 × 40 / 150) = 84.00`; quedan 110 lb y Q231.00. Sale 110 lb: costo = Q231.00
  (residuo); queda en cero.
- **Recálculo**: con lo anterior, se registra después una entrada del mismo día 1 de 100 lb a Q2.60: la salida de 40
  lb se recalcula con `C = 250`, `V = 575.00` → `92.00`; diferencia +Q8.00 en el evento.
- **PEPS**: las mismas entradas; salen 120 lb: 100 de la primera (Q200.00) y 20 de la segunda (`round(115.00 × 20 / 50) =
  46.00`) = Q246.00.
- **Negativa**: una salida con fecha anterior a la única entrada se rechaza aunque hoy haya existencia.
- **Costo adicional**: flete Q30.00 por cantidad sobre la entrada de 100 lb cuando quedan 60 lb del artículo (promedio):
  absorbe Q18.00 y Q12.00 van a resultados.

## 8. Saldos iniciales y la carga inicial (EM-2)

- Pantalla de Administración **«Saldos iniciales de inventario»** (con Excel): solo con fecha de inicio, carga **abierta**
  (`empresas.obtener_carga_inicial`, que bloquea la fila `for share`) y **ningún cierre**. Un renglón por artículo,
  bodega y lote (con su vencimiento), con cantidad (en cualquier unidad del artículo) y costo total; con PEPS, varios
  renglones del mismo artículo con su **fecha de la capa** (la de compra real, anterior a la fecha de inicio). Se guarda
  en un documento `saldo_inicial` por bodega con fecha = día anterior a la fecha de inicio.
- El método debe estar elegido antes del primer saldo inicial (§3.3): se pregunta en la misma pantalla si no lo está.
- Corregir o eliminar renglones (`saldos-iniciales.editar` / `.eliminar`) con la carga abierta: anula y vuelve a crear
  el movimiento y recalcula hacia adelante si ya hubo movimientos (causa `saldo_inicial_corregido`); auditoría `corregir`
  o `eliminar` con el renglón.
- **Respuesta a `empresas.revisar_cierre_de_carga`** (`RevisarCierreDeCargaEnInventarios`):

| Código | Nivel | Mensaje |
|---|---|---|
| `sin_saldos_iniciales` | aviso | «No hay existencias de saldo inicial. Si la empresa tenía inventario al dd/mm/aaaa, cárguelo antes de cerrar.» |
| `existencias_sin_costo` | aviso | «N artículos tienen existencia con costo cero: revise su costo.» |
| `lotes_vencidos` | aviso | «N lotes de saldo inicial ya estaban vencidos al dd/mm/aaaa por Q x: considere el deterioro.» |
| `sin_conteo_de_respaldo` | aviso | «El saldo inicial no tiene un inventario físico que lo respalde; levante uno al empezar.» (solo si no hay conteos) |

  Cifras (`registro = null`): Artículos con existencia (cantidad), Valor del inventario (monto); por tipo de inventario
  (`registro` = `{ id: <tipo>, nombre: <nombre del tipo> }`) y por bodega (hasta completar 200). Resumen: «N artículos
  por Q x en M bodegas al dd/mm/aaaa». Ruta: `/inventarios/saldos-iniciales`.
- **Aviso `empresas.fecha_de_inicio_por_cambiar`**: rechaza (`inventario_con_fecha_fuera_de_la_carga`) si hay un cierre,
  algún movimiento que no sea de saldo inicial con fecha anterior a la nueva, o alguna capa con fecha igual o posterior.
  Si no, mueve la fecha de los documentos de saldo inicial al nuevo día anterior.

## 9. Eventos (`core/contratos/inventarios.contratos.ts`)

Se publican en el bus **después de confirmar**. Todos llevan `empresaId`, `documentoId`, `clase`, `numero`, `fecha`,
`bodegaId` y renglones `[{ movimientoId, articuloId, tipoDeInventario, cantidad (texto), costoCentavos }]`; el dinero en
**centavos de quetzal**.

| Evento | Cuándo | Datos propios (además de los comunes) |
|---|---|---|
| `inventarios.entrada_registrada` | Recepción, entrada manual, entrada de traslado (con `esTraslado`) | `documentoDeCompraId`, líneas del libro, `causa` |
| `inventarios.devolucion_a_proveedor` | Devolución | Entradas devueltas |
| `inventarios.costo_ajustado` | Costo adicional y rebaja | `repartos: [{ movimientoDeEntradaId, absorbidoCentavos, aResultadosCentavos }]`, origen (línea del libro o soporte) |
| `inventarios.salida_registrada` | Salida por consumo | `destino`, `conceptoDeGastoId`, `localidadId`, `departamentoId`, `activoFijoId` |
| `inventarios.salida_especial` | Retiro, donación, muestra | `causa`, `requiereFactura`, FEL |
| `inventarios.traslado_registrado` | Salida de traslado (informativo) | Origen, destino, `enTransito` |
| `inventarios.ajuste_aprobado` | Aprobar ajuste | Por línea: `causa`, `requiereFactura`; `destinoDelSobrante` (la variable de la empresa, INV-P11) |
| `inventarios.costo_recalculado` | Recálculo con diferencias | `diferencias: [{ movimientoId, documentoId, diferenciaCentavos }]` |
| `inventarios.documento_anulado` | Anular cualquier documento | `documentoId`, `clase` (Contabilidad revierte lo suyo) |
| `inventarios.deterioro_registrado` / `deterioro_revertido` / `deterioro_anulado` | Deterioro | `articuloId`, `montoCentavos`, `noDeducible: true` |
| `inventarios.mes_cerrado` / `mes_reabierto` | Cierre | `periodo`, `valorTotalCentavos`, totales por tipo de inventario |
| `inventarios.metodo_cambiado` | Cambio de método | `metodo`, `desde`, autorización |

Mediador: Inventarios **escucha** `libro-de-compras.documento_por_anular` y `…_por_eliminar` (R-1), **responde**
`empresas.revisar_cierre_de_carga`, **escucha** `empresas.fecha_de_inicio_por_cambiar` y **pide** a Activos fijos las
órdenes de §4.3. Para Ventas y Cultivos quedan reservadas (se declaran con ellos): `inventarios.registrar_salida_por_venta`
(responde el costo), `inventarios.registrar_devolucion_de_venta` (al costo de la salida original) e
`inventarios.registrar_entrada_de_produccion` (con el valor que da Cultivos, NIIF 13.15).

## 10. Permisos, auditoría, errores y configuración

### 10.1 Permisos (`permisos.ts`, PLAN §3.5)

| Recurso | Permisos |
|---|---|
| Unidades | `inventarios.unidades.ver`, `.crear`, `.editar`, `.eliminar`, `.importar`, `.exportar` |
| Categorías | `inventarios.categorias.ver`, `.crear`, `.editar`, `.eliminar`, `.importar`, `.exportar` |
| Artículos (con conversiones y lotes) | `inventarios.articulos.ver`, `.crear`, `.editar`, `.eliminar`, `.importar`, `.exportar` |
| Bodegas | `inventarios.bodegas.ver`, `.crear`, `.editar`, `.eliminar`, `.importar`, `.exportar`, `.ver-todas` (alcance total), `.asignar` (ventana de asignación) |
| Existencias y kardex | `inventarios.existencias.ver`; `inventarios.costos.ver` (ver montos y costos; sin él, los DTO llevan solo cantidades, INV-A7) |
| Política de costeo | `inventarios.metodo-de-costeo.ver`, `.elegir` (la primera, sin movimientos), `.cambiar` (con autorización de la SAT) |
| Recepciones (bandeja) | `inventarios.recepciones.ver`, `.crear`, `.anular`, `.descartar` (descartar y devolver líneas) |
| Costos adicionales y rebajas | `inventarios.costos-adicionales.crear`, `.anular` |
| Entradas manuales | `inventarios.entradas.crear`, `.anular` |
| Salidas | `inventarios.salidas.crear`, `.anular` |
| Salidas especiales | `inventarios.salidas-especiales.crear`, `.editar` (anotar la FEL), `.anular` |
| Traslados | `inventarios.traslados.crear`, `.recibir`, `.anular` |
| Ajustes | `inventarios.ajustes.ver`, `.crear`, `.aprobar` (y rechazar), `.anular` |
| Inventario físico | `inventarios.conteos.ver`, `.crear`, `.contar`, `.cerrar`, `.anular` |
| Cierre | `inventarios.cierres.ver`, `.cerrar`, `.reabrir` |
| Deterioro | `inventarios.deterioros.ver`, `.crear`, `.anular` |
| Saldos iniciales | `inventarios.saldos-iniciales.ver`, `.crear`, `.editar`, `.eliminar`, `.importar`, `.exportar` |
| Autorizaciones del libro | `inventarios.autorizaciones-del-libro.ver`, `.crear`, `.editar`, `.eliminar` |
| Reportes | `inventarios.reportes.ver`, `.exportar` |

`recursosConAlcance`: `inventarios.bodegas` (`ALCANCE_DE_BODEGAS`, `permisoVerTodos: 'inventarios.bodegas.ver-todas'`,
`permisoAsignar: 'inventarios.bodegas.asignar'`). Las boletas, actas y fichas se imprimen con su `.ver`.

### 10.2 Auditoría (en la unidad de trabajo; `core.auditoria` solo se agrega)

| Caso de uso | `recurso` | `accion` | `anterior` |
|---|---|---|---|
| Inactivar, reactivar, eliminar unidad, categoría, artículo, bodega | `inventarios.<plural>` | `inactivar` / `reactivar` / `eliminar` | DTO |
| Asignar y quitar usuarios de una bodega | `inventarios.bodegas` | `asignar` / `quitar` | Usuario y bodega |
| Anular cualquier documento (recepción, entrada, salida, traslado, costo adicional) | `inventarios.<plural del documento>` | `anular` | DTO con sus renglones y costos |
| Anotar o corregir la FEL de una salida especial o de un ajuste | `inventarios.salidas-especiales` / `.ajustes` | `corregir` | DTO anterior |
| Descartar y devolver línea de la bandeja | `inventarios.recepciones` | `descartar` / `devolver` | Línea (documento, número, costo) |
| Aprobar, rechazar, anular ajuste | `inventarios.ajustes` | `aprobar` (o `autorizar`) / `descartar` / `anular` | DTO con líneas, causas y soportes |
| Anular conteo | `inventarios.conteos` | `anular` | DTO con lo contado |
| Cerrar y reabrir mes | `inventarios.cierres` | `cerrar` / `reabrir` | Totales del cierre; motivo |
| Elegir y cambiar el método | `inventarios.metodos-de-costeo` | `corregir` (o `cambiar_metodo`) | Fila anterior; autorización |
| Anular deterioro | `inventarios.deterioros` | `anular` | DTO |
| Corregir o eliminar saldo inicial | `inventarios.saldos-iniciales` | `corregir` / `eliminar` | Renglón |

Permanentes (§4.2): `inventarios.metodos-de-costeo`, `inventarios.cierres`, `inventarios.ajustes`.

### 10.3 Errores nuevos (código propio, familias del core)

`existencia_negativa` (con artículo y fecha), `mes_cerrado`, `mes_anterior_sin_cerrar`, `cierre_sin_alcance_total`,
`cierre_con_bloqueos`, `solo_se_reabre_el_ultimo`, `bodega_en_conteo`, `conteo_en_curso_en_la_bodega`,
`bodega_fuera_de_alcance`, `traslado_a_la_misma_bodega`, `traslado_ya_recibido`, `linea_sobrerrecibida`,
`linea_descartada`, `linea_no_recibible` (documento anulado u otra empresa), `lote_obligatorio`, `vencimiento_obligatorio`,
`unidad_sin_conversion`, `articulo_con_existencias`, `articulo_con_movimientos`, `unidad_base_fija`,
`metodo_no_elegido`, `metodo_fijado`, `cambio_de_metodo_sin_autorizacion`, `cambio_de_metodo_con_movimientos`,
`aprobar_lo_propio`, `ajuste_no_por_aprobar`, `deterioro_mayor_que_el_valor`, `reversion_mayor_que_la_estimacion`,
`fecha_anterior_al_inicio`, `carga_inicial_cerrada`, `saldos_con_cierres`, `inventario_con_fecha_fuera_de_la_carga`,
`documento_con_recepciones` (el que recibe Libro de compras al anular o eliminar), `activo_fijo_no_disponible`,
`linea_con_dos_destinos_del_costo` (en Libro de compras).

### 10.4 Configuración (`configuracion.ts`; solo niveles `instalacion` y `empresa`)

| Clave | Nivel | Valor por omisión | Para qué |
|---|---|---|---|
| `inventarios.costeo.metodo_inicial` | empresa, instalación | `promedio_ponderado` | El que se propone y se fija con el primer movimiento si nadie eligió (§3.3) |
| `inventarios.traslados.con_transito` | empresa | `false` | §6.7 (INV-A11) |
| `inventarios.ajustes.requiere_aprobacion` | empresa | `true` | §6.9 (INV-A6) |
| `inventarios.ajustes.aprobar_lo_propio` | empresa | `false` | Segregación de funciones |
| `inventarios.ajustes.destino_del_sobrante` | empresa | `otros_ingresos` | `otros_ingresos` o `menor_costo_de_ventas`; solo viaja en el evento (INV-P11) |
| `inventarios.conteos.bloquear_bodega` | empresa | `true` | §6.10 (INV-A8) |
| `inventarios.vencimientos.dias_de_aviso` | empresa, instalación | `30` | Etiqueta «Por vencer» y reporte |
| `inventarios.codigos.prefijo` | empresa | `ART-` | Código propuesto del artículo; `publica: true` |

## 11. API (todas con `proteger({ permiso })`; dinero como texto, cantidades como texto con 4 decimales)

| Método y ruta | Permiso |
|---|---|
| `GET/POST /inventarios/unidades`, `PUT …/:id`, `POST …/:id/inactivar` y `/reactivar`, `DELETE …/:id`; `GET …/exportar`, `…/plantilla`, `POST …/importar` | `unidades.*` |
| Lo mismo para `/inventarios/categorias`, `/inventarios/articulos` (con `PUT …/:id/conversiones` y `GET/POST …/:id/lotes`) y `/inventarios/bodegas` (con `GET/PUT …/:id/accesos`) | `<plural>.*`; accesos con `bodegas.asignar` |
| `GET /inventarios/existencias` (filtros: bodega, categoría, tipo, artículo, lote, bajo el mínimo, por vencer), `GET /inventarios/articulos/:id/kardex` (bodega, desde, hasta) | `existencias.ver` (+ `costos.ver` para montos) |
| `GET /inventarios/metodo-de-costeo`, `POST …` (elegir), `POST …/cambios` (con autorización, multipart para el archivo) | `metodo-de-costeo.*` |
| `GET /inventarios/por-recibir`, `POST /inventarios/recepciones`, `POST …/:id/anular`, `POST /inventarios/por-recibir/:lineaId/descartar` y `/devolver` | `recepciones.*` |
| `POST /inventarios/devoluciones-a-proveedor`, `POST /inventarios/rebajas-de-costo`, `POST /inventarios/costos-adicionales`, `POST …/:id/anular` | `recepciones.crear` / `costos-adicionales.*` |
| `POST /inventarios/entradas`, `POST /inventarios/salidas`, `POST /inventarios/salidas-especiales` (y `PUT …/:id/fel`), cada uno con `POST …/:id/anular` | `entradas.*`, `salidas.*`, `salidas-especiales.*` |
| `GET /inventarios/documentos` (lista de todos con filtros), `GET …/:id` (con renglones), `GET …/:id/boleta` | `existencias.ver` |
| `POST /inventarios/traslados`, `POST …/:id/recibir`, `POST …/:id/anular` | `traslados.*` |
| `GET/POST /inventarios/ajustes`, `POST …/:id/aprobar`, `/rechazar`, `/anular`, `POST …/lineas/:lineaId/soporte` (multipart) | `ajustes.*` |
| `GET/POST /inventarios/conteos`, `GET …/:id`, `POST …/:id/contar` (`{ articuloId | codigo, loteId?, contado }`), `POST …/:id/cerrar`, `/anular`, `GET …/:id/acta` | `conteos.*` |
| `GET /inventarios/cierres`, `GET …/:periodo/revision`, `POST …/:periodo/cerrar` (con la huella de la revisión, como EM-2), `POST …/:periodo/reabrir` | `cierres.*` |
| `GET/POST /inventarios/deterioros`, `POST …/:id/anular` | `deterioros.*` |
| `GET/POST /inventarios/saldos-iniciales`, `PUT …/:movimientoId`, `DELETE …/:movimientoId`; `GET …/exportar`, `…/plantilla`, `POST …/importar` | `saldos-iniciales.*` |
| `GET/POST /inventarios/autorizaciones-del-libro`, `PUT …/:id`, `DELETE …/:id` | `autorizaciones-del-libro.*` |
| `GET /inventarios/reportes/<reporte>` y `…/<reporte>/exportar` | `reportes.ver` / `.exportar` (+ `costos.ver` para montos) |

Límites: `contar` es la ruta más usada del conteo: con el límite general de la API; los soportes con el `limitarSubidas`
de archivos.

## 12. Cliente (`cliente/src/modulos/inventarios/`)

| Sección del menú | Pantalla | Forma |
|---|---|---|
| Operación | **Existencias** | Lista con tarjetas por artículo (código, nombre, existencia total y por bodega, costo y valor si puede verlos, etiquetas «Bajo el mínimo», «Por vencer», «Sin existencia») → **ficha del artículo** (`DatosDelRegistro`) con pestañas Datos, Existencias por bodega y lote, Kardex, Conversiones |
| Operación | **Por recibir** (bandeja) | Lista agrupada por documento del libro; elegir líneas → ventana «Recibir» (artículo, lote, cantidad con su unidad, monto, con el pendiente a la vista); descartar con motivo; devolución o rebaja para las notas |
| Operación | **Movimientos** | Lista de documentos con filtros (clase, bodega, fecha, estado) → ficha imprimible; botones «Entrada», «Salida», «Salida especial», «Costo adicional» (formularios en página, renglones con buscador de artículo y lector de código) |
| Operación | **Traslados** | Elegir origen y destino → renglones → boleta; «Por recibir» para los en tránsito |
| Operación | **Ajustes** | Lista por estado; registrar; aprobar y rechazar; adjuntar actas |
| Operación | **Inventario físico** | Abrir por bodega; pantalla de conteo para el teléfono: botón grande «Escanear», último leído, contadores (esperados, contados, pendientes), búsqueda por código como respaldo; cerrar con resumen; acta imprimible |
| Operación | **Cierre de inventario** | Meses con estado; «Revisar» (hallazgos y totales, como EM-2), «Cerrar», «Reabrir» con motivo |
| Operación | **Deterioro** | Lista y registro al cierre |
| Administración | **Artículos**, **Categorías**, **Unidades de medida**, **Bodegas** (con asignación de usuarios) | Catálogos con Excel (artículo: formulario en página con `CamposDeArticulo`) |
| Administración | **Política de costeo** | El método vigente, su historia y «Cambiar método» con la autorización de la SAT |
| Administración | **Saldos iniciales de inventario** (con Excel) | Lista con totales del cuadre; avisos de la carga cerrada |
| Administración | **Libro de inventarios** (autorizaciones y folios) | Catálogo |
| Reportes | §13 | Imprimir y exportar |

Notas: la página solo arma; composables `usarExistencias`, `usarPorRecibir`, `usarDocumentoDeInventario`,
`usarConteo`, `usarCierreDeInventario`; la lógica pura (conversión de unidades para mostrar, reparto del costo
adicional, armado de renglones, validación del pendiente de la línea) en `edicion-de-*.ts` con pruebas. Cantidades y
costos con `utilidades/formato.ts` (hacen falta formatos de cantidad con 4 decimales y de costo unitario con 6, que se
agregan ahí). Sin `costos.ver`, ninguna pantalla muestra montos. El lector de código de barras y QR comparte la
dependencia que elija Activos fijos (AF-12c), revisada por `seguridad`.

## 13. Reportes (sección Reportes: imprimir y exportar)

| Reporte | Contenido | Filtros |
|---|---|---|
| **Kardex por artículo** | Movimientos en orden (§7.2) con entradas, salidas, saldo en cantidad, costo unitario y valor; por bodega solo cantidades con el costo de la empresa | Artículo, bodega, desde, hasta |
| **Existencias valuadas** | Por artículo (y bodega): cantidad, costo unitario, valor; totales por tipo y categoría. A un mes cerrado sale de `existencias_al_cierre`; a otra fecha, de los movimientos (y lo dice) | Fecha de corte, bodega, tipo, categoría |
| **Reporte semestral (SAT)** | Corte 30-jun o 31-dic (mes cerrado obligatorio): columnas de la plantilla oficial (V-4), con el número de autorización y los folios. Aviso si la empresa no está en el régimen sobre las utilidades a esa fecha (no la obliga) | Semestre |
| **Detalle para el Libro de inventarios** | Apertura (saldos iniciales) y cada cierre anual: artículo, cantidad, costo unitario, valor, totales por tipo; espacio para firmas del comerciante y el contador | Año |
| **Artículos por vencer** | Lotes con vencimiento dentro de N días o vencidos, con existencia por bodega | Días, bodega |
| **Rotación y obsolescencia** | Salidas del período ÷ existencia media, días de inventario, artículos sin movimiento en N meses (apoyo al VNR) | Período, bodega |
| **Consumos por destino** | Salidas por concepto de gasto, localidad, departamento y activo fijo | Período |
| **Ajustes y faltantes** | Por causa, con soporte sí o no y si requiere factura (FEL anotada o pendiente) | Período, bodega |
| **Cuadre del kardex** | Existencias de la caché contra la suma de movimientos; valor de `saldos_de_articulos` contra el último saldo; capas contra saldo. Debe salir vacío (control técnico para soporte y auditoría) | — |
| Documentos | Boleta de traslado, comprobante de entrada y de salida, acta de ajuste, acta de inventario físico | Desde su pantalla |

Los reportes respetan el alcance por bodega: quien no ve todas lo dice el encabezado («Solo las bodegas asignadas»). El
reporte semestral y el Libro de inventarios exigen alcance total (si no, saldrían incompletos).

## 14. Excel (según la sección del menú)

| Pantalla | Sección | Importar | Exportar |
|---|---|---|---|
| Unidades, Categorías | Administración | Sí | Sí |
| Artículos | Administración | Sí: código, nombre, categoría y unidad base por nombre, tipo, lotes, vencimiento, código de barras, concepto de gasto por nombre, mínimo, peso | Sí |
| Bodegas | Administración | Sí: código, nombre, localidad por nombre, responsable. Con `sinAsignarAlCrear` (el que importa no queda asignado) | Sí |
| Saldos iniciales de inventario | Administración | Sí: artículo (código), bodega (código), lote y vencimiento, cantidad, unidad, costo total, fecha de la capa (PEPS); todo o nada, ensayo, 5,000 filas | Sí |
| Política de costeo, Libro de inventarios | Administración | No (pocos datos) | No |
| Existencias, bandeja, movimientos, traslados, ajustes, conteos, cierre, deterioro | Operación | No | No (se consulta en los reportes) |
| Reportes | Reportes | No | Sí |

Columnas en `http/<plural>.columnas.ts` con `validadorDeZod` del mismo esquema del formulario; cantidades y montos como
texto.

## 15. Convivencia y riesgos

| # | Tema | Qué pasa | Qué se hace |
|---|---|---|---|
| R-1 | Anular o eliminar en el libro un documento con recepciones | Inventarios escucha `documento_por_anular` y `…_por_eliminar` y lanza `documento_con_recepciones` (con los números) si tiene recepciones, devoluciones, rebajas o costos adicionales vigentes. **Con Inventarios inactivo el mediador no lo llama** | Eliminar sigue bloqueado por la llave de `movimientos` (el libro traduce el error de llave a un mensaje claro, paso INV-5). Anular con el módulo inactivo deja recepciones de un documento anulado: el **cierre lo bloquea** y la ficha lo marca, hasta anularlas |
| R-2 | Una misma línea a gasto, activo fijo e inventario | Imposible: el `check` de la línea; el concepto propone una sola marca | Descartar en la bandeja si la marca estaba mal (V-8) |
| R-3 | Alcance por bodega y movimientos sin la política | Un `select` directo a `movimientos` mostraría otras bodegas | El repositorio solo lee movimientos unidos a `documentos`; prueba de aislamiento con dos bodegueros (lista, kardex, ficha, reportes) |
| R-4 | Recálculo largo | Un artículo de mucho uso con un movimiento a inicio de mes reescribe todas sus salidas del mes | Solo meses abiertos; se actualizan solo las filas que cambian; aviso en la pantalla si se registra con fecha anterior («recalculará N salidas»). Prueba de rendimiento con 5,000 movimientos de un artículo en un mes |
| R-5 | Bloqueos entre documentos | Dos documentos con los mismos artículos | Candados por artículo ordenados por id; el del cierre compartido primero |
| R-6 | Caja chica o anticipos con vales sin factura | No hay línea que recibir | Entrada manual con soporte o factura especial en el libro (§4.4) |
| R-7 | Multimoneda | Una factura en USD llega al libro con sus líneas en GTQ | El costo se toma en GTQ y nunca se revalúa (no monetario). Sin columnas de moneda |
| R-8 | Activos fijos inactivo o no programado | Las salidas a obra o mantenimiento no tienen a quién avisar | No se ofrecen esos destinos; INV-AF se programa después de AF-3 |
| R-9 | Ventas y Cultivos (futuros) | Necesitan sacar al costo y meter cosecha | Dependerán de `inventarios` y usarán las órdenes reservadas de §9; Inventarios no depende de ellos |
| R-10 | Contabilidad (futura) | Necesita cuentas por tipo de inventario y por concepto de gasto | Las guarda Contabilidad (sus enlaces tipo → cuenta), como con Bancos y Activos fijos |
| R-11 | Cachés que se desvían | `existencias` y `saldos_de_articulos` no cuadran con el kardex por un error de programación | Se escriben solo en el mismo caso de uso que el movimiento; reporte «Cuadre del kardex» y una prueba que lo corre después de cada prueba de integración del módulo |
| R-12 | Volumen | 300 artículos y 2,000 movimientos al mes = 24,000 filas al año por empresa | Índices parciales por `vigente`; el reporte del período lee por `(empresa_id, fecha)`; las existencias salen de la caché |
| R-13 | Mismo usuario que registra y aprueba un faltante | Riesgo de ocultar robos | `aprobar_lo_propio = false` por omisión |

## 16. Pasos (un commit cada uno; servidor y cliente por separado, con pruebas)

| Paso | Qué | Quién |
|---|---|---|
| **INV-0** | Libro de compras: `es_inventario` en líneas y conceptos con sus checks, único de líneas (si AF-0 no lo trajo), dominio, Zod, Excel y bandeja de DTE; pruebas de los checks y de la exclusión con activo fijo | backend |
| INV-0c | Casilla «Inventario» en la línea y en el concepto de gasto (excluyente con «Activo fijo») | frontend |
| **INV-1** | Esqueleto del módulo, `0001_inv1_catalogos`, auditoría permanente, configuración, semilla perezosa de unidades, artículos con conversiones y lotes, Excel; pruebas de tablas, de API y de conversiones | backend |
| INV-1c | Unidades, Categorías y Artículos (catálogos con Excel, ficha del artículo sin kardex) | frontend |
| **INV-2** | Bodegas con alcance, accesos, ventana de asignación, Excel con `sinAsignarAlCrear`; pruebas de aislamiento | backend |
| INV-2c | Bodegas y asignación de usuarios | frontend |
| **INV-3** | Motor de costeo puro (§7: promedio, PEPS, recálculo, redondeo, negativos, costos adicionales) con los ejemplos de §7.6; sin base de datos | backend |
| **INV-4** | `0003_inv4_kardex`: métodos de costeo (elegir), documentos, movimientos, existencias, saldos, capas, recálculos; entradas manuales, salidas por consumo (destino `gasto`), anular; candados; pruebas de concurrencia, de recálculo, de RLS (R-3) y de cuadre | backend |
| INV-4c | Existencias, ficha con kardex, Movimientos (entrada y salida), Política de costeo | frontend |
| **INV-5** | Bandeja por recibir, recepciones, devoluciones, rebajas, descartes, avisos del libro (R-1) y mensaje del error de llave en el libro | backend |
| INV-5c | Por recibir | frontend |
| **INV-6** | Traslados con y sin tránsito, boleta | backend |
| INV-6c | Traslados | frontend |
| **INV-7** | Saldos iniciales, pregunta de EM-2, aviso de fecha de inicio, Excel | backend |
| INV-7c | Saldos iniciales de inventario | frontend |
| **INV-8** | Cierres y existencias al cierre; revisar, cerrar, reabrir; eventos del bus | backend |
| INV-8c | Cierre de inventario | frontend |
| **INV-9** | Ajustes con aprobación, soportes (archivos), regla de IVA (§6.8), salidas especiales | backend |
| INV-9c | Ajustes y salida especial | frontend |
| **INV-10** | Inventario físico (bloqueo de bodega, cierre con ajuste) | backend |
| INV-10c | Conteo desde el teléfono con lector (dependencia compartida con AF-12c) | frontend |
| **INV-11** | Costos adicionales con reparto y absorción | backend |
| INV-11c | Costo adicional | frontend |
| **INV-12** | Deterioro a VNR | backend |
| INV-12c | Deterioro | frontend |
| **INV-13** | Reportes de §13 y autorizaciones del libro (el reporte semestral, después de V-4) | backend |
| INV-13c | Pantallas de reportes | frontend |
| **INV-14** | Cambio de método con autorización de la SAT | backend y frontend |
| **INV-AF** | Órdenes con Activos fijos (§4.3); cambio del `check` de `activos_fijos.costos.origen` | backend (después de AF-3) |
| INV-QA | Punta a punta (factura en el libro → por recibir → salida → traslado con tránsito → conteo → ajuste → cierre; saldos iniciales → cierre de la carga) | pruebas-qa |

INV-0 se puede programar en cuanto el usuario apruebe INV-A9. INV-3 no depende de la base y puede ir en paralelo con
INV-1 e INV-2. INV-7 puede adelantarse a INV-5 si se quiere cargar saldos primero.

## 17. Preguntas para el usuario

Del dictamen (con la recomendación del contador, que el arquitecto comparte salvo donde se dice):

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| INV-P1 | ¿Qué métodos de costeo en v1? | a) Solo promedio ponderado móvil; b) promedio y PEPS; c) además, identificación específica por serie | **b**; la c después |
| INV-P2 | ¿Método por empresa o por categoría? | a) Uno por empresa; b) por categoría | **a** |
| INV-P3 | ¿Dónde vive el préstamo de herramientas y equipo? | a) Activos fijos (bien de control); b) Inventarios | **a**: no es inventario. Corrige `PLAN.md` §6 y la tabla de alcance de `diseno-activos-fijos.md` |
| INV-P4 | ¿Existencias negativas? | a) Nunca; b) con permiso y costo provisional | **a** |
| INV-P5 | ¿Bodegas? | a) Una por localidad; b) varias por localidad | **b** |
| INV-P6 | ¿Lotes y vencimientos en v1? | a) Sí, opcional por artículo; b) después | **a** |
| INV-P7 | ¿FEL del faltante, retiro o donación? | a) Avisar y anotar la emitida afuera; b) emitirla cuando exista Ventas | **a** en v1 |
| INV-P8 | ¿Reporte semestral en v1? | a) Sí, con la plantilla oficial; b) solo existencias valuadas en Excel | **a**, cuando alguien baje la plantilla (V-4); mientras tanto, b |
| INV-P9 | ¿Costos adicionales (flete, DAI) en v1? | a) Sí; b) después | **a** (paso INV-11) |
| INV-P10 | ¿Deterioro a VNR en v1? | a) Registro manual al cierre; b) después | **a** (paso INV-12, al final) |
| INV-P11 | ¿El sobrante va a otros ingresos o resta del costo de ventas? | Política por empresa | Variable de empresa, por omisión otros ingresos |

Del arquitecto:

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| INV-A1 | ¿De qué depende el módulo? | a) Solo de Libro de compras; b) de nada (sin ligar con el libro: toda entrada es manual) | **a**: las compras llegan por las líneas del libro con llave; sin libro el costo se escribiría dos veces |
| INV-A2 | ¿Catálogo de artículos por empresa o por cuenta? | a) Por empresa; b) por cuenta (como Clientes), con el costo por empresa | **a**: método, conceptos de gasto y bodegas son por empresa; compartir el catálogo complica la RLS y los Excel. Si un grupo con varias empresas lo pide, se copia por Excel |
| INV-A3 | ¿Quién ve qué bodega? | a) Todos (solo permisos); b) alcance propio por bodega; c) el alcance de localidades de Empresas | **b**: varias bodegas por localidad con bodegueros distintos; el cierre exige ver todas |
| INV-A4 | ¿Costo promedio por artículo en la empresa o por bodega? | a) Por empresa; b) por bodega | **a**: el traslado no cambia costos y la SAT pide un costo por artículo |
| INV-A5 | ¿Registrar con fecha anterior a otros movimientos? | a) Sí, dentro de meses abiertos, con recálculo; b) no: solo con fecha igual o posterior al último movimiento del artículo | **a** (lo recomienda el dictamen): las facturas llegan tarde. Con aviso de cuántas salidas recalculará |
| INV-A6 | ¿Los ajustes se aprueban? | a) Siempre, por otro usuario; b) configurable por empresa (por omisión, sí y por otro); c) no | **b** |
| INV-A7 | ¿Permiso aparte para ver costos y valores? | a) Sí (`inventarios.costos.ver`): el bodeguero ve solo cantidades; b) no | **a** |
| INV-A8 | ¿El conteo físico bloquea la bodega? | a) Sí, mientras está en curso; b) no, se ajusta con lo movido después; c) configurable (por omisión, a) | **c** |
| INV-A9 | ¿Cómo marca el libro una línea de inventario? | a) Casilla `es_inventario` excluyente con `es_activo_fijo`; b) cambiar las dos por `naturaleza` (gasto, activo fijo, inventario) | **a** en v1 |
| INV-A10 | ¿El concepto de gasto es obligatorio en la salida a gasto? | a) Sí (propuesto por el artículo); b) opcional | **a**: sin él Contabilidad no sabe a qué gasto va |
| INV-A11 | ¿Traslados con tránsito? | a) Configurable por empresa, sin tránsito por omisión; b) siempre en dos pasos | **a** |
| INV-A12 | ¿Retiros del dueño, donaciones y muestras en v1? | a) Sí (salida especial con aviso de IVA); b) después | **a**: es poco y evita que se registren como consumo |
| INV-A13 | ¿Lector de códigos de barras en el conteo y los renglones? | a) Sí, con la misma dependencia que Activos fijos; b) solo escribir el código | **a** si se aprueba en Activos fijos (AF-P13); si no, b |
| INV-A14 | ¿Desde cuándo vale un cambio de método? | a) Desde el 1.º de enero de un año; b) desde cualquier mes abierto sin movimientos | **a**: el art. 41 habla del cierre del período; validar (V-1) |
| INV-A15 | ¿Reabrir meses? | a) Solo el último, de uno en uno; b) cualquiera | **a**, con motivo y auditoría |

## 18. Para validar antes de programar

Con `contador-guatemala` (además de los cinco puntos de certeza B del dictamen §7):

| # | Punto | Propuesta del diseño |
|---|---|---|
| V-1 | Desde cuándo rige un método cambiado con autorización | 1.º de enero (INV-A14) |
| V-2 | Absorción de costos adicionales y rebajas con promedio: `min(1, existencia / cantidad de la entrada)` | §7.5 |
| V-3 | Régimen de pequeño contribuyente: el faltante no genera débito | Sin `requiere_factura` (§6.8) |
| V-4 | Plantilla oficial del reporte semestral y los tipos de inventario (¿en tránsito, en consignación y pignorado son tipos o estados?) | Siete tipos en el artículo; tránsito por el estado del traslado; consignación y pignorado fuera de v1 |
| V-5 | Sobrante con PEPS: ¿costo de la última entrada? | §7.4 **[corrige el dictamen §4]** |
| V-6 | `error_de_registro` (una salida mal escrita en un mes cerrado) no es faltante y no genera IVA | §6.8 |
| V-7 | Muestras gratis: ¿hecho generador como la donación? | Se marcan `requiere_factura` hasta que el contador diga otra cosa |
| V-8 | Línea marcada inventario y descartada en la bandeja | Solo aviso (como V-11 de Activos fijos) |
| V-9 | Costo promedio por empresa y no por bodega frente al art. 41 | §3.2 (INV-A4) |
| V-10 | Donación **recibida** a costo cero o a valor razonable | Aviso; el usuario escribe el valor |
| V-11 | Un mes cerrado y una nota de crédito que llega después: rebaja con fecha de la nota, sin tocar el mes cerrado | §7.5 |

Con `seguridad`: el lector de códigos (dependencia compartida con Activos fijos), los soportes de ajustes y del cambio
de método (`core.archivos`, PDF con qpdf, `recurso_dueno`), que los DTO sin `costos.ver` no lleven montos, y la prueba de
aislamiento por bodega con `movimientos` sin política de alcance (R-3).

## 19. Pendientes que este diseño deja anotados

- Préstamo de herramientas en Activos fijos (si se aprueba INV-P3) y corrección de `PLAN.md` §6 y de la tabla de alcance
  y el R-9 de `diseno-activos-fijos.md`.
- Identificación específica por serie (INV-P1 c) y método por categoría (INV-P2 b).
- Órdenes para Ventas (salida por venta, devolución al costo original, consignación) y Cultivos (entrada de cosecha).
- Recepción **antes** de la factura (mercadería recibida sin documento, con costo provisional que se ajusta al llegar la
  factura): hoy se espera la factura o se usa la fecha real con el mes abierto.
- Alertas de vencimiento por correo cuando exista el correo saliente para avisos (PLAN §6).
- Con Contabilidad: cuentas por tipo de inventario, cuenta de mercadería en tránsito, partidas de los eventos de §9 y el
  Libro de inventarios completo.

## Respuestas del usuario (2026-11-18)

Todas las recomendaciones: **INV-P1** promedio y PEPS (por serie después); **INV-P2** un método por empresa; **INV-A4** costo
por artículo en toda la empresa; **INV-P5** varias bodegas por localidad; **INV-A3** alcance propio por bodega (el cierre
exige ver todas); **INV-A7** permiso aparte para ver costos; **INV-P4** nunca existencias negativas; **INV-A5** fecha anterior
en meses abiertos con recálculo y aviso; **INV-A6** ajustes aprobados por otro usuario, configurable (sí por omisión);
**INV-A8** el conteo bloquea la bodega, configurable; **INV-A15** solo se reabre el último mes, con motivo y auditoría;
**INV-P6** lotes y vencimientos opcionales; **INV-P9** costos adicionales repartidos; **INV-P10** deterioro a VNR manual al
cierre; **INV-A12** salidas especiales con aviso de IVA; **INV-P7** la FEL se emite afuera y se anota; **INV-A11** traslados
sin tránsito por omisión; **INV-A10** concepto de gasto obligatorio en la salida a gasto; **INV-P11** sobrante a otros
ingresos por omisión (configurable); **INV-A2** artículos por empresa; **INV-A1** depende solo de Libro de compras;
**INV-A9** casilla `es_inventario` excluyente con activo fijo; **INV-A13** lector de códigos de barras; **INV-P3** el
préstamo de herramientas vive en Activos fijos; **INV-P8** reporte semestral cuando haya plantilla oficial (mientras,
existencias valuadas en Excel); **INV-A14** un cambio de método rige desde el 1 de enero.
