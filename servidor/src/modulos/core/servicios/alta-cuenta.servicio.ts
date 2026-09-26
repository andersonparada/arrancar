import { bd } from '../base-datos/conexion.js';
import { ErrorSolicitudInvalida } from '../errores/errores.js';
import { obtenerRegistroModulos } from '../modulos-sistema/registro-global.js';
import { cuentasRepositorio } from '../repositorios/cuentas.repositorio.js';
import { rolesRepositorio } from '../repositorios/roles.repositorio.js';
import { usuariosRepositorio } from '../repositorios/usuarios.repositorio.js';
import { empresasRepositorio } from '../repositorios/empresas.repositorio.js';
import type { AltaCuenta } from '../validaciones/plataforma.validaciones.js';
import { generarHashContrasena } from './contrasenas.servicio.js';
import { nombreUsuarioServicio } from './nombre-usuario.servicio.js';

export const NOMBRE_ROL_PROPIETARIO = 'Propietario';

/**
 * Fachada (patrón Facade) para dar de alta a un suscriptor nuevo.
 *
 * Oculta los pasos que implica: crear la cuenta, su primera empresa, el rol
 * Propietario con acceso total, el usuario propietario y los módulos contratados,
 * todo en una transacción. Solo soporte la usa, por eso aquí sí se permite
 * reutilizar un usuario existente escribiendo su nombre de usuario (p. ej. alguien
 * que ya es dueño de otra cuenta).
 */
export const altaCuentaServicio = {
  /**
   * @throws ErrorReglaNegocio si algún módulo contratado no tiene sus dependencias en la lista.
   * @throws ErrorSolicitudInvalida si el propietario es nuevo y no se indicó contraseña.
   */
  async darDeAlta(datos: AltaCuenta) {
    const registro = obtenerRegistroModulos();
    const modulosFinales = registro.resolverActivos(datos.modulos);
    for (const clave of datos.modulos) registro.validarActivacion(clave, modulosFinales);

    const { propietario: solicitado } = datos;
    const existente = solicitado.usuario ? await usuariosRepositorio.buscarPorUsuario(solicitado.usuario) : undefined;
    if (!existente && !solicitado.contrasena) {
      throw new ErrorSolicitudInvalida('Indique la contraseña inicial del propietario.', [
        { campo: 'propietario.contrasena', mensaje: 'Obligatoria para un usuario nuevo.' },
      ]);
    }
    const hashContrasena = existente ? null : await generarHashContrasena(solicitado.contrasena!);

    return bd.transaction(async (tx) => {
      const cuenta = await cuentasRepositorio.crear(datos.nombreCuenta, tx);
      const empresa = await empresasRepositorio.crear(
        { cuentaId: cuenta.id, nombre: datos.empresa.nombre, nit: datos.empresa.nit },
        tx,
      );
      const rol = await rolesRepositorio.crear(
        cuenta.id,
        { nombre: NOMBRE_ROL_PROPIETARIO, descripcion: 'Acceso total a la cuenta.', accesoTotal: true, permisos: [] },
        tx,
      );

      const propietario =
        existente ??
        (await usuariosRepositorio.crear(
          {
            usuario: await nombreUsuarioServicio.resolverParaNuevo(solicitado, tx),
            nombres: solicitado.nombres,
            apellidos: solicitado.apellidos,
            correo: solicitado.correo,
            hashContrasena: hashContrasena!,
          },
          tx,
        ));

      await empresasRepositorio.asignarAcceso(empresa.id, propietario.id, rol.id, tx);
      for (const clave of datos.modulos) {
        if (!registro.obtener(clave)?.esencial) await cuentasRepositorio.activarModulo(cuenta.id, clave, tx);
      }

      return {
        cuenta,
        empresa,
        propietario: { id: propietario.id, usuario: propietario.usuario, existente: existente !== undefined },
      };
    });
  },
};
