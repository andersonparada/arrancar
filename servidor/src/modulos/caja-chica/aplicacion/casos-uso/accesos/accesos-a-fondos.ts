import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { PermisosDeUsuario } from '../../../../core/identidad/aplicacion/puertos/contextos-vecinos.js';
import type { AsignacionesDelUsuario } from '../../../../core/identidad/aplicacion/permisos-efectivos.js';
import type { FondoParaAsignarDto, UsuarioParaAccesosDto } from '../../dto/accesos-a-fondos.dto.js';
import type { AsignacionesDeFondos } from '../../puertos/asignaciones-de-fondos.js';

/** Lo que usan los casos de uso de la ventana de accesos a fondos. */
export interface DependenciasDeAccesos {
  unidadDeTrabajo: UnidadDeTrabajo;
  auditoria: Auditoria;
  asignaciones: AsignacionesDeFondos;
  permisosDeUsuario: PermisosDeUsuario;
}

export const PERMISO_VER_TODOS_LOS_FONDOS = 'caja-chica.fondos.ver-todos';

/** Un usuario ve todos los fondos con un rol de acceso total o con el permiso `ver-todos` (de rol o directo). */
export function veTodosLosFondos({ roles, directos }: AsignacionesDelUsuario): boolean {
  const dePermiso = (permisos: readonly string[]) => permisos.includes(PERMISO_VER_TODOS_LOS_FONDOS);
  return dePermiso(directos) || roles.some((rol) => rol.accesoTotal || dePermiso(rol.permisos));
}

/** Todos los fondos de la empresa (también cerrados) con los usuarios que tienen acceso. */
export class ListarFondosParaAsignar {
  constructor(private readonly dependencias: Pick<DependenciasDeAccesos, 'unidadDeTrabajo' | 'asignaciones'>) {}

  /** El operador debe ser el «para asignar»: solo así la base deja leer los que no tiene asignados. */
  ejecutar(operador: Operador): Promise<FondoParaAsignarDto[]> {
    const { unidadDeTrabajo, asignaciones } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const [fondos, accesos] = await Promise.all([asignaciones.fondos(), asignaciones.todas()]);
      return fondos.map(({ id, nombre, estado }) => ({
        id,
        nombre,
        estado,
        usuarioIds: accesos.filter((acceso) => acceso.fondoId === id).map((acceso) => acceso.usuarioId),
      }));
    });
  }
}

/** Los usuarios de la empresa con sus roles y si ya ven todos los fondos. */
export class ListarUsuariosParaAccesos {
  constructor(
    private readonly dependencias: Pick<
      DependenciasDeAccesos,
      'unidadDeTrabajo' | 'asignaciones' | 'permisosDeUsuario'
    >,
  ) {}

  ejecutar(operador: Operador): Promise<UsuarioParaAccesosDto[]> {
    const { unidadDeTrabajo, asignaciones, permisosDeUsuario } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const miembros = await asignaciones.miembros();
      return Promise.all(
        miembros.map(async (miembro) => {
          const asignadas = await permisosDeUsuario.enCuenta(miembro.usuarioId, operador.cuentaId);
          const roles = asignadas.roles.map((rol) => rol.nombre).sort((a, b) => a.localeCompare(b, 'es'));
          return { ...miembro, roles, veTodos: veTodosLosFondos(asignadas) };
        }),
      );
    });
  }
}

/** Los fondos asignados a un usuario de la empresa. */
export class ObtenerAccesosDeUsuario {
  constructor(private readonly dependencias: Pick<DependenciasDeAccesos, 'unidadDeTrabajo' | 'asignaciones'>) {}

  /** @throws RecursoNoEncontrado si el usuario no trabaja en la empresa. */
  ejecutar(operador: Operador, usuarioId: string): Promise<string[]> {
    const { unidadDeTrabajo, asignaciones } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!(await asignaciones.miembro(usuarioId))) throw new RecursoNoEncontrado('El usuario');
      return asignaciones.fondoIdsDelUsuario(usuarioId);
    });
  }
}
