import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { DocumentoFichaDto } from '../../dto/documento-ficha.dto.js';
import type {
  FiltroDeDocumentos,
  PaginaDeDocumentosDto,
  PaginacionDeDocumentos,
} from '../../dto/documento-listado.dto.js';
import type {
  ConsultasDeListaDeDocumentos,
  RepositorioDeDocumentosGuardados,
} from '../../puertos/puertos-de-baja-de-documentos.js';
import { dtoDeFicha } from './dto-de-ficha.js';

/** Los documentos de la empresa, del período más reciente al más antiguo, filtrados y paginados. */
export class ListarDocumentos {
  constructor(
    private readonly dependencias: { unidadDeTrabajo: UnidadDeTrabajo; consultas: ConsultasDeListaDeDocumentos },
  ) {}

  ejecutar(
    operador: Operador,
    filtro: FiltroDeDocumentos,
    paginacion: PaginacionDeDocumentos,
  ): Promise<PaginaDeDocumentosDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar(filtro, paginacion));
  }
}

/** La ficha de un documento: encabezado, líneas, retenciones y las notas de crédito que lo rebajan. */
export class ObtenerDocumento {
  constructor(
    private readonly dependencias: { unidadDeTrabajo: UnidadDeTrabajo; repositorio: RepositorioDeDocumentosGuardados },
  ) {}

  /** @throws RecursoNoEncontrado si no existe o es de otra empresa. */
  ejecutar(operador: Operador, documentoId: string): Promise<DocumentoFichaDto> {
    const { unidadDeTrabajo, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const guardado = await repositorio.buscar(documentoId, false);
      if (!guardado) throw new RecursoNoEncontrado('El documento');
      return dtoDeFicha(guardado);
    });
  }
}
