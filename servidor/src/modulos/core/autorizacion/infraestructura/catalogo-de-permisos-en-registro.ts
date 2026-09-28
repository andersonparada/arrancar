import { obtenerRegistroModulos } from '../../modulos-sistema/registro-global.js';
import type { GrupoDePermisosDto } from '../aplicacion/dto/rol.dto.js';
import type { CatalogoDePermisos } from '../aplicacion/puertos/catalogo-de-permisos.js';

/** Lee el registro al consultar: los módulos se registran después de armar las rutas. */
export class CatalogoDePermisosEnRegistro implements CatalogoDePermisos {
  /** No asignable si ningún módulo lo declara, o si es de configuración de solo superacceso. */
  existe(permiso: string): boolean {
    const definicion = obtenerRegistroModulos().definicionDePermiso(permiso);
    return definicion !== undefined && !definicion.soloSuperacceso;
  }

  gruposDe(modulosActivos: ReadonlySet<string>): GrupoDePermisosDto[] {
    return obtenerRegistroModulos()
      .listar()
      .filter((modulo) => modulosActivos.has(modulo.clave))
      .map((modulo) => ({
        modulo: modulo.clave,
        nombre: modulo.nombre,
        permisos: modulo.permisos
          .filter((permiso) => !permiso.soloSuperacceso)
          .map(({ clave, descripcion }) => ({ clave, descripcion })),
      }))
      .filter((grupo) => grupo.permisos.length > 0);
  }
}
