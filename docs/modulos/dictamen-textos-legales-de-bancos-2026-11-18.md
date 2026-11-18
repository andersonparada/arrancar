# Dictamen: textos legales de Bancos (Código de Comercio y otros) — contador-guatemala, 2026-11-18

Cotejo pedido por `diseno-bancos-segunda-parte.md` §15.8, antes de unir el cliente que muestra estos textos (BS-5, BS-6, BS-7 y CP-AP).

## Resumen

Cotejé los 5 artículos del Código de Comercio que pide el §15.8 (501, 508, 410, 513 y 388) y también los demás textos legales que encontré citados en Bancos: Código Penal art. 268 (ya está en el servidor, en servidor/src/modulos/bancos/aplicacion/aviso-de-fondos-de-posfechados.ts) y Código Civil arts. 1501, 1506, 1508 y 1514 (texto de ayuda de CP-AP). En el repositorio todavía no existen errores-de-apertura.ts ni textos-de-apertura.ts.

FUENTE Y CERTEZA. No pude leer congreso.gob.gt ni el PDF de ICNL (el lector no lo extrae). Usé el texto del Decreto 2-70 publicado en WIPO Lex (https://www.wipo.int/wipolex/en/legislation/details/2018). Es un repositorio intergubernamental con los textos que entregan los Estados, y esta versión trae notas de reforma hasta 2011 (por ejemplo, el Decreto 55-2010). Para el Código Civil usé el Decreto-Ley 106 en WIPO Lex (https://www.wipo.int/wipolex/es/legislation/details/2022). El Código Penal solo lo encontré en una fuente secundaria (conceptosjuridicos.com). Busqué reformas posteriores: el Decreto 6-2020 (cheques digitales, Diario de Centro América del 23/03/2020) reforma los arts. 503 y 511 y agrega el 511 Ter y el 516 Bis (https://gt.vlex.com/vid/reformas-decreto-no-2-842847963). El Decreto 72-2005 agregó el 511 Bis. Ninguna toca los artículos citados. Certeza: alta en la letra del texto y media-alta en que esté vigente, porque falta confirmarla en el portal del Congreso o en el CENADOJ (Organismo Judicial).

RESULTADO.
(1) Las 5 citas del Código de Comercio son del artículo correcto y en lo esencial dicen lo que el diseño afirma. Ninguna cita está equivocada.
(2) Hay que corregir cuatro paráfrasis:
- Art. 508: no dice que el banco «puede negarse». Dice que, dentro de los 6 meses siguientes a la fecha del cheque, el banco DEBE pagarlo si hay fondos y no se revocó. Pasado ese plazo, ya no está obligado. Lo exacto es «ya no está obligado a pagarlo».
- Art. 513: los 6 meses se cuentan desde la presentación del cheque (para el último tenedor), no desde su fecha. Además, prescriben solo las acciones cambiarias.
- Art. 410: la deuda no «revive». Nunca se extinguió, porque el cheque se recibe salvo buen cobro, y el art. 408 dice que dar un título no extingue la relación que lo originó.
- CC art. 1514: el plazo de 2 años no es solo para el precio de mercaderías. El inciso 1.º también incluye honorarios, sueldos y pagos por servicios. Esto es justo el caso de muchos cheques a proveedores de servicios.
(3) El texto del servidor (arts. 501 y 268) necesita dos ajustes:
- Dice «proveedor», pero Bancos es un módulo general y el beneficiario puede no ser proveedor.
- El delito del art. 268 no es «emitir» un cheque sin fondos: es defraudar a otro dándoselo en pago, o disponer de los fondos antes de que venza el plazo de presentación. Conviene decir «dar en pago… puede ser estafa».
(4) Art. 388: es correcto. Tiene una segunda regla: si el monto aparece varias veces con diferencias, vale el menor. Refuerza que el monto en letras y en números tienen que coincidir sí o sí.

OBSERVACIONES PARA CP-AP (mi opinión, no son citas que estén mal):
- Al anular un cheque, decir «la deuda sigue pendiente», no «revive».
- Aclarar que «reconocer la deuda» en la app es un registro contable. La interrupción de la prescripción del art. 1506 requiere reconocerla ante el acreedor (de palabra, por escrito o con hechos, por ejemplo un abono).
- Considerar citar el art. 409 (acción de enriquecimiento indebido: prescribe en 1 año desde que se extingue la acción cambiaria) junto al 408.
- No revisé aquí la afirmación fiscal «el ingreso por deuda prescrita es gravable»: queda para el diseño de CP-AP.

PREGUNTAS PARA EL USUARIO:
(a) La ley fija 6 meses (art. 508), pero bancos.cheques.meses_de_vencimiento está en 7 por omisión. ¿Bajamos el valor por omisión a 6 para que el aviso salga cuando la ley cambia el trato, o se mantienen 7 como margen?
(b) ¿Quiere que el aviso de cheque antiguo mencione también que, pasados 15 días de su fecha (art. 502), usted puede revocar el cheque sin causa (art. 507)? Le sirve para decidir si lo anula y lo repone.
(c) ¿Pedimos al coordinador una última verificación en el CENADOJ o en congreso.gob.gt, desde un equipo que pueda abrir esos PDF, antes de unir los textos de BS-5 a BS-7?

VEREDICTO: correcto con ajustes. Las citas sirven tal como están. Antes de unir el cliente hay que cambiar los textos por los de «textoParaLaApp» de cada artículo (cambian sobre todo el 508, el 513, el 410, el 1514 y el aviso del servidor 501/268).

## Artículos

### Código de Comercio (Decreto 2-70), art. 501. Vencimiento

- **Dónde se cita:** docs/modulos/diseno-bancos-segunda-parte.md §2.6 (línea 263); dictamen C-5; servidor/src/modulos/bancos/aplicacion/aviso-de-fondos-de-posfechados.ts línea 21
- **Cita correcta:** sí
- **Certeza:** Alta en el texto; media-alta en la vigencia (no se pudo abrir congreso.gob.gt)
- **Fuente:** WIPO Lex, Código de Comercio de Guatemala (Decreto 2-70): https://www.wipo.int/wipolex/en/legislation/details/2018. El Decreto 6-2020 no lo reforma (https://gt.vlex.com/vid/reformas-decreto-no-2-842847963)

**Texto oficial:** «El cheque será siempre pagadero a la vista. Cualquier anotación en contrario, se tendrá por no puesta. El cheque presentado al pago antes del día indicado como fecha de su creación, o sin fecha, es pagadero el día de la presentación. En estos casos el día de la presentación se tendrá legalmente como fecha de su creación.»

**Observación:** La paráfrasis del diseño («el banco puede pagar un posfechado antes de su fecha») es correcta y hasta se queda corta: la ley dice que ES pagadero el día en que se presenta. Además, el día de la presentación pasa a ser legalmente su fecha de creación, y desde ahí se cuentan los 15 días del art. 502 y los 6 meses del art. 508. En el texto del servidor sobra «proveedor»: Bancos es general y el beneficiario puede ser cualquiera.

**Texto para la app:** Aviso de fondos: «El cheque se paga a la vista aunque tenga fecha posterior: si el beneficiario lo presenta hoy, el banco lo paga hoy (Código de Comercio, art. 501), y la cuenta no tiene fondos para cubrirlo.» Conciliación: «Cheque con fecha dd/mm/aaaa: márquelo solo si el banco ya lo pagó. El banco puede pagarlo antes de su fecha (Código de Comercio, art. 501).»

### Código de Comercio (Decreto 2-70), art. 508. Pago extemporáneo

- **Dónde se cita:** docs/modulos/diseno-bancos-segunda-parte.md §5.1 (línea 411), líneas 18, 666 y 812; dictamen C-6 y error 5
- **Cita correcta:** sí
- **Certeza:** Alta en el texto; media-alta en la vigencia
- **Fuente:** WIPO Lex, Decreto 2-70: https://www.wipo.int/wipolex/en/legislation/details/2018. Sin reformas conocidas (el Decreto 6-2020 reforma 503, 511, 511 Ter y 516 Bis)

**Texto oficial:** «Aún cuando el cheque no hubiere sido presentado en tiempo, el librado deberá pagarlo si tiene fondos suficientes del librador y el cheque se presenta dentro de los seis meses que sigan a su fecha y no ha sido revocado.»

**Observación:** La paráfrasis del diseño no es exacta. Dice «desde los 6 meses de su fecha el banco puede negarse a pagarlo», pero el artículo no faculta a negarse: obliga a pagar DENTRO de los 6 meses (con fondos y sin revocación). Pasado ese plazo, la ley ya no obliga al banco, y en la práctica los bancos rechazan el cheque por contrato o por política. Lo exacto es «ya no está obligado a pagarlo». Dos matices: el plazo para presentar es de 15 días calendario (art. 502), y una vez vencido usted puede revocar el cheque sin causa (art. 507). El valor por omisión de la variable (7) no coincide con la ley (6): es una pregunta para el usuario.

**Texto para la app:** «El cheque N es del dd/mm/aaaa: al dd/mm/aaaa tiene M meses. Pasados 6 meses de su fecha, el banco ya no está obligado a pagarlo (Código de Comercio, art. 508). Revise si sigue en circulación o si conviene anularlo y reponerlo.»

### Código de Comercio (Decreto 2-70), art. 410. Salvo buen cobro

- **Dónde se cita:** docs/modulos/diseno-bancos-segunda-parte.md §2.5 (línea 252); dictamen C-3; texto de ayuda de CP-AP
- **Cita correcta:** sí
- **Certeza:** Alta en el texto (antes estaba en media); media-alta en la vigencia
- **Fuente:** WIPO Lex, Decreto 2-70: https://www.wipo.int/wipolex/en/legislation/details/2018

**Texto oficial:** «Los títulos de crédito dados en pago se presumen recibidos bajo la condición: salvo buen cobro, cualquiera que sea el motivo de la entrega.»

**Observación:** La cita es correcta, pero la palabra «revive» no lo es: la deuda nunca se extinguió. El art. 408 (Relación causal) dice que dar un título de crédito no extingue, salvo pacto expreso, la relación que le dio origen. Lo que la sostiene es el 410 junto con el 408, así que conviene citar los dos en CP-AP. El art. 409 (enriquecimiento indebido, prescribe en 1 año desde que se extingue la acción cambiaria) completa el cuadro.

**Texto para la app:** «El cheque se recibe salvo buen cobro (Código de Comercio, arts. 408 y 410): mientras no se cobre, no paga la deuda. Si lo anula, la deuda con el beneficiario sigue pendiente.»

### Código de Comercio (Decreto 2-70), art. 513. Prescripción

- **Dónde se cita:** docs/modulos/diseno-bancos-segunda-parte.md §2.5 (línea 253); dictamen C-3; ayuda de CP-AP
- **Cita correcta:** sí
- **Certeza:** Alta en el texto; media-alta en la vigencia
- **Fuente:** WIPO Lex, Decreto 2-70: https://www.wipo.int/wipolex/en/legislation/details/2018

**Texto oficial:** «Las acciones cambiarias derivadas del cheque, prescriben en seis meses, contados desde la presentación, las del último tenedor, y desde el día siguiente a aquel en que paguen el cheque, las de los endosantes y las de los avalistas.»

**Observación:** La paráfrasis «la acción cambiaria del cheque prescribe a los 6 meses» es correcta en el plazo, pero no dice desde cuándo se cuenta: para el beneficiario (último tenedor), desde la PRESENTACIÓN, no desde la fecha del cheque. Si el cheque nunca se presentó, el cómputo es discutible (es mi opinión): mejor no prometer en la app una fecha de prescripción calculada. Solo prescribe la acción cambiaria; la deuda de fondo sigue su propio plazo del Código Civil, como dice bien el diseño.

**Texto para la app:** «Las acciones cambiarias del cheque prescriben en 6 meses desde su presentación (Código de Comercio, art. 513). La deuda que el cheque pagaba no prescribe con él: tiene su propio plazo.»

### Código de Comercio (Decreto 2-70), art. 388. Diferencias en lo escrito

- **Dónde se cita:** docs/modulos/diseno-bancos-segunda-parte.md §11.2 (línea 747) y §16.2 (línea 923); dictamen C-11
- **Cita correcta:** sí
- **Certeza:** Alta en el texto (antes estaba en media); media-alta en la vigencia
- **Fuente:** WIPO Lex, Decreto 2-70: https://www.wipo.int/wipolex/en/legislation/details/2018. El art. 495 (requisitos del cheque) remite expresamente a este artículo

**Texto oficial:** «El título de crédito que tuviere su importe escrito en letras y cifras, valdrá, en caso de diferencia, por la suma escrita en letras. Si la cantidad estuviere expresada varias veces en letras o en cifras, el documento valdrá, en caso de diferencia, por la suma menor.»

**Observación:** «Vale lo escrito en letras» es correcto. Tiene una segunda regla que el diseño no menciona: si el monto aparece varias veces con diferencias, vale el menor. Refuerza las pruebas exhaustivas y el relleno, que evita agregar texto. El comprobante (voucher) es otro documento y esta regla no lo alcanza.

**Texto para la app:** «Si el monto en letras y el monto en números no coinciden, vale lo escrito en letras (Código de Comercio, art. 388). Revise que coincidan antes de imprimir.»

### Código Penal (Decreto 17-73), art. 268. Estafa mediante cheque

- **Dónde se cita:** servidor/src/modulos/bancos/aplicacion/aviso-de-fondos-de-posfechados.ts línea 22
- **Cita correcta:** sí
- **Certeza:** Media-alta (no lo pude ver en fuente oficial; conviene cotejarlo en el CENADOJ)
- **Fuente:** Fuente secundaria: https://www.conceptosjuridicos.com/gt/articulos/codigo-penal-articulo-268/. Concuerda con el C. Com. art. 496 (WIPO Lex, https://www.wipo.int/wipolex/en/legislation/details/2018), que remite a la estafa del Código Penal. Según el Código Procesal Penal art. 24 Quáter (https://www.wipo.int/wipolex/en/text/235484), es delito de acción privada

**Texto oficial:** «Quien defraudare a otro dándole en pago un cheque sin provisión de fondos o disponiendo de ellos, antes de que expire el plazo para su presentación, será sancionado con prisión de seis meses a cinco años y multa de cien a cinco mil quetzales. Igual sanción se aplicará a quien endosare un cheque con conocimiento de la falta de fondos del librador.»

**Observación:** El texto actual («Emitir un cheque sin fondos puede ser delito») amplía el tipo penal. El delito exige defraudar a otro dándole el cheque en pago, o disponer de los fondos antes de que venza el plazo de presentación. Si el beneficiario sabía que el cheque era posfechado y sin fondos, se discute que haya engaño. «Puede» salva la afirmación, pero conviene decirlo con las palabras de la ley. Mi opinión: es un aviso preventivo razonable y no hay que quitarlo.

**Texto para la app:** «Dar en pago un cheque sin fondos, o retirar los fondos antes de que venza el plazo para cobrarlo, puede ser estafa (Código Penal, art. 268).»

### Código Civil (Decreto-Ley 106), art. 1508. Prescripción general

- **Dónde se cita:** docs/modulos/diseno-bancos-segunda-parte.md §2.5 (línea 253) y §16.2 (CP-AP); dictamen C-3
- **Cita correcta:** sí
- **Certeza:** Alta en el texto; media-alta en la vigencia
- **Fuente:** WIPO Lex, Código Civil de Guatemala: https://www.wipo.int/wipolex/es/legislation/details/2022

**Texto oficial:** «La prescripción extintiva se verifica en todos los casos no mencionados en disposiciones especiales, por el transcurso de cinco años, contados desde que la obligación pudo exigirse; …»

**Observación:** Correcto. Falta decir desde cuándo se cuenta: desde que la obligación pudo exigirse, es decir, desde el vencimiento de la factura o deuda original, no desde la fecha del cheque.

**Texto para la app:** «En general, la deuda prescribe en 5 años desde que se pudo cobrar (Código Civil, art. 1508).»

### Código Civil (Decreto-Ley 106), art. 1514. Prescripción de dos años

- **Dónde se cita:** docs/modulos/diseno-bancos-segunda-parte.md §2.5 (línea 254) y §16.2 (CP-AP); dictamen C-3
- **Cita correcta:** sí
- **Certeza:** Alta en el texto; media-alta en la vigencia
- **Fuente:** WIPO Lex, Código Civil: https://www.wipo.int/wipolex/es/legislation/details/2022

**Texto oficial:** «Prescriben en dos años: 1°. Los honorarios, sueldos, salarios, jornales y otras retribuciones por prestación de cualquier servicio; 2°. La acción de cualquier comerciante para cobrar el precio de los objetos vendidos; 3°. [hoteles, casas de hospedaje y quienes suministran alimentos]; 4°. Las pensiones, rentas, alquileres y cualesquiera otras prestaciones periódicas no cobradas a su vencimiento…» El plazo corre «desde el día en que el acreedor puede exigir el pago».

**Observación:** La cita es correcta, pero la paráfrasis («2 años si es precio de mercadería») es incompleta. El inciso 2.º se refiere al precio de lo que vende un comerciante, y el inciso 1.º pone también en 2 años los honorarios, sueldos y pagos por cualquier servicio. Muchos cheques a proveedores pagan servicios, así que CP-AP debe mencionar los dos incisos (y el 4.º, alquileres).

**Texto para la app:** «Prescriben en 2 años el cobro de honorarios y servicios, el precio de lo que vendió un comerciante y los alquileres no cobrados (Código Civil, art. 1514), contados desde que se pudieron cobrar.»

### Código Civil (Decreto-Ley 106), art. 1501. Prescripción extintiva

- **Dónde se cita:** docs/modulos/diseno-bancos-segunda-parte.md §2.5 (línea 254) y §16.2; dictamen C-3
- **Cita correcta:** sí
- **Certeza:** Alta en el texto; media-alta en la vigencia
- **Fuente:** WIPO Lex, Código Civil: https://www.wipo.int/wipolex/es/legislation/details/2022

**Texto oficial:** «La prescripción extintiva, negativa o liberatoria, ejercitada como acción o como excepción por el deudor, extingue la obligación.» (Agrega que la prescripción de la obligación principal produce la de la accesoria.)

**Observación:** La paráfrasis «no opera sola» es correcta: extingue la deuda cuando el deudor la hace valer. El artículo no dice literalmente que el juez no la declara de oficio, así que la app no debe atribuirle esa frase. Para contabilidad (mi opinión y práctica de NIIF para las Pymes, sección 11, baja de pasivos), dar de baja una deuda por prescripción requiere juicio y respaldo, y el descarte con motivo de CP-AP es la forma correcta.

**Texto para la app:** «La prescripción no borra la deuda por sí sola: la extingue cuando el deudor la hace valer (Código Civil, art. 1501).»

### Código Civil (Decreto-Ley 106), art. 1506. Interrupción de la prescripción

- **Dónde se cita:** docs/modulos/diseno-bancos-segunda-parte.md §2.5 (línea 254) y §16.2; dictamen C-3
- **Cita correcta:** sí
- **Certeza:** Alta en el texto; media en qué redacción está vigente (WIPO muestra dos versiones; cotejar en el CENADOJ)
- **Fuente:** WIPO Lex, Código Civil: https://www.wipo.int/wipolex/es/legislation/details/2022 (no indica el decreto que lo reformó)

**Texto oficial:** Versión vigente (WIPO Lex trae además el texto original): la prescripción se interrumpe «1. … por requerimiento judicial o notarial o por demanda judicial debidamente notificada o por embargo…»; «2. Si la persona a cuyo favor corre la prescripción, reconoce expresamente, de palabra o por escrito,» o tácitamente «por hechos indudables», el derecho de aquel contra quien prescribe; «3. Por el pago de intereses o amortizaciones por el deudor, así como por el cumplimiento parcial de la obligación por parte de éste.»

**Observación:** La cita es correcta. Cuidado en CP-AP: «reconocer la deuda» en la bandeja es un registro contable interno. Para la ley, el reconocimiento que interrumpe es el que se hace ante el acreedor, de palabra, por escrito o con hechos como un abono (mi interpretación). La app no debe dar a entender que el botón interrumpe la prescripción.

**Texto para la app:** «El plazo vuelve a empezar si usted reconoce la deuda ante el acreedor, de palabra, por escrito o con hechos como un abono, o si él la reclama judicial o notarialmente (Código Civil, art. 1506). Registrarla aquí no basta para eso.»
