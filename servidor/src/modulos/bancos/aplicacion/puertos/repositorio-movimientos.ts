import type { Movimiento, MovimientoId } from '../../dominio/movimiento.js';

/**
 * Guarda y recupera los movimientos. La mayoría no se borran: se anulan o se revierten; solo se
 * elimina de verdad uno «limpio» (lo revisa el caso de uso, con `Movimiento.exigirEliminable` y
 * las consultas). La seguridad por empresa (RLS) limita lo que se ve.
 */
export interface RepositorioMovimientos {
  buscar(id: MovimientoId): Promise<Movimiento | null>;
  /** El movimiento inverso de este (el que lo revierte), si lo tiene. */
  buscarInversoDe(id: MovimientoId): Promise<Movimiento | null>;
  agregar(movimiento: Movimiento): Promise<void>;
  guardar(movimiento: Movimiento): Promise<void>;
  eliminar(id: MovimientoId): Promise<void>;
}
