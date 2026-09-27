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

### 3.3 Multiempresa y acceso a datos (a nivel de base de datos)

- Jerarquía: **Plataforma → Cuenta (suscriptor) → Empresas → Usuarios con rol por empresa**.
- Cada petición corre en `ejecutarEnEmpresa(...)`, que fija `app.empresa_id`,
  `app.usuario_id` y `app.alcance_total` en la transacción.
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

1. **Pantalla / módulo**: p. ej. `bancos.cuentas.administrar`.
2. **Acción / botón**: p. ej. `bancos.pagos.registrar`, `bancos.cheques.emitir`.
   El servidor valida con `proteger({ permiso })` y el cliente oculta el botón con
   `v-permiso`.
3. **Datos (alcance por registro)**: qué registros concretos puede usar el
   usuario (p. ej. solo las cuentas bancarias 1 y 3).
   - El módulo declara `recursosConAlcance` y protege la tabla con
     `politicaPorAlcance('bancos.cuentas')` (política RLS restrictiva).
   - Las asignaciones viven en `core.accesos_datos`.
   - Con el permiso "ver todos" del recurso, o con un rol de acceso total, se
     ven todos los registros.
   - Tener acceso a los datos de una cuenta **no** da acceso a las pantallas de
     administración (eso es el nivel 1).
   - Probado en `alcance-datos.prueba.ts`.

Roles por cuenta; el rol con **acceso total** recibe también los permisos de
módulos que se activen después. Siempre debe quedar al menos un rol con acceso total.

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
| Comunicación entre módulos | Observer | `core/eventos/bus-eventos.ts` |
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
| **terceros** | En construcción (fase 1) | Servidor y cliente listos; ver `docs/modulos/terceros.md`. |
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

## 6. Ideas por planificar (no programar todavía)

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
