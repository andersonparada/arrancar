import type { TramoCalculado, TramoGuardado } from '../../dominio/depreciacion/tramo.js';

export interface TramosNuevos {
  empresaId: string;
  activoId: string;
  tramos: readonly TramoCalculado[];
}

/** Los tramos que crea una mejora, un costo posterior, una revisión o un cambio de matrícula (§5.8). */
export interface TramosDeCambio extends TramosNuevos {
  /** La mejora o el costo posterior que los crea; nulo en la revisión y el cambio de matrícula. */
  mejoraId: string | null;
  /** La división que los crea (AFI-5); nulo en los demás cambios. */
  divisionId?: string | null;
}

/** Guarda los tramos de depreciación de los activos (§5.8). La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioTramos {
  agregarVarios(nuevos: TramosNuevos): Promise<void>;
  /** Los tramos vigentes del activo, del más antiguo al más reciente. */
  vigentesDeActivo(activoId: string): Promise<TramoCalculado[]>;
  /** Los tramos vigentes del activo con su id, del más antiguo al más reciente. */
  vigentesConIdDeActivo(activoId: string): Promise<TramoGuardado[]>;
  /**
   * Agrega los tramos de un cambio hacia adelante. Si el activo ya tiene un tramo vigente del mismo libro y mes (no
   * puede tener cuotas: el mes está abierto), ese deja de ser vigente y el nuevo lo sustituye.
   */
  reemplazar(cambio: TramosDeCambio): Promise<void>;
  /**
   * Deja de ser vigente lo que creó la mejora y vuelve a serlo el tramo del mismo libro y mes al que sustituyó, si lo
   * hubo.
   */
  anularDeMejora(mejoraId: string): Promise<void>;
  /** Lo mismo que `anularDeMejora`, para los tramos que creó una división anulada (la fila de la división ya está anulada). */
  anularDeDivision(divisionId: string): Promise<void>;
  /** Si el activo tiene un tramo vigente creado después de los de la mejora (otra mejora o un cambio que parte de ella). */
  hayCambiosPosterioresALaMejora(mejoraId: string): Promise<boolean>;
  /** Borra los tramos del activo (deshacer «poner en uso», o eliminar el activo); el caso de uso deja su auditoría. */
  eliminarDeActivo(activoId: string): Promise<void>;
}
