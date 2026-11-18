import { RangoDeReporteInvalido, RangoDeReporteMuyLargo } from './errores-de-reportes.js';
import { limitesDelMes, type MesDeReporte } from './meses-de-reporte.js';

/** Los meses que la SAT puede revisar (Código Tributario art. 47): lo más que R9 mira de una vez. */
export const MAXIMO_DE_MESES_DE_BANCARIZACION = 48;

/** Los meses por omisión de R9: los últimos 12, contando el del hasta. */
const MESES_POR_OMISION = 12;

/** El rango de R9: los meses `AAAA-MM` y los días de su primer y último mes. */
export interface RangoDeBancarizacion {
  desdeMes: MesDeReporte;
  hastaMes: MesDeReporte;
  /** `AAAA-MM-DD`: el primer día del primer mes. */
  desde: string;
  /** `AAAA-MM-DD`: el último día del último mes. */
  hasta: string;
}

const numeroDeMes = (mes: MesDeReporte): number => Number(mes.slice(0, 4)) * 12 + Number(mes.slice(5, 7)) - 1;

function mesDeNumero(numero: number): MesDeReporte {
  return `${String(Math.floor(numero / 12)).padStart(4, '0')}-${String((numero % 12) + 1).padStart(2, '0')}`;
}

/**
 * El rango de meses de R9 con sus omisiones (hasta el mes de hoy, desde 11 meses antes), validado.
 * @throws RangoDeReporteInvalido si `desde` es posterior a `hasta`.
 * @throws RangoDeReporteMuyLargo si son más de 48 meses.
 */
export function rangoDeBancarizacion(
  pedido: { desde?: MesDeReporte; hasta?: MesDeReporte },
  hoy: string,
): RangoDeBancarizacion {
  const hastaMes = pedido.hasta ?? hoy.slice(0, 7);
  const desdeMes = pedido.desde ?? mesDeNumero(numeroDeMes(hastaMes) - (MESES_POR_OMISION - 1));
  const meses = numeroDeMes(hastaMes) - numeroDeMes(desdeMes) + 1;
  if (meses < 1) throw new RangoDeReporteInvalido();
  if (meses > MAXIMO_DE_MESES_DE_BANCARIZACION) throw new RangoDeReporteMuyLargo(MAXIMO_DE_MESES_DE_BANCARIZACION);
  return { desdeMes, hastaMes, desde: limitesDelMes(desdeMes).desde, hasta: limitesDelMes(hastaMes).hasta };
}
