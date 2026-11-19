import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { DestinoDelFaltante } from './arqueos.js';

export interface DatosDeArqueoRegistrado {
  empresaId: string;
  fondoId: string;
  arqueoId: string;
  numero: number;
  fecha: string;
  efectivoContadoCentavos: number;
  efectivoEsperadoCentavos: number;
  diferenciaCentavos: number;
  destinoDelFaltante: DestinoDelFaltante | null;
  comprobanteId: string | null;
}

/** Se registró un arqueo, con su diferencia y el destino del faltante. Se publica tras confirmar. */
export class ArqueoRegistrado extends EventoDominio<DatosDeArqueoRegistrado> {
  readonly nombre = 'caja-chica.arqueo_registrado';

  constructor(datos: DatosDeArqueoRegistrado) {
    super(datos);
  }
}

export interface DatosDeArqueoAnulado {
  empresaId: string;
  fondoId: string;
  arqueoId: string;
  numero: number;
  fecha: string;
  /** La fecha contable de la anulación. */
  fechaDeAnulacion: string;
  diferenciaCentavos: number;
  destinoDelFaltante: DestinoDelFaltante | null;
  comprobanteId: string | null;
}

/** Se anuló un arqueo y su faltante o sobrante. Se publica tras confirmar. */
export class ArqueoAnulado extends EventoDominio<DatosDeArqueoAnulado> {
  readonly nombre = 'caja-chica.arqueo_anulado';

  constructor(datos: DatosDeArqueoAnulado) {
    super(datos);
  }
}
