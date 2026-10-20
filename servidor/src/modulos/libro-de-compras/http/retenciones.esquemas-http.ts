import { z } from 'zod';
import { GRUPOS_DE_ENTERO } from '../dominio/retenciones/grupo-de-entero.js';

const MES = /^\d{4}-(0[1-9]|1[0-2])(-01)?$/;
const DINERO = /^\d{1,12}(\.\d{1,2})?$/;
const MAXIMO_DE_CONSTANCIAS_EN_LOTE = 200;

const mes = z.string().regex(MES, 'Escriba el mes como AAAA-MM.');
const dinero = z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.');
const texto = z.string().trim().min(1, 'Campo obligatorio.');

export const esquemaParamsDeRetencion = z.object({ id: z.uuid() });
export const esquemaParamsDeEntero = z.object({ id: z.uuid() });

/** Mes y filtros del reporte: grupo de entero, constancia (`con`, `sin`, `todas`) y estado del documento. */
export const esquemaFiltroDeRetenciones = z.object({
  mes,
  grupo: z.enum(GRUPOS_DE_ENTERO).optional(),
  constancia: z.enum(['con', 'sin', 'todas']).default('todas'),
  documentos: z.enum(['vigentes', 'anulados', 'todos']).default('todos'),
});

export const esquemaConstancia = z.object({ numero: texto, fecha: z.iso.date() });

export const esquemaConstanciasEnLote = z.object({
  constancias: z
    .array(z.object({ retencionId: z.uuid(), numero: texto, fecha: z.iso.date() }))
    .min(1, 'Marque al menos una retención.')
    .max(MAXIMO_DE_CONSTANCIAS_EN_LOTE, `Hasta ${MAXIMO_DE_CONSTANCIAS_EN_LOTE} constancias por vez.`),
});

export const esquemaQuitarConstancia = z.object({ motivo: texto });

export const esquemaResolucion = z.object({ resolucion: texto, nota: z.string().trim().nullish() });

export const esquemaDePorResolver = z.object({ estado: z.enum(['pendiente', 'resueltas']).default('pendiente') });

export const esquemaDeAnio = z.object({ anio: z.coerce.number().int().min(2000).max(2100) });

const camposDelPago = {
  fechaDePago: z.iso.date(),
  documentoDePago: texto,
  monto: dinero,
  observaciones: z.string().trim().nullish(),
};

export const esquemaNuevoEntero = z.object({ mes, grupo: z.enum(GRUPOS_DE_ENTERO), ...camposDelPago });
export const esquemaCorregirEntero = z.object(camposDelPago);
export const esquemaAnularEntero = z.object({ motivo: texto });

export type FiltroDeRetencionesSolicitado = z.output<typeof esquemaFiltroDeRetenciones>;
export type ParamsDeRetencion = z.infer<typeof esquemaParamsDeRetencion>;
export type ParamsDeEntero = z.infer<typeof esquemaParamsDeEntero>;
export type ConstanciaSolicitada = z.infer<typeof esquemaConstancia>;
export type ConstanciasEnLoteSolicitadas = z.infer<typeof esquemaConstanciasEnLote>;
export type QuitarConstanciaSolicitado = z.infer<typeof esquemaQuitarConstancia>;
export type ResolucionSolicitada = z.infer<typeof esquemaResolucion>;
export type PorResolverSolicitado = z.output<typeof esquemaDePorResolver>;
export type AnioSolicitado = z.output<typeof esquemaDeAnio>;
export type NuevoEnteroSolicitado = z.infer<typeof esquemaNuevoEntero>;
export type CorregirEnteroSolicitado = z.infer<typeof esquemaCorregirEntero>;
export type AnularEnteroSolicitado = z.infer<typeof esquemaAnularEntero>;
