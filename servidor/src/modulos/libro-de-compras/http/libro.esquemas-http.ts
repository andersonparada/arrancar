import { z } from 'zod';

/** El período del libro: `AAAA-MM` (mes del 01 al 12). */
export const esquemaConsultaDelLibro = z.object({
  periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Escriba el período como AAAA-MM.'),
});
export type ConsultaDelLibroSolicitada = z.infer<typeof esquemaConsultaDelLibro>;
