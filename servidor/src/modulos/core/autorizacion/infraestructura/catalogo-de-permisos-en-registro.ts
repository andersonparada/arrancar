import { obtenerRegistroModulos } from '../../modulos-sistema/registro-global.js';
import type { GrupoDePermisosDto } from '../aplicacion/dto/rol.dto.js';
import type { CatalogoDePermisos } from '../aplicacion/puertos/catalogo-de-permisos.js';

/** Lee el registro al consultar: los módulos se registran después de armar las rutas. */
export class CatalogoDePermisosEnRegistro implements CatalogoDePermisos {
  existe(permiso: string): boolean {
    return obtenerRegistroModulos().moduloDelPermiso(permiso) !== undefined;
  }

  gruposDe(modulosActivos: ReadonlySet<string>): GrupoDePermisosDto[] {
    return obtenerRegistroModulos()
      .listar()
      .filter((modulo) => modulosActivos.has(modulo.clave) && modulo.permisos.length > 0)
      .map((modulo) => ({ modulo: modulo.clave, nombre: modulo.nombre, permisos: [...modulo.permisos] }));
  }
}
