import { RecursoNoEncontrado } from '../../compartido/aplicacion/errores.js';
import type { Operador } from '../../compartido/aplicacion/operador.js';
import { Identificador } from '../../compartido/dominio/identificador.js';
import type { Pertenencia, Usuario } from '../dominio/usuario.js';
import type { RepositorioUsuarios } from './puertos/repositorio-usuarios.js';

export interface UsuarioAdministrado {
  usuario: Usuario;
  pertenencia: Pertenencia;
}

/**
 * El usuario, si trabaja en alguna empresa de la cuenta del operador.
 * @throws RecursoNoEncontrado si no existe, es de soporte o no trabaja en la cuenta.
 */
export async function usuarioDeLaCuenta(
  repositorio: RepositorioUsuarios,
  usuarioId: string,
  operador: Operador,
): Promise<UsuarioAdministrado> {
  const usuario = await repositorio.buscar(Identificador.desde(usuarioId));
  const trabajaEnLaCuenta = usuario ? await repositorio.pertenenciaEn(usuario.id, operador.cuentaId) : null;
  if (!usuario || usuario.esSuperacceso || !trabajaEnLaCuenta?.enLaCuenta) {
    throw new RecursoNoEncontrado('El usuario');
  }
  return {
    usuario,
    pertenencia: {
      esElMismo: usuarioId === operador.usuarioId,
      soloEnEstaCuenta: trabajaEnLaCuenta.otrasCuentas === 0,
    },
  };
}

/** El usuario al que se le cambian empresas, roles o permisos, tal como queda en la auditoría. */
export interface PersonaAdministrada {
  usuarioId: string;
  /** Nombre de usuario. */
  usuario: string;
  cuentaId: string;
}
