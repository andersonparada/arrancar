import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ChequeDto } from '../../dto/cheque.dto.js';
import { movimientoExistente } from '../movimientos/dependencias-de-movimientos.js';
import { chequeExistente, type DependenciasDeCheques } from './dependencias-de-cheques.js';

export interface CondicionesDelCheque {
  chequeId: string;
  noNegociable: boolean;
  paraAbonoEnCuenta: boolean;
}

/**
 * Corrige «No negociable» y «Para abono en cuenta» de un cheque emitido y todavía sin imprimir. Es corregir el
 * movimiento (por eso pide emitir) y deja en la auditoría cómo estaba. Impreso, ya no: el papel lo dice.
 */
export class CorregirCondicionesDelCheque {
  constructor(private readonly dependencias: DependenciasDeCheques) {}

  /**
   * @throws ChequeNoEstaEmitido si no está emitido; ChequeImpresoNoSeCorrige si ya se imprimió.
   * @throws ModuloDeOrigenInactivo o lo que rechace el módulo de origen si el cheque es de otro módulo (CP4).
   */
  ejecutar(
    operador: Operador,
    { chequeId, noNegociable, paraAbonoEnCuenta }: CondicionesDelCheque,
  ): Promise<ChequeDto> {
    const { unidadDeTrabajo, repositorio, repositorioMovimientos, consultas, consultasMovimientos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const cheque = await chequeExistente(repositorio, chequeId);
      cheque.corregirNoNegociable(noNegociable);
      const anterior = await consultas.obtener(chequeId);
      const movimientoId = cheque.instantanea().movimientoId as string;
      const delMovimiento = await consultasMovimientos.obtener(movimientoId);
      await this.dependencias.revisor.revisar(operador, { movimiento: delMovimiento, cambio: 'corregir' });
      const movimiento = await movimientoExistente(repositorioMovimientos, movimientoId);
      movimiento.cambiarParaAbonoEnCuenta(paraAbonoEnCuenta);
      await repositorio.guardar(cheque);
      await repositorioMovimientos.guardar(movimiento);
      await this.dependencias.auditoria.registrar({
        recurso: 'bancos.cheques',
        registroId: chequeId,
        accion: 'corregir',
        anterior,
      });
      return consultas.obtener(chequeId);
    });
  }
}
