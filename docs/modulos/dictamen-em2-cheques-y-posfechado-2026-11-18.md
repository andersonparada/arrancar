# Dictamen del contador sobre EM-2, la impresión de cheques y el cheque posfechado (18/11/2026)

Revisé los documentos `/home/aparada/proyectos/arrancar/.claude/worktrees/integracion/docs/modulos/diseno-em2-cierre-de-la-carga.md`, `diseno-impresion-de-cheques.md`, `dictamen-textos-legales-de-bancos-2026-11-18.md`, `informe-qa-intermedia-2026-11-18.md`, `diseno-cp5-reportes.md`, `dictamen-cp5-2026-11-15.md`, `diseno-cp4-pagos.md` y `dictamen-cp4-2026-11-13.md`. También revisé el código de `servidor/src/modulos/core/compartido/dominio/monto-en-letras.ts`.

**Fuentes y certeza.**
- **Código de Comercio (Decreto 2-70):** usé el texto de WIPO Lex (https://www.wipo.int/wipolex/en/legislation/details/2018). La certeza es alta en la letra y media-alta en la vigencia, por la misma razón que en el dictamen del 18/11: no pude abrir congreso.gob.gt.
- **Código Tributario:** Wikisource (https://es.wikisource.org/wiki/C%C3%B3digo_Tributario_de_la_Rep%C3%BAblica_de_Guatemala_(Decreto_Ley_6-91)). Es una fuente secundaria; certeza media.
- **Ortografía:** RAE.
- **NIIF:** IFRS Foundation y firmas de auditoría.

---

## Tema 1. Cierre de la carga inicial (EM-2)

### (a) Cuentas por pagar: ¿bastan avisos o conviene un «no cuadra»?

**Dice la ley.**
- El comerciante debe establecer su situación financiera «al iniciar sus operaciones» con un balance firmado por él y el contador (C. Com. art. 374).
- La contabilidad se lleva por partida doble y con principios de contabilidad generalmente aceptados (art. 368).
- El libro de inventarios lo autoriza el Registro Mercantil (art. 372).

La ley no exige que el auxiliar de proveedores cuadre en un sistema. **Es buena práctica:** el auxiliar debe cuadrar con la cuenta de control del mayor. Es el primer control que pide un auditor en una apertura.

| Punto | Dictamen |
|---|---|
| Solo avisos en EM-2, sin pedir motivo, mientras no haya con qué comparar | **Correcto.** No se puede pedir motivo por una diferencia que el sistema no puede medir. Exigirlo igual produciría motivos de relleno («ok», «revisado»), que restan valor a la auditoría |
| Aviso `sin_saldos_iniciales` | Correcto |
| Aviso `retenciones_por_practicar` | **Correcto, con un ajuste al texto.** La retención del ISR se practica al **pagar o acreditar en cuenta** (Ley de Actualización Tributaria, Decreto 10-2012, capítulo de retenciones; certeza media en el número de artículo, que no pude abrir en fuente oficial). Si la empresa ya acreditó la factura en su contabilidad antes de la fecha de inicio, la retención pudo haber nacido entonces: no estaría «por practicar», sino practicada y quizá sin enterar. Texto propuesto: «N documentos con retenciones por practicar por Q x. Verifique que no se hayan acreditado en cuenta antes del dd/mm/aaaa: si así fue, la retención ya debía practicarse y enterarse.» |
| Transcribir el saldo de proveedores del balance de apertura | **Lo recomiendo, pero en U8 y con migración, no en EM-2.** Hay que hacerlo bien: **dos cifras y no una neta.** Proveedores es un pasivo; los anticipos y saldos a favor son un activo, y la NIIF para Pymes no permite compensarlos (2.52 y 11.38A). Además, hay que decir qué incluye la cifra del balance, porque las retenciones por practicar todavía son parte de lo que se debe al proveedor. Con el dato capturado, una diferencia `no_cuadra` pide motivo. Sin el dato, `sin_dato_del_balance` solo avisa |

**Hallazgos adicionales que conviene agregar como avisos (buena práctica).**
1. Documentos del Libro de compras emitidos antes de la fecha de inicio que no son saldo inicial. Es el hallazgo O-4 del dictamen de CP5: pueden contar dos veces o faltar en la apertura.
2. Proveedores con saldo neto a favor de la empresa. Deben ir como anticipo en el activo del balance de apertura.

### (b) Fecha de inicio que no es día 1

**Correcto que solo avise.**
- Ninguna ley obliga a que el sistema arranque un día 1.
- Pero el IVA se declara por mes y el Libro de compras es mensual. Si se arranca a mitad de mes, la declaración de ese mes mezcla lo registrado en el sistema con lo de fuera.
- El texto del aviso debe decirlo así: «El mes de mm/aaaa queda partido: las compras del 1 al dd no están en el Libro de compras de Arrancar; la declaración de ese mes debe sumarlas.»
- **Mi opinión:** lo ideal es iniciar el día 1 de un mes, con el balance al último día del mes anterior. Mejor aún al 1 de enero, porque el periodo del ISR es anual.

### (c) Cerrar con diferencias, con motivo y auditoría: ¿es control suficiente?

**Es control suficiente para esta etapa, con tres ajustes.** Es un control detectivo razonable sin Contabilidad. El control de fondo, que es el cuadre del auxiliar contra el mayor, lo hace hoy el contador externo fuera del sistema.

| # | Ajuste | Por qué |
|---|---|---|
| 1 | **Conservación.** Las entradas de `empresas.cargas-iniciales` (cerrar y reabrir) no deben depurarse a los 60 meses: deben guardarse mientras exista la empresa | La SAT tiene 4 años para verificar y ajustar (Código Tributario art. 47), contados desde el vencimiento de la obligación de pagar (art. 49). Un cierre de enero del año X respalda el ISR del año X, que vence el 31/03 de X+1. La prescripción llega entonces al 31/03 de X+5, pero la entrada se borraría en enero de X+5, antes de ese plazo. Además, el art. 50 permite interrumpir la prescripción. Son pocas filas. Es un cambio para `arquitecto-de-datos`: excepción por recurso en `core.depurar_auditoria` o conservación propia por recurso |
| 2 | **Que se vea.** Después de cerrar, la sección de carga inicial debe mostrar «Cerrada el dd/mm/aaaa por X con N diferencias: [motivo]» y dejar consultar o exportar la revisión auditada | Una diferencia que queda enterrada en `core.auditoria` nadie le da seguimiento. Cuando exista Contabilidad, irá a la cuenta puente |
| 3 | **Qué se guarda.** Además de los hallazgos, guardar las **cifras del cuadre** de cada módulo (el resumen numérico) | Ante una revisión importa la cifra cerrada, no solo el texto del aviso |

**¿Sirve como respaldo ante una revisión?** Sirve como rastro: quién cerró, cuándo, qué diferencias había y por qué. **No sustituye el respaldo primario:**
- el balance o inventario de apertura firmado por el comerciante y el contador (art. 374) y asentado en el libro autorizado (art. 372);
- los documentos fuente (facturas pendientes, estados de cuenta).

El comerciante debe conservar sus documentos «no menos de cinco años» (C. Com. art. 382). **Mi opinión:** el respaldo mejora mucho si se puede adjuntar a la carga el PDF del balance de apertura firmado. Ya existe el revisor de PDF (qpdf). Es una decisión de producto.

### Decisiones del usuario (Tema 1)

| Pregunta | Opciones | Recomendación |
|---|---|---|
| ¿Se transcribe en U8 el saldo de proveedores y de anticipos del balance de apertura? | (a) Sí, más adelante, con dos cifras; (b) no | **(a)**, fuera de EM-2 |
| Sin ese dato, ¿se avisa o se pide motivo? | Aviso / pide motivo (como hace Bancos) | **Aviso.** Bancos pide motivo porque el efectivo es más delicado |
| ¿Se conservan sin depurar las auditorías de cierre y reapertura? | Para siempre / 60 meses | **Para siempre** |
| ¿Se puede adjuntar el balance de apertura firmado? | Sí / no | Sí (producto) |

**Doy por validado:** solo avisos en Cuentas por pagar dentro de EM-2; que el día 1 solo avise; que no se bloquee el cierre hasta que exista Contabilidad; que el motivo sea opcional cuando nada lo pide; la huella (P-4 a); y que la revisión la vea solo quien puede cerrar (P-2 a).

---

## Tema 2. Impresión de cheques

### 2.1 Requisitos del cheque frente a lo que imprime el sistema

| Requisito | Fuente | Quién lo pone | Dictamen |
|---|---|---|---|
| Nombre del título («cheque») | Art. 386, 1.º | Formulario del banco | Bien |
| Fecha y lugar de creación | Art. 386, 2.º (sin lugar, vale el domicilio del creador) | El sistema | Bien |
| Orden incondicional de pagar una suma determinada | Art. 495, 1.º | Leyenda impresa por el banco («Páguese…») más el monto del sistema | Bien |
| Lugar y fecha de cumplimiento | Art. 386, 4.º; art. 501 (siempre a la vista) | Banco y ley | Bien |
| Nombre del banco librado | Art. 495, 2.º | Formulario | Bien |
| Firma de quien lo crea | Art. 386, 5.º | Manuscrita o según el contrato con el banco | **Correcto que el sistema no la ponga** |
| Formulario del banco | Art. 494: un cheque librado fuera de los formularios del banco «no producirá efectos de título de crédito» | — | Correcto: el sistema solo imprime sobre el papel del banco. La prueba en hoja blanca «PRUEBA — SIN VALOR» está bien |
| Beneficiario | Art. 497: sin nombre se reputa al portador | El sistema | Nunca imprimir sin beneficiario, por bancarización y control (ya decidido en C-CP4-2) |

**Ajustes.**
1. **Relleno también después del beneficiario** (asteriscos o guiones hasta el final del renglón). Así nadie agrega «o al portador» ni «y/o».
2. **Imprimir solo lo de la tabla.** Nada como «posfechado» o «páguese a partir de». El art. 501 dice: «Cualquier anotación en contrario, se tendrá por no puesta».
3. **Revisar la remisión del art. 495.** En WIPO el art. 495 dice «Además de lo dispuesto por el artículo **388**». Por lógica debería ser el 386 (requisitos generales). Hay que cotejarlo en el texto oficial antes de citarlo en la app (certeza media).

### 2.2 Monto en letras y en cifras

- **La ley:** si letras y cifras difieren, vale lo escrito en letras; si el monto aparece varias veces con diferencias, vale el menor (art. 388).
- **La ortografía:** las mayúsculas llevan tilde (RAE, https://www.rae.es/duda-linguistica/las-mayusculas-se-tildan). DIECISÉIS, VEINTIDÓS, VEINTIÚN y MILLÓN van con tilde.
- **Lo demás es práctica**, no ley.

| Punto | Dictamen |
|---|---|
| Mayúsculas, «… QUETZALES CON 25/100» | Correcto (práctica bancaria guatemalteca) |
| `montoEnLetras` actual | Lo revisé y es **correcto**: «un quetzal», «veintiún», «ciento un», «cien», «un millón de quetzales» en millones exactos, «dos millones», «mil» sin «un». No hay que tocarlo. «MIL» sin «UN» es correcto; «UN MIL» es costumbre, no obligación |
| Relleno de asteriscos al final del texto | Correcto |
| Partir en dos renglones entre palabras | Correcto. **Ajuste:** el hueco que queda al final del primer renglón también se rellena con asteriscos, y el texto empieza pegado al margen izquierdo del campo, para que no se pueda anteponer nada |
| `MontoEnLetrasNoCabe` y no cortar | Correcto, indispensable |
| `Q**1,120.00` con asteriscos a la izquierda y pegado al borde derecho | Correcto |
| Pruebas de IC-2 | Agregar 21, 21,000, 1,000,001 y 1,500,000 |

### 2.3 «NO NEGOCIABLE»

**Artículo exacto.** Art. 498: «En los cheques cualquier tenedor podrá limitar su negociabilidad, estampando en el documento la cláusula: no negociable.» Su efecto (art. 499): el cheque solo puede endosarse a un banco para su cobro.

**Si lo puede poner quien emite.** La letra dice «tenedor» y no nombra al librador. **Mi opinión** (certeza media): el librador sí puede ponerlo, porque antes de entregar el cheque es su primer poseedor, y en Guatemala los bancos lo aceptan. Lo que es seguro es que el beneficiario también puede ponerlo.

**Dónde va.** La ley no fija un lugar («en el documento»). **Buena práctica:** en el **anverso**, legible, cerca del beneficiario o arriba. No sobre la banda magnética ni sobre la zona de firma.

**Qué protege y qué no.** No impide que el beneficiario cobre en ventanilla. No es lo mismo que las alternativas:

| Leyenda | Artículo | Efecto | ¿Ofrecerla? |
|---|---|---|---|
| No negociable | 498–499 | Solo se endosa a un banco para cobro | Sí, ya decidido; verdadero por omisión |
| **Para abono en cuenta** | 521: «El librador o el tenedor pueden prohibir que el cheque sea pagado en efectivo» (lo nombra expresamente) | Solo se acredita en una cuenta del tenedor; el banco puede negarse a pagar si el tenedor no tiene cuenta (art. 522) | **Recomiendo ofrecerla** como casilla opcional por cheque, falsa por omisión. Es el control más fuerte contra cobros por terceros |
| Cruzado | 517–518: dos líneas paralelas en el anverso; solo lo cobra un banco | Parecido al anterior | Es un trazo, no un texto. Si se ofrece, como dibujo en el formato. Lo dejaría para después |

Si el formulario del banco ya trae «NO NEGOCIABLE» impreso, la plantilla debe poder ocultar el campo para no duplicarlo.

### 2.4 Cheque inutilizado (formulario arruinado)

**Pasar el pago al siguiente número sin anular el pago es correcto.** El pago es el mismo hecho económico: mismo monto, fecha, beneficiario y deuda extinguida. Lo único que cambia es el papel. Anular el pago y rehacerlo dejaría un rastro falso.

Condiciones y control interno (buena práctica):

| # | Control |
|---|---|
| 1 | Antes de inutilizar, confirmar «El formulario N está en poder de la empresa y no se firmó ni se entregó». Si salió de la custodia, **no es inutilizado: es extraviado**, y se trata como anulación con aviso al banco (la cancelación y reposición de títulos tiene su propio procedimiento) |
| 2 | Conservar el papel físico, cruzado con «ANULADO» y con la zona de firma recortada, archivado con el comprobante de egreso. Nunca botarlo |
| 3 | Reporte de correlativos por chequera (emitidos, anulados, inutilizados, disponibles) y conteo periódico del papel en blanco por alguien distinto de quien emite (segregación de funciones) |
| 4 | Si el comprobante de pago de CP4 ya se entregó con el número viejo, avisar que debe reimprimirse |
| 5 | Auditoría con los dos números (ya está en el diseño) |

### 2.5 Comprobante de egreso

El contenido y las firmas propuestos (Elaboró, Revisó, Autorizó, Recibí conforme con nombre, DPI y fecha) son **correctos** para el archivo. La ley no fija un formato: lo pide la práctica, para cumplir el art. 382. Ajustes:

1. Agregar el **detalle de retenciones** (viene con la opción A de §4).
2. Agregar una sección **«Aplicación contable»** (cuenta, debe, haber). Por ahora puede ir vacía para llenar a mano; se llenará cuando exista Contabilidad. Es lo primero que busca un auditor en un voucher.
3. La leyenda «Documento interno de control; no es un documento tributario» no la exige la ley, pero es **buena práctica**: evita que se confunda con un DTE. Validada.
4. «Recibí conforme» prueba la entrega. El pago se prueba con el cobro del cheque (salvo buen cobro, arts. 408 y 410).

### 2.6 Cheque posfechado impreso con su fecha real

**Correcto y obligatorio.** La fecha impresa debe ser la misma que la registrada. Si no lo es, el documento y el registro se contradicen. Igual, el banco lo paga al presentarlo (art. 501, ya dictaminado). **Sugerencia:** que el formato acepte también la fecha en números (dd/mm/aaaa), porque muchos formularios traen casillas para día, mes y año.

### Decisiones del usuario (Tema 2)

| Pregunta | Opciones | Recomendación |
|---|---|---|
| ¿Se ofrece «PARA ABONO EN CUENTA» (art. 521)? | Casilla por cheque / no | **Sí, casilla opcional, falsa por omisión** |
| ¿Cruzado dibujado? | Ahora / después / nunca | Después |
| ¿Relleno después del beneficiario? | Sí / no | **Sí** |
| ¿Sección «Aplicación contable» en el comprobante? | Vacía ahora / cuando exista Contabilidad | Vacía ahora |
| ¿Confirmar «el formulario está en la empresa» antes de inutilizar? | Sí / no | **Sí** |

**Doy por validado:** P-1 (las tres acciones), P-2 (A), P-3, P-5, P-7, P-8 y P-9; las reglas de letras y cifras; `montoEnLetras` tal como está; la fecha real del posfechado; «no negociable» por omisión; y la leyenda del comprobante. Para el Código de Comercio sigue vigente el cotejo con el CENADOJ que pedí el 18/11.

---

## Tema 3. «Dos verdades» con un cheque posfechado

### Qué está bien y qué está mal

| Pantalla | Hoy | Dictamen |
|---|---|---|
| R1 y R3: cargo 2,240 y neto 1,904 al corte | Pasivo vigente hasta la fecha del cheque | **Correcto.** NIIF para Pymes 11.36: la deuda se da de baja cuando se extingue. El cheque se recibe salvo buen cobro y no extingue la deuda de origen (C. Com. arts. 408 y 410). Lo refuerza la reforma de NIIF 9 de 2024, vigente desde 2026: excluye expresamente los cheques de la baja anticipada (https://www.bdo.co.uk/en-gb/insights/audit-and-assurance/financial-reporting-solutions/amendments-to-ifrs-9-on-derecognition-of-financial-liabilities, https://www.ey.com/en_my/technical/ifrs-technical-resources/ifrs-9-amendments-derecognition-of-financial-assets-and-liabilities). Esa reforma es de NIIF completas, no de Pymes, pero confirma el criterio |
| R2: «Pagado en parte» con «Pagado Q 0.00» | — | **Incorrecto.** El estado contradice su propia columna. Debe decir «Comprometido» |
| Ficha del proveedor «Por pagar Q 0.00» y documento con «saldo 0.00» | — | **El cálculo está bien, el rótulo no.** Ese 0.00 es lo **disponible para pagar**, no la deuda. «Por pagar» y «saldo» significan deuda. Ver 0.00 cuando se deben Q 2,240 es una afirmación falsa para el proveedor, el auditor o el banco |
| Ficha del proveedor «Vencido Q 0.00» | — | **Incorrecto** si el documento está vencido. Un cheque posfechado no quita el vencimiento, y R5 tampoco lo quita |

### La verdad única

**La deuda (el saldo) es siempre la de R1.** En operación se muestra al lado, con su nombre, lo **comprometido** y lo **disponible para pagar**. Es la misma regla de `diseno-cp5-reportes.md` §2.1, extendida a las pantallas de operación.

**Ficha del proveedor:**

| Por pagar | Q 2,240.00 |
|---|---|
| de lo cual, comprometido con cheques posfechados | Q 2,240.00 (cheque N, 20/12/2026) |
| Disponible para pagar | Q 0.00 |
| Vencido | según su «Vence» (igual que R5) |
| A favor de la empresa | Q 336.00 |

**Lista y ficha del documento:**
- Columnas: **Saldo 2,240.00**, **Disponible 0.00**, etiqueta **«Comprometido — cheque al 20/12/2026»**.
- El selector de pagos sigue usando lo disponible. La protección contra el doble pago no cambia.

**Estados de pago, iguales en la lista, la ficha y R2.** R2 los calcula al corte:

| Estado | Regla |
|---|---|
| Pendiente | Sin nada pagado ni comprometido |
| Pagado en parte | Pagado > 0 y queda disponible > 0 |
| Comprometido en parte | Pagado = 0, comprometido > 0 y queda disponible > 0 |
| Comprometido | Saldo > 0 y disponible = 0 (cubierto con posfechados, haya o no algo pagado) |
| Pagado | Saldo = 0 |

Si se prefiere no agregar un quinto estado, «Pagado en parte» se rotula **«En parte (pagado o comprometido)»**. Lo que no puede quedar es «Pagado en parte» con Pagado 0.00.

**Verificación pendiente.** Hay que confirmar que R1 muestre de verdad las columnas «Comprometido» y «Disponible para pagar» del diseño. El informe de QA solo menciona el neto. En este caso el disponible neto da −336.00, que es el saldo a favor.

### ¿Cambia algo de lo ya dictaminado?

- **No cambia lo contable.** Siguen igual C-CP4-1, el dictamen 5 de CP5 (cobro anticipado) y la regla `pagos.fecha <= corte`.
- **Cambia la presentación.** En `diseno-cp4-pagos.md` §2.4, el campo `saldo` (que resta lo comprometido) debe **mostrarse como «Disponible para pagar»** y no como «saldo» ni «por pagar». Hay que agregar el saldo de deuda y corregir el estado `en_parte` de R2.
- Para `arquitecto-de-datos`: es un cambio de DTO y de presentación, sin migración. El DTO del documento y el resumen del proveedor ganan `saldo` (deuda), `comprometido` y `disponible`. La prueba `cuentas-por-pagar-qa-intermedia.api.prueba.ts` debe cambiar con la corrección.
- **Matiz que dejo anotado (opinión, sin cambio ahora):** con el mismo criterio, un cheque con fecha de hoy tampoco extingue la deuda hasta que se cobra. Para Pymes, la práctica aceptada es darlo por pagado al entregarlo. No propongo cambiarlo.

### Decisiones del usuario (Tema 3)

| Pregunta | Opciones | Recomendación |
|---|---|---|
| ¿Qué cifra es «Por pagar» o «Saldo» en operación? | (a) La deuda, como R1, con comprometido y disponible al lado; (b) la de hoy (disponible) con una nota | **(a)** |
| ¿Estados de pago? | Cinco estados / cuatro con «En parte (pagado o comprometido)» | Cinco |
| ¿«Vencido» en la ficha cuenta lo comprometido? | Sí, como R5 / no | **Sí**, con la nota de lo comprometido |

**Doy por validado:** el trato contable de R1, R2 y R3 al corte. Lo único que está mal es la etiqueta del estado en R2, más los rótulos y cifras de la ficha y la lista.

---

## Fuentes
- Código de Comercio, Decreto 2-70 (arts. 368, 372, 374, 382, 386, 388, 408, 410, 494, 495, 497, 498, 499, 501, 517, 518, 521, 522): https://www.wipo.int/wipolex/en/legislation/details/2018
- Código Tributario, arts. 47, 49 y 50: https://es.wikisource.org/wiki/C%C3%B3digo_Tributario_de_la_Rep%C3%BAblica_de_Guatemala_(Decreto_Ley_6-91)
- Decreto 10-2012, texto completo (no pude extraer los artículos de retenciones; certeza media): https://www.icnl.org/wp-content/uploads/leydeacttrib.pdf
- RAE, tilde en mayúsculas: https://www.rae.es/duda-linguistica/las-mayusculas-se-tildan y https://www.rae.es/espanol-al-dia/tilde-en-las-mayusculas
- Reforma de NIIF 9 de 2024 (los cheques quedan fuera de la baja anticipada): https://www.bdo.co.uk/en-gb/insights/audit-and-assurance/financial-reporting-solutions/amendments-to-ifrs-9-on-derecognition-of-financial-liabilities y https://www.ey.com/en_my/technical/ifrs-technical-resources/ifrs-9-amendments-derecognition-of-financial-assets-and-liabilities

## Veredictos
- **EM-2: correcto con ajustes.** Conservar sin depurar las auditorías de cierre y reapertura; mostrar después del cierre las diferencias y el motivo; guardar las cifras del cuadre; cambiar el texto del aviso de retenciones. La transcripción del saldo del balance queda para U8.
- **Impresión de cheques: correcto con ajustes.** Relleno después del beneficiario y en el primer renglón de las letras; casilla opcional «para abono en cuenta»; confirmar que el formulario está en la empresa antes de inutilizarlo, conservar el papel y reporte de correlativos; «Aplicación contable» y retenciones en el comprobante; cotejar la remisión del art. 495.
- **Posfechado: lo contable es correcto; la presentación es incorrecta.** Hay que unificar «Saldo / Comprometido / Disponible» en las pantallas de operación y corregir el estado de R2.
