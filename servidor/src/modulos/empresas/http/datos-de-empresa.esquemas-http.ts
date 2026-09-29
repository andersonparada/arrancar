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

export type DatosFiscalesSolicitados = z.infer<typeof esquemaDatosFiscales>;
export type FechaDeInicioSolicitada = z.infer<typeof esquemaFechaDeInicio>;
export type ReaperturaSolicitada = z.infer<typeof esquemaReaperturaDeCarga>;
