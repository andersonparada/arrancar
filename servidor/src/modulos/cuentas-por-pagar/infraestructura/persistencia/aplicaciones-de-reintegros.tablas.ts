import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, numeric, unique, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { documentos } from './documentos.tablas.js';
import { esquemaCuentasPorPagar } from './esquema.tablas.js';
import { reintegros } from './reintegros.tablas.js';

/**
 * Cuánto de cada nota de crédito consume un reintegro. Que sea una nota registrada o autorizada, que no esté en una
 * contraseña vigente y que el monto no pase de su saldo libre lo cuida el dominio. Al eliminarse la nota (solo con
 * reintegros anulados) se van sus líneas.
 */
export const aplicacionesDeReintegros = esquemaCuentasPorPagar.table(
  'aplicaciones_de_reintegros',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    /** Solo para las llaves compuestas. */
    proveedorId: uuid().notNull(),
    reintegroId: uuid().notNull(),
    notaId: uuid().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    /** Pasa a `false` al anular el reintegro. */
    vigente: boolean().notNull().default(true),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'aplicaciones_de_reintegros_reintegro_fk',
      columns: [t.reintegroId, t.empresaId, t.proveedorId],
      foreignColumns: [reintegros.id, reintegros.empresaId, reintegros.proveedorId],
    }),
    foreignKey({
      name: 'aplicaciones_de_reintegros_nota_fk',
      columns: [t.notaId, t.empresaId, t.proveedorId],
      foreignColumns: [documentos.id, documentos.empresaId, documentos.proveedorId],
    }).onDelete('cascade'),
    check('aplicaciones_de_reintegros_monto_positivo', sql`${t.monto} > 0`),
    unique('aplicaciones_de_reintegros_par_unico').on(t.reintegroId, t.notaId),
    index('aplicaciones_de_reintegros_nota_idx')
      .on(t.notaId)
      .where(sql`${t.vigente}`),
    index('aplicaciones_de_reintegros_nota_todas_idx').on(t.notaId),
    politicaPorEmpresa(),
  ],
);
