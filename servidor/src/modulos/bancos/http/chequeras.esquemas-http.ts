import { z } from 'zod';
import { textoOpcional } from '../../core/compartido/http/esquemas-comunes.js';
import { CLAVES_DE_PLANTILLA } from '../dominio/formatos-de-cheque/plantillas.js';

/** Forma de lo que llega al crear una chequera; las reglas de negocio las revisa el dominio. */
export const esquemaChequera = z.object({
  serie: textoOpcional(20),
  desde: z.number().int('El número inicial debe ser un entero.').min(1, 'El número inicial debe ser mayor que cero.'),
  hasta: z.number().int('El número final debe ser un entero.').min(1, 'El número final debe ser mayor que cero.'),
});

/** Con qué formato se imprimen los cheques de la chequera: uno de la cuenta o una plantilla de fábrica (o ninguno). */
export const esquemaFormatoDeChequera = z.object({
  formatoDeChequeId: z.uuid().nullable(),
  plantillaDeCheque: z.enum(CLAVES_DE_PLANTILLA).nullable(),
});

export const esquemaParamsCuentaBancariaDeChequeras = z.object({ cuentaBancariaId: z.uuid() });
export const esquemaParamsChequera = z.object({ chequeraId: z.uuid() });

export const esquemaFiltroDeCheques = z.object({
  estado: z.enum(['disponible', 'emitido', 'anulado']).optional(),
});

/** Lo que se elige en el filtro de la lista de chequeras de la empresa. */
export const esquemaFiltroDeChequeras = z.object({
  cuentaBancariaId: z.uuid().optional(),
});

/** Forma de una fila importada: la chequera trae su cuenta por referencia. */
export const esquemaChequeraImportada = esquemaChequera.extend({ cuentaBancariaId: z.uuid() });

export type ChequeraSolicitada = z.infer<typeof esquemaChequera>;
export type ChequeraImportada = z.infer<typeof esquemaChequeraImportada>;
export type ParamsCuentaBancariaDeChequeras = z.infer<typeof esquemaParamsCuentaBancariaDeChequeras>;
export type FormatoDeChequeraSolicitado = z.infer<typeof esquemaFormatoDeChequera>;
export type ParamsChequera = z.infer<typeof esquemaParamsChequera>;
export type FiltroDeChequesSolicitado = z.infer<typeof esquemaFiltroDeCheques>;
export type FiltroDeChequerasSolicitado = z.infer<typeof esquemaFiltroDeChequeras>;
