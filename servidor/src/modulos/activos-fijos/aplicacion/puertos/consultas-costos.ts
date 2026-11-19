import type { CostoDto, CostosDeActivoDto } from '../dto/costo.dto.js';

/** Lecturas de los costos para pantallas, con el documento y el proveedor de las líneas del libro. */
export interface ConsultasCostos {
  deActivo(activoId: string): Promise<CostosDeActivoDto>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(costoId: string): Promise<CostoDto>;
}
