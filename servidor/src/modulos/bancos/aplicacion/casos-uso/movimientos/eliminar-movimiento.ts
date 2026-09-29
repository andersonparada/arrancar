import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { movimientoExistente, type DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

interface EliminacionDeMovimiento {
  movimientoId: string;
  motivo: string;
}

/**
 * Elimina de verdad una nota «limpia»: no marcada en ninguna conciliación, con fecha fuera de un
 * mes conciliado, que no revierte ni fue revertida. Queda en la auditoría tal como estaba.
 */
export class EliminarMovimiento {
  constructor(private readonly dependencias: DependenciasDeMovimientos) {}

  /**
   * @throws NoEsUnaNota si es el saldo inicial de la cuenta.
   * @throws NoSeEliminaUnInverso o NoSeEliminaUnMovimientoRevertido si no está limpio por su historia.
   * @throws MovimientoMarcadoEnConciliacion si está marcado en alguna conciliación.
   * @throws MesConciliado si su fecha cae en un mes ya conciliado; SaldoInsuficiente si al quitarlo
   *   la cuenta queda en negativo sin sobregiro permitido.
   */
  ejecutar(operador: Operador, { movimientoId, motivo }: EliminacionDeMovimiento): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, reglas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const movimiento = await movimientoExistente(repositorio, movimientoId);
      movimiento.exigirClase(false);
      movimiento.exigirEliminable();
      const anterior = await consultas.obtener(movimientoId);
      movimiento.exigirNoMarcadoEnConciliacion(anterior.conciliacionId);
      const { cuentaBancariaId, fecha } = movimiento.instantanea();
      await reglas.revisar(operador, { cuentaBancariaId, fechas: [fecha], diferencia: -movimiento.efectoEnCentavos });
      await repositorio.eliminar(movimiento.id);
      await auditoria.registrar({
        recurso: 'bancos.movimientos',
        registroId: movimientoId,
        accion: 'eliminar',
        anterior,
        motivo,
      });
    });
  }
}
