import { fechasDelRango, sumarDiasAFecha } from './fechas-de-publicacion.js';
import type { PublicacionDeTipoDeCambio } from './publicacion.js';

/** Días que se revisan hacia atrás al arrancar y una vez al día para rellenar huecos. */
export const DIAS_DE_RELLENO = 45;

/** El rango que se revisa para rellenar: los últimos {@link DIAS_DE_RELLENO} días hasta hoy. */
export function rangoDeRelleno(hoy: string): { desde: string; hasta: string } {
  return { desde: sumarDiasAFecha(hoy, -(DIAS_DE_RELLENO - 1)), hasta: hoy };
}

export interface OpcionesDeHuecos {
  readonly rango: { desde: string; hasta: string };
  readonly moneda: string;
  /** Lo ya guardado. */
  readonly conocidas: readonly Pick<PublicacionDeTipoDeCambio, 'moneda' | 'fecha'>[];
  /**
   * Los días en que se espera publicación. Sin él, todos los del rango (el USD publica cada día calendario);
   * para las demás monedas, quien llama pasa los días hábiles (lunes a viernes sin asuetos).
   */
  readonly diasEsperados?: ReadonlySet<string>;
}

/**
 * Las fechas esperadas del rango en las que `moneda` no tiene publicación entre las `conocidas`.
 * Un día sin publicación no bloquea nada: solo queda pendiente de pedirse.
 */
export function fechasSinPublicacion(opciones: OpcionesDeHuecos): string[] {
  const { rango, moneda, conocidas, diasEsperados } = opciones;
  const tenidas = new Set(conocidas.filter((p) => p.moneda === moneda).map((p) => p.fecha));
  return fechasDelRango(rango.desde, rango.hasta).filter(
    (fecha) => !tenidas.has(fecha) && (diasEsperados?.has(fecha) ?? true),
  );
}
