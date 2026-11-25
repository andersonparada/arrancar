import type { LineaCalculada } from './calculo-de-lineas.js';

/** Los totales fijos de un documento, en centavos, tal como los guarda la tabla (`total = suma de los demás`). */
export interface TotalesDelDocumento {
  total: number;
  gravadoBienes: number;
  gravadoServicios: number;
  exento: number;
  exportacion: number;
  iva: number;
  otrosImpuestos: number;
}

const suma = (lineas: readonly LineaCalculada[], campo: 'base' | 'iva' | 'otrosImpuestos'): number =>
  lineas.reduce((acumulado, linea) => acumulado + linea[campo], 0);

const baseDe = (lineas: readonly LineaCalculada[], donde: (linea: LineaCalculada) => boolean): number =>
  suma(lineas.filter(donde), 'base');

/**
 * Suma las líneas por columna del libro: gravado de bienes y de servicios, exento (la exenta y la no afecta),
 * exportación, IVA y otros impuestos. El total del documento es la suma de todas.
 */
export function totalesDelDocumento(lineas: readonly LineaCalculada[]): TotalesDelDocumento {
  const gravadoBienes = baseDe(lineas, (l) => l.claseFiscal === 'gravada' && l.tipo === 'bien');
  const gravadoServicios = baseDe(lineas, (l) => l.claseFiscal === 'gravada' && l.tipo === 'servicio');
  const exento = baseDe(lineas, (l) => l.claseFiscal === 'exenta' || l.claseFiscal === 'no_afecta');
  const exportacion = baseDe(lineas, (l) => l.claseFiscal === 'exportacion');
  const iva = suma(lineas, 'iva');
  const otrosImpuestos = suma(lineas, 'otrosImpuestos');
  const total = gravadoBienes + gravadoServicios + exento + exportacion + iva + otrosImpuestos;
  return { total, gravadoBienes, gravadoServicios, exento, exportacion, iva, otrosImpuestos };
}
