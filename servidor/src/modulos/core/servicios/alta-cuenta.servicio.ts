import { bd } from '../base-datos/conexion.js';
import { ErrorSolicitudInvalida } from '../errores/errores.js';
import { obtenerRegistroModulos } from '../modulos-sistema/registro-global.js';
import { cuentasRepositorio } from '../repositorios/cuentas.repositorio.js';
import { Rol } from '../autorizacion/dominio/rol.js';
import { insertarRol } from '../autorizacion/infraestructura/persistencia/escritura-de-roles.js';
import { Identificador } from '../compartido/dominio/identificador.js';
import { crearSiHayTexto } from '../compartido/dominio/objeto-valor.js';
import { Correo } from '../compartido/dominio/objetos-valor/correo.js';
import { cifradorDeContrasenas, usuariosEn, usuariosSinTransaccion } from '../identidad/contexto.js';
import { NombreDeUsuario } from '../identidad/dominio/nombre-de-usuario.js';
import { Usuario } from '../identidad/dominio/usuario.js';
import { empresasRepositorio } from '../repositorios/empresas.repositorio.js';
import type { AltaCuenta } from '../validaciones/plataforma.validaciones.js';

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
    const existente = solicitado.usuario
      ? await usuariosSinTransaccion.buscarPorNombre(NombreDeUsuario.crear(solicitado.usuario))
      : null;
    if (!existente && !solicitado.contrasena) {
      throw new ErrorSolicitudInvalida('Indique la contraseña inicial del propietario.', [
        { campo: 'propietario.contrasena', mensaje: 'Obligatoria para un usuario nuevo.' },
      ]);
    }
    const hashContrasena = existente ? null : await cifradorDeContrasenas.cifrar(solicitado.contrasena!);

    return bd.transaction(async (tx) => {
      const cuenta = await cuentasRepositorio.crear(datos.nombreCuenta, tx);
      const empresa = await empresasRepositorio.crear(
        { cuentaId: cuenta.id, nombre: datos.empresa.nombre, nit: datos.empresa.nit },
        tx,
      );
      const rol = Rol.propietario(Identificador.desde(cuenta.id));
      await insertarRol(tx, rol);

      const usuarios = usuariosEn(tx);
      const propietario =
        existente ??
        Usuario.registrar({
          nombreDeUsuario: await usuarios.asignador.paraNuevo(solicitado),
          nombres: solicitado.nombres,
          apellidos: solicitado.apellidos,
          correo: crearSiHayTexto(solicitado.correo, Correo.crear),
          hashContrasena: hashContrasena!,
        });
      if (!existente) await usuarios.repositorio.agregar(propietario);

      await empresasRepositorio.asignarAcceso(empresa.id, propietario.id.valor, rol.id.valor, tx);
      for (const clave of datos.modulos) {
        if (!registro.obtener(clave)?.esencial) await cuentasRepositorio.activarModulo(cuenta.id, clave, tx);
      }

      return {
        cuenta,
        empresa,
        propietario: {
          id: propietario.id.valor,
          usuario: propietario.instantanea().nombreDeUsuario.valor,
          existente: existente !== null,
        },
      };
    });
  },
};
