import { DIAS_DE_LA_VENTANA_EN_VIDAS_MEDIAS } from './constantes.js';
import type { ParametrosDeMonto } from './tipos.js';

const MILISEGUNDOS_POR_DIA = 86_400_000;

/** Los días entre dos fechas `AAAA-MM-DD`, siempre positivos. */
export function diasEntre(a: string, b: string): number {
  return Math.abs(Date.parse(a) - Date.parse(b)) / MILISEGUNDOS_POR_DIA;
}

/** La fecha `AAAA-MM-DD` desplazada esa cantidad de días (negativa: hacia atrás). */
export function desplazarFecha(fecha: string, dias: number): string {
  return new Date(Date.parse(fecha) + dias * MILISEGUNDOS_POR_DIA).toISOString().slice(0, 10);
}

/** La ventana de candidatos: más allá de 4 vidas medias el peso es menor que 1/16. */
export const ventanaEnDias = (vidaMediaDias: number): number => DIAS_DE_LA_VENTANA_EN_VIDAS_MEDIAS * vidaMediaDias;

/** Recencia: pesa 1 el mismo día y la mitad cuando pasa una vida media. */
export function pesoDeRecencia(diasDeDistancia: number, vidaMediaDias: number): number {
  return 2 ** (-diasDeDistancia / vidaMediaDias);
}

/** Cercanía de monto (en centavos; sin monto del pendiente no distingue, pesa 1): 1 si son iguales y nunca menos que el piso β; nunca descarta un caso. */
export function pesoDeMonto(montoDelPendiente: number | null, montoDelEjemplo: number, parametros: ParametrosDeMonto) {
  if (montoDelPendiente === null) return 1;
  const { piso, sigma } = parametros;
  const diferencia = Math.log(montoDelPendiente) - Math.log(montoDelEjemplo);
  return piso + (1 - piso) * Math.exp(-(diferencia ** 2) / (2 * sigma ** 2));
}

/** Las palabras que cuentan al comparar textos: sin las de solo dígitos ni las de menos de 3 letras. */
export function palabrasQueCuentan(texto: string | null): Set<string> {
  if (!texto) return new Set();
  return new Set(texto.split(' ').filter((palabra) => palabra.length >= 3 && !/^\d+$/.test(palabra)));
}

/** Índice de Jaccard entre las palabras de dos textos ya normalizados; 0 si alguno no tiene palabras. */
export function similitudDeTextos(a: string | null, b: string | null): number {
  const palabrasA = palabrasQueCuentan(a);
  const palabrasB = palabrasQueCuentan(b);
  if (palabrasA.size === 0 || palabrasB.size === 0) return 0;
  const enComun = [...palabrasA].filter((palabra) => palabrasB.has(palabra)).length;
  return enComun / (palabrasA.size + palabrasB.size - enComun);
}
