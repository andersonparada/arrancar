import { sql } from 'drizzle-orm';
import { check, foreignKey, index, numeric, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { autoria, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { inmuebles } from '../../../empresas/infraestructura/persistencia/inmuebles.tablas.js';
import { esquemaParcelas } from './esquema.tablas.js';
import { parcelas } from './parcelas.tablas.js';

/**
 * Qué inmuebles registrales abarca cada parcela (N:M) y cuántos m² de cada uno. Al quitar la parcela se quitan sus
 * ligas; el inmueble sí es `no action`: uno en uso no se elimina, se inactiva.
 */
export const parcelasDeInmuebles = esquemaParcelas.table(
  'parcelas_de_inmuebles',
  {
    parcelaId: uuid().notNull(),
    inmuebleId: uuid().notNull(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    superficieM2: numeric('superficie_m2', { precision: 14, scale: 2 }),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ name: 'parcelas_de_inmuebles_pk', columns: [t.parcelaId, t.inmuebleId] }),
    foreignKey({
      name: 'parcelas_de_inmuebles_parcela_fk',
      columns: [t.parcelaId, t.empresaId],
      foreignColumns: [parcelas.id, parcelas.empresaId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'parcelas_de_inmuebles_inmueble_fk',
      columns: [t.inmuebleId, t.empresaId],
      foreignColumns: [inmuebles.id, inmuebles.empresaId],
    }),
    index('parcelas_de_inmuebles_inmueble_idx').on(t.inmuebleId),
    check('parcelas_de_inmuebles_superficie_valida', sql`${t.superficieM2} is null or ${t.superficieM2} > 0`),
    politicaPorEmpresa(),
  ],
);
