import { z } from 'zod';
import { textoObligatorio, textoOpcional } from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar un banco; las reglas de negocio las revisa el dominio. */
export const esquemaBanco = z.object({
  nombre: textoObligatorio(150),
  observaciones: textoOpcional(2000),
  activo: z.boolean().default(true),
});

export const esquemaParamsBanco = z.object({ bancoId: z.uuid() });

export type BancoSolicitado = z.infer<typeof esquemaBanco>;
export type ParamsBanco = z.infer<typeof esquemaParamsBanco>;
