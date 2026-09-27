import type { RolDto } from '../dto/rol.dto.js';

export interface ConsultasRoles {
  /** Ordenados por nombre, con sus permisos y cuántos usuarios los tienen. */
  listarDeCuenta(cuentaId: string): Promise<RolDto[]>;
  /** Los permisos sueltos del rol; la sesión los usa para saber qué puede hacer el usuario. */
  permisosDelRol(rolId: string): Promise<string[]>;
}
