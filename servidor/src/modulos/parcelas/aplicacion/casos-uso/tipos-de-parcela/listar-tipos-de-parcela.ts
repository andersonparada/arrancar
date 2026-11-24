import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { TipoDeParcelaDto } from '../../dto/tipo-de-parcela.dto.js';
import type { DependenciasDeTiposDeParcela } from './dependencias-de-tipos-de-parcela.js';
import { SembrarTiposDeParcela } from './sembrar-tipos-de-parcela.js';

/** Los tipos de parcela de la empresa, ordenados por nombre; si aún no tiene ninguno, primero se le siembra la lista sugerida. */
export class ListarTiposDeParcela {
  private readonly sembrar: SembrarTiposDeParcela;

  constructor(
    private readonly dependencias: Pick<DependenciasDeTiposDeParcela, 'unidadDeTrabajo' | 'consultas' | 'repositorio'>,
  ) {
    this.sembrar = new SembrarTiposDeParcela(dependencias.repositorio);
  }

  ejecutar(operador: Operador): Promise<TipoDeParcelaDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await this.sembrar.ejecutar(operador);
      return consultas.listar();
    });
  }
}
