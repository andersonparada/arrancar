import type { Cheque } from '../../dominio/cheque.js';
import type { Chequera } from '../../dominio/chequera.js';

/** Un cheque con la chequera a la que pertenece. */
export interface ChequeUbicado {
  cheque: Cheque;
  chequera: Chequera;
}

/**
 * La chequera de apertura (docs/modulos/diseno-bancos-segunda-parte.md §2.3): una por cuenta y serie, la crea el sistema
 * con el primer cheque de la carga inicial. Corre en la transacción en curso y con la seguridad por empresa (RLS).
 */
export interface ChequerasDeApertura {
  /** El cheque con ese número en la cuenta y serie (en cualquier chequera, normal o de apertura); `null` si no existe. */
  ubicar(cuentaBancariaId: string, serie: string | null, numero: number): Promise<ChequeUbicado | null>;
  /** El cheque que quedó enlazado a ese movimiento; `null` si no hay (una partida que no es cheque). */
  ubicarPorMovimiento(movimientoId: string): Promise<ChequeUbicado | null>;
  /** La chequera de apertura de la cuenta y serie; la crea (con ese número) si todavía no existe. */
  deLaSerie(
    empresaId: string,
    datos: { cuentaBancariaId: string; serie: string | null; numero: number },
  ): Promise<Chequera>;
  /** Borra la fila de un cheque de apertura (no se reutiliza su número). */
  quitarCheque(chequeId: string): Promise<void>;
  /** `desde` y `hasta` de la chequera de apertura = el menor y el mayor de sus cheques; si no queda ninguno, se borra. */
  ajustarRango(chequeraId: string): Promise<void>;
}
