import { foreignKey, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import { arqueos } from './arqueos.tablas.js';
import { fondos } from './fondos.tablas.js';
import { valesProvisionales } from './vales-provisionales.tablas.js';

/** Las columnas de `comprobantes` que usan sus llaves. */
type T = Record<
  'id' | 'empresaId' | 'fondoId' | 'documentoAfectadoId' | 'conceptoDeGastoId' | 'arqueoId' | 'valeProvisionalId',
  AnyPgColumn
>;

/** Las llaves compuestas de un comprobante hacia el fondo y el concepto de gasto (de la misma empresa). */
const llavesDeLaEmpresa = (t: T) => [
  foreignKey({
    name: 'comprobantes_fondo_fk',
    columns: [t.fondoId, t.empresaId],
    foreignColumns: [fondos.id, fondos.empresaId],
  }),
  foreignKey({
    name: 'comprobantes_concepto_de_gasto_fk',
    columns: [t.conceptoDeGastoId, t.empresaId],
    foreignColumns: [conceptosDeGasto.id, conceptosDeGasto.empresaId],
  }),
];

/**
 * Las llaves compuestas de un comprobante: las de la empresa y, con el `fondo_id` dentro de la llave, la factura que
 * rebaja una nota, el arqueo del faltante o sobrante y el vale provisional (siempre del mismo fondo).
 */
export const llavesDeComprobante = (t: T) => [
  ...llavesDeLaEmpresa(t),
  foreignKey({
    name: 'comprobantes_afectado_fk',
    columns: [t.documentoAfectadoId, t.empresaId, t.fondoId],
    foreignColumns: [t.id, t.empresaId, t.fondoId],
  }),
  foreignKey({
    name: 'comprobantes_arqueo_fk',
    columns: [t.arqueoId, t.empresaId, t.fondoId],
    foreignColumns: [arqueos.id, arqueos.empresaId, arqueos.fondoId],
  }),
  foreignKey({
    name: 'comprobantes_vale_provisional_fk',
    columns: [t.valeProvisionalId, t.empresaId, t.fondoId],
    foreignColumns: [valesProvisionales.id, valesProvisionales.empresaId, valesProvisionales.fondoId],
  }),
];
