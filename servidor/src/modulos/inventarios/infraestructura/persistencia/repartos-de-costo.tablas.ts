import { sql } from 'drizzle-orm';
import { check, foreignKey, index, numeric, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { autoria, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { BASES_DE_REPARTO, type BaseDeReparto } from '../../dominio/rebaja.js';
import { documentos } from './documentos.tablas.js';
import { esquemaInventarios } from './esquema.tablas.js';
import { movimientos } from './movimientos.tablas.js';

/**
 * Lo que una rebaja (o un costo adicional) le toca a cada entrada de la factura (§5.15). `monto` es fijo: lo decide
 * quien reparte. `absorbido` y `a_resultados` son **derivados**: dependen de las salidas anteriores al documento, así
 * que el recálculo los vuelve a calcular (V-2) y los deja iguales al movimiento de valor de la entrada.
 */
export const repartosDeCosto = esquemaInventarios.table(
  'repartos_de_costo',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    documentoId: uuid().notNull(),
    movimientoDeEntradaId: uuid().notNull(),
    baseDelReparto: text().$type<BaseDeReparto>().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    absorbido: numeric({ precision: 14, scale: 2 }).notNull(),
    aResultados: numeric({ precision: 14, scale: 2 }).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ name: 'repartos_de_costo_pk', columns: [t.documentoId, t.movimientoDeEntradaId] }),
    foreignKey({
      name: 'repartos_de_costo_documento_fk',
      columns: [t.documentoId, t.empresaId],
      foreignColumns: [documentos.id, documentos.empresaId],
    }),
    foreignKey({
      name: 'repartos_de_costo_entrada_fk',
      columns: [t.movimientoDeEntradaId, t.empresaId],
      foreignColumns: [movimientos.id, movimientos.empresaId],
    }),
    index('repartos_de_costo_entrada_idx').on(t.movimientoDeEntradaId),
    check(
      'repartos_de_costo_base',
      sql`${t.baseDelReparto} in (${sql.raw(BASES_DE_REPARTO.map((base) => `'${base}'`).join(', '))})`,
    ),
    check('repartos_de_costo_suma', sql`${t.absorbido} + ${t.aResultados} = ${t.monto}`),
    politicaPorEmpresa(),
  ],
);
