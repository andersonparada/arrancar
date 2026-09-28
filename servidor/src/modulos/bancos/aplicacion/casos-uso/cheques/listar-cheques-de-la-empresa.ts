import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ChequeListadoDto, FiltroDeChequesDeLaEmpresa } from '../../dto/cheque.dto.js';
import type { DependenciasDeCheques } from './dependencias-de-cheques.js';

/**
 * Los cheques emitidos y anulados de la empresa (los disponibles se ven en su
 * chequera), filtrados por cuenta, estado y fecha del movimiento (o de la
 * anulación, si nunca se emitió).
 */
export class ListarChequesDeLaEmpresa {
  constructor(private readonly dependencias: Pick<DependenciasDeCheques, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador, filtro: FiltroDeChequesDeLaEmpresa): Promise<ChequeListadoDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listarDeLaEmpresa(filtro));
  }
}
