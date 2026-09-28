import { boolean, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';
import { idPrimario, marcasDeTiempo } from '../../../base-datos/columnas.js';

/** Suscriptor del SaaS. Agrupa empresas y define qué módulos tiene contratados. */
export const cuentas = esquemaCore.table('cuentas', {
  id: idPrimario(),
  nombre: text().notNull(),
  activa: boolean().notNull().default(true),
  ...marcasDeTiempo,
});

export const cuentaModulos = esquemaCore.table(
  'cuenta_modulos',
  {
    cuentaId: uuid()
      .notNull()
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    moduloClave: text().notNull(),
    activadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.cuentaId, t.moduloClave] })],
);
