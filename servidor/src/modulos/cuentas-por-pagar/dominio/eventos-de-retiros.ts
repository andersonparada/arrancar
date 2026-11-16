import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { FormaDeRetiro } from './retiros.js';

/** Cómo anuló Bancos el movimiento que se revierte; `null` si no hubo nada que anular allá. */
type AnulacionEnBancos = 'sin_inverso' | 'con_inverso' | null;

export interface DatosDeRetiroRegistrado {
  empresaId: string;
  retiroId: string;
  numero: number;
  forma: FormaDeRetiro;
  fecha: string;
  montoCentavos: number;
  movimientoId: string;
  cuentaBancariaId: string;
  custodio: string;
  custodioUsuarioId: string | null;
}

/** Se registró un retiro de efectivo (el cheque o la nota ya está en Bancos). Se publica tras confirmar. */
export class RetiroRegistrado extends EventoDominio<DatosDeRetiroRegistrado> {
  readonly nombre = 'cuentas-por-pagar.retiro_registrado';

  constructor(datos: DatosDeRetiroRegistrado) {
    super(datos);
  }
}

export interface DatosDeRetiroLiquidado {
  empresaId: string;
  retiroId: string;
  numero: number;
  /** La fecha de la liquidación (la del depósito, si lo hubo). */
  fecha: string;
  devueltoCentavos: number;
  faltanteCentavos: number;
  movimientoDeDevolucionId: string | null;
}

/** Se liquidó un retiro: lo que sobró se depositó y lo que faltó quedó como faltante. Se publica tras confirmar. */
export class RetiroLiquidadoEvento extends EventoDominio<DatosDeRetiroLiquidado> {
  readonly nombre = 'cuentas-por-pagar.retiro_liquidado';

  constructor(datos: DatosDeRetiroLiquidado) {
    super(datos);
  }
}

export interface DatosDeRetiroReabierto {
  empresaId: string;
  retiroId: string;
  numero: number;
  /** La fecha contable de la reapertura: la del inverso del depósito, la de la liquidación si «nunca existió», o la de hoy. */
  fecha: string;
  fechaDeLiquidacion: string;
  devueltoCentavos: number;
  faltanteCentavos: number;
  anulacionEnBancos: AnulacionEnBancos;
}

/** Se reabrió un retiro liquidado (se anuló su depósito, si lo hubo). Se publica tras confirmar. */
export class RetiroReabierto extends EventoDominio<DatosDeRetiroReabierto> {
  readonly nombre = 'cuentas-por-pagar.retiro_reabierto';

  constructor(datos: DatosDeRetiroReabierto) {
    super(datos);
  }
}

export interface DatosDeRetiroAnulado {
  empresaId: string;
  retiroId: string;
  numero: number;
  /** La fecha contable de la anulación (CP5-a). */
  fecha: string;
  /** La del retiro. */
  fechaOriginal: string;
  anulacionEnBancos: Exclude<AnulacionEnBancos, null>;
}

/** Se anuló un retiro sin pagos: Contabilidad revierte su partida con `fecha` (o la cancela si fue «sin inverso»). */
export class RetiroAnulado extends EventoDominio<DatosDeRetiroAnulado> {
  readonly nombre = 'cuentas-por-pagar.retiro_anulado';

  constructor(datos: DatosDeRetiroAnulado) {
    super(datos);
  }
}
