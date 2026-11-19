import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';

type Columnas = Record<
  | 'tipo'
  | 'ordenDelDia'
  | 'cantidad'
  | 'cantidadEscrita'
  | 'unidadEscritaId'
  | 'costoUnitario'
  | 'costoTotal'
  | 'saldoCantidad'
  | 'saldoValor'
  | 'bodegaId'
  | 'lineaDeDocumentoDeCompraId'
  | 'documentoDeCompraId',
  AnyPgColumn
>;

/** Los checks de §5.10: el signo de la cantidad y del costo según el tipo, y los saldos que nunca son negativos. */
export function reglasDeMovimiento(t: Columnas) {
  return [
    check('movimientos_tipo', sql`${t.tipo} in ('entrada', 'salida', 'valor', 'traslado')`),
    check('movimientos_orden_del_dia', sql`${t.ordenDelDia} in (0, 1, 2)`),
    check(
      'movimientos_cantidad_por_tipo',
      sql`(${t.tipo} = 'entrada' and ${t.cantidad} > 0) or (${t.tipo} = 'salida' and ${t.cantidad} < 0) or (${t.tipo} = 'valor' and ${t.cantidad} = 0) or (${t.tipo} = 'traslado' and ${t.cantidad} <> 0)`,
    ),
    check('movimientos_costo_unitario', sql`${t.costoUnitario} >= 0`),
    check(
      'movimientos_costo_por_tipo',
      sql`(${t.tipo} = 'entrada' and ${t.costoTotal} >= 0) or (${t.tipo} = 'salida' and ${t.costoTotal} <= 0) or ${t.tipo} in ('valor', 'traslado')`,
    ),
    check('movimientos_saldos_no_negativos', sql`${t.saldoCantidad} >= 0 and ${t.saldoValor} >= 0`),
    check('movimientos_saldo_sin_cantidad', sql`${t.saldoCantidad} > 0 or ${t.saldoValor} = 0`),
    check('movimientos_bodega_salvo_valor', sql`${t.tipo} = 'valor' or ${t.bodegaId} is not null`),
    check('movimientos_unidad_escrita_completa', sql`(${t.cantidadEscrita} is null) = (${t.unidadEscritaId} is null)`),
    check(
      'movimientos_linea_de_compra_completa',
      sql`(${t.lineaDeDocumentoDeCompraId} is null) = (${t.documentoDeCompraId} is null)`,
    ),
  ];
}
