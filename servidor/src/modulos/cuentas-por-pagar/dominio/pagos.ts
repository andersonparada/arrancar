import { numeroDeContrasena } from './contrasena.js';

/**
 * Cómo se pagó. Que la forma tenga o no un movimiento en Bancos no se asume aquí: solo las tablas y quien orquesta el
 * pago lo saben, y una forma nueva (efectivo) puede no tenerlo.
 */
export type FormaDePago = 'cheque' | 'nota_de_debito' | 'nota_ligada' | 'cuenta_de_apertura' | 'efectivo';

export type EstadoDeUnPago = 'vigente' | 'anulado';

/** Lo que un pago entrega a un cargo de su contraseña (una línea de `aplicaciones_de_pagos` con los datos de su pago). */
export interface LineaDePago {
  pagoId: string;
  /** Correlativo del pago; con `anioDeNumero` forma el número que ve el usuario (`numeroDelPago`). */
  numero: number;
  anioDeNumero: number;
  forma: FormaDePago;
  /** `AAAA-MM-DD`: la del pago; si es posterior a hoy, el pago está comprometido (cheque posfechado). */
  fecha: string;
  estado: EstadoDeUnPago;
  /** La contraseña de la línea (`aplicaciones_de_pagos.contrasena_id`), no la del pago. */
  contrasenaId: string;
  cargoId: string;
  montoCentavos: number;
  retencionDescontadaCentavos: number;
}

/** Lo que un reintegro devolvió contra una nota de crédito. */
export interface LineaDeReintegro {
  reintegroId: string;
  numero: number;
  anioDeNumero: number;
  forma: 'deposito' | 'efectivo';
  fecha: string;
  estado: EstadoDeUnPago;
  notaId: string;
  montoCentavos: number;
}

/** Lo mínimo de un pago vigente para separar lo pagado de lo comprometido. */
export interface PagoVigenteDelCargo {
  /** `AAAA-MM-DD`. */
  fecha: string;
  montoCentavos: number;
}

/** Cómo va el pago de un cargo; sale del saldo y de lo pagado, no se guarda. */
export type EstadoDePago = 'pendiente' | 'en_parte' | 'comprometido' | 'pagado';

/** El número del pago como se lee: `15` o `2026-15`, igual que el de las contraseñas. */
export const numeroDelPago = numeroDeContrasena;

/** Un pago con fecha posterior a hoy se hará efectivo en esa fecha: compromete el documento desde ya (§2.4). */
export const estaPosfechado = ({ fecha }: PagoVigenteDelCargo, hoy: string): boolean => fecha > hoy;

/** Lo pagado a la fecha y lo comprometido a una fecha posterior, en centavos. */
export function pagadoYComprometido(
  pagosVigentes: readonly PagoVigenteDelCargo[],
  hoy: string,
): { pagadoCentavos: number; comprometidoCentavos: number } {
  let pagadoCentavos = 0;
  let comprometidoCentavos = 0;
  for (const pago of pagosVigentes) {
    if (estaPosfechado(pago, hoy)) comprometidoCentavos += pago.montoCentavos;
    else pagadoCentavos += pago.montoCentavos;
  }
  return { pagadoCentavos, comprometidoCentavos };
}

/** Lo que `estadoDePagoDe` necesita: el saldo que queda y lo pagado y comprometido. */
export interface CifrasDelPago {
  saldoCentavos: number;
  pagadoCentavos: number;
  comprometidoCentavos: number;
}

/**
 * `pagado` si ya no se debe nada y nada está comprometido; `comprometido` si ya no se debe nada pero hay pagos con fecha
 * futura; `en_parte` si se pagó o comprometió algo y queda saldo; `pendiente` si no.
 */
export function estadoDePagoDe({ saldoCentavos, pagadoCentavos, comprometidoCentavos }: CifrasDelPago): EstadoDePago {
  if (saldoCentavos <= 0) return comprometidoCentavos > 0 ? 'comprometido' : 'pagado';
  return pagadoCentavos + comprometidoCentavos > 0 ? 'en_parte' : 'pendiente';
}
