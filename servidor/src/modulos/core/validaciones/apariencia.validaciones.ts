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

export type AparienciaSolicitada = z.infer<typeof esquemaApariencia>;
