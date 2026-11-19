import { boolean, check, index, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { autoria, idPrimario, marcasDeTiempo, politicaPorCuenta } from '../../../core/base-datos/columnas.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { esquemaTerceros, terceros } from './terceros.tablas.js';

/** Persona de contacto de un tercero (normalmente jurídico). */
export const contactos = esquemaTerceros.table(
  'contactos',
  {
    id: idPrimario(),
    cuentaId: uuid()
      .notNull()
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    terceroId: uuid()
      .notNull()
      .references(() => terceros.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    cargo: text(),
    telefono: text(),
    whatsapp: text(),
    correo: text(),
    notas: text(),
    recibeAvisosDePago: boolean().notNull().default(false),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    index('contactos_tercero_idx').on(t.terceroId),
    check('contactos_aviso_con_correo', sql`not ${t.recibeAvisosDePago} or ${t.correo} is not null`),
    politicaPorCuenta(),
  ],
);
