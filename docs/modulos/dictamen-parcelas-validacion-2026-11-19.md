# Validación de los puntos V-1 a V-7 de `docs/modulos/diseno-parcelas.md` (contador-guatemala, 2026-11-19)

Revisé el diseño en main (`/home/aparada/proyectos/arrancar/docs/modulos/diseno-parcelas.md`), su dictamen (`/home/aparada/proyectos/arrancar/docs/modulos/dictamen-parcelas-2026-11-18.md`) y el diseño de Activos fijos (`/home/aparada/proyectos/arrancar/docs/modulos/diseno-activos-fijos.md`). Parto de que el usuario aceptó las recomendaciones de PA-1 a PA-19.

**Renumeración:** la pregunta del inmueble que el diseño llama «AF-P22» (§4.2 y §19) pasa a ser **AF-P23**. AF-P22 ya existe y está respondida (b, nombres de localidades sin alcance, AF §6.13). El propio diseño de Activos fijos ya lo anota (líneas 1354-1356 y 1439). Hay que cambiar «AF-P22» por «AF-P23» en las dos menciones de Parcelas.

Fuentes: [Ley] = texto legal; [Sec] = fuente secundaria (doctrina, prensa, plantillas); [Op] = mi opinión profesional.

## 1. Dictamen por punto

| # | Dictamen | Resumen |
|---|---|---|
| V-1 | **Corregir** (menor) | Vara y manzana correctas. La caballería debe ser 64.5816 mz (645,816 varas²), no 64.58 |
| V-2 | **Corregir** | La idea parcela → inmueble ← activo es correcta. El modelo de valores no sirve para el tope que ya acordó Activos fijos (el mayor entre matrícula y catastro) y permite borrar un valor que ya se usó en meses cerrados |
| V-3 | **Correcto con ajustes** | Los dos incisos se confirman. Faltan tres cosas: comparar por fecha y no por meses enteros, el usufructo y el plazo indefinido o con prórroga |
| V-4 | **Correcto** | Separar `plantacion_forestal` está bien fundado. Hay que corregir las citas NIIF del diseño (§2, C-1) |
| V-5 | **Correcto con ajustes; texto literal pendiente** | Art. 46 = cambio de cobertura con licencia del INAB. El aviso también debe salir desde plantación forestal y conservación, y no citar el artículo al pie de la letra hasta tener el texto oficial |
| V-6 | **Corregir y pendiente** | «agricola» no es una categoría del Decreto 18-2026. La fecha de vigencia (≈ 26-nov-2026) falta confirmarla en el Diario de Centro América |
| V-7 | **Correcto con ajuste** | Que Parcelas no valúe la especie es correcto. Debe advertir que la renta en especie sí tiene efecto en IVA e ISR |

### V-1. Factores de superficie

| Factor | Diseño | Verificación | Dictamen |
|---|---|---|---|
| Metros por vara | 0.835905 | Vara² = 0.698737 m²; manzana = 6,987.37 m² (tabla del INE citada por guías y la Wikipedia, que también trae una vara de 0.8421 m, incoherente con su propia vara²) [Sec] | Correcto |
| Varas² por manzana | 10,000 | Coinciden todas las fuentes [Sec] | Correcto |
| Cuerdas | (varas por lado)² | 25 varas = 436.71 m²; 40 varas = 1,117.98 m² (tesis Menocal, en Wikipedia) [Sec]. Los ejemplos de §7 cuadran | Correcto |
| Manzanas por caballería | 64.58 | La tabla del INE da **64.5816 mz = 645,816 varas² ≈ 45.1256 ha**. La cifra «64 mz» es la histórica redondeada [Sec] | **Corregir**: por omisión, 64.5816. Mejor aún, declarar el factor como `varas_cuadradas_por_caballeria = 645816`, en la misma base que la manzana. El error de 64.58 es de unos 11 m² por caballería: poco, pero se vería contra las escrituras |

Ningún factor es ley tributaria: son equivalencias de uso. Dejarlos en configuración de instalación es correcto, porque cada medición guarda su cifra original.

### V-2. Parcela → inmueble ← activo; Activos fijos lee la matrícula del inmueble

**Está bien:**
- La parcela no lleva dinero.
- El costo del terreno vive en Activos fijos (NIIF para las Pymes, Sección 17).
- Un solo dato de matrícula evita dos cifras distintas.
- El IUSI se calcula sobre el terreno, las construcciones y los cultivos permanentes (Ley del IUSI, Decreto 15-98, art. 3). Separar las tres columnas es correcto.

**Está mal y hay que corregirlo:**

| Problema | Por qué | Corrección (para `arquitecto-de-datos`) |
|---|---|---|
| a) Una sola serie de valores por inmueble. El vigente es «el de mayor `vigente_desde`», con único `(inmueble_id, vigente_desde)` | El art. 26 de la LAT toma como base del inmueble la matrícula fiscal **o** el catastro municipal. Activos fijos ya acordó (A3/V-7, AF §3.5.1) que **el tope es el mayor de los dos**. Si una finca tiene avalúo de DICABI y catastro municipal, el modelo de Parcelas solo devuelve el más reciente y el tope sale mal | Agregar `fuente in ('matricula_fiscal','catastro_municipal')` aparte de `origen` (que dice cómo se obtuvo el valor). El único pasa a `(inmueble_id, fuente, vigente_desde)`, con un vigente por fuente. Activos fijos toma el mayor de los dos vigentes |
| b) §4.2 dice que el tope es `valor_construcciones` o el 70 % de `valor_total` | Coincide con el art. 26 (presunción del 70 % si no se separa el edificio). Pero falta lo que Activos fijos ya acordó: los costos marcados «no es edificación» van fuera del tope | Que §4.2 remita a AF §3.5.1 en lugar de reescribir la regla. Precisar: el 70 % se aplica al total **sin** los cultivos permanentes cuando estos vengan separados [Op: el art. 26 habla del inmueble edificado; incluir el cafetal en el 70 % infla el edificio] |
| c) «Un valor de matrícula se corrige eliminando la fila» | Si Activos fijos ya usó ese valor como tope en meses cerrados, borrarlo cambia la base de depreciaciones ya declaradas. Activos fijos acordó que el cambio de matrícula va **hacia adelante**, con tramo `cambio_de_matricula` y auditoría | Activos fijos copia el valor usado en su tramo (no lo vuelve a leer para meses cerrados). Empresas solo permite eliminar un valor que ningún activo haya usado en un mes cerrado; si no, se registra uno nuevo con otra fecha. Lo resuelve Activos fijos con un aviso del mediador de Empresas, sin llave a Activos fijos |

Con estos tres ajustes queda **correcto**. Llevarlo al diseño de Activos fijos como **AF-P23** y quitar las columnas `valor_de_matricula`, `valor_catastral` y `valores_del_inmueble_completo` de `activos_fijos.activos` (pasan a los valores del inmueble).

### V-3. Código Civil, art. 1125.6 y art. 1901.6

| Punto | Texto verificado | Dictamen |
|---|---|---|
| Art. 1125, inc. 6 | Se inscriben los arrendamientos «cuando sea por más de tres años o que se haya anticipado la renta por más de un año». Así lo citan el Código Civil Comentado del CENADOJ (por medio de una plantilla) y material universitario. No conseguí el PDF oficial (OEA devolvió 503) | Umbrales 36 y 12, y que sea aviso y no bloqueo: **correcto**. La sanción de no inscribir es que el contrato no se puede oponer a terceros, no la nulidad (relación con los arts. 1124 y 1885). Por eso un aviso basta |
| Art. 1901, inc. 6 | El arrendador paga «los impuestos fiscales y municipales que gravitan sobre la cosa», salvo pacto en contrario | `iusi_a_cargo_de = 'arrendador'` por omisión: **correcto** |
| Art. 1576 | Los contratos que deben inscribirse constan en escritura pública | Falta: avisar también cuando el contrato debe inscribirse y `documento` no es escritura pública |

**Ajustes:**
1. **«Más de tres años» se compara con fechas, no con meses enteros.** Un contrato del 1-ene-2026 al 1-ene-2029 dura tres años y un día: debe avisar, y «meses > 36» no lo detecta. Regla: `fecha_de_fin > fecha_de_inicio + 3 años`. Para el anticipo basta `meses_de_renta_anticipada > 12`.
2. **Plazo indefinido o con prórroga automática:** la ley habla del plazo pactado. Recomiendo un aviso suave («revise si debe inscribirse») cuando el contrato es indefinido, o cuando con la prórroga ya pasó de tres años [Op].
3. **Usufructo:** es un derecho real sobre un inmueble. Su título se inscribe siempre (art. 1125, inc. 1, títulos que constituyen derechos reales), sin importar el plazo. El aviso debe salir para todo usufructo no inscrito.
4. **Aparcería:** no encontré que el Código Civil la regule como contrato con nombre propio. Se rige por lo pactado. Recomiendo aplicarle los umbrales del arrendamiento como aviso [Op; **pendiente** de confirmar con un abogado].

### V-4. Usos `plantacion_forestal` y `cedida_a_terceros`

| Uso | Fundamento | Dictamen |
|---|---|---|
| `plantacion_forestal` aparte de `cultivo_permanente` | Los incentivos (PROBOSQUE, Decreto 2-2015; PINPEP, Decreto 51-2010) y el Registro Nacional Forestal del INAB tratan la plantación aparte. En la NIIF para las Pymes (Sección 34) la plantación para madera es un activo biológico que se corta, y el café o el aguacate producen año con año. En ISR, el art. 28 de la LAT da 15 % a las plantaciones que producen frutos o productos | **Correcto** |
| `cedida_a_terceros` | Es un dato operativo (que Ganadería y Cultivos no programen nada allí) y sirve para clasificar el terreno como propiedad de inversión si se arrienda (Sección 16) | **Correcto** como uso. Ojo: en **aparcería** otorgada la empresa recibe parte de la cosecha y puede estar participando en la actividad agrícola (Sección 34). La clasificación contable la decide Contabilidad, no este uso [Op] |

Los sistemas agroforestales (café con sombra, que PINPEP incentiva) caben con `detalle`; no hace falta otro valor.

### V-5. Ley Forestal (Decreto 101-96), art. 46

- Fuentes secundarias (tesis UPANA, reglamentos del INAB) confirman que el art. 46 regula el **cambio de cobertura**: la licencia del INAB y el pago por reforestación. El art. 48 regula el plan de manejo y el art. 43 dice que es ilícito eliminar el bosque sin licencia. Descargué el PDF oficial del INAB, pero no lo pude leer (está comprimido): **el texto literal sigue pendiente**.
- **Ajustes:**
  1. El aviso no debe citar el artículo al pie de la letra hasta verificarlo. Basta: «Cambiar el uso de una tierra con bosque requiere licencia del INAB (Ley Forestal, Decreto 101-96)».
  2. Que el aviso salga también al pasar de **`plantacion_forestal`** a otro uso. Las plantaciones registradas o con incentivo tienen compromisos con el INAB y pueden tener que devolver el incentivo.
  3. Que salga también al pasar de **`conservacion`** a otro uso.
  4. Es aviso con licencia opcional, nunca bloqueo: **correcto**.

### V-6. «Uso declarado» del inmueble según el Decreto 18-2026

- El Decreto 18-2026 reforma el art. 11 del Decreto 15-98. Define **dos grupos** (Consortium Legal; Prensa Libre):
  - Vivienda, uso residencial o uso mixto: 0 por millar.
  - Uso comercial y otros usos: tabla de 3, 6 y 9 por millar.
- **No existe la categoría «agrícola».** La finca rústica caería en «otros usos», aunque ninguna fuente lo dice expresamente.
- El decreto no crea una «declaración de uso» formal. La administración verifica la categoría, y la SAT, el MINFIN, DICABI y las municipalidades deben adaptar registros y formularios.
- **Corrección:**
  - Cambiar `uso_declarado` por `categoria_iusi in ('vivienda','residencial','mixto','comercial','otros')`, que es la clasificación del decreto.
  - El uso real (agrícola, ganadero, bodega) ya lo dicen las parcelas o puede ir en un texto descriptivo.
  - Como la categoría cambia la tasa y puede variar con el tiempo, recomiendo guardarla por fecha junto con cada valor de matrícula, o auditar su cambio [Op]. Si alguna vez se calcula el IUSI, hace falta saber qué categoría regía en cada trimestre.
- **Pendiente:** confirmar en el Diario de Centro América la fecha en que rige el IUSI reformado. El decreto se publicó el 28-ago-2026 con un plazo especial de 90 días; las fuentes secundarias dicen 26-nov-2026, a una semana de hoy. Los cambios de ISR y Timbres rigen desde el 1-ene-2027. Confirmar también si la municipalidad o DICABI publican una lista de categorías más fina en sus formularios.

### V-7. La renta en especie no genera montos en Parcelas

**Correcto** como diseño: valuar la cosecha es de Cultivos y Contabilidad. Sí hay que dejar claro, en la nota fija del contrato, que **fiscalmente la especie no es «sin monto»**:

- **Ley del IVA, art. 3:** el arrendamiento de inmuebles es hecho generador. El arrendador debe facturar por el valor de lo que recibe.
- **Contrato otorgado con renta en especie:** la empresa cobra en producto y debe emitir su FEL de arrendamiento valuada.
- **Contrato recibido con renta en especie:** la empresa entrega su producto, y esa entrega es una permuta, también hecho generador del IVA (art. 3, inc. 1). Lo resuelven Ventas o Cultivos, no Parcelas.
- **ISR:** la renta inmobiliaria se grava en dinero o en especie. El 30 % sin prueba y el 10 % de los arts. 88 y 92 de la LAT aplican sobre el valor.
- **Contable:** la renta en porcentaje de la cosecha es **renta contingente**. Se reconoce como gasto o ingreso cuando se conoce la cosecha y no se reparte en línea recta (NIIF para las Pymes, Sección 20). El evento debe decir `forma_de_renta` para que Contabilidad no la devengue como cuota fija; ya lo lleva.

## 2. Errores encontrados en el diseño y en las recomendaciones aceptadas

| # | Dónde | Error | Corrección |
|---|---|---|---|
| C-1 | §3.6 «(NIIF 16, propiedad de inversión)» | La NIIF 16 es la norma plena de arrendamientos. La propiedad de inversión es la NIC 40 o, en la NIIF para las Pymes, la **Sección 16** | Escribir «NIIF para las Pymes, Sección 16» |
| C-2 | §5.10 «(devengo lineal… NIIF 20)» | No hay «NIIF 20» que regule arrendamientos: es la **Sección 20** de la NIIF para las Pymes. La 3.ª edición (2025) no adoptó el modelo de la NIIF 16 | Escribir «Sección 20». La línea recta aplica a cuotas fijas, no a la renta en porcentaje (V-7) |
| C-3 | §5.1 `uso_declarado` | Ver V-6 | `categoria_iusi` con la lista del decreto |
| C-4 | §5.2 y §4.2 | Ver V-2 (una sola serie, borrar valores ya usados) | Ver V-2 |
| C-5 | §5.8 aviso de inscripción («meses entre inicio y fin > umbral») | Ver V-3.1. Falta el usufructo | Comparar con fechas; usufructo siempre |
| C-6 | §10.4 `manzanas_por_caballeria = 64.58` | Ver V-1 | 64.5816 o 645,816 varas² |
| C-7 | §8, mensaje de `rentas_vencidas_sin_documentar` («por Q x») | Con cuotas en dólares o en especie, la cifra en quetzales es falsa. También hay que avisar que una renta devengada sin FEL es pasivo contable pero **no es gasto deducible** (LAT, art. 21 y siguientes; requisito de documento) | Sumar por moneda y aparte la especie. Decir: «es deuda al corte; sin factura no es deducible» |
| C-8 | PA-8 a (no calcular el IUSI) | No es error; con la reforma a días de regir es lo prudente | Sin cambio |
| C-9 | PA-15 (auditoría permanente) | Fundamento correcto. Agregar el Código de Comercio, art. 382 (conservar libros y documentos 5 años), además del Código Tributario, arts. 47 y 112 | Ajustar el motivo |
| C-10 | IUSI a cargo del arrendatario por pacto | No es error del diseño. Para Libro de compras: el IUSI que paga el arrendatario es en el fondo parte de la renta (mayor renta del arrendador), no un impuesto propio del arrendatario [Op]. Que lo diga la nota del contrato | Solo un texto de ayuda |

El resto de lo aceptado (PA-1 c, PA-2 b, PA-3 b, PA-4 b, PA-9 a, PA-10 a, PA-13 a, PA-14 a, PA-17 b, PA-18 b) **no tiene error contable ni fiscal**. Que Parcelas no calcule impuestos ni cree deudas es lo correcto para un sistema que no presupone régimen.

## 3. Preguntas para el usuario

1. **V-2:** ¿Acepta que los valores del inmueble se lleven en dos series (matrícula fiscal y catastro municipal), y que un valor ya usado por Activos fijos en un mes cerrado no se pueda borrar, solo reemplazar hacia adelante? (Recomiendo sí.)
2. **V-6:** ¿La categoría del IUSI (vivienda, residencial, mixto, comercial, otros) se guarda por fecha, junto con cada valor de matrícula, o como un solo dato del inmueble con auditoría de cambios? (Recomiendo por fecha.)
3. **V-3.2:** ¿Avisar «revise si debe inscribirse» en los contratos indefinidos o con prórroga automática que ya pasaron de tres años? (Recomiendo sí, como aviso suave.)
4. **V-1:** ¿Se declara la caballería en varas cuadradas (645,816) en lugar de en manzanas? (Recomiendo sí.)

## 4. Pendientes antes de programar

- Texto oficial del art. 46 de la Ley Forestal (PDF del INAB; extraerlo con `pdftotext`, que no está instalado aquí).
- Fecha oficial en que rige el IUSI del Decreto 18-2026, según el Diario de Centro América.
- Texto oficial de los arts. 1125, 1576 y 1901 del Código Civil (CENADOJ), y si el Código regula la aparcería.

Nada de esto impide programar **PA-0** si se aplica V-2. PA-1 solo necesita V-1.

## Veredicto

**Correcto con ajustes:**
- V-2: dos series de valores y no borrar valores ya usados.
- V-6: categorías del decreto y vigencia por confirmar.
- V-3: comparar por fecha, usufructo, escritura pública.
- V-1: caballería 64.5816.
- V-5: aviso ampliado y sin cita literal.
- V-7: nota fiscal de la especie.
- C-1 y C-2: citas NIIF.
- AF-P22 → AF-P23.

V-4 está correcto tal cual.

## Fuentes
- [Código Civil, arts. 1125.6, 1880 y 1901.6 (cita del CENADOJ, por medio de una plantilla)](https://livinginguatemala.com/es/tramites/contrato-arrendamiento-terreno-agricola-formato/)
- [Código Civil Comentado, CENADOJ](http://ww2.oj.gob.gt/es/QueEsOJ/EstructuraOJ/UnidadesAdministrativas/CentroAnalisisDocumentacionJudicial/pdfs/Codigos/CodigoCivilComentado_CENADOJ.pdf)
- [Arrendamiento, material universitario (art. 1125, inc. 6)](https://recursosbiblio2.url.edu.gt/publicjlg/biblio_sin_paredes/fac_juri/2020/c2/derech_guatem/cap/arrend.pdf)
- [Código Civil (OEA, no disponible al consultar)](https://www.oas.org/dil/esp/codigo_civil_guatemala.pdf)
- [Ley Forestal, Decreto 101-96 (INAB)](https://www.inab.gob.gt/images/informacionpublica/2020/julio/Normativas/1.4.1%20Leyes/Ley%20Forestal%20DECRETO%20DEL%20CONGRESO%20101-96.pdf)
- [Tesis UPANA sobre el art. 46 y las licencias de cambio de uso](https://glifos.upana.edu.gt/library/images/8/82/TESIS_DE_GIOVANI_ALEXANDER_REQUENA_ALFARO.pdf)
- [Boletín del INAB sobre tala ilegal (art. 43)](https://www.inab.gob.gt/images/boletines/2025/septiembre/Boletín_tala_ilegal.pdf)
- [Consortium Legal, análisis del Decreto 18-2026](https://consortiumlegal.com/en/2026/09/03/guatemalas-iusi-reform-an-analysis-of-decree-18-2026/)
- [Emisoras Unidas, sanción del decreto](https://emisorasunidas.com/nacional/2026/08/28/presidente-arevalo-sanciona-reformas-ley-iusi/)
- [Living in Guatemala, reforma del IUSI 2026](https://livinginguatemala.com/es/tramites/iusi-reforma-2026-viviendas-exentas/)
- [Prensa Libre, uso mixto](https://www.prensalibre.com/?p=25778645)
- [Wikipedia, unidades de medida en Guatemala](https://en.wikipedia.org/wiki/Metrication_in_Guatemala)
- [Living in Guatemala, sistema de medidas (tabla del INE)](https://livinginguatemala.com/guides/guatemala-measurement-system/)
- Ley de Actualización Tributaria (Decreto 10-2012), arts. 21, 26, 28, 84, 88 y 92, citados en `/home/aparada/proyectos/arrancar/docs/modulos/dictamen-activos-fijos-2026-11-18.md` y `/home/aparada/proyectos/arrancar/docs/modulos/dictamen-parcelas-2026-11-18.md`
- [Vescco, arts. 26 y 28 de la LAT](https://vescco.tax/blog/depreciaciones-y-amortizaciones-para-efectos-fiscales-en-guatemala/)
- Ley del IVA (Decreto 27-92), art. 3; Ley del IUSI (Decreto 15-98), arts. 3 y 11; Código Tributario, arts. 47 y 112; Código de Comercio, art. 382: citados de memoria profesional, sin verificar en línea en esta sesión
- NIIF para las Pymes (IASB), Secciones 16, 17, 20 y 34: citadas de memoria profesional, sin verificar en línea en esta sesión
