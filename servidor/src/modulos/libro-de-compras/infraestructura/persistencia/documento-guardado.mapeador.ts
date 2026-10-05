import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { DocumentoGuardado, NotaDeFactura } from '../../aplicacion/puertos/puertos-de-baja-de-documentos.js';
import type { DocumentoDeCompra, LineaDeDocumento, RetencionDeDocumento } from '../../dominio/documento-de-compra.js';
import type { ReglaDeRetencion } from '../../dominio/retencion-propuesta.js';
import type { MotivoSinCredito } from '../../dominio/tipos-de-documento.js';
import type { documentos } from './documentos.tablas.js';
import type { lineasDeDocumento } from './lineas-de-documento.tablas.js';
import type { retenciones } from './retenciones.tablas.js';

type FilaDeDocumento = typeof documentos.$inferSelect;
type FilaDeLinea = typeof lineasDeDocumento.$inferSelect;
type FilaDeRetencion = typeof retenciones.$inferSelect;

/** Todo lo leído de un documento: su fila, sus líneas, sus retenciones y las notas que lo rebajan. */
export interface FilasLeidasDeDocumento {
  documento: FilaDeDocumento;
  lineas: FilaDeLinea[];
  retenciones: FilaDeRetencion[];
  notas: FilaDeDocumento[];
}

function lineaDeDominio(fila: FilaDeLinea): LineaDeDocumento {
  const conCombustible = fila.vigenciaDeCombustibleId !== null;
  return {
    numero: fila.numero,
    conceptoId: fila.conceptoId,
    descripcion: fila.descripcion,
    tipo: fila.tipo,
    esActivoFijo: fila.esActivoFijo,
    combustible: conCombustible
      ? {
          vigenciaDeCombustibleId: fila.vigenciaDeCombustibleId as string,
          galones: fila.galones as string,
          idpPorGalon: fila.idpPorGalon as string,
          porcentajeDeEtanol: fila.porcentajeDeEtanol as string,
        }
      : null,
    total: aCentavos(fila.total),
    exento: aCentavos(fila.exento),
    idp: aCentavos(fila.idp),
    base: aCentavos(fila.base),
    iva: aCentavos(fila.iva),
    ivaNoAcreditable: aCentavos(fila.ivaNoAcreditable),
  };
}

function retencionDeDominio(fila: FilaDeRetencion): RetencionDeDocumento {
  return {
    impuesto: fila.impuesto,
    regla: fila.regla as ReglaDeRetencion,
    base: aCentavos(fila.base),
    porcentaje: fila.porcentaje === null ? null : aCentavos(fila.porcentaje),
    montoPropuesto: aCentavos(fila.montoPropuesto),
    monto: aCentavos(fila.monto),
    motivoDelAjuste: fila.motivoDelAjuste,
    fecha: fila.fecha,
  };
}

function totalesDeDominio(fila: FilaDeDocumento): DocumentoDeCompra['totales'] {
  return {
    total: aCentavos(fila.total),
    base: aCentavos(fila.base),
    iva: aCentavos(fila.iva),
    ivaNoAcreditable: aCentavos(fila.ivaNoAcreditable),
    idp: aCentavos(fila.idp),
    exento: aCentavos(fila.exento),
  };
}

function datosFiscalesDeDominio(fila: FilaDeDocumento) {
  return {
    nitEmisor: fila.nitEmisor,
    nombreEmisor: fila.nombreEmisor,
    nitReceptor: fila.nitReceptor,
    serie: fila.serie,
    numero: fila.numero,
    autorizacionFel: fila.autorizacionFel,
    muestraEnReportesSat: fila.muestraEnReportesSat,
    motivoFueraDelLibro: fila.motivoFueraDelLibro,
    motivoSinCredito: fila.motivoSinCredito as MotivoSinCredito | null,
  };
}

function documentoDeDominio(fila: FilaDeDocumento, lineas: FilaDeLinea[], retenidas: FilaDeRetencion[]) {
  const documento: DocumentoDeCompra = {
    id: fila.id,
    empresaId: fila.empresaId,
    tipo: fila.tipo,
    proveedorId: fila.proveedorId,
    ...datosFiscalesDeDominio(fila),
    fechaEmision: fila.fechaEmision,
    fechaRecepcion: fila.fechaRecepcion,
    periodo: fila.periodo,
    documentoAfectadoId: fila.documentoAfectadoId,
    destino: fila.destino,
    totales: totalesDeDominio(fila),
    observaciones: fila.observaciones,
    lineas: [...lineas].sort((a, b) => a.numero - b.numero).map(lineaDeDominio),
    retenciones: retenidas.map(retencionDeDominio),
  };
  return documento;
}

function notaDeFactura(fila: FilaDeDocumento): NotaDeFactura {
  return {
    id: fila.id,
    serie: fila.serie,
    numero: fila.numero,
    fechaEmision: fila.fechaEmision,
    total: aCentavos(fila.total),
    estado: fila.estado,
  };
}

export const mapeadorDeDocumentoGuardado = {
  aDominio({ documento, lineas, retenciones: retenidas, notas }: FilasLeidasDeDocumento): DocumentoGuardado {
    return {
      documento: documentoDeDominio(documento, lineas, retenidas),
      estado: documento.estado,
      anuladoEn: documento.anuladoEn,
      anuladoPor: documento.anuladoPor,
      motivoDeAnulacion: documento.motivoDeAnulacion,
      causaDeAnulacion: documento.causaDeAnulacion,
      procesadoEnDestinoEn: documento.procesadoEnDestinoEn,
      notas: notas.map(notaDeFactura),
    };
  },
};
