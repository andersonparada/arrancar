# Dictamen: pendientes de Libro de compras (contador-guatemala, 2026-11-08)

Alcance: el ítem 6 de `docs/DONDE-QUEDAMOS.md`, «Pendientes de Libro de compras». Cubre L4-2b/L4-c1, el formulario de
pago de las retenciones de IVA, multa e intereses y mora, el art. 23 del Decreto 10-2012, L4-13, el SAT-2241 y las
casillas del SAT-2237.

Marcas: **[Ley]** dice la norma; **[SAT]** dice el portal o el sistema de la SAT; **[Práctica]** es práctica
profesional o una fuente secundaria; **[Opinión]** es criterio del contador.

Limitación: el portal de la SAT y Declaraguate respondieron 403. Lo de la SAT sale de extractos del buscador sobre esas
mismas páginas, cotejados con fuentes secundarias. Los textos de ley sí se leyeron completos: el Decreto 10-2012 en la
edición del CENADOJ, el AG 213-2013 y el Código Tributario en Wikisource.

## Resumen

| # | Tema | Conclusión | Certeza | ¿Decide el usuario? |
|---|---|---|---|---|
| 1 | L4-c1 / L4-2b | **Se confirma: los otros impuestos se quedan en la base.** El contador ya lo había contestado y el usuario decidió el 2026-10-20 no hacer L4-2b. **L4-2b se cierra como «no va».** | Alta en la letra de la ley; media sobre lo que calcula Retenciones Web | No |
| 2 | Formulario de pago de las retenciones de IVA | Declaración **SAT-2340** (Retenciones Web IVA) y pago con boleta **SAT-2000**, dentro de los 15 días hábiles del mes siguiente. Hay que declarar **aunque no haya retenciones**. | Media-alta | Sí (P-2, P-3) |
| 3 | Multa, intereses y mora | En el pago tardío de retenciones corre la **multa del art. 91** (100 %, rebajada a 50 % si se paga antes del requerimiento) **más los intereses resarcitorios** (arts. 58 y 59). **La mora del art. 92 no se suma.** El campo `mora` sobra para retenciones, pero no estorba. | Media-alta | Sí (P-4) |
| 4 | «Art. 23 del Decreto 10-2012» | La cita estaba mal: lo que hace no deducibles las multas, recargos e intereses es el **art. 21, numeral 15**. El art. 23 sí importa por otra razón: **literal c)**, el gasto al que no se le retuvo y enteró el ISR no es deducible hasta que se entera. | Alta | No |
| 5a | L4-13 (conciliación liviana) | Sin objeción fiscal. Depende de L4-f, que el usuario **nunca respondió**. | n/a | Sí (P-5) |
| 5b | SAT-2241 | **No implementarlo.** Lo derogó el Decreto 31-2024; solo vale para períodos hasta jul-2025. | Alta-media | Sí (P-6) |
| 5c | Casillas del SAT-2237 | Siguen esperando una **captura del formulario de la Agencia Virtual** (exclusiva desde el 1-sep-2026). No hay fuente pública con las casillas. | n/a | Sí (P-7) |
| extra | Tope del pequeño contribuyente | **Ya no es Q150,000**: son 125 salarios mínimos no agrícolas (Q500,285 en 2026). | Alta-media | Sí (P-8) |

## 1. L4-c1 y L4-2b

**Qué preguntaba L4-c1** (`diseno-datos-libro-de-compras.md` §3.3b.16): si los otros impuestos de la factura (turismo,
timbre de prensa, bomberos, tasa municipal, bebidas, tabaco, cemento, tarifa portuaria) entran en la base de la
retención del ISR (régimen opcional y factura especial), en el mínimo de Q2,500 de la retención de IVA y en el umbral del
5 % al pequeño contribuyente. L4-2b era el paso para sacarlos de la base del ISR, solo si la respuesta era «no entran».

**Ya estaba resuelto** el 2026-10-20 (`validacion-h7-h11-retenciones.md`, «Dudas de L4»; bitácora de `PLAN.md`).

| Punto | Qué dice la norma | Fuente |
|---|---|---|
| Base del ISR, régimen opcional | «el siete por ciento (7%), sobre el **valor efectivamente pagado o acreditado**». No excluye nada en forma expresa. | [Ley] Decreto 10-2012 art. 48 |
| Factura especial | Se retiene «**sin incluir el Impuesto al Valor Agregado**». | [Ley] Decreto 10-2012 art. 16 |
| Mínimo del ISR | No hay obligación si el valor es «menor a Q2,500.00, **excluyendo el Impuesto al Valor Agregado**». | [Ley] AG 213-2013 art. 35 |
| 5 % al pequeño contribuyente | Sobre el **total de la factura** | [Ley] Ley del IVA art. 48 |
| Riesgo de retener de menos | Sin la retención enterada, el gasto **no es deducible** hasta enterarla; el agente responde solidariamente. | [Ley] Decreto 10-2012 art. 23 lit. c), art. 22 num. 2, art. 13 |

**Conclusión: L4-c1 se confirma; L4-2b se cierra como «no va».** La única exclusión expresa es la del IVA. [Opinión] Si
alguna constancia real de Retenciones Web ISR trae otra base, el usuario anota la retención practicada (el sistema ya
separa propuesta y practicada); no se recomienda un interruptor por empresa salvo que aparezcan constancias así.

Corrección menor: el mínimo de Q2,500 sin IVA del ISR viene del **AG 213-2013 art. 35**, no del Decreto 10-2012 art. 48.

## 2. Formulario de pago de las retenciones de IVA (antes «RetenIVA»)

| Punto | Respuesta | Fuente | Certeza |
|---|---|---|---|
| ¿Sigue RetenIVA? | **No.** Vigente hasta el **31-may-2021**; lo reemplazó **Retenciones Web**. | [SAT] Preguntas frecuentes | Media-alta |
| Declaración | **SAT-2340, «Declaración Jurada de Retenciones del IVA»**, en Retenciones Web IVA. | [SAT]; [Práctica] Vesco | Media-alta |
| Pago | **Boleta SAT-2000** en bancos o Bancasat, tras validar y congelar la declaración. | [SAT] | Media-alta |
| Plazo | Primeros **15 días hábiles** del mes siguiente | [SAT]; [Práctica] | Media-alta |
| Declaración en cero | El agente declara cada mes aunque no haya retenido (Decreto 20-2006 art. 7, citado por Vesco) | [Práctica] | Media |
| Constancias | En Retenciones Web IVA (formulario 2229), una por una o en lote | [SAT] | Media |
| Rectificación | Se genera otra declaración; con retenciones nuevas o anuladas, un nuevo formulario de pago | [SAT] | Media |

| `grupo` | Declaración | Pago | Certeza |
|---|---|---|---|
| `iva_agentes` (incluye el 5 % al pequeño contribuyente) | SAT-2340 | SAT-2000 | Media-alta |
| `isr_opcional` | SAT-1331 | SAT-2000 | Media-alta |
| `isr_factura_especial` | SAT-1331 con anexo de facturas especiales | SAT-2000 | Media-alta |
| `iva_factura_especial` | Probablemente el SAT-2237 con su anexo de facturas especiales | SAT-2000 o el pago del SAT-2237 | **Baja** (confirmar con la captura) |

**P-2, datos del pago:** (A, recomendada) agregar `formulario` (propuesto según el grupo, editable; check
`SAT-2340`/`SAT-1331`/`SAT-2237`) y `numero_de_boleta` opcional (1 a 40); `documento_de_pago` sigue siendo el número de
la declaración. (B) Dejarlo como está con instrucciones en pantalla. (C) A más PDF adjunto en `core.archivos`. [Opinión]
El banco y su autorización le tocan a Bancos.

**P-3, declaración en cero del agente de IVA:** (A) registrar una «declaración sin retenciones» con `impuesto = 0`
(aflojar el check solo ahí). (B, recomendada ahora) solo un aviso en la matriz: «Como agente de retención del IVA,
presente el SAT-2340 aunque sea en cero». A cuando se confirme el texto del Decreto 20-2006 art. 7.

## 3. Multa, intereses y mora

| Art. (Código Tributario) | Contenido | ¿Aplica al entero tardío? |
|---|---|---|
| 91 | Pago fuera de plazo de tributos retenidos o percibidos: **multa del 100 %**, **rebaja del 50 %** si se paga antes del requerimiento | **Sí** |
| 92 | Mora: tributo × 0.0005 × días, para el contribuyente que paga tarde | **No** junto con el 91 |
| 90 | «en ningún caso sancionará dos veces la misma infracción» | Impide sumar 91 y 92 |
| 58 y 59 | **Intereses resarcitorios** desde el día siguiente al vencimiento | **Sí** |
| 106 | Rebaja del 50 % de intereses y 85 % de mora si se paga con la declaración tardía o rectificada | La calcula la SAT |
| 94 num. 7 | Multa por **no retener** | No aplica al entero tardío |

**Conclusión (media-alta):** en el pago voluntario tardío se pagan juntos impuesto, multa del art. 91 al 50 % e
intereses, en el mismo formulario y boleta. **La mora no se suma.** Los tres campos actuales no están mal; `mora`
quedará en 0 en retenciones. No falta ningún campo.

**P-4:** (A, recomendada) dejar `mora` con texto «En retenciones, la SAT cobra multa (art. 91) e intereses; la mora no
aplica» y aviso si `multa > 0` y `mora > 0`. (B) Quitar `mora` (migración). (C) A más **proponer** la multa del 50 % si
la fecha de pago pasa el plazo (los intereses no se calculan).

Contabilidad (futuro): multa e intereses son gasto, no costo de la compra, y **no son deducibles** para el ISR.

## 4. «Art. 23 del Decreto 10-2012»

- **No es el art. 23.** La regla es el **art. 21, numeral 15**: deducibles los impuestos efectivamente pagados, «**Se
  exceptúan los recargos, intereses y las multas por infracciones tributarias o de otra índole**»; también se exceptúan
  el ISR, el IVA y otros tributos cuando no constituyan costo.
- El **art. 23 literal c)** sí importa: no son deducibles los gastos a los que no se retuvo y enteró el ISR; «Serán
  deducibles una vez se haya enterado la retención» (también art. 22 num. 2).
- Impacto: corregir la cita en `diseno-proveedor-nuevo-desde-dte.md` §7. [Opinión] En el plan de Contabilidad, avisar
  en el cierre anual del ISR qué compras con retención de ISR siguen sin enterar (art. 23 lit. c).

## 5. L4-13, SAT-2241 y casillas del SAT-2237

### 5a. L4-13: conciliación liviana

Subir el Excel de «DTE Recibidos» solo para cruzarlo con lo registrado a mano, sin crear filas en la bandeja. Sin
objeción fiscal; encuentra facturas no registradas, FEL anuladas que siguen vigentes aquí y diferencias de montos.
**P-5 (L4-f):** (A, recomendada) hacerlo ahora, porque la mayoría registrará a mano; (B) esperar a que un cliente lo pida.

### 5b. SAT-2241

El **Decreto 31-2024** (vigente desde el 9-abr-2025) eliminó el régimen electrónico de pequeño contribuyente; los
inscritos tenían hasta el 9-jul-2025 para trasladarse (art. 20). Declaraguate muestra el SAT-2241 válido de mar-2020 a
jul-2025. **No se programa como formulario vigente.**

**P-6:** (A) régimen histórico con avisos al crear vigencias o registrar FAPE/FCPE después del 2025-07-31, y
`formularioDelRegimen` → 'SAT-2241' para períodos hasta jul-2025 (check de `declaraciones_de_periodos.formulario`).
(B, recomendada) solo los avisos.

### 5c. Casillas del SAT-2237

Desde jun-2026 (especiales) y el 1-sep-2026 (régimen general) el SAT-2237 va solo en la Agencia Virtual, con datos
sugeridos de la FEL; no hay fuente pública con sus casillas. **P-7:** que el usuario o su contador generen sin presentar
un SAT-2237 de un mes con compras y entreguen captura o PDF de las secciones 5, 6 y 9 y del anexo de facturas
especiales. [Opinión] Puede convenir más una pantalla de «cuadre» contra los montos sugeridos por la SAT.

## Hallazgo adicional: el tope del pequeño contribuyente

El Decreto 31-2024 reformó los arts. 45, 46 y 50 de la Ley del IVA: el tope pasó de Q150,000 a **125 salarios mínimos
mensuales no agrícolas** desde el 9-abr-2025 (Q465,381.25 en 2025; **Q500,285.00 en 2026**). Corregir el ítem de Ventas
de DONDE-QUEDAMOS y `investigacion-sat-2237-y-2046.md`. **P-8:** para Ventas, el tope como monto configurable por año
(recomendado) o como salario mínimo × 125.

## Preguntas para el usuario

1. **P-2:** ¿Agregar al entero el «formulario» y un «número de boleta SAT-2000» opcional? *Recomendado: sí.*
2. **P-3:** ¿Solo aviso de declarar el SAT-2340 en cero, o registrar esas declaraciones? *Recomendado: aviso.*
3. **P-4:** ¿Dejar `mora` con texto y aviso, o quitarla? ¿Proponer la multa del 50 %? *Recomendado: dejarla con aviso.*
4. **P-5 (L4-f):** ¿Hacer ya la conciliación liviana (L4-13)? *Recomendado: sí.*
5. **P-6:** ¿Régimen electrónico como histórico solo con avisos, o también el SAT-2241 en el historial? *Recomendado:
   solo avisos.*
6. **P-7:** ¿Puede conseguir una captura o PDF del SAT-2237 de la Agencia Virtual?
7. **P-8:** ¿Tope del pequeño contribuyente como monto configurable por año? *Recomendado: sí.*

## Veredicto

**Correcto con ajustes:** cerrar L4-2b; dejar de hablar de RetenIVA y registrar el formulario del pago; aclarar que en
retenciones se pagan multa del art. 91 más intereses, sin mora; corregir dos citas (art. 21 num. 15 y AG 213-2013 art.
35); no programar el SAT-2241 y tratar ese régimen como histórico; corregir el tope del pequeño contribuyente.

## Fuentes

- Decreto 10-2012 (CENADOJ): https://www.icnl.org/wp-content/uploads/leydeacttrib.pdf
- AG 213-2013: https://goldservice.com.sv/Docs/leyes/GUATEMALA/LEY%20DE%20ACTUALIZACI%C3%93N%20TRIBUTARIA%20DE%20GUATEMALA.pdf
- Código Tributario: https://es.wikisource.org/wiki/C%C3%B3digo_Tributario_de_la_Rep%C3%BAblica_de_Guatemala_(Decreto_Ley_6-91)
- SAT, Retenciones Web IVA: https://portal.sat.gob.gt/portal/sistemas-web/retencioneswebiva/
- SAT, Preguntas frecuentes: https://portal.sat.gob.gt/portal/preguntas-frecuentes/cumplimiento-tributario/
- SAT, Lista general de formularios: https://portal.sat.gob.gt/portal/lista-general-de-formularios/
- Catálogo Declaraguate: https://declaraguate.sat.gob.gt/declaraguate-web/catalogo.iface
- Vesco, Retenciones de IVA Web: https://vescco.tax/blog/retenciones-de-iva-web-en-que-consiste/
- Prensa Libre, Termómetro fiscal: https://www.prensalibre.com/?p=426529
- Prensa Libre, «El pequeño contribuyente y la nueva ley»: https://www.prensalibre.com/opinion/columnasdiarias/el-pequeno-contribuyente-y-la-nueva-ley/
- Prensa Libre, tope 2025: https://www.prensalibre.com/economia/sat-eleva-techo-de-ingresos-para-pequenos-contribuyentes-a-q465-mil-anuales/
- Vesco, pequeño contribuyente 2026: https://vescco.tax/blog/regimen-pequeno-contribuyente-actualizado-2026/
- Consortium Legal, Decreto 31-2024: https://consortiumlegal.com/2024/12/19/decreto-31-2024-ley-para-la-integracion-del-sector-productivo-primario-y-agropecuario-en-guatemala/
- SAT-2237 en la Agencia Virtual (2026): https://lookuptax.com/tax-changes/guatemala/sat-2237-iva-return-2026
