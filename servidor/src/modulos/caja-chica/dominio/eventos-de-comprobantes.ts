import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';

export interface DatosDeComprobanteAsignado {
  empresaId: string;
  fondoId: string;
  comprobanteId: string;
  clase: 'documento' | 'vale_de_gasto';
  documentoDeCompraId: string | null;
  fecha: string;
  montoCentavos: number;
  montoRetenidoCentavos: number;
  resta: boolean;
  conceptoDeGastoId: string | null;
  deducible: boolean;
  conActivoFijo: boolean;
}

/** Un documento se asignó a un fondo o se registró un vale de gasto. Se publica tras confirmar. */
export class ComprobanteAsignado extends EventoDominio<DatosDeComprobanteAsignado> {
  readonly nombre = 'caja-chica.comprobante_asignado';

  constructor(datos: DatosDeComprobanteAsignado) {
    super(datos);
  }
}

export interface DatosDeComprobanteQuitado {
  empresaId: string;
  fondoId: string;
  comprobanteId: string;
  clase: 'documento' | 'vale_de_gasto';
  fecha: string;
  montoCentavos: number;
  resta: boolean;
  motivo: 'devuelto_a_la_bandeja' | 'anulado';
}

/** Un comprobante salió del fondo (volvió a la bandeja o se anuló). Se publica tras confirmar. */
export class ComprobanteQuitado extends EventoDominio<DatosDeComprobanteQuitado> {
  readonly nombre = 'caja-chica.comprobante_quitado';

  constructor(datos: DatosDeComprobanteQuitado) {
    super(datos);
  }
}
