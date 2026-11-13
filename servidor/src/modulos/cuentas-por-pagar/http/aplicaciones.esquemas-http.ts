import { z } from 'zod';
import { MAXIMO_POR_LOTE } from '../dominio/ciclo-de-vida.js';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;

export const esquemaParamsDeAplicacion = z.object({ aplicacionId: z.uuid() });

/**
 * Aplicar el saldo libre de una nota a uno o varios cargos (hasta 100). Aquí solo se revisa la forma; las reglas de los
 * montos, la fecha y la referencia son del dominio y responden por campo.
 */
export const esquemaAplicarNota = z.object({
  fecha: z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' }).optional(),
  referencia: z.string().nullable().optional(),
  aplicaciones: z
    .array(
      z.object({
        cargoId: z.uuid({ error: 'Escoja el documento.' }),
        monto: z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.'),
      }),
    )
    .min(1)
    .max(MAXIMO_POR_LOTE),
});

/** El motivo se valida en el caso de uso (de 1 a 300 caracteres, sin espacios sobrantes). */
export const esquemaQuitarAplicacion = z.object({ motivo: z.string() });

export type ParamsDeAplicacion = z.infer<typeof esquemaParamsDeAplicacion>;
export type AplicarNotaSolicitado = z.infer<typeof esquemaAplicarNota>;
export type QuitarAplicacionSolicitado = z.infer<typeof esquemaQuitarAplicacion>;
