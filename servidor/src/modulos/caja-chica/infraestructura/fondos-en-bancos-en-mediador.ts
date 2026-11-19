import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/bancos.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type {
  AnulacionDeMovimiento,
  ChequeAEmitir,
  FondosEnBancos,
  MovimientoAnulado,
  MovimientoCreado,
  NotaARegistrar,
} from '../aplicacion/puertos/puertos-de-bancos.js';
import type { MovimientosDeFondos } from '../aplicacion/puertos/puertos-de-fondos.js';

/** Las órdenes a Bancos van por el mediador: este módulo no importa nada del otro. */
export class FondosEnBancosEnMediador implements FondosEnBancos {
  /** La fecha del inverso no viene en la respuesta de Bancos: se lee de sus movimientos. */
  constructor(private readonly movimientos: MovimientosDeFondos) {}

  async emitirCheque(operador: Operador, cheque: ChequeAEmitir): Promise<MovimientoCreado> {
    const emitido = await mediador.enviar(operador, 'bancos.emitir_cheque_de_origen', cheque);
    return {
      movimientoId: emitido.movimientoId,
      cuentaBancariaId: emitido.cuentaBancariaId,
      avisos: emitido.avisos,
    };
  }

  async registrarNota(operador: Operador, nota: NotaARegistrar): Promise<MovimientoCreado> {
    const registrada = await mediador.enviar(operador, 'bancos.registrar_nota_de_origen', nota);
    return {
      movimientoId: registrada.movimientoId,
      cuentaBancariaId: nota.cuentaBancariaId,
      avisos: registrada.avisos,
    };
  }

  async anularMovimiento(operador: Operador, anulacion: AnulacionDeMovimiento): Promise<MovimientoAnulado> {
    const { forma, inversoId } = await mediador.enviar(operador, 'bancos.anular_movimiento_de_origen', anulacion);
    const fechaDelInverso = inversoId === null ? null : await this.movimientos.fechaDe(inversoId);
    return { forma, fechaDelInverso };
  }
}
