import type { BajaDto } from '../dto/baja.dto.js';

/** Lecturas de las bajas y ventas, con los datos del activo y los avisos. */
export interface ConsultasBajas {
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(bajaId: string): Promise<BajaDto>;
  /** La baja vigente del activo (para su ficha), o `null` si no está dado de baja. */
  deActivo(activoId: string): Promise<BajaDto | null>;
}
