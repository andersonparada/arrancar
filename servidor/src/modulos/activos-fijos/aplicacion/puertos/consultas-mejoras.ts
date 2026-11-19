import type { MejoraDto } from '../dto/mejora.dto.js';

/** Lecturas de las mejoras y costos posteriores. La seguridad por empresa (RLS) limita lo que se ve. */
export interface ConsultasMejoras {
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(mejoraId: string): Promise<MejoraDto>;
  /** Las mejoras del activo, de la más reciente a la más antigua. */
  deActivo(activoId: string): Promise<MejoraDto[]>;
}
