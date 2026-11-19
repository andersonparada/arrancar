import { fechaYHoraLocalEn } from '../../compartido/dominio/fecha-local.js';

/**
 * Las vueltas que corre solo el temporizador, en el orden en que se revisan. `dolarDeManana` es el reintento de la
 * noche: pide solo el dólar de mañana y en la bitácora queda como vuelta `noche`.
 */
export type VueltaProgramada = 'madrugada' | 'manana' | 'noche' | 'dolarDeManana';

const aMinutos = (hora: number, minutos: number): number => hora * 60 + minutos;

/** 06:00 el dólar; si falta, se reintenta en estas horas (en minutos desde la medianoche, hora de la instalación). */
export const HORAS_DE_LA_MADRUGADA: readonly number[] = [
  aMinutos(6, 0),
  aMinutos(6, 30),
  aMinutos(7, 0),
  aMinutos(8, 0),
  aMinutos(9, 30),
  aMinutos(11, 0),
  aMinutos(13, 0),
  aMinutos(16, 0),
  aMinutos(20, 0),
];

/** Las demás monedas se calculan entre las 8:00 y las 9:00 a partir del dólar: se piden a las 09:30. */
export const HORA_DE_LA_MANANA = aMinutos(9, 30);

/** El dólar de mañana ya está publicado de noche (la comprobación C-4 puede mover esta hora). */
export const HORA_DE_LA_NOCHE = aMinutos(21, 0);

/**
 * Si el dólar de mañana no llegó a las 21:00, se reintenta a estas horas (C-4 sigue abierta: la bitácora de producción
 * dirá a qué hora aparece y entonces se ajustan).
 */
export const HORAS_DEL_DOLAR_DE_MANANA: readonly number[] = [aMinutos(22, 0), aMinutos(23, 30)];

/** Una consulta que ya quedó en la bitácora. */
export interface IntentoHecho {
  readonly vuelta: string;
  readonly iniciadaEn: Date;
}

export interface OpcionesDeVuelta {
  readonly ahora: Date;
  /** Zona horaria de la instalación (`core.regional.zona_horaria`). */
  readonly zona: string;
  /** Lo registrado en la bitácora en las últimas 36 horas, como mínimo. */
  readonly intentos: readonly IntentoHecho[];
  /** Ya hay un tipo del dólar de hoy guardado. */
  readonly hayDolarDeHoy: boolean;
  /** Ya hay un tipo del dólar de mañana guardado (o no hay dólar activo que esperar). */
  readonly hayDolarDeManana: boolean;
}

interface Reloj {
  fecha: string;
  minutos: number;
}

function relojDe(instante: Date, zona: string): Reloj {
  const [fecha, hora] = fechaYHoraLocalEn(instante, zona).split(' ') as [string, string];
  const [horas, minutos] = hora.split(':').map(Number) as [number, number];
  return { fecha, minutos: aMinutos(horas, minutos) };
}

/** Los intentos de hoy de una vuelta, como minutos de la hora de pared. */
function intentosDeHoy(vuelta: string, hoy: string, { intentos, zona }: OpcionesDeVuelta): number[] {
  return intentos
    .filter((intento) => intento.vuelta === vuelta)
    .map((intento) => relojDe(intento.iniciadaEn, zona))
    .filter((reloj) => reloj.fecha === hoy)
    .map((reloj) => reloj.minutos);
}

/** Toca la madrugada si falta el dólar de hoy y desde la última hora de reintento que ya pasó no se ha intentado. */
function tocaLaMadrugada(ahora: Reloj, opciones: OpcionesDeVuelta): boolean {
  if (opciones.hayDolarDeHoy) return false;
  const ultimaHora = HORAS_DE_LA_MADRUGADA.filter((hora) => hora <= ahora.minutos).at(-1);
  if (ultimaHora === undefined) return false;
  return !intentosDeHoy('madrugada', ahora.fecha, opciones).some((minutos) => minutos >= ultimaHora);
}

/** Toca reintentar el dólar de mañana si la noche ya corrió, el dólar falta y desde la última hora de reintento no se ha pedido. */
function tocaElReintentoDeLaNoche(ahora: Reloj, opciones: OpcionesDeVuelta): boolean {
  if (opciones.hayDolarDeManana || intentosDeHoy('noche', ahora.fecha, opciones).length === 0) return false;
  const ultimaHora = HORAS_DEL_DOLAR_DE_MANANA.filter((hora) => hora <= ahora.minutos).at(-1);
  if (ultimaHora === undefined) return false;
  return !intentosDeHoy('noche', ahora.fecha, opciones).some((minutos) => minutos >= ultimaHora);
}

/**
 * Qué vuelta toca correr ahora, o `null`. Cada vuelta corre una vez al día (la madrugada, mientras falte el dólar,
 * también en cada hora de reintento; la noche, mientras falte el dólar de mañana, también a las 22:00 y a las 23:30) y solo cuenta lo hecho hoy en la hora de la instalación. Es una función pura: el
 * temporizador de 15 minutos la consulta y no guarda nada.
 */
export function vueltaQueToca(opciones: OpcionesDeVuelta): VueltaProgramada | null {
  const ahora = relojDe(opciones.ahora, opciones.zona);
  if (tocaLaMadrugada(ahora, opciones)) return 'madrugada';
  const sinHacer = (vuelta: string) => intentosDeHoy(vuelta, ahora.fecha, opciones).length === 0;
  if (ahora.minutos >= HORA_DE_LA_MANANA && sinHacer('manana')) return 'manana';
  if (ahora.minutos >= HORA_DE_LA_NOCHE && sinHacer('noche')) return 'noche';
  return tocaElReintentoDeLaNoche(ahora, opciones) ? 'dolarDeManana' : null;
}
