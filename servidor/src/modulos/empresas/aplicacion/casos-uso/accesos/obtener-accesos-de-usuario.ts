import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DependenciasDeAccesos } from './dependencias-de-accesos.js';

type Dependencias = Pick<DependenciasDeAccesos, 'unidadDeTrabajo' | 'asignaciones'>;

/** Las localidades asignadas a un usuario de la empresa. */
export class ObtenerAccesosDeUsuario {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si el usuario no trabaja en la empresa. */
  ejecutar(operador: Operador, usuarioId: string): Promise<string[]> {
    const { unidadDeTrabajo, asignaciones } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!(await asignaciones.miembro(usuarioId))) throw new RecursoNoEncontrado('El usuario');
      return asignaciones.localidadIdsDelUsuario(usuarioId);
    });
  }
}
