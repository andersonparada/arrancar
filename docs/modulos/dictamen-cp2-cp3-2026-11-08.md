# Dictamen CP2 y CP3: notas de crédito y contraseñas de pago de Cuentas por pagar (contador-guatemala, 2026-11-08)

**Alcance:** lo contable y fiscal de `diseno-cp2-notas-de-credito.md` (§12, C-CP2-1 a C-CP2-5) y de `diseno-cp3-contrasenas.md` (§12, C-CP3-1 a C-CP3-5); opinión sobre las preguntas al usuario (CP2-a a i, CP3-a a k), y errores u omisiones de los dos diseños.

**Marcas:** **[Ley]**, **[SAT]** (criterio o práctica de la SAT), **[Práctica]** (práctica profesional, NIIF para las Pymes, ERP), **[Opinión]**.

**Hasta dónde se pudieron verificar las fuentes (2026-11-08):** los PDF oficiales (Congreso, ICNL, TSE, Deloitte) no se pudieron leer como texto en esta sesión. Por eso estos artículos se verificaron en línea con fuentes secundarias que los citan:
- Decreto 10-2012, art. 21 num. 20 (cuentas incobrables).
- Decreto 20-2006, arts. 20 y 21 (bancarización).
- Código Civil, arts. 1469 (compensación) y 1506 a 1508 (prescripción).
- Código de Comercio, arts. 593 y 596 a 601 (factura cambiaria).

Cada cita lleva su grado de certeza. La Ley del IVA (arts. 17, 20, 29 y 48) y el Decreto 20-2006 (retención) se citan como quedaron verificados en dictámenes anteriores. Lo que dice «confirmar» debe cotejarse con el texto oficial antes de ponerlo en la ayuda del sistema.

## Resumen

| # | Tema | Conclusión | Certeza | ¿Decide el usuario? |
|---|---|---|---|---|
| C-CP2-1 | Compensar con otra factura | Es válida y no cambia el IVA ni el ISR. Antes del vencimiento es **compensación por acuerdo**: conviene tener el respaldo del proveedor. **Riesgo de bancarización** si la factura que la recibe es de Q30,000 o más. La fecha es la del acuerdo (se escribe), con un límite inferior bien definido. | Media-alta | Sí (aviso y referencia del acuerdo) |
| C-CP2-2 | Causas y efecto del ajuste | **«Liquidado fuera del sistema» no es un ajuste**: si entró dinero, es un cobro, y contabilizarlo como pérdida es un error. Falta separar las causas «con pérdida» de las «sin pérdida». La baja **no es una «cuenta incobrable» deducible** (art. 21 num. 20 solo cubre créditos con clientes): es gasto no deducible en el régimen sobre utilidades. | Media-alta | Sí (lista de causas) |
| C-CP2-3 | Aplicar a un cargo no autorizado | Aceptable: no sale dinero y se puede revertir. Pero **falta la regla** de qué pasa si ese cargo se anula o se elimina con aplicaciones manuales recibidas (hoy se bloquea por la llave o por `CargoConNotasAplicadas`, sin mensaje). | Alta | Sí (rechazar o soltar sola) |
| C-CP2-4 | Saldos deudores de proveedores | Se **reclasifican al cierre** a otras cuentas por cobrar, **por proveedor con saldo neto deudor**, con una partida de reclasificación sacada del reporte. La aplicación manual **no necesita evento**. | Media-alta | No |
| C-CP2-5 | Ajuste fechado en un mes declarado o cerrado | Sin efecto en el IVA. En el ISR (régimen sobre utilidades) solo cuenta para la conciliación del año. En lo contable, la fecha va en un mes abierto (como C5). Avisar si la fecha cae en un año anterior. | Alta | No |
| C-CP3-1 | Contenido y valor legal de la contraseña | No es documento fiscal. En la práctica es la **constancia de recepción** de las facturas (Código de Comercio art. 598 para la factura cambiaria) y puede servir como **reconocimiento de la deuda** (Código Civil art. 1506). Debe llevar total, retenciones y lo que queda por pagar, una **leyenda de «recibido para revisión»**, y dejar rastro de los cambios de la fecha prometida. | Media | Sí (leyenda y auditoría) |
| C-CP3-2 | Notas dentro de la contraseña (A) | **Correcto**: es la misma compensación de CP2 y la contraseña impresa la documenta ante el proveedor. **Error en la fecha** de esas aplicaciones cuando la nota se agrega después. | Alta | Sí (CP3-a) |
| C-CP3-3 | Montos vivos | Aceptable si lo fijo y lo vivo se distinguen y las reimpresiones se marcan como tales. | Media-alta (práctica) | Sí |
| C-CP3-4 | Saldo inicial con retenciones por practicar | El proveedor **sí debe verlo**: «retención por emitir, Q…; se entregará su constancia», sin restarla otra vez. Vale igual para toda retención: dinero más constancias igual al total. | Alta | No |
| C-CP3-5 | Pago prometido frente a vencimiento | Se confirma C4. Reporte de «pago prometido vencido»: **sí**. | Alta | No |

---

## C-CP2-1. Compensar el saldo a favor de una nota con otra factura del mismo proveedor

**Qué dice la ley:**
- **[Ley]** La compensación procede cuando dos personas son a la vez deudoras y acreedoras una de la otra por derecho propio (Código Civil, Decreto-Ley 106, art. 1469; verificado en una fuente académica, certeza media-alta). La compensación legal exige deudas líquidas y exigibles (arts. siguientes; **confirmar** el número del artículo).
- Aquí, el proveedor debe a la empresa el saldo libre (C1) y la empresa debe al proveedor la otra factura. **Si la factura todavía no vence, no es exigible**: la compensación es **convencional**, es decir, necesita el acuerdo del proveedor **[Ley + Opinión]**.
- **[Ley]** El IVA no cambia. La nota de crédito ya rebajó el crédito fiscal del mes en que se recibió (Ley del IVA arts. 17 y 29 lit. d), y la compensación solo extingue deudas entre particulares. El diseño (§2) está bien.
- **[Ley/SAT] Bancarización:** los pagos de Q30,000 o más que respalden costos y gastos deducibles o crédito fiscal se hacen por los medios del sistema bancario, distintos del efectivo; si no, la SAT desconoce el costo y el crédito (Decreto 20-2006, arts. 20 y 21, certeza media). Según Deloitte, varios pagos a un mismo proveedor que en un mes calendario suman Q30,000 cuentan como una sola operación.
  - El **Criterio Institucional SAT 5-2021** admite otras formas legales de pago verificables (sustancia sobre forma), pero la doctrina advierte que su aplicación es incierta y que la SAT ajusta con frecuencia por esta causa.
  - Lo que se compensa de una factura de ese monto **no pasa por el banco**. Es un riesgo real, aunque pequeño, porque los saldos libres suelen ser retenciones.

**Fecha:**
- **[Práctica/Opinión]** La compensación vale desde que se acuerda, así que la fecha la escribe el usuario (CP2-c, de acuerdo).
- **Corrección del límite inferior** (el diseño dice «no anterior a la emisión»; está mal): la fecha no puede ser anterior a ninguna de estas:
  1. la **fecha de recepción** de la nota en el Libro de compras (desde ahí existe el saldo, C2);
  2. la fecha de recepción o de emisión de cada cargo;
  3. la **fecha de inicio** de la empresa, si alguno de los documentos es saldo inicial (U8).

  Una compensación fechada antes del corte cambiaría la apertura.

**Respaldo:**
- La ley no pide un documento con forma especial.
- **[Práctica]** Un auditor pedirá evidencia de que el proveedor aceptó: un correo o carta, el estado de cuenta conciliado o la contraseña o liquidación de pago donde aparece la compensación.
- Recomendación: un campo **«referencia del acuerdo»** corto y opcional y, cuando exista, un adjunto.
- Si el total del cargo que recibe la compensación es de Q30,000 o más, mostrar este aviso (sin bloquear): «Esta factura es de Q30,000 o más; guarde por escrito el acuerdo de compensación con el proveedor (bancarización, Decreto 20-2006)». El umbral debe ser una variable de instalación, porque la ley puede cambiarlo.
- El aviso vale para cualquier régimen con crédito fiscal o costos deducibles. Una empresa en pequeño contribuyente y régimen opcional simplificado puede no necesitarlo, pero no cuesta mostrarlo.

**Lo que está bien:**

| Punto | Por qué |
|---|---|
| Lo compensado no pasa del **saldo del cargo**, que ya va neto de retenciones | Así nunca se le «paga» al proveedor por compensación la retención que se debe enterar a la SAT. Es correcto y no hay que cambiarlo |
| La compensación no genera una retención nueva | Las retenciones del cargo ya se fijaron en el Libro de compras. Compensar es una forma de pagar lo neto |
| La aplicación manual no publica evento | Ver C-CP2-4 |

## C-CP2-2. Causas del ajuste, cómo se contabilizan y si son deducibles

**Qué dice la ley sobre la deducción en el ISR:**
- **[Ley]** El Decreto 10-2012, art. 21 num. 20 (reformado por el Decreto 19-2013; certeza media en la redacción vigente), solo permite deducir las cuentas incobrables que nacen de **operaciones del giro habitual con clientes**. Excluye créditos fiscales y préstamos a funcionarios y empleados, y exige justificar el cobro intentado (requerimientos o cobro judicial) antes de la prescripción.
- **Un saldo a favor frente a un proveedor no es una cuenta por cobrar a un cliente**, así que **no entra en ese numeral** **[Opinión, certeza media-alta]**. No veo otro numeral del art. 21 que lo cubra.
- En el **régimen sobre utilidades** es **gasto no deducible**: se suma en la conciliación del ISR anual.
- En el **régimen opcional simplificado** y en el **pequeño contribuyente** no hay deducción que perder.
- El sistema **no debe llamar a esta causa «cuenta incobrable»** (el término tiene sentido fiscal propio) **ni prometer que es deducible**.
- **[Práctica]** Si después se recupera lo dado de baja, es un ingreso del período en que se recupera. Si no se dedujo, en lo fiscal no es renta gravada (confirmar con el asesor de cada empresa).

**Qué dicen las NIIF para las Pymes:**
- **[Práctica]** Un derecho que existe pero que probablemente no se cobrará es un **deterioro** (secc. 11, párrafos 11.21 a 11.26).
- Se da de baja cuando el derecho se extingue o se renuncia a él (11.33).
- Para una pyme con montos pequeños, llevar los dos casos a «otros gastos» es aceptable por importancia relativa.
- La tercera edición de la norma (vigente desde 2027) puede cambiar la numeración: confirmar.

**Crítica a la lista de causas (§5.3):**

| Causa propuesta | Juicio | Efecto contable correcto | Corrección |
|---|---|---|---|
| `incobrable` «No se recuperará» | Correcta, pero mal llamada | Otros gastos, «pérdida en saldos de proveedores» (no deducible) | Clave `no_recuperable`. Ayuda que diga que no es deducible como incobrable. Adjunto opcional con lo hecho para cobrar |
| `diferencia_menor` | Correcta | Otros gastos o diferencias | Tope configurable por empresa (p. ej. Q25) por encima del cual pida otra causa **[Opinión]** |
| `liquidado_fuera_del_sistema` | **Incorrecta como ajuste (gravedad alta)** | Si el proveedor devolvió el dinero en efectivo o por otro medio, es un **cobro**: se debita caja o banco, no un gasto. Con el evento `ajuste_registrado`, Contabilidad registraría una pérdida que no existió y dejaría la caja corta | Quitarla. Opciones: (1) esperar el **reintegro** de CP4 y que admita «efectivo o caja» además de Bancos; (2) mantenerla como **causa sin pérdida** contra una cuenta transitoria «Saldos de proveedores por regularizar», con referencia obligatoria (número de recibo de caja) |
| `otra` | Peligrosa | No se sabe qué cuenta usar | Quitarla, u obligar a elegir el efecto (pérdida o transitoria) |
| *(falta)* `compensado_con_otra_cuenta` | Caso común en el agro: el proveedor también es cliente o deudor de la empresa | Contra Clientes u otra cuenta por cobrar (transitoria hasta que exista Cuentas por cobrar) | Agregar como causa **sin pérdida**, con referencia |

- **El evento debe distinguir el efecto:** `cuentas-por-pagar.ajuste_registrado` debe llevar `efecto: 'perdida' | 'transitoria'` (o la causa, con una tabla causa → efecto en el dominio) para que Contabilidad no tenga que adivinar.
- **Aviso en la ventana [Opinión]:** «Si el saldo a favor se debe a un error al registrar la nota, no lo ajuste: anule o corrija la nota en el Libro de compras». Un ajuste no es la forma de corregir un error de captura.
- **Respaldo:** la ley no lo exige, porque el ajuste no se deduce. **[Práctica]** Recomiendo un adjunto **opcional** y que el motivo sea obligatorio (ya lo es).

## C-CP2-3. Aplicar a un cargo pendiente o no autorizado

**El control es aceptable [Opinión]:**
- No sale dinero.
- La aplicación se puede quitar con motivo y auditoría.
- La compensación sí extingue legalmente parte de la deuda, pero «solo se paga lo autorizado» se refiere a pagos con dinero (CP4).

**Ajustes:**
1. **Hueco del diseño (gravedad media-alta):** CP2 no dice qué pasa al **anular o eliminar un cargo que recibió aplicaciones manuales** de otra nota. Hoy:
   - **Eliminar:** choca con la llave `aplicaciones_cargo_fk` (no action) y da un error genérico.
   - **Anular:** lo rechaza `CargoConNotasAplicadas`, una regla escrita para un caso que «no ocurre» (CP1 §4.4) y que con CP2 **sí ocurre**.

   En lo contable, si la factura se rechaza, la compensación cae y el saldo debe volver a la nota. Opciones:
   - (a) **rechazar** con un mensaje claro («quite primero la aplicación manual de la nota N») — recomendado: la persona ve lo que deshace;
   - (b) soltar las aplicaciones manuales solas y dejarlas en el `anterior` de la auditoría.

   Cualquiera de las dos sirve también si la baja viene por aviso del Libro de compras.
2. **[Opinión]** La ventana de aplicación marca los cargos «Sin autorizar» y propone primero los autorizados (no solo por vencimiento).

## C-CP2-4. Presentación de los saldos deudores

- **[Práctica]** Las NIIF para las Pymes (2.52, edición 2015) prohíben compensar activos con pasivos salvo que una sección lo permita.
- Dentro de **un mismo proveedor** existe el derecho legal de compensar (Código Civil art. 1469). Por eso la práctica en Guatemala presenta **neto por proveedor**:
  - proveedor con saldo neto **acreedor**: en Proveedores (pasivo);
  - proveedor con saldo neto **deudor**: se **reclasifica** al cierre a «Otras cuentas por cobrar» o «Saldos deudores de proveedores» (activo).
- **Nunca** se netea un proveedor con otro.
- La reclasificación es **una partida de cierre** (reversible al día siguiente) sacada del reporte de saldos deudores por proveedor (CP5). **No** hace falta un evento por cada aplicación manual: mientras las dos partidas vivan en la cuenta de control Proveedores, compensar mueve el auxiliar y no el mayor.
- El diseño (§6.4, sin `nota_aplicada`) está **bien**.
- Para Contabilidad: el reporte de CP5 debe dar, a una fecha de corte, el **saldo neto por proveedor** separado en acreedores y deudores (eso ya pidió C1).

## C-CP2-5. Ajuste con fecha en un mes ya declarado o cerrado

| Efecto | Conclusión |
|---|---|
| IVA | **Ninguno [Ley]**: el ajuste no toca el crédito fiscal. La nota ya lo rebajó en su mes (Ley del IVA arts. 17 y 20) |
| ISR, régimen sobre utilidades | Gasto no deducible del año de la fecha del ajuste. Si ese año ya se declaró, solo cambia la conciliación contable-fiscal, no la renta imponible. No obliga a rectificar si no se dedujo **[Opinión]** |
| ISR, régimen opcional simplificado o pequeño contribuyente | Ninguno |
| Contabilidad | Como C5: la fecha va en un **mes abierto**; el módulo de Contabilidad sumará la regla. **Mientras tanto**, avisar sin bloquear si la fecha cae en un **año anterior** («afecta estados financieros de un año que quizá ya se cerró») |
| Límite inferior | No anterior a la **fecha de recepción** de la nota (no a la emisión) ni a la **fecha de inicio** si la nota es saldo inicial (mismo error que en C-CP2-1) |

## C-CP3-1. Contenido y valor legal de la contraseña impresa

**Qué dice la ley:**
- **[Ley]** La contraseña **no es un documento tributario**. La Ley del IVA (art. 29) y el régimen FEL (Acuerdo de Directorio SAT 13-2018) regulan facturas y notas de débito y de crédito, no la contraseña. No lleva folios, autorización ni requisitos formales. El diseño acierta.
- **[Ley, certeza media]** En la **factura cambiaria**, si el comprador no la acepta en el acto, firma un **recibo de entrega** que sirve de prueba (Código de Comercio art. 598). Desde la recepción corre el plazo para aceptarla o devolverla (art. 599). No devolverla equivale a **falta de aceptación** (art. 601). Las causas para rechazarla están en el art. 600.
- En la práctica guatemalteca, la contraseña **es ese recibo**. Por eso su **fecha** (día en que se recibió) **tiene valor de prueba**: está bien que, una vez creada, no se cambie (§5.2).
- **[Ley, certeza media]** Un documento firmado por la empresa que enumera las facturas y promete fecha de pago puede valer como **reconocimiento de la deuda**, que interrumpe la prescripción (Código Civil art. 1506 num. 2; plazo general de 5 años, art. 1508).

**Contenido recomendado [Práctica]:**

| Bloque | Datos | ¿En el diseño? |
|---|---|---|
| Empresa | Razón social, nombre comercial, NIT | Sí |
| Contraseña | Número, fecha de recepción, fecha prometida de pago, observaciones, «ANULADA» | Sí |
| Proveedor | Nombre y NIT | Sí |
| Por documento | Tipo, serie y número del DTE, fecha de emisión, **total**, **retenciones**, **rebajado**, **por pagar** | Sí. El vencimiento interno es opcional: no hace falta que el proveedor lo vea |
| Notas y compensaciones | «Compensación con nota N (saldo a favor)» y el monto, bien visible | Sí. Que diga «compensación» (respalda C-CP2-1) |
| Retenciones | «Las retenciones se documentan con su constancia» | **Falta**, ver C-CP3-4 |
| Leyenda | **«Documentos recibidos para revisión. Esta contraseña no implica aceptación de las facturas; el pago está sujeto a su autorización. Presente esta contraseña para cobrar.»** | Solo existe la variable de leyenda: dejar este texto como **leyenda por omisión** |
| Firmas | «Entregado por» y «Recibido por (proveedor)» con nombre, firma y fecha | Sí |
| Pie | «Impreso el … por …» y **«REIMPRESIÓN»** desde la segunda vez | Falta la marca de reimpresión |

- **Mostrar total, retenciones y lo que queda por pagar**, no solo el total. Así el proveedor cuadra «cheque más constancias igual a factura» y se evitan reclamos.
- En la columna, decir **«Saldo»** o **«Por pagar»** y no «A pagar», porque incluye documentos que todavía no se autorizan (la leyenda lo aclara).
- **Fecha prometida:** como el proveedor tiene un papel con esa fecha, **cambiarla debe dejar rastro**. Recomiendo auditoría `corregir` (ya existe en `AccionAuditada`) con motivo y el valor anterior. Hoy el diseño solo deja `actualizado_por` (gravedad media-baja).

## C-CP3-2. Notas de crédito dentro de la contraseña (opción A)

**Correcto [Práctica/Opinión]:**
- Es la misma compensación de C-CP2-1.
- La contraseña impresa y firmada por el proveedor es **la mejor evidencia de su acuerdo**. Resuelve el respaldo y ayuda frente a la bancarización.
- Aplicar contra facturas no autorizadas no tiene más riesgo que en C-CP2-3.

**Error (gravedad media):**
- §2 fecha las aplicaciones «con la de la contraseña» y el reparto **se rehace entero** con cada cambio.
- Una nota **recibida después** de la fecha de la contraseña y agregada más tarde quedaría con aplicaciones **anteriores a su propia recepción**. Eso distorsiona el estado de cuenta y la antigüedad de CP5.
- Corrección: fecha de cada aplicación de la contraseña = **la mayor** entre la fecha de la contraseña, la recepción de la nota y la recepción del cargo. Alternativa: la fecha en que el documento se agregó a la contraseña.
- Al rehacer el reparto, una nota que ya estaba y no cambió debe conservar su fecha (determinista). La regla «la mayor de…» lo cumple sin guardar más datos.

## C-CP3-3. Montos vivos

- **[Opinión]** Aceptable, con condiciones:
  1. Lo **fijo** (documentos, totales, retenciones) se separa de lo **vivo** (rebajado, por pagar), que va con «al dd/mm/aaaa».
  2. Desde la segunda impresión se marca **«REIMPRESIÓN»**. Para eso basta una columna `impresa_en` (primera impresión), nula hasta que se imprime. Es tarea del arquitecto.
  3. La auditoría de quitar y de anular guarda los montos de ese momento (ya lo hace).
- Guardar una «foto» de los montos crearía dos verdades. No lo recomiendo.
- Al **anular** una contraseña ya entregada, avisar «recupere el original que tiene el proveedor» **[Práctica]**.

## C-CP3-4. Saldo inicial con retenciones por practicar

- El proveedor **debe verlo**. El saldo ya va neto (U8). Si la contraseña no explica la diferencia, el proveedor reclamará el faltante.
- Texto en la línea: **«Retención por emitir: Q…; se entregará su constancia»**, sin restarla otra vez (restarla de nuevo sería el error de doble resta de C-U8-2).
- Lo mismo, en general, para toda retención: la columna «Retenciones» y la leyenda «las retenciones se documentan con su constancia» (C-CP3-1).

## C-CP3-5. Pago prometido frente a vencimiento

- Se **confirma C4/U14 c**: la fecha prometida no cambia «Vence» ni la antigüedad.
- **Reporte:** sí, «contraseñas con pago prometido vencido» (vigentes, con saldo y fecha prometida antes de hoy) en CP5. La lista ya trae `pagoVencido`.
- **[Opinión]** Si el proveedor acepta una fecha prometida posterior al vencimiento, podría alegarse una prórroga pactada que cambie la mora (intereses moratorios del Código de Comercio; confirmar el artículo). El sistema no tiene que resolverlo; basta con que la antigüedad siga usando «Vence» y el reporte muestre las dos fechas.

---

## Opinión sobre las preguntas al usuario

### CP2

| Pregunta | Opinión |
|---|---|
| CP2-a | De acuerdo: página propia. |
| CP2-b | De acuerdo, con dos ajustes: la regla para anular o eliminar un cargo con aplicaciones manuales (C-CP2-3) y la marca «Sin autorizar» en la ventana. |
| CP2-c | De acuerdo con que la fecha se escriba (hoy por omisión). **Corregir el límite inferior**: recepción de la nota y de los cargos, y fecha de inicio (C-CP2-1). |
| CP2-d | De acuerdo. |
| CP2-e | De acuerdo: solo notas en CP2. **Para CP4:** un «descuento que el proveedor aceptó sin nota» **no** debe resolverse con un ajuste. Si rebaja el precio, la ley pide **nota de crédito del proveedor** (Ley del IVA arts. 17 y 29 lit. d); sin ella, la empresa conservaría un crédito fiscal por un precio que no pagó. Una condonación pura es otro ingreso, no menos gasto (confirmar el tratamiento en el ISR). Las diferencias de centavos sí pueden ser ajuste. |
| CP2-f | **No** la lista tal como está: usar la corregida (C-CP2-2). Sin aprobación aparte: basta el permiso propio, más un **reporte mensual de ajustes** que revise el contador (CP5) y el tope de «diferencia menor». |
| CP2-g | De acuerdo. |
| CP2-h | De acuerdo con los tres permisos. |
| CP2-i | De acuerdo con la cascada. Nota para Contabilidad: las partidas de un ajuste anulado se quedan aunque la nota se elimine; Contabilidad guarda en su partida los datos que necesita, sin depender de la fila borrada. |

### CP3

| Pregunta | Opinión |
|---|---|
| CP3-a | **A**, con la fecha corregida (C-CP3-2) y «compensación» visible en la impresión. |
| CP3-b | `window.print()` basta. Recomiendo **original y copia**: el original es para el proveedor y la **copia la firma el proveedor y se la queda la empresa**. La firma «Recibido por (proveedor)» solo sirve en la copia que conserva la empresa. Se pueden imprimir las dos de una vez, con su rótulo. |
| CP3-c | Vivos, con «REIMPRESIÓN» y lo fijo separado de lo vivo (C-CP3-3). |
| CP3-d | De acuerdo. |
| CP3-e | Sí, con la **leyenda por omisión** de C-CP3-1. |
| CP3-f | Sí. Cambiar la fecha prometida **se audita** (`corregir` con motivo). |
| CP3-g | De acuerdo con la cascada; la auditoría del documento conserva el rastro. |
| CP3-h | Sí. |
| CP3-i | Editable al crearla y luego fija. Es correcto, porque la fecha de recepción tiene valor de prueba (art. 598). |
| CP3-j | Sí. |
| CP3-k | De acuerdo: no. |

---

## Otros errores u omisiones

| # | Dónde | Problema | Corrección | Gravedad |
|---|---|---|---|---|
| 1 | CP2 §5.3, causa `liquidado_fuera_del_sistema` | Un cobro contabilizado como pérdida | Quitarla, o hacerla causa sin pérdida contra una transitoria con referencia obligatoria; el evento lleva el `efecto` | **Alta** |
| 2 | CP2 §5.3, causa `otra` y nombre «incobrable» | Efecto contable indefinido; promete un sentido fiscal que no tiene | Quitar `otra` u obligar a elegir el efecto; renombrar a `no_recuperable` con la ayuda «no deducible como cuenta incobrable» | Media |
| 3 | CP2 §5.1 regla 5 y §5.3 regla 3 | El límite inferior de la fecha es la emisión | Usar la recepción de la nota y de los cargos y la fecha de inicio si hay saldo inicial | Media |
| 4 | CP2 §4 y §9 | No hay regla para anular o eliminar un cargo con aplicaciones manuales recibidas (falla la llave o `CargoConNotasAplicadas`, sin mensaje) | Regla nueva en `REGLAS_PARA_ANULAR`/`ELIMINAR`: rechazar con mensaje (recomendado) o soltar con auditoría; también por aviso del Libro de compras | **Media-alta** |
| 5 | CP2 §5.1 y CP3 (A) | Bancarización de lo compensado en facturas de Q30,000 o más | Aviso sin bloquear con umbral configurable; campo «referencia del acuerdo» | Media |
| 6 | CP2 §6.4 | El evento `ajuste_registrado` no dice qué efecto contable tiene | Agregar `efecto` (o tabla causa → efecto) y serie y número de la nota para la glosa | Media |
| 7 | CP3 §2 y §3.3 | Las aplicaciones de la contraseña se fechan antes de que la nota se recibiera | Fecha = la mayor (contraseña, recepción de la nota, recepción del cargo) | Media |
| 8 | CP3 §5.2 y §6.2 | Cambiar la fecha prometida no deja rastro, y el proveedor tiene un papel con la fecha anterior | Auditoría `corregir` con motivo | Media-baja |
| 9 | CP3 §5.5 | Sin leyenda por omisión, la contraseña puede leerse como aceptación de facturas aún no revisadas | Leyenda «recibido para revisión…» por omisión | Media |
| 10 | CP3 §5.5 | Faltan «REIMPRESIÓN» y la explicación de las retenciones | `impresa_en`, columna de retenciones y leyenda de constancias | Baja-media |
| 11 | CP3 §5.3 | Al anular una contraseña ya entregada no se pide recuperar el original | Aviso al anular | Baja |
| 12 | CP2 §5.3 | Se puede ajustar una nota pendiente que nadie ha revisado | **[Opinión]** Permitir el ajuste solo en notas registradas o autorizadas; aplicar a otros cargos sí puede hacerse desde pendiente | Baja |
| 13 | CP5 (futuro) | El saldo a favor prescribe (Código Civil art. 1508, 5 años; confirmar si aplica un plazo mercantil más corto) | Antigüedad de los saldos a favor en el reporte de notas de crédito | Baja |
| 14 | CP4 (futuro) | Diferencias al pagar y descuentos sin nota | Un descuento de precio exige nota de crédito; los centavos pueden ir como ajuste (CP2-e) | Informativo |

## Cambios que los diseños deben recibir

**CP2:**
1. §5.3: lista de causas corregida, con efecto «pérdida» o «transitoria»; `efecto` en el evento; ayuda «no deducible»; aviso «si es un error de la nota, corríjala en el Libro de compras».
2. §5.1 y §5.3: límite inferior de las fechas (recepción y fecha de inicio).
3. §4 y §9: regla para el cargo con aplicaciones manuales recibidas al anularlo o eliminarlo; la regla `CargoConNotasAplicadas` deja de ser «no ocurre».
4. §5.1 y §8: aviso de bancarización (umbral de instalación) y campo opcional «referencia del acuerdo» en la aplicación manual.
5. §5.4 y CP5: aviso si el ajuste cae en un año anterior; reporte mensual de ajustes.

**CP3:**
6. §2: fecha de las aplicaciones de la contraseña = la mayor (contraseña, recepción de la nota, recepción del cargo).
7. §5.2 y §6.2: auditoría `corregir` al cambiar la fecha prometida.
8. §5.5 y §6.5: leyenda por omisión, columnas total, retenciones y saldo, línea de retención por emitir, «compensación con nota N», «REIMPRESIÓN» (`impresa_en`), original y copia.
9. §5.3: aviso de recuperar el original al anular.

**Para el arquitecto de datos** (lo describo, no lo programo):
- `aplicaciones_de_notas.referencia` (text, nulo, 1–100), solo en `forma = 'manual'`.
- `ajustes_de_saldo`: el check de `causa` con la lista nueva y, si se elige la opción 2 de C-CP2-2, `referencia` obligatoria en las causas sin pérdida (check condicional).
- `contrasenas.impresa_en` (timestamptz, nulo).
- Variable de instalación `cuentas-por-pagar.bancarizacion.umbral` (por omisión 30000.00).
- Variable de empresa `cuentas-por-pagar.ajustes.tope_diferencia_menor`.

## Preguntas para el usuario (depuradas)

1. **«Liquidado fuera del sistema»:** ¿se quita y se espera el reintegro de CP4 (que aceptaría también efectivo), o se deja como causa **sin pérdida** contra una cuenta transitoria, con referencia obligatoria? *Recomendado: quitarla y que CP4 acepte el reintegro en efectivo.*
2. **Causas del ajuste:** ¿la lista corregida (No recuperable, Diferencia menor con tope, Compensado con otra cuenta del tercero) sin «Otra»? *Recomendado: sí.*
3. **Cargo con aplicaciones manuales que se anula o elimina:** ¿rechazar con el mensaje «quite primero la aplicación» (recomendado) o soltar las aplicaciones sola, con auditoría?
4. **Bancarización:** ¿aviso sin bloquear al compensar contra facturas de Q30,000 o más, y campo «referencia del acuerdo»? *Recomendado: sí.*
5. **Ajustar una nota pendiente:** ¿se permite, o el ajuste exige que la nota esté registrada o autorizada? *Recomendado: registrada o autorizada.*
6. **Fecha prometida:** ¿cambiarla se audita con motivo? *Recomendado: sí.*
7. **Contraseña impresa:** ¿leyenda por omisión «recibido para revisión…», original y copia con la firma del proveedor en la copia, y marca «REIMPRESIÓN»? *Recomendado: sí a las tres.*
8. **Reporte mensual de ajustes** para que el contador lo revise, en lugar de una segunda aprobación. *Recomendado: sí (CP5).*

## Veredicto

- **CP2: correcto con ajustes.** El modelo (tres formas de consumir el saldo libre, saldos calculados, el ajuste en una tabla aparte que se anula, sin efecto en el IVA) está bien. Hay que corregir:
  - la causa «liquidado fuera del sistema» (alta);
  - el resto de la lista de causas y el `efecto` en el evento;
  - los límites de fecha;
  - la regla del cargo con aplicaciones manuales al anularlo o eliminarlo;
  - el aviso de bancarización.
- **CP3: correcto con ajustes.** La contraseña como constancia de recepción no fiscal, la opción A para las notas y los montos vivos están bien. Hay que corregir:
  - la fecha de las aplicaciones de la contraseña;
  - la auditoría de la fecha prometida;
  - la leyenda por omisión, las retenciones y la reimpresión en la hoja impresa.

## Fuentes

- Proyecto: `docs/modulos/validacion-h7-h11-retenciones.md` (C1–C5), `docs/modulos/diseno-datos-cuentas-por-pagar.md` (§4.3, §4.4, U12–U16), `docs/modulos/dictamen-u8-saldos-iniciales-2026-11-08.md`, `docs/modulos/cuentas-por-pagar.md`.
- Decreto 10-2012, Ley de Actualización Tributaria (art. 21 num. 20): [ICNL](https://www.icnl.org/wp-content/uploads/leydeacttrib.pdf); [Congreso, Decreto 10-2012](https://www.congreso.gob.gt/assets/uploads/info_legislativo/decretos/2012/010-2012.pdf); reforma del Decreto 19-2013: [Congreso](https://www.congreso.gob.gt/assets/uploads/info_legislativo/decretos/2013/19-2013.pdf); análisis: [Prensa Libre, 30-09-2022](https://www.prensalibre.com/economia/las-cuentas-incobrables-pueden-ser-deducibles-del-isr-siempre-que-se-cumplan-ciertos-requisitos/).
- Decreto 20-2006, arts. 20 y 21 (bancarización) y Criterio SAT 5-2021: [Consortium Legal](https://consortiumlegal.com/en/2022/06/02/banking-on-tax-matters-in-guatemala-evidentiary-aspects/); [Deloitte Tax Alert 21-21](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%2021-21.pdf); [Justia, Decreto 20-2006](https://guatemala.justia.com/nacionales/leyes/decreto-no-20-2006-jun-6-2006/gdoc).
- Código Civil, Decreto-Ley 106 (arts. 1469, 1506–1508): [Ministerio de Gobernación](https://mingob.gob.gt/mingobsites/repeju/wp-content/uploads/sites/2/2018/06/Codigo_Civil_Decreto_Ley_106.pdf); [Camjol, compensación](https://camjol.info/index.php/DERECHO/article/download/13203/15317/47709); [prescripción de deudas](https://livinginguatemala.com/es/tramites/prescripcion-de-deudas-guatemala/).
- Código de Comercio, Decreto 2-70 (arts. 593, 596–601, 626): [ICNL](https://www.icnl.org/wp-content/uploads/codcomercio.pdf); [guía de la factura cambiaria](https://livinginguatemala.com/es/tramites/factura-cambiaria-formato/).
- Ley del IVA, Decreto 27-92 (arts. 17, 20, 29 lit. d): [TSE](https://www.tse.org.gt/images/UECFFPP/leyes/decreto_27-92-iva.pdf); [Prensa Libre, anulación de DTE](https://www.prensalibre.com/opinion/columnasdiarias/anulacion-de-documentos-tributarios-electronicos/).
- Régimen FEL, Acuerdo de Directorio SAT 13-2018: [vLex](https://gt.vlex.com/vid/acuerdo-directorio-no-13-913599220).
- NIIF para las Pymes (2.52, 11.21–11.26, 11.33; tercera edición vigente desde 2027): [IFRS](https://www.ifrs.org/issued-standards/ifrs-for-smes/); [IASB, tercera edición](https://www.ifrs.org/news-and-events/news/2025/02/iasb-issues-major-update-smes-accounting-standard/).
