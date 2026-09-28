import { boolean, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorCuenta } from '../../../core/base-datos/columnas.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { esquemaTerceros, terceros } from './terceros.tablas.js';

/** Papel de cliente de un tercero; cada tercero tiene a lo sumo uno. */
export const clientes = esquemaTerceros.table(
  'clientes',
  {
    id: idPrimario(),
    cuentaId: uuid()
      .notNull()
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    terceroId: uuid()
      .notNull()
      .references(() => terceros.id, { onDelete: 'cascade' }),
    clase: text().notNull(),
    activo: boolean().notNull().default(true),
    notas: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [uniqueIndex('clientes_tercero_idx').on(t.terceroId), politicaPorCuenta()],
);
