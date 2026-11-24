import type { PropiedadesDeActivo } from './activo.js';
import { CantidadASepararInvalida, DivisionNoPermitida } from './errores-de-division.js';
import type { IncisoFiscal } from './incisos-fiscales.js';

/** Su base fiscal tiene topes propios o no son grupos de piezas iguales (§6.11). */
const INCISOS_QUE_NO_SE_DIVIDEN: readonly IncisoFiscal[] = [
  'edificios',
  'terrenos',
  'reproductores',
  'intangibles',
  'llave',
];

export interface ContextoDeDivision {
  incisoFiscal: IncisoFiscal;
  tieneComponentes: boolean;
}

/**
 * Revisa que el activo admita dividirse: no dado de baja, ni principal con componentes ni componente, y de una clase que
 * se reparta en piezas iguales.
 * @throws DivisionNoPermitida con la causa si no.
 */
export function exigirDivisible(activo: Readonly<PropiedadesDeActivo>, contexto: ContextoDeDivision): void {
  if (activo.estado === 'dado_de_baja') throw new DivisionNoPermitida('dado_de_baja');
  if (activo.activoPadreId) throw new DivisionNoPermitida('es_componente');
  if (contexto.tieneComponentes) throw new DivisionNoPermitida('con_componentes');
  if (INCISOS_QUE_NO_SE_DIVIDEN.includes(contexto.incisoFiscal)) throw new DivisionNoPermitida('clase_no_divisible');
}

/** @throws CantidadASepararInvalida si no se cumple `1 <= k < n`. */
export function exigirCantidadASeparar(cantidadDelActivo: number, separada: number): void {
  if (!Number.isInteger(separada) || separada < 1 || separada >= cantidadDelActivo)
    throw new CantidadASepararInvalida(cantidadDelActivo);
}
