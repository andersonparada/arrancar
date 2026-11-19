# Arrancar — Plan y decisiones

Documento vivo: aquí se registra lo acordado, lo que está en curso y lo que falta
planificar. Se actualiza en cada iteración (ver la bitácora al final).

## 1. Visión

Sistema administrativo y contable para empresas de Guatemala **de cualquier rubro**
(una concretera, una lotificadora, un comercio, un rancho…): dinero, compras, cuentas
por pagar y cobrar, inventario, maquinaria, trabajadores, clientes y proveedores, con un
panel de recordatorios diarios. Los módulos generales no asumen un rubro ni un régimen
fiscal (sirven a cualquier régimen de IVA e ISR, sea o no agente de retención); lo propio
de un rubro va en **módulos de rubro** activables (Ganado, Siembras…). Decisión del usuario
del 2026-10-05; nació para ranchos ganaderos y parcelas.

- Aplicación web instalable (PWA). **Solo funciona con internet**: el service
  worker guarda la estructura de la app, nunca los datos.
- Multiempresa: una cuenta tiene varias empresas; nadie ve los datos de otra
  cuenta. Un usuario puede tener acceso a 1 o N empresas.
- Pensada como **SaaS** (venderla a empresas de cualquier rubro) y también para instalarse
  en un servidor dedicado de un cliente.
- País: **Guatemala** (quetzales, con cuentas en dólares; NIT; FEL de la SAT).

## 2. Tecnologías

| Parte             | Elección                                                                      |
| ----------------- | ----------------------------------------------------------------------------- |
| Base de datos     | PostgreSQL 16                                                                 |
| Backend           | Node.js 22 + TypeScript + Fastify 5 + Drizzle ORM + Zod                       |
| Frontend          | Vue 3 + Vite + Tailwind 4 + Pinia + vue-router, PWA con vite-plugin-pwa       |
| Despliegue        | Docker Compose: Caddy (HTTPS automático) + app + PostgreSQL + respaldo diario |
| Servidor objetivo | VPS de 4–6 USD/mes (1–2 GB de RAM)                                            |
| Desarrollo        | WSL Ubuntu 22.04, PostgreSQL en Docker (puerto 5433)                          |

## 3. Arquitectura

### 3.1 Módulos

- Cada módulo vive en `servidor/src/modulos/<clave>/` y `cliente/src/modulos/<clave>/`.
- Carpetas por tipo: `esquemas/`, `migraciones/`, `repositorios/`, `servicios/`,
  `controladores/`, `rutas/`, `validaciones/`, `eventos/`, `estados/`.
- Todo módulo declara un `modulo.ts` (`DefinicionModulo`): clave, nombre,
  dependencias (`dependeDe`), permisos, recursos con alcance, configuración y rutas.
- Lo que usan todos los módulos va en **core**.
- Los módulos se **activan por cuenta** (SaaS). Un módulo solo se activa si sus
  dependencias están activas (p. ej. _Caja chica_ depende de _Bancos_); no se
  desactiva si otro activo depende de él. No hay submódulos: cada cosa es un
  módulo con indicador de dependencia.
- Los módulos no se llaman entre sí: se comunican con **eventos de dominio**
  (patrón Observer, `core/eventos/bus-eventos.ts`). Si el módulo que escucha no
  está activo, el que publica sigue funcionando.

### 3.2 Base de datos

- **Un esquema de PostgreSQL por módulo** (`core.usuarios`, `bancos.cuentas`,
  `contabilidad.cuentas`…): evita choques de nombres entre módulos.
- **Migraciones por módulo** en `modulos/<clave>/migraciones`, con su propia
  tabla de control (`drizzle.migraciones_<clave>`). Se aplican en orden de
  dependencias (core primero).
  - Generar: `npm run bd:generar -- <modulo> <nombre>` (con `--custom` para datos).
  - Aplicar: `npm run bd:migrar`.
- Dos roles de PostgreSQL: `arrancar` (dueño, solo migraciones) y
  `arrancar_app` (la aplicación, sin privilegios; las políticas RLS se aplican).
- Dinero en `numeric(14,2)`; en la API viaja como texto para no perder precisión.
- **Llaves foráneas entre esquemas (decisión del usuario, 2026-09-29):** una
  instalación crea las tablas de **todos** los módulos, se usen o no, así que una
  tabla puede apuntar con llave foránea (e índice) a la de otro módulo, siempre que
  ese módulo esté en su `dependeDe` (el migrador ya aplica en ese orden y una prueba
  lo comprueba). Da integridad en la base; la velocidad la dan los índices de esas
  columnas. El código solo importa los `*.tablas.js` del otro módulo y solo desde su
  `infraestructura/` (leer y referenciar; escribir en esas tablas solo lo hace su
  módulo). Una referencia a «un documento de cualquier módulo» (p. ej.
  `bancos.movimientos.documento_de_origen_id`) no puede llevar llave. La llave no
  sustituye la comprobación con RLS: PostgreSQL la revisa sin políticas.

### 3.3 Multiempresa y acceso a datos (a nivel de base de datos)

- Jerarquía: **Plataforma → Cuenta (suscriptor) → Empresas → Usuarios con permisos por cuenta y acceso por empresa**
  (`core.empresa_usuarios` solo dice en qué empresas entra; roles y permisos directos son de la cuenta).
- Cada petición corre en `ejecutarEnEmpresa(...)`, que fija `app.empresa_id`,
  `app.usuario_id`, `app.alcance_total`, `app.alcance_para_asignar` y `app.sin_asignar_al_crear`
  en la transacción.
- **Aislamiento por empresa**: toda tabla de negocio lleva `empresa_id` y la
  política `politicaPorEmpresa()`. PostgreSQL oculta filas de otras empresas aunque
  el código olvide filtrar (probado en `aislamiento-empresas.prueba.ts`).
- **Superacceso** (soporte): puede entrar a cualquier empresa; cada entrada a una
  empresa ajena queda en `core.bitacora_superacceso`. El usuario de soporte de
  cada instalación se llama `supergod`.

### 3.4 Usuarios e inicio de sesión

- Se inicia sesión con **nombre de usuario** (no con correo). El correo es
  opcional y solo sirve para enviar informes.
- El nombre de usuario lleva **solo letras** (a–z, de 3 a 30), es único en todo
  el servidor y **se genera a partir del nombre**, en este orden:
  1. Inicial del primer nombre + primer apellido: Juan López → `jlopez`.
  2. Si existe: iniciales de ambos nombres + primer apellido + inicial del
     segundo: Anderson Magdiel Parada Alvizures → `amparadaa`.
  3. Si también existe: variantes con más letras (`amparadaalvizures`,
     `andersonparada`…). Si todas están ocupadas, se escribe a mano.
- Se ignoran tildes (la ñ se convierte en n) y partículas como "de", "del", "la" o "los".
- Nombres y apellidos se guardan por separado (`core.usuarios.nombres`, `.apellidos`).
- Un dueño no puede "adoptar" un usuario de otra cuenta escribiendo su nombre.
  Solo soporte, al dar de alta una cuenta, puede reutilizar un usuario existente
  como propietario.
- Código: `core/utilidades/nombre-usuario.ts` (con pruebas) y
  `core/servicios/nombre-usuario.servicio.ts`.

### 3.5 Permisos (tres niveles)

**Principio (decisión del usuario, 2026-09-29):** toda acción importante exige un
**permiso**; lo que decide es el permiso, nunca el nombre ni el tipo del rol. Un rol
solo es un conjunto de permisos (`core.rol_permisos`: rol + clave). Por recurso hay
cuatro permisos básicos (`<modulo>.<plural>.ver`, `.crear`, `.editar`, `.eliminar`;
inactivar y reactivar van con `editar`) y las acciones especiales llevan el suyo en la
misma tabla (`.aprobar`, `.rechazar`, `.anular`, `.autorizar`, `.emitir`, `.importar`,
`.exportar`, `.reabrir`…). El permiso `gestionar`, que juntaba crear, editar e
inactivar/eliminar, se reemplaza por `crear` + `editar` + `eliminar` con una migración
que se los da a los roles que tenían `gestionar` (nadie pierde nada). Ninguna regla
dice «solo roles de acceso total»: `soloAccesoTotal` se elimina y
`empresas.carga-inicial.reabrir` pasa a ser un permiso asignable como cualquier otro.
El **acceso total** de un rol solo significa «todos los permisos asignables», y
`soloSuperacceso` se mantiene para la configuración de la instalación (no es de la
cuenta).

1. **Pantalla / módulo**: p. ej. `bancos.cuentas.administrar`.
2. **Acción / botón**: p. ej. `bancos.pagos.registrar`, `bancos.cheques.emitir`.
   El servidor valida con `proteger({ permiso })` y el cliente oculta el botón con
   `v-permiso`.
3. **Datos (alcance por registro)**: qué registros concretos puede usar el
   usuario (p. ej. solo las cuentas bancarias 1 y 3).
   - El módulo declara `recursosConAlcance` con un `AlcanceDeRegistros` y protege
     sus tablas con las políticas RLS restrictivas de `core/base-datos/alcance.ts`.
   - Las asignaciones viven en la tabla `<esquema>.accesos_a_<plural>` del propio
     módulo (`core.accesos_datos` se eliminó; ver
     `docs/modulos/diseno-accesos-por-modulo.md`).
   - Con el permiso "ver todos" del recurso, o con un rol de acceso total, se
     ven todos los registros.
   - **Ventana de asignación:** quien tiene el `permisoAsignar` del recurso ve todos
     los registros **solo** en los casos de uso que arman su operador con
     `operadorParaAsignar` (fija `app.alcance_para_asignar`): abre la lectura de la
     tabla protegida y la escritura de su tabla de accesos, nunca cambiar ni eliminar
     registros. Importar desde Excel no asigna al que importa (`sinAsignarAlCrear`).
   - Tener acceso a los datos de una cuenta **no** da acceso a las pantallas de
     administración (eso es el nivel 1).
   - Probado en `alcance-datos.prueba.ts`.

Roles por cuenta; un usuario puede tener varios roles y además permisos directos
(`core.usuario_roles`, `core.usuario_permisos`): los permisos efectivos son la unión,
válida en todas las empresas donde es miembro (`core.empresa_usuarios`, que ya no lleva
rol). El rol con **acceso total** recibe también los permisos de módulos que se activen
después. Siempre debe quedar al menos un rol con acceso total.

**Regla para migraciones de permisos:** «quien tenía X recibe Y» se escribe para
`core.rol_permisos` **y** `core.usuario_permisos` (con `(cuenta_id, usuario_id)`), y un
permiso que se elimina se borra de las dos.

Un permiso puede declararse `soloSuperacceso: true` (ver `DefinicionPermiso`): es
configuración de servidor/instalación, así que **solo** lo recibe el superacceso
(soporte); ningún rol de cuenta lo recibe, ni siquiera uno con acceso total o al
que se lo hayan asignado a mano, y el catálogo de permisos asignables (API y
pantalla de roles) no lo ofrece. Es el caso de `configuracion.ver` y
`configuracion.gestionar` (sección 3.6): la configuración la ve y la cambia solo
soporte, no el rol Propietario.

### 3.6 Configuración por niveles

Para que un cliente (o un servidor dedicado) tenga un comportamiento distinto sin
afectar a los demás. Orden de prioridad (gana el más específico):

1. **Empresa** (base de datos)
2. **Cuenta** (base de datos)
3. **Instalación**: archivo JSON propio de cada servidor, fuera del repositorio.
4. **Valor por defecto** declarado por el módulo.

Cada módulo declara sus variables (clave, descripción, esquema Zod, valor por
defecto, niveles permitidos). Cuando el comportamiento cambia de verdad, el
módulo elige una estrategia según la variable (patrón Strategy).
**Estado:** implementado en el core (ver sección 5). El nivel de instalación
tiene dos fuentes: lo que soporte guarda desde el panel (en `core.configuraciones`,
con prioridad) y el archivo JSON del servidor.

### 3.7 Apariencia por instalación

Cada servidor puede tener su propia identidad, sin afectar a las cuentas:
nombre de la aplicación, **logo** y **colores del menú, encabezados e inicio de
sesión** (color principal y de acento). Botones, avisos y formularios conservan
su color para que la app se entienda igual en todas las instalaciones.

- Panel **Soporte → Apariencia** (solo superacceso): vista previa en vivo,
  paletas sugeridas, colores sugeridos a partir del logo y aviso si el acento no
  contrasta.
- El texto sobre el color principal se elige solo (blanco u oscuro) según el
  contraste WCAG.
- `GET /api/apariencia` es público para que la pantalla de inicio de sesión ya
  salga con la marca. El logo se guarda como PNG de 512 px en
  `almacenamiento/instalacion/`.
- El navegador guarda la última apariencia para aplicarla sin parpadeo.
- Límite conocido: el ícono de la app instalada (PWA) se genera al compilar desde
  `cliente/public/logo.svg`; para cambiarlo por instalación hay que reemplazar
  ese archivo y recompilar la imagen.

### 3.8 Patrones (guía: refactoring.guru)

| Necesidad                                                                     | Patrón                   | Dónde                                     |
| ----------------------------------------------------------------------------- | ------------------------ | ----------------------------------------- |
| Verificación de cada petición (sesión → empresa → módulo → permiso)           | Chain of Responsibility  | `core/http/guardias.ts`                   |
| Alta de un suscriptor (cuenta + empresa + rol + usuario + módulos)            | Facade                   | `core/servicios/alta-cuenta.servicio.ts`  |
| Dónde se guardan los archivos (disco hoy, S3/R2 mañana)                       | Strategy                 | `core/almacenamiento/almacenamiento.ts`   |
| Comunicación entre módulos, después de confirmar                              | Observer                 | `core/eventos/bus-eventos.ts`             |
| Comunicación entre módulos, dentro de la misma transacción (órdenes y avisos) | Mediator                 | `core/mediador`                           |
| Registro único de módulos                                                     | Singleton                | `core/modulos-sistema/registro-global.ts` |
| Estados (siembra, animal, préstamo, tarea)                                    | State                    | pendiente                                 |
| Frecuencia de recordatorios                                                   | Strategy                 | pendiente                                 |
| Canales de notificación (push, correo, WhatsApp) y certificadores FEL         | Factory Method + Adapter | pendiente                                 |
| Reportes de rentabilidad                                                      | Template Method          | pendiente                                 |
| Terrenos (finca → potrero → parcela)                                          | Composite                | pendiente                                 |
| Duplicar siembra o plan sanitario                                             | Prototype                | pendiente                                 |

### 3.9 Convenciones de código

- Todo en español: nombres, mensajes y documentación.
- TSDoc en funciones públicas; sin comentarios que no aporten.
- Controladores delgados; reglas en servicios; SQL en repositorios.
- Validación de entrada con Zod en `validaciones/`.
- Respuestas de error uniformes: `{ error: { codigo, mensaje, detalles } }`.

## 4. Estado de los módulos

| Módulo                                      | Estado                   | Notas                                                   |
| ------------------------------------------- | ------------------------ | ------------------------------------------------------- |
| **core**                                    | En construcción (fase 1) | Ver sección 5                                           |
| **empresas**                                | En construcción (fase 1) | Datos generales de ranchos y parcelas. Esencial.        |
| **terceros** (se muestra como **Clientes**) | En arquitectura limpia   | Clientes y proveedores; ver `docs/modulos/terceros.md`. |
| Resto                                       | **Por planificar**       | Ver sección 6. No se programa nada hasta acordarlo.     |

## 5. Fase 1 — Core (en curso)

Hecho:

- [x] Estructura del monorepo (servidor + cliente), PostgreSQL en Docker.
- [x] Esquema `core`: cuentas, módulos por cuenta, usuarios, sesiones, roles,
      permisos por rol, empresas, accesos usuario-empresa, monedas (GTQ, USD),
      archivos, accesos a datos, bitácora de superacceso.
- [x] Migraciones por módulo y esquemas por módulo.
- [x] Sesión con cookie HttpOnly (token aleatorio; en la base solo su hash SHA-256),
      contraseñas con Argon2id, límite de intentos de inicio de sesión.
- [x] Guardias por petición, verificación de origen (CSRF), cabeceras de seguridad.
- [x] RLS por empresa y alcance por registro, con pruebas contra PostgreSQL.
- [x] Registro de módulos con dependencias.
- [x] Plataforma (superacceso): alta de cuentas, activar o desactivar módulos, bitácora.
- [x] Usuarios y roles de la cuenta.
- [x] Subida de imágenes: se reducen y se convierten a WebP, con miniatura.
- [x] Validación de NIT guatemalteco (dígito verificador).
- [x] Empresas: listar, crear, editar (solo las que el usuario tiene asignadas).
- [x] Configuración por niveles: tabla `core.configuraciones`, archivo de
      instalación validado al arrancar, API y pantalla. Variables del core:
      `core.interfaz.nombre_aplicacion` y `core.regional.zona_horaria`.
- [x] Frontend del core: inicio de sesión, elegir empresa, menú según módulos y
      permisos, directiva `v-permiso`, empresas, usuarios, roles, configuración,
      plataforma (cuentas, módulos, bitácora). Modo claro y oscuro, adaptado a celular.
- [x] PWA instalable: manifiesto, íconos generados desde `cliente/public/logo.svg`,
      service worker que solo guarda la estructura de la app.
- [x] Docker de producción (Caddy + app + PostgreSQL + respaldo diario), probado:
      la app usa unos 72 MB de RAM. El tope de **20 MB por solicitud** (toda la instalación) está en
      `infra/Caddyfile` (`request_body { max_size 20MB }`); al pasarse responde 413 con el mensaje en el formato de la API.
- [x] `CLAUDE.md` del proyecto.
- [x] `app.cuenta_id` en `ejecutarEnEmpresa` (se fija junto a `app.empresa_id`, a partir
      de `cuentaId` en `ContextoEmpresa`) y `politicaPorCuenta()` en `columnas.ts`, para
      tablas compartidas por todas las empresas de una cuenta (usado por `terceros`).
- [x] Catálogo de departamentos y municipios de Guatemala (`core.departamentos`,
      `core.municipios`, códigos oficiales del INE) con rutas de solo lectura
      `GET /api/geografia/departamentos` y `GET /api/geografia/departamentos/:codigo/municipios`.
- [x] Validación de DPI (CUI) guatemalteco (`core/utilidades/dpi.ts`, `dpiOpcional`
      en `validaciones/comunes`), junto a la de NIT.

Pendiente en esta fase:

- [ ] Guía de instalación paso a paso en un VPS (`docs/INSTALACION.md`).
- [ ] Lint y formato (ESLint + Prettier).
- [ ] Pruebas de API de las rutas del core (inyección con `app.inject`).
- [ ] Cambio de contraseña propia y perfil del usuario.
- [ ] Revisar con el usuario: roles sugeridos de fábrica, datos de la empresa para
      la FEL, política de contraseñas.

### Respaldos y copia fuera del servidor

El contenedor `respaldo` (`infra/respaldo.sh`) hace cada día un `pg_dump` y un
`tar.gz` de las fotos en `infra/respaldos/`:

- **Diarios**: se conservan `DIAS_RETENCION` días (14 por omisión).
- **Mensuales**: el respaldo del día 1 de cada mes (si ese día no se hizo, el primero
  del mes) se copia a `infra/respaldos/mensuales/` y se conserva
  `MESES_RETENCION_MENSUAL` meses (60 = 5 años, por omisión). Sirven para recuperarse
  de un desastre y como evidencia histórica; la auditoría de la app se conserva
  además 60 meses como mínimo en la base (`core.depurar_auditoria`), salvo los recursos de
  `core.recursos_de_auditoria_permanente`, que se conservan mientras exista la empresa.

Ambas variables van en `infra/.env` (ver `infra/.env.ejemplo`). **Un respaldo que solo
está en el servidor no sirve si el servidor se pierde**, así que los archivos deben
copiarse fuera. Lo mínimo es copiar `mensuales/` cada mes (los diarios, si se puede):

1. **Otro servidor de la red o VPS**, con `rsync` desde una tarea programada (cron)
   del anfitrión: `rsync -a --ignore-existing /ruta/infra/respaldos/mensuales/ usuario@otro-servidor:/copias/arrancar/`.
   Sin `--delete`, para que la copia externa conserve lo que el servidor ya depuró.
2. **Un disco externo o una carpeta de red** en la oficina: mismo `rsync` hacia el
   punto de montaje, o copiar la carpeta a mano cada mes.
3. **Un drive en la nube** (S3/R2, Drive, etc.) con `rclone copy /ruta/infra/respaldos/mensuales remoto:arrancar`
   desde cron; desde ahí el usuario los descarga y los graba en disco.

Cada cierto tiempo hay que **probar una restauración**
(`pg_restore -d <base> archivo.dump`) y comprobar que la copia externa abre.
La ubicación elegida por cliente queda pendiente de decidir con el usuario.

**Antes de restaurar una base más vieja que los archivos**, apague la limpieza de archivos
sueltos (`DEPURAR_HUERFANOS=false` y reinicie la app): una base vieja no conoce los archivos
nuevos y la tarea diaria los tomaría por huérfanos y los borraría. Vuelva a encenderla cuando
la restauración haya terminado y los archivos y la base coincidan.

## 6. Ideas por planificar (no programar todavía)

**Orden y detalle actualizados en `docs/HOJA-DE-RUTA.md`** (2026-09-28). Cómo quedó la
última sesión y qué sigue: `docs/DONDE-QUEDAMOS.md`.

Notas recogidas en las conversaciones. Cada módulo se planifica en detalle antes
de programarlo.

- **Moneda extranjera**: habilita monedas distintas de la base y los tipos de
  cambio. Sin él todo funciona en GTQ.
- **Bancos**: catálogo de bancos (Banrural, BI, G&T…); un banco puede tener varias
  cuentas con distinta moneda (las cuentas en USD requieren _Moneda extranjera_).
  Alcance por usuario sobre las cuentas.
- **Caja chica**, **Cuentas por pagar**, **Cuentas por cobrar**, **Anticipos por
  liquidar**: módulos separados que dependen de _Bancos_. Segregación de funciones
  (registrar, aprobar y pagar) y permisos por botón (pagar, emitir cheque, emitir nota).
- **Contabilidad** (futuro): guarda sus propios enlaces (cuenta bancaria → cuenta
  contable) y genera partidas escuchando eventos de bancos.
- **Ganado**: identificación por arete numerado; **fierro por empresa** (tabla del
  módulo ganado, puede haber varios); vacas de cría y de ordeño; reproducción, ordeño,
  pesajes, sanidad y **planes de levante** (lotes con meta de peso y GDP). Aporta su
  sección a la ficha de la empresa solo si está activo.
- **Siembras**: cualquier cultivo (tabaco, milpa…), presupuesto de inversión,
  gastos, labores, cosecha y rentabilidad.
- **Planilla**: informal por ahora (jornales), preparada para prestaciones de
  Guatemala (bono incentivo, aguinaldo, bono 14, IGSS).
- **Inventario**: consumibles con lote y vencimiento (alertas y gráficas; aviso
  por correo o WhatsApp) y **activos** que se **prestan** (motosierra, tractor) a
  empleados, amigos o clientes, y que también se pueden **vender**.
- **Maquinaria**: mantenimientos, horómetro, combustible.
- **Caja / ventas**: vende cosechas, ganado, inventario y maquinaria. Facturación
  electrónica FEL mediante un certificador autorizado (adaptador por certificador);
  evaluar si la SAT permite certificar directamente desde un sistema propio.
- **Tareas y recordatorios**: panel del día (agua, comida, plan veterinario);
  al principio solo para dueños; después delegar tareas a trabajadores.

## 7. Desarrollo local

Desde una terminal de WSL (Ubuntu 22.04):

```bash
cd ~/proyectos/arrancar
cp .env.ejemplo .env                    # solo la primera vez
npm install                             # solo la primera vez o si cambian dependencias
npm run bd:levantar                     # PostgreSQL en Docker (puerto 5433)
npm run bd:migrar -w servidor           # cuando haya migraciones nuevas
npm run bd:sembrar -w servidor -- --demo  # solo la primera vez
npm run dev                             # levanta API (:3100) y PWA (:5180); Ctrl+C para detener
```

Abrir http://localhost:5180 en el navegador de Windows. Documentación de la API:
http://localhost:3100/api/documentacion. Pruebas: `npm run probar`.

Usuarios de desarrollo: `supergod` (superacceso, contraseña en `.env`)
y `demo` / `demo-arrancar`.

## 8. Bitácora

- **2026-09-26**:
  - Se acuerdan las tecnologías (Node + Fastify + PostgreSQL + Vue PWA + Docker) y
    la arquitectura modular.
  - Esquema de PostgreSQL por módulo, migraciones por módulo y permisos en tres
    niveles, con el alcance de datos aplicado por RLS.
  - Configuración por niveles.
  - El fierro pasa al futuro módulo de ganado.
  - Se retira el módulo de terceros hasta planificarlo.
  - Se construye el core.
  - Apariencia por instalación: panel de soporte con nombre, logo y colores del
    menú y encabezados. El nombre de la app pasa a ser solo por instalación.
  - `npm run dev` levanta todo con un solo comando.
  - Inicio de sesión con nombre de usuario (solo letras, generado a partir del
    nombre); el correo pasa a ser opcional. Nombres y apellidos se guardan por
    separado. El usuario de soporte se llama `supergod`. Migraciones `0003` y
    `0004` del core. Mensajes de validación en español.
  - Se planifica el módulo de terceros (`docs/modulos/terceros.md`): por cuenta,
    papeles cliente, proveedor y trabajador; solo el nombre es obligatorio;
    clases de cliente directo, intermediario, empresa y subasta. Requiere
    `politicaPorCuenta()`, departamentos y municipios y validación de DPI en el core.
  - Se programa el módulo de terceros siguiendo el plan aprobado:
    - Core: `app.cuenta_id` en `ejecutarEnEmpresa` y `politicaPorCuenta()` en
      `columnas.ts` (análoga a `politicaPorEmpresa()`); catálogo de los 22
      departamentos y 340 municipios de Guatemala (`core.departamentos`,
      `core.municipios`, migración `0005`/`0006`) con rutas de solo lectura;
      validación de DPI (CUI) en `core/utilidades/dpi.ts` con su prueba, y
      `dpiOpcional` en `validaciones/comunes`.
    - Terceros (esquema `terceros`, migraciones `0000`/`0001`, `dependeDe: []`,
      no esencial): tablas `terceros`, `contactos`, `clientes`, `proveedores`,
      `categorias_proveedor` y `trabajadores`, todas con `cuenta_id` y
      `politicaPorCuenta()`; búsqueda por nombre/NIT/DPI/teléfono con `pg_trgm`
      sobre `nombre_mostrar` (índice GIN); aviso de posibles duplicados (mismo
      NIT, mismo DPI o nombre parecido, `similarity() > 0.5`) al crear o editar,
      con confirmación explícita (`confirmarDuplicado`) para guardar de todas
      formas; inactivar un tercero inactiva también sus papeles; DPI y teléfono
      del papel trabajador ocultos a quien no tiene `trabajadores.ver`. Prueba
      de integración de aislamiento entre cuentas
      (`terceros/aislamiento-cuentas.prueba.ts`).
    - Cliente: listado con búsqueda y filtros por papel y estado, ficha con
      datos generales, contactos y una pestaña por papel, y ventana de alta
      rápida reutilizable (`AltaRapidaTercero.vue`).
    - Decisiones no detalladas en el plan original: los códigos INE de
      departamento/municipio se tomaron de fuentes públicas (INE, Wikipedia)
      cruzadas para llegar a los 340 municipios vigentes; no se pudo verificar
      contra la tabla oficial del INE dentro de esta sesión, así que conviene
      revisarlos antes de depender de ellos para validar DPI reales en
      producción. Los campos `tipo`, `clase` de cliente y `categoría` de
      proveedor se validan con Zod (no con `CHECK` en la base de datos), igual
      que el resto de catálogos de texto libre del proyecto. El aviso de
      duplicados se implementó como `ErrorConflicto` (409) con la lista de
      posibles duplicados en `detalles`, en vez de un endpoint aparte.
  - Se aprueba la arquitectura limpia por módulo (dominio, aplicación,
    infraestructura, http) con POO e inyección por constructor, y el plan de
    refactor en fases (`docs/ARQUITECTURA.md`).
  - Fases 0 a 4 del refactor hechas (`docs/ARQUITECTURA.md`, sección "Avance"):
    pruebas de caracterización de la API, ESLint y Prettier con reglas de capas,
    núcleo compartido, y los módulos `empresas` y `terceros` migrados.
  - `terceros` se muestra como **Clientes**; el papel de trabajador sale del
    módulo y pasa al futuro módulo de planilla. Teléfonos y correos se guardan
    normalizados (empresas, terceros y contactos). El menú de cada módulo se
    organiza en **Operación**, **Administración** y **Reportes**.
  - Fases 5 a 8 hechas: core del servidor y del cliente con la arquitectura,
    generador de código (`npm run generar`) y cierre con las reglas de tamaño
    como error. **El refactor terminó**; lo siguiente es planificar los módulos
    de negocio. Pendiente a decidir entonces: en qué moneda está cada monto
    (existe `core.monedas`, pero el tipo `dinero` no apunta a ella).
- **2026-09-28**: B6 del módulo de bancos (`docs/modulos/bancos.md`, sección
  "B6 Separación de Movimientos"): la pantalla Movimientos, que mezclaba
  captura y consulta, se separa en **Notas** y **Transferencias** (operación,
  sin Excel, cada una con su pantalla y sus permisos propios), **Movimientos**
  (queda como reporte en Reportes: solo consulta, imprime y exporta con
  filtros) y **Saldo inicial** (se registra, corrige, anula, importa y
  exporta desde la ficha de la cuenta y la lista de cuentas, en
  Administración). Nuevos permisos con migración de datos que traduce los de
  los roles existentes; el core de intercambio (`core/intercambio`) gana un
  filtro opcional al exportar, reutilizable por cualquier reporte futuro.
  Commits `B6a` (servidor) y `B6b` (cliente y documentación).
- **2026-09-28**: La configuración (cuenta/empresa/instalación) pasa a verla y
  cambiarla solo el superacceso (soporte); ni el rol Propietario (acceso total)
  ni ningún otro rol, aunque se les asigne el permiso. Se agrega la marca
  `soloSuperacceso` a `DefinicionPermiso` (sección 3.5) y se pone en
  `configuracion.ver` y `configuracion.gestionar`: `ResolutorDeAcceso` ya no se
  los da a un rol con acceso total salvo al de soporte, y `CatalogoDePermisos`
  (API `/api/permisos` y la pantalla de roles) deja de ofrecerlos y rechaza
  asignarlos (`PermisoDesconocido`, 400). Migración de datos `0010` que borra
  esas claves de `core.rol_permisos`. El menú ya ocultaba "Configuración" a
  quien no tuviera el permiso, sin cambios en el cliente.
- **2026-09-28**: L0 del módulo `libro-de-compras` (`docs/modulos/libro-de-compras.md`):
  mediador entre módulos (patrón Mediator), solo el core, sin que ningún módulo de
  negocio lo use todavía. `core/mediador` (`Mediador` en `aplicacion/`, con
  `atender`/`enviar` para órdenes y `escuchar`/`avisar` para avisos) y
  `core/contratos/mediador.contratos.ts` con los mapas ampliables
  `OrdenesEntreModulos` y `AvisosEntreModulos` (como `EventosDominio` del bus).
  Antes de llamar a un manejador, el mediador comprueba con el puerto
  `ModulosActivosDeLaCuenta` que su módulo esté activo en la cuenta del operador
  (`ModuloNoDisponible` si no, o si nadie atiende la orden); su implementación
  (`infraestructura/modulos-activos-de-la-cuenta-en-registro.ts`) reutiliza
  `CatalogoDeModulos` y `RepositorioCuentas` de `cuentas` (import directo entre
  contextos del core, como ya hacían identidad/autorización/bitácora). Instancia
  única en `core/mediador/contexto.ts`. La unión de una unidad de trabajo anidada
  a la transacción en curso ya existía (`UnidadDeTrabajoPostgres`, fase 2 del
  refactor) y no necesitó cambios; se agregó una prueba de integración que la
  ejercita a través del mediador. ESLint ya permitía importar todo `core` desde
  cualquier módulo (`no-restricted-imports` solo prohíbe otros módulos de
  negocio), así que `core/contratos` y `core/mediador` no necesitaron una regla
  nueva; se comprobó con un archivo temporal que la prohibición entre módulos de
  negocio sigue funcionando. 13 pruebas nuevas (8 unitarias con dobles en memoria
  y 5 de integración contra PostgreSQL real, incluida la transacción anidada y el
  deshacer completo si una orden falla o un aviso es rechazado).
- 2026-09-28 (cierre): se recogen con el usuario los agregados de Cuentas por
  pagar (saldos iniciales, reportes), Bancos (aprobaciones, solicitudes, formato
  de cheques, saldos iniciales con notas y cheques, tarjeta de crédito, reportes,
  diferencial cambiario), Empresas (localidades, departamentos y accesos) y
  Multimoneda en `docs/HOJA-DE-RUTA.md`. El B7 quedó a medias en una rama y
  se terminó después (ver la entrada siguiente y `docs/DONDE-QUEDAMOS.md`).
- **2026-09-28** (B7): Bancos deja de sacar del saldo lo que se anula; anular crea el
  **movimiento inverso** enlazado y **eliminar** borra solo lo limpio
  (`docs/modulos/bancos.md`, sección B7). Notas y transferencias se anulan con la fecha
  que escribe el usuario (`bancos.anulaciones.misma_fecha` decide si se usa la del
  original mientras su mes esté abierto); un cheque de un mes abierto se anula sin
  inverso y fuera del saldo, y el de un mes conciliado con una nota de crédito inversa;
  **blanquear** devuelve un cheque emitido por error a disponible y elimina su
  movimiento. Permisos nuevos `bancos.notas.eliminar`, `bancos.transferencias.eliminar`
  y `bancos.cheques.blanquear`; el saldo inicial ya no se anula, se elimina si la cuenta
  nunca se concilió. En la conciliación, un original y su inverso que nunca pasaron por
  el banco arrancan marcados juntos. Los DTO informan `puedeAnular`, `puedeEliminar` y
  `puedeBlanquear` (reglas en `aplicacion/acciones-posibles.ts`). La migración `0011`
  convierte los anulados existentes en pares sin cambiar el saldo de ninguna cuenta
  (verificado en la base de desarrollo). Un inverso tampoco se corrige. Commits `B7a`
  (servidor) y `B7b` (cliente); la documentación va en el commit siguiente.
- **H5b pasos 1 y 2 (2026-09-29).** Alcance nuevo en el core (`alcance.ts`, disparador
  `core.asignar_registro_al_creador`, `core.accesos_datos` eliminada con su guarda, 42501 →
  no encontrado, acciones `asignar` y `quitar`) y excepción de ESLint del módulo base
  `empresas`. Detalle en `docs/modulos/diseno-accesos-por-modulo.md`.
- **2026-09-29**: Principio de permisos (sección 3.5): toda acción importante exige un
  permiso, sin importar el rol. `gestionar` se separa en `crear`, `editar` (incluye
  inactivar y reactivar) y `eliminar`, con migración de los roles existentes; las
  acciones especiales (aprobar, rechazar, anular…) siguen con permiso propio en
  `core.rol_permisos`. Se elimina `soloAccesoTotal`: `empresas.carga-inicial.reabrir`
  se vuelve asignable.
- **2026-09-29**: Llaves foráneas entre esquemas de módulos (sección 3.2): se permiten
  hacia los módulos de `dependeDe` (todas las tablas existen en toda instalación). La
  excepción de ESLint del módulo base `empresas` se generaliza a los `*.tablas.js` de
  cualquier módulo, solo desde `infraestructura/`, con una prueba que revisa que cada
  llave entre esquemas apunte a `core` o a un módulo de `dependeDe`.
- **2026-09-29 (implementación de los dos acuerdos anteriores)**: `gestionar` reemplazado por
  `crear`/`editar`/`eliminar` en core (usuarios, roles), empresas (empresas, tipos de localidad),
  terceros (terceros, clientes, proveedores) y bancos (bancos, cuentas, notas, transferencias,
  saldos iniciales, chequeras, conceptos); rutas, cliente y generador con las claves nuevas
  (`TarjetaDeRegistro` acepta `permisoEliminar`). Una migración de datos por módulo
  (`core 0015`, `empresas 0005`, `terceros 0005`, `bancos 0023`, todas `*_permisos_por_accion`),
  en cada módulo y no solo en core para que corra después de las migraciones anteriores del mismo
  módulo que aún asignan `gestionar` (el core se migra primero). `notas.eliminar` y
  `transferencias.eliminar`, que ya existían, no se reparten. `soloAccesoTotal` eliminado
  (`empresas.carga-inicial.reabrir` es asignable). Plantilla `usar<Plural>` del generador partida
  en dos funciones (cumple las 25 líneas sin `SIN_REGISTROS` parchado). ESLint: `MODULOS_BASE`
  pasa a `MODULOS_ESENCIALES` y todo módulo puede importar los `*.tablas.js` de otro desde su
  infraestructura; prueba `llaves-entre-esquemas.prueba.ts` sobre `pg_constraint`.
- **2026-09-29 (permisos por usuario, P1 y P2 del servidor)**: `docs/modulos/diseno-permisos-por-usuario.md`
  con las respuestas del usuario. Roles y permisos pasan de la empresa a la cuenta: tablas
  `core.usuario_roles` y `core.usuario_permisos` (sin RLS, fk compuesta `(rol_id, cuenta_id)`),
  migraciones `core 0016` (tablas y `rol_id` nulable) y `0017` (unión de roles, auditoría de quien
  tenía roles distintos, permiso `usuarios.asignar-permisos` para quien tenía `usuarios.crear` o
  `editar`). Resolutor con `permisosEfectivos` (unión de roles y directos, módulos activos, sin
  `soloSuperacceso`); la sesión trae `roles: string[]`. API: `empresaIds` en crear y editar usuario
  (`rolIds` y `permisos` opcionales al crear, solo con el permiso propio), `GET`/`PUT
/usuarios/:id/permisos` con el origen de cada permiso; quien tiene el permiso da cualquier permiso
  asignable, sin mínimo de acceso total. Se auditan roles, permisos directos y empresas de un usuario,
  y los permisos de un rol (`core.roles-de-usuario`, `core.permisos-de-usuario`,
  `core.empresas-de-usuario`, `core.permisos-de-rol`). P3 (cliente) hecho después.
- **2026-09-29 (permisos por usuario P4 y alcance «para asignar» L1)**: migración `core 0018` quita
  `core.empresa_usuarios.rol_id` (con guarda: aborta si algún rol de empresa no está en
  `usuario_roles`) y el código que lo leía. L1: `DefinicionRecursoConAlcance.permisoAsignar`,
  `RegistroModulos.recursosParaAsignar`, `recursosParaAsignar` en la sesión y `ContextoEmpresa`
  (vacío por omisión), `operadorParaAsignar` (`core/compartido/http`, lanza `AccesoDenegado` sin el
  permiso), variable `app.alcance_para_asignar`. Políticas de `alcance.ts`: `select` de la tabla
  protegida abierto en la ventana; la tabla de accesos solo se escribe en la ventana
  (`asignar/cambiar/quitar_para_asignar`), ya no por «lo que ve» ni por alcance total; cambiar y
  eliminar registros siguen cerrados. Migración `core 0019` hace que el disparador
  `core.asignar_registro_al_creador` respete `app.sin_asignar_al_crear` (`ContextoEmpresa.sinAsignarAlCrear`,
  para la importación de Excel del paso 5). Ver `docs/modulos/diseno-permisos-por-usuario.md`.

- **2026-09-29 (H5b/H5c cerrados, pasos 10 y 11).** Cliente de departamentos: selector opcional de
  localidad, eliminar con confirmación (409 en uso), aviso de código o nombre repetido, código en
  mayúsculas. Localidades muestran el nombre de departamento y municipio. Diseño cerrado en
  `docs/modulos/diseno-accesos-por-modulo.md` §17.

- **2026-09-29 (X1 y F1 de `docs/modulos/plan-archivos-y-h2.md`).** Excel: una fórmula sin valor
  calculado o con error se informa en su celda (`CeldaConProblema`). Fotos: el formato se decide por
  el contenido (solo JPEG, PNG y WebP; HEIC por su cabecera `ftyp` o compresión `hevc`, con la ayuda
  para convertirla), 100 MP (`LIMITE_DE_PIXELES`, también en el logo), una sola lectura con `clone()`,
  `Semaforo` de 2 trabajos, `sharp.concurrency(1)` y 30 subidas por minuto por usuario (429
  `demasiadas_subidas`). Se queda `failOn: 'error'`: no hubo 10 fotos reales de Android e iPhone
  para probar `'warning'`. El `accept` del cliente ya no ofrecía HEIC, AVIF ni GIF.

- **2026-09-29 (Libro de compras L1-5 y L1-6, cliente).** `SeccionesAportadas` en la ventana de
  Empresas (con `secciones` en el guardado) y en el formulario de Proveedores (solo cuando es o será
  proveedor y el usuario puede gestionar el papel); `SeccionesEnLaFicha` en la ficha del proveedor. El
  cliente de `libro-de-compras` aporta las secciones fiscales de empresa y proveedor (formulario y ficha)
  sin menú; la lógica de los valores por omisión y de lo que se propone según el régimen está en
  `composables/datos-fiscales-de-*.ts` con pruebas; si falla la lectura de lo guardado, la sección no se
  envía (no pisa datos). Pruebas: servidor 1286, cliente 343, generador 46.

- **2026-09-29 (Libro de compras L2-1 y L2-3, servidor).** Conceptos de gasto (catálogo por empresa, baja
  por inactivar con auditoría, `check` de activo fijo implica bien, permisos `ver/crear/editar/importar/exportar`,
  Excel) y Combustibles (catálogo, inactivar) con Vigencias de combustible (catálogo, baja `eliminar`).
  Migraciones `0002`, `0003` y `0004` (esta última `--custom`: `btree_gist` y la exclusión
  `vigencias_de_combustible_sin_traslape`). `interpretarErrorDePostgres` mapea `23P01` a `422 traslape`.
  Una vigencia nueva cierra la abierta el día anterior con el combustible bloqueado (`for update`); cambiar
  tasa, etanol o fechas se audita como `corregir`; `enUso` queda listo para L3 (hoy devuelve `null`).
  El generador de recursos no se tocó. Sin sembrar conceptos sugeridos (pendiente). Cliente de L2 (L2-2 y L2-4)
  sale del generador y está sin pulir. Pruebas: ver el commit.

- **2026-09-29 (Libro de compras L2-2 y L2-4, cliente).** Conceptos de gasto en Administración: etiquetas
  «Tipo por omisión», «Producto agropecuario» y «Activo fijo»; al marcar activo fijo el tipo pasa a Bien y se
  bloquea con su explicación; inactivar y reactivar con confirmación (`composables/comunes/`, compartido con
  Combustibles); estado vacío con acción; Excel. Combustibles con su historia de tasas: cada tarjeta muestra la
  tasa vigente y abre «Tasas de IDP» (IDP por galón, % de etanol, desde, hasta o «Vigente»), con registrar tasa
  nueva (avisa que cerrará la vigente el día anterior), corregir y eliminar con confirmación. Las vigencias
  **no tienen menú ni ruta propios**; su Excel (importar y exportar) está en la misma pantalla. Sin permiso de
  ver tasas no se piden ni se muestran. Pruebas: servidor 1391, cliente 368, generador 46.

- **2026-10-04 (Libro de compras, cierre de L2)**:
  - **Nombres únicos sin mayúsculas ni acentos** en conceptos de gasto y combustibles: los
    únicos de `nombre` pasan de `UNIQUE` a un índice sobre `core.nombre_normalizado(nombre)`,
    como Bancos y Empresas; migración `0005` con la guarda de duplicados.
  - **Semilla de conceptos de gasto sugeridos** (respuesta 11 del usuario): al abrir el
    catálogo vacío se siembra la lista sugerida (Combustibles, Insumos agrícolas, Alimento
    para ganado, Medicinas veterinarias, Reparaciones, Servicios profesionales, Energía
    eléctrica y Maquinaria y equipo como activo fijo), como los conceptos de Bancos (H3) y
    editable por el usuario. `SembrarConceptosDeGasto` en `ListarConceptosDeGasto`, con
    `hayAlguno` y `sembrar` en el repositorio. Pruebas: servidor 1393.

- **2026-10-04 (Libro de compras L3-1, servidor).** Tablas `documentos`, `lineas_de_documento` y `retenciones`
  (migraciones `0006_l3_documentos` y `0007_l3_documentos_nota_factura_fk`, esta última `--custom` porque
  drizzle-kit no escribe la llave autorreferente de la nota a su factura). Las restricciones de `documentos`
  viven en `documentos.restricciones.ts` (funciones por tema, por el tope de 25 líneas). Los tres únicos de
  documentos dan «Ese documento ya está registrado.». `documentos_del_proveedor_unico` lleva `empresa_id`:
  los desmarcados son únicos solo dentro de la empresa (respuesta 3). `RepositorioVigenciasDeCombustible.enUso`
  ya consulta las líneas: la fecha de emisión más reciente de los documentos vigentes que usan la vigencia;
  la FK sin acción impide eliminarla aunque el documento esté anulado. Pruebas de integración: RLS, cada
  `check`, llaves de la nota y del proveedor, unicidad entre empresas y cuentas. Pruebas: servidor 1475,
  cliente 368, generador 46.

- **2026-10-04 (Libro de compras L3-2, servidor, dominio).** Funciones puras en `libro-de-compras/dominio/`,
  todo en centavos enteros (con `bigint` en los productos intermedios): `calcularIdp` (exacto como el `check`
  `lineas_idp_calculado`), `calcularLineas` (IDP, gravado, IVA repartido por resto mayor con el IVA calculado
  sobre el total del documento, corrección de la FEL hasta Q0.05 en la línea de mayor gravado, IVA al costo),
  `totalesDelDocumento`, `determinarMotivoSinCredito`, el período (`periodoPropuesto`, `exigirPeriodoValido`,
  `esFueraDePlazo`, plazo del art. 20 de dos meses; la nota de crédito en su mes de recepción) y
  `calcularDocumento`, que las junta para `POST …/documentos/calcular` y `RegistrarDocumento` (L3-5). La
  configuración de la §8 (16 variables de instalación) está en `libro-de-compras/configuracion.ts`. `centavos.ts`
  se movió de Bancos a `core/compartido/dominio` (Bancos lo reexporta). Decisiones: la nota hereda el motivo de su
  factura, pero `fuera_de_plazo` (si la nota está reciente) y `exento` (si trae IVA) pasan a `no_vinculado` porque
  los `check` de §3.5 no aceptan otra cosa; el período propuesto es el mes de recepción. Sin tablas ni rutas.

- **2026-10-04 (Libro de compras L3-3, servidor, dominio).** Patrón Strategy en `libro-de-compras/dominio/`:
  `calcularRetenciones(entrada)` (`calculador-de-retenciones.ts`) recorre una estrategia por regla
  (`estrategias-de-retencion-de-iva.ts`, `estrategia-de-retencion-de-isr.ts`) y devuelve
  `{ impuesto, regla, base, porcentaje | null, montoPropuesto, origenDeLaFecha }` en centavos y centésimas;
  `configuracionDeRetenciones(valor)` convierte la configuración. Manda la validación del contador: mínimo del
  IVA de agentes `>=`, pequeño contribuyente `>` Q2,500.00, mínimo del ISR `>=` sobre `total − iva` (lo exento
  dentro), casilla SAT desmarcada y nota de crédito sin retenciones, IVA al costo también se retiene. Variable
  nueva de empresa `libro-de-compras.retenciones_isr.incluye_idp` (`true`). ISR por escalones redondeado una sola
  vez. Sin tablas ni rutas.
- **2026-10-04 (Libro de compras L3-2, ajustes del contador, servidor).** La nota de crédito hereda tal cual el
  motivo sin crédito de su factura (se quita `no_vinculado`; su antigüedad nunca le da motivo). Migración `0008`
  cambia `documentos_fuera_de_plazo_real` a `tipo = 'nota_de_credito' or …`. Nota con IVA contra factura
  `exento`: `NotaConIvaDeFacturaExenta`; Σ IVA de notas vigentes + la nueva `<=` IVA de la factura:
  `IvaDeNotasExcedeElDeLaFactura` (datos `ivaDeLaFactura` e `ivaRebajadoPorOtrasNotas`, los consulta L3-5).
  Tope de la corrección contra la FEL: `toleranciaDeIvaEnCentavos(líneas) = max(5, líneas)`. Avisos con
  `avisosDelPeriodo` (`mesActual` como dato): período anterior al mes actual y año de emisión anterior al del
  período, para todo documento. El período propuesto es el mes de recepción.

- **2026-10-04 · Cliente (terceros): secciones aportadas en la ventana del papel de proveedor.** `VentanaDePapel`
  (ficha del tercero) muestra, solo para proveedor, las secciones de los módulos activos (hoy «Datos fiscales»)
  bajo el papel, separadas por una línea; usa el id del proveedor si ya existe o `null`. Al guardar manda
  `secciones` (`seccionesParaEnviar`) y reparte los errores con prefijo `secciones.<módulo>.<campo>`.

- **2026-10-04 · Libro de compras L3-3, ajuste 4 del contador (servidor).** La retención del exportador al 65 % solo
  alcanza a la línea cuyo concepto es agropecuario **y** de tipo `bien`: `EntradaDeRetenciones.datosDeLineas`
  (`{ esProductoAgropecuario, tipo }` por línea, reemplaza a `lineasAgropecuarias: boolean[]`) y la función pura
  `esLineaAgropecuaria` (`retencion-propuesta.ts`) que usa la estrategia; una línea de servicio con concepto
  agropecuario retiene al 15 %. La semilla de conceptos deja «Insumos agrícolas», «Alimento para ganado» y
  «Medicinas veterinarias» con `esProductoAgropecuario = false` (industrializados); sin migración de datos.

- **2026-10-04 (Libro de compras L3-4, servidor).** Contratos del mediador: `libro-de-compras.contratos.ts` (órdenes
  `fechar_retencion`, `marcar_procesado`, `anular_documento`, `eliminar_documento`; avisos `documento_por_anular` y
  `documento_por_eliminar`; eventos del bus `documento_registrado`, `documento_anulado` y `documento_eliminado`;
  `DocumentoParaDestino` con el dinero en centavos) y `cuentas-por-pagar.contratos.ts` (solo
  `cuentas-por-pagar.recibir_documento`). Sus manejadores son de L3-5 y L3-6 y de CP1. Terceros atiende
  `terceros.completar_nit` (`CompletarNitDeProveedor`, el `proveedorId` es el id del papel): valida con `Nit`,
  rechaza CF, es idempotente con el mismo NIT, `ProveedorYaTieneOtroNit` si tiene otro y `NitYaRegistrado` si es de
  otro tercero de la cuenta. No se audita (no es baja ni corrección de dinero o fechas) ni publica eventos (correría
  antes de confirmar la transacción de quien llama). Pruebas: servidor 1488, cliente 368, generador 46.
- 2026-10-04 · Libro de compras (cliente), textos fiscales según el contador y el usuario: la casilla pasa a «Lleva
  contabilidad completa (agente de retención del ISR)», marcada por omisión, con ayuda (Decreto 10-2012, art. 47) y
  aviso no bloqueante al desmarcarla; el agente de retención del IVA aclara que lo califica la SAT; «Se le retiene el
  ISR» menciona «Sujeto a pago directo ISR»; «Producto agropecuario» explica qué cuenta como estado natural y que
  afecta el 65 % de los exportadores. Textos en `TEXTOS_FISCALES`.

- **2026-10-04 · Libro de compras L3-3, decisiones A1, B2 y A3 del usuario (servidor).** **A1:** la casilla «Se muestra
  en reportes SAT» solo se desmarca para documentos sin FEL a nombre de la empresa: columna
  `documentos.motivo_fuera_del_libro` (`sin_fel`, `fel_a_consumidor_final`, `fel_a_otro_nit`) y checks
  `muestra_segun_motivo`, `sin_fel_sin_autorizacion` y `fel_con_autorizacion`; la regla pura
  `evaluarFueraDelLibro` (`dominio/fuera-del-libro.ts`) da `FelAlNitDeLaEmpresaNoSeDesmarca` y
  `MotivoFueraDelLibroIncoherente`, y los avisos de gasto no deducible del ISR y de factura especial (Ley del IVA
  art. 52, persona individual sin NIT). **B2:** `es_agente_de_retencion_isr` vale `true` por omisión (tabla y
  `DatosFiscalesDeEmpresa.porOmision`). **A3:** la retención del 5 % a pequeño contribuyente se fecha con la
  recepción: `retenciones.fecha` es `not null`, sin `retenciones_por_fechar_idx` ni la orden `fechar_retencion`.
  Migración `0009` (con la reclasificación de filas existentes). Diseño actualizado (§3.1, 3.5, 3.7, 4.3, 7 y 13).

- **2026-10-04 · Libro de compras L3-5: registrar documentos (servidor).** Caso de uso `RegistrarDocumento` en una sola
  `UnidadDeTrabajo` (proveedor activo de la cuenta y NIT de la empresa; datos fiscales con `porOmision` si no hay fila;
  conceptos y vigencia de combustible a la fecha de emisión; factura de la nota con su IVA ya rebajado; `calcularDocumento`,
  `evaluarFueraDelLibro` y `calcularRetenciones` con la configuración de la empresa; ajustes de retenciones con
  motivo y auditoría `corregir`; búsqueda del repetido en la empresa; `terceros.completar_nit`; inserción;
  `<destino>.recibir_documento` por el mediador) y evento `libro-de-compras.documento_registrado` solo tras confirmar.
  La vista previa `POST …/documentos/calcular` comparte con él `PreparadorDeDocumento`. Rutas `POST /documentos/calcular`,
  `POST /documentos`, `GET /proveedores/:id/destino-sugerido` y `GET /destinos` (los cuatro con `documentos.crear`);
  permisos `documentos.ver`, `documentos.crear` y `retenciones.ajustar`. Decisiones: el tipo `recibo` se suma al contrato
  `DocumentoParaDestino`; el aviso de entero del ISR cuenta desde el mes de recepción; sin datos fiscales del proveedor se usan
  los valores por omisión con aviso (no se exigen); una FEL fuera del libro exige el NIT del receptor. Pruebas de API con
  un manejador falso de `cuentas-por-pagar.recibir_documento`.

- **2026-10-04 · Libro de compras L3-6: lista, ficha, anular y eliminar documentos (servidor).** Casos de uso
  `ListarDocumentos`, `ObtenerDocumento`, `AnularDocumento` (motivo de 1 a 300; aviso `documento_por_anular` antes de
  cambiar; estado `anulado` con fecha y usuario; libera el número por los índices parciales; auditoría `anular` con la
  ficha anterior; no se anula una factura con notas vigentes; evento `documento_anulado` tras confirmar),
  `EliminarDocumento` (solo lo vigente, sin procesar en el destino y sin notas; aviso `documento_por_eliminar`; auditoría
  `eliminar`; borrado en cascada; evento `documento_eliminado`) y `MarcarDocumentoProcesado`. Las tres órdenes
  (`marcar_procesado`, `anular_documento`, `eliminar_documento`) las atiende Libro de compras con esos mismos casos de
  uso; las dos bajas aceptan `origen` (el destino que pide no recibe su propio aviso). Rutas `GET /documentos` (filtros
  y paginación), `GET /documentos/:id`, `POST /documentos/:id/anular` y `DELETE /documentos/:id`; permisos nuevos
  `documentos.anular` y `documentos.eliminar`. La lista y la ficha informan `puedeAnular` y `puedeEliminar`. Decisiones:
  Bancos no pagina sus listas, así que la paginación (`pagina`, `limite`) es nueva; un documento anulado no se elimina;
  eliminar también revisa el período abierto. Pruebas de API con el destino falso (permisos, filtros, anular, eliminar,
  órdenes, auditoría, eventos tras confirmar y vigencia de combustible).
- **2026-10-05 · Calendario de feriados de Guatemala (core, servidor).** Contexto `core/calendario`. Los feriados fijos
  del Código de Trabajo art. 127 (1 de enero, 1 de mayo, 30 de junio, 15 de septiembre, 20 de octubre, 1 de noviembre,
  24 y 25 de diciembre, 31 de diciembre) y Jueves, Viernes y Sábado Santo (domingo de Pascua por Meeus/Jones/Butcher)
  **se calculan** (`dominio/feriados-calculados.ts`) y no se guardan; la tabla `core.feriados` (migración 0022; sin
  empresa ni cuenta, única por fecha) guarda solo los **asuetos** que soporte carga cuando la SAT o el gobierno los
  declaran (`origen` `asueto_sat`). `CalendarioLaboral` (`esHabil`, `sumarDiasHabiles`, `diaHabilNumero`) cuenta de
  lunes a viernes sin feriados ni asuetos; los medios días (24 y 31 de diciembre) cuentan como hábiles. Guarda en
  memoria las fechas no hábiles de cada año y las renueva al agregar o quitar un asueto; se obtiene de
  `core/calendario/contexto.ts` (`calendarioLaboral`). API: `GET /api/feriados?anio=` (cualquier sesión),
  `POST /api/feriados` y `DELETE /api/feriados/:id` con los permisos `configuracion.feriados.crear` y
  `configuracion.feriados.eliminar` (solo superacceso; por acción, como pide §3.5, en vez de `gestionar`). Quitar un
  asueto se audita. **Pendiente:** la pantalla en el panel de Soporte, y conectar el puerto de días hábiles en
  libro-de-compras. **Dudas legales** (no implementadas): el 15 de agosto (solo municipio de Guatemala) y el posible
  traslado de feriados que reformas recientes al art. 127 permitirían por acuerdo; no se verificó el texto vigente.

- **2026-10-05 · Libro de compras, ajustes de L3-5 y L3-6 (servidor).** Se aplican las decisiones del usuario sobre
  el veredicto del contador (`validacion-h7-h11-retenciones.md`, secciones de L3-5 y L3-6); el diseño
  (`diseno-datos-libro-de-compras.md`, secciones 4 y 5 y la nota de los pasos 15 y 16) quedó al día.
  - **Entero:** el plazo se cuenta siempre desde `retencion.fecha` (recepción en el IVA, fecha de la factura en el
    ISR, Decreto 10-2012 art. 48); se quitan `fechaBaseDelEntero` y `ContextoDeEntero.fechaDeRecepcion`. Los días
    hábiles van detrás del puerto `CalendarioLaboral.esHabil(fecha)` (`dominio/calendario-laboral.ts`, implementación
    `CalendarioDeLunesAViernes`; la tabla de feriados de `core` se conectará después).
  - **Avisos:** retención quitada **o rebajada** (Código Tributario art. 29 y Decreto 10-2012 art. 22); no domiciliado
    (ISR de no residentes); nota tardía de fecha a fecha; FEL a consumidor final de Q2,500.00 o más; cambio de
    régimen confirmado. Se quita el aviso de «proveedor sin datos».
  - **Proveedor sin datos fiscales (opción C):** `datosFiscalesDelProveedor { regimenIsr, esAgenteDeRetencionIva }`
    obligatorio en una factura del libro si la empresa es agente y no hay fila (error 422
    `faltan_datos_fiscales_del_proveedor` con `detalles.preguntas`, también al calcular); se guarda con el documento
    (`GuardarDatosFiscalesDeProveedor`, con su auditoría); la factura de pequeño contribuyente lo deduce de su tipo.
  - **Receptor:** `nitReceptor` acepta NIT o CUI; `sin_fel` lo deja `null`. **Cambio de régimen:**
    `confirmarCambioDeRegimen` deja pasar la factura con aviso y auditoría `corregir`.
  - **Bajas:** `causa_de_anulacion` (migración `0010`, con check y `documentos_anulacion_completa` ajustado; los
    anulados que ya existían quedan como `error_de_captura`); anular recibe `{ causa, motivo }`, responde
    `{ documento, avisos }` y audita `"<causa>: <motivo>"`; la orden `anular_documento` lleva `causa`. Anular y eliminar
    avisan si el período es anterior al mes actual; **eliminar responde 200 `{ avisos }`** (antes 204), para que las dos
    bajas avisen igual. La lista usa `estado=vigente` por omisión (`anulado` o `todos` para ver los demás).
  - **Retención doble:** al calcular y registrar se busca un anulado con la misma FEL (o NIT, tipo, serie y número)
    que retuvo algo; las mismas reglas se proponen en 0 con «Practicada en el documento anulado X» y un aviso con lo ya
    retenido; no exige `retenciones.ajustar` (lo hace el sistema; se audita), pero si el usuario lo cambia, sí.
  - Pruebas: servidor 1861, cliente 369, generador 46.
- **2026-10-05 (visión general).** El usuario pide que la app sirva a cualquier rubro (concreto, venta de terrenos…)
  y a cualquier régimen fiscal, no solo a ganaderos ni a agentes retenedores: visión (§1) y `CLAUDE.md` actualizados;
  semillas y textos de los módulos generales pasan a ser neutros; lo ganadero queda en módulos de rubro.

- **2026-10-05**:
  - **Textos y semilla neutros (Arrancar sirve a cualquier rubro).** La semilla de conceptos de gasto pasa a
    una lista general de 16 (12 gastos y 4 activos fijos, ninguno agropecuario); los textos de Empresas, el lema del inicio
    de sesión, la vista previa de apariencia y la empresa demo ya no hablan de ranchos ni parcelas. Sin cambios de lógica.

- **2026-10-05 (R1-3, dominio de documentos y feriados).** Motivo `empresa_sin_credito` en `libro-de-compras`:
  `calcularDocumento` recibe `empresaConCreditoFiscal` y `empresaConIsrSobreUtilidades`; el motivo va después de
  `exento` (y antes de `no_vinculado` y del art. 20); la nota lleva el de su factura y, si la factura dio crédito y
  la empresa ya no lo tiene, `empresa_sin_credito` con aviso. El IVA se calcula y va al costo de cada línea. Sin
  crédito no salen los avisos de fuera de plazo ni de rectificar (registrar, anular y eliminar); sin ISR sobre
  utilidades los avisos de deducibilidad quitan la parte del ISR (el de factura especial queda). Migración con
  los dos checks ampliados. Calendario: `CalendarioDeFeriados` (infraestructura) precarga del core los días no
  hábiles y el dominio sigue síncrono; el entero de septiembre de 2026 vence el 22 de octubre (el 20 es feriado).
  Pendiente de R1-1 a R1-4: renumerar migraciones al integrar, tabla con historial y régimen por período.

- **2026-10-18 (Libro de compras L3-7, cliente).** Pantalla «Ingreso de facturas» (menú Operación, permiso
  `documentos.ver`): lista en `/libro-de-compras/documentos` con filtros de período (mes; abre en el mes en curso),
  proveedor (selector con buscador), estado (vigentes por omisión), destino y tipo, tarjetas con emisor, fecha, total,
  retenido y neto, y paginación de 50; ficha en `/libro-de-compras/documentos/:documentoId` con encabezado, totales,
  líneas (con el nombre del concepto), retenciones (con el motivo del ajuste y si fueron quitadas o ajustadas), notas
  de crédito, estado, y el motivo sin crédito y el de fuera del libro con un texto por cada valor. «Anular el registro
  (no anula la factura en la SAT)» abre una ventana con el resumen, la causa (lista) y el motivo, y sugiere eliminar si
  `puedeEliminar`; eliminar pide confirmación; los `avisos` de las respuestas se muestran con `usarAvisos`. El botón
  «Registrar factura» queda deshabilitado hasta L3-8. Lógica pura con pruebas en `composables/documentos/`.
  Pruebas del cliente: 400.
- **2026-10-18 (R1-1 y R1-2, historial fiscal de la empresa).** `libro_de_compras.datos_fiscales_de_empresa` es un
  historial de escalones: PK `id`, `vigente_desde` (nulo = «desde el inicio», la base), `tipo_de_persona`, seis
  regímenes de IVA, `regimen_isr` nulo («no aplica») o con `exento`, y los checks del diseño; migración
  `0012_r1_regimen_de_empresa_con_vigencia` (a mano, tras la `0011` de R1-3). Dominio: `HistorialFiscalDeEmpresa`
  (`vigenteEn`, `aplicar`, `quitar`, `rangosAfectados`, `diferenciasCon`), `datosPropuestos` (tabla R1-e) y
  `FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019` (por confirmar). La sección fiscal de Empresas lleva `tipoDePersona`
  (obligatorio) y `vigenteDesde`; `GuardarDatosFiscalesDeEmpresa` resuelve los siete casos con bloqueo `for update`,
  auditoría `corregir`/`eliminar` con el historial anterior y 409 `vigencia_fiscal_en_uso` si hay documentos vigentes
  en los meses afectados. `GET …/datos-fiscales` trae lo de hoy y el historial; `DELETE …/vigencias/:id` quita una
  vigencia. Sin datos fiscales, registrar o calcular un documento responde 422 `empresa_sin_datos_fiscales`; el
  cargador lee el régimen del período del documento. Pendiente: R1-4 (foto del régimen, `for share`), R1-5 a R1-7.
- **2026-10-18 (textos revisados por el contador).** Cambian solo los textos del cliente de Ingreso de facturas:
  motivos sin crédito (nuevos `contribuyente_agropecuario` con `FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019` y
  `primario_pecuario`), motivos fuera del libro (`textoFueraDelLibro`, con la advertencia de ISR opcional), causas y
  ayuda de anular, etiquetas de retención (incluida «Agregada a mano» cuando la propuesta es 0) y reglas de retención
  (nuevas `iva_factura_especial` e `isr_factura_especial`). Pruebas del cliente: 407.

- **2026-10-18 (R1-5 y R1-6, cliente: sección fiscal de la empresa).** La sección de Empresas pide el tipo de persona
  (obligatorio, sin valor supuesto), los seis regímenes de IVA con una línea de ayuda (los dos derogados dicen «derogado
  en 2025, solo para períodos anteriores»), el ISR (bloqueado en «No aplica» fuera de general y no afiliado; «Exento»
  solo para jurídica) y el agente de IVA (bloqueado fuera de general). Los valores se proponen con
  `datosPropuestos` (réplica de la tabla R1-e, con pruebas) al cambiar régimen, persona o ISR; si la tabla no propone
  si lleva contabilidad completa, el interruptor pasa a ser la pregunta «¿Lleva contabilidad completa?» (Sí/No).
  «¿Desde cuándo rigen estos datos?» (solo si ya hay datos; la primera vez se explica que rigen desde el inicio):
  «Corregir lo registrado» (no manda fecha), «Cambió a partir de un mes» (propone el mes actual, o el siguiente si lo de
  hoy tiene facturas) y «Desde el inicio». `usarFormulario` ahora marca el campo de un conflicto con `detalles.campo`
  (409 `vigencia_fiscal_en_uso`) y además avisa. La ficha muestra el historial (desde, hasta o «vigente», régimen y
  persona) y «Quitar» con confirmación y resumen, solo si no es la base ni tiene documentos. Pendiente: R1-4 y R1-7;
  los textos del motivo `empresa_sin_credito` se agregan junto con L3-8.

- **2026-10-18 (R1-4, foto del régimen en los documentos).** `documentos.regimen_iva_de_la_empresa` (text not null sin
  valor por omisión, con check de los seis regímenes), copiada al registrar de la vigencia del período del documento;
  checks `empresa_sin_credito`, `empresa_sin_credito_real` y `sin_credito_sin_art_20` (en
  `documentos.restricciones-de-regimen.ts`). Migración `0013_r1_foto_del_regimen_en_documentos` (la columna se llena con
  la vigencia del período, o `general` sin filas, antes del `not null`). `CargadorDeContextoFiscal` bloquea el historial
  con `for share` al registrar (no en la vista previa), contra el `for update` del guardado. La ficha y la lista
  devuelven `regimenIvaDeLaEmpresa`; la factura de una nota trae su foto. Decisión: la nota de un período sin crédito
  con IVA lleva `empresa_sin_credito` aunque su factura tuviera otro motivo (si no, el check obligatorio la rechazaría),
  con aviso solo si su factura sí dio crédito.

- **2026-10-18 (Libro de compras L3-8, cliente: registrar factura).** Formulario en página
  `/libro-de-compras/documentos/nuevo` (permiso `documentos.crear`; habilita «Registrar factura» de L3-7), en dos
  columnas: a la izquierda datos del documento (tipo, proveedor con buscador, destino, factura que rebaja la nota,
  serie, número, fechas y período), FEL (casilla «Se muestra en reportes SAT» con su motivo, NIT del emisor,
  autorización y receptor), líneas (concepto que propone tipo y activo fijo, combustible con galones, total y exento) y
  «Más datos»; a la derecha la vista previa en vivo con lo que responde `POST …/documentos/calcular` (400 ms o al salir
  de un campo, sin repetir peticiones ni aceptar respuestas viejas): motivos, totales, costo, avisos y retenciones
  propuestas. Con `retenciones.ajustar` se puede «Ajustar el monto» o «No retener», con motivo obligatorio y el tope de
  la base; se explica que vale solo para esa factura y queda registrado. Los errores se explican dentro del formulario:
  `faltan_datos_fiscales_del_proveedor` muestra sus preguntas (se reenvía con `datosFiscalesDelProveedor` y se guardan
  en el proveedor), `tipo_no_corresponde_al_proveedor` pide confirmar (`confirmarCambioDeRegimen`), `empresa_sin_*`
  lleva a Empresas, `documento_repetido` enlaza a la ficha, el 403 explica cómo quitar el ajuste y los errores por campo
  se ponen junto a su campo o línea. Sin destinos activos (`GET /destinos` vacío) avisa «hace falta activar un destino»
  y no deja registrar, pero la vista previa funciona (el servidor no revisa el destino al calcular). Tras el 201 la
  ficha muestra los avisos del servidor completos (no como avisos que desaparecen). Un recibo queda siempre fuera del
  libro; una nota toma el destino de su factura. Enter en un campo no registra, y salir con lo escrito pide confirmar.
  El selector de tipo sale de `TIPOS_DE_DOCUMENTO` para crecer en R2-8. Lógica pura con pruebas en
  `composables/documentos/` (`edicion-de-documento`, `lineas-del-documento`, `ajustes-de-retenciones`,
  `preguntas-fiscales`, `errores-del-registro`, reglas del formulario y la vista previa). Pruebas del cliente: 499.
- **2026-10-18 (R2-1, régimen de IVA del proveedor, servidor).** `datos_fiscales_de_proveedor.es_pequeno_contribuyente`
  pasa a `regimen_iva` (text not null, `default 'general'`, ocho valores) y `regimen_isr` suma `exento`; checks
  `regimen_iva_valido`, `regimen_isr_valido`, `regimen_isr` (ISR solo en general y no domiciliado), `no_domiciliado`,
  `agente_solo_general` y los tres de retención por régimen. Migración
  `0014_r2_regimen_iva_del_proveedor` (`when` 1792383375345; convierte las filas con un `update` antes de borrar la
  columna). Dominio: `DatosFiscalesDeProveedor.porOmision` fuerza ISR «no aplica» y sin retenciones en los regímenes
  especiales (`regimenIsrPropuesto`); el 5 % solo al `pequeno_contribuyente` (la estrategia también lo comprueba);
  `exigirTipoDelProveedor` recibe el régimen. Opción C: `datosFiscalesDelProveedor` acepta `regimenIva` opcional (si no
  llega: `no_domiciliado` si el ISR lo es, `general` en los demás). Decisión: `factura` sigue aceptada para `general` y
  `no_domiciliado` (hoy lo era; evita pedir confirmación a quien ya funcionaba). Rompe la sección del cliente hasta R2-2.
- **2026-10-19 (R2-2, sección fiscal del proveedor, cliente).** `SeccionFiscalDeProveedor` y la ficha usan `regimenIva`
  (ya no `esPequenoContribuyente`). Selector de régimen de IVA en orden de nombre con una línea de ayuda por régimen; los
  derogados (pequeño contribuyente electrónico y contribuyente agropecuario) solo se ofrecen si el proveedor ya los
  tiene, con aviso. Propuestas replicadas del servidor en `datos-fiscales-de-proveedor.ts` (`regimenIsrPropuesto`,
  `retencionesPropuestas`, `conCambioDeRegimen`) con pruebas: al cambiar de régimen se reponen ISR, agente y retenciones;
  el ISR solo se escoge en el general (utilidades, opcional simplificado, exento) y el agente solo existe en el general;
  las retenciones que no aplican se muestran bloqueadas con su razón. Opción C (L3-8): `datosFiscalesContestados` envía
  `regimenIva` si el servidor lo pregunta y, con un régimen especial, no pide ISR ni agente (completa lo que el servidor
  exige y luego ignora). Pendiente de servidor: agregar la pregunta `regimenIva` en `preguntasDeDatosFiscales`.

- **2026-10-19 (R2-3, datos de documentos para las familias nuevas, servidor).** Migración
  `0015_r2_familias_y_tipo_dte` (`when` 1792399371292): `documentos.tipo_dte` (con el `update` de los documentos con FEL),
  `tipo` suma `factura_pequeno_contribuyente_electronico`, `factura_contribuyente_agropecuario`,
  `factura_primario_pecuario` y `factura_especial`; motivos nuevos `contribuyente_agropecuario` y `primario_pecuario`.
  Checks nuevos: `tipo_dte_valido`, `tipo_dte_con_fel`, `tipo_dte_de_la_familia`, `familia_sin_iva` y
  `motivo_de_la_familia` (reemplazan a `pequeno_contribuyente_sin_iva` y `pequeno_contribuyente`),
  `primario_pecuario_desde` (2025-04-09), `factura_especial_en_el_libro` y `factura_especial_vendedor`; se reemplazan
  `tipo_valido` y `motivo_sin_credito_valido`. Los SQL de familias y motivos salen de `tipos-de-documento.ts`
  (`CODIGOS_DTE_DE_LA_FAMILIA`, `TIPOS_DTE`, `FAMILIA_DEL_TIPO_DTE`, `MOTIVO_DE_LA_FAMILIA`); `factura_especifica`,
  `duca` e `ict` quedan fuera (R2-b). R2-a: la constante `FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019` del servidor
  desaparece; la variable de instalación `libro-de-compras.regimenes.fecha_de_derogacion` (`'2025-07-09'`) llega en
  `ConfiguracionFiscal.fechaDeDerogacion` y `problemasDeLaDerogacion` la recibe como parámetro (la llama
  `GuardarDatosFiscalesDeEmpresa`, ya no `HistorialFiscalDeEmpresa.aplicar`); la base no la revisa. La constante del
  cliente sigue hasta su paso. Decisión provisional: hasta R2-4 el mapeador guarda como `tipo_dte` el primer código de
  la familia cuando el documento tiene FEL (`tipoDteProvisional`), para que el registro actual siga funcionando.

- **2026-10-19 (R2-7, textos de las familias nuevas, cliente).** `TIPOS_DE_DOCUMENTO` suma `factura_pequeno_contribuyente_electronico`
  («…electrónico (régimen derogado)»), `factura_contribuyente_agropecuario` («…agropecuario (régimen derogado)»),
  `factura_primario_pecuario` («Factura de productor primario o pecuario») y `factura_especial` («Factura especial (emitida por
  la empresa)»); el tipo TypeScript las incluye. Los filtros de la lista las ofrecen solos (orden por nombre). La ficha muestra
  «Código SAT» (`tipoDte`, opcional) y «Motivo de la factura» de una nota (`motivoDeLaFactura`, opcional, con el texto de
  `MOTIVOS_SIN_CREDITO`); se omiten si no vienen, porque el servidor aún no los envía en la lista y la ficha (R2-4).
  Los motivos `contribuyente_agropecuario` y `primario_pecuario` ya tenían texto y se verifican en las pruebas.
  Decisión de interfaz: el formulario de registro sigue ofreciendo solo las cuatro familias de hoy (`TIPOS_QUE_SE_REGISTRAN`);
  las nuevas entran en R2-8, con su propia regla de emisor y de régimen. Pruebas: `textos-de-documentos.prueba.ts` y
  `detalles-de-documento.prueba.ts` (nuevo).

- **2026-10-19 (R2-6, factura especial, servidor).** La FESP ya se registra (desaparece `factura_especial_no_disponible`).
  Encabezado (`dominio/factura-especial.ts`, `resolverFacturaEspecial`): `nit_emisor` es el NIT de la empresa (el
  `nitEmisor` del cuerpo se ignora) y el vendedor va en `nit_receptor` por NIT o CUI; no puede faltar, ser `CF` ni la
  propia empresa (`vendedor_de_factura_especial_invalido`, 400); debe coincidir con el NIT o el DPI del proveedor y, si no
  tiene ninguno, se le completa con `terceros.completar_nit` (si lo escrito pasa como NIT) o `terceros.completar_dpi` (si es
  CUI); con otro dato, `vendedor_no_coincide` (422). `nombre_emisor` es el nombre del proveedor (R2-d). Va siempre en el
  libro (`factura_especial_siempre_en_el_libro`, 422, si se manda un `motivoFueraDelLibro`) y exige serie y autorización.
  Da crédito como una factura, o `empresa_sin_credito` si la empresa no lo tiene. Si no llega `fechaRecepcion`, la FESP toma
  la de emisión. Opción C: sin datos fiscales guardados, el proveedor se guarda `sin_inscripcion`. Estrategias nuevas
  (`estrategias-de-factura-especial.ts`): `iva_factura_especial` (base el IVA del documento, 100 %) e
  `isr_factura_especial` (base `total − iva`, 5 % de `libro-de-compras.retenciones_isr.factura_especial`), con fecha de
  emisión, sin mínimo y sin mirar al proveedor ni si la empresa es agente. Plazo de entero por regla
  (`ULTIMO_DIA_HABIL` en `plazo-de-entero.ts`): IVA de la FESP, último día hábil del mes siguiente a la emisión con el
  calendario de feriados; ISR, `dias_habiles_entero_isr` (10); no se creó variable de días para la FESP. Avisos que no
  bloquean (`avisosDeLaFacturaEspecial`): sin contabilidad completa (`es_agente_de_retencion_isr = false`), empresa
  `no_afiliado`, proveedor inscrito en el IVA (art. 52) y siempre la mención de la FEPE. Nota de crédito sobre una FESP:
  `nota_sobre_factura_especial` (422) con el texto aprobado. Migración `0016_r2_retenciones_de_factura_especial`:
  `retenciones_regla_valida` con las dos reglas y `retenciones_iva_factura_especial_completa` (porcentaje 100). Nuevo
  puerto `CompletadorDeDpi` y `ProveedorParaDocumento.dpi`. **Para el cliente (R2-8):** la causa de anulación
  `fel_anulada_por_el_emisor` solo existe como texto del cliente (`CAUSAS_DE_ANULACION`, «El emisor anuló la FEL en la
  SAT»): en una FESP debe mostrarse «FESP anulada por la empresa»; el servidor no cambia el código. Pruebas: dominio
  (estrategias, plazos, encabezado, avisos, empresa sin crédito), casos de uso en memoria, `check`s de la migración y API
  (NIT, CUI, completar, CF rechazado, nota rechazada, retenciones con fecha, anulación y empresa sin crédito).

- **2026-10-19 (R2-5, orden `terceros.completar_dpi`, servidor).** Contrato `terceros.completar_dpi`
  (`{ proveedorId, dpi }`, sin respuesta) y caso de uso `CompletarDpiDeProveedor`, igual que `completar_nit`: valida con
  `Dpi`, se une a la transacción de quien llama, pone el DPI si falta, no hace nada si es el mismo, y rechaza con
  `ProveedorYaTieneOtroDpi` (`proveedor_con_otro_dpi`) si tiene otro o `DpiYaRegistrado` (`dpi_ya_registrado`) si es de
  otro tercero de la cuenta. `terceros` ya tenía el único `terceros_dpi_por_cuenta_idx` (cuenta, dpi); la consulta
  `nombreDelOtroConDpi` da el mensaje antes de chocar con él. Sin auditoría, como `completar_nit`. Pruebas unitarias y de API
  con el mediador real.

- **2026-10-19 (R2-4, dominio y registro de las familias sin crédito, servidor).** El cuerpo de calcular y registrar
  acepta `tipoDte` (código SAT) y `tipo` pasa a opcional: si llega `tipoDte`, la familia se deduce de él
  (`FAMILIA_DEL_TIPO_DTE`) y, si también llega `tipo`, deben coincidir (`tipo_dte_incoherente`, 400); con FEL `tipoDte`
  es obligatorio (`tipo_dte_obligatorio`) y sin FEL no se escribe (`tipo_dte_sin_fel`); sin ninguno,
  `tipo_de_documento_obligatorio`. Desaparece `tipoDteProvisional`; el DTO del documento, la ficha y la lista traen
  `tipoDte`. Dominio nuevo `familia-del-documento.ts`: `resolverTipoDeDocumento`, `exigirFechaDeLaFamilia` (derogadas
  antes de `fechaDeDerogacion`; primario y pecuario desde 2025-04-09; la nota mide la familia y la fecha de **su
  factura**) y el aviso del primario y pecuario. `motivo-sin-credito` y `cobraIva` usan `MOTIVO_DE_LA_FAMILIA`: IVA 0 y
  motivo propio en las cuatro familias sin IVA, y la nota sobre ellas tampoco cobra IVA. Las estrategias de retención no
  cambian: ninguna reconoce las tres familias nuevas, y una prueba lo comprueba con una empresa agente de todo
  (decisión provisional del contador: FARP, FCRP, FPEC y FCPC no retienen). `exigirTipoDelProveedor` usa la tabla de
  familia contra régimen del diseño (el no domiciliado sigue facturando como el general, como hoy). Opción C:
  `regimenDeducido` por familia y código (pequeño contribuyente, primario o pecuario se guardan; los derogados se
  calculan sin guardarse); `preguntasDeDatosFiscales` suma `regimenIva` (primero, con `general` y `no_domiciliado`).
  La auditoría del cambio de régimen guarda `anterior.regimenIvaSegunSusDatos` con el régimen guardado del proveedor
  (antes `esPequenoContribuyenteSegunSusDatos`, deducido del tipo). La ficha trae `motivoDeLaFactura` (solo en la
  nota; se lee de la factura, no se guarda). La factura especial responde `factura_especial_no_disponible` («estará
  disponible próximamente») hasta R2-6. El cliente debe enviar `tipoDte` en los documentos con FEL (el formulario es
  L3-8/R2-8).
- 2026-10-19 — **Libro de compras R2-8 (cliente), primera parte.** El formulario de registro manda `tipoDte` (código
  de la SAT) en todo documento con FEL; antes registrar fallaba con `tipo_dte_obligatorio`. El selector «Tipo de
  documento (como dice el encabezado de la factura)» lista los códigos agrupados por familia con buscador
  («FACT — Factura», «FARP — Factura contribuyente régimen primario»…), los derogados llevan «(régimen derogado, solo
  antes de julio de 2025)» y `FESP` aparece deshabilitada («próximamente»). La familia se deduce del código
  (`familiaDelCodigo`, con pruebas); el recibo es una opción aparte sin código y, sin FEL, solo se manda la familia
  (el servidor rechaza un código sin FEL). Los errores `tipo_dte_*`, `tipo_de_documento_obligatorio`,
  `familia_derogada`, `familia_aun_no_vigente` y `factura_especial_no_disponible` salen en el campo del código.
  `CampoSelector` acepta opciones con `grupo` y `deshabilitada`. El cliente no oculta derogados según la fecha de
  emisión ni propone el código según el régimen del proveedor (lo decide el servidor). Los nombres de los códigos
  nuevos siguen por confirmar con el contador (R2-f).
- 2026-10-19 — **Libro de compras R2-8 (cliente), segunda parte: factura especial en el formulario.** `FESP` ya se puede
  elegir. Al elegirla el bloque FEL muestra la ayuda («la emite su empresa en el certificador… se retiene todo el IVA y
  el 5 % de ISR»), el emisor fijo y de solo lectura («Su empresa (NIT …)», leído de `/empresas`; sin permiso se dice solo
  «Su empresa»), «Vendedor (NIT o CUI)» (va en `nitReceptor`, propuesto con el NIT o, si no hay, el DPI del proveedor),
  la casilla «Se muestra en reportes SAT» fija y marcada y la recepción igual a la emisión (la sigue mientras no se
  cambie). `nitEmisor` no se envía. Para registrar piden vendedor, serie y autorización. Los errores
  `vendedor_de_factura_especial_invalido`, `receptor_invalido` y `vendedor_no_coincide` salen en el vendedor y
  `factura_especial_siempre_en_el_libro` y `nota_sobre_factura_especial` en el tipo, con cómo corregir. La lista de
  facturas que una nota rebaja ya excluía la FESP. La causa `fel_anulada_por_el_emisor` de una FESP se lee «FESP anulada
  por la empresa» en la ficha y en la ventana de anular (`textoDeCausa`). Pruebas puras nuevas en reglas del formulario,
  edición, errores, textos y anulación.

- **2026-10-19 · Ficha de la empresa y correcciones del QA (cliente).** Nueva ficha `/empresas/:empresaId`
  (`FichaDeEmpresa`, `usarFichaDeEmpresa`): datos generales con `DatosDelRegistro` y debajo `SeccionesEnLaFicha
en="empresa"`, donde ya se ven la vigencia fiscal, su historial y «Quitar» (R1-6). La tarjeta de la lista lleva a la
  ficha; «Editar» (con `empresas.editar`) abre la ventana de siempre y la ficha trae «Empresas» para volver. Observación
  4 del QA: al cambiar el régimen de IVA con la persona ya escogida, el ISR vuelve a la propuesta de la tabla (jurídica
  de general a no afiliado propone «Exento») en vez de arrastrar la elección previa; con prueba. La lista de
  proveedores del registro ya toma `proveedor.id` del papel (`GET /terceros?papel=proveedor`), sin cambios.

- 2026-10-19 — Libro de compras: correcciones del servidor tras el QA (`informe-qa-2026-10-19.md`). **Error 2:** el listado
  `GET /api/terceros` trae el `id` del papel en `cliente.id` y `proveedor.id` (el del papel, no el del tercero), que el
  formulario de documentos usa. **Error 3:** `POST …/documentos/calcular` ya no exige destino: vacío o desconocido calcula
  igual (se arma con un destino de vista previa que no se guarda); conocido pero inactivo calcula y agrega un aviso; registrar
  sigue exigiéndolo (`OpcionesDePreparacion.exigirDestino`). **Vence la víspera:** `venceLaVispera(fecha, meses)` en
  `dominio/plazo-en-meses.ts` da el último día incluido del plazo (15/03 + 2 meses: hasta el 14/05; si el mes final no
  tiene ese número, vence su último día) y mide el aviso de la nota de crédito tardía; la nota de débito la reutilizará.
  **Bajas:** un proveedor con ISR `exento` no puede tener «se le retiene ISR» (dominio y check de la base, migración 0017,
  que corrige filas anteriores); el agropecuario con persona jurídica dice que el régimen es solo de persona individual
  (ya no pide la contabilidad) y el cambio de tipo de persona en el historial explica que es igual en todas las vigencias.
  Pendiente de cliente: error 1 (ficha de la empresa sin historial) y la baja 4 (propuesta de ISR exento al pasar a no afiliado).
- 2026-10-19 — **Libro de compras R3-1 y R3-2 (servidor): nota de débito del proveedor (NDEB), datos y dominio.** Migración
  `0018_r3_nota_de_debito` (`when` mayor que el de la `0017`; solo checks, sin datos que convertir):
  familia `nota_de_debito` con `tipo_dte = 'NDEB'`, `nota_con_factura` para las dos notas, `motivo_de_la_familia`, checks nuevos
  `nota_de_debito_en_el_libro`, `motivo_sin_iva` (cierra el hueco de la nota de crédito de una factura sin IVA) y
  `nota_de_debito_tardia_solo_en_la_nota`, y el motivo `nota_de_debito_tardia` (art. 17) en `iva_no_acreditable_por_motivo` y
  `sin_credito_sin_art_20`. Dominio: orden del motivo de la NDEB familia, exento, `empresa_sin_credito`, `no_vinculado`
  (el usuario puede agregarlo, no quitarlo si la factura lo traía), art. 17, art. 20; una factura registrada sin crédito
  no se hereda (da crédito, con aviso). `esNotaDeDebitoTardia` en `plazo-de-la-nota-de-debito.ts`, sobre `venceLaVispera` de `plazo-en-meses.ts`. Reglas de la NDEB: no anterior a su
  factura, sin IVA de la FEL sobre factura que no lo cobra, error de factura exenta con IVA («pida al proveedor que anule
  la nota y emita una factura por el cargo gravado»); sin retenciones (`esNota`) y con aviso a agentes de IVA o de ISR;
  avisos de la clase de cargo `intereses` (sin columna: el diseño no la prevé, llega en la solicitud de R3-3). Topes
  (`tope-de-notas.ts`): las notas de crédito caben en la factura más sus NDEB, en total y en IVA; también la regla para
  anular una NDEB (`NotaDeDebitoSostieneNotasDeCredito`, que R3-4 usa). La casilla SAT de las dos notas va atada a la de su
  factura (`factura-de-la-nota.ts`, R3-h). `FacturaParaNota` suma las sumas por familia de nota (una consulta agregada). La
  derogación se mide con la fecha de la factura, como ya se hacía con la nota de crédito. Falta R3-3 (solicitud, DTO,
  contrato del destino), R3-4 (bajas), el cliente y el QA.
- 2026-10-19 — **Libro de compras R3-6 (cliente): nota de débito del proveedor en la lista y la ficha.** Familia
  `nota_de_debito` en `TIPOS_DE_DOCUMENTO` con «Nota de débito del proveedor» (filtros, lista y ficha); la de crédito pasa a
  «Nota de crédito del proveedor» (R3-i, aprobado con las recomendaciones del 2026-10-19). Código `NDEB` («Nota de débito»,
  grupo «Notas de débito») en `tipos-de-documento-sat.ts`, visible pero deshabilitado con «(próximamente)» hasta R3-7.
  Motivo `nota_de_debito_tardia` con su texto (art. 17). La ficha agrupa las notas en «Notas de crédito (n)» y «Notas de
  débito (n)» (`gruposDeNotas`, `notas-de-la-factura.ts`); una nota sin `tipo` cuenta como de crédito mientras el DTO no lo
  trae (el tipo de `NotaDeFactura` es opcional). El enlace de una NDEB dice «Ver la factura que aumenta esta nota». Las
  explicaciones de anular y eliminar nombran «notas de crédito o de débito» según las notas. Pendiente: el total ajustado
  de la ficha (lo deriva el servidor en R3-3; el cliente no lo calcula) y la lista de notas con `tipo` del DTO (R3-3).

- 2026-10-19 — **Libro de compras R3-3 y R3-4 (servidor): registrar y dar de baja la nota de débito.** Solicitud: `tipoDte: "NDEB"`
  con `documentoAfectadoId` y `claseDeCargo` (`precio`, `intereses` u `otros`; opcional, no se guarda; con `intereses` sale el
  aviso de gasto financiero). Ficha: `notas[].tipo` (`nota_de_credito` o `nota_de_debito`) y `totalAjustado` (factura + notas de
  débito vigentes − notas de crédito vigentes; `null` si el documento no es una factura); la lista ya traía `tipo` y
  `puedeAnular`/`puedeEliminar` cuentan las dos familias de nota. Contrato del destino: `DocumentoParaDestino.tipo` acepta
  `nota_de_debito` (anotado en `cuentas-por-pagar.md` como pendiente de CP1: es un cargo). Bajas: la factura con una nota de
  débito vigente no se anula y con una anulada no se elimina (textos «de crédito o de débito»); anular o eliminar una nota de débito
  bloquea la factura (`for update`) y exige que las notas de crédito sigan cabiendo en total e IVA sin ella
  (`exigirQueLaBajaRespeteElTope`); si no, `NotaDeDebitoSostieneNotasDeCredito`, que responde **422** como las demás bajas
  (`ReglaDeNegocioInfringida`; el diseño decía 409). Auditoría con las acciones y el recurso de siempre. Aviso a agentes: «Verifique con su
  contador si debe retener sobre esta nota de débito.». `puedeAnular` de la ficha de una nota de débito no mira el tope (lo
  rechaza el servidor al anular). Falta R3-5 (retenciones, bloqueado por el contador), el cliente (R3-6, R3-7) y el QA.
- 2026-10-20 — **Libro de compras L4-4 (servidor, core/intercambio): lectura cruda y segura de archivos de filas.** Puerto
  `LectorDeFilas.leerFilas(archivo, encabezadosEsperados)` (implementa `LectorDeFilasDeArchivo`; se obtiene con
  `crearLectorDeFilas()` de `core/intercambio/contexto.ts`) y `LibroDeExcel.leerFilas` en exceljs. El formato se detecta por
  el contenido (`detectarFormato`): `PK\3\4` es xlsx (pasa por `ValidadorDeXlsx`), BIFF da `ExcelAntiguoNoAdmitido`, texto que
  empieza con `<` (HTML o XML) da `ArchivoDeTextoNoAdmitido`, NUL, UTF-16 o vacío dan `ArchivoNoEsExcel`, y el resto es CSV
  (UTF-8 o Windows-1252, BOM quitado). `LectorDeCsv` propio, sin dependencia nueva (RFC 4180, separador `,` `;` o tabulador por
  la primera línea). Topes: 5 MB, 10,000 filas, 200 columnas, 4,000 caracteres por celda. Las celdas salen como texto (fechas
  `aaaa-mm-dd`, fórmulas por su valor, sin valor o con error vacía) y los encabezados se buscan entre las 20 primeras filas
  (gana la fila con más coincidencias, comparadas sin tildes, mayúsculas ni `. : # ( )`); devuelve `reconocidos` y
  `noReconocidos`, o `EncabezadosNoEncontrados` con los esperados. Sin lógica de la SAT.

- 2026-10-20 — **Libro de compras L4-8 (servidor, terceros): orden `terceros.crear_proveedor_desde_dte`.** La atiende
  `CrearProveedorDesdeDte` (`terceros/aplicacion/casos-uso/papeles/`): `datos: { nit, nombre, tipoDePersona,
puedeCrearProveedores }`, respuesta `{ proveedorId, terceroId, creado }`. Busca por NIT en la cuenta (`buscarPorNit` en
  `RepositorioTerceros`): si no existe crea el tercero (jurídica: `razon_social`; individual: `nombres`) con papel de proveedor
  activo; si existe sin el papel se lo asigna; si ya es proveedor activo devuelve el suyo (`creado: false` en ambos); si el
  papel está inactivo, `proveedor_inactivo` (se reactiva en Proveedores). El mediador no lleva permisos, así que quien manda
  pasa `puedeCrearProveedores` (su usuario tiene `proveedores.crear`); en falso responde `sin_permiso` (403). Como el alta de
  proveedores, no audita (no es baja ni inactivación) y no publica eventos (la transacción es de quien llama). Sin datos
  fiscales: los guarda Libro de compras (opción C). Consumidor final se rechaza.

- 2026-10-20 — **Libro de compras R3-7 (cliente): nota de débito del proveedor en el formulario de registro.** `NDEB` se puede
  elegir (ya no dice «próximamente»). Pide «Factura que aumenta esta nota» (vigentes del proveedor, **solo las del libro** y sin la
  factura especial; el destino se toma de la factura) y «¿Por qué cobra más el proveedor?» (`claseDeCargo`: Diferencia de precio,
  Intereses, Otros cargos; opcional, con ayuda corta). Con «Intereses» la primera línea sin concepto se propone con el concepto
  activo de gasto financiero (nombre con «financier…» y si no «interés…»); si no existe, un aviso dice cómo seguir. La casilla
  «Se muestra en reportes SAT» queda marcada y deshabilitada con su explicación. Los errores `nota_con_iva_de_factura_exenta`,
  `nota_de_debito_con_iva_de_factura_sin_iva`, `nota_supera_la_factura`, `factura_no_sirve_para_la_nota` e
  `iva_de_notas_excede_el_de_la_factura` salen en el campo de la factura; `nota_de_debito_anterior_a_la_factura`, en la fecha de
  emisión. Los avisos (agentes, intereses) y el motivo `nota_de_debito_tardia` ya los mostraba la vista previa.

- **2026-10-20 — Libro de compras, L4-1 y L4-2 (otros impuestos e IDP escrito, vía a mano).** Migración `0019_l4_otros_impuestos_e_idp_escrito`
  (`when` 1792478380111): `otros_impuestos numeric(14,2) not null default 0` en documentos y líneas, `idp_escrito boolean` en la línea;
  `totales_cuadran` suma los otros impuestos en ambas tablas; `lineas_de_documento_idp_calculado` pasa a `idp_escrito or (sin vigencia
e idp = 0) or (con vigencia e idp = fórmula)` (antes, una línea sin combustible con IDP distinto de cero pasaba por el `null` de la
  fórmula; ahora se rechaza); check nuevo `idp_escrito_positivo`. Dominio: `LineaEscrita` suma `otrosImpuestos` e `idp`, `LineaCalculada`
  e `TotalesDelDocumento` suman `otrosImpuestos` (y `idpEscrito` en la línea); los otros impuestos se restan del gravado y quedan en el
  costo; el motivo `exento` exige `exento > 0` y `exento + otros = total`. Cuerpo de calcular y registrar: por línea `otrosImpuestos` y
  `idpEscrito` (monto, `null` o cero = se calcula de los galones); el DTO de línea trae `otrosImpuestos` e `idpEscrito` (booleano) y el
  de totales, `otrosImpuestos`. El combustible sin galones es error; con IDP escrito y galones se compara y, si difieren, aviso; sin
  tasa en la fecha, aviso y se guarda sin vigencia. **L4-2b no va:** la base del ISR sigue siendo `total − iva` (los otros impuestos
  quedan dentro) hasta que conteste el contador (L4-c1). Falta el cliente (L4-3) y la bandeja.
- **2026-10-20 — Libro de compras, decisiones del usuario sobre L4-c1 y L4-c3 (servidor).** Migración
  `0020_l4_recibo_fel_y_factura_especial_limpia`: el motivo `recibo_fel` entra en `documentos_motivo_fuera_del_libro_valido` y en
  `documentos_fel_con_autorizacion`; check nuevo `documentos_recibo_fel_de_la_familia` (`recibo_fel` solo con `tipo = 'recibo'` y
  `tipo_dte in ('RECI','RDON')`); check nuevo `documentos_factura_especial_sin_otros` (`tipo <> 'factura_especial' or (otros_impuestos = 0
and idp = 0)`). `tipo_dte_de_la_familia` y `muestra_segun_motivo` ya servían tal cual. Dominio: la regla A1 queda «toda **factura** FEL
  al NIT de la empresa va en el libro»; el recibo FEL es la excepción (`evaluarFueraDelLibro` valida tipo, código, autorización y NIT
  receptor, que si se escribe debe ser el de la empresa: `recibo_fel_incoherente`, 400; si se omite se guarda el de la empresa); queda
  fuera del libro, sin crédito ni retenciones, y el `RDON` avisa «Donación: deducible solo en el ISR sobre utilidades…». Una factura
  especial con otros impuestos o IDP (escrito o de galones) en alguna línea da `factura_especial_sin_otros_impuestos` (400, «Una factura
  especial no lleva otros impuestos ni IDP.»). Diseño §3.3b: el bloqueo `recibo_a_la_empresa` de la bandeja ya no aplica (el recibo entra
  `pendiente`). Falta en el cliente el motivo `recibo_fel` (selector y textos) y el aviso.

- **2026-10-20 — Libro de compras, L4-3 (cliente): otros impuestos e IDP escrito en el formulario, la ficha y la vista previa.** En cada
  línea, la sección plegable «Más montos de la factura» (se abre sola si trae un monto o un error) con «Otros impuestos (tasa municipal,
  turismo, timbre…)»; en combustible, «Escribir el IDP que dice la factura», con combustible y galones opcionales (juntos o ninguno; con
  ellos el aviso del servidor dice si no cuadra). La factura especial no los muestra ni los manda. Errores en su campo de la línea,
  también antes de enviar (negativos; exento + IDP + otros mayores que el total). Totales de la vista previa y de la ficha muestran
  «Otros impuestos» si no es cero; la línea de la ficha rotula «IDP (el de la factura)». La lista no cambia: el servidor no trae
  los otros impuestos en el listado.

- **2026-10-20 — Libro de compras, motivo `recibo_fel` en el cliente.** El motivo entra en `MotivoFueraDelLibro`, con su texto en
  `MOTIVOS_FUERA_DEL_LIBRO` («Recibo FEL emitido a la empresa (no es documento del IVA): se registra para respaldar el gasto o la
  donación, sin crédito fiscal.») y su nombre en el selector. Los códigos `RECI` («Recibo») y `RDON` («Recibo por donación») van en el
  grupo «Recibos» del selector de código SAT, antes de «Recibo (sin FEL)», que no cambia (`sin_fel`). Al elegir `RECI` o `RDON` el
  motivo se fija en `recibo_fel` (sin selector, con su explicación), el NIT receptor se propone con el de la empresa (si ya llegó; si
  no, al llegar) y la autorización de la FEL es obligatoria; el cuerpo manda el código de la SAT. Las reglas nuevas están en
  `reglas-del-formulario-de-documento.ts` y tienen pruebas. El aviso de donación (`RDON`) lo devuelve el servidor y se muestra por los
  avisos del registro que ya existen. Pendiente de decisión: un recibo `RECI` a otro NIT queda con el motivo fijo y el servidor lo
  rechaza (`recibo_fel_incoherente`); el usuario debe decidir si debe ofrecerse «otro NIT» en ese caso.

- **2026-10-20 — Libro de compras, L4-5 (servidor, datos de la bandeja de DTE recibidos).** Migración `0021_l4_bandeja_de_dte`
  (`lotes_de_dte` y `dte_recibidos` con todos los checks, llaves compuestas, únicos, índices y `politicaPorEmpresa()`; `...marcasDeTiempo`
  y `...autoria`) y migración custom `0022_l4_autorizacion_registrada_fuera` (función `security definer`, `stable`, con
  `search_path = pg_catalog, libro_de_compras`, sin permiso para el público y con `execute` solo para `arrancar_app`). Según la
  respuesta L4-c, la función dice sí solo si la autorización está vigente en **otra empresa de la misma cuenta** de la empresa
  activa; para otra cuenta, la propia empresa o una anulada dice no (sin avisar nada). Las migraciones se renumeraron respecto del diseño
  (la `0021` del diseño pasó a `0022`). Dominio mínimo: `estado-de-dte.ts` (estados, motivos de bloqueo y transiciones) y la entidad
  `DteRecibido` (registrar, devolver a pendiente, descartar con motivo, bloquear); `LoteDeDte`. Repositorios Drizzle de lotes y de
  filas con sus puertos. Pruebas: dominio y de integración (checks, llaves, único por empresa, RLS, función y repositorios). El enlace
  con lo registrado a mano (registrar enlaza, anular o eliminar devuelve a `pendiente`) **no** va aquí: el diseño lo asigna a L4-9.
- **2026-10-20 — Libro de compras L5-0 (servidor).** Decreto 22-2026: columna `iva_exento` en `vigencias_de_combustible`
  (migración `0023`), con DTO, esquema y Excel; en una línea de combustible con vigencia exenta se propone el exento
  `total − idp − otros` con IVA 0, y un exento distinto escrito se respeta con aviso. La vigencia del decreto no se siembra:
  la carga el usuario en Combustibles (ver el diseño). Recibo FEL (RECI/RDON) a otro NIT: se acepta como `fel_a_otro_nit`, fuera
  del libro. Pendiente del cliente: casilla «Exento de IVA» en la ventana de vigencias (sin ella un PUT la deja en `false`).

- **2026-10-20 — Libro de compras L5-1 (cliente, exención de IVA de la tasa de combustible).** La ventana de la tasa tiene la casilla
  «Exento de IVA en esta vigencia» (interruptor, con la ayuda del Decreto 22-2026) y la historia de tasas muestra la insignia «Exento de
  IVA» en las que lo son. El servicio manda y recibe `ivaExento`. Si documentos ya usan la tasa, el error del servidor marca en su campo
  lo que el cambio contradice (`conflicto-de-vigencia-de-combustible.ts`: exención, tasa, etanol o inicio; si solo cambió el cierre,
  «Vigente hasta»); el servidor no dice qué campo, así que el mensaje se reparte según lo que cambió el usuario. Con pruebas de la
  lógica pura. Pendiente: que el servidor mande el campo en `detalles` si se quiere una señal exacta.

- **2026-10-20 — Libro de compras L5-1a (servidor, libro del período).** `GET /api/libro-de-compras/libro?periodo=AAAA-MM`
  (permiso `libro.ver`) arma el libro con una sola consulta por período (documentos vigentes con `muestra_en_reportes_sat`,
  sumados por documento y categoría de línea: bien, servicio, combustible y activo fijo) y la función pura
  `dominio/libro/fila-del-libro.ts`, que reparte las columnas y pone el signo (nota de crédito negativa, nota de débito
  positiva, vendedor de la FESP, IDP aparte, «exento y no afecto» = exento + otros impuestos, regímenes sin IVA en su columna,
  IVA con y sin crédito con su motivo). Completo o simplificado según `regimen_iva_de_la_empresa` de los documentos (sin
  documentos, el régimen que rige en el período). Resumen mensual, avisos y, aparte, `GET …/libro/anulados`. Se declaran
  `libro.ver` y `libro.exportar`. Pendiente: Excel de tres hojas (`escribirVarias` en el core) y el PDF, en pasos siguientes.
- **2026-10-20 (L5-1b, cliente del libro):** página «Libro de compras» en Reportes (`libro-de-compras.libro.ver`): período
  (mes anterior por omisión), encabezado con empresa, NIT y tipo de libro, avisos, tabla completa o simplificada que se
  desplaza dentro de su contenedor en el celular, notas de crédito en rojo con enlace a la ficha, totales al pie, leyenda,
  resumen en tarjetas y pestaña «Anulados del período» (solo pantalla). Excel y «PDF con folios» quedan deshabilitados
  («próximamente») hasta que el servidor los ofrezca.
- **2026-10-20 (L5-3b, cliente del libro):** se activan «Exportar a Excel» (`libro.exportar`) y «Ver borrador (PDF)», este
  último con la nota de que no lleva folio ni gasta hojas. «Emitir con folios» (`libro.emitir`) abre una confirmación con
  el último folio, el folio en que empezará y el aviso de que gasta hojas; si el período ya se emitió pide el motivo.
  Al terminar descarga el PDF y avisa el rango de folios (si la descarga falla, dice que el libro sí se emitió). Sección
  «Emisiones del período» (fecha, rango de folios, vigente o sustituida, motivo y «Descargar copia») y «Corregir el último
  folio» (número y motivo). Errores 409, 400 y 422 con texto que dice cómo seguir. La lista de emisiones del servidor no
  devuelve quién emitió: queda pendiente agregarlo al DTO para mostrar «emitida por».
- **2026-10-20 — Libro de compras L5-1 (Excel) y L5-3a (PDF con folios), servidor.** `GET …/libro/exportar?periodo=` (`libro.exportar`)
  baja un `.xlsx` de tres hojas (Libro, Resumen, Anulados) con el dinero como número; el core suma `escribirVarias` al puerto
  `LibroDeExcel`. PDF con `pdfkit` en versión exacta 0.20.2 (más `@types/pdfkit` 0.17.6), fuente Noto Sans Regular y Bold
  (OFL) en `servidor/recursos/fuentes/` con su licencia (el `Dockerfile` la copia a la imagen) y `mem_limit: 1g` al servicio
  `app`. Paginación propia en el dominio (`paginarLibro`: 32 filas por hoja, «Vienen» y «Van», «Total del período» en la última;
  la hoja final es siempre el resumen mensual, así que un libro gasta `ceil(filas/32) + 1` folios, mínimo 2). Textos del usuario
  por `textoParaElPdf` (NFC, sin controles ni marcas de dirección, recorte a 60 con «…») y lo que la fuente no tiene sale como
  «?»; tope de 5,000 filas (422 `libro_con_demasiadas_filas`); una generación a la vez (`Semaforo`) y 5 emisiones o 10
  borradores por minuto por usuario. Migraciones `0024` (tablas `foliacion_del_libro` y `emisiones_del_libro`, esta de solo
  agregar con `politicasDeSoloAgregarPorEmpresa()`) y `0025` (exclusión de folios traslapados). Rutas: `POST …/libro/emisiones`
  (`libro.emitir`, consume los folios y guarda el PDF en `core.archivos` en la misma transacción; 409 `emision_sin_cambios`
  si nada cambió; motivo obligatorio al reemitir), `GET …/libro/emisiones` (lista y último folio), `GET …/libro/emisiones/:id/pdf`
  (copia), `GET …/libro/pdf` (borrador sin folio) y `PUT …/libro/foliacion` (corregir el último folio, con auditoría).
  Permiso nuevo `libro.emitir`. `npm audit fix` subió `sharp` a 0.35.5 (avisaba alta antes de este paso).
- **2026-10-20 — Libro de compras L5-4a, L5-5a y L5-6a (servidor, retenciones, constancias, por resolver y enteros).**
  Migraciones `0026_l5_retenciones_por_resolver` (cuatro columnas, cuatro checks e índice parcial en `retenciones`; pone
  `pendiente` a las retenciones con monto de documentos ya anulados) y `0027_l5_enteros_de_retenciones` (la tabla con sus
  checks, índice y RLS). El check `retenciones_resolucion_completa` es más estricto que el del diseño:
  sin resolver, la nota, la fecha y el autor deben ser nulos. Rutas en `/api/libro-de-compras/retenciones`: reporte del
  mes (`?mes=AAAA-MM&grupo=&constancia=con|sin|todas&documentos=vigentes|anulados|todos`, `retenciones.ver`) con los cuatro
  grupos de entero (`iva_agentes`, `isr_opcional`, `iva_factura_especial`, `isr_factura_especial`), su plazo con feriados,
  retenido, pagado, diferencia, estado (`sin_retenciones`, `pendiente`, `vencido`, `enterado`, `con_diferencia`) y aviso de
  vencido (apagado si hay pagos); `/exportar` (Excel, `.exportar`); `PUT :id/constancia`, `DELETE :id/constancia {motivo}`,
  `POST constancias` (lote de hasta 200, todo o nada, errores en `detalles.filas[{indice, campo, mensaje}]`) y
  `PUT :id/resolucion` (`.constancias`); `GET por-resolver?estado=pendiente|resueltas` con `accionSugerida`; enteros en
  `/enteros` (`GET ?anio=` con `.ver`; `POST`, `PUT :id`, `POST :id/anular` con `.enterar`, varios pagos por mes y grupo).
  Eliminar un documento con una retención con constancia o con su mes y grupo enterado queda bloqueado
  (`documento_con_constancia`, `documento_con_retencion_enterada`); anular deja sus retenciones con monto `pendiente` y
  avisa «Quedan N retenciones por resolver» y, si el mes se enteró, «Ese mes ya se enteró: rectifique el entero»; al
  registrar en un mes ya enterado el aviso de plazo vencido se cambia por «pague la diferencia». Las retenciones en cero
  salen marcadas (`enCero`) y no suman (el diseño decía que no salían). Pendiente: afinar el formato del número de
  constancia con un PDF real (L5-C4).
- **2026-10-20 — Libro de compras L5-4b (cliente, retenciones).** Tres páginas en Reportes (menú «Retenciones», permiso
  `retenciones.ver`) unidas por una navegación de pestañas con rutas propias, así cada una conserva su composable y sus
  120 líneas: `/libro-de-compras/retenciones` (mes), `…/por-resolver` y `…/enteros`. **Mes:** selector de mes (el anterior al
  abrir) y filtros de grupo, constancia y documentos; una tarjeta por grupo con retenido, pagado, lo que falta, plazo
  («Vence el» / «Venció el»), estado y aviso en rojo si está vencido, con atajo «Registrar pago»; tabla en pantallas
  anchas y tarjetas en el celular, con las retenciones en cero atenuadas y marcadas «En cero» (con lo propuesto y el
  motivo); selección múltiple de las que no tienen constancia, con «Marcar las N sin constancia» y una barra fija con el
  total; ventana de constancias en lote (número y fecha por fila, «Misma fecha para todas», los errores del servidor salen
  en su fila y en el campo) que sirve igual para anotar o corregir una; quitar constancia pide motivo y resume lo que
  pasa; los documentos anulados van en su propia tabla; Excel con los mismos filtros e Imprimir (`window.print()`).
  **Por resolver:** pendientes y resueltas, con la acción sugerida en lenguaje llano («Anule la constancia en
  Retenciones Web de la SAT.») y la ventana de resolución (la resolución sugerida queda escogida cuando solo hay una cosa
  por hacer; nota obligatoria salvo al volver a «pendiente»); la pestaña muestra cuántas hay pendientes. **Pagos a la
  SAT:** matriz del año (12 meses por 4 grupos) con estado y «pagado de retenido»; cada celda abre sus pagos (vigentes y
  anulados) y desde allí se registra, corrige o anula con motivo; la ventana del pago propone la fecha de hoy y lo que
  falta, y dice cómo quedaría el mes. Lógica pura con pruebas en `composables/retenciones/` (49 pruebas); textos en
  `textos-de-retenciones.ts`. Sin cambios en el servidor.
- **2026-10-20 — Libro de compras L5-7a y L5-8a (servidor, períodos: control, declarar, reabrir y rectificar).**
  Migración `0028_l5_periodos_y_declaraciones`: `periodos` (PK empresa y mes; abierto o declarado) y
  `declaraciones_de_periodos` (de solo agregar con `politicasDeSoloAgregarPorEmpresa()`; declaración, reapertura y
  rectificación con su foto de totales en jsonb y la diferencia). Cambios al diseño por lo que decidió el usuario: el
  número del formulario y la fecha de presentación son **opcionales** (sin fecha vale hoy; sin formulario se propone el del
  régimen del período) y el bloqueo es **por empresa**. **Dónde vive el ajuste:** en la configuración
  `libro-de-compras.periodos.control_de_declarados` (niveles empresa e instalación, pública), como decía el diseño: así soporte
  puede fijarlo para todas las empresas y no hace falta una tabla más; quién y cuándo salen de `core.configuraciones`
  (`actualizado_por`/`actualizado_en`) y el motivo, de la auditoría `corregir`. `ControlDePeriodos` ya bloquea (`estadoDe(periodo,
'consultar' | 'bloquear')`, `bloqueados()`): registrar con el período pedido (también lo de la bandeja), anular, eliminar y
  cambiar o quitar una vigencia del régimen que cubra un período declarado (`vigencia_fiscal_en_periodo_declarado`) responden
  409 `periodo_declarado` con `detalles.periodoPropuesto` y `propuestaEnPlazo`; `bloquear` toma la fila con `for share` contra el
  `for update` de declarar. No bloquea constancias, enteros, «por resolver» ni una nota de crédito recibida en otro mes. La vista
  previa solo avisa. Sin período pedido, si el que corresponde está declarado y bloqueado se usa el primer período abierto
  (dentro del art. 20 si lo hay; si no, fuera de plazo y el IVA va al costo) con un aviso; la nota de crédito no tiene
  alternativa. Con el bloqueo apagado, el aviso genérico «puede estar declarado» se reemplaza por «se declaró el … (SAT-2237 nº …)».
  Rutas en `/api/libro-de-compras/periodos`: `GET ?anio=` (12 meses con estado, última declaración y `control`), `GET :periodo`
  (historial con foto y diferencia, `cambioDesdeLaDeclaracion` y `revision`), `POST :periodo/declarar` (`periodos.declarar`),
  `POST :periodo/reabrir {motivo}` (`periodos.reabrir`, auditoría `reabrir`), `POST control/encender` (`periodos.declarar`) y
  `POST control/apagar {motivo}` (`periodos.reabrir`, auditoría `corregir`). Declarar funciona siempre; con el bloqueo
  apagado, declarar un período ya declarado es una rectificación sin reabrir. La foto es el resumen del libro (mismo código del
  libro) con la huella; los rubros del SAT-2237 se suman cuando exista L5-2a. Avisos al declarar: los DTE pendientes en la
  bandeja solo si hay lotes que toquen el período, y que los emisores pueden anular DTE hasta el vencimiento. Eventos
  `libro-de-compras.periodo_declarado` y `periodo_reabierto`. Pendiente: avisos de conciliación (esperan L4-10) y la página (L5-8b).

- **2026-10-20 — Libro de compras L5-2a (servidor, datos para el SAT-2237).** `GET /api/libro-de-compras/libro/sat-2237?periodo=AAAA-MM`
  (`libro.ver`) y `…/sat-2237/exportar` (`libro.exportar`, Excel de tres hojas: Rubros, Operaciones y Proveedores). Solo el
  régimen general (el del período: el de sus documentos o, sin ellos, el vigente) devuelve `{ aplica: true, formulario:
'SAT-2237', rubros, segmento9, proveedores, facturasEspeciales, casillas: null, avisos }`; el pequeño contribuyente recibe
  `{ aplica: false, formulario: 'SAT-2046', mensaje }` (las compras no se declaran) y los demás `formulario: null`; el Excel de
  estos responde 422 `sat_2237_no_aplica`. **Rubros** (nueve, siempre): combustibles, activos fijos, servicios, otras compras,
  importaciones (reservado, en cero), pequeño contribuyente, regímenes sin IVA, exento y no afecto y combustible exento por el
  Decreto 22-2026 (este último informativo, ya incluido en el exento); cada uno con base e IVA de facturas (y FESP), notas de
  débito, notas de crédito (en negativo) y neto; solo los documentos con crédito entran a los rubros del crédito.
  **Segmento 9:** cantidad y base (sin signo) de facturas, pequeño contribuyente, regímenes sin IVA, FESP, NCRE y NDEB del libro.
  **Proveedores:** por NIT, solo con crédito, notas neteadas en su proveedor (con aviso si queda en cero o negativo), del mayor
  al menor crédito, y la FESP aparte por NIT o CUI del vendedor, cada lista con su total. **Mapa de casillas:**
  `dominio/libro/casillas-del-sat-2237.ts`, todo «por confirmar» y sin versión (L5-2c espera la captura). Decisión: la FESP
  cuenta en «otras compras»/«servicios» según su línea. Pruebas: dominio (`datos-del-sat-2237.prueba.ts`) y API
  (`libro-de-compras-libro-sat-2237.api.prueba.ts`).
- **2026-10-20 — Libro de compras L5-2b (cliente, datos para el SAT-2237).** Página hermana del libro,
  `/libro-de-compras/libro/sat-2237` (menú Reportes «Datos para el SAT-2237», permiso `libro.ver`; el Excel pide
  `libro.exportar`), en vez de una pestaña: el libro ya está cerca de las 120 líneas, su pestaña es un interruptor
  libro/anulados y esta vista tiene su propio Excel y su propia respuesta (puede no aplicar). Lleva el mismo selector de
  período y un enlace «Libro de compras» para volver. Muestra la nota de que las casillas exactas se completan con la
  captura del formulario vigente, los avisos, los rubros (base e IVA de facturas, notas de débito, notas de crédito y
  neto; la nota de cada rubro bajo su nombre, visible también en el celular; los rubros sin movimiento van atenuados pero
  presentes), el segmento 9, el detalle de proveedores y las facturas especiales ordenados por crédito (con el aviso de
  neto en cero o negativo dentro de la fila). Si no aplica, explica el motivo y el formulario que corresponde (SAT-2046).
  Las tablas se desplazan dentro de su región, no la página. Lógica pura en `datos-del-sat-2237.ts` con pruebas.

- **2026-10-20 — Libro de compras L5-7b y L5-8b (cliente, períodos).** Página «Períodos» en Operación
  (`/libro-de-compras/periodos`, permiso `periodos.ver`) y su detalle (`…/periodos/AAAA-MM`). **Lista:** selector de año
  y una tarjeta por mes (declarado, abierto o sin terminar; última declaración, quién y formulario; toda la tarjeta lleva
  al período) y, arriba, el **bloqueo de períodos declarados** con lo que bloquea y lo que no, quién lo cambió y cuándo;
  encenderlo pide confirmar con resumen (`periodos.declarar`) y apagarlo pide motivo (`periodos.reabrir`). **Detalle:**
  revisión previa a declarar (avisos, nunca bloquean), «Cambios desde la declaración» (cifras declaradas contra hoy con el
  cambio, y las facturas registradas o anuladas después, con enlace a su ficha; si el libro cambió sin que lo expliquen
  altas ni anulaciones, remite a la auditoría), historial (declaraciones, rectificaciones y reaperturas) y las acciones
  Declarar o «Declarar de nuevo (rectificación)» (formulario, número y fecha opcionales; el resumen dice si queda
  bloqueado) y Reabrir (motivo y resumen). Declarar se ofrece con el mes terminado y, si está declarado, solo con el
  bloqueo apagado; los errores del servidor (`periodo_sin_terminar`, `periodo_ya_declarado`, fecha y número) salen en la
  ventana. **Registro de facturas:** el error `periodo_declarado` sale en el campo período y en el aviso del formulario con
  el botón «Usar <mes>» (aviso de que el IVA irá al costo si `propuestaEnPlazo` es falso; sin propuesta, explica que la
  nota de crédito va en su mes y lleva a Períodos). **Ficha:** anular o eliminar en un período bloqueado deja un aviso
  con el motivo y el enlace a Períodos. La bandeja (L4-9) aún no existe: su botón queda para cuando se programe. Lógica
  pura con pruebas en `composables/periodos/` y `errores-del-registro.prueba.ts`; textos en `textos-de-periodos.ts`. Sin
  cambios en el servidor.

- **2026-10-20 — Libro de compras L5-9a (servidor, análisis de compras).** Cinco análisis con permisos `libro-de-compras.analisis-de-compras.ver`
  y `.exportar` (un solo par). Todos reciben `?desde=AAAA-MM&hasta=AAAA-MM` (máximo 24 meses; si no, 400
  `rango_de_periodos_invalido`), cuentan solo documentos vigentes del libro, las notas de crédito restan y cada uno tiene su
  `GET /api/libro-de-compras/analisis/<ruta>` y `…/exportar` (Excel de una hoja, `<ruta>-AAAA-MM-a-AAAA-MM.xlsx`). Todas las
  respuestas empiezan con `desde` y `hasta` (primer día de mes) y llevan el dinero como texto. Rutas: `compras-por-proveedor`
  (`{ filas: [{ proveedorId, nit, nombre, documentos, total, base, ivaConCredito, ivaSinCredito, exentoYNoAfecto, idp, retenido,
neto }], total }`, con `incluirFueraDelLibro=true` entran también los documentos fuera del libro; NIT y nombre son los del
  documento más reciente), `compras-por-concepto` (`{ filas: [{ conceptoId, concepto, tipo, lineas, base, ivaConCredito,
ivaAlCosto, costo }], total }`, costo = `total − iva + iva_no_acreditable`), `iva-al-costo` (`{ motivos: [{ motivo, lineas: [{
documentoId, periodo, fecha, tipoDte, serie, numero, nitDelProveedor, proveedor, numeroDeLinea, concepto, ivaAlCosto }],
subtotal }], total }`), `activos-fijos` (`{ filas: [{ …documento, numeroDeLinea, concepto, descripcion, costo, ivaConCredito }],
total: { costo, ivaConCredito } }`) y `combustibles` (`{ combustibles: [{ combustible, meses: [{ periodo, galones, idp, base,
iva, exentoYNoAfecto, exentoPorDecreto, aviso }], subtotal }], total }`; galones con tres decimales; `combustible: null` y el
  aviso «IDP según la factura, sin galones» para el IDP escrito sin catálogo). Diseño: un caso de uso genérico
  (`ConsultarAnalisis` y `ExportarAnalisis`) parametrizado por una `DefinicionDeAnalisis` por reporte (Estrategia); las consultas
  agregan en SQL (`ConsultasDeAnalisisDrizzle`). Decisiones: el NIT y el nombre del proveedor salen del documento más reciente
  (no se lee `terceros`, para no cruzar módulos); lo retenido suma las retenciones practicadas del documento; la hoja de cada
  Excel lleva subtotales y total. Pruebas: dominio (`analisis.prueba.ts`) y API (`libro-de-compras-analisis-compras` y
  `-lineas`, con dos meses de compras).

- **2026-10-20 — Libro de compras L5-9b (cliente, análisis de compras).** Página «Análisis de compras» en Reportes
  (`/libro-de-compras/analisis`, permiso `analisis-de-compras.ver`; Excel con `.exportar`; imprimir con `window.print()`): rango
  desde-hasta (enero al mes en curso por omisión; avisa en la pantalla si va al revés o pasa de 24 meses, sin pedirlo al
  servidor) y cinco pestañas con teclado (flechas, Inicio y Fin). Cada una con su tabla, totales y Excel; «Por proveedor» con
  la casilla «Incluir documentos fuera del libro»; «IVA al costo» agrupa por motivo con los textos de `textos-de-documentos.ts`
  y su subtotal; «Combustibles» marca los meses exentos por el Decreto 22-2026 y muestra el aviso de IDP sin galones; los
  documentos llevan a su ficha. Los resultados se guardan por pestaña mientras no cambie el rango. En el celular las tablas
  se desplazan dentro de su marco, con la primera columna fija en proveedor y concepto. Pruebas: `datos-del-analisis.prueba.ts`.

- **2026-10-20 — Libro de compras, L4-9 (servidor): completar, confirmar y descartar filas de la bandeja de DTE recibidos, y enlace
  con lo registrado a mano.** Rutas bajo `/api/libro-de-compras/dte-recibidos`: `GET` (filtros `estado`, `desde`, `hasta`, `busqueda`,
  `tipoDte`, `loteId`, `conProveedor`, `pagina`, `limite`; permiso `documentos.importar`) responde `{ elementos, total, pagina, limite }`,
  cada fila con sus datos del DTE, `estado`, `borrador` y, si está pendiente, su `propuesta` (`proveedorId` por NIT, `conceptoId` del
  último documento del proveedor, `destino` sugerido, `fechaRecepcion` igual a la emisión con `recepcionObligatoria` si la empresa es
  agente de IVA, `periodo` según la regla de siempre y el control de períodos, y `avisoDelPeriodo`); `PATCH` (`{ ids, cambios,
aplicarPropuestas }`, `documentos.importar`, todo o nada, hasta 500 filas) responde `{ elementos }`: `cambios` escribe a mano
  (`null` deja sin completar) y `aplicarPropuestas` llena los campos pedidos con la propuesta de cada fila («Usar la fecha de
  emisión»); `POST …/vista-previa` y `POST …/confirmar` (`{ ids, datosFiscalesPorProveedor? }`, hasta 100, `documentos.crear`, 20 por minuto por
  usuario) responden `{ resultados: [{ id, documentoId, avisos } | { id, error: { codigo, mensaje, detalles } }] }` (la vista previa trae `documento`
  en vez de `documentoId`); `GET …/:dteId/solicitud` (`documentos.crear`) responde `{ solicitud, avisos }` para «Abrir en el
  formulario» (un IVA que no cuadra no es error ahí: sale sin deducir y con aviso); `POST …/descartar` (`{ ids, motivo }`) responde
  `{ elementos }` y `POST …/:dteId/restaurar` responde la fila, con el permiso nuevo `dte-recibidos.descartar` y la auditoría `descartar`
  (acción nueva de `AccionAuditada`) y `reactivar`. `documentos.importar` queda declarado aquí (L4-7 lo usará para subir el archivo).
  Confirmar procesa por fecha de emisión (facturas antes que sus notas), cada fila en su transacción (`ConfirmadorDeFila`: revisa
  y prepara, crea el proveedor nuevo con `terceros.crear_proveedor_desde_dte` y el tipo de persona según el nombre, y registra con el
  mismo `RegistrarDocumento` del formulario). Una fila con error responde el suyo y no frena a las demás. El exento deducido sigue
  L4-c4 (`montos-del-dte.ts`: tolerancia en el IVA de `max(5, líneas)` centavos, sin exento negativo, notas y familias sin IVA no
  deducen); una fila con monto distinto de cero en una columna que el mapa no conoce (`encabezados_no_reconocidos` de su lote) no se
  confirma en lote. Un DTE registrado en otra empresa de la misma cuenta deja la fila `bloqueado` (y se libera sola al anularse
  allá); en otra cuenta no se avisa nada y sale el mensaje genérico. Registrar a mano un documento con FEL pasa a `registrado` la fila
  (también una descartada); anular o eliminar el documento la devuelve a `pendiente`. Decisiones: la marca «montos del resumen de la
  SAT» va en las observaciones del documento y en los avisos; `bloqueado` puede pasar a `descartado` (el diseño lo pedía y la tabla de
  transiciones de L4-5 no); como el importador aún no existe, el bloqueo se detecta al confirmar y al restaurar; el proveedor nuevo
  queda creado aunque el registro de esa fila falle; las respuestas de datos fiscales se aceptan por id del proveedor o por NIT.
  Pruebas: dominio, casos de uso y API (46 pruebas en cinco archivos).

- **2026-10-20 — Cuentas por pagar CP1-1 (servidor, módulo y datos).** Módulo `cuentas-por-pagar` generado (`dependeDe`:
  `libro-de-compras` y `bancos`, respuesta U10), con seis permisos del recurso `documentos` (`ver`, `registrar`, `autorizar`,
  `autorizar-propios`, `anular`, `eliminar`; sin `crear` ni `gestionar`) y la variable
  `cuentas-por-pagar.vencimientos.meses_por_omision` (0 a 12, un mes por omisión, niveles instalación y empresa, no pública).
  Esquema `cuentas_por_pagar` con la migración `0001_cp1_documentos`: `documentos` (una sola tabla para todos los tipos,
  por empresa, con checks de estado, notas, vencimiento, separación de funciones y anulación; llave compuesta hacia
  `libro_de_compras.documentos` por `(id, empresa, proveedor, destino)` y llave autorreferente `documentos_factura_fk`
  escrita a mano), `aplicaciones_de_notas` (por empresa; la nota se borra en cascada) y `condiciones_de_proveedor` (por
  cuenta, días de crédito 0 a 365). Mensaje de unicidad `documentos_documento_unico`. Pruebas de integración de checks,
  llaves y RLS. Diseño: `docs/modulos/diseno-datos-cuentas-por-pagar.md` (respuestas del 2026-10-20). El módulo del cliente
  quedó generado y vacío (sin entradas de menú) para el paso CP1-8.
- **2026-10-20 — Cuentas por pagar CP1-2 (servidor, recibir documentos).** `RecibirDocumento` atiende
  `cuentas-por-pagar.recibir_documento` dentro de la transacción de Libro de compras: todo tipo de documento entra como
  `pendiente` (U2); a los cargos se les propone el vencimiento (emisión más los días de crédito del proveedor, por cuenta; sin
  dato, emisión más `meses_por_omision` meses calendario con el día ajustado a fin de mes: 31-ene a 28-feb; con 0 días,
  contado) y la nota de crédito (sin vencimiento) se aplica sola desde que se recibe (U7), con su factura bloqueada:
  primero a la factura, luego a las notas de débito de esa factura de la más antigua a la más nueva; lo que sobra queda como
  saldo libre (los saldos se calculan, U4: neto = total − retenciones − lo aplicado). La nota de débito es un cargo con su
  propio vencimiento. Dominio puro: `propuesta-de-vencimiento` y `reparto-de-nota-de-credito`.
  `Mediador.retirarManejadoresDe(modulo)` (solo para pruebas) deja que las pruebas de Libro de compras cambien al módulo real
  por su doble (`instalarDestinoFalso`). Pruebas de API a través de Libro de compras (`cuentas-por-pagar-recibir.api.prueba.ts`).
- **2026-10-20 — Cuentas por pagar CP1-3 (servidor, bajas por aviso) y regla U6 de Libro de compras.** Cuentas por pagar
  escucha `libro-de-compras.documento_por_anular` y `documento_por_eliminar` (`AnularPorAviso` y `EliminarPorAviso`), siempre
  idempotentes y solo para su destino. Las reglas que pueden rechazar la baja son una lista de funciones
  (`dominio/reglas-de-baja.ts`, `REGLAS_PARA_ANULAR` y `REGLAS_PARA_ELIMINAR`) que la composición arma, así que contraseñas (CP3)
  y pagos (CP4) suman las suyas sin tocar los casos de uso: hoy `noTenerNotasAplicadas` (un cargo que no es nota de débito, con
  notas de crédito aplicadas) y, solo para eliminar, `noEstarAutorizado`. Anular borra las aplicaciones de la nota de crédito (vuelven al
  saldo de sus cargos) o las que recibió una nota de débito (vuelven al saldo libre de esas notas), deja `anulado` con el motivo
  y `estaba_autorizado`, y audita `anular` con la ficha tal como estaba (con sus aplicaciones). Eliminar audita `eliminar` y
  borra su fila antes de que Libro de compras borre la suya. El evento `cuentas-por-pagar.documento_anulado` (con
  `estabaAutorizado`) se publica **tras confirmar la transacción de Libro de compras**: `despuesDeConfirmar` en la unidad de
  trabajo y `PublicadorEventosTrasConfirmar` (si la transacción se deshace, el evento se descarta). U6: Libro de compras rechaza
  anular y eliminar si el destino no está activo (`destino_inactivo`: «Active Cuentas por pagar para dar de baja este
  documento.»), salvo que el destino mismo pida la baja. Pruebas de API de las bajas a través de Libro de compras
  (`cuentas-por-pagar-bajas.api.prueba.ts`).
- **2026-10-20 — Libro de compras L4-10 (servidor, conciliación por período).** `GET /libro-de-compras/dte-recibidos/conciliacion`
  (`periodo` como `AAAA-MM` o `AAAA-MM-01`, permiso `documentos.importar`) cruza en el momento los documentos vigentes del período
  (con `muestra_en_reportes_sat`) con la bandeja, primero por autorización FEL y luego por NIT, serie y número, y responde
  `{ periodo, hayDatosDeLaSat, resumen, resultados }` con ocho listas: cuadra, con diferencias (campo, Arrancar, SAT; manda el
  DTE, también por centavos de IVA), en la SAT y no en Arrancar (con su estado en la bandeja, incluidas las bloqueadas),
  registrado en otro período, en Arrancar y no en la SAT, sin datos de la SAT (el mes no lo toca ningún lote `bandeja`),
  anulado en la SAT y vigente aquí, y descartado. Lógica pura en `dominio/conciliacion/` (`conciliar`, `emparejar`,
  `CoberturaDeLotes`); consulta con `ConsultasDeConciliacionDrizzle`, sin tablas ni migración. Pruebas de dominio y de API
  (`libro-de-compras-dte-recibidos-conciliacion.api.prueba.ts`). Queda la conciliación liviana (L4-13) y la pantalla (L4-12).
- **2026-10-20 — Libro de compras, decisión U15 (servidor): intereses de la nota de débito.** La clase de cargo de la NDEB (R3-3)
  llegaba en la solicitud solo para el aviso y no se guardaba; ahora se guarda en `documentos.clase_de_cargo` (migración `0029`,
  con el check `documentos_clase_de_cargo_valida`: solo en la nota de débito) y viaja en el documento, la ficha y la
  vista previa. La lista sugerida de conceptos de gasto suma «Intereses y recargos a proveedores» (servicio, neutral para
  cualquier rubro) y la migración `0030` lo agrega a las empresas que ya tenían catálogo (no a las vacías, que lo reciben al
  sembrarse). Los análisis de compras de L5-9a (por proveedor, por concepto y los demás) excluyen los documentos con clase
  `intereses` porque son gasto financiero y no compra. Pruebas de API (`libro-de-compras-nota-de-debito-intereses.api.prueba.ts`).
  El cliente ya proponía el concepto por nombre («financier» o «interes»); falta que muestre la clase en la ficha.
- **2026-10-20 — Cuentas por pagar CP1-4 (servidor, días de crédito) y U14 b.** Cuentas por pagar aporta su sección al formulario
  de Proveedores: escucha `terceros.proveedor_guardado`, valida `secciones.cuentas-por-pagar` (`diasDeCredito` entero 0 a 365
  o `null` para el plazo por omisión, y `contarDesdeLaRecepcion` booleano; lo que no llega se queda como estaba; un valor
  inválido deshace el formulario con el error en `secciones.cuentas-por-pagar.<campo>`) y hace el _upsert_ en
  `condiciones_de_proveedor`, sin auditoría. Lectura: `GET /api/cuentas-por-pagar/proveedores/:proveedorId/condiciones`
  (permiso `terceros.ver`; sin fila devuelve `diasDeCredito: null` y `contarDesdeLaRecepcion: false`). U14 b: migración `0002`
  agrega `contar_desde_la_recepcion boolean not null default false`; `RecibirDocumento` toma la fecha de recepción de
  `libro_de_compras.documentos` (`DocumentosDeCompraDrizzle`, solo lectura de infraestructura) y, si el proveedor así lo
  pactó, el plazo corre desde ella (`fechaBaseDelPlazo`; nunca antes de la emisión, para no violar
  `vencimiento >= fecha_emision`). U14 a (vencimiento desde los abonos de la FCAM) queda pendiente: los abonos no llegan en
  `DocumentoParaDestino`. La entidad `DocumentoPorPagar` suma `ingresadoPor` (`creado_por`), base de la separación de funciones.
- **2026-10-20 — Cuentas por pagar CP1-5 (servidor, consultas) y U13.** Rutas de solo lectura con `cuentas-por-pagar.documentos.ver`: `GET /api/cuentas-por-pagar/bandeja` (pendientes del más antiguo al más nuevo, hasta 500, con `total`), `GET /api/cuentas-por-pagar/documentos` (filtros `proveedorId`, `estado` = un estado, `vigente` por omisión o `todos`, `tipo`, `emitidosDesde`, `emitidosHasta`, `soloVencidos`, `pagina` y `limite`; responde `{ elementos, total, pagina, limite }`), `GET .../documentos/:documentoId` (la ficha: lo mismo más `notas` y `aplicaciones`) y `GET .../proveedores/:proveedorId/saldo`. Todo documento sale con serie, número y proveedor (de Libro de compras y Terceros), `neto`, `aplicado` y `saldo` calculados (U4; en una nota de crédito el saldo es su saldo libre; anulado, cero), `vencido`, `esPropio` (el usuario lo ingresó o lo completó) y las acciones calculadas en el servidor (`puedeRegistrar`, `puedeAutorizar`, `puedeDesautorizar`, `puedeCambiarVencimiento`, `puedeAnular`, `puedeEliminar`; reglas de §3.1 y §4.7, como guía: el caso de uso revisa de nuevo). Por U13 el saldo del proveedor separa `porPagar` y `vencido` de `saldosDeudores` (saldo libre de sus notas, con la lista `notasConSaldoLibre`) y nunca los resta. U13: el contrato de `cuentas-por-pagar.recibir_documento` ahora responde `{ avisos: string[] }` y Libro de compras los suma a los suyos; una nota de crédito que deja saldo libre devuelve «Esta nota deja Q… a favor de la empresa porque la retención ya se practicó. Compénselo en la próxima factura o pida el reintegro al proveedor.».
- **2026-11-01 — Cuentas por pagar CP1-6 (servidor, completar y autorizar).** Rutas con `{ tags: Cuentas por pagar }`: `POST /api/cuentas-por-pagar/documentos/registrar { documentos: [{ id, vencimiento? }] }` (completar en lote, máx. 100, todo o nada; `documentos.registrar`; sin vencimiento queda el propuesto al recibir, una nota de crédito no admite vencimiento), `POST .../documentos/autorizar { ids }` (lote de hasta 100, todo o nada; `documentos.autorizar`), `POST .../documentos/:documentoId/desautorizar { motivo }` (U5; `documentos.autorizar`) y `PATCH .../documentos/:documentoId { vencimiento }` (`documentos.registrar`, cargos `registrado` o `autorizado`, sin auditoría). Las de lote y las de un documento responden con los `DocumentoPorPagarDto` ya recalculados (un arreglo, o uno solo en desautorizar y en el PATCH). Autorizar (U12: «aprobado para pago», no provisiona) manda primero `libro-de-compras.marcar_procesado` y después bloquea la fila de aquí (orden de §4.7), recorre los ids ordenados y separa funciones: quien lo ingresó en Libro de compras o lo completó necesita `autorizar-propios` (el caso de uso lo recibe del controlador); sin él, 403 `autorizacion_de_lo_propio` con el documento en el mensaje; con él, `autorizacion_propia = true` y auditoría `autorizar` (acción nueva de `AccionAuditada`) con la ficha anterior. Desautorizar exige motivo (1 a 300), manda `marcar_procesado(false)`, audita `devolver` y deja una lista de reglas (`REGLAS_PARA_DESAUTORIZAR`, vacía hasta los pagos de CP4). Eventos al confirmar: `cuentas-por-pagar.documento_autorizado` (con `autorizacionPropia`) y `cuentas-por-pagar.documento_desautorizado`. Sin migraciones. De paso, `AnularPorAviso` comparte con la anulación de CP1-7 la función `anularLoGuardado`.
- **2026-11-01 — Cuentas por pagar CP1-7 (servidor, bajas desde aquí).** `POST /api/cuentas-por-pagar/documentos/:documentoId/anular { causa, motivo }` (permiso `documentos.anular`; causas `error_de_captura`, `fel_anulada_por_el_emisor` y `no_corresponde_a_la_empresa`; motivo de 1 a 300; responde el `DocumentoPorPagarDto` ya anulado) y `DELETE /api/cuentas-por-pagar/documentos/:documentoId` (permiso `documentos.eliminar`; responde 204). Ninguna pide el permiso de Libro de compras, aunque dan de baja también el registro de allá. Anular revisa sus reglas sin bloquear (`DocumentoYaAnulado`, `DocumentoConNotasVigentes`, y la lista `REGLAS_PARA_ANULAR`), manda `libro-de-compras.anular_documento` con `origen: 'cuentas-por-pagar'` (Libro de compras bloquea, revisa período, notas y retenciones y no devuelve el aviso), bloquea la fila de aquí, revisa de nuevo y hace lo mismo que el aviso de baja (`anularLoGuardado`: deshace aplicaciones, anula, audita la ficha como estaba y publica `documento_anulado` al confirmar). Eliminar solo vale para `pendiente` o `registrado` sin notas (ni anuladas): lee primero la fila de Libro de compras con `for update` (puerto `DocumentosDeCompra.bloquear`), bloquea la de aquí, revisa `REGLAS_PARA_ELIMINAR`, audita `eliminar`, borra la de aquí y después manda `libro-de-compras.eliminar_documento` (la llave obliga a ese orden); sin evento propio. Errores nuevos: `documento_ya_anulado`, `documento_con_notas_vigentes`, `documento_no_eliminable` (anulado), `documento_con_notas`, `motivo_invalido`. Sin migraciones. La orden de anular de Libro de compras responde `void`, así que la anulación no devuelve aún sus avisos de período declarado ni de retenciones por resolver.
- **2026-10-20 — Libro de compras, decisión U15 (cliente): clase de cargo en la ficha.** La ficha de una nota de débito muestra
  «Clase de cargo» (Diferencia de precio, Intereses u Otros cargos; se omite si el documento no la lleva). El formulario de la
  NDEB propone el concepto de intereses por nombre y ahora prefiere el de la lista sugerida, «Intereses y recargos a
  proveedores», sobre cualquier otro gasto financiero o de intereses (después sigue buscando «financier» e «interes»; no
  usa conceptos inactivos). Pruebas puras de ambas cosas.
- **2026-10-21 — Libro de compras L4-11 y L4-12 (cliente): pantalla «DTE de la SAT» con la bandeja y la conciliación.** Ruta
  `/libro-de-compras/dte-recibidos` (permiso `documentos.importar`, menú Operación). Cuatro pestañas por estado (pendientes,
  registrados, descartados, bloqueados) con filtros (búsqueda, tipo, proveedor nuevo o existente, fechas de emisión), 50 por
  página y marcas por página. Pendientes: «Completar» en lote (concepto, destino, fecha de recepción o «Usar la fecha de
  emisión», y la factura que corrige si se completa una sola nota), «Confirmar» con vista previa (neto a pagar y avisos por
  fila, proveedores nuevos que se crearán, preguntas fiscales del proveedor con «Volver a calcular») y resultados fila por fila
  (las que fallan quedan pendientes y marcadas, con el error y qué hacer), y «Descartar» con motivo; las descartadas se
  restauran y las registradas llevan a su factura. Quinta pestaña, «Conciliación»: selector de mes (por omisión el anterior),
  ocho tarjetas con su conteo, lista del grupo abierto con diferencias (campo, Arrancar, SAT) y acciones (abrir la factura,
  «Registrar» que pasa a Pendientes buscando el número, descartar y restaurar). «Ingreso de facturas» suma el botón «Importar de
  la SAT» y el aviso «N DTE pendientes de la SAT» solo a quien tiene el permiso y hay pendientes. El botón «Cargar el archivo de
  la SAT» está deshabilitado con «Disponible pronto» hasta L4-6/L4-7. Los proveedores nuevos se crean al confirmar (el servidor lo
  hace dentro de la confirmación; no hay endpoint aparte). Queda sin programar «Abrir en el formulario». Lógica pura con pruebas
  en `composables/bandeja/`.
- **2026-11-01 — Libro de compras L5-2c y Datos para el SAT-2046.** Servidor: rubro `compras_sin_credito` (base más el IVA que fue al costo de los documentos fuera de plazo, no vinculados, de empresa sin crédito y nota de débito tardía); mapa de rubros a casillas de varios a uno y de uno a varios (`mapa-de-casillas-del-sat-2237.ts`, `casillas-del-sat-2237.ts`) con los nombres de las guías de Declaraguate marcados «sin confirmar (versión hasta 2026-08)» y sin números; importaciones preparadas para repartirse en cuatro casillas con `partes`; `vista-del-formulario-sat-2237.ts` con las secciones 5, 6 (máximo 10 proveedores, ordenados por base) y 9; el DTO trae `comoEnElFormulario` en lugar de `casillas`. Cliente: pestaña «Como en el formulario» con aviso de nombres sin confirmar y el anexo de facturas especiales aparte; página «Datos para el SAT-2046» con la guía paso a paso (menú Reportes del Libro de compras). Informe del contador en `docs/modulos/investigacion-sat-2237-y-2046.md`. Pendiente: SAT-2241 del pequeño contribuyente electrónico.
- **2026-11-01 — Cuentas por pagar CP1-8 (cliente, módulo y días de crédito).** El módulo del cliente (`cliente/src/modulos/cuentas-por-pagar/`) tiene su servicio `ApiCuentasPorPagar` con todas las rutas de CP1 (condiciones, saldo, bandeja, lista, ficha, completar, autorizar, desautorizar, cambiar vencimiento, anular y eliminar), sus tipos y sus textos (tipos de documento, estados, causas de anulación). Aporta al formulario de Proveedores la sección «Cuentas por pagar» (`secciones['cuentas-por-pagar']`: días de crédito con la ayuda «vacío = un mes; 0 es de contado» y el interruptor «Contar el plazo desde la recepción», U14 b) y a la ficha del proveedor el plazo en palabras y, si el usuario tiene `documentos.ver`, lo que se le debe con la empresa activa (por pagar, vencido y, aparte, lo que tiene a favor la empresa por notas de crédito, U13). `usarLecturaDeSeccion` (y su prueba) pasó de Libro de compras a `core/composables` porque ahora la usan dos módulos. El menú del módulo se llena con las pantallas de CP1-9 y CP1-10.
- **2026-11-01 — Cuentas por pagar CP1-9 (cliente, bandeja).** Página de Operación «Bandeja de cuentas por pagar» (`/cuentas-por-pagar/bandeja`, permiso `documentos.ver`; primera entrada del menú del módulo): tarjetas de los pendientes, del más antiguo al más nuevo, cada una con sus datos, el vencimiento propuesto al recibir en un campo de fecha editable (las notas de crédito no vencen y no llevan campo) y el enlace «Ver en el libro de compras» (solo con `libro-de-compras.documentos.ver`). Quien tiene `documentos.registrar` marca documentos (casilla por tarjeta, «Marcar todos» de 100 en 100 como el tope U11) y «Completar» en la barra fija de abajo: antes de enviar marca en la tarjeta el vencimiento vacío o anterior a la emisión, pide confirmar con un resumen y envía el lote todo o nada; los errores del servidor salen como aviso. Si la bandeja tiene más de 500, avisa de que se ven los más antiguos. Lo puro (vencimientos, errores, cuerpo y resumen de completar, selección por lotes) tiene pruebas. El estado de la tarjeta lo manda el servidor (`puedeRegistrar`); el cliente solo oculta por permiso.
- **2026-11-01 — Cuentas por pagar CP1-10 (cliente, documentos).** Páginas de Operación «Documentos por pagar» (`/cuentas-por-pagar/documentos`) y su ficha (`/cuentas-por-pagar/documentos/:documentoId`), ambas con `documentos.ver`. La lista tiene filtros (proveedor, estado —vigentes por omisión, por completar, por autorizar, autorizados, anulados, todos—, tipo, emitidos desde y hasta, solo vencidos), paginación de 50 y tarjetas que llevan a la ficha con estado, «Vencido», vencimiento, neto y saldo (en una nota de crédito, «Saldo a favor»). Quien tiene `documentos.autorizar` marca documentos con casilla y «Autorizar» en la barra fija, con confirmación que resume cuánto se aprueba a pagar (lotes de 100). Lo que el usuario ingresó o completó (`esPropio`) solo tiene casilla si tiene `autorizar-propios`; si no, la tarjeta dice «lo autoriza otra persona»; si el servidor rechaza con 403 `autorizacion_de_lo_propio`, su mensaje (que nombra el documento) queda a la vista en un aviso que se cierra a mano. La ficha muestra datos, montos (total, retenciones, neto, aplicado, saldo), seguimiento, las notas que lo corrigen y las notas de crédito aplicadas (con enlaces), y el enlace al registro en el libro de compras. Sus botones salen según el DTO (`puedeAutorizar`, `puedeCambiarVencimiento`, `puedeDesautorizar`, `puedeAnular`, `puedeEliminar`) y el permiso del usuario: autorizar, cambiar vencimiento (ventana con fecha), desautorizar (ventana con motivo), anular (ventana con causa y motivo, que explica que se anula el registro y no la FEL) y eliminar (confirmación que dice qué se pierde). Lo puro (filtros, textos, reglas de ventanas, resumen de autorización, casillas) tiene pruebas. Pendiente para CP1-11 (QA): probarlo de punta a punta en el navegador con el servidor.
- **2026-11-01 — Libro de compras L4-4b (servidor, core/intercambio): lector de `.xls` (Excel 97-2003).** La SAT entrega los DTE recibidos como `.xls`, así que cambia la decisión L4-e (rechazarlo). `detectarFormato` da `'xls'` con la firma OLE2 y `LectorDeFilasDeArchivo` despacha a `LectorDeXls` (`infraestructura/lectura/`), un lector propio sin dependencias, con los controles de `docs/modulos/evaluacion-lectura-xls.md`: contenedor CFB (`xls/cabecera-de-cfb.ts`, `tablas-de-cfb.ts`, `directorio-de-cfb.ts`, `lector-de-cfb.ts`: firma, versión 3 o 4, cuentas de sectores que quepan, FAT/DIFAT/mini FAT sin ciclos ni sectores fuera de rango, directorio con lista blanca de 32 entradas, mini flujo) y libro BIFF8 (`registros-biff.ts`, `tabla-de-cadenas-biff.ts` con CONTINUE y su byte de banderas, `celdas-biff.ts` para LABELSST, LABEL, RSTRING, NUMBER, RK, MULRK, FORMULA por su valor guardado y valores lógicos, `rejilla-de-celdas.ts`, `lector-de-biff8.ts`). Rechaza FILEPASS (`ExcelCifrado`, nuevo), OBJ, MSODRAWING, TXO, hojas que no son de cálculo, BOF de gráficos o módulos y `Auto_Open`/`Auto_Close` (`ExcelConContenidoNoPermitido`); un BIFF5 da `ExcelAntiguoNoAdmitido` y cualquier otro error interno sale como `ArchivoNoLegible` sin traza. Solo lee la primera hoja; las fechas numéricas de Excel no se interpretan (la SAT las manda como texto). Pruebas con un escritor de prueba (`xls/cfb-de-prueba.ts`, `xls-de-prueba.ts`, datos inventados): lo básico, cortes de CONTINUE con cambio entre comprimido y UTF-16, 10,000 filas, topes, almacenes y flujos prohibidos, ciclos, truncados, macros, objetos y 500 mutaciones sin error propio de JavaScript. Medido: 10,000 filas (4.3 MB) se leen en unos 100 ms, así que no hace falta `worker_threads`. Verificado a mano con el archivo real de la SAT (33 columnas), sin copiarlo ni poner sus valores en pruebas.
- **2026-11-01 — Libro de compras L4-6 (servidor, lectura del DTE de la SAT).** Con el archivo real a la vista (`.xls`, 33 columnas), en `libro-de-compras/aplicacion/dte/`: `mapa-de-encabezados-sat.ts` (`VERSION_DEL_MAPA`, variantes reales como «Tipo de DTE (nombre)» —trae el código: FACT, FPEQ, RDON, NCRE—, «Número del DTE», «ID del receptor» —el NIT del receptor—, «Gran Total (Moneda Original)», «IVA (monto de este impuesto)» y **«Petróleo (monto de este impuesto)» = el IDP**; los otros impuestos por su nombre corto con o sin el sufijo), `encabezados-adicionales.ts` (variable de instalación `libro-de-compras.dte.encabezados_adicionales`, JSON con Zod que solo agrega variantes; inválido se ignora y se avisa), `valores-de-la-sat.ts` (fechas `aaaa-mm-ddThh:mm:ss[.mmm][±hh:mm]` con o sin zona, `dd/mm/aaaa` y `aaaa-mm-dd`: con zona se pasa al reloj de la empresa y sin zona manda la hora de la empresa; montos con `Q`, comas y signo, redondeados desde la mitad con aritmética de enteros; tipo por código o por nombre; autorización UUID en minúsculas; NIT sin guiones), `convertidor-de-fila-sat.ts` y `lector-de-dte-sat.ts` (`leerDteDeLaSat`: ubica columnas, exige las obligatorias o lanza `ArchivoDeLaSatNoReconocido` 422 con `faltan` y `encontrados`, convierte cada fila a `DatosDelDte` o la rechaza con motivo —`dato_ilegible`, `tipo_sin_familia`, `nit_receptor_distinto`, `moneda_no_admitida`, `total_en_cero`, `impuestos_exceden_total`, `autorizacion_repetida`—, junta repetidas idénticas aparte y devuelve avisos: moneda o receptor supuestos, montos en columnas desconocidas, IVA bajado unos centavos por redondeo). Anulación: estado «Anulado», marca «Si» o fecha de anulación; sin fecha legible se usa la de la carga. **Decimales:** los montos se redondean con `core.regional.decimales_montos` (2 a 4, nunca menos de 2) para compararlos con el gran total, y se guardan a dos decimales porque las columnas de la bandeja son `numeric(14,2)` y `aCentavos` trunca; si al pasar a dos decimales las partes pasan del total por hasta 3 centavos se baja el IVA y se avisa. Migración `0031_l4_formato_xls_del_lote` (el check `formato` de `lotes_de_dte` admite `'xls'`). `comparable` de `core/intercambio` se exporta. Pruebas puras con filas inventadas.
- **2026-11-01 — Libro de compras L4-7 (servidor, importar a la bandeja).** `POST /api/libro-de-compras/dte-recibidos/importar` (multipart con el archivo; permiso `libro-de-compras.documentos.importar`; `limitarImportaciones`, 10 solicitudes por minuto por usuario; 5 MB) acepta `.xls`, `.xlsx` y CSV y responde `{ lote, avisos }` (el `LoteDeDte` con `filasLeidas`, `filasNuevas`, `filasActualizadas`, `filasSinCambio`, `filasRechazadas`, `anuladasEnLaSat`, `rechazos` —`{ fila, autorizacion, motivo, detalle }`, hasta 1,000— y `encabezadosNoReconocidos`). `ImportarDteRecibidos` lee el archivo fuera de la transacción y después, en una sola (todo o nada): exige el NIT de la empresa (`EmpresaSinNit`), convierte con `leerDteDeLaSat`, y por cada fila válida decide con `clasificarCarga`: nueva `pendiente` con el proveedor activo del NIT, `registrado` si la autorización ya está vigente en el libro de la empresa, `bloqueado` (`registrado_en_otra_empresa`) si lo está en otra empresa de la misma cuenta (función `security definer`, una consulta por tanda de 1,000), actualizada si cambió algún dato de la SAT (lo normal: pasó a anulada; no toca el estado ni el borrador y audita `corregir` con el DTO anterior y «Lote del <fecha>: <campos>»), o sin cambio (solo cambia su último lote). Las repetidas idénticas dentro del archivo cuentan como sin cambio. Guarda el lote con su sha256, nombre, tamaño y versión del mapa (nunca el archivo) y avisa: archivo ya subido, moneda o receptor supuestos, montos en columnas desconocidas, IVA ajustado por redondeo, anuladas que ya estaban registradas y bloqueadas. Escritura en tandas de 500 (`RepositorioParaImportar`), consultas en lote (`ConsultasParaImportar`) y configuración de importación (`ConfiguracionDeImportacionEnConfiguracion`). Errores: `archivo_de_la_sat_no_reconocido` (400, con `faltan` y `encontrados`) más los de lectura del archivo. Pruebas de API con `.xls` sintéticos (carga, reimportar, pasar a anulada con auditoría, ya registrada a mano, `.csv`, permisos, objetos incrustados, HTML disfrazado, bomba zip) y del clasificador. Pendiente: `corregir` con muchas filas cambiadas audita una por una dentro de la misma transacción.
- **2026-11-01 — Libro de compras L4-7 (cliente): se habilita «Cargar el archivo de la SAT» en «DTE de la SAT».** `ApiDteRecibidos.importar(archivo)` sube el `.xls`, `.xlsx` o CSV a `POST /libro-de-compras/dte-recibidos/importar`. `usarImportarDeLaSat` (con `usarEleccionDelArchivo`) maneja la ventana: el archivo elegido se revisa por su extensión antes de subir (el servidor revisa el contenido), y al terminar bien recarga las pestañas de la página (clave `pestaña-recarga`), así que lo nuevo aparece en Pendientes aunque la ventana siga abierta. `VentanaDeImportarDeLaSat` muestra la instrucción, el selector de archivo, el titular («Se leyeron N filas: M DTE nuevos»), las cuentas del lote (nuevos, cambiaron, ya estaban, anulados, no entraron), los avisos y la lista de filas rechazadas con su motivo en palabras; se quitó la insignia «Disponible pronto». Lógica pura con pruebas en `datos-de-la-importacion.ts`. La página sigue en menos de 120 líneas.
- **2026-11-01 — Proveedor nuevo desde «DTE de la SAT» PN-1 (servidor): la orden `terceros.crear_proveedor_desde_dte` recibe la identidad ya partida.** Diseño en `docs/modulos/diseno-proveedor-nuevo-desde-dte.md`. `datos` pasa a `{ nit, tipoDePersona, nombres, apellidos, razonSocial, puedeCrearProveedores }` (sale `nombre`) y la respuesta suma `nombre` (el del tercero, nuevo o existente; si el NIT ya era de un tercero se ignora la identidad pedida). `ConfirmadorDeFila` sigue adivinando el tipo hasta PN-3. Pruebas: individual con nombres y apellidos, jurídica, individual sin nombres (`falta_el_nombre`) y tercero existente con su nombre.
- **2026-11-01 — Proveedor nuevo desde «DTE de la SAT» PN-2 (servidor): la propuesta de tipo, nombres y razón social.** `libro-de-compras/dominio/propuesta-de-proveedor-nuevo.ts`: `partirNombreDePersona` (regla sacada del archivo real de la SAT: formato del RTU con cuatro comas, una coma es `NOMBRES , APELLIDOS`, sin coma por palabras con las partículas `DE`, `DEL`, `LA`, `LAS`, `LOS`, `Y`, `VDA.` pegadas a la que sigue; se conserva la escritura del DTE) y `propuestaDeProveedorNuevo` (tipo, forma individual y forma jurídica). `tipoDePersonaDelNombre` reconoce también `FOUNDATION`, `INC`, `CORP`, `LLC` y `LTD`. Con otras cantidades de comas, o con un lado vacío, se parte por palabras. Pruebas con los nombres reales del diseño.
- **2026-11-01 — Proveedor nuevo desde «DTE de la SAT» PN-3 (servidor): confirmar crea el proveedor con lo que el usuario confirmó.** `POST …/dte-recibidos/confirmar` (y el mismo esquema de la vista previa) acepta `proveedoresNuevos`: por NIT del emisor, `{ tipoDePersona: 'individual', nombres, apellidos? }` o `{ tipoDePersona: 'juridica', razonSocial }`, con los límites de Terceros (80/80/150) y hasta 100 NIT. Clase nueva `ProveedorDeLaFila` (sale de `ConfirmadorDeFila`; ya no se adivina el tipo con `tipoDePersonaDelNombre` al confirmar): con proveedor ya decidido lo usa; sin `proveedores.crear` falla con `proveedor_nuevo_sin_permiso` (403, `detalles.nit`) antes de llamar a Terceros; sin `proveedoresNuevos[nit]` falla con `proveedor_nuevo_sin_confirmar` (422, `detalles.nit` y `campo`) y no crea nada; si no, manda la orden del mediador y asigna el proveedor a las filas pendientes del NIT. Los errores van por fila. `AccesoDenegado` acepta `detalles`. Pruebas de la clase, del esquema y de API (individual con nombres confirmados, sin confirmar, sin permiso, cliente que recibe el papel, nombre vacío).
- **2026-11-01 — Proveedor nuevo desde «DTE de la SAT» PN-4 (servidor): la vista previa ya no rechaza la fila sin proveedor.** `VistaPreviaDeDteRecibidos` corre cada fila en **una** transacción que siempre se deshace (`VistaPreviaTerminada`, el patrón de `EnsayoTerminado`): resuelve el proveedor con `ProveedorDeLaFila` (`exigirConfirmado: false`: sin lo pedido para el NIT usa la propuesta en su tipo), calcula con `PrevisualizarDocumento` y devuelve el documento con `proveedorNuevo` (`nit`, `nombreDelDte`, `accion` `crear` o `agregar_papel`, `nombreExistente`, `usado` y `propuesta` con las dos formas). Revisa NIT, nombre, tercero y proveedor inactivo con las mismas reglas de confirmar y no deja el tercero ni cambia la fila. El cuerpo es el mismo de confirmar (suma `proveedoresNuevos`) y el controlador pasa `puedeCrearProveedores`. Se borra `DteSinProveedor` (`dte_sin_proveedor`). El orden de los errores de la fila cambia: primero la recepción y el concepto, después el proveedor. Pruebas de API: propuesta sin dejar rastro, lo pedido, cliente que recibe el papel, proveedor inactivo, sin permiso, varias filas del mismo NIT y vista previa más confirmar de punta a punta.
- **2026-11-01 — Cuentas por pagar, error medio 2 del QA: autorizar lo ya autorizado.** `exigirRegistrado` elige el error por el estado: `autorizado` responde `documento_ya_autorizado` (422, «El documento B-105 ya está autorizado.», clase nueva `DocumentoYaAutorizado`), `anulado` responde `documento_ya_anulado` y `pendiente` sigue con `documento_no_registrado`. El lote sigue todo o nada. Se quitó el `it.fails` de `cuentas-por-pagar-qa-hallazgos.api.prueba.ts` y se sumó el caso del anulado. Pendiente del cliente: al recibir `documento_ya_autorizado`, avisar y recargar la lista.
- **2026-11-01 — Cuentas por pagar, error medio 3 del QA: los proveedores del filtro ya no dependen de Terceros.** Ruta nueva `GET /api/cuentas-por-pagar/proveedores` con `cuentas-por-pagar.documentos.ver`: responde `[{ id, nombre, activo }]` (el id es el del papel de proveedor, el que usan los documentos; `activo` es el del papel), solo de los proveedores con algún documento por pagar en la empresa activa (RLS), por nombre. Caso de uso `ListarProveedoresConDocumentos` y consulta Drizzle en `ConsultasDeSaldosDrizzle`. Pruebas de API: quien solo tiene `documentos.ver` la usa (200, sin proveedores sin documentos), inactivo marcado, orden por nombre y sin el permiso 403. Pendiente del cliente: `apiCuentasPorPagar.listarProveedores` debe usar la ruta nueva y avisar con `usarAvisos().error` si falla.
- **2026-11-01 — Proveedor nuevo al confirmar DTE (PN-5 y PN-6, cliente) y errores medios 2 y 3 (cliente).** La ventana «Confirmar los DTE marcados» tiene la sección «Proveedores nuevos» (`ProveedoresNuevosDelDte` y `TarjetaDeProveedorNuevo`, una por NIT): tipo de persona (Individual / Empresa), campos con la propuesta del servidor, cada tipo guarda su edición, aviso de revisar contra el RTU si es individual y el nombre del DTE no traía coma, y al intentar confirmar con un campo mal no se envía, se marca y el foco va al primero. Lógica pura en `datos-de-proveedores-nuevos.ts` y estado en `usar-proveedores-nuevos.ts`; la vista previa y confirmar mandan `proveedoresNuevos` (lo que tiene problemas se deja fuera de la vista previa). Las filas listas de proveedor nuevo llevan la marca «Proveedor nuevo»; el filtro dice «falta crearlo en Proveedores» sin `proveedores.crear`; `COMO_CORREGIR` suma `proveedor_inactivo` y `tercero_inactivo`. Se borró `datos-de-la-confirmacion-qa.prueba.ts` (el `it.fails` pasó a prueba normal). Error 2: ante `documento_ya_autorizado` o `documento_ya_anulado` al autorizar, se avisa y se recarga la lista. Error 3: el filtro de «Documentos por pagar» usa `GET /api/cuentas-por-pagar/proveedores` y avisa con `usarAvisos().error` si falla. Pendiente PN-7 (QA en el navegador).
- **2026-11-01 — Libro de compras E45-1 (servidor): se rechazan las fechas futuras de las constancias y de los pagos de retenciones (error 4 del QA).** La fecha de hoy sale del `Reloj` (hora de Guatemala de la empresa), pedida una vez por caso de uso dentro de la unidad de trabajo. `constanciaValida(constancia, fechaDeLaRetencion, hoy)` lanza `ConstanciaConFechaFutura` (`constancia_con_fecha_futura`, 400, campo `fecha`; en el lote sale por fila y no guarda ninguna) y `enteroValido(peticion, hoy)` lanza `FechaDePagoFutura` (`fecha_de_pago_futura`, 400, campo `fechaDePago`) al registrar y al corregir. Aviso (no bloquea) `avisoDeFechaDePago`: si el pago es anterior al último día del mes de las retenciones («La fecha de pago (15/03/2026) es anterior al cierre del mes de las retenciones (31/03/2026): …»); el último día y después no avisan. Sin estado «programado», por decisión del usuario con la validación del contador. Pruebas de dominio, de casos de uso con `RelojFijo` y de API.
- **2026-11-01 — Libro de compras E45-2 (servidor): la tabla de enteros separa el impuesto de los accesorios (error 5 del QA).** Migración `0032_l5_accesorios_del_entero` en `libro_de_compras`: `monto` pasa a `impuesto` (lo ya guardado era todo impuesto), se agregan `multa`, `intereses` y `mora` (`numeric(14,2) not null default 0`), y los checks `impuesto_positivo`, `multa_no_negativa`, `intereses_no_negativos` y `mora_no_negativa` reemplazan a `monto_positivo`. El total no se guarda. Se generó con `drizzle-kit` sin `--custom` (con `--custom` el snapshot no refleja las tablas) aceptando el renombre; el SQL coincide con el del plan. En el dominio `EnteroGuardado`, `DatosDelEntero`, mapeador, repositorio, DTO y cuerpo HTTP cambian `monto` por `impuesto` (más los tres accesorios, aún sin exponerse en la API); `pagadoDe` suma solo el impuesto; `MontoDelEnteroInvalido` pasa a `ImpuestoDelEnteroInvalido` (`impuesto_del_entero_invalido`, campo `impuesto`).
- **2026-11-01 — Libro de compras E45-3 (servidor): multa, intereses y mora del entero, con el total calculado (error 5 del QA).** `POST/PUT /libro-de-compras/retenciones/enteros` aceptan `impuesto` (obligatorio, > 0) y `multa`, `intereses`, `mora` (opcionales, ≥ 0, 0 si faltan; el PUT reemplaza todo). `enteroValido` los revisa (`AccesorioDelEnteroInvalido`, `accesorio_del_entero_invalido`, 400, con el campo que falló) y `totalDelEntero` suma los cuatro sin guardarlo. `EnteroDto` suma `total`; cada grupo del reporte y de la matriz anual suma `accesorios`, y `pagado` es el impuesto pagado. El estado «enterado» y el aviso de exceso comparan solo el impuesto: «El impuesto pagado en ese mes y grupo (Q…) pasa lo retenido (Q…) por Q…. La multa, los intereses y la mora van en sus casillas y no cuentan aquí: revise que no los sumó al impuesto.». Quedan fuera los pagos de solo accesorios (el impuesto sigue > 0). Pruebas de dominio y de API (`libro-de-compras-retenciones-accesorios.api.prueba.ts`). Actualizada la §3.9.6.4 de `diseno-datos-libro-de-compras.md`.
- **2026-11-01 — Enteros de retenciones con accesorios y fechas no futuras (E45-4 y E45-5, cliente).** `PagoDeEntero` y `DatosDelPago` llevan `impuesto`, `multa`, `intereses`, `mora` y `total` (ya no `monto`); `GrupoDelMes.accesorios`. `VentanaDePago`: «Impuesto enterado» y la sección plegable «Multa, intereses y mora» (abierta si tiene valores o errores) con el total de la boleta en vivo. Si el impuesto más lo ya pagado vigente pasa lo retenido, se pide `confirmar` recordando que los accesorios van en sus casillas; los avisos de la respuesta se muestran tras guardar. Fecha de pago y de constancia (una y en lote) con `max` = hoy en hora de Guatemala (`CampoTexto` gana `maximo`; `fechaDeHoy` ahora usa `America/Guatemala`). Los pagos muestran total y desglose; el grupo (`CifrasDelGrupo`, matriz del año) muestra «Impuesto pagado» y los accesorios aparte. Lógica pura con pruebas en `datos-de-pagos.prueba.ts`.
- **2026-11-01 — QA en el navegador, segunda ronda (PN-7, errores 2 y 3, E45-6).** Informe en `docs/modulos/informe-qa-2026-11-01-b.md`. Con el archivo real de la SAT el confirmar en lote fallaba por dos columnas con números que no son dinero (código de establecimiento, NIT del certificador): el servidor ya las ignora. Además: la lista de la bandeja ya no se desborda en celular y la confirmación de «El impuesto pasa lo retenido» queda sobre la ventana de corrección. Pendientes (medios): la vista previa no marca el DTE anulado en la SAT y el total del resumen de confirmar suma filas que no se registran.
- **2026-11-08 — «Confirmar los DTE marcados»: el resumen cuenta y suma solo lo que se registra (errores 6 y 8 del QA 2026-11-01-b, cliente).** `composables/bandeja/resumen-de-la-confirmacion.ts` (puro, con pruebas): cuenta las filas listas de la vista previa (incluidas las de proveedor nuevo con datos completos) y suma el total del documento, la NCRE restando y la NDEB sumando; el texto dice «N de M documentos» con desglose «facturas, notas» y, si ninguna se puede registrar, «Ninguno de los N marcados se puede registrar todavía.» sin monto. Una NCRE muestra «A favor Q …» en vez de «Neto a pagar». Botón y aviso final dicen «documentos».
- **2026-11-08 — Vista previa de la bandeja marca el DTE anulado en la SAT (error 3 del QA, servidor).** `POST /libro-de-compras/dte-recibidos/vista-previa` devuelve por fila `dte_anulado_en_la_sat` (mismo código y mensaje que confirmar) antes de armar la solicitud y de proponer proveedor nuevo, así que ya no sale su tarjeta. La regla se comparte en `exigirVigenteEnLaSat` (`dominio/confirmabilidad-del-dte.ts`), que usan `exigirConfirmable` y la vista previa. El contrato no cambia: solo un caso que antes respondía `documento` ahora responde `error`. El `it.fails` del hallazgo pasó a `it`.
- **2026-11-08 — Errores bajos del QA del 2026-11-01 que son solo del cliente.** Todas las listas y cuadrículas con columnas por tamaño de pantalla llevan ahora `grid-cols-1` de base (74 archivos; en celular la columna única ya no se ensancha con nombres largos). La burbuja nativa del navegador (en inglés en algunos) se cambia en `CampoTexto` por un texto en español (`utilidades/validacion-nativa.ts`, con pruebas): «Elija o escriba la fecha.», «La fecha no puede ser posterior al …». Las ventanas de cambiar vencimiento, pago de entero y constancias validan en la app (`novalidate`); pago y constancia avisan de la fecha futura con la fecha de hoy antes de enviar. La multa negativa ya se explica en la app («No puede ser negativo…»; prueba nueva). Bandeja de Cuentas por pagar: sin permiso de completar el vencimiento se ve como texto (no como campo) y el enlace al libro solo sale si el usuario puede ver el libro. El encabezado de página deja que los botones pasen a otra línea en vez de partir el título («Factura B-» / «104»). Las cifras del grupo de retenciones se acomodan al ancho de la tarjeta y ya no se pisan. La tabla del libro dice «octubre de 2026» en vez de la fecha cruda. **Para el servidor (no se tocó):** nombre del grupo `iva_agentes` («…pequeño contribuyente (5 %)» con filas al 15 %), hoja «Anulados» del Excel del libro (fecha en UTC y causa como código), causa/motivo/quién anuló en el DTO de la ficha de Cuentas por pagar, número del entero guardado en mayúsculas y sin espacios, mensaje de archivo vacío («por ejemplo la plantilla») en `core/intercambio/aplicacion/errores.ts` y «aún no existe» cuando el NIT ya es cliente (`libro-de-compras/aplicacion/errores.ts`).
- **2026-11-08 — Errores bajos del servidor de los QA del 2026-11-01 (ramas `bajos`).** (1) El grupo `iva_agentes` se llama «IVA retenido por agentes de retención y pequeños contribuyentes» (sin porcentaje: entran 5 %, 15 % y otras tasas). (2) La hoja «Anulados» del Excel del libro lleva la causa como texto y la anulación como `AAAA-MM-DD HH:mm` en la zona horaria de la empresa (`core.regional.zona_horaria`); `fechaYHoraLocalEn` en `core/compartido/dominio/fecha-local.ts`. (3) La ficha de Cuentas por pagar trae `anulacion: { causa, motivo, anuladoPor, anuladoEn } | null`, leído de Libro de compras por el mismo join de la consulta base (el cliente la mostrará después). (4) `documentoDePago` se guarda como lo escribió el usuario (solo se recortan los extremos); migración `0033_u16_documento_de_pago_como_se_escribio` cambia el check (sin espacios en los extremos en vez de sin espacios); nada usaba el valor para unicidad. (5) El error de archivo no legible o que no es Excel ya no menciona la plantilla. (6) `proveedor_nuevo_sin_permiso` lleva `detalles.accion` (`crear` o `agregar_papel`): Terceros, al rechazar por falta de permiso, dice si el NIT ya es de un tercero, y el mensaje pide el papel de proveedor en Proveedores. (7) La conciliación tiene un resultado nuevo, `noVaEnElLibro`: una fila del mes cuyo documento está fuera del libro (p. ej. el recibo `RDON`) ya no sale como «En otro período» (el diseño §3.3b.9 no tenía esa categoría; se añadió). (8) Al confirmar DTE, los avisos de cada fila salen sin repetidos. Sin hacer: unicidad del número de autorización entre empresas (necesita diseño); el cliente debe mostrar `noVaEnElLibro` y la `anulacion` de la ficha.
- **2026-11-08 — Cliente: «No va en el libro» en la conciliación de DTE y bloque «Anulación» en la ficha de Cuentas por pagar.** (1) `ClaveDeResultado` suma `noVaEnElLibro` (documento del mes fuera del libro, p. ej. un recibo por donación); tarjeta «No va en el libro» (tono neutro, no pide revisión, con explicación corta) tras «En otro período»; abre el documento si existe. (2) `FichaDelDocumento.anulacion` (`causa`, `motivo`, `anuladoPor`, `anuladoEn`); `detallesDeAnulacion` arma el bloque con `CAUSAS_DE_ANULACION` y `formatearFechaHora`; la ficha no mostraba `registradoPor`, así que `anuladoPor` se muestra como id, igual que en la tabla de anulados del libro (pendiente: resolver nombre de usuario si el servidor lo manda).
- **2026-11-08 — «Abrir en el formulario» desde la bandeja «DTE de la SAT» (cliente).** Cada fila pendiente lleva el botón «Abrir en el formulario» (permiso `libro-de-compras.documentos.crear`) que va a `…/documentos/nuevo?desdeDte=<id>`. El formulario de registro pide `GET …/dte-recibidos/:id/solicitud` (composable `usar-precarga-desde-dte.ts`), se llena con la conversión pura `edicion-desde-solicitud.ts` (con pruebas) y muestra arriba los avisos del servidor más lo que falta elegir (proveedor, destino, concepto). Sin proveedor queda vacío para elegirlo. Las reglas de «al elegir proveedor/tipo» no pisan lo traído (el primer cambio de la precarga se salta), un destino traído no se reemplaza por el sugerido, y lo precargado no cuenta como cambio al salir. «Volver» lleva a la bandeja, que se recarga al abrirse. Al registrar, el servidor enlaza la fila por la autorización. Los textos de error de la confirmación que mandaban a «registrarla a mano» ahora dicen «Abrir en el formulario». Los mensajes del servidor que dicen «ábralo en el formulario» (`errores-de-bandeja.ts`) ya son ciertos; no se tocó el servidor.
- **2026-11-08 — Avisos de período declarado y retenciones por resolver al anular desde Cuentas por pagar (error 8 del QA).** La orden `libro-de-compras.anular_documento` responde ahora `{ avisos: string[] }` (antes `void`), los mismos que da Libro de compras; `LibroDeCompras.anular` del puerto de Cuentas por pagar devuelve `string[]`. `POST /cuentas-por-pagar/documentos/:id/anular` responde el documento de siempre más `avisos` (se agregó a la forma plana para no romper a quien ya la usa). El cliente los muestra con `usarAvisos().info` tras el aviso de éxito. Pruebas: unitaria del caso de uso y de API (`cuentas-por-pagar-bajas-avisos`: retención constanciada → aviso; sin retenciones → vacío).
- **2026-11-08 — Libro de compras: la unicidad de los documentos de la SAT pasa de «toda la instalación» a «toda la cuenta» (decisión del usuario, opción B del análisis de `informe-qa-2026-11-01-b.md`).** Dos cuentas con empresas del mismo NIT no podían llevar sus libros: el índice global de `documentos` rechazaba al segundo suscriptor sin que pudiera verlo ni arreglarlo. Migración `0034_u17_documentos_unicos_por_cuenta`: `documentos_autorizacion_fel_unica` pasa a `(autorizacion_fel, cuenta_id)` y `documentos_sat_unico` a `(nit_emisor, tipo, serie, numero, cuenta_id)` (mismos nombres y filtros). Dentro de la cuenta sigue el bloqueo de L4-c; el `23505` responde «Ese documento ya está registrado en esta empresa o en otra empresa de su cuenta.». Se cierra el riesgo 13.1 del diseño. Actualizados `libro-de-compras.md` y `diseno-datos-libro-de-compras.md`.
- **2026-11-08 — Cuentas por pagar: la ficha de un documento anulado muestra el nombre de quien anuló, no su id.** `AnulacionDelDocumentoDto` gana `anuladoPorNombre` (nombres y apellidos; `null` si el usuario no se puede leer; `anuladoPor` se conserva). `ConsultaBaseDeDocumentos` lo trae con un `leftJoin` a `core.usuarios` (solo su `*.tablas.js`, desde infraestructura, igual que Bancos) dentro de la unidad de trabajo. El cliente muestra el nombre o «Usuario no disponible». Libro de compras: el anexo de anulados ya mostraba el nombre y su ficha no muestra «Anulado por», así que no tenía el problema.
- **2026-11-08 — Empresas: aviso (sin impedir) cuando otra empresa de la cuenta ya tiene el mismo NIT (decisión del usuario).** Como los documentos de la SAT son únicos por cuenta (migración 0034), un DTE registrado en una de dos empresas con el mismo NIT no se puede registrar en la otra; el aviso evita la sorpresa. `POST /empresas` (201) y `PUT /empresas/:id` (200) responden el DTO plano de siempre más `avisos: string[]` (vacío si no hay nada). El aviso es «Otra empresa de esta cuenta ya tiene el NIT <nit con guion> ...» y no nombra a la otra empresa (el usuario podría no tener acceso a ella). Cuenta empresas activas e inactivas, excluye a la propia, ignora NIT vacío y «CF» y nunca mira otras cuentas. Sin migración: `core.empresas` no tiene RLS (se filtra por `cuenta_id`, como el resto de sus consultas), así que basta `ConsultasEmpresas.nitRepetidoEnCuenta` (solo devuelve sí o no) dentro de la unidad de trabajo. El alta de la cuenta (empresa inicial) no aplica: una cuenta nueva no tiene otra empresa. Nuevo `Nit.formateado()`. Pruebas: unitarias del caso de uso y del `Nit`, y de API en `empresas.api.prueba.ts`.
- **2026-11-08 — Empresas (cliente): se muestran los avisos de NIT repetido.** `ApiEmpresas.crear/actualizar` devuelven `EmpresaGuardada` (la empresa más `avisos: string[]`). `usarEmpresas` (único lugar donde se crea o edita una empresa; la ficha lo reutiliza) muestra el éxito normal y luego cada aviso con `usarAvisos().info`. Los mensajes emergentes ahora duran según su largo (`duracionDeAviso`: 4.5 s mínimo, 70 ms por carácter, tope 20 s) para alcanzar a leer los avisos largos; ya tenían botón de cerrar y se ajustan al ancho del celular.
- **2026-11-08 — Core (archivos): correcciones D1 a D4 de `docs/modulos/diseno-h2-evidencia-de-conciliacion.md` (paso 1 de H2).** (D1) `DocumentosProtegidos` separa `revisar` (qpdf y optimizador, sin base ni disco, FUERA de la transacción para no retener conexiones del grupo) de `guardarRevisado` (disco y fila, dentro); `guardar` se conserva como la suma de ambos. `DocumentoRevisado` es opaco. La lógica de revisión pasó a `PreparadorDeDocumentos`. (D2) Puerto `TareasDeLaTransaccion` (`despuesDeConfirmar`, `siSeDeshace`) con su implementación `TareasDeLaTransaccionPostgres`; `UnidadDeTrabajoPostgres` corre la lista `alDeshacer` cuando la transacción más externa se deshace (error del caso de uso o del `commit`) y vuelve a lanzar el error; `guardarRevisado` registra el borrado del archivo ahí. (D3) `eliminar` borra la fila al momento y el archivo del disco solo al confirmar. (D4) `leerDocumentoDeSolicitud` (`core/archivos/http`) detecta la subida cortada (`truncated` o `FST_REQ_FILE_TOO_LARGE`) con 413 y dice «Adjunte el documento» (`FaltaElDocumento`). `DocumentoAbierto` gana `sha256` y `creadoEn`. Decisión: el Libro de compras sigue usando `guardar` (revisión dentro de su transacción) porque el PDF se dibuja con los folios que se bloquean dentro de la misma transacción, así que no se puede revisar antes de abrirla; sí gana D2 y D3. H2 (saldo y archivo de la conciliación) sigue pendiente en los pasos 2 en adelante.
- **2026-11-08 — Core (archivos): arreglos de la revisión de seguridad al paso 1 de H2 (S3 a S9 y S11).** `guardarRevisado` registra el borrado antes de escribir y borra si la escritura falla (S3); la unidad de trabajo registra (descripción = ruta relativa, nunca contenido) las tareas de «si se deshace» y de «después de confirmar» que fallan, corre todas y no cambia la respuesta (S4); solo se guarda lo que `revisar` produjo (`WeakSet`, objeto congelado) (S5); `revisar` falla con error de programación dentro de una transacción (`TareasDeLaTransaccion.hayTransaccion`), mientras `guardar` del Libro de compras sigue revisando por dentro (S6); `guardarRevisado` no recibe `nombre` (S7); el 413 de la subida dice «máximo 10 MB para PDF y 15 MB para fotos» (S8); `FST_FILES_LIMIT`, `FST_PARTS_LIMIT`, `FST_FIELDS_LIMIT` y el cierre prematuro se traducen a errores propios (S9); el nombre pierde caracteres de control y bidireccionales antes de truncarse (S11). S1 y S2 (cola de qpdf con tope) quedan para el paso 4.
- **2026-11-08** — Correcciones de QA en «Registrar factura» y la bandeja de la SAT:
  - El formulario usa consultas de contenedor de Tailwind 4 (`@container`, `@md:`, `@2xl:`, `@3xl:`) en la línea, el encabezado, la FEL y la factura especial: las columnas dependen del ancho de la tarjeta y no de la pantalla, así los interruptores y el selector de proveedor ya no se cortan.
  - «Abrir en el formulario» con un DTE anulado en la SAT: la solicitud trae el aviso «Este DTE está anulado en la SAT: no debería registrarse.» (`avisoDeAnuladoEnLaSat`, mismo criterio que `exigirVigenteEnLaSat`); el cliente lo muestra destacado y no bloquea el formulario.
  - Lo que falta elegir de la precarga («Elija el destino…», proveedor, conceptos) se calcula con lo escrito ahora (`pendientesDeLaPrecarga`) y desaparece al elegirlo. El título dice «Registrar nota de crédito / nota de débito / recibo» según el tipo.
  - Tras confirmar en la bandeja queda un solo aviso de éxito (el de la ventana, «Se registraron N documentos.») y los avisos se agrupan sin repetir, con los documentos de cada uno en un desplegable.
  - `formatearNit` en `utilidades/formato.ts`: el NIT se ve con guion en las fichas y listas de empresas y terceros.
  - Un archivo de 0 bytes en la bandeja de la SAT dice «El archivo está vacío. Suba un archivo de Excel (.xls o .xlsx) o un CSV con datos.» (`archivo_vacio`).
- **2026-11-08 — U8 aprobado por el usuario.** Acepta todas las recomendaciones de U8-a a U8-l con las precisiones del
  contador (U8-e indispensable, referencia del sistema anterior, U8-l antes de producción con una empresa con
  historia); retenciones pendientes al corte como columna informativa `retenciones_por_practicar` (opción B); fecha de
  inicio = primer día en Arrancar (día 1 de un mes recomendado) y aviso en Libro de compras para facturas anteriores;
  cuadre de la carga inicial que bloquea con salida auditada cuando exista Contabilidad; Cuentas por pagar solo en
  quetzales por ahora. Detalle en §11 de `docs/modulos/diseno-u8-saldos-iniciales-cuentas-por-pagar.md`.
- **2026-11-08 — «Anulado por» con nombre en Libro de compras.** La ficha del documento trae `anuladoPorNombre` (se lee
  del usuario en `RepositorioDeDocumentosGuardadosDrizzle`) y el cliente lo muestra en el bloque de anulación; si el
  usuario no se puede leer dice «Usuario no disponible», igual que Cuentas por pagar.
- **2026-11-08 — U8-1 (servidor, datos).** Migración `0003_u8_saldos_iniciales` de Cuentas por pagar: `origen`, `serie`, `numero` (rellenados desde el libro), `saldo_al_inicio`, `retenciones_por_practicar`, `referencia`, `documento_id` nulable, los checks del diseño, la llave `documentos_proveedor_por_pagar_fk` y el único `documentos_numero_por_proveedor_unico` (por familia de factura), con revisión previa que avisa en español. `DocumentoPorPagar` y el mapeador con los campos nuevos; `netoDe`/`saldoDe` usan el saldo al inicio; autorizar y desautorizar saltan `marcarProcesado` en un saldo inicial, anular y eliminar por Documentos lo rechazan (`EsUnSaldoInicial`); los eventos llevan `origen` y `documentoDeCompraId` nulable. `RecibirDocumento` ya copia serie y número (puerto `datosDeRecepcion`). Pruebas de tablas en `documentos-saldos-iniciales.prueba.ts`.
- **2026-11-08 — U8-2 (servidor, Cuentas por pagar con dos orígenes).** Las consultas leen el libro con `leftJoin` (como subconsulta `datos_del_libro`: Drizzle confunde la nulabilidad al unir otra tabla también llamada `documentos`); serie y número salen de la fila propia y `saldoDelCargo` y el saldo libre de las notas usan `coalesce(saldo_al_inicio, …)`. El DTO y la ficha traen `origen`, `fechaRecepcion` y `periodo` nulables, `saldoAlInicio`, `retencionesPorPracticar`, `referencia` y `anterioresAlInicio` (derivado en `anterioresAlInicioDe`); la ficha de auditoría ya no filtra centavos. Filtro `origen` en la lista; `accionesDelDocumento` recibe `origen` (un saldo inicial no se anula ni se elimina por Documentos). `OrigenDelDocumento` pasó a `DatosDelLibro` (`FilaDeDocumento.libro`); `documentoDelLibro` reemplaza las aserciones `!` de anular y eliminar. TSDoc de eventos: el saldo inicial no genera partida. Pruebas de API en `cuentas-por-pagar-saldos-iniciales.api.prueba.ts` (el saldo se siembra con `DocumentosPorPagarDePrueba.sembrarSaldoInicial`).
- **2026-11-08 — U8-3 (servidor, casos de uso de saldos iniciales).** Puertos `CargaInicial` (implementado con la orden `empresas.obtener_carga_inicial` en `CargaInicialEnMediador`), `ProveedoresParaSaldos` y `RepositorioDeSaldosIniciales`; dominio `saldo-inicial.ts` (validaciones de §5) y `REGLAS_PARA_CORREGIR_SALDO_INICIAL` (autorizado y con movimientos; sirven para corregir y eliminar); errores de §6.3 en `errores-de-saldos-iniciales.ts` (los de dato llevan `detalles.campo`). Casos de uso `CrearSaldoInicial`, `CorregirSaldoInicial` (audita `corregir`, deja `registrado_por` en quien corrige), `EliminarSaldoInicial` (motivo, audita `eliminar`), `ListarSaldosIniciales` y `ObtenerSaldoInicial`, con `SaldoInicialDto` y la lista con la carga. Se agregaron `proveedorNit` a `DatosDelLibro` y `creadoEn` a `FilaDeDocumento` (para el DTO) y `etiquetaDe` pasó al dominio. Sin rutas (U8-4). Pruebas puras, de casos de uso con dobles y de integración contra la base (`saldos-iniciales.prueba.ts`).
- **2026-11-08 — U8-4 (servidor, rutas y permisos de los saldos iniciales).** Seis permisos `cuentas-por-pagar.saldos-iniciales.{ver,crear,editar,eliminar,importar,exportar}` en `modulo.ts` (importar y exportar quedan declarados para U8-5). `composicion/saldos-iniciales.ts` arma los casos de uso con `CargaInicialEnMediador`, `ProveedoresParaSaldosDrizzle` y `RepositorioDeSaldosInicialesDrizzle`; `http/saldos-iniciales.{rutas,controlador,esquemas-http}.ts` ofrece `GET` (lista con `carga`) y `GET /:id` con `ver`, `POST` (201) con `crear`, `PUT` con `editar` y `DELETE` con motivo (204) con `eliminar`. Zod solo revisa la forma (dinero con dos decimales, fechas, tipo, uuid); las reglas son del dominio y responden 400 con `detalles.campo`; el único repetido responde 409 con el mensaje de §3.4 y la carga cerrada o sin fecha, 422. Sin Excel ni cuadre (U8-5, U8-7). Pruebas de API en `cuentas-por-pagar-saldos-iniciales-rutas.api.prueba.ts`.
- **2026-11-08 — CP2 y CP3 aprobados por el usuario.** Acepta las recomendaciones de los diseños con las correcciones
  del contador (`docs/modulos/dictamen-cp2-cp3-2026-11-08.md`). La causa de ajuste «liquidado fuera del sistema» se
  quita: el reintegro del proveedor va en CP4, que acepta también efectivo. Anular o eliminar un cargo que recibió
  aplicaciones manuales se rechaza con el mensaje «quite primero la aplicación de la nota N».
- **2026-11-08 — Diseños CP2 y CP3 listos para programar.** `diseno-cp2-notas-de-credito.md` y
  `diseno-cp3-contrasenas.md` pasan a «aprobado, listo para programar» con el dictamen aplicado. CP2: causas
  `no_recuperable`, `diferencia_menor` (tope por empresa `cuentas-por-pagar.ajustes.tope_diferencia_menor`) y
  `compensado_con_otra_cuenta` (con referencia obligatoria), con `efecto` `perdida`/`transitoria` en el evento;
  fechas mínimas por la recepción en el libro y la fecha de inicio; `referencia` del acuerdo en las aplicaciones
  manuales y aviso de bancarización (`cuentas-por-pagar.bancarizacion.umbral`, instalación, Q30,000); ajuste solo de
  notas registradas o autorizadas; regla `noTenerAplicacionesManualesRecibidas` (también para NDEB y por aviso del
  libro); migración `0004`. CP3: fecha de las aplicaciones de la contraseña = la mayor (contraseña, recepción de la
  nota y del cargo, o fecha de inicio); auditoría `corregir` con motivo al cambiar la fecha prometida; `impresa_en` y
  «REIMPRESIÓN» (vista previa `GET …/impresion`, marca con `POST …/impresiones`); original y copia; leyenda por
  omisión «recibido para revisión…»; columnas total, retenciones, rebajado y saldo; aviso de recuperar el original al
  anular; migración `0005`. Lo de CP4 (reintegro también en efectivo) y CP5 (reporte mensual de ajustes, pago
  prometido vencido) quedó anotado en `cuentas-por-pagar.md`.
- **2026-11-08 — U8-9 (cliente, Documentos de Cuentas por pagar con dos orígenes).** Los tipos traen `origen`, `documentoId`, `fechaRecepcion` y `periodo` nulables, `saldoAlInicio`, `retencionesPorPracticar`, `referencia` y `anterioresAlInicio`. La tarjeta lleva la etiqueta «Saldo inicial»; la lista, el filtro «Origen»; la ficha muestra origen, referencia, saldo al inicio, pagos y notas anteriores y retenciones por practicar (sin fecha de recepción), y oculta el enlace a Libro de compras si no hay `documentoId`. Anular y eliminar ya vienen en falso del servidor. Pendiente para U8-10: el enlace «Corregir en Saldos iniciales», porque la ruta aún no existe.
- **2026-11-08 — U8-8 (servidor, aviso en Libro de compras de emisión anterior a la fecha de inicio).** `ContextoFiscal.fechaDeInicio` se carga por el mediador (`empresas.obtener_carga_inicial`, puerto `DatosDeLaEmpresaParaDocumentos.fechaDeInicio`) y `avisosDeFechaDeInicio` (dominio) arma el aviso, que sale al calcular, registrar y confirmar desde la bandeja de la SAT; no bloquea, vale con la carga abierta o cerrada y sin fecha de inicio no hay aviso. Sin cambios de cliente: ya muestra los avisos del servidor. Pruebas: `libro-de-compras-documentos-fecha-de-inicio.api.prueba.ts` y `avisos-de-fecha-de-inicio.prueba.ts`.
- **2026-11-08 — U8-6 (servidor, cambio de la fecha de inicio).** `EstablecerFechaDeInicio`, cuando ya había carga y la fecha cambia, manda el aviso `empresas.fecha_de_inicio_por_cambiar { empresaId, fechaDeInicio }` por el mediador (puerto `AvisosDeFechaDeInicio`), dentro de su transacción. Cuentas por pagar lo escucha (`ValidarFechaDeInicio`, composición `fecha-de-inicio.ts`) y rechaza con `saldos_iniciales_posteriores_a_la_fecha` (422) si algún saldo inicial quedaría con emisión igual o posterior a la fecha nueva; la fecha no cambia. Con el módulo inactivo no se consulta. Bancos podrá escuchar el mismo aviso sin cambios en Empresas.
- **2026-11-08 — U8-7 (servidor, cuadre de los saldos iniciales).** `GET /cuentas-por-pagar/saldos-iniciales/cuadre` (`saldos-iniciales.ver`) devuelve la carga, una fila por proveedor y el total general, con cargos, notas a favor, neto (puede ser negativo), documentos y retenciones por practicar; suma `saldo_al_inicio` de los saldos vigentes, no el saldo de hoy. `/cuadre/exportar` (`saldos-iniciales.exportar`, `rutasDeIntercambio` sin importar) baja el `.xlsx` con una fila por proveedor y la del total. Todo en archivos propios (`ObtenerCuadreDeSaldosIniciales`, `ConsultasDeCuadreDrizzle`, `cuadre-de-saldos-iniciales.*`) y una línea en `modulo.ts`. Cerrar la carga sigue siendo solo confirmación; nada de Contabilidad.
- **2026-11-08 — U8-5 (servidor, Excel de saldos iniciales).** `http/saldos-iniciales.columnas.ts` (las doce columnas de §7.1; el proveedor se escribe por nombre o NIT con `tambienPorCodigo`; las retenciones vacías valen cero con un `z.preprocess` solo para el Excel), opciones en `OpcionesDeProveedoresDrizzle`, `composicion/saldos-iniciales-excel.ts` (`crearIntercambio`; cada fila pasa por `CrearSaldoInicial`; exportar recorre la lista de 200 en 200) y `http/saldos-iniciales.excel.rutas.ts` (`rutasDeIntercambio` con los permisos `importar` y `exportar`). El core ganó `notasDeInstrucciones` en `DatosDelRecurso` para los textos del contador al final de la hoja de instrucciones. Sin `sinAsignarAlCrear` (no hay alcance). Pruebas de API en `cuentas-por-pagar-saldos-iniciales-excel.api.prueba.ts`.
- **2026-11-12 — U8-11 (cliente, Empresas).** En la sección de carga inicial: ayuda de la fecha de inicio («Primer día que se registra en Arrancar; los saldos iniciales son los del cierre del día anterior»), aviso que no bloquea si la fecha no es día 1 de un mes (`avisoDeFechaDeInicio`, lógica pura en `datos-de-empresa.ts` con prueba), el error `saldos_iniciales_posteriores_a_la_fecha` queda marcado en el campo de la fecha además del aviso (`errorConCampoDeFecha`) y la confirmación de cerrar la carga añade el recordatorio de comparar el cuadre con el balance de apertura. Solo texto: los totales del cuadre al cerrar esperan la ruta `GET /api/cuentas-por-pagar/saldos-iniciales/cuadre` (U8-7).
- **2026-11-12 — U8-10 (cliente, ventana «Saldos iniciales» de Cuentas por pagar).** Página `SaldosIniciales.vue` en Administración (`/cuentas-por-pagar/saldos-iniciales`), hecha a mano como Bancos (no con el generador, §8): estado de la carga con enlace a la empresa, cuadre (totales generales siempre a la vista, cada uno por separado, y detalle por proveedor desplegable, con su Excel), filtro por proveedor, tarjetas con Corregir/Eliminar según `puedeCorregir`/`puedeEliminar` del servidor y el permiso, ventana `CamposDeSaldoInicial` (saldo pendiente propuesto como total menos retenciones mientras no se escriba; la nota de crédito oculta vencimiento y retenciones y las manda en cero), eliminación con motivo, `AccionesDeIntercambio` y `VentanaDeImportacion` (importar y nuevo solo con la carga abierta). Los textos del contador (§5/§7.1) están en `AvisoDeSaldosIniciales`, ayudas de cada campo y del cuadre. `VentanaDeImportacion` del core ganó el slot `aviso`. La ficha de un documento con origen `saldo_inicial` muestra «Corregir en Saldos iniciales» (`?corregir=<id>`, abre la ventana o explica por qué ya no se puede). Lógica pura con pruebas en `composables/saldos-iniciales/`.
- **2026-11-12 — U8-12 (QA de punta a punta de los saldos iniciales de Cuentas por pagar).** Recorrido completo en el navegador y la API (fecha de inicio, carga a mano y por Excel, corregir y eliminar con motivo, cuadre y exportación, Documentos, autorizar y desautorizar, rechazos de anular y eliminar, Libro de compras con 409 y aviso, cambio de la fecha, cerrar y reabrir la carga, permisos, celular y modo oscuro): sin errores de dinero ni de seguridad. Corregidos tres textos (cierre de carga, «el documento marcado», «el número»), con pruebas. Quedan observaciones menores en `docs/modulos/informe-qa-u8-2026-11-12.md` (total en la ventana de desautorizar, dinero sin formato en mensajes del servidor, tope de fecha antigua, ensayo del Excel por etapas, instrucciones de la plantilla).
- **2026-11-12 — CP2-1 (servidor, datos de las notas de crédito).** Migración `0004_cp2_notas_de_credito` de Cuentas por pagar: `aplicaciones_de_notas` gana `forma` (`automatica`/`manual`), `fecha` (rellenada con la recepción de la nota en el libro, y si no, `creado_en`) y `referencia`; el único `(nota, cargo)` pasa a índice parcial `aplicaciones_automatica_unica` (solo automáticas) más `aplicaciones_nota_idx`; tabla nueva `ajustes_de_saldo` (causa, motivo, referencia, estado vigente/anulado con anulación completa, cascada desde la nota, RLS por empresa; restricciones en `ajustes-de-saldo.restricciones.ts` por el tope de líneas). `dominio/ajustes.ts` con `CAUSAS_DE_AJUSTE` y `EFECTO_DE_LA_CAUSA`. `RepositorioDeAplicaciones.agregar` recibe `{ forma, fecha, referencia }` y `RecibirDocumento` guarda `automatica` con la fecha de recepción. Pruebas de tablas, del relleno (corre las sentencias de la migración) y del caso de uso. Sigue CP2-2 (saldos y bajas).
- **2026-11-12 — Pendientes de gravedad baja de la QA de U8 (H3, H5, H7 en parte, H8, H9).** Desautorizar muestra el saldo (en saldo inicial, el saldo al inicio) y no el total; dinero con formato en los mensajes del servidor de saldos iniciales; `VencimientoInvalido` (`vencimiento`) y el 409 del documento repetido (`numero`, por `CAMPOS_POR_RESTRICCION` en `errores-de-postgres.ts`) traen `detalles.campo`; el motor de Excel usa `detalles.campo` para dar la columna del problema y ganó `avisarDeFila` / `avisos` (opcionales) con los que el ensayo de saldos iniciales muestra el vencimiento propuesto; instrucciones del Excel (código = NIT, fecha con ejemplo); en Empresas, el error de una sección fiscal se repite junto a la fecha de inicio y la ficha muestra fecha de inicio y estado de la carga. Siguen para decidir: tope inferior de la fecha de emisión (H6) y ensayo del Excel por etapas (H7).
- **2026-11-12 — Decisiones del usuario (pendientes de U8 y CP2).** (1) La fecha de emisión de un saldo inicial no
  puede ser de más de **10 años** antes de la fecha de inicio (regla de dominio; error por campo). (2) El **ensayo de
  importación de Excel** muestra todos los errores en una sola pasada (formato y reglas de cada fila que se pudo leer),
  para todos los recursos. (3) **Adjuntos en CP2: más adelante**, en un diseño aparte sobre `core.archivos`; CP2 sale
  con la referencia escrita. (4) **P-U8-1:** los DTE de la bandeja de la SAT con emisión anterior a la fecha de inicio
  se **marcan** y quedan **fuera de la conciliación**; va en Libro de compras junto con U8-l (notas sobre facturas del
  sistema anterior), antes de producción con una empresa con historia.
- **2026-11-12 — Diseño de U8-l y P-U8-1 (propuesta, falta aprobar).** `docs/modulos/diseno-u8l-notas-sobre-facturas-anteriores.md`:
  tabla `libro_de_compras.facturas_anteriores` (una fila por factura del sistema anterior, compartida por sus notas, con
  total, IVA y motivo para los topes y la herencia del motivo) y `documentos.factura_anterior_id` (migración `0035`); en
  Cuentas por pagar, `documento_afectado_id` pasa a guardar el id propio (llave a `documentos.id`) y
  `factura_del_sistema_anterior` marca la nota (migración `0005`, después de CP2-4), que se aplica sola al saldo inicial
  si existe o queda libre / como cargo suelto si no; DTE anteriores a la fecha de inicio marcados al consultar (sin
  migración) y en un grupo aparte de la conciliación. Preguntas U8l-a a e, P1-a y b; validación fiscal C-U8l-1 a 10.
- **2026-11-12 — CP2-2 (servidor, saldos y bajas).** El saldo libre de una nota es `base − aplicado − ajustado` (`saldoDe` con `ajustadoCentavos`; SQL con la subconsulta `ajustado_de_la_nota` de ajustes vigentes, también en `notasConSaldoLibre`); el DTO gana `ajustado`, `puedeAplicar` y `puedeAjustar`, y las aplicaciones de la ficha, `id`, `forma`, `fecha`, `referencia` y `puedeQuitar` (solo las manuales). `AplicacionDeNota` trae `id`, `forma`, `fecha`, `referencia` y serie y número del otro documento; `DocumentoConAplicaciones` trae `ajustes` (la auditoría de baja los incluye). Reglas nuevas `noTenerAplicacionesManualesRecibidas` (`CargoConAplicacionesManuales`) y `noTenerAjustesVigentes` (`NotaConAjustes`) en anular y eliminar (también desde Libro de compras) y, la de ajustes, en `noTenerMovimientos` del saldo inicial; filtro `conSaldo` de la lista. **Hueco de CP2-1:** la migración `0005_cp2_anulacion_del_ajuste` rehace el check `ajustes_anulacion_completa` (en `vigente` los tres campos de anulación son nulos y en `anulado` están llenos), con su prueba de tabla. **CP3 pasa a la migración `0006_cp3_contrasenas`** (la `0005` ya está usada). Las aplicaciones manuales y los ajustes de las pruebas de API se siembran en la base (los casos de uso llegan en CP2-3 y CP2-4). Sigue CP2-3.
- **2026-11-12 — Tope de antigüedad en saldos iniciales y ensayo de Excel en una sola pasada.** Dominio de
  `saldo-inicial.ts`: la emisión no puede ser de más de 10 años antes de la fecha de inicio (`EmisionDemasiadoAntigua`,
  `emision_demasiado_antigua`, `detalles.campo = fechaEmision`, mensaje con la fecha mínima; el Excel lo detecta por la
  misma vía). Motor `core/intercambio`: el ensayo (y también importar de verdad) junta en una pasada los errores de
  formato de cada fila y los de reglas de las que se pudieron leer; cada fila corre en un punto de guardado
  (`UnidadDeTrabajo.aislar`, nuevo en el puerto) para que un error de la base de datos no aborte la transacción.
  Con cualquier error o en ensayo todo se deshace; el límite de 5,000 filas y la revisión del `.xlsx` no cambian.
  Corrige H6 y H7 del informe de QA de U8.
- **2026-11-12 — U8-l y P-U8-1 aprobados por el usuario** (diseño `docs/modulos/diseno-u8l-notas-sobre-facturas-anteriores.md`,
  dictamen `docs/modulos/dictamen-u8l-2026-11-12.md`, «correcto con ajustes»). Acepta las recomendaciones del diseño y
  todos los ajustes del contador; notas de débito anteriores a la fecha de inicio como **dato opcional** (total e IVA)
  que suma al tope; una nota con factura anterior **recibida antes de la fecha de inicio se rechaza** («es del sistema
  anterior: cárguela en Saldos iniciales») y se revisa también al mover la fecha de inicio.
- **2026-11-12 — CP2-3 (servidor, aplicar y quitar).** `AplicarNota` (varios cargos del mismo proveedor, todo o nada; pide `CargaInicial`, bloquea la nota y luego los cargos en orden de id; fecha por omisión hoy, no futura ni anterior a la recepción de la nota y de los cargos ni, con saldos iniciales, a la fecha de inicio; referencia opcional), `QuitarAplicacion` (solo manuales, motivo y auditoría `quitar` en `cuentas-por-pagar.aplicaciones-de-notas`; lista `REGLAS_PARA_QUITAR_APLICACION` vacía para CP3 y CP4) y `ListarCargosParaAplicar` (autorizados primero, luego por vencimiento; `propuesto`, `sobreUmbralDeBancarizacion`, `fechaMinima`). Dominio en `aplicacion-manual.ts`, errores en `errores-de-aplicaciones.ts`; puerto `FechasDeEntrada` (lee la recepción sin bloquear el libro) y variable `cuentas-por-pagar.bancarizacion.umbral` (instalación, Q30,000). Permiso `documentos.aplicar-notas`; rutas `GET …/documentos/:id/cargos-para-aplicar`, `POST …/documentos/:id/aplicaciones` (200, ficha de la nota) y `DELETE …/aplicaciones/:id`. El saldo de un saldo inicial pagado en parte se probó de punta a punta (total 5,000, saldo al inicio 3,000: tope de 3,000). Sigue CP2-4 (ajustes).
- **2026-11-12 — Diseño de U8-l y P-U8-1 listo para programar.** `docs/modulos/diseno-u8l-notas-sobre-facturas-anteriores.md`
  recibe todo lo aprobado: `facturas_anteriores` con `notas_de_debito_anteriores_total`/`_iva` (suman al tope), clave por
  familia factura (único sin `tipo`) y único parcial por autorización FEL; `otra_causa_sin_credito` también en
  `documentos.motivo_sin_credito` del libro (la nota de crédito hereda el motivo tal cual; IVA al costo, sigla «OC»),
  limitado por check a la nota de crédito con factura anterior; rechazo de la nota recibida antes de la fecha de inicio
  y revisión en los dos sentidos al mover la fecha; aviso desde 4 años; avisos de retención en Cuentas por pagar; aviso
  de notas posteriores libres al cargar un saldo inicial (en el DTO y en el cuadre, porque el Excel no lleva avisos);
  DTE anteriores con la salvedad de C-U8-1 y los de los dos meses anteriores al corte destacados; «Documento que
  modifica» en la ficha y en el Excel del libro. Migraciones: Libro de compras `0035`; Cuentas por pagar **`0007`**
  (la `0005` es de CP2-2 y la `0006` de CP3-1). Orden: P1-1, P1-2 y U8l-1 ya (solo Libro); U8l-2 y U8l-3 después de
  CP2-4 y CP3-1 y no en paralelo con CP3-2 a CP3-4; U8l-7 después de CP2-6; QA después de CP2-7. Pendientes P-U8l-1
  (frase FEL 9-22, contador) y P-U8l-2 (¿«otra causa» también en facturas del libro?, usuario).
- **2026-11-13 — Bancos H2: respuestas del usuario y arranque de H2a.** Mientras siguen Cuentas por pagar y Libro de
  compras (CP2, CP3, U8-l), se avanza Bancos H2, que no depende de ellos. Respuestas a
  `docs/modulos/diseno-h2-evidencia-de-conciliacion.md` §13: P1 A (columna `previa_al_saldo_transcrito`), P3 sí (las
  elaboradas sin archivo se autorizan), P4 no (adjunta solo quien elabora), P5 sí (ícono en la lista); P2 sin respuesta,
  se sigue con lo recomendado. Se programan los pasos 2 y 3 (H2a, saldo transcrito); el paso 4 espera S1, S2 y S10.
- **2026-11-13 — P-U8l-2 aprobado por el usuario.** «No dio crédito por otra causa» (`otra_causa_sin_credito`) también
  se puede marcar a mano en las **facturas** del libro, con **detalle obligatorio** y auditoría (se quita el check que
  lo limitaba a notas sobre factura anterior). Con los ajustes del contador (adenda del 2026-11-13 en
  `docs/modulos/dictamen-u8l-2026-11-12.md`): aviso si el neto de una casilla de la sección 5 del SAT-2237 queda
  negativo; la leyenda de «OC» sin «otro NIT» ni «rechazo de la SAT»; el IVA de una nota siempre se toma del DTE.
  P-U8l-1 (frase FEL 9-22) sigue abierto: necesita el documento oficial de la SAT.
- **2026-11-13 — Seguridad de H2b decidida (S1, S2 y S10).** Fila de revisión de PDF con tope (10 en espera, 60 s, 2
  por cuenta, 429), los PDF que genera la app con prioridad en la misma fila, y tarea diaria que borra los archivos
  huérfanos de más de 24 horas. Plan en `docs/modulos/plan-h2-cola-de-qpdf-y-huerfanos.md` (solo core; va antes del
  paso 4 de H2).

- **2026-11-13 — P1-1 (servidor, Libro de compras): DTE anteriores a la fecha de inicio.** La bandeja marca cada fila
  con `anteriorALaFechaDeInicio` y `enPlazoDeCredito` (calculadas al consultar con `empresas.obtener_carga_inicial`; sin
  fecha de inicio nada se marca), con el filtro `anteriores=incluir|ocultar|solo` y los campos `fechaDeInicio` y
  `anterioresOcultos` en la página. La conciliación suma el grupo informativo `anterioresALaFechaDeInicio` (solo filas
  sin documento en Arrancar; con documento se concilia como siempre) y `fechaDeInicio`; importar responde
  `anterioresALaFechaDeInicio` y un aviso con la salvedad de C-U8-1. Las marcas solo se calculan en la lista (las
  respuestas de completar, descartar y restaurar las traen en falso). Sin migraciones.
- **2026-11-13 — CP2-4 (servidor, ajustes).** `AjustarSaldo` (pide `CargaInicial`, bloquea la nota; solo registrada o autorizada; monto hasta el saldo libre; causa, referencia obligatoria al compensar, tope de «Diferencia menor»; fecha por omisión hoy, no futura ni anterior a la recepción o a la fecha de inicio; audita `ajustar` —acción nueva en `AccionAuditada`— con la ficha de la nota anterior y publica `ajuste_registrado` con `efecto`, serie y número) y `AnularAjuste` (motivo, audita `anular` con el ajuste anterior y publica `ajuste_anulado` con monto, efecto y la fecha de hoy). Reglas en `dominio/reglas-de-ajuste.ts`, errores en `errores-de-ajustes.ts`, eventos en `eventos-de-ajustes.ts` y en `core/contratos`. Variable `cuentas-por-pagar.ajustes.tope_diferencia_menor` (instalación y empresa, Q25; con 0 se apaga), permisos `ajustes.crear` y `ajustes.anular`, rutas `POST …/documentos/:id/ajustes` (201, ficha de la nota) y `POST …/ajustes/:id/anular`. La ficha de una nota trae `ajustes` (con `efecto`, quién y cuándo, anulación y `puedeAnular`), `fechaMinimaDeAjuste` y `topeDiferenciaMenor`; por eso `ObtenerDocumentoPorPagar` y `AplicarNota` leen la carga inicial y el tope. La ayuda de comisiones bancarias y el aviso de año anterior son del cliente (CP2-6). Sigue CP2-5 (cliente, pantalla).
- **2026-11-13 — Bancos H2a en `main` (pasos 2 y 3 del diseño de H2).** Servidor: migración de bancos `0030` (columnas
  `saldo_estado_de_cuenta` y `previa_al_saldo_transcrito`, tres `check`; las conciliaciones ya terminadas quedan
  previas), `PUT /api/bancos/conciliaciones/:id/saldo-del-estado-de-cuenta`, terminar y autorizar exigen el saldo y que
  coincida (`falta_el_saldo_del_estado_de_cuenta` 400, `saldo_del_estado_de_cuenta_no_coincide` 422), una elaborada
  previa se devuelve. Cliente: `SaldoTranscrito` (comparación en vivo en centavos), `AccionesDeConciliacion` (Terminar
  deshabilitado con lo que falta) e impresión con el saldo. Pruebas: servidor 3700, cliente 921. **Sin ver en el
  navegador.** Revisión de seguridad de la fila de PDF y de la limpieza de huérfanos: «se puede unir con arreglos»
  (la limpieza borraba el logo de la instalación); en corrección. Decidido por el usuario: interruptor
  `DEPURAR_HUERFANOS`, tope de 5 en espera para los PDF del sistema y rastro de borrados solo en el log.

- **2026-11-13 — P1-2 (cliente, Libro de compras): DTE anteriores a la fecha de inicio.** En Pendientes la bandeja pide
  `anteriores=ocultar` y muestra el aviso «N DTE son de antes de la fecha de inicio (dd/mm/aaaa) y no se muestran» con la
  ayuda del contador y «Mostrar N» (con ellos a la vista, «Ocultar»); las demás pestañas los incluyen. Cada fila anterior
  lleva la marca «Antes de la fecha de inicio» (las ya registradas no) y, si está en plazo de crédito, marca destacada,
  borde ámbar y la frase «revise que esté en el sistema anterior». Al completar la fila conserva las marcas de la lista
  (las respuestas las traen en falso). La conciliación suma el grupo plegado «DTE de antes de la fecha de inicio»
  (informativo: no cuenta como conciliado ni por revisar) con «Registrar aquí» (abre el formulario con el DTE),
  «Descartar» y «Restaurar». La nota sin factura suma «Si su factura es de antes de la fecha de inicio, regístrela desde
  el formulario» (tarjeta y error en lote). El aviso de importar ya lo muestra la ventana (avisos del servidor). Sin
  pruebas de navegador (pendiente de QA con U8l).
- **2026-11-13 — CP2-5 (cliente, pantalla «Notas de crédito»).** Página `NotasDeCredito.vue` (Operación, ruta `/cuentas-por-pagar/notas-de-credito`, permiso `documentos.ver`) con filtros propios (proveedor, estado, «Solo con saldo a favor» encendido por omisión, fechas de emisión), tarjetas con total, aplicado, ajustado y saldo a favor destacado, etiqueta «Saldo inicial» y «Se puede aplicar» (`puedeAplicar`), y resumen de saldo a favor por proveedor. Lógica pura en `composables/notas-de-credito.ts` con pruebas; `usarPeticionDeDocumentos` y `usarProveedoresDelFiltro` se comparten con Documentos por pagar. Tipos: `ajustado`, `puedeAplicar`, `puedeAjustar`, `conSaldo`. El resumen por proveedor solo se muestra cuando todas las notas caben en la página (si no, sumaría una parte). Las ventanas de aplicar y ajustar siguen en CP2-6.
- **2026-11-13 — U8l-1 (servidor, Libro de compras, datos).** Migración `0035_u8l_facturas_anteriores`: tabla
  `facturas_anteriores` (diseño §3.1, con las notas de débito anteriores, el único por proveedor + serie + número sin
  tipo y el único parcial por autorización FEL), `documentos.factura_anterior_id` con su llave e índice, el check
  `documentos_nota_con_factura` reemplazado (una sola factura) y `otra_causa_sin_credito` en `MOTIVOS_SIN_CREDITO`, en
  los checks de motivo y de IVA al costo, en el cálculo, el rubro «Compras sin derecho a crédito» del SAT-2237, el
  análisis y el libro (sigla «OC»). Por P-U8l-2 **no** existe `documentos_otra_causa_solo_en_nota_con_factura_anterior`;
  el detalle obligatorio reutiliza `documentos.observaciones` (check `documentos_otra_causa_con_detalle`, exige
  observaciones salvo en la nota de crédito, que hereda el motivo de su factura) y la factura anterior gana la columna
  `detalle_del_motivo` (check `facturas_anteriores_detalle_del_motivo`, 1 a 500 y obligatorio con «otra causa»). Sin
  casos de uso ni API nuevos: siguen U8l-2 a U8l-4.
- **2026-11-13 — Core (archivos): fila de revisión de PDF y limpieza de huérfanos en `main`** (plan y notas en
  `docs/modulos/plan-h2-cola-de-qpdf-y-huerfanos.md`). `FilaDeRevision` reemplaza al semáforo de `InspectorQpdf`: 10 de
  usuario en espera, 2 por cuenta, 60 s, 429 `revision_de_pdf_saturada` con `Retry-After: 30`; el origen `sistema`
  (`guardar`, libro foliado) pasa delante con tope propio de 5 en espera. `DocumentosProtegidos.revisar(operador,
contenido, nombre)` e `InspectorDePdf.inspeccionar(contenido, turno)`. Tarea diaria `DepurarArchivosHuerfanos`
  (al arrancar y cada 24 h): solo rutas con la forma de `RutasDeArchivo` (el logo de la instalación no se toca), más de
  24 h, 1,000 por corrida, cerrojo `pg_try_advisory_lock` entre instancias, se niega con una raíz insegura y se apaga
  con `DEPURAR_HUERFANOS=false` (antes de restaurar una base más vieja que los archivos). Migración de core `0023`
  (índices por ruta y función `core.rutas_de_archivos_registradas`, `security definer`, `row_security = off`).
  Revisado por el agente de seguridad («se puede unir con arreglos», los diez aplicados). Pruebas del servidor: 3797.
  En programación: H2b servidor (archivo del estado de cuenta).

- 2026-11-13 — **CP3-1 (servidor, datos de contraseñas)** (`diseno-cp3-contrasenas.md`): tablas `cuentas_por_pagar.contrasenas`
  (con `impresa_en`) y `contrasena_documentos` (llaves compuestas al proveedor, único parcial «una sola contraseña vigente»
  y cascada desde el documento), `aplicaciones_de_notas.contrasena_id` con la forma `contrasena` y su check; migración
  `0006_cp3_contrasenas` (CP2-2 tomó la 0005) y mensaje de `contrasena_documentos_vigente_unico`. Sin casos de uso ni API:
  siguen CP3-2 a CP3-5.
- **2026-11-13 — Diseño de CP4 (pagos a proveedores), propuesta para aprobar.** `docs/modulos/diseno-cp4-pagos.md`:
  tablas `pagos` (forma `cheque`, `nota_de_debito`, `nota_ligada` o `cuenta_de_apertura`; correlativo propio; llave a
  `bancos.movimientos`) y `aplicaciones_de_pagos` (llave a `contrasena_documentos`: solo se paga lo que está en la
  contraseña; único parcial que garantiza la retención en un solo pago vigente), `reintegros` (depósito o efectivo) y
  `ajustes_de_saldo.pago_id` (diferencias de centavos de un cargo); migración de Cuentas por pagar `0008` (después de
  CP3-1 `0006` y U8l-2 `0007`). En Bancos: contratos `bancos.*` (emitir cheque y registrar nota con origen, anular,
  medios de pago; aviso `movimiento_por_cambiar`), nota de débito marcada = concepto `pago_a_proveedor`, conceptos de
  sistema `pago_a_proveedor_de_activo` y `reintegro_de_proveedor`, desglose por concepto para el pago mixto (migración
  de Bancos `0032`, después de H2b `0031`). «Ligar al cheque o nota de saldo inicial de Bancos» espera a que Bancos
  tenga cheques en circulación al empezar. Preguntas CP4-a a m para el usuario y C-CP4-1 a 8 para el contador.

- **2026-11-13 — CP2-6 (cliente, ficha de la nota).** En la ficha de una nota de crédito: «Aplicar a otro documento» (`aplicar-notas`, `puedeAplicar`) abre `VentanaDeAplicacion` con los cargos del proveedor (autorizados primero, «Sin autorizar» marcados), monto propuesto editable por fila, «Todo lo que cabe», «Repartir de nuevo», total contra el saldo a favor, fecha (mínimo según los documentos elegidos) y referencia del acuerdo, con aviso de bancarización cuando se compensa contra un cargo sobre el umbral; «Ajustar saldo» (`ajustes.crear`, `puedeAjustar`) abre `VentanaDeAjuste` (aviso «corrija la nota en el Libro de compras», ayuda por causa con «no deducible» y «las comisiones bancarias no son diferencia menor», tope de diferencia menor, referencia obligatoria al compensar, aviso de año anterior sin bloquear). Nuevas secciones «Notas de crédito aplicadas» (forma, fecha, referencia, «Quitar» con motivo) y «Ajustes del saldo» (causa, efecto, estado, «Anular el ajuste» con motivo); el cargo con aplicaciones manuales explica «quite primero esas aplicaciones». Lógica pura en `aplicacion-de-nota.ts`, `ajuste-de-saldo.ts`, `aplicaciones-de-la-ficha.ts` y `dinero.ts`, con pruebas. **Pendiente de servidor:** la respuesta de `cargos-para-aplicar` no trae el umbral de bancarización (no es configuración pública), así que el aviso no dice la cifra; basta agregar `umbralDeBancarizacion` a esa respuesta para mostrarla. Sigue CP2-7 (QA).
- **2026-11-13 — CP4 (pagos) aprobado por el usuario** (diseño `docs/modulos/diseno-cp4-pagos.md`, dictamen
  `docs/modulos/dictamen-cp4-2026-11-13.md`, «correcto con ajustes»). Acepta todas las recomendaciones del diseño
  (CP4-a a m) con las correcciones del contador: se **quita** «ligar al cheque o nota de saldo inicial de Bancos»
  (forma `saldo_inicial_de_bancos`, su permiso y CP4-13); posfechado «comprometido» hasta su fecha y aviso de fondos en
  Bancos (el cheque se paga a la vista); «reaplicar pago»; centavos solo como residuo de un pago; fecha mínima del
  pago = emisión del DTE; cuenta de apertura con la fecha de inicio. **Cambia lo decidido antes:** (1) una contraseña
  con pagos se sigue editando y se quitan los documentos sin pagos; (2) con Cuentas por pagar inactivo, Bancos rechaza
  cambiar los movimientos que vinieron de un pago. **Desglose de la nota ligada por activo fijo (Inversión) en CP4**,
  no solo aviso.
- **2026-11-14 — Diseño de CP4 listo para programar** (`docs/modulos/diseno-cp4-pagos.md`, estado «aprobado, listo
  para programar»). Aplicados el dictamen y las decisiones del 2026-11-13: sin forma `saldo_inicial_de_bancos` (el
  cheque de apertura anulado que revive el pasivo queda en _Bancos, segunda parte_, `HOJA-DE-RUTA.md`); posfechado
  «comprometido» hasta su fecha (`estadoDePago` suma `comprometido`) y aviso de fondos en Bancos; fecha mínima del pago =
  emisión del DTE; beneficiario = nombre del NIT; texto nuevo de bancarización (cuentan las notas ligadas); desglose de
  la nota ligada por activo fijo con la orden nueva `bancos.fijar_desglose_de_conceptos`; centavos solo como residuo de
  un pago (check `ajustes_pago_solo_diferencia`, variable `cuentas-por-pagar.pagos.tope_diferencia`); «reaplicar pago»
  (`pagos.reaplicar`, auditoría `corregir`, evento `pago_reaplicado`); `pago_anulado` con `anulacionEnBancos` y
  `fechaOriginal`; concepto `reintegro_de_proveedor_de_activo`; recibo de reintegro y comprobante con leyenda «no es
  documento tributario». `diseno-cp3-contrasenas.md`: la contraseña con pagos se sigue editando (aviso de
  «REIMPRESIÓN») y la migración es la `0006` (P-CP4-1). Migraciones verificadas en `main`: Cuentas por pagar `0006`
  (CP3-1), `0007` reservada a U8l-2, `0008` de CP4; Bancos `0030`, `0031` de H2b, `0032` de CP4. Orden: CP4-B1 y B2a
  después de H2b servidor; CP4-B2b (avisos desde la conciliación) después de H2b completo; CP4-1 después de U8l-2;
  CP4-2 después de CP3-3 a CP3-5 y U8l-3; clientes después de CP3-7. Pendientes P-CP4-2 a P-CP4-5 (§14).
- **2026-11-14 — Detalles de CP4 confirmados por el usuario** (P-CP4-4 del diseño): la fecha de la contraseña ya no
  limita la fecha del pago (solo aviso); el aviso de fondos del posfechado sale también al emitirlo desde Bancos; la
  diferencia de centavos se salda también desde la ficha de un pago vigente; sin nombre fiscal del proveedor el pago se
  rechaza; reaplicar lleva su propio permiso. **P-CP4-2:** además del filtro por mes de Libro de compras → Retenciones,
  CP5 tendrá un reporte de **constancias pendientes de todos los meses**, con su plazo de entero. P-CP4-5: el aviso
  «al desmarcar» es la nota marcada que se desmarca desde la conciliación (CP4-B2b). Queda P-CP4-3 (tope de diferencia
  de pagos, Q25 por omisión) para el contador.
- 2026-11-14 — **CP3-2 (servidor, crear y consultar contraseñas)** (`diseno-cp3-contrasenas.md`): `CrearContrasena` (carga inicial,
  proveedor, bloqueo de documentos en orden de id, validaciones de §5.1 con la fecha no anterior a la fecha de inicio,
  reparto de las notas entre los cargos con forma `contrasena` y fecha «la mayor» de contraseña, recepción de la nota y del
  cargo, correlativo `cuentas-por-pagar.contrasenas` al final), `ListarContrasenas`, `ObtenerContrasena` y
  `DocumentosDisponibles`; permisos `contrasenas.ver` y `.crear`; rutas `GET/POST /cuentas-por-pagar/contrasenas`,
  `GET …/disponibles` y `GET …/:id`. Dominio en `contrasena.ts`, `reglas-de-contrasena.ts`, `reparto-de-contrasena.ts` y
  `errores-de-contrasenas.ts` (suma `DocumentosRepetidosEnContrasena` y `ObservacionesDeContrasenaInvalidas`). El reparto se
  guarda desde `RepositorioDeContrasenas.guardarReparto` (no desde `RepositorioDeAplicaciones`). `rebajado` de un saldo
  inicial incluye lo anterior al inicio. Aparte: `cargos-para-aplicar` (CP2-3) trae `umbralDeBancarizacion`.
  `noEstarEnContrasena` y `NotaEnContrasena` quedan para CP3-4. Siguen CP3-3 a CP3-5.
- 2026-11-14 — **CP3-3 (servidor, editar contraseñas)** (`diseno-cp3-contrasenas.md` §5.2): `EditarContrasena` (fecha prometida con
  motivo y auditoría `corregir` con `{ fechaDePago, observaciones }` como estaban; observaciones sin auditoría),
  `AgregarDocumentosAContrasena` y `QuitarDocumentoDeContrasena` (motivo, auditoría `quitar` con la contraseña como estaba y
  su lista de reglas `REGLAS_PARA_QUITAR_DE_CONTRASENA` vacía para CP4); permiso `contrasenas.editar`; rutas
  `PATCH …/contrasenas/:id`, `POST …/:id/documentos` y `DELETE …/:id/documentos/:documentoId`. Lo común (bloqueo en orden,
  validación y reparto) está en `documentos-de-la-contrasena.ts` y `rehacer-el-reparto.ts`; `RepositorioDeContrasenas` suma
  `borrarReparto`, `bloquear`, `actualizar`, `agregarDocumentos` y `quitarDocumento`. Rehacer el reparto borra y vuelve a
  guardar las aplicaciones `contrasena`; las fechas salen igual para las notas que no cambian. Agregar un documento emitido
  después de la fecha de la contraseña da `FechaDeContrasenaInvalida`. Nuevo error `ContrasenaAnulada`. El aviso de
  «REIMPRESIÓN» es de la pantalla. Siguen CP3-4 y CP3-5.
- 2026-11-14 — **CP3-4 (servidor, anular y reglas de baja)** (`diseno-cp3-contrasenas.md` §4, §5.3 y §5.4): `AnularContrasena`
  (motivo, auditoría `anular` con la contraseña como estaba, borra las aplicaciones de la contraseña, suelta los documentos con
  `vigente = false`; lista `REGLAS_PARA_ANULAR_CONTRASENA` vacía para CP4) y `POST …/contrasenas/:id/anular` con el permiso
  `contrasenas.anular`. `DocumentoConAplicaciones` trae `contrasenaVigente` y `contrasenas` (vigente y anuladas);
  `noEstarEnContrasena` va primero en `REGLAS_PARA_ANULAR`, `REGLAS_PARA_ELIMINAR` y `REGLAS_PARA_CORREGIR_SALDO_INICIAL`
  (no en desautorizar) y lanza `DocumentoEnContrasena`. Aplicar, ajustar y quitar una aplicación manual de una nota dentro de
  una contraseña vigente lanzan `NotaEnContrasena` (`dominio/nota-en-contrasena.ts`; la regla de quitar recibe ahora la nota).
  `FilaDeDocumento` y `DocumentoPorPagarDto` suman `contrasena: { id, numero } | null`, `accionesDelDocumento` suma
  `enContrasena` (cierra anular, eliminar, aplicar y ajustar) y la lista admite `sinContrasena=true`. La ficha de la
  auditoría (`FichaDelDocumentoDto`) suma `contrasenas`, para que quede el rastro al eliminar un documento que estuvo en
  contraseñas anuladas.
- 2026-11-14 — **CP3-5 (servidor, impresión)** (`diseno-cp3-contrasenas.md` §5.5): `GET …/contrasenas/:id/impresion` (vista
  previa, no cambia nada; ya dice «REIMPRESIÓN» si la contraseña se había impreso) y `POST …/contrasenas/:id/impresiones`
  (`RegistrarImpresion`: `update … set impresa_en = now() where impresa_en is null`, así de dos impresiones a la vez solo una es
  la primera), ambos con `contrasenas.ver` y sin auditoría. `ImpresionDeContrasenaDto` trae empresa (mediador,
  `empresas.obtener_datos_de_empresa`), contraseña, proveedor, las dos hojas, cargos con lo fijo y lo vivo, totales,
  compensaciones («Compensación con nota N (saldo a favor)»), retenciones por emitir (saldos iniciales, sin restarlas),
  leyenda de constancias solo si hay retenciones, `leyenda` de la empresa, `alDia`, `reimpresion` e `impresoPorNombre`. Variable
  `cuentas-por-pagar.contrasenas.leyenda` (instalación y empresa; vacía no se imprime). Sigue CP3-6.
- 2026-11-14 — **CP3-6 (cliente, lista y nueva contraseña)** (`diseno-cp3-contrasenas.md` §8): páginas `ListaDeContrasenas` (filtros de
  proveedor, estado, fechas y pago prometido; tarjetas con «Anulada» o «Pago vencido») y `NuevaContrasena` (proveedor, casillas
  con «Marcar todas», reparto de las notas y totales en vivo, fecha prometida propuesta con el mayor vencimiento hasta que se
  escribe, aviso de bancarización, confirmación con resumen); rutas `/cuentas-por-pagar/contrasenas` y `/nueva`, menú
  «Contraseñas» en Operación. Lógica pura en `composables/contrasenas/` (`edicion-de-contrasena`, `reparto-de-contrasena`,
  `filtros-de-contrasenas`) con pruebas. El aviso de bancarización no dice el monto del umbral porque `disponibles` no lo trae y no
  es variable pública (pendiente si se quiere con la cifra). Al crear vuelve a la lista con aviso; CP3-7 la llevará a la ficha y
  dará destino a las tarjetas. Sigue CP3-7.
- 2026-11-14 — **CP3-7 (cliente, ficha e impresión de la contraseña)** (`diseno-cp3-contrasenas.md` §5.2, §5.5 y §8): página
  `FichaDeContrasena` (`/cuentas-por-pagar/contrasenas/:id`): datos, facturas y notas con sus montos de hoy, totales, «Cambiar fecha
  de pago» (ventana con fecha, motivo solo si cambia la fecha y observaciones), «Agregar documentos» (reutiliza la selección de la
  nueva contraseña), «Quitar» por documento y «Anular» (ventanas de motivo con el resumen de lo que va a pasar); si la contraseña ya
  se imprimió, los avisos dicen «REIMPRESIÓN» (agregar además confirma) y anular «recupere el original que tiene el proveedor».
  Los botones salen con el permiso `contrasenas.*` y con `puedeEditar`/`puedeAnular` del servidor. `ImpresionDeContrasena`
  (`…/:id/imprimir`): una hoja blanca por cada elemento de `hojas` (original y copia, salto de página al imprimir, sin menú),
  con lo fijo, lo vivo «al dd/mm/aaaa», compensaciones, retención por emitir, leyendas, firmas y pie; «ANULADA» y «REIMPRESIÓN» son
  texto, no color. «Imprimir» llama `POST …/impresiones`, redibuja y abre `window.print()`; la vista previa no marca. Lo que dejó
  CP3-6: al crear va a la ficha, las tarjetas de la lista llevan a ella y `GET …/contrasenas/disponibles` trae
  `umbralDeBancarizacion` (texto con dos decimales) para que el aviso diga la cifra. Lógica pura con pruebas en
  `ficha-de-contrasena` e `impresion-de-contrasena`. Sin migración. Falta la etiqueta «Contraseña N» y el filtro «Sin contraseña»
  en Documentos por pagar (el servidor ya trae `contrasena` y `sinContrasena`). Sigue CP3-8 (QA).
- 2026-11-14 — **CP3-8 (QA de punta a punta de las contraseñas)**: informe `docs/modulos/informe-qa-cp3-2026-11-14.md`. Se programó lo que
  dejó CP3-7 (etiqueta «Contraseña N» en tarjeta y ficha, enlace a la contraseña, filtro «Sin contraseña»). Todos los flujos
  pasaron en celular y escritorio, claro y oscuro, y la impresión se lee en blanco y negro. Corregido: el resumen de «Nueva
  contraseña» no mostraba lo ya rebajado de un saldo inicial (no cuadraba), «Agregar documentos» no ofrecía notas si no había
  facturas, la ficha del documento no explicaba por qué no se anula ni elimina en una contraseña, y faltaba un espacio en la hoja
  impresa. Quedan observaciones menores (error del motivo que no se limpia al escribir, texto de «quitar el último cargo»).

- **2026-11-14 — CP2-7 (QA de punta a punta de las notas de crédito).** Informe `docs/modulos/informe-qa-cp2-2026-11-13.md`: flujos de aplicar, quitar, ajustar, anular, bajas desde Libro de compras, pantalla «Notas de crédito» y permisos probados en el navegador (escritorio y celular, claro y oscuro) con saldos cuadrados a mano. Corregido: **(E1, grave)** escribir un monto en las ventanas de aplicar y de ajustar rompía la ventana (el campo numérico entrega números y la lógica llamaba `.trim()`); la ficha se salía de la pantalla del celular con una referencia larga; faltaba «complétela antes de ajustar» en una nota pendiente. Quedan observaciones menores (umbral de bancarización sin cifra, mensaje con tope de diferencia menor en 0, texto de la fecha mínima, «Ajustado» fuera de los montos de la ficha).
- **2026-11-14 — CP2-8 (cliente, observaciones menores de la QA de notas de crédito).** Corregidas O1 a O4 y la referencia larga del informe `informe-qa-cp2-2026-11-13.md`: el aviso de bancarización dice la cifra (`umbralDeBancarizacion` de `cargos-para-aplicar`), «Diferencia menor» no se ofrece con tope 0 y se explica, el mensaje de fecha mínima dice si viene de la recepción del documento, de la nota o del inicio de la empresa, «Montos» de la ficha de una nota suma con «Ajustado», y `CampoTexto` (`contar`) muestra el contador de caracteres y el error en vez de cortar la referencia. Sin cambios de servidor.
- **2026-11-14 — Bancos H2b servidor en `main` (paso 4 del diseño de H2), con la revisión de seguridad aplicada.**
  Migración de bancos `0031` (`estado_de_cuenta_archivo_id`, `unique`, llave a `core.archivos`). Rutas
  `POST`/`DELETE`/`GET /api/bancos/conciliaciones/:id/estado-de-cuenta` (subir y quitar con `conciliar` y solo en
  proceso; ver con `ver`; el `GET` responde `application/pdf` o `image/webp`, `inline`, nombre armado por el servidor,
  `no-store`). Subida en tres tiempos (`revisar` fuera de la transacción, fila bloqueada al guardar). Variable
  `bancos.conciliaciones.exigir_estado_de_cuenta` (empresa e instalación, `true` por omisión, pública): solo se revisa
  al terminar (`falta_el_estado_de_cuenta` 400); autorizar no la revisa (P3). DTO con `estadoDeCuenta` (sin id ni ruta)
  y `tieneEstadoDeCuenta` en la lista (P5). Reemplazar, quitar y eliminar auditan con el `sha256`.
  **Arreglos de seguridad** (dictamen «se puede unir con arreglos»): (1) **core**: toda subida acepta un solo archivo y
  ningún campo de texto (`core/compartido/http/lectura-de-multipart.ts`, `leerUnSoloArchivo`; documentos, fotos y Excel;
  400 `subida_con_mas_de_un_archivo`): antes cabían ~1,000 campos de 1 MB en memoria por solicitud; (2) eliminar,
  autorizar y devolver bloquean la conciliación (`for update`); (3) las 30 subidas por minuto son comunes a fotos y
  estados de cuenta; (4) errores de multipart en español (`subida_no_es_de_archivo`, `subida_interrumpida`).
  Pruebas tras la unión con `main`: servidor 3900, cliente 972, `revisar` limpio. **Pendiente del usuario:** tope de
  tamaño de solicitud en Caddy (~20 MB, toda la instalación); qué hacer si un navegador no muestra el PDF en el
  `iframe` (CSP propia de esa respuesta o solo «Abrir en otra pestaña»; se sabrá en el QA); el `nombreOriginal` del
  archivo se conserva 60 meses en la auditoría (seguridad recomienda conservarlo). **Sigue:** paso 5 (cliente de H2b),
  paso 6 (documentación en `bancos.md`) y paso 7 (QA en el navegador de todo H2).

- **2026-11-14 — CP4-B1 (servidor, Bancos: datos y conceptos del diseño de CP4).** Migración de Bancos `0032_cp4_pagos_de_cuentas_por_pagar`: tabla `bancos.desglose_de_movimientos` (llave compuesta al concepto de la empresa, único por movimiento y concepto, monto positivo, cascada al borrar el movimiento, RLS por empresa) y tres conceptos de sistema nuevos (`pago_a_proveedor_de_activo`, `reintegro_de_proveedor`, `reintegro_de_proveedor_de_activo`) en `CONCEPTOS_DE_SISTEMA` y, en las empresas con catálogo, por `insert` (a un concepto sin clave con el mismo nombre se le pone la clave; repetible). Los totales por concepto (flujo de efectivo y movimientos por concepto) usan el desglose cuando existe y un inverso usa el de su original. Nada escribe todavía el desglose: llega con las órdenes de CP4-B2a.

- **2026-11-14 — U8l-2 (servidor, Cuentas por pagar: datos y sentido de la llave).** Migración
  `0007_u8l_notas_sobre_saldos_iniciales` (con `when` mayor que el de la `0006`): `documento_afectado_id` pasa a guardar
  el **id propio** de la factura (del libro o saldo inicial); `documentos_factura_fk` ahora va a
  `documentos_id_proveedor_unico (id, empresa_id, proveedor_id)` (a mano, con el `update` que convierte los ids viejos
  entre quitar y volver a poner la llave); columna `factura_del_sistema_anterior boolean not null default false`;
  `documentos_nota_con_factura` reemplazado, `documentos_factura_anterior_solo_en_notas` y el índice parcial
  `documentos_notas_del_sistema_anterior_libres_idx`. `RecibirDocumento` traduce el id del libro al propio
  (`buscarPorDocumentoDeCompra`); `paraAplicarUnaNota`, la consulta base (`notas_del_documento`) y `notasDe` buscan por
  `documentos.id` (ya sirven a un saldo inicial). La columna nueva queda solo en la tabla: la entidad y el DTO la
  recibirán en U8l-3 (que es quien la escribe). Pruebas nuevas en `documentos-factura-anterior.prueba.ts` (llave por id
  propio, checks, relleno de la migración 0007 sobre ids viejos) y ajustes a las de CP1, CP2 y CP3 que sembraban el id
  del libro. Sin cliente ni contrato: sigue U8l-3.
- **2026-11-14 — CP4-B2a (servidor, Bancos: contratos, órdenes y reglas fuera de la conciliación).** `core/contratos/bancos.contratos.ts` con las cinco órdenes (`medios_de_pago`, `emitir_cheque_de_origen`, `registrar_nota_de_origen`, `anular_movimiento_de_origen`, `fijar_desglose_de_conceptos`) y el aviso `movimiento_por_cambiar`; Bancos las atiende (`composicion/ordenes.ts`) con los mismos casos de uso de su pantalla (`EmitirCheque`, `CrearMovimiento`, `AnularCheque`, `AnularMovimiento`) y escribe el reparto por concepto (`DesgloseDeMovimientos`: suma exacta, claves del mismo tipo, concepto del movimiento = el de mayor monto, sin filas si todo va a ese concepto). El `RevisorDeCambios` manda el aviso antes de anular (con `formaDeAnulacion`), anular cheques caducos, eliminar, blanquear, corregir, reclasificar y desmarcar lo que tiene origen o es nota marcada; con Cuentas por pagar inactivo rechaza con `ModuloDeOrigenInactivo`. Lo que tiene origen no se corrige, elimina ni blanquea en Bancos (`MovimientoDeOtroModulo`). Marcar y desmarcar notas (`POST /bancos/notas/:id/marcar` y `/desmarcar`, `bancos.notas.editar`; también `marcarParaCuentasPorPagar` al registrar): la marca es el concepto `pago_a_proveedor`; se audita como `corregir` con el motivo. `MovimientoDto` gana `marcadaParaCuentasPorPagar`, `desglose`, `puedeMarcar` y `puedeDesmarcar`; emitir un cheque devuelve `avisos` con el de fondos de un posfechado (saldo de hoy menos posfechados vigentes menos el cheque, también por la orden). Sin migración. Pendiente: el aviso al desmarcar desde la conciliación (CP4-B2b) y el cliente (CP4-B3). Interpretaciones: la auditoría de marcar y desmarcar usa el recurso `bancos.movimientos` (como las demás de notas); `puedeMarcar` es estructural (el servidor exige además el módulo activo); corregir una nota marcada conserva su concepto; reclasificar una nota marcada manda el aviso `reclasificar` y, con reparto, se rechaza.

- **2026-11-14 — U8l-3 (servidor, Cuentas por pagar: recibir notas sobre facturas anteriores).** Contrato:
  `DocumentoParaDestino.facturaAnterior?` (`FacturaAnteriorDeLaNota`: tipo, serie, número y fecha), opcional al leerlo.
  `RecibirDocumento` busca (con `for update`) el saldo inicial vigente de la factura que cita la nota (mismo proveedor,
  serie y número; los seis tipos de factura cuentan como uno): si lo halla, la nota apunta a él, se marca
  `factura_del_sistema_anterior` y la de crédito se aplica sola (saldo inicial y luego sus notas de débito); si no, queda
  libre (crédito) o como cargo suelto (débito). Avisos: fecha distinta, saldo libre con «la factura pudo tener retención»,
  retenciones por practicar del saldo inicial y «no hay saldo inicial» (de crédito y de débito). La entidad y el DTO
  ganan `facturaDelSistemaAnterior`; la ficha, `facturaAnterior` (leída de Libro de compras). `noTenerMovimientos` cuenta
  las notas que corrigen al saldo inicial (también anuladas) con `notasQueLoCorrigen`, y `puedeCorregir`/`puedeEliminar`
  usan `notasEnTotal`. `SaldoInicialDto.notasPosteriores` y `saldosConNotasPosteriores` del cuadre (por proveedor y
  general) avisan de las notas libres que citan un saldo inicial cargado después (no se enlazan solas). La factura que no
  llegó a Cuentas por pagar lanza `FacturaDeLaNotaNoRecibida` en vez de un `Error`. Sin migración. Pruebas: unitarias de
  recibir, de dominio y de saldos iniciales, y de integración de las consultas SQL (`notas-del-sistema-anterior`). Sin
  cliente: sigue U8l-4 (Libro) y U8l-7.
- **2026-11-14 — CP4-1 (servidor, datos de pagos).** Migración `0008_cp4_pagos` de Cuentas por pagar (generada con
  `bd:generar`, sin editar a mano): tablas `pagos`, `aplicaciones_de_pagos`, `reintegros` y `aplicaciones_de_reintegros`
  con sus checks, únicos, llaves compuestas, la llave a `contrasena_documentos` y las dos a `bancos.movimientos`, y RLS por
  empresa; `ajustes_de_saldo.pago_id` con su llave, índice y check `ajustes_pago_solo_diferencia`. Los checks de estado y
  anulación comunes de `pagos` y `reintegros` viven en `anulacion.restricciones.ts`. Mensaje de
  `aplicaciones_de_pagos_retencion_una_vez` en `errores-de-postgres.ts`. Pruebas de tablas (`pagos.prueba.ts`,
  `reintegros.prueba.ts`) con un movimiento real de Bancos (`movimientos-de-bancos.soporte.ts`). Sin casos de uso ni
  permisos: siguen CP4-2 y siguientes.
- **2026-11-14 — Cambia CP4-k: pago en efectivo a varios proveedores, en CP4.** El usuario pide soportar sacar dinero
  del banco y pagar en efectivo a varios proveedores (y varias contraseñas) con ese retiro, sin esperar a Caja chica.
  El arquitecto escribe la adenda al diseño de CP4 (retiro marcado, forma `efectivo`, recibo, bancarización, anulación,
  contabilidad) y el contador la valida antes de programarla.
- **2026-11-14 — Adenda de CP4: pagos en efectivo con un retiro del banco (propuesta para aprobar)**
  (`docs/modulos/diseno-cp4-pagos-en-efectivo.md`). Retiro de efectivo creado desde Cuentas por pagar (tabla
  `retiros_de_efectivo`, cheque o nota de débito por orden a Bancos con origen = el retiro, custodio, liquidación con
  devolución por depósito y faltante con motivo), forma `efectivo` en `pagos` con `retiro_id` (un retiro cubre pagos de
  varios proveedores y contraseñas), recibo = comprobante del pago con leyenda no tributaria, bancarización con bloqueo
  salvo permiso y motivo (recomendado), conceptos de Bancos sin flujo `efectivo_para_pagos` y
  `devolucion_de_efectivo_para_pagos` (`0033`) y desglose del retiro para el flujo. Propone además **un pago para varias
  contraseñas del mismo proveedor** (quitar `pagos.contrasena_id`, migración `0009` antes de CP4-3). No cambia los saldos
  ni las reglas de CP4-2; le pide buscar los pagos de una contraseña por `aplicaciones_de_pagos.contrasena_id`. Preguntas
  CP4-E-a a h para el usuario; el contador valida bancarización, partidas, flujo y recibo antes de programar.
- **2026-11-14 — Pagos en efectivo aprobados por el usuario** (adenda `docs/modulos/diseno-cp4-pagos-en-efectivo.md`,
  dictamen `docs/modulos/dictamen-cp4-efectivo-2026-11-14.md`, «correcto con ajustes»). Acepta la adenda con las
  correcciones del contador, y precisa: **un solo retiro (un cheque o una nota de débito) paga a uno o varios
  proveedores**; no se hacen N cheques para pagar en efectivo. Cada proveedor firma su propio recibo (uno por proveedor,
  dictamen punto 5) y un pago puede cubrir varias contraseñas del mismo proveedor (M2). Bancarización: **bloqueo con
  permiso y motivo**, solo cuando la empresa pierde algo según su régimen (E-2). Retiro sin liquidar: **aviso a fin de
  mes** (sin bloqueo). Custodio: **texto con usuario opcional** (aviso si él mismo liquida).
- **2026-11-14 — Adenda de pagos en efectivo lista para programar** (`docs/modulos/diseno-cp4-pagos-en-efectivo.md`,
  estado «aprobado, listo para programar», y los cambios de M2 en `docs/modulos/diseno-cp4-pagos.md`). Aplicados los
  nueve cambios del dictamen y las respuestas del usuario. **Un retiro (un cheque o una nota de débito) paga a uno o
  varios proveedores**: la pantalla «Pagar en efectivo» reparte el retiro en una sola operación (`POST
/retiros/:id/pagos`, 1–20 pagos, todo o nada), un pago y un recibo por proveedor, cada uno con cargos de varias
  contraseñas. Bancarización: efecto fiscal por cargo según el régimen de IVA del documento y el de ISR de la empresa
  (`datos_fiscales_de_empresa`); bloqueo con permiso y motivo solo con efecto; el efectivo suma en el aviso de los pagos
  bancarios. Tabla `retiros_de_efectivo` con `custodio_usuario_id` opcional; cheque no negociable por omisión y nunca al
  portador; concepto `faltante_de_efectivo` (Operación) y leyenda en el flujo de Bancos; lista con fecha de corte. M2:
  sin `pagos.contrasena_id`, rutas por proveedor (`POST /pagos`, `/pagos/ligar`, `/pagos/apertura`, `GET
/proveedores/:id/para-pagar`). Migraciones reales: Cuentas por pagar **`0009_cp4_pago_de_varias_contrasenas`**
  (CP4-V1, después de CP4-2 y antes de CP4-3) y **`0010_cp4_pagos_en_efectivo`** (CP4-E1); Bancos
  **`0033_cp4_efectivo_para_pagos`** (CP4-EB). Quedan para decidir: N-1 (usuario: empresa sin datos fiscales, aviso
  recomendado), N-2 y N-3 (contador: tabla de efectos por régimen y vigencia del art. 27 del Decreto 4-2012); no frenan
  CP4-V1, CP4-EB ni CP4-E1.
- **2026-11-14 — Pendientes de la adenda de efectivo resueltos.** N-1 (usuario): empresa sin datos fiscales del libro →
  **solo aviso** al pagar en efectivo sobre el umbral (no se supone régimen). N-2 (contador): la tabla de efectos de
  §5.2 es correcta; usar `daCreditoFiscal()` (solo IVA `general`) y `tieneIsrSobreUtilidades()` (solo ISR
  `utilidades`) de Libro de compras; cuenta el régimen **del período del documento** (el mes del pago solo para la
  suma contra el umbral); un saldo inicial de empresa general se supone con crédito tomado (texto «si tomó el crédito
  fiscal»), sin casilla nueva. Ojo: `bajaDelPeriodo` del libro supone `?? true` y no debe «unificarse» con N-1 (N-1
  solo alcanza saldos iniciales y cargos que no vienen del libro). N-3 (contador): la Corte de Constitucionalidad
  (exp. 2836-2012, sentencia de dic. 2012) declaró **sin lugar** la inconstitucionalidad del art. 27 del Decreto 4-2012
  y revocó su suspensión: la bancarización (art. 20 del Decreto 20-2006) sigue vigente, umbral Q30,000, mes calendario
  y pago fraccionado; certeza alta.
- **2026-11-14 — CP4-2 (servidor, saldos y reglas de pagos).** El saldo calculado suma lo pagado, la diferencia menor del
  cargo y lo reintegrado (`saldoDe`; SQL con las subconsultas `pagado_al_cargo` y `reintegrado_de_la_nota`, sin migración).
  Lo pagado y lo comprometido (cheque posfechado, `fecha > hoy`) se separan en el dominio (`dominio/pagos.ts`) con el «hoy»
  de la empresa: la fila trae los pagos vigentes con su fecha, así ninguna consulta necesita la fecha. `estadoDePago`
  (`pendiente`, `en_parte`, `comprometido`, `pagado`; nulo en notas y anulados) y `pagado`, `comprometido`, `reintegrado` y
  `puedeReintegrar` en el DTO de documentos; la ficha trae `pagos` y `reintegros`, y la auditoría de una baja los guarda.
  Reglas: `noTenerPagosVigentes` (primera de anular, eliminar, desautorizar y corregir o eliminar saldo inicial, antes que la
  de la contraseña; quitar la aplicación de una nota de un cargo pagado) → `DocumentoConPagos`; `noTenerReintegrosVigentes`
  → `NotaConReintegros`; anular una contraseña → `ContrasenaConPagos`; quitar un documento con pagos, vigentes o anulados →
  `DocumentoConPagosEnLaContrasena`. Los pagos de una contraseña se buscan por `aplicaciones_de_pagos.contrasena_id` (no por
  `pagos.contrasena_id`) y los tipos no suponen que toda forma tenga movimiento en Bancos ni que el efectivo pueda ser
  futuro (adenda de efectivo). La contraseña con pagos se sigue editando; su DTO trae `pagado`, `comprometido`, `pagos` y
  `estadoDePago`, la impresión suma la columna «Pagado» y los cheques posfechados con su marca. Rendimiento con 20,000
  documentos y 30,000 pagos (`cuentas-por-pagar-pagos-rendimiento`): lista con saldo ~290 ms, saldo del proveedor ~90 ms,
  ficha ~20 ms y contraseña de 100 documentos ~110 ms: no hace falta guardar el saldo. Los pagos y reintegros de las pruebas
  se siembran en la base (los casos de uso llegan en CP4-3 y CP4-7).
- **2026-11-14 — U8l-4 (servidor, Libro de compras: registrar notas con factura anterior).** `facturaAnterior` en la
  solicitud (excluyente con `documentoAfectadoId`; esquema http `factura-anterior.esquemas-http.ts`) y `otraCausaSinCredito`
  a mano en facturas, con detalle obligatorio en `observaciones`. `ResolutorDeFactura` delega en
  `ResolutorDeFacturaAnterior`: revisa fechas (sin fecha de inicio, nota recibida antes, factura igual o posterior, más de
  10 años, aviso desde 4), que la factura no esté en el libro, busca primero por FEL y luego por proveedor + serie +
  número (familia factura) y decide crear, reutilizar o corregir (solo con notas anuladas, auditado como `corregir` en
  `libro-de-compras.facturas-anteriores`); la presenta como `FacturaParaNota` con las notas de débito anteriores
  sumadas. `RegistrarDocumento` guarda la fila antes de la nota, rechaza registrar una factura que una nota ya cita
  (`FacturaYaEsDelSistemaAnterior`) y manda `facturaAnterior` al destino. Aviso de NDEB tardía con la fecha de la factura
  anterior y texto del cambio de régimen con «el IVA va al costo». Nuevo puerto `RepositorioDeFacturasAnteriores`;
  `DocumentoDeCompra`/`DocumentoDto` ganan `facturaAnterior` (también al leer para las bajas). La carrera de dos notas que
  crean la misma factura se resuelve con `insert … on conflict do nothing` y un error propio (sin tocar el mapa de
  mensajes del core). El IVA de la nota sale de `ivaDeLaFel` como hasta hoy. Sin migración. Siguen U8l-5 (bajas, ficha,
  sugerencias, Excel y fecha de inicio), U8l-6 y U8l-7.
- **2026-11-14 — U8l-5 (servidor, Libro de compras: bajas, ficha, sugerencias, Excel y fecha de inicio).** El tope de la baja de una
  nota de débito (`tope-de-la-baja.ts`) también cubre la factura anterior (bloqueada `for update`, con sus notas de débito
  anteriores sumadas); eliminar una nota borra la fila de su factura anterior si ya nadie la cita
  (`borrarSiNoTieneNotas`; anular la deja) y la auditoría lleva `facturaAnterior` en el DTO. La ficha de toda nota trae
  `documentoQueModifica` (`libro` con id, o `sistema_anterior`) y su `motivoDeLaFactura` sale también de la factura anterior. El
  Excel del libro suma al final «Documento que modifica» (`SERIE-NÚMERO del dd/mm/aaaa`; el libro impreso y el SAT-2237 no
  cambian). Ruta nueva `GET /libro-de-compras/proveedores/:id/facturas-anteriores` (`documentos.crear`) con `usadas` y
  `deLaBandeja` (DTE de factura pendientes o descartados, vigentes en la SAT, anteriores a la fecha de inicio, sin repetir
  las ya usadas). Libro escucha `empresas.fecha_de_inicio_por_cambiar` y revisa los dos sentidos
  (`facturas_anteriores_posteriores_a_la_fecha` y `notas_recibidas_antes_de_la_fecha`, con hasta cinco notas en `detalles`).
  `MENSAJES_POR_RESTRICCION` ganó las dos únicas de `facturas_anteriores` (único cambio en el core). Sin migración; `corregidaEn` de
  `FacturaAnteriorDto` queda fuera (no hay columna para guardarlo). Siguen U8l-6 y U8l-7.
- **2026-11-14 — CP4-EB (servidor, Bancos: conceptos y leyenda del efectivo para pagos).** Migración de Bancos `0033_cp4_efectivo_para_pagos` (solo datos, SQL a mano como la `0032`, repetible): conceptos de sistema `efectivo_para_pagos` (débito, sin flujo), `devolucion_de_efectivo_para_pagos` (crédito, sin flujo) y `faltante_de_efectivo` (débito, Operación, grupo «Faltante de efectivo»), en `CONCEPTOS_DE_SISTEMA`, en `ClaveDeConceptoDeSistema` y, en las empresas con catálogo, por `update`/`insert`. El flujo de efectivo trae `leyenda` (nula si no aplica): sale cuando el período tiene `efectivo_para_pagos` o `faltante_de_efectivo` (en el concepto o en el desglose); va en la pantalla, la impresión (mismo bloque) y como fila «Nota» al final del Excel. Lo sin flujo cae en «Otros movimientos sin actividad», como el fondo de caja chica, y el control sigue cuadrando. Se tocó el cliente de Bancos solo para mostrar la leyenda.

- **2026-11-14 — U8l-6 (cliente, Libro de compras: notas sobre facturas anteriores).** En «Factura que corrige» del formulario de una nota
  aparece, si la empresa tiene fecha de inicio, «Una factura del sistema anterior (antes del dd/mm/aaaa)» y abre
  `CamposDeFacturaAnterior` (tipo, serie, número, fecha con tope el día anterior a la fecha de inicio, total, IVA, FEL opcional,
  «¿Dio crédito fiscal?» y «¿Por qué?» con detalle obligatorio en «otra causa», notas de débito anteriores plegadas y las dos
  ayudas). Las sugerencias (`GET …/proveedores/:id/facturas-anteriores`: `usadas` y `deLaBandeja`) son botones que llenan todo con un
  clic; sin permiso o sin fecha de inicio la opción no se ofrece. Lógica pura en `edicion-de-factura-anterior.ts`,
  `pendientes-del-registro.ts` y `documento-que-modifica.ts`. El cuerpo manda `facturaAnterior` (nunca junto a `documentoAfectadoId`) y
  no se calcula ni registra mientras esté a medias; «No dio crédito por otra causa» a mano en facturas (en «Más datos», con las
  observaciones obligatorias; no va en notas ni recibos). Errores de U8l-4 y U8l-5 en su campo; «la factura ya es del sistema
  anterior» se explica con el camino completo y un enlace a la nota que la cita. Los avisos (4 años, NDEB tardía, retención) son los del
  servidor, en la vista previa y en la ficha. La ficha de toda nota muestra «Documento que modifica» (con enlace si es del libro; si es del
  sistema anterior, sus datos, el crédito y las notas de débito anteriores). El motivo «otra causa» ya tiene texto y nombre corto. Los
  errores de fecha de inicio en Empresas ya salían en el campo «Fecha de inicio» (el mensaje no lista las notas). Fuera de alcance, sigue
  pendiente: la marca «Antes de la fecha de inicio» de la bandeja y la conciliación, y el texto de la confirmación en lote.
- **2026-11-14 (rendimiento de la lista de Cuentas por pagar, no reproducido en `main` 40e08f5).** La prueba `cuentas-por-pagar-pagos-rendimiento` (20,000 documentos, 30,000 pagos) dio, en base propia y corrida sola, lista 252 ms, saldo 89 ms, ficha 22 ms y contraseña 111 ms (tope 1,500 ms); la suite completa del servidor pasó (450 archivos, 4,249 pruebas) mientras otro agente corría la suya. U8l-4 y CP4-EB no tocan la consulta (solo agregan pruebas). La lentitud vista antes se atribuye a carga de la máquina (varias suites y PostgreSQL compartidos); no se cambió consulta, índice ni migración (la `0010` queda libre).
- **2026-11-15 (causa de la lista de rendimiento que se colgaba en la suite completa).** No era un bloqueo (sin esperas en `pg_locks`) sino un plan patológico: con `auto_explain` se vio que la lista tardaba 9 s o más porque `contrasenas` y `contrasena_documentos` (20,000 filas sembradas) no tenían estadísticas, y el plan, creyendo que tenían una fila, repetía por cada documento un recorrido de `contrasena_documentos`. La prueba solo hacía `analyze` de `documentos`, `aplicaciones_de_pagos` y `pagos`; si el autoanálisis de PostgreSQL llegaba antes, pasaba, y si no, pasaba de 30 s (por eso dependía de la base y de la carga). Arreglo: la prueba analiza también `contrasenas` y `contrasena_documentos`. No es un error de la app ni cambia consulta, índice ni migración.
- **2026-11-14 — CP4-V1 (servidor, un pago cubre varias contraseñas del proveedor, M2).** Migración
  `0009_cp4_pago_de_varias_contrasenas` (escrita a mano en el orden correcto): quita `pagos.contrasena_id`, `pagos_llave_unica`,
  `pagos_contrasena_fk` y `pagos_contrasena_idx`; agrega `pagos_id_proveedor_unico (id, empresa_id, proveedor_id)`,
  `pagos_proveedor_fk` a `terceros.proveedores` y el índice `pagos_proveedor_fecha_idx (proveedor_id, fecha)`; la llave
  `aplicaciones_de_pagos_pago_fk` pasa a `(pago_id, empresa_id, proveedor_id)`. La contraseña de cada línea sigue garantizada por
  `aplicaciones_de_pagos_en_la_contrasena_fk`. CP4-2 ya buscaba por la contraseña de la línea: sin cambios de código fuera de las
  tablas. Pruebas de tablas: líneas de dos contraseñas del mismo proveedor en un pago (pasa), de otro proveedor (falla), cargo
  fuera de su contraseña (falla), proveedor inexistente (falla).
- **2026-11-14 — CP4-E1 (servidor, datos de los pagos en efectivo).** Migración `0010_cp4_pagos_en_efectivo` de Cuentas por
  pagar: tabla `retiros_de_efectivo` (checks, únicos, llaves a `bancos.movimientos` y, con `set null`, a `core.usuarios`,
  RLS por empresa) y, en `pagos`, la forma `efectivo` con `retiro_id` (llave compuesta al retiro), `recibido_por`,
  `motivo_sin_bancarizar` y los checks de §3.2; `FormaDePago` suma `efectivo`. Desviación: `retiros_anulacion_completa` y
  `retiros_liquidacion_completa` exigen los tres campos todos nulos o todos llenos (la fórmula del diseño dejaba pasar un
  campo suelto en un retiro abierto). Pruebas de tablas para cada check, único, llave y RLS. Sin casos de uso.
- **2026-11-14 — U8l-7 (cliente, Cuentas por pagar: notas sobre facturas anteriores).** La ficha de una nota del libro con
  `facturaDelSistemaAnterior` muestra «Factura del sistema anterior» (`FacturaDelSistemaAnterior`): con enlace «Ver el saldo
  inicial» si corrige uno, o la serie, número y fecha citados y la ayuda («cárguela en Saldos iniciales y aplique la nota en Notas
  de crédito» / «cargo sin factura») si no lo tiene. Las notas del saldo inicial ya salen en «Notas que lo corrigen». En Saldos
  iniciales, `notasPosteriores` marca la tarjeta con el aviso («Hay N notas de crédito posteriores… con Q… de saldo a favor:
  aplíquelas en Notas de crédito», y las de débito como cargo sin factura), el guardado lo repite como aviso emergente y el cuadre
  muestra `saldosConNotasPosteriores`. El texto de la ventana cambió al acordado. Lógica pura en
  `notas-del-sistema-anterior.ts` con pruebas. Desviaciones: la ficha de la nota enlazada no nombra el número del saldo inicial
  (el servidor solo manda el id); los avisos de retención del saldo libre y de retenciones por practicar vienen en los avisos del
  servidor al recibir la nota y los muestra Libro de compras (U8l-6), sin pantalla propia aquí. Lo pendiente de U8l-6 en Libro (marca
  de la bandeja, filtro, conciliación y texto de la confirmación en lote) ya estaba en `main`.
- **2026-11-15 — CP5 (reportes) aprobado por el usuario** (diseño `docs/modulos/diseno-cp5-reportes.md`, dictamen
  `docs/modulos/dictamen-cp5-2026-11-15.md`, «correcto con ajustes»). Acepta CP5-a a CP5-i como se recomiendan
  (anulaciones con **fecha contable**, B) con todas las correcciones del contador. Además: (1) cuando exista
  Contabilidad, la factura se contabiliza **al registrarla**, no al autorizarla (corrige «autorizar = provisionar» de
  `cuentas-por-pagar.md`; autorizar queda como control de pago); (2) el reporte de saldos **agrupa por NIT**, con las
  fichas como subrenglones y aviso de NIT repetido; (3) el estado de cuenta para el proveedor muestra la retención como
  **abono** con su número de constancia.
- **2026-11-15 — CP4-3 (servidor, pagar con cheque y con nota de débito).** `RegistrarPago` (`POST /cuentas-por-pagar/pagos`,
  `pagos.emitir`; con `diferencias` pide además `ajustes.crear`): un pago es del proveedor y cubre hasta 100 cargos
  autorizados de una o varias contraseñas vigentes suyas (la contraseña de cada línea la pone el servidor). Orden: carga
  inicial, revisión sin bloquear (fecha, beneficiario, saldos), orden a Bancos por el mediador (`emitir_cheque_de_origen` o
  `registrar_nota_de_origen`, con el pago como origen y el reparto Operación/Inversión por activo fijo), bloqueo de
  contraseñas y cargos en orden de id con nueva revisión, retención en el primer pago vigente (nunca en un saldo inicial),
  correlativo `cuentas-por-pagar.pagos`, líneas y diferencias de centavos (ajuste del cargo con `pago_id`, auditoría
  `ajustar`, evento `ajuste_registrado` con efecto `ingreso`). Fecha mínima = emisión del DTE (y fecha de inicio con un saldo
  inicial); aviso, sin bloquear, si es anterior a la recepción o a la contraseña. Beneficiario = razón social del NIT (o
  nombres y apellidos; sin ella, el `nombre_emisor` del DTE más reciente; sin nada, `proveedor_sin_nombre_del_nit`). Cheque
  no negociable por omisión; posfechado = comprometido con el aviso de fondos de Bancos. Bancarización: la suma del mes
  cuenta cheques, notas de débito, notas ligadas y efectivo vigentes; el aviso solo sale si algún cargo tiene efecto fiscal
  (IVA: régimen general con IVA acreditable; ISR: régimen de utilidades en el período del documento o, en un saldo inicial,
  en la fecha de inicio), sin datos fiscales solo pide completarlos, y el cheque que hace llegar el mes al umbral avisa que
  el efectivo del mes deja de respaldar el costo o el crédito fiscal. Consultas: `GET /proveedores/:proveedorId/para-pagar`,
  `GET /pagos/proveedores-por-pagar`, `GET /pagos/medios`. Permisos nuevos `pagos.ver` y `pagos.emitir`; variable
  `cuentas-por-pagar.pagos.tope_diferencia` (Q1.00); evento `pago_registrado`. Sin migración. Desviaciones: Libro de compras
  no se puede importar (solo sus tablas), así que `daCreditoFiscal()` y `tieneIsrSobreUtilidades()` se replican en
  `DatosFiscalesDeLaEmpresaDrizzle` leyendo `datos_fiscales_de_empresa` y la copia del régimen del documento; el `PagoDto`
  de la respuesta es el mínimo (sin `puedeAnular`, conciliado ni `tieneMovimientos`: llegan en CP4-4, CP4-6 y CP4-8); la
  prueba del aviso del efectivo siembra el pago en efectivo en la base (el caso de uso llega en CP4-E3).
- **2026-11-15 — U8l-8 (QA de punta a punta de las notas sobre facturas anteriores y los DTE anteriores a la fecha de inicio).** Informe en `docs/modulos/informe-qa-u8l-2026-11-15.md`: todos los flujos del diseño (bandeja, conciliación, notas de crédito y de débito, avisos, rechazos, «otra causa», sugerencias, «Documento que modifica», eliminar, cambio de la fecha de inicio, roles) funcionan y el libro y el SAT-2237 cuadran a mano. Corregido: aviso de neto negativo en las casillas con crédito del SAT-2237 (adenda del dictamen) y concordancia de los mensajes al cambiar la fecha de inicio. Pendientes menores en el informe (vista previa de la confirmación en lote, textos de montos negativos, claves de motivo en el Excel y el PDF del libro).
- **2026-11-15 — CP5 (reportes) listo para programar.** `docs/modulos/diseno-cp5-reportes.md` pasa a «aprobado, listo
  para programar» con todos los cambios del dictamen aplicados: fecha de efecto = emisión (la fecha de inicio para los
  documentos del libro emitidos antes) y aviso de registros tardíos; posfechado cobrado antes de su fecha cuenta desde el
  fin del mes de su conciliación autorizada; R1 por NIT con % sobre cargos y conciliación con R11; R3 interno y para el
  proveedor (retención como abono con su constancia); R4 «Posible prescripción desde» (último movimiento + 5 años); R6
  «Registró el documento»; R8 sección 5 (anulados y desautorizados del mes); R9 por mes y por cargo, IVA completo, costo
  no deducible y 48 meses; R12 en Libro de compras con plazo de la constancia y enlace a las retenciones por practicar.
  Migraciones verificadas en `main`: Cuentas por pagar **`0011_cp5_fecha_de_anulacion`** (paso **CP5-1**, columna
  `fecha_de_anulacion` en `pagos`, `reintegros` y `retiros_de_efectivo`, **antes de CP4-4**), `0012_cp5_indices_de_corte`
  (CP5-2) y Libro de compras `0036_cp5_constancias_pendientes` (CP5-6). La llenan CP4-4, CP4-5, CP4-7, CP4-E2 y CP4-E3
  (escrito en `diseno-cp4-pagos.md` §5.9 y la adenda de efectivo §4.4 y §4.6). Orden: CP4-3 → CP5-1 → CP4-4 → … Anotado
  en `cuentas-por-pagar.md`, `diseno-datos-cuentas-por-pagar.md`, `libro-de-compras.md` y `HOJA-DE-RUTA.md`: con
  Contabilidad la factura se provisiona **al registrarla** (autorizar = «aprobado para pago»). Quedan para el contador,
  sin frenar CP5-1 a CP5-4: días hábiles o calendario en el plazo de la constancia de ISR y el monto del costo no
  deducible de R9 (§14 del diseño).
- **2026-11-15 — Aclaraciones de CP5.** Usuario: «contabilizar al registrar» = **al entrar al Libro de compras** (como
  U12), aunque en Cuentas por pagar siga en la bandeja. Contador (§14 del diseño de CP5): el plazo de la constancia de
  ISR son **5 días hábiles** (Código Tributario **art. 8 num. 4**, no art. 6; se corre al siguiente hábil y cuenta los
  días que la SAT declare inhábiles); en R9 el costo no deducible es **`total − (iva − iva_no_acreditable)`** con la
  marca solo en cargos con parte pagada en efectivo, más una columna informativa «pagado en efectivo»; el criterio por
  cargo usa el total con IVA antes de retenciones.
- **2026-11-15 — U8l-9 (observaciones menores de la QA de U8l-8).** Corregidos los puntos 3 a 7 del informe: la vista previa de la bandeja anticipa «la factura ya es del sistema anterior» (mismo chequeo que registrar), el mensaje de montos negativos dice «negativo», el Excel y el PDF del libro usan los nombres legibles de los motivos, el selector «Factura que corrige» pide primero el proveedor, eliminar una nota se titula «Eliminar nota», la vista previa del formulario avisa cuando el cálculo fue rechazado, la ficha no pide conceptos sin permiso y la tabla de rubros del SAT-2237 cabe en escritorio. Sin cambio: la regla de fechas futuras del libro (es general del libro, no de este paso).
- **2026-11-15 — CP5-1 (servidor, fecha contable de las anulaciones).** Migración `0011_cp5_fecha_de_anulacion` de Cuentas
  por pagar (generada con `bd:generar`; el relleno se agregó a mano antes de los checks): columna `fecha_de_anulacion` en
  `pagos`, `reintegros` y `retiros_de_efectivo`, los checks `<tabla>_fecha_de_anulacion_de_su_estado` (anulado si y solo si
  hay fecha) y `<tabla>_fecha_de_anulacion_valida` (no anterior a la fecha del registro) e índice `pagos_anulados_corte_idx`.
  El relleno de lo ya anulado: sin inverso en Bancos, la fecha del registro; con inverso, la fecha del inverso; sin
  movimiento (nota ligada, apertura, efectivo), el día de la anulación en Guatemala, nunca antes de la fecha del registro.
  Los checks comunes de `pagos` y `reintegros` viven en `anulacion.restricciones.ts` (`restriccionesDeFechaDeAnulacion`,
  que también usa el retiro). Sin casos de uso ni entidades nuevas (no existe aún el repositorio de anulación): los llenan
  CP4-4, CP4-5, CP4-7, CP4-E2 y CP4-E3. Pruebas: checks de las tres tablas y relleno con las sentencias reales del SQL
  (`fecha-de-anulacion-migracion.prueba.ts`, repetible).
- **2026-11-15 — CP5-2 (servidor, saldos al corte: R1 y R2).** `ConsultaDeSaldosAlCorte` (una sola consulta en SQL con
  expresiones de tabla, no la de la lista de documentos) y las reglas del dominio (`saldo-al-corte.ts`, `fechas-de-corte.ts`,
  `saldos-por-nit.ts`, `prescripcion-de-saldos.ts`): fecha de efecto = emisión (la fecha de inicio para los del libro emitidos
  antes), anulaciones por `fecha_de_anulacion` (pagos y reintegros) o por el día de `anulado_en` en Guatemala (documentos y
  ajustes), posfechado como comprometido y cheque cobrado antes de su fecha por la conciliación **autorizada** (rebaja desde el
  fin de ese mes; con la conciliación elaborada o en proceso, desde su fecha). R1 `GET /cuentas-por-pagar/reportes/saldos-por-proveedor`
  (por NIT, acreedores y deudores, tramos, porcentajes sobre cargos, avisos y leyendas) y R2 `…/documentos` (cargos al corte con
  los filtros de las vistas, totales de todo lo filtrado), cada uno con su Excel; permisos `reportes-de-saldos.ver/.exportar`;
  errores `corte_anterior_al_inicio` y `proveedor_del_reporte_no_existe`. Migración **`0012_cp5_indices_de_corte`** con solo
  los índices que el `EXPLAIN` confirmó (con dos empresas de 20,000 documentos cada una): `aplicaciones_de_notas_corte_idx` y
  `ajustes_corte_idx`; los de `aplicaciones_de_pagos` y `aplicaciones_de_reintegros` no se crean (el plan prefiere recorrer
  esas tablas enteras, que son el 50 % de cada empresa). Rendimiento medido: R1 ~150 ms, R2 página de 100 ~150 ms, Excel de
  20,000 filas ~2 s (tope 1.5 s y 8 s). Desviaciones: R2 lista solo cargos (las notas son de R4), sin vencimiento no existe en
  un cargo (la base exige vencimiento a todo cargo; la columna queda en cero); un saldo inicial no se puede anular (la base
  lo exige registrado o autorizado), así que la prueba de documento anulado usa uno del libro.
- **2026-11-15 — CP4-4 (servidor, anular un pago, reaplicarlo y saldar su diferencia).** `AnularPago`
  (`POST /cuentas-por-pagar/pagos/:id/anular`, `pagos.anular`, motivo y `fecha` opcional del inverso): bloquea el pago, corre
  `REGLAS_PARA_ANULAR_PAGO` (`noEstarCobrado`: el movimiento conciliado, leído de Bancos, se rechaza con `pago_cobrado`),
  ordena `bancos.anular_movimiento_de_origen` (cheque o nota; Bancos decide `sin_inverso` o `con_inverso`), deja el pago
  `anulado` con `fecha_de_anulacion` (sin inverso, la del pago; con inverso, la fecha del inverso **leída** de
  `bancos.movimientos` por `inversoId`; sin movimiento, `greatest(hoy, fecha del pago)`), pone sus líneas sin vigencia
  (la retención queda libre para el siguiente pago), anula sus ajustes de diferencia (auditoría `anular` de cada uno),
  audita `anular` con el `PagoDto` como estaba y publica `pago_anulado` (`anulacionEnBancos`, `fechaOriginal`, `efecto`).
  `AtenderMovimientoPorCambiar` escucha `bancos.movimiento_por_cambiar`: `anular` (también el lote de cheques caducos)
  anula el pago con la forma y la fecha del aviso sin volver a ordenar a Bancos; eliminar, blanquear, corregir y
  reclasificar lo que emitió un pago vigente se rechazan (`movimiento_de_cuentas_por_pagar`), todo cambio de una nota
  ligada también (`movimiento_ligado_a_pagos`) y eliminar lo que solo tiene pagos anulados
  (`movimiento_con_pagos_anulados`); es idempotente. `ReaplicarPago` (`POST …/:id/reaplicar`, `pagos.reaplicar`, motivo y
  cargos nuevos): bloquea pago, contraseñas y cargos de antes y de después en orden de id, revisa los cargos con el saldo
  sin contar este pago (cualquier contraseña vigente del proveedor), exige la misma suma, anula las diferencias, recalcula
  la retención sin contar la del propio pago, vuelve a fijar el desglose en Bancos si cambió lo de activo fijo, audita
  `corregir` y publica `pago_reaplicado`. `SaldarDiferenciaDelPago` (`POST …/:id/diferencias`, `ajustes.crear`): el
  residuo de un pago vigente, hasta el tope y el saldo, con fecha del pago a hoy. Los tres devuelven el `PagoDto`, que ahora
  admite `estado` anulado, `anulacion` y `movimiento` nulo; se arma con `LectorDelPago` desde el pago guardado. El
  registrar pago comparte `RegistradorDeDiferencias`. Sin migración. Desviaciones: la respuesta de reaplicar lleva `avisos`
  vacíos; la forma `efectivo` y el desglose de la nota ligada llegan con CP4-E3 y CP4-5 (el código ya trata a esas formas
  sin orden a Bancos); el motivo que Bancos recibe lleva el prefijo «Anulado desde Cuentas por pagar: ».
- **2026-11-15 — CP5-3 (servidor, estado de cuenta, saldos a favor y contraseñas: R3, R4 y R5).** Mismo `ConsultaDeSaldosAlCorte`
  (R4 y R5 reutilizan su CTE `saldosAlCorte`; el saldo anterior y el final de R3 salen de `saldosPorProveedor` del mismo corte, así
  que la invariante 2 se cumple por la misma fórmula). R3 `GET /cuentas-por-pagar/reportes/estado-de-cuenta`: los hechos del rango
  salen de una consulta propia (`movimientos-del-proveedor.sql.ts`, un `union all` por hecho con las mismas fechas de efecto y de
  anulación que R1): documentos y notas, pagos (con el cheque cobrado antes de su fecha), reintegros, bajas y diferencias menores,
  y la reversa en su fecha de un pago, reintegro, ajuste o documento anulado dentro del rango cuyo hecho original quedó antes; lo
  nacido y anulado dentro del rango no suma y solo sale con `mostrarAnulados`. Presentación interna (neto, con total, retenciones y
  «anteriores a la fecha de inicio») y `para_el_proveedor` (cargo por el total y cada retención de Libro de compras como abono con
  su constancia o «constancia pendiente»; lo que Libro no detalla va en un abono sin impuesto; sin comprometido, avisos ni
  leyendas internas). Sin rango: del primer día del mes de `hasta` a hoy; errores `rango_de_reporte_invalido`,
  `rango_de_reporte_muy_largo` (24 meses) y `estado_de_cuenta_con_demasiadas_lineas` (pantalla 2,000; Excel sin tope). R4
  `…/saldos-a-favor` (último movimiento = emisión, aplicaciones, ajustes y reintegros vigentes al corte; años cumplidos, tramo,
  «Posible prescripción desde» a 5 años, aparte lo posiblemente prescrito y las leyendas del dictamen 7). R5
  `…/contrasenas-por-pagar` (de hoy, por omisión pago prometido hasta ayer; saldo, autorizado, sin autorizar, comprometido, días
  de atraso). Los tres con Excel y los permisos `reportes-de-saldos.ver/.exportar` (sin permisos nuevos ni migración). Rendimiento
  medido con dos empresas de 20,000 documentos y un proveedor de 1,850 documentos: R3 ~90 ms, R3 para el proveedor ~40 ms, Excel
  ~240 ms, R4 ~150 ms, R5 ~120 ms. Desviaciones: el estado de cuenta rechaza un `desde` cuyo día anterior sea anterior al día
  antes de la fecha de inicio (`corte_anterior_al_inicio`, el saldo anterior no existe antes); la línea del pago lleva forma y
  referencia (cheque o recibo) pero no la cuenta bancaria; los saldos iniciales nunca aparecen como línea en un rango posterior a
  su emisión (entran en el saldo anterior). `nombres-de-tipos.ts` pasó de `http/` a `dominio/` porque el concepto de las líneas lo
  usa.
- **2026-11-15 — CP4-5 (servidor, pagar con una nota de débito ya registrada).** `LigarNotaDeDebito`
  (`POST /cuentas-por-pagar/pagos/ligar`, permiso nuevo `pagos.ligar-notas-de-debito`, y `ajustes.crear` si trae diferencias):
  paga cargos de una o varias contraseñas del proveedor con una nota de Bancos marcada, sin crear nada allá. Bloquea la nota
  primero (`NotasParaLigar`, lectura de `bancos.movimientos` con `for update`: de débito, suelta, vigente y marcada; si no,
  `movimiento_no_ligable`), revisa los cargos como cualquier pago, exige que el monto quepa en lo que le queda a la nota
  (`pago_mayor_que_la_nota`; disponible = monto menos los pagos vigentes que la ligan) y que la fecha no sea futura ni
  anterior a la nota ni a las mínimas del pago, guarda el pago con la nota como su movimiento y la referencia como recibo del
  proveedor, y con la nota bloqueada manda `bancos.fijar_desglose_de_conceptos` (sin origen) con el reparto absoluto: lo ligado a
  cargos de activo fijo en todos sus pagos vigentes a Inversión y el resto a Operación; la nota sigue marcada aunque toda quede
  en Inversión. El mismo reparto se vuelve a fijar al reaplicar (si cambió lo de activo fijo) y al anular un pago ligado
  (`DesgloseDelPago`); anular no toca el movimiento en Bancos y deja `fecha_de_anulacion` = hoy (no antes del pago). Orden de
  bloqueo: la nota, antes de las contraseñas y los cargos, también al anular y reaplicar. Avisos: retención no descontada («el
  banco debitó la nota sin descontar la retención…», con lo que le queda a la nota) y nota de un año anterior al de la
  aplicación; el evento `pago_registrado` lleva el efecto `transitoria_por_aplicar`. `GET /pagos/notas-para-ligar` (`pagos.ver`;
  `cuentaBancariaId`, `desde`, `hasta`, `soloConDisponible`, `limite`) lista las notas marcadas con `monto`, `aplicado` y
  `disponible`. Cambios compartidos: `RegistrarPago` usa `comunes-del-registro.ts`; `fijarDesglose` admite origen nulo. Sin
  migración (`pagos.referencia` y las formas ya existían). Desviaciones: el `PagoDto` no trae `referencia` (como en CP4-3, solo el
  mínimo); la lista de notas no pagina (hasta 200, las más nuevas); la nota ligada usa como beneficiario el de la nota y, si no
  tiene, el proveedor, sin exigir la razón social del NIT.
- **2026-11-15 — CP5-6 (servidor, Libro de compras: constancias de retención pendientes, R12).** Migración
  `0036_cp5_constancias_pendientes` (índice parcial `retenciones_sin_constancia_idx (empresa_id, fecha) where constancia_numero is
null and monto > 0`, generada con `bd:generar`). `ConsultarConstanciasPendientes` (filtros `hasta` = último mes, por omisión el
  en curso, `grupo?` y `proveedorId?`) junta las retenciones practicadas sin constancia de todos los meses: por fila, mes, grupo,
  `plazoDelGrupo` (entero, con el calendario de feriados), días para el plazo y si está vencido, si el mes y grupo está enterado,
  y `plazoDeLaConstancia` (ISR: 5.º día hábil del mes siguiente, Código Tributario art. 8 num. 4, con el mismo calendario; IVA:
  `null` con la nota «Sin plazo propio confirmado»), más totales por mes y grupo y total. Las de documentos anulados con
  resolución pendiente van en `anuladas`, sin sumar. Rutas `GET /libro-de-compras/retenciones/constancias-pendientes` y
  `…/exportar` (`retenciones.ver` y `.exportar`; sin permisos nuevos). Dominio nuevo: `plazo-de-la-constancia.ts`. Desviación:
  los días para el plazo son de calendario (negativos si ya pasó), no hábiles.
- **2026-11-15 — CP5-7 (cliente, reportes de saldos: R1 y R2).** Páginas `SaldosPorProveedor` y `DocumentosAUnaFecha`
  (`/cuentas-por-pagar/reportes/saldos-por-proveedor` y `…/documentos`, sección **Reportes** del menú, permiso
  `cuentas-por-pagar.reportes-de-saldos.ver`; Excel solo con `.exportar`, mediante `AccionesDeIntercambio`). Componentes comunes en
  `componentes/reportes/` (`EncabezadoDeImpresion`, `FiltroDeCorte`, `TotalesDelReporte`, `LeyendasDelReporte`,
  `AccionesDelReporte`). R1: acreedores y deudores en tarjetas (celular) o tabla (desde `lg` y en papel), NIT con fichas como
  subrenglones (cada ficha lleva a R2), porcentajes por tramo sobre cargos y avisos del servidor. R2: seis vistas que preajustan
  filtros editables (`aplicarVista`), «Más filtros», paginación de 50 e impresión que pide hasta 2,000 filas (con más avisa «Son N
  filas: acote el filtro o use Excel»). El corte se valida en el cliente contra la fecha de inicio que devuelve el servidor
  (solo para avisar antes; la regla sigue siendo del servidor). Lógica pura con pruebas en `composables/reportes/`.
- **2026-11-15 — CP4-6 (servidor, aplicar a la cuenta de apertura).** `AplicarACuentaDeApertura`
  (`POST /cuentas-por-pagar/pagos/apertura`, permiso nuevo `pagos.aplicar-a-apertura`): da por pagados saldos iniciales sin
  dinero, forma `cuenta_de_apertura`, con motivo obligatorio (1 a 300), referencia opcional y sin movimiento en Bancos. Todos los
  cargos deben ser saldos iniciales (`solo_saldos_iniciales`), autorizados y en una contraseña vigente. Con la carga abierta la
  fecha es siempre la de inicio (aunque se mande otra) y el saldo debe tener movimientos (notas aplicadas o que lo corrigen,
  ajustes o pagos vigentes); uno sin ellos, aunque esté autorizado, se rechaza con `corrija_el_saldo_inicial` (se quita de la
  contraseña, se desautoriza y se corrige en Saldos iniciales). Con la carga cerrada es una corrección de error: fecha hoy por
  omisión, ni futura ni anterior a la fecha de inicio (`fecha_de_pago_invalida`). Audita `ajustar` (recurso
  `cuentas-por-pagar.pagos`, las fichas de los cargos antes del pago y el motivo), publica `pago_registrado` con efecto
  `apertura` o `correccion_de_error`, no descuenta retenciones ni cuenta para la bancarización, y trae como primeros avisos los
  textos fijos del contador. El `PagoDto` gana `motivo` y `conCargaCerrada`. Anularlo ya dejaba `fecha_de_anulacion` =
  `greatest(hoy, fecha)` (CP4-4/CP5-1): queda probado. Sin migración. Desviaciones: la solicitud no admite `diferencias`
  (§5.3 no las menciona); en esta forma no se avisa la fecha anterior a la contraseña (la fecha de inicio siempre lo sería).
- **2026-11-15 — CP4-E2 (servidor, retiros de efectivo para pagos).** Sin migración (las tablas son de CP4-E1 y los conceptos
  de CP4-EB). `RegistrarRetiroDeEfectivo` (`POST /cuentas-por-pagar/retiros`, `retiros.crear`) ordena a Bancos el cheque (a
  nombre del custodio o de quien se escriba, nunca vacío ni «al portador» comparado sin mayúsculas, tildes ni signos; «no
  negociable» por omisión) o la nota de débito (boleta como referencia) con el retiro como origen y el concepto `efectivo_para_pagos`;
  fecha no futura, custodio texto o usuario activo de la empresa (`custodio_invalido` si no), número del correlativo
  `cuentas-por-pagar.retiros`, evento `retiro_registrado`. `AnularRetiro` (`retiros.anular`): bloquea los movimientos de Bancos
  y el retiro (en ese orden, también al llegar el aviso), rechaza con pagos vigentes, liquidado, ya anulado o cheque conciliado,
  ordena anular en Bancos y guarda `fecha_de_anulacion` (sin inverso la del retiro; con inverso la del inverso leída de Bancos),
  audita `anular` y publica `retiro_anulado`. `LiquidarRetiro` y `ReabrirRetiro` (`retiros.liquidar`, adelantados de CP4-E4 por
  pedido): el sobrante se devuelve en una nota de crédito (concepto `devolucion_de_efectivo_para_pagos`) o se declara faltante
  con motivo (auditoría `ajustar`); el cheque se redistribuye en Bancos (`DesgloseDelRetiro`: pagos a Operación o Inversión,
  `faltante_de_efectivo`, resto `efectivo_para_pagos`); aviso si el custodio liquida su retiro; reabrir anula el depósito y audita
  `reabrir`. `ListarRetiros` (estado, `corte`, `desde`, `hasta`, `soloConDisponible`, página; con corte, los retiros por
  liquidar a esa fecha con su disponible al corte y el total) y `ObtenerRetiro`; aviso de fin de mes en la ficha, la lista y al
  registrar otro. `AtenderMovimientoDeRetiroPorCambiar` (segundo escucha de `bancos.movimiento_por_cambiar`): anular el cheque o
  la nota anula el retiro (o se rechaza con pagos o liquidado), anular el depósito reabre el retiro, todo otro cambio se rechaza;
  idempotente. Permisos `retiros.ver/crear/liquidar/anular`. Desviaciones: el aviso de bancarización al registrar el retiro
  (§4.1 punto 4) queda para CP4-E3, que trae la lectura del régimen fiscal; sin pagos en efectivo todavía, las pruebas siembran
  los pagos con SQL; `fecha` del evento `retiro_reabierto` = fecha del inverso del depósito, la de la liquidación si «nunca
  existió», o la de hoy sin depósito.
- **2026-11-16 — CP4-B2b (servidor, Bancos: aviso desde la conciliación).** Sin migración. Nuevo
  `POST /bancos/conciliaciones/:conciliacionId/notas/:movimientoId/desmarcar` (`conciliar` y `bancos.notas.editar`): el caso de
  uso `DesmarcarNotaEnConciliacion` bloquea primero la conciliación (en proceso), comprueba que la nota sea candidata del mes y
  delega en `DesmarcarNota` (aviso `bancos.movimiento_por_cambiar` con `desmarcar`, concepto elegido, auditoría `corregir`
  con motivo), todo en la misma transacción: nota ligada, rechazo; sin ligar, pasa. Lo demás de la conciliación (marcar,
  terminar, subir, quitar, eliminar, autorizar, devolver) solo toca marcas de conciliado y no cambia movimientos, así que no
  avisa (P-CP4-5). Los manejadores de Cuentas por pagar (CP4-4, CP4-E2) ya cubren `desmarcar` y no se tocaron. Desviación:
  `candidatos` de la conciliación no trae `marcadaParaCuentasPorPagar`; el cliente (CP4-B3) puede cruzarla con la lista de notas.
- **2026-11-16 — Siguiente módulo: Bancos, segunda parte** (usuario). Se diseña en paralelo mientras se termina Cuentas
  por pagar (`docs/modulos/diseno-bancos-segunda-parte.md`, arquitecto; luego contador): saldos iniciales con cheques en
  circulación y depósitos en tránsito, cuadre con la primera conciliación, cheque de apertura que se anula (revive el
  pasivo), y los pasos de pagos en Bancos (CP4-B2b, CP4-B3). Coordinado con la otra sesión, que lleva Bancos H2.
- **2026-11-15 — CP5-10 (cliente, Libro de compras: R12, constancias pendientes).** Página `ConstanciasPendientes`
  (`/libro-de-compras/retenciones/constancias-pendientes`, cuarta pestaña de Retenciones y opción de **Reportes** del menú;
  `retenciones.ver`, Excel con `retenciones.exportar` y papel con `.ver`). Filtros: hasta el mes (por omisión el en curso),
  grupo y proveedor. Resumen (retenido sin constancia, cantidad, constancias vencidas, enteros vencidos sin pagar, anuladas),
  bloques por mes y grupo con su plazo de entero («Vencido hace N días»), si está enterado y el total del servidor, y por fila el
  «Plazo de la constancia» (ISR con fecha y estado; IVA «Sin plazo propio confirmado»). Las anuladas van en sección aparte que no
  suma. Enlace a la vista «Retenciones por practicar» de R2 (`?vista=retenciones_por_practicar`) solo con Cuentas por pagar activo
  y `reportes-de-saldos.ver`; Cuentas por pagar enlaza a R12 en su menú de Reportes. Se copiaron a `core/componentes/reportes/`
  `EncabezadoDeImpresion` y `TotalesDelReporte` (genérico); las de `cuentas-por-pagar/componentes/reportes/` quedan
  iguales y pueden migrarse a las de core después. Lógica pura con pruebas en `datos-de-constancias-pendientes.ts`.
- **2026-11-16 — Bancos, segunda parte aprobado por el usuario** (diseño `docs/modulos/diseno-bancos-segunda-parte.md`,
  dictamen `docs/modulos/dictamen-bancos-segunda-parte-2026-11-16.md`, «correcto con ajustes»). Acepta P-1 a P-15 como
  se recomiendan y todos los cambios del contador (partida `error_del_banco`, solo cheques entregados, aviso por
  antigüedad con la variable y el art. 508, aviso de depósito en tránsito de más de 30 días, Bancos y Sobregiros
  separados, cierre de la carga con diferencias = confirmación con motivo, aviso si la fecha de inicio no es día 1,
  opción C para el cheque de apertura anulado con beneficiarios no proveedores, sin aprobación para notas de cargos del
  banco). El **posfechado de una chequera no registrada** se carga desde Saldos iniciales en la chequera de apertura con
  su fecha real, solo con la carga abierta. La **evidencia de la apertura** (último estado de cuenta y conciliación del
  sistema anterior) es **opcional, con aviso** al cerrar la carga si falta.
- **2026-11-16 — Detalles de Bancos, segunda parte (§17 del diseño).** N-1: por ahora **no** se guarda ni muestra el
  sobregiro autorizado; el reporte aclara que el disponible no lo incluye. N-3: los 30 días del aviso de depósito en
  tránsito viejo quedan **fijos**. N-4 se decide en el diseño corto de EM-2. **Pendiente N-2** (va al diseño corto
  CP-AP, con el contador): cómo ligar el posfechado de apertura a la factura que paga en Cuentas por pagar; mientras
  tanto, «aplicar a la cuenta de apertura» con advertencia.
- **2026-11-16 — CP5-4 (servidor, reportes de pagos y control: R6, R7 y R8).** Rutas `GET /cuentas-por-pagar/reportes/pagos`
  (R6), `…/cheques-posfechados` (R7) y `…/ajustes-del-mes` (R8), cada una con su `…/exportar`; permisos nuevos
  `reportes-de-pagos.ver/.exportar` (R6, R7) y `reportes-de-control.ver/.exportar` (R8), sin migración ni índices nuevos. R6: una fila
  por línea de pago (rango por omisión, el mes en curso; máximo 24 meses; filtros proveedor, forma, cuenta bancaria, estado,
  posfechados y `mismaPersona`; paginado, y Excel con todo lo filtrado) con «registró el documento» (`documentos.creado_por`),
  «completó el documento» (`registrado_por`, solo si es otro), «autorizó» y «registró el pago» (`pagos.creado_por`); la marca
  «misma persona» es que quien registró el pago también creó, completó o autorizó el documento; totales por forma y estado,
  vigentes y anulados separados. R7: pagos de cheque vigentes al corte, entregados hasta el corte y con fecha posterior, con la
  misma fecha de efecto de R1 (`least(fecha, fin del mes de la conciliación autorizada)`): el cobrado antes de su fecha por una
  conciliación autorizada que termina hasta el corte no sale; el del mes del corte sale con «cobrado en mm/aaaa»; totales por
  cuenta, por semana de vencimiento (siete días desde el día siguiente al corte) y general, que una prueba compara con el
  «Comprometido» de R1. R8: las cinco secciones (ajustes del mes con efecto y aviso de año anterior, anulaciones del mes de
  ajustes de otras fechas, aplicaciones manuales, pagos a la cuenta de apertura y documentos anulados o desautorizados en el
  mes, estos leídos de `core.auditoria` acción `devolver`) con la marca «De un mes anterior: revise la rectificación del IVA»
  cuando la emisión es anterior al mes; mes por omisión, el anterior; totales por causa y efecto, anulados aparte y por sección.
  Dominio nuevo: `meses-de-reporte.ts`. Desviaciones: «de un mes anterior» se decide por la fecha de emisión del documento (el
  periodo del libro es de otro módulo); la diferencia de centavos de un cargo sale con efecto `ingreso`; el filtro de
  `mismaPersona` usa la misma marca completa (registró, completó o autorizó); R7 solo toma pagos de forma cheque (como el diseño).
- **2026-11-18 — CP5-5 (servidor, efectivo y cuenta transitoria: R9, R10, R11 y conciliación al pie de R1).** Rutas
  `GET /cuentas-por-pagar/reportes/bancarizacion` (R9, `reportes-de-control`), `…/retiros-por-liquidar` (R10) y
  `…/notas-sin-aplicar` (R11, ambos `reportes-de-pagos`), cada una con su `…/exportar`; sin permisos nuevos, sin migración ni
  índices. R9 en vivo: por proveedor y mes (rango `AAAA-MM`, por omisión los últimos 12, máximo 48) lista los meses cuya
  suma llega al umbral con pagos en efectivo, usando **la misma consulta de CP4** (`ConsultasDePagos.pagosDelMes`), y aparte
  los cargos de Q30,000 o más (`coalesce(saldo_al_inicio, total)`) con alguna línea de efectivo vigente en el rango, con todos
  sus pagos; cada cargo con el efecto de CP4-E3 (`DatosFiscalesDeLaEmpresa.efectoDe`): «Crédito fiscal en riesgo por
  bancarización» con el **IVA completo** (`iva − iva_no_acreditable`), «Costo no deducible» con el cargo **sin IVA** (en un
  saldo inicial, su neto y «IVA no conocido»); la excepción con permiso sale con su motivo; `soloConEfecto` (sí por omisión);
  totales por sección y total sin repetir cargos; leyendas E-6, art. 106 y «verifique el umbral vigente». R10 reutiliza
  `ConsultasDeRetiros.listar` con corte (le agrega el filtro `custodio`) y suma días abierto y «de un mes anterior» (respecto al
  corte). R11: notas de débito de Bancos marcadas (`pago_a_proveedor`), con fecha hasta el corte, no anuladas al corte (sin
  inverso con fecha hasta el corte y sin `anulado_en`), menos pagos `nota_ligada` vigentes al corte; solo las que tienen
  disponible; corte por omisión, fin del mes anterior. R1 trae `conciliacion` (saldo neto del auxiliar − R11 al mismo corte =
  Proveedores neto de pagos por aplicar) y su Excel, **solo** sin filtro de proveedor ni de autorización (la transitoria es de la
  empresa). Dominio nuevo: `rango-de-bancarizacion.ts` y `marcas-de-bancarizacion.ts`. Desviaciones: una nota de Bancos anulada
  sin inverso se trata como «nunca existió» (como los pagos); R9 hace una consulta de suma del mes por cada proveedor y mes con
  efectivo (pocos en la práctica) en vez de una agregación propia, para no tener otra fórmula; no se hizo prueba de volumen
  (el paso no la pide).
- **2026-11-15 — CP5-8 (cliente, estado de cuenta, saldos a favor y contraseñas: R3, R4 y R5).** Páginas
  `EstadoDeCuentaDelProveedor`, `SaldosAFavor` y `ContrasenasPorPagar` (`/cuentas-por-pagar/reportes/estado-de-cuenta`,
  `…/saldos-a-favor`, `…/contrasenas-por-pagar`; las cinco rutas y entradas de **Reportes** salen ahora de
  `reportes-del-modulo.ts`). R3: proveedor obligatorio (sin él, estado vacío «Elija un proveedor»), rango del mes a hoy, las dos
  presentaciones (interna con total, retenciones y neto; para el proveedor con la retención como abono y su constancia, tal
  como la devuelve el servidor), anulados en gris «(anulada)», saldo anterior y totales, comprometido y disponible solo en la
  interna; el acceso «Estado de cuenta» está en la sección de pago de la ficha del proveedor (`FichaCondicionesDePago`, con
  `v-permiso`) y abre R3 con `?proveedorId=`. R4: separa «Dentro del plazo» de «Posiblemente prescritas» (consulte a su contador),
  columnas «Último movimiento» y «Posible prescripción desde», leyendas del servidor. R5: pago prometido hasta ayer por omisión,
  días de atraso, autorizado y sin autorizar. Los tres: tarjetas en celular, tabla desde `lg` y en papel, Excel con `.exportar`.
  Desviaciones: el cliente solo valida que las fechas estén completas y `desde <= hasta`; el tope de 24 meses y de 2,000 líneas
  lo informa el servidor (su mensaje sale como aviso). R3 no enlaza todavía desde R1 y R2 (proveedor → R3).
- **2026-11-16 — CP4-8 (servidor, lista, ficha y comprobante de pagos).** Sin migración ni permisos nuevos (`pagos.ver`).
  `GET /cuentas-por-pagar/pagos` (`ListarPagos`: `proveedorId`, `contrasenaId` por las líneas, `retiroId`, `forma`, `estado`
  `vigente` por omisión, `posfechado`, `desde`, `hasta`, `cuentaBancariaId`, página; fila con proveedor, contraseñas, forma,
  cuenta y número del cheque o nota, retiro y custodio), `GET …/pagos/:id` (`ObtenerPago`: `FichaDePagoDto` = el `PagoDto` más
  el cheque o nota de Bancos con `conciliado` y `anulado`, `referencia`, `recibidoPor`, `retiro`, las líneas juntas por
  contraseña con `saldoDelDocumento`, `notasAplicadas`, `diferenciaOfrecible` y las retenciones del libro con constancia o
  `porEmitir`, `creadoPorNombre`, `creadoEn`, y `puedeAnular`, `puedeReaplicar` y `puedeSaldarDiferencia`; los dos primeros
  corren las mismas listas de reglas que anular y reaplicar, así que Contabilidad sumará la suya sin tocar la ficha) y
  `GET …/pagos/:id/comprobante` (`ObtenerComprobanteDePago`, sale de la ficha: empresa por el mediador
  `empresas.obtener_datos_de_empresa`, documentos por contraseña con su retención y sus constancias solo donde este pago la
  descuenta, total en números y en letras, leyendas «Las retenciones se documentan con su constancia.» y «Este comprobante no es un
  documento tributario.» («Este recibo…» en efectivo), `hojas` Original y Copia, firmas «Entregado por» y «Recibí conforme»; la forma
  `efectivo` es el «Recibo de pago en efectivo» con el retiro y el custodio que entrega y `recibido_por` como quien recibe). Reutiliza
  `montoEnLetras` del core (`core/compartido/dominio/monto-en-letras.ts`, de CP4-7) para el total en letras. Desviaciones: el
  comprobante de un pago anulado se puede pedir y sale marcado (`pago.estado`, `anulacion`); el saldo de cada documento es el de
  hoy, no el que quedó tras este pago; el pago en efectivo se probó con datos sembrados en la base (la lista y la ficha leen `retiro_id`, `recibido_por` y `referencia` de `pagos`); rutas, controlador y composición van en
  archivos propios (`consulta-de-pagos.*`) para no chocar con los pasos que tocan `pagos.controlador`.
- **2026-11-16 — CP4-E3 (servidor, repartir y pagar en efectivo).** Sin migración. `RegistrarPagosEnEfectivo`
  (`POST /cuentas-por-pagar/retiros/:id/pagos`, `pagos.pagar-en-efectivo`; con diferencias pide `ajustes.crear` y con
  `motivoSinBancarizar`, `pagos.efectivo-sin-bancarizar`): de 1 a 20 pagos, uno por proveedor y hasta 300 cargos, todo o nada,
  un pago y un recibo por proveedor (cada uno con varias contraseñas), retención en el primer pago, `recibido_por`. Bloquea el
  cheque o la nota del retiro, el retiro, la bancarización por proveedor (`pg_advisory_xact_lock`), las contraseñas y los
  cargos, y revisa otra vez con todo bloqueado. Fecha: hoy o pasada, sin preceder al retiro (`fecha_de_pago_invalida`).
  Bancarización por régimen y documento: si el pago llega al umbral (cargo, pago o mes con todas las formas) y la empresa
  perdería costo o crédito fiscal, rechaza con `efectivo_sobre_el_umbral` salvo permiso y motivo (`motivo_sin_bancarizar`,
  evento con `sinBancarizar`); sin datos fiscales solo avisa. Errores con `pagos.<i>.campo` y `detalles.pago`. Al final vuelve a
  fijar el desglose del retiro. Anular un pago en efectivo (regla `retiroAbierto`: con el retiro liquidado se rechaza) deja
  `fecha_de_anulacion = greatest(hoy, fecha)` y vuelve a fijar el desglose; reaplicar también. El aviso de bancarización al
  registrar el retiro (pendiente de CP4-E2) ya sale. `PagoDto` suma `retiroId`, `recibidoPor` y `motivoSinBancarizar`.
  Desviaciones: la respuesta del reparto lleva `retiro` como `RetiroDto` completo (no resumen); el efecto fiscal de un pago es
  `null` (solo aviso) si algún cargo no tiene datos fiscales, igual que el aviso de los cheques; un motivo sin el permiso
  se rechaza con 403 aunque la regla no se dispare.
- **2026-11-16 — CP4-7 (servidor, reintegros del proveedor).** Sin migración (tablas de CP4-1/CP5-1). `RegistrarReintegro`
  (`POST /cuentas-por-pagar/reintegros`, `reintegros.crear`): una o varias notas de crédito del mismo proveedor (registradas o
  autorizadas, fuera de contraseña, monto <= saldo libre, bloqueadas en orden de id), fecha no futura ni anterior a la recepción;
  depósito = orden `registrar_nota_de_origen` de crédito con `reintegro_de_proveedor` (o `..._de_activo` por lo de notas cuya
  factura es de activo fijo); efectivo = referencia obligatoria, sin movimiento, con el aviso de depositarlo. Correlativo propio
  `cuentas-por-pagar.reintegros`. `AnularReintegro` (`reintegros.anular`) y `AtenderReintegroPorCambiar` (tercer escucha de
  `bancos.movimiento_por_cambiar`): `fecha_de_anulacion` sin inverso = la del reintegro, con inverso = la leída del inverso, efectivo
  = `greatest(hoy, fecha)`; auditoría `anular`; eventos `reintegro_registrado`/`reintegro_anulado` con `efecto`. `GET /reintegros/:id`
  y `/recibo` (`documentos.ver`): «Recibo de reintegro» con total en letras (`montoEnLetras`, nuevo en `core/compartido/dominio`) y la
  leyenda de no ser documento tributario. Desviaciones: Bancos siempre anula una nota con inverso (también conciliada), así que
  «sin inverso» solo se prueba por aviso y `puedeAnular` no mira la conciliación; un movimiento con un reintegro anulado no se elimina
  en Bancos (`movimiento_con_reintegro_anulado`).
- **2026-11-16 — Bancos H2, paso 5 (cliente del estado de cuenta)**. En la conciliación: subir, reemplazar y quitar el
  PDF o foto (validado antes de subir: tipo, HEIC, tamaño), visor `iframe`/imagen con «Abrir en otra pestaña», dos
  columnas en pantallas grandes, ícono en la lista y motivo «falta el archivo» al terminar según
  `bancos.conciliaciones.exigir_estado_de_cuenta`. Si el servidor responde que ya no está en proceso, se recarga la
  conciliación.
- **2026-11-16 — CP4-B3a (cliente, Bancos: pagos fuera de la conciliación).** `Movimiento` gana `marcadaParaCuentasPorPagar`,
  `desglose`, `puedeMarcar` y `puedeDesmarcar`; `ApiNotas.marcar` y `desmarcar` (motivo y concepto). Lista de notas: casilla
  «Pago a proveedor para Cuentas por pagar» al registrar un débito (solo con el módulo activo; oculta el concepto y manda la marca),
  «Marcar» (confirmación con resumen) y «Desmarcar» (`VentanaDeDesmarcar`: concepto y motivo) según lo que dice el servidor,
  etiqueta «Para Cuentas por pagar», reparto por concepto en la tarjeta y en el reporte de movimientos, y en lo que generó otro
  módulo se oculta «Corregir» y se explica por qué. Al emitir un cheque, los avisos de la respuesta (fondos del posfechado) se
  muestran. Lógica pura en `marca-de-nota.ts` y `avisos-de-bancos.ts` con pruebas. Los rechazos `MovimientoDeOtroModulo` y
  `ModuloDeOrigenInactivo` se muestran tal como los manda el servidor. Pendiente: el enlace del origen a `/cuentas-por-pagar/pagos/:id`
  (la ruta no existe aún, CP4-10: hoy es texto) y CP4-B3b en la conciliación.
- **2026-11-16 — BS-1 (Bancos, segunda parte, datos).** Migración de Bancos `0034_saldos_iniciales_con_partidas`: tabla
  `bancos.saldos_iniciales` (cabecera por cuenta, con `evidencia_archivo_id`), `movimientos.parte_de_apertura` (siete
  partes) y `saldo_inicial_id` con sus checks e índices, `chequeras.de_apertura`,
  `conciliaciones.foto_total_cobrados_antes_de_su_fecha`, concepto de sistema `anulacion_de_apertura` y permisos
  `bancos.saldos-iniciales.ver` y `.anular` (por rol y por usuario). Los saldos iniciales existentes quedan como
  `saldo_global` sin cambiar ningún saldo ni conciliación (probado). Puente hasta BS-2: `RepositorioMovimientosDrizzle`
  crea la cabecera y marca `saldo_global` al agregar un saldo inicial, y la borra al eliminar el último. Los casos de uso,
  rutas y pantallas nuevos siguen en BS-2 a BS-9.
- **2026-11-18 — Bancos H2: documentación y QA en el navegador (pasos 6 y 7).** Sección H2 en `bancos.md` y remisiones en
  `plan-hallazgos-contables.md` y `plan-archivos-y-h2.md`. QA de punta a punta (`informe-qa-h2-2026-11-18.md`): saldo transcrito,
  archivo (subir, reemplazar, ver, quitar), terminar con y sin `exigir_estado_de_cuenta`, devolver, autorizar, previa elaborada,
  eliminar, permisos, celular, oscuro e impresión; el PDF se ve dentro del `iframe` en Chromium con la CSP global. Sin errores que
  bloqueen; 8 observaciones menores (el signo de «Difiere en», la huella que cambia en cada subida, la impresión en modo oscuro…).
  Firefox y Safari no se pudieron comprobar. Decisiones abiertas: tope de solicitud en Caddy, conservar 60 meses el
  `nombreOriginal`, CSP propia o «Abrir en otra pestaña» si Firefox o Safari no muestran el PDF, y qué huella mostrar.
- **2026-11-18 — CP4-E4 (servidor, liquidar y recibo): cierre de lo adelantado.** Sin migración ni código de producción nuevo:
  al revisar el paso contra `main` se encontró que `LiquidarRetiro`, `ReabrirRetiro`, el caso de la devolución del manejador de
  `bancos.movimiento_por_cambiar`, el permiso `retiros.liquidar` (nuevo, sin migración de permisos: ningún rol lo tenía antes),
  la auditoría (`ajustar` solo con faltante, `reabrir`), los eventos `retiro_liquidado` y `retiro_reabierto`, las rutas y el
  recibo de efectivo en `ComprobanteDePago` ya estaban hechos en CP4-E2, CP4-E3 y CP4-8. Lo que faltaba de la lista de pruebas
  del diseño se agregó: depósito de un mes conciliado (Bancos lo anula **con inverso** y el retiro se reabre; si el inverso cae
  en el mes conciliado Bancos lo rechaza y el retiro sigue liquidado) y el recibo de un reparto real (agrupado por contraseña,
  un recibo por proveedor, total en letras, leyenda). Aclaración del diseño: «depósito conciliado (no reabre)» solo ocurre si
  Bancos rechaza el inverso; una nota conciliada sí se anula con inverso.
- **2026-11-18 — CP4-9 (cliente, pagar).** Sin cambios en el servidor. Pantalla `NuevoPago`
  (`/cuentas-por-pagar/pagos/nuevo?proveedorId=&contrasenaId=`, entrada «Nuevo pago» en Operación, `pagos.ver`): se escoge el
  proveedor (selector de `pagos/proveedores-por-pagar`, por nombre con NIT y lo que se le debe), pestañas por forma según los
  permisos reales (`pagos.emitir` para cheque y transferencia o débito, `pagos.ligar-notas-de-debito`, `pagos.aplicar-a-apertura`
  solo si hay saldos iniciales), cargos autorizados **agrupados por contraseña** (M2: de la ficha se abre solo esa y «Agregar
  otra contraseña del proveedor» suma las demás; desde el menú entran todas), monto propuesto editable con casilla y «Todo»,
  retención que se descontará, no autorizados apagados con la razón, casilla de diferencia de centavos (con `ajustes.crear`,
  hasta el tope que manda el servidor), chequera con el siguiente número o cuenta con su saldo, notas ya registradas con lo que
  les queda, beneficiario de solo lectura, fecha (mínima, posfechado, fija en la apertura con la carga abierta), no negociable,
  referencia, motivo de la apertura y sus avisos fijos, avisos de §5.5 antes de confirmar, resumen de lo que va a pasar en la
  confirmación y, al registrar, los avisos de Cuentas por pagar y de Bancos tal como los responde el servidor. Barra pegada
  abajo con el total (celular). Lógica pura en `composables/pagos/` (`edicion-de-pago`, `fechas-del-pago`, `avisos-del-pago`,
  `errores-del-pago`, `resumen-del-pago`, `opciones-del-pago`, `grupos-del-pago`, `detalles-de-pago`) con pruebas; los
  errores del servidor (`aplicaciones.N.monto`, `chequeraId`…) vuelven a su documento o campo. Ficha de la contraseña: sección
  «Pagos» (con `pagos.ver`), botón «Registrar pago» (si el servidor dice que hay cargos autorizados con saldo y el usuario puede
  pagar de alguna forma), columna «Pagado» y «comprometido», etiqueta «Pagada / Pagada en parte / Comprometida» (también en la
  tarjeta de la lista), «Quitar» oculto en lo que tiene pagos; el aviso de «REIMPRESIÓN» al editar, quitar o agregar ya existía
  de CP3 y se mantiene con pagos. `CapaAvisos` respeta los saltos de línea del mensaje de confirmación. Desviaciones del diseño
  frente a la API real: `GET …/para-pagar` no trae `tieneMovimientos` (el servidor rechaza con `CorrijaElSaldoInicial` y el
  mensaje sale en el campo), `fechaMinima` solo cubre la contraseña abierta (la pantalla calcula la de lo que se paga con las
  emisiones y la fecha de inicio, y el servidor valida igual) y la bancarización se anticipa solo como «el mes llega al
  umbral» (el efecto fiscal lo decide el servidor al registrar). Sin enlace «Pagar en efectivo» ni a la ficha del pago (CP4-E5 y
  CP4-10).
- **2026-11-18 (decisiones del usuario).** Bancos H2: tope de **20 MB por solicitud en Caddy** (además de los topes de la
  app); el `nombreOriginal` del archivo se **conserva** los 60 meses de la auditoría (como hoy); la huella que se muestra es
  la **del archivo recibido** (estable, comparable con el archivo del usuario); **toda la app imprime siempre en claro**
  (`@media print` global: fondo blanco, texto negro, sin menú). El botón de desmarcar en la conciliación lo hace CP4-B3b.
  Libro de compras, bandeja de DTE (QA del 2026-11-08, informe en `docs/modulos/informe-qa-2026-11-08.md`): la barra de
  marcados usa **el criterio de «Confirmar»** («17 marcados: se registrarán 15 por Q…, 2 no se registran»); la selección
  **se conserva entre páginas** con «Marcar los N del filtro», y al confirmar se envía en **tandas de 100** con avance (cada
  tanda todo o nada; si una falla, se detiene y dice cuáles quedaron); tras confirmar, **un solo aviso** de éxito con las
  advertencias **agrupadas** (una vez cada una, con cuántos documentos y «Ver cuáles»). El coordinador hace el
  `git push origin main` después de cada unión en verde.
- **2026-11-18 — BS-2 (Bancos, segunda parte, servidor: saldos iniciales por partidas).** Puertos y casos de uso (`aplicacion/casos-uso/saldos-iniciales/`: listar, obtener, guardar, eliminar, agregar, corregir y eliminar partida, revisión de cierre y oyente de la fecha de inicio), cuadre con Bancos y Sobregiros sin compensar, hallazgos de cierre, chequera de apertura (§2.3), avisos (antigüedad con la variable y el art. 508, depósito de más de 30 días, sobregiro, posfechado sin fondos), auditoría, rutas y los dos Excel (`core/intercambio` gana `columnasSoloAlExportar`). Reemplaza el puente de BS-1 por `RepositorioDeMovimientosConSaldoGlobal`. Las rutas viejas siguen para el cliente actual hasta BS-5: `POST` y `GET ?cuentaBancariaId=` en la misma ruta y `PUT|DELETE` en `/global/:movimientoId`; el Excel viejo desaparece. Anular una partida (ruta y reglas) queda en BS-3. Detalle en `bancos.md`.
- **2026-11-18 (respuestas del usuario a EM-2 e impresión de cheques).** Todas las recomendaciones del arquitecto, salvo
  las fotos de cheques: no habrá, las plantillas van con medidas aproximadas. Detalle al final de
  `docs/modulos/diseno-em2-cierre-de-la-carga.md` y `docs/modulos/diseno-impresion-de-cheques.md`. Falta el dictamen del
  contador sobre lo marcado para él antes de programar.
- **2026-11-18 (decisiones del usuario con el dictamen `dictamen-em2-cheques-y-posfechado-2026-11-18.md`).**
  *Posfechado en Cuentas por pagar:* las pantallas de operación muestran la **deuda** (la misma cifra de R1) con
  «comprometido con cheque N al dd/mm» y «Disponible para pagar» al lado; lo vencido cuenta lo comprometido, con su nota;
  **cinco estados de pago** iguales en lista, ficha y R2 (Pendiente, Pagado en parte, Comprometido en parte, Comprometido,
  Pagado). Sin migración: cambian DTO y presentación. *Impresión de cheques:* casilla «PARA ABONO EN CUENTA» (art. 521)
  por cheque, apagada por omisión (cruzado, después); relleno de asteriscos tras el beneficiario y en el primer renglón de
  las letras; confirmar que el formulario está en la empresa antes de inutilizarlo (si no, extraviado) y reporte de
  correlativos por chequera; «Aplicación contable» vacía en el comprobante. *EM-2:* las auditorías de cierre y reapertura de
  la carga se conservan **mientras exista la empresa**; tras cerrar se muestra «Cerrada el … por …, con N diferencias:
  motivo» y se guarda y exporta la revisión con las cifras del cuadre de cada módulo; adjunto opcional del balance de
  apertura firmado (PDF revisado con qpdf, auditoría); después de EM-2, paso de U8 para transcribir del balance el saldo de
  proveedores y el de anticipos (dos cifras) y tener «no cuadra» con motivo.
- **2026-11-18 — CP4-B3b (cliente, Bancos: notas marcadas en la conciliación).** Sin migración ni cambios de servidor.
  `ConciliarCuenta` gana `NotasMarcadasEnConciliacion` (solo en proceso, con Cuentas por pagar activo y los permisos
  `conciliar`, `bancos.notas.ver` y `bancos.notas.editar`): lista las notas marcadas para Cuentas por pagar que son candidatas
  del mes, con «Desmarcar» (ventana `VentanaDeDesmarcar` de Notas, con concepto y motivo, que el servidor exige) por
  `POST /bancos/conciliaciones/:id/notas/:movimientoId/desmarcar`; el rechazo por nota ligada a un pago sale como aviso con el
  mensaje del servidor. Como `candidatos` no trae la marca (desviación de CP4-B2b), el cliente cruza sus ids con la lista de
  notas de la cuenta hasta fin de mes y se queda con las que el servidor dice `puedeDesmarcar`. Quitar la marca no cambia
  montos: no se recarga la conciliación y las marcas sin guardar se conservan. Lógica pura en `notas-marcadas.ts`;
  `usarDesmarcado` de Notas se reutiliza con un envío propio. Pruebas del cliente: +6.
- **2026-11-18 — Observaciones menores de la QA de H2 (corregidas las que no esperan decisión).** «Difiere en» ya no muestra un
  monto negativo: dice el monto y si el estado de cuenta muestra más o menos que el calculado (`textoDeDiferencia`); el mensaje
  del servidor al terminar con diferencia escribe «Q 12,270.00» como la pantalla; un archivo que no se puede leer ni como foto
  (por ejemplo un texto llamado `.pdf`) responde `documento_ilegible` («El archivo no es un PDF ni una foto válidos, o está
  dañado…»); `demasiadas_subidas` pasa a usted; el cuadro «Según libros / Según banco» cabe en 380 px sin desplazarse; y «Ver»
  de la lista de conciliaciones se alinea con los demás botones. Siguen esperando al usuario la impresión en modo oscuro y la
  huella.
- 2026-11-18, Bancos CP4-B3b, correcciones de la revisión: la prueba de `comparacion-de-saldo` activa Pinia (las 2 fallidas
  pasan); el resumen de las notas marcadas ya no afirma que no están aplicadas («las que ya se ligaron a un pago no se pueden
  desmarcar»; saber cuáles están ligadas exigiría un dato de Cuentas por pagar y queda por acordar); la lista se vuelve a
  pedir cuando la conciliación pasa a «en proceso» en la misma pantalla; `enQuetzales` del servidor escribe «-Q 5.00» con
  saldo negativo; los mensajes de foto HEIC e imagen demasiado grande pasan a usted. Sin resolver: filtro `desde` y aviso
  de error al listar notas, y montos de 9+ cifras en el cuadro a 380 px.
- **2026-11-18 — CP5-9 (cliente), primera parte: R6, R7 y R8.** Páginas `PagosRealizados`, `ChequesPosfechados` y `AjustesDelMes`
  (`/cuentas-por-pagar/reportes/pagos`, `…/cheques-posfechados`, `…/ajustes-del-mes`) en `seccion: 'reportes'`, con los permisos
  `reportes-de-pagos.ver` (R6, R7) y `reportes-de-control.ver` (R8); Excel con `.exportar` de su grupo (`AccionesDelReporte` ahora
  recibe `recurso`). R6: filtros (rango del mes en curso, máximo 24 meses con mensaje que dice cómo corregirlo, proveedor, forma,
  estado, posfechados y «misma persona»), totales de todo lo filtrado y por forma, tabla con «Registró el documento», «Autorizó» y
  «Registró el pago», paginada de 50 en 50 e impresión de hasta 2,000 filas (`usarImpresionDeFilas`). R7: corte, totales por cuenta y
  por semana, marca «Cobrado». R8: mes escogido de una lista (por omisión el anterior), las seis secciones (5a anulados y 5b devueltos
  a revisión), estado vacío si no hay cambios. En celular, tarjetas (R6, R7) y tablas que se deslizan dentro de su tarjeta (R8). El
  nombre del proveedor lleva a R3 solo si el usuario puede abrirlo. Pendientes: la ficha del pago (CP4-10) y de la contraseña desde R6
  quedan como texto; el filtro por cuenta bancaria de R6 y R7 espera un listado de cuentas que Cuentas por pagar pueda leer sin
  importar Bancos. R9, R10, R11 y la conciliación de R1 siguen en espera de CP5-5.
- **2026-11-18 — CP5-9 (cliente), correcciones de la revisión.** R8: «Ajustes vigentes del mes» y su cantidad salen de la suma de `totales.porCausa` (el total de la sección incluye anulados); nuevo cuadro «por causa y efecto» (pérdida, transitoria, otros ingresos); el resumen suma anulaciones de otros meses y muestra monto de documentos anulados y devueltos; «Pagos a la apertura» aclara que suma vigentes y anulados. R6: el tope de 24 meses del cliente usa la misma regla que el servidor (`mesesEntre`). Sigue pendiente el filtro `cuentaBancariaId` de R6 y R7 (espera listado de cuentas legible sin importar Bancos).
- **2026-11-18 — CP4-10 (cliente, pagos).** Sin cambios en el servidor. Pantallas: **Pagos**
  (`/cuentas-por-pagar/pagos`, entrada «Pagos» en Operación, `pagos.ver`): tarjetas con número, proveedor, forma («Cheque 1523 ·
  Banco X», «Efectivo · Retiro N»), fecha, monto y contraseñas, marca «Anulado» o «Posfechado»; filtros de proveedor, forma,
  estado (vigentes por omisión), **cheques posfechados**, fechas y cuenta bancaria. **Ficha del pago**
  (`/pagos/:id`): datos, documento de Bancos (cheque o nota, conciliado o no), retiro y quien recibió si es efectivo, documentos
  que cubre con retención descontada y constancias (o «constancia por emitir»), lo que debe cada documento hoy, «Dar por saldada
  la diferencia de Qx» por línea (`puedeSaldarDiferencia` del servidor, `ajustes.crear`, con confirmación y el aviso de la
  retención), **Reaplicar** (ventana con los cargos de las contraseñas vigentes del proveedor, tope por cargo sin contar este
  pago, suma que dice cuánto falta o sobra, motivo, resumen de confirmación, errores del servidor al cargo que los causó y avisos
  de la respuesta), **Anular** (resumen de lo que pasará según la forma, motivo y fecha del inverso opcional si mueve dinero) y
  «Cobrado: reaplíquelo o registre un reintegro» cuando el movimiento está conciliado. **Comprobante**
  (`/pagos/:id/comprobante`, `window.print()`, original y copia, no registra nada): título, leyendas y monto en letras tal como
  los devuelve el servidor, documentos por contraseña con constancias, notas aplicadas, pagado y saldo, firmas. Enlaces: los pagos
  de la sección «Pagos» de la contraseña y el resultado de «Nuevo pago» (con «Imprimir el comprobante») llevan a la ficha; el
  «Origen: Cuentas por pagar» de Bancos (tabla de movimientos y tarjeta de nota) es enlace a la ficha del pago con `pagos.ver`.
  Lógica pura con pruebas en `composables/pagos/` (`lista-de-pagos`, `ficha-de-pago`, `reaplicacion`, `comprobante-de-pago`).
  Diferencias con el diseño: la reaplicación se hizo como ventana; el enlace al movimiento de Bancos de la ficha es texto (Bancos
  no tiene ficha de cheque ni de nota); el origen de Bancos solo guarda el id, así que si es de un reintegro o un retiro el enlace
  lleva a una ficha que dice «No se encontró este pago» (pendiente: campo de tipo de origen en Bancos). El efectivo (CP4-E5) no
  se programó: la lista y la ficha ya muestran un pago en efectivo si llega.
- **2026-11-18 — CP4-10 (correcciones de la revisión).** Bancos ya no enlaza a la ficha del pago las notas de crédito (los reintegros
  nacen en Cuentas por pagar sin ser pagos) y rotula «Ver en Cuentas por pagar»; las notas de débito de retiros siguen
  pendientes hasta que Bancos guarde el tipo del documento de origen. La lista de Pagos ya no pide los proveedores sin
  `documentos.ver` (el filtro queda con «Todos», sin aviso). El comprobante muestra estado vacío con enlace para volver y la
  sección de pagos de la contraseña solo enlaza con `pagos.ver`. Pendiente: tope de la reaplicación con diferencias saldadas
  (el cliente no suma esa diferencia) y enlace del movimiento de Bancos en la ficha.
- 2026-11-18 · **Cuentas por pagar CP4-11 (cliente, documentos, notas y reintegros).** Documentos por pagar: filtro «Estado de pago»
  (con «Comprometidos (cheque posfechado)»), etiqueta de estado en la tarjeta y «Pagado» y «Comprometido» en la tarjeta y la
  ficha; la ficha del cargo gana la sección «Pagos» (enlace a `/cuentas-por-pagar/pagos/:id`, «Posfechado», retención descontada
  y por qué no se anula) y la de la nota, «Reintegrado» y la sección «Reintegros» con «Recibo» y «Anular» (motivo). Notas de
  crédito: «Registrar reintegro» en la ficha y casillas en la lista (solo del mismo proveedor y solo lo que el servidor dice que
  se puede), `VentanaDeReintegro` (depósito o efectivo; referencia obligatoria en efectivo; resumen de lo que va a pasar; aviso
  del efectivo) que al registrar lleva al recibo, y `ReciboDeReintegro` (impresión con la leyenda no tributaria). Los avisos del
  pago con constancia sin emitir enlazan a «Constancias de retención pendientes» (R12). **Servidor (mínimo):** `GET /documentos`
  acepta `estadoDePago`, con la misma regla de `estadoDePagoDe` en SQL (`filtro-de-estado-de-pago.ts`, con prueba de integración).
  Diferencias con el diseño: la ficha de la nota trae solo el `estado` de cada reintegro (no `puedeAnular`), así que «Anular» se
  ofrece en los vigentes y el servidor decide; anular no pide la fecha del inverso (el servidor usa la de hoy); las cuentas del
  depósito salen de `GET /pagos/medios` (pide `pagos.ver`; sin ellas solo se ofrece el efectivo); el enlace a constancias no
  lleva el mes ni el filtro porque esa pantalla no lee parámetros de la ruta.
- **2026-11-18 (diseño de EM-2 actualizado con el dictamen).** `diseno-em2-cierre-de-la-carga.md` revisado: la auditoría
  de `empresas.cargas-iniciales` no se depura mientras la entrada tenga empresa (catálogo
  `core.recursos_de_auditoria_permanente` con RLS de solo lectura y excepción en `core.depurar_auditoria`, migración core
  `0024`); la revisión guardada lleva hallazgos y cifras del cuadre de cada módulo, con historial y Excel de tres hojas;
  `CargaInicialDto.ultimoCierre` para «Cerrada el … por …, con N diferencias: motivo»; balance de apertura en PDF
  (`cargas_iniciales.balance_de_apertura_archivo_id`); avisos nuevos (retenciones con el texto del dictamen, documentos del
  libro anteriores a la fecha de inicio, proveedores con saldo a favor, mes partido de Libro de compras); dos permisos
  nuevos (`empresas.carga-inicial.ver-cierres` y `.exportar`). Trece pasos (EM-2.1 a EM-2.13) y U8-B aparte. Preguntas
  P-6 a P-8 con recomendación.
- **2026-11-18 (EM-2.1 y EM-2.2, servidor del core).** Mediador: `preguntarATodos` y `responder` (`PreguntasEntreModulos`,
  `NombreDePregunta`); las respuestas `null` se omiten, un módulo inactivo se salta, si uno lanza el error se propaga y
  `retirarManejadoresDe` también quita las preguntas. Migración core `0024_auditoria_permanente`: catálogo
  `core.recursos_de_auditoria_permanente` (solo lectura para la app por RLS) y `core.depurar_auditoria` que no borra las
  entradas con empresa de esos recursos; el mínimo de 60 meses sigue.
- **2026-11-18 (EM-2.3, servidor de Empresas: revisar y cerrar).** Contrato `empresas.revisar_cierre_de_carga`
  (`RevisionDeCierreDeModulo`, `HallazgoDeCierre`, `CifraDelCuadre`, tope de 200 cifras por módulo). `GET
  …/carga-inicial/revision-de-cierre` (permiso de cerrar) junta los avisos propios de Empresas (fecha que no es día 1 y
  sin balance de apertura) con lo que respondan los módulos activos, más una huella sha256 de hallazgos y cifras. `POST
  …/cerrar` acepta `{ motivo?, huella? }`, vuelve a revisar con la carga bloqueada, pide motivo si hay diferencias,
  rechaza una huella vieja y audita `cerrar` (versión 1 con la revisión). Migración de Empresas `0011`: fila
  `empresas.cargas-iniciales` en el catálogo de auditoría permanente y los permisos `ver-cierres` y `exportar` para quien
  podía cerrar o reabrir.
- **2026-11-18 (EM-2.4 y EM-2.5, servidor de Empresas: lo que se ve después y el balance de apertura).** `CargaInicialDto` gana
  `ultimoCierre` (diferencias, avisos, motivo y `revisionGuardada`; una carga cerrada antes de EM-2 sale con `revisionGuardada` falso)
  y `balanceDeApertura`. Puerto `HistorialDeLaCarga` (lee `core.auditoria` desde infraestructura y rechaza una versión desconocida) y los
  casos de uso `ListarHistorialDeCargaInicial`, `ObtenerCierreDeCargaInicial` y `ExportarCierreDeCargaInicial` (Excel de tres hojas: Cierre,
  Hallazgos y Cifras, con los montos como número): rutas `GET …/historial`, `…/cierres/:cierreId` y `…/cierres/:cierreId/exportar`
  (permisos `ver-cierres` y `exportar`). Migración de Empresas `0012`: `cargas_iniciales.balance_de_apertura_archivo_id` (FK sin `on delete`
  a `core.archivos`, `unique`). `SubirBalanceDeApertura` en tres tiempos (solo PDF; una foto deshace la transacción y borra el archivo),
  `QuitarBalanceDeApertura` y `AbrirBalanceDeApertura`; con la carga cerrada solo se sube si falta (`balance_de_apertura_fijo`); reemplazar
  y quitar auditan `quitar`; el cierre guarda el sha256 del balance. Pendiente: la revisión del agente `seguridad` antes de unirlo.
- **2026-11-18 (EM-2.6 a EM-2.8, respuestas de los módulos).** Bancos responde la revisión con un adaptador sobre `ListarSaldosIniciales`
  (hallazgos de BS-2 con su nivel, `sin_saldos_iniciales`, totales sin compensar y cifras por cuenta; `activa` en el resumen de cuenta);
  Cuentas por pagar con `sin_saldos_iniciales`, `retenciones_por_practicar`, `documentos_del_libro_anteriores` y
  `proveedores_con_saldo_a_favor` más las cifras (saldo de proveedores y saldo a favor, sin compensar); Libro de compras con `mes_partido`
  (o `null` si la fecha es día 1). Sin migraciones de Bancos. Falta el cliente (EM-2.9 a EM-2.13) y U8-B.
- **2026-11-18 (EM-2.9 a EM-2.12, cliente de Empresas y piezas comunes).** Core: `DocumentoAdjunto` y `VisorDeDocumento`
  (`core/componentes/archivos/`) con `utilidades/documentos.ts` (tamaño, tope y tipo; Bancos no se tocó). Empresas: «Cerrar la
  carga inicial» abre una ventana con la revisión de cada módulo (diferencias en rojo y avisos en ámbar, con icono y texto, cifras del
  cuadre, «Revisar en <módulo>» solo si el usuario puede entrar a esa pantalla), motivo obligatorio solo si algún hallazgo lo pide
  (contador 0/500) y botón «Cerrar con N diferencias»; manda la huella y, si el servidor dice `revision_de_cierre_desactualizada`,
  muestra la revisión nueva con el aviso «Los saldos cambiaron mientras revisaba…» sin cerrar la ventana. Tras cerrar, la sección muestra
  «Cerrada el … por …, con N diferencias: motivo» (o «antes de que se guardara la revisión»), «Ver revisión», «Exportar revisión»
  (Excel) e «Historial» (cierres, reaperturas y balances quitados), con `ver-cierres` y `exportar`. Balance de apertura firmado: solo PDF,
  subir/reemplazar/quitar con la carga abierta, y con la carga cerrada solo subir si falta; verlo con `ver-cierres`. Lógica pura con
  pruebas (`revision-de-cierre`, `resumen-de-cierre`, `balance-de-apertura`, `documentos`) y del composable de cierre. Falta EM-2.13 (QA
  en el navegador y docs de Bancos y Cuentas por pagar) y U8-B.
- **2026-11-18 (EM-2, correcciones de la revisión).** Se trajo `integracion`: la `0010` de Empresas la tomó el Excel
  (`0010_permisos_de_excel_de_empresas`), así que las migraciones de EM-2 son `0011_em2_cierre_de_la_carga` y
  `0012_em2_balance_de_apertura` (con sus snapshots y el journal; la ruta de la prueba de API y el diseño se actualizaron).
  «Exportar revisión» solo se muestra a quien tiene también `ver-cierres` (el último cierre se busca en el historial).
  Decisiones que quedan por confirmar con el arquitecto: (1) Bancos, con más de 60 cuentas con saldo inicial, guarda solo
  los tres totales y no las cifras por cuenta (tope de 200 cifras del diseño §3.2); (2) subir el primer balance de apertura
  no deja entrada en `core.auditoria` (solo `core.archivos`), como dice el diseño §7.3.
- **2026-11-18 — Impresión de cheques: diseño final con el dictamen.** `diseno-impresion-de-cheques.md` queda aprobado y con
  los ajustes del contador: `movimientos.para_abono_en_cuenta` (falso por omisión; va con el pago al pasar a otro
  formulario), relleno tras el beneficiario y en el primer renglón de las letras, campos de la cara del cheque cerrados (sin
  anotaciones), `preimpreso` para «NO NEGOCIABLE» y «PARA ABONO EN CUENTA», fecha en texto o en casillas, causas de
  anulación `inutilizado` (con confirmación de custodia y del papel conservado) y `extraviado` (anulación con aviso al
  banco), reporte de correlativos por chequera con cuadro de conteo físico, comprobante con retenciones y «Aplicación
  contable» vacía. Pasos IC-1 a IC-11; empiezan cuando BS-3, BS-4 y BS-R1 estén en `main` (la migración toma la siguiente
  libre tras la `0035`). Falta cotejar la remisión del art. 495 antes de citarlo.
- **2026-11-18 (respuestas del usuario a Multimoneda, Caja chica y Cuentas por liquidar, y aviso de pago por correo).**
  Todas las recomendaciones, salvo en Caja chica: una factura con retención se rechaza **con permiso de excepción**
  (lo del contador, CC-f A′) y la bancarización solo **avisa y marca** (lo del arquitecto, CC-h A). Detalle al final de
  cada diseño. Los tres quedan **aprobados** para programar (orden de la hoja de ruta: Multimoneda antes que Caja chica).
- **2026-11-18 (correcciones de la revisión de CP4-9, solo cliente).** «Nuevo pago»: la pestaña «Cuenta de apertura» ya
  no depende de los cargos antes de elegir proveedor (solo del permiso; con proveedor, de que tenga saldos iniciales), y
  si el proveedor no los tiene se explica en vez de mostrar una interfaz sin pestañas. «Registrar pago» en la ficha de la
  contraseña pide `pagos.ver` (lo que exige la ruta) y cuenta la apertura solo si hay saldos iniciales por pagar. El
  selector de proveedores junta todas las páginas (antes cortaba en 200) y las notas por ligar piden el máximo del
  servidor (200) con aviso si se llega al tope, porque esa ruta no pagina. La suma del mes del proveedor sale de la fecha
  escrita y no se pisa con la de un proveedor anterior; el resumen de la apertura dice la fecha de inicio. Sin cambios en
  el servidor ni en rótulos de saldo o estados de pago.
- **2026-11-18 (segunda revisión de CP4-9).** «Nuevo pago»: el aviso del tope de notas ya no sale como emergente (ni al
  pagar con cheque ni en cada «Pagar otro»); en la pestaña «Nota ya registrada» hay filtros por cuenta bancaria y por
  fechas, que se mandan al servidor (`cuentaBancariaId`, `desde`, `hasta`), y al llegar al tope dice «Hay más notas:
  filtre por cuenta o por fechas». Si el filtro saca a la nota elegida, se suelta. La suma del mes usa un control de
  solicitudes propio (`control-de-suma.ts`): la respuesta solo vale si es la última y su proveedor y mes siguen vigentes,
  y si la fecha cambió de mes mientras cargaba el proveedor, se vuelve a pedir. El estado vacío de sin permiso sale por
  no tener ningún permiso de pago, aunque se entre con `?proveedorId=`; el texto de «solo apertura» queda para quien sí
  tiene ese permiso. Si la lista de proveedores llega al tope de 50 páginas, se avisa que está incompleta. Servidor:
  `proveedoresPorPagar` desempata por id (paginación estable), con prueba de API de proveedores con el mismo nombre.
- **2026-11-18, Cuentas por pagar: revisión de «Nuevo pago» (filtros de notas y proveedores).** Con la lista de proveedores
  incompleta (tope de 50 páginas), el selector busca en el servidor (`CampoSelector` con `busquedaEnServidor` y el evento
  `buscar`; retardo de 300 ms y respuestas viejas descartadas en `busqueda-escalonada.ts`) y el proveedor elegido no sale de
  las opciones aunque la búsqueda ya no lo traiga; la ruta busca solo por nombre, y el aviso lo dice. Las cuentas del filtro
  de notas se acumulan entre cargas (quien solo liga notas ya no ve encogerse el selector al filtrar). Con el rango de fechas
  al revés se limpia la lista de notas y se invalida el pedido en vuelo. `GET /pagos/notas-para-ligar` sigue con
  `pagos.ver`: el diseño de CP4 (§8, tabla de rutas) la asigna expresamente a ese permiso y la prueba de nota ligada fija
  200 para quien solo ve; `ligar-notas-de-debito` es de la acción de ligar (`POST /pagos/ligar`), que no cambia. Prueba de API
  de los filtros `cuentaBancariaId`, `desde` y `hasta`. La tarjeta del proveedor sale de la página a
  `SeleccionDeProveedorDelPago`.
- 2026-11-18 · Correcciones de la revisión del selector de proveedores del pago: el proveedor elegido ya no sale repetido
  (se compara por id en `conProveedorElegido`, con prueba); la búsqueda escalonada cancela su temporizador y descarta
  pedidos en vuelo al salir de la pantalla; `usarSelectorConBusqueda` reinicia la opción resaltada cuando llegan otras
  opciones mientras se busca. Queda pendiente (no es regresión): el texto del botón si se entra con `?proveedorId=` de un
  proveedor fuera de la carga inicial.
- 2026-11-18 · `GET /pagos/notas-para-ligar` exige `cuentas-por-pagar.pagos.ligar-notas-de-debito` (decisión del usuario; §8 de
  `diseno-cp4-pagos.md` actualizado): quien solo tiene `pagos.ver` recibe 403. El cliente ya no pide las notas sin ese permiso.
  `usarSelectorConBusqueda` reinicia la opción resaltada solo con `enServidor`, con prueba de que sin él no se reinicia.

- **2026-11-18 — CC-1 y CL-1 (Caja chica y Cuentas por liquidar, datos).** Dos módulos nuevos con el generador
  (`caja-chica`, icono `Wallet`, depende de Libro de compras y Bancos; `cuentas-por-liquidar`, icono `HandCoins`, suma
  Terceros). Esquemas `caja_chica` (migraciones `0000_esquema` y `0001_cc1_fondos_y_comprobantes`: fondos con alcance por
  fondo y su tabla de accesos, custodios, cambios de monto, comprobantes con bandeja, reposiciones y sus líneas con
  llaves al mismo fondo, arqueos, vales provisionales, y los disparadores `asignar_al_creador` y
  `asignar_fondo_al_custodio`) y `cuentas_por_liquidar` (`0000_esquema` y `0001_cl1_anticipos_y_gastos`). Permisos
  declarados, incluidos los de excepción de retención (`caja-chica.comprobantes.con-retencion` y
  `cuentas-por-liquidar.gastos.con-retencion`, CC-f A′); sin permiso de efectivo sin bancarizar (CC-h A). Ayudas comunes de
  restricciones en `core/base-datos/restricciones.ts`. Pruebas de tablas: cada check, llaves compuestas, únicos,
  RLS de otra empresa, fondo no asignado invisible, bandeja visible, disparador del custodio; `politicas-de-los-modulos` y
  `llaves-entre-esquemas` en verde. **Quedan para después** (anotado en los dos `docs/modulos/*.md`): la configuración
  (§9.5), todo el servidor y el cliente (CC-2 en adelante, CL-2 en adelante) y lo que depende de CCL-M (`preguntarATodos`),
  CCL-B1 (conceptos de sistema de Bancos, `0035`), CCL-L1 (referencia de destino del libro) y CCL-BZ (bancarización
  compartida, función `security definer` de la suma de Caja chica, que revisa `seguridad`, V-S1 y V-S2).
- **2026-11-18 — CC-1 y CL-1, correcciones de la revisión.** Migraciones `0002` de Caja chica y Cuentas por liquidar
  (la `0001` no se tocó). La excepción de CC-f (A′, factura con retención con permiso y motivo) ahora cabe en las
  tablas: `con_retencion`, `monto_retenido` y `motivo_con_retencion` en `comprobantes` y `gastos`; `monto` pasa a ser
  lo que salió del fondo o anticipo (el neto), así que la ecuación del fondo y la reposición no se inflan con la
  retención, que la entera la empresa. El documento del libro se liga con la llave compuesta
  `(id, empresa_id, proveedor_id, destino)` (columna fija `destino_del_documento`), como ya hace Cuentas por pagar.
  Se quitó `comprobantes.motivo_sin_bancarizar` (CC-h = A), se agregaron los índices de las llaves que cruzan de
  módulo y entre tablas, y el check `fecha_de_liquidacion >= fecha` en anticipos y vales provisionales.
- **2026-11-18 (MM-3a′, todas las monedas del Banguat en el cliente, sin base de datos).** En `core/monedas`, según la
  adenda del diseño de Multimoneda: el puerto `FuenteDeTiposDeCambio` suma `tiposDeLaMoneda` (`TipoCambioRangoMoneda`
  por código del Banguat) y `monedasDisponibles` (`VariablesDisponibles`); `tipoDelDia` lee también `CambioDia/Var` de
  las monedas pedidas. Se quitó el mapa fijo `2 → USD`: el extractor recibe las monedas pedidas e ignora otros códigos.
  `referenciaEscalada` (ahora en `valores-decimales.ts`) acepta notación científica y más de 8 decimales (redondea
  desde la mitad, con `bigint`, sin `number`; tope 99999999.99999999). `sin_referencia` pasó a `valor_ambiguo` con la
  moneda real; las publicaciones llevan `codigoBanguat` (y `compra`/`venta` en los rangos). Constantes nuevas
  `VARIACION_PARA_RECHAZAR_EN_PORCIENTO = 25`, `variacionSuperaElRechazo` y `cruceImplicito`; `fechasSinPublicacion`
  recibe un objeto con `diasEsperados` (el USD, todos; las demás, hábiles, que calcula quien llama con el
  calendario). `FuenteConReintentos` y el doble en memoria cubren lo nuevo. Pruebas con respuestas grabadas (no se
  llamó al Banguat real: **C-1 a C-4 de la adenda siguen pendientes**, así que `CODIGOS_DEL_BANGUAT_EXCLUIDOS` y la hora
  de la vuelta de noche quedan para MM-3b; la forma de `VariablesDisponibles` y de `TipoCambioRangoMoneda` se supuso
  igual a la del dictamen y debe confirmarse con la llamada real). Sigue para después de la migración del core: MM-1,
  MM-2 y MM-3b (bitácora, candado, vueltas, carga nocturna).
- **2026-11-18 (MM-3, primera parte: cliente del Banguat sin base de datos).** En `core/monedas`: puerto
  `FuenteDeTiposDeCambio` (`tipoDelDia`, `tiposDelRango`), `ClienteBanguat` (SOAP 1.1 con `fetch`, HTTPS obligatorio, 10 s,
  256 KB, sin seguir redirecciones, sin analizador XML: rechaza `<!DOCTYPE`/`<!ENTITY` y extrae solo lo esperado),
  validación de dominio (fecha real y no posterior a mañana, referencia `^\d{1,6}(\.\d{1,8})?$` y > 0, banda 5 a 15 del
  USD, variación de 3 % con enteros), `FuenteConReintentos` (decorador con esperas), huecos y rango de relleno de 45 días y
  el doble `FuenteDeTiposDeCambioEnMemoria`. Una llamada real cerró casi todo V-13 (ver el diseño). **Para después de
  MM-1/MM-2 (necesitan tablas):** bitácora `core.consultas_al_banguat`, candado `pg_try_advisory_lock`, horario y
  temporizador, relleno contra lo guardado, `principal.ts`, variables `URL_TIPO_DE_CAMBIO_BANGUAT` y
  `CARGAR_TIPOS_DE_CAMBIO`, `POST …/cargar`, y avisar la variación (usa `variacionSuperaElLimite`).
- **2026-11-18 (respuestas del usuario al plazo de crédito).** Todas las recomendaciones de
  `docs/modulos/diseno-plazo-de-credito-del-proveedor.md` (detalle al final del diseño). Aprobado para programar PC-1 a PC-6;
  PC-4 y PC-5 (Excel de plazos) van después de que el Excel de Terceros esté en `main`.
- **2026-11-18 (H2, tope en Caddy).** `infra/Caddyfile`: `request_body { max_size 20MB }` para todo el sitio y `handle_errors 413`
  que responde `SOLICITUD_DEMASIADO_GRANDE` en el formato de errores de la API. Configuración validada con `caddy validate`.
  Los topes de la app (PDF 10 MB, foto 15 MB, Excel 5 MB) siguen igual; para cambiar el de Caddy se edita ese archivo y se reinicia el contenedor.
- **2026-11-18 (H2, huella del archivo recibido).** La huella que se informa y se muestra del estado de cuenta es la sha256 **del archivo
  tal como llegó** (`sha256_recibido`), estable aunque qpdf reescriba el PDF y comparable con `sha256sum` del original. El gestor de
  documentos (`core/archivos`) la devuelve al guardar y al abrir (con respaldo a `sha256` si falta) y la consulta del estado de cuenta
  de bancos la lee de ahí. Sin migración ni datos que corregir: `sha256_recibido` ya se guardaba en cada documento (las filas de
  desarrollo anteriores a H2b que no la tengan siguen mostrando la huella guardada). La auditoría conserva el `nombreOriginal` igual.
  Pruebas: el mismo PDF dos veces da la misma huella y coincide con `createHash('sha256')` del original.
- **2026-11-18 (impresión siempre en claro).** `cliente/src/estilos.css`: regla `@media print` global (fuera de las capas de
  Tailwind, para ganarle a `dark:`): `html`/`body` con fondo blanco y texto negro, y con el modo oscuro puesto (`html.oscuro`) todo
  elemento pasa a fondo transparente, texto negro, bordes grises y sin sombras; el menú lateral no se imprime. Las hojas existentes
  (reportes de bancos y de cuentas por pagar, contraseña, conciliación) ya imprimían en claro con `print:*`; la regla solo cubre lo
  que `dark:` les cambiaba.
- **2026-11-18 — Libro de compras, bandeja de DTE (errores 4, 5 y 6 de la QA).** Solo cliente; no hizo falta ruta nueva en el
  servidor (para «Marcar los N del filtro» el cliente pide las páginas del filtro de a 200, el máximo del listado, y así
  tiene la fila completa que necesitan completar, confirmar y descartar). **4:** el criterio vive en
  `composables/bandeja/criterio-de-registro.ts` (anulado en la SAT fuera, nota de crédito resta, nota de débito suma) y lo
  usan la barra (`resumen-de-la-barra.ts`: «17 marcados: se registrarán 15 por Q…, 2 no se registran») y «Confirmar»
  (`resumen-de-la-confirmacion.ts`). **6:** la selección guarda la fila completa (`seleccion-entre-paginas.ts`) y se
  conserva entre páginas y filtros; «Marcar los N del filtro» (`MarcarEnLaBandeja.vue`); «Confirmar» envía en tandas de
  100 con avance (`confirmar-por-tandas.ts`). Una fila con error dentro de una tanda no detiene el envío (el servidor
  responde fila por fila y esa fila queda pendiente); si la **solicitud** de una tanda falla, se detiene y la ventana dice
  cuántas tandas y documentos quedaron registrados y cuáles no se confirmaron (los de esa tanda pueden haberse registrado en
  parte: el servidor no alcanzó a contestar). Lo registrado sale de la selección y lo demás sigue marcado. **5:** ya estaba
  en un solo aviso desde la corrección del 2026-11-08 (el resultado se ve una vez en la ventana); ahora cada advertencia
  agrupada lleva «N documentos. Ver cuáles».
- **2026-11-18 — Libro de compras, bandeja de DTE (correcciones de la revisión).** Solo cliente. **Topes:** completar y
  descartar parten lo marcado en solicitudes de 500 (el tope del servidor; antes «Marcar los N del filtro» podía pasarlo y
  daba 400); cada grupo hecho se refleja aunque otro falle, y descartar solo desmarca lo ya descartado. «Confirmar» lleva
  como máximo **500** documentos por ventana (la vista previa gasta 5 de las 20 solicitudes por minuto del servidor y el
  envío otras 5, con margen para recalcular); los demás siguen marcados y la ventana lo avisa. **Corte de una tanda:** el
  servidor confirma **fila por fila** (cada una en su transacción), así que «todo o nada por tanda» no se puede garantizar
  desde el cliente; para no adivinar, tras un corte el cliente le pregunta al servidor qué sigue pendiente
  (`comprobar-la-tanda-cortada.ts`), dice cuántos de esa tanda sí se registraron y los saca de la selección. **Pendiente de
  decidir con el usuario:** si se quiere de verdad «todo o nada» por tanda, hay que cambiar el servidor
  (`ConfirmarDteRecibidos`) a una sola transacción por solicitud, perdiendo el «una fila con error no frena a las demás».
  **Menores:** la barra de marcados sigue visible si hay marcadas aunque el filtro no traiga filas; «Marcar los N del
  filtro» toma el total de la respuesta del servidor (no del último listado); la ventana «Confirmar» no se cierra con
  Escape ni clic fuera mientras envía. Sin cambio: la barra cuenta como «se registrarán» lo no anulado (la letra de la
  decisión) y «Confirmar» descuenta además lo que la vista previa rechaza.
- **2026-11-18 (decisión del usuario, Multimoneda, cambia PU-4).** Se soportan **todas las monedas que publica el Banguat**:
  cada moneda guarda (opcional) su código del Banguat, la ventana de Monedas lo elige con un selector, y toda moneda con
  código actualiza su tipo de cambio **cada noche** de forma automática. El contador revisa qué tipo vale para documentos en
  monedas distintas del USD y el arquitecto escribe la adenda en `docs/modulos/diseno-multimoneda.md`.
- **2026-11-18 (decisiones del usuario).** *Caja chica y Cuentas por liquidar:* el permiso de excepción para una factura con
  retención y su motivo los pide **quien asigna la factura al fondo o al anticipo** (desde la ficha o desde la bandeja); sin
  el permiso, la factura queda pendiente en la bandeja y se registra quién la autorizó. *Cuentas por pagar:*
  `GET /pagos/notas-para-ligar` pasa a exigir `cuentas-por-pagar.pagos.ligar-notas-de-debito` (cambia §8 de
  `diseno-cp4-pagos.md`, que decía `pagos.ver`).
- **2026-11-18 — Pruebas del libro con qpdf opcional.** Sin qpdf 11+ (`RUTA_QPDF` apunta a un binario inexistente) se saltan las 8 pruebas del PDF del libro que emiten o revisan con qpdf (`it.skipIf(!hayQpdf)`); el Excel, el permiso de emitir y los límites siguen corriendo. Sin cambios de producto.

- **Excel de Clientes, Proveedores y Categorías de proveedor (servidor).** Rutas `GET /terceros/clientes|proveedores/exportar|plantilla`,
  `POST …/importar?ensayo=` y lo mismo en `/proveedores/categorias`. Permisos `terceros.clientes.*`, `terceros.proveedores.*` y
  `terceros.categorias-de-proveedor.*` (`importar`, `exportar`); la migración `0008_permisos_de_excel` da importar a quien tenía
  `clientes.crear` / `proveedores.crear` y exportar a quien tenía `terceros.ver`, en roles y permisos directos. Cada fila entra por
  `RegistrarTercero` (aviso de parecidos incluido: una fila parecida a un tercero existente se rechaza, sin confirmar duplicado),
  con el papel de la hoja; sin contactos ni secciones de otros módulos. La categoría se escribe por nombre. Cliente: botones de Excel en las listas de Clientes, Proveedores y Categorías de proveedor (`AccionesDeIntercambio`, `VentanaDeImportacion`, `usarIntercambio`).
- **Corrección de la revisión del Excel de terceros.** La migración `0008_permisos_de_excel` da `importar` de clientes y proveedores solo a quien tiene el papel `.crear` **y** `terceros.crear` (en el mismo rol, o en el mismo usuario de la cuenta), como pide el formulario; antes un rol con solo `clientes.crear` podía crear terceros por Excel. HOJA-DE-RUTA al día y la prueba de exportar proveedores revisa el contenido. Pendiente (bajo): la columna «Activo» exporta el estado del tercero, no el del papel.
- **2026-11-18 (respuestas del usuario a la adenda de Multimoneda).** Solo las monedas activas con código del Banguat se
  cargan solas, en tres vueltas (06:00 dólar, 09:30 las demás, noche); el selector excluye DEG, bolívares retirados y colón
  salvadoreño; lo demás según el contador (detalle al final de la adenda en `docs/modulos/diseno-multimoneda.md`).
- **2026-11-18 — Pruebas del servidor en paralelo (infraestructura).** La suite (~540 archivos, ~4900 pruebas) tardaba 26–29 min porque
  `fileParallelism` estaba apagado desde el primer commit: todos los archivos compartían la base `arrancar_pruebas`. Ahora cada worker de
  Vitest usa **su propia base** `${BD_PRUEBAS}_${VITEST_POOL_ID}`. `globalSetup` (`servidor/src/pruebas-api/paralelo/preparar-bases-paralelas.ts`)
  crea las que falten clonándolas de `${BD_PRUEBAS}_plantilla` (migrada con el migrador real, que da los GRANT a `arrancar_app`); las bases
  se **conservan entre corridas** (borrarlas fuerza un checkpoint de PostgreSQL que con la máquina cargada tardó más de 10 minutos) y cada
  archivo las migra y limpia al empezar, como antes. `setupFiles` (`entorno-por-worker.ts`) fija por worker `DATABASE_URL`,
  `DATABASE_URL_PROPIETARIO`, `RUTA_ALMACENAMIENTO` (`almacenamiento-pruebas/worker-<n>`), `TMPDIR` propio (la prueba de qpdf cuenta archivos
  temporales) y `PGOPTIONS=-c synchronous_commit=off`. Workers: `VITEST_MAX_WORKERS`, por omisión la mitad de los núcleos con tope de 8.
  `BD_PRUEBAS` sigue siendo el prefijo propio de cada agente. Los tiempos de espera suben (`testTimeout` 30 s, `hookTimeout` 60 s) porque las
  pruebas de imágenes de 20000 x 20000 y de 20,000 documentos pasaban de 5 s al compartir CPU. Limpieza: `BD_PRUEBAS=<prefijo> npm run
  bd:limpiar-pruebas -w servidor` borra solo `<prefijo>_plantilla` y `<prefijo>_<número>`. No correr dos corridas con el mismo prefijo a la vez.
  Medido con 8 workers y la máquina compartida (carga de 17 a 25): 360 s, 382 s y 373 s en tres corridas seguidas, todas en verde (544 archivos,
  4910 pruebas), contra 26–29 min en serie.
- **2026-11-18 — Pruebas en paralelo, correcciones de la revisión.** El prefijo `BD_PRUEBAS` se valida (`validarPrefijoDeBases`: `^[a-z][a-z0-9_]{0,40}$`,
  distinto de `arrancar`, error si viene vacío) desde `nombres-de-bases.ts`, usado por el `globalSetup`, la configuración y el script de limpieza; este
  último ya no usa expresiones regulares en SQL: lista las bases y filtra en JavaScript (`esBaseDePruebasDelPrefijo`: prefijo exacto más `_plantilla` o
  `_` y solo dígitos), con los identificadores escapados. El número de bases sigue al `maxWorkers` que Vitest resuelve (`setup(proyecto)` lee
  `proyecto.config.maxWorkers`: sirven `--maxWorkers` (admite `50%`: `npm run probar -w servidor -- --maxWorkers=50%`) y `VITEST_MAX_WORKERS`, que solo acepta un número entero porque Vitest la lee con `parseInt` (`50%` daría 50 workers); ambas rutas rechazan lo que no sea un entero positivo con un error claro; `vitest.config.ts` solo fija el valor por omisión si no hay variable).
  `globalSetup` compara el historial de `drizzle.migraciones_<modulo>` de la plantilla y de cada base de worker con el código (`historial-de-migraciones.ts`:
  hash aplicado que ya no existe, o migración pendiente con fecha anterior a la última aplicada, que drizzle saltaría); si no concuerda, borra y vuelve a
  crear las bases del prefijo. `RUTA_ALMACENAMIENTO` es por base (`almacenamiento-pruebas/<base>`). Borrar bases puede tardar mucho con la máquina
  cargada (correr `bd:limpiar-pruebas` en segundo plano) y no deben correr dos suites con el mismo prefijo.
- **2026-11-18 (PC-1, plazo de crédito: cambiar el vencimiento).** `CambiarVencimiento` rechaza un cargo sin saldo (pagado,
  compensado o ajustado del todo) con `VencimientoDeCargoSaldado` (`vencimiento_de_cargo_saldado`, regla de negocio) y audita
  la acción nueva `cambiar_vencimiento` (recurso `cuentas-por-pagar.documentos`) en la misma transacción: `anterior` es la
  ficha como estaba más `vencimientoNuevo`. `puedeCambiarVencimiento` exige saldo del cargo mayor que cero
  (`saldoDelCargoCentavos`). El ajuste de la auditoría no pide migración (la columna `accion` no tiene restricción).
- **2026-11-18 (PC-2, plazo de crédito: plazo por omisión en la lectura).** `GET /api/cuentas-por-pagar/proveedores/:id/condiciones`
  suma `mesesPorOmision` (de la empresa activa, por `PlazoPorOmision`) para que el cliente escriba el plazo real (PC-3). Prueba
  de regresión de API: cambiar los días del proveedor no cambia el vencimiento de sus documentos ya recibidos ni la fecha de
  sus retenciones en Libro de compras. Pendiente: PC-3 (cliente), PC-4 y PC-5 (Excel), PC-6 (QA y documentos).
- **2026-11-18 (PC-3, plazo de crédito: cliente).** El texto del plazo y el campo de días usan `mesesPorOmision` («Un mes», «2 meses»,
  «De contado» con 0; en un proveedor nuevo, aún sin leer, el campo dice «Vacío = el plazo por omisión»). La sección de
  condiciones de Proveedores dice «Vale para los documentos que se reciban desde ahora; los ya recibidos conservan su
  vencimiento». En la ficha del documento, un cargo registrado o autorizado sin saldo muestra «Cambiar vencimiento»
  deshabilitado con su motivo visible; en lo demás el botón sigue oculto si el servidor no lo permite. Lógica pura con pruebas.
  Pendiente: PC-4 y PC-5 (Excel), PC-6 (QA y documentos).
- **2026-11-18 (aviso de pago por correo, paso 1: dominio del correo en core).** Contexto `core/correo` con
  `DireccionDeEnvio` (estricta: ASCII, `atext`, sin comas, comillas, `<>`, CR/LF ni bidi; dominio a punycode), saneado
  de asuntos, nombres y adjuntos, `PlantillaDeCorreo` (marcadores cerrados; uno desconocido es error) y el diseño HTML
  fijo y escapado, sin enlaces ni imágenes. Sin tablas ni migraciones. Diseño: `docs/modulos/diseno-aviso-de-pago-por-correo.md`.
- **2026-11-18 (aviso de pago por correo, paso 3: transporte y prueba).** `nodemailer` 10.6.0 fijo (trae sus propios
  tipos; `npm audit` sin avisos de nodemailer), puerto `TransporteDeCorreo` con `TransporteNodemailer` (un transporte
  agrupado, TLS 1.2 mínimo y certificado válido, sin registros, `envelope` explícito, adjuntos solo en memoria, errores
  reducidos a código) y el doble `TransporteEnMemoria`. Mailpit en `infra/docker-compose.dev.yml` (SMTP 1025, web 8025).
  `redact` de pino para contraseñas, `auth` y cookies (`registro-seguro.ts`). `EnviarPrueba` queda para el paso 2
  (necesita el servidor guardado). El transporte admite `seguridad: 'ninguna'` solo para Mailpit; la tabla de Soporte
  no deberá permitirla en producción.
- **2026-11-18 (aviso de pago por correo, correcciones de la revisión de los pasos 1 y 3).** Mailpit en v1.34.0 y
  publicado solo en `127.0.0.1`. El transporte fija tiempos de espera (conexión 15 s, saludo 15 s, DNS 10 s, socket
  60 s), siempre menores que el arriendo `bloqueado_hasta` de 5 minutos. `seguridad: 'ninguna'` lanza error en
  producción y nunca manda `auth`; el check de la tabla del paso 2 solo admite `tls_directo` y `starttls`. Los errores
  `EENVELOPE`/`EMESSAGE` son permanentes y los de TLS/certificado no gastan intento. El saneado quita caracteres de
  ancho cero y corta por puntos de código; la plantilla rechaza `{ marcador }` con espacios; la redacción de pino cubre
- **2026-11-18 (aviso de pago por correo, paso 7: Terceros).** Migración `0009_avisos_de_pago_en_contactos`:
  `terceros.contactos.recibe_avisos_de_pago boolean NOT NULL DEFAULT false` y el check `contactos_aviso_con_correo`.
  El dominio (`Contacto`) quita la marca si no hay correo y rechaza (`correo_de_contacto_no_sirve_para_avisos`) la marca
  cuando el correo no pasa `DireccionDeEnvio`; el DTO y la API (`recibeAvisosDePago`, falso por omisión) la llevan.
  Cliente: interruptor «Recibe avisos de pago» en la ventana de contacto y en el alta, deshabilitado con el motivo
  cuando falta el correo o no sirve (`avisos-de-pago.ts`), y etiqueta en la lista de contactos de la ficha. El Excel de
  Terceros no maneja contactos y no cambia.
  dos niveles y más nombres de secretos.
- **2026-11-18 — Caja chica y Cuentas por liquidar, diseño corregido tras la revisión de 670b81a4 (solo docs).**
  `docs/modulos/diseno-caja-chica-y-cuentas-por-liquidar.md`: una sola regla de CC-f (A′) en §5.4 g, sin restos de
  «rechazar sin excepción» (§2.5, §5.4 a, §7.2, §9.3, §13, §15, V-3 y V-4): recibir nunca rechaza por retención; la
  factura con retención queda en la bandeja del destino (también la que viene de «Agregar factura» con referencia o de la
  bandeja de DTE del libro) y solo entra al fondo o al anticipo al **asignarla** con `…con-retencion` y motivo; quien
  autorizó es `asignado_por` (sin columna aparte: es el mismo acto) más una auditoría `autorizar`. El motivo no viaja en
  la orden del libro. Bancarización: Caja chica y Cuentas por liquidar suman `monto + monto_retenido` (§5.4 h). Paso
  nuevo **CC-1c / CL-1c** (§4.10, migraciones `0003`): `cuenta_id` con `deLaTransaccion.cuenta()` (con relleno desde
  `core.empresas` para las bases con filas), llave `(proveedor_id, cuenta_id)` a `terceros.proveedores` e índices, y el
  check del motivo solo con el documento asignado. Para el contador: V-12 (nota de crédito en la suma de bancarización) y
  V-13 (check opcional que prohíba retención en una nota de crédito). Pendiente P-CCL-7 (cuenta coherente con la empresa
  y beneficiario por cuenta).
- **2026-11-18 (CC-1c y CL-1c, datos):** migración `0003_cl1c_cuenta_y_motivo_al_asignar` en Caja chica y en Cuentas por
  liquidar: `cuenta_id` (no nula, `default` de la transacción, FK a `core.cuentas` on delete cascade) en
  `caja_chica.comprobantes` y `cuentas_por_liquidar.gastos`, rellenada a mano desde `core.empresas` antes de pedirla no
  nula (sirve en bases con filas); llave `(proveedor_id, cuenta_id)` a `terceros.proveedores` (el único
  `proveedores_id_cuenta_unico` ya existía: sin migración de Terceros); índices `(proveedor_id, cuenta_id)` parcial y
  `(cuenta_id)`; y el check del motivo solo con el documento asignado. No hay columna nueva de quién autorizó: es
  `asignado_por` (diseño §5.4 g). Pruebas de tablas: proveedor de otra cuenta rechazado en vales de gasto, gastos sin
  documento y documentos; retención en la bandeja sin motivo, asignada sin motivo y motivo sin retención. Sin migraciones
  del core ni de Bancos. Pendientes: los casos de uso y mapeadores no escriben `cuenta_id` (lo pone la transacción);
  la prueba de la migración sobre una base con filas no está automatizada.
- **2026-11-18** (CC-1c / CL-1c, cierre): las descripciones de `caja-chica.comprobantes.con-retencion` y
  `cuentas-por-liquidar.gastos.con-retencion` pasan a «Asignar a un fondo / a un anticipo un documento con retención
  (excepción)…», porque con CC-f = A′ registrar no pide el permiso, lo pide quien asigna. Solo texto, sin migración. Las
  migraciones `0003` con `cuenta_id`, la llave `(proveedor_id, cuenta_id)` y los checks ya estaban en el commit anterior.
- 2026-11-18 — **Excel de Empresas (exportar e importar)**: `GET /empresas/exportar`, `GET /empresas/plantilla` y
  `POST /empresas/importar` con los permisos `empresas.exportar` y `empresas.importar` (migración `0010` en `empresas`: quien
  tenía `empresas.editar` recibe exportar y quien tenía `empresas.crear` recibe importar, en roles y permisos directos).
  Columnas: nombre, NIT, dirección, teléfono, correo y activa (las del formulario de crear). Fuera quedan los datos fiscales
  (`secciones` de Libro de compras) y la fecha de inicio, que se completan en la ficha de la empresa, y las empresas
  existentes (importar solo crea, no actualiza). Cada fila pasa por `RegistrarEmpresa` (acceso del creador, tipos de
  localidad iniciales y avisos a los módulos). Para que fuera todo o nada con una empresa distinta por fila,
  `UnidadDeTrabajo` gana `ejecutarEnEmpresaNueva` (punto de guardado dentro de la transacción en curso, solo para la misma
  cuenta y usuario, que devuelve la empresa anterior al terminar); `RegistrarEmpresa` la usa en vez de `ejecutar`. Pruebas
  de API (ensayo, semilla, todo o nada, 403) y de la unidad de trabajo.
- 2026-11-18 — **Excel de Empresas en el cliente**: la lista de Empresas muestra `AccionesDeIntercambio` y
  `VentanaDeImportacion` con `empresas.importar` y `empresas.exportar`; al importar se recarga la lista y la sesión (para que
  el selector de empresa vea las nuevas).
- 2026-11-18 — **Selector de empresa del encabezado con buscador**: `SelectorEmpresa` usa `CampoSelector` (buscador
  desde 8 empresas, teclado y panel flotante que cabe en celular). Las opciones salen de `opcionesDeEmpresa` (lógica pura
  con pruebas): ordenadas por nombre y agrupadas por cuenta solo si hay más de una. El cambio sigue siendo
  `sesion.cambiarEmpresa` y llevar al inicio; elegir la empresa ya activa no hace nada.
- 2026-11-18 — **Acotar el cambio de empresa de la unidad de trabajo**: `ejecutarEnOtraEmpresa` pasa a ser
  `ejecutarEnEmpresaNueva`: solo acepta una empresa que no existe aún en `core.empresas` ni se abrió antes en la misma
  transacción (si no, lanza `EmpresaNoEsNueva`, con o sin acceso del usuario); mantiene misma cuenta y mismo usuario y
  devuelve la empresa anterior al salir (el punto de guardado deshace también las variables si el trabajo falla). Así ningún
  caso de uso puede saltar a una empresa existente. Pruebas: dos empresas en un libro (todo o nada) y rechazos. Además,
  `SelectorEmpresa` recupera la apariencia de marca con `CampoSelector variante="marca"` y el texto «Elija una empresa».
- **Revisión de seguridad de `ejecutarEnEmpresaNueva`:** (1) firma acotada `ejecutarEnEmpresaNueva(empresaId, trabajo)`: el
  contexto sale de la transacción en curso (`{ ...contexto, empresaId }`), así no se cambia de cuenta, usuario ni alcance;
  sin transacción falla (`RegistrarEmpresa` abre la suya con `ejecutar`). (2) La comprobación de que el id no existe
  consulta `core.empresas`, que hoy no tiene RLS; queda documentado en TSDoc y una prueba falla si alguien se la pone. Sin
  migración; la alternativa si algún día se le pone RLS es una función `security definer` `core.empresa_existe(uuid)`.
  (3) Al salir se exige que la empresa exista con la `cuenta_id` del contexto y `creado_en = now()` (inicio de la
  transacción; `marcasDeTiempo` usa `defaultNow()`), si no, `EmpresaNoEsNueva`. (4) Pruebas: empresa de otra cuenta, usuario
  con acceso real a una empresa existente, trabajo que no crea la empresa, que la crea en otra cuenta, y sin transacción.
- **Defensa en profundidad de `ejecutarEnEmpresaNueva`:** (1) se comprueba **antes** de cambiar `app.empresa_id`: quien
  llama inserta la empresa en `core.empresas` con la empresa de afuera (la tabla no tiene RLS) y el método exige que exista
  con ese id, la `cuenta_id` del contexto y `creado_en = now()`; si no, `EmpresaNoEsNueva` y nunca se trabaja en una empresa
  no probada. `RegistrarEmpresa` agrega la empresa afuera y siembra acceso, tipos de localidad y secciones adentro. Si
  `core.empresas` llega a tener RLS, la consulta debe ir por una función `security definer`. (2) `creado_en` lo pone la base
  (`defaultNow()`), amarrado con pruebas de la tabla y del mapeador. (3) Una segunda empresa nueva mientras otra sigue
  abierta en la misma transacción se rechaza con `EmpresaNuevaYaEnCurso` (prueba con llamadas en paralelo). (4) Los dobles
  `UnidadDeTrabajoEnMemoria` y `UnidadQueDeshace` fallan como el real: sin transacción abierta lanzan y rechazan un id repetido.
  (5) `aislar` y `ejecutarEnEmpresaNueva` recortan las tareas de `despuesDeConfirmar` y `siSeDeshace` registradas dentro de
  un punto de guardado que se deshace (no corren).
- **2026-11-18, corrección a lo anterior (5): las compensaciones de `siSeDeshace` no se descartan.** Al deshacerse un
  punto de guardado (`aislar`, `ejecutarEnEmpresaNueva`) solo se recortan las tareas de `despuesDeConfirmar`; las de
  `siSeDeshace` (borrar un archivo ya escrito, `GestorDeDocumentos`) se sacan de la lista y **corren en ese momento**,
  después del rollback del punto, con el mismo manejo de errores (registrar y seguir), y no vuelven a correr si luego se
  deshace toda la transacción. Antes el archivo quedaba huérfano en disco si la transacción de afuera confirmaba. Pruebas:
  unidad de trabajo (orden, una sola vez, fallo registrado) y de punta a punta con `GestorDeDocumentos`.

- **2026-11-18 — Dependencias: avisos de `npm audit`.** Antes: 25 (2 bajas, 21 moderadas, 2 altas: zod < 4.6.6 y vite
  8.3.0–8.3.2). Después: 13, todas moderadas y solo de desarrollo, ninguna alta. Subidas dentro de la misma versión mayor:
  zod 4.6.5 → 4.6.7 (`servidor`), vite 8.3.1 → 8.3.8 (`cliente`), y en el `package-lock.json` fastify 5.12.8, vitest 5.1.1
  (con `@vitest/mocker`), fast-uri 3.1.9/4.x, ip-address y serialize-javascript. Sin cambios de código: las notas de zod 4.6.x
  y vite 8.3.x son solo correcciones. `npm audit fix` y `npm update` fallan con un error del propio npm 10.9.9
  (`edgesOut`), así que se instaló zod y vite con `npm install <paquete>@<versión> -w <workspace>` y se re-resolvieron las
  demás quitando sus entradas del lock. **Pendientes (versión mayor, no se hizo):** `minimatch` 10.2.6 (por eslint 10 y
  typescript-eslint; el parche es 11.0.9, mayor) y sus dependientes `glob`/`@eslint/config-array`; `esbuild` 0.18 dentro de
  `@esbuild-kit` (de drizzle-kit; `audit fix --force` bajaría drizzle-kit a 0.18.1, no se hace). Ambos solo en desarrollo.
- **2026-11-18 — CP5-9b (cliente, efectivo y transitoria: R9, R10, R11 y conciliación al pie de R1).** Sin cambios de contrato en el
  servidor; solo se corrige el Excel: la columna «Forma» de R9 (y la de R6, que tenía el mismo defecto) sale con su nombre («Nota de
  débito ligada», «Efectivo»…) desde `dominio/nombres-de-formas.ts`, con prueba. Pantallas en `seccion: 'reportes'`: **Pagos en
  efectivo sobre el umbral** (R9, `reportes-de-control`; desde y hasta como mes de una lista de 60, máximo 48 con el error dicho antes de
  pedir; «Solo con efecto fiscal» sí por omisión; una tarjeta por proveedor y mes con sus pagos y cargos, marcas de IVA en riesgo y
  costo no deducible, «IVA no conocido», la excepción con su motivo; sección propia de documentos sobre el umbral con todos sus pagos
  por forma; sin tablas, así que no hay desplazamiento horizontal), **Retiros de efectivo por liquidar** (R10, filtros de corte y
  custodio, «de un mes anterior») y **Notas de débito sin aplicar** (R11, corte por omisión al fin del mes anterior, cuenta bancaria;
  el selector de cuentas se arma con las cuentas que ya trajo el reporte, sin importar Bancos). R10 y R11 son de `reportes-de-pagos`;
  tarjetas en celular y tabla en pantalla grande. R1 gana al pie «Conciliación con pagos por aplicar» (auxiliar − R11 = Proveedores
  neto) solo cuando el servidor la manda, con enlace a R11 al mismo corte (visible con el permiso de pagos). Los rótulos de saldo y de
  estado de pago no se tocaron (adenda del posfechado). Pendiente: los retiros no tienen pantalla propia en Cuentas por pagar, así que
  R10 muestra su número como texto.

- **2026-11-18 — Correcciones de la QA intermedia** (`informe-qa-intermedia-2026-11-18.md`). Corregidos: error 1 (el concepto guardado de una
  nota marcada o con concepto inactivo ya no se borra al abrir la corrección; las dos `it.fails` pasaron a `it`); 3 (R3 con rango
  inválido limpia el reporte y deja el mensaje junto al campo «Desde»); 4 («Mostrar anulados» se apaga y se deshabilita en «Para el
  proveedor»); 5 (R2 dice con palabras lo que filtra desde «Más filtros»); 6 (NIT de la empresa en el encabezado impreso, que llega
  en `empresa.nit` de la sesión, y sin «Emitido por» en «Para el proveedor»); 7 (Excel de R12 con columna Sección, filas `Total` y
  `Nota` —mes, filtros y leyenda— y el documento como en pantalla); 8 y 9 (`moduloDeOrigen` en el cheque de Bancos: el diálogo de
  anular avisa que también se anula el pago de Cuentas por pagar y la tarjeta dice el origen); 10 (`montoLegible` en
  `core/compartido/dominio`: «Q 12,360.00» y «-Q 16,010.00» en el saldo insuficiente y en los avisos de saldos de CP5); 11 (una sola
  entrada del menú a las constancias pendientes: la de Libro de compras); 12 (Estado de cuenta lee `desde`, `hasta` y `presentacion`
  del enlace; la lista de Cheques lee `cuentaBancariaId`, `estado`, `desde` y `hasta`, y su «Hasta» queda vacío para que entren los
  posfechados); 13 (aviso de saldos proyectados con un corte futuro en R1); 14 (la explicación de la tarjeta de la nota se lee
  completa: `DetalleDeRegistro.largo`); 16 (columna «Acciones» pegada al borde en Movimientos; los Excel de reportes llevan una sola
  hoja, sin «Instrucciones», con `soloExportar`; nombre del proveedor más grande que el NIT al imprimir R1). Parcial: error 15 (con
  Cuentas por pagar apagado la tarjeta ya no ofrece lo que el servidor rechazaría). **Pendientes:** 15 (nota ligada a un pago: Bancos
  no sabe que está ligada, hace falta decidir cómo se lo dice Cuentas por pagar; sigue el `it.fails` de la API), 2 (adenda en cola) y
  el formato «Q 1,000.00» en el resto de los mensajes del servidor (~56 usos de `quetzales()` y los de Libro de compras: cambia
  muchas pruebas de otros pasos).
- 2026-11-18 · QA intermedia, segunda ronda de correcciones. Se recortó el archivo de pruebas de saldos de Cuentas por pagar al
  límite de ESLint; el concepto de una nota guardada se conserva al cambiar el tipo solo si sigue siendo compatible; el NIT del
  encabezado de impresión sale con guion (`formatearNit`) también en el encabezado de `core` (Constancias pendientes); el error
  del rango del estado de cuenta ya no mezcla fallos del servidor con las fechas.
- **2026-11-18 — CP4-E5 (cliente, pagos en efectivo).** Sin servidor ni migración. **Retiros** (`/cuentas-por-pagar/retiros`,
  menú «Retiros de efectivo», Operación): lista «por liquidar» con filtros de estado, **fecha de corte** (el disponible es el de ese
  día), «solo los que aún tienen efectivo», total disponible, antigüedad del efectivo y el aviso de fin de mes del servidor;
  `VentanaDeRetiro` (cheque o retiro en ventanilla/cajero, chequera o cuenta con su siguiente cheque, monto, fecha no futura, custodio
  escrito o usuario de Arrancar —solo con `usuarios.ver`—, beneficiario por omisión el custodio y sin «al portador», «no negociable»
  encendido, boleta, ayuda IVE-BA-03, resumen para confirmar) que al registrar muestra los avisos de bancarización y de Bancos y lleva
  a «Pagar en efectivo»; `FichaDeRetiro` (datos, liquidación, anulación, pagos con enlace y «Imprimir los recibos»), `VentanaDeLiquidacion`
  (sobrante calculado; lo devuelto y el faltante se completan entre sí para que siempre cuadren; motivo del faltante; cuenta y boleta del
  depósito; aviso si liquida el custodio), reabrir y anular con `VentanaDeCambioDeRetiro` (resumen, motivo y fecha opcional del movimiento
  en Bancos). **Reparto** (`/cuentas-por-pagar/retiros/:id/pagar`; desde la contraseña, «Pagar en efectivo» lleva a
  `/cuentas-por-pagar/pagos/efectivo`, que escoge el retiro o pasa directo si hay uno solo): retiro con «Disponible» y «Quedará» en vivo
  (rojo si se pasa), «Agregar un proveedor» (selector por nombre, solo los que aún no están), una sección plegable por proveedor que
  **reutiliza `CargosDelPago`/`FilaDeCargoDelPago` de CP4-9** (cargos por contraseña, varias contraseñas, montos propuestos, diferencias
  de centavos), quién recibe, recibo del proveedor y fecha (una para todos, cambiable por proveedor), resumen de confirmación con una
  línea por proveedor y un solo «Registrar los pagos» (todo o nada; límites de 20 proveedores y 300 documentos revisados antes). Los
  errores del servidor (`pagos.<i>.…`) vuelven a su proveedor y a su documento. **Bancarización:** el cliente no adivina la regla ni el
  régimen; solo anticipa con un aviso neutro que lo del mes llega al umbral (`sumaDelMesAlProveedor` + el pago); si el servidor bloquea
  (`efectivo_sobre_el_umbral`), el proveedor muestra el texto del bloqueo y, con `pagos.efectivo-sin-bancarizar`, pide el motivo (se
  reenvía), y sin el permiso dice que lo pague con cheque. Al terminar: pagos con su número, «Imprimir los recibos» (`/pagos/recibos?pagos=id,id`,
  `RecibosDeEfectivo`: original y copia de cada recibo con `HojaDelComprobante`; el que falle no impide imprimir los demás) y «Repartir otra
  vez». `ComprobanteDePago` titula «Recibo» y explica que el original firmado se queda en la empresa; anular un pago en efectivo dice
  que el efectivo vuelve al retiro (sin fecha de inverso). Lógica pura con pruebas: `edicion-de-retiro`, `liquidacion`, `retiros`
  (lista, ficha y opciones), `reparto-de-efectivo` (totales, errores, cuerpo, errores del servidor, resumen), `recibos-de-efectivo`.
  Diferencias con el diseño: `GET /proveedores/:id/para-pagar` aún no devuelve `efectoFiscal` ni `sinDatosFiscales` (el diseño §7.5 lo
  prometía), por eso el bloqueo se atiende cuando el servidor lo dice y no se anticipa por régimen; el ensayo de la fecha en el reparto
  usa el mes de la fecha de cada proveedor solo al agregarlo. Pendiente: cotejar el texto de la ayuda IVE-BA-03 con la Ley contra el
  Lavado de Dinero (E-9) y la prueba de punta a punta en navegador (CP4-12).
- **2026-11-18 — CP4-E5, correcciones de la revisión (cliente).** «A nombre de» del cheque toma el nombre del usuario elegido
  como custodio (ya no valida el texto viejo del custodio). Los errores generales de un proveedor del reparto
  (`general`, `sinDatos`, p. ej. más de 100 documentos por pago, que ahora se avisa antes de enviar) se muestran en su
  proveedor. Quien puede pagar sin bancarizar ve el texto legal (E-5: art. 20 del Decreto 20-2006, ISR/IVA, rectificar
  según el art. 106 del Código Tributario) junto al bloqueo; el anticipo cubre la factura de Q30,000 o más pagada por
  partes y la suma del mes se vuelve a traer cuando la fecha cambia de mes. En la ficha del retiro solo el enlace depende
  de `pagos.ver` (la lista se ve con `retiros.ver`) y se avisa si hay más de 20 recibos. Pendiente: ocultar «Retirar
  efectivo» y «Pagar en efectivo» a quien no tiene `pagos.ver` (los medios salen de `GET /pagos/medios`).
- **2026-11-18 (EM-2, revisión de seguridad y decisión del usuario).** Cada subida del balance de apertura se audita con la
  acción `adjuntar` en `empresas.cargas-iniciales` (también con la carga cerrada) y se ve en el historial; exportar un cierre
  exige en el servidor `empresas.carga-inicial.exportar` **y** `.ver-cierres`. *Decisión del usuario:* la línea «Cerrada el …
  por …, con N diferencias» la ve quien ve la empresa; **el texto del motivo y el detalle piden `ver-cierres`**.
- **2026-11-18 (EM-2, correcciones de la revisión de seguridad, hecho).** M-1: cada subida del balance deja la entrada
  `adjuntar` (acción nueva de `AccionAuditada`; `anterior` lleva el balance como quedó) y el historial de la carga la
  muestra («Balance de apertura adjuntado», servidor y cliente). B-1: la firma `%PDF` se comprueba antes de `revisar`, sin
  pasar una foto por sharp; el tipo se sigue comprobando después. B-2: exportar un cierre exige `exportar` y `ver-cierres`
  en la ruta. Decisión del usuario: `CargaInicialDto.ultimoCierre` sale con `motivo` y `avisos` en `null` para quien no
  tiene `ver-cierres` (`http/carga-segun-permiso.ts`, aplicado en todo lo que devuelve la carga); la línea con las
  diferencias se sigue viendo y el cliente no muestra avisos ni motivo cuando no llegan. B-4: la prueba de cabeceras del
  balance comprueba `nosniff` y la CSP.

- **2026-11-18 · PC-4 (servidor): Excel «Plazos de proveedores».** `GET/POST /api/cuentas-por-pagar/condiciones/{exportar,plantilla,importar}`
  con `core/intercambio`, permisos `cuentas-por-pagar.condiciones.importar` (migración `0013`: quien tenía
  `proveedores.editar`) y `.exportar` (quien tenía `terceros.ver`), en `core.rol_permisos` y `core.usuario_permisos`.
  Columnas NIT, Proveedor, Días de crédito y Contar desde la recepción; la validación reutiliza el esquema de la sección
  del formulario. El proveedor se halla por NIT o, sin NIT, por nombre exacto y único en la cuenta (nombre repetido,
  proveedor inexistente y proveedor repetido en el archivo son errores de fila); nunca se crean proveedores. Días vacíos
  vuelven al plazo por omisión y «contar desde la recepción» vacío es No. Todo o nada, con ensayo.
- **2026-11-18 (PC-5, plazos de proveedores: cliente).** Página «Plazos de proveedores» en Administración de Cuentas por
  pagar (`/cuentas-por-pagar/plazos`, permiso `terceros.ver`): tarjetas de solo lectura con proveedor, NIT, días de crédito
  («De contado», «Plazo por omisión de la empresa») y desde cuándo corren, búsqueda por nombre o NIT sin tildes y estados vacíos
  distintos (sin proveedores / sin coincidencias). `AccionesDeIntercambio` y `VentanaDeImportacion` con
  `cuentas-por-pagar.condiciones.importar` y `.exportar`; el texto de la página manda a Proveedores para editar uno por uno.
  El servidor suma `GET /api/cuentas-por-pagar/condiciones` (lista de la cuenta, mismo caso de uso del Excel, permiso
  `terceros.ver`); sin migración. Lógica pura con pruebas.
- **2026-11-18 (respuestas del usuario).** *Posfechado, A.7:* «Disponible para pagar» en R1 es igual que en la ficha
  (deuda de los cargos menos lo comprometido; lo que está a favor en su columna). *Caja chica:* factura especial sin permiso
  de excepción; «pagó el total y no retuvo» se asigna por el total con cuenta por cobrar; check sin retención en notas de
  crédito; V-12 sin cambio. *RLS del núcleo:* todas las recomendaciones de `diseno-rls-de-core.md` (R-1 a R-3 ya, R-4
  después). Detalle al final de cada diseño.
- **2026-11-18, CP4-D1, D3 y D4 (servidor): deuda, comprometido y disponible.** En los DTO de operación (ficha y lista de
  documentos, resumen del proveedor, contraseña con su lista e impresión, cargos para pagar y para aplicar, proveedores por
  pagar, ficha del pago y comprobante) `saldo` es la **deuda** (la cifra de R1) y van al lado `comprometido`, `disponible` y
  `comprometidoHasta`; `vencido` cuenta lo comprometido (el proveedor trae además `vencidoComprometido` y hasta 10
  `posfechados`). `SaldoDelDocumento` pasa a `deudaCentavos`, `comprometidoCentavos` y `disponibleCentavos`; lo que limita un
  pago, una nota o un ajuste sigue usando lo disponible, así que la protección contra el doble pago no cambia. **Cinco
  estados de pago** (`pendiente`, `en_parte`, `comprometido_en_parte`, `comprometido`, `pagado`) en un solo lugar
  (`estadoDePagoDe`, `dominio/pagos.ts`) y una sola expresión de SQL (`expresionDeEstadoDePago`) para R2 y el filtro de la
  lista; R2 ya no dice «Pagado en parte» con Pagado 0.00. `puedeCambiarVencimiento` y `cambiar-vencimiento` miran la deuda:
  un cargo comprometido entero aún se debe y su plazo se puede corregir. Los pagos de la ficha traen `numeroDeCheque`. Sin
  migración. Pendiente: D5 a D7 (cliente), D6 servidor (`disponible` en R2 y R1, a la espera de la respuesta a A.7).
- **2026-11-18, CP4-D5 y D7 (cliente): deuda, comprometido y disponible.** La ficha del proveedor dice «Por pagar Q…, de lo cual
  comprometido con cheque N al dd/mm Q…, Disponible para pagar Q…» y lo vencido con su nota (lo comprometido vencido sigue siendo
  deuda hasta que el cheque se cobre; si el servidor mandó solo 10 cheques, lo avisa). Lista y ficha del documento: Saldo (la deuda),
  «Comprometido — cheque al dd/mm/aaaa» (con varios cheques, cuántos y la fecha del último) y Disponible, este último solo si hay
  algo comprometido. Cinco estados con etiqueta y color (nuevo «Comprometida en parte») y el filtro de Documentos por pagar con los
  cinco. La contraseña (cargos y totales) muestra lo comprometido y lo disponible. NuevoPago, el reparto de efectivo y la
  reaplicación proponen y limitan por lo **disponible**; el error dice cuánto está disponible y cuánto ya está comprometido; el
  selector de proveedor agrega «(disponible Q…)» solo si difiere. Lógica pura en `composables/comprometido.ts` con pruebas.
  Pendiente: D6 (R2 y R1 con `disponible`, a la espera de A.7) y los reportes que no se tocaron.

- **2026-11-18, correcciones de la revisión de posfechado.** R2 (cliente) acepta el quinto estado `comprometido_en_parte`
  (tipo compartido con Pagos, texto, tono y filtro). «Registrar pago» y «Pagar en efectivo» de la contraseña filtran los cargos por
  `disponible > 0` y no por `saldo` (la deuda). En el selector de Nuevo pago, `porPagar` suma la deuda de todos los cargos
  autorizados del proveedor y `disponible` solo los cargos con algo disponible (`having bool_or(disponible > 0)`). Quedan
  pendientes, por menores: unificar en `textos.ts` los nombres de estado, «comprometido con cheque N al dd/mm» en la contraseña,
  columnas Pagado y Comprometido en la contraseña impresa, y actualizar la adenda A.4 (`hechosDe` usa la deuda, a propósito).

- **2026-11-18, CCL-L1: referencia de destino en el libro.** `POST /libro-de-compras/documentos` acepta `referenciaDeDestino` (uuid, opcional) y el libro la pasa tal cual en `DocumentoParaDestino` a `<destino>.recibir_documento` (no la guarda ni la valida; sin migración). Ingreso de facturas lee `?referencia=&etiqueta=&volver=` (`referencia-de-destino.ts`: la referencia debe ser uuid y la vuelta una ruta interna); la etiqueta se muestra como «Destino: …», `volver` pone el enlace «Volver» y la referencia viaja en el cuerpo de registrar. Sin la referencia todo queda igual. Decisión: el evento `documento_registrado` no la lleva (solo la orden al destino).

- **2026-11-18, CCL-BZ: bancarización compartida (Libro de compras y Cuentas por pagar, servidor).** Libro de compras atiende la orden `libro-de-compras.evaluar_bancarizacion` (`EvaluarBancarizacion`): toma primero el bloqueo `libro-de-compras.bancarizacion:<empresa>:<proveedor>`, pregunta `libro-de-compras.pagado_al_proveedor_en_el_mes` con `preguntarATodos` (suma efectivo + bancarizado de lo que respondan), mira el efecto fiscal por documento (régimen de IVA copiado y ISR del período) o, en un saldo inicial, el `efectoDeSaldoInicial` que trae quien llama, y responde `libre | avisar | bloquear` con mensaje, efecto y lo pagado. La regla pura (`bancarizacion-en-efectivo.ts` y su prueba) se mudó de Cuentas por pagar al libro; el texto dice «Arrancar solo suma los pagos registrados en Arrancar» (también el del cliente de Cuentas por pagar). El umbral es ahora `libro-de-compras.bancarizacion.umbral` (instalación, Q30,000) y Cuentas por pagar lo lee de ahí; migración de datos `0038_bancarizacion_compartida` (custom, repetible) copia la fila de instalación de la clave vieja; **el JSON de instalación (`RUTA_CONFIG_INSTALACION`) no se migra: soporte debe renombrar la clave a mano.** Cuentas por pagar responde la pregunta con sus pagos vigentes del mes (`ResponderPagadoAlProveedor`; etiquetas «Recibo N/AAAA»), su `EvaluadorDeBancarizacion` llama la orden en vez de sumar y su bloqueo usa la clave nueva. Caja chica y Cuentas por liquidar todavía no responden: solo queda el contrato. Decisiones: el aviso de bancarización de los pagos con cheque, nota de débito o nota ligada (`avisosDeBancarizacion`, CP4) y el reporte R9 siguen contando solo Cuentas por pagar (R9 hasta P-CCL-3); la orden evalúa solo efectivo. Pruebas: las de CP4-E3 sin cambios; nueva API con un destino de prueba que responde y hace que un pago de Cuentas por pagar llegue al umbral.

- **2026-11-18, Activos fijos AF-0 (Libro de compras).** Un servicio puede ser activo fijo (AF-P5 = b, dictamen E1). Migración
  `0037_af_servicio_capitalizable`: se quitan los checks `lineas_de_documento_activo_fijo_es_bien` y
  `conceptos_de_gasto_activo_fijo_es_bien` y se agrega el único `lineas_de_documento_llave_unica (id, documento_id, empresa_id)`,
  destino de la llave compuesta de `activos_fijos.costos`. Se quitaron la regla del dominio del concepto y la del resolutor de
  líneas (combustible e IDP siguen exigiendo bien). `categoriaSql` manda a la casilla de activos solo `es_activo_fijo and tipo =
  'bien'`; el servicio capitalizado queda en servicios del SAT-2237. El análisis «Activos fijos comprados» muestra todos y suma la
  columna «Es un» (bien o servicio, también en el Excel). Cliente: ya no se fuerza «Bien» al marcar activo fijo y el texto es
  «Activo fijo (se capitaliza)».
