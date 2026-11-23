import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { armarArbolDeParcelas } from '../../arbol-de-parcelas.js';
import type { FiltrosDeParcelas, NodoDeParcela } from '../../dto/parcela.dto.js';
import type { DependenciasDeParcelas } from './dependencias-de-parcelas.js';

/** Las mismas parcelas que lista `ListarParcelas`, pero armadas como árbol: cada una con sus subparcelas. */
export class ListarArbolDeParcelas {
  constructor(private readonly dependencias: Pick<DependenciasDeParcelas, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador, filtros: FiltrosDeParcelas = {}): Promise<NodoDeParcela[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => armarArbolDeParcelas(await consultas.listar(filtros)));
  }
}
