import type { LineaCalculada } from './calculo-de-linea.js';

/** Los totales del documento, en centavos: la suma de sus líneas. */
export interface TotalesDelDocumento {
  total: number;
  base: number;
  iva: number;
  ivaNoAcreditable: number;
  idp: number;
  exento: number;
}

/** Suma las líneas campo por campo; como cada una cuadra, `total = base + iva + idp + exento` también. */
export function totalesDelDocumento(lineas: readonly LineaCalculada[]): TotalesDelDocumento {
  const totales: TotalesDelDocumento = { total: 0, base: 0, iva: 0, ivaNoAcreditable: 0, idp: 0, exento: 0 };
  for (const linea of lineas) {
    totales.total += linea.total;
    totales.base += linea.base;
    totales.iva += linea.iva;
    totales.ivaNoAcreditable += linea.ivaNoAcreditable;
    totales.idp += linea.idp;
    totales.exento += linea.exento;
  }
  return totales;
}
