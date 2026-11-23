import { sql } from 'drizzle-orm';
import { boolean, check, index, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { ClaveDeSistemaDeIngreso } from '../../dominio/concepto-de-ingreso.js';
import { esquemaLibroDeVentas } from './esquema.tablas.js';

/** Los conceptos de ingreso de cada empresa; la seguridad por empresa (RLS) oculta las de otras. */
export const conceptosDeIngreso = esquemaLibroDeVentas.table(
  'conceptos_de_ingreso',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    tipo: text().$type<'bien' | 'servicio'>().notNull(),
    /** Los conceptos que el módulo necesita para sus propias reglas; no se editan ni se inactivan. */
    claveDeSistema: text().$type<ClaveDeSistemaDeIngreso>(),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    uniqueIndex('conceptos_de_ingreso_nombre_unico').on(t.empresaId, nombreNormalizado(t.nombre)),
    uniqueIndex('conceptos_de_ingreso_clave_unica')
      .on(t.empresaId, t.claveDeSistema)
      .where(sql`${t.claveDeSistema} is not null`),
    unique('conceptos_de_ingreso_id_empresa_unico').on(t.id, t.empresaId),
    index('conceptos_de_ingreso_empresa_activo_idx').on(t.empresaId, t.activo),
    check('conceptos_de_ingreso_nombre_largo', sql`char_length(btrim(${t.nombre})) between 1 and 80`),
    check('conceptos_de_ingreso_tipo', sql`${t.tipo} in ('bien', 'servicio')`),
    check('conceptos_de_ingreso_clave', sql`${t.claveDeSistema} in ('venta_de_activo_fijo')`),
    check('conceptos_de_ingreso_sistema_activo', sql`${t.claveDeSistema} is null or ${t.activo}`),
    politicaPorEmpresa(),
  ],
);
