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
npm run probar                            # pruebas del servidor (base arrancar_pruebas) y del cliente
npm run verificar                         # tsc del servidor y vue-tsc del cliente
npm run revisar                           # Prettier + ESLint + verificar: correr antes de cada commit
npm run formatear                         # aplica Prettier y las correcciones automáticas de ESLint
npm run bd:generar -w servidor -- <modulo> <nombre> [--custom]
npm run generar -- modulo <clave> [--nombre "..."] [--descripcion "..."] [--icono Beef]
npm run generar -- definicion <modulo>/<entidad>   # crea generador/definiciones/<modulo>/<entidad>.ts para completar
npm run generar -- recurso <modulo>/<entidad>      # genera el recurso desde su definición, y su migración
```

Las pruebas de integración usan PostgreSQL real (`arrancar_pruebas`), así que la
base de desarrollo debe estar levantada.

## Arquitectura

**Todo el código sigue `docs/ARQUITECTURA.md`.** La plantilla del servidor es
`empresas` y la del cliente, `terceros` (pantallas de Clientes); copiar su forma.

### Servidor
- Cada módulo (`servidor/src/modulos/<clave>/`) y cada contexto del core
  (`core/identidad`, `core/autorizacion`, `core/configuracion`…) tiene las capas
  `dominio/` (entidades, objetos de valor, errores), `aplicacion/` (un caso de uso
  por clase, puertos, DTO), `infraestructura/` (Drizzle, tablas en
  `persistencia/*.tablas.ts`) y `http/` (controlador, rutas, esquemas Zod). La raíz
  de composición es `modulo.ts` (o `contexto.ts` en el core); la inyección es por
  constructor.
- Lo común está en `core/compartido/`: `UnidadDeTrabajo` (una transacción por caso
  de uso, con RLS de la empresa del contexto), `ErrorEsperado` y sus familias,
  objetos de valor (`Nit`, `Dpi`, `Correo`, `Telefono`), guardias http y dobles de
  prueba.

### Cliente
- Cada módulo (`cliente/src/modulos/<clave>/`) tiene `servicios/` (una clase
  `Api*` sobre `ClienteHttp` y su instancia), `composables/`, `componentes/`,
  `paginas/`, `textos.ts` (nombres de ventanas y menú) y `modulo.ts` (rutas y
  menú). En el core, cada área tiene su subcarpeta (`usuarios/`, `roles/`…).
- La página solo arma: pide un composable (`usar<Pantalla>`) y pasa datos a
  componentes. Las páginas no pasan de 120 líneas.
- Los composables hablan con la API; la lógica pura va en archivos sin Vue
  (`edicion-de-<entidad>.ts`) y tiene pruebas `*.prueba.ts`. Base: `usarCarga`
  (traer datos al abrir) y `usarFormulario` (enviar y repartir errores por campo).
- Los componentes no importan servicios (solo `import type`). Las ventanas de
  edición reciben el objeto con `v-model` (`defineModel`) y emiten `guardar` y
  `cerrar`. Para volver atrás, `EncabezadoPagina` acepta `volver`.
- Avisos y confirmaciones con `usarAvisos()` (`exito`, `error`, `confirmar`);
  `alert`/`confirm` del navegador están prohibidos por ESLint. Fechas y números se
  muestran solo con `utilidades/formato.ts`.

### Módulos
- Cada módulo tiene un `modulo.ts` en el servidor y otro en el cliente, que se
  registran en `modulos/indice.ts`.
- Lo que usan todos los módulos va en `core`. `empresas` es esencial (siempre activo).
- `DefinicionModulo` declara: `dependeDe`, `permisos`, `recursosConAlcance`,
  `configuracion` y `rutas`. El registro valida las dependencias al arrancar.
- Los módulos no se importan entre sí para colaborar: usan eventos
  (`core/eventos/bus-eventos.ts`). Un módulo sí puede importar de `core`.

### Base de datos
- **Un esquema de PostgreSQL por módulo** (`pgSchema('<clave>')`); las tablas de
  core viven en `core.*`.
- **Migraciones por módulo** en `modulos/<clave>/migraciones`, generadas con
  `bd:generar`; nunca editar una migración ya aplicada en producción. Las tablas
  viven en `infraestructura/persistencia/*.tablas.ts` (las de empresas y monedas,
  aún en `core/esquemas/`; drizzle-kit lee las dos).
- La app se conecta como `arrancar_app` (sin privilegios). Las migraciones usan
  `DATABASE_URL_PROPIETARIO`. El migrador da los permisos (GRANT) por esquema.
- `casing: 'snake_case'`: en TypeScript las columnas son camelCase.
- Dinero: `numeric(14,2)`, viaja como texto en la API.

### Multiempresa y seguridad (no romper)
- Toda tabla de negocio lleva `empresa_id` y `politicaPorEmpresa()`.
- Toda consulta a esas tablas corre dentro de `UnidadDeTrabajo.ejecutar(contexto, ...)`
  con la transacción en curso; así RLS limita a la empresa activa.
- Para tablas compartidas por **todas las empresas de una cuenta** (p. ej. `terceros`):
  llevan `cuenta_id` y `politicaPorCuenta()` en vez de `empresa_id`/`politicaPorEmpresa()`.
  La unidad de trabajo también fija `app.cuenta_id`, que siempre sale de la empresa activa.
- Permisos de datos por registro: `politicaPorAlcance('<recurso>')` +
  `recursosConAlcance` en el módulo + filas en `core.accesos_datos`.
- Cada ruta usa `proteger({ permiso })` (cadena de guardias: sesión → empresa →
  módulo → permiso). El permiso debe estar declarado por un módulo.
- En el cliente, `v-permiso` y `sesion.puede()` solo ocultan; el servidor valida siempre.
- Superacceso: puede entrar a cualquier empresa; se registra en `core.bitacora_superacceso`.

### Usuarios
Inicio de sesión con nombre de usuario (solo letras, único en el servidor), no
con correo. Se genera con `NombreDeUsuario` (`core/identidad/dominio/nombre-de-usuario.ts`)
a partir de `nombres` y `apellidos`, que se guardan por separado. El correo es
opcional (solo para informes). Usuario de soporte: `supergod`.

### Configuración por niveles
Empresa → cuenta → instalación (JSON en `RUTA_CONFIG_INSTALACION`) → predeterminado.
Las variables se declaran en el módulo con `definirConfiguracion` (clave
`<modulo>.<grupo>.<nombre>`, esquema Zod, niveles). Se leen con
`LectorDeConfiguracion.obtener(clave, destino)` (`core/configuracion/contexto.ts`);
las `publica: true` llegan al cliente en la sesión (`sesion.config(clave, predeterminado)`).

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
- Controladores delgados; reglas en el dominio; orquestación en casos de uso;
  consultas en infraestructura.
- Errores: subclases de las familias de `core/compartido` (`DatoInvalido`,
  `RecursoNoEncontrado`, `ReglaDeNegocioInfringida`…), con código propio; la API
  responde `{ error: { codigo, mensaje, detalles } }`.
- Funciones de hasta 25 líneas, complejidad hasta 8 y hasta 3 parámetros (ESLint).
- Pruebas junto al código como `*.prueba.ts`.
