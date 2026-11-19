import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { IncisoFiscal } from '../incisos-fiscales.js';
import { dividirRedondeando } from './redondeo.js';

/** Lo que de un costo importa para la base: su monto con signo y cómo se trata en el libro fiscal. */
export interface CostoParaLaBase {
  montoCentavos: number;
  aplicaAlLibroFiscal: boolean;
  noEsEdificacion: boolean;
}

/** Los valores del inmueble que fijan el tope fiscal (§3.5.1). */
export interface ValoresDelInmueble {
  valorDeMatricula: string | null;
  valorCatastral: string | null;
  /** Los valores no separan el terreno del edificio: el tope es el 70 % (art. 26). */
  valoresDelInmuebleCompleto: boolean;
}

export interface EntradaDeBaseFiscal {
  incisoFiscal: IncisoFiscal;
  costos: readonly CostoParaLaBase[];
  inmueble: ValoresDelInmueble;
  /** Valor del reproductor como ganado común (art. 28 inciso 7). */
  valorComoGanadoComunCentavos: number;
}

const suma = (costos: readonly CostoParaLaBase[]): number =>
  costos.reduce((total, costo) => total + costo.montoCentavos, 0);

/** El costo fiscal: Σ de los costos que aplican al libro fiscal, sin tope ni ganado común; es lo que se recupera al vender (A1). */
export function costoFiscal(costos: readonly CostoParaLaBase[]): number {
  return suma(costos.filter((costo) => costo.aplicaAlLibroFiscal));
}

/**
 * El tope fiscal del inmueble: el mayor de la matrícula y el catastro, y el 70 % de ese mayor si los valores son del
 * inmueble completo. Sin ninguno de los dos no hay tope (`null`).
 */
export function topeDelInmueble(inmueble: ValoresDelInmueble): number | null {
  const valores = [inmueble.valorDeMatricula, inmueble.valorCatastral]
    .filter((valor): valor is string => valor !== null)
    .map(aCentavos);
  if (valores.length === 0) return null;
  const mayor = Math.max(...valores);
  return inmueble.valoresDelInmuebleCompleto ? dividirRedondeando(mayor * 70, 100) : mayor;
}

/** Edificio: `min(Σ edificación, tope) + Σ «no es edificación»` (§3.5.1); sin tope, todo suma. */
function baseDeEdificio(costosFiscales: readonly CostoParaLaBase[], inmueble: ValoresDelInmueble): number {
  const edificacion = Math.max(suma(costosFiscales.filter((costo) => !costo.noEsEdificacion)), 0);
  const aparte = suma(costosFiscales.filter((costo) => costo.noEsEdificacion));
  const tope = topeDelInmueble(inmueble);
  return (tope === null ? edificacion : Math.min(edificacion, tope)) + aparte;
}

function baseSegunInciso(entrada: EntradaDeBaseFiscal, fiscales: readonly CostoParaLaBase[]): number {
  if (entrada.incisoFiscal === 'edificios') return baseDeEdificio(fiscales, entrada.inmueble);
  if (entrada.incisoFiscal === 'reproductores') return suma(fiscales) - entrada.valorComoGanadoComunCentavos;
  return suma(fiscales);
}

/**
 * La base fiscal `B`, lo que se deprecia en el libro fiscal (§7.3): los costos que aplican; en edificios, con el tope
 * del inmueble; en reproductores, sin el valor como ganado común. Nunca es negativa.
 */
export function baseFiscal(entrada: EntradaDeBaseFiscal): number {
  const fiscales = entrada.costos.filter((costo) => costo.aplicaAlLibroFiscal);
  return Math.max(baseSegunInciso(entrada, fiscales), 0);
}
