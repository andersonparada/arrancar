import { z } from 'zod';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;

const texto = (maximo: number, vacio: string) =>
  z.string().trim().min(1, vacio).max(maximo, `Admite hasta ${maximo} caracteres.`);
const motivo = texto(300, 'Escriba el motivo.');

export const esquemaParamsDeDocumentoAnulado = z.object({ id: z.uuid() });

/** Devolución, cobro o sin recuperación: las dos primeras piden monto y a quién se le recupera. */
export const esquemaSalidaDelDocumento = z.object({
  salida: z.enum(['devolucion', 'cobro', 'sin_recuperacion']),
  motivo,
  monto: z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.').nullable().optional(),
  destino: z.enum(['proveedor', 'custodio']).nullable().optional(),
});

export const esquemaReemplazoDelDocumento = z.object({ reemplazoId: z.uuid(), motivo });

/** La disputa lleva el motivo y la referencia de la prueba de pago. */
export const esquemaDisputaDelDocumento = z.object({
  motivo,
  prueba: texto(300, 'Escriba dónde está la prueba de pago.'),
});

export const esquemaConMotivoDelDocumento = z.object({ motivo });

export type SalidaSolicitada = z.infer<typeof esquemaSalidaDelDocumento>;
export type ReemplazoSolicitado = z.infer<typeof esquemaReemplazoDelDocumento>;
export type DisputaSolicitada = z.infer<typeof esquemaDisputaDelDocumento>;
export type ConMotivoDelDocumento = z.infer<typeof esquemaConMotivoDelDocumento>;
export type ParamsDeDocumentoAnulado = z.infer<typeof esquemaParamsDeDocumentoAnulado>;
