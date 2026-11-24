import type { Costo, CostoId } from '../../dominio/costo.js';

/** Guarda y recupera los costos de los activos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioCostos {
  /** Inserta los costos en tandas (una capitalización puede traer cientos). */
  agregarVarios(costos: readonly Costo[]): Promise<void>;
  buscar(id: CostoId): Promise<Costo | null>;
  /** Guarda el cambio de un costo (anularlo). */
  guardar(costo: Costo): Promise<void>;
  /**
   * Toma el candado de cada línea del libro (en orden, sin repetir) hasta el final de la transacción: nadie más
   * capitaliza, descarta ni anula costos de esas líneas a la vez (la regla de la línea se revisa con el candado puesto).
   */
  bloquearLineas(lineaIds: readonly string[]): Promise<void>;
  /** Σ de los costos vigentes de cada activo, en centavos; el activo debe estar bloqueado por quien llama. */
  totalesVigentes(activoIds: readonly string[]): Promise<Map<string, number>>;
  /** Los costos vigentes del activo (con signo); el activo debe estar bloqueado por quien llama. */
  vigentesDeActivo(activoId: string): Promise<Costo[]>;
  /** Los costos vigentes de la mejora o el costo posterior. */
  vigentesDeMejora(mejoraId: string): Promise<Costo[]>;
  /** Los costos vigentes que creó la división (el cedido del origen y el recibido del activo nuevo). */
  vigentesDeDivision(divisionId: string): Promise<Costo[]>;
  /** Los códigos de los activos con costos vigentes de las líneas del documento (para frenar su anulación). */
  codigosDeActivosConCostosDelDocumento(documentoId: string): Promise<string[]>;
}
