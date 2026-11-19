import { costoUnitarioDe } from '../../dominio/costeo/escalas.js';
import { TIPO_DE_MOVIMIENTO_POR_CLASE } from '../../dominio/documento.js';
import { ORDEN_DEL_DIA } from '../../dominio/movimiento.js';
import type { RenglonDePlan } from '../../dominio/plan-de-documento.js';
import type { NuevoMovimiento } from '../puertos/almacen-del-kardex.js';
import type { CambioDeExistencia } from '../puertos/existencias-por-bodega.js';
import type { DocumentoGuardado } from '../puertos/repositorio-de-documentos.js';

const signoDe = (tipo: 'entrada' | 'salida'): bigint => (tipo === 'entrada' ? 1n : -1n);

/** Lo que cada renglón guarda del libro: su línea y su documento, o nada si no viene de él. */
function referenciasDelLibro(documento: DocumentoGuardado, renglon: RenglonDePlan) {
  const lineaDeCompraId = renglon.lineaDeCompraId ?? null;
  return {
    lineaDeCompraId,
    documentoDeCompraId: lineaDeCompraId ? documento.documentoDeCompraId : null,
    movimientoDeOrigenId: renglon.movimientoDeOrigenId ?? null,
  };
}

/** Un movimiento de valor (rebaja): sin bodega ni cantidad; el motor calcula lo que absorbe la existencia. */
function movimientoDeValor(documento: DocumentoGuardado, renglon: RenglonDePlan): NuevoMovimiento {
  return {
    documentoId: documento.id,
    articuloId: renglon.articuloId,
    bodegaId: null,
    loteId: null,
    fecha: documento.fecha,
    ordenDelDia: ORDEN_DEL_DIA.valor,
    tipo: 'valor',
    cantidad: 0n,
    cantidadEscrita: null,
    unidadEscritaId: null,
    costoUnitario: 0n,
    costoTotal: 0n,
    costoDelMetodo: false,
    ...referenciasDelLibro(documento, renglon),
    reparto: renglon.reparto ? { base: renglon.reparto.base, parte: renglon.reparto.parte } : null,
  };
}

/**
 * El movimiento que un renglón guarda en el kardex. El costo de una salida va provisional en cero: el recálculo lo deja
 * definitivo. La devolución a proveedor sale al costo de su entrada, no al del método (`costo_del_metodo = false`).
 */
export function nuevoMovimiento(documento: DocumentoGuardado, renglon: RenglonDePlan): NuevoMovimiento {
  const tipo = TIPO_DE_MOVIMIENTO_POR_CLASE[documento.clase];
  if (tipo === 'valor') return movimientoDeValor(documento, renglon);
  const esEntrada = tipo === 'entrada';
  return {
    documentoId: documento.id,
    articuloId: renglon.articuloId,
    bodegaId: documento.bodegaId,
    loteId: renglon.loteId,
    fecha: documento.fecha,
    ordenDelDia: esEntrada ? ORDEN_DEL_DIA.entrada : ORDEN_DEL_DIA.salida,
    tipo,
    cantidad: signoDe(tipo) * renglon.cantidad,
    cantidadEscrita: renglon.cantidadEscrita,
    unidadEscritaId: renglon.unidadEscritaId,
    costoUnitario: esEntrada ? costoUnitarioDe(renglon.costoTotal, renglon.cantidad) : 0n,
    costoTotal: esEntrada ? renglon.costoTotal : 0n,
    costoDelMetodo: !esEntrada && documento.clase !== 'devolucion_a_proveedor',
    ...referenciasDelLibro(documento, renglon),
  };
}

/** Cuánto cambia la existencia de la bodega con el renglón; un documento de solo valor no mueve existencias. */
export function cambiosDeExistencia(
  documento: DocumentoGuardado,
  renglones: readonly RenglonDePlan[],
): CambioDeExistencia[] {
  const tipo = TIPO_DE_MOVIMIENTO_POR_CLASE[documento.clase];
  if (tipo === 'valor' || documento.bodegaId === null) return [];
  return renglones.map((renglon) => ({
    bodegaId: documento.bodegaId!,
    articuloId: renglon.articuloId,
    loteId: renglon.loteId,
    cantidad: signoDe(tipo) * renglon.cantidad,
  }));
}
