import type { ConversionDto } from '../dto/conversion.dto.js';
import type { SolicitudDeConversiones } from '../dto/conversion.dto.js';

/** Las conversiones de un artículo («caja de 24»). La seguridad por empresa (RLS) limita lo que se ve. */
export interface AlmacenDeConversiones {
  listar(articuloId: string): Promise<ConversionDto[]>;
  /** @throws RecursoNoEncontrado si alguna unidad no existe o no es de la empresa. */
  exigirUnidades(unidadIds: readonly string[]): Promise<void>;
  /** Deja solo las conversiones dadas. */
  reemplazar(
    articuloId: string,
    empresaId: string,
    conversiones: SolicitudDeConversiones['conversiones'],
  ): Promise<void>;
}
