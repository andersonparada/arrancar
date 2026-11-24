import type {
  CausaDeEntrada,
  ClaseDeDocumento,
  DestinoDeSalida,
  EstadoDeDocumento,
  EstadoDeTraslado,
} from '../../dominio/documento.js';

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
  /** Solo en la salida de un traslado: a dónde va (nombre aunque el usuario no tenga asignada esa bodega) y si ya llegó. */
  bodegaDeDestinoId: string | null;
  bodegaDeDestinoNombre: string | null;
  estadoDeTraslado: EstadoDeTraslado | null;
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
  /** Para los traslados: la bodega a la que van (la lista «Por recibir» de quien recibe). */
  bodegaDeDestinoId?: string;
  articuloId?: string;
  /** Los documentos que nacen de una factura o nota del libro de compras (las recepciones de una factura). */
  documentoDeCompraId?: string;
  estado?: EstadoDeDocumento;
  /** Los traslados `en_transito` son la lista «Por recibir» de la bodega de destino. */
  estadoDeTraslado?: EstadoDeTraslado;
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

/** Un traslado entre bodegas (§6.7): lo mismo que sale del origen entra al destino, sin costos. */
export interface SolicitudDeTraslado {
  fecha: string;
  bodegaDeOrigenId: string;
  bodegaDeDestinoId: string;
  entregadoA: string | null;
  observaciones: string | null;
  renglones: RenglonSolicitado[];
}

/** La recepción de un traslado en tránsito; sin fecha se toma la de hoy. */
export interface SolicitudDeRecepcionDeTraslado {
  fecha: string | null;
  observaciones: string | null;
}

export interface SolicitudDeAnulacion {
  motivo: string;
}
