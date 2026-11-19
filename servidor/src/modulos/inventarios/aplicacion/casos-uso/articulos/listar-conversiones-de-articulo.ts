import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConversionDto } from '../../dto/conversion.dto.js';
import { articuloExistente, type DependenciasDeArticulos } from './dependencias-de-articulos.js';

export class ListarConversionesDeArticulo {
  constructor(private readonly dependencias: DependenciasDeArticulos) {}

  /** @throws RecursoNoEncontrado si el artículo no existe o no es de la empresa. */
  ejecutar(operador: Operador, articuloId: string): Promise<ConversionDto[]> {
    const { unidadDeTrabajo, repositorio, conversiones } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await articuloExistente(repositorio, articuloId);
      return conversiones.listar(articuloId);
    });
  }
}
