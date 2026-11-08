const MINIMO_MS = 4500;
const MAXIMO_MS = 20000;
const MS_POR_CARACTER = 70;

/** Cuánto se queda visible un aviso: lo normal para los cortos y más tiempo para los largos, para alcanzar a leerlos. */
export function duracionDeAviso(mensaje: string): number {
  return Math.min(MAXIMO_MS, Math.max(MINIMO_MS, 2000 + mensaje.length * MS_POR_CARACTER));
}
