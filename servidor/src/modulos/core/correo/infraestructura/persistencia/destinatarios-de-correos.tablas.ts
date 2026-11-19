import { sql } from 'drizzle-orm';
import { check, index, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { deLaTransaccion, idPrimario, politicasDeSoloAgregarPorEmpresa } from '../../../base-datos/columnas.js';
import { cuentas } from '../../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';
import { correosSalientes } from './correos-salientes.tablas.js';

/** Máximo de destinatarios (para y copia) de un correo. */
export const MAXIMO_DE_DESTINATARIOS = 10;

/**
 * A quién va cada correo. La app solo agrega y lee: el resultado por destinatario (`aceptado` o `rechazado`) lo
 * pone `core.resolver_correo`. `origen_id` no tiene llave foránea (core no apunta a tablas de los módulos).
 */
export const destinatariosDeCorreos = esquemaCore.table(
  'destinatarios_de_correos',
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
    clase: text().notNull(),
    direccion: text().notNull(),
    nombre: text(),
    origen: text().notNull(),
    origenId: uuid(),
    resultado: text(),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('destinatarios_de_correos_direccion_unica').on(t.correoSalienteId, t.direccion),
    // Cupo por destinatario: sin distinguir mayúsculas de la parte local (`A@x.com` y `a@x.com` son uno solo).
    index('destinatarios_de_correos_cupo_idx').on(t.cuentaId, sql`lower(${t.direccion})`, t.creadoEn),
    // Conteos por cuenta y por instalación de los cupos por hora y por día (`core.reservar_cupo_de_correo`).
    index('destinatarios_de_correos_cuenta_fecha_idx').on(t.cuentaId, t.creadoEn),
    index('destinatarios_de_correos_fecha_idx').on(t.creadoEn),
    check('destinatarios_de_correos_clase_valida', sql`${t.clase} in ('para', 'copia')`),
    check('destinatarios_de_correos_direccion_larga', sql`char_length(${t.direccion}) between 3 and 254`),
    check('destinatarios_de_correos_nombre_largo', sql`${t.nombre} is null or char_length(${t.nombre}) <= 150`),
    check('destinatarios_de_correos_origen_valido', sql`${t.origen} in ('tercero', 'contacto', 'empresa', 'usuario')`),
    check(
      'destinatarios_de_correos_resultado_valido',
      sql`${t.resultado} is null or ${t.resultado} in ('aceptado', 'rechazado')`,
    ),
    ...politicasDeSoloAgregarPorEmpresa(),
  ],
);
