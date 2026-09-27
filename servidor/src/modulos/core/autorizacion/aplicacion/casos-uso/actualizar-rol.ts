import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import { datosDeRol } from '../datos-de-rol.js';
import type { SolicitudDeRol } from '../dto/rol.dto.js';
import type { CatalogoDePermisos } from '../puertos/catalogo-de-permisos.js';
import type { RepositorioRoles } from '../puertos/repositorio-roles.js';
import { rolDeLaCuenta } from '../rol-de-la-cuenta.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioRoles;
  catalogo: CatalogoDePermisos;
}

export interface CambioDeRol {
  rolId: string;
  solicitud: SolicitudDeRol;
}

export class ActualizarRol {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si el rol no es de la cuenta.
   * @throws PermisoDesconocido si algún permiso no existe.
   * @throws SeNecesitaUnRolConAccesoTotal si se le quita el acceso total al último que lo tiene.
   */
  ejecutar(operador: Operador, { rolId, solicitud }: CambioDeRol): Promise<void> {
    const { unidadDeTrabajo, repositorio, catalogo } = this.dependencias;
    const datos = datosDeRol(solicitud, catalogo);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const rol = await rolDeLaCuenta(repositorio, rolId, operador);
      rol.cambiar(datos, await repositorio.usoDe(rol));
      await repositorio.actualizar(rol);
    });
  }
}
