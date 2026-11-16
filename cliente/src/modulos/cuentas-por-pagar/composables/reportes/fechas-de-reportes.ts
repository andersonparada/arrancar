const MS_POR_DIA = 86_400_000;

const aFecha = (texto: string): Date => new Date(`${texto}T00:00:00Z`);

/** Suma (o resta, con negativos) días a una fecha `AAAA-MM-DD` sin mirar la zona horaria. */
export function sumarDias(fecha: string, dias: number): string {
  return new Date(aFecha(fecha).getTime() + dias * MS_POR_DIA).toISOString().slice(0, 10);
}

/** El primer día del mes de una fecha `AAAA-MM-DD`. */
export const primerDiaDelMes = (fecha: string): string => `${fecha.slice(0, 7)}-01`;

/** Una fecha escrita completa y real (`AAAA-MM-DD`); lo incompleto de un campo a medio escribir no cuenta. */
export function esFechaCompleta(texto: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) && !Number.isNaN(aFecha(texto).getTime()) && sumarDias(texto, 0) === texto;
}
