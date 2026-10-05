import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { costoDeLinea } from '../../../dominio/calculo-de-linea.js';
import { netoAPagar, type DocumentoDeCompra } from '../../../dominio/documento-de-compra.js';
import type { LineaDeDocumento, RetencionDeDocumento } from '../../../dominio/documento-de-compra.js';
import type { TotalesDelDocumento } from '../../../dominio/totales-del-documento.js';
import type {
  DocumentoDto,
  LineaDeDocumentoDto,
  RetencionDto,
  TotalesDeDocumentoDto,
} from '../../dto/documento.dto.js';

function dtoDeLinea(linea: LineaDeDocumento): LineaDeDocumentoDto {
  return {
    numero: linea.numero,
    conceptoId: linea.conceptoId,
    descripcion: linea.descripcion,
    tipo: linea.tipo,
    esActivoFijo: linea.esActivoFijo,
    combustible: linea.combustible,
    total: deCentavos(linea.total),
    exento: deCentavos(linea.exento),
    idp: deCentavos(linea.idp),
    base: deCentavos(linea.base),
    iva: deCentavos(linea.iva),
    ivaNoAcreditable: deCentavos(linea.ivaNoAcreditable),
    costo: deCentavos(costoDeLinea(linea)),
  };
}

/** Una retención tal como la ve la pantalla (y la auditoría). */
export function dtoDeRetencion(retencion: RetencionDeDocumento): RetencionDto {
  return {
    impuesto: retencion.impuesto,
    regla: retencion.regla,
    base: deCentavos(retencion.base),
    porcentaje: retencion.porcentaje === null ? null : deCentavos(retencion.porcentaje),
    montoPropuesto: deCentavos(retencion.montoPropuesto),
    monto: deCentavos(retencion.monto),
    motivoDelAjuste: retencion.motivoDelAjuste,
    fecha: retencion.fecha,
  };
}

function dtoDeTotales(totales: TotalesDelDocumento): TotalesDeDocumentoDto {
  return {
    total: deCentavos(totales.total),
    base: deCentavos(totales.base),
    iva: deCentavos(totales.iva),
    ivaNoAcreditable: deCentavos(totales.ivaNoAcreditable),
    idp: deCentavos(totales.idp),
    exento: deCentavos(totales.exento),
  };
}

/** El documento tal como lo ve la pantalla; con `id: null` es la vista previa de uno que no se guardó. */
export function dtoDeDocumento(documento: DocumentoDeCompra, guardado: boolean): DocumentoDto {
  const { totales, lineas, retenciones, empresaId: _empresaId, ...encabezado } = documento;
  return {
    ...encabezado,
    id: guardado ? documento.id : null,
    totales: dtoDeTotales(totales),
    netoAPagar: deCentavos(netoAPagar(documento)),
    lineas: lineas.map(dtoDeLinea),
    retenciones: retenciones.map(dtoDeRetencion),
  };
}
