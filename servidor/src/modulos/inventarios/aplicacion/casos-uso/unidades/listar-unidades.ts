import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDto } from '../../dto/unidad.dto.js';
import type { DependenciasDeUnidades } from './dependencias-de-unidades.js';
import { SembrarUnidades } from './sembrar-unidades.js';

/** Las unidades de la empresa, ordenadas por nombre; si aún no tiene, primero se le siembra la lista sugerida. */
export class ListarUnidades {
  private readonly sembrar: SembrarUnidades;

  constructor(
    private readonly dependencias: Pick<DependenciasDeUnidades, 'unidadDeTrabajo' | 'consultas' | 'repositorio'>,
  ) {
    this.sembrar = new SembrarUnidades(dependencias);
  }

  ejecutar(operador: Operador): Promise<UnidadDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await this.sembrar.ejecutar(operador);
      return consultas.listar();
    });
  }
}
