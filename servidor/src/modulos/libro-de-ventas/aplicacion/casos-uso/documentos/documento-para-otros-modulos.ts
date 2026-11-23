import type { DocumentoDeVentaParaDestino } from '../../../../core/contratos/libro-de-ventas.contratos.js';
import type { DocumentoDeVenta } from '../../../dominio/documento-de-venta.js';
import type { DatosDelDocumentoRegistrado } from '../../../dominio/eventos.js';
import { claseDeDocumento } from '../../../dominio/tipos-de-documento.js';

const MONEDA_DE_LOS_LIBROS = 'GTQ';

/**
 * Lo que recibe la cartera. Solo un documento con cliente va a ella (el dominio lo garantiza), así que `clienteId` no
 * es nulo aquí.
 */
export function paraElDestino(documento: DocumentoDeVenta, tieneVentaDeActivo: boolean): DocumentoDeVentaParaDestino {
  return {
    documentoId: documento.id,
    tipo: documento.tipo,
    clase: claseDeDocumento(documento.tipo),
    clienteId: documento.clienteId!,
    documentoAfectadoId: documento.documentoAfectadoId,
    facturaAnterior: documento.facturaAnterior,
    fechaEmision: documento.fechaEmision,
    totalCentavos: documento.totales.total,
    moneda: MONEDA_DE_LOS_LIBROS,
    tieneVentaDeActivo,
  };
}

/** Lo que cuenta el evento de que el documento quedó registrado: líneas con su concepto, clase fiscal, base e IVA. */
export function paraElEvento(documento: DocumentoDeVenta): DatosDelDocumentoRegistrado {
  return {
    documentoId: documento.id,
    empresaId: documento.empresaId,
    tipo: documento.tipo,
    clienteId: documento.clienteId,
    periodo: documento.periodo,
    fechaEmision: documento.fechaEmision,
    totalCentavos: documento.totales.total,
    moneda: MONEDA_DE_LOS_LIBROS,
    destino: documento.destino,
    lineas: documento.lineas.map((linea) => ({
      conceptoDeIngresoId: linea.conceptoDeIngresoId,
      claseFiscal: linea.claseFiscal,
      baseCentavos: linea.base,
      ivaCentavos: linea.iva,
    })),
  };
}
