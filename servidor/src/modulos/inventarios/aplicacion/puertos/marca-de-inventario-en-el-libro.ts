import type { Operador } from '../../../core/compartido/aplicacion/operador.js';

/** Un cambio de la marca de inventario de una línea del libro. */
export interface CambioDeMarcaEnElLibro {
  lineaId: string;
  documentoId: string;
  esInventario: boolean;
  motivo: string;
}

/**
 * La orden que Inventarios manda al Libro de compras para quitar o volver a poner la marca de inventario de una línea
 * (V-8). Corre en la transacción de quien manda: si el libro la rechaza, todo se deshace.
 */
export interface MarcaDeInventarioEnElLibro {
  cambiar(operador: Operador, cambio: CambioDeMarcaEnElLibro): Promise<void>;
}
