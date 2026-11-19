import { z } from 'zod';

/** Código ISO 4217 de una moneda: tres letras, en mayúsculas. */
export const codigoDeMoneda = () =>
  z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.string().regex(/^[A-Z]{3}$/, 'El código de la moneda son tres letras.'));

const letras = () =>
  z
    .string()
    .trim()
    .max(60)
    .transform((texto) => texto.toUpperCase() || null)
    .nullable()
    .optional();

export const esquemaParamsMoneda = z.object({ codigo: codigoDeMoneda() });

/** Lo que soporte puede cambiar de una moneda; lo que no viene no se toca. */
export const esquemaMonedaEditada = z.object({
  activa: z.boolean().optional(),
  codigoBanguat: z
    .number()
    .int('El código del Banguat es un número entero.')
    .positive()
    .max(32767, 'El código del Banguat no es válido.')
    .nullable()
    .optional(),
  letrasSingular: letras(),
  letrasPlural: letras(),
});

export type ParamsMoneda = z.infer<typeof esquemaParamsMoneda>;
export type MonedaEditada = z.infer<typeof esquemaMonedaEditada>;
