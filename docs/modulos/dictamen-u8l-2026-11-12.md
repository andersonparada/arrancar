# Dictamen U8-l y P-U8-1: notas sobre facturas del sistema anterior y DTE anteriores a la fecha de inicio (contador-guatemala, 2026-11-12)

Sobre `diseno-u8l-notas-sobre-facturas-anteriores.md`. Versión condensada por el coordinador a partir de la respuesta
completa del contador (sin cambiar conclusiones). Marcas: **[Ley]**, **[SAT]**, **[Práctica]**, **[Opinión]**.

**Fuentes y certeza:** Ley del IVA (Decreto 27-92) arts. 15–18, 20, 29 lit. d y 37, verificados con fuentes
secundarias (certeza media-alta en contenido, media en redacción literal). El Decreto 17-2025 reformó los arts. 23,
23 «A», 23 «B» y 25 de la Ley del IVA y los arts. 99 y 153 del Código Tributario, **no** los arts. 16–20 ni 29.
Código Tributario arts. 47–48 (prescripción 4/8 años) y 76, certeza media. **Novedad FEL (certeza baja-media):** desde
el 10-11-2026 la SAT marcaría con la **frase tipo 9, escenario 22** las NCRE emitidas desde el tercer mes calendario
siguiente al de la factura («Reglas y Validaciones» v2.2); no aplica a la NDEB.

## Resumen

| # | Tema | Conclusión | Certeza |
|---|---|---|---|
| C-U8l-1 | Crédito fiscal de la NCRE | **Correcto:** rebaja el crédito del **mes de recepción** si la factura dio crédito; si no, rebaja el costo. Que el período de la factura ya se declarara en el sistema anterior no cambia nada. Riesgo nuevo: frase FEL 9-22 (por confirmar) | Media-alta |
| C-U8l-2 | Motivos de «no dio crédito» | Para la NCRE basta sí/no; el motivo importa en la NDEB (hereda `exento` y `no_vinculado`). **Falta** `otra_causa_sin_credito` | Media-alta |
| C-U8l-3 | NDEB sobre factura anterior | **Correcto:** da crédito por sí misma (arts. 18 y 20 desde su emisión); el art. 17 se mide con la fecha de la factura anterior, así que casi todas serán `nota_de_debito_tardia`, y es lo correcto | Media-alta |
| C-U8l-4 | Topes | Control lógico, no ley. **Hueco:** las NDEB del sistema anterior suben el tope real y hoy se rechazaría una NCRE legítima | Alta |
| C-U8l-5 | Referencia en el libro | La ley la exige **en la nota** (art. 17 párr. 3, art. 29 lit. d), no en la línea del libro del comprador. Recomendado: «Documento que modifica» en la ficha y en el Excel del libro | Media |
| C-U8l-6 | «Se muestra en reportes SAT» | Correcto tomar el de la nota | Alta |
| C-U8l-7 | Antigüedad | Ninguna ley pone tope a la nota del comprador; la prescripción limita a la SAT sobre períodos pasados. El tope de 10 años es control de captura (el mensaje no cita ley); aviso sin bloquear desde 4 años | Media-alta |
| C-U8l-8 | CxP sin saldo inicial | **Correcto:** NCRE = saldo a favor (se reclasifica al cierre si el neto es deudor); NDEB = cargo nuevo. Faltan avisos de retención y al cargar después el saldo inicial | Alta |
| C-U8l-9 | DTE anteriores fuera de la conciliación | **Correcto**, con la salvedad de C-U8-1: un DTE emitido antes del corte, recibido después y **no registrado en el sistema anterior** es un faltante real; los textos deben pedir verificarlo | Alta |
| C-U8l-10 | Factura del libro y factura anterior a la vez | Sin caso legítimo. **Error:** la clave usa la familia exacta; debe ser «familia factura» (o autorización FEL), como en Cuentas por pagar | Alta |

## Puntos clave

- **C-U8l-1:** la NCRE no corrige la declaración del mes de la factura; es un hecho del mes en que se recibe (no se
  toca `saldo_al_inicio`). Con cambio de régimen de la empresa, el aviso debe decir que el IVA de la nota va al costo.
  En ISR (régimen sobre utilidades), si la factura es de un año anterior, la nota es menor costo u otro ingreso del año
  en que se recibe; el evento ya lleva `facturaAnterior.fechaEmision` (documentarlo en el TSDoc).
- **C-U8l-2:** agregar `otra_causa_sin_credito` («No dio crédito por otra causa»: requisitos del art. 18, otro NIT,
  rechazo de la SAT, bancarización), con efecto igual a `fuera_de_plazo`; también en `documentos.motivo_sin_credito`
  del libro si la nota lo hereda (lo evalúa el arquitecto). Formulario: «¿Dio crédito fiscal?» y, si no, «¿Por qué?».
- **C-U8l-3:** aviso «La factura es del dd/mm/aaaa; esta nota de débito se emitió más de dos meses después: su IVA no
  da crédito fiscal (Ley del IVA art. 17) y va al costo», igual que con las facturas del libro.
- **C-U8l-4:** opciones A (solo mensaje), **B (recomendada)** campos opcionales «notas de débito anteriores a la fecha
  de inicio» (total e IVA, 0 por omisión) que suman al tope, C (pasar el tope con confirmación y motivo auditado).
- **C-U8l-8:** aviso en el saldo libre «si la factura tuvo retención, parte de este saldo puede corresponder a ella»;
  aviso si el saldo inicial tiene `retenciones_por_practicar` y recibe una NCRE; la fecha de la aplicación automática =
  recepción de la nota, que debe ser ≥ fecha de inicio (error 3).
- **C-U8l-9:** texto «De antes de la fecha de inicio: deben estar en el libro del sistema anterior. Si alguno no lo
  está, regístrelo aquí (con el aviso de fecha anterior)». Opcional: destacar los emitidos en los dos meses anteriores
  al corte (todavía en plazo de crédito).

## Opinión sobre las preguntas al usuario

| Pregunta | Opinión |
|---|---|
| U8l-a | A (tabla propia), con la clave por «familia factura» |
| U8l-b | A (pedir todos los datos), más `otra_causa_sin_credito` y los campos de NDEB anteriores |
| U8l-c | A (nada automático) **más un aviso** al crear o importar un saldo inicial: «Hay N notas posteriores sobre esta factura; aplíquelas en Notas de crédito» |
| U8l-d | A, con la ayuda «los datos de la factura vienen impresos en la propia nota (documento de origen)» |
| U8l-e | A (bloquear), con el mensaje del camino completo: anular la nota, registrar la factura (sin crédito si pasó el art. 20) y volver a registrar la nota |
| P1-a | A (ocultos con «Mostrar N»), con el texto de C-U8l-9 |
| P1-b | A (grupo plegado), con la misma salvedad; opcional destacar los dos meses anteriores |

## Otros errores u omisiones

| # | Dónde | Problema | Corrección | Gravedad |
|---|---|---|---|---|
| 1 | §2.2, §3.1, §4.1 regla 4, U8l-e | Clave por familia exacta: crédito doble o dos filas con dos topes | Proveedor + «familia factura» + serie + número; primero autorización FEL si ambas la tienen | **Media** |
| 2 | §4.4 | «Mover la fecha más adelante nunca choca» es falso con el error 3 | Al mover la fecha, revisar también la recepción de las notas con factura anterior | Media |
| 3 | §4.1 | No exige que la nota se haya **recibido** desde la fecha de inicio | Regla y error: «Una nota recibida antes de la fecha de inicio es del sistema anterior: cárguela en Saldos iniciales si sigue pendiente» | **Media** |
| 4 | §3.1 | NDEB anteriores suben el tope real | C-U8l-4 opción B o C | Media-baja |
| 5 | §3.1, §7 | Falta motivo genérico | `otra_causa_sin_credito` | Media-baja |
| 6 | §4.5, §8 | Los textos dan por hecho que el DTE ya está en el sistema anterior | Texto de C-U8l-9 | Media-baja |
| 7 | §4.1 regla 6 | Falta el aviso de NDEB tardía con la factura anterior | Mismo aviso que con facturas del libro | Baja |
| 8 | §4.3 | Saldo libre por retención mal explicado | Avisos de C-U8l-8 | Baja |
| 9 | §6.2 | Corregir una factura anterior con solo notas anuladas cambia lo que muestran | Aceptable con auditoría `corregir`; la ficha puede decir «datos de la factura corregidos el …» | Baja |
| 10 | Libro de compras (general) | Frase FEL 9-22 en NCRE tardías | Verificar el documento oficial de la SAT; mientras, regla conservadora y aviso | Media (fuera de U8-l) |
| 11 | §5.1 | Contabilidad necesita saber que el costo es de un año anterior | Documentar `fechaEmision` en el TSDoc del evento | Informativo |

**Pendiente nuevo P-U8l-1 (Libro de compras, general):** verificar en la documentación oficial de FEL el texto y el
efecto de la frase 9, escenario 22, y si el receptor debe seguir rebajando el crédito en el mes de recepción.

## Cambios que el diseño debe recibir

1. Clave por «familia factura» (+ autorización FEL); `tipo` fuera de `facturas_anteriores_del_proveedor_unica`.
2. Regla y error: nota con factura anterior recibida antes de la fecha de inicio → Saldos iniciales.
3. §4.4: al cambiar la fecha de inicio, revisar también la recepción de esas notas.
4. Motivo `otra_causa_sin_credito` (y en `documentos` del libro si se hereda).
5. Según el usuario: campos opcionales de NDEB anteriores (total e IVA) o salida con confirmación auditada.
6. Avisos: NDEB tardía con la fecha de la factura anterior; factura de más de 4 años; el mensaje de 10 años sin citar ley.
7. Cuentas por pagar: aviso de retención en el saldo libre, aviso de retención por practicar, aviso al crear o importar
   un saldo inicial con notas posteriores libres (U8l-c).
8. Textos de la bandeja y la conciliación con la salvedad de C-U8-1; opcional destacar los dos meses anteriores.
9. Ayuda «los datos vienen impresos en la nota»; mensaje de U8l-e con el camino completo.
10. «Documento que modifica» en la ficha de la nota y, opcional, en el Excel del libro.
11. §13: pendiente P-U8l-1.

**Para el arquitecto:** único `(empresa_id, proveedor_id, coalesce(serie,''), numero)`; único parcial opcional por
`autorizacion_fel`; si se elige B, `notas_de_debito_anteriores_total` e `_iva` `numeric(14,2) not null default 0` con
check `iva <= total` y `>= 0`; `otra_causa_sin_credito` en los checks de motivo (migración `--custom` en el libro).

## Preguntas para el usuario (depuradas)

1. NDEB del sistema anterior sobre la misma factura: ¿dato opcional que suma al tope (B, recomendado), solo mensaje
   (A), o pasar el tope con confirmación y motivo (C)?
2. ¿Agregar «No dio crédito por otra causa»? *Recomendado: sí.*
3. Nota recibida antes de la fecha de inicio: ¿rechazar y mandar a Saldos iniciales (recomendado) o solo avisar?
4. U8l-c: ¿A más el aviso al cargar el saldo inicial? *Recomendado: sí.*
5. Factura de más de 4 años: ¿aviso sin bloquear además del tope de 10 años? *Recomendado: sí.*
6. DTE anteriores: ¿textos que piden verificar y destacar los dos meses anteriores al corte? *Recomendado: el texto sí;
   destacar, opcional.*
7. El resto (U8l-a, b, d, e; P1-a, P1-b): de acuerdo con las recomendaciones del diseño, con los ajustes de arriba.

## Veredicto

**Correcto con ajustes.** El modelo fiscal está bien (la nota va al libro del mes de recepción y hereda el motivo; la
NDEB se mide con el art. 17 contra la fecha de la factura anterior; la apertura nunca se corrige; los DTE anteriores
fuera de la conciliación), y presentar la factura anterior como `FacturaParaNota` reutiliza un cálculo validado. Antes
de programar: la clave por familia exacta (media), la recepción anterior a la fecha de inicio y su efecto al mover la
fecha (media), el tope con NDEB anteriores y el motivo genérico (media-baja), y los textos de C-U8-1. La frase FEL 9-22
queda como pendiente general de Libro de compras.

## Fuentes

- Ley del IVA, Decreto 27-92: [TSE](https://www.tse.org.gt/images/UECFFPP/leyes/decreto_27-92-iva.pdf); [Vesco, art. 29](https://vescco.tax/leyes-tributarias/iva-guatemala/articulo-29-documentos-obligatorios/); [Prensa Libre, anulación de DTE](https://www.prensalibre.com/opinion/columnasdiarias/anulacion-de-documentos-tributarios-electronicos/); [foro Diamante Contador](https://preguntas.diamantecontador.com/t/aplicacion-nota-de-credito-2020/8857).
- Decreto 17-2025: [Congreso](https://www.congreso.gob.gt/assets/uploads/info_legislativo/decretos/ce217-17-2025.pdf); [Consortium Legal](https://consortiumlegal.com/2025/11/20/decreto-17-2025-ley-para-la-facilitacion-del-cumplimiento-en-la-devolucion-de-impuestos-en-guatemala/); [EY](https://www.ey.com/es_ce/technical/tax/tax-alerts/guatemala-el-congreso-de-la-republica-de-guatemala-aprueba-el-decreto-17-2025-para-acelerar-la-devolucion-de-impuestos).
- FEL frase 9-22 (certeza baja-media): [LLB Solutions](https://llbsolutions.com/es/notas-credito-electronicas-guatemala-validacion-sat/); [repositorio con la regla v2.2](https://github.com/solvdev/fossiles-core-back/pull/191).
- Código Tributario, Decreto 6-91: [Wikisource](https://es.wikisource.org/wiki/C%C3%B3digo_Tributario_de_la_Rep%C3%BAblica_de_Guatemala_(Decreto_Ley_6-91)).
- Reglamento de la Ley del IVA, AG 5-2013: [CGAB](https://cgab.org.gt/wp-content/uploads/2023/10/Reglamento-de-la-Ley-del-IVA-Acuerdo-Gubernativo-5-2013_3.pdf).
- NIIF para las Pymes: [IFRS](https://www.ifrs.org/issued-standards/ifrs-for-smes/).

## Adenda (contador, 2026-11-13): rubro de «otra causa», P-U8l-2 y P-U8l-1

Investigación en línea limitada (límite de uso; el portal técnico FEL de la SAT respondió 403).

1. **`otra_causa_sin_credito` en notas de crédito: correcto.** Igual que `fuera_de_plazo` hoy
   (`rubros-del-sat-2237.ts`): base e IVA a `compras_sin_credito`, con **signo negativo** (resta del rubro; no se
   omite), IVA al costo [Ley arts. 16 y 18; Práctica; certeza media-alta]. Sigla «OC» correcta.
   **Ajustes:** (a) aviso cuando el neto de una casilla de la sección 5 del SAT-2237 quede **negativo** («El neto es
   negativo por notas de crédito sobre compras de meses anteriores; Declaraguate no admite negativos: consulte con su
   contador cómo declararlo»); el riesgo ya existe hoy con `fuera_de_plazo` (general, no solo U8-l; certeza media).
   (b) Quitar «otro NIT» y «rechazo de la SAT» de la leyenda de «OC»: una factura a otro NIT no va en el libro de la
   empresa y un rechazo de la SAT se corrige con rectificativa, no con el motivo.
2. **P-U8l-2:** recomienda **sí** ofrecerlo a mano en las facturas del libro (requisitos del art. 18, bancarización
   descubierta al pagar), con **detalle obligatorio** y auditoría; basta quitar el check
   `documentos_otra_causa_solo_en_nota_con_factura_anterior`. **Pendiente del usuario.**
3. **P-U8l-1 (frase FEL 9-22): sigue sin verificar** en fuente oficial. Antecedente (Reglas y Validaciones 2018,
   copia no oficial): la nota emitida después de dos meses de la factura «no se permitirá incluir IVA». Mientras no se
   confirme: seguir la regla del diseño y **tomar siempre el IVA de la nota del DTE, nunca calcularlo** (con IVA 0 la
   rebaja del crédito es 0). Pendiente para el usuario o su contador externo: bajar del portal FEL, con sesión, las
   «Reglas y Validaciones» vigentes y el catálogo de frases, o preguntar a la mesa de ayuda de la SAT.
