import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { LoteDto } from '../../dto/lote.dto.js';
import { articuloExistente, type DependenciasDeArticulos } from './dependencias-de-articulos.js';

export class ListarLotesDeArticulo {
  constructor(private readonly dependencias: DependenciasDeArticulos) {}

  /** @throws RecursoNoEncontrado si el artículo no existe o no es de la empresa. */
  ejecutar(operador: Operador, articuloId: string): Promise<LoteDto[]> {
    const { unidadDeTrabajo, repositorio, lotes } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await articuloExistente(repositorio, articuloId);
      return lotes.listar(articuloId);
    });
  }
}
