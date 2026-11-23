# Dictamen: Ventas/Caja por formas de venta (con FEL y de control)

**Veredicto: correcto con ajustes.** La regla «la forma de venta define si es formal» es sólida y no necesita un modo por empresa. Hay que hacer cuatro ajustes:

1. **Tres de los ejemplos de venta de control legítima no lo son siempre:** cortesía, entrega que se factura después y negocio distinto (§2.1).
2. **Un negocio sin NIT hoy no cabe en las dependencias.** `inventarios` depende de `libro-de-compras`, y sin datos fiscales el diseño **asume régimen general** (`diseno-inventarios.md` §6.8).
3. **La normativa FEL cambió hace 12 días.** La Resolución SAT-DSI-1793-2026 sustituyó al Acuerdo de Directorio 13-2018, que aún se cita en 8 documentos de `docs/`.
4. **El descuento al salario puede ser Q0** si el trabajador gana el mínimo (§4).

**Certeza.** **A**: ley confirmada en un dictamen previo del proyecto. **M**: copia no oficial o firma/medio que cita la norma. **B**: opinión mía o dato sin confirmar.

**Límite de esta revisión.** No pude leer los PDF oficiales (sin extractor de texto) y el portal de la SAT respondió 403. Por eso casi todo queda en M. El Código Tributario se leyó en una copia con reformas hasta 2016, y el Decreto 31-2024 lo reformó después: **confirme montos de multas antes de mostrarlos en pantalla**.

---

## 1. Nota para el usuario: vender sin inscribirse

> **Texto propuesto.** La ley no fija un monto mínimo de ventas para inscribirse en la SAT: la inscripción se hace antes de iniciar la actividad. Arrancar le permite llevar el control de su negocio aunque no esté inscrito, pero ese control no sustituye la inscripción ni la factura. Si decide formalizarse, el camino habitual es el Régimen de Pequeño Contribuyente: 5 % sobre lo vendido, hasta Q500,285 al año en 2026. Sus ventas menores de Q50 se pueden juntar en una sola factura al final del día.

| Tema | Qué dice la norma | Fuente | Certeza |
|---|---|---|---|
| Inscripción | Antes de iniciar actividades afectas; la SAT puede inscribir de oficio | Código Tributario (CT) art. 120 | M |
| Umbral fiscal | No encontré ninguno; la obligación de facturar tampoco tiene mínimo | CT art. 120; Ley del IVA art. 29 | M |
| Multa por operar sin inscripción | Q10,000 | CT art. 94 num. 15 | M (confirmar vigencia) |
| No emitir factura | Cierre temporal de 10 a 20 días, por juez | CT arts. 85 num. 1 y 86 | M |
| Impuesto omitido | Multa del 100 % más intereses | CT art. 89 | M |
| Registro Mercantil | Comerciante individual con capital de **Q2,000 o más**; plazo de un mes | C. de Comercio art. 334 y siguientes, según el Registro Mercantil | M |
| Quién no es comerciante | Profesional liberal, productor agropecuario con producto propio, artesano por encargo sin tienda | C. de Comercio art. 9 | M |
| Pequeño contribuyente | Techo de 125 salarios mínimos no agrícolas (Q500,285 en 2026); 5 % | Ley del IVA arts. 45 y 47, Decreto 31-2024 | M |
| Ventas menores de Q50 | Una factura diaria a «Clientes Varios», CF, aun si suma Q2,500 o más | Ley del IVA art. 49; AG 5-2013 art. 55 | M |

**Matiz (B):** el art. 9 quita la calidad de comerciante, **no** la de contribuyente. Una caseta con mostrador que compra y revende no encaja en esa excepción.

**Camino simple:** NIT, actualizar el RTU con actividad y establecimiento, Pequeño Contribuyente, habilitar FEL y libro. Si tiene Q2,000 o más de capital, además Registro Mercantil (unos Q100 + Q100 + Q50 en timbres, M).

---

## 2. Empresa inscrita con formas de control

### 2.1 Cuándo es legítima

La prueba es simple: **¿se entregó el bien a otra persona, o salió para el dueño o gratis?** Si sí, en régimen general hay hecho generador y debe haber documento. La factura de bienes se emite **a la entrega real** (Ley del IVA art. 34, M).

| Caso | ¿Legítima sin FEL? | Tratamiento |
|---|---|---|
| Pedido, apartado o cotización **sin entrega** | **Sí** | Si hay pago, es anticipo (regla VC-P13). En **servicios**, el IVA nace al cobrar |
| Venta ya facturada con FEL **fuera** de Arrancar | **Sí** | Anotar el número de DTE |
| Pequeño contribuyente, ventas menores de Q50 | **Sí**, si al cierre se emite la factura del día | Es el mejor caso de uso de la forma de control |
| Contingencia FEL justificada | **Sí, provisional** | Certificar después (§2.4) |
| Consumo interno del negocio | **Sí, pero no es venta** | Salida por consumo en Inventarios |
| Negocio de **otro dueño** (otro NIT o persona) | **Sí** | Debe ser **otra empresa** en Arrancar. Si le pasa mercadería, eso es una venta |
| Negocio distinto del **mismo** NIT | **No** | Son ventas del mismo contribuyente |
| Entrega hoy, «factura después» | **No** | Plazo vencido desde la entrega; queda pendiente de FEL |
| Cortesía, donación, muestra | **No** en régimen general | Hecho generador, art. 3 num. 9, base no menor al costo (criterio V-7 del proyecto, M) |
| Retiro del dueño o su familia | **No** en régimen general | Art. 3 num. 6 (M) |
| Venta exenta | **No** | También se documenta (art. 29, M) |

### 2.2 Salvaguardas (sin prohibir la función)

| Salvaguarda | Propuesta |
|---|---|
| Nada se borra | Correlativo sin huecos por forma; solo anular con motivo; auditoría permanente |
| Motivo | En empresa inscrita, cada venta de control lleva motivo: pedido sin entrega, FEL externa, consolidar al cierre, contingencia, **pendiente de FEL**, otro con texto |
| Reporte | «Ventas de control» siempre disponible, no desactivable, con motivo, antigüedad y estado |
| Conciliación | Al cierre del mes: **ventas totales = Libro de ventas + control**, con diferencias a la vista |
| Permisos propios | Crear/editar formas sin FEL; vender con ellas; ver el reporte. El contador externo debe poder recibir el último sin los otros |
| Aviso | Al crear la forma y, sin insistir, al vender: «Si entrega el bien, esta venta requiere factura» |
| Pasar a FEL | Un DTE puede cubrir uno o varios comprobantes; el comprobante queda enlazado y no se reescribe |
| Un solo juego de registros | Sin opción para excluir ventas de inventario, reportes o Contabilidad, ni para ocultarlas por rol |

Sobre lo último: el Código Penal tipifica la defraudación tributaria (arts. 358 A y 358 B). Recuerdo que la doble contabilidad es uno de los casos especiales, pero **no pude confirmar el numeral (B)**. El libro legal sí excluye las ventas sin DTE; lo que evita el segundo juego es que la conciliación las muestre.

**Punto a revisar (M):** el CT art. 85 también sanciona emitir documentos sin autorización y usar «sistemas no autorizados». Un comprobante que parezca factura en una empresa inscrita podría caer ahí, y por eso importa §3.

### 2.3 Efecto cuando la mercadería sale por una forma de control

| Área | Tratamiento | Certeza |
|---|---|---|
| Inventario | Salida real al costo del método, con clase propia (no ajuste) | B (diseño) |
| Costo | Costo de ventas al reconocer el ingreso | NIIF Pymes 13.20, M |
| Ingreso | Se reconoce por la transferencia, **con o sin factura** | NIIF Pymes secc. 23, M |
| IVA, régimen general | Si hubo entrega: separar `precio ÷ 1.12 × 0.12` en un pasivo «IVA pendiente de documentar», para no inflar el ingreso | B (recomendación) |
| Crédito fiscal | Queda expuesto si el bien salió sin débito; la SAT puede tratarlo como faltante (art. 3 num. 7) | A en el faltante, B en la consecuencia |
| ISR | El ingreso es renta aunque no tenga factura, en todo régimen; sobre utilidades, el costo necesita soporte (art. 21 num. 1) | M |
| Pequeño contribuyente | Sin débito ni crédito, pero el ingreso cuenta para el 5 % y para el techo | M |

### 2.4 Emisión posterior y contingencia

- **FEL tardía:** no encontré norma que la autorice en general. Regulariza el impuesto, pero **no borra la infracción** (B).
- **Fechas:** guardar por separado **fecha real de entrega** y **fecha del DTE**; nunca retrofechar. Si caen en meses distintos, avisar que hay que rectificar el mes de la entrega.
- **Contingencia:** debe ser una situación justificada, y el emisor conserva la prueba de la falla (Res. SAT-DSI-1793-2026, arts. 2 lit. g y 5, M). Se notifica en Agencia Virtual.
- **Plazo de contingencia: sin confirmar.** Las fuentes dicen 24 horas o 3 a 5 días, y son anteriores a la resolución, que remite a la Documentación Técnica FEL. **No lo programen fijo:** debe ser configuración de instalación.
- **Otros cambios para el adaptador FEL (M):** el DTE solo es válido si la SAT lo **acepta** (art. 7), así que «certificado» no basta como estado final. La anulación es una transacción firmada (art. 9). Con el IVA suspendido no se puede facturar (art. 13). El XML se conserva durante la prescripción (art. 24).

---

## 3. Comprobante interno y recibo de pago

| | **Comprobante interno de venta** | **Recibo de pago** (forma de control) | **Recibo de cobro** (VC-P12, ya aprobado) |
|---|---|---|---|
| Para qué | Respaldar una venta de control | Respaldar un pago o abono de esa venta | Cobro de un documento fiscal en Cartera |
| Datos | Negocio, forma, correlativo, fecha y hora, cliente o «Cliente de mostrador», detalle, total, contado/crédito, saldo, quien atendió | Número, fecha, recibí de, monto en cifras y letras, medio, comprobantes abonados, saldo anterior y nuevo, quien recibe, firma | Lo definido en §6.3 y §8.3 |
| Leyenda | **«Documento de control interno. No es factura ni documento tributario. No genera crédito fiscal.»** | **«Recibo de control interno. No es factura ni documento tributario.»** | «Este recibo no sustituye la factura» (sin cambio) |

**No deben llevar (buena práctica):** las palabras factura, serie, DTE, autorización o certificación; IVA desglosado; ni el NIT del emisor. Tampoco llamarlo «RECI», que es un DTE real de la FEL. Anulado: marca visible en la impresión.

---

## 4. Ventas al crédito informales

| Tema | Regla | Fuente | Certeza |
|---|---|---|---|
| Prescripción | General, 5 años; **precio de lo vendido por un comerciante, 2 años** | C. Civil arts. 1508 y 1514 | M |
| Cuál usar | Avisar con **2 años**: quien vende habitualmente se expone a que lo traten como comerciante | Opinión | B |
| Interrupción | Reconocimiento, abono o demanda notificada: **cada recibo reinicia el plazo** | C. Civil art. 1506 | M |
| No es automática | El deudor debe alegarla: el sistema avisa, nunca cancela el saldo | C. Civil art. 1501 | M |
| Reconocimiento de deuda | Con firma legalizada por notario es título ejecutivo; sin legalizar, requiere reconocimiento ante juez | CPCyM arts. 184 y 327 | M |
| Interés pactado | Libre, pero el juez puede reducirlo si es desproporcionado | C. Civil art. 1948 | M |
| Mora sin pacto | Interés legal: promedio ponderado de tasas activas menos 2 puntos (referencia de unos 11.07 % a sept. 2026) | C. Civil arts. 1435 y 1947 | M |
| Interés sobre interés | Prohibido en lo civil; limitado en lo mercantil | C. Civil art. 1949; C. Com. art. 691 | M |
| Usura | Delito | C. Penal art. 276 | M |

**Si el deudor es trabajador de quien vende (Código de Trabajo, M):**

- La deuda de caseta **no es anticipo de salario**. Solo se descuenta hasta la **parte embargable** (art. 99), y esto alcanzaría también a deudas con parientes o socios del patrono (redacción vista en una sola fuente).
- El salario mínimo es inembargable y, en general, lo embargable llega hasta el **35 %** (art. 96).
- **Regla prudente (B):** `descuento ≤ menor(35 % del salario, salario − salario mínimo)`. **Quien gana el mínimo: Q0 de descuento**; solo puede pagar voluntariamente.
- Los anticipos no devengan intereses y se amortizan en al menos 5 períodos (art. 99). Recomiendo tampoco cobrar interés en deudas de caseta a trabajadores.
- No se le puede obligar a comprar en la caseta (art. 62, de memoria, **B: confirmar**).
- Pedir autorización escrita. El descuento debe aplicarse desde Planilla, que aún no existe; mientras tanto, solo registrar el pago.

---

## 5. Recetas y producción

| Tema | Negocio de control | Empresa formal | Fuente |
|---|---|---|---|
| Costo de receta | Insumos × costo promedio ÷ rendimiento | Además, mano de obra directa e indirectos | NIIF 13.8-13.11, M |
| Costo estándar | Suficiente | Solo si se aproxima al real; ajustar con conteos | NIIF 13.16, M |
| Merma normal | Dentro del rendimiento | Parte del costo | NIIF 13.13, M |
| Merma anormal | Ajuste con causa | Gasto; sin acta o soporte puede generar IVA por faltante | NIIF 13.13; IVA art. 3 num. 7, A |
| Deducción | No aplica | Costo de producción con soporte | ISR art. 21 num. 1, M |
| Comida del dueño o familia | Solo control | Retiro: FEL con base no menor al costo | IVA art. 3 num. 6, M |
| Comida gratis a trabajadores | Solo control | **Abierto:** prestación o transferencia gratuita; definir con Planilla | B |

**Dos formas de producir (recomendación):**

- **Por lote** (50 desayunos): consume insumos y crea producto terminado con `inventarios.registrar_entrada_de_produccion`, que ya está previsto.
- **Al vender** (plato a pedido): descarga la receta con la venta. Exige conteos físicos periódicos para detectar la diferencia entre lo teórico y lo real.

---

## Adendas propuestas (para `arquitecto-de-datos`; no contradicen LV-1, LV-2 ni VC-0x)

1. **Estado fiscal explícito «sin inscripción»** y cambiar el «se asume régimen general» para que un negocio sin NIT no reciba avisos de IVA.
2. **Dependencias:** Ventas/Caja no debe exigir Libro de ventas, Bancos ni Contabilidad. Hoy `inventarios` exige `libro-de-compras`: decidir si se libera o si se activa oculto.
3. **Cartera de control:** `cuentas-por-cobrar` depende de `libro-de-ventas` y `bancos`, así que no sirve al negocio sin NIT. Al pasar una venta a FEL, su saldo y abonos deben trasladarse sin duplicar la deuda.
4. **Inventarios:** clase de salida por venta de control y destino «producción».
5. **Normativa FEL:** actualizar las referencias al Acuerdo 13-2018 y dejar el plazo de contingencia configurable.

## Preguntas para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| 1 | En empresa inscrita, ¿el motivo de la venta de control es obligatorio? | a) Sí; b) opcional | **a**: un clic, y es lo que la hace defendible |
| 2 | ¿Quién crea formas sin FEL en empresa inscrita? | a) Permiso propio; b) cualquier administrador | **a** |
| 3 | Si la caseta es de **otra persona** que el dueño de la finca, ¿se maneja como otra empresa? | a) Sí; b) no | **a**: si no, sus ventas se mezclan con las del NIT |
| 4 | ¿Interés en crédito informal? | a) Sin interés; b) simple opcional pactado | **b**, apagado por omisión y nunca compuesto |
| 5 | ¿Descuento a trabajadores en v1? | a) Solo registrar la autorización y el pago; b) esperar a Planilla para descontar | **a** |
| 6 | Producción en v1 | a) Por lote; b) al vender; c) ambas | **c**, si el alcance lo permite |

## Por confirmar con texto oficial antes de programar

- Plazo de contingencia en la Documentación Técnica FEL.
- CT arts. 85, 86 y 94 tras el Decreto 31-2024.
- C. Penal art. 358 B.
- C. de Trabajo arts. 62, 96 y 99.
- Ley del IVA art. 2 (definición de contribuyente y habitualidad) y art. 34.

## Fuentes

- [Ley del IVA, Decreto 27-92 (vLex)](https://gt.vlex.com/vid/ley-impuesto-valor-agregado-1075701258) y [copia del TSE](https://www.tse.org.gt/images/UECFFPP/leyes/decreto_27-92-iva.pdf)
- [Ley del IVA art. 29 (Vesco)](https://vescco.tax/leyes-tributarias/iva-guatemala/articulo-29-documentos-obligatorios/)
- [Art. 34 en criterios de la SAT (Vesco)](https://vescco.tax/blog/criterio-sat-guatemala-1-2023/)
- [Código Tributario (Wikisource)](https://es.wikisource.org/wiki/C%C3%B3digo_Tributario_de_la_Rep%C3%BAblica_de_Guatemala_(Decreto_Ley_6-91))
- [Resolución SAT-DSI-1793-2026, análisis (Vesco)](https://vescco.tax/blog/nueva-resolucion-fel-sat-2026-9-puntos-que-pueden-costarle-el-credito-fiscal/), [TV Azteca](https://tvaztecaguate.com/economia/2026/11/12/factura-electronica-en-guatemala-estas-son-las-nuevas-disposiciones-de-la-sat/), [Publinews](https://www.publinews.gt/noticias/2026/11/20/sat-actualiza-reglas-para-emitir-y-anular-facturas-electronicas-en-guatemala/) y [portal FEL de la SAT](https://portal.sat.gob.gt/portal/efactura/)
- [Contingencia FEL: plazos en fuentes anteriores (Prensa Libre)](https://www.prensalibre.com/economia/cuanto-cuesta-emitir-la-factura-electronica-en-linea-y-cuando-sera-obligatoria-para-todos/) y [EDICOM](https://edicomgroup.com/blog/online-electronic-invoice-system-works-fel-de-guatemala)
- [Pequeño contribuyente 2026 (Vesco)](https://vescco.tax/blog/regimen-pequeno-contribuyente-actualizado-2026/) y [techo 2026](https://livinginguatemala.com/tramites/sat-pequeno-contribuyente/)
- [Una factura al día por ventas menores (Termómetro Fiscal)](https://www.termometrofiscal.com/post/una-factura-al-dia-por-ventas-menores) y [límites de CF y la excepción (Prensa Libre)](https://www.prensalibre.com/opinion/columnasdiarias/limites-de-facturas-a-cf-y-la-excepcion/)
- [Guía de empresas mercantiles (Registro Mercantil)](https://principal.registromercantil.gob.gt/wp-content/uploads/2024/01/GUIAS-DE-CALIFICACION-REGISTRAL-DE-EMPRESAS-MERCANTILES.pdf) y [comerciante individual](https://livinginguatemala.com/es/tramites/rm-comerciante-individual-guatemala/)
- [Prescripción de deudas](https://livinginguatemala.com/es/tramites/prescripcion-de-deudas-guatemala/), [usura e interés legal](https://livinginguatemala.com/es/tramites/usura-interes-legal-guatemala/) y [reconocimiento de deuda](https://livinginguatemala.com/es/tramites/reconocimiento-deuda-formato/)
- [Embargo de salario, arts. 96-99](https://livinginguatemala.com/es/tramites/embargo-de-salario-guatemala/) y [Código de Trabajo (AMSCLAE)](https://www.amsclae.gob.gt/wp-content/uploads/2026/08/10.-DECRETO-1441-CODIGO-DE-TRABAJO.pdf)
- [Código Penal (TSE)](https://www.tse.org.gt/images/UECFFPP/leyes/Codigo_Penal.pdf)
- NIIF para las Pymes (IASB), secciones 13 y 23
- Proyecto: `/home/aparada/proyectos/arrancar/docs/modulos/diseno-cuentas-por-cobrar-y-ventas.md`, `/home/aparada/proyectos/arrancar/docs/modulos/diseno-inventarios.md`, `/home/aparada/proyectos/arrancar/docs/modulos/dictamen-inventarios-2026-11-18.md`, `/home/aparada/proyectos/arrancar/servidor/src/modulos/inventarios/modulo.ts`
