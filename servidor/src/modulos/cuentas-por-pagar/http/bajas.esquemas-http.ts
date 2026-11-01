import { z } from 'zod';
import { CAUSAS_DE_ANULACION } from '../dominio/ciclo-de-vida.js';

/** El motivo se valida en el caso de uso (de 1 a 300 caracteres, sin espacios sobrantes). */
export const esquemaAnularDocumento = z.object({ causa: z.enum(CAUSAS_DE_ANULACION), motivo: z.string() });

export type AnularDocumentoSolicitado = z.infer<typeof esquemaAnularDocumento>;
