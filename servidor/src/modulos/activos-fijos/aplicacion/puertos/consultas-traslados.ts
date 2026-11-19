import type { BoletaDto } from '../dto/traslado.dto.js';

/** Lecturas de las boletas de traslado. */
export interface ConsultasTraslados {
  /** @throws RecursoNoEncontrado si el grupo no existe o no es de la empresa. */
  boleta(grupoId: string): Promise<BoletaDto>;
}
