import { z } from 'zod';

/** Intereses y retenciones: un rango de fechas (`AAAA-MM-DD`, incluidas) y, si se quiere, una sola cuenta. */
export const esquemaFiltroDeIntereses = z
  .object({
    desde: z.iso.date(),
    hasta: z.iso.date(),
    cuentaBancariaId: z.uuid().optional(),
  })
  .refine(({ desde, hasta }) => desde <= hasta, {
    message: 'La fecha inicial no puede ser posterior a la final.',
    path: ['desde'],
  });

export type FiltroDeInteresesSolicitado = z.infer<typeof esquemaFiltroDeIntereses>;
