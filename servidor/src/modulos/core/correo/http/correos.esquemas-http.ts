import { z } from 'zod';
import { ESTADOS_DE_CORREO } from '../dominio/estado-de-correo.js';

const LIMITE_POR_OMISION = 50;
const LIMITE_MAXIMO = 200;

export const esquemaParamsDeCorreo = z.object({ id: z.uuid() });

const fecha = (campo: string) => z.iso.date({ error: `Escriba ${campo} como AAAA-MM-DD.` });

/** Filtros del historial: fechas de creación del correo, estado y tipo (`<modulo>.<nombre>`). */
export const esquemaFiltroDeCorreos = z.object({
  desde: fecha('la fecha inicial').optional(),
  hasta: fecha('la fecha final').optional(),
  estado: z.enum(ESTADOS_DE_CORREO).optional(),
  tipo: z
    .string()
    .regex(/^[a-z-]+\.[a-z_]+$/, 'Tipo de correo no válido.')
    .optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

/** El motivo se valida en el caso de uso (de 1 a 300 caracteres). */
export const esquemaCancelacionDeCorreo = z.object({ motivo: z.string() });

export type ParamsDeCorreo = z.infer<typeof esquemaParamsDeCorreo>;
export type FiltroDeCorreosSolicitado = z.output<typeof esquemaFiltroDeCorreos>;
export type CancelacionDeCorreoSolicitada = z.infer<typeof esquemaCancelacionDeCorreo>;
