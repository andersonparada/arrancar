import { MotivoDeDescarteInvalido } from './errores-de-recepcion.js';

/** El motivo que se guarda: recortado, obligatorio y de hasta 300 caracteres (como la columna). */
export function motivoDeDescarteValido(motivo: string): string {
  const limpio = motivo.trim();
  if (!limpio || limpio.length > 300) throw new MotivoDeDescarteInvalido();
  return limpio;
}
