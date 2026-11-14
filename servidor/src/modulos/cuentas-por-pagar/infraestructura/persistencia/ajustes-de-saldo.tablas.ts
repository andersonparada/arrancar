import { sql } from 'drizzle-orm';
import { date, foreignKey, index, numeric, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { restriccionesDeEstadoDelAjuste, restriccionesDeValoresDelAjuste } from './ajustes-de-saldo.restricciones.js';
import { documentos } from './documentos.tablas.js';
import { esquemaCuentasPorPagar } from './esquema.tablas.js';
import { pagos } from './pagos.tablas.js';

/**
 * Baja (todo o parte) del saldo libre de una nota de crédito, o diferencia menor de un cargo nacida de un pago, con su
 * causa y motivo. No se borra: se anula. Que el
 * documento sea una nota registrada o autorizada, que la suma con las aplicaciones no pase de su base y el tope de la
 * diferencia menor lo cuida el dominio, con la nota bloqueada. Las restricciones viven en
 * `ajustes-de-saldo.restricciones.ts`.
 */
export const ajustesDeSaldo = esquemaCuentasPorPagar.table(
  'ajustes_de_saldo',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    /** Solo para la llave compuesta. */
    proveedorId: uuid().notNull(),
    /** La nota de crédito cuyo saldo libre se ajusta. */
    documentoId: uuid().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    /** Fecha contable del ajuste. */
    fecha: date().notNull(),
    causa: text().notNull(),
    motivo: text().notNull(),
    referencia: text(),
    estado: text().notNull().default('vigente'),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    /** El pago que dejó esta diferencia menor sobre un cargo; el ajuste se anula con él. */
    pagoId: uuid(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'ajustes_documento_fk',
      columns: [t.documentoId, t.empresaId, t.proveedorId],
      foreignColumns: [documentos.id, documentos.empresaId, documentos.proveedorId],
    }).onDelete('cascade'),
    foreignKey({ name: 'ajustes_pago_fk', columns: [t.pagoId], foreignColumns: [pagos.id] }),
    ...restriccionesDeValoresDelAjuste(t),
    ...restriccionesDeEstadoDelAjuste(t),
    index('ajustes_documento_idx').on(t.documentoId),
    index('ajustes_pago_idx')
      .on(t.pagoId)
      .where(sql`${t.pagoId} is not null`),
    politicaPorEmpresa(),
  ],
);
