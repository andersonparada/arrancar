/** `AAAA-MM-DD` como `dd/mm/aaaa`, para los mensajes y las leyendas de los reportes. */
export function fechaLegible(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}
