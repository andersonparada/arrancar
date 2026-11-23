import type { DestinoDeTrasladoDto } from '../dto/destino-de-traslado.dto.js';
import type { BoletaDeTrasladoDto } from '../dto/boleta-de-traslado.dto.js';

/** Lecturas de los traslados; la seguridad por bodega de los documentos limita lo que cada usuario ve. */
export interface ConsultasDeTraslados {
  /**
   * La boleta del traslado de un documento: la salida o su recepción. La ve quien tiene asignado el origen o el destino.
   * @throws RecursoNoEncontrado si no existe o el usuario no la ve.
   * @throws DocumentoInvalido si el documento no es un traslado.
   */
  boleta(documentoId: string): Promise<BoletaDeTrasladoDto>;
  /**
   * Las bodegas activas que se pueden elegir como destino. Con tránsito, todas las de la empresa (id y nombre) aunque el
   * usuario no las tenga asignadas; sin tránsito, solo las que ve (§3.5, §6.7).
   */
  destinos(conTransito: boolean): Promise<DestinoDeTrasladoDto[]>;
}
