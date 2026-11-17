const MENORES = [
  'cero',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
  'veintiuno',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
];
const DECENAS: Record<number, string> = {
  30: 'treinta',
  40: 'cuarenta',
  50: 'cincuenta',
  60: 'sesenta',
  70: 'setenta',
  80: 'ochenta',
  90: 'noventa',
};
const CENTENAS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
];
const UN_MILLON = 1_000_000;

/** «uno» y «veintiuno» pierden la o ante un sustantivo: «un quetzal», «veintiún mil». */
const conApocope = (texto: string): string => texto.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');

function decenasYUnidades(n: number): string {
  if (n < 30) return MENORES[n]!;
  const unidad = n % 10;
  const decena = DECENAS[n - unidad]!;
  return unidad === 0 ? decena : `${decena} y ${MENORES[unidad]}`;
}

/** De 1 a 999. */
function hastaNovecientosNoventaYNueve(n: number): string {
  if (n === 100) return 'cien';
  const resto = n % 100;
  return [CENTENAS[Math.floor(n / 100)], resto > 0 ? decenasYUnidades(resto) : ''].filter(Boolean).join(' ');
}

function millonesEnLetras(millones: number): string {
  if (millones === 0) return '';
  return millones === 1 ? 'un millón' : `${conApocope(enteroEnLetras(millones))} millones`;
}

function milesEnLetras(miles: number): string {
  if (miles === 0) return '';
  return miles === 1 ? 'mil' : `${conApocope(hastaNovecientosNoventaYNueve(miles))} mil`;
}

function enteroEnLetras(n: number): string {
  if (n === 0) return 'cero';
  const unidades = n % 1000;
  return [
    millonesEnLetras(Math.floor(n / UN_MILLON)),
    milesEnLetras(Math.floor((n % UN_MILLON) / 1000)),
    unidades === 0 ? '' : hastaNovecientosNoventaYNueve(unidades),
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * El monto en quetzales con letras, para recibos y cheques: `112000` → «Mil ciento veinte quetzales con 00/100». Recibe
 * centavos enteros (nunca decimales de punto flotante) y llega hasta los miles de millones.
 */
export function montoEnLetras(centavos: number): string {
  const quetzales = Math.floor(Math.abs(centavos) / 100);
  const resto = String(Math.abs(centavos) % 100).padStart(2, '0');
  const letras = quetzales === 1 ? 'un quetzal' : `${conApocope(enteroEnLetras(quetzales))} quetzales`;
  const completo =
    quetzales > 0 && quetzales % UN_MILLON === 0 ? letras.replace(/ quetzales$/, ' de quetzales') : letras;
  return `${completo.charAt(0).toUpperCase()}${completo.slice(1)} con ${resto}/100`;
}
