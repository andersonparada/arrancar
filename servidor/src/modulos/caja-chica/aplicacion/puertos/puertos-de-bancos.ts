import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type {
  AvisoDeBancos,
  LineaDeConcepto,
  OrigenDeMovimientoContrato,
} from '../../../core/contratos/bancos.contratos.js';

/** Un cheque de la chequera, con el fondo (o la reposición) como origen y el concepto fijo. */
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

/** Una nota de débito (el dinero sale al fondo) o de crédito (el custodio deposita). */
export interface NotaARegistrar {
  origen: OrigenDeMovimientoContrato;
  cuentaBancariaId: string;
  tipo: 'debito' | 'credito';
  fecha: string;
  montoCentavos: number;
  beneficiario: string;
  conceptos: LineaDeConcepto[];
  referencia?: string;
  observaciones?: string;
}

/** El cheque o la nota que Bancos creó. */
export interface MovimientoCreado {
  movimientoId: string;
  cuentaBancariaId: string;
  avisos: AvisoDeBancos[];
}

export interface AnulacionDeMovimiento {
  origen: OrigenDeMovimientoContrato;
  movimientoId: string;
  motivo: string;
  fecha?: string;
}

/** Cómo anuló Bancos el movimiento y, con inverso, en qué fecha. */
export interface MovimientoAnulado {
  forma: 'sin_inverso' | 'con_inverso';
  fechaDelInverso: string | null;
}

/** Las órdenes a Bancos (por el mediador): Caja chica no importa nada de ese módulo. */
export interface FondosEnBancos {
  emitirCheque(operador: Operador, cheque: ChequeAEmitir): Promise<MovimientoCreado>;
  registrarNota(operador: Operador, nota: NotaARegistrar): Promise<MovimientoCreado>;
  anularMovimiento(operador: Operador, anulacion: AnulacionDeMovimiento): Promise<MovimientoAnulado>;
}
