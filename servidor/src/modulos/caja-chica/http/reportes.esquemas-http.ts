import { z } from 'zod';

/** CC-R1 y CC-R4: el corte (hoy si falta) y, si se quiere, un solo fondo. */
export const esquemaFiltroAlCorte = z.object({
  corte: z.iso.date().optional(),
  fondoId: z.uuid().optional(),
});

/** CC-R2, CC-R3 y CC-R5: el período (por omisión el mes de `hasta`; `hasta`, hoy) y, si se quiere, un solo fondo. */
export const esquemaFiltroDePeriodo = z.object({
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  fondoId: z.uuid().optional(),
});

export type FiltroAlCorteSolicitado = z.output<typeof esquemaFiltroAlCorte>;
export type FiltroDePeriodoSolicitado = z.output<typeof esquemaFiltroDePeriodo>;
