# Dictamen del contador: liquidaciones de documentos sin destino y anticipos de servicios (Ventas y cobros), 2026-11-24

Revisa `docs/modulos/diseno-ventas-y-caja.md` §24.8-B (`libro_de_ventas.liquidaciones_de_documento`), §24.8-C, §24.8-F, §24.8-J, §24.8-S a y b, y §24.9 (VU-P2, VU-P5, VU-P6).

**Certeza:** A = texto oficial leído; M = varias fuentes secundarias que coinciden; B = una sola fuente o inferencia mía.

**Lo que no se pudo leer:** el texto oficial del Criterio 1-2023 en el portal de la SAT respondió **403** (el PDF y la página de criterios). El comunicado de la SAT sobre recibos de anticipo, también 403.

**Lo que sí se leyó:**
- El Tax Alert de Deloitte Guatemala completo (PDF, 3 páginas).
- El resumen de Vesco, que transcribe fecha, firmante, normas citadas, alcance y requisitos.
- Consortium Legal, Termómetro Fiscal y La Hora, que cita a la SAT.

## 1. Veredicto

**Correcto con ajustes.**
- La tabla de liquidaciones resuelve bien lo principal: «sin destino» ya no quiere decir contado. Pero le faltan cinco cosas antes de VYC-0L (sección 2).
- La letra F va bien encaminada, pero su aviso es **más amplio que el criterio**. Además, faltan los controles que la SAT revisa de hecho (sección 3).

## 2. Tabla de liquidaciones (§24.8-B)

### 2.1 Lo que está bien

| Punto | Por qué | Fuente | Certeza |
|---|---|---|---|
| «Sin destino» deja de ser contado y se elige la clase, sin valor por omisión | Con la cartera apagada, una FCAM a crédito cargada a Caja infla el efectivo y oculta una cuenta por cobrar. Los estados financieros deben mostrar las cuentas por cobrar por separado | NIIF para Pymes, secc. 4.2 y 11; C. de Comercio art. 368 (contabilidad según principios aceptados) | M |
| Filas por clase y no un valor único | Una venta de contado puede pagarse con dos medios | Práctica (es como lo hacen los ERP: un pago con varias formas) | A, opinión |
| `Σ monto + Σ retenciones = total`, sin rebajar el débito | La retención recibida es pago a cuenta del cliente, no descuento. El débito del IVA va completo | Ley del IVA arts. 3 y 4; régimen de retenciones (Decreto 20-2006) | M |
| Rol `efectivo_por_depositar` y concepto propio en Bancos al depositar | Evita que el depósito parezca un segundo cobro | Buena práctica de control interno | Opinión |
| Lo anterior sin clase sale «Por clasificar» y no se asienta | Mejor que inventar una clase | Buena práctica | Opinión |
| VU-P5 (factura a crédito con la cartera apagada, en «Clientes sin auxiliar») | Es legal: el libro no puede rechazar un DTE que ya existe en la SAT, y ninguna ley obliga a un auxiliar por cliente. Es un riesgo de control, no un incumplimiento | Ley del IVA art. 37 (libro de ventas); C. de Comercio art. 368 | M |

### 2.2 Lo que está mal o falta

| # | Problema | Por qué | Corrección propuesta (para `arquitecto-de-datos`) | Certeza |
|---|---|---|---|---|
| L1 | **No hay cómo bajar «Clientes sin auxiliar» cuando el cliente paga.** Solo se prevé que baje con una retención posterior | Con la cartera apagada no hay cobros, así que el saldo de `por_cobrar_sin_cartera` crece sin fin y la conciliación nunca cuadra | Dos salidas, a elegir por el usuario: **(a)** Bancos o Caja registran «Cobro de cliente sin auxiliar» con un concepto reservado y `documento_id`, y eso baja el saldo; **(b)** no se cobra hasta encender la cartera, y al encenderla una bandeja «Por cobrar sin cartera» ingresa cada documento con su saldo como cargo (una excepción a R-1, porque ya hay una liquidación que lo respalda). Recomiendo **(b)**, con (a) solo si Bancos está activo | A (lógica contable) |
| L2 | **«Documento de tipo cartera» no está definido.** La regla `Σ = total` no sirve para notas de crédito ni de abono (restan) ni para recibos | Una NCRE sin destino también se liquida: se devolvió dinero, bajó una cuenta por cobrar o quedó un saldo a favor del cliente. Sin clase, Contabilidad no sabe contra qué cuenta va | Lista cerrada de tipos que **cargan** (`factura`, `factura_cambiaria`, las de pequeño contribuyente, agropecuario y primario pecuario, `nota_de_debito`) y clases de **abono** para `nota_de_credito` y `nota_de_abono`: `devuelto_caja`, `devuelto_banco`, `rebaja_por_cobrar_sin_cartera` (exige que la factura afectada tenga esa clase) y `saldo_a_favor_sin_cartera`. `recibo`, `RDON` y el recibo de anticipo **no** se liquidan | M |
| L3 | **`contado_banco` no dice qué cuenta bancaria** | Contabilidad no puede asentar «Bancos» sin saber cuál, y la conciliación bancaria no cuadra por cuenta | `cuenta_bancaria_id` nula (con llave hacia Bancos, `usaTablasDe`), obligatoria si Bancos está activo; si no, el rol «Bancos por identificar». Único `(documento_id, clase, cuenta_bancaria_id) nulls not distinct` | M |
| L4 | **Cheque y tarjeta no son «banco» en el momento de vender.** La regla «los demás medios, `contado_banco`» los mezcla | Un cheque recibido en el turno va físicamente en la caja y entra en el depósito del turno: contarlo como banco lo duplica al depositar. La tarjeta se acredita días después, con la comisión rebajada: el banco nunca muestra el total | Efectivo **y cheques** en turno o en la caja directa van a una clase de **valores por depositar** (renombrar `efectivo_por_depositar` o sumar `cheques_por_depositar`). La tarjeta va a `tarjeta_por_liquidar`, que se cierra con la acreditación y la comisión en Bancos (encaja con CXC-5t). Solo transferencias y depósitos directos van a `contado_banco` | M |
| L5 | **Faltan liquidaciones sin dinero** | En agro son frecuentes: **compensación** con cuentas por pagar (el cliente también es proveedor), **pago en especie** y **retiros o autoconsumo** facturados (Ley del IVA art. 3, retiro de bienes, sin dinero). Sin clase, el usuario elige una falsa (p. ej. caja) y se crea un faltante | Sumar `compensacion` (con referencia a un documento de cuentas por pagar o un motivo), `en_especie` y `sin_contraprestacion` (retiros, muestras, bonificaciones gravadas), con motivo obligatorio y permiso propio. **Decisión del usuario (P-L3)** | M (ley), opinión (clases) |
| L6 | **Anular un documento sin destino** no dice qué pasa con su liquidación | Si fue de contado, el dinero se devuelve o queda como saldo a favor; si fue por cobrar, baja «Clientes sin auxiliar». El `on delete cascade` solo cubre eliminar | Al anular, el evento lleva la liquidación inversa. Si era de contado, una alerta pide registrar la devolución o el saldo a favor | A (lógica contable) |
| L7 | **La conciliación de la letra J mezcla dos cuentas** | «Saldo de cartera … contra Clientes sin auxiliar» da a entender que este forma parte de la cartera. No es así: la cartera se concilia con el mayor de Clientes, y «Clientes sin auxiliar» con `Σ por_cobrar_sin_cartera − cobros sin cartera − notas − retenciones posteriores`, por documento | Dos conciliaciones separadas, y la segunda con detalle por cliente y documento, que sirve de auxiliar mínimo | A (lógica contable) |
| L8 | Letra C, «pedido con anticipo: el anticipo entra neto» | Antes de la factura no hay retención posible: el anticipo entra **por lo que pagó el cliente**. La retención nace con la factura y, si el anticipo ya cubre el total, queda saldo a favor del cliente | Cambiar la redacción a «el anticipo entra por lo recibido; la retención se registra al facturar» | M |

## 3. Criterio SAT 1-2023 y el DTE de anticipo (§24.8-F y S a/b)

### 3.1 Lo que se pudo confirmar

| Dato | Lo que dicen las fuentes | Certeza |
|---|---|---|
| Nombre | Criterio Tributario Institucional 01-2023, «Pagos recibidos por anticipado para servicios que se prestarán en el futuro y la emisión de la factura correspondiente» | M (Deloitte, Vesco, Consortium, Termómetro Fiscal) |
| Fechas | Aprobado el 28-06-2023 (Vesco: firma el Superintendente; ponente, Intendencia de Fiscalización); publicado el 25-07-2023 (Deloitte). Aplica «a partir de la presente fecha», sin fecha de término. **Sigue vigente**: en enero de 2025 la SAT lo invocó al revisar 62,205 recibos de anticipo de 473 contribuyentes (La Hora) | M |
| Normas que cita | Constitución arts. 239 y 243; C. Tributario arts. 4 y 98 (num. 3, 8, 12 y 13); **Ley del IVA arts. 2, 3, 4, 29 y 34**; Decreto 10-2012 arts. 19, 21 y 22; Criterio 02-2022 | M (solo Vesco) |
| Conclusión | El anticipo por un evento futuro no es servicio prestado ni remuneración, así que no se factura al recibirlo (art. 34). En su lugar se emite un DTE «Recibo de Anticipo». Al prestar el servicio se factura el total, se rebajan los anticipos y se liquida el saldo | M |
| Requisitos | a) **contrato** con monto inicial, pagos pactados, **fecha exacta de prestación** y multas por incumplimiento; b) DTE Recibo de Anticipo; c) **subcuenta por evento o contrato**: la SAT no acepta una cuenta sin integración de cargos y abonos por contrato; d) **liquidación pormenorizada** de cada contrato. Si hay fiscalización: una narrativa del proceso y la verificación de la prestación efectiva y de la factura | M (Deloitte leído completo) |
| Multas pactadas | **Sí se facturan** | B (solo Vesco) |
| Devoluciones | Si el evento no ocurre por caso fortuito o fuerza mayor, el anticipo se devuelve según el contrato | M |

### 3.2 Lo que hay que corregir en la letra F

| # | Problema | Corrección | Certeza |
|---|---|---|---|
| F1 | **Alcance.** El aviso dice «un anticipo por un servicio futuro puede no facturarse», pero el criterio trata **servicios de eventos**: comidas y bebidas, salones, alquiler de mobiliario, congresos y reuniones. Deloitte dice expresamente que otros sectores quedan con la duda y tendrían que pedir su propio criterio. La SAT (citada por La Hora) lo aplica a quienes prestan servicios de eventos **en el Régimen General del IVA**. Consortium opina que debería extenderse por igualdad: eso es opinión de doctrina, no criterio de la SAT | Aviso con dos ramas. **Eventos:** «Si su servicio es de eventos y tiene contrato, el anticipo puede documentarse con Recibo de Anticipo en vez de factura (Criterio SAT 1-2023)». **Otros servicios:** «La ley pide factura al recibir la remuneración (Ley del IVA art. 34). El Criterio 1-2023 solo trata eventos. Consulte a su contador antes de no facturar». Mi recomendación, como opinión: fuera de eventos, **facturar** | M |
| F2 | **Régimen.** Según la SAT y una documentación técnica de proveedor, el recibo de anticipo es solo para el Régimen General | La rama «puede no facturarse» se ofrece solo si el régimen del mes es `general`; en los demás, solo el aviso | M (régimen), B (catálogo) |
| F3 | **Fecha pactada y alerta.** El abuso que persigue la SAT es el anticipo **ya prestado y sin factura** | Sumar `fecha_pactada_de_prestacion date` (obligatoria si `naturaleza_de_anticipo = 'servicio'` y hay `numero_de_dte_de_anticipo`) y un reporte que no se apaga: **«Anticipos con servicio vencido sin factura»** | A (riesgo documentado por la SAT) |
| F4 | **Subcuenta por contrato.** Con solo `referencia_de_contrato` en texto, la integración por contrato depende de que se escriba igual cada vez | Un catálogo mínimo de contratos de anticipo: cliente, monto pactado, fecha pactada y archivo adjunto. El cobro va ligado por llave, con un reporte «Integración por contrato» (anticipos, factura, aplicación y saldo). Así se cumplen c) y d). **Decisión del usuario (P-L4)** | M |
| F5 | **Identidad del DTE.** `numero_de_dte_de_anticipo` como texto libre no sirve para cotejar con la SAT | Guardar `autorizacion_fel` (uuid), serie y número del recibo de anticipo, como en los demás DTE | A (diseño) |
| F6 | **Multas y anticipo retenido.** No está previsto | Si el contrato retiene el anticipo como penalidad o se cobra multa, **se factura** (aviso al cancelar un anticipo con retención) | B |
| F7 | **La bandeja de emitidos** traerá los recibos de anticipo que la empresa emitió. `libro_de_ventas.documentos.tipo` no tiene ese tipo y, con la lógica actual, un recibo podría registrarse con destino y crear un **cargo** | El recibo de anticipo nunca entra al libro como venta ni genera débito o cargo. En la bandeja va «fuera del libro» (`muestra_en_reportes_sat = false`) y, con la cartera encendida, se propone ligarlo al cobro de anticipo por su autorización | M |
| F8 | **Del lado de compras.** Un recibo de anticipo **recibido** (la empresa pagó un evento por adelantado) **no da crédito fiscal**; la SAT pidió «dar de baja al crédito fiscal» a quien lo usó. En el código, `CODIGOS_DTE_DE_LA_FAMILIA` (`servidor/src/modulos/libro-de-compras/dominio/tipos-de-documento.ts`) no lo incluye, así que la bandeja de compras lo leerá «sin familia» | Pendiente para Libro de compras (fuera de este paso): tratarlo como `recibo`, fuera del libro y sin crédito, en cuanto se confirme su código | M (sin crédito), B (código) |

### 3.3 Lo que NO pude verificar

| # | Qué | Lo hallado | Certeza | Antes de |
|---|---|---|---|---|
| S-a | Texto literal del criterio | Solo por fuentes secundarias; el PDF de la SAT da 403 (URL en Fuentes) | M | CXC-3: basta para el aviso; para programar el flujo, conseguir el PDF |
| S-b | **Código del DTE** | Una sola fuente (documentación de proveedor FileXpress) da **`RANT`**, con las condiciones: solo servicios, solo Régimen General y sin consumidor final. Esa misma lista trae códigos dudosos (`NEV`), y Edicom no lo lista. La Res. SAT-DSI-1793-2026, según Vesco, no trae catálogo: remite a la documentación técnica FEL | **B** | CXC-3. Mientras tanto, no poner `RANT` en ningún check |
| S-b2 | Si el recibo de anticipo lleva IVA en el XML | Ninguna fuente lo dice. Por el criterio, no causa débito | B | CXC-3 / `facturacion-fel` |
| — | Anticipos de **bienes** | El criterio no los trata. Ley del IVA art. 34: en bienes, la factura se emite a la entrega. No reabro lo que ya estaba (`factura_obligatoria` rechaza anticipos de bienes) | M | — |
| S-c a S-f | Incobrables, tope del 3 %, IVA arts. 17, 29 y 37, art. 41 del Decreto 10-2012 | No se tocaron en esta revisión: siguen como en §24.8-S | — | Según la tabla |

## 4. Preguntas para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| P-L1 | ¿Cómo baja «Clientes sin auxiliar» cuando el cliente paga con la cartera apagada? | a) Cobro por Bancos o Caja con concepto reservado; b) solo al encender la cartera, con una bandeja que la ingresa | b) (más a) solo si Bancos está activo) |
| P-L2 | ¿Cheques y tarjeta van a clases propias (`valores_por_depositar`, `tarjeta_por_liquidar`)? | a) Sí; b) dejarlos en `contado_banco` | a) |
| P-L3 | ¿Se suman liquidaciones sin dinero (compensación, en especie, sin contraprestación)? | a) Las tres; b) solo compensación; c) ninguna en v1 | a) en agro es frecuente |
| P-L4 | Anticipos de servicios: ¿catálogo de contratos o solo una referencia de texto? | a) Catálogo con fecha pactada y adjunto; b) texto más fecha pactada | b) en v1 (VU-P6 = b), a) al reabrir VU-P6 |

## 5. Fuentes

- [Deloitte Guatemala, Tax Alert julio 2023, Criterio 01-2023](https://www.deloitte.com/content/dam/assets-zone4/latam/es/docs/services/tax/2025/tax-alert-23-12.pdf) (leído completo)
- [Vesco, Criterio SAT 1-2023](https://vescco.tax/blog/criterio-sat-guatemala-1-2023/) y [Uso indebido de recibos de anticipo](https://vescco.tax/blog/el-uso-indebido-de-recibos-de-anticipo-en-guatemala/)
- [Consortium Legal, oct. 2023](https://consortiumlegal.com/2023/10/03/emision-de-facturas-por-pagos-recibidos-por-anticipo-para-servicios-que-se-prestaran-en-el-futuro-en-guatemala/)
- [Termómetro Fiscal](https://www.termometrofiscal.com/post/tratamiento-fiscal-de-anticipos-por-servicios)
- [La Hora, 10-01-2025, 62,205 recibos de anticipo](https://lahora.gt/lh-economia/hloarca/2025/01/10/sat-62205-recibos-de-anticipo-por-los-que-el-ente-recaudador-pregunta-por-la-factura/)
- PDF oficial (403): https://portal.sat.gob.gt/portal/descarga/16221/criterios-2023/71420/criterio-01-2023-pagos-recibidos-por-anticipado-para-servicios-que-se-prestaran-en-el-futuro-y-la-emision-de-la-factura-correspondiente.pdf
- [Portal SAT, criterios institucionales](https://portal.sat.gob.gt/portal/criterios-institucionales/) y [noticia SAT sobre recibos de anticipo](https://portal.sat.gob.gt/portal/noticias/sat-identifica-usos-indebidos-en-miles-de-recibos-de-anticipo/) (ambas 403)
- [FileXpress, tipos de DTE de Guatemala](https://docs.filexpress.app/en/docs/paises/guatemala) (fuente de proveedor, certeza B)
- [Vesco, Res. SAT-DSI-1793-2026](https://vescco.tax/blog/nueva-resolucion-fel-sat-2026-9-puntos-que-pueden-costarle-el-credito-fiscal/)

---

## Resumen para el coordinador

- **Rama:** `worktree-wf_e5ea3971-420-1`. **Sin commit**, porque no tenía herramientas de escritura. El texto de arriba se guarda como `docs/modulos/dictamen-ventas-y-cobros-liquidaciones-2026-11-24.md`.
- **Veredicto:** correcto con ajustes.
- **Bloquean VYC-0L (L1 a L4, L6 y L7; L5 solo si P-L3 la suma):**
  - L1: falta cómo baja «Clientes sin auxiliar» cuando el cliente paga.
  - L2: no se definen los tipos que cargan ni las clases de las notas.
  - L3: `contado_banco` necesita la cuenta bancaria.
  - L4: cheques y tarjeta no son banco al vender.
  - L5 (si P-L3 la suma): liquidaciones sin dinero.
  - L6: falta la liquidación inversa al anular.
  - L7: la conciliación de la letra J mezcla dos cuentas.
- **Bloquean CXC-3:**
  - F1: el aviso de anticipos se limita a eventos y al Régimen General.
  - F3: fecha pactada y reporte «Anticipos con servicio vencido sin factura».
  - F5: guardar la autorización del recibo de anticipo, no texto libre.
  - F7: el recibo de anticipo en la bandeja de emitidos nunca crea cargo.
  - El código `RANT` sigue en certeza B: no va en ningún check hasta leer la documentación técnica FEL.
- **Pendiente aparte:** el Libro de compras no reconoce el recibo de anticipo recibido (F8).
- **Preguntas al usuario:** P-L1 a P-L4.