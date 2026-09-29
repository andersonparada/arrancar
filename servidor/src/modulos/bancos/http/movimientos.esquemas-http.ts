import { z } from 'zod';

export const esquemaParamsMovimiento = z.object({ movimientoId: z.uuid() });

/** `fecha` es la del inverso: la escribe el usuario; por omisión, hoy. */
export const esquemaAnulacion = z.object({
  motivo: z.string().trim().min(1).max(500),
  fecha: z.iso.date().optional(),
});

export const esquemaEliminacion = z.object({ motivo: z.string().trim().min(1).max(500) });

/** Filtros del reporte y de su exportación: de una cuenta y entre dos fechas (`AAAA-MM-DD`, incluidas). */
export const esquemaFiltroDeMovimientos = z.object({
  cuentaBancariaId: z.uuid().optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  conceptoId: z.uuid().optional(),
});

export type ParamsMovimiento = z.infer<typeof esquemaParamsMovimiento>;
export type SolicitudDeAnulacion = z.infer<typeof esquemaAnulacion>;
export type SolicitudDeEliminacion = z.infer<typeof esquemaEliminacion>;
export type FiltroSolicitado = z.infer<typeof esquemaFiltroDeMovimientos>;
