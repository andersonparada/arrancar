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

/** `2026-10-01` → `octubre de 2026`. */
export const nombreDelPeriodo = (periodo: string): string =>
  `${MESES[Number(periodo.slice(5, 7)) - 1] ?? periodo.slice(5, 7)} de ${periodo.slice(0, 4)}`;
