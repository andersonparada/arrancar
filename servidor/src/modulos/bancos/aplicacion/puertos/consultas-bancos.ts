import type { BancoDto } from '../dto/banco.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasBancos {
  listar(): Promise<BancoDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(bancoId: string): Promise<BancoDto>;
}
