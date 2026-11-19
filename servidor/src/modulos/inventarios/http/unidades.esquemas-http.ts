import { z } from 'zod';
import { decimalOpcional, opcionObligatoria, textoObligatorio } from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar una unidad de medida; las reglas de negocio las revisa el dominio. */
export const esquemaUnidad = z.object({
  nombre: textoObligatorio(40),
  simbolo: textoObligatorio(10),
  magnitud: opcionObligatoria(['cantidad', 'masa', 'volumen', 'longitud', 'superficie', 'empaque']),
  factorALaReferencia: decimalOpcional(8),
  activo: z.boolean().default(true),
});

export const esquemaParamsUnidad = z.object({ unidadId: z.uuid() });

export type UnidadSolicitado = z.infer<typeof esquemaUnidad>;
export type ParamsUnidad = z.infer<typeof esquemaParamsUnidad>;
