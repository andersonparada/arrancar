import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { BodegaDto } from '../../dto/bodega.dto.js';
import type { DependenciasDeBodegas } from './dependencias-de-bodegas.js';

export class ObtenerBodega {
  constructor(private readonly dependencias: Pick<DependenciasDeBodegas, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, bodegaId: string): Promise<BodegaDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(bodegaId));
  }
}
