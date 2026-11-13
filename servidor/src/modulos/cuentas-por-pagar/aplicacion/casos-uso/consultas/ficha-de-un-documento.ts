import type { FichaDelDocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import {
  dtoDeAnulacion,
  dtoDeAplicacion,
  dtoDeDocumentoPorPagar,
  dtoDeNota,
  type PuntoDeVista,
} from '../../dto/dto-de-documento-por-pagar.js';
import type { ConsultasDeDocumentos, FilaDeDocumento } from '../../puertos/puertos-de-consultas.js';

/** La ficha de un documento: sus saldos, las notas que lo corrigen y las aplicaciones de notas de crédito. */
export async function fichaDeUnDocumento(
  consultas: ConsultasDeDocumentos,
  fila: FilaDeDocumento,
  vista: PuntoDeVista,
): Promise<FichaDelDocumentoPorPagarDto> {
  return {
    ...dtoDeDocumentoPorPagar(fila, vista),
    notas: (await consultas.notasDe(fila.documento)).map(dtoDeNota),
    aplicaciones: (await consultas.aplicacionesDe(fila.documento)).map(dtoDeAplicacion),
    anulacion: dtoDeAnulacion(fila),
  };
}
