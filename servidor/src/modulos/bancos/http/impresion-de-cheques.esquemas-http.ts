import { z } from 'zod';
import { MAXIMO_DE_CHEQUES_POR_LOTE } from '../aplicacion/casos-uso/impresion-de-cheques/armador-de-la-impresion.js';

const idsDeCheques = z
  .array(z.uuid())
  .min(1, 'Elija al menos un cheque.')
  .max(MAXIMO_DE_CHEQUES_POR_LOTE, {
    error: `Un lote admite hasta ${MAXIMO_DE_CHEQUES_POR_LOTE} cheques.`,
  });

/** La vista previa recibe los ids separados por comas: `?ids=a,b,c`. */
export const esquemaVistaDeImpresion = z.object({
  ids: z
    .string()
    .min(1)
    .transform((texto) =>
      texto
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(idsDeCheques),
});

/** La primera impresión de uno o varios cheques de una chequera. */
export const esquemaImpresionDeCheques = z.object({ ids: idsDeCheques });

/** Reimprimir pide el motivo; `conCheque` es falso por omisión (solo el comprobante). */
export const esquemaReimpresionDeCheque = z.object({
  motivo: z.string().trim().min(1, 'Escriba el motivo de la reimpresión.').max(300),
  conCheque: z.boolean().default(false),
});

export const esquemaParamsChequeImpreso = z.object({ chequeId: z.uuid() });

export type VistaDeImpresionSolicitada = z.infer<typeof esquemaVistaDeImpresion>;
export type ImpresionDeChequesSolicitada = z.infer<typeof esquemaImpresionDeCheques>;
export type ReimpresionDeChequeSolicitada = z.infer<typeof esquemaReimpresionDeCheque>;
export type ParamsChequeImpreso = z.infer<typeof esquemaParamsChequeImpreso>;
