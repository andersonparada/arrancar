# Diseño: varios bienes de uso, bodega y entrega (Activos fijos e Inventarios) — arquitecto de datos, 2026-11-18

_Agente `arquitecto-de-datos`. Base contable y fiscal: `dictamen-activos-fijos-e-inventarios-2026-11-18.md`
(contador-guatemala, mismo día). Parte de dos diseños **aprobados** y todavía **sin programar**: `diseno-activos-fijos.md`
y `diseno-inventarios.md`. **Nada de esto se programa hasta que el usuario responda §12.** Lo que el arquitecto no
comparte del dictamen va marcado **[corrige el dictamen]** y pasa a §13._

## 0. El pedido y la respuesta en una página

**Pedido del usuario (2026-11-18):** «debemos hacer una integración que se pueda utilizar activos fijos e inventarios,
porque puedo comprar varios tractores y llevar stock, también en el caso de las sillas». Es decir: comprar varias unidades
de un bien de uso, guardarlas, entregarlas de a una o por lotes con su responsable y su localidad, saber en todo momento
cuántas hay en bodega y cuántas entregadas, y quizá devolver a la bodega una que ya no se usa.

**Respuesta:** la necesidad se cubre, pero **el «stock» de bienes de uso vive en Activos fijos, no en Inventarios**
(dictamen: NIIF para las Pymes 13.1, 17.2, 17.5 y 17.20; ISR art. 42 num. 3). Un tractor o una silla comprados para usarse
son propiedad, planta y equipo desde que se reciben, aunque estén guardados. Se deprecian desde que están **disponibles
para usarse**, no desde que se entregan. Entregar es un **traslado** con su boleta (responsiva), no un alta.

Lo que cambia (todo dentro de los dos módulos, sin importarse entre sí):

| # | Cambio | Módulo |
|---|---|---|
| 1 | **Capitalizar una línea en N activos iguales** (3 tractores = 3 activos con su serie y su placa), con el sobrante del redondeo en el último, y repartir después un flete entre los N | Activos fijos (bandeja) |
| 2 | **Poner en uso por lote** con la fecha en que quedaron listos, **en la bodega de activos** y sin responsable | Activos fijos |
| 3 | **Bodega de activos** como marca de la ubicación (`en_bodega`), no como bodega de Inventarios; entregar y devolver son traslados | Activos fijos |
| 4 | **Dividir un grupo** (50 sillas → 20 entregadas y 30 en bodega) con costo, acumulada y tramos proporcionales en los dos libros; se hace solo al trasladar, dar de baja o contar una parte | Activos fijos (adelanta el pendiente de AF-P10) |
| 5 | Reportes **Existencias de bienes de uso** (el «stock»), **En bodega o sin asignar** (deterioro, NIIF 27) y **Responsiva por responsable** | Activos fijos |
| 6 | Aviso en Inventarios cuando un repuesto o suministro tiene un costo unitario mayor que el umbral de Activos fijos («¿es un bien de uso?») por una orden del mediador | Inventarios + orden de Activos fijos |
| 7 | Sin cambio: la casilla excluyente `es_inventario` / `es_activo_fijo` del Libro de compras y la salida `obra_de_activo_fijo` de INV-AF (que también sirve para reclasificar mercadería a uso propio) | Libro de compras, Inventarios |

**No hay un paso nuevo de Inventarios hacia Activos fijos** para los bienes de uso: lo de INV-AF (materiales de obra,
mantenimiento y reclasificación de mercadería) queda como estaba.

## 1. Lo encontrado (verificado contra `main` el 2026-11-18)

1. **Ninguno de los dos módulos está programado**: no existen los esquemas `activos_fijos` ni `inventarios` en la base de
   desarrollo (consulta de solo lectura) ni sus carpetas en `servidor/src/modulos/`. Los cambios se **funden en sus
   migraciones previstas**; no hay datos que convertir. La base tiene 0 líneas en el libro.
2. **Libro de compras**: `lineas_de_documento.es_activo_fijo` existe; **no hay cantidad por línea** (por eso N lo escribe
   el usuario, D1). `es_inventario` llega con INV-0. AF-0 (servicio capitalizable y único `(id, documento_id,
   empresa_id)`) ya está aprobado.
3. **Activos fijos** (diseño aprobado): `activos.cantidad` es **informativa** y la baja es total (AF-P10 b); dividir un
   grupo quedó en §19 como pendiente. `traslados.grupo_id` ya agrupa varios activos en una boleta. `ocioso` es una
   bandera de `en_uso` que sigue depreciando. La bandeja `CapitalizarLineas` recibe `{ lineaId, activoId | activoNuevo,
   montoCentavos }`. **Sin alcance por localidad** (AF-P2 a). Umbral por empresa medido por **línea** en la bandeja.
4. **Inventarios** (diseño aprobado): bodegas con alcance propio, kardex con promedio o PEPS por artículo y empresa;
   `tipo_de_inventario` incluye `repuestos` y `suministros`; la salida `obra_de_activo_fijo` manda la orden
   `activos-fijos.recibir_costo_de_inventario` a un activo `en_construccion`; el préstamo de herramientas ya se mandó a
   Activos fijos (INV-P3 a).
5. **PostgreSQL 16** admite `on delete set null (columna)` en una llave compuesta: se usa en `divisiones` (§5.3).

## 2. Opciones de modelo

### (A) El stock vive en Activos fijos como un **lote por asignar**, y cada entrega lo divide

Se capitaliza un solo activo «3 tractores» o «50 sillas» con cantidad, en la bodega de activos. Cada entrega **separa**
del lote un activo nuevo (individual o grupo) con su parte del costo y de la depreciación.

| A favor | En contra |
|---|---|
| El «stock» es literal: una fila con cantidad que baja con cada entrega | Los tractores **no tienen identidad** hasta que se entregan: sin serie, placa ni etiqueta propias en bodega, y el dictamen pide etiquetar **al recibir** (§4) |
| Una sola mecánica (dividir) para todo | Cada entrega de un tractor es una división con costos y tramos proporcionales: más filas y más redondeos que tener 3 activos desde el inicio |
| Correcto en lo contable si el lote se pone en uso al recibirse | El inventario físico cuenta «3 tractores» como una línea con cantidad, no tres placas |

Efecto contable y fiscal: correcto (es activo fijo desde la compra, se deprecia desde la disponibilidad). Casilla
«activos fijos» del SAT-2237. Fuera del reporte semestral.

### (B) El stock vive en Inventarios como artículo «capitalizable»; la salida a uso crea el activo

Artículo con marca `capitalizable` y su clase de Activos fijos. La compra entra al kardex (promedio o PEPS) y una salida
`puesta_en_uso` manda una orden `activos-fijos.crear_activo_desde_inventario` con el costo del método; el activo nace en
uso desde la salida.

| A favor | En contra |
|---|---|
| Pantalla de existencias y bodeguero que ya existen; entregar se parece a despachar | **Clasificación errada** (NIIF 13.1 y 17.2): el balance muestra inventario lo que es propiedad, planta y equipo |
| | **Depreciación atrasada**: empieza en la entrega y no en la disponibilidad (contra 17.20); fiscalmente arriesga cuotas perdidas (ISR art. 25) |
| | **Reporte semestral de inventarios inflado** (art. 42 num. 3) y la línea del libro marcada `es_inventario` manda el IVA a la casilla de **compras** y no a la de **activos fijos** del SAT-2237 |
| | El promedio o PEPS **mezcla** el costo de tractores identificables con serie (hace falta identificación específica, que Inventarios dejó fuera de v1) |
| | Un bien devuelto a bodega no puede volver al kardex (ya se deprecia): la «bodega» quedaría partida entre dos módulos |
| | Necesita una orden nueva que **crea** activos desde otro módulo y la llave de las salidas hacia ellos sin `dependeDe` |

Efecto contable y fiscal: **incorrecto** (dictamen §1, §2 y U1 b).

### (C) Recomendada: Activos fijos con **unidades al capitalizar**, **bodega como ubicación** y **división de grupos**

Sale del dictamen (§6) y toma lo bueno de A:

- Lo **identificable** (tractores, vehículos, computadoras, plantas eléctricas) se capitaliza **en N activos de una
  unidad**, cada uno con su código, serie, placa y etiqueta **desde la recepción** (D1).
- Lo **homogéneo y de poco valor por unidad** (sillas, herramientas iguales) se capitaliza como **grupo** con cantidad, o
  como **bien de control** si la línea queda bajo el umbral; al entregar una parte el grupo **se divide** solo (D2).
- La **bodega de activos** es una marca de la ubicación vigente (`en_bodega`). Entregar y devolver son **traslados**.
- El «stock» es un **reporte** que suma unidades (Σ `cantidad`) por clase, descripción, marca y modelo, separando lo que
  está en bodega de lo entregado.

| A favor | En contra |
|---|---|
| Correcto en lo contable y fiscal (dictamen §6), sin tocar Inventarios ni el libro | No hay una «ficha de artículo» con existencia: el stock se agrupa por descripción, marca y modelo; si se escriben distinto, salen en renglones distintos (mitigado con la alta conjunta, §3.1) |
| Cada tractor tiene identidad desde el día uno: etiqueta, inventario físico por QR, historial propio | La división agrega una tabla y reglas de redondeo en los dos libros |
| Lo de poco valor no se multiplica en 50 filas | |
| Reutiliza traslados, boleta, ocioso, bajas e inventario físico ya diseñados | |

### (D) Que cada empresa elija entre A/C y B (dictamen U1 c)

Descartada: dos verdades para la misma clase de bien, dos caminos para el libro y el SAT-2237, y el error contable de B
sigue disponible. Si una empresa **vende** tractores (distribuidor), esos ya van a Inventarios como mercadería, sin
necesidad de esta opción (§3.8).

**Recomendación: C.**

## 3. Flujo completo de la opción C

### 3.1 Compra en el Libro de compras

- La línea «3 tractores John Deere 5075E» o «50 sillas apilables» se marca **Activo fijo** (`es_activo_fijo`), propuesta
  por su concepto de gasto (Maquinaria y equipo, Mobiliario y equipo de oficina). Va a la casilla **«activos fijos»** del
  SAT-2237 y a las columnas de bienes del libro (sin cambio, AF-0).
- **No** se marca Inventario: la casilla excluyente lo impide (D6, correcta). El texto de ayuda de las dos casillas
  (INV-0c) dice: «Activo fijo: lo que la empresa va a **usar**, aunque lo guarde en bodega. Inventario: lo que va a
  **vender o consumir**».
- El pago va a Inversión en el flujo de efectivo (ya decidido en CP4).

### 3.2 Entrada al «stock»: la bandeja «Por capitalizar» (D1)

En la ventana «Capitalizar», al crear un activo nuevo desde la línea, aparecen dos campos nuevos:

| Campo | Para | Ejemplo |
|---|---|---|
| **Unidades** (`unidades`, 1–200, por omisión 1) | Cuántos activos iguales se crean con esta asignación | Tractores: 3 |
| **Cantidad por activo** (`cantidadPorActivo`, por omisión 1) | Cuántas piezas lleva cada activo (grupo) | Sillas: 1 activo de 50 |

- El monto de la asignación se reparte: cada activo recibe `floor(monto / unidades)` centavos y el **último** recibe el
  sobrante (dictamen D1). Ejemplo: Q750,000.01 en 3 → 250,000.00, 250,000.00 y 250,000.01.
- Una **cuadrícula** opcional por unidad: código (propuesto por el correlativo en números consecutivos, editable), número
  de serie, placa y marca/modelo (copiados del primero). Lo que no se escriba se completa después en la ficha; el reporte
  de existencias marca «sin serie».
- Todos los activos creados juntos comparten **`alta_conjunta_id`** (uuid de la operación): la ficha muestra «Comprado
  junto con: AF-0101, AF-0102» y el reporte de existencias puede agruparlos.
- **Costo posterior repartido**: cuando llega el flete o la instalación de los 3 tractores, la asignación puede apuntar a
  una **alta conjunta** (`altaConjuntaId`) en vez de a un activo: el monto se reparte igual entre los activos vigentes de
  esa alta (sobrante al último) y, en los que ya están en uso, crea su costo posterior (§6.6 del diseño de Activos fijos).
- La regla de la línea no cambia: Σ costos vigentes de la línea ≤ su costo.
- **Umbral (bien de control)**: se sigue midiendo **por línea**, como ya hace la bandeja (dictamen §5 a). La bandeja
  muestra además el **costo por unidad** (costo ÷ unidades × cantidad) como ayuda. 50 sillas a Q300 (Q15,000) con umbral
  Q5,000: sobre el umbral → **grupo**. 4 sillas (Q1,200): bajo el umbral → **bien de control** de cantidad 4. La pregunta
  I-12 deja elegir la medida.
- **Tipo de registro**: activo, bien de control o de terceros, como hoy. Las N unidades heredan el mismo.

### 3.3 Disponible para uso: desde aquí se deprecia (U2)

- La acción «Poner en uso» se presenta como **«Disponible para uso»**: la fecha es la del día en que el bien quedó
  **recibido y listo para operar**, aunque nadie lo use todavía (NIIF 17.20). Se usa la **misma fecha** en los dos libros
  (dictamen §2). La columna se sigue llamando `fecha_de_inicio_de_uso`; cambia el texto, no el dato.
- **Por lote**: `PonerEnUsoVarios` recibe varios activos (por ejemplo, los 3 de una alta conjunta) con una fecha y los
  mismos parámetros (porcentaje fiscal, vida y residual propuestos por la clase); crea los tramos de cada uno en una
  transacción.
- Si hace falta armado, instalación o un implemento, el activo queda `en_construccion` hasta que esté listo (17.10). La
  pantalla lo explica: «En construcción no es "guardado": un bien listo y guardado ya se deprecia».
- Al ponerlo disponible se elige la ubicación: localidad, departamento y la casilla **«En bodega de activos»** (por
  omisión marcada cuando no se escribe responsable). Así nace el stock.
- La bandera `ocioso` **no** se marca sola al estar en bodega: un tractor nuevo esperando asignación no es «ocioso» en el
  sentido de un bien retirado. El reporte de §3.9 mide los meses en bodega.

### 3.4 Entregar: traslado con boleta (de a uno o por lote)

- `TrasladarActivos` ya recibe varios activos con un `grupo_id` y una boleta numerada. Cambia que cada renglón lleva
  `cantidad` opcional y que el traslado dice si el destino es la bodega (`a_bodega`).
- **Entrega de un tractor**: un renglón, destino «Finca El Roble / Maquinaria / Juan Pérez», `a_bodega = false`. El activo
  queda con `en_bodega = false` y su responsable.
- **Entrega por lote**: varios renglones (los 3 tractores o 10 computadoras) en la misma boleta.
- **Parte de un grupo**: «20 de las 50 sillas» → el caso de uso **divide** el grupo (§4) en la misma transacción y
  traslada el activo nuevo de 20; las 30 siguen en la bodega. La boleta muestra «20 sillas (separadas de AF-0200)».
- La boleta es la **responsiva** de la entrega: lleva «Entrega», «Recibe», firmas y el nombre configurado por la empresa
  (`activos-fijos.documentos.nombre_de_responsiva`, D4).
- Entregar no tiene efecto en el IVA ni en el ISR (no hay transferencia de dominio, Ley del IVA art. 2) y no cambia la
  depreciación; solo cambia el centro de costo desde el mes del traslado (vigente al último día del mes, V-5).

### 3.5 Devolver a la bodega (se permite, U1 a)

- Es otro traslado con `a_bodega = true` (y sin responsable, o con el bodeguero, I-7). Opción «Marcar como ocioso» en la
  misma ventana, que llama a `MarcarOcioso` en la misma transacción.
- **Nunca vuelve a Inventarios**: sigue en Activos fijos y **sigue depreciándose** (17.20).
- Si el bien se piensa vender, sigue siendo activo fijo (la NIIF para las Pymes no tiene «mantenido para la venta»); el
  reporte de §3.9 lo señala para revisar deterioro (27).

### 3.6 Costo de cada unidad

| Origen | Costo de cada activo |
|---|---|
| Línea del libro (lo normal) | Su parte del costo de la línea (`total − iva + iva_no_acreditable`) entre las N unidades; sobrante al último. Es **identificación específica**: no hay promedio ni PEPS |
| Costos posteriores (flete, instalación) | Repartidos igual entre la alta conjunta (§3.2) o asignados a mano a un activo |
| Mercadería reclasificada desde Inventarios (§3.8) | El costo del **método de Inventarios** (promedio o PEPS) de esa salida, que llega por la orden `activos-fijos.recibir_costo_de_inventario` |
| División de un grupo | Proporcional a la cantidad (§4) |
| Saldo inicial | El escrito en la carga |

### 3.7 Depreciación

Sin cambio en las fórmulas (§7 del diseño de Activos fijos). Cada activo de las N unidades tiene sus tramos y cuotas; el
grupo se deprecia como una sola partida. Un bien en bodega se deprecia igual que uno entregado; la cuota del mes va a la
localidad y el departamento vigentes al último día del mes (la bodega incluida).

### 3.8 Bienes que sí vienen de Inventarios (sin paso nuevo)

| Caso | Cómo | Ya diseñado en |
|---|---|---|
| Materiales que forman una obra (cemento, varilla) | Salida `obra_de_activo_fijo` hacia un activo `en_construccion` | INV-AF |
| Repuestos menores y lubricantes | Salida `mantenimiento_de_activo_fijo` (gasto ligado al activo) | INV-AF |
| **Distribuidor** que toma para sí un tractor de su mercadería | Alta del activo `en_construccion` en Activos fijos (sin costo) → salida `obra_de_activo_fijo` con el costo del método → «Disponible para uso». Si fueron 3 de una vez: un activo de cantidad 3 que recibe el costo y luego **«Separar en unidades»** (§4.5), o tres salidas si se quiere el costo PEPS exacto de cada uno | INV-AF + §4 |

El texto del destino `obra_de_activo_fijo` en Inventarios pasa a «Obra o uso propio (activo en construcción)».

### 3.9 Reportes nuevos (sección Reportes: imprimir y exportar)

| Reporte | Contenido | Filtros |
|---|---|---|
| **Existencias de bienes de uso** (el «stock», D3) | Por clase → descripción, marca y modelo (o por alta conjunta): unidades totales (Σ `cantidad` de activos no dados de baja), **en bodega**, **entregadas**, en construcción; costo y valor en libros. Tipo de registro (activo, control) en columna aparte | Clase, localidad, tipo de registro, solo en bodega |
| **En bodega o sin asignar** (D3, NIIF 27) | Activos y bienes de control `en_uso` con `en_bodega` o sin responsable: fecha desde que están en bodega (último traslado a bodega o la disponibilidad), **meses en bodega**, ocioso, valor en libros. Resalta los que pasan de `activos-fijos.bodega.meses_de_aviso` | Localidad, clase, meses mínimos |
| **Responsiva por responsable** (D4) | Todos los bienes a cargo de una persona (usuario o texto): código, descripción, serie, placa, cantidad, ubicación, fecha de entrega; espacio para firmas; título = la variable de la empresa | Responsable, localidad |

El reporte **Activos por localidad y responsable** de §13 de Activos fijos queda como está; la responsiva es su versión
para firmar de una persona. El **cierre de depreciación** gana el hallazgo `aviso` «N bienes llevan más de X meses en
bodega».

### 3.10 Baja

- **Baja total** de un activo: como hoy.
- **Baja de una parte de un grupo** (3 sillas rotas de 30): `DarDeBaja` con `cantidad` → divide (§4) y da de baja el activo
  nuevo, en la misma transacción. Esto **reemplaza** la regla «baja solo total» de AF-P10 b (pregunta I-3).
- **Inventario físico**: una línea de grupo lleva **cantidad esperada** y **cantidad encontrada**; si se encuentran 48 de
  50, al cerrar se **propone** dividir 2 y darlas de baja por `faltante_de_inventario` (con su aviso de IVA, art. 3 num. 7).

### 3.11 Las sillas bajo el mínimo (bien de control)

Un bien de control de 4 sillas: sin libros ni cuotas, con etiqueta, ubicación, responsable, `en_bodega`, traslados,
división (solo cantidad y, si los tiene, costos de referencia) y baja sin resultado. En lo fiscal va al gasto en el
régimen sobre las utilidades, con el aviso del riesgo (dictamen §2, certeza B; pregunta I-5): «La ley no fija un monto
mínimo; si la SAT reclasifica, solo aceptaría el 20 % anual».

## 4. Dividir un activo (D2)

### 4.1 Cuándo

- A mano: acción «Dividir» en la ficha (`divisiones.crear`), con cantidad, fecha y motivo.
- Sola: al trasladar, dar de baja o cerrar un inventario físico con una cantidad menor que la del activo (con el permiso de
  esa acción; la división es proporcional, no hay nada que decidir).
- «Separar en unidades»: divide un activo de cantidad N en N activos de 1 (varias divisiones en una transacción).

**No se divide**: un activo dado de baja; un padre con componentes o un componente; clases `edificios`, `terrenos`,
`reproductores`, `intangibles` y `llave` (su base fiscal tiene topes propios y no son grupos); un activo con un traslado,
mejora o baja con fecha posterior a la de la división; con la fecha en un mes cerrado.

### 4.2 Cálculo (dominio puro, centavos, redondeo mitad hacia arriba)

Con `n` = cantidad del activo y `k` = cantidad separada (`1 <= k < n`), para cada cifra `Q` del activo **al cierre del mes
anterior** a la división:

`Q_nuevo = round(Q × k / n)` y `Q_origen = Q − Q_nuevo` (el sobrante queda en el origen).

| Cifra `Q` | De dónde sale |
|---|---|
| Costo que aplica al libro fiscal y costo que no aplica (desmantelamiento) | Σ costos vigentes por `aplica_al_libro_fiscal` |
| Depreciación acumulada contable y fiscal | Saldo inicial + Σ cuotas vigentes + divisiones previas |
| Valor residual | `activos.valor_residual` |
| `base_del_porcentaje` del tramo fiscal vigente | Así la cuota fiscal de cada parte sigue al mismo porcentaje |

- **Costos**: en el origen, un costo `origen = 'division'`, `clase_de_costo = 'division_cedida'`, **negativo**; en el
  nuevo, uno `division_recibida` **positivo** (uno por cada valor de `aplica_al_libro_fiscal` que tenga monto). Así el
  costo de cada activo sigue siendo Σ costos y la regla de la línea no cambia (estos costos no tienen línea).
- **Tramos**: en los dos activos y en los dos libros, un tramo `causa = 'division'` desde `max(mes de la división, desde
  del tramo vigente)`, con §7.2 y §7.3 del diseño de Activos fijos: contable con los **meses que le faltaban** al tramo de
  origen; fiscal con su `base_del_porcentaje` proporcional. El mes de la división se reparte entre los dos (ninguno de los
  dos tiene cuota en ese mes todavía: está abierto).
- **Acumulada**: la función del dominio `acumuladaAl(activo, libro, mes)` suma las divisiones recibidas y resta las
  cedidas. La usan el cierre, las bajas, la ficha y el registro auxiliar. Las cuotas de meses anteriores **se quedan en el
  origen** (lo que se informó no se reescribe).
- **En construcción**: solo se reparten los costos (no hay tramos ni acumulada).
- **Bien de control**: solo la cantidad (y los costos de referencia, si tiene).
- El activo nuevo copia descripción, clase, tipo de registro, marca, modelo, fechas de adquisición y de uso, porcentaje,
  ubicación y ocioso; recibe un **código nuevo** (correlativo o escrito) y su fila de alta en `traslados` con la ubicación
  del origen. El origen queda con `cantidad = n − k`.

Ejemplo para las pruebas: 50 sillas, costo Q15,000.00, fiscal 20 %, contable 60 meses sin residual, disponibles en
ene-2027, `mes_de_inicio`. Cerrado jun-2027 (6 cuotas de 250.00: acumulada 1,500.00 en los dos libros). División de 20 en
jul-2027: nuevo costo 6,000.00, acumulada 600.00, tramo contable `(6,000 − 600) / 54 = 100.00`, fiscal `6,000 × 20 / 1200
= 100.00`; origen 9,000.00, acumulada 900.00, cuotas de 150.00. Suma por mes: 250.00, como antes.

### 4.3 Anular una división (I-9)

Solo si la fecha está en un mes abierto y **ninguno** de los dos activos tiene, después de la división, cuotas, traslados
(salvo el alta), mejoras, bajas ni otra división. Anula los costos y deja `vigente = false` los tramos que creó, **borra**
el activo nuevo (con su alta) y devuelve la cantidad al origen. La fila de `divisiones` queda `anulada` con el código del
activo nuevo copiado. Audita `anular` con el DTO de los dos activos.

## 5. Datos (cambios en el esquema `activos_fijos`)

Todas las reglas generales del diseño de Activos fijos siguen (empresa, `politicaPorEmpresa()`, marcas de tiempo y
autoría, llaves compuestas con `empresa_id` e índice por llave). **Sin alcance por localidad** (AF-P2 a). Sin datos que
convertir: el módulo no está programado.

### 5.1 `activos_fijos.activos` (columnas nuevas o cambiadas)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `en_bodega` | boolean | no | `default false`; copia vigente del último traslado (`a_bodega`). Índice parcial `activos_en_bodega_idx (empresa_id) where en_bodega and estado <> 'dado_de_baja'` |
| `alta_conjunta_id` | uuid | sí | Id de la operación que creó varias unidades juntas (sin llave: no hay tabla de altas). Índice parcial `(alta_conjunta_id) where alta_conjunta_id is not null` |
| `cantidad` | integer | no | Igual (`default 1`, `>= 1`), pero **deja de ser informativa**: se escribe al crear y luego solo la cambia una división (o su anulación). Editarla a mano solo `en_construccion` y sin divisiones (dominio) |

Índice para el reporte de existencias: `activos_existencias_idx (empresa_id, clase_id, estado) include (cantidad,
en_bodega)`, que reemplaza a `activos_lista_idx` (mismas columnas iniciales).

### 5.2 `activos_fijos.traslados` (columna nueva)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `a_bodega` | boolean | no | `default false`; el traslado deja el bien en la bodega de activos. En el alta lo dice «Disponible para uso» |

Si se aprueba I-8 b, **`activos_fijos.boletas_firmadas`**: `grupo_id` uuid PK (con `empresa_id`), `archivo_id` uuid no
nulo, FK `core.archivos` con `recurso_dueno = 'activos-fijos.traslados'`, único. Sin llave a `traslados` (`grupo_id` no es
único allí): el caso de uso revisa que el grupo exista y no esté anulado. RLS: empresa. Reemplazar el archivo audita
`adjuntar` con el anterior.

### 5.3 `activos_fijos.divisiones` (nueva)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK; único `divisiones_id_empresa_unico (id, empresa_id)` |
| `activo_origen_id` | uuid | no | FK compuesta a `activos`; índice |
| `activo_nuevo_id` | uuid | sí | FK compuesta `(activo_nuevo_id, empresa_id) → activos (id, empresa_id)` **`on delete set null (activo_nuevo_id)`** (PostgreSQL 16; solo se borra al anular, §4.3); único parcial `(activo_nuevo_id) where activo_nuevo_id is not null`; check `estado = 'anulada' or activo_nuevo_id is not null`; check `activo_nuevo_id <> activo_origen_id` |
| `codigo_del_activo_nuevo` | text | no | Copia para la historia (1–30) |
| `fecha` | date | no | No futura; mes abierto |
| `periodo` | date | no | Primer día del mes desde el que rigen los tramos de la división (check de primer día) |
| `cantidad_original`, `cantidad_separada` | integer | no | Check `cantidad_separada >= 1 and cantidad_separada < cantidad_original` |
| `causa` | text | no | `in ('manual','traslado','baja','inventario','separar_en_unidades')` |
| `motivo` | text | no | 1–300; en las automáticas lo escribe el sistema («Entrega parcial, boleta 2027-0012») |
| `costo_separado`, `costo_fiscal_separado` | numeric(14,2) | no | `>= 0`; `costo_fiscal_separado <= costo_separado` |
| `acumulada_contable_separada`, `acumulada_fiscal_separada`, `residual_separado` | numeric(14,2) | no | `>= 0`; acumulada contable `<=` costo, fiscal `<=` costo fiscal |
| anulación completa | | | `estado in ('vigente','anulada')`, `anulado_en`, `anulado_por`, `motivo_de_anulacion` con el check de siempre |

Índice `(empresa_id, periodo) where estado = 'vigente'` (para `acumuladaAl` y el cierre). RLS: `politicaPorEmpresa()`.

### 5.4 Cambios en `costos`, `tramos` e `inventario_lineas`

| Tabla | Cambio |
|---|---|
| `costos` | `origen` admite `'division'`; `clase_de_costo` admite `'division_cedida'` y `'division_recibida'`; columna `division_id uuid` nula con FK compuesta a `divisiones` e índice parcial; checks `(origen = 'division') = (division_id is not null)`, `(origen = 'division') = (clase_de_costo in ('division_cedida','division_recibida'))` y el de signo pasa a `(monto < 0) = (clase_de_costo in ('nota_de_credito','division_cedida'))` |
| `tramos` | `causa` admite `'division'`; columna `division_id uuid` nula con FK compuesta e índice parcial; check `(causa = 'division') = (division_id is not null)` |
| `inventario_lineas` | `cantidad_esperada integer not null default 1` (`>= 1`, copia de `activos.cantidad` al abrir) y `cantidad_encontrada integer` nula (`>= 0`); check `cantidad_encontrada is null or resultado = 'encontrado'`. Si `cantidad_encontrada < cantidad_esperada`, el cierre propone dividir y dar de baja la diferencia |

### 5.5 Migraciones

- Como el módulo no existe, `en_bodega`, `alta_conjunta_id` y `a_bodega` entran en `0002_af2_activos_y_traslados`;
  `cantidad_esperada` y `cantidad_encontrada`, en `0009_af12_inventarios`.
- `divisiones` y los cambios de `costos` y `tramos` van en una migración propia, `00xx_afi_divisiones` (siguiente número
  libre al programarla, después de `0007_af7_mejoras` y `0005_af5_cierres_y_cuotas`), que también inserta
  `activos-fijos.divisiones` en `core.recursos_de_auditoria_permanente` (cambia la base de depreciación mientras el bien
  exista: Código Tributario arts. 47 y 112; ISR art. 26).
- Libro de compras e Inventarios: **sin migraciones** por este diseño.

## 6. Reglas y casos de uso (Activos fijos)

| Caso de uso | Permiso | Regla clave |
|---|---|---|
| `CapitalizarLineas` (ampliado) | `costos.crear` | `unidades` 1–200 y `cantidadPorActivo`; o `altaConjuntaId` como destino; candado de la línea como hoy; códigos únicos validados antes de insertar |
| `PonerEnUsoVarios` (nuevo) | `activos.poner-en-uso` | Hasta 200 activos; todos `en_construccion` con costo > 0; misma fecha (mes abierto); `a_bodega` y ubicación comunes; todo o nada |
| `TrasladarActivos` (ampliado) | `traslados.crear` | Renglones `{ activoId, cantidad? }`; `aBodega`; `marcarOcioso?`. Con `cantidad < activo.cantidad` llama a `DividirActivo` (causa `traslado`) y traslada el nuevo |
| `DividirActivo` (nuevo) | `divisiones.crear` (a mano) | §4.1 y §4.2; candado compartido del cierre y candado del activo (`for update`) |
| `SepararEnUnidades` (nuevo) | `divisiones.crear` | `n − 1` divisiones de 1; tope 200 |
| `AnularDivision` (nuevo) | `divisiones.anular` | §4.3 |
| `DarDeBaja` (ampliado) | `bajas.crear` | `cantidad?`: divide (causa `baja`) y da de baja el nuevo |
| `CerrarInventario` (ampliado) | `inventarios.cerrar` | Propone división + baja por la diferencia de cantidad |
| `ObtenerUmbralDeCapitalizacion` (orden del mediador) | — (interna) | Responde `activos-fijos.obtener_umbral_de_capitalizacion` con el umbral de la empresa en centavos, o `null` si es 0 |

Errores nuevos: `division_no_permitida` (con la causa: clase, componentes, baja), `cantidad_a_separar_invalida`,
`division_con_movimientos_posteriores`, `demasiadas_unidades`, `alta_conjunta_sin_activos_vigentes`.

## 7. Cambios en los dos diseños aprobados

### 7.1 `diseno-activos-fijos.md`

| Sección | Cambio |
|---|---|
| §0 y §3.2 | «Poner en uso» se explica como **disponible para uso**; la bodega de activos es ubicación |
| §3.4 | El umbral sigue por línea; la bandeja muestra el costo por unidad |
| §3.7 | Traslados con `a_bodega`, cantidad parcial y la responsiva configurable |
| §3.8 | Baja de una parte de un grupo (reemplaza «baja solo total» de AF-P10 b) |
| §3.9 | Cantidad esperada y encontrada en los grupos |
| §5.3, §5.4, §5.8, §5.11, §5.13 | Columnas de §5 de este diseño; tabla nueva `divisiones` (§5.3 aquí) |
| §6.2, §6.4, §6.7, §6.8, §6.10 | Casos de uso ampliados de §6 aquí |
| §9 | Eventos nuevos (§8 aquí) |
| §10 | Permisos `divisiones.crear` y `.anular`; auditoría (§9 aquí); configuración (§10 aquí) |
| §13 | Tres reportes nuevos (§3.9 aquí) y el hallazgo del cierre |
| §14 | Saldos iniciales: columnas «Cantidad» (ya existía en el activo) y «En bodega» |
| §16 | Pasos de §11 aquí |
| §19 | Quitar «Dividir un activo agrupado y la baja parcial» (se hace aquí) |

### 7.2 `diseno-inventarios.md`

| Sección | Cambio |
|---|---|
| §2 «No entra» | Agregar: «Bienes de uso (tractores, sillas, computadoras, equipo de reserva y repuestos importantes), aunque estén guardados: Activos fijos (NIIF 17.2 y 17.5)» |
| §3.7 | Texto del destino `obra_de_activo_fijo`: «Obra o uso propio (activo en construcción)»; nota de la reclasificación de mercadería |
| §4.3 | Orden nueva que **pide** Inventarios: `activos-fijos.obtener_umbral_de_capitalizacion` (sin respuesta si Activos fijos está inactivo: no hay aviso) |
| §6.3, §6.4 y §8 | Aviso D5 al recibir una línea, en la entrada manual y en el saldo inicial: si el artículo es `repuestos` o `suministros` y el costo unitario (monto ÷ cantidad en la unidad de compra) pasa del umbral: «Este artículo cuesta Q x por unidad, más que el mínimo para activos fijos. Si es un bien que se **usa** más de un año (equipo de reserva, repuesto importante), descarte la línea y regístrela en Activos fijos (NIIF 17.5)». Aviso, nunca bloqueo |
| §16 | INV-AF gana la orden del umbral y el aviso |

**[corrige el dictamen D5]**: el dictamen pone el aviso «al crear un artículo», pero el artículo no tiene costo hasta su
primera entrada. El aviso va donde el costo unitario se conoce (recepción, entrada manual, saldo inicial); en el
formulario del artículo de tipo `repuestos` queda un texto de ayuda fijo. Pasa a V-1 (§13).

### 7.3 Libro de compras

Sin cambio en tablas ni en el SAT-2237. Solo el texto de ayuda de las casillas Activo fijo / Inventario (INV-0c).

## 8. Eventos y mediador

| Evento u orden | Cuándo | Datos |
|---|---|---|
| `activos-fijos.activo_capitalizado` (ampliado) | Como hoy | Agrega `altaConjuntaId` |
| `activos-fijos.activo_dividido` (nuevo) | Dividir | `divisionId`, `activoOrigenId`, `activoNuevoId`, `cantidadSeparada`, `costoCentavos`, `costoFiscalCentavos`, `acumuladaContableCentavos`, `acumuladaFiscalCentavos`, `causa`. Contabilidad: no hay partida (misma clase y cuenta) |
| `activos-fijos.division_anulada` (nuevo) | Anular | `divisionId` |
| `activos-fijos.activo_trasladado` (ampliado) | Traslado | Agrega `aBodega` |
| Orden `activos-fijos.obtener_umbral_de_capitalizacion` (nueva) | La pide Inventarios | `{ empresaId }` → `{ umbralCentavos } | null` |

Inventarios y Activos fijos siguen sin importarse; ninguna llave nueva entre sus esquemas.

## 9. Permisos y auditoría

| Permiso nuevo | Para |
|---|---|
| `activos-fijos.divisiones.crear` | Dividir y separar en unidades a mano |
| `activos-fijos.divisiones.anular` | Anular una división |

| Caso de uso | `recurso` | `accion` | `anterior` |
|---|---|---|---|
| Dividir (a mano o automática) | `activos-fijos.divisiones` | `ajustar` | DTO del activo de origen antes (cantidad, costo, acumuladas) |
| Anular división | `activos-fijos.divisiones` | `anular` | DTO de la división y de los dos activos (el nuevo se borra) |
| Subir o reemplazar la boleta firmada (si I-8 b) | `activos-fijos.traslados` | `adjuntar` | Archivo anterior |
| Marcar ocioso al devolver a bodega | `activos-fijos.activos` | `corregir` | Como hoy |

Sin migración de permisos (todos nuevos; el acceso total los recibe solo).

## 10. Configuración (solo empresa e instalación, en `activos-fijos/configuracion.ts`)

| Clave | Nivel | Por omisión | Para |
|---|---|---|---|
| `activos-fijos.documentos.nombre_de_responsiva` | empresa | «Responsiva de bienes» | Título de la boleta y de la constancia por responsable (D4); `publica: true` |
| `activos-fijos.bodega.meses_de_aviso` | empresa, instalación | `6` | Resaltar en el reporte y avisar en el cierre los bienes con más meses en bodega (NIIF 27) |

## 11. API, cliente, Excel y pasos

### 11.1 API (todas con `proteger({ permiso })`)

| Ruta | Permiso |
|---|---|
| `POST /activos-fijos/bandeja/capitalizar` (con `unidades`, `cantidadPorActivo`, `detalleDeUnidades`, `altaConjuntaId`) | `costos.crear` |
| `POST /activos-fijos/activos/poner-en-uso` (varios) | `activos.poner-en-uso` |
| `POST /activos-fijos/activos/:id/dividir`, `POST …/:id/separar-en-unidades` | `divisiones.crear` |
| `POST /activos-fijos/divisiones/:id/anular` | `divisiones.anular` |
| `POST /activos-fijos/traslados` (renglones con `cantidad`, `aBodega`, `marcarOcioso`) | `traslados.crear` |
| `POST /activos-fijos/traslados/:grupoId/firmada` (si I-8 b), `GET …/:grupoId/firmada` | `traslados.crear` / `activos.ver` |
| `POST /activos-fijos/bajas` (con `cantidad`) | `bajas.crear` |
| `GET /activos-fijos/reportes/existencias-de-bienes-de-uso`, `…/en-bodega`, `…/responsiva` y sus `…/exportar` | `reportes.ver` / `.exportar` |

### 11.2 Cliente

- **Por capitalizar**: campos Unidades y Cantidad por activo, cuadrícula de series y placas, destino «Alta conjunta».
- **Activos fijos** (lista): etiqueta «En bodega»; filtro «En bodega»; selección múltiple para «Disponible para uso» y
  «Entregar».
- **Ficha**: acciones «Dividir», «Separar en unidades», «Devolver a bodega»; pestaña Historial con divisiones y «Comprado
  junto con».
- **Traslados**: campo Cantidad en los renglones de grupos; casilla «A la bodega de activos»; «Marcar como ocioso».
- **Inventario físico**: cantidad encontrada en los grupos.
- **Reportes**: los tres de §3.9.
- Lógica pura con pruebas: reparto en unidades y sobrante, cálculo de la división en `edicion-de-*.ts` del cliente solo
  para mostrar la vista previa (el servidor calcula).

### 11.3 Excel

| Pantalla | Sección | Importar | Exportar |
|---|---|---|---|
| Saldos iniciales de activos fijos | Administración | Sí, con «Cantidad» y «En bodega» | Sí |
| Bandeja, traslados, divisiones | Operación | No | No |
| Existencias de bienes de uso, En bodega, Responsiva | Reportes | No | Sí (la responsiva también se imprime) |

### 11.4 Pasos (un commit cada uno; servidor y cliente por separado, con pruebas)

Se intercalan en los pasos ya previstos de Activos fijos e Inventarios.

| Paso | Qué | Quién | Va con |
|---|---|---|---|
| **AFI-0** | Llevar este diseño a `diseno-activos-fijos.md` y `diseno-inventarios.md` (§7), a `PLAN.md` (bitácora) y a `DONDE-QUEDAMOS.md`, con las respuestas del usuario | arquitecto | Antes de AF-1 |
| **AFI-1** | `en_bodega`, `alta_conjunta_id`, `a_bodega` y el índice de existencias en la migración de activos y traslados | backend | AF-2 |
| **AFI-2** | Capitalizar en N unidades, cuadrícula de unidades, destino alta conjunta; pruebas del reparto y del sobrante, de códigos repetidos y de la regla de la línea | backend | AF-3 (**programado, en revisión**, 2026-11-19) |
| AFI-2c | Ventana «Capitalizar» con unidades | frontend | AF-3c (**programado**, 2026-11-19) |
| **AFI-3** | `PonerEnUsoVarios` y textos de «Disponible para uso» | backend | AF-4 |
| **AFI-4** | Traslados a bodega y devolución con ocioso; responsiva configurable en la boleta; boleta firmada (si I-8 b) | backend | AF-8 |
| AFI-4c | Entregar y devolver; casilla «A la bodega»; selección múltiple | frontend | AF-8c |
| **AFI-5** | `00xx_afi_divisiones`: tabla, costos y tramos de división, `acumuladaAl`, dividir, separar en unidades y anular; eventos; auditoría permanente; pruebas puras con el ejemplo de §4.2 y de integración (cierre después de dividir, baja después de dividir, anular) | backend | Después de AF-7 y AF-8 |
| **AFI-6** | Traslado y baja con cantidad parcial (división automática) | backend | Después de AFI-5 y AF-9 |
| AFI-6c | Dividir en la ficha, cantidad en traslados y bajas | frontend | |
| **AFI-7** | Reportes de §3.9, configuración de §10 y hallazgo del cierre | backend | AF-10 |
| AFI-7c | Pantallas de los tres reportes e impresión de la responsiva | frontend | AF-10c |
| **AFI-8** | Cantidad esperada y encontrada en el inventario físico; propuesta de división y baja | backend | AF-12 |
| **AFI-9** | Inventarios: orden del umbral y aviso D5 (recepción, entrada manual, saldo inicial); texto del destino de obra; ayuda de las casillas del libro | backend + frontend | INV-AF e INV-0c |
| AFI-QA | Factura de 3 tractores y 50 sillas → bandeja en unidades y grupo → disponibles en bodega → entregar 1 tractor y 20 sillas → cierre → devolver a bodega → baja de 3 sillas → reportes de existencias y responsiva | pruebas-qa | AF-QA |

## 12. Preguntas para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| I-1 (U1) | ¿Dónde vive el «stock» de tractores, sillas o computadoras sin entregar? | a) Activos fijos, con la bodega como ubicación (opción C); b) Inventarios, con una salida que crea el activo (B); c) que cada empresa elija (D) | **a**. La b clasifica mal el balance, los mete en el reporte semestral de la SAT, manda el IVA a la casilla equivocada y atrasa la depreciación |
| I-2 (U2) | ¿Desde cuándo se deprecia lo que está guardado? | a) Desde que está recibido y listo, en los dos libros; b) desde la entrega; c) configurable | **a** (NIIF 17.20). La b va contra la norma y arriesga cuotas perdidas en el ISR |
| I-3 (U3) | ¿Cómo se entrega o se da de baja una parte de un grupo (20 de 50 sillas)? | a) El sistema divide el grupo solo al trasladar o dar de baja; b) registrar cada silla aparte desde la compra; c) no permitirlo | **a**. Cambia AF-P10 (ya no es «baja solo total») |
| I-4 (U4) | ¿Una línea de 3 tractores se puede capitalizar en 3 activos iguales de una vez? | a) Sí, con el sobrante del redondeo en el último y series por unidad; b) no, se reparte a mano | **a** |
| I-5 (U5) | Bienes de control (bajo el mínimo) en el régimen sobre las utilidades | a) Gasto también en lo fiscal, con aviso del riesgo; b) llevarles un libro fiscal | **a**, con un mínimo moderado que apruebe el contador de la empresa |
| I-6 (U6) | ¿El equipo de reserva y los repuestos importantes (un motor de recambio, una planta eléctrica de reserva) van como activo fijo, depreciándose aunque no se usen? | a) Sí (NIIF 17.5); b) como inventario | **a** |
| I-7 | ¿Cómo se sabe que un bien está «en bodega»? | a) Casilla «En bodega de activos» en el traslado (puede tener al bodeguero como responsable); b) departamentos marcados como bodega de activos; c) todo lo que no tiene responsable | **a**: explícito, no obliga a crear departamentos y deja anotar quién cuida la bodega |
| I-8 | ¿Qué se guarda de la responsiva firmada? | a) Solo se imprime (boleta de cada entrega y constancia por persona); b) además, se sube el escaneo firmado de cada boleta; c) responsiva numerada con su lista congelada | **b**: el auditor pide las firmas y la boleta ya está numerada; c duplica lo que ya hace la boleta |
| I-9 | ¿Se puede anular una división? | a) Sí, en mes abierto y sin movimientos posteriores; b) no, se corrige con otra operación | **a** |
| I-10 | Un distribuidor que toma para sí mercadería de Inventarios | a) Como está en INV-AF: alta en construcción y salida a «obra o uso propio», y «Separar en unidades» si fueron varias; b) orden nueva en la que la salida crea el activo | **a**: es raro y ya funciona; b crea activos desde otro módulo |
| I-11 | ¿Aviso en Inventarios cuando un repuesto o suministro cuesta más que el mínimo de activos fijos? | a) Sí, al recibirlo, en la entrada manual y en el saldo inicial; b) no | **a** (aviso, no bloqueo; sin aviso si Activos fijos no está activo) |
| I-12 | ¿El mínimo para bien de control se mide por línea o por unidad? | a) Por línea (50 sillas de Q300 = Q15,000 → activo grupo); b) por unidad (cada silla de Q300 → bien de control) | **a**, como recomienda el contador (NIC 16.9) y ya hace la bandeja; se muestra el costo por unidad como ayuda |
| I-13 | Código de las N unidades | a) Correlativos consecutivos propuestos y editables en la cuadrícula; b) un código base con sufijo (-01, -02…) | **a**: igual que un activo suelto; quien trae placas ya pegadas las escribe |

## 13. Para validar antes de programar

Con `contador-guatemala`:

| # | Punto | Propuesta |
|---|---|---|
| V-1 | Aviso D5 en la recepción y no al crear el artículo | §7.2 **[corrige el dictamen D5]** |
| V-2 | División: proporción con el sobrante en el origen; las cuotas ya cerradas se quedan en el origen; el mes de la división se reparte | §4.2 |
| V-3 | Un bien nuevo en bodega no se marca ocioso solo (solo al devolverlo, si se elige) | §3.3 |
| V-4 | Faltante de unidades de un grupo en el inventario físico: división + baja por faltante, con el aviso de IVA de siempre | §3.10 |

Con `seguridad`: el escaneo firmado de la boleta (si I-8 b) usa `core.archivos` con `recurso_dueno =
'activos-fijos.traslados'` y PDF revisado con qpdf; el tope de 200 unidades por operación.

## 14. Riesgos

| # | Riesgo | Qué se hace |
|---|---|---|
| R-1 | El stock por descripción se parte si se escribe distinto («Silla apilable» / «Silla apilable negra») | Agrupar también por alta conjunta; la división copia la descripción; filtro por clase |
| R-2 | Muchas divisiones pequeñas acumulan diferencias de un centavo en las cuotas | La última cuota de cada tramo absorbe el pendiente (§7.2 del diseño de Activos fijos); prueba con 50 divisiones de 1 |
| R-3 | Alguien marca la línea como inventario porque «lo va a guardar» | Texto de ayuda en el libro; el aviso D5 en Inventarios; descartar en la bandeja de Inventarios y registrar en Activos fijos (el libro no se edita; si importa la casilla del SAT-2237, se anula y se registra de nuevo, V-11 de Activos fijos) |
| R-4 | Capitalizar 200 unidades en una transacción | Tope de 200; inserción en tandas; el correlativo se pide de una vez por el bloque |
| R-5 | Anular una división borra un activo | Solo sin movimientos posteriores; auditoría con los dos DTO; la fila de la división queda con el código |

## Respuestas del usuario (2026-11-18)

Todas las recomendaciones: **I-1** (a) el stock de bienes de uso vive en **Activos fijos**, con la bodega como ubicación
(opción C); **I-2** (a) se deprecia desde que está recibido y listo, en los dos libros; **I-3** (a) el sistema divide el grupo
al trasladar, dar de baja o contar (cambia AF-P10: ya no es «baja solo total»); **I-12** (a) el mínimo se mide por línea;
**I-4** (a) una línea de N unidades se capitaliza en N activos con el sobrante del redondeo en el último; **I-13** (a)
códigos correlativos propuestos y editables; **I-5** (a) bienes de control como gasto también en lo fiscal, con aviso;
**I-6** (a) equipo de reserva y repuestos importantes como activo fijo; **I-7** (a) casilla «En bodega de activos» en el
traslado; **I-8** (b) se imprime la boleta y se sube el escaneo firmado; **I-11** (a) aviso en Inventarios; **I-10** (a)
salida a «obra o uso propio»; **I-9** (a) una división se anula en mes abierto sin movimientos posteriores.

**AFI-0 hecho (2026-11-18).** Llevado a `diseno-activos-fijos.md` (marcado **(AFI)**: §0, §2, §3.1 a §3.4, §3.7 a §3.9,
§3.11 nuevo, §4.2 a §4.5, §5.3, §5.4, §5.8, §5.11, §5.13, §5.14, §5.15 `divisiones`, §5.16 `boletas_firmadas`, §6.2 a
§6.4, §6.7 a §6.13, §7.6, §8, §9 a §19; pasos AFI-1 a AFI-9 encajados en §16) y a `diseno-inventarios.md` (§2, §3.7, §4.1
ayuda de las casillas, §4.3 orden del umbral y aviso, §6.3, §6.4, §8, §16 con AFI-9). AF-P22 = b quedó diseñada en
§6.13 de Activos fijos, para revisión de `seguridad`. Los puntos V-1 a V-4 de §13 siguen pendientes del contador (en
Activos fijos, VI-1 a VI-4).
