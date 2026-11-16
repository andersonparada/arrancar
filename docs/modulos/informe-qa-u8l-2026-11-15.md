# Informe de QA U8l-8: notas sobre facturas del sistema anterior y DTE anteriores a la fecha de inicio (2026-11-15)

Prueba de punta a punta en el navegador (Chromium sin interfaz, 1280 px y 380 px, claro y oscuro) contra una base y una
app propias, con datos inventados (empresa «Rancho Demo QA8», proveedores ficticios, DTE generados a mano). Referencias:
`diseno-u8l-notas-sobre-facturas-anteriores.md` (§4, §8, §10) y `dictamen-u8l-2026-11-12.md`.

Escenario: fecha de inicio **15/10/2026** (mitad de mes), hoy 15/11/2026, régimen general, un saldo inicial B-F100 por
Q 1,120.00 (factura del 10/09/2026). Bandeja con seis DTE: 20/09, 05/08, 10/06 y 03/10 (anteriores) y 20/10 y 05/11
(posteriores).

## Resultados por flujo

| Flujo | Resultado |
|---|---|
| Fecha de inicio a mitad de mes: marca por `emisión < 15/10`, las de octubre anteriores al 15 cuentan como «en plazo» | Bien |
| Importar el archivo de la SAT: aviso «4 DTE son de antes de la fecha de inicio… quedaron marcados y fuera de la conciliación» | Bien |
| Bandeja: oculta por omisión con «4 DTE de antes… no se muestran» y «Mostrar 4»; al mostrar, orden por fecha, marca «Antes de la fecha de inicio», y destacadas (borde y texto) las de 03/10, 20/09 y 05/08; la del 10/06 sin destacar | Bien (claro, oscuro, 380 px) |
| Conciliación de octubre: el DTE del 03/10 va al grupo plegado «DTE de antes de la fecha de inicio» con la ayuda y marca de plazo; el del 20/10 sigue en «En la SAT y no registradas» | Bien |
| Nota de crédito sobre B-F100 (saldo inicial): se aplica sola; el saldo inicial pasa de Q 1,120.00 a Q 560.00; ficha CxP «Corrige el saldo inicial…» y «Notas de crédito aplicadas» | Bien |
| Nota de crédito sobre factura anterior sin saldo inicial (sugerida de la bandeja): queda como saldo a favor Q 1,120.00 con el aviso y el de retención | Bien |
| Nota de débito tardía (art. 17) sobre B-F100: aviso «La factura es del 10/09/2026; esta nota de débito se emitió más de dos meses después…», IVA Q 24.00 al costo (motivo NDT) | Bien |
| Factura anterior de más de 4 años: aviso sin bloquear; de más de 10 años: rechazo con el mensaje acordado y la fecha límite (15/10/2016 pasa, 14/10/2016 se rechaza) | Bien |
| Nota recibida antes de la fecha de inicio: rechazo hacia Saldos iniciales | Bien |
| Factura anterior con fecha igual o posterior a la de inicio: rechazo con el camino al libro | Bien |
| Tope con notas de débito anteriores (factura Q 1,120.00/IVA 120.00 + débitos Q 224.00/24.00): nota de Q 1,344.00 pasa, de Q 1,400.00 se rechaza | Bien |
| «Otra causa»: en una nota (hereda de su factura anterior) con detalle obligatorio (botón bloqueado sin detalle y mensaje «Falta explicar…»); en una factura del libro con observaciones obligatorias; sigla OC y leyenda en el libro | Bien |
| Registrar en el libro una factura ya citada (B-F100): rechazo con el camino completo y «Ver la nota que la cita»; igual desde la confirmación en lote de la bandeja (con el error por fila) | Bien (ver hallazgo 3: la vista previa no lo anticipa) |
| Factura registrada tras anular la única nota que la citaba; luego una nota «anterior» sobre ella: «ya está en el libro, elíjala en “Factura que corrige”» | Bien |
| Sugerencias (usadas y de la bandeja) que llenan el formulario con un clic | Bien |
| «Documento que modifica» en la ficha del libro y en el Excel del libro (columna al final; solo en las notas) | Bien |
| Eliminar la única nota de una factura anterior: la factura anterior desaparece de las sugerencias; las demás quedan | Bien |
| Anular una nota aplicada: el saldo inicial vuelve a Q 1,120.00 | Bien |
| Aviso de notas posteriores al cargar el saldo inicial SAT1-7001 (ventana, lista y cuadre) | Bien |
| Cambiar la fecha de inicio a antes de una factura anterior (15/09) y a después de una recepción (13/11): rechazos con la lista de notas | Bien (ver hallazgo 4: concordancia) |
| Doble clic en «Registrar»: una sola nota; dos notas simultáneas que juntas pasan el tope: una se rechaza | Bien |
| Rol de solo lectura: ve la ficha y el libro; 403 en sugerencias, anular, eliminar, bandeja, exportar y cambio de fecha; sin botones | Bien |
| Cuadre a mano del libro de noviembre y del SAT-2237 (ver abajo) | Bien |
| Aviso de neto negativo en las casillas de crédito del SAT-2237 (adenda del dictamen, ajuste a) | Error: faltaba (corregido) |

## Cuadre a mano (noviembre 2026, con las notas registradas durante la prueba)

Facturas: SAT1-7006 base 200 IVA 24 con crédito; Z-OC-F2 base 1,000 IVA 120 sin crédito (otra causa). Notas de crédito con
crédito: NC-001 (500/60), NC-002 (1,000/120), NC-003 (100/12), NC-011 (1,200/144). NC-013 (500/60, otra causa). Nota de
débito ND-001 base 200 IVA 24 sin crédito (NDT).

- Bienes: 200 + 1,000 − 500 − 1,000 − 100 − 1,200 − 500 + 200 = **−1,900.00**. El libro, la pantalla y el Excel dicen −1,900.00.
- IVA con crédito: 24 − 60 − 120 − 12 − 144 = **−312.00**. Coincide.
- IVA sin crédito: 120 + 24 − 60 = **84.00**; por motivo: OC 60, NDT 24. Coincide.
- Total: −1,900 − 312 + 84 = **−2,128.00**. Coincide; por tipo: FACT 1,344.00, NCRE −3,696.00, NDEB 224.00.
- SAT-2237: «otras compras» neto −2,600 / −312; «compras sin derecho a crédito» facturas 1,000/120 + débitos 200/24 − créditos
  500/60 = 700/84; segmento 9: 2 facturas base 1,200, 5 NCRE base 3,300, 1 NDEB base 200.
- Tras anular NC-001 y NC-011, eliminar NC-003 y registrar la factura T-TOPE1 (1,344.00): otras compras neto 400.00 / 48.00,
  proveedor 2 facturas y 1 nota con 400.00 / 48.00 y segmento 9 con 3 facturas por 2,400.00. Coincide.

## Errores y observaciones

1. **Falta el aviso de neto negativo en la sección 5 del SAT-2237 (media). Corregido.** Pasos: registrar notas de crédito
   sobre facturas de meses anteriores que superen las compras del mes y abrir «Datos para el SAT-2237». Esperado
   (adenda del dictamen, ajuste a): aviso «el neto de una casilla… es negativo… Declaraguate no admite negativos…». Pasó:
   solo salía el aviso por proveedor; el crédito fiscal del período de −312.00 no tenía advertencia. Ahora
   `datos-del-sat-2237.ts` lo agrega para los rubros combustibles, activos fijos, servicios y otras compras (con prueba).
2. **Mensajes de rechazo al cambiar la fecha de inicio (baja). Corregido.** Decían «Hay 1 notas» y «emitidas desde» (las
   emitidas son las facturas). Ahora concuerdan en singular y plural y dicen «facturas… con fecha del dd/mm/aaaa o
   posterior» (prueba nueva `errores-de-factura-anterior.prueba.ts`).
3. **La vista previa de la confirmación en lote no anticipa el rechazo «factura ya es del sistema anterior» (baja). Corregido (U8l-9).**
   Pasos: importar un DTE FACT con serie y número de una factura citada por una nota (B-F100), marcarlo y pulsar «Confirmar».
   Esperado: aviso de error en la ventana antes de «Registrar». Pasó: sale en verde («Neto a pagar Q 1,120.00») y recién al
   registrar aparece «1 factura no se registró y sigue pendiente» con el camino completo. No se pierde nada, solo se
   descubre tarde. Sin corregir (toca la vista previa de la bandeja).
4. **Mensajes de montos con nombre equivocado (baja). Corregido (U8l-9).** Con IVA de la factura anterior negativo dice «El IVA de la factura
   no puede ser mayor que su total»; con notas de débito anteriores negativas dice lo mismo del IVA de las notas de débito.
   Esperado: «no puede ser negativo». Se rechaza bien; solo el texto confunde. Sin corregir.
5. **Excel y PDF del libro muestran la clave del motivo (baja, ya existía). Corregido (U8l-9).** La hoja Resumen escribe
   `otra_causa_sin_credito` y `nota_de_debito_tardia` en «IVA sin crédito por motivo» (la pantalla sí usa los nombres).
   Archivos: `hojas-del-libro.ts` y `hoja-de-resumen.ts`. Sin corregir.
6. **«Este proveedor no tiene facturas vigentes» antes de elegir proveedor (baja). Corregido (U8l-9).** En el formulario de una nota, el
   selector «Factura que rebaja esta nota» lo dice aunque todavía no se eligió proveedor. El diálogo de eliminar una nota
   se titula «Eliminar factura». Sin corregir.
7. **Observaciones menores. Corregidas (U8l-9), salvo la regla de fechas futuras del libro, que es general del libro y queda anotada.** La vista previa del formulario muestra el texto genérico «Elija el proveedor, escriba el
   número…» cuando el cálculo devuelve un rechazo (el error sí aparece en el campo, lejos de la barra de abajo). La ficha de
   un rol de solo lectura pide listas que no puede ver (403 de conceptos y terceros en consola) pero se muestra completa.
   La tabla de rubros del SAT-2237 en escritorio necesita desplazarse a la derecha para ver el neto. Una factura del libro
   con emisión y recepción futuras (2027) se acepta (regla general del libro, no de este paso).

## Pruebas

- Nuevas: `servidor/src/modulos/libro-de-compras/dominio/errores-de-factura-anterior.prueba.ts` (mensajes de la fecha de
  inicio) y un caso en `dominio/libro/datos-del-sat-2237.prueba.ts` (aviso de neto negativo).
- `npm run revisar` y `npm run probar` (base `arrancar_pruebas_qa8`) en verde antes del commit.
