import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { TipoDeLocalidadDto } from '../../dto/tipo-de-localidad.dto.js';
import type { DependenciasDeTiposDeLocalidad } from './dependencias-de-tipos-de-localidad.js';

export class ObtenerTipoDeLocalidad {
  constructor(private readonly dependencias: Pick<DependenciasDeTiposDeLocalidad, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, tipoDeLocalidadId: string): Promise<TipoDeLocalidadDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(tipoDeLocalidadId));
  }
}
