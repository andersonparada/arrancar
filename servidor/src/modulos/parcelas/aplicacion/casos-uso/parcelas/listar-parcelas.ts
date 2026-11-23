import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { FiltrosDeParcelas, ParcelaDto } from '../../dto/parcela.dto.js';
import type { DependenciasDeParcelas } from './dependencias-de-parcelas.js';

/** Las parcelas que el operador ve, por localidad, nivel y código, con los filtros que pida. */
export class ListarParcelas {
  constructor(private readonly dependencias: Pick<DependenciasDeParcelas, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador, filtros: FiltrosDeParcelas = {}): Promise<ParcelaDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar(filtros));
  }
}
