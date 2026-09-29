import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UsuarioParaAccesosDto } from '../../dto/accesos-a-localidades.dto.js';
import { veTodasLasLocalidades } from '../../ve-todas-las-localidades.js';
import type { DependenciasDeAccesos } from './dependencias-de-accesos.js';

type Dependencias = Pick<DependenciasDeAccesos, 'unidadDeTrabajo' | 'asignaciones' | 'permisosDeUsuario'>;

/** Los usuarios de la empresa con sus roles y si ya ven todas las localidades. */
export class ListarUsuariosParaAccesos {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador): Promise<UsuarioParaAccesosDto[]> {
    const { unidadDeTrabajo, asignaciones, permisosDeUsuario } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const miembros = await asignaciones.miembros();
      return Promise.all(
        miembros.map(async (miembro) => {
          const asignadas = await permisosDeUsuario.enCuenta(miembro.usuarioId, operador.cuentaId);
          const roles = asignadas.roles.map((rol) => rol.nombre).sort((a, b) => a.localeCompare(b, 'es'));
          return { ...miembro, roles, veTodas: veTodasLasLocalidades(asignadas) };
        }),
      );
    });
  }
}
