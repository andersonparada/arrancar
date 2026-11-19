import { sql } from 'drizzle-orm';
import { check, index, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { deLaTransaccion, idPrimario, politicasDeSoloAgregarPorEmpresa } from '../../../base-datos/columnas.js';
import { cuentas } from '../../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';
import { correosSalientes } from './correos-salientes.tablas.js';

/**
 * Una marca por destinatario cada vez que se reintenta a mano un correo fallido: el reintento vuelve a enviar, así que
 * `core.reservar_cupo_de_correo` la suma a los destinatarios originales. La app solo agrega y lee.
 */
export const reintentosDeCorreos = esquemaCore.table(
  'reintentos_de_correos',
  {
    id: idPrimario(),
    correoSalienteId: uuid()
      .notNull()
      .references(() => correosSalientes.id, { onDelete: 'cascade' }),
    empresaId: uuid()
      .notNull()
      .default(deLaTransaccion.empresa())
      .references(() => empresas.id, { onDelete: 'cascade' }),
    cuentaId: uuid()
      .notNull()
      .default(deLaTransaccion.cuenta())
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    direccion: text().notNull(),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('reintentos_de_correos_cuenta_fecha_idx').on(t.cuentaId, t.creadoEn),
    index('reintentos_de_correos_fecha_idx').on(t.creadoEn),
    index('reintentos_de_correos_cupo_idx').on(t.cuentaId, sql`lower(${t.direccion})`, t.creadoEn),
    index('reintentos_de_correos_correo_idx').on(t.correoSalienteId),
    check('reintentos_de_correos_direccion_larga', sql`char_length(${t.direccion}) between 3 and 254`),
    ...politicasDeSoloAgregarPorEmpresa(),
  ],
);
