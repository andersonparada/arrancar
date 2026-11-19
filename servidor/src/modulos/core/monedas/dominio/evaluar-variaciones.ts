import { inversionProbable, promedioPublicado } from './cruces-del-banguat.js';
import {
  BANDAS_DE_CORDURA,
  variacionSuperaElLimite,
  variacionSuperaElRechazo,
  VARIACION_MAXIMA_EN_PORCIENTO,
} from './reglas-de-publicacion.js';
import type { MotivoDeRechazo, PublicacionDeTipoDeCambio, PublicacionRechazada } from './publicacion.js';

export interface OpcionesDeEvaluacion {
  readonly publicaciones: readonly PublicacionDeTipoDeCambio[];
  /** Último valor en quetzales guardado de la moneda en los 7 días anteriores a la primera publicación, si hay. */
  readonly anterior: string | null;
  /** Último valor publicado (promedio, en su convención) en esos 7 días, solo para las monedas que se cruzan. */
  readonly anteriorPublicado?: string | null;
}

/** Lo que se guarda de una carga, lo que se descarta y por qué, y lo que solo merece un aviso. */
export interface Evaluacion {
  readonly aGuardar: PublicacionDeTipoDeCambio[];
  readonly rechazadas: PublicacionRechazada[];
  readonly avisos: string[];
}

/** Lo último aceptado de la moneda: en quetzales y, en los cruces, tal como se publicó. */
interface Previos {
  referencia: string | null;
  publicado: string | null;
}

const esCruce = (p: PublicacionDeTipoDeCambio): boolean =>
  p.convencion === 'usd_por_unidad' || p.convencion === 'unidades_por_usd';

/** El promedio publicado de un cruce, o `null` si no lo es o no trae compra y venta. */
function publicadoDe(p: PublicacionDeTipoDeCambio): string | null {
  if (!esCruce(p) || p.compra === undefined || p.venta === undefined) return null;
  return promedioPublicado(p.compra, p.venta) ?? null;
}

function rechazaPorVariacion(previo: string, publicacion: PublicacionDeTipoDeCambio): boolean {
  return !BANDAS_DE_CORDURA[publicacion.moneda] && variacionSuperaElRechazo(previo, publicacion.referencia);
}

/** Comprobaciones 5 (inversión probable) y 6 (variación excesiva en quetzales) de la adenda B.6, en ese orden. */
function motivoDelRechazo(previos: Previos, publicacion: PublicacionDeTipoDeCambio): MotivoDeRechazo | null {
  const publicado = publicadoDe(publicacion);
  if (publicado !== null && previos.publicado !== null && inversionProbable(publicado, previos.publicado))
    return 'convencion_dudosa';
  if (previos.referencia !== null && rechazaPorVariacion(previos.referencia, publicacion)) return 'variacion_excesiva';
  return null;
}

/** Comprobación 7: más de 3 % en lo publicado o en quetzales se guarda, con aviso. */
function avisoDe(previos: Previos, publicacion: PublicacionDeTipoDeCambio): string | null {
  const publicado = publicadoDe(publicacion);
  const enQuetzales =
    previos.referencia !== null && variacionSuperaElLimite(previos.referencia, publicacion.referencia);
  const enLoPublicado =
    publicado !== null && previos.publicado !== null && variacionSuperaElLimite(previos.publicado, publicado);
  if (!enQuetzales && !enLoPublicado) return null;
  const { moneda, fecha, referencia } = publicacion;
  return `${moneda} ${fecha}: cambió más de ${VARIACION_MAXIMA_EN_PORCIENTO} % (de ${previos.referencia ?? 'sin dato'} a ${referencia}).`;
}

/**
 * Compara cada valor con el anterior (el guardado, o el de la fila de antes dentro de la misma carga). En las monedas
 * que se cruzan, un valor publicado que parece la moneda al revés no se guarda (`convencion_dudosa`); una moneda sin
 * banda de cordura que cambia más de 25 % tampoco (`variacion_excesiva`); el cambio de más de 3 %, en cualquier
 * moneda, se guarda con aviso.
 */
export function evaluarVariaciones(opciones: OpcionesDeEvaluacion): Evaluacion {
  const evaluacion: Evaluacion = { aGuardar: [], rechazadas: [], avisos: [] };
  let previos: Previos = { referencia: opciones.anterior, publicado: opciones.anteriorPublicado ?? null };
  const ordenadas = [...opciones.publicaciones].sort((a, b) => a.fecha.localeCompare(b.fecha));
  for (const publicacion of ordenadas) {
    const motivo = motivoDelRechazo(previos, publicacion);
    if (motivo) {
      evaluacion.rechazadas.push({ moneda: publicacion.moneda, fecha: publicacion.fecha, motivo });
      continue;
    }
    const aviso = avisoDe(previos, publicacion);
    if (aviso) evaluacion.avisos.push(aviso);
    evaluacion.aGuardar.push(publicacion);
    previos = { referencia: publicacion.referencia, publicado: publicadoDe(publicacion) ?? previos.publicado };
  }
  return evaluacion;
}
