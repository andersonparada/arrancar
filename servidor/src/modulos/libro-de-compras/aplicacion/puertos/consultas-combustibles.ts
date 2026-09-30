import type { CombustibleDto } from '../dto/combustible.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasCombustibles {
  listar(): Promise<CombustibleDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(combustibleId: string): Promise<CombustibleDto>;
}
