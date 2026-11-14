# Dictamen: pagos en efectivo con un retiro del banco (adenda de CP4) — contador-guatemala, 2026-11-14

Sobre `diseno-cp4-pagos-en-efectivo.md`. Versión condensada por el coordinador a partir de la respuesta completa del
contador (sin cambiar conclusiones). Marcas: **[Ley]**, **[Práctica]**, **[Opinión]**.

## Fuentes verificadas

| Norma | Contenido | Certeza |
|---|---|---|
| Decreto 20-2006 art. 20, reformado por Decreto 4-2012 art. 27 | Pagos «a partir de» Q30,000 por medios bancarios «distinto al dinero en efectivo» que individualicen al vendedor; «una sola operación» si se paga al mismo proveedor en un **mes calendario** o si una operación ≥ umbral se paga **parcialmente o se fracciona**; si no, el gasto no es deducible ni genera crédito fiscal | Texto alta; vigencia 2026 media-alta |
| Decreto 20-2006 art. 21 (Decreto 4-2012 art. 28) | Conservar 4 años los documentos bancarios | Alta |
| Código Tributario art. 106 (Decreto 4-2012 art. 48) | Rectificación voluntaria con rebajas de intereses y sanción | Alta |
| Ley del IVA art. 18 (Decreto 4-2012 art. 8) | Requisitos del crédito fiscal | Alta |
| Código de Comercio arts. 497–499 | Cheque sin beneficiario = al portador; «no negociable» limita el endoso, no el cobro por el beneficiario | Media-alta |
| Criterio SAT 5-2021 | El efectivo nunca es pago bancarizado | Alta |
| Ley de Timbres art. 11 num. 1 | Exime documentos de actos gravados con IVA | Media |
| NIIF Pymes Sección 7 | El párrafo 7.17 **no** trata traspasos entre efectivo (cita a corregir) | Media-alta |

## Los 7 puntos

1. **Bancarización en efectivo:** las reglas de la adenda coinciden con la ley (operación fraccionada y suma del mes);
   `>=` correcto. **El efectivo debe sumar al aviso de los pagos bancarios** (§5.7 de CP4): el aviso sale también al
   registrar el cheque que haga llegar el mes al umbral. Suma sobre lo aplicado a cargos (antes de retenciones). IVA ya
   tomado: se **rectifica** el mes en que se tomó (CT art. 106); Arrancar no rectifica ni toca el Libro de compras,
   solo marca la factura «crédito fiscal en riesgo por bancarización» en el reporte de CP5. ISR: no deducible. Duda
   (media): si la SAT rechaza solo lo pagado en efectivo o toda la operación; avisar por toda.
2. **Cheque para retirar:** al portador es legal, pero no ofrecerlo y rechazar beneficiario vacío o «al portador».
   **«No negociable» encendido por omisión** (a nombre del custodio se cobra igual en ventanilla). A nombre de la
   empresa también sirve.
3. **Partidas:** «Efectivo para pagos a proveedores» es **Caja** (subcuenta a cargo del custodio). Faltante: por cobrar
   al custodio o pérdida (deducible solo con prueba, p. ej. denuncia; numeral del art. 21 del Decreto 10-2012 sin
   confirmar).
4. **Flujo:** retiro y devolución sin flujo, pago en Operación o Inversión: correcto. **El faltante sí es flujo
   (E-1).** Fecha del retiro en el flujo de Bancos: aceptable solo como reporte de gestión, con leyenda; resolver
   P-CPE-2 antes de que Contabilidad emita estados financieros.
5. **Recibo:** contenido suficiente (nombre, firma, DPI a mano, total en letras, DTE, retención y constancia, leyenda
   «no es documento tributario»), original y copia; basta la factura FEL del proveedor; **un recibo por proveedor**.
6. **Retenciones:** correcto; se descuentan una vez en el primer pago vigente; el recibo muestra bruto, retención y
   constancia.
7. **Varias contraseñas en un pago (M2):** sin problema fiscal; ayuda a la suma del mes.

## Otros errores

| # | Problema | Gravedad | Corrección |
|---|---|---|---|
| E-1 | Faltante tratado sin flujo | Media | Concepto de sistema «Faltante de efectivo» (Operación) en la `0033` de Bancos y en el desglose al liquidar |
| E-2 | Bancarización igual para todo régimen | Media | Condicionar al régimen de IVA e ISR de la empresa y al documento: sin efecto fiscal, sin aviso ni bloqueo; con uno solo, el texto nombra ese efecto |
| E-3 | Cita NIIF 7.17 | Baja | Quitarla; Sección 7 y NIC 7 párr. 9 vía Sección 10 |
| E-4 | «No negociable» apagado | Baja-media | Encendido por omisión |
| E-5 | Texto del aviso | Baja | Mencionar la rectificación (CT art. 106) y solo los efectos que apliquen |
| E-6 | La suma del mes no ve pagos fuera de Cuentas por pagar | Baja-media | Decirlo en el aviso y en CP5 |
| E-7 | No se sabe el efectivo en custodios al cierre | Media-baja | Lista «Retiros por liquidar» con fecha de corte |
| E-8 | El custodio liquida su propio retiro | Baja | Aviso si el custodio es usuario y liquida él mismo |
| E-9 | Retiros grandes piden IVE-BA-03 en el banco | Informativa | Mencionarlo en la ayuda |

## Opinión sobre las preguntas

CP4-E-a: **A**. CP4-E-b: de acuerdo, con no negociable encendido y sin al portador. CP4-E-c: mismo correlativo.
CP4-E-d: **B**, condicionada al régimen (E-2) y con aviso al registrar el cheque que «contamina» el mes. CP4-E-e:
**M2**. CP4-E-f: las dos cosas; plazo como **aviso**, a fin de mes o a los 30 días (variable opcional). CP4-E-g: de
acuerdo, con E-1. CP4-E-h: texto libre con enlace opcional a un usuario.

## Cambios que el diseño debe recibir

1. Citar el art. 20 del Decreto 20-2006 reformado por el art. 27 del Decreto 4-2012, con su texto.
2. Concepto «Faltante de efectivo» (Operación) en la `0033` de Bancos y en el desglose al liquidar.
3. Bancarización condicionada al régimen y al documento, con textos por efecto.
4. El aviso de §5.7 suma el efectivo y salta al registrar cualquier pago que haga llegar el mes al umbral.
5. Marca «crédito fiscal en riesgo» en el reporte de CP5, sin tocar el Libro de compras.
6. «No negociable» encendido; rechazar beneficiario vacío o «al portador».
7. Leyenda en el flujo de Bancos; P-CPE-2 antes de los estados financieros.
8. Lista de retiros con fecha de corte; aviso de liquidación por el propio custodio.
9. Corregir la cita NIIF; mencionar la limitación de la suma del mes.

## Veredicto

**Correcto con ajustes.** El modelo de tres hechos (retiro, pago, liquidación) es contablemente correcto; retención y
M2 bien. Corregir antes de programar el faltante como flujo (E-1) y la bancarización por régimen (E-2), más la lista.

## Fuentes

- Decreto 4-2012: [texto](https://extranet.who.int/fctcapps/sites/default/files/2023-04/guatemala_2018_annex-15_Decree_4-2012.pdf).
- Decreto 20-2006 art. 20: [Termómetro Fiscal](https://www.termometrofiscal.com/post/la-papeleta-de-dep%C3%B3sito-es-bancarizaci%C3%B3n-en-materia-tributaria); [Vargas Piedrasanta](https://www.vargaspiedrasanta.com/single-post/regulaciones-en-materia-de-bancarizaci%C3%B3n-tributaria-para-documentar-egresos-a-partir-q-30-000-00); [IURISTEC](https://iuristec.com.gt/index.php?title=Articulo:0010).
- Criterio SAT 5-2021: [Deloitte 21-21](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%2021-21.pdf).
- Código de Comercio arts. 497–499: [Living in Guatemala](https://livinginguatemala.com/es/bancos/tipos-de-cheque-guatemala/); [ICNL](https://www.icnl.org/wp-content/uploads/codcomercio.pdf).
- Ley de Timbres art. 11: [Living in Guatemala](https://livinginguatemala.com/es/tramites/timbres-fiscales-guatemala/).
- NIIF Pymes Sección 7: [IFRS](https://www.ifrs.org/issued-standards/ifrs-for-smes/).
- IVE-BA-03: [Banco Promerica](https://www.bancopromerica.com.gt/media/345255/faq.pdf); [Ley contra el Lavado de Dinero](https://pinfex.banguat.gob.gt/sites/default/files/banguat/leyes/2025/ley_contra_lavado_de_dinero.pdf).
