import { z } from 'zod';

/**
 * Texto opcional con tope: sin espacios a los lados y el vacío es nulo, como piden las restricciones de las tablas
 * (así el vacío o los espacios no llegan a la base y dan 400 por campo, nunca 500).
 */
export const textoOpcional = (maximo: number, aviso: string) =>
  z
    .string()
    .trim()
    .max(maximo, aviso)
    .transform((valor) => (valor === '' ? null : valor))
    .nullable()
    .optional();
