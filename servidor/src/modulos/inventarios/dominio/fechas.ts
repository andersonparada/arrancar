const DIA_EN_MILISEGUNDOS = 24 * 60 * 60 * 1000;

/** El día anterior a `fecha` (`aaaa-mm-dd`), sin depender de la zona horaria. */
export function diaAnterior(fecha: string): string {
  const dia = new Date(`${fecha}T00:00:00Z`).getTime() - DIA_EN_MILISEGUNDOS;
  return new Date(dia).toISOString().slice(0, 10);
}
