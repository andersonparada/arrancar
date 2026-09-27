import { z } from 'zod';
import { esDpiValido, normalizarDpi } from '../dominio/objetos-valor/dpi.js';
import { esNitValido, normalizarNit } from '../dominio/objetos-valor/nit.js';

/** Texto opcional: recorta espacios y convierte la cadena vacía en `null`. */
export const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo)
    .nullish()
    .transform((v) => v || null);

export const textoObligatorio = (maximo: number) => z.string().trim().min(1, 'Campo obligatorio.').max(maximo);

export const correoOpcional = z
  .union([z.email('Correo inválido.'), z.literal('')])
  .nullish()
  .transform((v) => v || null);

/** Nombres y apellidos de una persona; los apellidos pueden faltar. */
export const nombresYApellidos = {
  nombres: textoObligatorio(80),
  apellidos: z.string().trim().max(80).default(''),
};

/** NIT guatemalteco opcional, normalizado y con dígito verificador validado. */
export const nitOpcional = z
  .string()
  .nullish()
  .transform((v) => (v?.trim() ? normalizarNit(v) : null))
  .refine((v) => v === null || esNitValido(v), 'El NIT no es válido (revise el dígito verificador).');

/** DPI (CUI) guatemalteco opcional, normalizado y con verificador y ubicación validados. */
export const dpiOpcional = z
  .string()
  .nullish()
  .transform((v) => (v?.trim() ? normalizarDpi(v) : null))
  .refine((v) => v === null || esDpiValido(v), 'El DPI no es válido (revise los 13 dígitos).');
