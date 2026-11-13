# Diseño H2: evidencia del estado de cuenta en la conciliación

_Agente `arquitecto-de-datos`, 2026-11-08. Plan listo para programar. Reemplaza los pasos H2a,
H2b y H2c de `plan-archivos-y-h2.md` §2 (los F1–F3 ya están hechos) y concreta la sección «H2
Evidencia de la conciliación» de `plan-hallazgos-contables.md`._

## 0. Lo ya decidido (no se vuelve a preguntar)

| Tema | Decisión | Fuente |
|---|---|---|
| Saldo transcrito | Siempre obligatorio para terminar. Solo se **compara**: el saldo calculado sale de lo que el usuario marca. | `plan-hallazgos-contables.md`, decisiones 2026-09-28 |
| Saldo que no coincide | Se puede ir guardando, pero **no se puede terminar** (enviar a autorización) mientras difiera. Se autoriza solo si coincide. | `plan-archivos-y-h2.md`, respuesta 4 |
| Archivo | PDF o foto (JPEG, PNG, WebP; HEIC rechazado). **Obligatorio por omisión**, cada empresa puede apagarlo. | respuesta 1; `seguridad-de-archivos.md` |
| Visor | **Al lado** de la conciliación, con «Abrir en otra pestaña»; sin pdf.js. | respuesta 2 |
| Eliminar la conciliación | El archivo **se borra**; la auditoría conserva el DTO con su `sha256`. | respuesta 3 |
| Acceso | Solo por la ruta del módulo dueño, con permiso de Bancos; `GET /archivos/:id` no lo sirve (F2). | respuestas del 2026-09-29 |
| Huella | Se guarda el `sha256` del estado de cuenta (ya lo hace `core.archivos`). | idem |
| Permisos | Los mismos: `conciliar` transcribe y sube; `autorizar` compara; `ver` lo ve. | plan H2 |
| Revisión de PDF | qpdf (F3), 10 MB por PDF, 15 MB por foto, 300 páginas, 30 subidas por minuto por usuario. | F3 |

## 1. Lo que hay hoy (revisado en el código y en la base de desarrollo)

- `bancos.conciliaciones` no tiene saldo transcrito ni archivo. En desarrollo hay 2 conciliaciones,
  ambas `autorizada`.
- `core.archivos` ya admite documentos (`clase`, `sha256`, `sha256_recibido`, `paginas`,
  `recurso_dueno`); `GET /archivos/:id` solo sirve imágenes sin dueño. RLS por empresa, sin
  `...autoria` (solo `subido_por`, `creado_en`): las filas solo se insertan y se borran.
- El puerto `DocumentosProtegidos` (`core/compartido/aplicacion/documentos-protegidos.ts`) ya existe
  y lo usa Libro de compras (`EmitirLibroFoliado`, `AbrirEmisionDelLibro`, dueño
  `libro-de-compras.emisiones-del-libro`, con llave foránea `emisiones_del_libro.archivo_id`). Es el
  precedente a copiar.
- `ConciliarCuenta.vue` tiene 98 líneas (tope de páginas: 120); `dominio/conciliacion.ts` 185 y
  `dominio/errores.ts` 254: lo nuevo va en archivos aparte.

### Hallazgos en el código que afectan el diseño

| # | Gravedad | Hallazgo | Corrección (paso) |
|---|---|---|---|
| D1 | **Media** | `GestorDeDocumentos.guardar` corre qpdf (hasta 15 s, semáforo de 1) **dentro** de la unidad de trabajo del módulo. El grupo de conexiones tiene `max: 10`: diez subidas a la vez dejan diez transacciones abiertas esperando turno de qpdf y la app entera se queda sin conexiones. | Paso 1: revisar el contenido **fuera** de la transacción (`revisar`) y guardar ya revisado dentro (`guardarRevisado`). |
| D2 | Media | `guardar` escribe el archivo en disco y luego inserta la fila; si la transacción **se deshace después** (un error posterior del caso de uso o el `commit`), el archivo queda huérfano en disco. | Paso 1: tarea «si se deshace» que lo borra. |
| D3 | Media | `eliminar` borra el archivo del disco **de inmediato**; si la transacción se deshace después, la fila vuelve pero el archivo ya no existe (evidencia perdida). | Paso 1: borrar del disco con `despuesDeConfirmar`. |
| D4 | Baja | `leerImagenDeSolicitud` no revisa `parte.file.truncated` y su error dice «Adjunte una imagen». | Paso 1: `leerDocumentoDeSolicitud` propio. |
| D5 | Info | `ClienteHttp.subir` solo hace `POST`. | La ruta de subida es `POST` (no `PUT`). |
| D6 | Info | `GestorDeDocumentos` vive en `aplicacion/` y `despuesDeConfirmar` en infraestructura. | Paso 1: puerto `TareasDeLaTransaccion` inyectado. |

D1–D3 también corrigen la emisión del libro de Libro de compras, que usa el mismo `guardar`.

## 2. Datos

### 2.1 `bancos.conciliaciones` (columnas nuevas)

| Columna | Tipo | Nulo | Por omisión | Paso | Nota |
|---|---|---|---|---|---|
| `saldo_estado_de_cuenta` | `numeric(14,2)` | sí | — | 2 | Lo transcribe quien elabora. Puede ser negativo (sobregiro). En el código, centavos. |
| `previa_al_saldo_transcrito` | `boolean` | no | `false` | 2 | Solo la migración la pone en `true` (ver §2.3, pregunta P1). |
| `estado_de_cuenta_archivo_id` | `uuid` → `core.archivos(id)` | sí | — | 4 | PDF o foto. Lo pone siempre el servidor (nunca llega del cliente). |

Restricciones:

```sql
-- Paso 2
check conciliaciones_saldo_al_terminar
  (previa_al_saldo_transcrito or estado = 'en_proceso' or saldo_estado_de_cuenta is not null)
check conciliaciones_saldo_coincide_al_autorizar
  (previa_al_saldo_transcrito or estado <> 'autorizada'
   or saldo_estado_de_cuenta = foto_saldo_calculado_estado_de_cuenta)
check conciliaciones_previa_no_en_proceso
  (not previa_al_saldo_transcrito or estado <> 'en_proceso')

-- Paso 4
unique conciliaciones_estado_de_cuenta_unico (estado_de_cuenta_archivo_id)   -- también sirve de índice de la llave
foreign key (estado_de_cuenta_archivo_id) references core.archivos(id)       -- sin on delete: NO ACTION
```

- **Llave sin `on delete restrict`, con `NO ACTION`** (lo de drizzle por omisión, igual que
  `emisiones_del_libro.archivo_id`): ambas tablas cuelgan de `core.empresas` con `cascade`; con
  `restrict` la revisión es inmediata y el borrado de una empresa (o la baja de una cuenta) podría
  fallar según el orden de las cascadas; `NO ACTION` revisa al final de la sentencia. Para el
  código el efecto es el mismo: no se puede borrar el archivo mientras la conciliación lo apunte.
- La regla de que el archivo sea de la misma empresa no necesita llave compuesta: el id sale del
  `guardarRevisado` de la misma transacción, con RLS de la empresa.
- Ni índice nuevo para el saldo (no se busca por él) ni para `previa_…`.
- Sin `check` del archivo obligatorio: depende de una configuración (vive en el dominio).

RLS: ninguna tabla nueva. `bancos.conciliaciones` y `core.archivos` ya tienen `politicaPorEmpresa()`;
la lectura del archivo se hace dentro de la unidad de trabajo de Bancos, así que una conciliación o
un archivo de otra empresa dan 404. Bancos no declara `recursosConAlcance`; cuando exista el
alcance por cuenta bancaria, el estado de cuenta lo hereda porque solo se llega a él por la
conciliación.

### 2.2 Tablas.ts

`conciliaciones.tablas.ts` importa `archivos` de `core/archivos/infraestructura/persistencia/archivos.tablas.js`
(permitido: hacia `core`, desde infraestructura; la prueba de dependencias lo acepta, igual que
`folios-del-libro.tablas.ts`). Actualizar el comentario de la tabla: «el usuario no escribe ningún
saldo» pasa a «el usuario no escribe ningún saldo **que entre al cálculo**; transcribe el del
estado de cuenta solo para compararlo».

### 2.3 Datos existentes

Las conciliaciones `elaborada` o `autorizada` de antes del cambio no tienen saldo transcrito y **no
se rellenan con el calculado** (sería inventar la evidencia).

- La migración del paso 2 marca `previa_al_saldo_transcrito = true` en las que no están `en_proceso`.
- Una `autorizada` previa se queda así para siempre; la pantalla dice «Autorizada antes de que se
  pidiera el saldo del estado de cuenta».
- Una `elaborada` previa **no se puede autorizar** (`FaltaElSaldoDelEstadoDeCuenta`, con el texto
  «Devuélvala para que quien la elaboró transcriba el saldo»). Al devolverla, el dominio pone
  `previa_… = false` y sigue el flujo nuevo.
- Antes de desplegar, contar en producción las `elaborada` (`select count(*) … where estado =
  'elaborada'`) para avisar a esas empresas.

## 3. Migraciones (orden)

| Orden | Módulo | Archivo (`bd:generar`) | Contenido |
|---|---|---|---|
| — | core | ninguna | El paso 1 no cambia tablas. |
| 1 | bancos | `0030_h2_saldo_del_estado_de_cuenta.sql` (generada) | Dos columnas, tres `check`; al final, a mano antes de aplicarla en ningún lado: `UPDATE bancos.conciliaciones SET previa_al_saldo_transcrito = true WHERE estado <> 'en_proceso';` **antes** de los `ADD CONSTRAINT` (reordenar los bloques del archivo generado). |
| 2 | bancos | `0031_h2_archivo_del_estado_de_cuenta.sql` (generada) | Columna, `unique`, llave foránea. |

`npm run bd:generar -w servidor -- bancos h2_saldo_del_estado_de_cuenta` y luego
`… bancos h2_archivo_del_estado_de_cuenta`. Revisar el número siguiente al programar (hoy la última
es `0029_h8_interes_bruto_e_isr_retenido`). Sin permisos nuevos, así que sin `INSERT` en
`core.rol_permisos` ni `core.usuario_permisos`.

## 4. Configuración

En `servidor/src/modulos/bancos/modulo.ts`:

```ts
definirConfiguracion({
  clave: 'bancos.conciliaciones.exigir_estado_de_cuenta',
  descripcion: 'Pide adjuntar el estado de cuenta (PDF o foto) para terminar una conciliación.',
  esquema: z.boolean(),
  predeterminado: true,
  niveles: ['instalacion', 'empresa'],
  publica: true,
}),
```

Puerto `PoliticaDeEstadoDeCuenta { exigeEstadoDeCuenta(operador): Promise<boolean> }` en
`aplicacion/puertos/`, implementado en `infraestructura/politica-de-estado-de-cuenta.configuracion.ts`
(copiar `politica-de-vencimiento-de-cheques.configuracion.ts`). Se evalúa **solo al terminar** (P3).
El cliente la lee con `sesion.config('bancos.conciliaciones.exigir_estado_de_cuenta', true)`.

## 5. Dominio

Archivo nuevo `dominio/estado-de-cuenta.ts` (para no pasar de 200 líneas en `conciliacion.ts`):

- `SaldoTranscrito` (objeto de valor sobre centavos): `desde(texto)`, `coincideCon(calculado)`,
  `diferenciaCon(calculado)` (calculado − transcrito).
- `exigirEvidenciaParaTerminar({ saldo, calculado, tieneArchivo, exigeArchivo })` y
  `exigirSaldoQueCoincide(saldo, calculado)`: lanzan los errores de §7.

`Conciliacion` gana en sus propiedades `saldoEstadoDeCuenta: string | null`,
`previaAlSaldoTranscrito: boolean` y `estadoDeCuentaArchivoId: string | null`, y:

| Método | Regla |
|---|---|
| `transcribirSaldo(saldo \| null)` | Solo `en_proceso` (`ConciliacionNoEstaEnProceso`). `null` lo borra. |
| `elaborar(usuarioId, evidencia)` | Además de lo de hoy: exige saldo; exige que coincida con el **calculado vivo** (`saldoQueDebeMostrarElEstadoDeCuenta`); exige archivo si la configuración lo pide. |
| `autorizar(quien, foto)` | Además: exige saldo (si es previa y no tiene, `FaltaElSaldo…` con texto de devolver) y que coincida con `foto.saldoCalculadoEstadoDeCuenta`. |
| `devolver()` | Además: `previaAlSaldoTranscrito = false`. Conserva saldo y archivo, editables. |
| `adjuntarEstadoDeCuenta(archivoId)` / `quitarEstadoDeCuenta()` | Solo `en_proceso`; devuelven el id anterior (o `null`) para que el caso de uso lo borre. |

El saldo **nunca** entra a `calcularConciliacion`.

## 6. Casos de uso y puertos

### Paso 1 (core)

`DocumentosProtegidos` gana (se conserva `guardar` = `revisar` + `guardarRevisado`, que usa el libro):

```ts
/** Revisa el contenido sin tocar la base ni el disco: llamar FUERA de la unidad de trabajo. */
revisar(contenido: Buffer, nombre: string | null): Promise<DocumentoRevisado>;
/** Escribe en disco y registra la fila; si la transacción se deshace, borra el archivo. */
guardarRevisado(operador: Operador, documento: DocumentoRevisado, opciones: OpcionesDeDocumento): Promise<DocumentoGuardado>;
```

`DocumentoRevisado` es opaco para el módulo (contenido, tipo, extensión, páginas, medidas,
`sha256Recibido`). Puerto `TareasDeLaTransaccion { despuesDeConfirmar(t), siSeDeshace(t) }` en
`core/compartido/aplicacion`; implementación junto a `UnidadDeTrabajoPostgres` (lista `alDeshacer`
que corre en el `catch` de la transacción más externa y vuelve a lanzar el error). `eliminar` borra
la fila ya y el disco con `despuesDeConfirmar`. `DocumentoAbierto` gana `sha256` y `creadoEn`
(para el DTO).

### Paso 2 y 4 (Bancos)

`DependenciasDeConciliaciones` gana `documentos: DocumentosProtegidos` y
`politicaDeEstadoDeCuenta`. Constante `RECURSO_DE_ESTADOS_DE_CUENTA = 'bancos.conciliaciones'`.
`RepositorioConciliaciones` gana `bloquear(id)` (`select … for update`) para que dos subidas a la
misma conciliación no se pisen.

| Caso de uso | Paso | Transacción |
|---|---|---|
| `TranscribirSaldo` | 2 | Una: buscar, `transcribirSaldo`, guardar, DTO. |
| `TerminarConciliacion` (cambia) | 2 y 4 | Una: obtiene el DTO (calculado vivo) y la configuración, `elaborar(…)`. |
| `AutorizarConciliacion` (cambia) | 2 | Igual que hoy; el dominio compara con la foto. |
| `SubirEstadoDeCuenta` | 4 | **Tres tiempos**: (a) unidad corta que exige `en_proceso` (falla rápido, sin gastar qpdf); (b) `documentos.revisar` fuera de transacción; (c) unidad que `bloquear`, vuelve a exigir `en_proceso`, `guardarRevisado`, `adjuntar…`, y si había uno, `documentos.eliminar(anterior)` y auditoría `quitar`. |
| `QuitarEstadoDeCuenta` | 4 | Una: `bloquear`, `quitar…`, `documentos.eliminar`, auditoría `quitar`. |
| `AbrirEstadoDeCuenta` | 4 | Una: buscar la conciliación (404 si no hay o no tiene archivo), `documentos.abrir(id, RECURSO…)`. |
| `EliminarConciliacion` (cambia) | 4 | Tras `repositorio.eliminar`, `documentos.eliminar(archivoId)` (primero la conciliación por la llave). El `anterior` ya incluye `estadoDeCuenta` con su `sha256`. |

## 7. Errores

En `dominio/errores-de-estado-de-cuenta.ts` (Bancos) y `core/compartido/http/leer-documento.ts`:

| Clase | Familia (HTTP) | `codigo` | Mensaje / detalles |
|---|---|---|---|
| `FaltaElSaldoDelEstadoDeCuenta` | `DatoInvalido` (400) | `falta_el_saldo_del_estado_de_cuenta` | «Escriba el saldo final que muestra el estado de cuenta del banco.» Al autorizar una previa: «… Devuélvala para que quien la elaboró lo transcriba.» |
| `SaldoDelEstadoDeCuentaNoCoincide` | `ReglaDeNegocioInfringida` (422) | `saldo_del_estado_de_cuenta_no_coincide` | «El saldo del estado de cuenta (Q…) no coincide con el calculado (Q…); revise las marcas o registre la nota que falte.» `detalles: { transcrito, calculado, diferencia }` |
| `FaltaElEstadoDeCuenta` | `DatoInvalido` (400) | `falta_el_estado_de_cuenta` | «Adjunte el estado de cuenta (PDF o foto) para terminar.» |
| `ConciliacionSinEstadoDeCuenta` | `RecursoNoEncontrado` (404) | (el de la familia) | `GET` o `DELETE` sin archivo. |
| `FaltaElDocumento` (core) | `DatoInvalido` (400) | `falta_el_documento` | «Adjunte el PDF o la foto.» |
| Ya existen | | `conciliacion_no_esta_en_proceso` (422), `documento_no_aceptado`, `documento_demasiado_grande` (413), `pdf_con_contrasena`, `pdf_danado`, `pdf_con_demasiadas_paginas`, `pdf_con_contenido_activo`, `pdf_no_se_pudo_revisar`, `foto_heic_no_aceptada`, `imagen_demasiado_grande`, `imagen_ilegible`, `demasiadas_subidas` (429) | |

Nota: los números 400/409 de `plan-archivos-y-h2.md` se reemplazan por los de la familia
(`estado-http-de-error.ts`).

## 8. API

Todas bajo `proteger({ permiso })`; sin Excel (operación).

| Método y ruta | Permiso | Cuerpo | Respuesta |
|---|---|---|---|
| `PUT /bancos/conciliaciones/:id/saldo-del-estado-de-cuenta` | `bancos.conciliaciones.conciliar` | `{ saldoEstadoDeCuenta: decimalOpcional(2) }` | 200 `ConciliacionDto` |
| `POST /bancos/conciliaciones/:id/estado-de-cuenta` | `conciliar` + `limitarSubidas(app)` | `multipart/form-data`, campo `archivo`, 1 archivo, tope de lectura 15 MB | 200 `ConciliacionDto` (reemplaza el anterior) |
| `DELETE /bancos/conciliaciones/:id/estado-de-cuenta` | `conciliar` | — | 200 `ConciliacionDto` |
| `GET /bancos/conciliaciones/:id/estado-de-cuenta` | `bancos.conciliaciones.ver` | — | 200 contenido |
| `POST …/:id/terminar`, `…/autorizar`, `…/eliminar` | sin cambio | sin cambio | nuevas reglas |

Cabeceras del `GET`: `Content-Type` de la base (`application/pdf` o `image/webp`),
`Content-Disposition: inline; filename="estado-de-cuenta-AAAA-MM.pdf"` (o `.webp`, nombre armado
por el servidor, ASCII), `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff` (ya
global). Copiar `enviarPdf` de `libro.controlador.ts`.

`ConciliacionDto` gana:

```ts
saldoEstadoDeCuenta: string | null;
/** calculado − transcrito; null sin saldo. Para autorizadas, contra la foto. */
diferenciaConElEstadoDeCuenta: string | null;
previaAlSaldoTranscrito: boolean;
estadoDeCuenta: {
  tipoMime: string; tamanoBytes: number; paginas: number | null; sha256: string;
  nombreOriginal: string | null; subidoEn: string; subidoPorNombre: string | null;
} | null;   // nunca la ruta en disco ni el id del archivo
```

`ConsultasConciliacionesDrizzle.obtener` une `core.archivos` (y `core.usuarios` para el nombre)
por `estado_de_cuenta_archivo_id`. `ConciliacionResumenDto` gana `tieneEstadoDeCuenta: boolean`
(para un ícono en la lista; opcional, P5).

## 9. Auditoría

| Acción | `accion` | `recurso` / `registroId` | `anterior` |
|---|---|---|---|
| Reemplazar o quitar el estado de cuenta | `quitar` | `bancos.conciliaciones` / id de la conciliación | `{ estadoDeCuenta }` tal como estaba (con `sha256`) |
| Devolver, eliminar | ya existen | idem | el DTO, que ahora trae saldo y `estadoDeCuenta` |
| Cambiar el saldo transcrito en proceso | ninguna (P2) | | |

## 10. Cliente

Servicio `conciliaciones.api.ts`: tipos nuevos del DTO y `transcribirSaldo(id, saldo)`
(`reemplazar`), `subirEstadoDeCuenta(id, archivo)` (`subir`), `quitarEstadoDeCuenta(id)`
(`eliminar`) y `direccionDelEstadoDeCuenta(id)` (texto de la URL, para el `iframe` y la pestaña).

| Pieza | Qué hace |
|---|---|
| `composables/conciliaciones/comparacion-de-saldo.ts` + `.prueba.ts` | Pura: compara en centavos el saldo escrito con el calculado; dice `sin_saldo`, `coincide` o `difiere` y la diferencia; y `faltaParaTerminar(conciliacion, exigeArchivo)` → lista de motivos. |
| `componentes/conciliaciones/SaldoTranscrito.vue` | Campo de monto (solo editable en proceso y con `conciliar`), marca «Coincide» (verde) o «Difiere en Q…» (rojo) en vivo; guarda al salir del campo o con «Guardar». Previa: texto fijo. |
| `componentes/conciliaciones/EstadoDeCuentaAdjunto.vue` | Elegir, reemplazar y quitar (con `usarAvisos().confirmar`); muestra nombre, páginas, tamaño, quién y cuándo, y los primeros 12 caracteres del `sha256`. `accept="application/pdf,image/jpeg,image/png,image/webp"` (sin `image/heic`), constantes en `core/utilidades/archivos.ts`. Errores del servidor con su mensaje. |
| `componentes/conciliaciones/VisorDeEstadoDeCuenta.vue` | PDF en `<iframe>` (nunca `<object>`/`<embed>`, sin `sandbox`, que rompe el visor de Chrome); foto en `<img>`; enlace «Abrir en otra pestaña» (`target="_blank" rel="noopener"`). `print:hidden`. |
| `componentes/conciliaciones/AccionesDeConciliacion.vue` | Saca de la página los botones Terminar / Devolver / Autorizar (la página pasaría de 120 líneas). Terminar deshabilitado con la lista de lo que falta debajo. |
| `composables/conciliaciones/usar-estado-de-cuenta.ts` | Llama a la API y reemplaza la conciliación cargada. |
| `ConciliarCuenta.vue` | `lg:grid-cols-2`: el documento a la izquierda, saldo, archivo y visor a la derecha; en el celular, debajo. Al imprimir: el saldo transcrito, «Coincide», y los datos del archivo (tipo, páginas, huella). |

El `iframe` apunta a `/api/bancos/conciliaciones/:id/estado-de-cuenta`: la empresa activa va en la
sesión (cookie), así que no hace falta `blob:` ni cambiar la CSP (`default-src 'self'` cubre
`frame-src`).

## 11. Pasos (un commit cada uno, con sus pruebas)

1. **Core · servidor (D1–D4)**: `revisar` / `guardarRevisado` en `DocumentosProtegidos` y
   `GestorDeDocumentos`; puerto `TareasDeLaTransaccion` con `siSeDeshace` en la unidad de trabajo;
   `eliminar` borra el disco tras confirmar; `leerDocumentoDeSolicitud` (`truncated`, 413,
   `FaltaElDocumento`); `DocumentoAbierto` con `sha256` y `creadoEn`. Pruebas: el archivo se borra
   si la transacción se deshace después de guardar; no se borra del disco si la transacción de
   `eliminar` se deshace; `revisar` no abre transacción; el libro sigue emitiendo igual.
   **Revisión de `seguridad` antes de unirlo.**
2. **Bancos H2a · servidor**: migración `0030`; dominio (`estado-de-cuenta.ts`, `Conciliacion`);
   errores; `TranscribirSaldo` y su ruta; reglas en terminar y autorizar; DTO; mapeador. Actualizar
   las pruebas de API existentes que terminan o autorizan (ahora transcriben antes). Pruebas:
   terminar sin saldo 400; terminar con saldo distinto 422 (y guardar sí deja); autorizar con la
   foto distinta 422; transcribir en `elaborada` 422; previa elaborada no se autoriza y tras
   devolver sigue el flujo; primera conciliación; `UPDATE` directo que deja una autorizada sin saldo
   falla por el `check`.
3. **Bancos H2a · cliente**: tipos y servicio, `comparacion-de-saldo.ts` con pruebas,
   `SaldoTranscrito`, `AccionesDeConciliacion`, Terminar deshabilitado con motivos.
4. **Bancos H2b · servidor**: migración `0031`; configuración y su política; `SubirEstadoDeCuenta`
   (tres tiempos), `QuitarEstadoDeCuenta`, `AbrirEstadoDeCuenta`; `bloquear`; terminar exige el
   archivo; eliminar lo borra; DTO con `estadoDeCuenta`; auditoría `quitar`. Pruebas: PDF real y
   foto aceptados; otra empresa 404; sin `ver` 403; sin `conciliar` 403; `GET /archivos/:id` con ese
   id 404; subir en `elaborada` 422 (y qpdf no corre: el doble lo cuenta); reemplazar borra el
   anterior y audita; terminar sin archivo con la variable en `true` 400 y en `false` pasa;
   eliminar la conciliación borra fila y disco y el `anterior` trae el `sha256`; cabeceras; 31.ª
   subida del minuto 429; dos subidas a la vez dejan un solo archivo.
   **Revisión de `seguridad` antes de unirlo.**
5. **Bancos H2b · cliente**: `EstadoDeCuentaAdjunto`, `VisorDeEstadoDeCuenta`,
   `usar-estado-de-cuenta`, diseño en dos columnas, impresión, ícono en la lista (si P5).
6. **Docs**: `bancos.md` (sección H2 hecha), `plan-hallazgos-contables.md` paso 12,
   `plan-archivos-y-h2.md` (remitir a este documento), bitácora de `PLAN.md` y `DONDE-QUEDAMOS.md`.
7. **QA (`pruebas-qa`)**: Chrome, Firefox, Safari de iOS y Android: PDF real de banco, foto del
   celular, PDF con JavaScript y con contraseña (mensajes), quien autoriza ve el archivo, imprimir
   sin el visor, el saldo que difiere no deja terminar.

Los pasos 2 y 3 no dependen del 1 y pueden ir antes; el 4 depende del 1 y del 2.

## 12. Para el agente `seguridad`

1. D1: que `revisar` corra fuera de la transacción y que el caso de uso de subida no deje la
   conexión ocupada mientras espera a qpdf; que la unidad corta (a) no se pueda saltar.
2. D2/D3: orden de disco y fila; que no queden archivos huérfanos ni filas sin archivo.
3. Cabeceras del `GET`: la CSP global de helmet (con `object-src 'none'` y `frame-ancestors`
   por omisión) sobre la respuesta del PDF, ¿deja ver el PDF en el visor de Chrome, Firefox y
   Safari dentro del `iframe`? Si no, CSP propia de esa respuesta (`default-src 'none';
   frame-ancestors 'self'`) en vez de la global. `X-Frame-Options: SAMEORIGIN` debe seguir.
4. `iframe` sin `sandbox` (lo exige el visor de PDF): confirmar que alcanza con la revisión de qpdf
   y el mismo origen.
5. `nombreOriginal` se muestra (escapado por Vue) y se trunca a 200; nunca va en
   `Content-Disposition`.
6. Límite de 30 subidas por minuto compartido con las fotos; tope de lectura de 15 MB antes de
   decidir PDF o foto.

## 13. Preguntas para el usuario

**P1. Conciliaciones terminadas antes del cambio.** No tienen el saldo transcrito.
- A (recomendada): columna `previa_al_saldo_transcrito`, marcada por la migración; las reglas de la
  base no las alcanzan, y una elaborada previa se devuelve para transcribir.
- B: la regla de la base como `NOT VALID` (lo que proponía el plan): no revisa las filas viejas
  hoy, pero **cualquier `UPDATE` futuro** sobre ellas (por ejemplo una migración que agregue una
  columna y la rellene) fallará en producción.
- Argumento: A cuesta una columna y deja dicho en la pantalla por qué una autorizada no tiene
  saldo; B es una trampa para el futuro.

**P2. ¿Se audita cada cambio del saldo transcrito mientras está en proceso?**
- Recomendación: **no**. Es un borrador de quien elabora, no entra a ningún cálculo, y lo que
  queda al terminar sí se conserva (devolver y eliminar guardan el `anterior`). Auditar cada tecla
  guardada sería ruido. (Sí se audita quitar o reemplazar el archivo: es un borrado.)

**P3. Si una empresa enciende la variable cuando ya hay conciliaciones elaboradas sin archivo, ¿se
pueden autorizar?**
- Recomendación: **sí**. La variable se revisa solo al terminar; al autorizar se exige el saldo
  que coincide, que es la evidencia mínima. Lo contrario obliga a devolverlas todas.

**P4. Quien autoriza, ¿puede adjuntar el archivo si falta?**
- Recomendación: **no**. Lo adjunta quien elabora (separación de funciones); si falta, devuelve.

**P5. ¿Ícono «con estado de cuenta» en la lista de conciliaciones?**
- Recomendación: sí, es barato (`tieneEstadoDeCuenta` en el resumen).

## Notas de implementación del paso 2 (servidor, 2026-11-13)

- Migración `0030_h2_saldo_del_estado_de_cuenta`: el `UPDATE` de las previas va antes de los `ADD CONSTRAINT`.
- `Conciliacion.elaborar(usuarioId, { saldoCalculado })`: el objeto de evidencia crece en el paso 4 con el archivo.
- `PUT /bancos/conciliaciones/:id/saldo-del-estado-de-cuenta` con `{ saldoEstadoDeCuenta: "1250.50" | null }`; `ConciliacionDto` trae `saldoEstadoDeCuenta`, `diferenciaConElEstadoDeCuenta` y `previaAlSaldoTranscrito`. `tieneEstadoDeCuenta` y `estadoDeCuenta` quedan para el paso 4.
- P1 = A y P2 = no (el saldo en proceso no se audita; devolver y eliminar conservan el `anterior`).
