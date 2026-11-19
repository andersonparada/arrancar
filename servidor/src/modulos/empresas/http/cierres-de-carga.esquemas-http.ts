import { z } from 'zod';

export const esquemaParamsCierre = z.object({ empresaId: z.uuid(), cierreId: z.uuid() });

export type ParamsCierre = z.infer<typeof esquemaParamsCierre>;
