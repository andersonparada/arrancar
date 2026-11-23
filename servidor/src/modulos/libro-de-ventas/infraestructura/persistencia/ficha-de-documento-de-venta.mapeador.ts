import { accionesDeDocumento, type HechosDeUnDocumento } from '../../dominio/baja-de-documento.js';
import type {
  DocumentoDeVentaFichaDto,
  DocumentoDeVentaListadoDto,
  LineaDeVentaDto,
  NotaDeLaFacturaDto,
  TotalesDeVentaDto,
} from '../../aplicacion/dto/documento-de-venta.dto.js';
import type { documentos } from './documentos.tablas.js';

export type FilaDeDocumento = typeof documentos.$inferSelect;

/** Una línea leída con el nombre de su concepto. */
export interface FilaDeLinea {
  id: string;
  orden: number;
  conceptoDeIngresoId: string;
  conceptoDeIngresoNombre: string;
  tipo: LineaDeVentaDto['tipo'];
  claseFiscal: LineaDeVentaDto['claseFiscal'];
  descripcion: string | null;
  total: string;
  base: string;
  iva: string;
  otrosImpuestos: string;
}

/** Lo que la lista y la ficha comparten de un documento. */
export function listadoDe(fila: FilaDeDocumento, hechos: HechosDeUnDocumento): DocumentoDeVentaListadoDto {
  return {
    id: fila.id,
    tipo: fila.tipo,
    tipoDte: fila.tipoDte,
    clienteId: fila.clienteId,
    tipoDeIdentificacion: fila.tipoDeIdentificacion,
    nitReceptor: fila.nitReceptor,
    nombreReceptor: fila.nombreReceptor,
    serie: fila.serie,
    numero: fila.numero,
    fechaEmision: fila.fechaEmision,
    periodo: fila.periodo,
    destino: fila.destino,
    estado: fila.estado,
    muestraEnReportesSat: fila.muestraEnReportesSat,
    regimenIvaDeLaEmpresa: fila.regimenIvaDeLaEmpresa,
    documentoAfectadoId: fila.documentoAfectadoId,
    total: fila.total,
    iva: fila.iva,
    procesado: fila.procesadoEnDestinoEn !== null,
    ...accionesDeDocumento(hechos),
  };
}

function totalesDe(fila: FilaDeDocumento): TotalesDeVentaDto {
  return {
    total: fila.total,
    gravadoBienes: fila.gravadoBienes,
    gravadoServicios: fila.gravadoServicios,
    exento: fila.exento,
    exportacion: fila.exportacion,
    iva: fila.iva,
    otrosImpuestos: fila.otrosImpuestos,
  };
}

function anulacionDe(fila: FilaDeDocumento): DocumentoDeVentaFichaDto['anulacion'] {
  if (fila.estado !== 'anulado') return null;
  return {
    anuladoEn: fila.anuladoEn!.toISOString(),
    anuladoPor: fila.anuladoPor!,
    motivo: fila.motivoDeAnulacion!,
    causa: fila.causaDeAnulacion!,
    fecha: fila.fechaDeAnulacion!,
  };
}

function facturaAnteriorDe(fila: FilaDeDocumento): DocumentoDeVentaFichaDto['facturaAnterior'] {
  if (fila.facturaAnteriorNumero === null) return null;
  return { serie: fila.facturaAnteriorSerie, numero: fila.facturaAnteriorNumero, fecha: fila.facturaAnteriorFecha! };
}

/** La ficha completa: encabezado, totales por columna, líneas, notas y anulación. */
export function fichaDe(
  fila: FilaDeDocumento,
  partes: { lineas: FilaDeLinea[]; notas: NotaDeLaFacturaDto[]; hechos: HechosDeUnDocumento },
): DocumentoDeVentaFichaDto {
  return {
    ...listadoDe(fila, partes.hechos),
    origen: fila.origen,
    autorizacionFel: fila.autorizacionFel,
    localidadId: fila.localidadId,
    regimenIsrDeLaEmpresa: fila.regimenIsrDeLaEmpresa,
    facturaAnterior: facturaAnteriorDe(fila),
    moneda: fila.moneda,
    observaciones: fila.observaciones,
    totales: totalesDe(fila),
    lineas: partes.lineas,
    notas: partes.notas,
    anulacion: anulacionDe(fila),
  };
}
