import { boolean, date, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { idPrimario, marcasDeTiempo, politicaPorCuenta } from '../../core/base-datos/columnas.js';
import { cuentas } from '../../core/esquemas/cuentas.esquema.js';
import { esquemaTerceros, terceros } from './terceros.esquema.js';

/** Papel de trabajador de un tercero; cada tercero tiene a lo sumo uno. */
export const trabajadores = esquemaTerceros.table(
  'trabajadores',
  {
    id: idPrimario(),
    cuentaId: uuid()
      .notNull()
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    terceroId: uuid()
      .notNull()
      .references(() => terceros.id, { onDelete: 'cascade' }),
    cargo: text(),
    fechaIngreso: date(),
    fechaSalida: date(),
    activo: boolean().notNull().default(true),
    notas: text(),
    ...marcasDeTiempo,
  },
  (t) => [uniqueIndex('trabajadores_tercero_idx').on(t.terceroId), politicaPorCuenta()],
);
