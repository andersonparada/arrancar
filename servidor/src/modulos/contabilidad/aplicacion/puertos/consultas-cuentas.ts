import type { CuentaDto } from '../dto/cuenta.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasCuentas {
  /** Todas las cuentas de la empresa, ordenadas por código (así los hijos quedan bajo su padre). */
  listar(): Promise<CuentaDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(cuentaId: string): Promise<CuentaDto>;
}
