import { sql } from 'drizzle-orm';
import { pgPolicy, pgRole, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Rol de PostgreSQL con el que se conecta la aplicación; lo crea `infra/postgres/init`. */
export const rolAplicacion = pgRole('arrancar_app').existing();

/** SQL de las variables de la transacción; también las usa `alcance.ts`. */
export const empresaDeLaTransaccion = "nullif(current_setting('app.empresa_id', true), '')::uuid";
const cuentaDeLaTransaccion = "nullif(current_setting('app.cuenta_id', true), '')::uuid";
export const usuarioDeLaTransaccion = "nullif(current_setting('app.usuario_id', true), '')::uuid";

/** Clave primaria UUID generada por la base de datos. */
export const idPrimario = () => uuid().primaryKey().defaultRandom();

export const marcasDeTiempo = {
  creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  actualizadoEn: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** La cuenta, la empresa y el usuario que fija la unidad de trabajo, como valor de una columna. */
export const deLaTransaccion = {
  cuenta: () => sql.raw(cuentaDeLaTransaccion),
  empresa: () => sql.raw(empresaDeLaTransaccion),
  usuario: () => sql.raw(usuarioDeLaTransaccion),
};

/**
 * Quién creó el registro y quién lo cambió por última vez: el usuario de la
 * transacción. Se llenan solos; ni repositorios ni casos de uso los escriben.
 */
export const autoria = {
  creadoPor: uuid().default(deLaTransaccion.usuario()),
  actualizadoPor: uuid().default(deLaTransaccion.usuario()).$onUpdate(deLaTransaccion.usuario),
};

/**
 * Política RLS que limita la tabla a las filas de la empresa que fija la
 * unidad de trabajo. Sin empresa en la transacción no se ve ninguna fila.
 */
export const politicaPorEmpresa = () =>
  pgPolicy('aislamiento_por_empresa', {
    as: 'permissive',
    for: 'all',
    to: rolAplicacion,
    using: sql.raw(`empresa_id = ${empresaDeLaTransaccion}`),
    withCheck: sql.raw(`empresa_id = ${empresaDeLaTransaccion}`),
  });

/**
 * Política RLS que limita la tabla a las filas de la cuenta que fija la
 * unidad de trabajo (la cuenta de la empresa activa). Para tablas compartidas
 * por todas las empresas de una cuenta, como `terceros`.
 */
export const politicaPorCuenta = () =>
  pgPolicy('aislamiento_por_cuenta', {
    as: 'permissive',
    for: 'all',
    to: rolAplicacion,
    using: sql.raw(`cuenta_id = ${cuentaDeLaTransaccion}`),
    withCheck: sql.raw(`cuenta_id = ${cuentaDeLaTransaccion}`),
  });

interface OpcionesDeEscritura {
  /** Sin política de `delete`: nadie borra. */
  sinBorrar?: boolean;
  /** La lectura también se limita a la cuenta; lo que necesita ver más allá pasa por funciones `security definer`. */
  lecturaPorCuenta?: boolean;
}

/** Condición de cuenta para tablas sin `cuenta_id` propio: el registro padre (por su llave) es de la cuenta. */
const delPadreEnLaCuenta = (padre: string, llave: string) =>
  `exists (select 1 from ${padre} p where p.id = ${llave} and p.cuenta_id = ${cuentaDeLaTransaccion})`;

function politicaDeLectura(condicion: string, opciones: OpcionesDeEscritura) {
  if (!opciones.lecturaPorCuenta) {
    return pgPolicy('leer_sin_filtro', { as: 'permissive', for: 'select', to: rolAplicacion, using: sql`true` });
  }
  return pgPolicy('leer_en_la_cuenta', {
    as: 'permissive',
    for: 'select',
    to: rolAplicacion,
    using: sql.raw(condicion),
  });
}

function politicasDeEscrituraConCondicion(condicion: string, opciones: OpcionesDeEscritura) {
  const leer = politicaDeLectura(condicion, opciones);
  const crear = pgPolicy('crear_en_la_cuenta', {
    as: 'permissive',
    for: 'insert',
    to: rolAplicacion,
    withCheck: sql.raw(condicion),
  });
  const cambiar = pgPolicy('cambiar_en_la_cuenta', {
    as: 'permissive',
    for: 'update',
    to: rolAplicacion,
    using: sql.raw(condicion),
    withCheck: sql.raw(condicion),
  });
  const borrar = pgPolicy('borrar_en_la_cuenta', {
    as: 'permissive',
    for: 'delete',
    to: rolAplicacion,
    using: sql.raw(condicion),
  });
  return opciones.sinBorrar ? [leer, crear, cambiar] : [leer, crear, cambiar, borrar];
}

/**
 * Para tablas de `core` que la sesión lee antes de saber la empresa (por eso la lectura queda abierta) pero que solo se
 * escriben dentro de la cuenta de la transacción: insertar, cambiar y borrar exigen `cuenta_id` igual a `app.cuenta_id`.
 * Un error que escriba en otra cuenta lo rechaza la base. Con `sinBorrar` no hay política de `delete` (nadie borra).
 */
export const politicasDeEscrituraPorCuenta = (opciones: OpcionesDeEscritura = {}) =>
  politicasDeEscrituraConCondicion(`cuenta_id = ${cuentaDeLaTransaccion}`, opciones);

/**
 * Como `politicasDeEscrituraPorCuenta`, para tablas sin `cuenta_id`: la fila pertenece a la cuenta si su registro
 * padre (`<padre>.id = <llave>`) es de la cuenta de la transacción. La subconsulta va a otra tabla, sin recursión.
 */
export const politicasDeEscrituraPorCuentaDe = (padre: string, llave: string) =>
  politicasDeEscrituraConCondicion(delPadreEnLaCuenta(padre, llave), {});

/**
 * Como `politicasDeSoloAgregar`, pero por empresa: para registros de una empresa que solo crecen, como las
 * emisiones del libro de compras. Sin política de cambio ni de borrado, RLS los rechaza.
 */
export const politicasDeSoloAgregarPorEmpresa = () => [
  pgPolicy('agregar_en_la_empresa', {
    as: 'permissive',
    for: 'insert',
    to: rolAplicacion,
    withCheck: sql.raw(`empresa_id = ${empresaDeLaTransaccion}`),
  }),
  pgPolicy('leer_en_la_empresa', {
    as: 'permissive',
    for: 'select',
    to: rolAplicacion,
    using: sql.raw(`empresa_id = ${empresaDeLaTransaccion}`),
  }),
];

/**
 * Políticas de una tabla de toda la instalación (sin empresa ni cuenta) que solo crece, como los tipos de cambio:
 * cualquiera con la aplicación agrega y lee. Sin política de cambio ni de borrado, RLS los rechaza.
 */
export const politicasDeSoloAgregarEnLaInstalacion = () => [
  pgPolicy('agregar_en_la_instalacion', { as: 'permissive', for: 'insert', to: rolAplicacion, withCheck: sql`true` }),
  pgPolicy('leer_en_la_instalacion', { as: 'permissive', for: 'select', to: rolAplicacion, using: sql`true` }),
];

/**
 * Políticas de una tabla que solo crece, como la auditoría: dentro de la cuenta
 * se agrega y se lee. Sin política de cambio ni de borrado, RLS los rechaza.
 */
export const politicasDeSoloAgregar = () => [
  pgPolicy('agregar_en_la_cuenta', {
    as: 'permissive',
    for: 'insert',
    to: rolAplicacion,
    withCheck: sql.raw(`cuenta_id = ${cuentaDeLaTransaccion}`),
  }),
  pgPolicy('leer_en_la_cuenta', {
    as: 'permissive',
    for: 'select',
    to: rolAplicacion,
    using: sql.raw(`cuenta_id = ${cuentaDeLaTransaccion}`),
  }),
];
