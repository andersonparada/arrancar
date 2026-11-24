import type {
  CausaDeEntrada,
  ClaseDeDocumento,
  DestinoDeSalida,
  EstadoDeDocumento,
  EstadoDeTraslado,
} from '../../dominio/documento.js';

/** Un documento del kardex tal como se guarda (§5.9). */
export interface DocumentoGuardado {
  id: string;
  clase: ClaseDeDocumento;
  numero: number;
  fecha: string;
  /** Nula solo en la rebaja de costo (documento de solo valor). */
  bodegaId: string | null;
  documentoDeCompraId: string | null;
  documentoRelacionadoId: string | null;
  /** Solo en la salida de un traslado: la bodega a la que va y si ya llegó. */
  bodegaDeDestinoId: string | null;
  estadoDeTraslado: EstadoDeTraslado | null;
  causa: CausaDeEntrada | null;
  destino: DestinoDeSalida | null;
  conceptoDeGastoId: string | null;
  localidadId: string | null;
  departamentoId: string | null;
  activoFijoId: string | null;
  entregadoA: string | null;
  soporte: string | null;
  observaciones: string | null;
  requiereFactura: boolean;
  estado: EstadoDeDocumento;
}

export interface AnulacionDeDocumento {
  motivo: string;
  usuarioId: string;
  ahora: Date;
}

/** Lo que cambia en la salida de un traslado al recibirse o al anularse su recepción. */
export interface CambioDeTraslado {
  estadoDeTraslado: EstadoDeTraslado;
  /** La entrada que lo recibió; nula mientras está en tránsito. */
  documentoRelacionadoId: string | null;
}

/** Guarda los documentos del kardex. Nunca se eliminan: se anulan. La RLS limita a las bodegas que el usuario ve. */
export interface RepositorioDeDocumentos {
  agregar(documento: DocumentoGuardado): Promise<void>;
  /** Nulo si no existe o la bodega no es de las que el usuario ve. */
  buscar(id: string): Promise<DocumentoGuardado | null>;
  anular(id: string, anulacion: AnulacionDeDocumento): Promise<void>;
  /** El saldo inicial vigente de la bodega (a lo más uno), si el usuario ve esa bodega. */
  buscarSaldoInicialDeBodega(bodegaId: string): Promise<DocumentoGuardado | null>;
  /**
   * Toma el candado de los documentos de saldo inicial de esas bodegas (ordenadas, hasta que termine la transacción):
   * quien agrega o quita renglones lo toma antes de buscar el documento o decidir anularlo, y así no se pisan.
   */
  bloquearSaldosInicialesDeBodegas(bodegaIds: readonly string[]): Promise<void>;
  /** Pone la salida de un traslado en tránsito o recibida (con la entrada que la recibió). */
  cambiarTraslado(id: string, cambio: CambioDeTraslado): Promise<void>;
}
