import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { MovimientoDto, SolicitudDeMovimiento } from '../../dto/movimiento.dto.js';
import type { Movimiento } from '../../../dominio/movimiento.js';
import { exigirInteresesCoherentes } from '../../../dominio/intereses.js';
import { numerarSiCorresponde } from '../../numeracion-de-comprobantes.js';
import { movimientoExistente, type DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

interface CorreccionDeMovimiento {
  movimientoId: string;
  solicitud: SolicitudDeMovimiento;
  /** Si quien pide la corrección espera que sea el saldo inicial de la cuenta (o una nota, si es `false`). */
  esSaldoInicial: boolean;
}

/**
 * Corrige un movimiento vigente; su cuenta no cambia. Deja en la auditoría cómo estaba antes. Conserva su
 * número, salvo que la nota cambie de tipo (crédito ↔ débito): entonces toma el siguiente de su nuevo tipo y
 * el número anterior queda como hueco, que la auditoría explica.
 */
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
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const movimiento = await movimientoExistente(repositorio, movimientoId);
      movimiento.exigirClase(esSaldoInicial);
      const anterior = await consultas.obtener(movimientoId);
      await this.corregirYGuardar(operador, movimiento, solicitud);
      await auditoria.registrar({
        recurso: 'bancos.movimientos',
        registroId: movimientoId,
        accion: 'corregir',
        anterior,
      });
      return consultas.obtener(movimientoId);
    });
  }

  private async corregirYGuardar(operador: Operador, movimiento: Movimiento, solicitud: SolicitudDeMovimiento) {
    const { repositorio, reglas } = this.dependencias;
    const efectoAnterior = movimiento.efectoEnCentavos;
    const { fecha: fechaAnterior, tipo: tipoAnterior } = movimiento.instantanea();
    const { conceptoId, pideIntereses } = await this.conceptoDeLaCorreccion(movimiento, solicitud);
    exigirInteresesCoherentes(solicitud, pideIntereses);
    movimiento.corregir({ ...solicitud, conceptoId });
    if (solicitud.tipo !== tipoAnterior) await numerarSiCorresponde(this.dependencias.correlativos, movimiento);
    const { cuentaBancariaId, fecha, saldoInicial } = movimiento.instantanea();
    await reglas.revisar(operador, {
      cuentaBancariaId,
      movimientoId: movimiento.id.valor,
      queda: { fecha, saldoInicial },
      fechas: [fechaAnterior, fecha],
      diferencia: movimiento.efectoEnCentavos - efectoAnterior,
    });
    await repositorio.guardar(movimiento);
  }

  /** El saldo inicial conserva su concepto de sistema; una nota lleva el elegido, que se revisa con su nuevo tipo. */
  private async conceptoDeLaCorreccion(
    movimiento: Movimiento,
    solicitud: SolicitudDeMovimiento,
  ): Promise<{ conceptoId: string; pideIntereses: boolean }> {
    const { conceptoId: actual, saldoInicial } = movimiento.instantanea();
    if (saldoInicial) return { conceptoId: actual, pideIntereses: false };
    const elegido = await this.dependencias.conceptos.elegido(solicitud.conceptoId, solicitud.tipo, { actual });
    return { conceptoId: elegido.id.valor, pideIntereses: elegido.instantanea().pideDatosDeIntereses };
  }
}
