import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ChequeDto } from '../../dto/cheque.dto.js';
import { movimientoExistente } from '../movimientos/dependencias-de-movimientos.js';
import { chequeExistente, type DependenciasDeCheques } from './dependencias-de-cheques.js';

interface AnulacionDeCheque {
  chequeId: string;
  motivo: string;
}

/**
 * Anula el cheque, disponible o emitido; si estaba emitido, anula también su
 * movimiento. Conserva su número: no se vuelve a usar.
 */
export class AnularCheque {
  constructor(private readonly dependencias: DependenciasDeCheques) {}

  /**
   * @throws ChequeAnulado si ya estaba anulado; MotivoDeAnulacionInvalido si falta el motivo.
   * @throws SaldoInsuficiente si al revertirlo la cuenta queda en negativo sin sobregiro permitido.
   */
  ejecutar(operador: Operador, { chequeId, motivo }: AnulacionDeCheque): Promise<ChequeDto> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const cheque = await chequeExistente(repositorio, chequeId);
      const anterior = await consultas.obtener(chequeId);
      const { movimientoId } = cheque.instantanea();

      cheque.anular(motivo);
      if (movimientoId) await this.anularSuMovimiento(operador, movimientoId, motivo);
      await repositorio.guardar(cheque);

      await auditoria.registrar({
        recurso: 'bancos.cheques',
        registroId: chequeId,
        accion: 'anular',
        anterior,
        motivo: cheque.instantanea().motivoDeAnulacion,
      });
      return consultas.obtener(chequeId);
    });
  }

  private async anularSuMovimiento(operador: Operador, movimientoId: string, motivo: string): Promise<void> {
    const { repositorioMovimientos, reglas } = this.dependencias;
    const movimiento = await movimientoExistente(repositorioMovimientos, movimientoId);
    const efectoAnterior = movimiento.efectoEnCentavos;
    movimiento.anularPorCheque(motivo);
    await reglas.revisar(operador, {
      cuentaBancariaId: movimiento.instantanea().cuentaBancariaId,
      diferencia: -efectoAnterior,
    });
    await repositorioMovimientos.guardar(movimiento);
  }
}
