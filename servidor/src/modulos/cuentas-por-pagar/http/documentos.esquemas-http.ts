import { z } from 'zod';
import { ESTADOS_DE_DOCUMENTO, ORIGENES_DE_DOCUMENTO, TIPOS_DE_DOCUMENTO } from '../dominio/tipos-de-documento.js';

const LIMITE_POR_OMISION = 50;
const LIMITE_MAXIMO = 200;

export const esquemaParamsDeDocumento = z.object({ documentoId: z.uuid() });
export const esquemaParamsDeProveedor = z.object({ proveedorId: z.uuid() });

const comoBooleano = z.enum(['true', 'false']).transform((valor) => valor === 'true');

/**
 * Filtros de la lista, todos opcionales. `estado` es uno de los estados, `vigente` (todo menos lo anulado, por
 * omisión) o `todos`. `origen` limita a `libro_de_compras` o `saldo_inicial`. Las fechas son de emisión, incluidas; `soloVencidos` trae los cargos con saldo ya vencidos.
 * `pagina` empieza en 1 y `limite` es de 50 por omisión (máximo 200).
 */
export const esquemaFiltroDeDocumentos = z.object({
  proveedorId: z.uuid().optional(),
  estado: z.enum([...ESTADOS_DE_DOCUMENTO, 'vigente', 'todos']).default('vigente'),
  tipo: z.enum(TIPOS_DE_DOCUMENTO).optional(),
  origen: z.enum(ORIGENES_DE_DOCUMENTO).optional(),
  emitidosDesde: z.iso.date().optional(),
  emitidosHasta: z.iso.date().optional(),
  soloVencidos: comoBooleano.optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

export type ParamsDeDocumento = z.infer<typeof esquemaParamsDeDocumento>;
export type ParamsDeProveedor = z.infer<typeof esquemaParamsDeProveedor>;
export type FiltroDeDocumentosSolicitado = z.output<typeof esquemaFiltroDeDocumentos>;
