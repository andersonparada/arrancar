import { z } from 'zod';

export const esquemaRol = z.object({
  nombre: z.string().trim().min(1, 'Campo obligatorio.').max(60),
  descripcion: z.string().trim().max(250).nullish(),
  accesoTotal: z.boolean().default(false),
  permisos: z.array(z.string()).default([]),
});

export const esquemaParamsRol = z.object({ rolId: z.uuid() });

export type RolSolicitado = z.infer<typeof esquemaRol>;
export type ParamsRol = z.infer<typeof esquemaParamsRol>;
