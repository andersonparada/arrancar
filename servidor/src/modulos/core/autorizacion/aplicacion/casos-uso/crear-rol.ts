import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../compartido/dominio/identificador.js';
import { Rol } from '../../dominio/rol.js';
import { datosDeRol } from '../datos-de-rol.js';
import type { SolicitudDeRol } from '../dto/rol.dto.js';
import type { CatalogoDePermisos } from '../puertos/catalogo-de-permisos.js';
import type { RepositorioRoles } from '../puertos/repositorio-roles.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioRoles;
  catalogo: CatalogoDePermisos;
}

export class CrearRol {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws PermisoDesconocido si algún permiso no existe.
   * @throws RecursoDuplicado si la cuenta ya tiene un rol con ese nombre.
   */
  ejecutar(operador: Operador, solicitud: SolicitudDeRol): Promise<{ id: string }> {
    const { unidadDeTrabajo, repositorio, catalogo } = this.dependencias;
    const rol = Rol.crear(Identificador.desde(operador.cuentaId), datosDeRol(solicitud, catalogo));
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await repositorio.agregar(rol);
      return { id: rol.id.valor };
    });
  }
}
