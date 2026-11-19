import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { InmuebleDto } from '../../dto/inmueble.dto.js';
import type { DependenciasDeInmuebles } from './dependencias-de-inmuebles.js';

export class ObtenerInmueble {
  constructor(private readonly dependencias: Pick<DependenciasDeInmuebles, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, inmuebleId: string): Promise<InmuebleDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(inmuebleId));
  }
}
