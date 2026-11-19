/** Lote de un artículo tal como lo ve el usuario. */
export interface LoteDto {
  id: string;
  articuloId: string;
  codigo: string;
  fechaDeVencimiento: string | null;
  fechaDeFabricacion: string | null;
  observaciones: string | null;
}

/** Lo que se recibe para registrar un lote, ya validado en su forma. */
export type SolicitudDeLote = Omit<LoteDto, 'id' | 'articuloId'>;
