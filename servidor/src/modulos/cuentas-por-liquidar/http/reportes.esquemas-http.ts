import { z } from 'zod';

const comoBooleano = z.enum(['true', 'false']).transform((valor) => valor === 'true');

/** CL-R1: el corte (hoy si falta), un beneficiario y si solo salen los vencidos. */
export const esquemaFiltroDeAnticiposPorLiquidar = z.object({
  corte: z.iso.date().optional(),
  beneficiarioId: z.uuid().optional(),
  soloVencidos: comoBooleano.default(false),
});

/** CL-R2: el período de la liquidación (por omisión, el mes de `hasta`; `hasta`, hoy) y un destino. */
export const esquemaFiltroDeNoLiquidado = z.object({
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  destino: z.enum(['cobrar', 'renta_del_trabajo', 'perdida']).optional(),
});

export type FiltroDeAnticiposPorLiquidarSolicitado = z.output<typeof esquemaFiltroDeAnticiposPorLiquidar>;
export type FiltroDeNoLiquidadoSolicitado = z.output<typeof esquemaFiltroDeNoLiquidado>;
