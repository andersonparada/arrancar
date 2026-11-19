const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Las partes de una fecha `AAAA-MM-DD`, ya como números. */
function partesDe(fecha: string): { dia: number; mes: number; anio: number } {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return { anio: anio!, mes: mes!, dia: dia! };
}

/** «Guatemala, 18 de noviembre de 2026»: el día sin ceros a la izquierda. */
export function lugarYFechaEnTexto(lugar: string, fecha: string): string {
  const { dia, mes, anio } = partesDe(fecha);
  return `${lugar}, ${dia} de ${MESES[mes - 1]} de ${anio}`;
}

/** Día y mes con dos dígitos y el año con cuatro, cada uno para su casilla. */
export function fechaEnCasillas(fecha: string): { dia: string; mes: string; anio: string } {
  const { dia, mes, anio } = partesDe(fecha);
  return { dia: String(dia).padStart(2, '0'), mes: String(mes).padStart(2, '0'), anio: String(anio).padStart(4, '0') };
}

/** `18/11/2026`, para el talón. */
export function fechaCorta(fecha: string): string {
  const { dia, mes, anio } = fechaEnCasillas(fecha);
  return `${dia}/${mes}/${anio}`;
}
