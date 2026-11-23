import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { DocumentoDeVenta } from '../../dominio/documento-de-venta.js';
import type { documentos } from './documentos.tablas.js';
import type { lineasDeDocumento } from './lineas-de-documento.tablas.js';

type FilaNueva = typeof documentos.$inferInsert;
type LineaNueva = typeof lineasDeDocumento.$inferInsert;

/** Las filas que forman un documento de venta: su encabezado y sus líneas. El dinero baja de centavos a texto. */
export interface FilasDeDocumentoDeVenta {
  documento: FilaNueva;
  lineas: LineaNueva[];
}

/** Los totales por columna del libro, de centavos a texto. */
function totalesComoTexto({ totales }: DocumentoDeVenta) {
  return {
    totalEnMoneda: deCentavos(totales.total),
    total: deCentavos(totales.total),
    gravadoBienes: deCentavos(totales.gravadoBienes),
    gravadoServicios: deCentavos(totales.gravadoServicios),
    exento: deCentavos(totales.exento),
    exportacion: deCentavos(totales.exportacion),
    iva: deCentavos(totales.iva),
    otrosImpuestos: deCentavos(totales.otrosImpuestos),
  };
}

/** La factura del sistema anterior que corrige una nota, en sus tres columnas. */
function facturaAnteriorComoColumnas({ facturaAnterior }: DocumentoDeVenta) {
  return {
    facturaAnteriorSerie: facturaAnterior?.serie ?? null,
    facturaAnteriorNumero: facturaAnterior?.numero ?? null,
    facturaAnteriorFecha: facturaAnterior?.fecha ?? null,
  };
}

/** A quién se le vendió, en sus tres columnas. */
function receptorComoColumnas({ receptor }: DocumentoDeVenta) {
  return {
    tipoDeIdentificacion: receptor.tipoDeIdentificacion,
    nitReceptor: receptor.nitReceptor,
    nombreReceptor: receptor.nombreReceptor,
  };
}

function encabezado(documento: DocumentoDeVenta): FilaNueva {
  return {
    id: documento.id,
    empresaId: documento.empresaId,
    tipo: documento.tipo,
    tipoDte: documento.tipoDte,
    origen: documento.origen,
    clienteId: documento.clienteId,
    ...receptorComoColumnas(documento),
    serie: documento.serie,
    numero: documento.numero,
    autorizacionFel: documento.autorizacionFel,
    localidadId: documento.localidadId,
    fechaEmision: documento.fechaEmision,
    periodo: documento.periodo,
    regimenIvaDeLaEmpresa: documento.regimenIvaDeLaEmpresa,
    regimenIsrDeLaEmpresa: documento.regimenIsrDeLaEmpresa,
    documentoAfectadoId: documento.documentoAfectadoId,
    destino: documento.destino,
    muestraEnReportesSat: documento.muestraEnReportesSat,
    observaciones: documento.observaciones,
    ...facturaAnteriorComoColumnas(documento),
    ...totalesComoTexto(documento),
  };
}

function lineas(documento: DocumentoDeVenta): LineaNueva[] {
  return documento.lineas.map((linea) => ({
    empresaId: documento.empresaId,
    documentoId: documento.id,
    orden: linea.orden,
    conceptoDeIngresoId: linea.conceptoDeIngresoId,
    tipo: linea.tipo,
    claseFiscal: linea.claseFiscal,
    descripcion: linea.descripcion,
    total: deCentavos(linea.total),
    base: deCentavos(linea.base),
    iva: deCentavos(linea.iva),
    otrosImpuestos: deCentavos(linea.otrosImpuestos),
  }));
}

export const mapeadorDeDocumentoDeVenta = {
  aFilas: (documento: DocumentoDeVenta): FilasDeDocumentoDeVenta => ({
    documento: encabezado(documento),
    lineas: lineas(documento),
  }),
};
