import { z } from 'zod';
import { decimalOpcional, idObligatorio } from '../../core/compartido/http/esquemas-comunes.js';

export const esquemaInicioDeConciliacion = z.object({
  cuentaBancariaId: idObligatorio(),
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
});

export const esquemaMarcas = z.object({ movimientoIds: z.array(z.uuid()) });

/** El saldo final del estado de cuenta; sin valor o `null` lo borra. Puede ser negativo (sobregiro). */
export const esquemaSaldoDelEstadoDeCuenta = z.object({ saldoEstadoDeCuenta: decimalOpcional(2) });

export const esquemaMotivo = z.object({ motivo: z.string().trim().min(1).max(500) });

export const esquemaParamsConciliacion = z.object({ conciliacionId: z.uuid() });
export const esquemaParamsCuentaBancariaDeConciliaciones = z.object({ cuentaBancariaId: z.uuid() });

export type InicioDeConciliacionSolicitado = z.infer<typeof esquemaInicioDeConciliacion>;
export type MarcasSolicitadas = z.infer<typeof esquemaMarcas>;
export type SaldoDelEstadoDeCuentaSolicitado = z.infer<typeof esquemaSaldoDelEstadoDeCuenta>;
export type SolicitudConMotivo = z.infer<typeof esquemaMotivo>;
export type ParamsConciliacion = z.infer<typeof esquemaParamsConciliacion>;
export type ParamsCuentaBancariaDeConciliaciones = z.infer<typeof esquemaParamsCuentaBancariaDeConciliaciones>;
