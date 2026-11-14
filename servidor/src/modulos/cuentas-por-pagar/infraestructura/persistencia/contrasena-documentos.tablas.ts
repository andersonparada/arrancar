import { sql } from 'drizzle-orm';
import { boolean, foreignKey, index, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { contrasenas } from './contrasenas.tablas.js';
import { documentos } from './documentos.tablas.js';
import { esquemaCuentasPorPagar } from './esquema.tablas.js';

/**
 * Los documentos de cada contraseña. Las llaves compuestas garantizan que son del proveedor y de la empresa de la
 * contraseña; el único parcial, que un documento está en una sola contraseña vigente. Al anular la contraseña sus
 * filas quedan con `vigente = false`; al quitar un documento se borra su fila.
 */
export const contrasenaDocumentos = esquemaCuentasPorPagar.table(
  'contrasena_documentos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    /** Solo para las llaves compuestas. */
    proveedorId: uuid().notNull(),
    contrasenaId: uuid().notNull(),
    documentoId: uuid().notNull(),
    /** Pasa a `false` al anular la contraseña. */
    vigente: boolean().notNull().default(true),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'contrasena_documentos_contrasena_fk',
      columns: [t.contrasenaId, t.empresaId, t.proveedorId],
      foreignColumns: [contrasenas.id, contrasenas.empresaId, contrasenas.proveedorId],
    }),
    foreignKey({
      name: 'contrasena_documentos_documento_fk',
      columns: [t.documentoId, t.empresaId, t.proveedorId],
      foreignColumns: [documentos.id, documentos.empresaId, documentos.proveedorId],
    }).onDelete('cascade'),
    unique('contrasena_documentos_par_unico').on(t.contrasenaId, t.documentoId),
    uniqueIndex('contrasena_documentos_vigente_unico')
      .on(t.documentoId)
      .where(sql`${t.vigente}`),
    index('contrasena_documentos_documento_idx').on(t.documentoId),
    politicaPorEmpresa(),
  ],
);
