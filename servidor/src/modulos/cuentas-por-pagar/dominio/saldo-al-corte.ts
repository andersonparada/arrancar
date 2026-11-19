import { diasEntre, ultimoDiaDelMes } from './fechas-de-corte.js';
import type { OrigenDeDocumento } from './tipos-de-documento.js';

/**
 * Las reglas de un saldo a una fecha de corte (`docs/modulos/diseno-cp5-reportes.md` §2). La consulta
 * `ConsultaDeSaldosAlCorte` las aplica en SQL; estas son las mismas reglas en funciones puras, para probarlas y para
 * compararlas con el SQL en un escenario completo.
 */

/** Los datos de un documento que deciden desde cuándo cuenta. */
export interface DatosDeEfectoDelDocumento {
  origen: OrigenDeDocumento;
  /** `AAAA-MM-DD`. */
  fechaEmision: string;
}

/**
 * Desde qué fecha cuenta un documento en un corte (§2.2): su emisión; y si es del libro y se emitió antes de la fecha de
 * inicio de la empresa, desde la fecha de inicio (no estaba en la carga inicial).
 */
export function fechaDeEfectoDelDocumento(
  { origen, fechaEmision }: DatosDeEfectoDelDocumento,
  fechaDeInicio: string | null,
): string {
  if (origen !== 'libro_de_compras' || fechaDeInicio === null) return fechaEmision;
  return fechaEmision > fechaDeInicio ? fechaEmision : fechaDeInicio;
}

/** Un registro anulado deja de contar solo desde el día de su anulación contable (`null` si sigue vigente). */
export function vigenteAlCorte(fechaDeAnulacion: string | null, corte: string): boolean {
  return fechaDeAnulacion === null || fechaDeAnulacion > corte;
}

/** El mes de una conciliación de Bancos ya autorizada: la única que no cambia. */
export interface MesConciliado {
  anio: number;
  mes: number;
}

/**
 * Desde qué fecha rebaja un pago (§2.1): su fecha; pero un cheque posfechado que el banco cobró antes (marcado en una
 * conciliación autorizada cuyo mes termina antes de su fecha) rebaja desde el fin de ese mes.
 */
export function fechaDeEfectoDelPago(fecha: string, conciliacionAutorizada: MesConciliado | null): string {
  if (conciliacionAutorizada === null) return fecha;
  const finDelMes = ultimoDiaDelMes(conciliacionAutorizada.anio, conciliacionAutorizada.mes);
  return finDelMes < fecha ? finDelMes : fecha;
}

/** Lo que resta del neto de un cargo, en centavos, ya limitado al corte. */
export interface RebajasDelCargo {
  netoCentavos: number;
  aplicadoCentavos: number;
  pagadoCentavos: number;
  ajustadoCentavos: number;
}

/** El saldo de un cargo al corte: su neto menos notas aplicadas, pagos que ya rebajan y ajustes vigentes. */
export const saldoDelCargoAlCorte = (r: RebajasDelCargo): number =>
  r.netoCentavos - r.aplicadoCentavos - r.pagadoCentavos - r.ajustadoCentavos;

/** Lo que resta de la base de una nota de crédito, en centavos, ya limitado al corte. */
export interface RebajasDeLaNota {
  baseCentavos: number;
  aplicadoCentavos: number;
  ajustadoCentavos: number;
  reintegradoCentavos: number;
}

/** El saldo libre (a favor de la empresa) de una nota al corte. */
export const saldoLibreDeLaNotaAlCorte = (r: RebajasDeLaNota): number =>
  r.baseCentavos - r.aplicadoCentavos - r.ajustadoCentavos - r.reintegradoCentavos;

/** Los cargos se reparten en estos tramos según los días que llevan vencidos al corte. */
export const TRAMOS_DE_ANTIGUEDAD = ['por_vencer', 'de_1_a_30', 'de_31_a_60', 'de_61_a_90', 'mas_de_90'] as const;
export type TramoDeAntiguedad = (typeof TRAMOS_DE_ANTIGUEDAD)[number] | 'sin_vencimiento';

/** Días vencidos al corte (cero o negativo: todavía no vence); `null` si no tiene vencimiento. */
export const diasVencidoAlCorte = (corte: string, vencimiento: string | null): number | null =>
  vencimiento === null ? null : diasEntre(vencimiento, corte);

/** El tramo de un cargo por «Vence» (la fecha prometida de la contraseña no cuenta). */
export function tramoDeAntiguedad(corte: string, vencimiento: string | null): TramoDeAntiguedad {
  const dias = diasVencidoAlCorte(corte, vencimiento);
  if (dias === null) return 'sin_vencimiento';
  if (dias <= 0) return 'por_vencer';
  if (dias <= 30) return 'de_1_a_30';
  if (dias <= 60) return 'de_31_a_60';
  return dias <= 90 ? 'de_61_a_90' : 'mas_de_90';
}

/** Cómo va un proveedor al corte según su saldo neto: se le debe pagar (acreedor), nos debe (deudor) o está en cero. */
export type NaturalezaDelSaldo = 'acreedor' | 'deudor' | 'cero';

export function naturalezaDelSaldo(netoCentavos: number): NaturalezaDelSaldo {
  if (netoCentavos === 0) return 'cero';
  return netoCentavos > 0 ? 'acreedor' : 'deudor';
}

/** El porcentaje de un tramo sobre el total de cargos, con dos decimales y sin pasar por flotantes (`"12.50"`). */
export function porcentajeDelTramo(tramoCentavos: number, totalDeCargosCentavos: number): string {
  if (totalDeCargosCentavos <= 0) return '0.00';
  const centesimas = Math.round((tramoCentavos * 10_000) / totalDeCargosCentavos);
  return `${Math.trunc(centesimas / 100)}.${String(Math.abs(centesimas % 100)).padStart(2, '0')}`;
}
