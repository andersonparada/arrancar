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
  `soloAccesoTotal` para `reabrir` (eliminada después, ver «Permisos por acción»).
- Pruebas: servidor 851, cliente 231, generador 46.
- Investigaciones cerradas:
  - `docs/modulos/seguridad-de-archivos.md` (agente de seguridad).
  - `docs/modulos/validacion-h7-h11-retenciones.md` (contador).
  - `docs/modulos/concepto-de-notas-y-cheques.md` (contador, para H3b).
  - HEIC de iPhone con sharp (`c091a8d`, al final de `seguridad-de-archivos.md`): los
    binarios de sharp **no** decodifican HEVC; se recomienda aceptar solo JPEG, PNG y
    WebP y que iOS entregue JPEG (sin `image/heic` en `accept`). Falta que el usuario
    lo confirme.
  - Mínimo de la retención del 5 % (`e97c5e4`, al final de
    `validacion-h7-h11-retenciones.md`): solo facturas **mayores a Q2,500.00** (art. 49
    del AG 5-2013). Falta leer el texto oficial del Minfin para descartar reformas.
- **Planes corregidos** (`a540ca9`): Libro de compras, Cuentas por pagar y la «Revisión
  contable» de `docs/HOJA-DE-RUTA.md`, con la validación del contador y las respuestas
  del 2026-09-29 (punto 7 de «Siguiente», salvo programar).

## En curso (2026-09-29)

- **Ajustes de conceptos, servidor** (punto 3): **hecho** (`a49021e`): origen en
  movimientos (P6), `causa_de_anulacion` del cheque y sin `cheque_caduco` (P1), 8
  sugeridos nuevos y «Cheque rechazado» en «Cobros a clientes» (P8, P5), «Pago a
  proveedores» solo sin Cuentas por pagar (P3). Migraciones `0021` y `0022` de bancos.
  Pruebas del servidor: 883. **P7** (sugerencias en «Sin clasificar») queda sin hacer:
  falta definir cómo normalizar el beneficiario (propuesta: último concepto activo y
  compatible del mismo beneficiario, sin mayúsculas ni acentos).
- **Ajustes de conceptos, cliente**: **hecho**: causa de anulación en cheques, origen
  en notas y en el reporte de movimientos, «Pago a proveedores» en el cheque manual solo
  sin Cuentas por pagar (con `sesion.moduloActivo`). Pruebas del cliente: 238. El Excel y
  la impresión del reporte aún no llevan el origen.
- **Diseño de H5b/H5c** (punto 2): **hecho** en `docs/modulos/diseno-accesos-por-modulo.md`
  (11 pasos). `core.accesos_datos` está vacía y nada la usa: se elimina sin migrar datos.
- **H5b pasos 1 y 2**: **hechos**. `core/base-datos/alcance.ts` (`AlcanceDeRegistros` y
  las políticas que arma el core con la tabla de accesos de cada módulo), disparador
  `core.asignar_registro_al_creador`, se quitó `core.accesos_datos` (migraciones `0013` y
  `0014` de core), acciones `asignar` y `quitar` en la auditoría, y excepción de ESLint:
  de `empresas` solo se importan `*.tablas.js` y solo desde `infraestructura/`. Pruebas
  del servidor: 896. **Paso 3 hecho** (tipos de localidad, servidor, con el generador): catálogo
  `empresas.tipos_de_localidad` con Excel, eliminar con auditoría, semilla al crear la
  empresa o al abrir el catálogo vacío; migraciones `0003` y `0004` de empresas. Pruebas
  del servidor: 916. El cliente quedó generado sin ajustar (paso 4: botón eliminar y
  nombre a 60). Siguen los pasos 4 a 11 del diseño (tipos de localidad, localidades,
  ventana de accesos y departamentos); los pasos 5, 7 y 8 esperan respuestas del
  usuario.

- **Permisos por acción** (PLAN §3.5): hecho el 2026-09-29. `gestionar` quedó separado en
  `crear`, `editar` y `eliminar` en todos los módulos, el generador y el cliente, con una
  migración por módulo para los roles; `soloAccesoTotal` se eliminó.

- **Llaves entre esquemas** (PLAN §3.2): hecho el 2026-09-29. Excepción de ESLint
  generalizada a los `*.tablas.js` de cualquier módulo (solo desde `infraestructura/`) y
  prueba `core/base-datos/llaves-entre-esquemas.prueba.ts`.

- **Permisos por acción y llaves entre esquemas**: **hecho** (`9f830c2`). Pruebas:
  servidor 918, cliente 240, generador 46.

### Respuestas del usuario (2026-09-29, tarde)

- **HEIC:** llegan como JPEG (sin HEIC en el servidor ni en `accept`).
- **P7:** sugerir con un cálculo estadístico mejor que «el último concepto» (frecuencia
  por beneficiario, ponderada…): **lo diseña el arquitecto** con alternativas.
- **Asignar localidades:** la ventana de asignación muestra todas las localidades solo
  ahí, sin dar acceso a ellas; quien asigna puede asignarse a sí mismo.
- **Permisos directos a usuarios:** además de los del rol, se pueden asignar permisos
  a un usuario; **solo suman**. Un permiso vale para **toda la cuenta** (lo que el
  usuario puede hacer); **qué datos ve** lo decide aparte el acceso a cada empresa y
  el alcance por registro (p. ej. puede abrir la ventana de cheques, pero solo anula
  cheques de las empresas y cuentas bancarias a las que tiene acceso). Hoy el rol se
  asigna **por empresa** (`core.empresa_usuarios.rol_id`), así que esto cambia el
  modelo: **lo diseña el arquitecto** y se confirma con el usuario antes de programar.

- **Permisos directos a usuarios:** P1–P3 **hechos** (diseño en
  `docs/modulos/diseno-permisos-por-usuario.md`): varios roles por usuario en la
  cuenta más permisos directos (solo suman), la empresa solo decide dónde entra,
  permiso `usuarios.asignar-permisos`, auditoría, ventana de usuarios con empresas y
  roles, y página «Permisos de <usuario>» con el origen de cada permiso. Pruebas:
  servidor 948, cliente 252, generador 46. Sin probar en el navegador. Faltan **P4**
  (quitar `empresa_usuarios.rol_id`) y **L1** (alcance «para asignar» de la ventana de
  localidades), y después los pasos 4–11 de H5b.
- **No hay nada en producción** (dicho por el usuario el 2026-09-29): las migraciones
  de datos no necesitan cuidar casos reales, solo no romper la base de desarrollo.

Forma de trabajo: cada avance va en commit a la rama; a `main` solo entra lo terminado
y probado (pruebas del servidor, ESLint y `tsc` en verde).

## Siguiente

Todas las preguntas están respondidas (ver «Respuestas del usuario (2026-09-29)» en
`docs/modulos/plan-hallazgos-contables.md`). En orden:

1. ~~Unificar `soloAccesoTotal` con `soloSuperacceso`~~: hecho al eliminar `soloAccesoTotal`.
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
7. Programar **Libro de compras** (H10, H11, H7) y **Cuentas por pagar** según sus
   planes ya corregidos (`a540ca9`), cuando se respondan sus preguntas abiertas.
8. Probar en el navegador lo de Bancos (B6, B7, H3, H6, H9) y rehacer la conciliación
   demo; ninguna pantalla nueva se ha visto aún en el navegador.

## Preguntas abiertas para el usuario

Las del plan de hallazgos se respondieron el 2026-09-29 (ver «Respuestas del usuario
(2026-09-29)» al final de `docs/modulos/plan-hallazgos-contables.md`). Nuevas:

1. ~~`soloAccesoTotal`~~: resuelto por el principio de permisos (PLAN §3.5): se elimina
   y `reabrir` pasa a ser un permiso asignable.
2. HEIC: ¿se acepta que las fotos del iPhone lleguen como JPEG (sin HEIC en el
   servidor)?
3. Libro de compras y Cuentas por pagar: ver «Preguntas para el usuario» en
   `docs/modulos/libro-de-compras.md` y `docs/modulos/cuentas-por-pagar.md` (casilla SAT
   y NIT/UUID, destino de la FEL exenta del banco, IVA fuera de plazo deducible o no,
   datos fiscales del proveedor por cuenta o empresa, nota de crédito que baja la
   factura del mínimo del 5 %, ligar una nota de débito existente, pagos mixtos
   gasto/activo, documentos en bandeja dentro de la contraseña, dónde van los días de
   crédito).
4. H5b/H5c: ver «Preguntas para el usuario» en `docs/modulos/diseno-accesos-por-modulo.md`
   (asignar solo lo que se ve, qué roles reciben `ver-todas` y `asignar`, desde dónde se
   abre la ventana de accesos, asignar al que importa desde Excel).
