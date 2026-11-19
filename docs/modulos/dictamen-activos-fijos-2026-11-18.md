# Dictamen del contador, 2026-11-18: Activos fijos

_Investigación del agente `contador-guatemala` del 2026-11-18, guardada tal cual (sin cambiar el texto) por el agente
`arquitecto-de-datos`. La usa `diseno-activos-fijos.md`, que marca como «por validar» lo que aquí queda dudoso._

---

# Dictamen contable y fiscal: módulo de Activos fijos (Guatemala)

**Cómo leer las etiquetas.** [Ley] es el texto legal. [Práctica] es la práctica profesional o de auditoría. [Opinión] es criterio mío. La certeza va como **A** (alta, texto confirmado en más de una fuente), **M** (media, texto secundario o de memoria y sin contradicción) o **B** (baja, hay que verificarlo antes de programar).

**Límite de la investigación.** No pude leer el texto de los PDF oficiales: los del Congreso, la SAT y el TSE vienen comprimidos o escaneados. Los artículos del ISR se cotejaron en transcripciones completas de la ley (SlideShare) y en tres despachos (Grow Up Auditores, Vescco, PwC), que coinciden entre sí. Los números de **literal** del art. 23 y los textos del IVA y del ISO llevan certeza M o B. Antes de dar por cerrados los textos legales, conviene que alguien abra el PDF oficial.

---

## 1. ISR (Decreto 10-2012 y AG 213-2013)

### 1.1 Reglas de depreciación (régimen sobre las utilidades)

| Tema | Regla | Fuente | Certeza |
|---|---|---|---|
| Deducible | Son deducibles las depreciaciones y amortizaciones que cumplan el título (art. 21 num. 19). Mantenimiento y reparación también, si conservan el bien y no son mejora permanente (num. 18). Las pérdidas por extravío, rotura, daño o destrucción son deducibles si están comprobadas (num. 17) | [Ley] arts. 21.17, 21.18 y 21.19 | A |
| Solo bienes propios usados en lo gravado | Solo se deprecian bienes **del contribuyente** que se usan para generar renta gravada | [Ley] art. 25 | A |
| **Cuota no deducida, cuota perdida** | Si la cuota de un año no se deduce, o se deduce de menos, ya no se recupera en años siguientes | [Ley] art. 25 | A |
| Base | Costo de adquisición o producción (incluye instalación y montaje hasta que el bien está listo), más las mejoras permanentes | [Ley] art. 26 | A |
| Inmuebles | La base es el valor de la matrícula fiscal o del catastro municipal. **El terreno no se deprecia.** Si no se distingue el valor del edificio, se presume que es el 70 % del total, salvo prueba en contrario | [Ley] art. 26; no deducible lo que exceda la matrícula (art. 23) | A (el literal del art. 23: M) |
| Mejoras | La nueva base es el saldo no depreciado más la mejora, según la vida útil. Una mejora que alarga la vida útil no es gasto: se capitaliza | [Ley] arts. 26 y 23 | A |
| Método | Línea recta (porcentaje anual fijo). Otro método solo con autorización de la SAT. Un método adoptado no se cambia sin autorización previa | [Ley] art. 27 | A |
| Porcentajes | Son **máximos** anuales (tabla 1.2). Se puede usar uno menor y, una vez adoptado, no se cambia | [Ley] art. 28; Vescco | A / M (lo del porcentaje menor) |
| Revaluaciones | Van a superávit por revaluación. Un inmueble se revalúa con avalúo de valuador autorizado inscrito en la matrícula. **El aumento solo se deprecia si se pagó el ISR de ganancia de capital por la revaluación** | [Ley] art. 29; arts. 84.3.b y 84.3.c.v | A |
| Fusiones y traspasos | La base es el valor en libros | [Ley] art. 30 | M |
| Forestal, minería, intangibles | Forestal según la producción (art. 31). Exploración minera en 5 cuotas (art. 32). Intangibles (marcas, patentes, **programas y licencias**, gastos de organización) en línea recta, mínimo 5 años. Derecho de llave: mínimo 10 años | [Ley] arts. 31, 32 y 33 | A |
| Desde cuándo se deprecia | La ley no lo dice expresamente. En la práctica se empieza el mes en que el bien se pone en uso, o el siguiente | [Práctica] | M |
| Valor residual fiscal | La ley no lo menciona. En la práctica se deprecia el 100 % de la base | [Práctica] | M |

### 1.2 Porcentajes máximos de depreciación (art. 28)

| Inciso | Bien | % anual máx. | Años mín. |
|---|---|---|---|
| 1 | Edificios, construcciones, instalaciones adheridas a inmuebles y sus mejoras | 5 % | 20 |
| 2 | Árboles, arbustos, frutales y especies vegetales que producen frutos o productos con renta gravada, incluidos los gastos capitalizables para formar la plantación | 15 % | 6.67 |
| 3 | Instalaciones no adheridas, mobiliario y equipo de oficina, buques-tanque, barcos, material ferroviario, marítimo, fluvial o lacustre | 20 % | 5 |
| 4 | Semovientes de carga o de trabajo, maquinaria, vehículos en general, grúas, aviones, remolques, semirremolques, contenedores, material rodante (no ferroviario) | 20 % | 5 |
| 5 | Equipo de computación | 33.33 % | 3 |
| 6 | Herramientas, porcelana, cristalería, mantelería, cubiertos y similares | 25 % | 4 |
| 7 | Reproductores de raza, machos y hembras: sobre **costo menos su valor como ganado común** | 25 % | 4 |
| 8 | Bienes muebles no indicados en los incisos anteriores | 10 % | 10 |
| — | Terrenos | No se deprecian (art. 26) | — |
| — | Intangibles y software (art. 33) | Máx. 20 % (mínimo 5 años); llave, máx. 10 % | — |

Certeza A en los ocho incisos: coinciden Grow Up, Vescco, la transcripción de SlideShare y PwC. Una copia dice «equipo de computación, incluidos los programas», lo que choca con el art. 33 (software a 5 años mínimo). Mi recomendación [Opinión, certeza B] es tratar el software como intangible al 20 % y preguntárselo a la SAT o al contador de cada empresa.

### 1.3 Venta, revaluación y ganancia de capital (Título IV)

| Tema | Regla | Fuente | Certeza |
|---|---|---|---|
| Venta de un activo fijo | Es ganancia de capital cuando la vende alguien cuyo **giro habitual** no es comerciar con esos bienes. Es el caso de una finca que vende su tractor | [Ley] art. 84.3.a | A en el texto; M en que se aplique a todo activo fijo de quien está en el régimen sobre las utilidades |
| Base | Precio de venta menos el costo en libros. Para quien lleva contabilidad, el costo es lo contabilizado más las mejoras menos la depreciación acumulada | [Ley] art. 89 | A |
| Tasa | 10 % | [Ley] art. 92 | A |
| Pago | Dentro de los primeros 10 días del mes siguiente | [Ley] art. 95 | M |
| Pérdida de capital | Solo se compensa con ganancias de capital futuras, máximo 2 años. **No es gasto deducible** del régimen sobre las utilidades | [Ley] arts. 91 y 96 | A |
| Revaluación | Para quien lleva contabilidad, la revaluación de un activo fijo **es ganancia de capital**. Si es una simple partida contable, la diferencia tributa al vender | [Ley] arts. 84.3.b y 84.3.c.v | A |
| Decreto 18-2026 | Agrega el num. 4 al art. 87: exime de ganancia de capital la venta de inmuebles por **personas individuales** (no las jurídicas, ni los fideicomisos, ni quienes se dedican a bienes raíces). Vigente desde el **1-ene-2027** | Consortium Legal | M |
| Ganado reproductor de descarte | Un ganadero que vende vacas de desecho sí comercia con ganado. Puede ser renta de la actividad lucrativa y no ganancia de capital | [Opinión] | B: se decide con Ganadería |

Para el sistema importa esto: la ganancia o pérdida **fiscal** usa la base fiscal y la **contable** usa el valor en libros NIIF, así que salen distintas. Además, la venta **no** entra en la renta de la actividad lucrativa: va a su propia declaración mensual.

### 1.4 ¿Cuándo importa la depreciación fiscal, según el régimen?

| Régimen | ISR | ¿Importa? |
|---|---|---|
| Sobre las utilidades (25 %) | Renta neta | **Sí**: deducción anual, cuota perdida si no se toma (art. 25), ISO (base de activo neto) y diferido (NIIF 29) |
| Opcional simplificado (5 % y 7 % sobre ingresos, arts. 43 y 44) | Sobre ingresos | **No para el ISR**. Sí para la contabilidad (Código de Comercio art. 368) y para la ganancia de capital al vender, que aplica a todos |
| Pequeño contribuyente (IVA 5 %, sin ISR) | — | Solo control y contabilidad, si la exige el Código de Comercio |
| ISO (Decreto 73-2008) | 1 % sobre la mayor de ¼ del activo neto o ¼ de los ingresos brutos. El activo neto es el activo menos la depreciación acumulada | Lo pagan quienes están en el régimen sobre las utilidades. La depreciación baja la base. [Ley, de memoria] arts. 1, 7 y 8. **Certeza M** |

Recomendación [Opinión]: el módulo es **general** y sirve a todos los regímenes. Lo fiscal (libro fiscal, ISO, diferido) se muestra cuando la empresa está en el régimen sobre las utilidades. En los demás se calcula igual pero solo se informa.

---

## 2. IVA (Decreto 27-92 y AG 5-2013)

| Tema | Regla | Fuente | Certeza |
|---|---|---|---|
| Crédito fiscal | Da crédito el IVA de la compra, **importación o construcción** de activos fijos **directamente vinculados** a producir o comercializar bienes y servicios gravados | [Ley] art. 16 (primer párrafo reformado por el Decreto 10-2012); expediente 270-2006 | A en el texto; M en el alcance de «directamente» |
| Momento | El crédito se toma **completo** en el período, dentro del plazo del art. 20. **No** se reparte como la depreciación | [Ley] arts. 16 y 20 | A |
| Base del activo | **Sin** el IVA acreditable. Solo el IVA no acreditable (no vinculado o fuera de plazo) va al costo. El Libro de compras ya lo hace así (sigue a su línea), y está bien | [Ley] art. 16; ISR art. 26 | A |
| SAT-2237 | Casillas propias: activos fijos locales y activos fijos importados | `docs/modulos/investigacion-sat-2237-y-2046.md` | M (los números de casilla, sin confirmar) |
| Venta de un activo mueble | Es hecho generador (venta de bienes muebles): IVA 12 %, se emite FEL | [Ley] art. 3 num. 1 | A |
| Venta de un inmueble | La primera venta paga IVA. Las siguientes pagan timbres fiscales del 3 % (Decreto 37-92). Desde 2027 se agrega el art. 43 Bis de Timbres (Decreto 18-2026) | [Ley] art. 3; Decreto 37-92 | M |
| Retiro, donación, faltante | Retirar un bien para uso propio, donarlo o perderlo (faltante) puede generar débito. **Se exceptúan** el caso fortuito, la fuerza mayor y los delitos contra el patrimonio, si están comprobados. Por eso la baja necesita acta y, en un robo, la denuncia | [Ley] art. 3 nums. 6, 7 y 9 | M (que el num. 7 llegue al activo fijo se discute) |
| Prorrata por ventas exentas | La ley solo pide que haya vinculación (art. 16). No encontré un procedimiento legal de prorrata. El proyecto ya lo dejó pendiente | [Ley] art. 16 | **B** |

---

## 3. NIIF para las Pymes (vigente en Guatemala desde 2011, resolución del Colegio de Contadores publicada el 13-jul-2010)

| Sección | Lo que pide | Consecuencia para el módulo |
|---|---|---|
| 17.4–17.5 | Se reconoce como activo si genera beneficios futuros y su costo se mide con fiabilidad. Los repuestos importantes también | Política de capitalización con umbral por empresa. **No hay umbral legal** [Práctica] |
| 17.6 | **Componentes** con vidas distintas se deprecian por separado (motor, carrocería, techo) | Activo con componentes |
| 17.10 | El costo incluye precio, aranceles, IVA no recuperable, flete, instalación, honorarios y desmantelamiento | **Un activo se forma con varias líneas y documentos** (factura, DUCA, flete, instalación) |
| 17.15 | Modelo del costo; la edición 2015 permite además el **modelo de revaluación** | Revaluación opcional |
| 17.18–17.23 | Se deprecia desde que el bien está **disponible para usarse**, hasta su baja. **Sigue aunque esté ocioso.** Vida útil y valor residual estimados, que se revisan si hay indicios. El terreno no se deprecia | Libro contable con vida útil y valor residual propios. Un bien ocioso se sigue depreciando en el libro contable |
| 17.27–17.30 | Baja por venta o porque ya no da beneficios. La ganancia o pérdida va a resultados (no a ingresos de actividades ordinarias) | Venta y baja con su resultado |
| 27 | Deterioro: valor recuperable menor que el valor en libros | Ajuste contable, **no deducible** para el ISR [Opinión, M] |
| 16 | Propiedades de inversión (inmuebles para rentar o por plusvalía): valor razonable si se puede sin esfuerzo desproporcionado | Clase aparte |
| 20 | Arrendamiento financiero: el arrendatario reconoce el activo. Operativo: no | v1, solo control de bienes de terceros |
| 29 | Diferencias temporarias entre la base contable y la fiscal, que generan **impuesto diferido** | Reporte de diferencias por activo (régimen sobre las utilidades) |
| 34 | Activos biológicos (ganado, plantaciones) a valor razonable si se determina sin esfuerzo desproporcionado; si no, al costo menos depreciación y deterioro | Ver §5.5 |
| 7.5 | Las compras y ventas de PP&E son actividad de **Inversión** | Ya está hecho en CP4. Falta la venta |

La **tercera edición** de la NIIF para las Pymes (IASB, feb-2025) rige para ejercicios desde el 1-ene-2027. No confirmé si cambió las secciones 17 o 34 (plantas productoras) ni si el Colegio de Contadores ya la adoptó. **Certeza B**: verificar.

---

## 4. Práctica guatemalteca y lo que piden los auditores [Práctica, M]

| Tema | Práctica | Lo que pide el auditor |
|---|---|---|
| Registro auxiliar | Ficha por activo: código, descripción, marca, modelo y serie, fecha de compra y de inicio de uso, documento, proveedor, costo, depreciación contable y fiscal, ubicación y responsable | Que el auxiliar cuadre con el mayor (costo y depreciación acumulada) cada cierre |
| Etiqueta | Código correlativo por empresa (o por clase), en placa o etiqueta QR | Que la muestra física coincida con la etiqueta |
| Responsable | Responsiva o acta de entrega firmada por quien usa el bien | Las responsivas |
| Ubicación | Localidad y departamento (ya existen en Empresas) | Que la ubicación esté al día |
| Traslados | Acta o boleta de traslado con fecha, origen, destino y quien recibe. Cambia el centro de costo del gasto | Historial de traslados |
| Inventario físico | Por lo menos una vez al año, por localidad. Faltantes y sobrantes con su ajuste aprobado | Acta del conteo y conciliación |
| Bajas | Acta administrativa (o notarial, si el monto lo justifica) con motivo, autorización y destino del bien. Robo: denuncia (MP o PNC). Destrucción: fotos y testigos | Acta, autorización y efecto fiscal (IVA art. 3 num. 7, ISR art. 21 num. 17) |
| Seguros | Póliza, aseguradora, suma asegurada, vigencia y bienes cubiertos | Que la suma asegurada sea razonable y la póliza esté vigente |
| En tránsito o en construcción | Cuenta de obras o importaciones en curso, **sin depreciar** hasta su uso | Que se capitalice a tiempo; obras viejas sin cerrar |
| Bienes de terceros | Arrendados o en comodato: control físico fuera del balance | Que no estén en el balance |
| Conservación | Documentos de costo mientras se deprecia el bien, más el plazo de prescripción (4 años) | [Ley] Código Tributario arts. 47 y 112 (certeza M) |
| Libro de inventarios | El inventario de apertura y el de cada cierre incluyen el activo fijo | [Ley] Código de Comercio art. 368 y siguientes (M) |

---

## 5. Cómo encaja con lo que ya existe

### 5.1 Qué está bien

| Hoy | Por qué está bien |
|---|---|
| La línea del Libro de compras se marca como activo fijo, propuesta por el concepto de gasto | Así se separan la casilla del SAT-2237 y el flujo de efectivo |
| El IVA no acreditable y el fuera de plazo van al costo y siguen a su línea | ISR art. 26 y NIIF 17.10 |
| El pago de un cargo de activo fijo va a Inversión, con desglose en las notas ligadas, los reintegros y la caja chica | NIIF para las Pymes 7.5 |

### 5.2 Qué está mal o incompleto

| # | Problema | Por qué | Corrección propuesta |
|---|---|---|---|
| E1 | Check `lineas_de_documento_activo_fijo_es_bien` (y el igual en `conceptos_de_gasto`): **un servicio no puede ser activo fijo** | La construcción (IVA art. 16 dice «construcción»), la instalación y el montaje (ISR art. 26), el flete y los honorarios de ingeniería **son costo del activo**. Hoy esas facturas irían a gasto y su pago a Operación | Separar dos ideas. «Se capitaliza a un activo» se permite en bien **y** en servicio. El rubro del SAT-2237 sigue saliendo del tipo: un servicio de construcción va en servicios salvo que la SAT diga otra cosa (certeza B). Para `arquitecto-de-datos`: quitar o relajar el check, y revisar el rubro del SAT-2237 y el desglose de CP4 |
| E2 | La marca está en la línea, pero **una línea no es un activo** | Una línea puede traer 10 computadoras, y un activo puede juntar factura, DUCA, flete e instalación de varios documentos | Tabla de **costos del activo** que liga un activo con varias líneas (y una línea con varios activos), con monto parcial. Más una **bandeja de líneas por capitalizar** (pendiente, capitalizada o descartada) |
| E3 | Solo entran costos que vienen del Libro de compras | Faltan la importación (DUCA), la autoconstrucción con planilla, el aporte de socios, la donación recibida, el arrendamiento financiero y los saldos iniciales | Alta manual con su documento de soporte, y carga inicial (con la carga inicial abierta y cerrada que ya existe) |
| E4 | Anular o eliminar una factura con líneas ya capitalizadas | Dejaría un activo huérfano | Que el Libro de compras **no deje anular** si hay costos capitalizados (o lo avise), al estilo de las notas ligadas. Lo resuelve el módulo con el evento de anulación |
| E5 | Venta de un activo | No hay Ventas ni FEL emitida. Su cobro es **Inversión** (7.5) | v1: registrar la venta con el FEL emitido afuera y un concepto de Bancos de Inversión «Venta de activos» (entrada) |

### 5.3 Eventos para Contabilidad (cuando exista)

Cada evento lleva empresa, activo, clase, localidad, departamento (centro de costo), fecha y período. Los montos van en centavos y en quetzales, y separan lo **contable** de lo **fiscal**.

| Evento | Datos | Partida que permite |
|---|---|---|
| `activo_capitalizado` | Costos y documentos de origen | Debe Activo / Haber cuenta puente de compras de activos |
| `depreciacion_del_mes_cerrada` | Por activo o componente: cuota contable, cuota fiscal y centro de costo | Debe Gasto de depreciación / Haber Depreciación acumulada (y el diferido) |
| `mejora_capitalizada` | Monto y nueva vida útil | Debe Activo |
| `activo_trasladado` | Origen y destino (localidad y departamento) | Reclasificar el centro de costo desde la fecha |
| `activo_dado_de_baja` | Motivo, costo, depreciación acumulada contable y fiscal, acta | Debe Depreciación acumulada y Pérdida / Haber Activo |
| `activo_vendido` | Precio, IVA, FEL, resultado contable y fiscal | Debe Cuentas por cobrar o Bancos y Depreciación acumulada / Haber Activo, IVA débito y Ganancia |
| `activo_deteriorado` y `activo_revaluado` | Si se aprueban | Pérdida por deterioro, o superávit e ISR de ganancia de capital |

Recomendación [Opinión]: un **cierre mensual de depreciación** por empresa, que se pueda repetir sin duplicar y se reabra con permiso y auditoría (como los períodos del Libro de compras). Cerrado el mes, no se mueven activos con fecha de ese mes.

### 5.4 Datos mínimos del activo (para `arquitecto-de-datos`; yo no diseño tablas)

- **Clase** (catálogo por empresa), que trae por omisión: inciso del art. 28 y su % máximo (tasas en **configuración de instalación**, como las retenciones), vida útil contable y método.
- **Libro contable**: vida útil, valor residual, método (línea recta; unidades de producción opcional) y fecha de inicio.
- **Libro fiscal**: base fiscal (inmueble: valor de la matrícula y del terreno por separado, con la presunción del 70 %), % aplicado (≤ máximo; fijo una vez adoptado) y fecha de inicio. En reproductores, el **valor como ganado común**.
- Estado: en tránsito o construcción, en uso, ocioso, totalmente depreciado, dado de baja (vendido, destruido, robado, donado, obsoleto, faltante).
- Código y etiqueta, serie, marca y modelo, localidad, departamento, responsable e historial; póliza de seguro; propio o de terceros.

### 5.5 Activos biológicos

- [Ley] El ISR los trata como bienes depreciables: semovientes de trabajo al 20 %, reproductores al 25 % sobre el exceso del valor de ganado común, plantaciones al 15 %.
- [NIIF 34] El ganado y las plantaciones son activos biológicos, no PP&E, y van a valor razonable cuando se puede.
- Recomendación [Opinión]: este módulo general tiene las **clases** «Semoviente de trabajo», «Reproductor» y «Plantación productiva», y lleva su costo y su depreciación fiscal. El conteo del hato, los nacimientos, el valor razonable y el ganado común van en **Ganadería** y **Cultivos** (módulos de rubro), que publican eventos. Activos fijos no depende de ellos.

---

## 6. Decisiones del usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| D1 | ¿Uno o dos libros de depreciación? | a) Solo fiscal; b) contable y fiscal; c) los dos, con el contable igual al fiscal por omisión | **c**. La mayoría de las pymes usa las tasas fiscales en libros (aceptable si no es material). Quien audita con NIIF necesita el contable, y el diferido sale de la diferencia |
| D2 | ¿Desde cuándo se deprecia? | a) El mismo mes de inicio de uso, mes completo; b) el mes siguiente; c) por días | **a**, configurable por empresa. Sigue a NIIF 17.20 y no aplaza la deducción (art. 25) |
| D3 | ¿Un servicio puede ser activo fijo? (E1) | a) No, como hoy; b) sí | **b** (art. 26 ISR, art. 16 IVA y NIIF 17.10) |
| D4 | ¿Cómo entran las compras? | a) Activo automático por línea; b) bandeja «por capitalizar» donde se reparte y agrupa | **b** (E2) |
| D5 | ¿Umbral de capitalización? | a) Ninguno; b) monto por empresa, y lo menor va a gasto o a «bienes de control» sin depreciar | **b**. No hay umbral legal; es política de la empresa, fijada con su contador |
| D6 | ¿Revaluación y deterioro en v1? | a) No; b) solo deterioro; c) los dos | **a**. La revaluación tiene costo fiscal (ganancia de capital del 10 %); se deja para después |
| D7 | ¿Activos biológicos? | a) En este módulo, completos; b) aquí al costo, el resto en Ganadería y Cultivos | **b** |
| D8 | ¿Venta sin módulo de Ventas? | a) Registrar la venta con el FEL emitido afuera; b) esperar a Ventas | **a**, con concepto bancario de Inversión y aviso del ISR del 10 % y del IVA |
| D9 | ¿Arrendamientos? | a) Solo control de bienes de terceros; b) arrendamiento financiero completo | **a** en v1. El trato fiscal del arrendamiento financiero se discute (sentencia 194-2014). Certeza B |
| D10 | ¿Inventario físico con QR desde el teléfono en v1? | a) Sí; b) después | **a** si cabe: es lo que más ahorra en la finca y lo primero que pide el auditor |
| D11 | ¿Intangibles (software, licencias, marcas) en este módulo? | a) Sí, como clase con amortización; b) no | **a** (art. 33: mínimo 5 años) |
| D12 | ¿Se bloquea anular en el Libro de compras una factura ya capitalizada? | a) Bloquear; b) avisar y dejar el activo pendiente | **a**, igual que con las notas ligadas |

## 7. Preguntas que quedan abiertas (certeza B)

1. El rubro del SAT-2237 para un servicio de construcción o instalación capitalizado.
2. Si el software va con el equipo de computación (33.33 %) o como intangible (20 %).
3. El procedimiento de prorrata del IVA con ventas exentas.
4. Si el inciso 7 del art. 3 del IVA (faltantes) se aplica a la baja de activos fijos.
5. Si la tercera edición de la NIIF para las Pymes cambia las secciones 17 o 34, y si el Colegio de Contadores ya la adoptó.
6. Si la venta de ganado reproductor de descarte es ganancia de capital o renta de la actividad.

## Veredicto sobre lo que ya existe (P2: la línea marcada como activo fijo y el pago a Inversión)

**Correcto con ajustes**:
- E1: dejar que un servicio también sea activo fijo.
- E2: ligar los costos al activo (varios a varios) y crear la bandeja por capitalizar.
- E3: alta manual y saldos iniciales.
- E4: bloquear la anulación de una factura ya capitalizada.
- E5: venta con concepto de Inversión.

## Fuentes

- Decreto 10-2012, transcripción completa (arts. 21, 23, 25 a 33, 43 y 44, 84, 89, 91, 92, 95 y 96): https://es.slideshare.net/slideshow/decreto-102012leydeactualizaciontributaria/13941481
- Texto oficial (escaneado; no se pudo leer): https://www.congreso.gob.gt/assets/uploads/info_legislativo/decretos/2012/010-2012.pdf. Copia: https://www.icnl.org/wp-content/uploads/leydeacttrib.pdf
- Grow Up Auditores, arts. 25 a 29: https://growupauditores.com/blog/reglas-generales-de-depreciaciones-y-amortizaciones-en-guatemala-decreto-10-2012
- Vescco, art. 26, art. 28 y amortización: https://vescco.tax/blog/depreciaciones-y-amortizaciones-para-efectos-fiscales-en-guatemala/
- PwC Tax Summaries, Guatemala: https://taxsummaries.pwc.com/guatemala/corporate/deductions
- Ley del IVA, Decreto 27-92 (no se pudo leer el texto): https://www.tse.org.gt/images/UECFFPP/leyes/decreto_27-92-iva.pdf y https://www.icnl.org/wp-content/uploads/leyvat.pdf
- Art. 16 del IVA, activos fijos directamente vinculados: https://consortiumlegal.com/2024/04/02/robo-legal-del-credito-fiscal-en-el-iva-en-guatemala/ y el expediente 270-2006 de la Corte de Constitucionalidad: http://ww2.oj.gob.gt/es/QueEsOJ/EstructuraOJ/UnidadesAdministrativas/CentroAnalisisDocumentacionJudicial/cds/CDs%20revista%20juridica/Revista%20Juridica%2008-09/expedientes/270-2006.htm
- Decreto 18-2026 (IUSI y art. 87 del ISR): https://consortiumlegal.com/en/2026/09/03/guatemalas-iusi-reform-an-analysis-of-decree-18-2026/ y https://gt.vlex.com/vid/decreto-no-18-2026-1132954083
- Sentencia 194-2014 del Tribunal de lo Contencioso Administrativo (arrendamiento financiero y baja a valor en libros): https://gt.vlex.com/vid/sentencia-n-194-2014-1055749332
- Adopción de la NIIF para las Pymes en Guatemala (publicada el 13-jul-2010): https://iies.usac.edu.gt/wp-content/uploads/2021/06/bol11-2011.pdf y https://www.iasplus.com/en/binary/americas/1005niresolutionsme.pdf/at_download/file
- Tercera edición de la NIIF para las Pymes (IASB, 2025): https://www.ifrs.org/news-and-events/news/2025/02/iasb-issues-major-update-smes-accounting-standard/
- Del repositorio: `/home/aparada/proyectos/arrancar/.claude/worktrees/integracion/servidor/src/modulos/libro-de-compras/infraestructura/persistencia/lineas-de-documento.tablas.ts` (línea 94, check de E1), `/home/aparada/proyectos/arrancar/.claude/worktrees/integracion/servidor/src/modulos/libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.ts` (línea 29), `/home/aparada/proyectos/arrancar/.claude/worktrees/integracion/docs/modulos/investigacion-sat-2237-y-2046.md`, `/home/aparada/proyectos/arrancar/.claude/worktrees/integracion/docs/modulos/diseno-cp4-pagos.md`, `/home/aparada/proyectos/arrancar/.claude/worktrees/integracion/docs/HOJA-DE-RUTA.md`
- Sin enlace verificado, de memoria (certeza M): ISO (Decreto 73-2008, arts. 1, 7 y 8), Código de Comercio art. 368, Código Tributario arts. 47 y 112, Ley de Timbres (Decreto 37-92).
