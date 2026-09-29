# Validación contable de H7, H11 y el momento de las retenciones (contador-guatemala, 2026-09-29)

Solo lectura de documentos y normas. No se pudo leer el reglamento vigente del IVA (AG 5-2013); se citan los
reglamentos anteriores (AG 311-97 y AG 425-2006), cuyos artículos equivalentes en el AG 5-2013 hay que confirmar.

## H7 Comisiones bancarias con IVA — incorrecto como está planteado

- **Ley del IVA, art. 7.4:** exentos los servicios de instituciones fiscalizadas por la SIB y bolsas de valores
  (en seguros y fianzas solo reaseguro y reafianzamiento). Art. 7.5: cooperativas de ahorro y crédito, exentas.
- **Decreto 10-2012, art. 22.4.e:** los gastos cobrados por entidades supervisadas por la SIB se respaldan con
  recibo de caja o nota de débito; no hace falta factura.
- Conclusión: comisiones, manejo de cuenta, cheques rechazados, transferencias, cambio de moneda e intereses de
  bancos, financieras, casas de cambio y almacenes de depósito están **exentos**: no hay crédito fiscal que perder.
  Chequeras: probablemente dentro del 7.4 (sin criterio SAT expreso).
- Hay que corregir en el plan «servicios gravados, arts. 3 y 16» y «si el IVA se deja dentro de la nota de débito,
  se pierde», y la fila H7 de `HOJA-DE-RUTA.md`.

Cargos debitados que **sí** llevan IVA: primas de seguro (la aseguradora emite FEL), débitos automáticos de terceros
(luz, teléfono, arrendamiento de empresa no bancaria) y comisiones de entidades no fiscalizadas por la SIB.

Ajustes al diseño:
1. El destino «Bancos» en Ingreso de facturas sirve para facturas de **terceros** pagadas por nota de débito sin
   contraseña. Contrapartida: la cuenta bancaria, sin provisión.
2. Una comisión bancaria sin factura no pasa por Libro de compras: solo Bancos, concepto «Comisiones bancarias».
3. FEL exenta del banco: registro opcional como compra exenta (columna sin crédito fiscal).
4. `admite_factura` apagado por omisión en «Comisiones bancarias», encendido en «Seguros» y «Débito automático».

Asientos: comisión exenta → Debe gasto / Haber Bancos. Factura ligada a la nota → Debe gasto + IVA crédito fiscal /
Haber Bancos. Nota antes que factura → Debe «Cargos bancarios por documentar» / Haber Bancos; al llegar la factura,
Debe gasto + IVA / Haber la transitoria.

Una factura mensual por varias notas: el diseño actual (`unique (documento_id)`, un `movimiento_id`) no lo soporta.
Propuesta: tabla documento ↔ nota con `monto_aplicado`, `unique (documento_id, movimiento_id)`; lo aplicado no supera
el monto de la nota ni el total del documento; el período del IVA sigue la fecha de emisión de la factura (art. 20).

Retenciones en el destino «Bancos»: no se proponen (el banco ya pagó el total; entre agentes de retención no se
retiene, Decreto 20-2006 art. 9; régimen sobre utilidades sin retención ISR, Decreto 10-2012 art. 48). **Avisar** si
el proveedor sería sujeto de retención (responsabilidad solidaria, Decreto 20-2006 art. 7).

## H11 Plazo del crédito fiscal — correcto con ajustes

- **Ley del IVA, art. 20:** la factura puede reportarse como máximo en los dos meses siguientes al período de su
  operación; después no hay derecho a compensación ni devolución. Se cuenta por **fecha de emisión** (DTE), no de
  recepción. Factura de enero: períodos de enero, febrero o marzo (el de marzo se declara en abril). La `check`
  `periodo <= mes de emisión + 2` es correcta; redactar el ejemplo como «período de marzo, declarado en abril».
- IVA fuera de plazo: Decreto 10-2012 art. 21.15 da argumento para tratarlo como costo o gasto deducible
  (interpretación, sin criterio SAT). **Quitar la fuente de Lexology** (trata del vencimiento de facturas en papel).

Ajustes:
1. Registrar con aviso, `iva_acreditable = false` e IVA al costo es correcto; además: cuenta del IVA no acreditable
   **configurable** (deducible o no deducible), y el documento **va en el Libro de compras** del período de registro
   en la columna sin crédito fiscal (AG 311-97 art. 38; confirmar en AG 5-2013).
2. Convertir `iva_acreditable` en un **motivo**: `fuera_de_plazo`, `no_vinculado`, `pequeno_contribuyente`, `exento`.
3. Notas de crédito del proveedor (Ley del IVA art. 17; AG 311-97 art. 21): rebajan el crédito del **período en que
   se reciben** (diseño correcto). Faltan: sin los dos meses de gracia; si la factura quedó sin crédito fiscal, la
   nota rebaja el costo y no el crédito; la nota lleva número y fecha de la factura; avisar si la nota es más de dos
   meses posterior a la factura (art. 17, párrafo 3).

## Momento de la retención — la HOJA-DE-RUTA está equivocada («nace al autorizar»)

| Retención | Norma | Momento | Constancia y entero |
|---|---|---|---|
| IVA por agente (exportador, especial, otro), al crédito | Decreto 20-2006 arts. 1, 5, 6; AG 425-2006 art. 10 | Al **recibir la factura** | Fecha de recepción; entero en 15 días hábiles del mes siguiente |
| IVA al contado | Decreto 20-2006 arts. 5, 6 | Al pagar (coincide con la factura) | Igual |
| IVA 5 % a pequeño contribuyente | Ley del IVA art. 48 | Al acreditar en cuenta o poner a disposición, lo primero entre provisionar y pagar | 15 días del mes siguiente |
| ISR régimen opcional simplificado | Decreto 10-2012 art. 48 | Constancia **con la fecha de la factura** | Entregar a más tardar el 5 del mes siguiente; entero en 10 días; mínimo Q2,500 sin IVA |

Recomendación: las retenciones se calculan y **fijan al registrar el documento en Libro de compras** (ISR con la
fecha de la factura; IVA general con la de recepción; pequeño contribuyente con la de autorizar o pagar, la primera).
Cuentas por pagar solo las **descuenta** del saldo en el primer pago. Avisar si el plazo de entero de ese mes ya
pasó (multa e intereses).

## Preguntas para el usuario

1. En «DTE recibidos» de la SAT: ¿sus bancos emiten FEL por comisiones o chequeras? ¿Con IVA o exentas?
2. ¿Qué cargos debitados en las cuentas sí traen factura (seguros, servicios, arrendamiento)?
3. ¿Acepta ligar varios documentos por nota y varias notas por documento, con monto aplicado?
4. IVA fuera de plazo: ¿cuenta de gasto deducible o no deducible? (recomendado: configurable).
5. ¿Confirma que las retenciones se fijan al registrar la factura y no al autorizar?
6. El plan pone un mínimo de Q2,500.01 para la retención del 5 % a pequeños contribuyentes; el art. 48 de la Ley del
   IVA no trae mínimo. Confirmar en el AG 5-2013 antes de programarlo.

## Fuentes

Ley del IVA (Decreto 27-92) con reformas; Decreto 10-2012 con reformas del 19-2013; Decreto 20-2006; AG 425-2006;
AG 213-2013; AG 311-97; vescco.tax (crédito fiscal después de dos meses).

## Mínimo de la retención del 5 % a pequeños contribuyentes (2026-09-29)

**Conclusión: el mínimo existe y viene del reglamento.** El art. 48 de la Ley del IVA no trae monto mínimo;
lo pone el **AG 5-2013 (Reglamento de la Ley del IVA), art. 49, «No obligatoriedad de retener»**: los agentes de
retención practican la retención a pequeños contribuyentes **únicamente cuando paguen bienes y servicios cuyo
valor sea mayor a Q2,500.00**. El «Q2,500.01» del plan es la misma regla escrita como la escribe la SAT en su
portal (RetenIVA): **mayor que Q2,500.00**, no «desde Q2,500». El art. 59 (transitorio) del mismo acuerdo condonó
multas y recargos a los agentes que antes no retuvieron en compras **iguales o menores** a Q2,500.00, lo que
confirma que Q2,500.00 exactos no se retienen.

Limitación: el proxy bloqueó la descarga del texto íntegro (Minfin, SAT, leyes compiladas). Lo anterior sale de
extractos de buscador de esas mismas fuentes, coincidentes entre sí. Antes de cerrar H-retenciones, alguien con
acceso debe leer el art. 49 y el art. 59 en el .doc del Minfin (enlace abajo) y confirmar que no hubo reforma
posterior al AG 5-2013 sobre este punto.

### Qué está confirmado por norma y qué no

| Punto | Respuesta | Fuente | Grado |
|---|---|---|---|
| Monto mínimo | Se retiene solo si el valor es **mayor a Q2,500.00** | AG 5-2013 art. 49; art. 59 (transitorio) | Norma (reglamento) |
| Quién retiene | **No cualquier contribuyente**: los **agentes de retención del IVA** (calificados por la SAT, Decreto 20-2006) y quienes **lleven contabilidad completa y la SAT designe** | Ley del IVA art. 48 (texto del Decreto 4-2012) | Norma (ley) |
| Tasa y carácter | 5 %, **pago definitivo** del impuesto del pequeño contribuyente | Ley del IVA arts. 47 y 48 | Norma (ley) |
| Base | El **total de los ingresos consignados en la factura** de pequeño contribuyente (la factura no desglosa IVA, así que es el total) | Ley del IVA art. 48 | Norma (ley) |
| Momento | Al **pagar o acreditar en cuenta**, lo que ocurra primero; el entero es dentro de los 15 días del mes siguiente al pago o acreditamiento, con constancia | Ley del IVA art. 48 | Norma (ley) |
| ¿Mínimo por factura o por pago? | La ley calcula sobre la factura y el reglamento habla del «valor» de los bienes y servicios; la SAT lo presenta como el monto de la factura. **Por factura**, no por pago ni por suma de facturas del mes | AG 5-2013 art. 49; portal SAT RetenIVA | **Inferencia** razonable y práctica general; no hay criterio SAT expreso |
| Pagos parciales de una factura mayor a Q2,500 | Se retiene el 5 % del **total de la factura**, en el **primer** pago o acreditamiento | Ley del IVA art. 48 (base = total de la factura; momento = primer evento) | **Inferencia**; algunos practican la retención proporcional en cada pago, pero no concuerda con «total de la factura» |
| Excepciones al mínimo (sector público, operadoras de tarjeta, combustible pagado con tarjeta) | Aparecen en guías (p. ej. Tigo) y vienen del régimen general del Decreto 20-2006 / AG 425-2006 | Fuentes secundarias | **No confirmado** para pequeños contribuyentes; no aplica a una finca privada: no programarlo |
| Relación con el mínimo del ISR (Q2,500 **sin IVA**, Decreto 10-2012 art. 48) | Es otra retención, otra base y otra norma; no mezclar | Decreto 10-2012 art. 48 | Norma |

### Correcciones al plan de Libro de compras (sección «Retenciones»)

1. La fila «Cualquier agente, compra a pequeño contribuyente» está bien en tasa y base, pero «cualquier agente» debe
   leerse como «empresa que es agente de retención del IVA o designada por la SAT (contabilidad completa)»: una
   empresa que no es agente **no** retiene a pequeños contribuyentes.
2. «facturas desde Q2,500.01» es correcto en efecto, pero conviene expresarlo como **total > Q2,500.00** (así lo
   dice la norma y evita errores de redondeo). El número va en configuración de instalación, con Q2,500.00 como
   umbral por omisión.
3. La excepción «no se retiene si el proveedor también es agente» no juega aquí en la práctica (un pequeño
   contribuyente no es agente), pero no estorba.

### Regla que debe programarse

```
Retener 5 % a pequeño contribuyente  SI Y SOLO SI
    la empresa es agente de retención del IVA (calificada o designada por la SAT)
  Y el proveedor está en el Régimen de Pequeño Contribuyente
  Y el documento es una factura de pequeño contribuyente (FPEQ)
  Y total de ESA factura (con todo, sin desglosar IVA) > umbral        [umbral por omisión Q2,500.00]
Monto   = redondear(total de la factura × 5 %, 2)
Fecha   = la primera entre: acreditamiento en cuenta (registro de la cuenta por pagar) y el pago
Entero  = dentro de los 15 días del mes siguiente a esa fecha
```

- El umbral se evalúa **por factura**; no se suman facturas del mismo proveedor ni se evalúa cada pago.
- Q2,500.00 exactos: **no** se retiene. Q2,500.01: sí.
- Con pagos parciales, la retención completa se aplica en el primer pago o acreditamiento (inferencia; dejar que el
  usuario la ajuste, como ya prevé el plan, y que quede en la auditoría).
- Pregunta abierta para el usuario y su contador: si una nota de crédito deja la factura en Q2,500.00 o menos
  después de retenida, ¿se revierte la retención o se ajusta en proporción? No hay norma expresa; la recomendación es
  ajustar en proporción, como el plan ya hace con las demás retenciones.

### Fuentes

- Ley del IVA, Decreto 27-92, arts. 47 y 48 (texto del Decreto 4-2012):
  [Decreto 4-2012](https://extranet.who.int/fctcapps/sites/default/files/2023-04/guatemala_2018_annex-15_Decree_4-2012.pdf).
- Reglamento de la Ley del IVA, AG 5-2013, arts. 49 y 59:
  [Minfin (.doc)](https://www.minfin.gob.gt/images/leyes%20solicitadas/Leyes%20tributarias/ACUERDO%20GUBERNATIVO%205-2013%20(Reglamento%20ley%20del%20IVA).doc),
  [Leyes Tributarias Guatemala](https://www.leyestributariasguatemala.com/leyes/reglamento-de-la-ley-del-iva-acuerdo-gubernativo-5-2013),
  [INFILE](https://leyes.infile.com/index.php?id=181&id_publicacion=182&id_publicacion=67231).
- SAT, Sistema Retenciones Web IVA (5 % a pequeño contribuyente, monto ≥ Q2,500.01; entre agentes no se retiene):
  [portal SAT](https://portal.sat.gob.gt/portal/sistemas-web/retencioneswebiva/).
- Práctica (secundarias): [Tigo, «Agentes de Retención»](https://pos.tigo.com.gt/assets/descargas/Agentes_de_Retencion.pdf),
  [Vescco, régimen de pequeño contribuyente 2026](https://vescco.tax/blog/regimen-pequeno-contribuyente-actualizado-2026/).

## Tres dudas de Libro de compras (2026-09-29)

Informe del contador. El proxy bloqueó los textos íntegros; los artículos se confirmaron con buscador y fragmentos. **Norma** = texto legal; **Práctica** = cómo se hace; **Inferencia** = opinión sin criterio de la SAT.

**Corrección previa:** el plazo para acreditar el IVA está en el **art. 20** de la Ley del IVA (el mes de la factura o, como máximo, los dos siguientes), no en el art. 18. Donde el plan o las pantallas digan «art. 18», debe decir «art. 20».

### 1. FEL exenta del banco por comisiones

| Punto | Respuesta | Fuente | Grado |
|---|---|---|---|
| ¿Es exenta? | Sí: servicios de entidades fiscalizadas por la SIB. | Ley del IVA art. 7 num. 4 | Norma |
| ¿Va en el libro de compras? | Sí, como compra exenta de servicio, sin crédito fiscal, con la casilla SAT marcada (la SAT cruza los DTE recibidos con el libro). | Ley del IVA art. 37; AG 5-2013 | Norma en lo general; incluir exentas es Práctica |
| Retenciones | Ninguna (sin IVA; el banco está en el régimen sobre utilidades). | Decreto 20-2006; Decreto 10-2012 art. 48 | Norma |
| ¿Deducible para ISR? | Sí, gasto útil y necesario. Si la FEL es por intereses, rigen los límites de deducción de intereses. | Decreto 10-2012 arts. 21 y 22 num. 4 lit. e | Norma |
| ¿Destino? | El gasto ya está en Bancos; provisionarlo también en Cuentas por pagar lo duplica. | NIIF para pymes 2.36 | Norma contable |

Regla: **el gasto de una comisión bancaria se reconoce una sola vez.** (A) Cuentas por pagar: provisiona y la nota de débito de Bancos paga la contraseña, sin tocar otra vez el gasto. (B) **Solo fiscal (informativa)**: entra al libro sin asiento ni pendiente en otro módulo. **Recomendación: (B).**

### 2. IVA de una factura recibida fuera de plazo (art. 20)

| Punto | Respuesta | Fuente | Grado |
|---|---|---|---|
| ¿Deducible para ISR? | El IVA se excluye solo cuando no es costo; el que ya no se acredita sí es costo, así que es deducible. | Decreto 10-2012 art. 21 num. 15 | Norma + Inferencia |
| Contable | Un impuesto no recuperable forma parte del costo. | NIIF para pymes 13.6 y 17.10 | Norma contable |
| Analogía | La SAT aceptó como deducible el ISO que ya no se podía acreditar. | Criterio SAT 2-2021 | Analogía |
| Riesgo | Sin criterio SAT sobre el IVA; un auditor podría alegar negligencia. | — | Bajo o medio |

Por omisión es **deducible porque sigue a su línea**: depende del régimen de ISR (solo importa en utilidades), de que el gasto de la línea sea deducible, de si la línea es activo fijo (va al costo del activo y se deprecia) y de si es no vinculada (art. 16).

Regla: si `periodo > mes de emisión + 2` → `iva_acreditable = false`, motivo `fuera_de_plazo`, y **el IVA se suma al monto de cada línea** en proporción a su parte gravada (hereda concepto, activo fijo y deducibilidad). La cuenta configurable por empresa queda como alternativa para verlo aparte.

### 3. Nota de crédito que deja una factura de pequeño contribuyente en Q2,500.00 o menos

Norma: la retención es sobre el total, al pagar o acreditar en cuenta (lo primero), y es pago definitivo (Ley del IVA art. 48); solo si el valor es mayor a Q2,500.00 (AG 5-2013 art. 49). No hay norma para la nota posterior. Lectura (inferencia): el mínimo se mide cuando se practica la retención.

| Caso | Regla | Certeza |
|---|---|---|
| Nota **antes** de practicar la retención | Se recalcula sobre el neto (factura − notas): si es ≤ umbral, 0; si no, 5 % del neto. | Media |
| Nota **después** de practicarla | **Se mantiene**; no se devuelve ni se ajusta (no hay retención negativa). A pagar = factura − nota − retención. El proveedor reclama a la SAT si pagó de más. | Media-alta |
| Constancia emitida sin enterar, en el mismo mes | Solo por decisión del contador: anular en RetenIVA y recalcular, manual, con motivo y auditoría. | Baja |

Choca con el diseño: «fijar al registrar» no es «practicar». El momento legal es la **provisión en Cuentas por pagar o el pago**: la retención se **congela al provisionar o pagar**; antes, una nota de crédito la recalcula. Se corrige la recomendación anterior de «ajustar en proporción» (sirve solo antes de retener).

### Fuentes

- Ley del IVA, Decreto 27-92: [TSE](https://tse.org.gt/images/UECFFPP/leyes/decreto_27-92-iva.pdf), [art. 20](http://leydeguatemala.com/ley-del-iva-de-guatemala/reporte-del-credito-fiscal-iva-guatemala/294/), [Vescco](https://vescco.tax/blog/credito-fiscal-iva-en-guatemala-despues-de-dos-meses/)
- Decreto 10-2012: [Congreso](https://www.congreso.gob.gt/assets/uploads/info_legislativo/decretos/2012/010-2012.pdf), [TSE](https://tse.org.gt/images/UECFFPP/leyes/decreto_10-2012_Ley_actualizacion_tributaria.pdf)
- AG 5-2013: [Minfin](<https://www.minfin.gob.gt/images/leyes%20solicitadas/Leyes%20tributarias/ACUERDO%20GUBERNATIVO%205-2013%20(Reglamento%20ley%20del%20IVA).doc>)
- [Criterio SAT 2-2021](https://portal.sat.gob.gt/portal/descarga/15417/criterios-2021/49597/criterio-tributario-institucional-2-2021-acreditamiento-del-impuesto-de-solidaridad-pagado-ante-la-administracion-tributaria-en-forma-extempora-2.pdf)
- [Retenciones Web IVA](https://portal.sat.gob.gt/portal/sistemas-web/retencioneswebiva/)
- [Consortium Legal, deducibilidad de intereses](https://consortiumlegal.com/2023/02/08/guatemala-cambio-en-la-deducibilidad-de-los-intereses/)

### Decisiones del usuario sobre estas tres dudas (2026-09-29)

1. **FEL exenta del banco:** va a **Cuentas por pagar**. En Bancos, la nota de débito
   se **marca para uso de Cuentas por pagar**; al crear la contraseña se liga
   directamente esa nota como forma de pago, sin emitir otro pago. Pendiente del
   contador: cómo evitar que el gasto se reconozca dos veces (la nota marcada no
   debería llevar un concepto de gasto).
2. **IVA fuera de plazo:** el usuario pide que el contador **investigue a fondo** la
   forma correcta antes de decidir (sumarlo a cada línea o a una cuenta aparte).
3. **Retención:** se **fija al registrar** la factura, como ya estaba en el plan (el
   usuario no acepta congelarla al provisionar o pagar). Por lo tanto, una nota de
   crédito posterior al registro **no** cambia la retención. Riesgo anotado: el momento
   legal de practicarla es el pago o el acreditamiento en cuenta (art. 48).
4. **Anular constancias en RetenIVA:** no se ofrece.

### Seguimiento del contador (2026-09-29)

No hay criterio de la SAT, del TAT ni doctrina publicada sobre el IVA no acreditado por extemporáneo; lo que sigue es norma donde se indica y, si no, práctica o analogía.

#### IVA fuera de plazo: forma correcta

| Fuente | Qué dice o hace | Grado |
|---|---|---|
| Ley del IVA art. 20 | Pasados dos meses no hay compensación ni devolución; nada sobre ISR. | Norma |
| Decreto 10-2012 art. 21 num. 15 | Impuestos pagados deducibles, salvo ISR e IVA «cuando no constituyan costo»; el IVA irrecuperable sí es costo. | Norma (redacción por fragmento) |
| Criterio SAT 2-2021 | Aceptó como deducible el ISO que ya no se podía acreditar. | Analogía |
| NIIF para pymes 13.6 y 17.10 | Impuestos no recuperables forman parte del costo. | Norma contable |
| SAP Business One, Odoo | El IVA no deducible va a la cuenta de gasto, activo o inventario de la línea; la cuenta aparte es opcional. | Práctica de ERP |

**Regla única:** si `periodo > mes de emisión + 2`: (1) el documento va al libro sin crédito fiscal, motivo `fuera_de_plazo`; (2) el IVA se suma al monto de cada línea gravada, en proporción a su base; (3) cada línea conserva su concepto, cuenta y bandera de activo fijo (gasto deducible → IVA deducible; activo fijo → al costo del activo y se deprecia; inventario o activo biológico → a ese costo; línea no deducible → IVA no deducible); (4) en el régimen opcional simplificado no afecta; (5) **sin cuenta aparte** de «IVA fuera de plazo». Guardar por línea `iva_no_acreditable` separado de la base (para el `arquitecto-de-datos`). Riesgo: el ISR se deduce en el período del gasto (fecha de la factura); una factura de diciembre registrada en marzo cae en un año que puede estar cerrado: avisar al contador. Certeza: alta en lo contable, media-alta en la deducibilidad.

#### FEL exenta del banco ligada a una nota de débito marcada

Correcto si **la nota marcada no lleva concepto de gasto**:

| Momento | Asiento | Regla |
|---|---|---|
| Nota marcada en Bancos | Debe «Pagos a proveedores por aplicar» (transitoria) / Haber Bancos | Al marcarla se impone el concepto «Pago a proveedores». |
| FEL registrada y provisionada en Cuentas por pagar | Debe Gasto / Haber Proveedores | Aquí se reconoce el gasto, una sola vez. |
| Contraseña con la nota ligada | Debe Proveedores / Haber transitoria | Sin otro pago; lo ligado no pasa del saldo libre de la nota. |

Riesgos y reglas: (1) la FEL puede no llegar (para ISR basta la nota): reporte de «notas marcadas sin ligar» con antigüedad y opción de **desmarcar** al cierre y pasarla a un concepto de gasto, con auditoría; (2) una FEL puede cubrir varias notas o al revés: varias notas por contraseña y aplicaciones parciales, diferencias ajustadas a mano con auditoría; (3) nota de diciembre y FEL de enero: avisar por el cambio de año; (4) una nota ligada no se desmarca ni se anula sin anular antes la contraseña; sin retenciones a una factura exenta del banco; la conciliación no cambia; (5) una comisión que nunca tendrá FEL no se marca: va con «Comisiones bancarias». Sirve igual para débitos automáticos de terceros con FEL gravada. Certeza: alta.

Fuentes adicionales: [Odoo, reparto de impuestos](https://www.odoo.com/documentation/19.0/developer/reference/standard_modules/account/account_tax_repartition.html), [SAP B1](https://sap-b1-blog.com/en/glossary/non-deductible-pre-tax/), [Consortium Legal](https://consortiumlegal.com/2024/04/02/robo-legal-del-credito-fiscal-en-el-iva-en-guatemala/).

#### Decisiones del usuario sobre el seguimiento (2026-09-29)

- **IVA fuera de plazo:** aprobado **al costo de cada línea**, sin cuenta aparte (se
  guarda por línea `iva_no_acreditable`; aviso si la factura es de un año cerrado).
- **Nota marcada:** contra la transitoria **«Pagos a proveedores por aplicar»**.
- **Varias notas por contraseña y aplicaciones parciales:** sí.
- **Notas marcadas sin ligar:** se listan **al cierre de cada mes** para desmarcarlas y
  pasarlas a gasto (con auditoría).

## Cuatro dudas del diseño de datos (2026-09-29)

Informe del contador sobre `diseno-datos-libro-de-compras.md` §4.3, §6 y pregunta 12.
Los artículos salen de fragmentos coincidentes (el proxy bloqueó los textos íntegros):
leer el texto vigente de los marcados «confirmar» antes de cerrar L3-3.

### 1. Mínimo de Q2,500 de los agentes de retención del IVA: «desde»

No procede en compras **menores de** Q2,500.00 (Decreto 20-2006, art. 10; confirmar
número y reforma): **Q2,500.00 exactos sí se retienen**. Excepciones al mínimo: sector
público (su propio mínimo, no retiene si es **menor de** Q30,000.00, art. 2), operadoras
de tarjetas y combustible con tarjeta. Exportador, contribuyente especial y «otro
agente» usan el mismo mínimo. Se mide por factura sobre el total (con IVA). Contraste:
el 5 % a pequeño contribuyente es **mayor a** Q2,500.00 (AG 5-2013, art. 49). **Regla:**
`total >= retenciones_iva.minimo`. Certeza media-alta.

### 2. Base de la retención del ISR (régimen opcional simplificado)

Mínimo: no se retiene si el valor es **menor de** Q2,500.00 sin IVA (AG 213-2013, art.
35): el diseño usa `>` y debe ser **`>=`**. Base: lo pagado o acreditado **sin IVA**
(Decreto 10-2012, arts. 47 y 48). Lo exento **se incluye** (la exención de IVA no es renta
exenta de ISR, art. 11). El IDP: la norma solo excluye el IVA; el IDP forma parte del
precio del vendedor al por menor (inferencia, sin criterio SAT). Tabla: 5 % hasta
Q30,000 y 7 % sobre el excedente, por factura. **Regla:** `base_isr = total − iva`
(= base + exento + idp); se retiene si `base_isr >= 2,500.00`. Certeza alta en IVA,
exento y mínimo; media en el IDP.

### 3. ¿Se retiene IVA en documentos sin crédito fiscal?

Fuera de plazo o no vinculado: **sí** (la retención es sobre el IVA de la venta del
proveedor, no sobre el crédito del comprador; no están entre los casos en que no procede).
Exento (`iva = 0`): nada que retener. **Casilla SAT desmarcada:** en una **FEL con IVA**
no exime de retener (la SAT ve el DTE); solo es correcto desactivar retenciones en
documentos que no son factura (recibos). **Regla:** la retención depende del tipo de
documento, del IVA y de los datos de empresa y proveedor, nunca de
`motivo_sin_credito`. Opciones: (A, recomendada) no dejar desmarcar la casilla en una
factura con IVA de proveedor con NIT; (B) dejar desmarcar pero calcular igual.

### 4. Agente «otro» con 15 %: existe, con otra definición

Son los contribuyentes que **solicitan a la SAT** ser agentes de retención del IVA y ella
los califica (Decreto 20-2006, art. 6); retienen el 15 % del IVA, con el mismo mínimo
(`>=` Q2,500.00) y sin retener a otro agente. El diseño lo definía como «designado por
la SAT o con contabilidad completa»: la contabilidad completa (Ley del IVA, art. 48) solo
aplica al 5 % a pequeños contribuyentes. **Regla:** `otro` = «calificado por la SAT como
agente de retención del IVA (Decreto 20-2006, art. 6)».

**Veredicto:** correcto con ajustes: (1) mínimo del ISR `>=`; (2) `base_isr = total −
iva` con IDP; (3) desmarcar la casilla no suprime retenciones en FEL con IVA; (4)
corregir la definición de `otro`.

Fuentes: [Decreto 20-2006](http://ww2.oj.gob.gt/es/QueEsOJ/EstructuraOJ/UnidadesAdministrativas/CentroAnalisisDocumentacionJudicial/cds/CDs%20de%20leyes/2006/pdfs/decretos/D020-2006.pdf),
[AG 425-2006](https://portal.sat.gob.gt/portal/descarga/1899/legislacion-tributaria/18288/acuerdo-gubernativo-no-425-2006-reglamento-de-la-ley-denominada-disposiciones-legales-para-el-fortalecimiento-de-la-administracion-tributaria.pdf),
[AG 213-2013, art. 35](http://leydeguatemala.com/acuerdo-gubernativo-numero-213-2013/base-minima-para-practicar-retencion/12328/),
[Decreto 10-2012](https://www.congreso.gob.gt/assets/uploads/info_legislativo/decretos/2012/010-2012.pdf),
[Retenciones Web IVA](https://portal.sat.gob.gt/portal/sistemas-web/retencioneswebiva/).

### Decisiones del usuario sobre las cuatro dudas (2026-09-29)

- **Casilla «Se muestra en reportes SAT»:** se puede desmarcar también en una factura
  FEL con IVA, y entonces **no** se calculan retenciones (como estaba en el plan).
  **Riesgo aceptado por el usuario:** según el contador, la SAT ve esa FEL y la
  obligación de retener no depende de la casilla.
- **IDP en la base del ISR:** **configurable por empresa**, incluido por omisión.
- Se aplican los demás ajustes del contador: mínimo del IVA de agentes `>=` Q2,500.00,
  mínimo del ISR `>=` Q2,500.00 sin IVA, lo exento dentro de la base del ISR, retención
  de IVA también en facturas fuera de plazo o no vinculadas, y el agente `otro` definido
  como «calificado por la SAT (Decreto 20-2006, art. 6)».
