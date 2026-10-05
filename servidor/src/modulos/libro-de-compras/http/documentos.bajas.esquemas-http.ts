import { z } from 'zod';
import { CAUSAS_DE_ANULACION } from '../dominio/baja-de-documento.js';
import { DESTINOS_DE_DOCUMENTO } from '../dominio/destinos-de-documento.js';
import { TIPOS_DE_DOCUMENTO } from '../dominio/tipos-de-documento.js';

const LIMITE_POR_OMISION = 50;
const LIMITE_MAXIMO = 200;

export const esquemaParamsDeDocumento = z.object({ documentoId: z.uuid() });

/**
 * Filtros y página de la lista. `periodo` es cualquier fecha del mes del libro; `estado` es `vigente` por omisión
 * (oculta los anulados), `anulado` o `todos`; `pagina` empieza en 1 y `limite` es de 50 por omisión (máximo 200).
 */
export const esquemaFiltroDeDocumentos = z.object({
  periodo: z.iso.date().optional(),
  proveedorId: z.uuid().optional(),
  estado: z.enum(['vigente', 'anulado', 'todos']).default('vigente'),
  destino: z.enum(DESTINOS_DE_DOCUMENTO).optional(),
  tipo: z.enum(TIPOS_DE_DOCUMENTO).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

/** Anular exige la causa (de una lista) y el motivo; el dominio revisa que el motivo no pase de 300 caracteres. */
export const esquemaAnulacionDeDocumento = z.object({
  causa: z.enum(CAUSAS_DE_ANULACION),
  motivo: z.string().trim().min(1, 'Campo obligatorio.'),
});

export type ParamsDeDocumento = z.infer<typeof esquemaParamsDeDocumento>;
export type FiltroDeDocumentosSolicitado = z.output<typeof esquemaFiltroDeDocumentos>;
export type AnulacionDeDocumentoSolicitada = z.infer<typeof esquemaAnulacionDeDocumento>;
