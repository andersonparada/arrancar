# Dónde quedamos

Última sesión: **2026-09-29**. Este archivo se reescribe al final de cada paso.

Se está implementando `docs/modulos/plan-hallazgos-contables.md` en el orden de su
sección «Dependencias y orden de implementación» (código con agentes Sonnet;
decisiones e investigación con Opus).

## Hecho (en `main`)

- Bancos B6 y B7, selector con buscador, superacceso, configuración solo del
  superacceso y L0 Mediator (detalle en `docs/modulos/bancos.md` y
  `docs/ARQUITECTURA.md` §4.8).
- **H1a** (`4935dce`): la auditoría nunca se depura antes de 60 meses (piso en
  `core.depurar_auditoria`); `core.auditoria.meses_de_conservacion` en 60
  (`min 60`, `max 240`); la llave de la auditoría a la cuenta pasó de `cascade` a
  `restrict`. **Efecto:** hoy no se puede borrar una cuenta con auditoría hasta que
  exista el proceso de baja de un cliente, que borrará la auditoría explícitamente.
- **H1b** (`8216c36`): corregir una nota o el saldo inicial de Bancos deja rastro
  (`corregir`, con el estado anterior).
- **H1c** (`943d9fc`): respaldo mensual conservado 60 meses (`MESES_RETENCION_MENSUAL`)
  y guía para copiarlo fuera del servidor en `docs/PLAN.md`.
- **A1** (`1cb46c3`, `1c8299c`): importar Excel valida el zip antes de exceljs (tope
  50 MB descomprimido, 5 MB por archivo, sin macros) y limita a 10 solicitudes por
  minuto por usuario (5 importaciones con su ensayo).
- **H4** (`edd157d`): número de cuenta único por empresa, banco y número normalizado.
- **H9a/H9b** (`fbe62d9`, `6356d78`, solo servidor): `core.correlativos` sin huecos
  por rollback, reinicio anual configurable por empresa
  (`core.correlativos.reinicio_anual`, apagado); número en notas, inversos y
  transferencias; datos existentes numerados; `GET /api/bancos/correlativos` con los
  huecos explicados por la auditoría. **Cuidado:** el journal de migraciones de
  bancos tiene `when` hasta 1790700200000 (2026-09-29 16:43 UTC); una migración nueva
  de bancos debe llevar un `when` mayor o el migrador la salta.
- **H9 cliente** (`0426398`): número en Notas, Transferencias y Movimientos; reporte
  de Correlativos (imprimir y exportar).
- **H3a** (`38ac358`, `77c478b`): catálogo `bancos.conceptos` editable, semilla con 5
  de sistema y 11 sugeridos, Excel, pantalla en Administración de Bancos.
- **H6a** (`a7f217d`, `6b1deb1`): reporte de cheques caducos (7 meses configurable).
- **Fecha de hoy en la hora de Guatemala** (`c8f2a59`): puerto `Reloj` con
  `core.regional.zona_horaria`.
- **H3b** (`9abdbdb`, `f04b9c7`): concepto obligatorio en notas y cheques, migración
  determinista (lo demás a «Sin clasificar»), inversos heredan, reclasificar en lote
  con auditoría, bandeja `/bancos/sin-clasificar`. Pendiente por P1, P6 y P8:
  `cheque_caduco`, columnas de origen, `causa_de_anulacion` y conceptos nuevos.
- Pruebas: servidor 769, cliente 206, generador 46.
- Investigaciones cerradas:
  - `docs/modulos/seguridad-de-archivos.md` (agente de seguridad).
  - `docs/modulos/validacion-h7-h11-retenciones.md` (contador).
  - `docs/modulos/concepto-de-notas-y-cheques.md` (contador, para H3b).

## Siguiente

1. **H3c** reportes Flujo de efectivo y Movimientos por concepto (en curso).
2. **H6b** anulación en lote (el concepto del inverso depende de P1), **H8**, archivos PDF, **H2**, **H6**, **H5** (esquema
   `empresas`, falta el diseño del arquitecto de datos), y H10/H11/H7 dentro de Libro
   de compras.
3. Corregir los planes de Libro de compras, Cuentas por pagar y la «Revisión
   contable» de `docs/HOJA-DE-RUTA.md` con la validación del contador (H7 exento, las
   retenciones se fijan al registrar la factura) cuando el usuario responda.
4. Probar en el navegador lo del B6 y el B7 y rehacer la conciliación demo.

## Preguntas abiertas para el usuario

**Contables (validación de H7, H11 y retenciones):**
1. ¿Los bancos le emiten FEL por comisiones o chequeras (ver «DTE recibidos» en la
   SAT)? ¿Con IVA o exentas?
2. ¿Qué cargos debitados en las cuentas sí traen factura (seguros, servicios,
   arrendamiento)?
3. ¿Ligar varias facturas por nota y varias notas por factura, con monto aplicado?
4. IVA fuera de plazo: ¿a gasto deducible o no deducible? (recomendado: configurable).
5. ¿Las retenciones se fijan al registrar la factura (ISR con la fecha de la factura) y
   no al autorizar?
6. El mínimo de Q2,500.01 para la retención del 5 % a pequeños contribuyentes no está
   en el art. 48 de la Ley del IVA: confirmar en el AG 5-2013.

**Seguridad de archivos** (detalle en `seguridad-de-archivos.md`):
7. ¿Solo JPEG, PNG y WebP (sin AVIF ni GIF; HEIC rechazado)?
8. ¿Límite de 50 o 100 megapíxeles?
9. PDF con contenido activo: ¿rechazar (recomendado) o sanear? ¿Se permiten enlaces?
10. PDF con contraseña: ¿rechazar pidiendo «imprimir a PDF» o pedir la contraseña?
11. ¿El estado de cuenta se ve junto a la conciliación o se descarga? ¿Solo desde la
    conciliación, con el permiso y el alcance de Bancos?
12. ¿ClamAV descartado por ahora?
13. ¿Cuota por cuenta y tamaños máximos?
14. Importar Excel: ¿rechazar celdas con fórmula o tomar el valor calculado?
15. ¿Guardar el `sha256` del estado de cuenta como evidencia?

**Otras:**
16. H8 (intereses que paga el banco con ISR retenido): se sigue platicando.
17. Estado «declarado» del Libro de compras: se recomendó opcional por empresa y
    apagado por omisión.
18. Contraseña de pago: ¿puede incluir facturas registradas aún sin autorizar?
19. Cheques posfechados: ¿se permiten y desde cuándo cuentan en el saldo?
20. Patrón común de reversión (`Reversible`): se discute antes de programarlo.

**Concepto de notas y cheques** (detalle en `concepto-de-notas-y-cheques.md`):
21. P1 Cheque caduco: ¿el inverso hereda el concepto y la caducidad es una causa del
    cheque (recomendado) o se conserva el concepto `cheque_caduco`?
22. P2 ¿Cuentas por pagar clasifica como inversión los pagos de activos? ¿De dónde sale
    el dato?
23. P3 ¿Un cheque manual puede usar «Pago a proveedores»? (recomendado: solo sin
    Cuentas por pagar activo).
24. P4 Préstamos a empleados: ¿inversión u operación si es anticipo de sueldo?
25. P5 Dividendos y retiros: ¿uno o dos conceptos, siempre financiamiento?
26. P6 Columnas de módulo y documento de origen: ¿en H3b o en Cuentas por pagar?
27. P7 ¿Sugerencias de concepto en la bandeja «Sin clasificar», con confirmación?
28. P8 ¿Se agregan los conceptos sugeridos nuevos a la semilla?
