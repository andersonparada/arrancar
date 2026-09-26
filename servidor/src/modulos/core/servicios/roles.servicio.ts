import { ErrorNoEncontrado, ErrorReglaNegocio, ErrorSolicitudInvalida } from '../errores/errores.js';
import { obtenerRegistroModulos } from '../modulos-sistema/registro-global.js';
import { rolesRepositorio } from '../repositorios/roles.repositorio.js';
import type { RolSolicitado } from '../validaciones/roles.validaciones.js';

export interface GrupoPermisos {
  modulo: string;
  nombre: string;
  permisos: { clave: string; descripcion: string }[];
}

/**
 * @throws ErrorSolicitudInvalida si algún permiso no lo declara ningún módulo.
 */
function validarPermisos(permisos: string[]): void {
  const registro = obtenerRegistroModulos();
  const desconocido = permisos.find((p) => !registro.moduloDelPermiso(p));
  if (desconocido) throw new ErrorSolicitudInvalida(`El permiso "${desconocido}" no existe.`);
}

export const rolesServicio = {
  listar(cuentaId: string) {
    return rolesRepositorio.listarDeCuenta(cuentaId);
  },

  /** Permisos que se pueden asignar, agrupados por los módulos activos de la cuenta. */
  catalogoPermisos(modulosActivos: ReadonlySet<string>): GrupoPermisos[] {
    return obtenerRegistroModulos()
      .listar()
      .filter((m) => modulosActivos.has(m.clave) && m.permisos.length > 0)
      .map((m) => ({ modulo: m.clave, nombre: m.nombre, permisos: [...m.permisos] }));
  },

  async crear(cuentaId: string, datos: RolSolicitado) {
    validarPermisos(datos.permisos);
    const rol = await rolesRepositorio.crear(cuentaId, { ...datos, permisos: datos.accesoTotal ? [] : datos.permisos });
    return { id: rol.id };
  },

  /**
   * @throws ErrorReglaNegocio si se quita el acceso total al último rol que lo tiene,
   * porque la cuenta se quedaría sin nadie que pueda administrarla.
   */
  async actualizar(cuentaId: string, rolId: string, datos: RolSolicitado) {
    const rol = await this.obtenerDeCuenta(cuentaId, rolId);
    validarPermisos(datos.permisos);

    if (rol.accesoTotal && !datos.accesoTotal) {
      const conAccesoTotal = (await rolesRepositorio.listarDeCuenta(cuentaId)).filter((r) => r.accesoTotal);
      if (conAccesoTotal.length === 1) {
        throw new ErrorReglaNegocio('Debe existir al menos un rol con acceso total.');
      }
    }
    await rolesRepositorio.actualizar(rolId, { ...datos, permisos: datos.accesoTotal ? [] : datos.permisos });
  },

  /**
   * @throws ErrorReglaNegocio si el rol está asignado a algún usuario o es el último con acceso total.
   */
  async eliminar(cuentaId: string, rolId: string) {
    const rol = await this.obtenerDeCuenta(cuentaId, rolId);
    const roles = await rolesRepositorio.listarDeCuenta(cuentaId);
    const enUso = roles.find((r) => r.id === rolId)?.totalUsuarios ?? 0;
    if (enUso > 0) throw new ErrorReglaNegocio('El rol está asignado a usuarios; reasígnelos antes de eliminarlo.');
    if (rol.accesoTotal && roles.filter((r) => r.accesoTotal).length === 1) {
      throw new ErrorReglaNegocio('Debe existir al menos un rol con acceso total.');
    }
    await rolesRepositorio.eliminar(rolId);
  },

  async obtenerDeCuenta(cuentaId: string, rolId: string) {
    const rol = await rolesRepositorio.buscarDeCuenta(rolId, cuentaId);
    if (!rol) throw new ErrorNoEncontrado('El rol');
    return rol;
  },
};
