# Dictamen U8: saldos iniciales de Cuentas por pagar (contador-guatemala, 2026-11-08)

Alcance: lo contable y fiscal de `diseno-u8-saldos-iniciales-cuentas-por-pagar.md` (§12, C-U8-1 a C-U8-7), opinión
sobre las preguntas de §11 con lado contable o fiscal y errores del diseño.

Marcas: **[Ley]**, **[SAT]**, **[Práctica]** (práctica profesional, NIIF para las Pymes, ERP), **[Opinión]**.

**Límite de las fuentes:** las citas de la Ley del IVA (arts. 17, 20 y 48), del Decreto 10-2012 (arts. 21, 23 y 48),
del Decreto 20-2006 y de los acuerdos gubernativos son las ya verificadas en dictámenes anteriores. El art. 374 del
Código de Comercio y el art. 35 del Decreto 10-2012 se citan de memoria profesional (certeza media; confirmar).

## Resumen

| # | Tema | Conclusión | Certeza | ¿Decide el usuario? |
|---|---|---|---|---|
| C-U8-1 | Corte | «Emisión **estrictamente anterior** a la fecha de inicio» es condición necesaria, no suficiente: el criterio es que el documento **ya esté registrado en el sistema anterior**. Emitida antes y recibida después sin registrar allá: **va al Libro de compras** de Arrancar. | Alta / media-alta | Sí: definir «fecha de inicio» (recomendado día 1 de un mes) |
| C-U8-2 | Retenciones al corte | Saldo **neto de todas las retenciones** es correcto y CP4 no las descuenta otra vez. Pero muchas empresas retienen al pagar: esa retención la sigue debiendo la empresa como agente. | Media-alta | Sí (columna informativa o solo aviso) |
| C-U8-3 | Pagos parciales | **Correcto** guardar total, retenciones y saldo pendiente | Alta | No |
| C-U8-4 | Saldos a favor y anticipos | Nota de crédito sin aplicar **sí** como abono. Anticipo sin factura **fuera** (es activo; no se compensa) | Alta / media-alta | No |
| C-U8-5 | Notas posteriores sobre facturas de saldo inicial | Van al **Libro de compras del mes en que se reciben**; la factura no tiene que estar en Arrancar. **La solución provisional de §9.3 es incorrecta.** | Alta | Sí (cuándo se resuelve U8-l) |
| C-U8-6 | Activo fijo | El pago va a **inversión** en el flujo de efectivo | Media-alta | No |
| C-U8-7 | Cuadre con el balance de apertura | Mostrar totales separados. Sin Contabilidad: confirmación sin bloquear. Con Contabilidad: **cuenta puente de apertura en cero** | Alta (práctica) | Sí |

## C-U8-1. Corte

- El Libro de compras y el IVA son **mensuales** [Ley]; partir un mes entre dos sistemas obliga a armar a mano el SAT-2237.
- Crédito fiscal: mes de emisión o los dos siguientes (Ley del IVA art. 20) [Ley].
- Saldo inicial = deuda **ya registrada** (libro y contabilidad) en el sistema anterior al cierre del día anterior a la
  fecha de inicio; su efecto fiscal ya ocurrió allá [Ley/Práctica].
- Emitida antes y recibida después, sin registrar allá: **Libro de compras de Arrancar**, con crédito si está dentro
  del art. 20; si no, `fuera_de_plazo` [Ley + Opinión].
- **Estrictamente anterior** si la fecha de inicio es el primer día que se registra en Arrancar [Opinión].

Impacto:
1. Textos de ventana, Excel y mensajes: «facturas **registradas en el sistema anterior** que siguen pendientes».
2. **Riesgo de crédito fiscal doble:** aviso (no bloqueo) en Libro de compras cuando `fecha_emision < fecha de inicio`:
   «Esta factura es de antes de la fecha de inicio. Regístrela solo si no estaba en el libro de compras del sistema
   anterior».
3. Fecha de inicio en Empresas: «primer día que se registra en Arrancar; los saldos iniciales son los del cierre del
   día anterior». Recomendar el día 1 de un mes (mejor el 1 de enero, período del ISR); advertir, no prohibir.

## C-U8-2. Retenciones de un saldo inicial

| Retención | Momento legal | Fuente |
|---|---|---|
| IVA, agente | Al recibir la factura | Decreto 20-2006 arts. 1, 5 y 6; AG 425-2006 art. 10 |
| IVA 5 % a pequeño contribuyente | Al pagar o acreditar, lo primero; mínimo Q2,500 | Ley del IVA art. 48; AG 5-2013 art. 49 |
| ISR régimen opcional | Sobre lo pagado o acreditado | Decreto 10-2012 art. 48 |
| Entero tardío | Multa art. 91 más intereses (58 y 59) | Código Tributario |
| Gasto sin retención enterada | No deducible hasta enterarla | Decreto 10-2012 art. 23 lit. c) |

1. Si la factura estaba registrada antes del corte, ya hubo acreditamiento: la retención era del período anterior; si
   no se hizo, está atrasada.
2. En la práctica muchas empresas emiten la constancia al pagar; el sistema debe aceptarlo sin hacerlo pasar por normal.
3. Quien emite y entera es siempre **la empresa** en Retenciones Web; Arrancar solo lleva el control.
4. El saldo del proveedor va **neto de todas las retenciones**. Una columna «retención por practicar» que CP4 descuente
   al pagar sería un error (resta doble). No se recomienda.
5. Si los libros anteriores llevaban Proveedores bruto, la diferencia del cuadre es la retención pendiente
   («Retenciones por pagar» en la apertura).

Opciones: **A** solo instrucciones; **B (recomendada)** columna informativa `retenciones_por_practicar` (nula fuera del
saldo inicial, entre 0 y `retenciones`, sin efecto en el saldo), su total en la ventana y en el cuadre, y aviso de CP4
al pagar; **C** llevarlas al control de enteros de Libro de compras (desproporcionado).

## C-U8-3. Pagos parciales anteriores

Correcto [Práctica; NIIF para las Pymes secc. 11]. Ajuste: mostrar en ficha y estado de cuenta la línea derivada
`total − retenciones − saldo al inicio` como «Pagos y notas anteriores a la fecha de inicio» (sin guardarla).

## C-U8-4. Saldos a favor y anticipos

- Nota de crédito recibida antes del corte y sin aplicar: **sí**, como abono sin factura afectada ni vencimiento
  (Ley del IVA art. 17).
- Anticipo sin factura: **fuera** de Cuentas por pagar (activo; NIIF para las Pymes 2.52). Decir en la ayuda que un
  anticipo no se carga como nota de crédito; cuando CP4 defina los anticipos, los del corte se cargan con esa forma.
- Proveedor con saldo neto deudor: se muestra tal cual; Contabilidad lo reclasifica como activo.

## C-U8-5. Notas sobre una factura de antes de la fecha de inicio

- La nota recibida **después** del corte va al **Libro de compras de Arrancar del mes en que se recibe**; la de
  crédito rebaja el crédito fiscal de ese mes (o el costo si la factura no tuvo crédito); la de débito es cargo con
  crédito dentro del art. 20 desde su emisión (Ley del IVA arts. 17 y 20).
- La factura **no** tiene que estar en el sistema: la nota cita su número y fecha. Exigir factura propia es regla de
  diseño, no de ley.
- En Cuentas por pagar, la nota de crédito se aplica al saldo de la factura de saldo inicial (§4.3); la de débito es un
  cargo nuevo ligado a ella.

**Error del diseño (§9.3, alto):** «con la carga abierta se corrige el saldo pendiente» es incorrecto para una nota
posterior al corte: falsea la apertura y la nota nunca entra al libro (crédito sobrestimado o perdido). Solo vale para
corregir errores de carga de notas anteriores al corte. Mientras tanto, solo avisar: «Las notas sobre facturas de antes
de la fecha de inicio todavía no se pueden registrar».

El hueco es de **Libro de compras**, no de U8: lo sufre cualquier empresa con historia, aunque no use Cuentas por pagar.

## C-U8-6. Activo fijo

**Inversión** (NIIF para las Pymes 7.5 y 7.18): se clasifica el pago del período aunque el activo ya estuviera en la
apertura. Con financiamiento del proveedor con intereses podría ser financiamiento (raro; lo reclasifica el contador).
`tieneActivoFijo` alcanza; en facturas mixtas marcar lo que predomine. Sin efecto fiscal en un saldo inicial.

## C-U8-7. Cuadre con el balance de apertura

- Mostrar totales **por proveedor y en general**, separados: cargos, notas a favor y (con B) retenciones por
  practicar; exportable a Excel. No un solo neto (NIIF para las Pymes 2.52).
- Antes de Contabilidad: al **cerrar la carga** (Empresas), totales de cada módulo y confirmación, sin bloquear.
- Con Contabilidad: saldos iniciales contra la **cuenta puente de apertura**; **la puente en cero es el control**
  (como la cuenta de migración de SAP). Bloquear el cierre si no está en cero, con salida por permiso y motivo.
- El control vive en **Empresas** (cierre de la carga inicial), porque el cuadre es de todos los módulos.

## Opinión sobre las preguntas al usuario (§11)

| Pregunta | Opinión |
|---|---|
| U8-a | Apoya la recomendada. Ojo: el único incluye `tipo`; si quien carga elige otro tipo que el libro, el doble no se detecta. Que el arquitecto evalúe quitar `tipo` del único de los cargos o avisar. |
| U8-b | Sí; aclarar que un anticipo no es nota de crédito. |
| U8-c | Sí; «retenciones» = **todas** las del documento; saldo = total − retenciones − pagos y notas anteriores. |
| U8-d | De acuerdo. Para CP4: ajustar la apertura con la carga cerrada es corrección de error de períodos anteriores (NIIF para las Pymes 10.21) o ajuste del período, no contra la puente. |
| U8-e | **Indispensable**, no opcional: aprobar U8-6. |
| U8-f | De acuerdo. |
| U8-g | Aceptable; pedir el vencimiento real cuando se conozca; el ensayo del Excel muestra el propuesto. |
| U8-h | De acuerdo. |
| U8-i | **Recomienda una «referencia» corta y opcional** (pista de auditoría al sistema anterior). |
| U8-l | **No está de acuerdo con «no frena U8»**: es un hueco fiscal de Libro de compras; resolver después de U8 y **antes de producción con una empresa con historia**. Propuesta: Libro de compras acepta una nota con «factura anterior a la fecha de inicio» y sus datos escritos (serie, número, fecha, si tuvo crédito), solo si esa fecha es anterior a la fecha de inicio; Cuentas por pagar la busca entre sus saldos iniciales y la aplica (`documento_afectado_id` deberá poder apuntar a una fila propia). |

## Otros errores u omisiones

| # | Dónde | Problema | Corrección | Gravedad |
|---|---|---|---|---|
| 1 | §9.3 | Solución provisional para notas posteriores | Quitarla (C-U8-5, U8-l) | **Alta** |
| 2 | §4, eventos | Ambigüedad de la contabilización | `documento_autorizado`/`desautorizado` con `origen = 'saldo_inicial'` **no generan partida**; la partida sale de la carga inicial con la fecha del corte | Media |
| 3 | «Ya decidido» | Supone retenciones hechas en el sistema anterior | C-U8-2 | Media |
| 4 | §5 regla 2 y textos | La fecha de emisión no basta | Instrucción y aviso en Libro de compras | Media |
| 5 | Empresas | Fecha de inicio sin definición | Texto y aviso | Baja-media |
| 6 | Moneda | CxP solo en quetzales | Preguntar si hay deudas en moneda extranjera | Informativo |
| 7 | §9.1 | La conciliación de DTE mostraría lo de antes del corte como pendiente | Excluirlo o marcarlo (futuro) | Baja |

## Cambios que el diseño debe recibir

1. §9.3: quitar la corrección del saldo para notas posteriores; aviso de que no se pueden registrar todavía.
2. §11 U8-l: «hueco de Libro de compras; resolver después de U8 y antes de producción con una empresa con historia».
3. §5 y §7.1: textos («registradas en el sistema anterior», «retenciones = todas», «saldo = lo que falta pagar al
   proveedor, sin retenciones», «un anticipo no es nota de crédito»).
4. C-U8-2: si se elige B, `retenciones_por_practicar` (informativa), su total y el aviso en CP4; CP4 no descuenta
   retenciones a los saldos iniciales.
5. §4, eventos: autorizar o desautorizar un saldo inicial no genera partida.
6. Libro de compras (fuera de U8): aviso si `fecha_emision < fecha de inicio`.
7. Empresas: definir la fecha de inicio y recomendar el día 1 de un mes; cuadre al cerrar la carga inicial.
8. CP5 y ficha: línea derivada «Pagos y notas anteriores a la fecha de inicio».
9. Arquitecto: evaluar `tipo` en `documentos_numero_por_proveedor_unico` para los cargos.
10. CP4: ajuste de apertura con la carga cerrada = corrección de error (NIIF para las Pymes secc. 10).
11. U8-e (paso U8-6): necesario.

## Preguntas para el usuario (depuradas)

1. **Retenciones pendientes al corte:** ¿sus clientes retienen al recibir la factura o al pagar? ¿Columna informativa
   «retenciones por practicar» (B, recomendada) o solo instrucciones (A)?
2. **Notas sobre facturas del sistema anterior (U8-l):** ¿resolverlas en Libro de compras justo después de U8 y antes
   de producción con una empresa con historia? *Recomendado: sí.*
3. **Fecha de inicio:** ¿«primer día en Arrancar», recomendando el día 1 de un mes, con aviso sin prohibir? *Sí.*
4. **Cuadre al cerrar la carga:** con Contabilidad, ¿bloquear si la puente no está en cero (salida con permiso y
   motivo) o solo confirmar? *Recomendado: bloquear con salida auditada; mientras tanto, confirmación.*
5. **Referencia del sistema anterior (U8-i):** ¿agregarla, corta y opcional? *Sí.*
6. **Moneda extranjera:** ¿algún cliente debe a proveedores en dólares?
7. **Aviso en Libro de compras** para facturas de antes de la fecha de inicio. *Sí.*

## Veredicto

**Correcto con ajustes:** quitar la solución provisional de §9.3, subir la prioridad de U8-l, tratar las retenciones
pendientes al corte, dejar claro que el saldo inicial no se contabiliza al autorizar y avisar contra el crédito fiscal
doble.

## Fuentes

- Proyecto: `validacion-h7-h11-retenciones.md`, `dictamen-pendientes-libro-de-compras-2026-11-08.md`.
- Ley del IVA (TSE): https://www.tse.org.gt/images/UECFFPP/leyes/decreto_27-92-iva.pdf
- Ley del IVA (ICNL): https://www.icnl.org/wp-content/uploads/Guatemala_valor.pdf
- Decreto 10-2012: https://www.icnl.org/wp-content/uploads/leydeacttrib.pdf
- Código Tributario: https://es.wikisource.org/wiki/C%C3%B3digo_Tributario_de_la_Rep%C3%BAblica_de_Guatemala_(Decreto_Ley_6-91)
- Código de Comercio (art. 374 sin confirmar): https://www.icnl.org/wp-content/uploads/codcomercio.pdf
- Deloitte Guatemala, SAT-2237: https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/190912-taxalert-septiembre.pdf
- NIIF para las Pymes: https://www.ifrs.org/issued-standards/ifrs-for-smes/
- SAP, migración de partidas abiertas: https://blogs.sap.com/?p=126830
