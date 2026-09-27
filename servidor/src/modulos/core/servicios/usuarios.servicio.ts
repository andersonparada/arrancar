import { bd } from '../base-datos/conexion.js';
import { ErrorNoEncontrado, ErrorReglaNegocio, ErrorSolicitudInvalida } from '../errores/errores.js';
import { consultasRoles } from '../autorizacion/contexto.js';
import { sesionesRepositorio } from '../repositorios/sesiones.repositorio.js';
import { usuariosRepositorio } from '../repositorios/usuarios.repositorio.js';
import { empresasRepositorio } from '../repositorios/empresas.repositorio.js';
import type { AccesoSolicitado, CambioUsuario, NuevoUsuarioSolicitado } from '../validaciones/usuarios.validaciones.js';
import { generarHashContrasena } from './contrasenas.servicio.js';
import { nombreUsuarioServicio } from './nombre-usuario.servicio.js';

/** Quién administra: el usuario que hace la petición y la cuenta de su empresa activa. */
export interface Administrador {
  usuarioId: string;
  cuentaId: string;
}

/**
 * Verifica que cada empresa y cada rol pertenezcan a la cuenta y que no se repita una empresa.
 * @throws ErrorSolicitudInvalida en cuanto encuentra un acceso inválido.
 */
async function validarAccesos(cuentaId: string, accesos: AccesoSolicitado[]): Promise<void> {
  const empresasDeCuenta = new Set((await empresasRepositorio.listarDeCuenta(cuentaId)).map((e) => e.id));
  const rolesDeCuenta = new Set((await consultasRoles.listarDeCuenta(cuentaId)).map((r) => r.id));
  const vistas = new Set<string>();

  for (const acceso of accesos) {
    if (!empresasDeCuenta.has(acceso.empresaId)) throw new ErrorSolicitudInvalida('Una de las empresas no es válida.');
    if (!rolesDeCuenta.has(acceso.rolId)) throw new ErrorSolicitudInvalida('Uno de los roles no es válido.');
    if (vistas.has(acceso.empresaId)) throw new ErrorSolicitudInvalida('Una empresa aparece dos veces.');
    vistas.add(acceso.empresaId);
  }
}

export const usuariosServicio = {
  listar(cuentaId: string) {
    return usuariosRepositorio.listarDeCuenta(cuentaId);
  },

  /** Nombre de usuario libre sugerido para una persona, o `null` si no hay variantes libres. */
  async sugerirUsuario(nombres: string, apellidos: string) {
    return { usuario: await nombreUsuarioServicio.sugerir(nombres, apellidos) };
  },

  /**
   * Crea el usuario y le da acceso a las empresas indicadas. Si no se escribe el
   * nombre de usuario, se genera a partir de nombres y apellidos.
   *
   * No reutiliza usuarios existentes: el nombre de usuario no prueba identidad, así
   * que un dueño no puede apropiarse de alguien de otra cuenta escribiendo su nombre.
   * @throws ErrorConflicto si el nombre de usuario escrito ya está en uso en el servidor.
   */
  async crear(administrador: Administrador, datos: NuevoUsuarioSolicitado) {
    await validarAccesos(administrador.cuentaId, datos.accesos);
    const hashContrasena = await generarHashContrasena(datos.contrasena);

    return bd.transaction(async (tx) => {
      const nombreUsuario = await nombreUsuarioServicio.resolverParaNuevo(datos, tx);
      const usuario = await usuariosRepositorio.crear(
        {
          usuario: nombreUsuario,
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          correo: datos.correo,
          hashContrasena,
        },
        tx,
      );
      await empresasRepositorio.reemplazarAccesosEnCuenta(usuario.id, administrador.cuentaId, datos.accesos, tx);
      return { id: usuario.id, usuario: usuario.usuario };
    });
  },

  /**
   * Los datos personales (nombres, apellidos, correo, estado) solo se cambian si el
   * usuario no pertenece a otras cuentas; los accesos siempre se limitan a las
   * empresas de esta cuenta. El nombre de usuario no cambia.
   * @throws ErrorReglaNegocio si el administrador intenta cambiar sus propios accesos o desactivarse.
   */
  async actualizar(administrador: Administrador, usuarioId: string, cambios: CambioUsuario) {
    const esExclusivo = await this.verificarPertenencia(administrador.cuentaId, usuarioId);
    const esElMismo = usuarioId === administrador.usuarioId;
    const { accesos, ...datosPersonales } = cambios;
    const cambiaDatosPersonales = Object.values(datosPersonales).some((v) => v !== undefined);

    if (esElMismo && (accesos || cambios.activo === false)) {
      throw new ErrorReglaNegocio('No puede cambiar sus propios accesos ni desactivarse.');
    }
    if (!esExclusivo && cambiaDatosPersonales) {
      throw new ErrorReglaNegocio('Este usuario también pertenece a otra cuenta; solo puede cambiar sus accesos.');
    }
    if (accesos) await validarAccesos(administrador.cuentaId, accesos);

    await bd.transaction(async (tx) => {
      if (cambiaDatosPersonales) await usuariosRepositorio.actualizar(usuarioId, datosPersonales, tx);
      if (accesos) await empresasRepositorio.reemplazarAccesosEnCuenta(usuarioId, administrador.cuentaId, accesos, tx);
    });
    if (cambios.activo === false) await sesionesRepositorio.eliminarDeUsuario(usuarioId);
  },

  /**
   * Asigna una contraseña nueva y cierra todas las sesiones del usuario.
   * @throws ErrorReglaNegocio si el usuario pertenece a otras cuentas.
   */
  async cambiarContrasena(administrador: Administrador, usuarioId: string, contrasena: string) {
    const esExclusivo = await this.verificarPertenencia(administrador.cuentaId, usuarioId);
    if (!esExclusivo && usuarioId !== administrador.usuarioId) {
      throw new ErrorReglaNegocio('Este usuario también pertenece a otra cuenta; debe cambiarla él mismo.');
    }
    await usuariosRepositorio.actualizar(usuarioId, { hashContrasena: await generarHashContrasena(contrasena) });
    await sesionesRepositorio.eliminarDeUsuario(usuarioId);
  },

  /**
   * @returns `true` si la cuenta es la única del usuario.
   * @throws ErrorNoEncontrado si el usuario no tiene acceso a la cuenta o es de soporte.
   */
  async verificarPertenencia(cuentaId: string, usuarioId: string): Promise<boolean> {
    const usuario = await usuariosRepositorio.buscarPorId(usuarioId);
    const cuentas = usuario ? await usuariosRepositorio.cuentasDelUsuario(usuarioId) : [];
    if (!usuario || usuario.esSuperacceso || !cuentas.includes(cuentaId)) throw new ErrorNoEncontrado('El usuario');
    return cuentas.length === 1;
  },
};
