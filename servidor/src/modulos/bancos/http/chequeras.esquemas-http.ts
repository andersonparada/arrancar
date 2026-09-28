import { z } from 'zod';
import { textoOpcional } from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al crear una chequera; las reglas de negocio las revisa el dominio. */
export const esquemaChequera = z.object({
  serie: textoOpcional(20),
  desde: z.number().int('El número inicial debe ser un entero.').min(1, 'El número inicial debe ser mayor que cero.'),
  hasta: z.number().int('El número final debe ser un entero.').min(1, 'El número final debe ser mayor que cero.'),
});

export const esquemaParamsCuentaBancariaDeChequeras = z.object({ cuentaBancariaId: z.uuid() });
export const esquemaParamsChequera = z.object({ chequeraId: z.uuid() });

export const esquemaFiltroDeCheques = z.object({
  estado: z.enum(['disponible', 'emitido', 'anulado']).optional(),
});

export type ChequeraSolicitada = z.infer<typeof esquemaChequera>;
export type ParamsCuentaBancariaDeChequeras = z.infer<typeof esquemaParamsCuentaBancariaDeChequeras>;
export type ParamsChequera = z.infer<typeof esquemaParamsChequera>;
export type FiltroDeChequesSolicitado = z.infer<typeof esquemaFiltroDeCheques>;
