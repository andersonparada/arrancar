import type { DatosDePartidaDeAperturaAnulada } from '../../core/contratos/bancos.contratos.js';
import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';

/** Una partida de la carga inicial se anuló con su inverso; se publica al confirmar (§2.5 y §7.4 del diseño). */
export class PartidaDeAperturaAnulada extends EventoDominio<DatosDePartidaDeAperturaAnulada> {
  readonly nombre = 'bancos.partida_de_apertura_anulada';

  constructor(datos: DatosDePartidaDeAperturaAnulada) {
    super(datos);
  }
}
