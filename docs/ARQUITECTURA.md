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
    dominio/            Entidad, ObjetoValor, EventoDominio, ErrorDominio,
                        objetos de valor comunes: Nit, Dpi, Correo, Telefono, Dinero
    aplicacion/         puertos comunes: UnidadDeTrabajo, PublicadorEventos, Reloj
    infraestructura/    conexión, UnidadDeTrabajoPostgres (RLS), migrador, bus, almacenamiento
    http/               guardias, contexto de la solicitud, manejador de errores, cookie
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

### 4.4 Caso de uso

```ts
export class CrearTercero {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo,
    private readonly terceros: RepositorioTerceros,
    private readonly eventos: PublicadorEventos,
  ) {}

  async ejecutar(solicitud: SolicitudCrearTercero): Promise<TerceroCreadoDto> {
    const tercero = await this.unidadDeTrabajo.ejecutar(solicitud.contexto, async () => {
      await this.exigirDocumentosLibres(solicitud.datos);
      const nuevo = Tercero.registrar(solicitud.datos);
      await this.terceros.guardar(nuevo);
      return nuevo;
    });
    await this.eventos.publicar(tercero.extraerEventos());
    return { id: tercero.id.valor };
  }

  private async exigirDocumentosLibres(datos: DatosRegistroTercero): Promise<void> {
    if (datos.nit && await this.terceros.existeConNit(datos.nit)) throw new NitYaRegistrado(datos.nit);
    if (datos.dpi && await this.terceros.existeConDpi(datos.dpi)) throw new DpiYaRegistrado(datos.dpi);
  }
}
```

Los eventos se publican **después** de confirmar la transacción: si falla, nadie
se entera de algo que no ocurrió.

### 4.5 Controlador y rutas

```ts
export class TercerosControlador {
  constructor(
    private readonly crearTercero: CrearTercero,
    private readonly inactivarTercero: InactivarTercero,
    private readonly consultas: ConsultasTerceros,
  ) {}

  crear = async (solicitud: SolicitudHttp<CuerpoCrearTercero>, respuesta: FastifyReply) => {
    const creado = await this.crearTercero.ejecutar({
      contexto: contextoEmpresaDe(solicitud),
      datos: aDatosRegistro(solicitud.body),
    });
    return respuesta.status(201).send(creado);
  };
}
```

### 4.6 Raíz de composición (`modulo.ts`)

```ts
export function crearModuloTerceros(compartido: DependenciasCompartidas): DefinicionModulo {
  const repositorio = new RepositorioTercerosDrizzle();
  const consultas = new ConsultasTercerosDrizzle();
  const controlador = new TercerosControlador(
    new CrearTercero(compartido.unidadDeTrabajo, repositorio, compartido.eventos),
    new InactivarTercero(compartido.unidadDeTrabajo, repositorio, compartido.eventos),
    consultas,
  );
  return definirModulo({ clave: 'terceros', /* permisos, configuración… */ rutas: rutasTerceros(controlador) });
}
```

### 4.7 Errores

- `dominio`: errores con nombre del problema (`NitInvalido`, `TerceroInactivo`,
  `NitYaRegistrado`), que heredan de `ErrorDominio` y llevan un `codigo` estable.
- `aplicacion`: `RecursoNoEncontrado`, `AccesoDenegado`.
- `http`: el manejador traduce cada familia a su estado HTTP. Ninguna capa interna
  conoce los códigos HTTP.

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
| **6. Cliente** | Clases `Api*`, composables, dividir páginas grandes (`FichaTercero`, `UsuariosCuenta`, `PlataformaApariencia`, `PlataformaCuentas`). | vue-tsc y pruebas de composables en verde. |
| **7. Cierre** | Reglas de tamaño pasan de advertencia a error; `CLAUDE.md` y `PLAN.md` apuntan a este documento; se borran las carpetas viejas (`servicios/`, `repositorios/`, `controladores/`…). | `revisar` sin advertencias. |

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

### Riesgos y cómo se controlan

- **Perder la seguridad RLS al mover consultas** → las pruebas de aislamiento
  (empresas, cuentas y alcance) no se tocan y corren en cada fase; los repositorios
  fallan si no hay contexto.
- **Refactor eterno** → fases cortas, cada una entregable; no se mezclan
  funcionalidades nuevas con el refactor.
- **Sobreingeniería** → las lecturas de pantallas no pasan por entidades; los
  módulos pequeños (geografía, bitácora) pueden no tener dominio propio si no
  tienen reglas.
