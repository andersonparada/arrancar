import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { sumarDecimales } from '../compartido/cantidades';
import type { EdicionDeRenglon } from './edicion-de-renglones';

interface DatosDelResumen {
  tipo: 'entrada' | 'salida';
  fecha: string;
  bodega: string;
  renglones: EdicionDeRenglon[];
}

const articulos = (n: number) => (n === 1 ? '1 artículo' : `${n} artículos`);

/** El costo total que el usuario escribió en una entrada, o `null` si no escribió ninguno. */
export const costoEscrito = (renglones: EdicionDeRenglon[]): string | null =>
  sumarDecimales(
    renglones.map((renglon) => String(renglon.costoTotal ?? '').trim() || null),
    2,
  );

/**
 * Lo que va a pasar al guardar, para confirmarlo: qué se registra, dónde, cuánto cuesta (entradas) y que el costo de
 * una salida lo pone el método de costeo, no quien la registra.
 */
export function resumenDeDocumento({ tipo, fecha, bodega, renglones }: DatosDelResumen): string {
  const cantidad = articulos(renglones.length);
  if (tipo === 'salida') {
    return `Saldrán ${cantidad} de «${bodega}» con fecha ${formatearFecha(fecha)}. El costo lo calcula el método de costeo de la empresa. Si el mes sigue abierto, podrá anularla con un motivo.`;
  }
  const costo = costoEscrito(renglones);
  const total = costo === null ? '' : ` por un costo total de ${formatearMonto(costo)}`;
  return `Entrarán ${cantidad} a «${bodega}» con fecha ${formatearFecha(fecha)}${total}. Si el mes sigue abierto, podrá anularla con un motivo.`;
}
