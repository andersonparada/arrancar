import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type {
  DocumentoDeVentaFichaDto,
  FiltroDeDocumentosDeVenta,
  PaginaDeDocumentosDeVentaDto,
  PaginacionDeDocumentosDeVenta,
} from '../../dto/documento-de-venta.dto.js';
import type {
  ConsultasDeDocumentosDeVenta,
  RepositorioDeDocumentosDeVenta,
} from '../../puertos/puertos-de-documentos.js';

/** Los documentos de la empresa, del período más reciente al más antiguo, filtrados y paginados. */
export class ListarDocumentosDeVenta {
  constructor(
    private readonly dependencias: { unidadDeTrabajo: UnidadDeTrabajo; consultas: ConsultasDeDocumentosDeVenta },
  ) {}

  ejecutar(
    operador: Operador,
    filtro: FiltroDeDocumentosDeVenta,
    paginacion: PaginacionDeDocumentosDeVenta,
  ): Promise<PaginaDeDocumentosDeVentaDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar(filtro, paginacion));
  }
}

/** La ficha de un documento: encabezado, líneas y las notas que lo corrigen. */
export class ObtenerDocumentoDeVenta {
  constructor(
    private readonly dependencias: { unidadDeTrabajo: UnidadDeTrabajo; repositorio: RepositorioDeDocumentosDeVenta },
  ) {}

  /** @throws RecursoNoEncontrado si no existe o es de otra empresa. */
  ejecutar(operador: Operador, documentoId: string): Promise<DocumentoDeVentaFichaDto> {
    const { unidadDeTrabajo, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const guardado = await repositorio.buscar(documentoId, false);
      if (!guardado) throw new RecursoNoEncontrado('El documento');
      return guardado.ficha;
    });
  }
}
