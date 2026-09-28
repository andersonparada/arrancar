import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { MovimientoDto, SolicitudDeMovimiento } from '../../dto/movimiento.dto.js';
import { movimientoExistente, type DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

interface CorreccionDeMovimiento {
  movimientoId: string;
  solicitud: SolicitudDeMovimiento;
  /** Si quien pide la corrección espera que sea el saldo inicial de la cuenta (o una nota, si es `false`). */
  esSaldoInicial: boolean;
}

/** Corrige un movimiento vigente; su cuenta no cambia. */
export class ActualizarMovimiento {
  constructor(private readonly dependencias: DependenciasDeMovimientos) {}

  /**
   * @throws MovimientoAnulado si está anulado; NoEsUnaNota o NoEsUnSaldoInicial si no es de la clase esperada.
   * @throws SaldoInicialRepetido, SaldoInicialNoEsElPrimero, MovimientoAntesDelSaldoInicial o SaldoInsuficiente.
   */
  ejecutar(
    operador: Operador,
    { movimientoId, solicitud, esSaldoInicial }: CorreccionDeMovimiento,
  ): Promise<MovimientoDto> {
    const { unidadDeTrabajo, repositorio, consultas, reglas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const movimiento = await movimientoExistente(repositorio, movimientoId);
      movimiento.exigirClase(esSaldoInicial);
      const efectoAnterior = movimiento.efectoEnCentavos;
      const { fecha: fechaAnterior } = movimiento.instantanea();
      movimiento.corregir(solicitud);
      const { cuentaBancariaId, fecha, saldoInicial } = movimiento.instantanea();
      await reglas.revisar(operador, {
        cuentaBancariaId,
        movimientoId,
        queda: { fecha, saldoInicial },
        fechas: [fechaAnterior, fecha],
        diferencia: movimiento.efectoEnCentavos - efectoAnterior,
      });
      await repositorio.guardar(movimiento);
      return consultas.obtener(movimientoId);
    });
  }
}
