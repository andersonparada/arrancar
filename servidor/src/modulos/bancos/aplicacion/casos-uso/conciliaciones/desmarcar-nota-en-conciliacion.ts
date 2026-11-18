import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ConciliacionNoEstaEnProceso, MovimientoNoConciliable } from '../../../dominio/errores.js';
import type { MovimientoDto } from '../../dto/movimiento.dto.js';
import type { DesmarcarNota } from '../movimientos/desmarcar-nota.js';
import { conciliacionBloqueada, type DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

interface DesmarcadoEnConciliacion {
  conciliacionId: string;
  movimientoId: string;
  motivo: string;
  /** El concepto que la nota lleva en adelante. */
  conceptoId: string;
}

interface Dependencias {
  conciliaciones: Pick<DependenciasDeConciliaciones, 'unidadDeTrabajo' | 'repositorio' | 'consultas'>;
  desmarcarNota: Pick<DesmarcarNota, 'ejecutar'>;
}

/**
 * Quita la marca de Cuentas por pagar a una nota desde la conciliación del mes (las marcadas sin ligar al cierre,
 * CP4-B2b). Bloquea primero la conciliación (en proceso) y comprueba que la nota sea uno de sus candidatos; después
 * hace lo mismo que la pantalla de notas: avisa a Cuentas por pagar (que la rechaza si está ligada a un pago), cambia
 * el concepto y audita, todo en la misma transacción. Quitar la marca de conciliado, en cambio, no necesita aviso.
 */
export class DesmarcarNotaEnConciliacion {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws ConciliacionNoEstaEnProceso si ya se elaboró o se autorizó.
   * @throws MovimientoNoConciliable si la nota no es candidata de esta conciliación.
   * @throws lo que rechace `DesmarcarNota` (motivo, nota no marcada, nota ligada a un pago, módulo inactivo).
   */
  ejecutar(operador: Operador, solicitud: DesmarcadoEnConciliacion): Promise<MovimientoDto> {
    const { conciliaciones, desmarcarNota } = this.dependencias;
    const { unidadDeTrabajo, repositorio, consultas } = conciliaciones;
    const { conciliacionId, ...paraLaNota } = solicitud;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliacion = await conciliacionBloqueada(repositorio, conciliacionId);
      if (!conciliacion.estaEnProceso) throw new ConciliacionNoEstaEnProceso();
      const { cuentaBancariaId } = conciliacion.instantanea();
      const candidatos = await consultas.idsDeCandidatos(cuentaBancariaId, conciliacion.finDelMes(), conciliacionId);
      if (!candidatos.includes(paraLaNota.movimientoId)) throw new MovimientoNoConciliable();
      return desmarcarNota.ejecutar(operador, paraLaNota);
    });
  }
}
