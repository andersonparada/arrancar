import type { Baja, BajaId } from '../../dominio/baja.js';

/** Guarda y recupera las bajas y ventas. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioBajas {
  agregarVarios(bajas: readonly Baja[]): Promise<void>;
  buscar(id: BajaId): Promise<Baja | null>;
  /**
   * Como `buscar`, pero con `FOR UPDATE`: quien anula la baja o le sube un documento la ve sin que otro la cambie a la
   * vez, hasta el final de la transacción.
   */
  buscarBloqueando(id: BajaId): Promise<Baja | null>;
  /** Guarda el cambio de una baja: su anulación o sus documentos. */
  guardar(baja: Baja): Promise<void>;
  /** Todas las bajas de una misma acta (la del principal y las de sus componentes), vigentes o no, por activo. */
  delActo(acta: { numero: number; anioDeNumero: number }): Promise<Baja[]>;
  /** La baja vigente del activo, o `null` si no está dado de baja. */
  vigenteDeActivo(activoId: string): Promise<Baja | null>;
}
