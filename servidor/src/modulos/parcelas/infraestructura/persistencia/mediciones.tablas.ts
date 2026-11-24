import { date, numeric, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { archivos } from '../../../core/archivos/infraestructura/persistencia/archivos.tablas.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { FuenteDeMedicion } from '../../dominio/medicion.js';
import type { UnidadDeSuperficie } from '../../dominio/superficie.js';
import { esquemaParcelas } from './esquema.tablas.js';
import { llavesEIndicesDeMedicion, reglasDeMedicion } from './mediciones.restricciones.js';

/**
 * Las mediciones de cada parcela: la superficie total y útil desde una fecha, con la cifra y la unidad originales
 * (cambiar después un factor de la configuración no altera lo ya guardado). Nunca se borran: se anulan. Solo
 * `politicaPorEmpresa()`: el caso de uso carga la parcela (que sí lleva el alcance por localidad) antes de escribir.
 */
export const mediciones = esquemaParcelas.table(
  'mediciones',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    parcelaId: uuid().notNull(),
    vigenteDesde: date({ mode: 'string' }).notNull(),
    fuente: text().$type<FuenteDeMedicion>().notNull(),
    superficieTotalM2: numeric('superficie_total_m2', { precision: 14, scale: 2 }).notNull(),
    superficieUtilM2: numeric('superficie_util_m2', { precision: 14, scale: 2 }).notNull(),
    cantidadOriginal: numeric({ precision: 16, scale: 4 }).notNull(),
    unidadOriginal: text().$type<UnidadDeSuperficie>().notNull(),
    varasPorLadoDeCuerda: smallint(),
    documento: text(),
    archivoId: uuid().references(() => archivos.id),
    estado: text().$type<'vigente' | 'anulada'>().notNull().default('vigente'),
    anuladaEn: timestamp({ withTimezone: true }),
    anuladaPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [...llavesEIndicesDeMedicion(t), ...reglasDeMedicion(t), politicaPorEmpresa()],
);
