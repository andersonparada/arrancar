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
- **H3c** (`92a08f0`, `0431b0c`): reportes Flujo de efectivo (método directo, control
  de cuadre) y Movimientos por concepto.
- **H5a** (`7f24d18`, `14de3ca`): esquema propio `empresas` (el migrador aplica los
  esenciales antes que los demás); `empresas.datos_fiscales` y
  `empresas.cargas_iniciales` con cerrar y reabrir (motivo y auditoría), órdenes del
  mediador `empresas.obtener_carga_inicial` y `empresas.obtener_datos_de_empresa`, y
  secciones en el formulario de Empresas. **Revisar:** el agente creó la bandera
  `soloAccesoTotal` para `reabrir`, que parece duplicar `soloSuperacceso`; unificarlas.
- Pruebas: servidor 851, cliente 231, generador 46.
- Investigaciones cerradas:
  - `docs/modulos/seguridad-de-archivos.md` (agente de seguridad).
  - `docs/modulos/validacion-h7-h11-retenciones.md` (contador).
  - `docs/modulos/concepto-de-notas-y-cheques.md` (contador, para H3b).

## Siguiente

Todas las preguntas están respondidas (ver «Respuestas del usuario (2026-09-29)» en
`docs/modulos/plan-hallazgos-contables.md`). En orden:

1. Unificar `soloAccesoTotal` con `soloSuperacceso` (ver arriba).
2. **H5b/H5c** con los accesos en el esquema de cada módulo
   (`empresas.accesos_a_localidades`): rediseñar `politicaPorAlcance` para leer la
   tabla del módulo (pedirle el diseño al `arquitecto-de-datos`), excepción de ESLint
   del módulo base, tipos de localidad, localidades (se asignan al creador) y
   departamentos, y la ventana de asignación de accesos.
3. **Ajustes de conceptos**: columnas `modulo_de_origen` y `documento_de_origen_id`
   (P6), `causa_de_anulacion` y dejar de usar `cheque_caduco` (P1), conceptos
   sugeridos nuevos y «Cheque rechazado» en «Cobros a clientes» (P8), «Pago a
   proveedores» bloqueado con Cuentas por pagar activo (P3), sugerencias en la bandeja
   «Sin clasificar» (P7).
4. **H6b** anulación en lote de cheques caducos (inverso con el concepto heredado).
5. **H8** interés bruto e ISR retenido en las notas de intereses.
6. **Archivos** (imágenes con HEIC de iPhone, PDF con qpdf, límites por archivo y por
   minuto, sin cuota) y luego **H2** (estado de cuenta junto a la conciliación, sha256).
7. Corregir los planes de Libro de compras, Cuentas por pagar y la «Revisión
   contable» de `docs/HOJA-DE-RUTA.md` con la validación del contador y las respuestas
   (retenciones al registrar, casilla «Se muestra en reportes SAT», comisiones exentas,
   IVA fuera de plazo configurable, liga por contraseña) y programar **Libro de
   compras** (H10, H11, H7) y **Cuentas por pagar**.
8. Probar en el navegador lo de Bancos (B6, B7, H3, H6, H9) y rehacer la conciliación
   demo; ninguna pantalla nueva se ha visto aún en el navegador.

## Preguntas abiertas para el usuario

Respondidas el 2026-09-29: ver «Respuestas del usuario (2026-09-29)» al final de
`docs/modulos/plan-hallazgos-contables.md`. No quedan preguntas abiertas.

Pendiente de investigar (sin decisión del usuario): el mínimo de Q2,500.01 de la
retención del 5 % (AG 5-2013) y si sharp decodifica HEIC.
