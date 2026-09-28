import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ChequeraDto, FiltroDeChequeras } from '../../dto/chequera.dto.js';
import type { DependenciasDeChequeras } from './dependencias-de-chequeras.js';

/** Todas las chequeras de la empresa, opcionalmente de una cuenta, con el conteo de sus cheques por estado. */
export class ListarChequerasDeLaEmpresa {
  constructor(private readonly dependencias: Pick<DependenciasDeChequeras, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador, filtro: FiltroDeChequeras): Promise<ChequeraDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar(filtro));
  }
}
