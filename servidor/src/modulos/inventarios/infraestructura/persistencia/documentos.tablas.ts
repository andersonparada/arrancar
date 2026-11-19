import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { politicaPorAlcanceOpcional } from '../../../core/base-datos/alcance.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { departamentos } from '../../../empresas/infraestructura/persistencia/departamentos.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import { documentos as documentosDeCompra } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import type { CausaDeEntrada, ClaseDeDocumento, DestinoDeSalida, EstadoDeDocumento } from '../../dominio/documento.js';
import { ALCANCE_DE_BODEGAS } from './alcance-de-bodegas.js';
import { bodegas } from './bodegas.tablas.js';
import { reglasDeDocumento, reglasDeTextoYAnulacion } from './documentos.reglas.js';
import { esquemaInventarios } from './esquema.tablas.js';

const columnas = {
  id: idPrimario(),
  empresaId: uuid()
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  clase: text().$type<ClaseDeDocumento>().notNull(),
  numero: integer().notNull(),
  fecha: date({ mode: 'string' }).notNull(),
  bodegaId: uuid(),
  documentoRelacionadoId: uuid(),
  documentoDeCompraId: uuid(),
  causa: text().$type<CausaDeEntrada>(),
  destino: text().$type<DestinoDeSalida>(),
  conceptoDeGastoId: uuid(),
  localidadId: uuid(),
  departamentoId: uuid(),
  /** Sin llave: Activos fijos puede estar inactivo (`diseno-inventarios.md` §4.3). */
  activoFijoId: uuid(),
  entregadoA: text(),
  soporte: text(),
  requiereFactura: boolean().default(false).notNull(),
  observaciones: text(),
  estado: text().$type<EstadoDeDocumento>().notNull().default('vigente'),
  anuladoEn: timestamp({ withTimezone: true }),
  anuladoPor: uuid(),
  motivoDeAnulacion: text(),
  ...marcasDeTiempo,
  ...autoria,
};

type Columnas = Record<keyof typeof columnas, AnyPgColumn>;

const llavesDeBodegaYCompra = (t: Columnas) => [
  foreignKey({
    name: 'documentos_relacionado_fk',
    columns: [t.documentoRelacionadoId, t.empresaId],
    foreignColumns: [t.id, t.empresaId],
  }),
  foreignKey({
    name: 'documentos_bodega_fk',
    columns: [t.bodegaId, t.empresaId],
    foreignColumns: [bodegas.id, bodegas.empresaId],
  }),
  foreignKey({
    name: 'documentos_compra_fk',
    columns: [t.documentoDeCompraId, t.empresaId],
    foreignColumns: [documentosDeCompra.id, documentosDeCompra.empresaId],
  }),
];

const llavesDelCentroDeCosto = (t: Columnas) => [
  foreignKey({
    name: 'documentos_concepto_fk',
    columns: [t.conceptoDeGastoId, t.empresaId],
    foreignColumns: [conceptosDeGasto.id, conceptosDeGasto.empresaId],
  }),
  foreignKey({
    name: 'documentos_localidad_fk',
    columns: [t.localidadId, t.empresaId],
    foreignColumns: [localidades.id, localidades.empresaId],
  }),
  foreignKey({
    name: 'documentos_departamento_fk',
    columns: [t.departamentoId, t.empresaId],
    foreignColumns: [departamentos.id, departamentos.empresaId],
  }),
];

const conValor = (columna: AnyPgColumn) => sql`${columna} is not null`;

const indices = (t: Columnas) => [
  unique('documentos_numero_unico').on(t.empresaId, t.clase, t.numero),
  unique('documentos_id_empresa_unico').on(t.id, t.empresaId),
  index('documentos_fecha_idx').on(t.empresaId, t.fecha, t.clase),
  index('documentos_bodega_fecha_idx').on(t.bodegaId, t.fecha),
  index('documentos_compra_idx').on(t.documentoDeCompraId).where(conValor(t.documentoDeCompraId)),
  index('documentos_concepto_idx').on(t.conceptoDeGastoId).where(conValor(t.conceptoDeGastoId)),
  index('documentos_localidad_idx').on(t.localidadId).where(conValor(t.localidadId)),
  index('documentos_departamento_idx').on(t.departamentoId).where(conValor(t.departamentoId)),
  index('documentos_relacionado_idx').on(t.documentoRelacionadoId).where(conValor(t.documentoRelacionadoId)),
];

/**
 * Cada operación del inventario, numerada, con su fecha, su bodega y su estado (§5.9). Además de la empresa, cada
 * usuario solo ve los documentos de las bodegas que tiene asignadas (los movimientos se leen siempre unidos a ellos).
 * Nunca se elimina: se anula y queda como evidencia.
 */
export const documentos = esquemaInventarios.table('documentos', columnas, (t) => [
  ...llavesDeBodegaYCompra(t),
  ...llavesDelCentroDeCosto(t),
  ...indices(t),
  ...reglasDeDocumento(t),
  ...reglasDeTextoYAnulacion(t),
  politicaPorEmpresa(),
  politicaPorAlcanceOpcional(ALCANCE_DE_BODEGAS, 'bodega_id'),
]);
