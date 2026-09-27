import { ErrorApi } from '@/modulos/core/servicios/cliente-http';

/** Lo que devuelve la acción si el usuario prefiere no guardar al ver que se parece a otro. */
export const DESISTIO = Symbol('desistió');

/**
 * Intenta guardar; si el servidor avisa que se parece a otro cliente o proveedor,
 * pregunta y, si el usuario confirma, guarda de todas formas.
 */
export async function conConfirmacionDeDuplicado<T>(
  guardar: (confirmarDuplicado: boolean) => Promise<T>,
  preguntar: (mensaje: string) => boolean = (mensaje) => window.confirm(mensaje),
): Promise<T | typeof DESISTIO> {
  try {
    return await guardar(false);
  } catch (error) {
    if (!(error instanceof ErrorApi) || error.codigo !== 'conflicto') throw error;
    if (!preguntar(`${error.message}\n\n¿Desea guardarlo de todas formas?`)) return DESISTIO;
    return guardar(true);
  }
}
