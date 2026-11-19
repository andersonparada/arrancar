import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type {
  AvisoDeBancos,
  LineaDeConcepto,
  OrigenDeMovimientoContrato,
} from '../../../core/contratos/bancos.contratos.js';

/** Lo que Bancos necesita para emitir el cheque de un anticipo. */
export interface ChequeAEmitir {
  origen: OrigenDeMovimientoContrato;
  chequeraId: string;
  chequeId?: string;
  fecha: string;
  montoCentavos: number;
  beneficiario: string;
  noNegociable: boolean;
  conceptos: LineaDeConcepto[];
  referencia?: string;
  observaciones?: string;
}

/** Lo que Bancos necesita para registrar la nota de débito de un anticipo. */
export interface NotaDeDebitoARegistrar {
  origen: OrigenDeMovimientoContrato;
  cuentaBancariaId: string;
  fecha: string;
  montoCentavos: number;
  beneficiario: string;
  conceptos: LineaDeConcepto[];
  referencia?: string;
  observaciones?: string;
}

/** Lo que Bancos necesita para registrar la nota de crédito de la devolución de lo no gastado. */
export type NotaDeCreditoARegistrar = NotaDeDebitoARegistrar;

/** El reparto por concepto del movimiento de un anticipo (solo clasifica el flujo; las partes suman el monto). */
export interface DesgloseDelMovimiento {
  origen: OrigenDeMovimientoContrato;
  movimientoId: string;
  conceptos: LineaDeConcepto[];
}

/** El movimiento que Bancos creó, con sus avisos (el de fondos de un posfechado). */
export interface MovimientoCreado {
  movimientoId: string;
  cuentaBancariaId: string;
  /** El número del cheque o el de la nota. */
  numero: number;
  avisos: AvisoDeBancos[];
}

/** Lo que Bancos necesita para anular el movimiento de un anticipo. */
export interface AnulacionDeMovimiento {
  origen: OrigenDeMovimientoContrato;
  movimientoId: string;
  motivo: string;
  /** La fecha del inverso, si hay; por omisión decide Bancos. */
  fecha?: string;
}

/** Cómo anuló Bancos el movimiento, y la fecha del inverso si lo hubo. */
export interface AnulacionDelMovimiento {
  forma: 'sin_inverso' | 'con_inverso';
  fechaDelInverso: string | null;
}

/** Las órdenes a Bancos (por el mediador): este módulo no lo importa. */
export interface OrdenesABancos {
  emitirCheque(operador: Operador, cheque: ChequeAEmitir): Promise<MovimientoCreado>;
  registrarNotaDeDebito(operador: Operador, nota: NotaDeDebitoARegistrar): Promise<MovimientoCreado>;
  /** El depósito de lo que no se gastó (nota de crédito). */
  registrarNotaDeCredito(operador: Operador, nota: NotaDeCreditoARegistrar): Promise<MovimientoCreado>;
  /** Anula el cheque o la nota del anticipo (Bancos decide si a la antigua o con inverso); lanza lo que rechace Bancos. */
  anularMovimiento(operador: Operador, anulacion: AnulacionDeMovimiento): Promise<AnulacionDelMovimiento>;
  /** Vuelve a fijar el reparto por concepto del movimiento de la entrega o del reembolso. */
  fijarDesglose(operador: Operador, desglose: DesgloseDelMovimiento): Promise<void>;
}

/** Lo que se lee de Bancos sin orden de un movimiento del anticipo (solo lectura de sus tablas). */
export interface MovimientosDeBancos {
  /** Deja bloqueado el movimiento de Bancos: se bloquea antes que el anticipo. */
  bloquear(movimientoId: string): Promise<void>;
  /** Si el movimiento ya está conciliado (el banco lo pagó); `false` si no existe. */
  estaConciliado(movimientoId: string): Promise<boolean>;
  /** La fecha de un movimiento, p. ej. la del inverso con que Bancos anuló el cheque; `null` si no existe. */
  fechaDe(movimientoId: string): Promise<string | null>;
  /** Cuenta y número del cheque o de la nota de cada movimiento, para mostrar el anticipo. */
  datosDe(movimientoId: string): Promise<DatosDelMovimiento | null>;
}

export interface DatosDelMovimiento {
  cuentaBancariaId: string;
  /** El número del cheque o el de la nota. */
  numero: number;
}
