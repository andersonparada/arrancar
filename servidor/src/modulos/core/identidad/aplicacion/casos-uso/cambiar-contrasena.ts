import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import { ContrasenaActualIncorrecta } from '../../dominio/errores.js';
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
  /** Solo la pide quien cambia la suya; quien administra a otro no la conoce. */
  contrasenaActual?: string;
}

/**
 * Asigna una contraseña nueva y cierra todas las sesiones del usuario. Quien cambia la suya debe escribir la actual;
 * quien administra la de otro usuario, no.
 */
export class CambiarContrasena {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si no trabaja en la cuenta.
   * @throws UsuarioDeVariasCuentas si trabaja para otra cuenta y no es él quien la cambia.
   * @throws ContrasenaActualIncorrecta si cambia la suya y la actual falta o no coincide.
   */
  async ejecutar(operador: Operador, { usuarioId, contrasena, contrasenaActual }: NuevaContrasena): Promise<void> {
    const { unidadDeTrabajo, repositorio, cifrador, sesiones } = this.dependencias;
    const hashContrasena = await cifrador.cifrar(contrasena);
    await unidadDeTrabajo.ejecutar(operador, async () => {
      const { usuario, pertenencia } = await usuarioDeLaCuenta(repositorio, usuarioId, operador);
      if (pertenencia.esElMismo) await this.exigirLaActual(usuario.instantanea().hashContrasena, contrasenaActual);
      usuario.cambiarContrasena(hashContrasena, pertenencia);
      await repositorio.actualizar(usuario);
    });
    await sesiones.cerrarTodasDe(usuarioId);
  }

  private async exigirLaActual(hashGuardado: string, contrasenaActual: string | undefined): Promise<void> {
    const coincide = await this.dependencias.cifrador.coincide(hashGuardado, contrasenaActual ?? '');
    if (!coincide) throw new ContrasenaActualIncorrecta();
  }
}
