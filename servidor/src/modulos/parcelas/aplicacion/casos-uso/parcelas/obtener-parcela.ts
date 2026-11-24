import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { FichaDeParcelaDto } from '../../dto/parcela.dto.js';
import { fichaDeParcela, type DependenciasDeParcelas } from './dependencias-de-parcelas.js';

/** La ficha de una parcela: sus datos, mediciones e inmuebles. */
export class ObtenerParcela {
  constructor(private readonly dependencias: DependenciasDeParcelas) {}

  /** @throws RecursoNoEncontrado si no existe o el operador no la ve. */
  ejecutar(operador: Operador, parcelaId: string): Promise<FichaDeParcelaDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, () => fichaDeParcela(this.dependencias, parcelaId));
  }
}
