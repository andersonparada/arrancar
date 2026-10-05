import { z } from 'zod';
import { fechaObligatoria, idObligatorio, textoObligatorio } from '../../compartido/http/esquemas-comunes.js';

export const esquemaConsultaFeriados = z.object({
  anio: z.coerce.number().int().min(2000, 'Año fuera de rango.').max(2100, 'Año fuera de rango.'),
});

export const esquemaAsuetoSolicitado = z.object({
  fecha: fechaObligatoria(),
  nombre: textoObligatorio(120),
});

export const esquemaParamsAsueto = z.object({ id: idObligatorio() });

export type ConsultaFeriados = z.infer<typeof esquemaConsultaFeriados>;
export type AsuetoSolicitado = z.infer<typeof esquemaAsuetoSolicitado>;
export type ParamsAsueto = z.infer<typeof esquemaParamsAsueto>;
