import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Cuenta } from '../../../dominio/cuenta.js';
import { CuentaConEnlaces, CuentaConHijas, CuentaInvalida } from '../../../dominio/errores.js';
import { datosDeCuenta } from '../../datos-de-cuenta.js';
import type { CuentaDto, SolicitudDeCuenta } from '../../dto/cuenta.dto.js';
import { ubicacionDeCuentaExistente, type DependenciasDeCuentas } from './dependencias-de-cuentas.js';

interface CambioDeCuenta {
  cuentaId: string;
  solicitud: SolicitudDeCuenta;
}

export class ActualizarCuenta {
  constructor(private readonly dependencias: DependenciasDeCuentas) {}

  /**
   * Inactivar o reactivar también pasa por aquí (`activo`) y queda en la auditoría.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws CuentaInvalida si cambia el código o el tipo de una cuenta que ya tiene cuentas inferiores.
   * @throws CuentaConHijas si pasa a ser de detalle teniendo cuentas inferiores.
   * @throws CuentaConEnlaces si está enlazada a un rol y se inactiva o deja de ser de detalle.
   */
  ejecutar(operador: Operador, { cuentaId, solicitud }: CambioDeCuenta): Promise<CuentaDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const cuenta = await repositorio.buscarParaCambiar(Identificador.desde(cuentaId));
      if (!cuenta) throw new RecursoNoEncontrado('La cuenta');
      const anterior = await consultas.obtener(cuentaId);
      await this.exigirHijasCoherentes(cuenta, solicitud);
      await this.exigirSinEnlaces(cuenta, solicitud);
      cuenta.cambiarDatos(datosDeCuenta(solicitud), await ubicacionDeCuentaExistente(this.dependencias, cuenta));
      await repositorio.guardar(cuenta);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'contabilidad.cuentas',
        registroId: cuentaId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(cuentaId);
    });
  }

  /** Una cuenta enlazada a un rol de sistema sigue siendo de detalle y activa. */
  private async exigirSinEnlaces(cuenta: Cuenta, solicitud: SolicitudDeCuenta): Promise<void> {
    const pierdeElDetalle = cuenta.esDeDetalle && !solicitud.esDeDetalle;
    const seInactiva = cuenta.activo && !solicitud.activo;
    if (!pierdeElDetalle && !seInactiva) return;
    if (await this.dependencias.repositorio.tieneEnlaces(cuenta.id)) throw new CuentaConEnlaces();
  }

  /** Con cuentas inferiores no se vuelve de detalle ni cambia de tipo (los hijos serían de otro). */
  private async exigirHijasCoherentes(cuenta: Cuenta, solicitud: SolicitudDeCuenta): Promise<void> {
    const vuelveADetalle = solicitud.esDeDetalle && !cuenta.esDeDetalle;
    const cambiaDeTipo = solicitud.tipo !== cuenta.tipo;
    if (!vuelveADetalle && !cambiaDeTipo) return;
    if (!(await this.dependencias.repositorio.tieneHijas(cuenta.id))) return;
    if (vuelveADetalle) throw new CuentaConHijas();
    throw new CuentaInvalida('No se cambia el tipo de una cuenta que tiene cuentas inferiores.');
  }
}
