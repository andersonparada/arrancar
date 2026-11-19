# Dictamen del contador, 2026-11-18: Bancos (aprobaciones, tarjeta de crédito, CP-AP y N-2)

_Investigación del agente `contador-guatemala` del 2026-11-18, guardada tal cual (sin cambiar el texto) por el agente
`arquitecto-de-datos`. La usa `diseno-bancos-aprobaciones-tarjeta-y-cp-ap.md`, que marca lo que el arquitecto completa o
no comparte._

---

# Dictamen del contador: lo que falta de Bancos (aprobaciones, tarjeta de crédito, CP-AP y N-2), 18/11/2026

**Base leída:** `/home/aparada/proyectos/arrancar/docs/modulos/diseno-bancos-segunda-parte.md` (§2.5, §11.1, §11.3, §16.2, §17), `/home/aparada/proyectos/arrancar/docs/HOJA-DE-RUTA.md`, `/home/aparada/proyectos/arrancar/docs/modulos/diseno-cp4-pagos.md` (§2.3, §2.4, §5.3, §5.6), `/home/aparada/proyectos/arrancar/docs/modulos/diseno-cp4-pagos-en-efectivo.md` §5, `/home/aparada/proyectos/arrancar/docs/modulos/diseno-impresion-de-cheques.md`, `/home/aparada/proyectos/arrancar/docs/modulos/diseno-multimoneda.md` y `/home/aparada/proyectos/arrancar/docs/modulos/diseno-caja-chica-y-cuentas-por-liquidar.md` (CC-j).

**Cómo leer la certeza:** **L** = ley con artículo, **P** = práctica profesional o NIIF, **O** = mi opinión. Algunos textos oficiales no se pudieron leer: los PDF del Decreto 20-2006, del Decreto 27-92 y del boletín de Andersen salieron ilegibles. Lo que depende de ellos va marcado **«a cotejar»**.

---

## 1. Aprobaciones de cheques, notas de débito y transferencias

### 1.1 Qué está bien del modelo de §11.1

| Punto | Juicio | Por qué |
|---|---|---|
| Tabla aparte `bancos.solicitudes`, sin estado «por aprobar» en `movimientos` | Correcto (P) | Una solicitud no es un hecho económico. No debe tocar el saldo, la conciliación, los correlativos ni el flujo de efectivo. |
| El número de cheque y el correlativo se consumen al aprobar; el sobregiro se revisa entonces | Correcto (P) | Así no quedan huecos en la chequera ni cheques «reservados». El control de correlativos del diseño de impresión sigue limpio. |
| Quien aprueba no puede ser quien solicita | Correcto (P) | Es la segregación de funciones de COSO 2013, principio 10 ([coso.org](https://www.coso.org/guidance-on-ic)). Ninguna ley de Guatemala la exige a una empresa común; es control interno. |
| Las notas que solo registran un cargo que el banco ya hizo no pasan por aprobación | Correcto (P) | No hay decisión de pago, el dinero ya salió. |
| Las notas de crédito no pasan por aprobación | Correcto (O); el diseño no lo dice expresamente | Son entradas de dinero. Hay que escribirlo para que nadie lo programe al revés. |

### 1.2 Qué está mal o incompleto

| # | Problema | Por qué | Cómo corregirlo |
|---|---|---|---|
| A-1 | **Hueco de segregación en las órdenes de los módulos.** P-13 y CC-j sacan de la aprobación los pagos de Cuentas por pagar y la reposición de Caja chica. P-13 se condicionó a que en Cuentas por pagar «quien autoriza no sea quien registra el pago» (C-9). Pero CP4-j dice textualmente «no se agrega "quien autorizó no paga"». | Un usuario con `autorizar` y `pagar` puede autorizar una factura y emitir el cheque solo, saltándose la aprobación de Bancos aunque esté encendida. La condición de C-9 no se cumplió. | Si la aprobación de cheques o de notas está encendida en la empresa, Cuentas por pagar rechaza el pago cuando quien paga es quien autorizó alguno de los cargos (error propio). Lo mismo en la reposición de Caja chica: quien repone no puede ser quien aprobó la liquidación. Alternativa: una variable propia de cada módulo (`…exigir_autorizador_distinto`). Pregunta Q-A3. |
| A-2 | **Fraccionamiento.** Con un solo `monto_minimo`, quien solicita parte un pago en varios cheques menores al umbral. | Es el fraude clásico que la aprobación debe impedir. La ley usa la misma lógica en la bancarización: los pagos fraccionados cuentan como una sola operación (Decreto 20-2006, art. 20, reformado por el Decreto 4-2012, art. 27; resumen ya validado en CP4-E). | Para el umbral, sumar los movimientos y solicitudes vigentes al mismo beneficiario del mismo día, o de la misma semana (variable). Si la suma llega al umbral, el movimiento nuevo pide aprobación. |
| A-3 | **Montos por nivel.** El diseño tiene un solo umbral y un aprobador. El usuario pidió niveles. | En la práctica se usan niveles: hasta X aprueba una persona; sobre Y, dos personas distintas. Es el equivalente de las firmas mancomunadas registradas en el banco (P). | Opciones en Q-A1. |
| A-4 | **Transferencias y notas: Arrancar registra, no ejecuta.** La transferencia real se hace en la banca electrónica, que tiene su propio esquema de quien ingresa y quien autoriza. | Si la aprobación crea el movimiento, el sistema puede mostrar como hecha una transferencia que nunca se ejecutó. Eso solo aparece al conciliar. | Al aprobar se crea el movimiento con su fecha (es la instrucción), y quien ejecuta captura después la **referencia del banco** (editable sin permiso de corrección). Un aviso señala las transferencias aprobadas sin referencia después de N días. (O) |
| A-5 | **Fecha del movimiento.** No está definida cuando la solicitud se aprueba días después. | Un cheque se fecha cuando se emite. Una fecha en un mes ya conciliado rompe la conciliación. | Fecha por omisión: la de aprobación. Se conserva la de la solicitud solo si es futura (posfechado). Al aprobar se vuelve a revisar el mes conciliado, la fecha de inicio (§5.2) y los fondos. |
| A-6 | **Relación con la impresión de cheques.** | El comprobante de egreso tiene la firma «Autorizó» (P-9 de impresión). | Con la aprobación encendida, el comprobante imprime el nombre de quien aprobó en «Autorizó» y el de quien solicitó en «Elaboró». Sin aprobación queda en blanco para firmar a mano. Imprimir sigue con `bancos.cheques.imprimir`; no hace falta otra regla, porque sin aprobar no existe el cheque. |
| A-7 | **Superacceso.** No se dice si cuenta como aprobador. | El soporte técnico no es parte del control interno del cliente. | El superacceso no aprueba ni rechaza solicitudes de la empresa. (O) |
| A-8 | **«Contraseñas» de Cuentas por pagar.** | Aclaración de concepto: la contraseña es el comprobante que se entrega al proveedor al recibir sus facturas, con la fecha probable de pago. **No es una aprobación.** La aprobación de la deuda es «autorizar» el documento. | La única relación con Bancos es A-1. No hay que ligar las solicitudes a las contraseñas. |
| A-9 | **Empresa con un solo usuario.** | Con la variable encendida no podría pagar nunca. | Al encenderla, avisar si hay menos de dos usuarios con `bancos.solicitudes.aprobar`. Nunca permitir que alguien se apruebe a sí mismo «con permiso»: anularía el control. |

### 1.3 Ley, práctica y opinión en aprobaciones

- **Ley:** nada obliga a una empresa privada no supervisada a tener aprobaciones. Lo que sí es de ley son las **firmas registradas en el banco** (contrato de cuenta). La aprobación del sistema **no sustituye** esas firmas: hay que decirlo en la ayuda.
- **Práctica:** las aprobaciones por monto con aprobador distinto son el estándar (COSO, principio 10). SAP, NetSuite y QuickBooks las enrutan por monto. Esto último es conocimiento general, no lo verifiqué con fuentes en esta investigación.
- **Opinión:** empezar con dos niveles es suficiente para pymes y fincas.

---

## 2. Tarjeta de crédito como tipo de cuenta

### 2.1 Correcciones de concepto

| Idea del diseño o del usuario | Juicio | Lo correcto |
|---|---|---|
| «Saldo deudor» | **Término ambiguo** | En el estado de cuenta del emisor el saldo es «a cargo del tarjetahabiente». En los **libros de la empresa** la tarjeta es un **pasivo financiero** de saldo acreedor (NIIF para las Pymes, sección 11). La pantalla debe decir «Saldo por pagar», no «saldo deudor». |
| La tarjeta no es efectivo | Correcto (P, C-10) | Una compra con tarjeta es una transacción **sin movimiento de efectivo** (NIIF para las Pymes 7.18). La salida de efectivo es el **pago de la tarjeta**. |
| El pago de la tarjeta es una transferencia entre cuentas | Correcto, con un ajuste | Hoy las transferencias entre cuentas propias no salen en el flujo. Una transferencia **hacia una tarjeta** sí es salida de efectivo y debe llevar concepto y actividad. **Clasificación (P/O):** en NIIF hay dos posturas. Financiación, si se ve como deuda con el banco; operación, si se ve como pago de proveedores. Para una pyme que paga la tarjeta completa cada mes, Operación es lo usual. Recomiendo Operación por omisión, con un concepto que se pueda cambiar. Pregunta Q-T4. |
| Límite de crédito en vez de sobregiro | Correcto | Sirve solo para avisar, no para bloquear: el emisor es quien rechaza. |

### 2.2 Ley y fiscal

| Tema | Qué dice | Certeza y fuente |
|---|---|---|
| Ley de Tarjetas de Crédito | Decreto 2-2024, publicado el 1/3/2024, vigente desde el 1/9/2024. Reglamento de la Junta Monetaria JM-56-2024. Regula la relación emisor–tarjetahabiente: contrato con tasas y comisiones, mora solo sobre el capital no pagado al corte (art. 2, literal l), objeción de cargos del estado de cuenta. No fija tope de tasa. Para Arrancar no cambia la contabilidad. | L, media: [vLex](https://gt.vlex.com/vid/decreto-no-2-2024-1023952154), [AGN](https://agn.gt/publican-decreto-numero-2-2024-ley-de-tarjetas-de-credito/), [La Hora](https://lahora.gt/nacionales/jmaldonado/2024/02/16/ley-de-tarjetas-de-credito-intereses-ya-no-seran-capitalizados/), [EyN](https://www.revistaeyn.com/centroamericaymundo/guatemala-lo-que-debe-saber-sobre-la-nueva-ley-de-tarjetas-de-credito-CA17604723). Cotejar en el Diario de Centro América. |
| IVA sobre intereses y comisiones | La Ley del IVA (Decreto 27-92), art. 7, numeral 4, exenta «los servicios que presten las instituciones fiscalizadas por la Superintendencia de Bancos». Pero emisores reales cobran **comisiones «más IVA»**: BAC Credomatic cobra 5 % + IVA por transferencias desde la tarjeta y su reposición «incluye IVA». Sus tasas de interés y membresía no muestran IVA. **No se puede suponer una regla única:** depende del emisor y del cargo. | L (texto original del art. 7, [ICNL](https://www.icnl.org/research/library/guatemala_valor/)), más la práctica del emisor ([BAC](https://www.baccredomatic.com/es-gt/tarjetas/credito/transparencia)). El alcance vigente del numeral 4 y sus reformas quedan **a cotejar**. |
| Conclusión de diseño | **Arrancar no calcula el IVA de los cargos del emisor.** El crédito fiscal sale **solo de la factura electrónica (FEL)** que el emisor emite a nombre del NIT de la empresa y que se registra en Libro de compras. En la tarjeta, la nota de cargo lleva el monto total; el IVA vive en el documento del Libro. | L: el crédito fiscal requiere documento a nombre del contribuyente (Ley del IVA, arts. 16 y 18; a cotejar con el texto vigente). |
| Intereses en el ISR (régimen sobre las utilidades) | Deducibles con el tope del Decreto 10-2012, art. 21, numeral 22: tasa máxima de la Junta Monetaria por tres veces el activo neto. Los consumos personales de socios o empleados no son deducibles (art. 23). | L, media-alta, a cotejar. Arrancar no lo calcula; lo decide Contabilidad. |
| Compras con tarjeta en Libro de compras | La factura entra en **su fecha y su período**, no en la del estado de cuenta. Debe estar a nombre del NIT de la empresa. | L: Ley del IVA, art. 37 (libros); a cotejar. |
| Bancarización | Pagar con tarjeta **sí** es un medio bancario que individualiza al proveedor (art. 20 citado en CP4-E). Si la tarjeta es **personal** de un empleado o socio, el pago no es del contribuyente. Para pagos de Q30,000 o más hay riesgo de que no sea deducible. | L (art. 20, resumen ya validado); la tarjeta personal es O, de riesgo. |
| Retención de IVA en compras con tarjeta | El emisor retiene IVA al comercio afiliado (Decreto 20-2006, art. 4). Del 1/10/2026 al 31/12/2026 esa retención está **suspendida para combustibles** pagados con tarjeta (Decreto 22-2026). Si la empresa es agente de retención y paga con tarjeta, **no puede descontar la retención** del cargo. Mi lectura es que no le corresponde retener; **a cotejar** con el texto del Decreto 20-2006 y su reglamento. | L, media: [Deloitte](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%20-%2021-08.pdf), [Consortium Legal](https://consortiumlegal.com/2026/10/01/decreto-22-2026-exencion-idp-iva-combustibles/). |
| Retención de ISR (régimen opcional simplificado, Decreto 10-2012, art. 48) | Si la empresa debe retener ISR a ese proveedor y le paga con tarjeta, no puede descontar la retención. | O: Arrancar **avisa** («la forma tarjeta no descuenta retenciones; revise si debe retener») y **no bloquea**. Que lo resuelva el contador de cada empresa. |

### 2.3 Modelo recomendado, para `arquitecto-de-datos` (sin código)

| Elemento | Propuesta |
|---|---|
| Tipo de cuenta | `tarjeta_de_credito` en `cuentas_bancarias`: `limite_de_credito numeric(14,2) null`, `dia_de_corte smallint null`, `dias_para_pagar smallint null` (los dos solo de referencia), `ultimos_4 char(4)`, sin chequeras. La moneda es la de la cuenta (Multimoneda). Una tarjeta **bimonetaria** son **dos cuentas** (una en GTQ y otra en USD) con una referencia común `tarjeta_grupo` (O). |
| Signo | Se guarda igual que hoy. Para la tarjeta, un débito (cargo) **aumenta** lo que se debe y un crédito (pago o devolución) lo **reduce**. Los reportes la muestran como **pasivo**: en Saldos por cuenta va en un grupo «Tarjetas de crédito», nunca dentro de «Bancos» ni compensada con él (NIIF para las Pymes 2.52, ya aplicado a los sobregiros). |
| Estado de cuenta | Cabecera por corte (`fecha_de_corte`, `fecha_limite_de_pago`, `saldo_al_corte`, `pago_minimo`, `pago_de_contado`, archivo opcional), porque los bancos mueven el corte en fines de semana. **La conciliación es por período de corte** (día siguiente al corte anterior → corte), no por mes calendario. Es la diferencia principal con una cuenta monetaria. |
| Origen de los cargos | (1) Cuentas por pagar con la forma de pago **«tarjeta»**: el pago extingue la deuda con el proveedor en la fecha del consumo y crea el cargo en la tarjeta con origen; sin retención descontada; aviso de A-1 y de la retención. (2) Sin Cuentas por pagar: nota de cargo manual con concepto, y la factura en Libro de compras. (3) Cargos del emisor (intereses, comisiones, membresía, seguros): notas **sin aprobación** (cargos del banco) y la FEL al Libro. |
| Compras en cuotas sin interés | El pasivo es **el total** desde la compra; el estado de cuenta muestra solo la cuota. La conciliación necesita la partida «Cuotas por facturar del emisor». Si no se modela, la tarjeta nunca cuadra. Pregunta Q-T3. |
| Consumos sin factura | Es el trabajo diario real con tarjetas corporativas. El estado de cuenta trae consumos que nadie documentó. En la conciliación: «Consumos sin documento». O se registra la factura, o se carga al empleado (Cuentas por liquidar). Si no hay documento, no hay crédito fiscal ni deducción. |
| Pago de la tarjeta | Transferencia desde una cuenta monetaria. Con monedas distintas, transferencia cruzada (Multimoneda). Pasa por la aprobación de transferencias si está encendida. |
| Saldo inicial | El mismo mecanismo de apertura con partidas, con el signo del pasivo: saldo al corte del estado de cuenta + consumos registrados que el emisor aún no cobró − pagos en tránsito. |
| Diferencial cambiario | La tarjeta en USD es una partida monetaria: se reexpresa al cierre (NIIF para las Pymes 30.9, ya en §11.8). |
| Tarjeta de débito | **No es otro tipo**: es un medio de pago de la cuenta monetaria (nota de débito). |

---

## 3. CP-AP: cheques de apertura y facturas del saldo inicial (N-2)

### 3.1 Dos casos que no se deben mezclar

| Caso | ¿La factura va en el saldo inicial de Cuentas por pagar? | Por qué | ¿Ligar? |
|---|---|---|---|
| **Cheque en circulación de apertura** (fecha ≤ corte, entregado) | **No.** El cheque entregado ya pagó la factura. | Decidido en C-CP4-3. En libros, el pasivo se dio de baja al entregar el cheque (P). | No hace falta. Si el usuario cargó las dos cosas por error, se corrige con «aplicar a la cuenta de apertura». Mejora (O): una referencia **informativa** opcional al cheque de apertura en ese pago, para que la bandeja la proponga si el cheque se anula. |
| **Cheque posfechado entregado antes del corte** (fecha > corte) | **Sí.** La deuda existe al corte y se extingue **en la fecha del cheque**. | CP4 §2.4 y NIIF para las Pymes 11.36. El cheque es pagadero a la vista (C. Com., art. 501) y se recibe salvo buen cobro (art. 410). | **Sí: esto es N-2.** |

### 3.2 N-2: veredicto sobre las opciones

| Opción | Juicio |
|---|---|
| (a) Forma de pago «cheque ya entregado» que liga el pago al cheque de Bancos con su fecha | **Correcta.** Recomendada, con los ajustes de §3.3. |
| (b) Mientras tanto, «aplicar a la cuenta de apertura» con advertencia | **Incorrecta, ni siquiera como solución temporal.** (1) Da la factura por pagada en la fecha de inicio, antes que el cheque, y deja en cero el pasivo de Cuentas por pagar al corte, que sí existía. (2) Si después el posfechado se anula, la factura queda pagada sin dinero y **nada la revive**: el posfechado no es partida de apertura, así que no emite `partida_de_apertura_anulada` ni entra a la bandeja. (3) El efecto contable sería contra la cuenta puente, que no corresponde. |
| (c) No cargar esas facturas en Cuentas por pagar | Incorrecta (contradice C-5 y el saldo al corte). |
| **Mientras no exista (a)** | La factura queda **pendiente** en Cuentas por pagar (es lo correcto al corte). Se agrega un aviso o hallazgo: «Hay N cheques posfechados de apertura sin ligar: no pague estas facturas otra vez». Va en la ficha del proveedor y en la revisión del cierre de la carga (EM-2). |

### 3.3 Reglas de la opción (a), para el diseño corto

1. **Forma nueva** en Cuentas por pagar, por ejemplo `cheque_de_apertura`, con permiso propio. Las líneas son cargos de origen `saldo_inicial` del mismo proveedor. Como todo pago: autorizados y en contraseña (consistente con «aplicar a la cuenta de apertura»).
2. **Orden nueva de Bancos** (por ejemplo `bancos.ligar_cheque_de_apertura`). Valida que el movimiento sea un `cheque_posfechado` vigente, sin origen y sin ligar, y que el **monto sea igual** a la suma de las líneas (es un solo pago, como en CP4). Si el beneficiario escrito no coincide con el nombre del NIT del proveedor: **aviso, no bloqueo**, porque el papel ya se entregó así. Pone `origen = cuentas_por_pagar` y el `documento_de_origen_id` del pago, y cambia el concepto al de sistema de pagos a proveedores. Esto último es **indispensable**: si el cheque se cargó con un concepto de gasto, Contabilidad registraría dos veces el gasto (una por el concepto y otra por la factura). Auditoría `corregir` en Bancos.
3. **Fecha del pago = fecha del cheque, fija.** Queda «comprometido» hasta esa fecha y «pagado» en ella (CP4 §2.4). La bancarización cuenta en el mes del cheque. **Sin retención descontada**: las retenciones del saldo inicial son del sistema anterior (U8).
4. **Se permite con la carga abierta o cerrada.** No cambia ningún saldo al corte: el pago es posterior al corte. También se permite después de la fecha del cheque, aunque ya esté cobrado o conciliado, porque monto y fecha no cambian.
5. **Anular después de ligar:** solo desde Cuentas por pagar (anular el pago), como todo cheque con origen. Bancos anula el cheque como un cheque normal (BS-3) y la factura vuelve a estar pendiente. **No pasa por la bandeja de CP-AP**: nunca se pagó en Cuentas por pagar, así que no hay deuda que «revivir». Es la ventaja principal del modelo.
6. **Desligar sin anular** (se ligó a la factura equivocada): acción propia con permiso, motivo y auditoría. El cheque vuelve a «sin origen» y el pago queda anulado sin anular el cheque.
7. **Anular sin ligar:** la factura sigue pendiente. Es correcto y no hay que hacer nada.
8. **Hallazgo de cierre (EM-2):** posfechados de apertura sin ligar con Cuentas por pagar activo.

### 3.4 Bandeja de CP-AP (cheque en circulación de apertura anulado): ajustes sobre §16.2

| Punto | Recomendación | Base |
|---|---|---|
| Fecha de la deuda reconocida | La **del inverso** en Bancos, no la de hoy. Así Debe Bancos / Haber Proveedores quedan en la misma fecha. Vencimiento inmediato: la factura original ya estaba vencida. | P |
| **No entra al Libro de compras** | La deuda reconocida es un cargo nuevo de origen «cheque de apertura anulado», **sin IVA ni documento del Libro**. El IVA de la factura original ya se acreditó en su período, en el sistema anterior. Meterla otra vez duplicaría el crédito fiscal. | L: el crédito fiscal es por documento y período (Ley del IVA, art. 16, a cotejar) |
| Monto | El del cheque, que es el neto: las retenciones ya se practicaron en el sistema anterior y no se recalculan (U8). | P |
| Proceso | Para pagarla de nuevo se autoriza y va a una contraseña, como cualquier cargo. | Consistencia con CP4 |
| Si el usuario había cargado la factura por error y la aplicó a la cuenta de apertura con referencia al cheque (§3.1) | La bandeja la propone, pero **no anula** el pago de apertura: eso cambiaría el saldo al corte. Se reconoce la deuda con un cargo nuevo. | P |
| Acreedores varios, plazos de prescripción, «ya pagada» contra la cuenta de pago | Se mantiene lo de §16.2. | C-3, C-9 |

---

## 4. Lo que hay que pasarle a `arquitecto-de-datos` (descripción, no migraciones)

1. `bancos.solicitudes`: agregar `aprobaciones_requeridas` y una tabla hija de aprobaciones (usuario y fecha, único por solicitud y usuario) si se eligen dos niveles. Variable de empresa con los niveles. Regla de suma por beneficiario (A-2). Referencia del banco editable después de aprobar (A-4).
2. Cuentas por pagar y Caja chica: la regla «quien autoriza no paga» cuando la aprobación de Bancos está encendida (A-1).
3. Tarjeta: el tipo de cuenta y sus columnas, la cabecera del estado de cuenta, la conciliación por corte, la forma de pago «tarjeta» en Cuentas por pagar y el concepto para la transferencia hacia una tarjeta (§2.3).
4. CP-AP: la forma `cheque_de_apertura`, la orden de ligar, desligar y la referencia informativa en el pago de apertura (§3.3 y §3.4).

## 5. Preguntas para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| Q-A1 | ¿Cómo se aprueban los montos grandes? | (a) Un umbral y un aprobador. (b) **Niveles por monto, con 1 o 2 aprobadores distintos** (máximo dos niveles). (c) Límite por usuario. | **(b)**: imita las firmas mancomunadas; (c) más adelante si alguien lo pide. |
| Q-A2 | ¿Se suman los pagos al mismo beneficiario para el umbral? | Por día / por semana / no | **Por día**, configurable. |
| Q-A3 | Con la aprobación encendida, ¿Cuentas por pagar y Caja chica exigen que quien autoriza no sea quien paga? | Sí (se cierra A-1) / No (se acepta el hueco) | **Sí**. Si no, la aprobación se salta pagando por Cuentas por pagar. |
| Q-A4 | ¿La aprobación de una transferencia crea el movimiento, o se espera la referencia del banco? | Crea el movimiento y se captura la referencia después, con aviso / Dos pasos | **Lo primero.** |
| Q-T1 | ¿Tarjeta antes o después de Multimoneda? | — | **Después** (ya decidido en §11.3), porque las tarjetas suelen ser bimonetarias. |
| Q-T2 | ¿La tarjeta se concilia por período de corte o por mes calendario? | Corte / Mes | **Corte**: es como viene el estado de cuenta. |
| Q-T3 | ¿Se manejan compras en cuotas (tipo Visacuotas)? | Sí, con la partida de cuotas por facturar / No por ahora | **Sí** si sus clientes las usan, que en Guatemala es común. |
| Q-T4 | ¿En qué actividad del flujo de efectivo va el pago de la tarjeta? | Operación por omisión, editable / Financiación | **Operación por omisión.** |
| Q-T5 | ¿Se aceptan tarjetas personales de empleados o socios como cuenta de la empresa? | No; esos gastos van por Cuentas por liquidar / Sí, con aviso | **No**: el riesgo de bancarización y deducibilidad lo hace inconveniente. |
| Q-N2 | N-2: ¿opción (a) y, mientras tanto, la factura pendiente con aviso (no la (b))? | (a) + aviso / (a) + (b) | **(a) + aviso.** La (b) es incorrecta (§3.2). |
| Q-N3 | ¿Se permite desligar un cheque de apertura sin anularlo? | Sí, con permiso y motivo / No | **Sí.** |

## 6. Veredicto

- **Aprobaciones (§11.1):** **correcto con ajustes**: A-1 (hueco de segregación en Cuentas por pagar y Caja chica), A-2 (fraccionamiento), A-3 (niveles), A-4 (referencia del banco), A-5 (fecha), A-6 (firma «Autorizó»), A-7 (superacceso) y A-9 (un solo usuario).
- **Tarjeta de crédito (§11.3):** **correcto con ajustes**: decir «saldo por pagar» y no «saldo deudor»; conciliación por corte; la transferencia hacia una tarjeta es salida de efectivo; el IVA solo desde la FEL del emisor (no suponer exención ni gravamen); compras en cuotas; consumos sin documento; avisos de retención; tarjeta bimonetaria como dos cuentas.
- **CP-AP y N-2:** la bandeja (§2.5, opción C) es **correcta con ajustes** (fecha del inverso, fuera del Libro de compras, monto neto). En N-2 la opción **(a) es correcta**, con las reglas de §3.3, en particular el cambio de concepto para no duplicar el gasto. La **(b) es incorrecta**: no debe usarse ni como solución temporal.

**Pendiente de cotejar antes de mostrarlo en la ayuda:** Decreto 20-2006, arts. 4 y 20; Ley del IVA, arts. 7 (numeral 4), 16, 18 y 37; Decreto 10-2012, arts. 21 (numeral 22), 23 y 48; Decreto 2-2024. El Código de Comercio (arts. 410 y 501) ya tiene pedido su cotejo con CENADOJ.

**Fuentes:**
- [ICNL, Ley del IVA (Decreto 27-92)](https://www.icnl.org/research/library/guatemala_valor/)
- [BAC Credomatic, transparencia de la tarjeta de crédito](https://www.baccredomatic.com/es-gt/tarjetas/credito/transparencia)
- [vLex, Decreto 2-2024](https://gt.vlex.com/vid/decreto-no-2-2024-1023952154)
- [AGN, publicación del Decreto 2-2024](https://agn.gt/publican-decreto-numero-2-2024-ley-de-tarjetas-de-credito/)
- [La Hora, Ley de Tarjetas de Crédito](https://lahora.gt/nacionales/jmaldonado/2024/02/16/ley-de-tarjetas-de-credito-intereses-ya-no-seran-capitalizados/)
- [Revista EyN, lo que debe saber de la ley](https://www.revistaeyn.com/centroamericaymundo/guatemala-lo-que-debe-saber-sobre-la-nueva-ley-de-tarjetas-de-credito-CA17604723)
- [Deloitte, Tax Alert 21-08](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%20-%2021-08.pdf)
- [Consortium Legal, Decreto 22-2026](https://consortiumlegal.com/2026/10/01/decreto-22-2026-exencion-idp-iva-combustibles/)
- [Justia, Decreto 20-2006](https://guatemala.justia.com/nacionales/leyes/decreto-no-20-2006-jun-6-2006/gdoc)
- [COSO, control interno](https://www.coso.org/guidance-on-ic)
