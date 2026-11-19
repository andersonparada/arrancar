import type { LoteDto, SolicitudDeLote } from '../dto/lote.dto.js';

/** Los lotes de un artículo. La seguridad por empresa (RLS) limita lo que se ve. */
export interface AlmacenDeLotes {
  /** Por vencimiento (los que vencen antes, primero) y luego por código. */
  listar(articuloId: string): Promise<LoteDto[]>;
  /** @throws RecursoDuplicado si el artículo ya tiene un lote con ese código. */
  agregar(empresaId: string, articuloId: string, datos: SolicitudDeLote): Promise<LoteDto>;
}
