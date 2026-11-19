import { sql } from 'drizzle-orm';
import { check, foreignKey, numeric, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { autoria, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { articulos } from './articulos.tablas.js';
import { esquemaInventarios } from './esquema.tablas.js';

/**
 * Cantidad, valor y costo promedio de cada artículo en **toda** la empresa, después de su último movimiento vigente
 * (§5.12). Es un caché que se escribe solo en el caso de uso del movimiento. Como da la cantidad de todas las bodegas,
 * solo se lee para quien tiene alcance total (o para el motor de costeo).
 */
export const saldosDeArticulos = esquemaInventarios.table(
  'saldos_de_articulos',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    articuloId: uuid().notNull(),
    cantidad: numeric({ precision: 16, scale: 4 }).notNull(),
    valor: numeric({ precision: 14, scale: 2 }).notNull(),
    costoPromedio: numeric({ precision: 15, scale: 6 }).notNull(),
    ultimoMovimientoId: uuid(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ name: 'saldos_de_articulos_pk', columns: [t.empresaId, t.articuloId] }),
    foreignKey({
      name: 'saldos_de_articulos_articulo_fk',
      columns: [t.articuloId, t.empresaId],
      foreignColumns: [articulos.id, articulos.empresaId],
    }),
    check('saldos_de_articulos_no_negativos', sql`${t.cantidad} >= 0 and ${t.valor} >= 0 and ${t.costoPromedio} >= 0`),
    check('saldos_de_articulos_valor_sin_cantidad', sql`${t.cantidad} > 0 or ${t.valor} = 0`),
    politicaPorEmpresa(),
  ],
);
