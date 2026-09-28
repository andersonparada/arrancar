import { sql } from 'drizzle-orm';
import { pgPolicy, pgRole, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Rol de PostgreSQL con el que se conecta la aplicación; lo crea `infra/postgres/init`. */
export const rolAplicacion = pgRole('arrancar_app').existing();

const empresaDeLaTransaccion = "nullif(current_setting('app.empresa_id', true), '')::uuid";
const cuentaDeLaTransaccion = "nullif(current_setting('app.cuenta_id', true), '')::uuid";
const usuarioDeLaTransaccion = "nullif(current_setting('app.usuario_id', true), '')::uuid";
const recursosConAlcanceTotal = "string_to_array(current_setting('app.alcance_total', true), ',')";

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

/**
 * Política RLS restrictiva (se suma con AND a la de empresa) que limita las filas
 * a los registros asignados al usuario en `core.accesos_datos`.
 *
 * Quien tiene alcance total sobre el recurso (rol con acceso total, superacceso o
 * el permiso "ver todos" que declara el módulo) ve todas las filas de la empresa.
 *
 * @param recurso clave del recurso, p. ej. `bancos.cuentas`; debe coincidir con la
 *   declarada en `recursosConAlcance` del módulo.
 * @param columnaId columna con el id del registro protegido.
 */
export const politicaPorAlcance = (recurso: string, columnaId = 'id') => {
  if (!/^[a-z0-9_.-]+$/.test(recurso) || !/^[a-z_]+$/.test(columnaId)) {
    throw new Error(`Recurso o columna inválidos para la política de alcance: ${recurso}.${columnaId}`);
  }
  const condicion = `'${recurso}' = any(${recursosConAlcanceTotal})
    or ${columnaId} in (
      select a.registro_id from core.accesos_datos a
      where a.recurso = '${recurso}'
        and a.usuario_id = ${usuarioDeLaTransaccion}
    )`;
  return pgPolicy('alcance_por_usuario', {
    as: 'restrictive',
    for: 'all',
    to: rolAplicacion,
    using: sql.raw(condicion),
    withCheck: sql.raw(condicion),
  });
};
