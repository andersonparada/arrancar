import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import type { CierreDeSesiones } from '../puertos/cierre-de-sesiones.js';
import type { CifradorDeContrasenas } from '../puertos/cifrador-de-contrasenas.js';
import type { RepositorioUsuarios } from '../puertos/repositorio-usuarios.js';
import { usuarioDeLaCuenta } from '../usuario-de-la-cuenta.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioUsuarios;
  cifrador: CifradorDeContrasenas;
  sesiones: CierreDeSesiones;
}

export interface NuevaContrasena {
  usuarioId: string;
  contrasena: string;
}

/** Asigna una contraseña nueva y cierra todas las sesiones del usuario. */
export class CambiarContrasena {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si no trabaja en la cuenta.
   * @throws UsuarioDeVariasCuentas si trabaja para otra cuenta y no es él quien la cambia.
   */
  async ejecutar(operador: Operador, { usuarioId, contrasena }: NuevaContrasena): Promise<void> {
    const { unidadDeTrabajo, repositorio, cifrador, sesiones } = this.dependencias;
    const hashContrasena = await cifrador.cifrar(contrasena);
    await unidadDeTrabajo.ejecutar(operador, async () => {
      const { usuario, pertenencia } = await usuarioDeLaCuenta(repositorio, usuarioId, operador);
      usuario.cambiarContrasena(hashContrasena, pertenencia);
      await repositorio.actualizar(usuario);
    });
    await sesiones.cerrarTodasDe(usuarioId);
  }
}
