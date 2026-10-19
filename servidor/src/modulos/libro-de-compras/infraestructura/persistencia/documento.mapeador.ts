import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { DocumentoDeCompra, LineaDeDocumento, RetencionDeDocumento } from '../../dominio/documento-de-compra.js';
import type { documentos } from './documentos.tablas.js';
import type { lineasDeDocumento } from './lineas-de-documento.tablas.js';
import type { retenciones } from './retenciones.tablas.js';

type FilaDeDocumento = typeof documentos.$inferInsert;
type FilaDeLinea = typeof lineasDeDocumento.$inferInsert;
type FilaDeRetencion = typeof retenciones.$inferInsert;

/** Las filas que se insertan por un documento, en el orden de sus llaves foráneas. */
export interface FilasDeDocumento {
  documento: FilaDeDocumento;
  lineas: FilaDeLinea[];
  retenciones: FilaDeRetencion[];
}

const SIN_COMBUSTIBLE = { vigenciaDeCombustibleId: null, galones: null, idpPorGalon: null, porcentajeDeEtanol: null };

/** Los cuatro campos de combustible van todos llenos o todos nulos (`check` de la tabla). */
function columnasDeCombustible(combustible: LineaDeDocumento['combustible']) {
  return combustible ?? SIN_COMBUSTIBLE;
}

function filaDeLinea(documento: DocumentoDeCompra, linea: LineaDeDocumento): FilaDeLinea {
  return {
    empresaId: documento.empresaId,
    documentoId: documento.id,
    numero: linea.numero,
    conceptoId: linea.conceptoId,
    descripcion: linea.descripcion,
    tipo: linea.tipo,
    esActivoFijo: linea.esActivoFijo,
    ...columnasDeCombustible(linea.combustible),
    total: deCentavos(linea.total),
    exento: deCentavos(linea.exento),
    idp: deCentavos(linea.idp),
    base: deCentavos(linea.base),
    iva: deCentavos(linea.iva),
    ivaNoAcreditable: deCentavos(linea.ivaNoAcreditable),
  };
}

function filaDeRetencion(documento: DocumentoDeCompra, retencion: RetencionDeDocumento): FilaDeRetencion {
  return {
    empresaId: documento.empresaId,
    documentoId: documento.id,
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

function filaDeEncabezado(documento: DocumentoDeCompra): FilaDeDocumento {
  const { totales, lineas: _lineas, retenciones: _retenciones, ...encabezado } = documento;
  return {
    ...encabezado,
    total: deCentavos(totales.total),
    base: deCentavos(totales.base),
    iva: deCentavos(totales.iva),
    ivaNoAcreditable: deCentavos(totales.ivaNoAcreditable),
    idp: deCentavos(totales.idp),
    exento: deCentavos(totales.exento),
  };
}

export const mapeadorDeDocumento = {
  aFilas(documento: DocumentoDeCompra): FilasDeDocumento {
    return {
      documento: filaDeEncabezado(documento),
      lineas: documento.lineas.map((linea) => filaDeLinea(documento, linea)),
      retenciones: documento.retenciones.map((retencion) => filaDeRetencion(documento, retencion)),
    };
  },
};
