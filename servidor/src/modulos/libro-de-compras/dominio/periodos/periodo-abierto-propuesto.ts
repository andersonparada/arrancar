import { periodoPropuesto, sumarMeses, ultimoPeriodoConCredito } from '../periodo-del-libro.js';
import type { TipoDeDocumento } from '../tipos-de-documento.js';

export interface DatosDeLaPropuesta {
  tipo: TipoDeDocumento;
  fechaDeEmision: string;
  fechaDeRecepcion: string;
  /** La empresa acredita el IVA de sus compras en el período (con crédito corre el plazo del art. 20). */
  conCredito: boolean;
  /** Los períodos declarados con el bloqueo encendido. */
  bloqueados: readonly string[];
}

export interface PeriodoAbiertoPropuesto {
  /** `null` si no hay alternativa: la nota de crédito va en el mes en que se recibe. */
  periodo: string | null;
  /** El período propuesto aún da crédito (emisión + 2 meses); si no, el IVA irá al costo. */
  enPlazo: boolean;
}

/**
 * El primer período abierto desde el que correspondería al documento: con crédito, dentro del art. 20 (emisión más dos
 * meses) si lo hay; si todos están declarados, el primero abierto después, fuera de plazo. La nota de crédito no tiene
 * alternativa: hay que reabrir su mes.
 */
export function periodoAbiertoPropuesto(datos: DatosDeLaPropuesta): PeriodoAbiertoPropuesto {
  if (datos.tipo === 'nota_de_credito') return { periodo: null, enPlazo: true };
  const bloqueados = new Set(datos.bloqueados);
  let periodo = periodoPropuesto(datos);
  while (bloqueados.has(periodo)) periodo = sumarMeses(periodo, 1);
  const enPlazo = !datos.conCredito || periodo <= ultimoPeriodoConCredito(datos.fechaDeEmision);
  return { periodo, enPlazo };
}
