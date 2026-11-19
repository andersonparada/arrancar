# Revisión de seguridad: envío de correos desde Arrancar (agente `seguridad`, 2026-11-18)

_Investigación del agente `seguridad`, guardada tal cual por el agente `arquitecto-de-datos` el 2026-11-18. La usa
`diseno-aviso-de-pago-por-correo.md`; lo que ahí queda marcado «por validar» también aplica aquí._

---

# Informe de seguridad: envío de correos desde Arrancar (solo plan, no hay código)

## Lo que revisé del repositorio
- No hay nada de correo todavía. Ni `nodemailer` ni otra librería en `/home/aparada/proyectos/arrancar/servidor/package.json`, y en `docs/PLAN.md` §patrones sigue «Canales de notificación … pendiente».
- `/home/aparada/proyectos/arrancar/servidor/src/modulos/core/configuracion/`: los valores se guardan en `core.configuraciones.valor` como **jsonb en claro**. `VariableDto` devuelve `valores` de **cada nivel**. El archivo de instalación es JSON en claro, montado en `infra/config`.
- `/home/aparada/proyectos/arrancar/servidor/src/modulos/core/compartido/dominio/objetos-valor/correo.ts`: la expresión `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` deja pasar `, ; < > " ( ) \`, que son justo los caracteres de los avisos recientes del analizador de direcciones de nodemailer.
- `/home/aparada/proyectos/arrancar/servidor/src/principal.ts`: las tareas periódicas son `setInterval` dentro del mismo proceso, y no hay cola persistente.
- `/home/aparada/proyectos/arrancar/infra/respaldo.sh`: hace un `pg_dump` completo. Cualquier secreto que esté en la base sale en los respaldos.

## Librería
- **nodemailer 10.6.0** (publicada el 2026-11-15, sin dependencias, Node ≥20). Recomiendo fijar la versión exacta, como ya se hace con `pdfkit`, y revisar `npm audit` y sus avisos en cada actualización.
- Ha tenido muchos avisos en 2026. Hay que estar al menos en ≥10.0.2, y lo ideal es la última:
  - Inyección de comandos SMTP por la opción `name` con CRLF (GHSA-vvjj-xcjg-gr5g, arreglada en 8.0.5) y por `envelope.size` (GHSA-c7w3-x93f-qmm8).
  - `raw` se saltaba `disableFileAccess`/`disableUrlAccess`, con lectura de archivos y SSRF (GHSA-p6gq-j5cr-w38f, 9.0.1).
  - Caché de DNS global que mezcla el `servername` TLS entre transportes y puede filtrar credenciales entre inquilinos (GHSA-6vj9-mwq6-2f5v, 10.0.2).
  - Denegación de servicio antes de autenticarse por regex de AUTH y por respuestas SMTP (GHSA-4ffr-jq9g-5ffx alta, GHSA-4g23-2xm8-66gc).
  - Una serie de errores del analizador de direcciones que desvían destinatarios (GHSA-3q53, -8c8m, -m943, -85x2, -g73g, -g57g, -2g53; oct-nov 2026).
- Conclusión: **a nodemailer no se le pasan direcciones con forma «libre»**. Se validan antes con una regla estricta propia y se da el `envelope` explícito.
- No hace falta otra librería. Un proveedor por API HTTP (SES, Postmark, etc.) también serviría, pero SMTP mantiene la instalación independiente del proveedor.

## Tabla de hallazgos y recomendaciones

| # | Gravedad | Qué | Escenario de ataque | Corrección recomendada |
|---|---|---|---|---|
| C1 | Alta | Si la contraseña SMTP se guarda como variable de `definirConfiguracion`, queda en claro en `core.configuraciones` (jsonb), en el JSON de instalación, en los respaldos, y sale en `VariableDto.valores` del panel de Soporte | Quien obtiene un respaldo, lee la base con `arrancar_app` o entra al panel con una sesión robada de soporte se lleva la credencial y envía correo con el dominio de la instalación (phishing creíble a los clientes) | Una tabla propia `core.smtp_instalacion` (una fila) con `contrasena_cifrada bytea`, `iv`, `version_de_clave`. AES-256-GCM (`node:crypto`), IV aleatorio de 12 bytes, AAD fija (`'core.smtp.contrasena'`) y llave de 32 bytes en una variable de entorno nueva (p. ej. `CLAVE_SECRETOS`, validada en `configuracion.ts`), **fuera de la base y de los respaldos**. La API solo **escribe**: GET devuelve `contrasenaConfigurada: boolean`, nunca el valor ni su largo. Host, puerto, usuario y remitente pueden ser configuración normal `soloSuperacceso`. Rotación con `version_de_clave`; perder la llave solo obliga a escribir la contraseña de nuevo |
| C2 | Alta | Auditoría y registros | `auditoria.registrar` guarda «el DTO como estaba antes». Si el DTO de SMTP trae la contraseña, queda 60 meses en `core.auditoria`. El modo `debug`/`logger` de nodemailer vuelca el mensaje (datos personales) a pino | El DTO de SMTP no lleva la contraseña (ni cifrada). Se audita «contraseña cambiada: sí». Transporte con `logger: false, debug: false`. El error SMTP se registra solo con código y comando (`err.code`, `err.responseCode`), sin `err.response` completo; en la API sale un error propio (`ErrorDeEnvio`) sin texto del servidor SMTP. En pino agregar `redact` para `*.contrasena`, `*.pass` y `auth` |
| C3 | Alta | Correos perdidos o duplicados si el proceso cae (envío directo dentro de la petición) | Se reinicia el contenedor (`mem_limit: 1g` con un PDF grande) entre confirmar la operación y enviar: el correo nunca sale. O se envía y la transacción se deshace: correo de algo que no ocurrió | **Bandeja de salida transaccional** `core.correos_salientes`, insertada en la **misma** `UnidadDeTrabajo` que la operación de negocio, con estos campos: id, cuenta_id, empresa_id, destinatarios validados, asunto, cuerpo de plantilla, referencia al adjunto, `message_id` fijo, estado (`pendiente`/`enviando`/`enviado`/`fallido`), intentos, `proximo_intento`, `bloqueado_hasta`, ultimo_error_codigo. Un trabajador en proceso toma lotes con `FOR UPDATE SKIP LOCKED` y un arriendo (`bloqueado_hasta` = ahora + 5 min), así lo que quedó «enviando» al caerse se retoma solo. Reintento con espera exponencial y azar (1, 5, 30 min, 2 h, 12 h; máximo ~8). 4xx y errores de red se reintentan; 5xx es permanente. Es entrega «al menos una vez»: el `Message-ID` fijo por fila permite reconocer duplicados. pg-boss 12.38.2 (Node ≥22.12) sirve, pero no se une a la transacción de la `UnidadDeTrabajo`, así que recomiendo la tabla propia |
| C4 | Alta | RLS del trabajador | El trabajador tiene que leer filas de todas las empresas. Si lo hace como propietario o salta RLS «a mano», un error en la consulta mezcla datos entre cuentas | Una función `security definer` estrecha (`core.tomar_correos_pendientes(limite)`) que devuelve solo las columnas de envío y marca el arriendo, o un rol de base aparte solo con permisos sobre esa tabla. El resto de la tabla sigue con `politicaPorEmpresa()`, y el usuario solo ve los correos de su empresa en el historial |
| C5 | Alta | Uso como pasarela de spam | Una cuenta suscriptora (o una cuenta de prueba creada por un atacante) manda miles de correos con destinatarios escritos a mano, quema la reputación del dominio o IP de la instalación y deja sin correo a todas las cuentas | (a) Límite **por cuenta** contado en la bandeja al insertar, dentro de la transacción, con `pg_advisory_xact_lock(hash(cuenta_id))` para evitar carreras. Propongo 100 por hora y 500 por día, ajustable por instalación por soporte. (b) Límite por destinatario (p. ej. 20 por día). (c) Tope global de la instalación por debajo del cupo del proveedor. (d) `@fastify/rate-limit` por usuario en la ruta que encola. (e) Máximo 10 destinatarios por mensaje, sin CC/BCC libres. (f) Si se pasa el límite: 429 con mensaje claro y aviso a soporte. (g) Mejor aún: **solo destinatarios ya registrados** (correo del tercero o del usuario), no texto libre (ver preguntas) |
| C6 | Media-Alta | Inyección de cabeceras y de destinatarios (CWE-93, CWE-74) | El nombre de un tercero o un asunto con `\r\nBcc: …`. O un correo de tercero como `a@x.com,b@victima.com` o `"x>"@y.com`, que hoy acepta `Correo` y que, por los avisos del analizador, nodemailer puede convertir en otro destinatario | Una regla de **envío** más estricta que `Correo` (`DireccionDeEnvio`): ASCII imprimible, parte local solo atext con punto (sin comillas, comentarios, `<>,;()`), dominio en punycode válido, ≤254, sin CR/LF/NUL ni caracteres bidireccionales. Pasar `envelope: { from, to: [...] }` explícito y en `to` objetos `{ name, address }`, nunca texto armado. Asunto y nombres visibles: quitar controles (U+0000-001F, U+007F, bidi) y cortar a 150. Revisar también los correos ya guardados en terceros y usuarios, que pueden no pasar la regla nueva: se marcan, no se rompen |
| C7 | Media | Suplantación de remitente | Dejar que la empresa ponga su propio `From` (p. ej. `pagos@empresa-cliente.com`) falla DMARC y queda como spam o rechazado. Si se valida a medias, es suplantación | `From` fijo de la instalación (p. ej. `Arrancar <notificaciones@dominio-instalacion>`). Se permite un nombre visible «Empresa X por medio de Arrancar», saneado. `Reply-To` = correo validado de la empresa, si existe. Nunca se toma `From`/`Sender` de la petición |
| C8 | Media | Adjuntos PDF | Opciones de adjunto con `path`/`href` permiten leer archivos del servidor o hacer SSRF si algún día llega un valor del usuario | Solo `content: Buffer` producido por la app (pdfkit), `contentType: 'application/pdf'` fijo, nombre saneado con la misma rutina de `core/archivos` y `.pdf` forzado. `disableFileAccess: true` y `disableUrlAccess: true` en transporte y mensaje; nunca `raw`. Tope de 10 MB por correo (muchos servidores cortan en 10-25 MB y base64 suma ~33 %). Se guarda una referencia al archivo (o se regenera al enviar) y no el binario en la fila; después del envío se borra o se vence con la depuración de huérfanos. Nunca reenviar archivos subidos por usuarios (estos no pasaron por qpdf para correo, y sería un canal para distribuir malware con la reputación de la instalación) |
| C9 | Media | Contenido HTML (XSS en el correo o enlaces engañosos) | El nombre de un proveedor `<a href="phish">Pague aquí</a>` se pega en la plantilla HTML | Plantillas fijas por tipo de correo con todo dato **escapado**. Los enlaces se arman solo con `URL_PUBLICA` y rutas fijas, nunca con URL que vengan de datos. Versión de texto plano siempre. Sin imágenes remotas (rastreo) |
| C10 | Media | TLS hacia el SMTP | Bajar a texto plano (STARTTLS quitado por un intermediario) expone la contraseña | Puerto 465 con `secure: true`, o 587 con `requireTLS: true`. `tls.minVersion: 'TLSv1.2'`, `rejectUnauthorized: true`, sin opción de apagarlo en el panel. Un solo transporte por proceso (evita el problema de GHSA-6vj9). Muchos VPS bloquean el puerto 25 de salida: usar el 587/465 de un proveedor |
| C11 | Media | Fuga de información en errores | El mensaje SMTP («535 5.7.8 user x@… authentication failed», IP interna) llega al usuario de una empresa | El usuario de empresa solo ve «No se pudo enviar; se reintentará» o «Falló; avise a soporte». El detalle técnico, sin credenciales, solo en el panel de Soporte. El botón «Enviar prueba» de soporte va con su propio rate-limit y se registra en `core.bitacora_superacceso` |
| C12 | Baja-Media | SSRF por el host SMTP | Lo configura solo el superacceso, así que el riesgo es bajo, pero un panel de soporte comprometido podría apuntar a servicios internos (`postgres:5432`) para sondear la red | Puertos permitidos 465/587 (25 opcional). Rechazar nombres del compose (`postgres`, `app`, `caddy`) e IP privadas, salvo que se acepte una opción explícita de instalación |
| C13 | Baja | Retención de lo enviado | La bandeja guarda cuerpos con datos personales sin fecha de fin | Depuración diaria: el cuerpo y el adjunto se borran a los 30 días; los metadatos (destino, tipo, estado, fecha) se conservan según `core.auditoria.meses_de_conservacion`. Plazos a decidir |

## SPF, DKIM y DMARC (lo que configura el dueño del dominio remitente, que es el de la instalación y no el de cada empresa)
- **SPF** (RFC 7208): TXT `v=spf1 include:<proveedor> -all` (o `~all` al principio), sin pasar de 10 consultas DNS.
- **DKIM** (RFC 6376): que firme el **proveedor SMTP** con los CNAME/TXT que él entrega, con llave de 2048 bits. No hace falta firmar en nodemailer; si se hiciera, la llave privada se trata como C1.
- **DMARC** (RFC 7489): `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:…`. Tras revisar los informes se sube a `quarantine` y luego `reject`. Alineación: el dominio del `From` debe coincidir con el de DKIM o el de SPF.
- Gmail, Yahoo y Outlook exigen SPF o DKIM a todos los remitentes. A los de más de 5,000 por día les exigen SPF, DKIM y DMARC alineados, una tasa de spam menor a 0.3 % y PTR/rDNS si es servidor propio. La baja con un clic aplica solo a correo masivo o de mercadeo, no a los transaccionales.
- Opcional: MTA-STS y TLS-RPT para el dominio.
- Si es servidor SMTP propio: PTR que coincida con el HELO. La opción `name` de nodemailer se fija en código, nunca desde datos (es el vector de GHSA-vvjj).

## Datos personales en el correo
- Minimizar:
  - **Asunto**: sin NIT, DPI, montos ni números de cuenta bancaria; solo tipo y número de documento («Contraseña de pago 123 – Empresa X»).
  - **Cuerpo**: nombre del destinatario, empresa, tipo y número de documento, fecha y enlace a la app (que pide sesión).
- Montos, NIT y detalle van en el PDF adjunto o, mejor, se ven en la app tras iniciar sesión. El correo viaja y se guarda en servidores de terceros, con TLS solo «oportunista» entre servidores.
- Nunca por correo: contraseñas, enlaces de restablecimiento con larga vida, DPI, cuentas bancarias completas (enmascarar a los últimos 4 dígitos).
- Si se adjuntan PDF con datos fiscales del proveedor (NIT, montos, retenciones), el usuario debe saberlo y decidirlo (pregunta 2).
- Guatemala no tiene, que yo sepa, una ley general de protección de datos personales vigente (la Ley de Acceso a la Información Pública es para el sector público). Esto conviene confirmarlo con un asesor legal; igual recomiendo minimizar por diseño.

## Arquitectura sugerida (para `programador-backend`, cuando se apruebe)
- Contexto `core/correo`:
  - `dominio`: `DireccionDeEnvio`, `MensajeSaliente`, errores.
  - `aplicacion`: `EncolarCorreo` (con límites), `ProcesarBandeja`, `GuardarSmtp`, `EnviarPrueba`; puertos `CifradorDeSecretos` y `TransporteDeCorreo`.
  - `infraestructura`: `CifradorAesGcm`, `TransporteNodemailer`, tablas `smtp_instalacion` y `correos_salientes`.
  - `http`: rutas de soporte con `proteger({ soloSuperacceso: true })`.
- Los módulos encolan por un puerto de core o por evento del bus, dentro de su unidad de trabajo.
- Permisos por acción (p. ej. `<modulo>.<plural>.enviar`) en cada recurso que mande correo. Al arrancar, el trabajador corre como las otras tareas de `principal.ts` y se detiene limpio con SIGTERM (termina el envío en curso).

## Preguntas para el usuario
1. ¿A quién se manda correo: solo a correos ya registrados (terceros y usuarios) o también a direcciones escritas en el momento? Lo segundo multiplica el riesgo de spam.
2. ¿Se adjunta el PDF (con NIT, montos y retenciones) o se manda solo un enlace a la app? El enlace protege más los datos y evita el tamaño del adjunto.
3. ¿Qué correos habrá al principio (contraseña de pago, recibos, avisos internos) y cuántos por día se esperan por cuenta, para fijar los límites por omisión?
4. ¿La instalación usará un proveedor (SES, Postmark, Brevo, Mailgun…) o un servidor SMTP propio? ¿Qué dominio va en el `From`?
5. ¿Está bien guardar la llave de cifrado como variable de entorno del `.env` de producción (fuera de la base y de los respaldos) y respaldarla aparte? Si se pierde, solo hay que volver a escribir la contraseña SMTP.
6. ¿Cuánto tiempo se conservan el cuerpo y el adjunto de los correos enviados (propongo 30 días) y los metadatos?
7. ¿Habrá un historial de envíos visible para la empresa, o solo para soporte?

## Fuentes
- [Avisos de seguridad de nodemailer](https://github.com/nodemailer/nodemailer/security/advisories)
- [GHSA-6vj9-mwq6-2f5v](https://github.com/advisories/GHSA-6vj9-mwq6-2f5v)
- [GHSA-p6gq-j5cr-w38f](https://github.com/advisories/GHSA-p6gq-j5cr-w38f)
- [GHSA-vvjj-xcjg-gr5g](https://github.com/advisories/GHSA-vvjj-xcjg-gr5g)
- [GHSA-c7w3-x93f-qmm8 (GitLab)](https://advisories.gitlab.com/npm/nodemailer/GHSA-c7w3-x93f-qmm8/)
- [GHSA-rcmh-qjqh-p98v](https://github.com/advisories/GHSA-rcmh-qjqh-p98v)
- [GHSA-8vvx-rff5-p5rq (GitLab)](https://advisories.gitlab.com/npm/nodemailer/GHSA-8vvx-rff5-p5rq/)
- [Documentación SMTP de Nodemailer](https://nodemailer.com/smtp/) y [opciones del mensaje](https://nodemailer.com/message/)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html) y [Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [CWE-93 (inyección CRLF)](https://cwe.mitre.org/data/definitions/93.html)
- [RFC 7208 SPF](https://www.rfc-editor.org/rfc/rfc7208), [RFC 6376 DKIM](https://www.rfc-editor.org/rfc/rfc6376), [RFC 7489 DMARC](https://www.rfc-editor.org/rfc/rfc7489)
- [Requisitos de remitentes de Google](https://support.google.com/a/answer/81126), [Yahoo Sender Best Practices](https://senders.yahooinc.com/best-practices/), [Requisitos de Outlook para remitentes de alto volumen](https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730)
- Versiones consultadas con `npm view` el 2026-11-18: nodemailer 10.6.0, pg-boss 12.38.2.
