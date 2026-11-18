# Dictamen: Multimoneda (contador-guatemala, 2026-11-18)

_Investigación del agente `contador-guatemala` del 2026-11-18, guardada tal cual (sin cambiar el texto) por el agente
`arquitecto-de-datos`. La usa `diseno-multimoneda.md`, que marca como «por validar» lo que aquí queda dudoso._

---

# Multimoneda: informe del contador (Guatemala, cualquier rubro y régimen)

**Alcance y certeza.** Busqué en fuentes primarias. Los PDF oficiales del Decreto 10-2012, del Decreto 19-2013, del Reglamento del IVA y de la JM-130-2001 no se pudieron extraer como texto (la herramienta no lee esos PDF), y el portal de la SAT respondió 403. Por eso la redacción exacta del art. 20 y del art. 21 num. 28 sale de fuentes secundarias que coinciden entre sí. Antes de cerrar el diseño, alguien debe cotejarla con el PDF oficial. Uso tres niveles de certeza: **Alta** (fuente primaria leída o varias fuentes concordantes), **Media** (secundaria fiable) y **Baja** (opinión o práctica).

---

## 1. Corrección importante a un acuerdo anterior

El dictamen C-10 (`/home/aparada/proyectos/arrancar/docs/modulos/dictamen-bancos-segunda-parte-2026-11-16.md` y `/home/aparada/proyectos/arrancar/docs/modulos/diseno-bancos-segunda-parte.md` §12 y línea 925) dice: «diferencial al cierre a resultados, **el no realizado sin efecto en ISR**». **Para el régimen sobre las utilidades eso es incorrecto.**

| Punto | Lo que dice la ley | Certeza |
|---|---|---|
| Ganancia no realizada | El art. 20 LAT, segundo párrafo, en su redacción reformada por el Decreto 19-2013, dice que es **renta bruta** la ganancia por compraventa de moneda extranjera **y** la que nace de «revaluaciones, reexpresiones o remediciones en moneda extranjera que se registren por simples partidas de contabilidad». No distingue el tipo de cuenta: entran también los saldos de bancos. **La ganancia no realizada sí paga ISR.** | Alta-media |
| Pérdida realizada | El art. 21 num. 28 permite deducir la pérdida por compraventa de divisas hecha con instituciones supervisadas por la Superintendencia de Bancos (SIB), en operaciones que generan rentas gravadas. | Media |
| Pérdida no realizada | La reforma de 2013 permite deducirla **solo** si viene de cuentas por cobrar o por pagar en moneda extranjera, y con estas condiciones: origen en rentas gravadas, que no se haya usado ya la deducción por compraventa, documentar el origen, remedir con el **tipo de cambio de referencia del Banco de Guatemala (Banguat)** y llevar un registro mensual de esos saldos. **La pérdida por revaluar saldos de bancos en USD no es deducible.** | Media |
| Litigio | La Cámara del Agro y la Cámara de Comercio impugnaron el art. 21 num. 28 y el art. 23 lit. o). La Corte de Constitucionalidad resolvió el expediente 293-2013 (4-ago-2015) «parcialmente con lugar». No pude ver qué frases cayeron. | Media |
| Régimen Opcional Simplificado | El Criterio Institucional SAT 11-2018 dice que el contribuyente obligado a contabilidad completa incluye cada mes en su renta bruta la ganancia cambiaria realizada y la remedición positiva al cierre del mes. Las pérdidas no se restan, porque ese régimen no deduce costos ni gastos. | Media |

**Cómo debe quedar.** Contablemente, todo diferencial va a resultados (NIIF para pymes 30.10). Fiscalmente, el efecto depende del régimen de ISR y del tipo de partida (cuadro 4). El sistema debe guardar el detalle por partida para la conciliación fiscal. Hay que corregir C-10 en los dos documentos.

---

## 2. Marco legal y técnico

| Norma | Qué dispone | Certeza |
|---|---|---|
| Código de Comercio, arts. 368 y 369 | Contabilidad por partida doble con principios de contabilidad aceptados. Libros en español y **cuentas en moneda nacional**. Las sucursales extranjeras pueden llevar un duplicado con columna de conversión. | Alta |
| Decreto 94-2000 (Ley de Libre Negociación de Divisas), art. 4 | Para liquidar obligaciones tributarias y pagos con el Estado se usa el **tipo de cambio de referencia** que el Banguat calcula y publica cada día. El decreto también reforma el art. 8 de la Ley Monetaria: se paga en quetzales salvo pacto en otra moneda. | Alta (texto citado por varias fuentes; PDF oficial no legible) |
| LAT, art. 20 (reformado por el Decreto 19-2013) | Las ganancias cambiarias, realizadas y por remedición, son renta bruta. | Alta-media |
| LAT, art. 21 num. 28 y art. 23 lit. o) | Pérdidas deducibles y no deducibles (cuadro 1). | Media |
| LAT, art. 43 y Criterio SAT 11-2018 | Efecto en el Régimen Opcional Simplificado (cuadro 1). | Media |
| SAT, preguntas frecuentes de Declaraguate | Un DTE emitido en moneda extranjera se convierte a quetzales con el **tipo de cambio de referencia del Banguat vigente en la fecha de emisión**. | Media (vista en el buscador; la página da 403) |
| SAT, preguntas frecuentes de contribuyentes especiales | En las constancias de retención de IVA se usa el último tipo de cambio publicado, según la **fecha de certificación** de la factura. | Media |
| Esquema FEL | La moneda va en el atributo `CodigoMoneda` de `dte:DatosGenerales` (GTQ, USD…). No vi un atributo de tipo de cambio: la SAT convierte por su cuenta. | Media (confirmar en el XSD de la documentación técnica de la SAT) |
| NIIF para pymes, sección 30 | 30.2 a 30.5: moneda funcional. 30.7: registro inicial al tipo de contado del día. 30.8: se admite el promedio semanal o mensual si el tipo no varía mucho. 30.9: al cierre, partidas monetarias al tipo de cierre y no monetarias al tipo histórico. 30.10: las diferencias van a resultados. | Alta en contenido, media en la numeración exacta |

---

## 3. Qué tipo de cambio usa cada operación

| Operación | Contabilidad (NIIF y práctica local) | Impuestos | Recomendación para el sistema |
|---|---|---|---|
| Factura de venta en USD (FEL) | Tipo del día de la operación | Referencia Banguat de la **fecha de emisión** (base de IVA y libro de ventas) | Referencia Banguat de la fecha de emisión, sin edición manual. Así el libro cuadra con lo que la SAT trae precargado. |
| Factura de compra en USD | Tipo del día de la factura | Referencia Banguat de la fecha de emisión del DTE (crédito fiscal) | Igual que la de venta. |
| Retención de IVA o ISR sobre documento en USD | – | La de IVA usa la fecha de certificación. La de ISR a no domiciliados usa la referencia de la fecha de pago o acreditamiento (Decreto 94-2000 art. 4). | Guardar el tipo usado en la constancia. |
| Compraventa real de divisas con el banco | Monto en GTQ que de verdad se pagó o recibió (tipo de compra o venta del banco) | Diferencia contra el valor en libros: pérdida deducible si el banco es supervisado por la SIB y la operación es gravada | Tipo **real** del comprobante del banco, editable. La diferencia contra el valor en libros se registra como diferencial realizado. |
| Cobro o pago en USD de factura en USD | Tipo del día del pago contra el tipo con que se registró la factura, aplicado a los USD = diferencial realizado | Ganancia gravada; pérdida deducible (cuenta por cobrar o por pagar) | Calcularlo automáticamente al aplicar el pago. |
| Pago en GTQ de factura en USD | La deuda es en USD. Los GTQ pagados se convierten al tipo pactado o al del día; su diferencia con el valor en libros es diferencial realizado. | Igual | Pedir el tipo con que se liquidó. Por omisión, la referencia del día. |
| Pago en USD de factura en GTQ | La deuda es en GTQ: no hay diferencial en la cuenta por cobrar o por pagar. La salida de la cuenta en USD se valúa al tipo del día; la diferencia con su valor en libros es diferencial **de la cuenta bancaria**. | La ganancia es gravada. La pérdida es dudosa: solo sería deducible si se considera compraventa con un banco supervisado. | Atribuir el diferencial a la cuenta bancaria. |
| Cierre mensual: bancos, caja, cuentas por cobrar y por pagar, préstamos en USD (partidas monetarias) | Tipo de cierre: referencia Banguat del último día del mes | Ganancia gravada en todo caso. Pérdida deducible solo en cuentas por cobrar y por pagar. | Ventana «Ajuste por diferencial cambiario» con detalle por partida. |
| Anticipos pagados o recibidos, inventario, activos fijos (partidas no monetarias) | Se quedan al tipo histórico **y no se revalúan** | – | Bloquear su revaluación. Si un anticipo en USD se trata como monetario, el ajuste sale mal. |

**Sobre compra, venta y referencia.** Para el dólar el Banguat publica **un solo tipo de referencia**. Según su página, es el promedio ponderado de compras y ventas del mercado institucional de divisas. Los tipos de compra y de venta de cada banco solo aplican a conversiones reales. Mi recomendación (es opinión, no ley): usar la referencia para todo registro y todo ajuste, y el tipo del banco solo en el comprobante de conversión. NIIF 30 admite la referencia como tipo de contado razonable, y la ley la exige para lo fiscal.

---

## 4. Cuándo se reconoce el diferencial

| Opción | Cómo funciona | A favor | En contra |
|---|---|---|---|
| A. Solo al pago | Se reconoce únicamente lo realizado | Simple | **No cumple** NIIF 30.9 ni el registro mensual del art. 21 num. 28. Los estados financieros salen mal valuados. |
| B. Cierre mensual acumulativo | Se revalúa cada mes al tipo de cierre y la nueva base es ese tipo. Al pago, el realizado se mide contra el último tipo de cierre. | Coincide con el registro mensual que pide la ley. No duplica ingresos. Cuadra con el Criterio 11-2018. | La trazabilidad se lleva por partida. |
| C. Cierre con reversión al día 1 | Se revalúa al cierre y se reversa al día siguiente. Al pago, el realizado se mide contra el tipo original (práctica habitual de SAP y Odoo). | Conserva el costo histórico | En el Régimen Opcional Simplificado (mensual) la reversión puede gravar dos veces la misma ganancia, y en el de utilidades complica la conciliación fiscal a fin de año. |

**Recomendación: opción B.** El método debe ser una variable de configuración por empresa, para quien la contabilidad de su auditor exija la C. Es obligatorio el cierre al 31 de diciembre.

---

## 5. Efecto fiscal por régimen (para la conciliación)

| Partida | Régimen sobre las utilidades | Régimen opcional simplificado | Pequeño contribuyente (IVA) |
|---|---|---|---|
| Ganancia realizada | Renta bruta | Renta bruta del mes | Sin efecto: el impuesto es sobre la venta facturada |
| Ganancia no realizada (cualquier cuenta) | Renta bruta | Renta bruta del mes si lleva contabilidad completa (Criterio 11-2018) | Sin efecto |
| Pérdida realizada | Deducible (compraventa con banco supervisado o cuenta por cobrar o por pagar) | No deducible | – |
| Pérdida no realizada en cuentas por cobrar o por pagar | Deducible con referencia Banguat y registro mensual | No deducible | – |
| Pérdida no realizada en bancos o préstamos | **No deducible** | No deducible | – |

IVA: el diferencial **no genera IVA** ni nota de débito o crédito cuando la factura es en USD, porque la deuda en USD no cambia (opinión con certeza media). Distinto es una factura **en GTQ** indexada a USD donde el cliente termina pagando más quetzales: eso es un aumento de precio, que lleva nota de débito con IVA.

---

## 6. Servicio web del Banco de Guatemala

| Dato | Detalle | Certeza |
|---|---|---|
| URL | `https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx`, servicio SOAP 1.1 y 1.2. WSDL en `?WSDL`. Espacio de nombres `http://www.banguat.gob.gt/variables/ws/`. | Alta |
| HTTPS | Obligatorio desde el 22/04/2024 | Alta |
| `TipoCambioDia` | Sin parámetros. Devuelve `CambioDolar/VarDolar{fecha, referencia}` y `CambioDia/Var{moneda, fecha, venta, compra}`. | Alta |
| `TipoCambioRango` | Parámetros `fechainit` y `fechafin` (dd/mm/aaaa). Devuelve `Vars/Var{moneda, fecha, venta, compra}` y `TotalItems`, ordenado por fecha. **No trae un campo `referencia`.** Para USD creo que `compra` y `venta` traen el mismo valor, la referencia, pero no lo comprobé. | Alta en la estructura, baja en el valor |
| `TipoCambioRangoMoneda`, `TipoCambioFechaInicial`, `TipoCambioFechaInicialMoneda`, `Variables`, `VariablesDisponibles` | Consultas por moneda o desde una fecha. La moneda va con código: 02 es USD. Las otras monedas se calculan entre 8:00 y 9:00 con cotizaciones internacionales por la referencia del USD. | Alta |
| Vigencia | El tipo entra en vigencia a las 00:00 del día hábil siguiente al de su cálculo. Ejemplo: la página mostraba el 18-nov-2026 «vigente para el miércoles 18 de noviembre: 7.64489». | Alta |
| Horario | No hay horario publicado. El Banguat puede suspender el servicio sin aviso. El módulo de Odoo lo consulta a las 06:00 hora de Guatemala. | Alta (sin horario) |
| Fines de semana y feriados | No encontré una regla oficial. En la práctica la serie trae un valor por cada día calendario, repitiendo el vigente. | Baja-media. Comprobar con un `TipoCambioRango` que cubra un fin de semana y un asueto. |
| Oficialidad | «No constituye un servicio oficial de información»: la fuente oficial es la página inicial del Banguat. Es gratis, sin soporte y hay que citar al Banguat como fuente. | Alta |

**Implicaciones de diseño (para el `arquitecto-de-datos`; yo no escribo código):**
- Una tabla de tipos de cambio por moneda y fecha con columnas `referencia`, `compra` y `venta` (estas dos opcionales), más `origen` (banguat o manual) y la consulta hecha.
- Carga diaria a las 06:00, con reintentos y relleno por rango.
- Si un día falta, usar el último vigente anterior y avisarlo.
- Ingreso manual permitido y auditado.
- Cada documento guarda el tipo usado: nunca se recalcula después.
- La moneda funcional y de libros queda fija en GTQ (Código de Comercio art. 369).
- Cada línea de la partida de diferencial lleva: partida de origen, realizado o no realizado, y deducible o no deducible.

---

## 7. Fuentes
- Banguat, servicio web: https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx (operaciones `?op=TipoCambioDia` y `?op=TipoCambioRango`)
- Banguat, condiciones del servicio: https://www.banguat.gob.gt/tipo_cambio/TipoCambio/OtrosServicios
- Banguat, tipo de cambio del día: https://www.banguat.gob.gt/tipo_cambio/TipoCambio/
- Banguat, metodología y vigencia: https://banguat.gob.gt/page/tipos-de-cambio-de-referencia
- Decreto 94-2000: https://pinfex.banguat.gob.gt/sites/default/files/banguat/leyes/2025/ley_negociacion_de_divisas.pdf
- Decreto 10-2012 (SAT): https://portal.sat.gob.gt/portal/wpfd_file/decreto-10-2012-ley-de-actualizacion-tributaria/ ; Congreso: https://www.congreso.gob.gt/assets/uploads/info_legislativo/decretos/2012/010-2012.pdf
- Decreto 19-2013: https://www.congreso.gob.gt/assets/uploads/info_legislativo/decretos/2013/19-2013.pdf
- Corte de Constitucionalidad, expediente 293-2013: https://gt.vlex.com/vid/678657685
- SAT, criterios institucionales (11-2018): https://portal.sat.gob.gt/portal/criterios-institucionales/
- Vescco, sobre el Criterio 11-2018: https://vescco.tax/blog/tratamiento-tributario-del-diferencial-cambiario-en-guatemala/
- Consortium Legal, «Tributación de la variación cambiaria»: https://consortiumlegal.com/wp-content/uploads/Tributacion-de-la-variacion-cambiaria-en-Guatemala.pdf
- Ó. Chile Monroy, Prensa Libre (arts. 20 y 21 num. 28): https://www.prensalibre.com/opinion/columnasdiarias/injusticias-del-impuesto-sobre-la-renta/ y https://www.prensalibre.com/opinion/columnasdiarias/incongruencias-de-la-lat/
- SAT, documentación técnica FEL: https://portal.sat.gob.gt/portal/documentacion-tecnica-del-regimen-fel/
- Código de Comercio (Decreto 2-70): https://www.icnl.org/wp-content/uploads/codcomercio.pdf
- Odoo, módulo `l10n_gt_banguat_fx`: https://apps.odoo.com/apps/modules/19.0/l10n_gt_banguat_fx
- NIIF para pymes, sección 30: https://www.ifrs.org/issued-standards/ifrs-for-smes/

---

## 8. Preguntas para el usuario
1. ¿Aceptamos **GTQ como moneda de libros fija** para todas las empresas, sin moneda funcional USD en la versión 1? Mi recomendación es que sí.
2. Método de cierre: ¿**B (acumulativo)** por omisión, con **C (reversión)** como opción por empresa?
3. ¿El tipo de las facturas en USD será siempre la **referencia Banguat de la fecha de emisión**, sin poder editarlo? Mi recomendación es que sí.
4. ¿Se puede editar el tipo de los cobros, pagos y conversiones con el banco, como pide el comprobante real? Mi recomendación es que sí.
5. ¿Qué monedas activamos además del USD (EUR, MXN, centroamericanas)? El Banguat las publica por código.
6. ¿El sistema marcará cada diferencial como deducible o no deducible para la conciliación del ISR, o eso se deja al contador externo?
7. ¿Mando a corregir C-10 en el diseño y el dictamen de Bancos?

---

## Veredicto
Sobre lo anotado para Multimoneda (Bancos §11.8 y C-10): **correcto con ajustes**.
- Corregir «no realizado sin efecto en ISR», según el cuadro 1.
- Separar las partidas monetarias de las no monetarias: los anticipos no se revalúan.
- Guardar el tipo usado en cada documento.
- Usar la referencia Banguat de la fecha de emisión en las facturas, y el tipo real del banco solo en las conversiones.
- Detallar la partida de diferencial por partida de origen, con su naturaleza fiscal.

**Pendiente de verificar:** cotejar con el PDF oficial la redacción vigente del art. 21 num. 28 y del art. 23 lit. o), y qué partes anuló la sentencia del expediente 293-2013.
