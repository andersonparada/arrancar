import type { Ejecutor } from '../base-datos/conexion.js';
import { ErrorConflicto, ErrorReglaNegocio } from '../errores/errores.js';
import { usuariosRepositorio } from '../repositorios/usuarios.repositorio.js';
import { generarCandidatosUsuario } from '../utilidades/nombre-usuario.js';

export const nombreUsuarioServicio = {
  /**
   * Primer nombre de usuario libre según la regla de la casa (ver
   * `generarCandidatosUsuario`), o `null` si todas las variantes están ocupadas.
   */
  async sugerir(nombres: string, apellidos: string, ejecutor?: Ejecutor): Promise<string | null> {
    const candidatos = generarCandidatosUsuario(nombres, apellidos);
    const ocupados = await usuariosRepositorio.usuariosOcupados(candidatos, ejecutor);
    return candidatos.find((c) => !ocupados.has(c)) ?? null;
  },

  /**
   * Decide el nombre de usuario de una persona nueva: el escrito a mano si está
   * libre o, si no se escribió, el primero libre generado a partir del nombre.
   * @throws ErrorConflicto si el escrito a mano ya existe.
   * @throws ErrorReglaNegocio si no se pudo generar uno libre.
   */
  async resolverParaNuevo(
    datos: { usuario?: string | undefined; nombres: string; apellidos: string },
    ejecutor?: Ejecutor,
  ): Promise<string> {
    if (datos.usuario) {
      if (await usuariosRepositorio.buscarPorUsuario(datos.usuario, ejecutor)) {
        throw new ErrorConflicto(`El usuario "${datos.usuario}" ya está en uso. Elija otro.`);
      }
      return datos.usuario;
    }
    const sugerido = await this.sugerir(datos.nombres, datos.apellidos, ejecutor);
    if (!sugerido) {
      throw new ErrorReglaNegocio(
        'No se pudo generar un usuario libre con ese nombre; escríbalo a mano (solo letras).',
      );
    }
    return sugerido;
  },
};
