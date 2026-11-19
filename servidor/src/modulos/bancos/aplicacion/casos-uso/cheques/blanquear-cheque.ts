import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ChequeNoEmitido, MesConciliado, MovimientoAnulado } from '../../../dominio/errores.js';
import { ChequeImpresoNoSeBlanquea } from '../../../dominio/errores-de-impresion.js';
import { NoSeBlanqueaUnChequeDeApertura } from '../../../dominio/errores-de-apertura.js';
import type { Cheque } from '../../../dominio/cheque.js';
import type { Movimiento } from '../../../dominio/movimiento.js';
import { movimientoExistente } from '../movimientos/dependencias-de-movimientos.js';
import type { ChequeDto } from '../../dto/cheque.dto.js';
import { chequeExistente, type DependenciasDeCheques } from './dependencias-de-cheques.js';

interface BlanqueoDeCheque {
  chequeId: string;
  motivo: string;
}

/**
 * Blanquea un cheque emitido por error (nunca se imprimió ni se entregó): el cheque vuelve a
 * `disponible` (se olvida beneficiario, fecha y monto; su número se puede volver a usar) y su
 * movimiento se elimina de verdad. Solo si el movimiento está limpio: no marcado en ninguna
 * conciliación, con fecha fuera de un mes conciliado y sin anular. Queda en la auditoría tal como
 * estaba el cheque. Un cheque ya impreso no se blanquea: el papel existe (se pasa a otro formulario o se anula).
 */
export class BlanquearCheque {
  constructor(private readonly dependencias: DependenciasDeCheques) {}

  /**
   * @throws ChequeNoEmitido si el cheque no está emitido; ChequeImpresoNoSeBlanquea si ya se imprimió.
   * @throws NoSeBlanqueaUnChequeDeApertura si es de la carga inicial (no se emitió en Arrancar).
   * @throws ModuloDeOrigenInactivo, MovimientoDeOtroModulo o lo que rechace el módulo de origen si es de otro módulo (CP4).
   * @throws MovimientoMarcadoEnConciliacion si su movimiento está marcado en una conciliación; MovimientoAnulado si está anulado.
   * @throws MesConciliado si su fecha cae en un mes ya conciliado de la cuenta.
   */
  ejecutar(operador: Operador, { chequeId, motivo }: BlanqueoDeCheque): Promise<ChequeDto> {
    const { unidadDeTrabajo, repositorio, repositorioMovimientos, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const cheque = await chequeExistente(repositorio, chequeId);
      this.exigirBlanqueable(cheque);
      const anterior = await consultas.obtener(chequeId);
      const movimientoId = cheque.instantanea().movimientoId as string;
      const movimiento = await movimientoExistente(repositorioMovimientos, movimientoId);
      if (movimiento.parteDeApertura !== null) throw new NoSeBlanqueaUnChequeDeApertura();
      const delMovimiento = await this.dependencias.consultasMovimientos.obtener(movimientoId);
      await this.dependencias.revisor.revisar(operador, { movimiento: delMovimiento, cambio: 'blanquear', motivo });
      await this.exigirMovimientoLimpio(movimiento);

      cheque.blanquear();
      await repositorio.guardar(cheque);
      await repositorioMovimientos.eliminar(movimiento.id);
      await auditoria.registrar({
        recurso: 'bancos.cheques',
        registroId: chequeId,
        accion: 'blanquear',
        anterior,
        motivo,
      });
      return consultas.obtener(chequeId);
    });
  }

  /** Emitido y sin imprimir: un cheque impreso no se blanquea. */
  private exigirBlanqueable(cheque: Cheque): void {
    if (!cheque.estaEmitido) throw new ChequeNoEmitido();
    if (cheque.estaImpreso) throw new ChequeImpresoNoSeBlanquea();
  }

  /** Limpio: sin historia de anulación o reversión, no marcado en una conciliación ni en un mes conciliado. */
  private async exigirMovimientoLimpio(movimiento: Movimiento): Promise<void> {
    const { consultasMovimientos } = this.dependencias;
    movimiento.exigirEliminable();
    if (movimiento.estaAnulado) throw new MovimientoAnulado();
    const { conciliacionId, fecha, cuentaBancariaId } = await consultasMovimientos.obtener(movimiento.id.valor);
    movimiento.exigirNoMarcadoEnConciliacion(conciliacionId);
    const conciliadaHasta = await consultasMovimientos.conciliadaHasta(cuentaBancariaId);
    if (conciliadaHasta && fecha <= conciliadaHasta) throw new MesConciliado(conciliadaHasta);
  }
}
