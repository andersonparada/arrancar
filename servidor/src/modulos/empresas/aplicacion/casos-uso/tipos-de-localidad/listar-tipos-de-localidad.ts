import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { TipoDeLocalidadDto } from '../../dto/tipo-de-localidad.dto.js';
import type { DependenciasDeTiposDeLocalidad } from './dependencias-de-tipos-de-localidad.js';
import { SembrarTiposDeLocalidad } from './sembrar-tipos-de-localidad.js';

/** Los tipos de localidad de la empresa, ordenados por nombre; si aún no tiene ninguno, primero se le siembra la lista sugerida. */
export class ListarTiposDeLocalidad {
  private readonly sembrar: SembrarTiposDeLocalidad;

  constructor(
    private readonly dependencias: Pick<
      DependenciasDeTiposDeLocalidad,
      'unidadDeTrabajo' | 'consultas' | 'repositorio'
    >,
  ) {
    this.sembrar = new SembrarTiposDeLocalidad(dependencias.repositorio);
  }

  ejecutar(operador: Operador): Promise<TipoDeLocalidadDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await this.sembrar.ejecutar(operador);
      return consultas.listar();
    });
  }
}
