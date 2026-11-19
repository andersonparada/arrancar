import type { DocumentoDto, FiltrosDeDocumentos } from '../../aplicacion/dto/documento.dto.js';
import type { ExistenciaDto, FiltrosDeExistencias } from '../../aplicacion/dto/existencia.dto.js';
import type {
  ArticuloDeKardex,
  ConsultasDelKardex,
  FilaDeKardex,
} from '../../aplicacion/puertos/consultas-del-kardex.js';
import { ConsultasDeDocumentosDrizzle } from './consultas-de-documentos.drizzle.js';
import { ConsultasDeExistenciasDrizzle } from './consultas-de-existencias.drizzle.js';

/** Junta las lecturas de documentos y de existencias en el puerto que usan los casos de uso. */
export class ConsultasDelKardexDrizzle implements ConsultasDelKardex {
  private readonly deDocumentos = new ConsultasDeDocumentosDrizzle();
  private readonly deExistencias = new ConsultasDeExistenciasDrizzle();

  documentos(filtros: FiltrosDeDocumentos): Promise<DocumentoDto[]> {
    return this.deDocumentos.listar(filtros);
  }

  documento(id: string): Promise<DocumentoDto> {
    return this.deDocumentos.obtener(id);
  }

  existencias(filtros: FiltrosDeExistencias): Promise<ExistenciaDto[]> {
    return this.deExistencias.listar(filtros);
  }

  articulo(id: string): Promise<ArticuloDeKardex> {
    return this.deExistencias.articulo(id);
  }

  filasDeKardex(articuloId: string, bodegaId: string | null): Promise<FilaDeKardex[]> {
    return this.deExistencias.filas(articuloId, bodegaId);
  }
}
