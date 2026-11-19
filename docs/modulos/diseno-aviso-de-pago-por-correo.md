# Diseño: aviso de pago por correo (correo saliente en core y aviso de Cuentas por pagar)

_Agente `arquitecto-de-datos`, 2026-11-18. **Propuesta para decidir con el usuario**: nada de esto está acordado hasta que
responda las preguntas del §12. Concreta «Aviso de pago por correo» de `docs/HOJA-DE-RUTA.md` (pedido del 2026-10-04) y
el punto 11 de `diseno-cp4-pagos.md` («CP7»). Usa la revisión de seguridad `revision-seguridad-correo-2026-11-18.md`
(sus hallazgos se citan como C1–C13)._

## 0. Lo pedido y lo ya decidido

| Tema | Qué hay | Fuente |
|---|---|---|
| Pedido | Al registrar un pago en Cuentas por pagar (y, en el futuro, un cobro en Cuentas por cobrar) mandar el aviso por correo al proveedor | `HOJA-DE-RUTA.md`, 2026-10-04 |
| Por planificar | A qué correos (marca «recibe avisos de pago» en los contactos), copia a la empresa, plantilla, adjuntos (comprobante y constancias), SMTP por instalación (solo superacceso), bitácora y reintentos | idem |
| Comprobante | Existe en CP4-8 como **página de impresión del cliente** (`window.print()`) sobre `ComprobanteDePagoDto` (servidor), con retenciones, constancias del libro y la leyenda «no es documento tributario» | `diseno-cp4-pagos.md` §9 |
| CP4 no cambia datos por esto | «Sale de `pago_registrado` y del comprobante» | `diseno-cp4-pagos.md`, punto 11 |
| Configuración | Solo niveles empresa e instalación; secretos de instalación nunca en `core.configuraciones` (C1) | reglas del proyecto; C1 |
| Correo de usuarios | Opcional, «solo para informes» | `CLAUDE.md` |

Nada de esto toca lo fiscal: el aviso informa un pago que ya existe; no emite documentos ni cambia retenciones. El PDF
conserva la leyenda del comprobante (dictamen CP4). No hace falta dictamen del contador, salvo que el usuario quiera
textos legales en el correo.

## 1. Lo que hay hoy (revisado en el código y en la base de desarrollo, solo lectura)

| # | Gravedad | Hallazgo | Consecuencia en el diseño |
|---|---|---|---|
| E1 | **Alta** | Los eventos se publican **después** de confirmar la transacción (`RegistrarPago.ejecutar`: `unidadDeTrabajo.ejecutar(...)` y luego `publicadorEventos.publicar(eventos)`). Un suscriptor de `pago_registrado` corre fuera de la transacción del pago. | «Encolar vía evento» **no** es atómico con el pago: si el proceso cae entre el `commit` y el encolado, el aviso no se encola (se pierde, nunca se duplica). C3 pide la misma transacción. Ver §2.2 y P1. |
| E2 | **Alta** | `BusEventos.publicar` **espera** a cada suscriptor y no atrapa errores. Hoy no hay ningún suscriptor (salvo pruebas). El primero que lance un error haría responder 500 a una petición cuyo pago **ya se guardó**: el usuario lo reintentaría y pagaría dos veces. | Paso 6: `suscribirSinRomper` en core (atrapa, registra en pino y sigue). Todo suscriptor de negocio lo usa. También protege a Contabilidad cuando llegue. |
| E3 | Media | `pago_registrado` y `pago_anulado` no traen `cuentaId` ni `usuarioId`; la unidad de trabajo los necesita (RLS por cuenta para leer `terceros` y `autoria` de la bandeja). | Agregar `cuentaId` y `usuarioId` a ambos eventos (cambio aditivo del contrato). El suscriptor arma el operador con el mismo resolutor de las guardias (alcances de `bancos.cuentas` incluidos) para leer lo mismo que el comprobante. |
| E4 | Media | El comprobante no existe como PDF en el servidor: es HTML del cliente. | Paso 9: generador pdfkit del comprobante en Cuentas por pagar (precedente: `generador-pdfkit-del-libro.ts`), sobre el mismo `ComprobanteDePagoDto`. |
| E5 | Info | Las «constancias de retención» son datos (`libro_de_compras.retenciones.constancia_numero` y `constancia_fecha`), no archivos. | No hay PDF de constancia que adjuntar: el comprobante ya lista número y fecha de cada constancia. Si algún día se suben los PDF de la SAT, **no** se reenvían (C8: archivos subidos por usuarios). |
| E6 | Media | `Correo` (`core/compartido/dominio/objetos-valor/correo.ts`) acepta `, ; < > " ( ) \` (C6). | `DireccionDeEnvio` estricta solo para enviar; los correos guardados no se cambian: se marcan «no se puede usar para enviar». |
| E7 | Info | `terceros.contactos` (por cuenta) tiene `correo` pero ninguna marca. `terceros.terceros.correo` es uno solo. `core.empresas.correo` existe (copia y `Reply-To`). | Marca nueva en `terceros.contactos` (§3.6). La marca es de la **cuenta**: vale para todas sus empresas. |
| E8 | Info | Base de desarrollo: 13 terceros (1 con correo, válido para la regla estricta), 2 contactos sin correo, 4 empresas (1 con correo), 0 pagos. | Migraciones sin datos que convertir; la columna nueva entra con `default false`. |
| E9 | Info | Terceros no tiene Excel (no hay `*.columnas.ts` en `terceros/http`). | La marca no toca ningún intercambio. |
| E10 | Info | Las tareas periódicas son `setInterval` en `principal.ts`; hay precedentes de `security definer` estrechas con `row_security = off` (`core.rutas_de_archivos_registradas`, `core.depurar_auditoria`). | El trabajador y la depuración siguen ese molde (C4). |
| E11 | Info | El proveedor **no es usuario** de Arrancar. | El «enlace a la app que pide sesión» de la revisión de seguridad no le sirve al proveedor: o va el PDF, o el dato va en el cuerpo (P5). |

## 2. Arquitectura

### 2.1 Reparto

| Dónde | Qué |
|---|---|
| `core/correo` (contexto nuevo) | Servidor SMTP de la instalación (cifrado), bandeja de salida transaccional, destinatarios, intentos, cupos, armado del mensaje (plantilla de texto con marcadores y diseño HTML fijo y escapado), trabajador, depuración, historial de la empresa y panel de Soporte. No sabe nada de pagos. |
| `core/eventos` | `suscribirSinRomper` (E2). |
| `terceros` | Marca `recibe_avisos_de_pago` en los contactos (formulario y API). |
| `cuentas-por-pagar` | Qué es un aviso de pago: destinatarios posibles, textos (configuración), PDF del comprobante, cuándo se encola (manual o automático), cancelación si el pago se anula, permiso. |
| `cuentas-por-cobrar` (futuro) | Lo mismo para cobros, reusando todo `core/correo`. |

Puerto público de core (como `DocumentosProtegidos`), que cualquier módulo puede importar:

```ts
interface BandejaDeSalida {
  /** Encola dentro de la unidad de trabajo en curso; valida, cuenta cupos y arma el mensaje. */
  encolar(mensaje: MensajePorEncolar): Promise<CorreoEncoladoDto>;
  /** Cancela los pendientes de un registro (p. ej. un pago anulado); audita cada uno. */
  cancelarPendientesDe(origen: { recurso: string; registroId: string }, motivo: string): Promise<number>;
  /** Los correos de un registro, para su ficha (sin cuerpo ni detalle técnico). */
  deRegistro(origen: { recurso: string; registroId: string }): Promise<CorreoResumenDto[]>;
}
```

`MensajePorEncolar` lleva `tipo` (`'cuentas-por-pagar.aviso_de_pago'`), `origen`, destinatarios ya resueltos por el
módulo (`{ direccion, nombre, clase: 'para' | 'copia', origen: 'tercero' | 'contacto' | 'empresa', origenId }`), asunto y
mensaje **ya con los marcadores reemplazados por core** (el módulo pasa la plantilla y los valores), y el adjunto como
`{ nombre, contenido: Buffer }` generado por la app. Nunca direcciones escritas por el usuario (P2).

### 2.2 Cuándo se encola (decisión P1)

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| A. Botón en la ficha del pago | «Enviar aviso» abre una ventana con los destinatarios; su propia petición y transacción | Simple; atómico (la petición solo encola); el usuario ve a quién va; sirve para reenviar | Un paso más por pago |
| B. Automático por evento | Suscriptor de `pago_registrado` en Cuentas por pagar, si la empresa lo configura | Lo pedido («vía evento»); cubre las cinco formas de pago sin tocar sus casos de uso (que ya rozan los topes de ESLint) | E1: ventana de pérdida entre `commit` y encolado (milisegundos; se ve en la ficha como «sin aviso» y se manda con A) |
| C. Casilla en el formulario del pago, en la misma transacción | `RegistrarPago` y sus variantes llaman a `BandejaDeSalida` | Atómico de verdad | Toca los cinco casos de uso de registro y sus pruebas; el formulario de pago crece |

**Recomendación: A siempre + B configurable por empresa** (`cuentas-por-pagar.avisos_de_pago.envio` =
`manual` | `automatico`, `manual` por omisión). Argumento: B cumple el «vía evento» sin tocar el registro de pagos, y la
pérdida posible de E1 es visible y se arregla con el botón de A. C sólo vale la pena si el usuario quiere que nunca falte
un aviso automático; se puede agregar después sin migrar datos.

Formas que mandan aviso (P8): `cheque`, `nota_de_debito`, `nota_ligada` y `efectivo`. **No** `cuenta_de_apertura` (es la
carga del sistema anterior). El botón tampoco aparece en pagos anulados.

### 2.3 Flujo del envío

1. Se encola (A o B): Cuentas por pagar resuelve destinatarios, genera el PDF y llama a `encolar` en su unidad de trabajo.
   Core valida cada dirección con `DireccionDeEnvio`, pide cupo (§3.5, con bloqueo por cuenta), guarda el PDF en
   `core.archivos` (`recurso_dueno = 'core.correos_salientes'`, con `siSeDeshace` que borra el archivo si la transacción
   se deshace, como en H2), inserta la fila y sus destinatarios, y con `despuesDeConfirmar` **despierta** al trabajador.
2. El trabajador (cada 30 s y al despertarlo) llama a `core.tomar_correos_pendientes(10, 5)` (§3.5): toma hasta 10 con
   `FOR UPDATE SKIP LOCKED`, los pasa a `enviando` con arriendo de 5 minutos y suma un intento.
3. Por cada uno arma el mensaje nodemailer: `from` fijo de la instalación con nombre visible
   «<Empresa> por medio de <nombre de la aplicación>» (C7), `replyTo` = correo de la empresa si pasa `DireccionDeEnvio`,
   `to`/`cc` como objetos `{ name, address }`, `envelope` explícito, `messageId` de la fila, cabecera
   `Auto-Submitted: auto-generated` (RFC 3834, evita respuestas automáticas en bucle), texto plano y HTML,
   `attachments: [{ filename, content: Buffer, contentType: 'application/pdf' }]`, `disableFileAccess` y
   `disableUrlAccess` (C8). Nunca `raw`.
4. Resultado con `core.resolver_correo(...)`: `enviado` (con los rechazados por destinatario de `info.rejected`),
   `temporal` (4xx, red, tiempo agotado: vuelve a `pendiente` con la espera siguiente) o `permanente` (5xx: `fallido`).
   Error de autenticación o servidor sin configurar: **no gasta intento**; vuelve a `pendiente` en 15 minutos y el panel
   de Soporte muestra «servidor de correo con problemas».
5. Esperas: 1 min, 5 min, 30 min, 2 h, 12 h, 24 h, 24 h, con ±20 % de azar; al 8.º intento fallido queda `fallido`
   (unos tres días). Entrega «al menos una vez»: el `Message-ID` fijo deja reconocer un duplicado tras una caída.
6. SIGTERM: se detiene el temporizador, se espera el lote en curso (máximo 20 s) y se cierra el transporte; lo que quede
   en `enviando` se retoma al vencer el arriendo.

## 3. Datos

Todo en `core` (migraciones de `core/migraciones`), salvo §3.6 (terceros).

### 3.1 `core.servidor_de_correo` (nueva, una sola fila; C1)

No es de una empresa ni de una cuenta: es de la instalación. Sin `empresa_id` ni RLS por empresa; `arrancar_app` la lee
(el trabajador la necesita) y la escribe solo el caso de uso de Soporte (`soloSuperacceso`). La contraseña está cifrada
con una llave que **no** está en la base.

| Columna | Tipo | Nulo | Por omisión | Nota |
|---|---|---|---|---|
| `id` | `boolean` | no | `true` | Llave primaria; `check (id)`: una sola fila |
| `servidor` | `text` | no | — | Nombre de dominio; check `char_length between 1 and 253`; el dominio valida forma, IP privadas y nombres del compose (C12) |
| `puerto` | `integer` | no | `587` | check `puerto in (465, 587)` (25 solo si se responde así en P13) |
| `seguridad` | `text` | no | `'starttls'` | check `in ('tls_directo', 'starttls')`; 465 ⇒ `tls_directo`, 587 ⇒ `starttls` con `requireTLS` (check `(puerto = 465) = (seguridad = 'tls_directo')`) |
| `usuario` | `text` | no | — | 1–254 |
| `contrasena_cifrada` | `bytea` | sí | — | AES-256-GCM: texto cifrado + etiqueta de 16 bytes |
| `iv` | `bytea` | sí | — | 12 bytes aleatorios; check `(contrasena_cifrada is null) = (iv is null)` y `iv is null or octet_length(iv) = 12` |
| `version_de_clave` | `smallint` | sí | — | Para rotar `CLAVE_SECRETOS`; check `(contrasena_cifrada is null) = (version_de_clave is null)` |
| `remitente_direccion` | `text` | no | — | `notificaciones@<dominio de la instalación>` (P13); pasa `DireccionDeEnvio` |
| `remitente_nombre` | `text` | no | — | Saneado, ≤ 80; por omisión, `core.interfaz.nombre_aplicacion` |
| `activo` | `boolean` | no | `false` | Apagado: el trabajador no envía (todo queda `pendiente`) |
| `ultima_prueba_en` | `timestamptz` | sí | — | |
| `ultima_prueba_resultado` | `text` | sí | — | check `in ('enviado', 'temporal', 'permanente', 'autenticacion')` |
| `...marcasDeTiempo`, `...autoria` | | | | `autoria` queda con el usuario de soporte |

- Llave: variable de entorno **`CLAVE_SECRETOS`** (32 bytes en base64), en `configuracion.ts`, opcional; sin ella el
  panel avisa «falta la llave» y no deja guardar la contraseña, y el trabajador no arranca. `CLAVE_SECRETOS_ANTERIOR`
  (opcional) para rotar: al leer con `version_de_clave` vieja se descifra con la anterior y se vuelve a cifrar con la nueva.
  AAD fija `'core.servidor_de_correo.contrasena'`. Va al `.env` de producción y se respalda **aparte** (P14).
- El DTO nunca trae la contraseña: `contrasenaConfigurada: boolean` (C1, C2).
- **Auditoría**: no es de una cuenta, así que no va a `core.auditoria` (su `cuenta_id` es obligatorio). Cada guardado y
  cada prueba van a `core.bitacora_superacceso` (`accion = 'correo.servidor.guardar' | 'correo.servidor.probar'`,
  `detalle` = `{ servidor, puerto, usuario, remitente, activo, contrasenaCambiada }`, sin contraseña). La fila nunca se
  borra: se apaga con `activo = false`.
- Alternativa (C1 la admite): servidor, puerto, usuario y remitente como variables `soloSuperacceso` de instalación y
  solo la contraseña en una tabla. **No la recomiendo**: el conjunto se valida y se prueba junto, y partirlo en dos lugares
  complica el panel y la bitácora.

### 3.2 `core.correos_salientes` (nueva; bandeja y bitácora de envíos; C3, C13)

| Columna | Tipo | Nulo | Por omisión | Nota |
|---|---|---|---|---|
| `id` | `uuid` | no | aleatorio | |
| `cuenta_id` | `uuid` → `core.cuentas` | no | de la transacción | `on delete cascade` (no es auditoría); para cupos |
| `empresa_id` | `uuid` → `core.empresas` | no | de la transacción | `on delete cascade` |
| `tipo` | `text` | no | — | `'<modulo>.<nombre>'`, p. ej. `cuentas-por-pagar.aviso_de_pago`; check `tipo ~ '^[a-z-]+\.[a-z_]+$'` |
| `recurso_origen` | `text` | no | — | `'cuentas-por-pagar.pagos'` |
| `registro_origen_id` | `uuid` | no | — | Sin llave foránea: core no apunta a tablas de módulos (dirección prohibida) |
| `asunto` | `text` | no | — | Ya saneado; check `char_length between 1 and 150` y sin controles (`asunto !~ '[\x00-\x1f\x7f]'`) |
| `cuerpo_texto` | `text` | sí | — | Nulo solo tras depurar; ≤ 20,000 |
| `cuerpo_html` | `text` | sí | — | Idem; lo arma core (diseño fijo, datos escapados) |
| `responder_a` | `text` | sí | — | Correo de la empresa si pasó `DireccionDeEnvio` |
| `nombre_visible` | `text` | no | — | «<Empresa> por medio de <app>», saneado, ≤ 150 |
| `adjunto_archivo_id` | `uuid` → `core.archivos` | sí | — | `NO ACTION` (como H2); `unique` (sirve de índice) |
| `adjunto_nombre` | `text` | sí | — | `comprobante-de-pago-<numero>.pdf`, saneado; check `(adjunto_archivo_id is null) = (adjunto_nombre is null) or contenido_depurado_en is not null` |
| `adjunto_sha256` | `text` | sí | — | Se conserva después de depurar: prueba de qué se mandó |
| `message_id` | `text` | no | — | `<uuid@dominio-de-la-instalacion>`; `unique` |
| `estado` | `text` | no | `'pendiente'` | check `in ('pendiente', 'enviando', 'enviado', 'fallido', 'cancelado')` |
| `intentos` | `smallint` | no | `0` | check `between 0 and 8` |
| `proximo_intento` | `timestamptz` | no | `now()` | |
| `bloqueado_hasta` | `timestamptz` | sí | — | Arriendo; check `(estado = 'enviando') = (bloqueado_hasta is not null)` |
| `enviado_en` | `timestamptz` | sí | — | check `(estado = 'enviado') = (enviado_en is not null)` |
| `ultimo_error_codigo` | `text` | sí | — | `ETIMEDOUT`, `EAUTH`, `550`…; nunca el texto de la respuesta (C2, C11) |
| `cancelado_en`, `cancelado_por`, `motivo_de_cancelacion` | `timestamptz`, `uuid`, `text` | sí | — | check `(estado = 'cancelado') = (cancelado_en is not null)`; motivo 1–300 |
| `contenido_depurado_en` | `timestamptz` | sí | — | check `contenido_depurado_en is not null or (cuerpo_texto is not null and cuerpo_html is not null)` |
| `...marcasDeTiempo`, `...autoria` | | | | `creado_por` = quien encoló (o quien registró el pago, en automático) |

Índices:
- `correos_salientes_por_enviar_idx` `(proximo_intento)` `where estado in ('pendiente', 'enviando')` (trabajador).
- `correos_salientes_origen_idx` `(empresa_id, recurso_origen, registro_origen_id)` (ficha del pago).
- `correos_salientes_cuenta_fecha_idx` `(cuenta_id, creado_en)` (cupos).
- `correos_salientes_empresa_fecha_idx` `(empresa_id, creado_en desc)` (historial).
- `correos_salientes_depurar_idx` `(creado_en)` `where contenido_depurado_en is null` (depuración).

RLS (sin borrado para `arrancar_app`): `select`, `insert` y `update` con `empresa_id = app.empresa_id` (tres políticas;
**sin** política de `delete`). El `update` de la app solo cancela y reintenta (lo cuida el caso de uso); el trabajador y la
depuración usan las funciones de §3.5.

### 3.3 `core.destinatarios_de_correos` (nueva)

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `id` | `uuid` | no | |
| `correo_saliente_id` | `uuid` → `core.correos_salientes` | no | `on delete cascade` |
| `empresa_id`, `cuenta_id` | `uuid` | no | De la transacción; llaves a `core.empresas` y `core.cuentas` (`cascade`) |
| `clase` | `text` | no | check `in ('para', 'copia')` |
| `direccion` | `text` | no | Ya normalizada (dominio en minúsculas y punycode); check `char_length <= 254` |
| `nombre` | `text` | sí | Saneado, ≤ 150 |
| `origen` | `text` | no | check `in ('tercero', 'contacto', 'empresa', 'usuario')` |
| `origen_id` | `uuid` | sí | Sin llave (tablas de módulos) |
| `resultado` | `text` | sí | check `in ('aceptado', 'rechazado')`; lo pone el trabajador |
| `creado_en` | `timestamptz` | no | Para el cupo por destinatario |

`unique (correo_saliente_id, direccion)`; índices `(correo_saliente_id)` (el `unique` sirve) y
`(cuenta_id, direccion, creado_en)` (cupo por destinatario). Máximo 10 por correo (lo cuida el dominio y
`core.reservar_cupo_de_correo`). RLS: `select` e `insert` por empresa; sin `update` ni `delete` para la app (el
`resultado` lo pone `core.resolver_correo`).

### 3.4 `core.intentos_de_correos` (nueva; bitácora técnica)

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `id` | `uuid` | no | |
| `correo_saliente_id` | `uuid` → `core.correos_salientes` | no | `cascade`; índice |
| `empresa_id` | `uuid` | no | |
| `numero` | `smallint` | no | `unique (correo_saliente_id, numero)` |
| `ocurrido_en` | `timestamptz` | no | |
| `resultado` | `text` | no | check `in ('enviado', 'temporal', 'permanente', 'autenticacion', 'sin_servidor')` |
| `codigo` | `text` | sí | Código de red o SMTP (sin texto) |
| `duracion_ms` | `integer` | sí | |

Solo la escribe `core.resolver_correo`. RLS: `select` por empresa. Solo la ve Soporte en detalle; la empresa ve el estado.

### 3.5 Funciones `security definer` (C4, C5; molde de `core.rutas_de_archivos_registradas`)

Todas con `SET search_path = core, pg_temp`, `SET row_security = off`, `REVOKE ALL ... FROM PUBLIC` y
`GRANT EXECUTE ... TO arrancar_app`.

| Función | Qué hace | Límites |
|---|---|---|
| `core.reservar_cupo_de_correo(direcciones text[])` → `(por_hora int, por_dia int, de_la_instalacion_por_hora int, por_destinatario jsonb)` | Toma `pg_advisory_xact_lock(hashtextextended('core.correo:' \|\| cuenta, 0))` con la cuenta de `app.cuenta_id` (**nunca** un parámetro) y cuenta los correos de la cuenta (todas sus empresas) en la última hora y día, el total de la instalación en la última hora y, por cada dirección pedida, cuántos recibió de esa cuenta en 24 h. El caso de uso compara con los topes de configuración y responde 429 si se pasa | Máximo 10 direcciones; sin cuenta en la transacción, error |
| `core.tomar_correos_pendientes(limite int, minutos int)` → filas con lo necesario para enviar (id, empresa, asunto, cuerpos, remitente visible, responder a, message_id, destinatarios en jsonb, ruta del adjunto) | `FOR UPDATE SKIP LOCKED` sobre `pendiente` con `proximo_intento <= now()` y `enviando` con arriendo vencido; los pasa a `enviando`, `bloqueado_hasta = now() + minutos`, `intentos + 1`. No toma nada si `core.servidor_de_correo.activo` es falso | `limite` ≤ 50; `minutos` entre 1 y 30 |
| `core.resolver_correo(id uuid, resultado text, codigo text, rechazados text[], duracion_ms int)` | Inserta el intento; deja `enviado` (con `resultado` por destinatario), `pendiente` con la espera siguiente, o `fallido`; con `autenticacion`/`sin_servidor` devuelve el intento (`intentos - 1`) y espera 15 min | Solo filas en `enviando` |
| `core.depurar_correos(dias int, meses int)` → `(contenido int, filas int)` | Borra cuerpo, HTML y la fila de `core.archivos` del adjunto (el archivo en disco lo quita la depuración de huérfanos) de los correos terminados (`enviado`, `fallido`, `cancelado`) con más de `dias`; borra las filas (con destinatarios e intentos) de más de `meses` | `dias` ≥ 7, `meses` ≥ 60 (igual que la auditoría) |

Hay que confirmar en la migración que el rol dueño de las funciones es el que también es dueño de `core.archivos` (lo es
`arrancar`, como en `rutas_de_archivos_registradas`).

### 3.6 `terceros.contactos` (columna nueva; paso 7)

| Columna | Tipo | Nulo | Por omisión | Nota |
|---|---|---|---|---|
| `recibe_avisos_de_pago` | `boolean` | no | `false` | El contacto recibe los avisos de pagos que la empresa le hace al tercero |

- Check `contactos_aviso_con_correo`: `not recibe_avisos_de_pago or correo is not null`. Si se borra el correo, el dominio
  quita la marca (y lo dice).
- Que el correo pase `DireccionDeEnvio` **no** va en un check (la regla vive en el código y puede ajustarse): el
  formulario no deja marcar un contacto cuyo correo no la pasa y explica por qué.
- Migración: `ADD COLUMN ... DEFAULT false NOT NULL` y el check; ningún dato que convertir (E8).
- Sin índice: se lee por `contactos_tercero_idx`.
- Para cobros (futuro) se agregaría `recibe_avisos_de_cobro` con su propia migración (P4).
- El correo principal del tercero (`terceros.terceros.correo`) **no** lleva marca: entra preseleccionado cuando ningún
  contacto tiene la marca (P3).

### 3.7 Cuentas por pagar: sin tablas nuevas

El vínculo pago ↔ correos está en `core.correos_salientes` (`recurso_origen = 'cuentas-por-pagar.pagos'`,
`registro_origen_id = pagos.id`). La ficha lo lee con `BandejaDeSalida.deRegistro` (RLS por empresa).

## 4. Reglas de dominio

- **`DireccionDeEnvio`** (core, objeto de valor, C6): ASCII imprimible; parte local de `atext` y puntos (sin puntos
  al inicio, al final ni dobles; ≤ 64); dominio de etiquetas `[a-z0-9-]` de 1–63 sin guion en los bordes, TLD de letras
  ≥ 2 (los internacionales se convierten a punycode con `node:url.domainToASCII` antes de validar); total ≤ 254; sin
  CR/LF/NUL ni bidi. Se normaliza el dominio a minúsculas.
- **Saneado** de asunto, nombres visibles y nombre del adjunto: quita U+0000–U+001F, U+007F y los controles bidi
  (U+202A–U+202E, U+2066–U+2069), junta espacios y corta (150; adjunto 80 + `.pdf` forzado).
- **Plantilla** (core, `PlantillaDeCorreo`): texto plano con marcadores `{nombre}`; el módulo declara la lista cerrada de
  marcadores y sus valores; un marcador desconocido es un error de configuración (al guardarla) y nunca se deja literal.
  El texto plano se manda tal cual; el HTML lo arma un diseño fijo de core: cada párrafo escapado, saltos de línea como
  `<br>`, sin enlaces ni imágenes remotas (C9), pie fijo «Este correo lo envió <Empresa> por medio de <app>. Para
  responder, use Responder.» (o «comuníquese con <Empresa>» si no hay `Reply-To`).
- **Topes** (C5): máximo 10 destinatarios; cupos por cuenta, por destinatario y de la instalación (§6); 429 con
  `codigo = 'cupo_de_correos_agotado'` y un mensaje que dice cuándo se libera.
- **Adjunto**: solo PDF generado por la app, ≤ 5 MB (el comprobante de 100 líneas ronda 100 KB); no pasa por qpdf (es
  nuestro), igual que el libro foliado.
- **Cancelar**: solo `pendiente` (no `enviando`); motivo 1–300.
- **Reintentar a mano**: solo `fallido`; vuelve a `pendiente` con `intentos = 0`; cuenta otra vez el cupo.

### 4.1 Aviso de pago (Cuentas por pagar)

- **Destinatarios posibles** (todos ya registrados; P2): contactos del proveedor con correo y el correo principal del
  tercero. Cada uno con `utilizable` y, si no lo es, el motivo («el correo no se puede usar para enviar»).
  **Preseleccionados**: los contactos con `recibe_avisos_de_pago`; si no hay ninguno, el correo principal (P3).
  En automático (B) se usan exactamente los preseleccionados; si no hay ninguno utilizable, no se encola nada y la ficha
  dice «sin aviso: el proveedor no tiene correo para avisos».
- **Copia a la empresa** (P7): `core.empresas.correo` como `copia` (Cc), si la variable lo pide y el correo es utilizable.
  Además siempre va como `Reply-To`.
- **Marcadores** del aviso: `{proveedor}`, `{empresa}`, `{numero}`, `{fecha}`, `{forma}` («cheque», «nota de débito»,
  «efectivo», «débito ya registrado»), `{monto}` (formato `Q1,234.56`), `{documentos}` (serie y número de cada factura
  pagada, separados por coma, hasta 20 y «y N más»), `{fecha_de_cobro}` (la del cheque posfechado o vacía). No hay
  marcador de NIT ni de cuenta bancaria. El asunto **no** admite `{monto}` ni `{documentos}` (P6).
- **Adjunto**: el PDF del comprobante, si `adjuntar_comprobante` (P5). Su contenido es el del comprobante de CP4-8, con
  las constancias que existan **al encolar**; si la constancia se emite después, se reenvía con el botón (P10).
- **Anulación del pago**: el suscriptor de `pago_anulado` (con `suscribirSinRomper`) cancela los pendientes con motivo
  «Pago anulado» (auditado). Lo ya enviado queda; la ficha dice «El aviso ya se envió; avise al proveedor de la
  anulación» (P9).
- **Reenvío**: el mismo botón; cada envío es una fila nueva (la bitácora queda completa).

## 5. Permisos

| Clave | Quién | Para |
|---|---|---|
| `cuentas-por-pagar.pagos.enviar-aviso` (nuevo) | asignable | Enviar y reenviar el aviso de un pago, y cancelar uno pendiente. Ver el estado del aviso va con `pagos.ver` |
| `cuentas-por-pagar.avisos-de-pago.configurar` (nuevo; QA E1) | asignable | Pantalla «Avisos de pago» de la empresa: envío manual o automático, asunto, mensaje, comprobante adjunto y copia a la empresa. Un solo permiso para ver y guardar (es un formulario). No abre `configuracion.gestionar` |
| `correos.ver` (nuevo, core) | asignable | Historial de correos de la empresa activa (sin detalle técnico) |
| `correos.cancelar` y `correos.reintentar` (nuevos, core) | asignables | Cancelar un pendiente y reintentar un fallido desde el historial (permisos por acción; P18) |
| `correo.servidor.gestionar` (nuevo, core) | `soloSuperacceso: true` | Panel de Soporte: servidor, prueba, estado global de la bandeja |

Nota: las rutas de Soporte se protegen con `proteger({ soloSuperacceso: true })` (sin empresa activa no hay permisos que evaluar), que es más estricto que este permiso. Queda declarado para el catálogo y no lo exige ninguna ruta.


El envío automático no pide permiso a quien registra el pago: es una política de la empresa (la cambia quien tenga
`avisos-de-pago.configurar`: `configuracion.ver/gestionar` son `soloSuperacceso`, así que ningún usuario de la empresa
los tiene; QA E1). Migración de permisos: ninguna («quien tenía X recibe Y» no aplica: son acciones
nuevas). Si el usuario lo pide, una migración que dé `pagos.enviar-aviso` a quien tiene `pagos.emitir`, en
`core.rol_permisos` **y** `core.usuario_permisos`.

## 6. Configuración

Core (`core/modulo.ts`):

| Clave | Esquema | Por omisión | Niveles | Pública |
|---|---|---|---|---|
| `core.correo.tope_por_hora_por_cuenta` | entero 1–10,000 | 100 | instalación | no |
| `core.correo.tope_por_dia_por_cuenta` | entero 1–50,000 | 500 | instalación | no |
| `core.correo.tope_por_dia_por_destinatario` | entero 1–500 | 20 | instalación | no |
| `core.correo.tope_por_hora_de_la_instalacion` | entero 1–100,000 | 1,000 | instalación | no |
| `core.correo.dias_de_conservacion_del_contenido` | entero 7–365 | 30 | instalación | no |

Los metadatos se conservan con `core.auditoria.meses_de_conservacion` (60, mínimo 60). El servidor SMTP **no** es
configuración (§3.1).

Cuentas por pagar (`cuentas-por-pagar/configuracion.ts`):

| Clave | Esquema | Por omisión | Niveles | Pública |
|---|---|---|---|---|
| `cuentas-por-pagar.avisos_de_pago.envio` | `'manual' \| 'automatico'` | `manual` | instalación, empresa | sí (el cliente lo muestra en la ficha) |
| `cuentas-por-pagar.avisos_de_pago.asunto` | texto 1–150 con marcadores permitidos | `Aviso de pago {numero} – {empresa}` | instalación, empresa | no |
| `cuentas-por-pagar.avisos_de_pago.mensaje` | texto 1–2,000 con marcadores | ver abajo | instalación, empresa | no |
| `cuentas-por-pagar.avisos_de_pago.adjuntar_comprobante` | booleano | `true` | instalación, empresa | no |
| `cuentas-por-pagar.avisos_de_pago.copia_a_la_empresa` | booleano | `true` | instalación, empresa | no |

Mensaje por omisión (para revisar con el usuario):

> Estimado(a) {proveedor}:
>
> {empresa} le informa que registró el pago {numero} del {fecha} por {monto}, con {forma}, de estos documentos:
> {documentos}.
>
> {adjunto}Este correo no es un documento tributario.

`{adjunto}` (QA E5) vale «Adjuntamos el comprobante del pago. » solo si la empresa adjunta el PDF; si no, queda vacío.

El esquema Zod valida que los marcadores estén en la lista (refinamiento), así un error se ve al guardar y no al enviar.

## 7. API

Core, empresa (con `proteger({ permiso })`):

| Ruta | Permiso | Entrada | Salida |
|---|---|---|---|
| `GET /api/correos` | `correos.ver` | `?desde&hasta&estado&tipo&pagina` | `{ datos: CorreoResumenDto[], total }`: tipo, origen, asunto, destinatarios (dirección y resultado), estado, intentos, fechas; sin cuerpo ni código técnico |
| `GET /api/correos/:id` | `correos.ver` | — | `CorreoDto` (con cuerpo de texto si no se depuró) |
| `POST /api/correos/:id/cancelar` | `correos.cancelar` | `{ motivo }` | `CorreoDto` |
| `POST /api/correos/:id/reintentar` | `correos.reintentar` | — | `CorreoDto` |

Core, Soporte (`correo.servidor.gestionar`, `soloSuperacceso`):

| Ruta | Entrada | Salida |
|---|---|---|
| `GET /api/soporte/correo/servidor` | — | `{ servidor, puerto, seguridad, usuario, remitenteDireccion, remitenteNombre, activo, contrasenaConfigurada, llaveDisponible, ultimaPrueba }` |
| `PUT /api/soporte/correo/servidor` | lo mismo + `contrasena?` (si falta, se conserva) | idem |
| `POST /api/soporte/correo/prueba` | `{ destino }` (dirección escrita: solo aquí, solo soporte) | `{ resultado, codigo }`; límite 5 por hora por usuario; bitácora de superacceso |
| `GET /api/soporte/correo/bandeja` | — | Conteos globales por estado y los últimos 50 fallidos (empresa, tipo, código), por una función `security definer` de solo lectura |

Cuentas por pagar:

| Ruta | Permiso | Entrada | Salida |
|---|---|---|---|
| `GET /api/cuentas-por-pagar/pagos/:id/aviso` | `pagos.ver` | — | `AvisoDePagoDto`: `envio` (manual/automático), `posibles` (`{ origen, origenId, nombre, direccion, utilizable, motivo, preseleccionado }`), `copiaALaEmpresa` (dirección o nulo), `vistaPrevia` (`asunto`, `mensaje`, `adjuntoNombre`), `enviados` (`CorreoResumenDto[]`), `sePuedeEnviar` y por qué no |
| `POST /api/cuentas-por-pagar/pagos/:id/aviso` | `pagos.enviar-aviso` | `{ destinatarios: Array<{ origen: 'tercero' \| 'contacto', origenId }>, copiaALaEmpresa: boolean }` (ids, nunca direcciones; 1–10) | `CorreoResumenDto`; 429 si no hay cupo; 409 si el pago está anulado o es de la cuenta de apertura |
| `POST /api/cuentas-por-pagar/pagos/:id/aviso/:correoId/cancelar` | `pagos.enviar-aviso` | `{ motivo }` | `CorreoResumenDto` |

La ruta `POST .../aviso` lleva su límite por usuario (20 por minuto, un manejador como `limitarSubidas`). Errores propios:
`DireccionNoUtilizable` (400), `DemasiadosDestinatarios` (400), `CupoDeCorreosAgotado` (429), `AvisoNoDisponible` (409),
`ServidorDeCorreoNoConfigurado` (solo en Soporte), `ErrorDeEnvio` (sin texto del servidor SMTP; C11).

## 8. Cliente

- **Terceros** (`CamposDeContacto`): casilla «Recibe avisos de pago», deshabilitada si no hay correo o no se puede usar
  para enviar (con la explicación). En la lista de contactos, una etiqueta «Avisos de pago».
- **Cuentas por pagar, ficha del pago**: sección «Aviso por correo» con el estado del último («Sin aviso», «Pendiente»,
  «Enviado el … a …», «No se pudo enviar; se reintentará», «Falló; avise a soporte», «Cancelado») y la lista de envíos.
  Botón «Enviar aviso» / «Reenviar» (`v-permiso="'cuentas-por-pagar.pagos.enviar-aviso'"`) que abre
  `VentanaDeAvisoDePago`: casillas de destinatarios (preseleccionadas), casilla «Copia a la empresa», vista previa del
  asunto y del mensaje, nombre del adjunto y la nota «El PDF lleva montos, NIT y retenciones». Lógica pura en
  `edicion-de-aviso-de-pago.ts` con pruebas. «Cancelar» en un pendiente pide motivo (`usarAvisos().confirmar`).
- **Configuración de la empresa** (QA E1): pantalla propia **Cuentas por pagar → Avisos de pago**
  (`/api/cuentas-por-pagar/avisos-de-pago/ajustes`, `GET`/`PUT`, permiso `avisos-de-pago.configurar`), con selector
  manual/automático y los textos validados con el mismo esquema de las variables de §6. Guarda en el nivel empresa.
- **Core, Administración → «Correos enviados»** (`correos.ver`): lista con filtros, ficha con cuerpo y destinatarios,
  acciones cancelar y reintentar. **Sin Excel en la primera versión** (es una bitácora: no se importa; exportar se puede
  agregar con `correos.exportar` si el usuario lo pide; P16).
- **Soporte → «Correo»**: formulario del servidor (la contraseña como campo de solo escritura con «Cambiar contraseña»),
  aviso si falta `CLAVE_SECRETOS`, botón «Enviar prueba», estado de la bandeja y fallidos recientes.
- Apariencia: paleta fija (`campo`, `tierra`, `trigo`) en botones y formularios; fechas y montos con `utilidades/formato.ts`.

## 9. Infraestructura y librería

- `nodemailer` **10.6.0** fijo (verificado con `npm view` el 2026-11-18) y `@types/nodemailer` de la misma línea; un
  solo transporte por proceso con `pool: true`, `maxConnections: 2`, `logger: false`, `debug: false`, `name` fijo en
  código, `tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true }`, `disableFileAccess`, `disableUrlAccess` (C2, C8, C10).
  Se recrea solo cuando Soporte guarda el servidor.
- Pino: `redact` de `*.contrasena`, `*.pass`, `*.auth` (C2).
- Desarrollo: contenedor **Mailpit** en `infra/docker-compose` de desarrollo (SMTP 1025, web 8025) y
  `CORREO_PERMITIR_RED_INTERNA=true` solo fuera de producción (el validador rechaza esa variable en producción), para
  probar sin mandar correos reales (P17). Pruebas: `TransporteEnMemoria` (doble) y Mailpit opcional.
- Producción: `.env` con `CLAVE_SECRETOS`; documentar en `infra/` SPF, DKIM y DMARC del dominio del remitente (sección
  de la revisión de seguridad).

## 10. Auditoría (resumen)

| Acción | Dónde queda |
|---|---|
| Encolar un correo | Es un alta: `creado_por` en `core.correos_salientes` y la bitácora de intentos |
| Cancelar un pendiente (a mano o por pago anulado) | `auditoria.registrar` con `recurso = 'core.correos_salientes'`, `accion = 'anular'`, motivo y el `CorreoResumenDto` anterior |
| Reintentar un fallido | Cambio de estado: `auditarCambioDeEstado` con `accion = 'reabrir'` |
| Depurar contenido y filas viejas | Política de conservación (como `core.depurar_auditoria`): conteos en el registro de la app; los metadatos viven 60 meses |
| Guardar o probar el servidor | `core.bitacora_superacceso`, sin contraseña |
| Marcar o desmarcar «recibe avisos de pago» | Edición normal (`actualizado_por`); no es baja |

`core.auditoria` no se toca ni se borra.

## 11. Orden de implementación (un commit cada uno)

1. **Core, dominio** (backend): `DireccionDeEnvio`, saneado, `PlantillaDeCorreo` y el diseño HTML escapado, con pruebas
   (incluye las direcciones de los avisos de nodemailer: comas, comillas, `<>`, CRLF, bidi).
2. **Core, servidor de correo** (backend): `CLAVE_SECRETOS`, `CifradorAesGcm`, tabla `core.servidor_de_correo`,
   migración, rutas de Soporte `GET`/`PUT` y bitácora de superacceso. Revisión de `seguridad` antes de unir.
3. **Core, transporte y prueba** (backend): nodemailer 10.6.0, `TransporteNodemailer`, `TransporteEnMemoria`,
   `EnviarPrueba` con su límite, Mailpit en el compose de desarrollo, `redact` de pino.
4. **Core, bandeja** (backend): tablas `correos_salientes`, `destinatarios_de_correos`, `intentos_de_correos`, funciones
   `security definer` y su migración; pruebas de RLS (otra empresa, otra cuenta, sin `delete`) y de las funciones.
5. **Core, encolar y trabajador** (backend): `BandejaDeSalida` (encolar, cupos con bloqueo, adjunto en `core.archivos`,
   despertar), `ProcesarBandeja` en `principal.ts` con SIGTERM, esperas, clasificación de errores, depuración diaria y
   variables `core.correo.*`. Pruebas con el doble y con fallos simulados.
6. **Core, eventos** (backend): `suscribirSinRomper` y `cuentaId`/`usuarioId` en `pago_registrado` y `pago_anulado`
   (cambio aditivo del contrato; Cuentas por pagar los llena).
7. **Terceros** (backend + frontend): columna `recibe_avisos_de_pago`, check, dominio, API y casilla en el formulario.
8. **Core, historial y Soporte** (backend): rutas `/api/correos` y `/api/soporte/correo/bandeja`, permisos `correos.*` y
   `correo.servidor.gestionar`.
9. **Cuentas por pagar, PDF del comprobante** (backend): generador pdfkit sobre `ComprobanteDePagoDto`, con pruebas de
   contenido (leyenda «no es documento tributario», constancias, posfechado).
10. **Cuentas por pagar, aviso** (backend): variables §6, permiso `pagos.enviar-aviso`, `PrepararAvisoDePago`,
    `EnviarAvisoDePago`, `CancelarAvisoDePago`, rutas, suscriptores de `pago_registrado` (si `automatico`) y
    `pago_anulado`. Pruebas de API (formas sin aviso, anulado, cupo, destinatarios de otra cuenta → 404).
11. **Cliente, Soporte → Correo** (frontend).
12. **Cliente, Correos enviados** (frontend).
13. **Cliente, aviso en la ficha del pago** (frontend).
14. **Revisión de seguridad** del conjunto (agente `seguridad`), **QA en el navegador** con Mailpit (agente
    `pruebas-qa`), documentación (`PLAN.md` bitácora, `HOJA-DE-RUTA.md`, `DONDE-QUEDAMOS.md`).

15. **Correcciones de la QA** (hecho, 2026-11-18): E1 pantalla «Avisos de pago» con su permiso; E2 el interruptor «Enviar
    correos» muestra su estado; E3 advertencia al reenviar con un aviso por salir y lista de la ficha acotada a los
    últimos 3 con «Ver todos»; E4 sin franja vacía en el pie; E5 marcador `{adjunto}`; E6 sin doble punto; toast de error
    retirado al salir bien la siguiente acción.

Los pasos 1–6 no dependen de Cuentas por pagar y sirven para Cuentas por cobrar. El 7 puede ir en paralelo a 2–6.

## 12. Preguntas para el usuario

Cada una con opciones y la recomendación. Las marcadas (S) repiten las de la revisión de seguridad.

**P1. ¿Cuándo se manda el aviso?**
- A: solo con el botón de la ficha del pago. B: automático al registrar el pago (por evento), si la empresa lo configura;
  el botón sigue para reenviar. C: casilla en el formulario del pago, en la misma transacción.
- Recomendación: **A + B configurable, manual por omisión**. B no toca el registro de pagos; su riesgo (E1) es que, si el
  servidor cae justo después de guardar el pago, ese aviso no se encola, y la ficha lo muestra «sin aviso».

**P2 (S1). ¿A quién se le puede mandar?**
- Solo a correos ya registrados (tercero, contactos y la empresa) o también a direcciones escritas en el momento.
- Recomendación: **solo registrados**. Escribir direcciones libres convierte a Arrancar en una pasarela de spam (C5) y
  es fácil equivocarse; si falta un correo, se agrega al contacto.

**P3. ¿El correo principal del tercero recibe avisos?**
- a) Solo si ningún contacto tiene la marca (preseleccionado en la ventana). b) Siempre. c) Nunca (solo contactos).
  d) Con su propia marca en `terceros.terceros`.
- Recomendación: **a**. Sin columna nueva y cubre al proveedor pequeño que solo tiene un correo.

**P4. ¿Una marca para pagos y otra para cobros, o una sola?**
- Recomendación: **una por tipo** (`recibe_avisos_de_pago` ahora; `recibe_avisos_de_cobro` con Cuentas por cobrar). Un
  tercero puede ser proveedor y cliente, y quien cobra no suele ser quien paga.

**P5 (S2). ¿Se adjunta el PDF del comprobante?**
- a) Sí, configurable por empresa (sí por omisión). b) No, solo el texto. c) Enlace a la app.
- Recomendación: **a**. El enlace no sirve: el proveedor no tiene usuario en Arrancar (E11). El PDF lleva montos, NIT
  y retenciones, y la ventana lo advierte.

**P6. ¿Qué datos van en el cuerpo?**
- Recomendación: **número, fecha, forma, monto total y facturas** en el cuerpo; en el asunto solo el número y la empresa;
  nunca NIT, DPI ni cuentas bancarias (C9 y minimización de datos).

**P7. ¿Copia a la empresa?**
- a) Cc al correo de la empresa, configurable (sí por omisión). b) Copia oculta. c) No.
- Recomendación: **a**, y siempre `Reply-To` a ese correo. Una copia visible es transparente para el proveedor.

**P8. ¿Qué formas de pago mandan aviso?**
- Recomendación: cheque, nota de débito, débito ya registrado (nota ligada) y efectivo; **no** la cuenta de apertura.

**P9. Si el pago se anula después de enviar el aviso, ¿qué pasa?**
- a) Se cancelan los pendientes y la ficha recuerda avisar a mano. b) Además se manda un «aviso de anulación».
- Recomendación: **a** en esta versión; b se agrega después con su propia plantilla.

**P10. Constancias emitidas después del pago.**
- a) Se reenvía con el botón. b) Al registrar la constancia, se manda solo un correo nuevo.
- Recomendación: **a**. b obliga a Libro de compras a avisar a Cuentas por pagar y puede mandar varios correos por pago.

**P11. ¿Dónde vive la plantilla?**
- a) Variables de configuración de la empresa (asunto y mensaje, texto con marcadores). b) Una tabla de plantillas en core
  con varias por tipo.
- Recomendación: **a**: ya hay precedente (leyenda de la contraseña) y no hace falta pantalla nueva.

**P12 (S3). ¿Cuántos correos por día se esperan?**
- Recomendación de topes por omisión: 100 por hora y 500 por día por cuenta, 20 por día por destinatario y 1,000 por
  hora en la instalación (todos ajustables por Soporte).

**P13 (S4). ¿Qué servidor de correo y qué dominio en el remitente?**
- Recomendación: un **proveedor transaccional** (Brevo, Postmark, Amazon SES, Mailgun) por el 587 con STARTTLS
  obligatorio, y `notificaciones@<dominio de la instalación>` con SPF, DKIM y DMARC. Un servidor propio exige PTR y
  cuidar la reputación de la IP.

**P14 (S5). ¿La llave de cifrado en el `.env` de producción, respaldada aparte?**
- Recomendación: **sí**. Si se pierde, solo hay que escribir otra vez la contraseña SMTP.

**P15 (S6). ¿Cuánto se conserva lo enviado?**
- Recomendación: cuerpo y PDF **30 días**; metadatos (a quién, qué, cuándo, resultado, huella del PDF) **60 meses**,
  como la auditoría.

**P16 (S7). ¿Historial visible para la empresa?**
- Recomendación: **sí**, con `correos.ver`, sin detalle técnico (que queda para Soporte). Sin Excel al principio.

**P17. ¿Mailpit en el entorno de desarrollo?**
- Recomendación: **sí**: se prueba de punta a punta sin mandar correos reales.

**P18. ¿Dos permisos (`correos.cancelar`, `correos.reintentar`) o uno solo?**
- Recomendación: **dos permisos**, por la regla de «permisos por acción» (`PLAN.md` §3.5); no existe `gestionar`.

## 13. Por validar

- Números de aviso de seguridad de nodemailer y su fecha (oct-nov 2026): los dio el agente `seguridad`; la versión
  10.6.0 sí se verificó con `npm view` el 2026-11-18. Revisar `npm audit` al instalar.
- Que Guatemala no tenga una ley general de protección de datos personales vigente: confirmarlo con un asesor legal
  (la revisión de seguridad lo dice «que yo sepa»). El diseño minimiza datos igual.
- Requisitos de Gmail, Yahoo y Outlook para remitentes: revisarlos al configurar el dominio (cambian seguido).
- Que el rol dueño de las funciones `security definer` sea también dueño de `core.archivos` en producción (§3.5).
- Que la pantalla genérica de configuración muestre bien un texto largo de 2,000 caracteres con saltos de línea
  (si no, ajuste menor del cliente en el paso 13).

## Respuestas del usuario (2026-11-18)

Todas las recomendaciones: **P1** botón siempre más envío automático configurable por empresa (apagado por omisión);
**P2** solo correos registrados; **P3** el principal solo si ningún contacto tiene la marca; **P4** una marca por tipo;
**P5** PDF adjunto, configurable (sí por omisión); **P6** cuerpo con número, fecha, forma, monto y facturas, asunto solo
número y empresa; **P7** copia visible configurable y «Responder a» la empresa; **P8** todas las formas menos la cuenta de
apertura; **P9** cancelar pendientes y recordatorio; **P10** reenviar con el botón; **P11** plantilla como configuración
de la empresa; **P12** 100/hora y 500/día por cuenta, 20/día por destinatario, 1,000/hora la instalación; **P13**
proveedor de correo transaccional por 587 con cifrado obligatorio, remitente `notificaciones@<dominio>` con SPF, DKIM y
DMARC; **P14** llave en el `.env`, respaldada aparte; **P15** contenido 30 días, metadatos 60 meses; **P16** historial
con `correos.ver`; **P17** Mailpit en desarrollo; **P18** `correos.cancelar` y `correos.reintentar`.
