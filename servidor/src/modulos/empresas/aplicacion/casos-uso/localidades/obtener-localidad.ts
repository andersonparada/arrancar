import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { LocalidadDto } from '../../dto/localidad.dto.js';
import type { DependenciasDeLocalidades } from './dependencias-de-localidades.js';

export class ObtenerLocalidad {
  constructor(private readonly dependencias: Pick<DependenciasDeLocalidades, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, localidadId: string): Promise<LocalidadDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(localidadId));
  }
}
