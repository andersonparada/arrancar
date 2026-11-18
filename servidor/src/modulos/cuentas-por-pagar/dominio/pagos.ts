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
  /** El número del cheque de Bancos con que se pagó; `null` si la forma no es cheque. */
  numeroDeCheque?: number | null;
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
export type EstadoDePago = 'pendiente' | 'en_parte' | 'comprometido_en_parte' | 'comprometido' | 'pagado';

/** Los estados de pago, en el orden en que se ofrecen; `estadoDePagoDe` y el SQL de los filtros los dan. */
export const ESTADOS_DE_PAGO = [
  'pendiente',
  'en_parte',
  'comprometido_en_parte',
  'comprometido',
  'pagado',
] as const satisfies readonly EstadoDePago[];

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

/** Lo que `estadoDePagoDe` necesita: la deuda y lo pagado (hasta hoy o al corte) y lo comprometido (fecha posterior). */
export interface CifrasDelPago {
  deudaCentavos: number;
  pagadoCentavos: number;
  comprometidoCentavos: number;
}

/**
 * El único lugar donde se decide el estado de pago (lista, ficha, contraseña y R2). Con deuda D, pagado P, comprometido
 * C y disponible = D - C: `pagado` si D = 0; `comprometido` si el disponible es 0; con disponible, `en_parte` si hay
 * pagado, `comprometido_en_parte` si solo hay comprometido y `pendiente` si no hay ninguno. Una nota aplicada o un
 * ajuste no cuentan como pagado.
 */
export function estadoDePagoDe({ deudaCentavos, pagadoCentavos, comprometidoCentavos }: CifrasDelPago): EstadoDePago {
  if (deudaCentavos <= 0) return 'pagado';
  if (deudaCentavos - comprometidoCentavos <= 0) return 'comprometido';
  if (pagadoCentavos > 0) return 'en_parte';
  return comprometidoCentavos > 0 ? 'comprometido_en_parte' : 'pendiente';
}

/** La fecha del cheque posfechado más lejano y cuántos pagos posfechados hay; sin ninguno, `null` y 0. */
export function posfechadosDe(
  pagosVigentes: readonly PagoVigenteDelCargo[],
  hoy: string,
): { comprometidoHasta: string | null; chequesPosfechados: number } {
  const fechas = pagosVigentes.filter((pago) => estaPosfechado(pago, hoy)).map(({ fecha }) => fecha);
  const comprometidoHasta = fechas.length > 0 ? fechas.reduce((a, b) => (a > b ? a : b)) : null;
  return { comprometidoHasta, chequesPosfechados: fechas.length };
}
