import { z } from 'zod';
import { idOpcional, textoObligatorio } from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar un departamento; las reglas de negocio las revisa el dominio. */
export const esquemaDepartamento = z.object({
  codigo: textoObligatorio(12),
  nombre: textoObligatorio(120),
  localidadId: idOpcional(),
  activo: z.boolean().default(true),
});

export const esquemaParamsDepartamento = z.object({ departamentoId: z.uuid() });

export type DepartamentoSolicitado = z.infer<typeof esquemaDepartamento>;
export type ParamsDepartamento = z.infer<typeof esquemaParamsDepartamento>;
