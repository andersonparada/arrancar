import { fechasDelRango, sumarDiasAFecha } from './fechas-de-publicacion.js';
import type { PublicacionDeTipoDeCambio } from './publicacion.js';

/** Días que se revisan hacia atrás al arrancar y una vez al día para rellenar huecos. */
export const DIAS_DE_RELLENO = 45;

/** El rango que se revisa para rellenar: los últimos {@link DIAS_DE_RELLENO} días hasta hoy. */
export function rangoDeRelleno(hoy: string): { desde: string; hasta: string } {
  return { desde: sumarDiasAFecha(hoy, -(DIAS_DE_RELLENO - 1)), hasta: hoy };
}

/**
 * Las fechas del rango en las que `moneda` no tiene publicación entre `conocidas` (las ya guardadas).
 * Un día sin publicación no bloquea nada: solo queda pendiente de pedirse.
 */
export function fechasSinPublicacion(
  rango: { desde: string; hasta: string },
  moneda: string,
  conocidas: readonly Pick<PublicacionDeTipoDeCambio, 'moneda' | 'fecha'>[],
): string[] {
  const tenidas = new Set(conocidas.filter((p) => p.moneda === moneda).map((p) => p.fecha));
  return fechasDelRango(rango.desde, rango.hasta).filter((fecha) => !tenidas.has(fecha));
}
