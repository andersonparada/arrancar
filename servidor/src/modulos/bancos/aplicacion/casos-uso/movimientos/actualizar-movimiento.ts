import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { MovimientoDto, SolicitudDeMovimiento } from '../../dto/movimiento.dto.js';
import { movimientoExistente, type DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

interface CorreccionDeMovimiento {
  movimientoId: string;
  solicitud: SolicitudDeMovimiento;
}

/** Corrige un movimiento vigente; su cuenta no cambia. */
export class ActualizarMovimiento {
  constructor(private readonly dependencias: DependenciasDeMovimientos) {}

  /**
   * @throws MovimientoAnulado si está anulado.
   * @throws SaldoInicialRepetido, SaldoInicialNoEsElPrimero, MovimientoAntesDelSaldoInicial o SaldoInsuficiente.
   */
  ejecutar(operador: Operador, { movimientoId, solicitud }: CorreccionDeMovimiento): Promise<MovimientoDto> {
    const { unidadDeTrabajo, repositorio, consultas, reglas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const movimiento = await movimientoExistente(repositorio, movimientoId);
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
