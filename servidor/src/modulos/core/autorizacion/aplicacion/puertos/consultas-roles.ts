import type { RolDto } from '../dto/rol.dto.js';

export interface ConsultasRoles {
  /** Ordenados por nombre, con sus permisos y cuántos usuarios los tienen. */
  listarDeCuenta(cuentaId: string): Promise<RolDto[]>;
}
