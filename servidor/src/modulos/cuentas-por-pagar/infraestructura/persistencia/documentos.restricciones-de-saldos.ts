import { sql } from 'drizzle-orm';
import { check, foreignKey, index, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { ORIGENES_DE_DOCUMENTO, TIPOS_DE_FACTURA } from '../../dominio/tipos-de-documento.js';

const ORIGENES = ORIGENES_DE_DOCUMENTO.map((origen) => `'${origen}'`).join(', ');
const FACTURAS = TIPOS_DE_FACTURA.map((tipo) => `'${tipo}'`).join(', ');

/** Las columnas de `documentos` que usan las restricciones del saldo inicial. */
type T = Record<
  | 'empresaId'
  | 'origen'
  | 'documentoId'
  | 'tipo'
  | 'proveedorId'
  | 'documentoAfectadoId'
  | 'fechaEmision'
  | 'serie'
  | 'numero'
  | 'total'
  | 'retenciones'
  | 'saldoAlInicio'
  | 'retencionesPorPracticar'
  | 'referencia'
  | 'estado',
  AnyPgColumn
>;

/** Lo mismo que `documentos_serie_valida` de Libro de compras: mayúsculas, sin espacios, de 1 a 40. */
const textoDeCompra = (columna: AnyPgColumn) =>
  sql`char_length(btrim(${columna})) between 1 and 40 and btrim(${columna}) = upper(btrim(${columna})) and btrim(${columna}) !~ '\\s'`;

/** El origen del documento y lo que solo tiene un saldo inicial (U8): saldo al inicio, por practicar y referencia. */
export const restriccionesDeSaldoInicial = (t: T) => [
  check('documentos_origen_valido', sql`${t.origen} in (${sql.raw(ORIGENES)})`),
  check('documentos_origen_y_documento', sql`(${t.origen} = 'libro_de_compras') = (${t.documentoId} is not null)`),
  check(
    'documentos_saldo_al_inicio_de_saldos',
    sql`(${t.origen} = 'saldo_inicial') = (${t.saldoAlInicio} is not null)`,
  ),
  check(
    'documentos_saldo_al_inicio_valido',
    sql`${t.saldoAlInicio} is null or (${t.saldoAlInicio} > 0 and ${t.saldoAlInicio} <= ${t.total} - ${t.retenciones})`,
  ),
  check(
    'documentos_por_practicar_de_saldos',
    sql`(${t.origen} = 'saldo_inicial') = (${t.retencionesPorPracticar} is not null)`,
  ),
  check(
    'documentos_por_practicar_valido',
    sql`${t.retencionesPorPracticar} is null or (${t.retencionesPorPracticar} >= 0 and ${t.retencionesPorPracticar} <= ${t.retenciones})`,
  ),
];

/** La referencia, las notas y el estado de un saldo inicial, y la forma de serie y número. */
export const restriccionesDeTextoYEstado = (t: T) => [
  check('documentos_referencia_de_saldos', sql`${t.origen} = 'saldo_inicial' or ${t.referencia} is null`),
  check(
    'documentos_referencia_valida',
    sql`${t.referencia} is null or (char_length(${t.referencia}) between 1 and 60 and ${t.referencia} = btrim(${t.referencia}))`,
  ),
  check(
    'documentos_saldo_inicial_sin_nota_afectada',
    sql`${t.origen} = 'libro_de_compras' or ${t.documentoAfectadoId} is null`,
  ),
  check(
    'documentos_saldo_inicial_completado',
    sql`${t.origen} = 'libro_de_compras' or ${t.estado} in ('registrado', 'autorizado')`,
  ),
  check('documentos_serie_de_compra_valida', sql`${t.serie} is null or (${textoDeCompra(t.serie)})`),
  check('documentos_numero_de_compra_valido', textoDeCompra(t.numero)),
];

/**
 * Llave del proveedor, y el único que impide deber dos veces el mismo documento: por empresa, proveedor, familia de
 * tipo (los seis tipos de factura cuentan como uno), serie y número, sin contar los anulados.
 */
export const llavesDeSaldoInicial = (t: T) => [
  foreignKey({
    name: 'documentos_proveedor_por_pagar_fk',
    columns: [t.proveedorId],
    foreignColumns: [proveedores.id],
  }),
  uniqueIndex('documentos_numero_por_proveedor_unico')
    .on(
      t.empresaId,
      t.proveedorId,
      sql`(case when ${t.tipo} in (${sql.raw(FACTURAS)}) then 'factura' else ${t.tipo} end)`,
      sql`coalesce(${t.serie}, '')`,
      t.numero,
    )
    .where(sql`${t.estado} <> 'anulado'`),
];

/** Índices del saldo inicial: la llave del proveedor y la lista de la ventana. */
export const indicesDeSaldoInicial = (t: T) => [
  index('documentos_proveedor_por_pagar_idx').on(t.proveedorId),
  index('documentos_saldos_iniciales_idx')
    .on(t.empresaId, t.proveedorId, t.fechaEmision)
    .where(sql`${t.origen} = 'saldo_inicial'`),
];
