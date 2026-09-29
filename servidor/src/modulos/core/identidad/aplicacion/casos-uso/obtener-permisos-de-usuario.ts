import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import type { PermisosDeUsuarioDto, RolDeUsuarioDto } from '../dto/usuario.dto.js';
import { origenesDelPermiso, type AsignacionesDelUsuario } from '../permisos-efectivos.js';
import type { AsignacionesDeUsuario, CatalogoDePermisosAsignables } from '../puertos/asignaciones-de-usuario.js';
import type { CatalogoDeModulos, EmpresasDeLaSesion } from '../puertos/empresas-de-la-sesion.js';
import type { RepositorioUsuarios } from '../puertos/repositorio-usuarios.js';
import { usuarioDeLaCuenta } from '../usuario-de-la-cuenta.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioUsuarios;
  asignaciones: AsignacionesDeUsuario;
  catalogo: CatalogoDePermisosAsignables;
  empresas: EmpresasDeLaSesion;
  modulos: CatalogoDeModulos;
}

/** Los roles y permisos directos de un usuario, y de dónde le llega cada permiso que tiene. */
export class ObtenerPermisosDeUsuario {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si el usuario no trabaja en la cuenta del operador. */
  ejecutar(operador: Operador, usuarioId: string): Promise<PermisosDeUsuarioDto> {
    const { unidadDeTrabajo, repositorio, asignaciones } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await usuarioDeLaCuenta(repositorio, usuarioId, operador);
      const [deLaCuenta, delUsuario] = await Promise.all([
        asignaciones.rolesDeLaCuenta(operador.cuentaId),
        asignaciones.delUsuario(usuarioId, operador.cuentaId),
      ]);
      const roles = delUsuario.rolIds
        .flatMap((id) => deLaCuenta.get(id) ?? [])
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      return this.detalle({ roles, directos: delUsuario.permisos }, operador.cuentaId);
    });
  }

  private async detalle(asignadas: AsignacionesDelUsuario, cuentaId: string): Promise<PermisosDeUsuarioDto> {
    const { empresas, modulos, catalogo } = this.dependencias;
    const activos = modulos.activos(await empresas.modulosContratados(cuentaId));
    const efectivos = catalogo.todos().flatMap((permiso) => {
      const moduloActivo = activos.has(permiso.modulo);
      const origenes = origenesDelPermiso(permiso.clave, asignadas, moduloActivo);
      return origenes.length > 0 ? [{ ...permiso, origenes, moduloActivo }] : [];
    });
    const roles: RolDeUsuarioDto[] = asignadas.roles.map((r) => ({
      rolId: r.rolId,
      rolNombre: r.nombre,
      accesoTotal: r.accesoTotal,
    }));
    return { roles, directos: [...asignadas.directos], efectivos };
  }
}
