import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConciliacionDto } from '../../dto/conciliacion.dto.js';
import { conciliacionExistente, type DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

/**
 * Quien concilia la da por terminada: pasa de en proceso a elaborada; ya no se le cambian las marcas.
 * Para terminar tiene que haber transcrito el saldo del estado de cuenta y coincidir con el calculado.
 */
export class TerminarConciliacion {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /**
   * @throws ConciliacionNoEstaEnProceso si no está en proceso.
   * @throws FaltaElSaldoDelEstadoDeCuenta si no transcribió el saldo (400).
   * @throws SaldoDelEstadoDeCuentaNoCoincide si el saldo difiere del calculado (422).
   */
  ejecutar(operador: Operador, conciliacionId: string): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliacion = await conciliacionExistente(repositorio, conciliacionId);
      const { saldoQueDebeMostrarElEstadoDeCuenta } = await consultas.obtener(conciliacionId);
      conciliacion.elaborar(operador.usuarioId, { saldoCalculado: saldoQueDebeMostrarElEstadoDeCuenta });
      await repositorio.guardar(conciliacion);
      return consultas.obtener(conciliacionId);
    });
  }
}
