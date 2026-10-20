import { z } from 'zod';
import { FORMULARIOS_DE_DECLARACION } from '../dominio/periodos/reglas-de-declaracion.js';

/** El período del libro: `AAAA-MM` (mes del 01 al 12). */
const periodo = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Escriba el período como AAAA-MM.');
const motivo = z.string().trim().min(1, 'Escriba el motivo.').max(500, 'El motivo admite hasta 500 caracteres.');

export const esquemaConsultaDePeriodos = z.object({ anio: z.coerce.number().int().min(2000).max(2100).optional() });
export type ConsultaDePeriodosSolicitada = z.infer<typeof esquemaConsultaDePeriodos>;

export const esquemaParamsDePeriodo = z.object({ periodo });
export type ParamsDePeriodo = z.infer<typeof esquemaParamsDePeriodo>;

/** El número y la fecha son opcionales; sin formulario se propone el del régimen del período. */
export const esquemaDeclaracion = z.object({
  formulario: z.enum(FORMULARIOS_DE_DECLARACION).optional(),
  numeroDeFormulario: z.string().trim().max(60, 'El número del formulario es muy largo.').optional(),
  fechaDePresentacion: z.iso.date().optional(),
});
export type DeclaracionSolicitada = z.infer<typeof esquemaDeclaracion>;

export const esquemaReapertura = z.object({ motivo });
export type ReaperturaSolicitada = z.infer<typeof esquemaReapertura>;

/** Apagar el bloqueo pide el motivo (lo valida el caso de uso, que sabe si se apaga). */
export const esquemaApagarControl = z.object({ motivo: z.string().trim().max(500).optional() });
export type ApagarControlSolicitado = z.infer<typeof esquemaApagarControl>;
