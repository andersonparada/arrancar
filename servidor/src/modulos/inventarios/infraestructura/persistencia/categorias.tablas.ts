import { sql } from 'drizzle-orm';
import { boolean, check, index, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { TIPOS_DE_INVENTARIO, type TipoDeInventario } from '../../dominio/tipos-de-inventario.js';
import { esquemaInventarios } from './esquema.tablas.js';

export const tiposEnSql = sql.raw(TIPOS_DE_INVENTARIO.map((tipo) => `'${tipo}'`).join(', '));

/** Las categorías de cada empresa; la seguridad por empresa (RLS) oculta las de otras. */
export const categorias = esquemaInventarios.table(
  'categorias',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    tipoDeInventarioPorOmision: text().$type<TipoDeInventario>().notNull(),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    uniqueIndex('categorias_nombre_unico').on(t.empresaId, nombreNormalizado(t.nombre)),
    unique('categorias_id_empresa_unico').on(t.id, t.empresaId),
    index('categorias_empresa_activo_idx').on(t.empresaId, t.activo),
    check('categorias_nombre_largo', sql`char_length(btrim(${t.nombre})) between 1 and 80`),
    check('categorias_tipo_de_inventario', sql`${t.tipoDeInventarioPorOmision} in (${tiposEnSql})`),
    politicaPorEmpresa(),
  ],
);
