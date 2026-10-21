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
      la app usa unos 72 MB de RAM.
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
  además 60 meses como mínimo en la base (`core.depurar_auditoria`).

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
