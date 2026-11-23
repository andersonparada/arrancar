import type { CausaDeEntrada, ClaseDeDocumento, DestinoDeSalida, EstadoDeTraslado } from './documento.js';
import { DocumentoInvalido } from './errores-de-kardex.js';
import type { BaseDeReparto } from './rebaja.js';

/** Un renglón ya resuelto: la cantidad en la unidad base del artículo y como se escribió. */
export interface RenglonDePlan {
  articuloId: string;
  loteId: string | null;
  /** Diezmilésimas de la unidad base, mayor que cero. */
  cantidad: bigint;
  /** Nulos solo en los renglones de solo valor (la rebaja). */
  cantidadEscrita: bigint | null;
  unidadEscritaId: string | null;
  /** Centavos: el costo escrito de una entrada; cero en las salidas, que lo calcula el método. */
  costoTotal: bigint;
  /** La línea de la factura o nota del libro de donde viene el renglón. */
  lineaDeCompraId?: string | null;
  /** La entrada que devuelve una devolución, o la que recibe la parte de una rebaja. */
  movimientoDeOrigenId?: string | null;
  /** Solo en una rebaja: lo que le toca a la entrada (con signo) y con qué base se repartió. */
  reparto?: { base: BaseDeReparto; parte: bigint } | null;
}

/** Todo lo que un documento nuevo del kardex necesita, ya revisado por el dominio. */
export interface PlanDeDocumento {
  clase: ClaseDeDocumento;
  fecha: string;
  /** Nula solo en los documentos de solo valor (la rebaja). */
  bodegaId: string | null;
  /** La factura o nota del libro de la que nace el documento. */
  documentoDeCompraId?: string | null;
  /** La recepción que devuelve o rebaja, cuando es una sola. */
  documentoRelacionadoId?: string | null;
  /** Solo en la salida de un traslado: a qué bodega va y si ya llegó. */
  bodegaDeDestinoId?: string | null;
  estadoDeTraslado?: EstadoDeTraslado | null;
  causa: CausaDeEntrada | null;
  destino: DestinoDeSalida | null;
  conceptoDeGastoId: string | null;
  localidadId: string | null;
  departamentoId: string | null;
  activoFijoId: string | null;
  entregadoA: string | null;
  soporte: string | null;
  observaciones: string | null;
  renglones: readonly RenglonDePlan[];
  /** Recomendaciones que no impiden guardar; la pantalla las muestra. */
  avisos: readonly string[];
}

/** Lo que tienen en común las entradas y las salidas al escribirse. */
export interface EscritoComun {
  fecha: string;
  bodegaId: string;
  observaciones: string | null;
  renglones: readonly RenglonDePlan[];
}

/** Lo que los documentos que vienen del libro (recepción, devolución, rebaja) no llevan: causa, destino ni centro de costo. */
export const SIN_DESTINO = {
  causa: null,
  destino: null,
  conceptoDeGastoId: null,
  localidadId: null,
  departamentoId: null,
  activoFijoId: null,
  entregadoA: null,
  soporte: null,
} as const;

export const MAXIMO_DE_RENGLONES = 200;

/** Recorta un texto y exige que, si viene, quepa en su largo. */
export function textoOpcional(texto: string | null | undefined, campo: string, maximo: number): string | null {
  const limpio = texto?.trim();
  if (!limpio) return null;
  if (limpio.length > maximo) throw new DocumentoInvalido(`"${campo}" no puede pasar de ${maximo} caracteres.`);
  return limpio;
}

/** @throws DocumentoInvalido si falta. */
export function textoObligatorio(texto: string | null | undefined, campo: string, maximo: number): string {
  const limpio = textoOpcional(texto, campo, maximo);
  if (!limpio) throw new DocumentoInvalido(`Escriba "${campo}".`);
  return limpio;
}

/** Lo que toda entrada y toda salida cumplen: renglones con cantidad mayor que cero y un máximo de renglones. */
export function exigirRenglones(renglones: readonly RenglonDePlan[]): void {
  if (renglones.length === 0) throw new DocumentoInvalido('Agregue al menos un renglón.');
  if (renglones.length > MAXIMO_DE_RENGLONES) {
    throw new DocumentoInvalido(`Un documento lleva hasta ${MAXIMO_DE_RENGLONES} renglones.`);
  }
  if (renglones.some((renglon) => renglon.cantidad <= 0n)) {
    throw new DocumentoInvalido('La cantidad de cada renglón debe ser mayor que cero.');
  }
}
