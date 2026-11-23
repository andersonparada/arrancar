import { z } from 'zod';
import { opcionObligatoria, textoObligatorio } from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar un concepto de ingreso; las reglas de negocio las revisa el dominio. */
export const esquemaConceptoDeIngreso = z.object({
  nombre: textoObligatorio(80),
  tipo: opcionObligatoria(['bien', 'servicio']),
  activo: z.boolean().default(true),
});

export const esquemaParamsConceptoDeIngreso = z.object({ conceptoDeIngresoId: z.uuid() });

export type ConceptoDeIngresoSolicitado = z.infer<typeof esquemaConceptoDeIngreso>;
export type ParamsConceptoDeIngreso = z.infer<typeof esquemaParamsConceptoDeIngreso>;
