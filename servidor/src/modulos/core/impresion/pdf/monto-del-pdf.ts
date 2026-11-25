/** Centavos enteros como se leen en un libro: `-123456789` → `"-1,234,567.89"`. */
export function montoParaElPdf(centavos: number): string {
  const signo = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(centavos);
  const enteros = String(Math.trunc(absoluto / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${signo}${enteros}.${String(absoluto % 100).padStart(2, '0')}`;
}

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
export const periodoParaElPdf = (periodo: string): string =>
  `${MESES[Number(periodo.slice(5, 7)) - 1] ?? periodo.slice(5, 7)} de ${periodo.slice(0, 4)}`;
