import { foreignKey, index, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { politicasDeTablaDeAccesos } from '../../../core/base-datos/alcance.js';
import { autoria, marcasDeTiempo } from '../../../core/base-datos/columnas.js';
import { empresaUsuarios, empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { ALCANCE_DE_FONDOS } from './alcance-de-fondos.js';
import { esquemaCajaChica } from './esquema.tablas.js';
import { fondos } from './fondos.tablas.js';

export { ALCANCE_DE_FONDOS } from './alcance-de-fondos.js';

/**
 * Qué fondos tiene asignados cada usuario de la empresa. Al quitar al usuario de la empresa o borrar el fondo, sus
 * accesos se borran solos. `creado_por` es quien asignó.
 *
 * Regla: esta tabla nunca lleva una política de `select` con subconsulta (recursión de políticas).
 */
export const accesosAFondos = esquemaCajaChica.table(
  'accesos_a_fondos',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    usuarioId: uuid().notNull(),
    fondoId: uuid().notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.usuarioId, t.fondoId] }),
    foreignKey({
      name: 'accesos_a_fondos_fondo_fk',
      columns: [t.fondoId, t.empresaId],
      foreignColumns: [fondos.id, fondos.empresaId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'accesos_a_fondos_miembro_fk',
      columns: [t.empresaId, t.usuarioId],
      foreignColumns: [empresaUsuarios.empresaId, empresaUsuarios.usuarioId],
    }).onDelete('cascade'),
    index('accesos_a_fondos_fondo_idx').on(t.fondoId),
    ...politicasDeTablaDeAccesos(ALCANCE_DE_FONDOS),
  ],
);
