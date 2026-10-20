import type { LoteDeDte } from '../../dominio/lote-de-dte.js';

/** Guarda y recupera los lotes de DTE subidos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioDeLotesDeDte {
  agregar(lote: LoteDeDte): Promise<void>;
  /** El lote más reciente de la empresa con esa huella, para avisar que el archivo ya se subió. */
  buscarPorSha256(sha256: string): Promise<LoteDeDte | null>;
}
