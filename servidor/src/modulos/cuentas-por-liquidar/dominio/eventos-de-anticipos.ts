import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { FormaDeAnticipo } from './anticipos.js';

export interface DatosDeAnticipoEntregado {
  empresaId: string;
  anticipoId: string;
  numero: number;
  forma: FormaDeAnticipo;
  fecha: string;
  fechaLimite: string;
  montoCentavos: number;
  movimientoId: string;
  cuentaBancariaId: string;
  beneficiarioId: string;
  beneficiario: string;
  esEmpleado: boolean;
}

/** Se entregó un anticipo (el cheque o la nota ya está en Bancos). Se publica tras confirmar. */
export class AnticipoEntregado extends EventoDominio<DatosDeAnticipoEntregado> {
  readonly nombre = 'cuentas-por-liquidar.anticipo_entregado';

  constructor(datos: DatosDeAnticipoEntregado) {
    super(datos);
  }
}

export interface DatosDeAnticipoAnulado {
  empresaId: string;
  anticipoId: string;
  numero: number;
  /** La fecha contable de la anulación. */
  fecha: string;
  /** La del anticipo. */
  fechaOriginal: string;
  montoCentavos: number;
  anulacionEnBancos: 'sin_inverso' | 'con_inverso';
}

/** Se anuló un anticipo sin gastos: Contabilidad revierte su partida con `fecha` (o la cancela si fue «sin inverso»). */
export class AnticipoAnulado extends EventoDominio<DatosDeAnticipoAnulado> {
  readonly nombre = 'cuentas-por-liquidar.anticipo_anulado';

  constructor(datos: DatosDeAnticipoAnulado) {
    super(datos);
  }
}
