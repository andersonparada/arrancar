import { z } from 'zod';
import { fechaObligatoria, textoObligatorio } from '../../compartido/http/esquemas-comunes.js';
import { diasEntre } from '../dominio/tipo-vigente.js';
import { codigoDeMoneda } from './monedas.esquemas-http.js';

/** El rango más largo que entrega la serie, en días de calendario (ambos extremos incluidos). */
const DIAS_MAXIMOS_DE_SERIE = 366;

export const esquemaConsultaSerie = z
  .object({ moneda: codigoDeMoneda(), desde: fechaObligatoria(), hasta: fechaObligatoria() })
  .refine(({ desde, hasta }) => desde <= hasta, { message: 'La fecha inicial no puede ser posterior a la final.' })
  .refine(({ desde, hasta }) => diasEntre(desde, hasta) < DIAS_MAXIMOS_DE_SERIE, {
    message: `El rango no puede pasar de ${DIAS_MAXIMOS_DE_SERIE} días.`,
  });

export const esquemaConsultaVigente = z.object({ moneda: codigoDeMoneda(), fecha: fechaObligatoria() });

export const esquemaParamsVersiones = z.object({ moneda: codigoDeMoneda(), fecha: fechaObligatoria() });

const decimalOpcionalDeTipo = () => z.string().trim().max(32).nullish();

/** El tipo de un día que soporte ingresa o corrige; el motivo es obligatorio. */
export const esquemaTipoManual = z.object({
  moneda: codigoDeMoneda(),
  fecha: fechaObligatoria(),
  referencia: z.string().trim().min(1, 'Escriba el tipo de cambio.').max(32),
  compra: decimalOpcionalDeTipo(),
  venta: decimalOpcionalDeTipo(),
  motivo: textoObligatorio(300),
});

export type ConsultaSerie = z.infer<typeof esquemaConsultaSerie>;
export type ConsultaVigente = z.infer<typeof esquemaConsultaVigente>;
export type ParamsVersiones = z.infer<typeof esquemaParamsVersiones>;
export type TipoManual = z.infer<typeof esquemaTipoManual>;
