import { z } from 'zod';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;
const MAXIMO_DE_NOTAS = 100;

const monto = z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.');
const fecha = z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' });
const texto = (maximo: number, campo: string) =>
  z.string().trim().min(1).max(maximo, `${campo} admite hasta ${maximo} caracteres.`).nullable().optional();

/**
 * El reintegro del proveedor: por depósito (cuenta bancaria) o en efectivo (referencia del recibo). Que cada forma lleve lo
 * suyo y que las notas se puedan reintegrar son reglas del dominio y responden por campo.
 */
export const esquemaReintegro = z.object({
  proveedorId: z.uuid({ error: 'Escoja el proveedor.' }),
  forma: z.enum(['deposito', 'efectivo'], { error: 'Escoja si fue un depósito o efectivo.' }),
  fecha: fecha.optional(),
  cuentaBancariaId: z.uuid({ error: 'Escoja la cuenta bancaria.' }).nullable().optional(),
  referencia: texto(100, 'La referencia'),
  observaciones: texto(500, 'Las observaciones'),
  notas: z
    .array(z.object({ notaId: z.uuid({ error: 'Escoja la nota de crédito.' }), monto }))
    .max(MAXIMO_DE_NOTAS, `Un reintegro admite hasta ${MAXIMO_DE_NOTAS} notas de crédito.`),
});

export const esquemaParamsDeReintegro = z.object({ id: z.uuid() });

/** Anular: el motivo es obligatorio; la fecha es la del inverso en Bancos y no cuenta en efectivo. */
export const esquemaAnularReintegro = z.object({
  motivo: z.string().trim().min(1, 'Escriba el motivo.').max(300, 'El motivo admite hasta 300 caracteres.'),
  fecha: fecha.optional(),
});

export type ReintegroSolicitado = z.infer<typeof esquemaReintegro>;
export type ParamsDeReintegro = z.infer<typeof esquemaParamsDeReintegro>;
export type AnularReintegroSolicitado = z.infer<typeof esquemaAnularReintegro>;
