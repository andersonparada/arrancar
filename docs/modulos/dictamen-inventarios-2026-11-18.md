# Dictamen del contador, 2026-11-18: Inventarios

_Investigación del agente `contador-guatemala` del 2026-11-18, guardada tal cual (sin cambiar el texto) por el agente
`arquitecto-de-datos`. La usa `diseno-inventarios.md`, que marca como «por validar» lo que aquí queda dudoso._

---

# Dictamen del contador: módulo de Inventarios (Guatemala, cualquier rubro y régimen)

**Etiquetas.** [Ley] es texto legal, [Práctica] es práctica profesional, de auditoría o de ERP, y [Opinión] es mi criterio. **Certeza:** A = confirmada en más de una fuente; M = fuente secundaria o de memoria, sin contradicción; B = hay que verificarla antes de programar.

**Límite de la investigación.** No pude extraer el texto de los PDF oficiales del Decreto 10-2012, del AG 213-2013 ni del AG 5-2013: vienen comprimidos o escaneados, y el portal de la SAT respondió 403. Lo legal se cotejó con despachos (Deloitte Guatemala, Vescco, Ramírez & Asociados), vLex y tesis. El **número de artículo** y el sentido general son confiables. Los detalles finos están marcados con M o B. Antes de programar textos legales en pantallas o mensajes, alguien debe abrir el PDF oficial.

---

## 1. Lo legal y fiscal

### 1.1 ISR (Decreto 10-2012, Libro I)

| Tema | Regla | Fuente | Certeza |
|---|---|---|---|
| **Métodos de valuación admitidos** | Al cierre del período, las existencias se valúan **en forma consistente** con uno de estos métodos: 1) costo de producción, 2) PEPS, 3) promedio ponderado, 4) precio histórico del bien. **UEPS no aparece.** | [Ley] **art. 41** (no el 55: el 55 trata de partes relacionadas) | A |
| Otro método | Se puede pedir a la SAT autorización para otro método si se demuestra que ninguno de los anteriores es adecuado. | [Ley] art. 41 | A |
| **Cambio de método** | Un método adoptado **no se cambia sin autorización previa** de la SAT. | [Ley] art. 41 | A |
| Ganadería | Además de los métodos anteriores, admite «costo estimativo o precio fijo». | [Ley] art. 41 | M (falta el texto literal y la fórmula) |
| **Provisiones de inventario** | No se admiten provisiones ni reservas de inventario, tampoco por baja de precios. El deterioro contable (NIIF) **no es deducible** mientras el bien no se venda, se destruya o se dé de baja con su soporte. | [Ley] art. 41, según tesis USAC; relacionado con los no deducibles del art. 23 | M |
| Costo de ventas deducible | Es deducible el costo de producción y de venta de mercancías, con documentos de soporte. | [Ley] art. 21 num. 1 | M |
| Pérdidas por destrucción o faltante | Son deducibles las pérdidas por extravío, rotura, daño o destrucción **comprobadas** y no cubiertas por seguro. | [Ley] art. 21 (el dictamen de Activos fijos lo citó como num. 17) | M en el numeral |
| **Inventario al 31-dic y reporte semestral** | Obligados: contribuyentes del **régimen sobre las utilidades**. Deben levantar inventario al 31 de diciembre, asentarlo en el libro y **reportar las existencias a la SAT** al 30-jun y al 31-dic. | [Ley] **art. 42 num. 3**; FAQ de la SAT | A |
| Plazos del reporte | Corte del 30-jun: hasta el 31-jul. Corte del 31-dic: hasta el 31-ene. | Deloitte, Vescco | M |
| Plataforma | Desde el 6-jun-2025, el «Reporte Semestral de Inventarios» se presenta en la Agencia Virtual y reemplaza la herramienta de escritorio. Pide el **número de autorización del Libro de inventarios y los folios autorizados**. | Deloitte (2025) | M |
| Contenido del reporte | Existencias por producto: cantidad, valor unitario, valor total y corte, separadas por tipo (mercadería, materia prima, en proceso, terminado, en tránsito, en consignación, pignorado). | Deloitte, Vescco | B: falta comparar con la plantilla oficial |
| Multa por no reportar o reportar tarde | Infracción a deberes formales: Q5,000 la primera vez, Q10,000 la segunda y Q10,000 más 1 % de los ingresos a partir de la tercera. | [Ley] Código Tributario art. 94, según Vescco | M |
| Régimen opcional simplificado (arts. 43-44) | El ISR se paga sobre ingresos, así que el costo de ventas no afecta el impuesto y el reporte del art. 42 num. 3 no lo obliga. Sigue obligado a llevar contabilidad y el Libro de inventarios si el Código de Comercio se lo exige. | [Ley] arts. 42-44; Código de Comercio art. 368 | M |
| Pequeño contribuyente | Solo control interno. | — | M |

**Sobre «inventario de apertura y de cierre que se presentan con la declaración anual».** Hay que precisarlo. La declaración anual del ISR no lleva el detalle por artículo: lleva **totales**, es decir, el inventario inicial y el final dentro del costo de ventas y el inventario en el balance. El **detalle** va en el **reporte semestral** (corte del 31-dic) y en el **Libro de inventarios** autorizado. Los tres deben cuadrar entre sí y con la contabilidad. [Práctica, M]

### 1.2 IVA (Decreto 27-92 y Reglamento, AG 5-2013)

| Tema | Regla | Fuente | Certeza |
|---|---|---|---|
| **Faltantes como hecho generador** | La destrucción, la pérdida o cualquier hecho que implique faltante de inventario **genera IVA**. | [Ley] **art. 3 num. 7** (vLex) | A |
| Excepciones | (a) Bienes **perecederos**. (b) **Caso fortuito o fuerza mayor**, con **acta notarial**. (c) **Delitos contra el patrimonio**, con **certificación de la denuncia** ante la policía **ratificada en el juzgado**. En todos los casos el hecho se registra en la contabilidad en orden cronológico. | [Ley] art. 3 num. 7 | A |
| Perecederos | El reglamento pide **acta firmada por un auditor de la SAT y el contribuyente, o acta notarial**. La ley los exceptúa, pero sin acta quedan sin soporte. | [Ley] Reglamento AG 5-2013 **art. 5** (una versión lo numera como art. 4) | M |
| No perecederos sin excepción | Se **emite la factura** del faltante. La base no puede ser menor que el **precio de adquisición o el costo de fabricación**. | Reglamento art. 5; Ley art. 13, base en casos especiales (M); Ramírez & Asociados | M; B en cómo emitir el FEL (receptor: el NIT propio o CF) |
| Retiro para uso del dueño o su familia | Es hecho generador: hay que facturar con base mínima en el costo. | [Ley] art. 3 num. 6 | M |
| Donación | Es hecho generador. | [Ley] art. 3 num. 9 | M |
| Crédito fiscal de la compra | El IVA de las compras de inventario es crédito si cumple los arts. 15-18. El IVA que no se recupera (pequeño contribuyente, compra fuera de plazo, exento sin derecho) **forma parte del costo** del artículo. Libro de compras ya lo resuelve. | [Ley] arts. 15-18; NIIF Pymes 13.6 | A |
| Faltante exceptuado con acta: ¿hay que devolver el crédito? | La ley no lo dice expresamente. En la práctica no se devuelve si el soporte está completo. | [Opinión] | B: lo confirma el contador de cada empresa |
| Régimen de pequeño contribuyente (5 % sobre ingresos) | No tiene débito ni crédito, así que el art. 3 num. 7 en la práctica no genera débito. | [Opinión] | B |

### 1.3 Código de Comercio

| Tema | Regla | Certeza |
|---|---|---|
| Libro de inventarios | Es obligatorio y está autorizado (art. 372). Se asienta el inventario de **apertura** y el de **cada cierre** (art. 374), firmados por el comerciante y el contador. Incluye mercadería y activo fijo. | M (ver el dictamen de cheques del 2026-11-18) |
| Contabilidad | Obligatoria para comerciantes según el art. 368. | M |

---

## 2. NIIF para las Pymes, sección 13

Es práctica obligatoria en Guatemala por adopción del Colegio de Contadores. La SAT no la exige: el ISR sigue el art. 41.

| Párrafo | Regla | Efecto en el diseño |
|---|---|---|
| 13.4 | Se mide al **menor** entre el costo y el precio de venta estimado menos los costos de terminación y venta (VNR). | Revisión del VNR al cierre, con deterioro y su reversión (sección 27). |
| 13.6 | El costo incluye el precio de compra, los **aranceles y los impuestos no recuperables**, el transporte, la manipulación y otros costos directos, **menos descuentos y rebajas**. | Costos de internación (DAI, flete, seguro, agente aduanal) repartidos entre las entradas. Las notas de crédito y los descuentos posteriores bajan el costo. |
| 13.7 | Si el pago se difiere más allá de lo normal, la financiación no es costo. | Fuera de v1. |
| 13.8-13.11 | Costos de transformación: los indirectos fijos se reparten según la capacidad normal. | Corresponde a Producción o Siembras, no a Inventarios. |
| 13.13 | Se excluyen las **mermas anormales**, el almacenamiento que no es necesario, la administración y las ventas. | Merma normal dentro del costo; merma anormal como gasto. |
| 13.15 | Los productos agrícolas cosechados entran al **valor razonable menos los costos de venta en el punto de cosecha** (sección 34), y ese valor es su costo. | La cosecha llega desde Siembras con su valor. |
| 13.16 | Se permiten el costo estándar y el método minorista si se aproximan al costo real. | No en v1. |
| 13.17 | **Identificación específica** para lo que no es intercambiable (bienes con serie). | Opcional por artículo. |
| 13.18 | **PEPS o promedio ponderado**. **UEPS prohibido.** Se usa la misma fórmula para inventarios de igual naturaleza y uso. | Coincide con el art. 41. |
| 13.19 + secc. 27 | Deterioro evaluado en cada fecha de cierre; **se revierte** si sube el VNR, hasta el costo. | Es una diferencia temporaria con lo fiscal: el deterioro no es deducible. |
| 13.20 | El inventario vendido es gasto (costo de ventas) cuando se reconoce el ingreso. | Evento de salida por venta. |
| 13.21 | El inventario usado en otro activo (por ejemplo, una obra) pasa a formar parte de ese activo. | Salida hacia la obra en curso de Activos fijos. |
| 17.5 | Los repuestos importantes y el equipo de mantenimiento permanente que se usan más de un período **son propiedad, planta y equipo**, no inventario. | Límite con Activos fijos. |

Nota: la 3.ª edición de la NIIF para las Pymes (IASB, 2025, vigente desde 2027) no cambia lo esencial de la sección 13 [M].

---

## 3. Qué está bien y qué está mal en lo que se pidió o planificó

| Idea | Valoración | Por qué y cómo corregirlo |
|---|---|---|
| Promedio ponderado y PEPS | **Bien** | Son los métodos que admiten el art. 41 y la NIIF 13.18. No ofrecer UEPS. |
| Elegir el método libremente | **Mal si se puede cambiar después** | El art. 41 exige consistencia y autorización previa de la SAT para cambiarlo. El método se fija **por empresa**, opcionalmente por categoría, y se **bloquea** desde el primer movimiento. Cambiarlo exige un registro de la autorización de la SAT (número y fecha) con efecto desde el inicio de un período. |
| PLAN §6: el Inventario **presta** activos (motosierra, tractor) y los vende | **Mal ubicado** | Una herramienta durable que se presta no es inventario (13.1 y 17.5): es activo fijo o bien de control. Ya existe Activos fijos con bienes de control, responsables y traslados. **Recomiendo que el préstamo viva en Activos fijos**, no en Inventarios. Contradice la tabla de alcance del diseño de Activos fijos, que manda el préstamo de herramientas a Inventario: hay que decidirlo. |
| Faltante → IVA | **Bien, pero incompleto** | Hay que distinguir cuatro casos: perecedero con acta de la SAT o notarial, fortuito con acta notarial, delito con denuncia ratificada, y los demás, que se facturan con base mínima en el costo. El sistema **no decide la exención**: pide la causa y el soporte, y avisa. |
| Traslados entre bodegas | **Bien dentro de la misma empresa** | No tienen efecto fiscal ni partida, salvo que las bodegas usen cuentas distintas. **Un traslado entre empresas de la misma cuenta no es un traslado: es una venta** (IVA y FEL). El sistema debe impedirlo. |
| «Inventario de apertura y de cierre con la declaración anual» | **Impreciso** | Ver §1.1. Lo que se presenta por artículo es el reporte semestral y el Libro de inventarios. La declaración lleva totales. |
| Deterioro o ajuste a VNR | **Hace falta**, aunque no estaba en la lista de operaciones | Va como evento contable aparte del costo del artículo (estimación), para que lo fiscal no lo deduzca. |

---

## 4. Recomendaciones de diseño (para `arquitecto-de-datos`)

**Catálogos**
- **Artículo**: código, nombre, categoría y **tipo de inventario** (mercadería, materia prima, suministro o insumo de consumo interno, producto en proceso, producto terminado, repuesto menor, empaque). El tipo hace falta para el reporte semestral y las cuentas contables. Lleva también la unidad base, si maneja lote y vencimiento, si maneja serie (identificación específica) y una marca de «inventariable». Lo que no se inventaría se manda a gasto directamente en Compras o Caja chica.
- **Unidades y conversiones** por artículo: quintal = 100 lb, arroba = 25 lb, galón, fardo, docena, caja de N. El costo se guarda siempre **en la unidad base**. Cantidad con 4 decimales y costo unitario con 6; el total, en `numeric(14,2)`.
- **Bodega = localidad**, o varias bodegas por localidad, con su responsable. Encaja con el alcance por registro ya previsto: «el bodeguero ve su bodega».

**Kardex.** Una tabla de movimientos por artículo y bodega, con cantidad, costo unitario, costo total y saldo. Tipos de movimiento:

| Movimiento | Origen | Costo |
|---|---|---|
| Saldo inicial | Carga inicial de Empresas, con cierre | Costo de apertura. Con PEPS, por capa y fecha. |
| Entrada por compra | Línea del Libro de compras marcada como inventario | Costo de la línea **sin el IVA recuperable**, más el IVA no recuperable, menos descuentos. |
| Costo adicional | Factura de flete, DAI, agente o seguro, ligada a una o varias entradas | Se reparte por valor, peso o cantidad. Si el artículo ya salió, la parte vendida o consumida va a costo de ventas o gasto. |
| Devolución a proveedor o nota de crédito | Libro de compras | Al costo de la entrada. |
| Salida por consumo | Destino obligatorio: localidad, departamento o centro de costo, siembra, obra de Activos fijos o mantenimiento de un activo | Al costo del método. |
| Salida por venta | Ventas (futuro) | Al costo del método; evento de costo de ventas. |
| Retiro del dueño, donación o muestra | Salida aparte | Aviso de IVA, art. 3 nums. 6 y 9. |
| Traslado | Salida y entrada ligadas, con estado «en tránsito» opcional | Al mismo costo; boleta de traslado imprimible. |
| Ajuste | Faltante, sobrante o merma, con causa, soporte y aprobación | Ver la tabla de faltantes de abajo. |
| Deterioro a VNR y su reversión | Cierre | No toca el costo del kardex; va en un registro aparte de estimación. |

**Costeo**
- **Promedio ponderado móvil** (se recalcula con cada entrada) como opción predeterminada: es lo más usado por las pymes de Guatemala [Práctica, M] y es lo más simple. **PEPS** como opción, con **capas de costo**. La capa no es lo mismo que el lote físico: el lote con vencimiento se controla aparte.
- **Existencias negativas: prohibidas** por omisión. Con existencia negativa el costo se inventa.
- **Movimientos con fecha anterior** a otros ya registrados recalculan el costo hacia adelante, solo dentro del período abierto. Un período cerrado se bloquea (cierre mensual de inventario).
- **Multimoneda**: el inventario es partida **no monetaria**. Se registra al tipo de cambio del día de la entrada y no se remide. Coincide con el diseño de Multimoneda, que rechaza el inventario en la remedición.

**Inventario físico**
- Conteo por bodega con congelamiento de la existencia teórica, conteo (desde el teléfono, por código), diferencias, aprobación y **acta imprimible**. Al menos uno **al 31-dic** (art. 42 num. 3).

**Faltantes** (causa obligatoria):

| Causa | Soporte que se pide | IVA |
|---|---|---|
| Perecedero, merma o vencimiento | Acta firmada por un auditor de la SAT y el contribuyente, o acta notarial | Sin débito con el acta. |
| Caso fortuito o fuerza mayor | Acta notarial | Sin débito con el acta. |
| Robo o hurto | Certificación de la denuncia ratificada en el juzgado | Sin débito con la certificación. |
| Sin causa exceptuada | — | Aviso: «hay que facturar; base no menor que el costo». Débito de IVA. |

  El sistema guarda el adjunto, igual que en Activos fijos, que ya trae V-12. **Sobrante**: entra al costo promedio vigente y se abona a resultados (otros ingresos o menor costo de ventas, según la política de la empresa).

**Reportes**
- Kardex por artículo.
- Existencias valuadas a una fecha.
- **Reporte semestral** con el formato de la plantilla de la SAT, a confirmar contra la plantilla oficial.
- **Libro de inventarios**: detalle de apertura y de cierre, con el número de autorización y los folios.
- Artículos por vencer.
- Rotación y obsolescencia, como apoyo al VNR.

**Eventos para Contabilidad**: `entrada_registrada`, `costo_adicional_distribuido`, `salida_por_consumo` (con su destino), `salida_por_venta` (costo de ventas), `traslado` (solo informativo), `ajuste_faltante` y `ajuste_sobrante` (con la marca de IVA), `retiro` y `donacion`, `deterioro_registrado` y `deterioro_revertido`. Todos con valor en GTQ.

---

## 5. Integración con los otros módulos

| Módulo | Regla | Certeza o tipo |
|---|---|---|
| **Libro de compras** | Una línea de factura es **gasto, activo fijo o inventario, nunca dos cosas**. La entrada se genera desde la línea, con recepción parcial opcional. La compra a quien no está inscrito (factura especial, Ley del IVA art. 52) entra a su costo neto del IVA retenido acreditable. | [Práctica / Opinión] |
| **Caja chica y Cuentas por liquidar** | Si el documento liquidado es de un artículo inventariable, se genera una entrada. Si es un consumo directo (combustible del día, insumo menor no inventariable), va a gasto y **no** pasa por el inventario. El mismo documento no puede ir a los dos lados. | [Opinión] |
| **Activos fijos** | Repuestos importantes y herramientas durables → Activos fijos (17.5). Materiales que se consumen en una obra → salida hacia la obra en curso (13.21). Repuestos menores y lubricantes → inventario, con salida a «mantenimiento del activo X». El préstamo de herramientas, en Activos fijos (ver §3). | [Ley NIIF / Opinión] |
| **Ventas (futuro)** | La venta lleva la salida al costo y el costo de ventas. La devolución del cliente reingresa **al costo original** de la salida. La mercadería en consignación de terceros no es existencia propia: se controla, pero no se valúa ni se reporta. | [Práctica] |
| **Siembras y Ganado** | El producto en proceso del cultivo vive en Siembras. La **cosecha** entra a Inventarios con el valor que le da Siembras (13.15 y art. 41, costo de producción). El ganado **no** se lleva por cabeza en Inventarios: es del módulo Ganado, con el método ganadero del art. 41. | [Opinión] |

---

## 6. Preguntas para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| INV-P1 | ¿Qué métodos de costeo en v1? | a) Solo promedio ponderado móvil; b) promedio y PEPS; c) además, identificación específica por serie | **b**. La c, después; la pide el comercio de bienes con serie (motos, equipos). |
| INV-P2 | ¿Método por empresa o por categoría? | a) Uno por empresa; b) por categoría, bloqueado tras el primer movimiento | **a**. El art. 41 habla de consistencia; la b solo si un cliente lo justifica (certeza B de que la SAT lo acepte). |
| INV-P3 | ¿Dónde vive el préstamo de herramientas y equipo? | a) Activos fijos (bien de control); b) Inventarios | **a**. No es inventario. Corrige PLAN §6. |
| INV-P4 | ¿Se permiten existencias negativas? | a) Nunca; b) con permiso y costo provisional | **a**. |
| INV-P5 | ¿Bodega igual a localidad o varias bodegas por localidad? | a) 1 a 1; b) varias por localidad | **b**. Una finca tiene bodega de insumos, de combustible y de cosecha. |
| INV-P6 | ¿Lotes y vencimientos en v1? | a) Sí, opcional por artículo; b) después | **a**. Lo pide el PLAN y lo necesitan agroquímicos, medicinas veterinarias y alimentos. |
| INV-P7 | ¿El faltante sin causa exceptuada emite la factura FEL desde el sistema? | a) Solo avisa y guarda el número de la factura emitida fuera; b) la emite cuando exista Ventas o FEL | **a** en v1. |
| INV-P8 | ¿Reporte semestral de la SAT en v1? | a) Sí, en el formato de la plantilla; b) solo existencias valuadas en Excel | **a**, después de que alguien baje la plantilla oficial de la Agencia Virtual. |
| INV-P9 | ¿Costos adicionales de importación o flete prorrateados en v1? | a) Sí; b) después | **a** para quien importa o compra con flete aparte; si no, el costo queda mal. |
| INV-P10 | ¿Deterioro a VNR en v1? | a) Registro manual al cierre; b) después | **a**: es un solo evento y lo pide el auditor. |
| INV-P11 | ¿El sobrante se abona a otros ingresos o se resta del costo de ventas? | Política por empresa | Configurable. Por omisión, otros ingresos. |

---

## 7. Lo que hay que verificar antes de programar (certeza B)

1. Texto literal del **art. 41**: cómo se redacta lo de la ganadería y las provisiones, y si admite un método por clase de inventario.
2. Reglamento **AG 213-2013**: si fija un procedimiento o plazo para pedir el cambio de método.
3. **Reglamento del IVA art. 5 (o 4)**: el texto exacto de las actas de perecederos y la factura de no perecederos. También cómo se emite el FEL del faltante (receptor: el NIT propio o CF).
4. **Plantilla oficial** del Reporte Semestral de Inventarios: sus columnas y los tipos de inventario.
5. Numeral exacto del art. 21 para las pérdidas comprobadas.

---

## Veredicto

El alcance pedido es **correcto con ajustes**:

1. El método de costeo queda fijo y solo se cambia con la autorización de la SAT registrada.
2. El préstamo de herramientas sale de Inventarios y pasa a Activos fijos.
3. Un traslado entre empresas se trata como venta, no como traslado.
4. Los faltantes llevan causa y soporte según el art. 3 num. 7 y el reglamento, con aviso de IVA.
5. Se agrega el deterioro a VNR fuera del kardex, porque no es deducible.
6. La «declaración anual» se precisa como el reporte semestral más el Libro de inventarios.
7. Una misma factura o liquidación es gasto, activo fijo o inventario, nunca dos de ellos.

## Fuentes
- [Ley de Actualización Tributaria, Decreto 10-2012 (Congreso)](https://www.congreso.gob.gt/assets/uploads/info_legislativo/decretos/2012/010-2012.pdf) y la [copia de ICNL](https://www.icnl.org/wp-content/uploads/leydeacttrib.pdf): arts. 21, 41, 42 num. 3 y 43-44
- [Ley del IVA, Decreto 27-92 (vLex)](https://gt.vlex.com/vid/ley-impuesto-valor-agregado-1075701258): art. 3 num. 7
- [Reglamento de la Ley del IVA, AG 5-2013 (CGAB)](https://cgab.org.gt/wp-content/uploads/2023/10/Reglamento-de-la-Ley-del-IVA-Acuerdo-Gubernativo-5-2013_3.pdf): art. 5
- [Deloitte: Baja de inventario de bienes y su impacto fiscal en el IVA](https://www2.deloitte.com/gt/es/pages/about-deloitte/topics/deloitte-en-medios/baja-de-inventario-de-bienes-impacto-fiscal-en-el-iva.html)
- [Deloitte: Nueva plataforma del informe semestral de inventarios (2025)](https://www.deloitte.com/latam/es/industries/consumer/perspectives/nueva-plataforma-informe-semestral-inventarios.html)
- [Deloitte: Obligación de reportar a la SAT los inventarios al 31 de diciembre](https://www2.deloitte.com/gt/es/pages/about-deloitte/topics/deloitte-en-medios/obligacion-de-reportar-a-la-sat-los-inventarios-al-31-de-diciembre.html)
- [Portal SAT: Reporte de inventarios](https://portal.sat.gob.gt/portal/sistemas-web/reportedeinventarios/) y [preguntas frecuentes de cumplimiento tributario](https://portal.sat.gob.gt/portal/preguntas-frecuentes/cumplimiento-tributario/)
- [Vescco: Informes de inventario y auditorías de la SAT](https://www.jeovanyvesco.com/post/informes-de-inventario-y-auditorias-del-sat-en-guatemala): Código Tributario arts. 94 y 145 «A»
- [Ramírez & Asociados: Venta de inventario y activos obsoletos como chatarra](https://ramirezyasociados.com.gt/ventas-de-inventario-y-activos-obsoletos-como-chatarra-en-guatemala/)
- [Prensa Libre: reporte de inventarios a la SAT](https://www.prensalibre.com/?p=6059612)
- [Tesis USAC 03_5671](http://biblioteca.usac.edu.gt/tesis/03/03_5671.pdf): art. 41 y las provisiones
- NIIF para las Pymes (IASB), secciones 13, 17.5, 27, 30 y 34
- Documentos del repositorio: `/home/aparada/proyectos/arrancar/docs/modulos/dictamen-activos-fijos-2026-11-18.md`, `/home/aparada/proyectos/arrancar/docs/modulos/diseno-activos-fijos.md` (tabla de alcance y V-12), `/home/aparada/proyectos/arrancar/docs/PLAN.md` §6 (préstamo en Inventario) y `/home/aparada/proyectos/arrancar/docs/modulos/diseno-multimoneda.md` (inventario como partida no monetaria)
