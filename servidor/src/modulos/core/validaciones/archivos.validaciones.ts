import { z } from 'zod';

export const esquemaParamsArchivo = z.object({ archivoId: z.uuid() });

export const esquemaConsultaArchivo = z.object({
  variante: z.enum(['original', 'miniatura']).default('original'),
});

export type ParamsArchivo = z.infer<typeof esquemaParamsArchivo>;
export type ConsultaArchivo = z.infer<typeof esquemaConsultaArchivo>;
