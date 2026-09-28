import { sql } from 'drizzle-orm';
import { boolean, char, foreignKey, index, pgSchema, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorCuenta } from '../../../core/base-datos/columnas.js';
import { archivos } from '../../../core/archivos/infraestructura/persistencia/archivos.tablas.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { municipios } from '../../../core/geografia/infraestructura/persistencia/geografia.tablas.js';

/** Esquema de PostgreSQL del módulo de terceros. */
export const esquemaTerceros = pgSchema('terceros');

/** Consumidor final: NIT reservado que no exige unicidad por cuenta. */
export const NIT_CONSUMIDOR_FINAL = 'CF';

/**
 * Persona o empresa con la que trata la cuenta. Se registra una sola vez y la
 * usan todas las empresas de la cuenta; lo que ocurre con ella (ventas, saldos,
 * jornales) es responsabilidad de cada módulo que la referencia.
 */
export const terceros = esquemaTerceros.table(
  'terceros',
  {
    id: idPrimario(),
    cuentaId: uuid()
      .notNull()
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    tipo: text().notNull(), // 'individual' | 'juridica'
    nombres: text(),
    apellidos: text(),
    razonSocial: text(),
    nombreComercial: text(),
    /** Nombre comercial, razón social o nombres + apellidos; lo calcula el servicio. */
    nombreMostrar: text().notNull(),
    nit: text(),
    dpi: text(),
    telefono: text(),
    whatsapp: text(),
    correo: text(),
    departamentoCodigo: char({ length: 2 }),
    municipioCodigo: char({ length: 2 }),
    direccion: text(),
    fotoArchivoId: uuid().references(() => archivos.id, { onDelete: 'set null' }),
    notas: text(),
    activo: boolean().notNull().default(true),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    index('terceros_cuenta_idx').on(t.cuentaId),
    // El NIT es único por cuenta, salvo "CF" (consumidor final), que se repite.
    // El valor va con sql.raw (no enlazado): un WHERE de índice no admite parámetros.
    uniqueIndex('terceros_nit_por_cuenta_idx')
      .on(t.cuentaId, t.nit)
      .where(sql.raw(`nit <> '${NIT_CONSUMIDOR_FINAL}'`)),
    uniqueIndex('terceros_dpi_por_cuenta_idx').on(t.cuentaId, t.dpi),
    foreignKey({
      columns: [t.departamentoCodigo, t.municipioCodigo],
      foreignColumns: [municipios.departamentoCodigo, municipios.codigo],
    }),
    politicaPorCuenta(),
  ],
);
