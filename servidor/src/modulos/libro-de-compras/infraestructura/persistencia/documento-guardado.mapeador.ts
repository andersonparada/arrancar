import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { DocumentoGuardado, NotaDeFactura } from '../../aplicacion/puertos/puertos-de-baja-de-documentos.js';
import type { DocumentoDeCompra, LineaDeDocumento, RetencionDeDocumento } from '../../dominio/documento-de-compra.js';
import type { FacturaAnterior } from '../../dominio/factura-anterior.js';
import type { ReglaDeRetencion } from '../../dominio/retencion-propuesta.js';
import type { MotivoSinCredito, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';
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
  /** Nombre de quien anuló; `null` si no está anulado o no se pudo leer el usuario. */
  anuladoPorNombre: string | null;
  /** La factura del sistema anterior que corrige la nota, si es el caso. */
  facturaAnterior: FacturaAnterior | null;
  /** La factura del libro que corrige la nota, si es el caso (la del sistema anterior va en `facturaAnterior`). */
  facturaDelLibro: FacturaDelLibroDeLaNota | null;
}

/** Lo que se lee de la factura del libro que corrige una nota. */
export interface FacturaDelLibroDeLaNota {
  id: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  motivoSinCredito: MotivoSinCredito | null;
}

/** La factura que corrige la nota, venga del libro o del sistema anterior; `null` si el documento no es una nota. */
function documentoQueModifica(filas: FilasLeidasDeDocumento): DocumentoGuardado['documentoQueModifica'] {
  const { facturaAnterior, facturaDelLibro } = filas;
  if (facturaAnterior) {
    const { tipo, serie, numero, fechaEmision } = facturaAnterior;
    return { origen: 'sistema_anterior', documentoId: null, tipo, serie, numero, fechaEmision };
  }
  if (!facturaDelLibro) return null;
  const { id, tipo, serie, numero, fechaEmision } = facturaDelLibro;
  return { origen: 'libro', documentoId: id, tipo, serie, numero, fechaEmision };
}

function combustibleDeDominio(fila: FilaDeLinea): LineaDeDocumento['combustible'] {
  if (fila.vigenciaDeCombustibleId === null) return null;
  return {
    vigenciaDeCombustibleId: fila.vigenciaDeCombustibleId,
    galones: fila.galones as string,
    idpPorGalon: fila.idpPorGalon as string,
    porcentajeDeEtanol: fila.porcentajeDeEtanol as string,
  };
}

function lineaDeDominio(fila: FilaDeLinea): LineaDeDocumento {
  return {
    numero: fila.numero,
    conceptoId: fila.conceptoId,
    descripcion: fila.descripcion,
    tipo: fila.tipo,
    esActivoFijo: fila.esActivoFijo,
    esInventario: fila.esInventario,
    combustible: combustibleDeDominio(fila),
    total: aCentavos(fila.total),
    exento: aCentavos(fila.exento),
    otrosImpuestos: aCentavos(fila.otrosImpuestos),
    idp: aCentavos(fila.idp),
    idpEscrito: fila.idpEscrito,
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
    otrosImpuestos: aCentavos(fila.otrosImpuestos),
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

function condicionesDeDominio(fila: FilaDeDocumento) {
  return {
    fechaEmision: fila.fechaEmision,
    fechaRecepcion: fila.fechaRecepcion,
    periodo: fila.periodo,
    regimenIvaDeLaEmpresa: fila.regimenIvaDeLaEmpresa,
    documentoAfectadoId: fila.documentoAfectadoId,
    claseDeCargo: fila.claseDeCargo,
    destino: fila.destino,
  };
}

function documentoDeDominio(
  fila: FilaDeDocumento,
  detalle: Pick<FilasLeidasDeDocumento, 'lineas' | 'retenciones' | 'facturaAnterior'>,
) {
  const { lineas, retenciones: retenidas, facturaAnterior } = detalle;
  return {
    id: fila.id,
    empresaId: fila.empresaId,
    tipo: fila.tipo,
    tipoDte: fila.tipoDte,
    proveedorId: fila.proveedorId,
    ...datosFiscalesDeDominio(fila),
    ...condicionesDeDominio(fila),
    facturaAnterior,
    totales: totalesDeDominio(fila),
    observaciones: fila.observaciones,
    lineas: [...lineas].sort((a, b) => a.numero - b.numero).map(lineaDeDominio),
    retenciones: retenidas.map(retencionDeDominio),
  } satisfies DocumentoDeCompra;
}

function notaDeFactura(fila: FilaDeDocumento): NotaDeFactura {
  return {
    id: fila.id,
    tipo: fila.tipo === 'nota_de_debito' ? 'nota_de_debito' : 'nota_de_credito',
    serie: fila.serie,
    numero: fila.numero,
    fechaEmision: fila.fechaEmision,
    total: aCentavos(fila.total),
    estado: fila.estado,
  };
}

export const mapeadorDeDocumentoGuardado = {
  aDominio(filas: FilasLeidasDeDocumento): DocumentoGuardado {
    const { documento, notas } = filas;
    return {
      documento: documentoDeDominio(documento, filas),
      estado: documento.estado,
      anuladoEn: documento.anuladoEn,
      anuladoPor: documento.anuladoPor,
      anuladoPorNombre: filas.anuladoPorNombre,
      motivoDeAnulacion: documento.motivoDeAnulacion,
      causaDeAnulacion: documento.causaDeAnulacion,
      procesadoEnDestinoEn: documento.procesadoEnDestinoEn,
      notas: notas.map(notaDeFactura),
      motivoDeLaFactura: filas.facturaDelLibro?.motivoSinCredito ?? filas.facturaAnterior?.motivoSinCredito ?? null,
      documentoQueModifica: documentoQueModifica(filas),
    };
  },
};
