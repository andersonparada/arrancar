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
- Pruebas: servidor 572, cliente 130, generador 46.
- Investigaciones cerradas:
  - `docs/modulos/seguridad-de-archivos.md` (agente de seguridad).
  - `docs/modulos/validacion-h7-h11-retenciones.md` (contador).

## Siguiente

1. **Seguridad A1 (prioridad alta):** un `.xlsx` de 405 KB sube 1.27 GB de RAM al
   importar (bomba zip). Pre-validar el zip antes de exceljs, límite 5 MB y límite de
   tasa. No necesita decisión.
2. **H4** número de cuenta bancaria normalizado para la unicidad.
3. **H9a/H9b**, **H3a–c**, **H8**, archivos PDF, **H2**, **H6**, **H5** (esquema
   `empresas`, falta el diseño del arquitecto de datos), y H10/H11/H7 dentro de Libro
   de compras.
4. Corregir los planes de Libro de compras, Cuentas por pagar y la «Revisión
   contable» de `docs/HOJA-DE-RUTA.md` con la validación del contador (H7 exento, las
   retenciones se fijan al registrar la factura) cuando el usuario responda.
5. Probar en el navegador lo del B6 y el B7 y rehacer la conciliación demo.

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
