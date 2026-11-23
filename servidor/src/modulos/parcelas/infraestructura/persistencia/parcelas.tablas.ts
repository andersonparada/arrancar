import { boolean, numeric, smallint, text, uuid } from 'drizzle-orm/pg-core';
import { politicaPorAlcance } from '../../../core/base-datos/alcance.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { ALCANCE_DE_LOCALIDADES } from '../../../empresas/infraestructura/persistencia/accesos-a-localidades.tablas.js';
import type { FormaDeTenencia } from '../../dominio/datos-de-parcela.js';
import { esquemaParcelas } from './esquema.tablas.js';
import { llavesDeParcela, reglasDeParcela, unicosEIndicesDeParcela } from './parcelas.restricciones.js';

/**
 * Las parcelas (potreros, lotes, tablones…) de cada localidad, en árbol con madre opcional de la misma localidad.
 * Además de la seguridad por empresa (RLS), cada usuario solo ve las parcelas de las localidades que ve. Las
 * superficies son una copia de la medición vigente. Las llaves de otras tablas hacia aquí son `no action`: una
 * parcela con historial no se elimina, se inactiva.
 */
export const parcelas = esquemaParcelas.table(
  'parcelas',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    localidadId: uuid().notNull(),
    parcelaMadreId: uuid(),
    nivel: smallint().notNull(),
    tipoId: uuid().notNull(),
    codigo: text().notNull(),
    nombre: text().notNull(),
    formaDeTenencia: text().$type<FormaDeTenencia>().notNull(),
    superficieTotalM2: numeric('superficie_total_m2', { precision: 14, scale: 2 }),
    superficieUtilM2: numeric('superficie_util_m2', { precision: 14, scale: 2 }),
    latitud: numeric({ precision: 9, scale: 6 }),
    longitud: numeric({ precision: 9, scale: 6 }),
    colindanciaNorte: text(),
    colindanciaSur: text(),
    colindanciaOriente: text(),
    colindanciaPoniente: text(),
    activo: boolean().default(true).notNull(),
    observaciones: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    ...llavesDeParcela(t),
    ...unicosEIndicesDeParcela(t),
    ...reglasDeParcela(t),
    politicaPorEmpresa(),
    politicaPorAlcance(ALCANCE_DE_LOCALIDADES, 'localidad_id'),
  ],
);
