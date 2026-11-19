import { z } from 'zod';
import {
  decimalObligatorio,
  fechaObligatoria,
  opcionObligatoria,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { CLASES_DE_COSTO_ELEGIBLES } from '../dominio/tipos-de-costo.js';

/** Un costo escrito a mano: lleva su documento de soporte y, si queda fuera del libro fiscal, su motivo (V-8). */
export const esquemaCostoManual = z.object({
  claseDeCosto: opcionObligatoria(CLASES_DE_COSTO_ELEGIBLES),
  fecha: fechaObligatoria(),
  monto: decimalObligatorio(2),
  documentoDeSoporte: textoObligatorio(150),
  descripcion: textoOpcional(300),
  aplicaAlLibroFiscal: z.boolean().default(true),
  motivoFueraDelLibroFiscal: textoOpcional(300),
  noEsEdificacion: z.boolean().default(false),
});

export const esquemaAnulacionDeCosto = z.object({ motivo: textoObligatorio(300) });

export const esquemaParamsCosto = z.object({ costoId: z.uuid() });

export type CostoManualSolicitado = z.infer<typeof esquemaCostoManual>;
export type AnulacionDeCostoSolicitada = z.infer<typeof esquemaAnulacionDeCosto>;
export type ParamsCosto = z.infer<typeof esquemaParamsCosto>;
