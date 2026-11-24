import { date, integer, numeric, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { CausaDeDivision, EstadoDeDivision } from '../../dominio/division.js';
import { indicesDeDivision, llavesDeDivision, reglasDeDivision } from './divisiones.llaves-y-reglas.js';
import { esquemaActivosFijos } from './esquema.tablas.js';

const dinero = () => numeric({ precision: 14, scale: 2 });

/**
 * Las divisiones de un activo con cantidad (diseño §5.15): de uno con N piezas sale otro con K, con su parte del costo, de
 * la depreciación acumulada y del residual. Nunca se borran: se anulan y quedan como rastro (el activo nuevo sí se borra,
 * y la llave queda en nulo). Solo `politicaPorEmpresa()`.
 */
export const divisiones = esquemaActivosFijos.table(
  'divisiones',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    activoOrigenId: uuid().notNull(),
    activoNuevoId: uuid(),
    codigoDelActivoNuevo: text().notNull(),
    fecha: date({ mode: 'string' }).notNull(),
    periodo: date({ mode: 'string' }).notNull(),
    cantidadOriginal: integer().notNull(),
    cantidadSeparada: integer().notNull(),
    causa: text().$type<CausaDeDivision>().notNull(),
    motivo: text().notNull(),
    costoSeparado: dinero().notNull(),
    costoFiscalSeparado: dinero().notNull(),
    acumuladaContableSeparada: dinero().notNull(),
    acumuladaFiscalSeparada: dinero().notNull(),
    residualSeparado: dinero().notNull(),
    estado: text().$type<EstadoDeDivision>().notNull().default('vigente'),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('divisiones_id_empresa_unico').on(t.id, t.empresaId),
    ...llavesDeDivision(t),
    ...indicesDeDivision(t),
    ...reglasDeDivision(t),
    politicaPorEmpresa(),
  ],
);
