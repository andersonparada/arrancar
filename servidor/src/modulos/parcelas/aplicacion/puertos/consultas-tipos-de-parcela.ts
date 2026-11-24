import type { TipoDeParcelaDto } from '../dto/tipo-de-parcela.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasTiposDeParcela {
  listar(): Promise<TipoDeParcelaDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(tipoDeParcelaId: string): Promise<TipoDeParcelaDto>;
}
