import type { TransferenciaDto } from '../dto/transferencia.dto.js';

/** Lecturas para pantallas: nombres de las dos cuentas e ids de las dos notas que la componen. */
export interface ConsultasTransferencias {
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(transferenciaId: string): Promise<TransferenciaDto>;
}
