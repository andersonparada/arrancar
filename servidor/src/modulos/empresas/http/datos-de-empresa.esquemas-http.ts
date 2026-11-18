import { z } from 'zod';
import { fechaObligatoria, textoOpcional } from '../../core/compartido/http/esquemas-comunes.js';

export const esquemaDatosFiscales = z.object({
  razonSocial: textoOpcional(200),
  nombreComercial: textoOpcional(200),
});

export const esquemaFechaDeInicio = z.object({ fechaDeInicio: fechaObligatoria() });

export const esquemaReaperturaDeCarga = z.object({
  motivo: z.string().trim().min(1, 'Escriba el motivo de la reapertura.').max(500),
});

/** El motivo y la huella son opcionales: el dominio decide si el motivo hace falta y si es válido. */
export const esquemaCierreDeCarga = z.object({
  motivo: z.string().max(2000).nullish(),
  huella: z.string().max(100).nullish(),
});

export type CierreSolicitado = z.infer<typeof esquemaCierreDeCarga>;
export type DatosFiscalesSolicitados = z.infer<typeof esquemaDatosFiscales>;
export type FechaDeInicioSolicitada = z.infer<typeof esquemaFechaDeInicio>;
export type ReaperturaSolicitada = z.infer<typeof esquemaReaperturaDeCarga>;
