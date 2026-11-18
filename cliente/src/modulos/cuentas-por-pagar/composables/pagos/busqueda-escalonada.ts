/** Espera, en milisegundos, desde la última tecla antes de pedir la búsqueda al servidor. */
export const ESPERA_DE_BUSQUEDA_MS = 300;

export interface OpcionesDeBusquedaEscalonada<T> {
  /** Pide el resultado de un texto al servidor. */
  traer: (texto: string) => Promise<T>;
  /** Recibe el resultado vigente; con el texto vacío llega `null`, para volver a la lista completa. */
  alResolver: (resultado: T | null) => void;
  alFallar: (error: unknown) => void;
  esperaMs?: number;
}

/**
 * Una búsqueda en el servidor mientras se escribe: espera un momento tras la última tecla y descarta toda respuesta que
 * ya no sea la del último texto, para que una lenta no pise a una más nueva.
 */
export function crearBusquedaEscalonada<T>(opciones: OpcionesDeBusquedaEscalonada<T>): (texto: string) => void {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  let ultimo = 0;

  async function pedir(texto: string, numero: number): Promise<void> {
    try {
      const resultado = await opciones.traer(texto);
      if (numero === ultimo) opciones.alResolver(resultado);
    } catch (error) {
      if (numero === ultimo) opciones.alFallar(error);
    }
  }

  return (texto) => {
    clearTimeout(temporizador);
    const numero = ++ultimo;
    if (!texto) {
      opciones.alResolver(null);
      return;
    }
    temporizador = setTimeout(() => void pedir(texto, numero), opciones.esperaMs ?? ESPERA_DE_BUSQUEDA_MS);
  };
}
