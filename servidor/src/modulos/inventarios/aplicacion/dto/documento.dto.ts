import type { CausaDeEntrada, ClaseDeDocumento, DestinoDeSalida, EstadoDeDocumento } from '../../dominio/documento.js';

/** Un renglón de un documento. Sin `costos.ver`, los costos van en `null` (INV-A7). */
export interface RenglonDeDocumentoDto {
  movimientoId: string;
  articuloId: string;
  articuloCodigo: string;
  articuloNombre: string;
  loteId: string | null;
  loteCodigo: string | null;
  /** En la unidad base del artículo, con 4 decimales y en positivo. */
  cantidad: string;
  unidadBaseNombre: string;
  /** Como se escribió, para mostrar el documento igual que el papel. */
  cantidadEscrita: string | null;
  unidadEscritaSimbolo: string | null;
  costoUnitario: string | null;
  costoTotal: string | null;
}

/** Lo que cada lista y ficha de un documento muestra. */
export interface DocumentoDto {
  id: string;
  clase: ClaseDeDocumento;
  numero: number;
  fecha: string;
  /** Nula en la rebaja de costo: es de solo valor y no tiene bodega. */
  bodegaId: string | null;
  bodegaNombre: string | null;
  /** La factura o nota del Libro de compras de la que nace (recepción, devolución, rebaja). */
  documentoDeCompraId: string | null;
  documentoRelacionadoId: string | null;
  causa: CausaDeEntrada | null;
  destino: DestinoDeSalida | null;
  conceptoDeGastoId: string | null;
  conceptoDeGastoNombre: string | null;
  localidadId: string | null;
  departamentoId: string | null;
  entregadoA: string | null;
  soporte: string | null;
  observaciones: string | null;
  requiereFactura: boolean;
  estado: EstadoDeDocumento;
  motivoDeAnulacion: string | null;
  /** Recomendaciones que no impiden guardar. */
  avisos: string[];
  /** Σ de los costos del documento; nulo sin `costos.ver`. */
  costoTotal: string | null;
  renglones: RenglonDeDocumentoDto[];
}

/** Quién mira: sin `costos.ver` no ve dinero; sin alcance total no ve lo de la empresa entera. */
export interface VistaDelKardex {
  verCostos: boolean;
  veTodasLasBodegas: boolean;
}

export interface FiltrosDeDocumentos {
  clase?: ClaseDeDocumento;
  bodegaId?: string;
  articuloId?: string;
  estado?: EstadoDeDocumento;
  desde?: string;
  hasta?: string;
}

/** Un renglón de la solicitud: la cantidad va como texto en la unidad escrita (la base si no se indica). */
export interface RenglonSolicitado {
  articuloId: string;
  loteId: string | null;
  cantidad: string;
  unidadId: string | null;
  /** Dinero como texto; solo en las entradas. */
  costoTotal: string | null;
}

export interface SolicitudDeEntrada {
  fecha: string;
  bodegaId: string;
  causa: CausaDeEntrada;
  soporte: string;
  observaciones: string | null;
  renglones: RenglonSolicitado[];
}

export interface SolicitudDeSalida {
  fecha: string;
  bodegaId: string;
  destino: DestinoDeSalida;
  conceptoDeGastoId: string | null;
  localidadId: string | null;
  departamentoId: string | null;
  entregadoA: string | null;
  observaciones: string | null;
  renglones: RenglonSolicitado[];
}

export interface SolicitudDeAnulacion {
  motivo: string;
}
