import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import type { RepositorioRoles } from '../puertos/repositorio-roles.js';
import { rolDeLaCuenta } from '../rol-de-la-cuenta.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioRoles;
}

export class EliminarRol {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si el rol no es de la cuenta.
   * @throws RolAsignadoAUsuarios o SeNecesitaUnRolConAccesoTotal si no se puede eliminar.
   */
  ejecutar(operador: Operador, rolId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const rol = await rolDeLaCuenta(repositorio, rolId, operador);
      rol.exigirQueSePuedaEliminar(await repositorio.usoDe(rol));
      await repositorio.eliminar(rol);
    });
  }
}
