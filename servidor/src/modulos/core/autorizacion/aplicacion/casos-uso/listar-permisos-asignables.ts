import type { GrupoDePermisosDto } from '../dto/rol.dto.js';
import type { CatalogoDePermisos } from '../puertos/catalogo-de-permisos.js';

/** Solo los de los módulos que la cuenta tiene activos. */
export class ListarPermisosAsignables {
  constructor(private readonly dependencias: { catalogo: CatalogoDePermisos }) {}

  ejecutar(modulosActivos: ReadonlySet<string>): GrupoDePermisosDto[] {
    return this.dependencias.catalogo.gruposDe(modulosActivos);
  }
}
