# Dictamen CP5: reportes de Cuentas por pagar (contador-guatemala, 2026-11-15)

Sobre `diseno-cp5-reportes.md`. Versión condensada por el coordinador a partir de la respuesta completa del contador
(sin cambiar conclusiones). Marcas: **[Ley]**, **[Práctica]**, **[Opinión]**.

## Fuentes verificadas

| Norma | Contenido | Certeza |
|---|---|---|
| Código Civil arts. 1501, 1504, 1506–1508 | Prescripción alegable, se interrumpe con reconocimiento o pago parcial; 5 años desde que la obligación pudo exigirse | Alta |
| Código de Comercio | Sin plazo mercantil general más corto para un saldo a favor (cheque 6 meses, art. 513; cambiaria 3 años, art. 626) | Media |
| Decreto 10-2012 art. 48 (reformado por Decreto 19-2013) | Retención ISR simplificado en la fecha de la factura; constancia en los primeros 5 días del mes siguiente; entero en los primeros 10 | Media-alta |
| Decreto 20-2006 art. 7 | Entero de retención de IVA en 15 días hábiles del mes siguiente; plazo de la constancia sin confirmar (AG 425-2006 art. 32 reformado por AG 125-2022) | Media-alta / baja |
| Decreto 20-2006 art. 20 (Decreto 4-2012 art. 27) | Bancarización Q30,000; una operación = mismo proveedor en el mes **o** operación ≥ umbral pagada en partes | Alta |
| Código Tributario art. 47 | La SAT revisa 4 años | Alta |
| NIIF Pymes 2015: 2.36, 2.52, 11.33, 11.36, 11.38A, 10.19–10.23 | Devengo, compensación, bajas, corrección de errores. La 3.ª edición rige desde 2027: citar por sección | Alta |

## Los 12 puntos

1. **Fecha de efecto = emisión: correcto.** Ajustes: aviso en R1 de documentos con emisión hasta el corte registrados
   después; los documentos del libro emitidos antes de la fecha de inicio toman la **fecha de inicio** (si no, descuadra
   la apertura).
2. **Saldo neto de retenciones: correcto** (la retención nace con la factura). Contabilidad debe registrar
   «Retenciones por pagar» al provisionar. R3 para el proveedor: cargo por el total y abono por la retención con su
   constancia, misma fecha.
3. **Anulaciones con fecha contable (CP5-a = B): correcto.** Con inverso, la fecha del inverso; sin inverso, «nunca
   existió». A futuro, aplicaciones marcadas no vigentes en vez de borradas.
4. **Sin autorizar entran al saldo: sí.** **Hallazgo O-1:** `cuentas-por-pagar.md` dice «autorizar = provisionar»; al
   cierre el mayor omitiría lo recibido sin autorizar. Contabilidad debe provisionar **al registrar**.
5. **Posfechados: correcto**, pero si el banco cobró antes de la fecha, el pago cuenta desde el cobro conciliado (o
   leyenda si Bancos no da el dato).
6. **Antigüedad por «Vence»: correcto;** % sobre el total de cargos.
7. **Prescripción:** 5 años (CC 1508), desde que es exigible, interrumpible, no opera sola. Renombrar a «Posible
   prescripción desde», contar desde el último movimiento, columna «Último movimiento»; lo prescrito no es incobrable
   deducible.
8. **Neto por NIT**, no por ficha (CC 1469, NIIF 11.38A); fichas como subrenglones y aviso de NIT duplicados.
9. **Ajustes del mes:** suficiente, más una sección 5 «Documentos anulados o desautorizados en el mes».
10. **Bancarización (R9):** agregar el criterio por cargo de Q30,000 o más pagado en parte en efectivo; IVA completo
    del cargo; mostrar el monto del costo no deducible; máximo 48 meses.
11. **Constancias (R12):** columna «Plazo de la constancia» (ISR, 5 días); vista de las retenciones por practicar de
    saldos iniciales (R2) enlazada desde R12.
12. **R10 = Caja (efectivo para pagos) y R11 = transitoria: correcto;** R11 resta de Proveedores; conciliación al pie
    de R1.

## Otros errores

| # | Problema | Gravedad |
|---|---|---|
| O-1 | «Autorizar = provisionar» deja fuera del cierre lo recibido sin autorizar | Media-alta (para Contabilidad) |
| O-2 | R9 sin el criterio por cargo pagado en partes | Media |
| O-3 | Retenciones por practicar de saldos iniciales sin reporte | Media |
| O-4 | Documentos del libro anteriores a la fecha de inicio descuadran la apertura | Media-baja |
| O-5 | Neto por ficha y no por NIT | Media-baja |
| O-6 | Posfechado cobrado antes de su fecha | Media-baja |
| O-7 | «Prescribe el» afirma una fecha que la ley no fija | Baja |
| O-8 | Tope de 36 meses en R9 | Baja |
| O-9 | R6 sin quién registró | Baja |
| O-10 | Citas NIIF por párrafo | Baja |

## Cambios que el diseño debe recibir

1. Fecha de efecto con el caso de la fecha de inicio; aviso de registros tardíos.
2. Posfechado cobrado antes de su fecha.
3. R1 por NIT, % sobre cargos, conciliación con R11.
4. R3 para el proveedor con la retención como abono.
5. R4 «Posible prescripción desde», último movimiento, leyendas.
6. R8 sección 5.
7. R9: criterio por cargo, IVA completo, costo no deducible, 48 meses.
8. R12: plazo de la constancia ISR; vista de retenciones por practicar de saldos iniciales.
9. R6: «Registró el documento».
10. PLAN: pendiente de Contabilidad (provisionar al registrar, «fecha contable» del auxiliar).
11. Leyendas NIIF por sección; umbral «verifique el vigente».

## Opinión sobre CP5-a a CP5-i

CP5-a: **B**. CP5-b: emisión, con los ajustes. CP5-c: incluir todos. CP5-d: por audiencia (R9 en control). CP5-e: sí,
con la sección 5. CP5-f: Libro de compras, con la vista de saldos iniciales en Cuentas por pagar. CP5-g, h, i: de
acuerdo (i con la regla del cobro anticipado).

## Veredicto

**Correcto con ajustes.** Corregir antes de programar los cambios 1, 2, 7 y 8; el resto es presentación. O-1 no bloquea
CP5 pero queda anotado para Contabilidad.

## Fuentes

- Código Civil: [Mingob](https://mingob.gob.gt/mingobsites/repeju/wp-content/uploads/sites/2/2018/06/Codigo_Civil_Decreto_Ley_106.pdf); [Living in Guatemala](https://livinginguatemala.com/es/tramites/prescripcion-de-deudas-guatemala/).
- Código de Comercio: [ICNL](https://www.icnl.org/wp-content/uploads/codcomercio.pdf).
- Decreto 19-2013: [Congreso](https://www.congreso.gob.gt/assets/uploads/info_legislativo/decretos/2013/19-2013.pdf); [America Audit](https://americaaudit.com/sabias-que-cuando-te-retengan-por-concepto-de-isr-deben-de-emitirte-una-constancia-de-retencion-y-entregartela-dentro-de-los-primeros-5-dias-del-mes-siguiente-2/).
- Decreto 20-2006 art. 7: [Vesco](https://vescco.tax/blog/retenciones-de-iva-en-guatemala-agentes-porcentajes-y-compensacion-del-exportador/); [Deloitte 22-07](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%2022-07.pdf).
- Bancarización: [IURISTEC](https://iuristec.com.gt/index.php?title=Articulo:0010); [Deloitte 21-21](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%2021-21.pdf).
- NIIF Pymes 3.ª edición: [ICAEW](https://www.icaew.com/insights/viewpoints-on-the-news/2025/feb-2025/iasb-publishes-third-edition-of-ifrs-for-smes-accounting-standard); [IFRS](https://www.ifrs.org/issued-standards/ifrs-for-smes/).
