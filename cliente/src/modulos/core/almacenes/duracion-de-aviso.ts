const MINIMO_MS = 4500;
const MAXIMO_MS = 20000;
const MS_POR_CARACTER = 70;
const EXTRA_CON_ENLACE_MS = 8000;

/** Cuánto se queda visible un aviso: lo normal para los cortos y más tiempo para los largos, para alcanzar a leerlos; con un enlace se agregan unos segundos para decidir. */
export function duracionDeAviso(mensaje: string, conEnlace = false): number {
  const lectura = Math.min(MAXIMO_MS, Math.max(MINIMO_MS, 2000 + mensaje.length * MS_POR_CARACTER));
  return conEnlace ? lectura + EXTRA_CON_ENLACE_MS : lectura;
}
