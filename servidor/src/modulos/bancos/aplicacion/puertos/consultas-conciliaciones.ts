import type { ConciliacionDto, ConciliacionResumenDto } from '../dto/conciliacion.dto.js';

/** Lecturas para las pantallas de conciliación; el cálculo del documento ya viene resuelto. */
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
  /** Si la cuenta ya tiene alguna conciliación (de cualquier estado). */
  tieneAlguna(cuentaBancariaId: string): Promise<boolean>;
  /**
   * Ids de los pares original + inverso que nunca pasaron por el banco (ninguno de los dos marcado
   * en otra conciliación; en `conciliacionId` no cuenta, es la que se está haciendo) y tienen fecha
   * hasta `finDelMes`: se marcan juntos, compensados, sin aparecer como partidas en tránsito.
   */
  paresCompensadosPendientes(cuentaBancariaId: string, finDelMes: string, conciliacionId: string): Promise<string[]>;
}
