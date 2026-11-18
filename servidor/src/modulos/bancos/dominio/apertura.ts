import { aCentavos, deCentavos } from './centavos.js';
import { BeneficiarioObligatorio } from './errores.js';
import {
  DescripcionDelErrorObligatoria,
  mensajeDeChequeAntiguo,
  mensajeDeDepositoViejo,
  NumeroDeChequeObligatorio,
  PartidaDespuesDelCorte,
  PosfechadoNoPosterior,
  SentidoDelErrorObligatorio,
} from './errores-de-apertura.js';
import { esParteDeCheque, type ParteQueSeAgrega } from './partes-de-apertura.js';

/** Un depósito en tránsito con más días que estos al corte es sospechoso (el contador, cambio 4). */
export const DIAS_DE_DEPOSITO_EN_TRANSITO_SOSPECHOSO = 30;

const MS_POR_DIA = 86_400_000;

const enUtc = (fecha: string): Date => new Date(`${fecha}T00:00:00Z`);

/** La fecha de corte de la carga: el día anterior a la fecha de inicio (como Cuentas por pagar). */
export function fechaDeCorte(fechaDeInicio: string): string {
  return new Date(enUtc(fechaDeInicio).getTime() - MS_POR_DIA).toISOString().slice(0, 10);
}

/** Los días corridos entre dos fechas `AAAA-MM-DD` (`hasta` menos `desde`). */
export const diasEntre = (desde: string, hasta: string): number =>
  Math.round((enUtc(hasta).getTime() - enUtc(desde).getTime()) / MS_POR_DIA);

/** Los meses cumplidos entre dos fechas: del 15 de enero al 15 de julio son 6; al 14 de julio, 5. */
export function mesesEntre(desde: string, hasta: string): number {
  const [anioD, mesD, diaD] = desde.split('-').map(Number) as [number, number, number];
  const [anioH, mesH, diaH] = hasta.split('-').map(Number) as [number, number, number];
  const meses = (anioH - anioD) * 12 + (mesH - mesD);
  return diaH < diaD ? meses - 1 : meses;
}

/** El mes del corte más uno: el período de la primera conciliación, `{ anio, mes }`. */
export function periodoDeLaFechaDeInicio(fechaDeInicio: string): { anio: number; mes: number } {
  const [anio, mes] = fechaDeInicio.split('-').map(Number) as [number, number];
  return { anio, mes };
}

export type CodigoDeAvisoDePartida = 'cheque_antiguo' | 'deposito_viejo';

export interface AvisoDePartida {
  codigo: CodigoDeAvisoDePartida;
  mensaje: string;
}

interface PartidaParaAvisar {
  parte: ParteQueSeAgrega | 'saldo_del_banco' | 'saldo_global';
  fecha: string;
  numeroDeCheque: number | null;
}

interface ContextoDeAvisos {
  corte: string;
  /** `bancos.cheques.meses_de_vencimiento` de la empresa (por omisión 7). */
  mesesDeVencimiento: number;
}

/** Los avisos de una partida al corte (no bloquean): cheque antiguo (art. 508) y depósito en tránsito viejo. */
export function avisosDeLaPartida(partida: PartidaParaAvisar, contexto: ContextoDeAvisos): AvisoDePartida[] {
  const { corte, mesesDeVencimiento } = contexto;
  if (partida.parte === 'cheque_en_circulacion') {
    const meses = mesesEntre(partida.fecha, corte);
    if (meses < mesesDeVencimiento) return [];
    const mensaje = mensajeDeChequeAntiguo({ numero: partida.numeroDeCheque ?? 0, fecha: partida.fecha, corte, meses });
    return [{ codigo: 'cheque_antiguo', mensaje }];
  }
  if (partida.parte === 'deposito_en_transito') {
    const dias = diasEntre(partida.fecha, corte);
    if (dias <= DIAS_DE_DEPOSITO_EN_TRANSITO_SOSPECHOSO) return [];
    return [{ codigo: 'deposito_viejo', mensaje: mensajeDeDepositoViejo({ fecha: partida.fecha, dias }) }];
  }
  return [];
}

/** Lo que el usuario escribe de una partida y que se revisa antes de armar el movimiento. */
export interface PartidaPorRevisar {
  parte: ParteQueSeAgrega;
  fecha: string;
  sentido: 'credito' | 'debito' | null;
  numeroDeCheque: number | null;
  beneficiario: string | null;
  referencia: string | null;
  observaciones: string | null;
}

/** El posfechado lleva fecha posterior al corte; las demás partidas, del corte o antes. */
function exigirLaFechaDeLaParte({ parte, fecha }: PartidaPorRevisar, corte: string): void {
  if (parte === 'cheque_posfechado') {
    if (fecha <= corte) throw new PosfechadoNoPosterior(corte);
    return;
  }
  if (fecha > corte) throw new PartidaDespuesDelCorte(corte);
}

/**
 * Revisa lo propio de cada clase de partida (el monto lo revisa el movimiento).
 * @throws PartidaDespuesDelCorte, PosfechadoNoPosterior, NumeroDeChequeObligatorio, BeneficiarioObligatorio,
 *   SentidoDelErrorObligatorio o DescripcionDelErrorObligatoria.
 */
export function revisarLaPartida(partida: PartidaPorRevisar, corte: string): void {
  exigirLaFechaDeLaParte(partida, corte);
  if (esParteDeCheque(partida.parte)) {
    if (!partida.numeroDeCheque) throw new NumeroDeChequeObligatorio();
    if (!partida.beneficiario) throw new BeneficiarioObligatorio();
  }
  if (partida.parte !== 'error_del_banco') return;
  if (!partida.sentido) throw new SentidoDelErrorObligatorio();
  if (!partida.referencia && !partida.observaciones) throw new DescripcionDelErrorObligatoria();
}

/** El saldo según el estado de cuenta, con signo, como movimiento: crédito si es positivo, débito si es negativo. */
export function saldoDelBancoComoMovimiento(saldo: string): { tipo: 'credito' | 'debito'; monto: string } {
  const centavos = aCentavos(saldo);
  return { tipo: centavos < 0 ? 'debito' : 'credito', monto: deCentavos(Math.abs(centavos)) };
}
