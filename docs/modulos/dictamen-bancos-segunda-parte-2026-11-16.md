# Dictamen: Bancos, segunda parte (contador-guatemala, 2026-11-16)

Sobre `diseno-bancos-segunda-parte.md`. Versión condensada por el coordinador a partir de la respuesta completa del
contador (sin cambiar conclusiones). Marcas: **[Ley]**, **[NIIF]**, **[Práctica]**, **[Opinión]**.

**Fuentes:** el Código de Comercio (Decreto 2-70) no se pudo leer en texto oficial; sus artículos tienen certeza
media-alta por fuentes secundarias concordantes (arts. 410 y 388, media). Cotejar con el Decreto 2-70 oficial antes de
poner los textos en la ayuda. NIIF para las Pymes citada por sección (contenido alto, numeración media).

## C-1 a C-11

| # | Conclusión |
|---|---|
| C-1 | Fórmula correcta (estado de cuenta + depósitos en tránsito − cheques en circulación − débitos en tránsito = libros al corte); las notas del banco no registradas se ajustan en los libros anteriores antes del corte. **Falta la partida `error_del_banco`** (crédito o débito, candidata en la conciliación) |
| C-2 | Corte el día anterior a la fecha de inicio: correcto. Se acepta mitad de mes, pero recomendar día 1 (mejor 1 de enero); aviso en Empresas sin bloquear |
| C-3 | Cheque de apertura anulado: Debe Bancos / Haber Proveedores o «Acreedores varios». La deuda revive (el cheque se recibe salvo buen cobro, C. Com. art. 410). Prescripción: acción del cheque 6 meses (art. 513); deuda de fondo 5 años (CC art. 1508) o 2 años si es precio de mercadería (CC art. 1514); no opera sola (art. 1501) y se interrumpe con reconocimiento (art. 1506). El ingreso por prescripción es gravable en el régimen sobre utilidades. `anulacion_de_apertura` sin flujo: correcto. **Opción C** (bandeja en Cuentas por pagar) de acuerdo |
| C-4 | Depósito en tránsito rechazado: Debe Cuentas por cobrar / Haber Bancos; comisión en nota aparte; pedir el pagador al anular |
| C-5 | Posfechado entregado antes del corte: no es partida de apertura (coherente con C-CP4-1). Huecos: cobrado antes de su fecha (art. 501) debe ser candidato en la conciliación; posfechado de una chequera no registrada necesita forma de registrarse |
| C-6 | Cheques de más de 6 meses (art. 508): trato de caducos, aviso sin bloquear. Corregir el texto «7 meses» fijo: usar la variable y «desde los 6 meses el banco puede negarse» |
| C-7 | Cerrar la carga con diferencias o sin el dato: **confirmación con motivo y auditoría**, no bloqueo |
| C-8 | «Disponible después de posfechados»: correcto; sobregiro autorizado aparte; no compensar saldos negativos con positivos; aclarar fondos retenidos |
| C-9 | Aprobaciones: buena práctica; monto mínimo y aprobador distinto; **no** para notas de débito que solo registran cargos del banco; los pagos de Cuentas por pagar no pasan dos veces si allí quien autoriza no registra el pago |
| C-10 | Tarjeta: pasivo financiero, no es efectivo; revisar Decreto 2-2024 y bancarización. Diferencial cambiario: al cierre a resultados (NIIF 30), el no realizado sin efecto en ISR; tipo de cambio de Banguat |
| C-11 | Monto en letras «… QUETZALES CON 25/100» en mayúsculas con relleno; vale lo escrito en letras (art. 388): pruebas exhaustivas |

## Opinión sobre P-1 a P-15

P-1 sí, opcional, con el saldo **de la cuenta contable** de los libros anteriores. P-2 sí, con aviso si no es día 1.
P-3 sí, más el caso del posfechado. P-4 rechazar. P-5 sí y sí. P-6 sí, con ayuda sobre notas descubiertas después.
P-7 **C**, y A mientras tanto, con beneficiarios que no son proveedores y la advertencia del plazo de la deuda de fondo.
P-8 sí. P-9 sí; sobregiro como pasivo, sin compensar. P-10 aviso y confirmación con motivo. P-11 sí, con la leyenda
«Documento interno, no sustituye el estado de cuenta del banco». P-12 sí. P-13 sí, sin aprobación para notas de cargos
del banco. P-14 sí; anotar «entregado» más adelante. P-15 **sí, recomendado con fuerza** (el auditor pide el último
estado de cuenta y la última conciliación del sistema anterior; conservar 4 años, CT arts. 47 y 112).

## Otros errores

| # | Problema | Corrección | Gravedad |
|---|---|---|---|
| 1 | El total suma cuentas negativas con positivas | Bancos (positivos) y Sobregiros (negativos) aparte (NIIF 2.52) | Media |
| 2 | Se puede cargar como «en circulación» un cheque no entregado | Texto «solo cheques entregados al beneficiario» | Media |
| 3 | Posfechado de chequera no registrada sin forma de emitirlo | Chequera de apertura con fecha posterior al corte, o exigir registrar la chequera (usuario) | Media |
| 4 | Posfechado cobrado antes de su fecha no es candidato | Candidato todo cheque emitido, con aviso | Media |
| 5 | Aviso «7 meses» fijo | Variable y art. 508 (6 meses) | Baja |
| 6 | Sin partida de error del banco | `error_del_banco` | Baja |
| 7 | Depósito en tránsito muy viejo sin aviso (jineteo) | Aviso si tiene más de 30 días al corte | Baja |
| 8 | «Descartar: ya pagada» contra otros ingresos | Contra la cuenta con que se pagó (en CP-AP) | Media (CP-AP) |

## Cambios que el diseño debe recibir

1. Parte `error_del_banco` (cambia el check de la `0034`).
2. Texto «solo cheques entregados».
3. Aviso de antigüedad con la variable y el art. 508.
4. Aviso de depósito en tránsito de más de 30 días.
5. Bancos y Sobregiros separados; «Disponible después de posfechados» con sobregiro autorizado aparte.
6. Posfechado de chequera no registrada y posfechado cobrado antes de su fecha como candidato.
7. Cierre de la carga con diferencias: confirmación con motivo y auditoría (Empresas o su contrato).
8. Aviso en Empresas si la fecha de inicio no es día 1.
9. CP-AP: beneficiarios no proveedores, plazo de la deuda de fondo, «ya pagada» contra la cuenta de pago.
10. Aprobaciones: sin notas de cargos del banco.
11. Monto en letras con relleno y pruebas exhaustivas.
12. Cotejar con el Decreto 2-70 oficial los textos legales antes de la ayuda.

## Veredicto

**Correcto con ajustes.** Aplicar los cambios 1 a 7 antes de BS-1 y BS-2; el 8 en Empresas; 9 a 11 en sus diseños
cortos (CP-AP, aprobaciones, impresión).
