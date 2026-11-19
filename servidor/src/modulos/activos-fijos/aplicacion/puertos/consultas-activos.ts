import type { ActivoFichaDto, ActivoDto, FiltrosDeActivos } from '../dto/activo.dto.js';

/** Lecturas para pantallas: datos planos, con los nombres de la clase y de la ubicación (AF-P22 b). */
export interface ConsultasActivos {
  listar(filtros: FiltrosDeActivos): Promise<ActivoDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(activoId: string): Promise<ActivoFichaDto>;
}
