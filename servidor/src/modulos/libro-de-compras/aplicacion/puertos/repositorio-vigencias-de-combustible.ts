import type {
  UsoDeVigencia,
  VigenciaDeCombustible,
  VigenciaDeCombustibleId,
} from '../../dominio/vigencia-de-combustible.js';

/** Guarda y recupera las vigencias de combustible para modificarlas. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioVigenciasDeCombustible {
  buscar(id: VigenciaDeCombustibleId): Promise<VigenciaDeCombustible | null>;
  /** La vigencia sin fecha de cierre del combustible (la tasa actual), si la hay. */
  buscarAbierta(combustibleId: string): Promise<VigenciaDeCombustible | null>;
  /** Bloquea la fila del combustible hasta el fin de la transacción: dos altas de tasa no se cruzan. */
  bloquearCombustible(combustibleId: string): Promise<void>;
  /**
   * Si algún documento usa la vigencia, la fecha de emisión del más reciente; si no, `null`.
   * Hasta L3 (que crea las líneas de documento) nada la usa.
   */
  enUso(id: VigenciaDeCombustibleId): Promise<UsoDeVigencia | null>;
  agregar(vigenciaDeCombustible: VigenciaDeCombustible): Promise<void>;
  guardar(vigenciaDeCombustible: VigenciaDeCombustible): Promise<void>;
  eliminar(vigenciaDeCombustible: VigenciaDeCombustible): Promise<void>;
}
