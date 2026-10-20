import { z } from 'zod';

/** El período del libro: `AAAA-MM` (mes del 01 al 12). */
const periodo = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Escriba el período como AAAA-MM.');

export const esquemaConsultaDelLibro = z.object({ periodo });
export type ConsultaDelLibroSolicitada = z.infer<typeof esquemaConsultaDelLibro>;

const motivo = z.string().trim().min(1, 'Escriba el motivo.').max(300, 'El motivo admite hasta 300 caracteres.');

export const esquemaEmisionDelLibro = z.object({ periodo, motivo: motivo.optional() });
export type EmisionDelLibroSolicitada = z.infer<typeof esquemaEmisionDelLibro>;

export const esquemaConsultaDeEmisiones = z.object({ periodo: periodo.optional() });
export type ConsultaDeEmisionesSolicitada = z.infer<typeof esquemaConsultaDeEmisiones>;

export const esquemaParamsDeEmision = z.object({ emisionId: z.uuid() });
export type ParamsDeEmision = z.infer<typeof esquemaParamsDeEmision>;

export const esquemaCorreccionDelFolio = z.object({
  ultimoFolio: z.number().int('El folio es un número entero.').min(0).max(99_999_999),
  motivo,
});
export type CorreccionDelFolioSolicitada = z.infer<typeof esquemaCorreccionDelFolio>;
