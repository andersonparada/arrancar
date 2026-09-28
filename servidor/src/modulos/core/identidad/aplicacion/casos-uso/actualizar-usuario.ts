import { auditarCambioDeEstado, type Auditoria } from '../../../compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import { crearSiHayTexto } from '../../../compartido/dominio/objeto-valor.js';
import { Correo } from '../../../compartido/dominio/objetos-valor/correo.js';
import type { CambiosDeUsuario, Usuario } from '../../dominio/usuario.js';
import type { SolicitudDeCambioDeUsuario } from '../dto/usuario.dto.js';
import type { AccesosAEmpresas } from '../puertos/accesos-a-empresas.js';
import type { CierreDeSesiones } from '../puertos/cierre-de-sesiones.js';
import type { RepositorioUsuarios } from '../puertos/repositorio-usuarios.js';
import { exigirAccesosDeLaCuenta, usuarioDeLaCuenta, type UsuarioAdministrado } from '../usuario-de-la-cuenta.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioUsuarios;
  accesos: AccesosAEmpresas;
  sesiones: CierreDeSesiones;
  auditoria: Auditoria;
}

export interface CambioDeUsuario {
  usuarioId: string;
  solicitud: SolicitudDeCambioDeUsuario;
}

function cambiosDe({ accesos: _accesos, correo, ...datos }: SolicitudDeCambioDeUsuario): CambiosDeUsuario {
  return correo === undefined ? datos : { ...datos, correo: crearSiHayTexto(correo, Correo.crear) };
}

/** Lo que se guarda en la auditoría: todo menos el hash de la contraseña. */
function datosVisibles(usuario: Usuario) {
  const { hashContrasena: _hash, ...visibles } = usuario.instantanea();
  return visibles;
}

/** El nombre de usuario no cambia nunca. Al desactivarlo se cierran sus sesiones. */
export class ActualizarUsuario {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si no trabaja en la cuenta.
   * @throws NoPuedeCambiarseASiMismo o UsuarioDeVariasCuentas si el cambio no está permitido.
   */
  async ejecutar(operador: Operador, { usuarioId, solicitud }: CambioDeUsuario): Promise<void> {
    const { unidadDeTrabajo, repositorio } = this.dependencias;
    await unidadDeTrabajo.ejecutar(operador, async () => {
      const administrado = await usuarioDeLaCuenta(repositorio, usuarioId, operador);
      const anterior = datosVisibles(administrado.usuario);
      administrado.usuario.cambiar(cambiosDe(solicitud), administrado.pertenencia);
      await repositorio.actualizar(administrado.usuario);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'core.usuarios',
        registroId: usuarioId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: administrado.usuario.activo,
      });
      if (solicitud.accesos) await this.cambiarAccesos(operador, administrado, solicitud.accesos);
    });
    if (solicitud.activo === false) await this.dependencias.sesiones.cerrarTodasDe(usuarioId);
  }

  private async cambiarAccesos(
    operador: Operador,
    { usuario, pertenencia }: UsuarioAdministrado,
    solicitados: NonNullable<SolicitudDeCambioDeUsuario['accesos']>,
  ): Promise<void> {
    usuario.exigirQueSePuedanCambiarSusAccesos(pertenencia);
    await exigirAccesosDeLaCuenta(this.dependencias.accesos, operador.cuentaId, solicitados);
    await this.dependencias.accesos.reemplazarEnCuenta(usuario.id.valor, operador.cuentaId, solicitados);
  }
}
