import type { EmpresaDto } from '../dto/empresa.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasEmpresas {
  listarDeCuenta(cuentaId: string): Promise<EmpresaDto[]>;
  /**
   * ¿Otra empresa de la cuenta (activa o inactiva) tiene este NIT ya normalizado? Responde solo sí o no: no revela
   * cuál es, porque el usuario podría no tener acceso a ella.
   */
  nitRepetidoEnCuenta(consulta: { cuentaId: string; nit: string; excluirEmpresaId: string }): Promise<boolean>;
  /** @throws RecursoNoEncontrado si la empresa no existe en esa cuenta. */
  obtenerEnCuenta(empresaId: string, cuentaId: string): Promise<EmpresaDto>;
}
