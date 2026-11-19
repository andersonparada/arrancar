# Dictamen del contador, 2026-11-18: Parcelas

_Investigación del agente `contador-guatemala` del 2026-11-18, guardada tal cual (sin cambiar el texto) por el agente
`arquitecto-de-datos`. La usa `diseno-parcelas.md`, que marca como «por validar» lo que aquí queda dudoso y como
**[corrige el dictamen]** lo que el código ya resolvió de otra forma._

---

# Dictamen del contador: módulo Parcelas (módulo de rubro, base de Ganadería y Cultivos)

Certeza: **A** = texto de la ley o fuente primaria leída; **M** = fuente secundaria seria o ley citada sin leer el texto oficial; **B** = práctica u opinión mía, falta verificarlo. No pude leer los PDF oficiales de la Ley del IVA ni de la LAT (el servidor no extrae su texto). Por eso esos artículos van con **M** y hay que cotejarlos antes de cerrar el diseño.

## 1. Cómo va el modelo (lo más importante)

| # | Idea | Por qué | Tipo |
|---|---|---|---|
| 1 | **Una parcela no es una finca registral.** La parcela, potrero o lote es una unidad de manejo. La finca registral (número de finca, folio y libro en el Registro General de la Propiedad) es una unidad jurídica. Una finca registral puede tener muchas parcelas, y un potrero puede abarcar dos fincas registrales: la relación es **N:M** | Así funciona en el campo y en el Registro. Si se mezclan, se rompe el IUSI y la base fiscal del terreno | Práctica / opinión (B) |
| 2 | **La parcela no lleva dinero.** El costo del terreno ya vive en Activos fijos (clase Terrenos, no se deprecia: art. 26 LAT; dictamen del 2026-11-18). Parcelas solo apunta al activo (opcional) y no duplica valores | Si el costo estuviera en dos lugares, habría dos verdades | Ley (A, art. 26) + opinión |
| 3 | **Localidad (finca) → parcela → subparcela** (el Composite de `PLAN.md` §3). La raíz es `core.localidades` de tipo finca. El alcance por localidad ya filtra a los encargados (`plan-hallazgos-contables.md` H5) | Encaja con lo que ya existe | Diseño |
| 4 | **NIIF Pymes:** el terreno propio es Propiedad, planta y equipo (sec. 17). Si se da en arriendo a terceros, puede ser **propiedad de inversión** (sec. 16). Lo que crece encima (ganado, siembras, plantaciones) es un activo biológico (**sec. 34**). Lo cosechado es inventario (sec. 13) | Lo pide el encargo y es correcto | NIIF (A) |
| 5 | **La parcela es una dimensión de costo**, distinta de las Áreas (`core.areas`). Cultivos acumulará costos por **ciclo × parcela**, Ganadería por potrero o lote, y Contabilidad los leerá por evento | Sin esto no hay costo por manzana ni rentabilidad por lote | Práctica (B); así lo hacen SAP B1 y Odoo con dimensiones o cuentas analíticas |

## 2. Superficie y unidades

| Unidad | Equivalencia | Certeza |
|---|---|---|
| Vara | 0.835905 m (tabla del INE) | M |
| Vara cuadrada (v²) | 0.698737 m² | M |
| Manzana | 10,000 v² = 6,987.37 m² ≈ 0.6987 ha | M (el glosario del MAGA de 2013 imprime 0.7050 ha: no usarlo) |
| Caballería | ≈ 64.58 manzanas ≈ 45.12 ha | M |
| Cuerda | **No tiene un valor único.** Puede ser de 20×20, 25×25, 30×30, 40×40 o 50×50 varas por lado: 400, 625, 900, 1,600 o 2,500 v². La de 25×25 mide ≈ 436.7 m² (16 cuerdas = 1 manzana) | M |
| Hectárea | 10,000 m² ≈ 1.43 manzanas | A |

Recomendaciones:
- **Guardar la superficie en m²** (`numeric(14,2)`). La hectárea y la manzana se calculan solo para mostrar.
- Guardar también **la cifra y la unidad originales** (la de la escritura o la medición), para poder rastrearlas.
- **La cuerda se configura por empresa** (o por localidad): el usuario indica cuántas varas mide por lado. No conviene fijarla en el código.
- Las equivalencias van en configuración de instalación, con el factor de la vara del INE.
- La regla «la suma de las subparcelas no puede pasar la superficie de la madre» debe ser **una advertencia, no un bloqueo**: las mediciones de campo y las de la escritura casi nunca cuadran.
- Distinguir la **superficie total** de la **superficie útil** (la que se puede pastorear o sembrar).

## 3. Mapa y coordenadas

| Tema | Recomendación | Certeza |
|---|---|---|
| Formato | GeoJSON (RFC 7946), que **exige WGS84 (EPSG:4326)**: longitud y latitud | A |
| Sistema oficial del país | Los planos guatemaltecos suelen venir en **GTM**: Transversa de Mercator con meridiano central en −90.5°, factor de escala 0.9998, falso este de 500,000 m (ESRI:103598). Importar desde GTM y convertir a WGS84; guardar el sistema de origen | M (JICA, spatialreference.org) |
| Área calculada | El área del polígono es solo informativa. Nunca reemplaza la superficie de la escritura | Opinión |
| Base de datos | PostGIS o JSONB: lo decide `arquitecto-de-datos` | — |

## 4. Tenencia de la tierra

| Forma | Qué registrar | Base legal / certeza |
|---|---|---|
| Propia inscrita | Finca, folio y libro; registro (General o Segundo, en Quetzaltenango); matrícula fiscal y valor de matrícula; activo fijo vinculado | Código Civil (Registro) – M |
| Propia sin inscribir (derechos posesorios) | Es muy común en Guatemala. Documento (escritura de derechos posesorios), titulación supletoria en trámite | Decreto 49-79 – M |
| **Arrendada** (la empresa es arrendataria) | Contrato con arrendador (tercero), plazo, renta, periodicidad, moneda, **renta en dinero o en especie** (p. ej. quintales) y si está inscrito | CC art. 1880 (renta «cierta y determinada», en dinero o en otra cosa equivalente) – M |
| Dada en arriendo (la empresa es arrendadora) | El mismo contrato, del lado del ingreso | — |
| Usufructo, comodato, aparcería o medianía, copropiedad, otra | Documento y vigencia | B |

Reglas del Código Civil que importan (M, citadas por una fuente secundaria; verificar en CENADOJ):
- **Art. 1125, inciso 6:** el arrendamiento **debe inscribirse** en el Registro cuando dura **más de 3 años** o cuando se anticipó la renta por más de un año. Si se inscribe, necesita escritura pública (art. 1576), y quien inscribe primero tiene preferencia (art. 1885). El sistema debería **avisar** cuando un contrato está en ese supuesto y no está marcado como inscrito.
- **Art. 1901, inciso 6:** los impuestos de la cosa (el **IUSI**) son **del arrendador**, salvo pacto en contrario. Conviene un campo «IUSI a cargo de: arrendador / arrendatario (por pacto)».
- No encontré un plazo máximo especial para fincas rústicas: el art. 1886 deja el plazo a las partes. No lo programe sin verificarlo.

## 5. El arrendamiento en ISR e IVA

| Tema | Qué dice | Certeza |
|---|---|---|
| IVA | Arrendar muebles e inmuebles es hecho generador (Ley del IVA, **art. 3, numeral 4**). No encontré exención para tierras agrícolas (el art. 7 es taxativo) | A (art. 3.4); M (que no haya exención) |
| ISR del arrendador persona individual que no tiene ese giro | Renta de capital inmobiliario (LAT **art. 84**). Base: la renta **menos 30 %** sin prueba (**art. 88**). Tasa del **10 %** (**art. 92**), ≈ 7 % efectivo. Retención o pago directo (arts. 94-95) | M |
| ISR del arrendador empresa que vive de arrendar | Renta de actividades lucrativas, en su régimen | M |
| Arrendatario | El gasto es deducible si se usa para producir renta gravada y está **documentado con FEL** (LAT arts. 21 y 22). Si el arrendador rural no factura, no es deducible ni hay crédito de IVA. Usar la factura especial para arrendamientos es dudoso | M; factura especial **B**, consultar |
| NIIF Pymes (arrendatario) | Arrendamiento operativo = gasto lineal (sec. 20). La 3.ª edición de 2025 no adoptó la NIIF 16 | M |

**Conclusión de diseño:** Parcelas **no calcula impuestos ni retenciones**. Guarda el contrato, genera el **calendario de rentas** y emite eventos. La factura y la retención (si la empresa es agente de retención) se registran en el Libro de compras, Cuentas por pagar o Ventas, como ya está acordado para lo general. **Corrección al encargo:** el «tratamiento en ISR e IVA del arrendamiento» no debe vivir en Parcelas, porque duplicaría la lógica de los módulos generales.

## 6. IUSI y matrícula fiscal

| Tema | Qué dice | Certeza |
|---|---|---|
| Base | Valor del terreno, de las construcciones y de los **cultivos permanentes** (los que producen por más de 3 años). No entran la maquinaria ni el equipo (Decreto 15-98, art. 4) | M |
| Quién lo cobra | DICABI (MINFIN) o la municipalidad que ya administra el IUSI. Hay matrícula fiscal y valor de matrícula | M |
| **Decreto 18-2026** | Publicado el 28-ago-2026. El IUSI cambia **90 días después (≈ 26-nov-2026)**. Vivienda, uso residencial y uso mixto pagan 0 por millar (siguen obligados a lo formal). Uso comercial y otros usos (donde caería la finca rústica): **3, 6 y 9 por millar**, hasta Q500 mil, de Q500 mil a Q1 millón y más de Q1 millón. Los cambios al ISR y a Timbres rigen desde el 1-ene-2027 | M (Consortium Legal, prensa) |
| Deducibilidad | El IUSI de un inmueble que produce renta gravada es deducible (LAT art. 21) | M |

**Recomendación:** no calcular el IUSI en v1. Las tasas acaban de cambiar y es probable que haya acuerdos reglamentarios. Guardar en el inmueble su **matrícula, el valor de matrícula, la fecha del avalúo y el uso declarado**, y emitir un recordatorio. Ese valor ya lo necesita Activos fijos como tope de la base fiscal (art. 26), así que debe ser **un solo dato**.

## 7. Uso de la parcela y su historia

- Tabla de **períodos de uso**: desde, hasta (nulo mientras sigue) y uso, sin que se traslapen. Usos: pastoreo, cultivo anual, cultivo permanente o plantación, bosque, conservación, infraestructura, sin uso u otro.
- **El uso del encargo es demasiado simple:** separar el cultivo anual del permanente, porque el ISR (15 % para plantaciones, art. 28), el IUSI (cultivos permanentes) y la NIIF los tratan distinto.
- **Bosque:** cambiar el uso de una tierra con bosque exige licencia del INAB (Ley Forestal, Decreto 101-96, art. 46, **M**), y los incentivos PROBOSQUE y PINPEP piden un área georreferenciada. Al pasar de bosque a otro uso, el sistema solo **avisa** y deja el número de licencia como opcional.
- **Colindancias:** texto libre por rumbo (norte, sur, oriente, poniente), como en la escritura, y opcionalmente la parcela vecina.

## 8. Lo que necesitarán Ganadería y Cultivos (no programarlo en Parcelas)

| Módulo | Qué toma de Parcelas | Qué es suyo |
|---|---|---|
| Ganadería | Potrero = parcela con uso de pastoreo; superficie útil; pasto, agua y cerca como atributos opcionales | Ocupaciones (lote de animales, entrada, salida), días de descanso, **carga animal (UA/ha)**, rotación |
| Cultivos | Parcela con uso de cultivo y superficie útil | **Ciclo** (cultivo, variedad, siembra, área sembrada ≤ útil, cosecha, rendimiento por manzana o hectárea), costos por ciclo, activo biológico (sec. 34) y producto agrícola (sec. 13) |

Parcelas solo debe ofrecer: superficie útil vigente en una fecha, uso vigente en una fecha y la parcela como dimensión de costo. Así no hay que cambiarlo cuando lleguen esos módulos.

## 9. Lo que está bien y lo que hay que corregir del encargo

| Punto | Veredicto |
|---|---|
| Módulo de rubro activable, con dependencia de Empresas | Correcto |
| La sección 34 aplica a lo que crece, no a la tierra | Correcto |
| «Uso: ganado, siembra, bosque, otro» | Incompleto: separar el cultivo anual del permanente (§7) |
| Tratamiento en ISR e IVA y matrícula dentro de Parcelas | Incorrecto como lugar: lo fiscal va en los módulos generales, y el inmueble registral es general (una oficina también lo tiene) (§5, §6) |
| Superficie en unidades locales | Correcto con ajustes: guardar en m², la cuerda configurable y la cifra original |

## 10. Decisiones para el usuario

| # | Pregunta | Opciones | Mi recomendación |
|---|---|---|---|
| PA-1 | ¿Dónde viven los **inmuebles registrales** (finca, folio, libro, matrícula, IUSI)? | a) En Parcelas; b) en Activos fijos; c) en Empresas o core, como catálogo general | **c**. Lo usan Activos fijos (el tope de la matrícula), Parcelas y cualquier empresa con oficinas. Sirve para todo rubro. Si no, **b** |
| PA-2 | ¿Parcela con finca registral: 1:N o N:M? | a) Cada parcela, una finca registral; b) N:M | **b**, aunque en pantalla se vea casi siempre una sola |
| PA-3 | ¿Los contratos de arrendamiento en v1? | a) Solo forma de tenencia y documento; b) contrato con calendario de rentas que avisa a Cuentas por pagar o Cuentas por cobrar | **b**, sin calcular impuestos |
| PA-4 | ¿La renta en especie (quintales, medianía)? | a) Solo en dinero; b) dinero o especie, con la cantidad y el producto | **b**: es muy frecuente en el campo |
| PA-5 | ¿Cuántas varas mide la cuerda? | a) Una fija; b) configurable por empresa o localidad | **b** |
| PA-6 | ¿Mapa en v1? | a) Sin mapa; b) solo un punto (lat., long.); c) polígono GeoJSON con importación desde GTM y KML | **b** en v1 y **c** en v2, salvo que haga falta pronto para los incentivos forestales |
| PA-7 | ¿Cuántos niveles de jerarquía? | a) Finca → parcela; b) finca → parcela → subparcela, sin límite | **b**, con un tope razonable (3-4) |
| PA-8 | ¿Calcular el IUSI? | a) No, solo datos y recordatorio; b) sí, con tramos | **a**: el Decreto 18-2026 acaba de cambiar las tasas |

## Fuentes
- Decreto 18-2026 (IUSI): https://consortiumlegal.com/en/2026/09/03/guatemalas-iusi-reform-an-analysis-of-decree-18-2026/ ; https://emisorasunidas.com/nacional/2026/08/28/presidente-arevalo-sanciona-reformas-ley-iusi/ ; https://livinginguatemala.com/es/tramites/iusi-reforma-2026-viviendas-exentas/
- Ley del IUSI, Decreto 15-98 (base, cultivos permanentes): https://plataformaurbana.cepal.org/es/instrumentos/legal/decreto-ndeg-1598-ley-del-impuesto-unico-sobre-inmuebles-guatemala ; https://studylib.es/doc/9523375/ley-del-impuesto-unico-sobre-inmuebles
- Ley del IVA, art. 3.4: https://gt.vlex.com/vid/ley-impuesto-valor-agregado-1075701258 ; https://www.tse.org.gt/images/UECFFPP/leyes/decreto_27-92-iva.pdf
- LAT, Decreto 10-2012 (arts. 84, 88, 92, 94-95): https://www.icnl.org/wp-content/uploads/leydeacttrib.pdf ; https://livinginguatemala.com/es/diaspora/alquilar-tu-casa-en-guatemala-desde-usa/
- Código Civil (arts. 1125.6, 1576, 1880, 1885, 1886, 1901.6): https://livinginguatemala.com/es/tramites/contrato-arrendamiento-terreno-agricola-formato/ ; texto oficial: https://leap.unep.org/en/countries/gt/national-legislation/decreto-ley-no-106-codigo-civil
- Unidades: https://en.wikipedia.org/wiki/Metrication_in_Guatemala ; https://livinginguatemala.com/guides/guatemala-measurement-system/
- GTM: https://spatialreference.org/ref/esri/103598/ ; https://openjicareport.jica.go.jp/pdf/11740842_02.PDF
- Dictamen anterior de Activos fijos: /home/aparada/proyectos/arrancar/docs/modulos/dictamen-activos-fijos-2026-11-18.md ; localidades: /home/aparada/proyectos/arrancar/docs/modulos/plan-hallazgos-contables.md (H5)

**Pendiente de verificar en el texto oficial antes de programar:** los arts. 84-95 de la LAT, el art. 7 de la Ley del IVA (si hay alguna exención), los arts. 1125, 1886 y 1901 del Código Civil, el art. 46 de la Ley Forestal y la fecha exacta en que rige el IUSI del Decreto 18-2026.

**Veredicto sobre el planteamiento del encargo: correcto con ajustes.** Separar la parcela de la finca registral (N:M), sacar lo fiscal a los módulos generales, partir el uso en cultivo anual y permanente, guardar la superficie en m² con la cuerda configurable, y no calcular el IUSI en v1.
