# Conectarse a la Agencia Virtual de la SAT con las credenciales del contribuyente (agente de seguridad, 2026-10-19)

Evaluación pedida por el usuario para L4 («Importar DTE recibidos», al final de
`docs/modulos/validacion-h7-h11-retenciones.md`): ¿es aceptable que Arrancar guarde el usuario y la contraseña de
la Agencia Virtual de cada cliente y raspe «Consultar DTE → Recibidos»? Solo investigación; no se escribió código.
El contador ya recomendó no hacerlo.

## Resumen

- **No es aceptable guardar la contraseña del titular**, ni en Arrancar ni entregándola a un intermediario
  como API FelCore. Esa contraseña abre todo: declaraciones, RTU, emisión y anulación de DTE y la **delegación
  de permisos a terceros**. Con ella, un atacante puede darse a sí mismo un acceso que sobrevive al cambio de
  contraseña. Juntar las de muchos clientes en un VPS de 1–2 GB, con la base y los respaldos en el mismo equipo,
  convierte a Arrancar en un blanco valioso.
- **Hallazgo que cambia el análisis:** la propia SAT ofrece **Permisos delegados**. El titular le da a otro NIT
  el rol **«Consulta-FEL»**, que solo consulta DTE emitidos y recibidos, con fecha de fin, se puede quitar y
  avisa por correo. Es la vía que la SAT prevé para que un tercero consulte sin conocer la contraseña. Si algún día
  se automatiza, debe ser por aquí, nunca con la contraseña del titular.
- **Otra vía sin credenciales:** las **Notificaciones FEL por correo** avisan al receptor cuando le **emiten o
  anulan** un DTE. Podrían resolver la anulación tardía que preocupa al contador. Falta ver un correo real.
- **Recomendación:** seguir con la subida manual del Excel o los XML (ya decidida) y pedir a la SAT un servicio
  oficial. Antes de programar nada automático, revisar los correos de notificación. Cualquier automatización
  posterior, solo con permiso delegado, opinión legal y los controles del §3.

## Qué se comprobó

| Hecho | Evidencia |
|---|---|
| Para entrar se usa el NIT o CUI y la contraseña. La pantalla dice: «Abre la aplicación Authenticator e ingresa el código de un solo uso», es decir un segundo factor TOTP. No se confirmó si es obligatorio para todos. Hay una casilla «Permisos delegados». | Página de inicio `farm3.sat.gob.gt/menu/login.jsf`, bajada el 2026-10-19 |
| La misma página dice: «Al tener tu contraseña no la debes compartir con otra persona». La SAT publicó en X: «Tu usuario y contraseña de Agencia Virtual son de uso personal». | Página de inicio; cuenta @SATGT |
| **No se encontraron términos de uso públicos** de la Agencia Virtual. Las rutas habituales (`/terminos-y-condiciones/`, `/politicas-de-privacidad/`, `/aviso-legal/`) dan 404. No se puede afirmar ni descartar una prohibición expresa del acceso automatizado. | Consultas al portal |
| Consultar DTE: rango máximo de **3 meses**. Si el resultado pasa del máximo, la SAT envía un CSV por correo, y su enlace de descarga **pide reCAPTCHA**. | «Manual de Consulta de DTE» de la SAT |
| Permisos delegados FEL: roles **Consulta-FEL** (consultar DTE en nombre del titular desde la Agencia Virtual), Consulta móvil, Operador-FEL y Operador móvil (estos dos emiten y anulan). El permiso tiene vigencia con fecha de inicio y de fin, se puede editar, quitar y reactivar, y se notifica por correo. El colaborador entra con **su propio** NIT y contraseña y marca «Permiso delegado». Solo se delega a personas inscritas en la SAT. | «Manual de Usuario FEL permisos delegados a terceros»; «Manual Administración de permisos delegados (Titular) v. II» (2025) |
| Notificaciones FEL: el contribuyente inscribe y verifica un correo para «recibir notificaciones cuando le emitan o anulen un DTE». | «Manual de Usuario para activar el servicio de notificaciones FEL» |
| Los identificadores de la pantalla cambian entre cargas: `formContent:j_idt49` en una y `j_idt54` en otra. Es JSF/PrimeFaces con estado en el servidor, frágil para raspar. | Dos descargas de la misma página |
| `sat-gt-fel-invoices-downloader` 0.5.13 es la última versión (nov. 2022, sin cambios desde entonces). Usa `requests` y `beautifulsoup4`, y su README pide «YOUR AGENCIA DIGITAL USER / PASSWORD». No menciona el segundo factor. Licencia GPLv3 según su empaquetado. | PyPI (JSON), spec de openEuler |
| API FelCore es «privada e independiente de la SAT». Su política de privacidad dice que guarda «credenciales SAT/FEL necesarias… encapsuladas usando un token cifrado». Sus tokens de plataforma «no vencen». Sus términos hacen al cliente «responsable… de las acciones realizadas mediante tus credenciales». | apifelcore.com: inicio, términos, privacidad y documentación |
| FEL2ODOO (KTX, Odoo 19) usa a apifelcore.com como intermediario: «tus credenciales del proveedor y el NIT». No dice cómo las guarda. | apps.odoo.com |
| Arrancar hoy: no tiene cifrado reversible (solo Argon2 para contraseñas). En producción, app, PostgreSQL y respaldo corren en un solo VPS de 1–2 GB. | `CifradorDeContrasenas`, `docs/PLAN.md` §1, `infra/docker-compose.yml` |

## 1. Riesgos de guardar el usuario y la contraseña del titular

| # | Gravedad | Riesgo | Escenario de ataque o de falla |
|---|---|---|---|
| R1 | **Crítica** | **Alcance del daño si se filtran.** Es la llave de toda la relación del contribuyente con la SAT, no solo de las facturas. | Con la contraseña, el atacante entra a la Agencia Virtual y puede presentar o rectificar declaraciones, cambiar datos del RTU (correo de notificaciones, domicilio fiscal), solicitar firma electrónica y emitir o anular DTE a nombre del cliente. Además puede **delegarse a sí mismo** Operador-FEL desde «Asignar y remover permisos delegados», un acceso que **no cae al cambiar la contraseña**. Si cambia el correo de notificaciones, el titular ni se entera. |
| R2 | **Crítica** | **Multiempresa: un solo cofre con las llaves de todos.** Arrancar descifra para usar las credenciales, así que el proceso que las usa también puede leerlas en claro. La RLS protege de un usuario de otra empresa, no de quien controla el proceso. | Una ejecución remota de código, una dependencia maliciosa (cadena de suministro npm), un respaldo robado junto con la clave del mismo VPS o un superacceso con malas intenciones bastan para llevarse las credenciales de **todos** los clientes a la vez. Con varias decenas de clientes, el VPS pasa a ser un blanco que vale la pena atacar. |
| R3 | Alta | **Responsabilidad legal del proveedor.** Ante la SAT responde el contribuyente por lo hecho con su usuario. El proveedor queda expuesto a demandas civiles por daños (multas, recargos, facturas falsas) y, si el uso excede lo autorizado, posiblemente a lo penal: el Código Penal, art. 274 «F» (uso de información), castiga a quien «sin autorización» use u obtenga datos de registros informáticos con 6 meses a 2 años de prisión y una multa. Con un consentimiento escrito y un propósito limitado el riesgo penal baja, pero el civil sigue. **Debe opinar un abogado guatemalteco**; esto no es asesoría legal. | El cliente recibe un ajuste por una declaración que «no presentó» y demanda al proveedor. El hecho de que el proveedor guardara la contraseña contra la instrucción de la SAT («no la compartas») debilita la defensa de ambos. |
| R4 | Alta | **Términos de la SAT.** No hay términos públicos que prohíban el raspado, pero la SAT dice expresamente que la contraseña es «de uso personal» y no se comparte, y ofrece la delegación para que actúen terceros. Pedir la contraseña contradice esa instrucción. | La SAT bloquea la IP del VPS al ver decenas de NIT entrando desde un centro de datos, que parece un ataque de credenciales robadas (OWASP OAT-008, *credential stuffing*). Todos los clientes pierden el servicio a la vez, o se bloquean sus cuentas. |
| R5 | Alta | **Segundo factor y captcha.** Hay TOTP al iniciar sesión y reCAPTCHA en la descarga por correo. Automatizar exigiría guardar también la **semilla TOTP** del cliente, lo que anula el segundo factor, o pedirle que lo desactive. Saltar el captcha con un servicio de resolución es evadir un control contra la automatización. | Para «que funcione», el producto empuja a los clientes a bajar su seguridad. Un robo en Arrancar entrega contraseña y segundo factor juntos. |
| R6 | Alta | **Fragilidad del raspado.** Hay pantallas JSF con identificadores que cambian, ViewState, el rango de 3 meses, el tope de unas 10,000 filas y la migración de trámites a la Agencia Virtual en 2026. La biblioteca de Python de referencia lleva 4 años sin cambios. | Un cambio en la SAT rompe la descarga **en silencio** (lista vacía en vez de error), el libro de compras sale incompleto y se pierde crédito fiscal. Es peor que no automatizar, porque el usuario cree que ya está todo. |
| R7 | Media | **Recursos y superficie.** Un Chromium sin interfaz pide entre 300 y 500 MB por instancia en un VPS de 1–2 GB. Los XML y PDF que se bajan son contenido no confiable (XXE, bombas zip). | El servicio se cae para todas las empresas cuando se cruzan una importación y una navegación. |
| R8 | Media | **Protección de datos.** Guatemala **no tiene ley general de datos personales**: las iniciativas 6464 y 6572 siguen en comisión en 2026. Rigen el art. 24 de la Constitución (inviolabilidad de documentos y libros), el hábeas data reconocido por la Corte de Constitucionalidad, la LAIP (Decreto 57-2008, que obliga sobre todo a entes públicos) y el art. 274 «F» citado. La iniciativa 6464 propone 6 a 8 años de prisión a quien comprometa la seguridad de bases de datos personales. Los DTE recibidos traen además el NIT y el nombre de proveedores que son personas individuales. | Si se aprueba la ley con Arrancar ya custodiando credenciales, habría obligaciones nuevas (encargado del tratamiento, avisos de brecha) sobre el dato más sensible posible. |
| R9 | Media | **Normalizar el *phishing*.** Enseñar a los clientes a escribir su contraseña de la SAT fuera de la SAT. | Un correo falso de «Arrancar: reconecte su Agencia Virtual» se vuelve creíble. |

## 2. Alternativas

| Alternativa | Credencial del titular en Arrancar | Cubre anulaciones | Esfuerzo | Evaluación |
|---|---|---|---|---|
| **A. Intermediario (API FelCore, FEL2ODOO)** | No en Arrancar, sí en el intermediario | Según el intermediario | Bajo | **No.** Traslada el riesgo sin quitarlo y agrega un tercero sin convenio público con la SAT, cuyos tokens «no vencen» y cuyos términos dejan la responsabilidad al cliente. Un **certificador** solo guarda lo que él certificó, y las compras de un cliente vienen de muchos certificadores, así que no hay convenio para receptores (no se encontró ninguno). |
| **B. Subida manual del Excel o XML (decidido en L4)** | No | Con la conciliación por período | Ya planificado | **Sí, como base.** No hay credenciales. Se reutilizan `ValidadorDeXlsx`, el tope de filas, el límite de tasa y la defensa contra XXE de L4b. Su costo es la molestia de bajar el archivo cada mes. Conviene un instructivo con los pasos exactos de la SAT, el rango de 3 meses y arrastrar y soltar. |
| **C. Extensión de navegador** | No: corre en la sesión que el usuario ya abrió y él resuelve el TOTP y el captcha | Igual que B | Alto (Chrome Web Store, Firefox, mantenimiento) | **No por ahora.** Es igual de frágil que el raspado. Una actualización maliciosa o un robo de la cuenta de publicación leería la sesión SAT de **todos** los usuarios, porque el permiso de sitio sobre `*.sat.gob.gt` es enorme. Ahorra pocos clics frente a B. |
| **D. Ayudante local (programa de escritorio con Playwright y la contraseña en el llavero del sistema)** | No en el servidor | Igual que B | Muy alto (instaladores, firma de código, actualizaciones, soporte en Windows) | **No.** Quita la concentración del riesgo, pero el costo no se justifica y sigue siendo raspado. |
| **E. Pedir a la SAT un servicio oficial para receptores** | No | Sí, si lo da | Bajo para pedirlo; el plazo depende de la SAT | **Sí, en paralelo.** Carta a la Intendencia de Atención al Contribuyente o a la de Informática, mejor con un gremio (contadores, cámaras). Pedir que la consulta de recibidos y anulaciones funcione con el permiso delegado «Consulta-FEL» y un token, no con contraseña. |
| **F. Permiso delegado «Consulta-FEL» a un NIT del proveedor** (nueva) | **No.** Arrancar entra con su propio NIT y el titular delega solo la consulta | Sí (consulta el estado) | Alto (raspado) | **La única forma aceptable de automatizar**, si algún día se decide. El daño posible baja de «todo» a «leer los DTE de los clientes»: sigue siendo información comercial confidencial y de gravedad alta, pero sin declarar, emitir ni anular. Es revocable, tiene vencimiento y avisa al titular. El TOTP es el del proveedor (el titular no baja su seguridad). Sigue el reCAPTCHA del CSV y sigue la fragilidad. Antes hay que **probar** que el rol no permite más de lo dicho y **preguntar a la SAT** si un NIT puede ser delegado de cientos de titulares de forma automatizada. Requiere que el proveedor tenga NIT y Agencia Virtual a nombre de la persona jurídica. |
| **G. Buzón de Notificaciones FEL** (nueva) | No | **Sí: avisa de emisión y de anulación** | Medio | **Investigar.** Cada empresa inscribe en la SAT un correo de Arrancar (una dirección única por empresa) y Arrancar convierte cada aviso en una fila «pendiente» de la bandeja, o la marca «anulada en la SAT». No se sabe qué trae el correo (UUID, XML adjunto). El correo se puede falsificar, así que hay que verificar DKIM, SPF y DMARC de `sat.gob.gt`, tratar cada aviso como **indicio** y confirmarlo siempre con el Excel o el XML, nunca registrarlo directo. Aplican las mismas defensas de archivos si trae adjuntos. |

## 3. Si aun así se hiciera: controles mínimos

Valen para F (permiso delegado). Para la contraseña del titular, este agente **no la recomienda con ningún
control**. Si el usuario la aprobara contra esta recomendación, aplican todos y además los marcados con (T).

1. **Bóveda y cifrado por cuenta, con la clave fuera de la base**
   - Cifrado de sobre: una clave de datos por cuenta (AES-256-GCM, con `cuenta_id`, `empresa_id` y el propósito
     como datos asociados), envuelta por una clave maestra en un KMS externo o, como mínimo, en otro equipo.
     **Ni en la base, ni en el `.env` del VPS, ni en los respaldos.**
   - Esquema propio sin `GRANT` a `arrancar_app`.
   - Un servicio aparte (`conector-sat`, con su propio usuario de base) es el único que descifra. La app solo
     encola pedidos («consultar recibidos de la empresa X, de tal a tal fecha») y recibe archivos.
   - (T) No guardar nunca la semilla TOTP del cliente. Si su cuenta tiene segundo factor, no se ofrece el
     servicio.
2. **Credenciales que nunca se muestran**
   - El campo solo se escribe: la API no la devuelve, ni enmascarada.
   - `redact` del registro de eventos (pino) sobre los campos y cabeceras sensibles; nada en los mensajes de
     error, en la cola ni en la auditoría.
   - Pruebas que lo fijen: buscar el secreto en la respuesta, el registro y la bitácora.
3. **Rotación y revocación**
   - «Desconectar» borra el texto cifrado al momento (borrado criptográfico de la clave de la cuenta). También
     se borra al dar de baja la cuenta, y tras N fallos de inicio de sesión o N días sin uso.
   - Rotar la clave maestra cada año, o al momento ante un incidente.
   - En F, sugerir al titular una vigencia de 12 meses como máximo y recordarle antes del vencimiento.
   - Si hay un incidente, un procedimiento escrito: avisar a los clientes, pedirles que quiten la delegación y
     cambien la contraseña (T), y que revisen sus permisos delegados.
4. **Auditoría**
   - Cada conexión, consulta y descarga queda en `core.auditoria` con la empresa, el rango, el resultado y la
     cantidad.
   - Aviso por correo al titular en cada conexión, o un resumen semanal.
   - Alertas por volumen anómalo.
   - El superacceso **no** puede disparar consultas ni ver credenciales.
5. **Consentimiento explícito**
   - Por empresa, otorgado por el titular o el representante legal (no por cualquier usuario con permiso).
   - Texto con versión que diga qué se hace, con qué frecuencia, qué riesgos hay y cómo se revoca.
   - Se guarda quién aceptó, cuándo, desde qué IP y qué versión del texto.
   - Un permiso propio, que debe acordar el usuario.
6. **Aislamiento del proceso que navega**
   - Contenedor separado, sin puertos de entrada.
   - Salida solo a `*.sat.gob.gt` (lista blanca de destinos).
   - Sistema de archivos de solo lectura, usuario sin privilegios, perfil seccomp y el *sandbox* de Chromium
     activo (nunca `--no-sandbox`).
   - Un contexto de navegador nuevo por trabajo, destruido al terminar, sin cookies compartidas entre empresas.
   - Memoria y CPU con límite.
   - Lo bajado pasa por los mismos validadores que la subida manual (zip, XXE, tope de filas).
   - En un VPS de 1–2 GB probablemente no cabe: hace falta otro equipo.
7. **Límites de frecuencia**
   - Una consulta automática por empresa al día, como máximo, con espera aleatoria.
   - Concurrencia global de 1 o 2 y ventanas de 3 meses.
   - **Detenerse** ante captcha, segundo factor o bloqueo, sin servicios de resolución de captcha.
   - Cortacircuitos: si suben los fallos (la SAT cambió algo), se apaga para todos y se avisa que se use la
     subida manual.
   - Nunca mostrar «sin facturas» cuando la descarga falló.
8. **Contrato con el cliente** (lo debe redactar o revisar un abogado guatemalteco)
   - Mandato expreso y propósito limitado: solo consultar y bajar DTE recibidos para el libro de compras.
     Prohibido cualquier otro uso.
   - El cliente reconoce que la SAT pide no compartir la contraseña (T) o que otorga la delegación por su
     cuenta (F).
   - Sin terceros ni subencargados.
   - Medidas de seguridad descritas.
   - Aviso de incidentes en un plazo fijo (72 h, por ejemplo).
   - Límite de responsabilidad y seguro de ciberriesgo del proveedor.
   - Sin garantía de disponibilidad, porque depende de la SAT. La responsabilidad de revisar el libro sigue
     siendo del contribuyente.
   - Al terminar: borrado y constancia.
   - Ley aplicable y jurisdicción.
9. **Antes de salir:** una prueba de penetración del conector y de la bóveda, y la revisión de la cadena de
   suministro (dependencias fijadas, `npm audit`, imagen mínima).

## 4. Recomendación final

1. **Descartar** guardar el usuario y la contraseña del titular de la Agencia Virtual, en Arrancar o en un
   intermediario. Ningún control baja el riesgo R1 y R2 a algo aceptable para un SaaS en un VPS pequeño.
2. **Mantener la subida manual** (L4 y L4b, ya decididas), con un buen instructivo, y conciliar por período para
   detectar las anulaciones tardías.
3. **Investigar sin programar:**
   - Las Notificaciones FEL por correo (G): conseguir uno o dos correos reales con encabezados completos.
   - Escribir a la SAT pidiendo un servicio oficial para receptores (E).
4. **Solo después de L4**, y si el usuario quiere automatizar:
   - Evaluar el permiso delegado «Consulta-FEL» a un NIT del proveedor (F).
   - Antes, hace falta respuesta de la SAT, opinión legal y los controles del §3 en un equipo separado.

## Preguntas para el usuario

1. ¿Se descarta del todo pedir la contraseña de la Agencia Virtual del cliente, directamente o a través de un
   intermediario como API FelCore? **Recomiendo: sí, descartarlo.**
2. ¿Puede conseguir un correo real de las Notificaciones FEL (emisión y anulación), reenviado como adjunto
   `.eml` para conservar los encabezados, con NIT y nombres tachados? **Recomiendo: sí.** Decide si el buzón (G)
   vale la pena para las anulaciones.
3. ¿Arrancar (el proveedor) tiene o tendrá NIT y Agencia Virtual a nombre de una persona jurídica, y le
   interesaría ser delegado «Consulta-FEL» de sus clientes? **Recomiendo:** dejarlo para después de L4 y decidirlo
   con un abogado.
4. ¿Se envía una consulta formal a la SAT con dos preguntas: si acepta el acceso automatizado de un delegado
   «Consulta-FEL», y si planea un servicio para receptores? **Recomiendo: sí**, de ser posible junto con un gremio
   de contadores.
5. ¿Extensión de navegador o ayudante local? **Recomiendo: no**, por ahora.
6. Si más adelante se automatiza, ¿hay presupuesto para la opinión legal, el seguro de ciberriesgo y un equipo
   separado para el conector? **Recomiendo:** sin esos tres, no automatizar.

## Fuentes

- SAT, página de inicio de la Agencia Virtual (segundo factor con Authenticator, «Permisos delegados», «no la debes
  compartir»): https://farm3.sat.gob.gt/menu/login.jsf
- SAT en X, «Tu usuario y contraseña de Agencia Virtual son de uso personal»:
  https://x.com/SATGT/status/1435242450432446469
- SAT, Permisos delegados de Agencia Virtual: https://portal.sat.gob.gt/portal/noticias/permisos-delegados-de-agencia-virtual/
  y https://portal.sat.gob.gt/portal/noticias/delegacion-de-permisos-desde-agencia-virtual/
- SAT, Manual de Usuario permisos delegados (Titular) v. II:
  https://portal.sat.gob.gt/portal/descarga/16768/permisos-delegados/85579/manual-de-usuario-permisos-delegados-titular-version-ii
- SAT, Manual de Usuario FEL permisos delegados a terceros (roles Consulta-FEL y Operador-FEL):
  https://portal.sat.gob.gt/portal/descarga/15747/manuales/92747/4-manual-de-usuario-fel-permisos-delegados-a-terceros
- SAT, Manual de Consulta de DTE (rango de 3 meses, CSV por correo con reCAPTCHA):
  https://portal.sat.gob.gt/portal/descarga/15747/manuales/85785/3-manual-de-consulta-de-documentos-tributarios-electronicos-dte.pdf
- SAT, Manual para activar las notificaciones FEL:
  https://portal.sat.gob.gt/portal/descarga/15747/manuales/92759/manual-de-usuario-para-activar-el-servicio-de-notificaciones-fel
- SAT, Emisor de DTE (índice de manuales): https://portal.sat.gob.gt/portal/emisor-de-dte/
- PyPI, sat-gt-fel-invoices-downloader: https://pypi.org/project/sat-gt-fel-invoices-downloader/ (y su spec en
  openEuler: https://eur.openeuler.openatom.cn/results/mywaaagh_admin/pypi/openeuler-22.03-x86_64/00075080-python-sat-gt-fel-invoices-downloader/python-sat-gt-fel-invoices-downloader.spec)
- API FelCore: https://apifelcore.com, https://apifelcore.com/terminos, https://apifelcore.com/privacidad,
  https://apifelcore.com/documentacion/api-agencia-virtual
- FEL2ODOO (KTX): https://apps.odoo.com/apps/modules/19.0/ktx_fel2odoo
- Código Penal de Guatemala, art. 274 «F», reformado por la Ley contra la Corrupción (Decreto 31-2012):
  https://anam.org.gt/wp-content/uploads/2024/01/01C04-LEY-CONTRA-LA-CORRUPCION.pdf
- Iniciativa 6464 de protección de datos personales, en comisión (julio de 2026):
  https://emisorasunidas.com/nacional/2026/07/16/comision-de-asuntos-de-seguridad-analiza-iniciativa-de-ley-de-proteccion-de-datos-personales/
- ECIJA, «Data Protection Officer Chile y Guatemala» (iniciativa 6572, sin ley vigente):
  https://files.griddo.ecija.com/data-protection-officer-chile-y-guatemala.pdf
- OWASP Secrets Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- OWASP Cryptographic Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
- OWASP Logging Cheat Sheet (datos que no se registran): https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- OWASP Automated Threats to Web Applications (OAT-008 *credential stuffing*, OAT-011 *scraping*):
  https://owasp.org/www-project-automated-threats-to-web-applications/
- CWE-257 (contraseñas en formato recuperable): https://cwe.mitre.org/data/definitions/257.html;
  CWE-522 (credenciales protegidas insuficientemente): https://cwe.mitre.org/data/definitions/522.html
