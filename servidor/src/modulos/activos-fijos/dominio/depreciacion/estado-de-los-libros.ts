import { cuotaDelTramoEnElMes, tramoQueRige } from './cuota-del-mes.js';
import { mesesEntre, periodoDe, sumarMeses } from './meses.js';
import type { LibroDeDepreciacion, TramoGuardado } from './tramo.js';

/**
 * Lo que un activo lleva depreciado hasta su último mes cerrado: sus tramos vigentes, lo que cada uno ya depreció y la
 * acumulada de cada libro (con la del saldo inicial). Con esto se abre un tramo nuevo sin tocar los meses cerrados.
 */
export interface EstadoDeLosLibros {
  tramos: readonly TramoGuardado[];
  depreciadoPorTramo: ReadonlyMap<string, number>;
  acumuladaCentavos: Readonly<Record<LibroDeDepreciacion, number>>;
  ultimoMesCerrado: string | null;
}

/** El primer mes abierto del activo: el siguiente al último cerrado o, sin cierres, el de su primer tramo. */
export function primerMesAbierto(estado: EstadoDeLosLibros): string | null {
  if (estado.ultimoMesCerrado) return sumarMeses(estado.ultimoMesCerrado, 1);
  const desdes = estado.tramos.map((tramo) => tramo.desdePeriodo).sort();
  return desdes[0] ?? null;
}

/** El `desdePeriodo` del último tramo vigente de los dos libros, o `null` si no hay tramos. */
export function desdeDelUltimoTramo(tramos: readonly TramoGuardado[]): string | null {
  return (
    tramos
      .map((tramo) => tramo.desdePeriodo)
      .sort()
      .at(-1) ?? null
  );
}

/**
 * La depreciación acumulada del libro al cierre del mes anterior a `desdePeriodo`: lo cerrado más lo que darían, mes a
 * mes, los tramos vigentes en los meses abiertos que van antes (esos meses se cerrarán con el tramo de hoy). Un tramo
 * nuevo que empieza en el primer mes abierto no suma nada.
 */
export function acumuladaAntesDe(estado: EstadoDeLosLibros, libro: LibroDeDepreciacion, desdePeriodo: string): number {
  const delLibro = estado.tramos.filter((tramo) => tramo.libro === libro);
  const depreciado = new Map(estado.depreciadoPorTramo);
  let acumulada = estado.acumuladaCentavos[libro];
  for (let mes = primerMesAbierto(estado) ?? desdePeriodo; mes < desdePeriodo; mes = sumarMeses(mes, 1)) {
    const tramo = tramoQueRige(delLibro, mes);
    if (!tramo) continue;
    const previo = depreciado.get(tramo.id) ?? 0;
    const cuota = cuotaDelTramoEnElMes({ tramo, periodo: mes, depreciadoDelTramoCentavos: previo });
    depreciado.set(tramo.id, previo + cuota);
    acumulada += cuota;
  }
  return acumulada;
}

/**
 * La vida útil contable total del activo según un tramo contable: los meses que pasaron desde su inicio de uso hasta
 * el tramo más los que el tramo da. Es lo que el activo guarda como su vida útil.
 */
export function vidaTotalContable(
  fechaDeInicioDeUso: string,
  tramo: Pick<TramoGuardado, 'desdePeriodo' | 'meses'>,
): number {
  return Math.max(mesesEntre(periodoDe(fechaDeInicioDeUso), tramo.desdePeriodo), 0) + (tramo.meses ?? 0);
}

/**
 * Los meses de vida contable que le quedan al activo al empezar `desdePeriodo`: los del tramo contable que lo rige menos
 * los que ya pasaron. `null` si no hay tramo contable o ya se agotaron.
 */
export function mesesQueFaltan(tramos: readonly TramoGuardado[], desdePeriodo: string): number | null {
  const contables = tramos.filter((tramo) => tramo.libro === 'contable');
  const tramo = tramoQueRige(contables, desdePeriodo);
  if (!tramo || tramo.meses === null) return null;
  const faltan = tramo.meses - mesesEntre(tramo.desdePeriodo, desdePeriodo);
  return faltan >= 1 ? faltan : null;
}
