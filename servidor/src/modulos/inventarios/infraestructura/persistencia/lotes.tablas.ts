import { sql } from 'drizzle-orm';
import { check, date, foreignKey, index, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { articulos } from './articulos.tablas.js';
import { esquemaInventarios } from './esquema.tablas.js';

/** Los lotes de los artículos que los manejan, con su vencimiento si lo llevan. */
export const lotes = esquemaInventarios.table(
  'lotes',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    articuloId: uuid().notNull(),
    codigo: text().notNull(),
    fechaDeVencimiento: date({ mode: 'string' }),
    fechaDeFabricacion: date({ mode: 'string' }),
    observaciones: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('lotes_id_empresa_unico').on(t.id, t.empresaId),
    uniqueIndex('lotes_codigo_unico').on(t.articuloId, sql`upper(${t.codigo})`),
    foreignKey({
      name: 'lotes_articulo_fk',
      columns: [t.articuloId, t.empresaId],
      foreignColumns: [articulos.id, articulos.empresaId],
    }).onDelete('cascade'),
    index('lotes_por_vencer_idx')
      .on(t.empresaId, t.fechaDeVencimiento)
      .where(sql`${t.fechaDeVencimiento} is not null`),
    check('lotes_codigo_largo', sql`char_length(btrim(${t.codigo})) between 1 and 40`),
    check('lotes_observaciones_largo', sql`char_length(${t.observaciones}) between 1 and 500`),
    politicaPorEmpresa(),
  ],
);
