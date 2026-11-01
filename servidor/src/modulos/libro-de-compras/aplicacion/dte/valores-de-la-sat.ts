import { fechaLocalEn } from '../../../core/compartido/dominio/fecha-local.js';
import { comparable } from '../../../core/intercambio/aplicacion/ubicar-encabezados.js';
import { TIPOS_DTE, type TipoDte } from '../../dominio/tipos-de-documento.js';

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?)?\s*(Z|[+-]\d{2}:?\d{2})?$/;
const FECHA_LATINA = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NIT = /^\d{1,12}[\dK]$/;

const esFechaReal = (anio: string, mes: string, dia: string): boolean => {
  const texto = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto);
};

/** `-0600` → `-06:00`. */
const desfaseConDosPuntos = (desfase: string): string =>
  desfase === 'Z' ? 'Z' : `${desfase.slice(0, 3)}:${desfase.slice(-2)}`;

const conCeros = (numero: string) => numero.padStart(2, '0');

function leerFechaLatina(texto: string): string | null {
  const latina = FECHA_LATINA.exec(texto);
  if (!latina) return null;
  const [, dia = '', mes = '', anio = ''] = latina;
  return esFechaReal(anio, mes, dia) ? `${anio}-${conCeros(mes)}-${conCeros(dia)}` : null;
}

/** La fecha en la zona de la empresa de un instante escrito con su desfase. */
function fechaDelInstante(texto: string, zonaHoraria: string): string | null {
  const instante = new Date(texto);
  return Number.isNaN(instante.getTime()) ? null : fechaLocalEn(instante, zonaHoraria);
}

function leerFechaIso(texto: string, zonaHoraria: string): string | null {
  const iso = FECHA_ISO.exec(texto);
  if (!iso) return null;
  const [, anio = '', mes = '', dia = '', hora, minuto, segundo, desfase] = iso;
  if (!esFechaReal(anio, mes, dia)) return null;
  if (!desfase || hora === undefined) return `${anio}-${mes}-${dia}`;
  return fechaDelInstante(
    `${anio}-${mes}-${dia}T${hora}:${minuto}:${segundo}${desfaseConDosPuntos(desfase)}`,
    zonaHoraria,
  );
}

/**
 * La fecha (`aaaa-mm-dd`) de una fecha de la SAT en la zona de la empresa. Con zona (`...-06:00`) se pasa al reloj de la
 * empresa; sin zona, la hora ya es la de la empresa y la fecha es la que dice el texto. Acepta milisegundos, `dd/mm/aaaa`
 * con hora opcional y `aaaa-mm-dd`. Una fecha que no existe da `null`.
 */
export function leerFechaDeLaSat(texto: string, zonaHoraria: string): string | null {
  const limpio = texto.trim();
  return leerFechaLatina(limpio) ?? leerFechaIso(limpio, zonaHoraria);
}

/**
 * Un monto como texto con exactamente `decimales` decimales, redondeado hacia arriba desde la mitad y sin signo (las notas
 * pueden llegar negativas y el sistema guarda siempre positivo). Quita espacios, la «Q» y las comas de miles. Lo que no es
 * un número da `null`.
 */
export function leerMonto(texto: string, decimales: number): string | null {
  const limpio = texto.replace(/[\s,]/g, '').replace(/^(-?)Q/i, '$1');
  const partes = /^-?(\d+)(?:\.(\d*))?$/.exec(limpio);
  if (!partes) return null;
  const [, enteros = '0', fraccion = ''] = partes;
  const ajustada = fraccion.padEnd(decimales + 1, '0');
  const unidades = BigInt(enteros + ajustada.slice(0, decimales)) + (ajustada.charAt(decimales) >= '5' ? 1n : 0n);
  const digitos = unidades.toString().padStart(decimales + 1, '0');
  return `${digitos.slice(0, digitos.length - decimales)}.${digitos.slice(digitos.length - decimales)}`;
}

/** Un monto con decimales a las unidades menores como entero, para sumar sin flotantes. */
export const unidadesDeMonto = (monto: string): bigint => BigInt(monto.replace('.', ''));

/** Un monto llevado a `hasta` decimales, redondeando desde la mitad. */
export function conDecimales(monto: string, hasta: number): string {
  return leerMonto(monto, hasta) ?? monto;
}

const NOMBRES_DE_TIPOS = new Map<string, TipoDte>([
  ['factura', 'FACT'],
  ['factura cambiaria', 'FCAM'],
  ['factura pequeno contribuyente', 'FPEQ'],
  ['factura especial', 'FESP'],
  ['nota de credito', 'NCRE'],
  ['nota de debito', 'NDEB'],
  ['recibo', 'RECI'],
  ['recibo por donacion', 'RDON'],
]);

/** El código del tipo de DTE, escrito como código («FACT») o como nombre («Factura»); `null` si no tiene familia. */
export function leerTipoDte(texto: string): TipoDte | null {
  const codigo = texto.trim().toUpperCase();
  if ((TIPOS_DTE as readonly string[]).includes(codigo)) return codigo as TipoDte;
  return NOMBRES_DE_TIPOS.get(comparable(texto)) ?? null;
}

/** El UUID de la autorización en minúsculas, o `null` si no lo es. */
export const leerAutorizacion = (texto: string): string | null =>
  UUID.test(texto.trim()) ? texto.trim().toLowerCase() : null;

/** El NIT sin guiones ni espacios y en mayúsculas (su dígito verificador no se revisa: la SAT ya lo hizo). */
export function leerNit(texto: string): string | null {
  const nit = texto.replace(/[\s-]/g, '').toUpperCase();
  return NIT.test(nit) ? nit : null;
}

const MARCAS_DE_ANULADO = new Set(['si', 's', 'true', '1', 'x']);

/** `true` si la marca de anulado de la SAT dice que sí («Sí», «Si», «S», «1»). */
export const esMarcaDeAnulado = (texto: string): boolean => MARCAS_DE_ANULADO.has(comparable(texto));
