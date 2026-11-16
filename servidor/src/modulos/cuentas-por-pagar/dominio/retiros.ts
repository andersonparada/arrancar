import { numeroDeContrasena } from './contrasena.js';

export type FormaDeRetiro = 'cheque' | 'nota_de_debito';

export type EstadoDeRetiro = 'abierto' | 'liquidado' | 'anulado';

/** Clave del correlativo de los retiros en `core.correlativos`. */
export const CLAVE_DE_RETIROS = 'cuentas-por-pagar.retiros';

/** El recurso con que se auditan los retiros. */
export const RECURSO_DE_RETIROS = 'cuentas-por-pagar.retiros';

/** El número del retiro como se lee: `15` o `2026-15`. */
export const numeroDelRetiro = numeroDeContrasena;

/**
 * El efectivo que la empresa sacó del banco (un cheque o una nota de débito) para pagar a uno o varios proveedores. Las
 * cifras van en centavos enteros. `custodio` es quien lleva el efectivo; si es usuario de Arrancar, `custodioUsuarioId`.
 */
export interface RetiroDeEfectivo {
  id: string;
  numero: number;
  anioDeNumero: number;
  forma: FormaDeRetiro;
  /** `AAAA-MM-DD`. */
  fecha: string;
  montoCentavos: number;
  /** El cheque o la nota de Bancos que sacó el efectivo. */
  movimientoId: string;
  custodio: string;
  custodioUsuarioId: string | null;
  observaciones: string | null;
  estado: EstadoDeRetiro;
  fechaDeLiquidacion: string | null;
  liquidadoPor: string | null;
  devueltoCentavos: number;
  /** El depósito de Bancos de lo devuelto. */
  movimientoDeDevolucionId: string | null;
  faltanteCentavos: number;
  motivoDeFaltante: string | null;
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}

/** Lo que queda por usar del retiro: el monto menos lo pagado en efectivo, lo devuelto y el faltante. */
export function disponibleDelRetiro(
  retiro: Pick<RetiroDeEfectivo, 'montoCentavos' | 'devueltoCentavos' | 'faltanteCentavos'>,
  pagadoCentavos: number,
): number {
  return retiro.montoCentavos - pagadoCentavos - retiro.devueltoCentavos - retiro.faltanteCentavos;
}

/** El retiro es de un mes anterior al de hoy (para el aviso de fin de mes). */
export const esDeMesAnterior = (fecha: string, hoy: string): boolean => fecha.slice(0, 7) < hoy.slice(0, 7);

/** El último día del mes anterior al de la fecha (`AAAA-MM-DD`). */
export function ultimoDiaDelMesAnterior(fecha: string): string {
  const anio = Number(fecha.slice(0, 4));
  const mes = Number(fecha.slice(5, 7));
  return new Date(Date.UTC(anio, mes - 1, 0)).toISOString().slice(0, 10);
}
