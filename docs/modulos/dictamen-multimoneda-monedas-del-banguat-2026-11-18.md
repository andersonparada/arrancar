# Dictamen del contador, 2026-11-18: monedas del Banguat

_Agente `contador-guatemala`, a pedido del usuario (cambia PU-4 de `diseno-multimoneda.md`). Guardado tal cual; la
adenda del diseño que lo aplica está al final de `diseno-multimoneda.md` («Adenda 2026-11-18: todas las monedas del
Banguat»)._

# Dictamen: tipos de cambio de todas las monedas que publica el Banguat (cambia PU-4)

**Veredicto: correcto con ajustes.** Se pueden cargar todas las monedas del Banguat. Pero «todas las que tengan código se actualizan cada noche» no se puede aplicar tal cual. Hay 6 ajustes (sección 5) y 5 cosas que hay que comprobar con una llamada real antes de MM-3 (amplían V-13).

Advertencia: el servicio web del Banguat me cortó la conexión en todas las llamadas por GET. No pude ver una respuesta real para una moneda distinta del USD. Lo que digo sobre unidades, códigos y días sin publicación está marcado con su certeza.

---

## 1. Qué publica el Banguat para monedas distintas del USD

| Dato | Lo que encontré | Fuente | Certeza |
|---|---|---|---|
| Operaciones con la moneda como parámetro | `TipoCambioRangoMoneda(fechainit, fechafin, moneda:int)` y `TipoCambioFechaInicialMoneda(fechainit, moneda:int)`. Las dos devuelven `Vars/Var{moneda, fecha, venta, compra}` y `TotalItems`. `Variables(variable:int)` y `VariablesDisponibles()` devuelven `Variables/Variable{moneda:int, descripcion}`. `TipoCambioDia` devuelve `CambioDolar/VarDolar{fecha, referencia}` y además `CambioDia/Var{moneda, fecha, venta, compra}`. | WSDL: https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx?WSDL | Alta |
| Campo `referencia` | Solo existe en `VarDolar`, es decir, para el USD. Las demás monedas traen solo `compra` y `venta`. | WSDL | Alta |
| Tipo de dato | `venta`, `compra` y `referencia` se declaran `float` (xs:float, precisión simple, unas 7 cifras). | WSDL | Alta |
| Cómo se calculan | Entre las 8:00 y las 9:00 el Banguat toma de un servicio internacional la cotización de cada moneda y la multiplica por la referencia quetzal/USD. El resultado son tipos **de referencia**: cruzados contra el USD y expresados en quetzales. | https://banguat.gob.gt/page/tipos-de-cambio-de-referencia | Alta |
| Vigencia | Las demás monedas rigen **el mismo día** al que se refieren. El USD rige desde las 00:00 del día hábil siguiente al de su cálculo. | Misma página | Alta |
| Monedas «prioritarias» | Euro, libra esterlina, franco suizo, dólar canadiense, peso mexicano, yen, colón salvadoreño, lempira, córdoba y colón costarricense. Se pueden agregar otras si hay cotización internacional. | Misma página | Alta |
| Lista que ofrece la consulta pública | 29 opciones, entre ellas Bolívar Venezolano, Bolívar Fuerte y Bolívar Soberano (monedas ya retiradas o redenominadas), DEG (no es una moneda: es una unidad de cuenta del FMI), coronas danesa, noruega y sueca, peso argentino, real, won, dólar de Hong Kong, dólar de Taiwán, yuan, rupias de Pakistán y de la India, pesos colombiano y dominicano, ringgit. | https://www.banguat.gob.gt/tipo_cambio/TipoCambio/ | Alta |
| Códigos | La Resolución de Gerencia General 158-2023 da códigos con su sigla ISO: 01 GTQ, 02 USD, 03 JPY, 05 CHF, 07 CAD, 09 GBP, 15 SEK, 16 CRC, 18 MXN, 19 HNL, 20 DKK, 21 NIO, 22 VED, 27 AUD, 28 EUR. **Es la tabla del sistema de pagos.** El orden de la lista de la consulta pública no coincide con ella, así que no garantizo que sean los mismos códigos del servicio web. | https://banguat.gob.gt/sites/default/files/banguat/Publica/SPagos/codmonedas.pdf | Alta en la tabla, **baja** en que sirva para el servicio web |
| Unidad de `compra` y `venta` en las demás monedas | Por cómo se calculan deberían ser **quetzales por una unidad** (con el euro, alrededor de 8.8). La descripción del servicio dice «en dólares» en `TipoCambioFechaInicial`, lo que es ambiguo. | Inferencia propia | **Baja: comprobar** |
| ¿Compra y venta distintas? | No está documentado para las demás monedas. | — | Baja |
| Fines de semana y feriados | No está documentado. Como dependen de una cotización tomada entre las 8:00 y las 9:00, lo más probable es que **no haya publicación** los días sin cálculo. En ese caso la serie tendría huecos, a diferencia del USD, que parece repetir el vigente. | Inferencia propia | Baja: comprobar |
| Oficialidad | El servicio web «no constituye un servicio oficial de información». La fuente oficial es la página del Banguat. | https://www.banguat.gob.gt/tipo_cambio/TipoCambio/OtrosServicios | Alta |

---

## 2. Qué tipo es legalmente válido para documentos en otras monedas

| Punto | Qué dice la ley | Qué es práctica u opinión | Certeza |
|---|---|---|---|
| Norma | **Decreto 94-2000, art. 4**, párrafo 1: para liquidar obligaciones tributarias y otros pagos con el Estado «se aplicará el tipo de cambio de referencia del Quetzal con respecto al Dólar» que el Banguat calcula y publica cada día. Párrafo 2: las metodologías de la referencia del USD «así como la de los tipos de cambio de referencia respecto a otras monedas extranjeras» las aprueba la Junta Monetaria. | — | Alta (PDF oficial leído) |
| Consecuencia | La ley solo nombra expresamente el USD para lo tributario. Pero reconoce como oficiales los tipos de referencia de las otras monedas, que el Banguat calcula a partir de la referencia del USD. | Por eso convertir a USD y luego a quetzales con la referencia es, en sustancia, lo mismo que usar el tipo del Banguat para esa moneda. La diferencia está en la cotización cruzada: la del Banguat es la oficial y verificable. | Media |
| Regla de la SAT para el DTE | «Cuando el DTE se emite en moneda extranjera, su conversión a quetzales se realiza considerando el tipo de cambio de referencia del Banco de Guatemala, vigente en la fecha de emisión». Habla de moneda extranjera en general, no solo del USD. | Lectura recomendada: un DTE en EUR usa la referencia del Banguat **para el EUR** del día de emisión. | Media (página de la SAT con error 403; el texto viene del buscador y ya estaba en el dictamen del 18-nov) |
| Qué tipo usa la precarga de Declaraguate para un DTE en EUR | **No lo encontré documentado.** | Comprobarlo con un DTE real en EUR y su libro precargado, o con una consulta a la SAT (Código Tributario, art. 102). | — |
| Retención de IVA (constancias) | La SAT usa el último tipo publicado, tomando como base la **fecha de certificación** de la factura. | Para otras monedas lo más probable es que sea igual, pero sin confirmar. | Media / baja |
| ISR a no domiciliados pagado en EUR | La referencia de la fecha del pago o del acreditamiento (art. 4). | Para EUR: la referencia del EUR de esa fecha. | Media |
| Libros | Código de Comercio, art. 368: cuentas en moneda nacional. Sin cambio: GTQ como moneda de libros. | — | Alta |

**Corrección a una fuente que circula.** El buscador me atribuyó a la ley de Guatemala la frase «el tipo de cambio se determinará por la equivalencia de la moneda extranjera… con relación al dólar». **Es de México** (las tablas de equivalencias del Banco de México). No hay que citarla ni ponerla en el diseño.

---

## 3. ¿PU-5 («referencia del Banguat de la fecha de emisión, fija») vale para las demás monedas?

Sí en el principio: el tipo de la moneda del documento, el de la fecha de emisión, fijo y guardado en el documento. Pero necesita tres reglas más:

| Tema | Problema | Regla que propongo |
|---|---|---|
| Qué valor es «la referencia» | Las demás monedas no traen `referencia`, solo `compra` y `venta`. | Si `compra = venta`, ese valor es la referencia. Si son distintas, **no cargar automático** hasta decidirlo (yo usaría el promedio solo si el Banguat lo define así). Es parte de la comprobación de V-13. |
| Vigencia distinta | El EUR del día D se calcula entre las 8:00 y las 9:00 de D. Un documento en EUR registrado a las 7:00 no tiene tipo exacto. | Antes de que se publique, el tipo de hoy queda **pendiente**: se usa el anterior, con aviso, como en §4.1. No inventar el valor con la cotización cruzada del día anterior. |
| Días sin publicación | Si no hay tipo de EUR los fines de semana y feriados, la regla de 7 días da aviso en cada factura del lunes temprano o del fin de semana. | Para monedas sin publicación ese día (comprobado que el Banguat no publica), se usa el del último día con publicación. Si la causa es que el día no tuvo cálculo, sin pedir confirmación; con aviso y confirmación solo si falta una publicación que sí debía existir. Esto se decide (D-4). |

---

## 4. Riesgos de actualizar «todas cada noche»

| Riesgo | Por qué | Gravedad |
|---|---|---|
| Monedas muertas o que no son monedas | VEB, VEF, el Bolívar Soberano actual y el DEG no sirven para facturar. Si se cargan, la tarea queda en «sin datos» para siempre. | Alta |
| Reintentos sin fin | §4.3 reintenta «si falta el tipo de hoy de alguna moneda activa». Con monedas que no publican a diario, la tarea reintenta todos los días hasta las 20:00 y llena la bitácora. | Alta |
| «Cada noche» no alcanza | El USD de mañana se publica hoy, así que se puede pedir de noche. El EUR de hoy recién existe después de las 9:00. Con una sola vuelta nocturna, todo lo registrado en la mañana en EUR sale con el tipo de ayer y aviso. | Media |
| Monedas con cero decimales | JPY, KRW y la mayoría de las monedas ISO de cero decimales chocan con `monedas_activa_con_dos_decimales`: no se pueden activar en v1 aunque tengan código. | Media (es una restricción del diseño, no de la ley) |
| Precisión | Un tipo de 5 decimales para el yen (alrededor de 0.05 Q por yen) deja solo 3 cifras significativas: en ¥1,000,000 el error puede llegar a unos Q 10. Además el servicio usa `xs:float`. | Media |
| Banda de cordura | La banda de 5 a 15 solo sirve para el USD. Las demás no tienen. | Media |
| Notación científica | Un `float` muy pequeño puede venir como `5.1E-05` y la expresión regular de §4.3 lo rechaza. | Baja |
| Código mal asignado | `VariablesDisponibles` no trae la sigla ISO, así que unir «Euro» con EUR es a mano. Si se cambia el código de una moneda que ya tiene tipos cargados, se mezclan dos series distintas. | Media |
| Carga al servicio | Una llamada por moneda y por día, más el relleno de 45 días por moneda al arrancar. El servicio corta conexiones (me pasó a mí). | Media |

---

## 5. Ajustes recomendados al diseño (para `arquitecto-de-datos` y `programador-backend`)

| # | Ajuste |
|---|---|
| A-1 | El selector de la ventana de Monedas se llena con `VariablesDisponibles`: muestra la descripción y el código del Banguat. El código se guarda en `codigo_banguat`, que sigue siendo único. **No** sembrar códigos copiados de la tabla 158-2023 sin comprobarlos con `VariablesDisponibles`. |
| A-2 | `codigo_banguat` no se puede cambiar si la moneda ya tiene filas `banguat` en `core.tipos_de_cambio`. Solo se puede quitar (deja de cargarse) o corregir antes de la primera carga. |
| A-3 | La carga automática pide **solo las monedas activas con código**, no todas las que tengan código. Activar es una decisión de soporte. Así se respeta la regla de §6.1 (dos decimales en v1). |
| A-4 | Reintentos solo para el USD, que debe publicarse todos los días. Para las demás, una vuelta después de las 9:30 y otra de noche. Si no publicaron, la bitácora lo anota y no se reintenta más ese día. Un aviso en el panel de soporte cuando una moneda activa lleva más de N días hábiles sin publicar. |
| A-5 | Validación por moneda: banda del USD como está. Para las demás, aviso si cambia más de 3 % contra el día anterior y, si se quiere, comparar con el cruce implícito (su valor dividido por la referencia del USD) contra el día anterior. Aceptar notación científica, o leer el texto tal cual sin pasarlo por un número de coma flotante. |
| A-6 | Toda fila de una moneda distinta del USD guarda `referencia` según la regla de la sección 3 (`compra = venta`). Si vienen distintas, la consulta queda como `valor_ambiguo` y no se guarda hasta decidir (D-3). |

**Comprobaciones antes de MM-3 (amplían V-13), con llamadas reales:**

1. `VariablesDisponibles`: lista completa de códigos y descripciones.
2. `TipoCambioRangoMoneda` del EUR y del JPY para una semana con fin de semana y un asueto: unidad (quetzales por unidad o unidades por USD), si `compra = venta`, cuántos decimales y si hay huecos.
3. Si existe alguna moneda publicada por cada 100 unidades.
4. A qué hora de la noche `TipoCambioDia` ya da el USD de mañana.
5. Un DTE de prueba en EUR y lo que la SAT trae precargado en el libro de ventas.

---

## 6. Decisiones para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| D-1 | ¿Se actualizan todas las monedas con código o solo las **activas** con código? | (a) Solo las activas con código; (b) todas las que tengan código | **(a)**: evita cargar monedas que nadie usa y respeta la regla de los dos decimales |
| D-2 | ¿Qué monedas entran en el selector? | (a) Todas las de `VariablesDisponibles`; (b) todas menos DEG, bolívares viejos y colón salvadoreño; (c) solo las 10 «prioritarias» más USD | **(b)**: el colón salvadoreño está fijo en 8.75 por USD desde 2001 y nadie factura en él |
| D-3 | Si para una moneda `compra ≠ venta`, ¿cuál es la referencia? | (a) No cargar automático, solo manual; (b) promedio; (c) venta | **(a)** hasta comprobarlo: no hay norma que lo diga |
| D-4 | Una factura en EUR de un día sin publicación (fin de semana o antes de las 9:00) | (a) La regla de §4.1 (aviso y confirmación siempre); (b) último publicado, sin confirmar, si el día no tuvo cálculo; aviso solo si faltó una publicación esperada | **(b)**: menos fricción, mismo resultado fiscal. Opinión, no ley |
| D-5 | Horario: «cada noche» | (a) Solo de noche; (b) 06:00 para el USD, 09:30 para las demás y una vuelta de noche que adelanta el USD de mañana | **(b)**: con solo la vuelta de noche, todo lo registrado en la mañana en otra moneda sale con aviso |
| D-6 | ¿Monedas de cero decimales (JPY, KRW) en v1? | (a) No: tienen código pero no se activan; (b) sí, cambiando el dinero a otro formato | **(a)** |
| D-7 | ¿Consultamos a la SAT el tratamiento de los DTE en EUR y otras monedas (art. 102 del Código Tributario)? | Sí / no | **Sí**, si un cliente real va a facturar en EUR. Mientras tanto vale la lectura de la sección 2 (certeza media) |

---

## Fuentes

- Decreto 94-2000, Ley de Libre Negociación de Divisas, arts. 1, 4 y 6 (este último reforma el art. 8 de la Ley Monetaria anterior, el Decreto 203, ya derogado por el Decreto 17-2002): https://banguat.gob.gt/sites/default/files/banguat/leyes/2021/ley_negociacion_de_divisas.pdf
- Banguat, metodología y vigencia de los tipos de referencia (USD y otras monedas): https://banguat.gob.gt/page/tipos-de-cambio-de-referencia
- Banguat, consulta de tipo de cambio (lista de monedas): https://www.banguat.gob.gt/tipo_cambio/TipoCambio/
- Banguat, WSDL del servicio web: https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx?WSDL
- Banguat, condiciones del servicio: https://www.banguat.gob.gt/tipo_cambio/TipoCambio/OtrosServicios
- Banguat, códigos de moneda, Resolución de Gerencia General 158-2023 (sistema de pagos): https://banguat.gob.gt/sites/default/files/banguat/Publica/SPagos/codmonedas.pdf
- SAT, preguntas frecuentes de Declaraguate y de contribuyentes especiales (error 403; texto tomado del buscador): https://portal.sat.gob.gt/portal/preguntas-frecuentes/declaraguate/ y https://portal.sat.gob.gt/portal/preguntas-frecuentes/contribuyentes-especiales/
- Odoo, módulo `l10n_gt_banguat_fx`, como referencia de práctica (solo carga el USD, a las 06:00): https://apps.odoo.com/apps/modules/19.0/l10n_gt_banguat_fx
- Documentos del proyecto: /home/aparada/proyectos/arrancar/docs/modulos/diseno-multimoneda.md (§4.1, §4.3, §6.1, PU-4, PU-5, V-13) y /home/aparada/proyectos/arrancar/docs/modulos/dictamen-multimoneda-2026-11-18.md (§2, §6).
