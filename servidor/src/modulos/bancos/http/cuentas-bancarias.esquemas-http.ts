import { z } from 'zod';
import {
  idObligatorio,
  opcionObligatoria,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar una cuenta bancaria; las reglas de negocio las revisa el dominio. */
export const esquemaCuentaBancaria = z.object({
  nombre: textoObligatorio(150),
  bancoId: idObligatorio(),
  numero: textoObligatorio(150),
  tipo: opcionObligatoria(['monetaria', 'ahorro']),
  observaciones: textoOpcional(2000),
  activo: z.boolean().default(true),
});

export const esquemaParamsCuentaBancaria = z.object({ cuentaBancariaId: z.uuid() });

export type CuentaBancariaSolicitado = z.infer<typeof esquemaCuentaBancaria>;
export type ParamsCuentaBancaria = z.infer<typeof esquemaParamsCuentaBancaria>;
