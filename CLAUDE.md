# CLAUDE.md

Guía para trabajar en este repositorio. El plan, las decisiones y lo pendiente
están en `docs/PLAN.md`: léelo antes de empezar y actualízalo (incluida la
bitácora) cuando cambie algo acordado.

## Proyecto

Arrancar: PWA multiempresa para administrar ranchos ganaderos y parcelas
(Guatemala). SaaS con cuentas suscriptoras, empresas por cuenta y módulos
activables. Solo funciona con conexión: el service worker no guarda datos.

- `servidor/`: Node 22 + TypeScript + Fastify 5 + Drizzle ORM + Zod + PostgreSQL 16.
- `cliente/`: Vue 3 + Vite + Tailwind 4 + Pinia + vue-router + vite-plugin-pwa.
- `infra/`: Docker Compose de desarrollo (solo PostgreSQL) y de producción
  (Caddy + app + PostgreSQL + respaldo).

**Se programa solo lo que ya está acordado en `docs/PLAN.md`.** Los módulos de
negocio (ganado, siembras, bancos…) se planifican con el usuario antes de escribir código.

## Comandos (dentro de WSL, en la raíz del proyecto)

```bash
npm run dev                               # PostgreSQL + API (:3100) + PWA (:5180) juntos
npm run bd:levantar                       # PostgreSQL de desarrollo en el puerto 5433
npm run bd:migrar -w servidor             # aplica migraciones de todos los módulos
npm run bd:sembrar -w servidor -- --demo  # usuario de soporte + cuenta demo
npm run dev:servidor                      # API en :3100, documentación en /api/documentacion
npm run dev:cliente                       # PWA en :5180 (proxy de /api al :3100)
npm run probar                            # pruebas del servidor (Vitest, base arrancar_pruebas)
npm run verificar                         # tsc del servidor y vue-tsc del cliente
npm run revisar                           # Prettier + ESLint + verificar: correr antes de cada commit
npm run formatear                         # aplica Prettier y las correcciones automáticas de ESLint
npm run bd:generar -w servidor -- <modulo> <nombre> [--custom]
```

Las pruebas de integración usan PostgreSQL real (`arrancar_pruebas`), así que la
base de desarrollo debe estar levantada.

## Arquitectura

**El código nuevo sigue `docs/ARQUITECTURA.md`** (capas dominio, aplicación,
infraestructura y http; POO con inyección por constructor; casos de uso de una
clase). La base está en `servidor/src/modulos/core/compartido/`: `UnidadDeTrabajo`
en vez de `ejecutarEnEmpresa`, `ErrorEsperado` y sus familias en vez de
`core/errores`, objetos de valor `Nit`, `Dpi`, `Correo`, `Telefono`. Lo descrito
abajo es el estado del código aún no migrado (fases 3 a 7).

### Módulos
- Cada módulo: `servidor/src/modulos/<clave>/` y `cliente/src/modulos/<clave>/`, con
  un `modulo.ts` que exporta su definición y se registra en `modulos/indice.ts`.
- Carpetas por tipo: `esquemas/`, `migraciones/`, `repositorios/`, `servicios/`,
  `controladores/`, `rutas/`, `validaciones/` (y `eventos/`, `estados/` cuando hagan falta).
- Lo que usan todos los módulos va en `core`. `empresas` es esencial (siempre activo).
- `DefinicionModulo` declara: `dependeDe`, `permisos`, `recursosConAlcance`,
  `configuracion` y `rutas`. El registro valida las dependencias al arrancar.
- Los módulos no se importan entre sí para colaborar: usan eventos
  (`core/eventos/bus-eventos.ts`). Un módulo sí puede importar de `core`.

### Base de datos
- **Un esquema de PostgreSQL por módulo** (`pgSchema('<clave>')`); las tablas de
  core viven en `core.*`.
- **Migraciones por módulo** en `modulos/<clave>/migraciones`, generadas con
  `bd:generar`; nunca editar una migración ya aplicada en producción.
- La app se conecta como `arrancar_app` (sin privilegios). Las migraciones usan
  `DATABASE_URL_PROPIETARIO`. El migrador da los permisos (GRANT) por esquema.
- `casing: 'snake_case'`: en TypeScript las columnas son camelCase.
- Dinero: `numeric(14,2)`, viaja como texto en la API.

### Multiempresa y seguridad (no romper)
- Toda tabla de negocio lleva `empresa_id` y `politicaPorEmpresa()`.
- Toda consulta a esas tablas se hace dentro de `ejecutarEnEmpresa(contexto, tx => ...)`
  usando `tx`; así RLS limita a la empresa activa.
- Para tablas compartidas por **todas las empresas de una cuenta** (p. ej. `terceros`):
  llevan `cuenta_id` y `politicaPorCuenta()` en vez de `empresa_id`/`politicaPorEmpresa()`.
  `ejecutarEnEmpresa` ya fija `app.cuenta_id` (con `cuentaId` en `ContextoEmpresa`, que
  siempre viene de la empresa activa), así que se sigue usando la misma función y el
  mismo `tx`.
- Permisos de datos por registro: `politicaPorAlcance('<recurso>')` +
  `recursosConAlcance` en el módulo + filas en `core.accesos_datos`.
- Cada ruta usa `proteger({ permiso })` (cadena de guardias: sesión → empresa →
  módulo → permiso). El permiso debe estar declarado por un módulo.
- En el cliente, `v-permiso` y `sesion.puede()` solo ocultan; el servidor valida siempre.
- Superacceso: puede entrar a cualquier empresa; se registra en `core.bitacora_superacceso`.

### Usuarios
Inicio de sesión con nombre de usuario (solo letras, único en el servidor), no
con correo. Se genera con `generarCandidatosUsuario` (`core/utilidades/nombre-usuario.ts`)
a partir de `nombres` y `apellidos`, que se guardan por separado. El correo es
opcional (solo para informes). Usuario de soporte: `supergod`.

### Configuración por niveles
Empresa → cuenta → instalación (JSON en `RUTA_CONFIG_INSTALACION`) → predeterminado.
Las variables se declaran en el módulo con `definirConfiguracion` (clave
`<modulo>.<grupo>.<nombre>`, esquema Zod, niveles). Se leen con
`configuracionServicio.obtener(clave, { cuentaId, empresaId })`; las `publica: true`
llegan al cliente en la sesión (`sesion.config(clave, predeterminado)`).

### Apariencia
Colores de marca por instalación (panel Soporte → Apariencia). En el cliente
se usan las utilidades `bg-marca`, `text-marca-texto`, `bg-marca-oscuro`,
`bg-acento`, `text-acento-texto`, que se sobrescriben en tiempo de ejecución
(`almacenes/apariencia.ts`). Úsalas solo para la estructura (menú, encabezados,
inicio de sesión); botones y formularios usan la paleta fija (`campo`, `tierra`, `trigo`).

## Convenciones

- Todo en español: código, mensajes, documentación y respuestas.
- Patrones de refactoring.guru cuando aporten (ver tabla en `docs/PLAN.md`);
  no forzarlos.
- TSDoc en funciones públicas; sin comentarios obvios.
- Controladores delgados; reglas en servicios; consultas en repositorios.
- Errores: lanzar las clases de `core/errores/errores.ts`; la API responde
  `{ error: { codigo, mensaje, detalles } }`.
- Pruebas junto al código como `*.prueba.ts`.
