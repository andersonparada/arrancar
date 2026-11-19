import type { ClaseDto } from '../dto/clase.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasClases {
  listar(): Promise<ClaseDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(claseId: string): Promise<ClaseDto>;
}
