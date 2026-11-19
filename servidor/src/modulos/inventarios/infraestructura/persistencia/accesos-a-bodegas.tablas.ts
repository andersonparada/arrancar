import { foreignKey, index, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { politicasDeTablaDeAccesos } from '../../../core/base-datos/alcance.js';
import { autoria, marcasDeTiempo } from '../../../core/base-datos/columnas.js';
import { empresaUsuarios, empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { ALCANCE_DE_BODEGAS } from './alcance-de-bodegas.js';
import { bodegas } from './bodegas.tablas.js';
import { esquemaInventarios } from './esquema.tablas.js';

export { ALCANCE_DE_BODEGAS } from './alcance-de-bodegas.js';

/**
 * Qué bodegas tiene asignadas cada usuario de la empresa. Al quitar al usuario de la empresa o borrar la bodega, sus
 * accesos se borran solos. `creado_por` es quien asignó.
 *
 * Regla: esta tabla nunca lleva una política de `select` con subconsulta (recursión de políticas).
 */
export const accesosABodegas = esquemaInventarios.table(
  'accesos_a_bodegas',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    usuarioId: uuid().notNull(),
    bodegaId: uuid().notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.usuarioId, t.bodegaId] }),
    foreignKey({
      name: 'accesos_a_bodegas_bodega_fk',
      columns: [t.bodegaId, t.empresaId],
      foreignColumns: [bodegas.id, bodegas.empresaId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'accesos_a_bodegas_miembro_fk',
      columns: [t.empresaId, t.usuarioId],
      foreignColumns: [empresaUsuarios.empresaId, empresaUsuarios.usuarioId],
    }).onDelete('cascade'),
    index('accesos_a_bodegas_bodega_idx').on(t.bodegaId),
    ...politicasDeTablaDeAccesos(ALCANCE_DE_BODEGAS),
  ],
);
