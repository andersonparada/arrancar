import { fechaLegible } from './avisos.js';
import { etiquetaDe, type DocumentoPorPagar } from './documento-por-pagar.js';
import { CorrijaElSaldoInicial, FechaDeAperturaInvalida } from './errores-de-apertura-de-pagos.js';

/** Lo que dice si un saldo inicial ya se movió: notas aplicadas o que lo corrigen, ajustes y pagos vigentes. */
export interface HechosDelSaldoInicial {
  documento: DocumentoPorPagar;
  aplicadoAlCargoCentavos: number;
  aplicacionesManualesRecibidas: number;
  ajustesVigentes: number;
  notasEnTotal: number;
  pagosVigentes: readonly unknown[];
}

/** El saldo inicial tiene movimientos: aplicaciones de notas de cualquier forma, pagos vigentes o ajustes (C-CP4-7). */
export const tieneMovimientos = (saldo: HechosDelSaldoInicial): boolean =>
  saldo.aplicadoAlCargoCentavos > 0 ||
  saldo.aplicacionesManualesRecibidas > 0 ||
  saldo.ajustesVigentes > 0 ||
  saldo.notasEnTotal > 0 ||
  saldo.pagosVigentes.length > 0;

/**
 * Con la carga inicial abierta solo se aplica a la cuenta de apertura un saldo que ya tuvo movimientos: uno sin ellos, aunque
 * esté autorizado, se corrige o se elimina en Saldos iniciales.
 * @throws CorrijaElSaldoInicial
 */
export function exigirSaldosConMovimientos(saldos: readonly HechosDelSaldoInicial[]): void {
  const sinMovimientos = saldos.find((saldo) => !tieneMovimientos(saldo));
  if (sinMovimientos) throw new CorrijaElSaldoInicial(etiquetaDe(sinMovimientos.documento));
}

/** Lo que fija la fecha de la aplicación a la cuenta de apertura. */
export interface DatosDeLaFechaDeApertura {
  cargaCerrada: boolean;
  fechaDeInicio: string | null;
  /** La que mandó el usuario; solo se respeta con la carga cerrada. */
  fecha?: string | undefined;
  hoy: string;
}

/**
 * Carga abierta: siempre la fecha de inicio, aunque se mande otra (C-CP4-7). Carga cerrada: hoy por omisión, ni futura ni
 * anterior a la fecha de inicio.
 * @throws FechaDeAperturaInvalida
 */
export function fechaDeLaApertura({ cargaCerrada, fechaDeInicio, fecha, hoy }: DatosDeLaFechaDeApertura): string {
  if (!cargaCerrada) return fechaDeInicio ?? hoy;
  const elegida = fecha ?? hoy;
  if (elegida > hoy || (fechaDeInicio !== null && elegida < fechaDeInicio)) {
    throw new FechaDeAperturaInvalida(fechaDeInicio);
  }
  return elegida;
}

/** Los avisos fijos de la ventana de la cuenta de apertura (texto del contador). */
export function avisosDeLaApertura({
  cargaCerrada,
  fechaDeInicio,
}: Pick<DatosDeLaFechaDeApertura, 'cargaCerrada' | 'fechaDeInicio'>): string[] {
  const aviso = 'Use esta forma solo si el documento ya se había pagado antes de la fecha de inicio.';
  if (cargaCerrada) {
    return [
      aviso,
      'La carga inicial está cerrada: es una corrección de error de períodos anteriores. Avise a su contador, que elige la cuenta.',
    ];
  }
  const cuando = fechaDeInicio === null ? 'la fecha de inicio' : `la fecha de inicio (${fechaLegible(fechaDeInicio)})`;
  return [aviso, `La carga inicial está abierta: se registra con ${cuando} contra la cuenta puente de apertura.`];
}
