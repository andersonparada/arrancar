import { z } from 'zod';
import { CLAVES_DE_PLANTILLA } from '../dominio/formatos-de-cheque/plantillas.js';

/**
 * Lo que llega al crear o cambiar un formato. Los ajustes se revisan completos contra el esquema estricto
 * (`resolverFormato`): aquí solo se pide que sean un objeto.
 */
export const esquemaFormatoDeCheque = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre del formato.').max(80),
  base: z.enum(CLAVES_DE_PLANTILLA),
  ajustes: z.record(z.string(), z.unknown()).default({}),
});

/** Quien elimina un formato deja su motivo en la auditoría. */
export const esquemaEliminacionDeFormatoDeCheque = z.object({ motivo: z.string().trim().min(1).max(500) });

export const esquemaParamsFormatoDeCheque = z.object({ formatoId: z.uuid() });
export const esquemaParamsPlantillaDeCheque = z.object({ clave: z.enum(CLAVES_DE_PLANTILLA) });

export type FormatoDeChequeSolicitado = z.infer<typeof esquemaFormatoDeCheque>;
export type EliminacionDeFormatoDeCheque = z.infer<typeof esquemaEliminacionDeFormatoDeCheque>;
export type ParamsFormatoDeCheque = z.infer<typeof esquemaParamsFormatoDeCheque>;
export type ParamsPlantillaDeCheque = z.infer<typeof esquemaParamsPlantillaDeCheque>;
