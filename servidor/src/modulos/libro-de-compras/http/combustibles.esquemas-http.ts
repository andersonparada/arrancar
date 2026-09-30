import { z } from 'zod';
import { textoObligatorio } from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar un combustible; las reglas de negocio las revisa el dominio. */
export const esquemaCombustible = z.object({
  nombre: textoObligatorio(80),
  activo: z.boolean().default(true),
});

export const esquemaParamsCombustible = z.object({ combustibleId: z.uuid() });

export type CombustibleSolicitado = z.infer<typeof esquemaCombustible>;
export type ParamsCombustible = z.infer<typeof esquemaParamsCombustible>;
