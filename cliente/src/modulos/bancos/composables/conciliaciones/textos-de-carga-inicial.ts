import { formatearFecha } from '@/modulos/core/utilidades/formato';

export const ROTULO_DE_CARGA_INICIAL = 'De la carga inicial';
export const TITULO_DE_POSFECHADOS = 'Cheques con fecha posterior (posfechados)';
export const TITULO_DE_COBRADOS_ANTES = 'Cheques cobrados antes de su fecha';

/** Si el día siguiente a la fecha (`aaaa-mm-dd`) es día 1: el corte cayó en fin de mes. */
export function esFinDeMes(fecha: string): boolean {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return false;
  return new Date(Date.UTC(anio, mes - 1, dia + 1)).getUTCDate() === 1;
}

/**
 * El rótulo del saldo inicial del banco en la primera conciliación: con corte en fin de mes es el «saldo anterior»
 * del estado de cuenta; si no, el saldo del banco a la fecha del corte.
 */
export function rotuloDelSaldoInicialDelBanco(fecha: string): string {
  const texto = formatearFecha(fecha);
  return esFinDeMes(fecha)
    ? `Saldo anterior del estado de cuenta (carga inicial al ${texto})`
    : `Saldo del banco al ${texto} (carga inicial)`;
}

/** El aviso de un posfechado candidato. */
export function avisoDeCheque(fecha: string): string {
  return `Cheque con fecha ${formatearFecha(fecha)}: márquelo solo si el banco ya lo pagó`;
}
