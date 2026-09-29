import { sql } from 'drizzle-orm';
import { check, date, timestamp, uuid } from 'drizzle-orm/pg-core';
import { autoria, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaEmpresas } from './esquema.tablas.js';

/**
 * Fecha de inicio de cada empresa y cuándo se cerró su carga inicial (una fila por empresa, creada
 * al registrar la fecha). Es una tabla aparte de los datos fiscales porque los módulos la bloquean
 * `for share` al registrar saldos iniciales y cerrarla es `for update`.
 */
export const cargasIniciales = esquemaEmpresas.table(
  'cargas_iniciales',
  {
    empresaId: uuid()
      .primaryKey()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    fechaDeInicio: date().notNull(),
    cerradaEn: timestamp({ withTimezone: true }),
    cerradaPor: uuid(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    check('cargas_iniciales_cierre_completo', sql`(${t.cerradaEn} is null) = (${t.cerradaPor} is null)`),
    politicaPorEmpresa(),
  ],
);
