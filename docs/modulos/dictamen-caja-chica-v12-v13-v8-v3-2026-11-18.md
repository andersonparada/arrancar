# Dictamen del contador, 2026-11-18: V-12, V-13, V-8 y V-3/V-4 de Caja chica y Cuentas por liquidar

# Dictamen del contador sobre V-12, V-13, V-8 y V-3/V-4 (Caja chica y Cuentas por liquidar), 2026-11-18

## Límites de esta revisión

No pude abrir los PDF oficiales: Justia devolvió 404 y el PDF del Decreto 4-2012 no se pudo leer. Por eso, donde cito un texto legal lo hago por una transcripción de terceros e indico la certeza. Revisé el código del libro para responder V-13:
- `/home/aparada/proyectos/arrancar/servidor/src/modulos/libro-de-compras/dominio/calculador-de-retenciones.ts`, línea 37
- `/home/aparada/proyectos/arrancar/servidor/src/modulos/libro-de-compras/dominio/ajuste-de-retenciones.ts`
- `/home/aparada/proyectos/arrancar/servidor/src/modulos/libro-de-compras/dominio/factura-especial.ts`

## Corrección previa al dictamen del 2026-11-18 (fila L2)

El dictamen atribuye la regla de los «pagos partidos» al Criterio SAT 5-2021 (Deloitte Tax Alert 21-21). **Es una atribución equivocada.**
- **El Criterio 5-2021** trata los pagos hechos por medio de terceros o por terceros: exige contrato y, en algunos casos, escritura pública.
- **La regla del mes está en la propia ley.** El art. 20 del Decreto 20-2006 dice: «Se entenderá que existe una sola operación cuando se realicen pagos a un mismo proveedor durante un mes calendario, o bien cuando en una operación igual o superior al monto indicado… el pago se efectúe parcialmente o se fraccione el mismo» (transcrito por Prensa Libre).
- **Hay que corregir la fila L2 y su fuente.** El Criterio 5-2021 sí importa para V-4 y V-5 (ver abajo).

---

## V-12. ¿La nota de crédito del proveedor resta en la suma mensual de bancarización?

**Dictamen: no resta. Lo propuesto en §5.4 h es correcto.** Certeza media-alta.

| Punto | Qué dice o qué pasa | Tipo | Fuente |
|---|---|---|---|
| Qué se mide | La ley mide **pagos**: los que respaldan costos, gastos o crédito fiscal desde Q30,000, y los pagos a un mismo proveedor en un mes cuentan como una operación. Una nota de crédito **no es un pago**: rebaja el precio. | Ley | Decreto 20-2006 art. 20 (reformado por el Decreto 4-2012 art. 27) |
| Caso típico de caja chica | La factura ya se pagó del fondo al asignarla. La nota llega después y el proveedor **devuelve** efectivo al fondo. El pago en efectivo ya ocurrió por el total, y una devolución posterior no lo borra. | Ley aplicada al hecho | Ídem |
| Segunda regla del art. 20 | «Operación igual o superior… aunque se pague por partes» se mide con el **total de la factura**. Así lo hace la regla 1 de CP4 §5.3, que no lo neta con notas. | Ley | Ídem |
| Coherencia con CP4 §5.3 | CP4 suma cheques, notas de débito, **notas ligadas** (de Bancos, no del proveedor) y efectivo. La nota de crédito del proveedor solo compensa saldo y no entra en la suma. No restar en caja chica es lo mismo que hace CP4. | Diseño vigente | `docs/modulos/diseno-cp4-pagos-en-efectivo.md` §5.3 |
| Caso límite | Devolución en el mostrador: el custodio paga el neto en el acto. El sistema sobrestima la suma por el monto de la nota, y el error va hacia el lado prudente. Con CC-h = A solo hay aviso y marca `sin_bancarizar`, sin bloqueo, y el contador lo ve en el reporte. | Mi opinión | — |
| Sumar `monto + monto_retenido` | Lo retenido es parte del precio pagado por cuenta del proveedor. Sumar el total es lo prudente e igual a CP4 («antes de retenciones»). Ninguna norma lo dice expresamente. | Buena práctica | — |

**¿Cambia el diseño?** No. Solo dos cosas:
- Quitar «por validar, V-12» de §5.4 h y del paso CL-3.
- La ayuda del reporte de CP5 y de P-CCL-3 debería decir: «Las notas de crédito no rebajan lo pagado: la ley mide pagos».

**Para el usuario:** nada que decidir. Si quiere afinar el caso límite: (A) dejarlo así, que recomiendo; (B) una casilla «se pagó neto en el acto» en la nota, que restaría. B agrega una columna y abre la puerta a que se use para no llegar al umbral. No lo recomiendo.

---

## V-13. ¿Check `not es_nota_de_credito or monto_retenido = 0`? ¿Puede el libro fijar retención en una nota?

**Dictamen: el libro hoy no puede fijar retención en ninguna nota. El check es correcto y conviene ponerlo.** Certeza alta en lo del código; media-alta en lo legal.

| Punto | Detalle | Tipo |
|---|---|---|
| Código del libro | `calcularRetenciones` devuelve `[]` si `esNota(tipo)`, sea nota de crédito o de débito (`calculador-de-retenciones.ts:37`). `fijarRetenciones` rechaza ajustes de reglas que no se propusieron (`ajuste-de-retenciones.ts`, `indexarAjustes`). Por eso una nota **nunca** llega con `retencionesCentavos > 0`. | Hecho del código |
| Decisión vigente | «La retención se fija al registrar y una nota posterior no la cambia» (`libro-de-compras.md` línea 400, decisión del usuario con el riesgo anotado). | Decisión del usuario |
| Documento desactualizado | `libro-de-compras.md` línea 263 dice que la nota «ajusta la retención en proporción». Eso contradice la línea 400 y el código. Hay que corregir el texto. | Error de documentación |
| Fondo legal | La retención la hace el agente al pagar o acreditar la factura (Código Tributario art. 28; Decreto 20-2006; Decreto 10-2012 art. 48). Una nota de crédito no se paga. Si la nota rebaja una factura retenida, el ajuste (si lo hay) va por la constancia en el libro, nunca por el fondo. | Ley y práctica |

**¿Cambia el diseño?** Sí, con un cambio menor para `arquitecto-de-datos`:
- Agregar el check `not es_nota_de_credito or monto_retenido = 0` en `caja_chica.comprobantes` y su par en `cuentas_por_liquidar.gastos`.
- Va dentro de la `0003` si **no** está aplicada en producción. Si ya lo está, en una migración nueva.
- Que falle en `recibir_documento` y deshaga el registro en el libro es lo que conviene: un cambio futuro del libro sobre retención en notas debe pasar por el contador y coordinarse, no colarse en silencio.

**Fuera de alcance, para anotar en Libro de compras:** el libro tampoco propone retención en la **nota de débito**, aunque legalmente el aumento de precio sí puede llevar retención si la empresa es agente. Es un tema aparte que conviene abrir.

**Para el usuario:** ¿acepta el check como defensa? Opciones: sí, que recomiendo; no. No hay costo de operación.

---

## V-8. Factura especial (FESP): ¿necesita el permiso de excepción de retención?

**Dictamen: es otro caso. En la FESP la retención es parte del documento y no una excepción. Recomiendo que entre sin el permiso de excepción**, pero es decisión del usuario porque cambia la regla A′ que aprobó.

| Punto | Detalle | Tipo | Certeza |
|---|---|---|---|
| Quién emite | La propia empresa emite la FESP por cuenta del vendedor que no factura. El código ya lo modela así (`factura-especial.ts`: `nit_emisor` = empresa). | Ley del IVA art. 52 | Alta |
| La FESP es la constancia | Según el texto reformado por el Decreto 4-2012, en cada FESP «deberán consignar el monto del impuesto retenido y la copia de dicha factura especial servirá como constancia de retención». No hay una constancia RetenIVA aparte. | Ley del IVA art. 52 | Media-alta (cita del texto del decreto por buscador) |
| ISR | En toda FESP se aplica también la retención del ISR que corresponda. El libro ya fija IVA 100 % e ISR 5 %. | Práctica (Prensa Libre) | Media |
| Por qué no es excepción | La excepción A′ cuida tres riesgos: que el custodio pague el total sin retener, que la constancia no se emita y que la retención se olvide. En la FESP la retención es **obligatoria e inseparable** del documento, el vendedor recibe por definición el neto, y la empresa ya emitió el documento que sirve de constancia. Lo que sí hay que controlar es que la FESP sea **procedente** (no entre contribuyentes del IVA, salvo negativa del vendedor). Ese control es del libro, que ya da el aviso `AVISO_DE_PROVEEDOR_INSCRITO`, no del fondo. | Mi opinión con base en la ley | — |
| Viáticos | Según La Hora, el AG 213-2013 art. 21 admite documentar viáticos del país con «factura especial emitida al empleado o funcionario». En ese caso **el vendedor es el propio beneficiario**: la retención se le hace a él y el gasto acreditado a su anticipo es el neto (`monto = total − retenciones`, como ya está). El empleado debe existir como proveedor en Terceros (lo exige `VendedorNoCoincide`). Advertencia práctica: si no se calcula «hacia arriba», el empleado recupera menos de lo que gastó; eso es política interna. | Reglamento ISR (fuente secundaria) y práctica | Media |
| C9 del dictamen | Está desactualizado: el libro ya registra la FESP emitida fuera de Arrancar. | Hecho | Alta |

**¿Cambia el diseño?** Sí, si el usuario elige B. Para `arquitecto-de-datos`:
- Copiar al recibir `es_factura_especial` (o el `tipo` del documento) en `comprobantes` y en `gastos`.
- Cambiar la condición del motivo a: `(con_retencion and not es_factura_especial and fondo_id is not null) = (motivo_con_retencion is not null)`.
- `AsignarDocumentos` no pide `…con-retencion` para la FESP.
- Una FESP con `referenciaDeDestino` sí se asigna en `recibir_documento` (no queda en la bandeja).
- Aviso informativo al asignarla: «Factura especial: la copia es la constancia de retención; entregue copia al vendedor».

**Pregunta para el usuario:** «¿Una factura especial que emite la empresa entra al fondo o al anticipo sin el permiso de excepción de retención?»

| Opción | A favor | En contra |
|---|---|---|
| A. Igual que cualquier factura con retención (A′ sin cambio) | Sin cambio de diseño | Fricción sin propósito: cada viático o compra a un informal pide permiso y motivo, y el motivo termina siendo «es factura especial» |
| **B. Sin permiso de excepción, con aviso (recomendada)** | Refleja la ley: la retención es la regla del documento y la copia es la constancia | Una columna más y un check distinto |

---

## V-3 y V-4. El custodio o el beneficiario pagó el neto: ¿quién entrega la constancia y cómo se emite?

**Dictamen: la obligación es siempre de la empresa.** El custodio o el beneficiario solo actúa por cuenta de ella y no puede emitir la constancia. El tratamiento de V-3 es **correcto con ajustes**.

| Punto | Detalle | Tipo | Certeza |
|---|---|---|---|
| Quién es el agente | La empresa, que es quien la ley designa para retener al pagar o acreditar. Es responsable del impuesto retenido y, si no retiene, responde por él. El custodio o empleado es su dependiente: el acto de pagar el neto es de la empresa. | Código Tributario art. 28 | Media-alta (sin texto literal) |
| Quién emite | La empresa, con **sus** credenciales de la SAT: RetenIVA para IVA y el sistema de retenciones ISR de la Agencia Virtual para ISR. Ni el custodio ni el beneficiario pueden ni deben tenerlas. En Arrancar, la constancia se anota desde Libro de compras → Retenciones y R12 «Constancias pendientes». | Ley y práctica | Alta |
| Plazos | **ISR:** constancia con la fecha de la factura, entregada a más tardar el 5 del mes siguiente; entero en 10 días (Decreto 10-2012 art. 48, reformado por el Decreto 19-2013). **IVA de agente:** entero en 15 días hábiles del mes siguiente (Decreto 20-2006); la constancia sale de RetenIVA, y su plazo propio no está confirmado (igual que en el PLAN). | Ley | Media-alta (ya verificado en el repo) |
| Cómo llega al proveedor | Por el sistema de la SAT (el proveedor la ve en su Agencia Virtual) y en copia, por correo o la lleva el custodio en su siguiente visita. | Práctica | — |
| `monto` = neto del fondo | **Correcto.** Contablemente: débito al gasto (y al IVA crédito) por el total; crédito a Caja chica por el neto y a Retenciones por pagar por lo retenido. La reposición devuelve al custodio solo el neto; el entero sale del banco de la empresa. | Buena práctica | Alta |
| «Constancia de Cuentas por pagar o de Libro de compras» | **Ajuste:** solo de **Libro de compras**. Cuentas por pagar no interviene en un documento con destino Caja chica o Cuentas por liquidar. | Corrección | Alta |
| Bancarización mide el total | Correcto y prudente (ver V-12). | — | Media |
| V-4: tercero que no es empleado | Si el beneficiario es un tercero (P7 = sí) que paga a proveedores por cuenta de la empresa, la SAT pide el **contrato** entre la empresa y ese tercero para aceptar el gasto o el crédito fiscal. Hace falta un aviso al crear el anticipo a un no empleado. También pesa en V-5. | Criterio SAT 5-2021 lit. f (no vinculante) | Media |
| V-4: FESP al empleado | La constancia es la copia de la FESP y se entrega al propio empleado (ver V-8). | Ley del IVA art. 52 | Media-alta |

**Riesgo que el diseño no cubre (crítico).** El diseño supone que el custodio **sí retuvo**. En la práctica, el que paga en un mostrador suele pagar el total. Entonces:
- el fondo pagó el total, pero el sistema dice que pagó el neto;
- el arqueo muestra un faltante igual a la retención;
- la empresa sigue debiendo la retención como agente (CT art. 28).

**¿Cambia el diseño?** Sí, con dos ajustes:
1. **Confirmación al asignar con retención.** En la ventana del motivo, una casilla obligatoria: «El custodio (o beneficiario) pagó Q[neto] y retuvo Q[retención]». Si no la marca, no se asigna con el neto. Se abre la pregunta de abajo.
2. **Hoja para el proveedor** (para imprimir desde la ficha del comprobante o del gasto, como el recibo de CP4). Leyendas:
   - «Retención IVA Q… / ISR Q…: la constancia la emite [empresa, NIT] en el sistema de la SAT»;
   - «Este documento no es un documento tributario»;
   - firmas «Pagado por (custodio)» y «Recibí (proveedor)».
   No hace falta migración.

Además, `arquitecto-de-datos` debe verificar que R12 «Constancias pendientes» incluya las retenciones de documentos con destino Caja chica o Cuentas por liquidar, sin tratarlas como «por practicar» en Cuentas por pagar.

**Pregunta para el usuario:** «Si el custodio o el beneficiario pagó el total y no retuvo, ¿qué hace el sistema?»

| Opción | Qué pasa | Mi opinión |
|---|---|---|
| A. No se asigna: hay que anular el documento en el libro (`error_de_captura`) y volver a registrarlo con la retención en cero y un motivo «no se retuvo» (auditado), con aviso de la responsabilidad del agente (CT art. 28) | El fondo cuadra con el total. El riesgo fiscal queda visible y firmado por quien lo decide | Aceptable si la empresa asume el riesgo |
| **B. Se asigna por el total (`monto` = total) y la retención se mantiene: la empresa la entera y emite la constancia, y lo retenido queda como cuenta por cobrar al proveedor o al custodio** | Cumple la obligación del agente | **La recomiendo**, aunque rompe el invariante `monto = total − retenciones` (cambio de datos y checks para `arquitecto-de-datos`) |
| C. No hacer nada (como hoy) | Faltante en el arqueo sin explicación | No la recomiendo |

---

## Veredicto

| Punto | Veredicto |
|---|---|
| V-12 | **Correcto.** La nota no resta; quitar «por validar» |
| V-13 | **Correcto con ajustes:** agregar el check en `comprobantes` y `gastos`, y corregir la línea 263 de `libro-de-compras.md` |
| V-8 | **Correcto con ajustes** si el usuario elige B: FESP sin permiso de excepción (columna `es_factura_especial` y check del motivo) |
| V-3/V-4 | **Correcto con ajustes:** la constancia sale solo de Libro de compras; casilla «retuvo»; hoja para el proveedor; aviso de contrato con terceros no empleados; decisión sobre «pagó el total» |
| Dictamen previo (L2) | **Incorrecto en la fuente:** la regla del mes está en el art. 20 del Decreto 20-2006, no en el Criterio 5-2021 |

## Fuentes

- Decreto 20-2006 art. 20, «una sola operación»: [Prensa Libre](https://www.prensalibre.com/economia/impuestos-por-que-no-se-pueden-realizar-pagos-en-efectivo-a-partir-de-q30-mil/); [Termómetro Fiscal](https://www.termometrofiscal.com/post/la-papeleta-de-dep%C3%B3sito-es-bancarizaci%C3%B3n-en-materia-tributaria); reforma: [IURISTEC, Decreto 4-2012 art. 27](https://iuristec.com.gt/index.php?title=Articulo:0010)
- Criterio SAT 5-2021 (pagos por terceros, lit. f): [Deloitte Tax Alert 21-21](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%2021-21.pdf); [Vescco](https://vescco.tax/blog/criterio-sat-guatemala-5-2021/)
- Ley del IVA art. 52 (FESP como constancia), texto del Decreto 4-2012: [PDF del decreto](https://extranet.who.int/fctcapps/sites/default/files/2023-04/guatemala_2018_annex-15_Decree_4-2012.pdf); retención del ISR en la FESP: [Prensa Libre, «Las facturas especiales»](https://www.prensalibre.com/opinion/las-facturas-especiales-2/)
- Viáticos con FESP al empleado (AG 213-2013 art. 21): [La Hora (2018)](https://lahora.gt/opinion/wpcomvip/2018/05/21/los-viaticos-como-documentarlos-para-efectos-tributarios/)
- Constancia del ISR, a más tardar el 5 del mes siguiente (Decreto 10-2012 art. 48; Decreto 19-2013): [Congreso, Decreto 19-2013](https://www.congreso.gob.gt/assets/uploads/info_legislativo/decretos/2013/19-2013.pdf); [America Audit](https://americaaudit.com/sabias-que-cuando-te-retengan-por-concepto-de-isr-deben-de-emitirte-una-constancia-de-retencion-y-entregartela-dentro-de-los-primeros-5-dias-del-mes-siguiente-2/); `/home/aparada/proyectos/arrancar/docs/modulos/validacion-h7-h11-retenciones.md`
- Código Tributario art. 28 (agente de retención): [Prensa Libre](https://www.prensalibre.com/?p=10365270)
- Repositorio:
  - `/home/aparada/proyectos/arrancar/docs/modulos/diseno-caja-chica-y-cuentas-por-liquidar.md` (§3.1 b, §4.10, §5.4 a/g/h, §16)
  - `/home/aparada/proyectos/arrancar/docs/modulos/dictamen-caja-chica-2026-11-18.md`
  - `/home/aparada/proyectos/arrancar/docs/modulos/diseno-cp4-pagos-en-efectivo.md` (§5.3)
  - `/home/aparada/proyectos/arrancar/docs/modulos/libro-de-compras.md` (líneas 263 y 400)
  - `/home/aparada/proyectos/arrancar/servidor/src/modulos/libro-de-compras/dominio/calculador-de-retenciones.ts`
  - `/home/aparada/proyectos/arrancar/servidor/src/modulos/libro-de-compras/dominio/ajuste-de-retenciones.ts`
  - `/home/aparada/proyectos/arrancar/servidor/src/modulos/libro-de-compras/dominio/factura-especial.ts`

**Antes de poner textos en las ayudas** hay que cotejar en el texto oficial: el art. 20 del Decreto 20-2006 (vigente tras el Decreto 4-2012), el art. 52 de la Ley del IVA, el art. 21 del AG 213-2013 y el art. 28 del Código Tributario.