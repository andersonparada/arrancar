import {
  BANDAS_DE_CORDURA,
  variacionSuperaElLimite,
  variacionSuperaElRechazo,
  VARIACION_MAXIMA_EN_PORCIENTO,
} from './reglas-de-publicacion.js';
import type { PublicacionDeTipoDeCambio, PublicacionRechazada } from './publicacion.js';

export interface OpcionesDeEvaluacion {
  readonly publicaciones: readonly PublicacionDeTipoDeCambio[];
  /** Último valor guardado de la moneda en los 7 días anteriores a la primera publicación, si hay. */
  readonly anterior: string | null;
}

/** Lo que se guarda de una carga, lo que se descarta por variar demasiado y lo que solo merece un aviso. */
export interface Evaluacion {
  readonly aGuardar: PublicacionDeTipoDeCambio[];
  readonly rechazadas: PublicacionRechazada[];
  readonly avisos: string[];
}

/**
 * Compara cada valor con el anterior (el guardado, o el de la fila de antes dentro de la misma carga). Una moneda sin
 * banda de cordura que cambia más de 25 % no se guarda; el cambio de más de 3 %, en cualquier moneda, se guarda con aviso.
 */
export function evaluarVariaciones({ publicaciones, anterior }: OpcionesDeEvaluacion): Evaluacion {
  const evaluacion: Evaluacion = { aGuardar: [], rechazadas: [], avisos: [] };
  let previo = anterior;
  const ordenadas = [...publicaciones].sort((a, b) => a.fecha.localeCompare(b.fecha));
  for (const publicacion of ordenadas) {
    if (previo !== null && rechazaPorVariacion(previo, publicacion)) {
      evaluacion.rechazadas.push({
        moneda: publicacion.moneda,
        fecha: publicacion.fecha,
        motivo: 'variacion_excesiva',
      });
      continue;
    }
    if (previo !== null && variacionSuperaElLimite(previo, publicacion.referencia)) {
      evaluacion.avisos.push(
        `${publicacion.moneda} ${publicacion.fecha}: cambió más de ${VARIACION_MAXIMA_EN_PORCIENTO} % (de ${previo} a ${publicacion.referencia}).`,
      );
    }
    evaluacion.aGuardar.push(publicacion);
    previo = publicacion.referencia;
  }
  return evaluacion;
}

function rechazaPorVariacion(previo: string, publicacion: PublicacionDeTipoDeCambio): boolean {
  return !BANDAS_DE_CORDURA[publicacion.moneda] && variacionSuperaElRechazo(previo, publicacion.referencia);
}
