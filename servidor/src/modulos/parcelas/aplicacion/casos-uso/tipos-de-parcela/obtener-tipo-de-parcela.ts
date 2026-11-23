import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { TipoDeParcelaDto } from '../../dto/tipo-de-parcela.dto.js';
import type { DependenciasDeTiposDeParcela } from './dependencias-de-tipos-de-parcela.js';

export class ObtenerTipoDeParcela {
  constructor(private readonly dependencias: Pick<DependenciasDeTiposDeParcela, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, tipoDeParcelaId: string): Promise<TipoDeParcelaDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(tipoDeParcelaId));
  }
}
