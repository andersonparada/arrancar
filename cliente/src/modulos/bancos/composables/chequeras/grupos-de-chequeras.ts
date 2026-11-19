import type { Chequera } from '../../servicios/chequeras.api';

/** Las chequeras de siempre y, aparte, la de la carga inicial de cada cuenta (no se emite ni se inactiva). */
export interface GruposDeChequeras {
  normales: Chequera[];
  deApertura: Chequera[];
}

/** Separa la lista sin cambiar su orden: la chequera de la carga inicial se lista aparte («De la carga inicial»). */
export function gruposDeChequeras(chequeras: Chequera[]): GruposDeChequeras {
  return {
    normales: chequeras.filter((chequera) => !chequera.deApertura),
    deApertura: chequeras.filter((chequera) => chequera.deApertura),
  };
}
