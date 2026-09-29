import { foreignKey, index, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { politicasDeTablaDeAccesos } from '../../../core/base-datos/alcance.js';
import { autoria, marcasDeTiempo } from '../../../core/base-datos/columnas.js';
import { empresaUsuarios, empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { ALCANCE_DE_LOCALIDADES } from './alcance-de-localidades.js';
import { esquemaEmpresas } from './esquema.tablas.js';
import { localidades } from './localidades.tablas.js';

export { ALCANCE_DE_LOCALIDADES } from './alcance-de-localidades.js';

/**
 * Qué localidades tiene asignadas cada usuario de la empresa. Al quitar al usuario de la empresa o
 * borrar la localidad, sus accesos se borran solos. `creado_por` es quien asignó.
 *
 * Regla: esta tabla nunca lleva una política de `select` con subconsulta (recursión de políticas).
 */
export const accesosALocalidades = esquemaEmpresas.table(
  'accesos_a_localidades',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    usuarioId: uuid().notNull(),
    localidadId: uuid().notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.usuarioId, t.localidadId] }),
    foreignKey({
      name: 'accesos_a_localidades_localidad_fk',
      columns: [t.localidadId, t.empresaId],
      foreignColumns: [localidades.id, localidades.empresaId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'accesos_a_localidades_miembro_fk',
      columns: [t.empresaId, t.usuarioId],
      foreignColumns: [empresaUsuarios.empresaId, empresaUsuarios.usuarioId],
    }).onDelete('cascade'),
    index('accesos_a_localidades_localidad_idx').on(t.localidadId),
    ...politicasDeTablaDeAccesos(ALCANCE_DE_LOCALIDADES),
  ],
);
