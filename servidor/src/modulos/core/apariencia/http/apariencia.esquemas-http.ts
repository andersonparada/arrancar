import { z } from 'zod';

export const esquemaColorHex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use un color con formato #RRGGBB.')
  .transform((color) => color.toLowerCase());

export const esquemaApariencia = z.object({
  nombreAplicacion: z.string().trim().min(1, 'Campo obligatorio.').max(40),
  colorPrincipal: esquemaColorHex,
  colorAcento: esquemaColorHex,
});

/** `v` es la versión del logo: solo sirve para que el navegador guarde cada versión aparte. */
export const esquemaConsultaLogo = z.object({ v: z.string().max(20).optional() });

export type AparienciaSolicitada = z.infer<typeof esquemaApariencia>;
export type ConsultaLogo = z.infer<typeof esquemaConsultaLogo>;
