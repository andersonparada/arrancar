import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Comprobante, DocumentoDelComprobante } from '../../../dominio/comprobantes.js';
import type { SeguimientoDelDocumento } from '../../../dominio/documento-anulado.js';
import { efectoEnLoPendiente } from '../../../dominio/reglas-de-comprobantes.js';
import type {
  ComprobanteDto,
  DocumentoDelComprobanteDto,
  SeguimientoDelDocumentoDto,
  TotalesDeComprobantesDto,
} from '../../dto/comprobantes.dto.js';

const documentoDto = ({ totalCentavos, ...documento }: DocumentoDelComprobante): DocumentoDelComprobanteDto => ({
  ...documento,
  total: deCentavos(totalCentavos),
});

const seguimientoDto = ({ montoCentavos, ...seguimiento }: SeguimientoDelDocumento): SeguimientoDelDocumentoDto => ({
  situacion: seguimiento.situacion,
  salida: seguimiento.salida,
  documentoAnuladoId: seguimiento.documentoAnuladoId,
  motivoDeLaResolucion: seguimiento.motivoDeLaResolucion,
  monto: montoCentavos === null ? null : deCentavos(montoCentavos),
  destino: seguimiento.destino,
  disputa: seguimiento.disputa,
});

/** El comprobante como lo ven las pantallas; también es lo que queda en la auditoría como «anterior». */
export function comprobanteDto({
  montoCentavos,
  montoRetenidoCentavos,
  anioDeNumero: _anioDeNumero,
  documento,
  seguimiento,
  ...resto
}: Comprobante): ComprobanteDto {
  return {
    ...resto,
    seguimiento: seguimiento && seguimientoDto(seguimiento),
    monto: deCentavos(montoCentavos),
    montoRetenido: deCentavos(montoRetenidoCentavos),
    documento: documento ? documentoDto(documento) : null,
  };
}

/** Lo pendiente y lo repuesto de los comprobantes vigentes de la lista (las notas y los sobrantes restan). */
export function totalesDe(comprobantes: readonly Comprobante[]): TotalesDeComprobantesDto {
  const vigentes = comprobantes.filter(({ estado }) => estado === 'vigente');
  const suma = (lista: readonly Comprobante[]) => lista.reduce((total, c) => total + efectoEnLoPendiente(c), 0);
  return {
    pendiente: deCentavos(suma(vigentes.filter(({ reposicionNumero }) => reposicionNumero === null))),
    repuesto: deCentavos(suma(vigentes.filter(({ reposicionNumero }) => reposicionNumero !== null))),
  };
}
