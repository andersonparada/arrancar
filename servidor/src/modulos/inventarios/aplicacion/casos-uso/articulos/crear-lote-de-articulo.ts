import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { lotePermitido } from '../../../dominio/lote.js';
import type { LoteDto, SolicitudDeLote } from '../../dto/lote.dto.js';
import { articuloExistente, type DependenciasDeArticulos } from './dependencias-de-articulos.js';

interface LoteNuevo {
  articuloId: string;
  solicitud: SolicitudDeLote;
}

export class CrearLoteDeArticulo {
  constructor(private readonly dependencias: DependenciasDeArticulos) {}

  /**
   * @throws RecursoNoEncontrado si el artículo no existe o no es de la empresa.
   * @throws LoteInvalido si el artículo no maneja lotes o falta el vencimiento que exige.
   * @throws RecursoDuplicado si el artículo ya tiene un lote con ese código.
   */
  ejecutar(operador: Operador, { articuloId, solicitud }: LoteNuevo): Promise<LoteDto> {
    const { unidadDeTrabajo, repositorio, lotes } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const articulo = await articuloExistente(repositorio, articuloId);
      const datos = lotePermitido(articulo, solicitud);
      return lotes.agregar(operador.empresaId, articuloId, datos);
    });
  }
}
