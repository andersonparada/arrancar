import { z } from 'zod';
import { textoObligatorio } from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar un tipo de parcela; las reglas de negocio las revisa el dominio. */
export const esquemaTipoDeParcela = z.object({
  nombre: textoObligatorio(60),
  activo: z.boolean().default(true),
});

export const esquemaParamsTipoDeParcela = z.object({ tipoDeParcelaId: z.uuid() });

export type TipoDeParcelaSolicitado = z.infer<typeof esquemaTipoDeParcela>;
export type ParamsTipoDeParcela = z.infer<typeof esquemaParamsTipoDeParcela>;
