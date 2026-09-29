import { obtenerRegistroModulos } from '../../modulos-sistema/registro-global.js';
import type { CatalogoDeModulos } from '../aplicacion/puertos/empresas-de-la-sesion.js';

/** Lee el registro al consultar: los módulos se registran después de armar las rutas. */
export class CatalogoDeModulosEnRegistro implements CatalogoDeModulos {
  activos(contratados: string[]): ReadonlySet<string> {
    return obtenerRegistroModulos().resolverActivos(contratados);
  }

  permisosDe(modulosActivos: ReadonlySet<string>): ReadonlySet<string> {
    return new Set(
      obtenerRegistroModulos()
        .permisosDe(modulosActivos)
        .map((permiso) => permiso.clave),
    );
  }

  permisosDeSuperacceso(modulosActivos: ReadonlySet<string>): ReadonlySet<string> {
    return new Set(
      obtenerRegistroModulos()
        .permisosDeSuperacceso(modulosActivos)
        .map((permiso) => permiso.clave),
    );
  }

  permisosDeAccesoTotal(modulosActivos: ReadonlySet<string>): ReadonlySet<string> {
    return new Set(
      obtenerRegistroModulos()
        .permisosDeAccesoTotal(modulosActivos)
        .map((permiso) => permiso.clave),
    );
  }

  recursosConAlcanceTotal(
    modulosActivos: ReadonlySet<string>,
    permisos: ReadonlySet<string>,
    accesoTotal: boolean,
  ): readonly string[] {
    return obtenerRegistroModulos().recursosConAlcanceTotal(modulosActivos, permisos, accesoTotal);
  }
}
