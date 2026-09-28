import type { Movimiento, MovimientoId } from '../../dominio/movimiento.js';

/** Guarda y recupera los movimientos para modificarlos; nunca se borran. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioMovimientos {
  buscar(id: MovimientoId): Promise<Movimiento | null>;
  agregar(movimiento: Movimiento): Promise<void>;
  guardar(movimiento: Movimiento): Promise<void>;
}
