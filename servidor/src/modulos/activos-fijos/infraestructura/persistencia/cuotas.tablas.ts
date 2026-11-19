import { boolean, date, numeric, text, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { LibroDeDepreciacion } from '../../dominio/depreciacion/tramo.js';
import { indicesDeCuota, llavesDeCuota, reglasDeCuota } from './cuotas.llaves-y-reglas.js';
import { esquemaActivosFijos } from './esquema.tablas.js';

/**
 * La cuota de depreciación de un activo en un libro y un mes (diseño §5.10). Al reabrir el mes pasa a
 * `vigente = false` y no se borra: conserva lo que se informó. `acumulada` es la del libro después de la cuota; el
 * centro de costo (`localidad_id`, `departamento_id`) es el del activo al cerrar. Solo `politicaPorEmpresa()`.
 */
export const cuotas = esquemaActivosFijos.table(
  'cuotas',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    periodo: date({ mode: 'string' }).notNull(),
    activoId: uuid().notNull(),
    libro: text().$type<LibroDeDepreciacion>().notNull(),
    tramoId: uuid().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    acumulada: numeric({ precision: 14, scale: 2 }).notNull(),
    localidadId: uuid(),
    departamentoId: uuid(),
    ocioso: boolean().default(false).notNull(),
    vigente: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [...llavesDeCuota(t), ...indicesDeCuota(t), ...reglasDeCuota(t), politicaPorEmpresa()],
);
