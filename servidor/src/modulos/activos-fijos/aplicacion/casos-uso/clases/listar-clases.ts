import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ClaseDto } from '../../dto/clase.dto.js';
import type { DependenciasDeClases } from './dependencias-de-clases.js';
import { SembrarClases } from './sembrar-clases.js';

/** Las clases de activos de la empresa, ordenadas por nombre; si aún no tiene, primero se le siembra la lista sugerida. */
export class ListarClases {
  private readonly sembrar: SembrarClases;

  constructor(
    private readonly dependencias: Pick<
      DependenciasDeClases,
      'unidadDeTrabajo' | 'consultas' | 'repositorio' | 'topes'
    >,
  ) {
    this.sembrar = new SembrarClases(dependencias);
  }

  ejecutar(operador: Operador): Promise<ClaseDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await this.sembrar.ejecutar(operador);
      return consultas.listar();
    });
  }
}
