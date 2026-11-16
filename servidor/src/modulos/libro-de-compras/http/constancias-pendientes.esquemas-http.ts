import { z } from 'zod';
import { GRUPOS_DE_ENTERO } from '../dominio/retenciones/grupo-de-entero.js';

/** Filtros de las constancias pendientes: el último mes (`AAAA-MM`, por omisión el en curso), el grupo y el proveedor. */
export const esquemaFiltroDeConstanciasPendientes = z.object({
  hasta: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])(-01)?$/, 'Escriba el mes como AAAA-MM.')
    .optional(),
  grupo: z.enum(GRUPOS_DE_ENTERO).optional(),
  proveedorId: z.uuid().optional(),
});

export type FiltroDeConstanciasPendientesSolicitado = z.output<typeof esquemaFiltroDeConstanciasPendientes>;
