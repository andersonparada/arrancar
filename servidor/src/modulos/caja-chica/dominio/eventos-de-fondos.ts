import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { FormaDeEntrega, TipoDeCambioDeMonto } from './fondos.js';

export interface DatosDeFondoAbierto {
  empresaId: string;
  fondoId: string;
  nombre: string;
  fecha: string;
  montoCentavos: number;
  forma: FormaDeEntrega;
  movimientoId: string;
  cuentaBancariaId: string;
  custodio: string;
  custodioUsuarioId: string | null;
}

/** Se abrió un fondo (el cheque o la nota ya está en Bancos). Se publica tras confirmar. */
export class FondoAbierto extends EventoDominio<DatosDeFondoAbierto> {
  readonly nombre = 'caja-chica.fondo_abierto';

  constructor(datos: DatosDeFondoAbierto) {
    super(datos);
  }
}

export interface DatosDeMontoCambiado {
  empresaId: string;
  fondoId: string;
  cambioId: string;
  tipo: 'aumento' | 'disminucion';
  fecha: string;
  montoCentavos: number;
  movimientoId: string;
  cuentaBancariaId: string;
}

/** El fondo aumentó (cheque o nota de débito) o disminuyó (depósito). Se publica tras confirmar. */
export class MontoDelFondoCambiado extends EventoDominio<DatosDeMontoCambiado> {
  readonly nombre = 'caja-chica.monto_del_fondo_cambiado';

  constructor(datos: DatosDeMontoCambiado) {
    super(datos);
  }
}

export interface DatosDeCambioAnulado {
  empresaId: string;
  fondoId: string;
  cambioId: string;
  tipo: Extract<TipoDeCambioDeMonto, 'apertura' | 'aumento'>;
  /** La fecha contable de la anulación. */
  fecha: string;
  fechaOriginal: string;
  montoCentavos: number;
  anulacionEnBancos: 'sin_inverso' | 'con_inverso' | null;
}

/** Se anuló la apertura (el fondo queda cerrado) o un aumento: Contabilidad revierte su partida. Se publica tras confirmar. */
export class CambioDeMontoAnulado extends EventoDominio<DatosDeCambioAnulado> {
  readonly nombre = 'caja-chica.cambio_de_monto_anulado';

  constructor(datos: DatosDeCambioAnulado) {
    super(datos);
  }
}

export interface DatosDeCustodioCambiado {
  empresaId: string;
  fondoId: string;
  fecha: string;
  custodioAnterior: string;
  custodio: string;
  custodioUsuarioId: string | null;
  motivo: string;
}

/** Cambió quién lleva el efectivo del fondo. Se publica tras confirmar. */
export class CustodioCambiado extends EventoDominio<DatosDeCustodioCambiado> {
  readonly nombre = 'caja-chica.custodio_cambiado';

  constructor(datos: DatosDeCustodioCambiado) {
    super(datos);
  }
}
