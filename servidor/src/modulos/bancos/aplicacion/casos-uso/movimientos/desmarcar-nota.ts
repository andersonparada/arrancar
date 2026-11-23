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
 * Quita la marca de un módulo (Cuentas por pagar o por cobrar) a una nota: le pone el concepto que se elija, quita el reparto por concepto que
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
    const { unidadDeTrabajo, repositorio, consultas, auditoria, revisor, desglose } = this.dependencias;
    const motivoLimpio = motivo.trim();
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!motivoLimpio || motivoLimpio.length > MAXIMO_DEL_MOTIVO) throw new MotivoObligatorio();
      const movimiento = await movimientoExistente(repositorio, movimientoId);
      movimiento.exigirClase(false);
      movimiento.exigirNotaSueltaVigente();
      const anterior = await consultas.obtener(movimientoId);
      if (!anterior.marcadaParaModulo) throw new NotaNoMarcada();
      const nuevo = await this.conceptoElegido(operador, { conceptoId, tipo: anterior.tipo });
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

  /** El concepto nuevo de la nota: uno reservado por un módulo se elige solo si ese módulo no está activo. */
  private async conceptoElegido(
    operador: Operador,
    { conceptoId, tipo }: { conceptoId: string; tipo: MovimientoDto['tipo'] },
  ) {
    const modulosActivos = await this.dependencias.modulosDeOrigen.activos(operador);
    return this.dependencias.conceptos.elegido(conceptoId, tipo === 'credito' ? 'credito' : 'debito', {
      modulosActivos,
    });
  }
}
