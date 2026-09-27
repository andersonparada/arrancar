import { z } from 'zod';

export const esquemaParamsDepartamento = z.object({ codigo: z.string().regex(/^\d{2}$/, 'Código inválido.') });

export type ParamsDepartamento = z.infer<typeof esquemaParamsDepartamento>;
