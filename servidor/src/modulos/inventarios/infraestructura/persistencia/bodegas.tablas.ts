import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { politicasDelRegistroConAlcance } from '../../../core/base-datos/alcance.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { ALCANCE_DE_BODEGAS } from './alcance-de-bodegas.js';
import { esquemaInventarios } from './esquema.tablas.js';

/**
 * Las bodegas de cada empresa. Además de la seguridad por empresa (RLS), cada usuario solo ve las que tiene asignadas
 * (`inventarios.accesos_a_bodegas`) o todas si tiene alcance total. La localidad y el responsable son informativos:
 * no dan ni quitan acceso. Las llaves de lo que apunte a una bodega usan `bodegas_id_empresa_unico`.
 */
export const bodegas = esquemaInventarios.table(
  'bodegas',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    codigo: text().notNull(),
    nombre: text().notNull(),
    /** Nulo: la bodega es de toda la empresa. */
    localidadId: uuid(),
    responsable: text(),
    responsableUsuarioId: uuid().references(() => usuarios.id, { onDelete: 'set null' }),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'bodegas_localidad_fk',
      columns: [t.localidadId, t.empresaId],
      foreignColumns: [localidades.id, localidades.empresaId],
    }),
    unique('bodegas_codigo_unico').on(t.empresaId, t.codigo),
    uniqueIndex('bodegas_nombre_unico').on(t.empresaId, nombreNormalizado(t.nombre)),
    unique('bodegas_id_empresa_unico').on(t.id, t.empresaId),
    index('bodegas_localidad_idx')
      .on(t.localidadId)
      .where(sql`${t.localidadId} is not null`),
    index('bodegas_responsable_idx')
      .on(t.responsableUsuarioId)
      .where(sql`${t.responsableUsuarioId} is not null`),
    check('bodegas_codigo_valido', sql`${t.codigo} ~ '^[A-Z0-9-]{1,12}$'`),
    check('bodegas_nombre_largo', sql`char_length(btrim(${t.nombre})) between 1 and 120`),
    check(
      'bodegas_responsable_largo',
      sql`${t.responsable} is null or char_length(btrim(${t.responsable})) between 1 and 150`,
    ),
    politicaPorEmpresa(),
    ...politicasDelRegistroConAlcance(ALCANCE_DE_BODEGAS),
  ],
);
