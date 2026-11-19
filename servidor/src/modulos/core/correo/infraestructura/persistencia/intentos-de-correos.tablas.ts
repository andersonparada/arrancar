import { sql } from 'drizzle-orm';
import { check, index, integer, pgPolicy, smallint, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { empresaDeLaTransaccion, idPrimario, rolAplicacion } from '../../../base-datos/columnas.js';
import { empresas } from '../../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';
import { correosSalientes } from './correos-salientes.tablas.js';

export const RESULTADOS_DE_INTENTO = ['enviado', 'temporal', 'permanente', 'autenticacion', 'sin_servidor'] as const;

/**
 * Bitácora técnica de cada intento de envío. Solo la escribe `core.resolver_correo`; la app solo la lee, dentro de
 * su empresa. `codigo` es un código de red o SMTP (`ETIMEDOUT`, `550`), nunca el texto de la respuesta (C2, C11).
 */
export const intentosDeCorreos = esquemaCore.table(
  'intentos_de_correos',
  {
    id: idPrimario(),
    correoSalienteId: uuid()
      .notNull()
      .references(() => correosSalientes.id, { onDelete: 'cascade' }),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    numero: smallint().notNull(),
    ocurridoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
    resultado: text().notNull(),
    codigo: text(),
    duracionMs: integer(),
  },
  (t) => [
    unique('intentos_de_correos_numero_unico').on(t.correoSalienteId, t.numero),
    index('intentos_de_correos_empresa_idx').on(t.empresaId),
    check('intentos_de_correos_numero_positivo', sql`${t.numero} >= 1`),
    check(
      'intentos_de_correos_resultado_valido',
      sql`${t.resultado} in ('enviado', 'temporal', 'permanente', 'autenticacion', 'sin_servidor')`,
    ),
    check('intentos_de_correos_codigo_solo_codigo', sql`${t.codigo} is null or ${t.codigo} ~ '^[A-Za-z0-9_.-]{1,40}$'`),
    check('intentos_de_correos_duracion_valida', sql`${t.duracionMs} is null or ${t.duracionMs} >= 0`),
    pgPolicy('leer_en_la_empresa', {
      as: 'permissive',
      for: 'select',
      to: rolAplicacion,
      using: sql.raw(`empresa_id = ${empresaDeLaTransaccion}`),
    }),
  ],
);
