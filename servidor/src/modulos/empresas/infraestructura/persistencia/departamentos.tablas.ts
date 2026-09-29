import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { politicaPorAlcanceOpcional } from '../../../core/base-datos/alcance.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { ALCANCE_DE_LOCALIDADES } from './alcance-de-localidades.js';
import { esquemaEmpresas } from './esquema.tablas.js';
import { localidades } from './localidades.tablas.js';

/**
 * Los departamentos de cada empresa (áreas o unidades internas, no los de Guatemala). Pueden ser de toda la
 * empresa (sin localidad) o de una sola localidad: se ven los que no tienen localidad y los de las localidades
 * que el usuario ve. Las llaves a otras tablas son `no action`: una empresa con su configuración, sin
 * movimientos, se puede eliminar.
 */
export const departamentos = esquemaEmpresas.table(
  'departamentos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    codigo: text().notNull(),
    nombre: text().notNull(),
    localidadId: uuid(),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'departamentos_localidad_fk',
      columns: [t.localidadId, t.empresaId],
      foreignColumns: [localidades.id, localidades.empresaId],
    }),
    unique('departamentos_codigo_unico').on(t.empresaId, t.codigo),
    // Único en la empresa aunque los departamentos sean de localidades distintas.
    uniqueIndex('departamentos_nombre_unico').on(t.empresaId, nombreNormalizado(t.nombre)),
    // Destino de las llaves compuestas de lo que apunte a un departamento.
    unique('departamentos_id_empresa_unico').on(t.id, t.empresaId),
    index('departamentos_localidad_idx').on(t.localidadId),
    check('departamentos_codigo_valido', sql`${t.codigo} ~ '^[A-Z0-9-]{1,12}$'`),
    check('departamentos_nombre_valido', sql`char_length(trim(${t.nombre})) between 1 and 120`),
    politicaPorEmpresa(),
    politicaPorAlcanceOpcional(ALCANCE_DE_LOCALIDADES, 'localidad_id'),
  ],
);
