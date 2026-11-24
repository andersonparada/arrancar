import type { DivisionDto } from '../dto/division.dto.js';

/** Lecturas de las divisiones. La seguridad por empresa (RLS) limita lo que se ve. */
export interface ConsultasDivisiones {
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(divisionId: string): Promise<DivisionDto>;
  /** Las divisiones del activo, como origen o como activo nuevo, de la más reciente a la más antigua. */
  deActivo(activoId: string): Promise<DivisionDto[]>;
  /** La fecha de la división vigente más reciente del activo (como origen o como nuevo), o `null` si no tiene. */
  fechaDeLaUltimaDeActivo(activoId: string): Promise<string | null>;
  /**
   * Si alguno de los dos activos de la división tiene, después de ella, cuotas del activo nuevo o de los meses desde la
   * división, traslados (salvo el alta), mejoras, otros cambios de tramos, bajas u otra división (§6.11, I-9).
   */
  hayMovimientosPosteriores(divisionId: string): Promise<boolean>;
  /** Si el activo tiene mejoras, bajas, traslados (salvo el alta), componentes o divisiones propias, aunque estén anulados: rastro que se conserva. */
  tieneRastro(activoId: string): Promise<boolean>;
}
