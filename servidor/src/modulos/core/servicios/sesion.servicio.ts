import { ErrorNoEncontrado } from '../errores/errores.js';
import { registrarEntradaDeSoporte } from '../bitacora/contexto.js';
import { configuracion } from '../configuracion/contexto.js';
import type { ContextoSolicitud, UsuarioSesion } from '../http/contexto-solicitud.js';
import { obtenerRegistroModulos } from '../modulos-sistema/registro-global.js';
import { cuentasRepositorio } from '../repositorios/cuentas.repositorio.js';
import { consultasRoles } from '../autorizacion/contexto.js';
import { sesionesRepositorio, type SesionConUsuario } from '../repositorios/sesiones.repositorio.js';
import { empresasRepositorio, type EmpresaDisponible } from '../repositorios/empresas.repositorio.js';

type ContextoDeEmpresa = Pick<
  ContextoSolicitud,
  'empresa' | 'rolNombre' | 'modulosActivos' | 'permisos' | 'recursosAlcanceTotal'
>;

const NOMBRE_ROL_SUPERACCESO = 'Superacceso';

/**
 * Calcula el acceso del usuario a una empresa: su rol, los módulos activos de la
 * cuenta y los permisos efectivos (los del rol limitados a esos módulos).
 * Devuelve `null` si la empresa no existe o el usuario no tiene acceso a ella.
 */
async function resolverAccesoEmpresa(usuario: UsuarioSesion, empresaId: string): Promise<ContextoDeEmpresa | null> {
  const empresa = await empresasRepositorio.buscarDisponible(empresaId);
  if (!empresa) return null;

  let accesoTotal = usuario.esSuperacceso;
  let rolNombre = NOMBRE_ROL_SUPERACCESO;
  let permisosDelRol: string[] = [];

  if (!usuario.esSuperacceso) {
    const acceso = await empresasRepositorio.obtenerAcceso(usuario.id, empresaId);
    if (!acceso) return null;
    accesoTotal = acceso.accesoTotal;
    rolNombre = acceso.rolNombre;
    if (!accesoTotal) permisosDelRol = await consultasRoles.permisosDelRol(acceso.rolId);
  }

  const registro = obtenerRegistroModulos();
  const modulosActivos = registro.resolverActivos(await cuentasRepositorio.clavesModulos(empresa.cuentaId));
  const permisosDisponibles = new Set(registro.permisosDe(modulosActivos).map((p) => p.clave));
  const permisos = accesoTotal
    ? permisosDisponibles
    : new Set(permisosDelRol.filter((p) => permisosDisponibles.has(p)));
  const recursosAlcanceTotal = registro.recursosConAlcanceTotal(modulosActivos, permisos, accesoTotal);

  return { empresa, rolNombre, modulosActivos, permisos, recursosAlcanceTotal };
}

export const sesionServicio = {
  /** Arma el contexto de la petición a partir de una sesión vigente. */
  async construirContexto(sesion: SesionConUsuario): Promise<ContextoSolicitud> {
    const contexto: ContextoSolicitud = {
      sesionId: sesion.sesionId,
      usuario: sesion.usuario,
      empresa: null,
      rolNombre: null,
      modulosActivos: new Set(),
      permisos: new Set(),
      recursosAlcanceTotal: [],
    };
    if (!sesion.empresaActivaId) return contexto;

    const acceso = await resolverAccesoEmpresa(sesion.usuario, sesion.empresaActivaId);
    return acceso ? { ...contexto, ...acceso } : contexto;
  },

  /**
   * Cambia la empresa con la que trabaja la sesión. Las entradas de soporte a
   * empresas donde el usuario no es miembro quedan en la bitácora.
   * @throws ErrorNoEncontrado si la empresa no existe o el usuario no tiene acceso.
   */
  async cambiarEmpresaActiva(contexto: ContextoSolicitud, empresaId: string, direccionIp: string | null) {
    const acceso = await resolverAccesoEmpresa(contexto.usuario, empresaId);
    if (!acceso) throw new ErrorNoEncontrado('La empresa');

    await sesionesRepositorio.fijarEmpresaActiva(contexto.sesionId, empresaId);

    if (contexto.usuario.esSuperacceso) {
      const esMiembro = await empresasRepositorio.obtenerAcceso(contexto.usuario.id, empresaId);
      if (!esMiembro) {
        await registrarEntradaDeSoporte.ejecutar({
          usuarioId: contexto.usuario.id,
          empresaId,
          direccionIp,
        });
      }
    }
    return { ...contexto, ...acceso };
  },

  /**
   * Estado completo de la sesión para el cliente. Si el usuario no tiene empresa
   * activa y solo puede entrar a una, la activa para ahorrarle el paso.
   */
  async obtenerResumen(contexto: ContextoSolicitud, direccionIp: string | null) {
    const empresasDisponibles = await this.listarEmpresasDisponibles(contexto.usuario);
    const unica = empresasDisponibles.length === 1 ? empresasDisponibles[0] : undefined;
    const contextoFinal =
      !contexto.empresa && unica && !contexto.usuario.esSuperacceso
        ? await this.cambiarEmpresaActiva(contexto, unica.id, direccionIp)
        : contexto;

    const valoresPublicos = contextoFinal.empresa
      ? await configuracion.lector.valoresPublicos({
          destino: { cuentaId: contextoFinal.empresa.cuentaId, empresaId: contextoFinal.empresa.id },
          modulosActivos: contextoFinal.modulosActivos,
        })
      : {};

    return {
      usuario: contextoFinal.usuario,
      empresa: contextoFinal.empresa,
      rolNombre: contextoFinal.rolNombre,
      modulosActivos: [...contextoFinal.modulosActivos],
      permisos: [...contextoFinal.permisos],
      configuracion: valoresPublicos,
      empresasDisponibles,
    };
  },

  /** Empresas que el usuario puede elegir; con superacceso, todas. */
  listarEmpresasDisponibles(usuario: UsuarioSesion): Promise<EmpresaDisponible[]> {
    return usuario.esSuperacceso
      ? empresasRepositorio.listarTodasDisponibles()
      : empresasRepositorio.listarDisponiblesParaUsuario(usuario.id);
  },
};
