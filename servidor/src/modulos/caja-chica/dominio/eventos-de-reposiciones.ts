import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { DesgloseDeReposicion } from './reposiciones.js';

/** Lo que cada comprobante aportó a la reposición, para que Contabilidad reconozca el gasto. */
export interface LineaDeReposicionEmitida {
  comprobanteId: string;
  clase: 'documento' | 'vale_de_gasto' | 'faltante' | 'sobrante';
  documentoDeCompraId: string | null;
  conceptoDeGastoId: string | null;
  /** Firmado: lo que resta (nota de crédito, sobrante) va negativo. */
  montoCentavos: number;
  conActivoFijo: boolean;
  deducible: boolean;
}

export interface DatosDeReposicionRegistrada {
  empresaId: string;
  fondoId: string;
  reposicionId: string;
  numero: number;
  fecha: string;
  forma: 'cheque' | 'nota_de_debito';
  montoCentavos: number;
  movimientoId: string;
  cuentaBancariaId: string;
  desglose: DesgloseDeReposicion;
  lineas: LineaDeReposicionEmitida[];
}

/** Se repuso el fondo: el cheque o la nota ya está en Bancos. Se publica tras confirmar. */
export class ReposicionRegistrada extends EventoDominio<DatosDeReposicionRegistrada> {
  readonly nombre = 'caja-chica.reposicion_registrada';

  constructor(datos: DatosDeReposicionRegistrada) {
    super(datos);
  }
}

export interface DatosDeReposicionAnulada {
  empresaId: string;
  fondoId: string;
  reposicionId: string;
  numero: number;
  fecha: string;
  /** La fecha contable de la anulación. */
  fechaDeAnulacion: string;
  montoCentavos: number;
  anulacionEnBancos: 'sin_inverso' | 'con_inverso' | null;
  lineas: LineaDeReposicionEmitida[];
}

/** Se anuló una reposición: sus comprobantes vuelven a pendientes. Se publica tras confirmar. */
export class ReposicionAnulada extends EventoDominio<DatosDeReposicionAnulada> {
  readonly nombre = 'caja-chica.reposicion_anulada';

  constructor(datos: DatosDeReposicionAnulada) {
    super(datos);
  }
}
