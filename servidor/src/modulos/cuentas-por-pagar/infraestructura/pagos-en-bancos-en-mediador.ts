import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/bancos.contratos.js';
import type { MediosDePago } from '../../core/contratos/bancos.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type {
  AnulacionDeMovimiento,
  AnulacionDelMovimiento,
  ChequeAEmitir,
  DesgloseDelMovimiento,
  MovimientoCreado,
  MovimientosDePagos,
  NotaDeDebitoARegistrar,
  PagosEnBancos,
} from '../aplicacion/puertos/puertos-de-pagos.js';

/** Las órdenes a Bancos van por el mediador: este módulo no importa nada del otro. */
export class PagosEnBancosEnMediador implements PagosEnBancos {
  /** La fecha del inverso no viene en la respuesta de Bancos: se lee de sus movimientos (puede no ser la que se pidió). */
  constructor(private readonly movimientos: Pick<MovimientosDePagos, 'fechaDe'>) {}

  medios(operador: Operador, fecha: string): Promise<MediosDePago> {
    return mediador.enviar(operador, 'bancos.medios_de_pago', { fecha });
  }

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

  async anularMovimiento(operador: Operador, anulacion: AnulacionDeMovimiento): Promise<AnulacionDelMovimiento> {
    const { forma, inversoId } = await mediador.enviar(operador, 'bancos.anular_movimiento_de_origen', anulacion);
    const fechaDelInverso = inversoId === null ? null : await this.movimientos.fechaDe(inversoId);
    return { forma, fechaDelInverso };
  }

  async fijarDesglose(operador: Operador, { origen, movimientoId, conceptos }: DesgloseDelMovimiento): Promise<void> {
    await mediador.enviar(operador, 'bancos.fijar_desglose_de_conceptos', { movimientoId, origen, conceptos });
  }
}
