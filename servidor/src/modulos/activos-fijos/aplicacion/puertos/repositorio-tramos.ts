import type { TramoCalculado } from '../../dominio/depreciacion/tramo.js';

export interface TramosNuevos {
  empresaId: string;
  activoId: string;
  tramos: readonly TramoCalculado[];
}

/** Guarda los tramos de depreciación de los activos (§5.8). La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioTramos {
  agregarVarios(nuevos: TramosNuevos): Promise<void>;
  /** Los tramos vigentes del activo, del más antiguo al más reciente. */
  vigentesDeActivo(activoId: string): Promise<TramoCalculado[]>;
  /** Borra los tramos del activo (deshacer «poner en uso», o eliminar el activo); el caso de uso deja su auditoría. */
  eliminarDeActivo(activoId: string): Promise<void>;
}
