import {
  FechaDeDiferenciaInvalida,
  ReaplicacionConOtroMonto,
  SoloSaldosIniciales,
} from './errores-de-anulacion-de-pagos.js';
import type { PagoConLineas } from './pago-con-lineas.js';
import type { EfectoDePago } from './eventos-de-pagos.js';
import type { FormaDePago } from './pagos.js';
import type { OrigenDeDocumento } from './tipos-de-documento.js';

/** Cómo anuló Bancos el movimiento del pago; `null` si el pago no tiene movimiento propio (nota ligada, apertura, efectivo). */
export type AnulacionEnBancos = 'sin_inverso' | 'con_inverso' | null;

/** Lo que fija la fecha contable de una anulación (CP5-a): lo que hizo Bancos y el día de hoy. */
export interface DatosDeLaFechaDeAnulacion {
  enBancos: AnulacionEnBancos;
  /** La fecha del inverso en Bancos; solo con `con_inverso`. */
  fechaDelInverso: string | null;
  /** Hoy en la zona horaria de la empresa. */
  hoy: string;
}

/**
 * La fecha contable de la anulación de un pago (diseño de CP4 §5.9): sin inverso el pago «nunca existió» y vale la del pago;
 * con inverso, la del inverso en Bancos; sin movimiento en Bancos, hoy (nunca antes de la fecha del pago).
 */
export function fechaDeAnulacionDelPago(pago: Pick<PagoConLineas, 'fecha'>, datos: DatosDeLaFechaDeAnulacion): string {
  if (datos.enBancos === 'sin_inverso') return pago.fecha;
  if (datos.enBancos === 'con_inverso' && datos.fechaDelInverso !== null) return datos.fechaDelInverso;
  return datos.hoy > pago.fecha ? datos.hoy : pago.fecha;
}

/** Qué cuenta usa Contabilidad según la forma del pago (§2.3). */
export function efectoDelPago(pago: Pick<PagoConLineas, 'forma' | 'conCargaCerrada'>): EfectoDePago {
  const porForma: Record<Exclude<FormaDePago, 'cuenta_de_apertura'>, EfectoDePago> = {
    cheque: 'banco',
    nota_de_debito: 'banco',
    nota_ligada: 'transitoria_por_aplicar',
    efectivo: 'efectivo',
    cheque_de_apertura: 'banco',
  };
  if (pago.forma !== 'cuenta_de_apertura') return porForma[pago.forma];
  return pago.conCargaCerrada ? 'correccion_de_error' : 'apertura';
}

/** @throws ReaplicacionConOtroMonto si la suma de lo nuevo no es el monto del pago: el dinero no cambia al reaplicar. */
export function exigirElMismoMonto(
  pago: Pick<PagoConLineas, 'montoCentavos'>,
  lineas: readonly { montoCentavos: number }[],
): void {
  const suma = lineas.reduce((total, { montoCentavos }) => total + montoCentavos, 0);
  if (suma !== pago.montoCentavos) throw new ReaplicacionConOtroMonto(pago.montoCentavos);
}

/** @throws SoloSaldosIniciales si un pago a la cuenta de apertura cubre un documento que no es un saldo inicial. */
export function exigirSoloSaldosInicialesEnLaApertura(
  pago: Pick<PagoConLineas, 'forma'>,
  origenes: readonly OrigenDeDocumento[],
): void {
  if (pago.forma === 'cuenta_de_apertura' && origenes.some((origen) => origen !== 'saldo_inicial')) {
    throw new SoloSaldosIniciales();
  }
}

/**
 * La fecha de una diferencia de centavos saldada desde la ficha del pago: la del pago o posterior, sin pasar de hoy.
 * @throws FechaDeDiferenciaInvalida
 */
export function exigirFechaDeDiferencia(fecha: string, limites: { fechaDelPago: string; hoy: string }): void {
  if (fecha < limites.fechaDelPago || fecha > limites.hoy) throw new FechaDeDiferenciaInvalida(limites.fechaDelPago);
}
