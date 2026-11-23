/** Hoy como `AAAA-MM-DD` en el calendario del dispositivo (no en UTC, que de noche cambia de día). */
export function fechaDeHoy(ahora: Date = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}
