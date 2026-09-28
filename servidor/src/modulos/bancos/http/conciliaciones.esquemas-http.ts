import { z } from 'zod';
import { decimalObligatorio, idObligatorio } from '../../core/compartido/http/esquemas-comunes.js';

export const esquemaInicioDeConciliacion = z.object({
  cuentaBancariaId: idObligatorio(),
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
  saldoSegunBanco: decimalObligatorio(2),
});

export const esquemaSaldoSegunBanco = z.object({ saldoSegunBanco: decimalObligatorio(2) });

export const esquemaMarcas = z.object({ movimientoIds: z.array(z.uuid()) });

export const esquemaEliminacionDeConciliacion = z.object({ motivo: z.string().trim().min(1).max(500) });

export const esquemaParamsConciliacion = z.object({ conciliacionId: z.uuid() });
export const esquemaParamsCuentaBancariaDeConciliaciones = z.object({ cuentaBancariaId: z.uuid() });

export type InicioDeConciliacionSolicitado = z.infer<typeof esquemaInicioDeConciliacion>;
export type SaldoSegunBancoSolicitado = z.infer<typeof esquemaSaldoSegunBanco>;
export type MarcasSolicitadas = z.infer<typeof esquemaMarcas>;
export type SolicitudDeEliminacionDeConciliacion = z.infer<typeof esquemaEliminacionDeConciliacion>;
export type ParamsConciliacion = z.infer<typeof esquemaParamsConciliacion>;
export type ParamsCuentaBancariaDeConciliaciones = z.infer<typeof esquemaParamsCuentaBancariaDeConciliaciones>;
