import { sumarDias } from '../../core/calendario/dominio/fecha-iso.js';
import type { CausaDeAnulacionDeVenta } from '../../core/contratos/libro-de-ventas.contratos.js';
import type { CalendarioLaboral } from './calendario-laboral.js';
import { sumarMeses, ultimoDiaDelMes } from './fechas-del-libro.js';

export const AVISO_DE_PLAZO_DE_ANULACION_VENCIDO = 'Ya no se puede anular en la SAT: emita una nota de crédito.';

/**
 * El último día para declarar el IVA de un período: el último día del mes siguiente, corrido al siguiente día hábil
 * si cae en día no hábil (Ley del IVA, art. 40; **por confirmar** con el contador, V-14).
 */
export function vencimientoDeLaDeclaracionDelIva(periodo: string, calendario: CalendarioLaboral): string {
  let dia = ultimoDiaDelMes(sumarMeses(periodo, 1));
  while (!calendario.esHabil(dia)) dia = sumarDias(dia, 1);
  return dia;
}

/** Lo que decide si anular el registro todavía deja anular el DTE en la SAT. */
export interface DatosDelPlazoDeAnulacion {
  causa: CausaDeAnulacionDeVenta;
  /** El documento tiene FEL: sin ella (papel) no hay nada que anular en la SAT. */
  tieneFel: boolean;
  /** Ya se sabe que la SAT lo tiene anulado (por la bandeja de DTE emitidos). */
  anuladoEnLaSat: boolean;
  hoy: string;
  /** Primer día del mes del documento. */
  periodo: string;
}

/**
 * Desde el 1-09-2023 un DTE solo se anula en la SAT hasta el vencimiento de la declaración mensual del IVA de su
 * período; después solo cabe la nota de crédito. Al anular por `error_de_captura` un documento que sigue vigente en la
 * SAT (o sin dato de la SAT) y cuyo plazo pasó, avisa. No bloquea: solo informa.
 */
export function avisosDelPlazoDeAnulacion(datos: DatosDelPlazoDeAnulacion, calendario: CalendarioLaboral): string[] {
  if (datos.causa !== 'error_de_captura' || !datos.tieneFel || datos.anuladoEnLaSat) return [];
  const vencido = datos.hoy > vencimientoDeLaDeclaracionDelIva(datos.periodo, calendario);
  return vencido ? [AVISO_DE_PLAZO_DE_ANULACION_VENCIDO] : [];
}
