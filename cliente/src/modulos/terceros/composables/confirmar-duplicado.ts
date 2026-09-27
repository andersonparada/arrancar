import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';

/** Lo que devuelve la acción si el usuario prefiere no guardar al ver que se parece a otro. */
export const DESISTIO = Symbol('desistió');

/** Muestra el parecido que encontró el servidor y deja elegir si se guarda igual. */
const preguntarAlUsuario = (parecido: string) =>
  usarAvisos().confirmar({ titulo: 'Posible duplicado', mensaje: parecido, textoConfirmar: 'Guardar de todas formas' });

/**
 * Intenta guardar; si el servidor avisa que se parece a otro cliente o proveedor,
 * pregunta y, si el usuario confirma, guarda de todas formas.
 */
export async function conConfirmacionDeDuplicado<T>(
  guardar: (confirmarDuplicado: boolean) => Promise<T>,
  preguntar: (parecido: string) => boolean | Promise<boolean> = preguntarAlUsuario,
): Promise<T | typeof DESISTIO> {
  try {
    return await guardar(false);
  } catch (error) {
    if (!(error instanceof ErrorApi) || error.codigo !== 'conflicto') throw error;
    if (!(await preguntar(error.message))) return DESISTIO;
    return guardar(true);
  }
}
