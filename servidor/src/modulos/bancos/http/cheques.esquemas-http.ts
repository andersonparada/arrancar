import { z } from 'zod';
import {
  decimalObligatorio,
  fechaObligatoria,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al emitir un cheque; las reglas de negocio las revisa el dominio. */
export const esquemaEmisionDeCheque = z.object({
  fecha: fechaObligatoria(),
  monto: decimalObligatorio(2),
  beneficiario: textoObligatorio(150),
  noNegociable: z.boolean().default(true),
  referencia: textoOpcional(150),
  observaciones: textoOpcional(2000),
});

export const esquemaAnulacionDeCheque = z.object({ motivo: z.string().trim().min(1).max(500) });

export const esquemaParamsCuentaBancariaDeCheques = z.object({ cuentaBancariaId: z.uuid() });
export const esquemaParamsCheque = z.object({ chequeId: z.uuid() });

export type EmisionDeChequeSolicitada = z.infer<typeof esquemaEmisionDeCheque>;
export type SolicitudDeAnulacionDeCheque = z.infer<typeof esquemaAnulacionDeCheque>;
export type ParamsCuentaBancariaDeCheques = z.infer<typeof esquemaParamsCuentaBancariaDeCheques>;
export type ParamsCheque = z.infer<typeof esquemaParamsCheque>;
