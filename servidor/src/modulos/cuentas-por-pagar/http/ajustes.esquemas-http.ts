import { z } from 'zod';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;

export const esquemaParamsDeAjuste = z.object({ ajusteId: z.uuid() });

/**
 * Ajustar el saldo libre de una nota. Aquí solo se revisa la forma; la causa, el monto, la fecha y la referencia las
 * valida el dominio y responden por campo.
 */
export const esquemaAjustarSaldo = z.object({
  monto: z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.'),
  fecha: z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' }).optional(),
  causa: z.string(),
  motivo: z.string(),
  referencia: z.string().nullable().optional(),
});

/** El motivo se valida en el caso de uso (de 1 a 300 caracteres, sin espacios sobrantes). */
export const esquemaAnularAjuste = z.object({ motivo: z.string() });

export type ParamsDeAjuste = z.infer<typeof esquemaParamsDeAjuste>;
export type AjustarSaldoSolicitado = z.infer<typeof esquemaAjustarSaldo>;
export type AnularAjusteSolicitado = z.infer<typeof esquemaAnularAjuste>;
