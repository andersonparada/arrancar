import { boolean, date, numeric, smallint, text, unique, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { CausaDeTramo, LibroDeDepreciacion } from '../../dominio/depreciacion/tramo.js';
import { esquemaActivosFijos } from './esquema.tablas.js';
import { indicesDeTramo, llavesDeTramo, reglasDeTramo } from './tramos.llaves-y-reglas.js';

/**
 * Los tramos de depreciación de cada activo y libro (diseño §5.8): qué falta depreciar al empezar el tramo y cuánto es
 * la cuota mensual, calculados por el dominio (§7) y guardados para poder auditar el cálculo. `mejora_id` dice qué
 * mejora o costo posterior lo creó; `division_id` (AFI-5) llega con su tabla. Solo `politicaPorEmpresa()`.
 */
export const tramos = esquemaActivosFijos.table(
  'tramos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    activoId: uuid().notNull(),
    libro: text().$type<LibroDeDepreciacion>().notNull(),
    desdePeriodo: date({ mode: 'string' }).notNull(),
    causa: text().$type<CausaDeTramo>().notNull(),
    mejoraId: uuid(),
    porDepreciar: numeric({ precision: 14, scale: 2 }).notNull(),
    valorResidual: numeric({ precision: 14, scale: 2 }).notNull(),
    meses: smallint(),
    porcentaje: numeric({ precision: 5, scale: 2 }),
    baseDelPorcentaje: numeric({ precision: 14, scale: 2 }),
    cuotaMensual: numeric({ precision: 14, scale: 2 }).notNull(),
    excesoDeNotaDeCredito: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    vigente: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('tramos_id_empresa_unico').on(t.id, t.empresaId),
    ...llavesDeTramo(t),
    ...indicesDeTramo(t),
    ...reglasDeTramo(t),
    politicaPorEmpresa(),
  ],
);
