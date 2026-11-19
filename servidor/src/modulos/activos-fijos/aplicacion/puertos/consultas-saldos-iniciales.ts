import type { SaldoInicialDto } from '../dto/saldo-inicial.dto.js';

/** Lo que la fecha de inicio nueva dejaría fuera de lugar (§8). */
export interface ConflictosConLaFechaDeInicio {
  /** Saldos iniciales con adquisición o inicio de uso igual o posterior a la fecha nueva. */
  saldosConFechaPosterior: number;
  /** Activos de otro origen con adquisición anterior a la fecha nueva. */
  otrosConAdquisicionAnterior: number;
  hayCierres: boolean;
}

/** Lecturas de los saldos iniciales para pantallas y para el cierre de la carga. */
export interface ConsultasSaldosIniciales {
  listar(): Promise<SaldoInicialDto[]>;
  /** @throws RecursoNoEncontrado si el activo no existe, no es de la empresa o no viene de un saldo inicial. */
  obtener(activoId: string): Promise<SaldoInicialDto>;
  conflictosConLaFechaDeInicio(fechaDeInicio: string): Promise<ConflictosConLaFechaDeInicio>;
}
