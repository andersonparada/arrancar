import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { DestinoDeLoNoLiquidado } from './anticipos.js';

export interface DatosDeAnticipoLiquidado {
  empresaId: string;
  anticipoId: string;
  numero: number;
  /** La fecha de la liquidación. */
  fecha: string;
  beneficiarioId: string;
  esEmpleado: boolean;
  montoCentavos: number;
  /** Lo que se justificó con gastos (las notas de crédito restan). */
  gastadoCentavos: number;
  devueltoCentavos: number;
  movimientoDeDevolucionId: string | null;
  reembolsadoCentavos: number;
  movimientoDeReembolsoId: string | null;
  noLiquidadoCentavos: number;
  destinoDeNoLiquidado: DestinoDeLoNoLiquidado | null;
  /** Las cuotas en que se cobra (solo con destino `cobrar`): las ejecutará Planilla. */
  cuotas: number | null;
}

/** Se liquidó un anticipo. Se publica tras confirmar. */
export class AnticipoLiquidado extends EventoDominio<DatosDeAnticipoLiquidado> {
  readonly nombre = 'cuentas-por-liquidar.anticipo_liquidado';

  constructor(datos: DatosDeAnticipoLiquidado) {
    super(datos);
  }
}

export interface DatosDeAnticipoReabierto {
  empresaId: string;
  anticipoId: string;
  numero: number;
  /** La fecha contable de la reapertura: la del inverso del depósito o del reembolso, o la de la liquidación si «nunca existió». */
  fecha: string;
  fechaDeLiquidacion: string;
  devueltoCentavos: number;
  reembolsadoCentavos: number;
  noLiquidadoCentavos: number;
  destinoDeNoLiquidado: DestinoDeLoNoLiquidado | null;
  /** Qué hizo Bancos con el depósito o el reembolso; `null` si no hubo ninguno. */
  anulacionEnBancos: 'sin_inverso' | 'con_inverso' | null;
}

/** Se reabrió un anticipo liquidado (se anuló su depósito o su reembolso, si lo hubo). Se publica tras confirmar. */
export class AnticipoReabierto extends EventoDominio<DatosDeAnticipoReabierto> {
  readonly nombre = 'cuentas-por-liquidar.anticipo_reabierto';

  constructor(datos: DatosDeAnticipoReabierto) {
    super(datos);
  }
}
