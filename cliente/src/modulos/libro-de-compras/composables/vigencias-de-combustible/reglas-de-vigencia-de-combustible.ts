import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';
import type { EdicionDeVigenciaDeCombustible } from './edicion-de-vigencia-de-combustible';

/** Las tasas de un combustible, de la más reciente a la más antigua. */
export const tasasDeUnCombustible = (
  vigencias: VigenciaDeCombustible[],
  combustibleId: string,
): VigenciaDeCombustible[] =>
  vigencias
    .filter((vigencia) => vigencia.combustibleId === combustibleId)
    .sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde));

/** La tasa vigente es la que no tiene fecha de cierre. */
export const esTasaVigente = (vigencia: VigenciaDeCombustible): boolean => vigencia.vigenteHasta === null;

/** La tasa vigente de un combustible, si tiene. */
export const tasaVigente = (tasas: VigenciaDeCombustible[]): VigenciaDeCombustible | null =>
  tasas.find(esTasaVigente) ?? null;

/** El día anterior a una fecha `aaaa-mm-dd`, o `null` si todavía no es una fecha completa. */
export function diaAnterior(fecha: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const dia = new Date(`${fecha}T00:00:00Z`);
  if (Number.isNaN(dia.getTime())) return null;
  dia.setUTCDate(dia.getUTCDate() - 1);
  return dia.toISOString().slice(0, 10);
}

/** La tasa en texto: «Q4.70 por galón». */
export const textoDeTasa = (vigencia: Pick<VigenciaDeCombustible, 'idpPorGalon'>): string =>
  `${formatearMonto(vigencia.idpPorGalon)} por galón`;

/**
 * Lo que avisa el formulario de una tasa nueva sin fecha de cierre: que la tasa vigente se cerrará el día
 * anterior. Es solo un aviso; el servidor hace y valida el cierre.
 */
export function avisoDeCierre(vigente: VigenciaDeCombustible | null, edicion: EdicionDeVigenciaDeCombustible) {
  if (!vigente || edicion.id !== null || edicion.vigenteHasta) return null;
  const desde = `la tasa vigente (${textoDeTasa(vigente)}, desde ${formatearFecha(vigente.vigenteDesde)})`;
  const cierre = diaAnterior(edicion.vigenteDesde);
  const cuando = cierre ? `el ${formatearFecha(cierre)}` : 'el día anterior al inicio de esta';
  return `Al guardar, ${desde} se cerrará ${cuando}.`;
}

/** La confirmación antes de eliminar: dice qué tasa es y qué pasa si era la vigente. */
export function mensajeDeEliminacion(vigencia: VigenciaDeCombustible): string {
  const nombre = vigencia.combustibleNombre ?? 'el combustible';
  const hasta = vigencia.vigenteHasta ? `hasta el ${formatearFecha(vigencia.vigenteHasta)}` : 'y sigue vigente';
  const tasa = `${textoDeTasa(vigencia)} de ${nombre}, desde el ${formatearFecha(vigencia.vigenteDesde)} ${hasta}`;
  const sinVigente = esTasaVigente(vigencia)
    ? ' El combustible quedará sin tasa vigente hasta que registre otra; la anterior no se reabre sola.'
    : '';
  return `Se eliminará la tasa ${tasa}.${sinVigente} Si alguna compra ya la usa, no se podrá eliminar. No se puede deshacer.`;
}
