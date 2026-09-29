import { boolean, index, text, type AnyPgColumn, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
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
    /** Sin separadores y en mayúsculas; lo llena el repositorio y solo sirve para la unicidad. */
    numeroNormalizado: text().notNull(),
    tipo: text().$type<'monetaria' | 'ahorro'>().notNull(),
    observaciones: text(),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    uniqueIndex('cuentas_bancarias_nombre_unico').on(t.empresaId, nombreNormalizado(t.nombre)),
    unique('cuentas_bancarias_numero_por_banco_unico').on(t.empresaId, t.bancoId, t.numeroNormalizado),
    index('cuentas_bancarias_banco_idx').on(t.bancoId),
    politicaPorEmpresa(),
  ],
);
