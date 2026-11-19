import type { LineaParaMarcar } from '../../dominio/marca-de-inventario.js';

/** Lee y cambia la marca de inventario de las líneas; RLS limita todo a la empresa de la transacción. */
export interface MarcasDeInventario {
  /** La línea del documento, con el documento bloqueado para compartir (anular lo espera). Nula si no existe. */
  buscar(lineaId: string, documentoId: string): Promise<LineaParaMarcar | null>;
  cambiar(lineaId: string, esInventario: boolean): Promise<void>;
}
