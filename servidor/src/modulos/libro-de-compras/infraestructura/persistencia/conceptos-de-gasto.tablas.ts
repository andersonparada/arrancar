import { sql } from 'drizzle-orm';
import { boolean, check, text, unique, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';

/** Los conceptos de gasto de cada empresa; la seguridad por empresa (RLS) oculta las de otras. */
export const conceptosDeGasto = esquemaLibroDeCompras.table(
  'conceptos_de_gasto',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    tipoPorOmision: text().$type<'bien' | 'servicio'>().notNull(),
    esProductoAgropecuario: boolean().default(false).notNull(),
    esActivoFijo: boolean().default(false).notNull(),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('conceptos_de_gasto_nombre_unico').on(t.empresaId, t.nombre),
    unique('conceptos_de_gasto_id_empresa_unico').on(t.id, t.empresaId),
    check('conceptos_de_gasto_nombre_largo', sql`char_length(btrim(${t.nombre})) between 1 and 120`),
    check('conceptos_de_gasto_tipo', sql`${t.tipoPorOmision} in ('bien', 'servicio')`),
    check('conceptos_de_gasto_activo_fijo_es_bien', sql`not ${t.esActivoFijo} or ${t.tipoPorOmision} = 'bien'`),
    politicaPorEmpresa(),
  ],
);
