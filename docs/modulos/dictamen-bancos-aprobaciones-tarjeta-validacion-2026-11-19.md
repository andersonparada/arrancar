# Validación del contador: `diseno-bancos-aprobaciones-tarjeta-y-cp-ap.md` (aprobaciones, tarjeta de crédito y CP-AP), 19/11/2026

_Agente `contador-guatemala`. Incorporado al diseño en sus §18 (dictamen por punto) y §19 (preguntas nuevas P-1 a P-5)._

**Leí:** `docs/modulos/diseno-bancos-aprobaciones-tarjeta-y-cp-ap.md` (completo), `docs/modulos/dictamen-bancos-aprobaciones-tarjeta-2026-11-18.md` y `docs/modulos/diseno-bancos-segunda-parte.md` (§2.5, C-3, C-9).

**Antes de empezar: el documento en `main` no tiene puntos «V-».** Una búsqueda de `V-[0-9]`, «por validar» y «validar con el contador» en ese archivo no da ningún resultado. Lo que el diseño deja para el contador está en dos lugares:
- §14.8, los «textos legales a cotejar».
- Las decisiones marcadas **[arquitecto]** que se apartan del dictamen o lo completan.

Con eso armé la lista V-1 a V-14 que sigue. Si existe otra versión del diseño con sus propias V, este dictamen hay que mapearlo a esa numeración.

**Certeza:** **L** = ley con artículo; **P** = práctica o NIIF; **O** = mi opinión.

**Límite de esta investigación:** los textos oficiales del Código Civil (ICNL, Mingob, OEA), del Decreto 20-2006 (Justia) y del Decreto 10-2012 no se pudieron leer: dieron error 503 o 404, o el PDF no se pudo extraer. Lo que depende de esos textos sigue **pendiente de cotejo literal**. Ninguno bloquea la programación, porque solo alimentan textos de ayuda o avisos. Sí bloquean que esos textos se publiquen.

---

## 1. Dictamen por punto

| V | Punto (sección) | Dictamen | Fundamento y cómo corregir |
|---|---|---|---|
| V-1 | Aprobación en tabla aparte, aprobador distinto, superacceso que no aprueba, sin aprobación para notas de crédito y cargos del banco (§3.1, §3.5) | **Correcto** | Es control interno: COSO 2013, principio 10. Ninguna ley obliga a una empresa privada no supervisada (P). Las firmas registradas en el banco no se sustituyen y el diseño ya lo dice en la ayuda (§3.7). |
| V-2 | `conceptos.pide_aprobacion`; cambiarlo exige `solicitudes.aprobar` (§3.1, Q-A9 b) | **Correcto** | Quien fija las excepciones debe ser el que controla, no el que solicita (P). Que quede en la auditoría es suficiente. |
| V-3 | Acumulado por beneficiario y día; niveles en quetzales al tipo del día (§3.2, §3.4) | **Correcto** | Sigue la misma lógica antifraccionamiento de la bancarización: Decreto 20-2006, art. 20, reformado por el Decreto 4-2012, ya validado en CP4-E (L). Para el tipo de cambio, usar el de referencia del Banguat, el mismo de Multimoneda (P). |
| V-4 | Fecha al aprobar: hoy, salvo que la pedida sea futura (§3.5) | **Correcto** | Un cheque se fecha cuando se emite. El caso de uso vuelve a revisar el mes conciliado y los fondos (P). |
| V-5 | «Corregir lo aprobado» rechazado si pediría aprobación (§3.5, Q-A8 a) **[arquitecto]** | **Correcto** | Cierra un hueco real: aprobar Q4,000 y después corregirlo a Q40,000 (P). |
| V-6 | Quien autorizó no paga en CP; el custodio no repone en Caja chica (§3.8, Q-A3 a, Q-A7 a) | **Correcto, con una nota de riesgo** | Cierra el hueco A-1. **Riesgo que se acepta (O):** en nivel 2 un pago de Bancos lleva tres personas (solicitante y dos aprobadores) y uno de CP solo dos (quien autoriza y quien paga). Es razonable porque CP ya separa registrar, autorizar y pagar. **Ajuste:** que la ayuda de la variable `niveles` lo diga, para que el cliente no crea que CP exige dos aprobadores. |
| V-7 | Cuentas por liquidar sin autorización de anticipos (Q-A6 c) **[arquitecto]** | **Correcto como decisión transitoria** | No hay ley que lo exija (P). **Ajuste:** la ayuda de `bancos.aprobaciones.*` debe decir textualmente que los anticipos de Cuentas por liquidar no pasan por aprobación. Si no, el administrador cree que todo egreso está controlado. |
| V-8 | Tarjeta como pasivo: «Saldo por pagar», fuera de Bancos, sin compensar (§4.1, §4.7) | **Correcto** | Es un pasivo financiero (NIIF para las Pymes, sección 11). Va presentado sin compensar (2.52) y la compra con tarjeta no es salida de efectivo (P). |
| V-9 | Pago de la tarjeta en **Operación** por omisión, editable; adelanto en Financiamiento (§4.5, Q-T4) | **Correcto con ajuste en la ayuda** | Ver §2, punto 1. No es un error, pero es una **política contable** que debe ser uniforme y revelarse (NIIF para las Pymes, sección 10). |
| V-10 | Cuotas: pasivo por el total desde la compra; «cuotas por facturar» en la conciliación; fórmula del saldo inicial (§4.2, §4.4) | **Correcto con un ajuste para Contabilidad** | Revisé la fórmula y los signos cuadran: consumos registrados no cobrados (+), cuotas por facturar (+), pagos en tránsito (−). **Ajustes:** (1) las cuotas con interés del emisor llevan el **interés como cargo aparte** al facturarse, nunca dentro del total. (2) Las cuotas que vencen a más de 12 meses son **pasivo no corriente** (NIIF para las Pymes 4.7): el evento o la tabla deben permitir que Contabilidad lo separe; con fecha y número de cuota alcanza. |
| V-11 | IVA de cargos del emisor solo desde la FEL; Arrancar no calcula IVA (§4.3.4) | **Correcto** | El crédito fiscal requiere documento a nombre del contribuyente, en su período (Ley del IVA, arts. 16, 18 y 37). Sigue **pendiente de cotejo** el alcance vigente de la exención del art. 7, numeral 4, para emisores. Ahora el Decreto 2-2024 los somete a supervisión de la SIB, lo que puede cambiar quién queda exento. La decisión de diseño no depende del resultado. |
| V-12 | Forma `tarjeta` en CP: sin retención descontada y aviso (§4.6) | **Corregir el texto del aviso (pendiente de cotejo)** | Ver §2, punto 2. |
| V-13 | Bandeja CP-AP: reconocer con la fecha del inverso, fuera del Libro de compras, por el monto neto; deshacer (§2.5, Q-AP2) | **Correcto con ajustes** | Ver §2, puntos 3 a 5. El ajuste a «ya pagada» es **importante**. |
| V-14 | Textos legales de §14.8: Decreto 20-2006 arts. 4 y 20; Ley del IVA arts. 7.4, 16, 18 y 37; Decreto 10-2012 arts. 21.22, 23 y 48; Decreto 2-2024; Código Civil arts. 1501, 1506, 1508 y 1514; Código de Comercio arts. 410, 501 y 513 | **Pendiente** | Falta el cotejo literal con el Diario de Centro America, CENADOJ o el portal de la SAT. Ver §3. Lo que sí pude confirmar con fuentes secundarias:<br>- **Código Civil, art. 1501:** la prescripción no opera sola; la alega el deudor.<br>- **Código Civil, art. 1508:** plazo general de 5 años.<br>- **Código Civil, art. 1514:** plazo de 2 años para el «precio de objetos vendidos por un comerciante».<br>- **Decreto 10-2012:** límite de intereses deducibles con la tasa máxima de la Junta Monetaria por tres veces el activo neto promedio.<br>**El numeral exacto del art. 21 no quedó confirmado.** |

Los puntos de CP-AP que valido sin ajuste:
- La forma `cheque_de_apertura`.
- El cambio de concepto al ligar, indispensable para no duplicar el gasto.
- Que la fecha del pago sea la del cheque.
- Que no haya retención descontada.
- Desligar con motivo.
- Anular un ligado sin pasar por la bandeja.

Todo eso es **correcto**: es el dictamen §3.3 aplicado tal cual (NIIF para las Pymes 11.36; C. Com. art. 501, pendiente de cotejo).

---

## 2. Errores o riesgos en recomendaciones ya aceptadas

| # | Dónde | Qué está mal o incompleto | Por qué | Cómo corregirlo |
|---|---|---|---|---|
| 1 | Q-T4 / V-9: el pago de la tarjeta en Operación | El diseño cita NIIF para las Pymes 7.18 para excluir la compra del flujo. **Ese párrafo habla de transacciones de inversión y financiación sin efectivo.** Si la compra con tarjeta se excluye porque se financió con el emisor, lo coherente es que el pago al emisor sea **Financiamiento**. Así lo resolvió el Comité de Interpretaciones de las NIIF para acuerdos con financiadores de proveedores (decisión de agenda de diciembre de 2020, NIC 7). | Operación es defendible para una pyme que paga el total cada mes: en la práctica es pago de proveedores. Con saldo revolvente, pago mínimo e intereses, la naturaleza es de deuda (P). | No hay que cambiar datos: el concepto ya es editable. **Ajuste en la ayuda:** «Operación si la tarjeta se paga de contado cada mes; Financiamiento si se usa como crédito (pago mínimo, saldo con intereses). Elija una política y úsela siempre.» Pregunta P-1. |
| 2 | V-12: aviso de retención en la forma `tarjeta` | Cuando la compra se paga con tarjeta, quien retiene IVA al comercio es **el emisor u operadora**: es agente de retención por su propia categoría, Decreto 20-2006 (L, pendiente de cotejo literal). Mi lectura es que la empresa agente no retiene encima: sería doble retención. El aviso actual dice «revise si debe retener», lo que **induce a retener** a quien no debe. | Un aviso mal redactado lleva a que el cliente haga una retención indebida (O, riesgo). | Separar los dos impuestos:<br>- **IVA:** aviso informativo: «Pagada con tarjeta, la retención de IVA la practica el emisor de la tarjeta; no registre retención de IVA en esta factura». Mantener la palabra «revise» hasta cotejar el reglamento del Decreto 20-2006.<br>- **ISR** (régimen opcional simplificado, Decreto 10-2012, art. 48): mantener el aviso actual, porque el emisor no retiene ISR por la empresa. Esto también es pendiente de cotejo.<br>Pregunta P-2. |
| 3 | Bandeja, causa `ya_pagada` (§2.5; §5, evento «Haber la cuenta del pago») | **Contabilidad puede duplicar el registro.** Si el pago sustituto se hizo **después del corte**, ya existe en Bancos como nota de débito o cheque con su propio concepto, que ya acreditó Bancos. Acreditar otra vez «la cuenta con que se pagó» deja esa cuenta acreditada dos veces. Si se hizo **antes del corte**, en el sistema anterior, el proveedor tenía un saldo deudor (pago doble) y la contrapartida es Proveedores, no una cuenta de banco. | La partida debe ser Debe Bancos (inverso) / Haber **la misma cuenta que usó el pago sustituto** (Proveedores o una cuenta puente), nunca otra vez Bancos (P). | Cambio de datos para `arquitecto-de-datos`:<br>- En `ya_pagada` con medio `cuenta_bancaria`: pedir el **movimiento** del pago sustituto (`movimiento_de_pago_id`, FK a `bancos.movimientos`) en vez de solo la cuenta y la fecha.<br>- Proponer **reclasificar** ese movimiento a un concepto de sistema de pago a proveedor, o a uno nuevo «Pago de deuda de apertura», para que las dos patas se compensen en la misma cuenta.<br>- Con `efectivo` (de caja chica u otro módulo): la referencia al documento de ese módulo.<br>- Si el pago fue antes del corte: causa propia («pagada antes del corte por otro medio»), con contrapartida en Proveedores y Acreedores varios.<br>- El evento lleva el `movimientoDePagoId`.<br>Pregunta P-3. |
| 4 | Causa `prescrita` y su texto (§2.5) | (a) **La entrega del cheque es un acto de reconocimiento de la deuda que interrumpe la prescripción** (Código Civil, art. 1506, pendiente de cotejo). El plazo corre desde esa entrega, no desde la factura. Como el cheque estaba en circulación al corte, una deuda «prescrita» será muy rara. (b) El plazo de 2 años del art. 1514 es para el **precio de mercadería vendida por un comerciante**. Falta confirmar en el texto oficial si se limita a compradores que no son comerciantes. Si es así, entre empresas rige el de 5 años (art. 1508) o el mercantil que corresponda. (c) Registrar en la contabilidad el ingreso por prescripción no la hace valer ante el acreedor (art. 1501). | Un texto de ayuda que diga «2 años» sin condiciones puede llevar a dar de baja deudas exigibles (L/O). | Texto de la ventana: «La prescripción no opera sola y la interrumpe el reconocimiento de la deuda (la entrega de este cheque, el dd/mm/aaaa). Confirme con su abogado o contador que el plazo se cumplió.» Quitar el «2 años mercadería» hasta cotejar el art. 1514. La **fecha** del descarte por prescripción es la fecha en que se cumplió el plazo (NIIF para las Pymes 11.36, el pasivo «expira»), no necesariamente la del inverso: que el usuario la elija, con la del inverso como mínimo. Pregunta P-4. |
| 5 | Causa `no_se_debe` («otros ingresos») | Si la deuda nunca existió, fue un **error del sistema anterior**. Si el monto es material, se corrige como **error de un período anterior** (NIIF para las Pymes 10.19 a 10.23), no como ingreso del año. Si además la factura original se anuló o hubo devolución, **el crédito fiscal del IVA que se tomó debe revertirse** con la nota de crédito FEL del proveedor en el Libro de compras (Ley del IVA, art. 16, pendiente de cotejo). | Si no, queda IVA acreditado sin compra (L/P). | Que la ventana de `no_se_debe` muestre: «Si la factura original se anuló o se devolvió, registre la nota de crédito del proveedor en Libro de compras.» El evento ya deja la clasificación a Contabilidad; basta con agregar a la ayuda «ingreso del período o corrección de error, según el contador». |
| 6 | Q-AP1 (a): reconocer siempre contra un **proveedor** | El dictamen anterior (C-3) dice «Proveedores **o Acreedores varios**». El cheque pudo ser para un empleado (sueldo o viático), un socio o una entidad pública. Obligar a crear un «proveedor» es aceptable para pagarlo por CP, pero Contabilidad necesita saber la naturaleza. | Clasificar en el balance sueldos por pagar o deudas con socios como proveedores es una presentación incorrecta (P). | Que Contabilidad lo resuelva con el tipo del tercero o con un campo `naturaleza` en la decisión (`proveedor`, `acreedor_vario`, `remuneracion`, `socio`), que viaje en el evento. Aviso si el tercero tiene NIT nulo y el monto es de Q30,000 o más: la bancarización exige individualizar al beneficiario (Decreto 20-2006, art. 20). |
| 7 | Posfechado de apertura **cobrado antes del corte** (borde no tratado) | Si la conciliación muestra que el banco pagó el posfechado en o antes del corte (C. Com. art. 501, pagadero a la vista), la factura **ya estaba pagada al corte** y no debía ir en el saldo inicial de CP. | El pasivo al corte estaría sobrestimado (P). | No hace falta forma nueva: un aviso en `LigarChequeDeApertura` y en la conciliación cuando el posfechado se marque en un período que termina en o antes del corte: «Este cheque se cobró antes del corte: la factura no debía ir en el saldo inicial de Cuentas por pagar; corríjalo con la carga abierta.» Si se cobra **después** del corte pero antes de su fecha, mantener la fecha del cheque es aceptable: la diferencia es de días (O). |

---

## 3. Lo que falta cotejar (V-14) y quién lo hace

| Texto | Para qué se usa | Estado |
|---|---|---|
| Decreto 20-2006, art. 2 y reglamento (retención del emisor de la tarjeta; el agente no retiene si paga con tarjeta) | Aviso de V-12 | Pendiente. Decide la redacción final del aviso de IVA. |
| Decreto 20-2006, art. 20 (bancarización, Q30,000, fraccionamiento) | Ayuda de V-3 y aviso de §2, punto 6 | Resumen validado en CP4-E; falta la cita literal. |
| Ley del IVA, arts. 7.4, 16, 18 y 37 | Ayuda de tarjeta y de `no_se_debe` | Pendiente; el diseño no depende de ellos. |
| Decreto 10-2012, art. 21 (numeral de intereses), 23 y 48 | Ayuda de intereses de tarjeta y aviso ISR | Pendiente el numeral exacto del art. 21. |
| Decreto 2-2024 y JM-56-2024 | Ayuda de tarjeta | Pendiente; no cambia la contabilidad. |
| Código Civil, arts. 1501, 1506, 1508 y 1514 | Texto de prescripción | Pendiente; ver §2, punto 4 (no publicar «2 años» hasta cotejarlo). |
| Código de Comercio, arts. 410, 501 y 513 | Ayuda de CP-AP | Pendiente con CENADOJ (ya pedido). |

Recomiendo que los textos de `textos-de-aprobaciones.ts` y `textos-de-tarjeta.ts` se programen con una marca «pendiente de cotejo» y no se publiquen hasta que este cuadro quede en «correcto».

---

## 4. Preguntas para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| P-1 | Ayuda del concepto del pago de la tarjeta | (a) Dejar Operación sin explicación; (b) Operación por omisión, con la ayuda «Financiamiento si usa la tarjeta como crédito» | **(b)** |
| P-2 | Aviso de retención en la forma `tarjeta` | (a) Como está («revise si debe retener»); (b) IVA: «la retiene el emisor, no la registre»; ISR: aviso como está | **(b)**, sujeto al cotejo del reglamento |
| P-3 | «Ya pagada» en la bandeja | (a) Como está (medio, cuenta y fecha); (b) ligar el movimiento del pago sustituto y, si fue antes del corte, causa propia contra Proveedores | **(b)**: la (a) produce un doble registro en Contabilidad |
| P-4 | Texto de prescripción | (a) Como está (5 y 2 años); (b) sin plazos fijos hasta cotejar, advertir la interrupción por la entrega del cheque y que el usuario elija la fecha | **(b)** |
| P-5 | Naturaleza de la deuda reconocida | (a) Siempre proveedor; (b) campo `naturaleza` (o el tipo del tercero) en el evento | **(b)** |

---

## 5. Veredicto

**Correcto con ajustes.**
- **Aprobaciones (AB):** correcto. Ajustes solo de ayuda (V-6, V-7).
- **Tarjeta (TC):** correcto con ajustes. La ayuda del flujo (§2, punto 1), el aviso de retención de IVA (§2, punto 2) y la separación entre corriente y no corriente de las cuotas para Contabilidad (V-10).
- **CP-AP (AP):** correcto con ajustes.
  - **Obligatorio antes de AP-4:** el rediseño de `ya_pagada` (§2, punto 3).
  - **Antes de publicar la ayuda:** el texto de prescripción (§2, punto 4).
  - **Menores:** `no_se_debe` y el IVA (§2, punto 5), la naturaleza de la deuda (§2, punto 6) y el aviso del posfechado cobrado antes del corte (§2, punto 7).
- **Textos legales (V-14):** pendientes de cotejo literal. No bloquean programar AP-1 a AP-3, AB ni TC-1 a TC-4.

**Fuentes:**
- [COSO, guía de control interno](https://www.coso.org/guidance-on-ic)
- [Living in Guatemala, prescripción de deudas (Código Civil, arts. 1501, 1508 y 1514; fuente secundaria)](https://livinginguatemala.com/es/tramites/prescripcion-de-deudas-guatemala/)
- [ICNL, Código Civil de Guatemala (PDF; no se pudo extraer)](https://www.icnl.org/wp-content/uploads/Guatemala_civilcode.pdf)
- [Justia, Decreto 20-2006 (solo ficha; no se pudo leer el texto)](https://guatemala.justia.com/nacionales/leyes/decreto-no-20-2006-jun-6-2006/gdoc)
- [Deloitte Guatemala, Tax Alert 21-08 (retención del 15 % por emisores de tarjetas)](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%20-%2021-08.pdf)
- [Prensa Libre, «Retenciones del IVA: origen y revisión necesaria»](https://www.prensalibre.com/opinion/columnasdiarias/retenciones-del-iva-origen-y-revision-necesaria/)
- [Consortium Legal, ventajas tributarias de los créditos (límite de intereses, Decreto 10-2012)](https://consortiumlegal.com/2022/08/04/ventajas-tributarias-de-la-obtencion-de-creditos-para-las-empresas/)
- [ICNL, Ley de Actualización Tributaria (Decreto 10-2012)](https://www.icnl.org/resources/library/ley-de-actualizacion-tributaria)
- [ICNL, Ley del IVA (Decreto 27-92)](https://www.icnl.org/research/library/guatemala_valor/)
- NIIF para las Pymes (IFRS Foundation): 2.52, 4.7, 7.18, sección 10 (10.19 a 10.23), 11.36 y 30.9. Comité de Interpretaciones de las NIIF, decisión de agenda de diciembre de 2020 sobre acuerdos de financiación de proveedores (NIC 7), por analogía.
