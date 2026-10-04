import { sql } from 'drizzle-orm';
import { boolean, check, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';

/** Los combustibles de cada empresa; la seguridad por empresa (RLS) oculta los de otras. */
export const combustibles = esquemaLibroDeCompras.table(
  'combustibles',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    uniqueIndex('combustibles_nombre_unico').on(t.empresaId, nombreNormalizado(t.nombre)),
    unique('combustibles_id_empresa_unico').on(t.id, t.empresaId),
    check('combustibles_nombre_largo', sql`char_length(btrim(${t.nombre})) between 1 and 80`),
    politicaPorEmpresa(),
  ],
);
