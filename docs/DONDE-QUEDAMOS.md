# Dónde quedamos

Última sesión: **2026-11-19**. Este archivo se reescribe al final de cada paso.

Se está implementando `docs/modulos/plan-hallazgos-contables.md` en el orden de su
sección «Dependencias y orden de implementación» (código con agentes Sonnet;
decisiones e investigación con Opus).

## Estado para retomar (se actualiza en cada unión a `main`)

Actualizado: **2026-11-19** (madrugada). El coordinador (Opus) está en **/loop**. Si otra sesión o cuenta retoma, empiece aquí.

**Cómo se trabaja:**
- **Agentes:** cada paso lo programa Sonnet (`programador-backend`/`-frontend`) en su worktree, con revisión adversarial de Opus
  (o de `seguridad`). Luego Sonnet corrige lo alto y lo medio. Los agentes corren `npm run revisar` y solo las pruebas de lo
  que tocan.
- **Integración:** el coordinador une en `.claude/worktrees/integracion` (rama `integracion`, `git reset --hard main` y
  `git merge --no-ff` de cada rama). Los conflictos de código los resuelve a mano; los de `docs/PLAN.md`, conservando las dos
  entradas. Después corre `npm run revisar` y `BD_PRUEBAS=arrancar_pruebas_int npm run probar`, que tarda unos 10 min y debe
  dar **0 skipped**. Al final: `git merge --ff-only integracion` en main, `bd:migrar` y `git push origin main`.
- **Commits** sin Co-Authored-By.
- **Clientes:** el usuario **no tiene clientes todavía** (2026-11-19). No se frena nada esperando datos reales; lo que solo un
  cliente puede confirmar se revisa con el primero que lo use.

**`main`:** `c5eae433` (subido, 2026-11-19 a media mañana). Suite completa en verde: servidor 8224, cliente 2282, generador 46.

**En `main` desde el 2026-11-18:**
- **Bancos:**
  - BS-2 a BS-9, BS-R1 y BS-R2, con la QA BS-8 corregida.
  - Impresión de cheques IC-1 a IC-10. Falta IC-11, QA con papel real.
  - AP-0: posfechados sin ligar.
- **Cuentas por pagar:** CP4 y CP5 completos.
- **Correo:** completo.
- **Núcleo:**
  - RLS de escritura y de lectura de empresas (R-1 a R-5).
  - Registro de eventos CT-0a (core 0036), primer paso de Contabilidad.
  - **Ojo:** las pruebas que siembran `core.empresas` o `core.empresa_usuarios` usan `bdPropietario`.
- **Multimoneda:**
  - MM-1 a MM-5 y la Adenda B, con las correcciones de su QA: la carga corre fuera de la solicitud y el ingreso manual no acepta fechas
    futuras.
  - La carga automática sigue **apagada**. Antes de encenderla falta MM-3d: C-5 y `curl` desde producción.
- **Terceros:** VC-0a, clientes para ventas (0010); es el primer paso de Cuentas por cobrar y Ventas.
- **Empresas:** PA-0a, inmuebles (0014); es el primer paso de Parcelas.
- **Activos fijos:**
  - Servidor AF-1 a AF-8: mejoras en 0007; traslados con boleta, sin migración.
  - Cliente AF-1c, AF-2c, AF-3c, AFI-2c, AF-5c y AF-6c.
  - Correcciones de su QA.
- **Inventarios:** INV-0 a INV-5 (recepciones en 0005, y la orden `cambiar_marca_de_inventario` del libro).
- **Caja chica:** CC-1 a CC-10, con servidor, pantallas y reportes. Falta CC-11 (QA).
- **Cuentas por liquidar:** CL-1 a CL-6, con la QA CL-7 hecha. Le quedan **dos medios sin corregir**:
  - un rol sin `terceros.ver` no puede elegir beneficiario y no se le explica por qué;
  - CL-R1 suma con signo un anticipo gastado de más.
- **Diseños validados con las respuestas del usuario:** Cuentas por cobrar y Ventas, Contabilidad, Bancos aprobaciones y tarjeta, y
  Parcelas.

**Decisiones del usuario del 2026-11-19:**
- **Adenda B de Multimoneda:** aceptada completa. Promedio del cruce como política contable, sin cargar si compra y venta
  difieren más de 3 %. Convención por moneda fijada por migración. Euro = código 24. Dirección `banguat.gob.gt` sin www. Se
  agrega PLN. Sin consulta a la SAT.
- **Recomendaciones aceptadas en todos los puntos:** Cuentas por cobrar y Ventas (VC-P1 a VC-P24), Contabilidad (CT-P1 a
  CT-P18), Bancos aprobaciones y tarjeta (§16) y Parcelas (PA-1 a PA-19).

**En curso (2026-11-23):** workflow `arrancar-tanda-9` (run `wf_3c37cfe1-206`, reanudable con `resumeFromRunId`), desde la rama
`base-tanda9` (`f3792328`). Son 11 cadenas; cada paso lleva revisión de Opus, corrección y segunda revisión si hubo altos o medios:
- Correcciones de la QA CL-7 → CC-11 (QA, puertos 3311 y 5311).
- AFI-3 → resto de AFI-4 → AF-9 → AFI-5.
- Cliente AF-7c y AF-8c.
- INV-6 → INV-7 → INV-8.
- Cliente INV-2c, INV-4c e INV-5c.
- VC-0b (bancos 0039) → cliente de VC-0a.
- VC-0c1 (libro 0040) → VC-0c2 y VC-0c.
- VC-0d → LV-1 → LV-2 → LV-1c y LV-2c.
- CT-0e y CT-0f → CT-1 → CT-2 → CT-1c y CT-2c.
- AP-1 → AP-2 → AP-3.
- PA-0b y PA-0bc (empresas 0015) → PA-1 → PA-1c.

Al terminar: unir la **última rama de cada cadena** en `integracion`, revisar migraciones, correr la suite y pasar a `main`.

**Ventas/Caja (aprobado el 2026-11-23, `docs/modulos/diseno-ventas-y-caja.md`):** no hay módulo Caseta. Ventas/Caja usa **formas de venta**:
con FEL es formal; sin FEL es de control e informal; una empresa puede tener ambas. Lleva recibos de pago, crédito, turnos, recetas y
producción (módulo `produccion`). VJ-P1 a VJ-P17 aceptadas con la opción recomendada. **Workflow `arrancar-ventas-caja-1`:** VCJ-0a →
VCJ-0d → VCJ-1 → VCJ-1c → VCJ-2 → VCJ-2c, desde `base-vcj`. VCJ-0b espera a INV-8 unido.

**Siguientes pasos al retomar** (todo diseñado y aprobado):
- **Cuentas por liquidar:** corregir los dos medios de la QA CL-7.
- **Caja chica:** CC-11 (QA).
- **Activos fijos:** AF-7c y AF-8c, AFI-3 a AFI-5, AF-9 y siguientes.
- **Inventarios:** INV-5c (pantalla «Por recibir»), INV-6 (traslados) y siguientes; costos adicionales.
- **Cuentas por cobrar y Ventas:** VC-0b, VC-0c1 y VC-0d en paralelo; luego LV-1 → LV-2 → LV-3 → LV-5 y CXC-1 en adelante.
- **Contabilidad:** CT-0e, CT-0f y la cadena CT-1 → CT-2 → CT-3. CT-1p espera la plantilla de cuentas del contador.
- **Bancos aprobaciones y tarjeta:** AP-1 a AP-3 y AB-1 a AB-6.
- **Parcelas:** PA-0b y siguientes. AF-P23 necesita una migración nueva de Activos fijos.
- **Multimoneda:** MM-3d (operación).
- **Bancos:** IC-11 (QA de impresión con papel real).

**Pendientes anotados:**
- **CC-4:** un comprobante con una reposición anulada ya no se puede devolver a la bandeja ni eliminar en el libro; da error
  propio. Revisar si conviene permitirlo conservando el historial.
- **AF-3:** `descartes_de_lineas` se borra en cascada con su línea, a diferencia de §5.5 del diseño.
- **Impresión de cheques:** que CP devuelva `chequeId` en el pago y el retiro.
- **Del usuario, fuera de la app:** frase FEL 9-22 con la SAT; probar el visor de PDF en Firefox y Safari.

Si la sesión se corta, busque la rama `worktree-agent-*` más reciente con commits fuera de `main` para cada paso.

### Cuentas por pagar (≈ 85 %)

| Parte | Diseño (en `docs/modulos/`) | Hecho | Falta |
|---|---|---|---|
| U8 saldos iniciales | `diseno-u8-…` | todo, con QA | — |
| CP2 notas de crédito | `diseno-cp2-…` | todo, con QA | — |
| CP3 contraseñas | `diseno-cp3-…` | todo, con QA | — |
| U8-l facturas del sistema anterior | `diseno-u8l-…` | todo, con QA y correcciones | — |
| CP4 pagos | `diseno-cp4-pagos.md` + adenda `diseno-cp4-pagos-en-efectivo.md` | servidor: B1, B2a, B2b, EB, V1, 1 a 8, E1 a E3; cliente de Bancos B3a | CP4-9 a CP4-11 (**pantallas de pagos**), CP4-E4 y E5 (recibos y pantallas de efectivo), CP4-B3b (Bancos, conciliación), CP4-12 (QA) |
| CP5 reportes | `diseno-cp5-reportes.md` | CP5-1 a CP5-4, CP5-6 a CP5-8, CP5-10 | CP5-5 (efectivo y transitoria, servidor), CP5-9 (pantallas de pagos y control), CP5-11 (QA) |

Pendientes menores anotados: enlaces de R1/R2 al estado de cuenta (CP5-8); el origen de un movimiento de Bancos como
enlace al pago (llega con CP4-10; la ficha del pago ya existe en el servidor con CP4-8); unificar `EncabezadoDeImpresion` y `TotalesDelReporte` (copias en `core` y en
Cuentas por pagar, CP5-10); que el servidor devuelva el aviso de fecha de inicio (EM-1).

### Bancos

- **H2: terminado** (pasos 1 a 7). QA en `informe-qa-h2-2026-11-18.md`: sin errores que bloqueen, 8 observaciones
  menores (monto negativo en «Difiere en», formato del mensaje de diferencia, texto para `.pdf` que no es PDF, tuteo en
  `demasiadas_subidas`, cuadro cortado a 380 px, alineación de «Ver»; y dos de peso: impresión en modo oscuro y huella
  inestable). Falta probar a mano el visor en Firefox y Safari reales y con un PDF real de banco.
- **Bancos, segunda parte:** diseño aprobado (`diseno-bancos-segunda-parte.md`, dictamen
  `dictamen-bancos-segunda-parte-2026-11-16.md`). **BS-1 hecho** (datos, migración `0034`, con un puente en
  `RepositorioMovimientosDrizzle.agregar` que crea la cabecera `saldo_global` hasta que BS-2 lo reemplace); siguen BS-2 a BS-9, BS-R1,
  BS-R2 y EM-2 (orden en §14). Diseños cortos pendientes: CP-AP (cheque de apertura anulado; incluye N-2, ligar el
  posfechado de apertura a su factura, con el contador), aprobaciones, impresión de cheques.

### Siguiente (cuando el usuario diga)

1. CP4-9 a CP4-11, pantallas de pagos (el servidor ya está completo para la lista, la ficha y el comprobante).
2. BS-2 (casos de uso de saldos iniciales por partidas; quita el puente de BS-1).
3. CP4-E4 y E5, CP5-5 y CP5-9; luego QA CP4-12 y CP5-11.

### Esperan al usuario

- Frase FEL 9-22 (ver «Pendiente del usuario»).
- Probar a mano el visor de PDF de H2 en Firefox y Safari reales (también en el celular).
- Respuestas de los diseños nuevos (Multimoneda, Caja chica, aviso por correo, plazo de crédito, EM-2, impresión de cheques)
  cuando lleguen.
- Decididos el 2026-11-18 (ver bitácora de `PLAN.md`): Caddy, `nombreOriginal`, huella, impresión en claro, bandeja de DTE
  (errores 4, 5 y 6 de la QA del 2026-11-08) y `git push` (lo hace el coordinador).

### Avisos técnicos

- **Dependencias y worktrees:** los worktrees están dentro del repositorio y Node resuelve los paquetes que les falten desde
  el `node_modules` del checkout principal (el de integración incluso lo enlaza), así que las pruebas **no detectan** un
  `package-lock.json` roto. Toda rama que cambie `package.json` o el lock se prueba también en un **clon limpio fuera del
  repositorio** con `npm ci`, `npm ci --omit=dev -w servidor` (como el Dockerfile) y el servidor arrancado.

- **Migraciones y fechas (todos los módulos):** el migrador de Drizzle solo aplica las migraciones con `when` mayor que el de
  la última aplicada y no compara hashes. Al unir dos ramas que agregan migraciones al mismo módulo, la de fecha anterior se
  saltaría sin aviso (también en producción). El coordinador revisa el `when` de cada migración unida y lo corrige antes de
  pasar a `main`.

- qpdf 12.4.2 está en `~/.local/opt/qpdf/bin/qpdf` y el `.env` de la raíz lo indica en `RUTA_QPDF`; los worktrees no
  tienen `.env` (git lo ignora), así que buscan `/usr/bin/qpdf`. Arreglo: `sudo ln -sf ~/.local/opt/qpdf/bin/qpdf
  /usr/bin/qpdf` (lo corre el usuario) o copiar el `.env` al worktree.

- Si `localhost:5433` da `ECONNRESET`: puentes de Docker huérfanos (`sudo ip link delete br-…` o `wsl --shutdown`).
- La prueba de rendimiento de Cuentas por pagar necesita `analyze` de todas las tablas que siembra.
- Hay muchos worktrees viejos en `.claude/worktrees/` ya unidos a `main`; se pueden borrar los que no tengan cambios ni
  commits fuera de `main`.

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
  cheques de las empresas y cuentas bancarias a las que tiene acceso). El rol ya no se
  asigna por empresa (`empresa_usuarios.rol_id` se eliminó en `core 0018`).

- **Permisos directos a usuarios:** P1–P4 y L1 **hechos** (diseño en
  `docs/modulos/diseno-permisos-por-usuario.md`): varios roles por usuario en la
  cuenta más permisos directos (solo suman), la empresa solo decide dónde entra,
  permiso `usuarios.asignar-permisos`, auditoría, ventana de usuarios con empresas y
  roles, y página «Permisos de <usuario>» con el origen de cada permiso. Pruebas:
  servidor 948, cliente 252, generador 46. Sin probar en el navegador. Faltan
  los pasos 5 a 11 de H5b (localidades con `permisoAsignar` y la ventana).
- **No hay nada en producción** (dicho por el usuario el 2026-09-29): las migraciones
  de datos no necesitan cuidar casos reales, solo no romper la base de desarrollo.

Forma de trabajo: cada avance va en commit a la rama; a `main` solo entra lo terminado
y probado (pruebas del servidor, ESLint y `tsc` en verde).

## Cierre de la sesión (2026-09-29, noche)

Todo lo terminado y probado está en `main`: servidor 1108, cliente 275 y generador 46
pruebas, sin errores de ESLint ni de tipos.

- **P7 servidor hecho** (`8a81b6d`): sugerencias de concepto por votos ponderados
  (diseño en `docs/modulos/diseno-sugerencias-de-concepto.md`), aceptar en lote,
  sugerir al capturar y reclasificar cheques (`bancos.cheques.reclasificar`).
- **QA en el navegador hecho** (`8d35f98`): informe en
  `docs/modulos/informe-qa-2026-09-29.md`; los dos errores altos de la ventana de
  accesos quedaron corregidos.
- **Retomados y terminados** (a pedido del usuario): **arreglo de la conciliación** (la
  primera conciliación de una cuenta ya no cuenta dos veces el saldo inicial: el saldo
  inicial del banco es 0 y el «Saldo inicial» es un documento más que se marca) y monto
  que no cabe en `numeric(14,2)` responde 400; **pantallas de P7** (bandeja con %, «por
  qué», «Usar» y aceptar en lote con casilla; sugerencia al capturar notas y cheques;
  «Reclasificar» en el reporte de Movimientos). Pruebas: servidor 1110, cliente 300,
  generador 46. Las pantallas de P7 no se han visto en el navegador.

## Avance (2026-09-29, tarde-noche, agentes en paralelo)

- **Errores medios y bajos de QA** (`4f3dfb1`): nombres únicos sin mayúsculas ni acentos
  (`core.nombre_normalizado` en roles, localidades, tipos, departamentos, bancos, cuentas,
  conceptos y categorías), inversos de transferencia fuera de «Notas», número de la
  transferencia en el reporte, mensajes de validación claros, limitador en español,
  **contraseña actual al cambiar la propia**. Sin cambiar (falta decisión): la primera
  conciliación en cualquier mes (B5 lo permite a propósito) y las fechas futuras.
- **Archivos X1 y F1** (`b720266`, `f035cac`): fórmulas de Excel sin valor o con error
  se informan por celda; fotos por su formato real (JPEG, PNG, WebP), HEIC rechazado con
  ayuda, 100 MP, 30 subidas por minuto.
- **H6b y H8** (`b826aba`, `a3c17d6`, migraciones de bancos renumeradas a `0028` y
  `0029`): anular en lote cheques caducos (`bancos.cheques-caducos.anular`, todo o nada,
  nota inversa a fecha común, causa `caducidad`); notas de intereses con interés bruto e
  ISR retenido (ISR propuesto al 10 %, `bancos.intereses.tasa_isr`) y reporte «Intereses
  y retenciones» con Excel.
- **Planes nuevos:** `docs/modulos/plan-archivos-y-h2.md` (con respuestas del usuario) y
  `docs/modulos/diseno-datos-libro-de-compras.md` (preguntas en su §16).
- Pruebas: servidor 1178, cliente 313, generador 46. Cada agente que programa usa su
  propia copia (worktree) y su base de pruebas (`BD_PRUEBAS`).

## Cierre del 2026-09-29 (consolidado sin correr pruebas, a pedido del usuario)

En `main`, además de lo anterior:
- **H6b y H8** (anular en lote cheques caducos; intereses con ISR retenido y su reporte).
- **Aviso de fecha futura** en notas, transferencias y saldos iniciales, y «Cheque
  posfechado» en cheques (`b5f3c6f`).
- **Archivos F2 y F3** (`a59fd50`, `90ee390`, migración core `0021`): `core.archivos`
  con documentos y dueño, `/archivos/:id` solo imágenes sin dueño, foto de Clientes
  verificada, PDF inspeccionado con qpdf (`InspectorQpdf`, `DocumentosProtegidos`,
  `prlimit`), qpdf en el `Dockerfile` y `RUTA_QPDF`. El agente lo probó en su copia
  (servidor 1246, cliente 313, generador 46); tras unirlo a `main` no se volvió a correr.
- Decisiones del contador y del usuario sobre retenciones en
  `docs/modulos/validacion-h7-h11-retenciones.md` (casilla SAT desmarcada no calcula
  retenciones, riesgo aceptado; IDP en la base del ISR configurable por empresa).

- **Libro de compras L1 hecho** (`b1bb5f4` … L1-6): servidor (L1-1 a L1-4: unique en
  `terceros.proveedores`, módulo `libro-de-compras`, secciones aportadas a Empresas y
  Proveedores con avisos del mediador, datos fiscales de empresa y proveedor con
  auditoría; migraciones terceros `0007` y libro-de-compras `0000`–`0001`; opción `modulo`
  en `proteger()`) y cliente (L1-5: `SeccionesAportadas` en Empresas y Proveedores,
  `SeccionesEnLaFicha` en el proveedor; L1-6: servicio de lectura, secciones de empresa y
  de proveedor con su ficha, valores por omisión en `datos-fiscales-de-*.ts` con pruebas).
  Pruebas tras la unión: servidor 1286, cliente 343, generador 46. **Sin menú todavía**: L2
  agrega las pantallas del módulo. Pendiente de probar en el navegador.

## Sesión del 2026-11-01

Todo en `main` y en origin (último `24bd85f`): servidor 3292, cliente 820 y generador 46 pruebas.
Ninguna pantalla nueva se ha visto aún en el navegador.

- **Cuentas por pagar CP1-4 a CP1-10:** días de crédito (contar desde la recepción, U14 b), bandeja, lista y
  ficha con acciones calculadas por el servidor, completar y autorizar en lote (máx. 100, todo o nada) con
  separación de funciones (`autorizar-propios`), desautorizar, cambiar vencimiento, anular y eliminar desde
  aquí; pantallas Bandeja, Documentos por pagar y su ficha, y sección en Proveedores.
- **Libro de compras, bandeja de DTE de la SAT (L4-4b, L4-6, L4-7, L4-11, L4-12, U15):** la SAT entrega la
  consulta como **.xls (Excel 97-2003)**: lector propio CFB + BIFF8 en `core/intercambio` (sin dependencias;
  informe en `docs/modulos/evaluacion-lectura-xls.md`), importar a la bandeja (`POST
  /api/libro-de-compras/dte-recibidos/importar`, todo o nada, migración libro-de-compras `0031`), pantalla
  «DTE de la SAT» (pendientes, completar, confirmar con vista previa, descartar, conciliación por mes) y botón
  «Cargar el archivo de la SAT». Montos con `core.regional.decimales_montos` (mínimo 2); fecha sin zona en
  hora de Guatemala.
- **Formularios (L5-2c):** rubro «Compras sin derecho a crédito»; mapa de rubros a casillas de varios a uno y
  de uno a varios; pestaña «Como en el formulario» del SAT-2237 con nombres **sin confirmar**; página «Datos
  para el SAT-2046» con la guía (App FEL preelaborada o Declaraguate). Informe en
  `docs/modulos/investigacion-sat-2237-y-2046.md`: desde sep-2026 el SAT-2237 se genera en la **Agencia
  Virtual**, no en Declaraguate.

## Sesión del 2026-11-01 (noche) al 2026-11-07

Todo en `main` (último `97735a8`), **sin subir a origin**. Pruebas: cliente 839, generador 46; servidor 3373 en la última
corrida completa (antes del QA final; tras él falta correrla: ver «Siguiente» 1).

- **QA en el navegador** de CP1-11, L4-14 y L5-10: `docs/modulos/informe-qa-2026-11-01.md` (1 alto, 4 medios, 10 bajos).
- **Proveedor nuevo desde «DTE de la SAT»** (error 1): diseño en `docs/modulos/diseno-proveedor-nuevo-desde-dte.md`
  (PN-1 a PN-6 hechos). Se crea al confirmar con el tipo de persona y el nombre que el usuario revisa en una tarjeta
  por NIT; la propuesta parte nombres con la regla sacada del **archivo real de la SAT** del usuario (`consulta.xls`,
  fuera del repositorio: formato del RTU de 4 comas, `NOMBRES , APELLIDOS`, por palabras); nombre tal cual (mayúsculas).
- **Errores medios 2 y 3** de Cuentas por pagar: `documento_ya_autorizado`; `GET /api/cuentas-por-pagar/proveedores`.
- **Errores 4 y 5** (validados por el contador, §7 y §8 del diseño): fechas futuras de constancia y de pago rechazadas
  (aviso si el pago es anterior al cierre del mes); el entero guarda `impuesto` (> 0) y `multa`, `intereses`, `mora`
  (migración libro-de-compras `0032`), total calculado; estado y exceso comparan solo el impuesto.
- **QA final con el archivo real**: `docs/modulos/informe-qa-2026-11-01-b.md`. Corregidos: columnas sin monto del
  archivo real (código de establecimiento, NIT del certificador) que bloqueaban confirmar; desborde en celular de la
  bandeja; confirmación escondida tras la ventana al corregir un pago.

## Sesión del 2026-11-08 (sin el usuario, en /loop)

Todo en `main` (último `452d7d6`), **sin subir a origin** (el modo automático no permite `git push`: lo hace el
usuario). Pruebas completas en verde: servidor 3383, cliente 865, generador 46. **Nada de esto se vio en el navegador.**

- Medios del QA final: la vista previa marca `dte_anulado_en_la_sat`; el resumen de «Confirmar» cuenta y suma solo lo
  registrable (NCRE restando, «documentos») y la NCRE muestra «A favor».
- Bajos del cliente: `grid-cols-1` en 74 archivos, burbujas de fecha en español (`utilidades/validacion-nativa.ts`),
  vencimiento como texto sin permiso, encabezado que no parte el título, subtítulo del libro con el mes.
- Bajos del servidor: nombre del grupo de retenciones sin «(5 %)», hoja «Anulados» con hora de Guatemala y causa en
  texto, `anulacion` en la ficha de Cuentas por pagar (y su bloque en el cliente; «anulado por» sale como id),
  número de boleta como se escribió (migración libro-de-compras `0033`), mensaje de archivo vacío neutro,
  `proveedor_nuevo_sin_permiso` con `accion`, categoría «No va en el libro» en la conciliación (RDON), avisos sin repetir.
- «Abrir en el formulario» desde la bandeja de la SAT (formulario precargado con `?desdeDte=`).
- Anular desde Cuentas por pagar devuelve y muestra los avisos de Libro de compras (contrato
  `libro-de-compras.anular_documento` → `{ avisos }`).
- **Unicidad por cuenta** (decisión del usuario, 2026-11-08): la autorización FEL y NIT+tipo+serie+número de los
  documentos vigentes son únicos en la cuenta, ya no en toda la instalación (migración libro-de-compras `0034`; el
  `0033_snapshot` había quedado con la restricción vieja del entero y el `0034_snapshot` ya la trae al día). Dos cuentas
  con empresas del mismo NIT registran el mismo DTE; en la misma cuenta la fila sigue `bloqueado`. Pruebas: servidor
  3385, cliente 865, generador 46.
- «Anulado por» en la ficha de Cuentas por pagar muestra el nombre (`anuladoPorNombre`; «Usuario no disponible» si no
  se puede leer). Pruebas: servidor 3385, cliente 866, generador 46.
- **Aviso de NIT repetido** (decisión del usuario: avisar sin impedir): `POST`/`PUT /api/empresas` devuelven `avisos`
  si otra empresa de la cuenta (activa o inactiva) tiene el mismo NIT; no nombra a la otra; el cliente lo muestra con
  `usarAvisos().info`. Los avisos largos duran más (`core/almacenes/duracion-de-aviso.ts`, hasta 20 s). `Nit.formateado()`
  nuevo en el servidor. Pruebas: servidor 3393, cliente 868, generador 46.

## Siguiente

1. **El usuario:** `git push origin main`.
2. **QA del 2026-11-08 hecha** (Playwright, 380/320 px a 1920, claro y oscuro): todo bien, incluidos el aviso de NIT,
   la unicidad por cuenta, el RTU con 4 comas, dos tandas de 100 y el lote de constancias. Errores 1, 2, 3, 5, 7 y 8
   corregidos en `main` (formulario por contenedor, aviso de DTE anulado al «Abrir en el formulario», pendientes vivos y
   título según tipo, avisos agrupados, NIT con guion, archivo vacío). **Falta:** ver a la vista el formulario de
   registro por contenedor (768–1920 px); el informe quedó sin commit en el worktree `agent-a19777c26d783baf6`
   (el clasificador negó el commit; revisarlo y decidir); decidir el error 4 (dos totales distintos en la barra de
   marcados y en «Confirmar») y el 6 (la selección de la bandeja se limpia al cambiar de página).
4. «Anulado por» en la ficha de Libro de compras (hoy no se muestra; su DTO solo trae el id), si se quiere.
6. **Decisiones del usuario del dictamen del contador** (`docs/modulos/dictamen-pendientes-libro-de-compras-2026-11-08.md`,
   preguntas P-2 a P-8): formulario y boleta SAT-2000 en el entero; aviso de declarar el SAT-2340 en cero; `mora` con
   aviso; hacer ya L4-13 (L4-f); régimen electrónico de pequeño contribuyente como histórico (el SAT-2241 no se
   programa); captura del SAT-2237 de la Agencia Virtual; tope del pequeño contribuyente configurable por año.
   L4-2b quedó cerrado («no va»).
7. **Cuentas por pagar después de CP1:** U8 diseñado (`docs/modulos/diseno-u8-saldos-iniciales-cuentas-por-pagar.md`)
   y validado por el contador (`dictamen-u8-saldos-iniciales-2026-11-08.md`, «correcto con ajustes»: quitar la
   solución provisional de §9.3, U8-l antes de producción, retenciones por practicar). **El usuario respondió el
   2026-11-08** (§11 del diseño): todas las recomendaciones, retenciones por practicar con la opción B, cuadre que
   bloquea con salida auditada cuando exista Contabilidad, solo quetzales. El diseño quedó **aprobado, listo para
   programar** con los cambios del dictamen aplicados: 12 pasos (§10; servidor U8-1 a U8-8, incluido el aviso de Libro
   de compras para facturas anteriores a la fecha de inicio; cliente U8-9 a U8-11, incluido Empresas; QA U8-12).
   Pendiente sin frenar: P-U8-1 (DTE anteriores a la fecha de inicio en la bandeja). U8-l (notas sobre facturas de
   antes del corte) va en Libro de compras después de U8 y antes de producción con una empresa con historia.
   **En curso:** U8-1 (datos), U8-2 (dos orígenes), **Servidor de U8 completo** (U8-1 a U8-8) y U8-9 en `main` con todas las pruebas en verde (servidor 3569, cliente 882, generador 46). U8-10 (ventana de Administración) y U8-11 (Empresas) también en `main`: **U8 programado completo**. QA U8-12 hecha (`docs/modulos/informe-qa-u8-2026-11-12.md`: sin errores de dinero ni de seguridad; pendientes de gravedad baja en corrección). **Decidido el 2026-11-12** (bitácora de PLAN): emisión de un saldo inicial hasta 10 años antes de la fecha de inicio; ensayo del Excel en una sola pasada para todos los recursos; adjuntos de CP2 más adelante; P-U8-1: DTE anteriores a la fecha de inicio marcados y fuera de la conciliación (con U8-l, en diseño). **CP2 en programación:** CP2-1 (datos), CP2-2 (saldo libre y reglas de baja) y CP2-3 (aplicar y quitar a mano), CP2-4 (ajustes) y CP2-5 (pantalla Notas de crédito) en `main` con todas las pruebas en verde (servidor 3755, cliente 939, generador 46); CP2-6 (ventanas) y CP2-7 (QA, `informe-qa-cp2-2026-11-13.md`): **CP2 completo**, con detalles menores de la QA en corrección. CP3-1 a CP3-6 (servidor completo y lista y nueva contraseña) en `main`; CP3-7 (ficha e impresión) en curso, falta CP3-8 (QA). CP4-B1 y CP4-B2a (Bancos) en `main`; CP4-1 (datos de pagos) en curso; CP4-B2b y B3 esperan el cliente de H2b de la otra sesión. U8l-2 y U8l-3 (Cuentas por pagar) en `main`; U8l-4 (Libro) en curso. Pruebas: servidor 4089, cliente 1014, generador 46. **CP4 (pagos) diseñado y aprobado** (`diseno-cp4-pagos.md`, dictamen `dictamen-cp4-2026-11-13.md`); sus pasos de Bancos van después de H2b de la otra sesión. **U8-l** diseñado y aprobado (`diseno-u8l-notas-sobre-facturas-anteriores.md`); P1-1, P1-2 y U8l-1 en `main`; U8l-2 en adelante esperan a CP3-1.
   Después: CP2, CP3, CP4 y CP5. **CP2 y CP3 diseñados** (`diseno-cp2-notas-de-credito.md`,
   `diseno-cp3-contrasenas.md`) y validados por el contador (`dictamen-cp2-cp3-2026-11-08.md`, «correcto con
   ajustes»: quitar la causa «liquidado fuera del sistema», lista de causas con efecto, límites de fecha por
   recepción, regla del cargo con aplicaciones manuales, aviso de bancarización, fecha de las aplicaciones de la
   contraseña, leyenda «recibido para revisión», original y copia, «REIMPRESIÓN»). **El usuario respondió el 2026-11-08:**
   acepta todas las recomendaciones (CP2-a a i, CP3-a a k y las depuradas del dictamen); «liquidado fuera del
   sistema» se quita y el reintegro va en CP4 (que acepta también efectivo); anular o eliminar un cargo con
   aplicaciones manuales se rechaza con el mensaje «quite primero la aplicación de la nota N». Los dos diseños quedaron
   **aprobados, listos para programar** con los cambios del dictamen aplicados: CP2 en 7 pasos (migración `0004`) y
   CP3 en 8 (migración `0006`, desde CP2-2), después de U8. Pendientes sin frenar: P-CP2-1 (¿adjuntos para el acuerdo y el
   ajuste?), P-CP2-2 (tope de «diferencia menor» por omisión Q25) y P-CP3-1 (fecha de una contraseña con saldos
   iniciales).
8. **Bancos H2** (`docs/modulos/diseno-h2-evidencia-de-conciliacion.md`, con las respuestas del usuario y las notas
   de implementación de cada paso al final). **En `main` al 2026-11-14:**
   - Paso 1 (core) y **H2a** (pasos 2 y 3: saldo transcrito, servidor y cliente; migración de bancos `0030`).
   - **Fila de revisión de PDF y limpieza diaria de huérfanos** (core; plan y notas en
     `docs/modulos/plan-h2-cola-de-qpdf-y-huerfanos.md`; migración de core `0023`; variable `DEPURAR_HUERFANOS`).
   - **H2b servidor** (paso 4: archivo del estado de cuenta; migración de bancos `0031`; variable
     `bancos.conciliaciones.exigir_estado_de_cuenta`), con los arreglos de la revisión de seguridad (subidas de un
     solo archivo sin campos de texto en todo el core, bloqueo al eliminar, autorizar y devolver, límite de subidas
     común).
   - Pruebas tras la última unión: servidor 3900, cliente 972, `revisar` limpio. **Nada de H2 se ha visto en el
     navegador.** Las migraciones core `0023` y bancos `0030` y `0031` no están aplicadas a la base de desarrollo:
     `npm run bd:migrar -w servidor`.
   **Sigue (en este orden):**
   1. **Paso 5, cliente de H2b: hecho** (2026-11-16): `EstadoDeCuentaAdjunto`, `VisorDeEstadoDeCuenta`,
      `ColumnaDelEstadoDeCuenta`, `usar-estado-de-cuenta`, dos columnas en `ConciliarCuenta`, ícono en la lista y el
      motivo «falta el archivo» en `faltaParaTerminar`. Sin ver aún en el navegador (paso 7).
   2. **Paso 6, documentación: hecho** (2026-11-18): `bancos.md` (sección H2), `plan-hallazgos-contables.md` y `plan-archivos-y-h2.md`.
   3. **Paso 7, QA en el navegador: hecho** (2026-11-18, `docs/modulos/informe-qa-h2-2026-11-18.md`): sin errores que bloqueen,
      8 observaciones menores; PDF visible en el `iframe` en Chromium con la CSP global. **Falta a mano** probar el visor en
      Firefox y Safari reales (Playwright no trae visor de PDF en Firefox y WebKit no arranca aquí) y con un PDF real de banco.
   **Decisiones pendientes del usuario** (ninguna frena nada): tope de tamaño de solicitud en Caddy (~20 MB para toda la
   instalación); si algún navegador no muestra el PDF dentro de la página, CSP propia de esa respuesta o solo «Abrir en otra
   pestaña»; el nombre original del archivo se conserva 60 meses en la auditoría (seguridad recomienda conservarlo); qué «huella»
   mostrar (hoy la del PDF normalizado por qpdf, que cambia en cada subida; la de lo recibido no se ve); si hace falta el botón de
   desmarcar para Cuentas por pagar dentro de la conciliación (hoy solo servidor); impresión en modo oscuro de toda la app
   (`@media print`).
9. **Con el módulo de Ventas (futuro):** cálculo del SAT-2046 y aviso del límite anual (ya no Q150,000: 125 salarios mínimos no agrícolas, Q500,285 en 2026).

Forma de trabajo que funcionó: cada agente en su propio worktree (`.claude/worktrees/<nombre>`) con su base de pruebas
(`BD_PRUEBAS`) y el `.env` copiado (para `RUTA_QPDF`); se une a `main` con las pruebas completas en verde. Si
`localhost:5433` da `ECONNRESET`, son puentes de Docker huérfanos (borrarlos en esta WSL o `wsl --shutdown`).

## Pendiente del usuario (fuera de la app)

- **P-U8l-1, frase FEL 9-22:** bajar del portal FEL de la SAT (con sesión) las «Reglas y Validaciones» vigentes y el
  catálogo de frases y escenarios, o preguntar a la mesa de ayuda de la SAT el texto y el efecto del escenario 22 en
  las NCRE emitidas desde el tercer mes siguiente al de la factura. El portal técnico respondió 403 a los agentes.

## Preguntas abiertas para el usuario

Ninguna que bloquee. Todas las del 2026-09-29 están respondidas y registradas en los
planes de cada módulo, `diseno-accesos-por-modulo.md`, `diseno-permisos-por-usuario.md`
y `validacion-h7-h11-retenciones.md`. Queda anotado un riesgo aceptado por el usuario:
la retención del 5 % se fija al registrar la factura, aunque el momento legal de
practicarla sea el pago o el acreditamiento (art. 48 de la Ley del IVA).
