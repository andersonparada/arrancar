import { z } from 'zod';
import { opcionObligatoria, textoObligatorio } from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar un concepto de gasto; las reglas de negocio las revisa el dominio. */
export const esquemaConceptoDeGasto = z.object({
  nombre: textoObligatorio(120),
  tipoPorOmision: opcionObligatoria(['bien', 'servicio']),
  esProductoAgropecuario: z.boolean().default(false),
  esActivoFijo: z.boolean().default(false),
  activo: z.boolean().default(true),
});

export const esquemaParamsConceptoDeGasto = z.object({ conceptoDeGastoId: z.uuid() });

export type ConceptoDeGastoSolicitado = z.infer<typeof esquemaConceptoDeGasto>;
export type ParamsConceptoDeGasto = z.infer<typeof esquemaParamsConceptoDeGasto>;
