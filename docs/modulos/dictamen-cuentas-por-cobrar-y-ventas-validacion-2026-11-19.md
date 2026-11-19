# Dictamen del contador: validación de los puntos V-1 a V-12 y de las respuestas VC-P1 a VC-P24 (Libro de ventas y Cuentas por cobrar), 2026-11-19

_Agente `contador-guatemala`. Guardado por el arquitecto de datos el 2026-11-19 tal como lo entregó el contador; lo que
cambia en el diseño está en `diseno-cuentas-por-cobrar-y-ventas.md`, «Validación del contador (2026-11-19)»._

**Documento revisado:** `docs/modulos/diseno-cuentas-por-cobrar-y-ventas.md` (en main), §17 y §18. Lo comparé con el
dictamen del 2026-11-18 (`docs/modulos/dictamen-cuentas-por-cobrar-y-ventas-2026-11-18.md`) y con lo que ya se validó en
el repositorio (`validacion-h7-h11-retenciones.md`, `libro-de-compras.md`, `diseno-datos-libro-de-compras.md`,
`dictamen-caja-chica-v12-v13-v8-v3-2026-11-18.md` y `dictamen-bancos-aprobaciones-tarjeta-2026-11-18.md`).

**Marcas:** [Ley] es norma. [SAT] es el portal o un comunicado de la SAT. [Práctica] es lo que hacen las firmas y los ERP.
[Opinión] es mía. **Certeza:** A (alta), M (media), B (baja).

**Limitación:** no pude leer en texto íntegro la Ley del IVA (el PDF del TSE llegó en binario y no hay `pdftotext`), el
Decreto 20-2006 ni el AG 5-2013. Lo que depende de esos textos va con certeza M o B y queda «por confirmar».

---

## 1. Resumen del dictamen

| # | Punto | Dictamen |
|---|---|---|
| V-1 | FESP recibida por la empresa como vendedora | **Corregir** (en parte pendiente) |
| V-2 | Mes de aplicación de la retención de IVA y del 5 % del pequeño contribuyente | **Correcto con ajustes** |
| V-3 | ¿Al agente de IVA le retienen el sector público o la tarjeta? | **Pendiente** (con regla provisional) |
| V-4 | Régimen agropecuario, primario, pecuario y no afiliado al vender | **Corregir** |
| V-5 | Nota de abono (NABN) | **Correcto con ajustes** |
| V-6 | Datos para el ISR mensual del opcional simplificado | **Corregir** (en la regla de cálculo) |
| V-7 | Cheque rechazado con la retención ya aplicada | **Correcto** |
| V-8 | Retención y comisión de la liquidación de tarjeta | **Corregir** |
| V-9 | Nota de crédito sobre una factura de un período ya declarado | **Correcto con ajustes** |
| V-10 | Uno o dos libros habilitados | **Corregir** (para los regímenes que no son el general) |
| V-11 | Plazo para anular un DTE | **Correcto con ajustes** (el plazo ya está identificado) |
| V-12 | Recuperación de un castigo | **Correcto con ajustes** |

**Recomendaciones aceptadas que tienen error o necesitan ajuste:** VC-P8, VC-P10 (modelo de la tarjeta), VC-P13, VC-P23
y VC-P24. Hay dos hallazgos más: la retención sobre notas de crédito y de débito, y el remanente de retenciones (§3).

---

## 2. Dictamen de cada V-

### V-1. FESP recibida por la empresa como vendedora. **Corregir** (en parte pendiente)

| Pregunta | Respuesta | Fuente | Certeza |
|---|---|---|---|
| ¿En qué lista de la SAT aparece? | En la FESP el **emisor es el comprador** y el **receptor es el vendedor**. Por eso le aparece a la empresa vendedora en **«Recibidos»**, y al comprador en «Emitidos». El diseño lo resuelve bien: bloquearla en la bandeja de recibidos de compras (`factura_especial_de_venta`) y registrarla en ventas. | [Ley] Ley del IVA art. 52. [SAT] El repositorio ya registró el riesgo «FESP en emitidos» del lado del comprador (`validacion-h7-h11-retenciones.md`, L4). | M-A |
| ¿Es su constancia? | Sí: la copia de la FESP sirve como constancia de retención. | [Ley] art. 52, reformado por el Decreto 4-2012 (cita en `dictamen-caja-chica-v12-v13-v8-v3`) | M-A |
| ¿Declara el débito y acredita el 100 %? | **No lo propongo así.** El comprador retiene y entera el 100 % del IVA (SAT-2085). Si el vendedor declara el débito y acredita el mismo monto, el resultado es cero, pero infla «débito» y «retenciones» en el SAT-2237 y descuadra contra lo que la SAT prellena. Lo correcto es **no llevarla al débito ni a las retenciones acreditables**: el libro la muestra en una columna propia, «Ventas con factura especial (IVA retenido en su totalidad)», y las dos retenciones quedan como **definitivas e informativas**. | [Ley] art. 52; [Opinión] | M |
| ¿Procede la FESP a una empresa inscrita? | **Por regla general, no.** La FESP sustituye la factura del vendedor que no factura. Si la empresa está inscrita en el IVA (general, pequeño contribuyente, primario o pecuario), debe emitir su propia factura. Las salvedades son la negativa del vendedor del art. 52 y el caso de los exportadores agropecuarios de la sentencia de la CC. El único caso normal en Arrancar es una empresa `no_afiliado` (persona individual sin inscripción). | [Ley] art. 52; [La Hora, CC](https://lahora.gt/opinion/wpcomvip/2014/08/04/sentencia-de-la-cc-relacionada-con-facturas-especiales-para-productores-agropecuarios-y-artesanales/) | M |
| ISR retenido en la FESP para una empresa sobre utilidades | **Pendiente.** Para la persona individual sin inscripción el 5 % es único y definitivo. Para una empresa sobre utilidades no confirmé si se acredita a los pagos trimestrales. | Decreto 10-2012 art. 16, reformado por el Decreto 4-2019 | B |

**Cómo corregirlo (para `arquitecto-de-datos`):**
- En `factura_especial_recibida`, las retenciones van con `origen = 'factura_especial'`, fuera de la cifra «retenciones
  aplicadas al período» de `cifras_para_la_declaracion`.
- El documento va fuera del débito, con columna propia en el libro.
- Aviso «Su empresa está inscrita en el IVA: debe emitir su propia factura (Ley del IVA art. 52). Revise con su
  contador.» en todo régimen distinto de `no_afiliado`.
- El ISR de la FESP en empresa sobre utilidades queda «informativo, pendiente de confirmar».

### V-2. Mes de aplicación de la retención recibida. **Correcto con ajustes**

| Retención | Mes | Fuente | Certeza |
|---|---|---|---|
| IVA de agente (exportador, especial, sector público, tarjeta) | **El de la constancia.** El agente retiene al pagar o al acreditar (registrar la deuda), y su constancia lleva esa fecha. Del lado de compras Arrancar ya la fecha en la **recepción** de la factura. El vendedor la acredita en el SAT-2237 de ese mes. | [Ley] Decreto 20-2006; AG 425-2006 art. 10 (ya usado en `libro-de-compras.md`); [Práctica] | M |
| 5 % del pequeño contribuyente | El de la constancia, restado en el SAT-2046 de ese mes. | Ley del IVA art. 48; AG 5-2013 art. 49 | M |
| ISR del opcional simplificado | **El de la factura** (la constancia lleva la fecha de la factura). | Decreto 10-2012 art. 48 | M-A |

**Ajustes:**
1. **Remanente de retenciones.** Si las retenciones del mes pasan del débito, lo que sobra **se traslada al mes
   siguiente** (o se pide en devolución) y **no se mezcla con el remanente del crédito fiscal**. La foto de la
   declaración (§3.3) debe guardar aparte «retenciones del período», «remanente de retenciones del período anterior» y
   «remanente al siguiente». Lo mismo vale para el saldo de constancias del pequeño contribuyente en el SAT-2046.
   [Práctica] [Confirmar la casilla del SAT-2237 con una captura real]
2. Si el mes de la constancia ya está declarado, el diseño no debe proponer el «primer período abierto» como en el
   crédito del art. 20. Debe avisar: «La constancia es de un período declarado: rectifíquelo o decida con su contador».
   [Opinión]
3. Una retención **esperada** (todavía sin constancia) no entra en las cifras de IVA de la declaración: solo la que tiene
   constancia. Para el ISR es distinto (ver V-6).

### V-3. ¿Al agente de IVA le retienen igual el sector público o la tarjeta? **Pendiente**

- **Lo que está confirmado:** entre agentes no se retiene (Decreto 20-2006, art. 9, ya aplicado en compras) [M].
- **Lo que no pude confirmar:** si el art. 9 o el reglamento exceptúan al **sector público** y a las **operadoras de
  tarjeta**. Las fuentes secundarias no lo transcriben
  ([Prensa Libre](https://www.prensalibre.com/opinion/columnasdiarias/retenciones-del-iva-origen-y-revision-necesaria/),
  [Deloitte Tax Alert 21-08](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%20-%2021-08.pdf)).
  Recuerdo, con certeza baja, que la tarjeta retiene a todos los afiliados.

**Regla provisional (correcta con lo que se sabe):**
- No proponer retención de IVA a la empresa agente.
- Permitir registrarla como **informada**. Con `sector_publico` o `iva_tarjeta`, **no** marcarla como `es_indebida`;
  avisar «Verifique si procede: entre agentes no se retiene, salvo excepciones por confirmar».

Para cerrarlo hace falta el texto del Decreto 20-2006 (arts. 2 a 10) y del AG 425-2006, o una liquidación real de tarjeta
de una empresa agente.

### V-4. Regímenes agropecuario, primario, pecuario y no afiliado. **Corregir**

**El diseño (§3.4, §5.3 y VC-P24) trata como vigentes dos regímenes derogados.** El Decreto 31-2024 derogó los arts. 54
«A» a «F» de la Ley del IVA. Con ellos cayeron el **contribuyente agropecuario** y el **pequeño contribuyente
electrónico**, alrededor del 9-07-2025. Ya está documentado en `validacion-h7-h11-retenciones.md` y existe la variable
`libro-de-compras.regimenes.fecha_de_derogacion`.

| Régimen | Qué corresponde al vender | Fuente | Certeza |
|---|---|---|---|
| `contribuyente_agropecuario` y `pequeno_contribuyente_electronico` (y el SAT-2241) | **Solo para períodos anteriores a la derogación.** Si en un mes posterior la empresa tiene ese régimen, es error de datos: bloquear el registro (o avisar fuerte) con «Ese régimen fue derogado por el Decreto 31-2024; actualice los datos fiscales». No se calcula impuesto (histórico). | Decreto 31-2024; R2-a del repositorio | M-A |
| `primario_pecuario` | Impuesto a la Confianza Tributaria (**ICT**): **1.5 % de las ventas brutas**, pago definitivo; **2 %** en ciertas exportaciones; **10 % del margen** para los intermediarios de bovinos (régimen pecuario). Declaración **mensual** y una informativa anual. Admite **personas jurídicas**. El comprador no retiene, salvo quien emite la FEPE estando afiliado al ICT. | [Consortium Legal, 2026-04-24](https://consortiumlegal.com/en/2026/04/24/the-law-on-the-integration-of-the-primary-and-agricultural-sectors-in-guatemala-is-now-in-effect/); AG 54-2026 vigente desde el 28-04-2026 | M |
| Libro de primario y pecuario | **Un solo libro electrónico de compras y ventas habilitado por la SAT.** Ya no se admite manual ni computarizado (Decreto 31-2024, art. 7, inciso e). El libro en PDF con folios de Arrancar **no** es el libro legal: es un auxiliar. | [Prensa Libre, «Libro electrónico para los nuevos regímenes»](https://www.prensalibre.com/opinion/columnasdiarias/libro-electronico-para-los-nuevos-regimenes/) | M |
| `no_afiliado` | Sin inscripción no emite facturas: vende con RECI o le emiten FESP (ver V-1). Columna de ingresos sin débito. | Ley del IVA art. 52 | M |

**Cómo corregirlo:**
- (a) Leer `fecha_de_derogacion` también en ventas.
- (b) Para `primario_pecuario`, separar en las cifras del mes las ventas locales, las exportaciones y, si es intermediario
  de bovinos, el margen. Proponer el ICT con tasas de configuración de instalación (`libro-de-ventas.ict.tasa_general` =
  1.5, `…tasa_exportacion` = 2, `…tasa_margen_bovino` = 10), aunque el cálculo llegue en LV-5 o después.
- (c) El libro de esos regímenes dice «Auxiliar: el libro legal es el electrónico de la SAT» y no se emite con folios.

### V-5. Nota de abono (NABN). **Correcto con ajustes**

- **Correcto:** la NABN **no** rebaja el débito. Solo baja el saldo del cliente. La Ley del IVA art. 17 reserva la rebaja
  del débito a la **nota de crédito** (descuentos, devoluciones y anulaciones) [SAT/Práctica, M].
- **Cantidad y monto de operaciones del SAT-2237:** no debe contar, porque no modifica el impuesto [Opinión, M; confirmar
  con una captura del formulario].

**Ajustes:**
1. La NABN va en un **anexo** del libro, fuera de los totales, igual que en compras van los anulados.
2. Aviso al registrarla: «Si es un descuento o una devolución, use nota de crédito: la nota de abono no rebaja el IVA
   (art. 17)».
3. Contablemente es un abono a Clientes contra la cuenta que corresponda (bonificación, gasto). El evento de §10.3 ya lo
   prevé.

### V-6. Datos para el ISR mensual del opcional simplificado. **Corregir** (en la regla de cálculo)

| Punto | Qué dice | Fuente | Certeza |
|---|---|---|---|
| Base y mes | Rentas del **mes de emisión** de las facturas, sin IVA. El SAT-1311 informa las rentas totales, las exentas y las que tuvieron retención. | Decreto 10-2012 arts. 44 a 49; [SAT, SAT-1311](https://portal.sat.gob.gt/portal/requisitos-tramites-agencias/devolucion-acreditamiento-o-compensacion-del-isr-opcional-mensual-sat-1311/) | M-A |
| Pago directo | Lo no sujeto a retención se paga en los **10 días hábiles del mes siguiente** a la emisión, con el SAT-1311 (desde el 2-06-2026, solo en la Agencia Virtual). | [SAT](https://portal.sat.gob.gt/portal/preguntas-frecuentes/cumplimiento-tributario/); [La Hora](https://lahora.gt/lh-economia/hloarca/2026/03/12/desde-el-2-de-junio-de-2026-sera-obligatorio-que-estos-contribuyentes-utilicen-la-agencia-virtual-de-sat/) | M-A |
| Tasa | 5 % hasta Q30,000 y 7 % del excedente | art. 44 | A |

**El error del diseño:** el §7.6 dice «retenciones de ISR recibidas de facturas del mes y la parte no retenida». Si se
calcula con las retenciones **descontadas** o **con constancia**, sale mal. El agente retiene al **pagar o acreditar**, y
la constancia lleva la fecha de la factura. Pero el cliente a crédito suele pagar después del día 10 del mes siguiente,
así que al declarar todavía no hay descuento.

**Lo correcto:** clasificar cada factura del mes como «**sujeta a retención**» si tiene una retención ISR vigente
(esperada, informada o con constancia) **y** su base pasa del mínimo. Las demás van a «**pago directo**». Sobre la suma de
pago directo del mes se aplica 5 % / 7 % [Confirmar si el tramo de Q30,000 se aplica al total mensual o factura por
factura; recomiendo al total mensual, que es lo que hace el SAT-1311].

**Avisos que faltan:**
- Factura de un cliente agente sin constancia al cierre: «Si el cliente no retiene, usted debe pagar ese ISR (con multa e
  intereses si ya venció)».
- Retención informada sobre una factura que se declaró como pago directo: posible pago doble, «rectifique o pida la
  devolución».

### V-7. Cheque rechazado con la retención aplicada. **Correcto**

La retención nace cuando el agente **paga o acredita**, no cuando se cobra el cheque. Si el cliente acreditó la factura y
emitió la constancia, la retención existe y el vendedor la acredita aunque el cheque rebote. El cliente solo debe el neto:
total menos retención (Decreto 20-2006; Decreto 10-2012 art. 48) [M-A].

Mantener las retenciones aplicadas y soltar solo el dinero (§8.5) es lo correcto.

**Detalle de práctica:** si la retención era solo **esperada** (sin constancia), sigue igual: esperada y aplicada. Si el
cliente después dice que no retendrá, el usuario la quita con la acción que ya existe (auditoría `quitar`).

### V-8. Liquidación de tarjeta. **Corregir**

| Punto del diseño | Juicio | Lo correcto | Fuente | Certeza |
|---|---|---|---|---|
| `iva_tarjeta` del 15 % sobre el IVA «de lo cobrado» | Correcto si «cobrado» es lo **bruto que pagó el tarjetahabiente** (IVA incluido en la venta), no el neto depositado | Base = IVA contenido en el monto bruto del voucher × 15 %. Combustibles: 1.5 %, **suspendido del 1-10 al 31-12-2026** (Decreto 22-2026) | Decreto 20-2006 art. 4; [Consortium, Decreto 22-2026](https://consortiumlegal.com/2026/10/01/decreto-22-2026-exencion-idp-iva-combustibles/) | M |
| Comisión de la adquirente «exenta siempre (H7)» | **Incorrecto.** H7 exime solo a las **entidades fiscalizadas por la SIB** (Ley del IVA art. 7, num. 4). Si la adquirente no lo es, o factura «más IVA», la comisión lleva IVA. | Arrancar no supone el trato: la comisión se registra con la FEL de la adquirente en Libro de compras (con crédito, si lo hay). En Bancos solo va el monto, como ya se decidió para los cargos de tarjeta. | `validacion-h7-h11-retenciones.md` H7; `dictamen-bancos-aprobaciones-tarjeta-2026-11-18.md` §2.2 | A |
| Modelo: retención **por documento** (`documento_id` no nulo salvo saldo inicial) | **No sirve para la tarjeta.** La adquirente retiene **por liquidación** (lote de vouchers), y muchas ventas son a consumidor final sin cartera. | Permitir `retenciones_recibidas` con regla `iva_tarjeta` **sin documento**, ligada a la liquidación (cobro o movimiento de Bancos), con la base declarada por el usuario. Constancia de la adquirente en RetenIVA. | [Opinión] | A |

Esto solo importa si VC-P10 incluye tarjeta (paso CXC-5). Si nadie la usa, se puede diferir, pero el ajuste del modelo hay
que anotarlo ya para que la `0003_lv3` no cierre `documento_id` con un check imposible de cambiar después.

### V-9. Nota de crédito sobre una factura de un período declarado. **Correcto con ajustes**

- **Correcto:** rebaja el débito **del período en que se emite la nota**, sin rectificar el mes de la factura (Ley del IVA
  art. 17 y art. 29, literal d) [M-A].

**Ajustes:**
1. **Plazo.** Según la SAT (comunicado citado en
   [Prensa Libre](https://www.prensalibre.com/opinion/columnasdiarias/anulacion-de-documentos-tributarios-electronicos/)),
   la nota de crédito debe emitirse **dentro de los dos meses desde la factura** (art. 17). Aviso, sin bloqueo, si se pasa:
   «Fuera del plazo del art. 17: la SAT podría rechazar la rebaja del débito». Es la misma regla «vence la víspera» que ya
   se aprobó en compras [Confirmar el texto].
2. **Retención ya practicada.** Si la factura ya tenía la constancia del cliente, la nota no la anula. Lo que se devuelve
   de más queda como **saldo a favor del cliente**, y el diseño ya lo produce solo (el abono sobra contra el saldo neto).
   Es el espejo de C1 de CP1. Si la retención era solo **esperada**, se debe **ajustar en proporción**, como en compras
   (`libro-de-compras.md`, «Una nota de crédito… ajusta la retención en proporción»). El §7.1 no lo dice: agregarlo.
3. **Nota de crédito sobre una FESP:** error, igual que en compras (R2-e).

### V-10. Uno o dos libros. **Corregir** (para los regímenes que no son el general)

| Régimen | Libro legal | Fuente | Certeza |
|---|---|---|---|
| General | **Dos**: compras y servicios recibidos, y ventas y servicios prestados, habilitados y al día. Foliación propia de ventas: **correcto**. | Ley del IVA art. 37; AG 5-2013 arts. 37 y 38 | M-A |
| Pequeño contribuyente | **Uno solo de compras y ventas** | Ley del IVA art. 49 (ya citado en `diseno-datos-libro-de-compras.md`) | M-A |
| Primario y pecuario | Uno **electrónico** de compras y ventas de la SAT (ver V-4) | Decreto 31-2024 art. 7, inciso e | M |

**Cómo corregirlo:**
- Para el pequeño contribuyente, la foliación de ventas no puede ser independiente de la de compras. Opciones: (a) un PDF
  «Libro de compras y ventas» con **una sola foliación**, que arme Libro de ventas leyendo la mitad de compras; (b)
  mantener dos PDF con el aviso «auxiliar: su libro habilitado es uno solo». Recomiendo **(a)** si la empresa imprime el
  libro; si no, (b) basta.
- Para primario y pecuario, sin folios.
- Atraso de más de dos meses: infracción formal (Código Tributario art. 94) [Confirmar el numeral].

### V-11. Plazo para anular un DTE. **Correcto con ajustes**

- **El plazo:** desde el 1-09-2023 un DTE se puede anular **como máximo hasta el vencimiento de la declaración mensual
  del IVA** del período. Después solo cabe la nota de crédito [SAT, comunicado citado en
  [Prensa Libre](https://www.prensalibre.com/opinion/columnasdiarias/anulacion-de-documentos-tributarios-electronicos/);
  M].
- «Solo informa en el aviso» está bien.

**Ajustes:**
1. Al anular en Arrancar con causa `error_de_captura` un documento que en la SAT sigue vigente y cuyo plazo pasó: aviso
   «Ya no se puede anular en la SAT: emita una nota de crédito».
2. En el cuadre, un DTE «anulado en la SAT» de un mes ya declarado indica que hay que **rectificar ese mes**.
3. La regla se aplica igual a los recibidos: un Excel bajado antes del vencimiento no es definitivo (ya anotado en L4).

### V-12. Recuperación de un castigo. **Correcto con ajustes**

- **Ley:** si después de deducida la cuenta se recupera todo o una parte, lo recuperado es **ingreso gravado en el período
  de liquidación en que ocurre la recuperación** (Decreto 10-2012 art. 21, num. 20, según
  [Prensa Libre](https://www.prensalibre.com/?p=13214994)) [M].

**Ajustes:**
1. **Solo es renta gravada si el castigo se dedujo**, es decir, en el régimen sobre utilidades. En el opcional
   simplificado la venta ya tributó al facturarse y el castigo no tuvo efecto: la recuperación tampoco lo tiene. El aviso
   usa el `regimen_isr_de_la_empresa` copiado en el castigo.
2. **IVA:** la recuperación no genera débito nuevo (el débito se declaró con la factura).
3. **Asiento:** cobro: Bancos / Clientes (saldo reabierto). Recuperación: Clientes / «Recuperación de cuentas castigadas»
   (otros ingresos), o contra la estimación si se usó reserva (NIIF para las Pymes 11.26, reversión en resultados).
4. **Requisitos del castigo deducible:** giro habitual, gestión de cobro o procedimiento judicial iniciado **antes de la
   prescripción** (dos años para el comerciante, Código Civil, según la misma fuente), y cambio de método solo con
   autorización de la SAT. Deben aparecer en el aviso de §8.7.

---

## 3. Revisión de las recomendaciones aceptadas (VC-P1 a VC-P24)

| # | Juicio | Comentario |
|---|---|---|
| VC-P1 a | Correcto | Ley del IVA art. 37. Ojo: el pequeño contribuyente no declara compras, pero igual activa Libro de compras (la dependencia es técnica, no fiscal). |
| VC-P2 a | Correcto | Un solo SAT-2237 por mes. Agregar a la foto el **remanente de retenciones** separado del remanente de crédito (V-2). |
| VC-P3 a+b | Correcto | Falta el archivo real de «DTE emitidos». |
| VC-P4 | — | Dato del usuario. |
| VC-P5 c | Correcto | — |
| VC-P6 a | Correcto | Separar bienes y servicios es una columna exigida en el libro. |
| VC-P7 a | Correcto | — |
| VC-P8 a | **Correcto con ajustes** | Mes de la constancia para el IVA; para el ISR, el mes de la factura **con las esperadas** (V-6); remanente de retenciones aparte. |
| VC-P9 a | Correcto | Cada retención guarda su tasa. Riesgo menor: tasas que cambian a mitad de mes. |
| VC-P10 | **Correcto con ajustes** | La retención de tarjeta no es por documento (V-8). Dejar el modelo abierto desde `0003_lv3`. |
| VC-P11 b | Correcto [Opinión] | El recargo al cliente por nota de débito genera débito aunque reembolse una comisión exenta del banco: es un cargo propio del vendedor. |
| VC-P12 a | Correcto | Que el texto del recibo no se confunda con el RECI de la FEL. |
| VC-P13 a | **Correcto con ajustes** | En **servicios** el IVA nace al **percibir** la remuneración (Ley del IVA arts. 4 y 29) [M-A]: un anticipo por servicios **exige factura**; no es una opción del contador. En bienes, lo prudente es facturar el anticipo [M, confirmar en el AG 5-2013]. El aviso debe decirlo así, y recomiendo `factura_obligatoria` por omisión en empresas de servicios. |
| VC-P14 a | Correcto | Requisitos del castigo deducible en el aviso (V-12). |
| VC-P15 a | Correcto | — |
| VC-P16 a | Correcto | La contraseña no mueve el vencimiento (C4 de CP1). |
| VC-P17 a | Correcto | El Código de Comercio permite el cobro ejecutivo con la FCAM; los abonos pactados, después. |
| VC-P18 a | Correcto | El art. 17 exige referirse a la factura: serie, número y fecha bastan. |
| VC-P19 a | Correcto | Exportación sin débito. Equivalente en quetzales con la referencia del Banguat de la fecha (Decreto 94-2000 art. 4). |
| VC-P20 a | Correcto | La venta de activo fijo está gravada con IVA. Vehículos usados y bienes inmuebles tienen reglas propias: aviso [Confirmar]. |
| VC-P21 a | Correcto | — |
| VC-P22 | Pendiente | Hace falta la liquidación y la constancia reales. |
| VC-P23 a | **Corregir** | Solo vale para el régimen general. Pequeño contribuyente: un solo libro. Primario y pecuario: el electrónico de la SAT (V-10). |
| VC-P24 | **Corregir la premisa** | El contribuyente agropecuario **ya no existe** desde ≈ 9-07-2025. La pregunta útil es «¿alguna empresa está en el régimen **primario o pecuario** (ICT)?» (V-4). |

**Otros dos hallazgos del diseño:**
- **Nota de débito emitida:** en compras se decidió **no proponer** retención sobre la nota de débito hasta confirmarlo en
  Retenciones Web. Ventas debe hacer el espejo: no proponer la retención esperada en `nota_de_debito`, pero permitir la
  informada.
- **Auditoría permanente (§4.4):** el motivo cita «Código Tributario arts. 47, 49 y 50; Código de Comercio art. 382» sin
  verificar. Lo dejaría como «conservación de libros y documentos (Código de Comercio art. 382; Código Tributario, por
  confirmar)».

---

## 4. Cambios de datos para `arquitecto-de-datos` (descritos, sin código)

1. `retenciones_recibidas`:
   - `documento_id` nulo también con `regla = 'iva_tarjeta'`, con referencia a la liquidación (cobro o movimiento) y base
     declarada.
   - Origen `factura_especial` fuera de las retenciones acreditables.
   - Ajuste proporcional de las esperadas cuando entra una nota de crédito.
   - Sin propuesta en la nota de débito.
2. Foto de la declaración: retenciones del período, remanente de retenciones anterior y remanente al siguiente, aparte
   del remanente de crédito. En el SAT-2046, lo mismo para las constancias.
3. Ventas lee `libro-de-compras.regimenes.fecha_de_derogacion`: bloqueo o aviso para `contribuyente_agropecuario` y
   `pequeno_contribuyente_electronico` después de la fecha.
4. Configuración de instalación del ICT (tasas 1.5, 2 y 10) y separación de exportación y margen bovino en las cifras de
   `primario_pecuario`.
5. Libro: foliación única de compras y ventas para el pequeño contribuyente (opción a); sin folios para primario y
   pecuario.
6. ISR mensual: «sujeta a retención» según la retención ISR **vigente** (esperada, informada o con constancia), no según
   la descontada.
7. Avisos nuevos:
   - nota de crédito a más de dos meses de la factura;
   - DTE que ya no se puede anular en la SAT;
   - FESP a una empresa inscrita;
   - NABN usada como descuento;
   - anticipo de servicios sin factura;
   - recuperación sin efecto fiscal fuera del régimen sobre utilidades.

## 5. Preguntas para el usuario

1. **V-1:** ¿alguna empresa recibe facturas especiales de sus compradores? ¿Está inscrita en el IVA o es una persona
   individual sin inscripción?
2. **V-4 y VC-P24:** ¿alguna empresa está (o pasará) al régimen **primario o pecuario** (ICT)? ¿Alguna es intermediaria
   de bovinos?
3. **V-8 y VC-P10:** ¿alguna cobra con POS? Si sí, mande una liquidación real de la adquirente y una constancia de la
   retención (sin datos sensibles). Con eso se cierra también V-3.
4. **V-10:** para el pequeño contribuyente, ¿se imprime el libro habilitado? (decide entre la opción a y la b).
5. **VC-P13:** ¿qué empresas venden **servicios** con anticipo? (para poner `factura_obligatoria` por omisión).
6. **Pendiente del usuario desde L5:** una captura del SAT-2237 y del SAT-1311 vigentes, para confirmar las casillas de
   retenciones y remanentes y el tramo de Q30,000.

## 6. Veredicto

**Correcto con ajustes.** La estructura (libro fiscal separado de la cartera, retención como medio de cobro, una
declaración por mes) se sostiene. Antes de programar **LV-3** hay que corregir:
- (1) el modelo de la retención de tarjeta y de la FESP (V-1, V-8);
- (2) los regímenes derogados y el ICT (V-4).

Antes de programar **LV-5** hay que corregir:
- (3) la regla del ISR mensual (V-6);
- (4) los libros que no son del régimen general (V-10);
- (5) el remanente de retenciones (V-2).

V-3, el ISR de la FESP y el tabaco quedan pendientes de los documentos reales que se piden en §5.

## Fuentes

- Repositorio: `docs/modulos/validacion-h7-h11-retenciones.md`, `docs/modulos/libro-de-compras.md`,
  `docs/modulos/diseno-datos-libro-de-compras.md`, `docs/modulos/dictamen-caja-chica-v12-v13-v8-v3-2026-11-18.md`,
  `docs/modulos/dictamen-bancos-aprobaciones-tarjeta-2026-11-18.md`,
  `docs/modulos/dictamen-cuentas-por-cobrar-y-ventas-2026-11-18.md`
- [Consortium Legal: Ley de integración del sector primario y pecuario vigente (2026-04-24)](https://consortiumlegal.com/en/2026/04/24/the-law-on-the-integration-of-the-primary-and-agricultural-sectors-in-guatemala-is-now-in-effect/)
- [Prensa Libre: libro electrónico para los nuevos regímenes (Decreto 31-2024 art. 7 e)](https://www.prensalibre.com/opinion/columnasdiarias/libro-electronico-para-los-nuevos-regimenes/)
- [Prensa Libre: anulación de DTE (plazo desde el 1-09-2023; art. 17 y 29 d)](https://www.prensalibre.com/opinion/columnasdiarias/anulacion-de-documentos-tributarios-electronicos/)
- [Prensa Libre: cuentas incobrables, art. 21 num. 20 del Decreto 10-2012](https://www.prensalibre.com/?p=13214994)
- [SAT: SAT-1311, ISR opcional mensual](https://portal.sat.gob.gt/portal/requisitos-tramites-agencias/devolucion-acreditamiento-o-compensacion-del-isr-opcional-mensual-sat-1311/)
- [SAT: preguntas frecuentes de cumplimiento](https://portal.sat.gob.gt/portal/preguntas-frecuentes/cumplimiento-tributario/)
- [La Hora: Agencia Virtual obligatoria desde el 2-06-2026](https://lahora.gt/lh-economia/hloarca/2026/03/12/desde-el-2-de-junio-de-2026-sera-obligatorio-que-estos-contribuyentes-utilicen-la-agencia-virtual-de-sat/)
- [Consortium Legal: Decreto 22-2026](https://consortiumlegal.com/2026/10/01/decreto-22-2026-exencion-idp-iva-combustibles/)
- [Deloitte Tax Alert 21-08 (retenciones del IVA, tarjetas)](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%20-%2021-08.pdf)
- [Prensa Libre: retenciones del IVA, origen y revisión](https://www.prensalibre.com/opinion/columnasdiarias/retenciones-del-iva-origen-y-revision-necesaria/)
- [La Hora: sentencia de la CC sobre facturas especiales agropecuarias](https://lahora.gt/opinion/wpcomvip/2014/08/04/sentencia-de-la-cc-relacionada-con-facturas-especiales-para-productores-agropecuarios-y-artesanales/)
- [Decreto 20-2006, ficha en Justia](https://guatemala.justia.com/nacionales/leyes/decreto-no-20-2006-jun-6-2006/gdoc)
- [Ley del IVA, compilación del TSE (PDF, no legible en esta sesión)](https://www.tse.org.gt/images/UECFFPP/leyes/decreto_27-92-iva.pdf)
- [Ley de Actualización Tributaria, ICNL](https://www.icnl.org/wp-content/uploads/leydeacttrib.pdf)

**Pendiente de leer en texto íntegro:** Decreto 20-2006 (arts. 2 a 10) y AG 425-2006, para V-3 y la base de la tarjeta;
Ley del IVA (arts. 4, 17, 29, 37, 48, 49 y 52); AG 5-2013 (libros y anticipos); Decreto 31-2024 y AG 54-2026 (formulario
del ICT).
