import type { ConciliacionDto, ConciliacionResumenDto } from '../dto/conciliacion.dto.js';

/** Lecturas para las pantallas de conciliación; el cálculo en vivo ya viene resuelto. */
export interface ConsultasConciliaciones {
  /** De la más reciente a la más antigua. */
  listar(cuentaBancariaId: string): Promise<ConciliacionResumenDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(conciliacionId: string): Promise<ConciliacionDto>;
  /**
   * Los movimientos que se pueden marcar en esta conciliación: vigentes, de la
   * cuenta, con fecha hasta `finDelMes` y sin otra conciliación (incluye los ya
   * marcados en esta).
   */
  idsDeCandidatos(cuentaBancariaId: string, finDelMes: string, conciliacionId: string): Promise<string[]>;
}
