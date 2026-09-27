# Arquitectura del código

Estado: **aprobada la estructura** (2026-09-26). Este documento manda sobre el
estilo del código; `docs/PLAN.md` manda sobre qué se construye.

Objetivo: que cualquier programador abra un archivo y entienda qué hace sin leer
comentarios, que cada pieza tenga una sola razón para cambiar y que las reglas de
negocio se puedan probar sin base de datos ni HTTP.

---

## 1. Principios

| Principio | En la práctica |
|---|---|
| **El código se explica solo** | Nombres que dicen la intención (`inactivarTercero`, `tieneNitRepetido`). Sin comentarios que repitan el código. TSDoc solo en la API pública de una capa, para explicar el *por qué* o un contrato no evidente. |
| **Una responsabilidad por pieza** (SRP) | Un caso de uso por clase. Un objeto de valor por concepto. Un componente por fragmento de pantalla. |
| **Dependencias hacia adentro** (DIP) | `http` → `aplicacion` → `dominio`. `infraestructura` implementa interfaces (puertos) declaradas en `aplicacion`. El dominio no conoce Drizzle, Fastify, Zod ni PostgreSQL. |
| **Inyección por constructor** | Sin librería de DI: cada módulo arma sus objetos en `modulo.ts` (raíz de composición). Explícito, tipado, fácil de seguir. |
| **Lo pequeño se entiende** | Funciones ≤ 25 líneas, archivos ≤ 200, ≤ 3 parámetros (si hay más, un objeto con nombre). Complejidad ciclomática ≤ 8. Lo vigila ESLint. |
| **Fallar de forma segura** | Un repositorio **no puede** consultar fuera de un contexto RLS: si no hay transacción activa, lanza un error. |
| **Comandos ≠ consultas** | Escribir pasa por entidades y casos de uso. Leer para pantallas usa consultas directas y devuelve DTO planos (sin reconstruir entidades para listar). |

## 2. Estructura de un módulo (servidor)

```
servidor/src/modulos/terceros/
  dominio/
    tercero.ts                      entidad raíz: invariantes y comportamiento
    papel.ts                        tipos de papel y su ciclo de vida
    objetos-valor/nombre-tercero.ts
    errores/tercero-inactivo.error.ts
    eventos/tercero-inactivado.evento.ts
  aplicacion/
    puertos/repositorio-terceros.ts          interfaz (lo que el caso de uso necesita)
    puertos/consultas-terceros.ts            interfaz de lectura para pantallas
    casos-uso/crear-tercero.caso-uso.ts      una clase, un método `ejecutar`
    casos-uso/inactivar-tercero.caso-uso.ts
    casos-uso/asignar-papel.caso-uso.ts
    dto/                                     entradas y salidas de los casos de uso
  infraestructura/
    persistencia/terceros.tablas.ts          tablas Drizzle (antes `esquemas/`)
    persistencia/repositorio-terceros.drizzle.ts
    persistencia/consultas-terceros.drizzle.ts
    persistencia/tercero.mapeador.ts         fila ⇄ entidad
  http/
    terceros.controlador.ts                  clase: traduce HTTP ⇄ caso de uso
    terceros.rutas.ts                        rutas, guardias y esquemas Zod
    terceros.esquemas-http.ts                validación de entrada y forma de salida
  migraciones/                               SQL de drizzle-kit (se quedan en la raíz del módulo)
  modulo.ts                                  definición del módulo + raíz de composición
```

**Reglas de dependencia** (las verifica ESLint con `no-restricted-imports`, ver sección 7):

| Capa | Puede importar de |
|---|---|
| `dominio` | solo `dominio` propio y `core/compartido/dominio` |
| `aplicacion` | `dominio`, sus propios `puertos`, `core/compartido/{dominio,aplicacion}` |
| `infraestructura` | `aplicacion` (para implementar puertos), `dominio`, `core/compartido/infraestructura` |
| `http` | `aplicacion` y `core/compartido/http` |
| `modulo.ts` | todo lo del módulo (es quien conecta las piezas) |
| otro módulo | **nunca**; se comunican por eventos del bus |

## 3. El core

El core deja de ser una carpeta con todo mezclado y se divide en **contextos**,
cada uno con las mismas cuatro capas:

```
core/
  compartido/           núcleo técnico que usan todos los módulos
    dominio/            ObjetoValor, Identificador<Marca>, Entidad, RaizAgregado, EventoDominio,
                        ErrorEsperado (DatoInvalido, ReglaDeNegocioInfringida),
                        objetos-valor/: Nit, Dpi, Correo, Telefono (Dinero cuando llegue bancos)
    aplicacion/         ContextoEmpresa, puertos UnidadDeTrabajo y PublicadorEventos,
                        errores RecursoNoEncontrado, RecursoDuplicado, RecursoEnUso, AccesoDenegado
    infraestructura/    UnidadDeTrabajoPostgres (RLS + AsyncLocalStorage), PublicadorEventosEnBus,
                        variables de seguridad, interpretación de errores de PostgreSQL
                        (luego: conexión, migrador, bus, almacenamiento)
    http/               manejador de errores y estado HTTP por familia (luego: guardias, contexto, cookie)
    modulos-sistema/    DefinicionModulo, registro
  identidad/            usuarios, nombre de usuario, contraseñas, sesiones, inicio de sesión
  autorizacion/         roles, permisos, accesos a datos
  cuentas/              cuentas suscriptoras, alta de cuenta, módulos activos (plataforma)
  configuracion/        variables por niveles
  apariencia/           nombre, logo y colores de la instalación
  archivos/             subida y procesamiento de imágenes
  geografia/            departamentos y municipios
  bitacora/             registro del superacceso
```

`empresas` sigue siendo su propio módulo esencial.

## 4. Piezas clave (cómo se ve el código)

### 4.1 Transacción y RLS: `UnidadDeTrabajo`

El caso de uso abre el contexto; los repositorios usan la transacción activa sin
recibirla por parámetro (`AsyncLocalStorage`). Si no hay contexto, fallan.

```ts
export interface UnidadDeTrabajo {
  ejecutar<T>(contexto: ContextoEmpresa, trabajo: () => Promise<T>): Promise<T>;
}

export class UnidadDeTrabajoPostgres implements UnidadDeTrabajo {
  constructor(private readonly baseDatos: BaseDatos) {}

  ejecutar<T>(contexto: ContextoEmpresa, trabajo: () => Promise<T>): Promise<T> {
    return this.baseDatos.transaction(async (transaccion) => {
      await fijarVariablesDeSeguridad(transaccion, contexto);
      return transaccionActiva.run(transaccion, trabajo);
    });
  }
}

export function transaccionEnCurso(): Transaccion {
  const transaccion = transaccionActiva.getStore();
  if (!transaccion) throw new ConsultaFueraDeContextoSeguro();
  return transaccion;
}
```

### 4.2 Entidad con invariantes

```ts
export class Tercero extends Entidad<TerceroId> {
  private constructor(private propiedades: PropiedadesTercero) { super(propiedades.id); }

  static registrar(datos: DatosRegistroTercero): Tercero {
    const tercero = new Tercero({ ...datos, id: TerceroId.nuevo(), activo: true, papeles: [] });
    tercero.registrarEvento(new TerceroCreado(tercero.id));
    return tercero;
  }

  static reconstruir(propiedades: PropiedadesTercero): Tercero {
    return new Tercero(propiedades);
  }

  asignarPapel(papel: Papel): void {
    this.exigirActivo();
    if (this.tienePapel(papel)) return;
    this.propiedades.papeles.push(papel);
    this.registrarEvento(new PapelAsignado(this.id, papel.tipo));
  }

  inactivar(): void {
    if (!this.propiedades.activo) return;
    this.propiedades.activo = false;
    this.propiedades.papeles.forEach((papel) => papel.inactivar());
    this.registrarEvento(new TerceroInactivado(this.id));
  }

  private exigirActivo(): void {
    if (!this.propiedades.activo) throw new TerceroInactivo(this.id);
  }
}
```

### 4.3 Objeto de valor

```ts
export class Nit extends ObjetoValor<string> {
  static readonly CONSUMIDOR_FINAL = new Nit('CF');

  static crear(texto: string): Nit {
    const normalizado = normalizarNit(texto);
    if (normalizado === 'CF') return Nit.CONSUMIDOR_FINAL;
    if (!tieneDigitoVerificadorValido(normalizado)) throw new NitInvalido(texto);
    return new Nit(normalizado);
  }

  esConsumidorFinal(): boolean {
    return this.valor === 'CF';
  }
}
```

**El módulo `empresas` es la plantilla viva** (`servidor/src/modulos/empresas/`):
al crear o migrar un módulo, se copia su forma. Los fragmentos siguientes salen de ahí.

### 4.4 Caso de uso

Una clase por acción, con un solo método público `ejecutar`. Las dependencias
llegan en **un objeto con nombre** (así el armado en `modulo.ts` se lee solo y no
choca con el límite de 3 parámetros):

```ts
interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioEmpresas;
  consultas: ConsultasEmpresas;
  accesos: AccesosAEmpresas;
  publicadorEventos: PublicadorEventos;
}

export class RegistrarEmpresa {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(operador: Operador, solicitud: SolicitudDeEmpresa): Promise<EmpresaDto> {
    const { unidadDeTrabajo, consultas, publicadorEventos } = this.dependencias;
    const empresa = Empresa.registrar(Identificador.desde(operador.cuentaId), datosDeEmpresa(solicitud));

    const registrada = await unidadDeTrabajo.ejecutar(operador, async () => {
      await this.dependencias.repositorio.agregar(empresa);
      await this.darAccesoAlCreador(operador, empresa);
      return consultas.obtenerEnCuenta(empresa.id.valor, operador.cuentaId);
    });
    await publicadorEventos.publicar(empresa.extraerEventos());
    return registrada;
  }
}
```

Los eventos se publican **después** de confirmar la transacción: si falla, nadie
se entera de algo que no ocurrió. Después de escribir, la respuesta se lee con
las consultas (datos reales de la base, como `actualizadoEn`).

### 4.5 Controlador y rutas

El controlador solo traduce HTTP ⇄ caso de uso; las rutas reciben el controlador:

```ts
export class EmpresasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeEmpresas) {}

  registrar = async (solicitud: FastifyRequest<{ Body: EmpresaSolicitada }>, respuesta: FastifyReply) => {
    const empresa = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(empresa);
  };
}

export function rutasEmpresas(controlador: EmpresasControlador): FastifyPluginAsyncZod { … }
```

### 4.6 Raíz de composición (`modulo.ts`)

El único lugar que conoce las clases concretas:

```ts
function componerControlador({ unidadDeTrabajo, publicadorEventos }: DependenciasCompartidas) {
  const repositorio = new RepositorioEmpresasDrizzle();
  const consultas = new ConsultasEmpresasDrizzle();
  const accesos = new AccesosAEmpresasDrizzle();
  const alcance = new AlcanceDelOperador(accesos);

  return new EmpresasControlador({
    listar: new ListarEmpresas({ unidadDeTrabajo, consultas, alcance }),
    registrar: new RegistrarEmpresa({ unidadDeTrabajo, repositorio, consultas, accesos, publicadorEventos }),
    // …
  });
}

export const moduloEmpresas: DefinicionModulo = {
  clave: 'empresas',
  // permisos, configuración…
  rutas: rutasEmpresas(componerControlador(dependenciasCompartidas())),
};
```

Las pruebas de los casos de uso arman lo mismo con dobles en memoria
(`pruebas/dobles-de-*.ts` del módulo y `core/compartido/pruebas/dobles-compartidos.ts`).

### 4.7 Errores

Todos heredan de `ErrorEsperado` (dominio) y llevan un `codigo` estable para el cliente.

| Familia | Capa | Estado HTTP | Ejemplos |
|---|---|---|---|
| `DatoInvalido` | dominio | 400 | `NitInvalido`, `DpiInvalido`, `IdentificadorInvalido` |
| `AccesoDenegado` | aplicación | 403 | sin permiso para la acción |
| `RecursoNoEncontrado` | aplicación | 404 | no existe o es de otra cuenta (misma respuesta) |
| `RecursoDuplicado`, `RecursoEnUso` | aplicación | 409 | NIT repetido; borrar algo que otros usan |
| `ReglaDeNegocioInfringida` | dominio | 422 | `TerceroInactivo` |

- Cada error concreto se nombra por el problema y vive junto a lo que lo lanza.
- Solo `http/estado-http-de-error.ts` conoce los códigos HTTP.
- Los errores de PostgreSQL por restricciones (único, llave foránea) los convierte
  la infraestructura (`interpretarErrorDePostgres`) en `RecursoDuplicado` o
  `RecursoEnUso`; `aplicacion.ts` se lo pasa al manejador, que no conoce la base de datos.
- Los errores de programación (consultar sin unidad de trabajo, cambiar de
  contexto dentro de una transacción) heredan de `Error` y responden 500.

## 5. Cliente (Vue)

```
cliente/src/modulos/terceros/
  paginas/            una por ruta; solo compone (≤ 120 líneas)
  componentes/        presentacionales: props de entrada, eventos de salida, sin llamadas a la API
  composables/        estado y lógica de pantalla: usarListadoTerceros, usarFormularioTercero
  servicios/          clase ApiTerceros sobre ClienteHttp (tipos de entrada y salida)
  tipos.ts
  modulo.ts           rutas, menú y pestañas que aporta a otras fichas
```

**Menú por módulo.** Cada módulo aparece como un grupo del menú con su nombre para
el usuario (no el técnico: `terceros` se ve como **Clientes**) y, dentro, hasta
tres secciones siempre en este orden:

| Sección | Qué va | Ejemplos |
|---|---|---|
| **Operación** | lo que se usa todos los días para operar | registrar venta, pesaje, ordeño, buscar contacto |
| **Administración** | catálogos y registros maestros | clientes, proveedores, categorías, potreros |
| **Reportes** | consultas, gráficas y exportaciones | clientes por clase, producción de leche |

Una sección vacía no se muestra. Cada entrada del menú declara su sección en el
`modulo.ts` del cliente.

Reglas: archivos `.vue` ≤ 200 líneas; la lógica vive en composables probados con
Vitest; los componentes no importan servicios; Pinia solo para estado global
(sesión, apariencia, avisos).

## 6. Pruebas

| Nivel | Qué prueba | Con qué |
|---|---|---|
| Dominio | entidades y objetos de valor | Vitest puro, sin dobles |
| Aplicación | casos de uso | repositorios en memoria (`RepositorioTercerosEnMemoria`) |
| Infraestructura | repositorios y **RLS** | PostgreSQL real (`arrancar_pruebas`) |
| API | contrato HTTP, guardias, permisos | `app.inject` |
| Cliente | composables | Vitest |

Nombre de las pruebas en lenguaje de negocio:
`it('no permite asignar papeles a un tercero inactivo')`.

## 7. Herramientas que lo hacen cumplir

- **ESLint** (`eslint.config.js`: typescript-eslint + vue + prettier):
  - Tamaño: `max-lines: 200`, `max-lines-per-function: 25`, `complexity: 8`,
    `max-params: 3`, `max-depth: 3`. Las pruebas pueden tener describe largos
    y hasta 250 líneas por archivo.
  - Capas y módulos con `no-restricted-imports`, generado por módulo y capa: el
    dominio no importa otras capas ni `drizzle-orm`, `pg`, `fastify`, `sharp` o
    `zod`; la aplicación no importa infraestructura, HTTP ni esas librerías; HTTP no
    importa infraestructura ni la base de datos; ningún módulo importa a otro
    (servidor y cliente). Los mensajes de error explican la regla.
  - Sin `any`, sin `export default` (salvo `.vue` y archivos `*.config.ts`),
    `import type` obligatorio, `===` siempre, sin `console.log`.
- **Prettier** (`.prettierrc.json`): ancho 120 (el del código existente, para no
  reescribir todo), comillas simples, comas finales. No formatea `.md` ni migraciones.
- `npm run revisar` = Prettier en modo verificación + ESLint + tsc + vue-tsc; se
  ejecuta antes de cada commit. `npm run formatear` corrige formato y lo que ESLint
  arregla solo.

---

## 8. Plan del refactor

Regla de oro: **ningún cambio de comportamiento**. El contrato de la API y la base
de datos no cambian (sin migraciones nuevas), así que el cliente sigue funcionando
en cada paso. Cada fase termina con `revisar` y todas las pruebas en verde, y se
entrega como un commit propio.

| Fase | Contenido | Resultado verificable |
|---|---|---|
| **0. Red de seguridad** | Pruebas de API con `app.inject` que fijan el comportamiento actual: inicio y cierre de sesión, usuarios, roles, empresas, configuración, apariencia, archivos, terceros, permisos denegados y aislamiento. | Pruebas de caracterización en verde **antes** de mover código. |
| **1. Herramientas** | ESLint + Prettier + reglas de capas, `npm run revisar`. Las reglas de tamaño empiezan como advertencia. | `revisar` corre; lista de advertencias = deuda a pagar. |
| **2. Núcleo compartido** | `core/compartido`: `Entidad`, `ObjetoValor`, `EventoDominio`, errores por capa, `UnidadDeTrabajo` con `AsyncLocalStorage`, `PublicadorEventos`, objetos de valor `Nit`, `Dpi`, `Correo`, `Telefono`. | Pruebas unitarias; RLS sigue pasando. |
| **3. Empresas** (plantilla) | Primer módulo migrado completo: dominio, casos de uso, repositorio, controlador, raíz de composición. Sirve de ejemplo para los demás. | Pruebas de API de empresas iguales; pruebas unitarias nuevas. |
| **4. Terceros** | Migrar el módulo a la estructura, con la entidad `Tercero` y sus papeles. **Única fase con cambios funcionales acordados:** se quita el papel trabajador (pasa a planilla, migración que elimina `terceros.trabajadores` y el permiso `trabajadores.*`) y el módulo se muestra como **Clientes** con pantallas propias de clientes y proveedores. | Pruebas de API de terceros actualizadas a los cambios. |
| **5. Core por contextos** | En este orden: geografía → archivos → apariencia → configuración → bitácora → autorización → identidad → cuentas. | Cada contexto, un commit con pruebas en verde. |
| **6. Cliente** | Clases `Api*`, composables, dividir páginas grandes (`FichaTercero`, `UsuariosCuenta`, `PlataformaApariencia`, `PlataformaCuentas`), menú por módulo, pantallas propias de Clientes y Proveedores, textos y formato configurable. Ver "Plan de la fase 6". | vue-tsc y pruebas de composables en verde. |
| **7. Generador** | `npm run generar -- modulo` y `recurso`: código del servidor y del cliente a partir de una definición. Ver "Plan de la fase 7". | El código generado pasa `revisar` y sus pruebas. |
| **8. Cierre** | Reglas de tamaño pasan de advertencia a error; `CLAUDE.md` y `PLAN.md` apuntan a este documento; se borran las carpetas viejas (`servicios/`, `repositorios/`, `controladores/`…). | `revisar` sin advertencias. |

### Avance

- **Fase 0: hecha (2026-09-26).** 90 pruebas de API en `servidor/src/pruebas-api/`
  (un archivo por área, con un `ClienteApi` que simula el navegador y guarda la
  cookie). El papel trabajador no se cubre porque sale en la fase 4.
  Hallazgos para corregir durante el refactor:
  - Terceros publica sus eventos **dentro** de la transacción: si algo falla
    después, otros módulos se enterarían de algo que no ocurrió (se corrige con
    la publicación después de confirmar, sección 4.4).
  - Fastify avisa que `disableRequestLogging` quedará obsoleto en la versión 6.
- **Fase 1: hecha (2026-09-26).** ESLint 10 + Prettier 3; todo el código
  formateado. Se descartó `eslint-plugin-boundaries`: su versión 7 cambió por
  completo la configuración y `no-restricted-imports` cubre lo mismo sin otra
  dependencia (comprobado con archivos que violan cada regla). Se corrigieron los
  9 errores iniciales (variables sin uso, `proteger()` reescrita sin reasignaciones,
  `Tarjeta` e `Insignia` pasan a `TarjetaBase` e `InsigniaBase`). Quedan **43
  advertencias de tamaño**: la deuda que pagan las fases 3 a 6.
- **Fase 2: hecha (2026-09-26).** Núcleo en `servidor/src/modulos/core/compartido/`
  (ver sección 3), sin advertencias de ESLint. Decisiones:
  - La base de los errores se llama `ErrorEsperado` (no `ErrorDominio`) porque la
    comparten dominio y aplicación.
  - `Identificador<Marca>` da tipos nominales: TypeScript rechaza usar el id de
    una entidad donde se espera el de otra (hay una prueba de tipos).
  - La unidad de trabajo guarda la transacción en `AsyncLocalStorage`; una unidad
    anidada se une a la transacción en curso solo si el contexto es el mismo.
  - No se agregó el puerto `Reloj` hasta que un caso de uso lo necesite.
  - NIT y DPI se mudaron de `utilidades/` a objetos de valor (sin copias); el
    manejador de errores se mudó a `compartido/http` y se partió en traductores.
    La regla de capas detectó que importaba `pg`: ahora la infraestructura le
    entrega el interpretador de errores de PostgreSQL (inversión de dependencias).
  - `ejecutarEnEmpresa` sigue para el código viejo (marcado `@deprecated`) y usa
    las mismas variables de seguridad que la unidad de trabajo.
  - 40 pruebas nuevas (192 en total); advertencias de tamaño: 41.
- **Fase 3: hecha (2026-09-26).** `empresas` migrado completo y convertido en la
  plantilla (sección 4). Las 90 pruebas de API siguen iguales y pasan; 17 pruebas
  nuevas de dominio y casos de uso corren sin base de datos. Decisiones:
  - Las tablas siguen en `core.empresas` y `core.empresa_usuarios` (el core las
    necesita para la sesión y el alta de cuentas; moverlas cambiaría la base). Como
    `core.empresas` no tiene RLS, el repositorio filtra siempre por cuenta.
  - La regla "no desactivar la empresa en uso" vive en la entidad
    (`cambiarDatos(datos, empresaEnUso)`); su código de error pasa de
    `regla_negocio` a `empresa_en_uso` (mismo estado 422 y mismo mensaje; el
    cliente no lo usaba).
  - Nuevo evento `empresas.registrada` (nadie lo escucha aún).
  - Se corrigió la descripción del permiso `empresas.gestionar`, que aún hablaba del fierro.
  - Teléfono y correo de la empresa: después, con el visto bueno del usuario, se
    normalizaron con `Telefono` y `Correo` (migración de datos `core/0007`).
  - Nuevas piezas compartidas: `Operador`, `DependenciasCompartidas`,
    `operadorDe(solicitud)` y los dobles `UnidadDeTrabajoEnMemoria`,
    `PublicadorEventosEnMemoria` y `operadorDePrueba`.
  - 209 pruebas en total; advertencias de tamaño: 41 (ninguna en empresas ni en compartido).
- **Fase 4: hecha (2026-09-26).** `terceros` migrado completo (ver
  `docs/modulos/terceros.md`), con los cambios funcionales acordados:
  - Sin papel de trabajador (pasa a planilla): migración `terceros/0002` borra la
    tabla; `0003` quita sus permisos y su configuración y normaliza teléfonos,
    WhatsApp y correos de terceros y contactos.
  - El módulo se llama **Clientes** para el usuario; los textos de pantalla y los
    mensajes de error ya no dicen "tercero".
  - El agregado `Tercero` contiene sus papeles: así garantiza que inactivarlo los
    inactive y que no se asignen papeles a un inactivo. `Contacto` y
    `CategoriaDeProveedor` son entidades aparte (no tienen reglas con el tercero).
  - Asignar y quitar papel son dos casos de uso genéricos (`AsignarPapel`,
    `QuitarPapel`) en vez de cuatro.
  - Las tablas se mudaron a `infraestructura/persistencia/*.tablas.ts`;
    `drizzle.config.ts` y `bd:generar` buscan tablas ahí y en `esquemas/` (código
    aún no migrado). El cambio no generó diferencias en la base.
  - Defectos corregidos: el filtro `activo=false` se leía como `true`
    (`z.coerce.boolean`); se podía cambiar un contacto usando la ruta de otro
    tercero; los eventos se publicaban dentro de la transacción; buscar por
    teléfono con guion no encontraba nada.
  - Las respuestas ahora solo llevan lo que la pantalla usa (sin `cuentaId`,
    `terceroId` ni `creadoEn` en contactos, papeles y categorías).
  - Nuevas utilidades compartidas: `crearSiHayTexto`, `valorDe` y `CuentaId`.
  - 235 pruebas (19 unitarias nuevas de terceros y 11 de API); advertencias: 39
    (ninguna en los módulos migrados).
- **Fase 5: en curso.**
  - **Geografía (2026-09-27):** `core/geografia/` con aplicación (puerto
    `ConsultasGeografia` y casos de uso `ListarDepartamentos` y `ListarMunicipios`),
    infraestructura (`geografia.tablas.ts` y consultas Drizzle), http y
    `contexto.ts` como raíz de composición del contexto. Sin dominio: es un catálogo
    de solo lectura, sin reglas. `drizzle.config.ts` ahora también busca tablas en
    los contextos del core (sin diferencias en la base). Las API no cambian; 235
    pruebas en verde.
  - **Archivos (2026-09-27):** `core/archivos/` con dominio (formatos aceptados,
    variantes, `RutasDeImagen` y los errores `FormatoDeImagenNoAceptado` e
    `ImagenIlegible`), casos de uso `SubirImagen` y `AbrirImagen`, puertos
    `RepositorioArchivos` y `OptimizadorDeImagenes` (sharp queda en
    `OptimizadorSharp`, en infraestructura). Pasan a `compartido` porque apariencia
    también los usa: el puerto `Almacenamiento` con `AlmacenamientoLocal`,
    `ImagenSubida` y `leerImagenDeSolicitud` (con el error `FaltaLaImagen`). Los
    códigos de error pasan de `solicitud_invalida` a códigos propios (mismo estado
    400; el cliente no los usaba). 240 pruebas (5 unitarias nuevas); advertencias: 38.
  - **Apariencia (2026-09-27):** `core/apariencia/` con dominio (`logo.ts`: formatos
    aceptados, ruta, versión y dirección del logo, errores `FormatoDeLogoNoAceptado`
    y `LogoIlegible`), seis casos de uso (obtener, cambiar y restablecer la
    apariencia; abrir, cambiar y quitar el logo) y dos puertos:
    `AjustesDeApariencia` y `ConvertidorDeLogo` (sharp en `ConvertidorDeLogoSharp`).
    Como la configuración aún no está migrada, `AjustesEnConfiguracion` implementa
    el puerto con el servicio viejo; al migrar configuración solo cambia ese
    adaptador. No usa la unidad de trabajo: sus ajustes son de la instalación.
    El doble `AlmacenamientoEnMemoria` pasa a `compartido/pruebas`. 244 pruebas
    (4 unitarias nuevas); advertencias: 37.
  - **Configuración (2026-09-27):** `core/configuracion/` con dominio (destino y
    errores `NivelNoPermitido` y `ValorDeConfiguracionInvalido`), aplicación
    (`LectorDeConfiguracion` resuelve empresa → cuenta → instalación →
    predeterminado; casos de uso `ListarVariablesEditables`, `EstablecerValor` y
    `RestablecerValor`; puertos `RepositorioConfiguraciones`, `CatalogoDeVariables`
    y `ValoresDeInstalacion`) e infraestructura (repositorio Drizzle con la conexión
    inyectada, `CatalogoEnRegistro` y `ArchivoDeInstalacion`). La tabla no tiene RLS
    (guarda valores de instalación), así que el repositorio no usa la unidad de
    trabajo y filtra siempre por destino. `contexto.ts` exporta las piezas armadas:
    la sesión y el adaptador de apariencia ya las usan en lugar del servicio viejo.
    Los errores dejan `regla_negocio`/`solicitud_invalida` por códigos propios
    (mismos estados; el cliente no los usaba). 251 pruebas (7 unitarias nuevas);
    advertencias: 33.
  - **Bitácora (2026-09-27):** `core/bitacora/` sin dominio (no tiene reglas):
    puerto `Bitacora`, casos de uso `RegistrarEntradaDeSoporte` (lo usa la sesión
    cuando soporte entra a una empresa ajena) y `ListarBitacoraReciente`,
    `BitacoraDrizzle` con la conexión inyectada (sin RLS: la usa soporte, por encima
    de las cuentas). La ruta `/plataforma/bitacora` sale de plataforma y la registra
    el contexto. Sin pruebas unitarias nuevas: los casos de uso solo delegan y las
    pruebas de API cubren registro y listado. 251 pruebas; advertencias: 33.
  - **Autorización (2026-09-27):** `core/autorizacion/` con la entidad `Rol`
    (limpia el nombre, no repite permisos, el acceso total no lleva permisos
    sueltos, la cuenta no se queda sin un rol con acceso total y un rol asignado
    no se elimina; fábrica `Rol.propietario`), cinco casos de uso (listar roles y
    permisos asignables, crear, actualizar y eliminar) y los puertos
    `RepositorioRoles`, `ConsultasRoles` y `CatalogoDePermisos`. Las tablas `roles`,
    `rol_permisos` y `accesos_datos` se mudan al contexto. Las escrituras de rol
    (`insertarRol`, `actualizarRol`) reciben el ejecutor porque el alta de cuentas,
    aún sin migrar, crea el rol Propietario en su propia transacción. Las consultas
    usan la conexión directa: la sesión pide los permisos del rol antes de tener
    empresa activa. Cambiar un rol ahora es atómico (antes el nombre y los permisos
    se guardaban por separado). La respuesta de `/roles` solo lleva lo que la
    pantalla usa (sin `cuentaId` ni fechas) y los errores tienen códigos propios.
    Las guardias (`core/http/guardias.ts`) se mudan con identidad, porque dependen
    de la sesión. 256 pruebas (5 unitarias nuevas); advertencias: 31.
  - **Identidad, parte 1: usuarios (2026-09-27):** `core/identidad/` con dominio
    (`Usuario` con sus reglas: quien administra no se desactiva ni cambia sus
    accesos, y a un usuario de varias cuentas solo se le cambian los accesos;
    `NombreDeUsuario` y sus candidatos; accesos a empresas sin repetir), el
    `AsignadorDeNombreDeUsuario`, cinco casos de uso (listar, sugerir nombre,
    crear, actualizar y cambiar contraseña) y los puertos `RepositorioUsuarios`,
    `AccesosAEmpresas`, `ConsultasUsuarios`, `CifradorDeContrasenas` (Argon2) y
    `CierreDeSesiones`. Las tablas `usuarios` y `sesiones` se mudan al contexto. Los
    repositorios reciben de dónde sacar la transacción (por omisión, la de la
    unidad de trabajo), así el alta de cuentas y el inicio de sesión, aún sin
    migrar, usan las mismas piezas. Los accesos se validan dentro de la misma
    transacción que los guarda, y el correo se guarda en minúsculas (`Correo`). Los
    errores tienen códigos propios. 263 pruebas (7 unitarias nuevas); advertencias: 29.
  - **Identidad, parte 2: sesiones y guardias (2026-09-27):** casos de uso
    `IniciarSesion`, `CerrarSesion`, `ValidarSesion`, `CambiarEmpresaActiva`,
    `ObtenerResumenDeSesion` y `LimpiarSesionesVencidas`; `ResolutorDeAcceso` calcula
    rol, módulos y permisos efectivos en una empresa; `VigenciaDeSesion` (dominio)
    decide vencimiento y renovación. Lo que la sesión necesita de autorización,
    configuración y bitácora entra por puertos (`contextos-vecinos.ts`). Las guardias,
    el contexto de la petición y la cookie pasan a `compartido/http`; la guardia de
    autenticación usa el puerto `ValidadorDeSesion`, que identidad entrega al armarse
    (`usarValidadorDeSesion`), así el núcleo no depende de identidad. Nueva familia
    de error `NoAutenticado` (401, mismo código `no_autenticado`). 265 pruebas
    (2 unitarias nuevas); advertencias: 29.
  - **Cuentas (2026-09-27):** `core/cuentas/` con la entidad `Cuenta`, casos de uso
    del panel de soporte (listar y cambiar cuentas; listar, activar y desactivar
    módulos) y `DarDeAltaCuenta` (Facade: cuenta, primera empresa, rol Propietario,
    usuario dueño y módulos). El alta no cabe en la unidad de trabajo (exige una
    empresa que aún no existe): usa el puerto `TransaccionDeAlta`, que entrega las
    piezas de cuentas, autorización e identidad atadas a una misma transacción. Las
    reglas de módulos siguen en el registro, ahora con errores de la familia nueva
    (`ModuloDesconocido`, `FaltanDependenciasDelModulo`, `ModuloEsencial`,
    `ModuloEnUso`). La respuesta del alta solo lleva id y nombre de la cuenta y la
    empresa, y el listado de cuentas ya no trae `actualizadoEn`. `esquemas-comunes`
    pasa a `compartido/http` y el esquema del nombre de usuario, a identidad.
- **Fase 5: hecha (2026-09-27).** Se borraron las carpetas viejas del core
  (`servicios/`, `repositorios/`, `controladores/`, `rutas/`, `validaciones/`,
  `errores/`) y el traductor de errores anterior. En `core/` quedan los contextos,
  `compartido/`, y la infraestructura común que aún no se muda (`base-datos/`,
  `eventos/`, `modulos-sistema/`, `esquemas/` con las tablas de empresas y monedas).
  265 pruebas; advertencias: 24. En el servidor solo quedan en `aplicacion.ts` y
  en `registro-modulos.ts` (fase 8, cierre); las demás son del cliente (fase 6).
- **Fase 6: en curso.**
  - **6.1 Base del cliente (2026-09-27):** Vitest en el cliente (`npm run probar`
    corre servidor y cliente). `ClienteHttp` es una clase y cada servicio una clase
    `Api*` con su instancia (`apiTerceros`, `apiUsuarios`…). Cada módulo tiene
    `textos.ts` (`VENTANAS_*`, nombre del grupo); rutas, menú y encabezados los usan.
    Menú plegable por módulo (`menu/construir-menu.ts`, `usar-grupos-abiertos.ts`,
    componentes `MenuLateral`, `GrupoDelMenu`, `OpcionDelMenu`): grupos Empresas,
    Clientes, Cuenta y Soporte, secciones en orden, se abre el grupo de la página
    actual y el navegador recuerda los demás. Formato regional: variables
    `core.regional.formato_fecha`, `decimales_montos` y `decimales_cantidades`
    (servidor, `configuracion/variables-regionales.ts`) y `FormatoRegional` en el
    cliente; las pantallas formatean solo desde `utilidades/formato.ts`. Reglas
    nuevas de ESLint: los componentes no importan servicios (error) y las páginas
    ≤ 120 líneas (advertencia). La regla encontró que `AltaRapidaTercero` llamaba a
    la API: ahora es presentacional y la lógica vive en `usarAltaDeTercero`.
    279 pruebas (14 del cliente); advertencias: 24 (páginas que rehacen 6.2 a 6.4).
  - **Ajuste del menú (pedido del usuario):** las secciones también se pliegan y,
    si un grupo tiene una sola sección visible, sus opciones van directo sin el
    separador (`conSecciones`). `usarPlegablesAbiertos` recuerda grupos y secciones.
  - **6.2 Clientes (2026-09-27):** pantallas propias (ver `docs/modulos/terceros.md`):
    Buscar contacto, Clientes, Proveedores, Categorías de proveedor, formulario
    completo para crear y editar, y la ficha de 559 líneas dividida en componentes
    (`DatosGeneralesDelTercero`, `ContactosDelTercero`, `TarjetaDePapel`,
    `VentanaDeContacto`, `VentanaDePapel`). Una sola página por tipo de pantalla
    sirve a los dos papeles (la ruta le pasa `papel`). Composables por pantalla;
    lógica pura en `datos-de-tercero.ts`, `guardado-de-tercero.ts` y
    `confirmar-duplicado.ts`. Nuevos en el core del cliente: `usarGeografia` y
    `alDejarDeEscribir`. La regla "componentes sin servicios" ahora permite
    `import type`. En el servidor: listado con clase y categoría, búsqueda de
    contactos y alta en un paso con el permiso del papel. 274 pruebas del servidor
    (7 de API y 2 unitarias nuevas) y 22 del cliente; advertencias: 19 (ninguna en
    el módulo de clientes).
  - **6.3 Páginas del core (2026-09-27):** Usuarios, Roles, Configuración y
    Plataforma (cuentas, apariencia y bitácora) siguen el mismo esquema que Clientes:
    la página solo arma componentes y composables. Cada área tiene su carpeta en
    `core/composables/<area>/` y `core/componentes/<area>/` (`usuarios`, `roles`,
    `configuracion`, `plataforma`). La lógica pura va en archivos sin Vue
    (`edicion-de-usuario.ts`, `edicion-de-rol.ts`, `valores-de-configuracion.ts`,
    `alta-de-cuenta.ts`, `paletas.ts`) y tiene pruebas. Las ventanas reciben el
    objeto de edición con `v-model` (`defineModel`) y avisan con `guardar` y
    `cerrar`. Nuevos en el core: `usarCarga` (trae los datos al abrir la pantalla y
    avisa si falla) y el enlace `volver` de `EncabezadoPagina`, que la ficha y el
    formulario de Clientes ya usan. Se corrigió que Clientes y Proveedores
    compartieran el listado al pasar de una a otra: el `RouterView` principal ahora
    usa la ruta como clave. 274 pruebas del servidor y 36 del cliente; advertencias:
    10 (ninguna en las páginas del core; las del cliente pasan al 6.4).
  - **6.4 Empresas y cierre (2026-09-27):** `ListaEmpresas` pasa a `ListaDeEmpresas`
    con `usarEmpresas`, `edicion-de-empresa.ts`, `TarjetaDeEmpresa` y
    `VentanaDeEmpresa`. Se limpiaron las advertencias que quedaban en el cliente:
    las reglas del enrutador pasan a `core/acceso/reglas-de-acceso.ts` (una lista
    ordenada, con pruebas), `ErrorApi` recibe `{ codigo, mensaje, detalles }`, los
    almacenes de avisos y de sesión se arman con piezas (`usarMensajesEmergentes`,
    `usarConfirmaciones`, `lecturasDelResumen`, `accionesDeSesion`) y la sugerencia
    de colores del logo se divide en funciones con nombre. Las tres confirmaciones
    de Clientes que usaban `window.confirm` (quitar papel, eliminar contacto,
    posible duplicado) ahora usan `usarAvisos().confirmar`, y ESLint prohíbe
    `alert`/`confirm` en el cliente (`no-alert`). `CLAUDE.md` describe la
    arquitectura actual del servidor y del cliente. 274 pruebas del servidor y 41
    del cliente; advertencias: 2, ambas del servidor (fase 8, cierre).
- **Fase 6: hecha (2026-09-27).** El cliente no tiene advertencias de ESLint.

### Plan de la fase 6 (acordado con el usuario, 2026-09-27)

Cuatro pasos, un commit cada uno; en cada uno, `revisar` y pruebas en verde.

| Paso | Contenido |
|---|---|
| **6.1 Base del cliente** | Vitest en el cliente (pruebas de composables). Reglas de ESLint del cliente: componentes sin servicios, páginas ≤ 120 líneas. `ClienteHttp` como clase y servicios como clases `Api*`. `textos.ts` por módulo. Menú nuevo. Formato de fechas y decimales. |
| **6.2 Clientes** | Pantallas propias (ver `docs/modulos/terceros.md`, "Pantallas"): Buscar contacto, Clientes, Proveedores, Categorías de proveedor; formulario completo en página para crear y editar; la ficha se divide en componentes. En el servidor: el listado trae clase y categoría, búsqueda de contactos y alta en un paso (datos, papel y contactos). |
| **6.3 Páginas del core** | Usuarios, Roles, Plataforma (cuentas, apariencia, bitácora) y Configuración pasan a composables + componentes. |
| **6.4 Empresas y cierre** | Lista de empresas a composables; documentación y `CLAUDE.md` al día. |

Decisiones:

- **Menú: módulos plegables.** Cada módulo es un grupo que se abre y se cierra;
  adentro, las secciones Operación, Administración y Reportes (una sección vacía
  no se muestra). Al entrar se abre el módulo de la página actual y el navegador
  recuerda cuáles abrió o cerró el usuario. Las opciones del core se agrupan como
  **Cuenta** (usuarios, roles, configuración) y **Soporte** (solo superacceso).
- **Alta de clientes y proveedores: formulario completo en página**
  (`/clientes/nuevo`, `/clientes/:id/editar`, igual para proveedores), que guarda
  en un solo paso los datos, el papel (con su clase o categoría) y los contactos.
- **Formato predeterminado:** fechas `dd/mm/aaaa`; montos y cantidades con 2
  decimales. Variables públicas `core.regional.formato_fecha`,
  `core.regional.decimales_montos` y `core.regional.decimales_cantidades` (niveles
  instalación, cuenta y empresa); el cliente formatea solo desde `utilidades/formato.ts`.
- **Textos:** cada módulo del cliente tiene `textos.ts` con los nombres de sus
  ventanas, menús y títulos; páginas, menú y rutas los toman de ahí.
- **Reportes de Clientes** (clientes por clase, proveedores por categoría): quedan
  para después, se planifican junto con los demás módulos.

### Plan de la fase 7: generador de código (acordado con el usuario, 2026-09-27)

Como `php artisan make:*`: a partir de una definición corta genera el código de
una entidad en el servidor y en el cliente, con la forma de las plantillas
(`empresas` en el servidor, Clientes en el cliente). Así los módulos de negocio
salen rápido y todas las ventanas se ven y se programan igual.

**Comandos**

```bash
npm run generar -- modulo ganado                  # esqueleto del módulo (servidor y cliente) y su registro
npm run generar -- recurso ganado/animal          # todo lo de la entidad, desde su definición
```

**Definición** (`generador/definiciones/<modulo>/<entidad>.ts`), con
autocompletado y validación; queda en el repositorio y se puede volver a correr:

```ts
export default definirRecurso({
  modulo: 'ganado',
  entidad: 'Animal',
  plural: 'Animales',
  alcance: 'empresa',            // o 'cuenta': define la política RLS
  pantalla: 'completa',          // o 'catalogo' (lista con ventana, como Categorías de proveedor)
  baja: 'eliminar',              // por omisión; 'inactivar' para entidades con historial
  campos: {
    arete: texto({ requerido: true, unico: true }),
    nacimiento: fecha(),
    sexo: lista(['macho', 'hembra']),
    peso: decimal({ decimales: 2 }),
    notas: textoLargo(),
  },
});
```

Tipos de campo: `texto`, `textoLargo`, `entero`, `decimal`, `dinero`, `fecha`,
`siNo`, `lista`, `correo`, `telefono`, `nit`, `dpi` y `referencia` (a otra
entidad del mismo módulo). Cada uno sabe su columna de Drizzle, su esquema Zod, su
objeto de valor si lo tiene, su campo de formulario y cómo se muestra.

**Qué genera un recurso**

- Servidor: entidad y errores (dominio); casos de uso listar, ver, crear, editar y
  eliminar (o inactivar), puertos y DTO (aplicación); tabla con su política RLS,
  repositorio, consultas y mapeador (infraestructura); esquemas, controlador y
  rutas con `proteger` (http); permisos `<modulo>.<entidades>.ver` y `.gestionar`
  en `modulo.ts`; la migración con `bd:generar`; pruebas unitarias con dobles en
  memoria y una prueba de API.
- Cliente: servicio `Api*`, textos, composables con su prueba de la lógica pura,
  tarjeta, ventana o formulario en página, ficha (pantalla completa), rutas y
  opción del menú.

**Reglas del generador**

- Nunca sobrescribe un archivo que ya existe (avisa y sigue); lo que agrega a
  `modulo.ts`, `indice.ts` y el menú lo pone en marcas fijas (`// generador: …`).
- Borrar un registro en uso responde 409 `RecursoEnUso` (llave foránea).
- Las plantillas son funciones de TypeScript con pruebas. Una prueba del
  generador crea un módulo de muestra en una carpeta temporal y comprueba que el
  resultado pasa `tsc` y ESLint.

**Pasos** (un commit cada uno; `revisar` y pruebas en verde):

| Paso | Contenido |
|---|---|
| **G1 Base y módulo** | `definirRecurso` y los tipos de campo; motor (escribir sin sobrescribir, insertar en marcas); `generar modulo`. |
| **G2 Recurso en el servidor** | Dominio, aplicación, infraestructura, http, permisos, migración y pruebas. |
| **G3 Recurso en el cliente (catálogo)** | Servicio, textos, composables, tarjeta, ventana, página, rutas y menú. |
| **G4 Pantalla completa y referencias** | Lista, formulario en página y ficha; campos `referencia` (selector en el cliente, llave foránea en el servidor). |

La fase de cierre pasa a ser la **fase 8** (reglas de tamaño a error,
advertencias de `aplicacion.ts` y `registro-modulos.ts`, retirar
`ejecutarEnEmpresa`) y también revisa el código generado.

### Riesgos y cómo se controlan

- **Perder la seguridad RLS al mover consultas** → las pruebas de aislamiento
  (empresas, cuentas y alcance) no se tocan y corren en cada fase; los repositorios
  fallan si no hay contexto.
- **Refactor eterno** → fases cortas, cada una entregable; no se mezclan
  funcionalidades nuevas con el refactor.
- **Sobreingeniería** → las lecturas de pantallas no pasan por entidades; los
  módulos pequeños (geografía, bitácora) pueden no tener dominio propio si no
  tienen reglas.
