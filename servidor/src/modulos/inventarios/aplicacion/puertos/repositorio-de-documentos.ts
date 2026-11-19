import type { CausaDeEntrada, ClaseDeDocumento, DestinoDeSalida, EstadoDeDocumento } from '../../dominio/documento.js';

/** Un documento del kardex tal como se guarda (§5.9). */
export interface DocumentoGuardado {
  id: string;
  clase: ClaseDeDocumento;
  numero: number;
  fecha: string;
  bodegaId: string;
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

/** Guarda los documentos del kardex. Nunca se eliminan: se anulan. La RLS limita a las bodegas que el usuario ve. */
export interface RepositorioDeDocumentos {
  agregar(documento: DocumentoGuardado): Promise<void>;
  /** Nulo si no existe o la bodega no es de las que el usuario ve. */
  buscar(id: string): Promise<DocumentoGuardado | null>;
  anular(id: string, anulacion: AnulacionDeDocumento): Promise<void>;
}
