import type { GrupoDePermisosDto } from '../dto/rol.dto.js';

/** Los permisos que declaran los módulos instalados. */
export interface CatalogoDePermisos {
  existe(permiso: string): boolean;
  gruposDe(modulosActivos: ReadonlySet<string>): GrupoDePermisosDto[];
}
