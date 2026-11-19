import { repartirMonto, type BaseDeReparto as BaseConEntrada } from './costeo/reparto.js';
import { DocumentoInvalido } from './errores-de-kardex.js';
import { SIN_DESTINO, textoOpcional, type PlanDeDocumento, type RenglonDePlan } from './plan-de-documento.js';

/** Con qué se reparte un monto entre las entradas (§5.15); la rebaja usa el valor o la cantidad. */
export const BASES_DE_REPARTO = ['valor', 'cantidad', 'peso', 'manual'] as const;

export type BaseDeReparto = (typeof BASES_DE_REPARTO)[number];

/** Las bases con las que se puede repartir una rebaja. */
export const BASES_DE_REBAJA = ['valor', 'cantidad'] as const satisfies readonly BaseDeReparto[];

/** Una entrada de la factura que corrige la nota: lo que recibe una parte de la rebaja. */
export interface EntradaParaRepartir {
  movimientoId: string;
  articuloId: string;
  fecha: string;
  /** Diezmilésimas de la unidad base, mayor que cero. */
  cantidad: bigint;
  /** Centavos que costó al entrar. */
  costoTotal: bigint;
}

export interface RebajaEscrita {
  fecha: string;
  documentoDeCompraId: string;
  lineaDeCompraId: string;
  /** Centavos, mayor que cero: lo que la nota rebaja del costo. */
  montoCentavos: bigint;
  base: (typeof BASES_DE_REBAJA)[number];
  observaciones: string | null;
  entradas: readonly EntradaParaRepartir[];
}

const baseDe = (base: RebajaEscrita['base'], entrada: EntradaParaRepartir): bigint =>
  base === 'valor' ? entrada.costoTotal : entrada.cantidad;

/** Reparte la rebaja entre las entradas por su valor o su cantidad; el último renglón absorbe el redondeo. */
function repartir(rebaja: RebajaEscrita): Map<string, bigint> {
  const bases: BaseConEntrada[] = rebaja.entradas.map((e) => ({
    entradaId: e.movimientoId,
    base: baseDe(rebaja.base, e),
  }));
  return repartirMonto(-rebaja.montoCentavos, bases);
}

function renglonDeRebaja(entrada: EntradaParaRepartir, parte: bigint, rebaja: RebajaEscrita): RenglonDePlan {
  return {
    articuloId: entrada.articuloId,
    loteId: null,
    cantidad: 0n,
    cantidadEscrita: null,
    unidadEscritaId: null,
    costoTotal: 0n,
    lineaDeCompraId: rebaja.lineaDeCompraId,
    movimientoDeOrigenId: entrada.movimientoId,
    reparto: { base: rebaja.base, parte },
  };
}

/** Revisa lo que no depende del reparto: monto positivo, entradas que rebajar y una fecha que no sea anterior a ellas. */
function exigirRebajable(rebaja: RebajaEscrita): void {
  if (rebaja.montoCentavos <= 0n) throw new DocumentoInvalido('El monto de la rebaja debe ser mayor que cero.');
  if (rebaja.entradas.length === 0) throw new DocumentoInvalido('La factura no tiene entradas que rebajar.');
  if (rebaja.entradas.some((entrada) => entrada.fecha > rebaja.fecha))
    throw new DocumentoInvalido('La fecha de la rebaja no puede ser anterior a la de las entradas que rebaja.');
}

/**
 * Una rebaja de costo (§7.5): una nota de crédito sin devolución física baja el costo de las entradas de su factura.
 * Es un documento de solo valor (sin bodega): el monto, en negativo, se reparte entre las entradas y el motor decide
 * cuánto absorbe la existencia y cuánto va a resultados.
 * @throws DocumentoInvalido si el monto no es positivo, no hay entradas o la fecha es anterior a alguna de ellas.
 * @throws RepartoInvalido si la base suma cero.
 */
export function planDeRebaja(rebaja: RebajaEscrita): PlanDeDocumento {
  exigirRebajable(rebaja);
  const partes = repartir(rebaja);
  return {
    clase: 'rebaja_de_costo',
    fecha: rebaja.fecha,
    bodegaId: null,
    documentoDeCompraId: rebaja.documentoDeCompraId,
    ...SIN_DESTINO,
    observaciones: textoOpcional(rebaja.observaciones, 'Observaciones', 500),
    renglones: rebaja.entradas
      .filter((entrada) => partes.get(entrada.movimientoId) !== 0n)
      .map((entrada) => renglonDeRebaja(entrada, partes.get(entrada.movimientoId)!, rebaja)),
    avisos: [],
  };
}
