# Dictamen del contador, 2026-11-18: cruces contra el dólar (Adenda B)

_Agente `contador-guatemala`, sobre la Adenda B de `diseno-multimoneda.md` («Adenda B (2026-11-18): resultado de C-1 a
C-4»). Guardado tal cual; los ajustes que pide (sección 4) ya están aplicados en la adenda (B.3, B.5, B.6, B.9, B.13 y
B.14), y la fe de erratas del dictamen anterior está al inicio de `dictamen-multimoneda-monedas-del-banguat-2026-11-18.md`._

# Dictamen del contador sobre la Adenda B de multimoneda (Banguat, 2026-11-18)

**Veredicto: correcto con ajustes.**

- **La fórmula de B.3 es correcta.** Pasar a quetzales una moneda distinta del USD cruzándola con la referencia del USD del mismo día no es una aproximación nuestra: es la metodología oficial de la Junta Monetaria (JM-126-2006, numeral 2). En el dictamen anterior escribí que esa frase «era de México». **Me equivoqué y hay que corregirlo.**
- **El promedio de B.5 se puede defender como política contable**, pero ninguna norma lo dice.
- **Quedan 2 comprobaciones pendientes**, ninguna bloquea MM-1b ni MM-3a″:
  - C-5: si el Banguat muestra al público un valor en quetzales para las demás monedas.
  - Un DTE real en EUR comparado con lo que la SAT precarga.

Archivo revisado: `/home/aparada/proyectos/arrancar/.claude/worktrees/wf_f89d7805-ca7-1/docs/modulos/diseno-multimoneda.md`, líneas 1182 a 1638.

---

## 1. Lo que dice la norma (fuentes primarias leídas)

| Fuente | Texto | Qué decide |
|---|---|---|
| **Decreto 94-2000, Ley de Libre Negociación de Divisas, art. 4** (citado en el considerando de JM-130-2001) | Las obligaciones tributarias y los pagos con el Estado se liquidan con «el tipo de cambio de referencia del Quetzal con respecto al Dólar» que el Banguat calcula y publica cada día. La metodología de ese tipo «así como la de los tipos de cambio de referencia respecto a otras monedas extranjeras» la aprueba la Junta Monetaria. | En lo tributario manda el USD. Las demás monedas tienen una referencia propia, que fija la Junta Monetaria. |
| **JM-126-2006 (25-10-2006), reformada por JM-55-2010, numeral 2** (PDF del Banguat «Tipo de Cambio de Referencia», actualizado el 27-03-2018) | «el tipo de cambio se determinará por la equivalencia de la moneda extranjera de que se trate con relación al dólar de los Estados Unidos de América, al cual se aplicará el Tipo de Cambio de Referencia del quetzal respecto al dólar… para establecer la equivalencia de dicha moneda con respecto al quetzal; … cotizaciones internacionales obtenidas por el Banco de Guatemala, entre las 8:00 y las 9:00 horas. Las equivalencias así establecidas tendrán vigencia durante el día de que se trate, debiéndose citar la fuente de dichas cotizaciones.» | **Es exactamente la fórmula de B.3**: cruce × USD, o USD ÷ cruce. Rige solo ese día. |
| **JM-126-2006, numeral 1** | El USD es un solo promedio ponderado de compras y ventas. Se publica el día hábil bancario siguiente al cálculo y «regirá a partir del día de su publicación». | La referencia del USD es un solo valor, sin compra ni venta. |
| **JM-126-2006, numeral 4** | Donde las resoluciones de la Junta Monetaria hablen de referencia «de compra» y «de venta» del USD, se entiende la referencia única. | Deroga en la práctica el «compra o venta según corresponda» de JM-130-2001. |
| **JM-130-2001, numeral 2** (la versión anterior) | «…al cual se aplicará el Tipo de Cambio de Referencia de compra o de venta, según corresponda…» | Antecedente: desde 2001 el método para las demás monedas es cruzarlas con el dólar. |
| Banguat, página «Tipos de cambio de referencia» | Para las demás monedas, la cotización internacional se multiplica por la referencia quetzal/USD. Se toma entre 8:00 y 9:00 y rige el día al que se refiere. Lista de monedas prioritarias. | Confirma lo anterior. **No dice si se publican compra y venta en quetzales.** |
| Banguat, condiciones del servicio web | El servicio web «no constituye un servicio oficial de información». Lo oficial es la página del Banguat. | Hay que guardar lo publicado y la fuente: B.3 opción A. |
| **Código de Comercio, art. 369** («Idioma español y moneda nacional») | La contabilidad se lleva en moneda nacional. | GTQ es la moneda de los libros. **Corrijo mi dictamen anterior:** ahí cité el art. 368. Es el 369; el 368 trata de la partida doble y los principios contables. |
| JM-136-2001 (manuales contables de la Superintendencia de Bancos) | A fin de mes, los saldos se ajustan «al tipo de cambio comprador de referencia». | Solo aplica a entidades supervisadas por la Superintendencia de Bancos. No obliga a una finca ni a un exportador. |
| NIIF para PYMES, 30.8 y 30.9 | Se usa la tasa de contado de la fecha de la transacción. Se admiten aproximaciones, como una tasa promedio. | Usar el valor medio es aceptable en NIIF. Esto es buena práctica, no ley tributaria. |

**Sobre las preguntas concretas:**

- **¿El Banguat publica un tipo en quetzales para el EUR?**
  - La norma dice que existe una «equivalencia respecto al quetzal» y que se divulga en el sitio del Banguat.
  - Lo que devuelve el servicio web, según C-1 a C-4, es el cruce contra el dólar, no quetzales.
  - La consulta pública (`banguat.gob.gt/tipo_cambio/`) arma la tabla con JavaScript y no la pude leer. No confirmo si muestra quetzales. Por eso queda **pendiente (C-5)**.
- **¿Cómo convierte la SAT un DTE en EUR?** Según su página de preguntas frecuentes (certeza media; la página da error 403 y el texto viene del buscador): «con el tipo de cambio de referencia del Banco de Guatemala, vigente en la fecha de emisión». Con JM-126-2006, esa referencia del EUR es el cruce × el USD del día. **Qué valor usa exactamente la precarga de Declaraguate (compra, venta o medio) no está documentado: pendiente.**

---

## 2. Dictamen punto por punto

| Punto | Dictamen | Por qué / cómo |
|---|---|---|
| **B.3 Fórmula** (cruce × USD si viene en dólares por unidad; USD ÷ cruce si viene en unidades por dólar) | **Correcto** | Es la metodología oficial (JM-126-2006, numeral 2). Revisé los ejemplos: GBP 1.31645 × 7.64489 = 10.06411544; CHF 9.0724; MXN 0.41169; CRC 0.017106; COP 0.0023083. Agregar a B.3 la cita de JM-126-2006, numeral 2, como base legal, no solo la página web. |
| B.3: usar el USD **del Banguat** de la misma fecha, no el «vigente» corregido a mano | **Correcto** | Es la referencia que la norma manda aplicar y deja el cálculo reproducible. |
| B.3: sin USD de esa fecha la fila no se guarda (`sin_dolar_del_dia`) | **Correcto** | La norma no deja usar el USD de otro día para calcular el cruce de hoy. |
| B.3 opción A: guardar lo publicado (compra, venta, convención y el USD usado) | **Correcto** | El servicio web no es fuente oficial y la norma pide «citar la fuente». Guardar el dato original da rastro de auditoría y permite recalcular si la SAT aclara otro criterio. |
| **B.5 Promedio de compra y venta** | **Correcto con ajuste** | Ninguna norma dice qué hacer con compra ≠ venta en el cruce. JM-126-2006 dejó una sola referencia para el USD, así que un solo valor medio sigue ese espíritu. El valor medio es la referencia usual del mercado y cabe en NIIF para PYMES 30.8 y 30.9. El argumento de B.5 es correcto: «venta» va en sentido contrario según la convención, así que escoger compra o venta mete un sesgo distinto en cada moneda. **Ajuste 1:** decirlo como **política contable de la instalación**, no como norma, y mostrarlo en el reporte («Q por unidad = promedio del cruce publicado × referencia USD»). **Ajuste 2, falta en la adenda:** definir que el promedio se saca **del cruce publicado** y después se convierte, como hace B.3. En las monedas de unidades por dólar, USD ÷ promedio no es igual al promedio de USD ÷ compra y USD ÷ venta. La diferencia es mínima (con el CRC, unos Q2 por cada Q100,000), pero debe quedar fija y probada. |
| B.5: límite de 3 % y `venta < compra` → dato inválido | **Correcto** (es opinión, no ley) | El mayor diferencial visto fue 0.96 %. Ojo con lo que pesa medio diferencial: CRC 0.48 %, DOP 0.36 %, HNL 0.25 %. En Q100,000 en colones, escoger promedio en vez de venta mueve unos Q480. Para esas monedas importa confirmar lo que hace la SAT (pendiente). |
| **V-16: asueto guatemalteco = cruce del día × USD repetido** | **Correcto** | En un asueto no se calcula USD nuevo y sigue vigente el último publicado (JM-126-2006, numeral 1). Es el que el Banguat aplica ese día. |
| B.9: días de publicación de lunes a viernes, sin descontar asuetos | **Correcto** | Coincide con la muestra B.2 y con «vigencia durante el día de que se trate». |
| Fin de semana: se usa el último publicado (D-4), sin armar un EUR de sábado con el USD del sábado | **Correcto** | El sábado no existe referencia del EUR. No hay que fabricarla: usar la del viernes con la regla de D-4. Conviene dejar escrito en B.9 que **no** se sintetiza. |
| Vuelta de las 09:30 para las demás monedas | **Correcto** | El cruce se toma entre 8:00 y 9:00 (JM-126-2006). |
| **V-15: precisión de 8 decimales** (COP hasta Q0.22 por cada Q100,000; ARS cerca de Q0.10) | **Correcto: se acepta en v1** | La diferencia es menor que el redondeo de un DTE a centavos por línea, y además se guarda el dato original. No hace falta bloquear COP ni ARS. |
| B.6: rechazo por variación de más de 25 % | **Correcto con nota** | Una devaluación real grande (como la del ARS de diciembre de 2023, de más de 50 %) quedaría rechazada. El panel debe decir que la salida es el ingreso manual con motivo (§4.4). |
| B.6: regla de «inversión probable» (`convencion_dudosa`) | **Correcto** | Es un control técnico sensato y no tiene efecto fiscal propio. |
| B.4: convención fijada por migración y `revoke update` (P-B7) | **Correcto** | Es un control interno: una convención mal puesta cambia el tipo de toda una serie. |
| B.8: exclusiones (1, 4, 6, 8, 11 a 14, 17, 22, 26 a 28, 37, 41), euro = 24 y PLN | **Correcto** | El 28 es la Unidad de Cuenta del BID, no una moneda. Las monedas europeas retiradas no sirven para facturar. |
| B.8: `CodigoDelDolarNecesario` | **Correcto** | Sin el USD no hay referencia de ninguna otra moneda (JM-126-2006). |
| B.10: auditoría y permisos | **Correcto** | `core.tipos_de_cambio` solo se agrega y nunca se borra: basta como rastro. |
| B.11: integrar MM-3b con la carga apagada | **Correcto** (no es tema fiscal) | Mientras la carga siga apagada no se genera ningún tipo incorrecto. |
| **Mi dictamen anterior** (`/home/aparada/proyectos/arrancar/.claude/worktrees/wf_f89d7805-ca7-1/docs/modulos/dictamen-multimoneda-monedas-del-banguat-2026-11-18.md`) | **Corregir** | (1) La línea 46 dice que la frase de la «equivalencia con el dólar» «es de México». **Es falso**: es JM-126-2006, numeral 2, y JM-130-2001, numeral 2, de Guatemala. Hay que quitar esa nota y citar las dos resoluciones. (2) La línea 27 supone que el Banguat publica las demás monedas en quetzales por unidad; C-1 a C-4 lo desmintieron. (3) La línea 44 cita el art. 368: debe ser el **art. 369** del Código de Comercio. Que lo anote el coordinador o el arquitecto como fe de erratas; yo no edito archivos. |

---

## 3. Lo que queda pendiente (no bloquea MM-1b ni MM-3a″; sí conviene antes de encender la carga en MM-3d)

| # | Qué | Cómo |
|---|---|---|
| C-5 | Saber si la consulta pública del Banguat (`banguat.gob.gt/tipo_cambio/`, selector de moneda) muestra un valor **en quetzales** para el EUR y otras monedas, y cuál: compra, venta o medio. | Abrirla en un navegador (Playwright o a mano) en 3 a 5 fechas y compararla con la fórmula de B.3. Si el Banguat muestra quetzales, Arrancar debe reproducir **ese** valor y el promedio se ajusta. |
| C-6 | Saber qué tipo usa la precarga de Declaraguate o del libro de compras para un DTE en EUR o CRC. | Un DTE real de un cliente, o una consulta a la SAT por el art. 102 del Código Tributario (D-7 del dictamen anterior). |

---

## 4. Ajustes que pido a la adenda (para el `arquitecto-de-datos`)

1. En B.3: citar **JM-126-2006, numeral 2** (reformada por JM-55-2010) como base legal de la fórmula y de la vigencia diaria.
2. En B.5: definir que el promedio se saca **del cruce publicado** y después se convierte, con una prueba que lo distinga del promedio de dos valores ya convertidos. Llamarlo «política contable», no «referencia del Banguat».
3. En B.9: escribir que **no** se arma la referencia de un sábado o domingo; se usa la del último día publicado (D-4).
4. En B.6: el aviso de `variacion_excesiva` debe indicar el camino del ingreso manual con motivo.
5. En B.13: marcar V-14, V-15 y V-16 como resueltos según este dictamen (V-14 con la condición de C-5) y agregar C-5 y C-6 a MM-3d.
6. Fe de erratas del dictamen anterior (punto final de la tabla 2).

## 5. Preguntas para el usuario

| # | Pregunta | Recomendación |
|---|---|---|
| P-B2 (confirmada) | ¿Usamos el **promedio** de compra y venta del cruce como política contable, mientras no se compruebe que el Banguat publica otra cosa en quetzales? | **Sí.** Es lo más neutral; ninguna norma obliga a compra ni a venta. |
| Q-1 | ¿Algún cliente factura o compra hoy en colones, pesos dominicanos o lempiras (las monedas con más diferencia entre compra y venta)? | Si los hay, hacer C-6 (un DTE real o una consulta a la SAT) antes de encender la carga de esas monedas. |
| Q-2 | ¿Presentamos una consulta formal a la SAT (art. 102 del Código Tributario) sobre el tipo para DTE en monedas distintas del USD? | Solo si hay un cliente con volumen relevante en esas monedas. Si no, basta con C-5 y C-6. |

## Fuentes

- Banguat, «Tipo de Cambio de Referencia» (JM-126-2006 y JM-55-2010, numerales 1, 2 y 4): https://www.banguat.gob.gt/tipo_cambio/cambio/cambio.pdf
- Resolución JM-130-2001 (metodología original; considerando sobre el art. 4 del Decreto 94-2000): https://banguat.gob.gt/sites/default/files/banguat/leyes/divisas/jm1302001.pdf
- Resolución JM-136-2001 (tipo comprador para los ajustes de las entidades supervisadas): https://banguat.gob.gt/sites/default/files/banguat/leyes/divisas/jm1362001.pdf
- Banguat, «Tipos de cambio de referencia» (metodología, horario 8:00 a 9:00, vigencia del día, monedas prioritarias): https://banguat.gob.gt/page/tipos-de-cambio-de-referencia
- Banguat, condiciones del servicio web («no constituye un servicio oficial»): https://www.banguat.gob.gt/tipo_cambio/TipoCambio/OtrosServicios
- Banguat, «Tipo de cambio e información cambiaria» (cita del arquitecto; la página no trae la metodología): https://banguat.gob.gt/index.php/page/tipo-de-cambio-e-informacion-cambiaria
- Decreto 94-2000, art. 4: https://banguat.gob.gt/sites/default/files/banguat/leyes/2021/ley_negociacion_de_divisas.pdf
- Código de Comercio (Decreto 2-70), arts. 368 y 369 (copia de ICNL; conviene verificar la versión vigente): https://www.icnl.org/wp-content/uploads/codcomercio.pdf
- SAT, preguntas frecuentes (conversión de un DTE en moneda extranjera; error 403, certeza media): https://portal.sat.gob.gt/portal/preguntas-frecuentes/declaraguate/
- Mi dictamen anterior, que hay que corregir: `/home/aparada/proyectos/arrancar/.claude/worktrees/wf_f89d7805-ca7-1/docs/modulos/dictamen-multimoneda-monedas-del-banguat-2026-11-18.md`
