/** Un renglón de la boleta: lo que viaja, sin ningún costo (§6.7). */
export interface RenglonDeBoletaDto {
  articuloCodigo: string;
  articuloNombre: string;
  loteCodigo: string | null;
  /** En la unidad base del artículo, con 4 decimales. */
  cantidad: string;
  unidadBaseNombre: string;
  /** Como se escribió, para que la boleta se vea igual que el papel. */
  cantidadEscrita: string | null;
  unidadEscritaSimbolo: string | null;
}

/**
 * La boleta imprimible de un traslado: número, fecha, origen, destino, artículos y cantidades, quién entrega y quién
 * recibe. **El costo no aparece**: el traslado es neutro para el costeo y la boleta no lleva dinero.
 */
export interface BoletaDeTrasladoDto {
  documentoId: string;
  numero: number;
  fecha: string;
  estado: 'en_transito' | 'recibido' | 'anulado';
  origen: string;
  destino: string;
  /** El usuario que envió. */
  entregadoPor: string | null;
  /** La persona que se lleva la mercadería (firma de la boleta), si se escribió. */
  entregadoA: string | null;
  /** El usuario que registró la recepción, cuando ya se recibió. */
  recibidoPor: string | null;
  fechaDeRecepcion: string | null;
  observaciones: string | null;
  renglones: RenglonDeBoletaDto[];
}
