import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  numeric,
  primaryKey,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { articulos } from './articulos.tablas.js';
import { esquemaInventarios } from './esquema.tablas.js';
import { movimientos } from './movimientos.tablas.js';

/**
 * Con PEPS, lo que queda de cada entrada a su costo (§5.13). Es un dato **derivado**: el recálculo lo regenera desde el
 * kardex, así que borrarlo no es borrar un registro de negocio y no se audita fila por fila.
 */
export const capas = esquemaInventarios.table(
  'capas',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    articuloId: uuid().notNull(),
    movimientoDeEntradaId: uuid().notNull(),
    fecha: date({ mode: 'string' }).notNull(),
    secuencia: bigint({ mode: 'number' }).notNull(),
    cantidadInicial: numeric({ precision: 14, scale: 4 }).notNull(),
    valorInicial: numeric({ precision: 14, scale: 2 }).notNull(),
    cantidadRestante: numeric({ precision: 16, scale: 4 }).notNull(),
    valorRestante: numeric({ precision: 14, scale: 2 }).notNull(),
    vigente: boolean().notNull().default(true),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('capas_id_empresa_unico').on(t.id, t.empresaId),
    unique('capas_entrada_unica').on(t.movimientoDeEntradaId),
    foreignKey({
      name: 'capas_articulo_fk',
      columns: [t.articuloId, t.empresaId],
      foreignColumns: [articulos.id, articulos.empresaId],
    }),
    foreignKey({
      name: 'capas_entrada_fk',
      columns: [t.movimientoDeEntradaId, t.empresaId],
      foreignColumns: [movimientos.id, movimientos.empresaId],
    }),
    index('capas_orden_idx')
      .on(t.articuloId, t.fecha, t.secuencia)
      .where(sql`${t.vigente} and ${t.cantidadRestante} > 0`),
    check('capas_cantidades', sql`${t.cantidadInicial} > 0 and ${t.cantidadRestante} >= 0 and ${t.valorRestante} >= 0`),
    check('capas_valor_sin_cantidad', sql`${t.cantidadRestante} > 0 or ${t.valorRestante} = 0`),
    politicaPorEmpresa(),
  ],
);

/** De qué capa salió cuánto en cada salida (PEPS); también derivado. */
export const consumosDeCapas = esquemaInventarios.table(
  'consumos_de_capas',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    movimientoDeSalidaId: uuid().notNull(),
    capaId: uuid().notNull(),
    cantidad: numeric({ precision: 14, scale: 4 }).notNull(),
    valor: numeric({ precision: 14, scale: 2 }).notNull(),
  },
  (t) => [
    primaryKey({ name: 'consumos_de_capas_pk', columns: [t.movimientoDeSalidaId, t.capaId] }),
    foreignKey({
      name: 'consumos_de_capas_salida_fk',
      columns: [t.movimientoDeSalidaId, t.empresaId],
      foreignColumns: [movimientos.id, movimientos.empresaId],
    }),
    foreignKey({
      name: 'consumos_de_capas_capa_fk',
      columns: [t.capaId, t.empresaId],
      foreignColumns: [capas.id, capas.empresaId],
    }).onDelete('cascade'),
    index('consumos_de_capas_capa_idx').on(t.capaId),
    check('consumos_de_capas_montos', sql`${t.cantidad} > 0 and ${t.valor} >= 0`),
    politicaPorEmpresa(),
  ],
);
