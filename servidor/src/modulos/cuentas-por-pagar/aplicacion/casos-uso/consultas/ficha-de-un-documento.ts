import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { EFECTO_DE_LA_CAUSA } from '../../../dominio/ajustes.js';
import { fechaMinimaDeAjuste } from '../../../dominio/reglas-de-ajuste.js';
import type { AjusteDelDocumentoDto, FichaDelDocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import {
  dtoDeAnulacion,
  dtoDeAplicacion,
  dtoDeDocumentoPorPagar,
  dtoDeNota,
  type PuntoDeVista,
} from '../../dto/dto-de-documento-por-pagar.js';
import type { AjusteConDatos, ConsultasDeDocumentos, FilaDeDocumento } from '../../puertos/puertos-de-consultas.js';

/** Lo que la ficha de una nota necesita de fuera del documento: la fecha de inicio de la empresa y el tope de la diferencia menor. */
export interface ExtrasDeFicha {
  fechaDeInicio: string | null;
  topeDiferenciaMenorCentavos: number;
}

const dtoDeAjuste = ({ montoCentavos, creadoPorNombre, ...resto }: AjusteConDatos): AjusteDelDocumentoDto => ({
  ...resto,
  monto: deCentavos(montoCentavos),
  efecto: EFECTO_DE_LA_CAUSA[resto.causa],
  creadoPor: creadoPorNombre,
  puedeAnular: resto.estado === 'vigente',
});

/**
 * La ficha de un documento: sus saldos, las notas que lo corrigen, las aplicaciones de notas de crédito y, en una nota,
 * sus ajustes con la fecha mínima y el tope para ajustar.
 */
export async function fichaDeUnDocumento(
  consultas: ConsultasDeDocumentos,
  fila: FilaDeDocumento,
  { vista, extras }: { vista: PuntoDeVista; extras: ExtrasDeFicha },
): Promise<FichaDelDocumentoPorPagarDto> {
  const { documento, libro } = fila;
  const esNota = documento.tipo === 'nota_de_credito';
  return {
    ...dtoDeDocumentoPorPagar(fila, vista),
    notas: (await consultas.notasDe(documento)).map(dtoDeNota),
    aplicaciones: (await consultas.aplicacionesDe(documento)).map(dtoDeAplicacion),
    ajustes: esNota ? (await consultas.ajustesDe(documento.id)).map(dtoDeAjuste) : [],
    fechaMinimaDeAjuste: esNota ? fechaMinimaDeAjuste(libro.fechaRecepcion, extras.fechaDeInicio) : null,
    topeDiferenciaMenor: deCentavos(extras.topeDiferenciaMenorCentavos),
    anulacion: dtoDeAnulacion(fila),
  };
}
