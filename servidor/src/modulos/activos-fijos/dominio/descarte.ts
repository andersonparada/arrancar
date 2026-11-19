import { CostoInvalido } from './errores-de-costo.js';

const MOTIVO_MAXIMO = 300;

/**
 * El motivo de descartar una línea (era gasto, suscripción, reparación…): obligatorio, recortado, hasta 300 letras.
 * @throws CostoInvalido si falta o es muy largo.
 */
export function motivoDeDescarteValido(motivo: string): string {
  const limpio = motivo.trim();
  if (!limpio) throw new CostoInvalido('Escriba por qué se descarta la línea.');
  if (limpio.length > MOTIVO_MAXIMO)
    throw new CostoInvalido(`El motivo no puede pasar de ${MOTIVO_MAXIMO} caracteres.`);
  return limpio;
}
