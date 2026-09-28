import { boolean, index, text, type AnyPgColumn, unique, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';
import { bancos } from './bancos.tablas.js';

/** Las cuentas bancarias de cada empresa; la seguridad por empresa (RLS) oculta las de otras. */
export const cuentasBancarias = esquemaBancos.table(
  'cuentas_bancarias',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    bancoId: uuid()
      .references((): AnyPgColumn => bancos.id)
      .notNull(),
    numero: text().notNull(),
    tipo: text().$type<'monetaria' | 'ahorro'>().notNull(),
    observaciones: text(),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('cuentas_bancarias_nombre_unico').on(t.empresaId, t.nombre),
    unique('cuentas_bancarias_numero_unico').on(t.empresaId, t.numero),
    index('cuentas_bancarias_banco_idx').on(t.bancoId),
    politicaPorEmpresa(),
  ],
);
