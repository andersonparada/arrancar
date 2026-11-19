import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConciliacionDto } from '../../dto/conciliacion.dto.js';
import {
  documentoDeLaConciliacion,
  conciliacionBloqueada,
  type DependenciasDeConciliaciones,
} from './dependencias-de-conciliaciones.js';

/**
 * Quien concilia la da por terminada: pasa de en proceso a elaborada; ya no se le cambian las marcas.
 * Para terminar tiene que haber transcrito el saldo del estado de cuenta (que coincida con el calculado) y, si la
 * empresa lo exige, adjuntado el archivo.
 */
export class TerminarConciliacion {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /**
   * @throws ConciliacionNoEstaEnProceso si no está en proceso.
   * @throws FaltaElSaldoDelEstadoDeCuenta si no transcribió el saldo (400).
   * @throws SaldoDelEstadoDeCuentaNoCoincide si el saldo difiere del calculado (422).
   * @throws FaltaElEstadoDeCuenta si la empresa exige el archivo y no se adjuntó (400).
   */
  ejecutar(operador: Operador, conciliacionId: string): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, repositorio, politicaDeEstadoDeCuenta } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliacion = await conciliacionBloqueada(repositorio, conciliacionId);
      const { saldoQueDebeMostrarElEstadoDeCuenta } = await documentoDeLaConciliacion(
        operador,
        this.dependencias,
        conciliacionId,
      );
      conciliacion.elaborar(operador.usuarioId, {
        saldoCalculado: saldoQueDebeMostrarElEstadoDeCuenta,
        exigeEstadoDeCuenta: await politicaDeEstadoDeCuenta.exigeEstadoDeCuenta(operador),
      });
      await repositorio.guardar(conciliacion);
      return documentoDeLaConciliacion(operador, this.dependencias, conciliacionId);
    });
  }
}
