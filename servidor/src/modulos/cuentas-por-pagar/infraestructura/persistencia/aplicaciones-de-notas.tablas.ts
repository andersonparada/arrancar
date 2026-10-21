import { sql } from 'drizzle-orm';
import { check, foreignKey, index, numeric, unique, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { documentos } from './documentos.tablas.js';
import { esquemaCuentasPorPagar } from './esquema.tablas.js';

/**
 * Cuánto de cada nota de crédito rebaja cada cargo. Lo que una nota no aplica es su saldo libre. Que la suma por nota
 * no pase de su total y la de un cargo no pase de su neto lo cuida el dominio, con las filas bloqueadas.
 */
export const aplicacionesDeNotas = esquemaCuentasPorPagar.table(
  'aplicaciones_de_notas',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    /** Solo para las llaves: garantiza que nota y cargo son del mismo proveedor. */
    proveedorId: uuid().notNull(),
    notaId: uuid().notNull(),
    cargoId: uuid().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'aplicaciones_nota_fk',
      columns: [t.notaId, t.empresaId, t.proveedorId],
      foreignColumns: [documentos.id, documentos.empresaId, documentos.proveedorId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'aplicaciones_cargo_fk',
      columns: [t.cargoId, t.empresaId, t.proveedorId],
      foreignColumns: [documentos.id, documentos.empresaId, documentos.proveedorId],
    }),
    check('aplicaciones_distintos', sql`${t.notaId} <> ${t.cargoId}`),
    check('aplicaciones_monto_positivo', sql`${t.monto} > 0`),
    unique('aplicaciones_nota_cargo_unico').on(t.notaId, t.cargoId),
    index('aplicaciones_cargo_idx').on(t.cargoId),
    politicaPorEmpresa(),
  ],
);
