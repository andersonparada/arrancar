import type { UnidadDto } from '../dto/unidad.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasUnidades {
  listar(): Promise<UnidadDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(unidadId: string): Promise<UnidadDto>;
}
