import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { InmuebleDto } from '../../dto/inmueble.dto.js';
import type { DependenciasDeInmuebles } from './dependencias-de-inmuebles.js';

/** Los inmuebles de la empresa, ordenados por nombre. */
export class ListarInmuebles {
  constructor(private readonly dependencias: Pick<DependenciasDeInmuebles, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador): Promise<InmuebleDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}
