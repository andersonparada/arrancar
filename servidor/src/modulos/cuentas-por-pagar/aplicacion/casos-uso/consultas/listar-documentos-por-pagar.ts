import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PaginaDeDocumentosPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import { dtoDeDocumentoPorPagar } from '../../dto/dto-de-documento-por-pagar.js';
import type { FiltroDeDocumentosPorPagar, PaginacionDeDocumentos } from '../../puertos/puertos-de-consultas.js';
import { puntoDeVistaDe, type DependenciasDeConsultas } from './dependencias-de-consultas.js';

/** Los documentos de la empresa, del más reciente al más antiguo, filtrados y paginados, con sus saldos. */
export class ListarDocumentosPorPagar {
  constructor(private readonly dependencias: DependenciasDeConsultas) {}

  ejecutar(
    operador: Operador,
    filtro: FiltroDeDocumentosPorPagar,
    paginacion: PaginacionDeDocumentos,
  ): Promise<PaginaDeDocumentosPorPagarDto> {
    const { unidadDeTrabajo, consultas, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const vista = await puntoDeVistaDe(reloj, operador);
      const { filas, total } = await consultas.listar(filtro, paginacion, vista.hoy);
      return { elementos: filas.map((fila) => dtoDeDocumentoPorPagar(fila, vista)), total, ...paginacion };
    });
  }
}
