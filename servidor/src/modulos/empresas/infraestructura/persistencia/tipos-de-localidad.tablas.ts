import { sql } from 'drizzle-orm';
import { boolean, check, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaEmpresas } from './esquema.tablas.js';

/** Los tipos de localidad de cada empresa; la seguridad por empresa (RLS) oculta las de otras. */
export const tiposDeLocalidad = esquemaEmpresas.table(
  'tipos_de_localidad',
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
    uniqueIndex('tipos_de_localidad_nombre_unico').on(t.empresaId, nombreNormalizado(t.nombre)),
    // Destino de la llave foránea compuesta de las localidades (H5b-4): un tipo solo se usa dentro de su empresa.
    unique('tipos_de_localidad_id_empresa_unico').on(t.id, t.empresaId),
    check('tipos_de_localidad_nombre_valido', sql`char_length(trim(${t.nombre})) between 1 and 60`),
    politicaPorEmpresa(),
  ],
);
