import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { MotivoObligatorio, NotaNoMarcada } from '../../../dominio/errores-de-origen.js';
import type { MovimientoDto } from '../../dto/movimiento.dto.js';
import { movimientoExistente, type DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

interface Desmarcado {
  movimientoId: string;
  motivo: string;
  /** El concepto que la nota lleva en adelante; lo elige quien desmarca, con las reglas de siempre. */
  conceptoId: string;
}

const MAXIMO_DEL_MOTIVO = 500;

/**
 * Quita la marca de Cuentas por pagar a una nota: le pone el concepto que se elija, quita el reparto por concepto que
 * tuviera y antes avisa a Cuentas por pagar, que la rechaza si la nota está ligada a un pago (CP4-b). El motivo es
 * obligatorio y queda en la auditoría junto con la nota como estaba.
 */
export class DesmarcarNota {
  constructor(private readonly dependencias: DependenciasDeMovimientos) {}

  /**
   * @throws MotivoObligatorio si falta el motivo; NotaNoMarcada si no está marcada.
   * @throws ConceptoDeSistemaNoSeElige, ConceptoInactivo o ConceptoIncompatible si el concepto no sirve.
   * @throws ModuloDeOrigenInactivo o lo que rechace Cuentas por pagar (por ejemplo, nota ligada a un pago).
   */
  ejecutar(operador: Operador, { movimientoId, motivo, conceptoId }: Desmarcado): Promise<MovimientoDto> {
    const { unidadDeTrabajo, repositorio, consultas, conceptos, auditoria, revisor, desglose } = this.dependencias;
    const motivoLimpio = motivo.trim();
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!motivoLimpio || motivoLimpio.length > MAXIMO_DEL_MOTIVO) throw new MotivoObligatorio();
      const movimiento = await movimientoExistente(repositorio, movimientoId);
      movimiento.exigirClase(false);
      movimiento.exigirNotaDeDebitoMarcable();
      const anterior = await consultas.obtener(movimientoId);
      if (!anterior.marcadaParaCuentasPorPagar) throw new NotaNoMarcada();
      const nuevo = await conceptos.elegido(conceptoId, 'debito');
      await revisor.revisar(operador, { movimiento: anterior, cambio: 'desmarcar', motivo: motivoLimpio });

      movimiento.reclasificar(nuevo.id.valor);
      await repositorio.guardar(movimiento);
      await desglose.quitar(operador, movimientoId);
      await auditoria.registrar({
        recurso: 'bancos.movimientos',
        registroId: movimientoId,
        accion: 'corregir',
        anterior,
        motivo: motivoLimpio,
      });
      return consultas.obtener(movimientoId);
    });
  }
}
