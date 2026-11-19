import { z } from 'zod';

/** El reporte es de una chequera; el filtro por estado es opcional. */
export const esquemaParamsCorrelativosDeCheques = z.object({ chequeraId: z.uuid() });

export const esquemaFiltroDeCorrelativosDeCheques = z.object({
  estado: z.enum(['disponible', 'emitido', 'anulado', 'inutilizado', 'sin_registro']).optional(),
});

export type ParamsCorrelativosDeCheques = z.infer<typeof esquemaParamsCorrelativosDeCheques>;
export type FiltroDeCorrelativosDeChequesSolicitado = z.infer<typeof esquemaFiltroDeCorrelativosDeCheques>;
