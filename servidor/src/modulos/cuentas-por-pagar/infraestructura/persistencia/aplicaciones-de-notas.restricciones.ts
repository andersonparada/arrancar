import { sql } from 'drizzle-orm';
import { check, foreignKey, index, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { contrasenas } from './contrasenas.tablas.js';

/** Las columnas de `aplicaciones_de_notas` que usan estas restricciones. */
type T = Record<'forma' | 'contrasenaId' | 'empresaId' | 'fecha', AnyPgColumn>;

/**
 * La forma de la aplicación y su vínculo con la contraseña que la repartió (solo la forma `contrasena`), y el índice por
 * empresa y fecha que usan los reportes con fecha de corte.
 */
export const restriccionesDeForma = (t: T) => [
  check('aplicaciones_forma_valida', sql`${t.forma} in ('automatica', 'manual', 'contrasena')`),
  check('aplicaciones_contrasena_de_su_forma', sql`(${t.forma} = 'contrasena') = (${t.contrasenaId} is not null)`),
  foreignKey({ name: 'aplicaciones_contrasena_fk', columns: [t.contrasenaId], foreignColumns: [contrasenas.id] }),
  index('aplicaciones_de_notas_corte_idx').on(t.empresaId, t.fecha),
  index('aplicaciones_contrasena_idx')
    .on(t.contrasenaId)
    .where(sql`${t.contrasenaId} is not null`),
];
