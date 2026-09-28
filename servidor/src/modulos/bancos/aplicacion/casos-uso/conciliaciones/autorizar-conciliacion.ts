import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos, deCentavos } from '../../../dominio/centavos.js';
import type { FotoDelCalculo } from '../../../dominio/conciliacion.js';
import type { ConciliacionDto, Partida } from '../../dto/conciliacion.dto.js';
import { conciliacionExistente, type DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

const sumaDePartidas = (partidas: readonly Partida[]) =>
  deCentavos(partidas.reduce((suma, p) => suma + aCentavos(p.monto), 0));

function fotoDe(dto: ConciliacionDto): FotoDelCalculo {
  return {
    saldoSegunLibros: dto.cuadratica.libros.saldoFinal,
    saldoCalculadoEstadoDeCuenta: dto.saldoQueDebeMostrarElEstadoDeCuenta,
    totalChequesEnCirculacion: sumaDePartidas(dto.partidas.chequesEnCirculacion),
    totalOtrosDebitosEnTransito: sumaDePartidas(dto.partidas.otrosDebitosEnTransito),
    totalCreditosEnTransito: sumaDePartidas(dto.partidas.creditosEnTransito),
  };
}

/**
 * Autoriza la conciliación: la congela con la foto del cálculo (saldos y
 * totales) y bloquea el mes. No la puede autorizar quien la elaboró.
 */
export class AutorizarConciliacion {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /**
   * @throws ConciliacionNoEstaElaborada si no está elaborada.
   * @throws AutorizaQuienElaboro si autoriza quien la elaboró (el superacceso sí puede).
   */
  ejecutar(operador: Operador, conciliacionId: string): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliacion = await conciliacionExistente(repositorio, conciliacionId);
      const dto = await consultas.obtener(conciliacionId);
      conciliacion.autorizar(operador, fotoDe(dto));
      await repositorio.guardar(conciliacion);
      return consultas.obtener(conciliacionId);
    });
  }
}
