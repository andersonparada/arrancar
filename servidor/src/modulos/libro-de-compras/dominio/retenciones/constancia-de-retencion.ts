import { normalizarSerieONumero } from '../documento-de-compra.js';
import {
  ConstanciaAnteriorALaRetencion,
  FechaDeConstanciaInvalida,
  MotivoDeLaConstanciaInvalido,
  NumeroDeConstanciaInvalido,
} from './errores-de-retenciones.js';

const MAXIMO_DEL_NUMERO = 40;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export interface ConstanciaAnotada {
  numero: string;
  fecha: string;
}

/** El número en mayúsculas y sin espacios, de 1 a 40 caracteres; @throws NumeroDeConstanciaInvalido. */
export function numeroDeConstanciaValido(numero: string): string {
  const limpio = normalizarSerieONumero(numero);
  if (limpio.length === 0 || limpio.length > MAXIMO_DEL_NUMERO) throw new NumeroDeConstanciaInvalido();
  return limpio;
}

/**
 * La constancia lista para guardar. La fecha no puede ser anterior a la de la retención.
 * @throws NumeroDeConstanciaInvalido, FechaDeConstanciaInvalida o ConstanciaAnteriorALaRetencion.
 */
export function constanciaValida(constancia: ConstanciaAnotada, fechaDeLaRetencion: string): ConstanciaAnotada {
  const numero = numeroDeConstanciaValido(constancia.numero);
  if (!FECHA.test(constancia.fecha) || Number.isNaN(Date.parse(constancia.fecha))) {
    throw new FechaDeConstanciaInvalida();
  }
  if (constancia.fecha < fechaDeLaRetencion) throw new ConstanciaAnteriorALaRetencion(fechaDeLaRetencion);
  return { numero, fecha: constancia.fecha };
}

/** El motivo de quitar una constancia: de 1 a 300 caracteres. */
export function motivoDeQuitarValido(motivo: string): string {
  const limpio = motivo.trim();
  if (limpio.length === 0 || limpio.length > 300) throw new MotivoDeLaConstanciaInvalido();
  return limpio;
}
