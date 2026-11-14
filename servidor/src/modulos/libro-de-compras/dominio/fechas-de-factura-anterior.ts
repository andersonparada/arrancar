import {
  FacturaAnteriorMuyAntigua,
  FacturaAnteriorPosteriorALaFechaDeInicio,
  FacturaAnteriorSinFechaDeInicio,
  NotaRecibidaAntesDeLaFechaDeInicio,
} from './errores-de-factura-anterior.js';
import { sumarMesesALaFecha } from './periodo-del-libro.js';
import { fechaLegible } from './retenciones/fechas-de-retenciones.js';

/** Antigüedad máxima de la factura anterior, contada desde la fecha de inicio (control de captura, sin citar ley). */
export const ANIOS_MAXIMOS_DE_ANTIGUEDAD = 10;
/** Desde esta antigüedad solo se avisa. */
export const ANIOS_DEL_AVISO_DE_ANTIGUEDAD = 4;

export interface FechasDeLaNotaSobreFacturaAnterior {
  /** La fecha de inicio de la empresa; `null` si aún no tiene. */
  fechaDeInicio: string | null;
  fechaDeRecepcionDeLaNota: string;
  fechaDeLaFactura: string;
}

/**
 * Una nota sobre una factura del sistema anterior se recibió desde la fecha de inicio y su factura es anterior a ella
 * (y no de más de 10 años antes). Devuelve el aviso de los más de 4 años, que no bloquea.
 * @throws FacturaAnteriorSinFechaDeInicio, NotaRecibidaAntesDeLaFechaDeInicio,
 *   FacturaAnteriorPosteriorALaFechaDeInicio o FacturaAnteriorMuyAntigua.
 */
export function revisarLasFechasDeLaFacturaAnterior(fechas: FechasDeLaNotaSobreFacturaAnterior): string[] {
  const { fechaDeInicio, fechaDeRecepcionDeLaNota, fechaDeLaFactura } = fechas;
  if (fechaDeInicio === null) throw new FacturaAnteriorSinFechaDeInicio();
  if (fechaDeRecepcionDeLaNota < fechaDeInicio) throw new NotaRecibidaAntesDeLaFechaDeInicio(fechaDeInicio);
  if (fechaDeLaFactura >= fechaDeInicio) throw new FacturaAnteriorPosteriorALaFechaDeInicio(fechaDeInicio);
  const minima = sumarMesesALaFecha(fechaDeInicio, -12 * ANIOS_MAXIMOS_DE_ANTIGUEDAD);
  if (fechaDeLaFactura < minima) throw new FacturaAnteriorMuyAntigua(minima);
  const sinAviso = sumarMesesALaFecha(fechaDeInicio, -12 * ANIOS_DEL_AVISO_DE_ANTIGUEDAD);
  return fechaDeLaFactura < sinAviso ? [avisoDeAntiguedad(fechaDeLaFactura)] : [];
}

const avisoDeAntiguedad = (fechaDeLaFactura: string): string =>
  `La factura del sistema anterior es del ${fechaLegible(fechaDeLaFactura)}, de hace más de 4 años. Revise la fecha; si es correcta, la nota se registra igual.`;

/** Aviso de la nota de débito emitida después de los dos meses de su factura anterior (art. 17), con la fecha de ella. */
export const avisoDeNotaDeDebitoTardiaSobreFacturaAnterior = (fechaDeLaFactura: string): string =>
  `La factura es del ${fechaLegible(fechaDeLaFactura)}; esta nota de débito se emitió más de dos meses después: su IVA no da crédito fiscal (Ley del IVA art. 17) y va al costo.`;
