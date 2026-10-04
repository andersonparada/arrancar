import { PeriodoInvalido } from './errores-de-calculo.js';
import type { TipoDeDocumento } from './tipos-de-documento.js';

/** Meses siguientes a la emisión en que aún se puede reportar la factura (Ley del IVA, art. 20). */
export const MESES_DE_PLAZO_DEL_CREDITO = 2;

function exigirFecha(fecha: string, campo: string): void {
  const instante = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? new Date(`${fecha}T00:00:00Z`).getTime() : Number.NaN;
  const valida = !Number.isNaN(instante) && new Date(instante).toISOString().startsWith(fecha);
  if (!valida) throw new PeriodoInvalido(`"${campo}" no es una fecha válida (AAAA-MM-DD).`);
}

/** Primer día del mes de una fecha: `2026-03-17` → `2026-03-01`. */
export function primerDiaDelMes(fecha: string): string {
  exigirFecha(fecha, 'Fecha');
  return `${fecha.slice(0, 7)}-01`;
}

/** Primer día del mes que queda `meses` después de la fecha: `2026-11-20` + 2 → `2027-01-01`. */
export function sumarMeses(fecha: string, meses: number): string {
  exigirFecha(fecha, 'Fecha');
  const indice = Number(fecha.slice(0, 4)) * 12 + (Number(fecha.slice(5, 7)) - 1) + meses;
  return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, '0')}-01`;
}

/** Último período en que la factura aún da crédito: el mes de emisión más dos. */
export function ultimoPeriodoConCredito(fechaDeEmision: string): string {
  return sumarMeses(fechaDeEmision, MESES_DE_PLAZO_DEL_CREDITO);
}

/** `true` si el período pasa del plazo del art. 20 para esa emisión. */
export function esFueraDePlazo(periodo: string, fechaDeEmision: string): boolean {
  return periodo > ultimoPeriodoConCredito(fechaDeEmision);
}

export interface FechasDelDocumento {
  tipo: TipoDeDocumento;
  fechaDeEmision: string;
  fechaDeRecepcion: string;
}

/**
 * Período que se propone en el formulario: el mes de recepción (el «mes actual abierto»), que
 * nunca queda antes del mes de emisión. La nota de crédito siempre va en el mes en que se recibe.
 */
export function periodoPropuesto(fechas: FechasDelDocumento): string {
  const recepcion = primerDiaDelMes(fechas.fechaDeRecepcion);
  if (fechas.tipo === 'nota_de_credito') return recepcion;
  const emision = primerDiaDelMes(fechas.fechaDeEmision);
  return recepcion > emision ? recepcion : emision;
}

/**
 * Las reglas del período que repiten los `check` de la tabla: primer día del mes, no antes del
 * mes de emisión, recepción no anterior a la emisión y nota de crédito en su mes de recepción
 * (sin los dos meses de gracia). Pasarse de emisión + 2 no es error: da `fuera_de_plazo`.
 */
export function exigirPeriodoValido(fechas: FechasDelDocumento & { periodo: string }): void {
  exigirFecha(fechas.periodo, 'Período');
  exigirFecha(fechas.fechaDeEmision, 'Fecha de emisión');
  exigirFecha(fechas.fechaDeRecepcion, 'Fecha de recepción');
  if (!fechas.periodo.endsWith('-01')) throw new PeriodoInvalido('El período debe ser el primer día de un mes.');
  if (fechas.fechaDeRecepcion < fechas.fechaDeEmision) {
    throw new PeriodoInvalido('La fecha de recepción no puede ser anterior a la de emisión.');
  }
  if (fechas.periodo < primerDiaDelMes(fechas.fechaDeEmision)) {
    throw new PeriodoInvalido('El período no puede ser anterior al mes de emisión.');
  }
  if (fechas.tipo === 'nota_de_credito' && fechas.periodo !== primerDiaDelMes(fechas.fechaDeRecepcion)) {
    throw new PeriodoInvalido('La nota de crédito va en el período del mes en que se recibe.');
  }
}
