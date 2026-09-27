import type { EmpresaDto } from '../dto/empresa.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasEmpresas {
  listarDeCuenta(cuentaId: string): Promise<EmpresaDto[]>;
  /** @throws RecursoNoEncontrado si la empresa no existe en esa cuenta. */
  obtenerEnCuenta(empresaId: string, cuentaId: string): Promise<EmpresaDto>;
}
