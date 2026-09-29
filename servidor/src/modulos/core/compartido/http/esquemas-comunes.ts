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

const nuloSiFalta = <Valor>(valor: Valor | null | undefined): Valor | null => valor ?? null;

export const enteroObligatorio = () => z.number().int('Escriba un número entero.');

/** Número entero que puede faltar: llega como `null`. */
export const enteroOpcional = () => enteroObligatorio().nullish().transform(nuloSiFalta);

/** Dígitos totales de las columnas `numeric(14, n)`: la parte entera admite 14 menos los decimales. */
const DIGITOS_TOTALES = 14;

const conDecimales = (decimales: number) =>
  z
    .string()
    .regex(new RegExp(`^-?\\d+(\\.\\d{1,${decimales}})?$`), `Escriba un número con hasta ${decimales} decimales.`)
    .refine(
      (texto) =>
        texto
          .replace(/^-/, '')
          .split('.')[0]!
          .replace(/^0+(?=\d)/, '').length <=
        DIGITOS_TOTALES - decimales,
      'El número es demasiado grande.',
    );

const textoDeNumero = (valor: string | number | null | undefined) => {
  const texto = valor === null || valor === undefined ? '' : String(valor).trim();
  return texto || null;
};

/**
 * Número con decimales (montos, pesos, áreas). Viaja como texto ("1250.50") para
 * no perder precisión; también acepta un número.
 */
export const decimalObligatorio = (decimales: number) =>
  z
    .union([z.string(), z.number()])
    .transform((valor) => String(valor).trim())
    .pipe(conDecimales(decimales));

export const decimalOpcional = (decimales: number) =>
  z.union([z.string(), z.number()]).nullish().transform(textoDeNumero).pipe(conDecimales(decimales).nullable());

/** Fecha sin hora: `aaaa-mm-dd`. */
export const fechaObligatoria = () => z.iso.date('Escriba una fecha válida (aaaa-mm-dd).');

export const fechaOpcional = () =>
  z
    .union([fechaObligatoria(), z.literal('')])
    .nullish()
    .transform((valor) => valor || null);

/** El id de otro registro que se eligió en un selector. */
export const idObligatorio = () => z.uuid('Elija una opción.');

/** El id de otro registro, si se eligió; sin elegir llega como `null`. */
export const idOpcional = () =>
  z
    .union([idObligatorio(), z.literal('')])
    .nullish()
    .transform((valor) => valor || null);

/** Una de las opciones de una lista fija. */
export const opcionObligatoria = <const Opciones extends readonly [string, ...string[]]>(opciones: Opciones) =>
  z.enum(opciones);

export const opcionOpcional = <const Opciones extends readonly [string, ...string[]]>(opciones: Opciones) =>
  z.enum(opciones).nullish().transform(nuloSiFalta);
