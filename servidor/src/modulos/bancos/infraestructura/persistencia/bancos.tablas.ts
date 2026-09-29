import { boolean, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';

/** Los bancos de cada empresa; la seguridad por empresa (RLS) oculta las de otras. */
export const bancos = esquemaBancos.table(
  'bancos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    observaciones: text(),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [uniqueIndex('bancos_nombre_unico').on(t.empresaId, nombreNormalizado(t.nombre)), politicaPorEmpresa()],
);
