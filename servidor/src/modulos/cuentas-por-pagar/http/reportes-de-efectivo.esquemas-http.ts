import { z } from 'zod';

const comoBooleano = z.enum(['true', 'false']).transform((valor) => valor === 'true');
const mes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes se escribe AAAA-MM.');

/** R9: los meses `AAAA-MM` (por omisión los últimos 12; máximo 48), un proveedor y si solo salen los que tienen efecto fiscal. */
export const esquemaFiltroDeBancarizacion = z.object({
  desde: mes.optional(),
  hasta: mes.optional(),
  proveedorId: z.uuid().optional(),
  soloConEfecto: comoBooleano.default(true),
});

/** R10: el corte (hoy si falta) y parte del nombre del custodio. */
export const esquemaFiltroDeRetirosPorLiquidar = z.object({
  corte: z.iso.date().optional(),
  custodio: z.string().trim().min(1).max(120).optional(),
});

/** R11: el corte (el fin del mes anterior si falta) y una cuenta bancaria. */
export const esquemaFiltroDeNotasSinAplicar = z.object({
  corte: z.iso.date().optional(),
  cuentaBancariaId: z.uuid().optional(),
});

export type FiltroDeBancarizacionSolicitado = z.output<typeof esquemaFiltroDeBancarizacion>;
export type FiltroDeRetirosPorLiquidarSolicitado = z.output<typeof esquemaFiltroDeRetirosPorLiquidar>;
export type FiltroDeNotasSinAplicarSolicitado = z.output<typeof esquemaFiltroDeNotasSinAplicar>;
