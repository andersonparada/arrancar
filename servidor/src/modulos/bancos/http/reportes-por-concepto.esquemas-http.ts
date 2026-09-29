import { z } from 'zod';
import type { FiltroDeTotalesPorConcepto } from '../aplicacion/dto/reportes-por-concepto.dto.js';

const UNA_LLAVE = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const LISTA_DE_LLAVES = new RegExp(`^${UNA_LLAVE}(,${UNA_LLAVE}){0,49}$`);

const rangoValido = ({ desde, hasta }: { desde: string; hasta: string }) => desde <= hasta;
const MENSAJE_DEL_RANGO = { message: 'La fecha inicial no puede ser posterior a la final.', path: ['desde'] };

/** Flujo de efectivo: un rango de fechas (`AAAA-MM-DD`, incluidas) y, si se quiere, una sola cuenta. */
export const esquemaFiltroDeFlujoDeEfectivo = z
  .object({
    desde: z.iso.date(),
    hasta: z.iso.date(),
    cuentaBancariaId: z.uuid().optional(),
  })
  .refine(rangoValido, MENSAJE_DEL_RANGO);

/** Movimientos por concepto: además, hasta 50 conceptos separados por coma (sin ellos, todos). */
export const esquemaFiltroDeMovimientosPorConcepto = z
  .object({
    desde: z.iso.date(),
    hasta: z.iso.date(),
    cuentaBancariaId: z.uuid().optional(),
    conceptoIds: z.string().regex(LISTA_DE_LLAVES).optional(),
  })
  .refine(rangoValido, MENSAJE_DEL_RANGO);

export type FiltroDeFlujoSolicitado = z.infer<typeof esquemaFiltroDeFlujoDeEfectivo>;
export type FiltroPorConceptoSolicitado = z.infer<typeof esquemaFiltroDeMovimientosPorConcepto>;

/** El filtro que entiende el caso de uso: los conceptos como lista. */
export function aFiltroDeTotales(solicitado: FiltroPorConceptoSolicitado): FiltroDeTotalesPorConcepto {
  const { conceptoIds, ...resto } = solicitado;
  return { ...resto, conceptoIds: conceptoIds?.split(',') };
}
