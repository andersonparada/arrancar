import { sql } from 'drizzle-orm';
import { boolean, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';

/** Los conceptos de cada empresa; la seguridad por empresa (RLS) oculta las de otras. */
export const conceptos = esquemaBancos.table(
  'conceptos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    aplicaA: text().$type<'credito' | 'debito' | 'ambos'>().notNull(),
    actividadDeFlujo: text().$type<'operacion' | 'inversion' | 'financiamiento' | 'ninguna'>().notNull(),
    grupoDeFlujo: text(),
    esCargoBancario: boolean().default(false).notNull(),
    pideDatosDeIntereses: boolean().default(false).notNull(),
    admiteFactura: boolean().default(false).notNull(),
    claveDeSistema: text(),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('conceptos_nombre_unico').on(t.empresaId, t.nombre),
    uniqueIndex('conceptos_clave_de_sistema_unica')
      .on(t.empresaId, t.claveDeSistema)
      .where(sql`${t.claveDeSistema} is not null`),
    politicaPorEmpresa(),
  ],
);
