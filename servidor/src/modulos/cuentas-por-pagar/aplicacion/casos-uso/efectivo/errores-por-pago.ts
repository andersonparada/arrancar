import { ErrorEsperado } from '../../../../core/compartido/dominio/errores.js';

/**
 * Dice en cuál pago del reparto se dio un error: el campo pasa a `pagos.<i>.<campo>` y los detalles llevan `pago` (el índice),
 * para que la pantalla lo muestre en su proveedor. Lo que no es un error esperado se deja pasar igual.
 */
export function conIndiceDelPago(error: unknown, indice: number): unknown {
  if (!(error instanceof ErrorEsperado)) return error;
  const detalles = (error.detalles ?? {}) as Record<string, unknown>;
  if (typeof detalles.pago === 'number') return error;
  const propio = typeof detalles.campo === 'string' && !detalles.campo.startsWith('pagos.');
  const campo = propio ? { campo: `pagos.${indice}.${detalles.campo}` } : {};
  Object.assign(error, { detalles: { ...detalles, ...campo, pago: indice } });
  return error;
}

/** Corre un paso de un pago del reparto y, si falla con un error esperado, le pone el índice del pago. */
export async function enElPago<T>(indice: number, paso: () => Promise<T> | T): Promise<T> {
  try {
    return await paso();
  } catch (error) {
    throw conIndiceDelPago(error, indice);
  }
}
