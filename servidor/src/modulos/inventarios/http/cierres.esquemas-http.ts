import { z } from 'zod';
import { textoObligatorio } from '../../core/compartido/http/esquemas-comunes.js';

/** Un mes del inventario: siempre su primer día (`aaaa-mm-01`). */
export const esquemaParamsPeriodo = z.object({
  periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/, 'Escriba el primer día del mes (aaaa-mm-01).'),
});

export const esquemaCierre = z.object({ huella: z.string().length(64).optional() });

export const esquemaReapertura = z.object({ motivo: textoObligatorio(500) });

export type ParamsPeriodo = z.infer<typeof esquemaParamsPeriodo>;
export type CierreSolicitado = z.infer<typeof esquemaCierre>;
export type ReaperturaSolicitada = z.infer<typeof esquemaReapertura>;
