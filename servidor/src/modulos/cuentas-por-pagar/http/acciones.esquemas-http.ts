import { z } from 'zod';
import { MAXIMO_POR_LOTE } from '../dominio/ciclo-de-vida.js';

const vencimiento = z.iso.date();

/** Completar en la bandeja: cada documento con el vencimiento confirmado; sin él queda el propuesto al recibirlo. */
export const esquemaCompletarDocumentos = z.object({
  documentos: z
    .array(z.object({ id: z.uuid(), vencimiento: vencimiento.optional() }))
    .min(1)
    .max(MAXIMO_POR_LOTE),
});

export const esquemaAutorizarDocumentos = z.object({
  ids: z.array(z.uuid()).min(1).max(MAXIMO_POR_LOTE),
});

export const esquemaCambiarVencimiento = z.object({ vencimiento });

/** El motivo se valida en el caso de uso (de 1 a 300 caracteres, sin espacios sobrantes). */
export const esquemaDesautorizarDocumento = z.object({ motivo: z.string() });

export type CompletarDocumentosSolicitado = z.infer<typeof esquemaCompletarDocumentos>;
export type AutorizarDocumentosSolicitado = z.infer<typeof esquemaAutorizarDocumentos>;
export type CambiarVencimientoSolicitado = z.infer<typeof esquemaCambiarVencimiento>;
export type DesautorizarDocumentoSolicitado = z.infer<typeof esquemaDesautorizarDocumento>;
