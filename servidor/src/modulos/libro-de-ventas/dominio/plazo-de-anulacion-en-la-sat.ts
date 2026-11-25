import { sumarDias } from '../../core/calendario/dominio/fecha-iso.js';
import type { CausaDeAnulacionDeVenta } from '../../core/contratos/libro-de-ventas.contratos.js';
import type { CalendarioLaboral } from './calendario-laboral.js';
import { sumarMeses, ultimoDiaDelMes } from './fechas-del-libro.js';

export const AVISO_DE_PLAZO_DE_ANULACION_VENCIDO =
  'Si el DTE está bien, vuelva a registrarlo con los datos correctos; si la venta no procede o cambió, ya no se puede anular en la SAT: emita una nota de crédito.';

const SUGERENCIA_DE_VERIFICAR =
  ' Verifique en la Agencia Virtual: la SAT podría cerrar la anulación antes de esa fecha.';

/** El aviso de un error de captura dentro del plazo: anular el registro no anula el DTE, que sigue declarando débito. */
export function avisoDePlazoDeAnulacionVigente(vencimiento: string, enLaProrroga: boolean): string {
  const [anio, mes, dia] = vencimiento.split('-');
  return (
    `Este registro no anula el DTE. Si la venta no procede, anúlelo en la SAT antes del ${dia}/${mes}/${anio}.` +
    (enLaProrroga ? SUGERENCIA_DE_VERIFICAR : '')
  );
}

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
 * SAT (o sin dato de la SAT) avisa que el registro no anula el DTE: dentro del plazo, hasta cuándo anularlo allá (con
 * la sugerencia de verificar si ya se está en la prórroga por día inhábil); vencido, que lo correcto es volver a
 * registrarlo o, si la venta no procede, emitir la nota de crédito. No bloquea: solo informa.
 */
export function avisosDelPlazoDeAnulacion(datos: DatosDelPlazoDeAnulacion, calendario: CalendarioLaboral): string[] {
  if (datos.causa !== 'error_de_captura' || !datos.tieneFel || datos.anuladoEnLaSat) return [];
  const vencimiento = vencimientoDeLaDeclaracionDelIva(datos.periodo, calendario);
  if (datos.hoy > vencimiento) return [AVISO_DE_PLAZO_DE_ANULACION_VENCIDO];
  const ultimoDiaDelMesSiguiente = ultimoDiaDelMes(sumarMeses(datos.periodo, 1));
  return [avisoDePlazoDeAnulacionVigente(vencimiento, datos.hoy > ultimoDiaDelMesSiguiente)];
}
