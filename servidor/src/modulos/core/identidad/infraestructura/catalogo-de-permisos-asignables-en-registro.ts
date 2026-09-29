import { obtenerRegistroModulos } from '../../modulos-sistema/registro-global.js';
import type {
  CatalogoDePermisosAsignables,
  DefinicionAsignable,
} from '../aplicacion/puertos/asignaciones-de-usuario.js';

/** Lee el registro al consultar: los módulos se registran después de armar las rutas. */
export class CatalogoDePermisosAsignablesEnRegistro implements CatalogoDePermisosAsignables {
  definicionDe(clave: string): DefinicionAsignable | undefined {
    return this.todos().find((permiso) => permiso.clave === clave);
  }

  todos(): DefinicionAsignable[] {
    return obtenerRegistroModulos()
      .listar()
      .flatMap((modulo) =>
        modulo.permisos
          .filter((permiso) => !permiso.soloSuperacceso)
          .map(({ clave, descripcion }) => ({ clave, descripcion, modulo: modulo.clave })),
      );
  }
}
