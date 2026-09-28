import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { CuentaBancariaInactiva } from '../../../dominio/errores.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import type { MovimientoDto, SolicitudDeMovimiento } from '../../dto/movimiento.dto.js';
import type { DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

/** Registra una nota de crédito o de débito (o el saldo inicial) en una cuenta activa. */
export class CrearMovimiento {
  constructor(private readonly dependencias: DependenciasDeMovimientos) {}

  /**
   * @throws CuentaBancariaInactiva si la cuenta está inactiva.
   * @throws SaldoInicialRepetido, SaldoInicialNoEsElPrimero, MovimientoAntesDelSaldoInicial o SaldoInsuficiente.
   */
  ejecutar(operador: Operador, solicitud: SolicitudDeMovimiento): Promise<MovimientoDto> {
    const { unidadDeTrabajo, repositorio, consultas, reglas } = this.dependencias;
    const movimiento = Movimiento.crear(Identificador.desde(operador.empresaId), solicitud);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await consultas.exigirReferencias(solicitud);
      if (!(await consultas.cuentaEstaActiva(solicitud.cuentaBancariaId))) throw new CuentaBancariaInactiva();
      await reglas.revisar(operador, {
        cuentaBancariaId: solicitud.cuentaBancariaId,
        queda: solicitud,
        fechas: [solicitud.fecha],
        diferencia: movimiento.efectoEnCentavos,
      });
      await repositorio.agregar(movimiento);
      return consultas.obtener(movimiento.id.valor);
    });
  }
}
