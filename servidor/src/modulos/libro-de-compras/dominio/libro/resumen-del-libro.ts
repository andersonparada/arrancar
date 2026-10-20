import type { MotivoSinCredito, TipoDte } from '../tipos-de-documento.js';
import { COLUMNAS_DE_DINERO, type FilaDelLibro, type MontosDelLibro } from './fila-del-libro.js';

export interface ResumenPorTipoDte {
  tipoDte: TipoDte | null;
  cantidad: number;
  total: number;
}

export interface ResumenDeIvaSinCredito {
  motivo: MotivoSinCredito;
  ivaSinCredito: number;
}

export interface ResumenDeCombustibles {
  base: number;
  idp: number;
  iva: number;
  /** Lo exento de IVA por el Decreto 22-2026. */
  exentoPorDecreto: number;
}

/** Los totales del mes: por columna, por código DTE, el crédito del período y el IVA que fue al costo. */
export interface ResumenDelLibro {
  totales: MontosDelLibro;
  porTipoDte: ResumenPorTipoDte[];
  /** Σ del IVA con crédito: facturas, facturas especiales y notas de débito menos notas de crédito. */
  creditoFiscalDelPeriodo: number;
  ivaSinCreditoPorMotivo: ResumenDeIvaSinCredito[];
  combustibles: ResumenDeCombustibles;
}

function totalesDe(filas: FilaDelLibro[]): MontosDelLibro {
  const totales = Object.fromEntries(COLUMNAS_DE_DINERO.map((columna) => [columna, 0])) as unknown as MontosDelLibro;
  for (const fila of filas) for (const columna of COLUMNAS_DE_DINERO) totales[columna] += fila[columna];
  return totales;
}

function porTipoDte(filas: FilaDelLibro[]): ResumenPorTipoDte[] {
  const grupos = new Map<TipoDte | null, ResumenPorTipoDte>();
  for (const fila of filas) {
    const grupo = grupos.get(fila.tipoDte) ?? { tipoDte: fila.tipoDte, cantidad: 0, total: 0 };
    grupos.set(fila.tipoDte, { ...grupo, cantidad: grupo.cantidad + 1, total: grupo.total + fila.total });
  }
  return [...grupos.values()].sort((a, b) => (a.tipoDte ?? '').localeCompare(b.tipoDte ?? ''));
}

function ivaSinCreditoPorMotivo(filas: FilaDelLibro[]): ResumenDeIvaSinCredito[] {
  const grupos = new Map<MotivoSinCredito, number>();
  for (const fila of filas) {
    if (fila.motivo && fila.ivaSinCredito !== 0) {
      grupos.set(fila.motivo, (grupos.get(fila.motivo) ?? 0) + fila.ivaSinCredito);
    }
  }
  return [...grupos]
    .map(([motivo, ivaSinCredito]) => ({ motivo, ivaSinCredito }))
    .sort((a, b) => a.motivo.localeCompare(b.motivo));
}

/**
 * Arma el resumen mensual con las filas ya repartidas y con signo. Sin débito ni impuesto a pagar: son de la
 * declaración, que también lleva las ventas.
 */
export function resumenDelLibro(filas: FilaDelLibro[]): ResumenDelLibro {
  const totales = totalesDe(filas);
  return {
    totales,
    porTipoDte: porTipoDte(filas),
    creditoFiscalDelPeriodo: totales.ivaConCredito,
    ivaSinCreditoPorMotivo: ivaSinCreditoPorMotivo(filas),
    combustibles: {
      base: totales.combustibles,
      idp: totales.idp,
      iva: totales.ivaDeCombustibles,
      exentoPorDecreto: totales.combustibleExentoPorDecreto,
    },
  };
}
