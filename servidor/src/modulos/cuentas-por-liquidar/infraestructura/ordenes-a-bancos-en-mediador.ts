import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/bancos.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type {
  AnulacionDeMovimiento,
  AnulacionDelMovimiento,
  ChequeAEmitir,
  DesgloseDelMovimiento,
  MovimientoCreado,
  MovimientosDeBancos,
  NotaDeCreditoARegistrar,
  NotaDeDebitoARegistrar,
  OrdenesABancos,
} from '../aplicacion/puertos/puertos-de-bancos.js';

/** Las órdenes a Bancos van por el mediador: este módulo no importa nada del otro. */
export class OrdenesABancosEnMediador implements OrdenesABancos {
  /** La fecha del inverso no viene en la respuesta de Bancos: se lee de sus movimientos (puede no ser la que se pidió). */
  constructor(private readonly movimientos: Pick<MovimientosDeBancos, 'fechaDe'>) {}

  async emitirCheque(operador: Operador, cheque: ChequeAEmitir): Promise<MovimientoCreado> {
    const emitido = await mediador.enviar(operador, 'bancos.emitir_cheque_de_origen', cheque);
    return {
      movimientoId: emitido.movimientoId,
      cuentaBancariaId: emitido.cuentaBancariaId,
      numero: emitido.numeroDeCheque,
      avisos: emitido.avisos,
    };
  }

  async registrarNotaDeDebito(operador: Operador, nota: NotaDeDebitoARegistrar): Promise<MovimientoCreado> {
    const registrada = await mediador.enviar(operador, 'bancos.registrar_nota_de_origen', { ...nota, tipo: 'debito' });
    return {
      movimientoId: registrada.movimientoId,
      cuentaBancariaId: nota.cuentaBancariaId,
      numero: registrada.numero,
      avisos: registrada.avisos,
    };
  }

  async registrarNotaDeCredito(operador: Operador, nota: NotaDeCreditoARegistrar): Promise<MovimientoCreado> {
    const registrada = await mediador.enviar(operador, 'bancos.registrar_nota_de_origen', { ...nota, tipo: 'credito' });
    return {
      movimientoId: registrada.movimientoId,
      cuentaBancariaId: nota.cuentaBancariaId,
      numero: registrada.numero,
      avisos: registrada.avisos,
    };
  }

  async fijarDesglose(operador: Operador, { origen, movimientoId, conceptos }: DesgloseDelMovimiento): Promise<void> {
    await mediador.enviar(operador, 'bancos.fijar_desglose_de_conceptos', { movimientoId, origen, conceptos });
  }

  async anularMovimiento(operador: Operador, anulacion: AnulacionDeMovimiento): Promise<AnulacionDelMovimiento> {
    const { forma, inversoId } = await mediador.enviar(operador, 'bancos.anular_movimiento_de_origen', anulacion);
    const fechaDelInverso = inversoId === null ? null : await this.movimientos.fechaDe(inversoId);
    return { forma, fechaDelInverso };
  }
}
