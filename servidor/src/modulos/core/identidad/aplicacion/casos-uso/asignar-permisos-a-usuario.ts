import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import type { AsignadorDePermisos } from '../asignador-de-permisos.js';
import type { SolicitudDeAsignaciones } from '../dto/usuario.dto.js';
import type { RepositorioUsuarios } from '../puertos/repositorio-usuarios.js';
import { usuarioDeLaCuenta } from '../usuario-de-la-cuenta.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioUsuarios;
  asignador: AsignadorDePermisos;
}

export interface AsignacionDeUsuario {
  usuarioId: string;
  solicitud: SolicitudDeAsignaciones;
}

/**
 * Reemplaza los roles y los permisos directos de un usuario de la cuenta. Quien tiene
 * `usuarios.asignar-permisos` puede dar cualquier permiso asignable, pero no cambiarse a sí mismo.
 */
export class AsignarPermisosAUsuario {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si no trabaja en la cuenta.
   * @throws NoPuedeCambiarseASiMismo si es el propio operador.
   * @throws RolAjeno o PermisoDesconocido si algún rol o permiso no es válido.
   */
  ejecutar(operador: Operador, { usuarioId, solicitud }: AsignacionDeUsuario): Promise<void> {
    const { unidadDeTrabajo, repositorio, asignador } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { usuario, pertenencia } = await usuarioDeLaCuenta(repositorio, usuarioId, operador);
      usuario.exigirQueSePuedanCambiarSusAccesos(pertenencia);
      const persona = { usuarioId, usuario: usuario.instantanea().nombreDeUsuario.valor, cuentaId: operador.cuentaId };
      await asignador.reemplazar(persona, solicitud);
    });
  }
}
