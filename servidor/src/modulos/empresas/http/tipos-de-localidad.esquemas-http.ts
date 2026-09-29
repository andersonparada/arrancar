import { z } from 'zod';
import { textoObligatorio } from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar un tipo de localidad; las reglas de negocio las revisa el dominio. */
export const esquemaTipoDeLocalidad = z.object({
  nombre: textoObligatorio(60),
  activo: z.boolean().default(true),
});

export const esquemaParamsTipoDeLocalidad = z.object({ tipoDeLocalidadId: z.uuid() });

export type TipoDeLocalidadSolicitado = z.infer<typeof esquemaTipoDeLocalidad>;
export type ParamsTipoDeLocalidad = z.infer<typeof esquemaParamsTipoDeLocalidad>;
