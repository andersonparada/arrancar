# Arrancar — Plan y decisiones

Documento vivo: aquí se registra lo acordado, lo que está en curso y lo que falta
planificar. Se actualiza en cada iteración (ver la bitácora al final).

## 1. Visión

Convertir un rancho ganadero y una parcela con varias siembras en una empresa
ordenada: ganado, siembras, dinero, inventario, maquinaria, trabajadores,
clientes y proveedores, con un panel de recordatorios diarios.

- Aplicación web instalable (PWA). **Solo funciona con internet**: el service
  worker guarda la estructura de la app, nunca los datos.
- Multiempresa: varias personas (familia) tienen ranchos; nadie ve los datos de
  otro. Un usuario puede tener acceso a 1 o N empresas.
- Pensada como **SaaS** (venderla a otros ganaderos) y también para instalarse
  en un servidor dedicado de un cliente.
- País: **Guatemala** (quetzales, con cuentas en dólares; NIT; FEL de la SAT).

## 2. Tecnologías

| Parte | Elección |
|---|---|
| Base de datos | PostgreSQL 16 |
| Backend | Node.js 22 + TypeScript + Fastify 5 + Drizzle ORM + Zod |
| Frontend | Vue 3 + Vite + Tailwind 4 + Pinia + vue-router, PWA con vite-plugin-pwa |
| Despliegue | Docker Compose: Caddy (HTTPS automático) + app + PostgreSQL + respaldo diario |
| Servidor objetivo | VPS de 4–6 USD/mes (1–2 GB de RAM) |
| Desarrollo | WSL Ubuntu 22.04, PostgreSQL en Docker (puerto 5433) |

## 3. Arquitectura

### 3.1 Módulos

- Cada módulo vive en `servidor/src/modulos/<clave>/` y `cliente/src/modulos/<clave>/`.
- Carpetas por tipo: `esquemas/`, `migraciones/`, `repositorios/`, `servicios/`,
  `controladores/`, `rutas/`, `validaciones/`, `eventos/`, `estados/`.
- Todo módulo declara un `modulo.ts` (`DefinicionModulo`): clave, nombre,
  dependencias (`dependeDe`), permisos, recursos con alcance, configuración y rutas.
- Lo que usan todos los módulos va en **core**.
- Los módulos se **activan por cuenta** (SaaS). Un módulo solo se activa si sus
  dependencias están activas (p. ej. *Caja chica* depende de *Bancos*); no se
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

| Necesidad | Patrón | Dónde |
|---|---|---|
| Verificación de cada petición (sesión → empresa → módulo → permiso) | Chain of Responsibility | `core/http/guardias.ts` |
| Alta de un suscriptor (cuenta + empresa + rol + usuario + módulos) | Facade | `core/servicios/alta-cuenta.servicio.ts` |
| Dónde se guardan los archivos (disco hoy, S3/R2 mañana) | Strategy | `core/almacenamiento/almacenamiento.ts` |
| Comunicación entre módulos, después de confirmar | Observer | `core/eventos/bus-eventos.ts` |
| Comunicación entre módulos, dentro de la misma transacción (órdenes y avisos) | Mediator | `core/mediador` |
| Registro único de módulos | Singleton | `core/modulos-sistema/registro-global.ts` |
| Estados (siembra, animal, préstamo, tarea) | State | pendiente |
| Frecuencia de recordatorios | Strategy | pendiente |
| Canales de notificación (push, correo, WhatsApp) y certificadores FEL | Factory Method + Adapter | pendiente |
| Reportes de rentabilidad | Template Method | pendiente |
| Terrenos (finca → potrero → parcela) | Composite | pendiente |
| Duplicar siembra o plan sanitario | Prototype | pendiente |

### 3.9 Convenciones de código

- Todo en español: nombres, mensajes y documentación.
- TSDoc en funciones públicas; sin comentarios que no aporten.
- Controladores delgados; reglas en servicios; SQL en repositorios.
- Validación de entrada con Zod en `validaciones/`.
- Respuestas de error uniformes: `{ error: { codigo, mensaje, detalles } }`.

## 4. Estado de los módulos

| Módulo | Estado | Notas |
|---|---|---|
| **core** | En construcción (fase 1) | Ver sección 5 |
| **empresas** | En construcción (fase 1) | Datos generales de ranchos y parcelas. Esencial. |
| **terceros** (se muestra como **Clientes**) | En arquitectura limpia | Clientes y proveedores; ver `docs/modulos/terceros.md`. |
| Resto | **Por planificar** | Ver sección 6. No se programa nada hasta acordarlo. |

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
  cuentas con distinta moneda (las cuentas en USD requieren *Moneda extranjera*).
  Alcance por usuario sobre las cuentas.
- **Caja chica**, **Cuentas por pagar**, **Cuentas por cobrar**, **Anticipos por
  liquidar**: módulos separados que dependen de *Bancos*. Segregación de funciones
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
