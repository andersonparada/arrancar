import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { ClaseDeGasto, EstadoDeGasto, Gasto, TratamientoSinDocumento } from '../../dominio/gastos.js';
import { etiquetaDelDocumento } from '../../dominio/reglas-del-gasto.js';
import type { DatosDelDocumentoDelLibro, GastoConDocumento } from '../puertos/puertos-de-gastos.js';

/** Un gasto de un anticipo o un documento de la bandeja (dinero como texto con dos decimales). */
export interface GastoDto {
  id: string;
  /** Nulo en la bandeja. */
  anticipoId: string | null;
  clase: ClaseDeGasto;
  documentoDeCompraId: string | null;
  /** Tipo del documento del libro (`factura`, `nota_de_credito`…); nulo en un gasto sin documento. */
  tipoDeDocumento: string | null;
  /** `A-123` en un documento; la descripción en un gasto sin documento. */
  etiqueta: string;
  proveedorId: string | null;
  proveedor: string | null;
  fechaDeEmision: string | null;
  fecha: string;
  /** Lo que salió del anticipo (el neto). */
  monto: string;
  montoRetenido: string;
  conRetencion: boolean;
  motivoConRetencion: string | null;
  resta: boolean;
  conActivoFijo: boolean;
  descripcion: string | null;
  pagadoA: string | null;
  conceptoDeGastoId: string | null;
  motivoSinDocumento: string | null;
  tratamientoSinDocumento: TratamientoSinDocumento | null;
  sinBancarizar: boolean;
  asignadoEn: string | null;
  estado: EstadoDeGasto;
  /** Los avisos que no bloquean (bancarización, fuera del libro). */
  avisos: string[];
}

/** Una fila de la bandeja: el documento, lo que retiene y si quien mira puede asignarlo con la excepción. */
export interface GastoDeBandejaDto extends GastoDto {
  /** Si el usuario tiene el permiso de excepción de retención (si el documento no lleva retención, no importa). */
  puedeAsignarConRetencion: boolean;
}

/** Lo que responde asignar una tanda de documentos. */
export interface AsignacionDeGastosDto {
  gastos: GastoDto[];
  avisos: string[];
}

/** Lo que dice el documento del libro; nada en un gasto sin documento. */
function datosDelDocumento(gasto: Gasto, documento: DatosDelDocumentoDelLibro | null) {
  if (!documento) {
    return { tipoDeDocumento: null, etiqueta: gasto.descripcion ?? '', proveedor: null, fechaDeEmision: null };
  }
  return {
    tipoDeDocumento: documento.tipo,
    etiqueta: etiquetaDelDocumento(documento),
    proveedor: documento.proveedorNombre,
    fechaDeEmision: documento.fechaEmision,
  };
}

/** Lo que salió del anticipo, lo retenido y su excepción. */
function datosDeLosMontos(gasto: Gasto) {
  return {
    monto: deCentavos(gasto.montoCentavos),
    montoRetenido: deCentavos(gasto.montoRetenidoCentavos),
    conRetencion: gasto.conRetencion,
    motivoConRetencion: gasto.motivoConRetencion,
  };
}

/** El `GastoDto` de un gasto con los datos de su documento. */
export function dtoDelGasto({ gasto, documento }: GastoConDocumento, avisos: readonly string[] = []): GastoDto {
  return {
    ...datosDelDocumento(gasto, documento),
    ...datosDeLosMontos(gasto),
    id: gasto.id,
    anticipoId: gasto.anticipoId,
    clase: gasto.clase,
    documentoDeCompraId: gasto.documentoDeCompraId,
    proveedorId: gasto.proveedorId,
    fecha: gasto.fecha,
    resta: gasto.resta,
    conActivoFijo: gasto.conActivoFijo,
    descripcion: gasto.descripcion,
    pagadoA: gasto.pagadoA,
    conceptoDeGastoId: gasto.conceptoDeGastoId,
    motivoSinDocumento: gasto.motivoSinDocumento,
    tratamientoSinDocumento: gasto.tratamientoSinDocumento,
    sinBancarizar: gasto.sinBancarizar,
    asignadoEn: gasto.asignadoEn,
    estado: gasto.estado,
    avisos: [...avisos],
  };
}
