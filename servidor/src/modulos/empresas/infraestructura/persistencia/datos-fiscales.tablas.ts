import { sql } from 'drizzle-orm';
import { check, text, uuid } from 'drizzle-orm/pg-core';
import { autoria, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaEmpresas } from './esquema.tablas.js';

/**
 * Razón social y nombre comercial de cada empresa (una fila por empresa, creada al guardar por
 * primera vez). La seguridad por empresa (RLS) oculta las de otras empresas.
 */
export const datosFiscales = esquemaEmpresas.table(
  'datos_fiscales',
  {
    empresaId: uuid()
      .primaryKey()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    razonSocial: text(),
    nombreComercial: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    check(
      'datos_fiscales_razon_social_largo',
      sql`${t.razonSocial} is null or char_length(${t.razonSocial}) between 1 and 200`,
    ),
    check(
      'datos_fiscales_nombre_comercial_largo',
      sql`${t.nombreComercial} is null or char_length(${t.nombreComercial}) between 1 and 200`,
    ),
    politicaPorEmpresa(),
  ],
);
