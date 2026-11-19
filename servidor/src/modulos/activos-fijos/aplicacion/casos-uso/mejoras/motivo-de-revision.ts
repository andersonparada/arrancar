import { RevisionInvalida } from '../../../dominio/errores-de-mejora.js';

const MOTIVO_MAXIMO = 300;

/**
 * El motivo de una revisión, recortado: la auditoría lo guarda y sin él no se revisa nada.
 * @throws RevisionInvalida si falta o pasa de 300 caracteres.
 */
export function motivoLimpio(motivo: string): string {
  const limpio = motivo.trim();
  if (!limpio) throw new RevisionInvalida('Escriba el motivo de la revisión.');
  if (limpio.length > MOTIVO_MAXIMO)
    throw new RevisionInvalida(`El motivo no puede pasar de ${MOTIVO_MAXIMO} caracteres.`);
  return limpio;
}
