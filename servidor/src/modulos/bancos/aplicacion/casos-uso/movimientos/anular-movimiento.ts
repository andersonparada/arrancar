import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { MovimientoDto } from '../../dto/movimiento.dto.js';
import { movimientoExistente, type DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

interface AnulacionDeMovimiento {
  movimientoId: string;
  motivo: string;
  /** Si quien pide la anulación espera que sea el saldo inicial de la cuenta (o una nota, si es `false`). */
  esSaldoInicial: boolean;
}

/** Anula un movimiento con su motivo; queda en la auditoría tal como estaba. */
export class AnularMovimiento {
  constructor(private readonly dependencias: DependenciasDeMovimientos) {}

  /**
   * @throws MovimientoAnulado si ya estaba anulado; MotivoDeAnulacionInvalido si falta el motivo.
   * @throws NoEsUnaNota o NoEsUnSaldoInicial si no es de la clase esperada.
   * @throws SaldoInsuficiente si al quitar un crédito la cuenta queda en negativo sin sobregiro permitido.
   */
  ejecutar(
    operador: Operador,
    { movimientoId, motivo, esSaldoInicial }: AnulacionDeMovimiento,
  ): Promise<MovimientoDto> {
    const { unidadDeTrabajo, repositorio, consultas, reglas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const movimiento = await movimientoExistente(repositorio, movimientoId);
      movimiento.exigirClase(esSaldoInicial);
      const anterior = await consultas.obtener(movimientoId);
      const efectoAnterior = movimiento.efectoEnCentavos;
      const { fecha } = movimiento.instantanea();
      movimiento.anular(motivo);
      const { cuentaBancariaId, motivoDeAnulacion } = movimiento.instantanea();
      await reglas.revisar(operador, { cuentaBancariaId, fechas: [fecha], diferencia: -efectoAnterior });
      await repositorio.guardar(movimiento);
      await auditoria.registrar({
        recurso: 'bancos.movimientos',
        registroId: movimientoId,
        accion: 'anular',
        anterior,
        motivo: motivoDeAnulacion,
      });
      return consultas.obtener(movimientoId);
    });
  }
}
