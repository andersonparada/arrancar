import { comparable } from '../../../core/intercambio/aplicacion/ubicar-encabezados.js';
import type { DatosDelDte } from '../../dominio/dte-recibido.js';
import type { CampoDelDte } from './mapa-de-encabezados-sat.js';
import { FilaRechazada, type ColumnasDelArchivo, type OpcionesDeConversion } from './tipos-de-conversion.js';

export { FilaRechazada, type ColumnasDelArchivo, type OpcionesDeConversion };
import {
  conDecimales,
  esMarcaDeAnulado,
  leerAutorizacion,
  leerFechaDeLaSat,
  leerMonto,
  leerNit,
  leerTipoDte,
  unidadesDeMonto,
} from './valores-de-la-sat.js';

/** Una fila convertida y si hubo que ajustar el IVA por redondeo. */
export interface FilaConvertida {
  datos: DatosDelDte;
  ivaAjustadoPorRedondeo: boolean;
}

const MAXIMO_DEL_SERIE_Y_NUMERO = 40;
const MAXIMO_DEL_NOMBRE = 200;
/** Lo que guarda `fila_original` (la base exige menos de 16 KB). */
const MAXIMO_DE_LA_FILA_ORIGINAL = 12_000;
const MAXIMO_DEL_VALOR_ORIGINAL = 300;
const AJUSTE_MAXIMO_POR_REDONDEO = 3n;
const MONEDAS_DE_QUETZALES = new Set(['GTQ', 'Q', 'QUETZAL', 'QUETZALES']);

const ilegible = (campo: string, valor: string) =>
  new FilaRechazada('dato_ilegible', `${campo}: «${valor.slice(0, 60)}»`);

function exigir<T>(valor: T | null, campo: string, crudo: string): T {
  if (valor === null) throw ilegible(campo, crudo);
  return valor;
}

function codigoCorto(crudo: string, campo: string): string {
  const codigo = crudo.replace(/\s/g, '').toUpperCase();
  if (codigo === '' || codigo.length > MAXIMO_DEL_SERIE_Y_NUMERO) throw ilegible(campo, crudo);
  return codigo;
}

const textoDe = (celdas: readonly string[], posicion: number): string =>
  posicion >= 0 ? (celdas[posicion] ?? '').trim() : '';

/** La identidad del DTE: quién lo emitió, a quién, qué es y cuándo. */
function leerIdentidad(celda: (campo: CampoDelDte) => string, opciones: OpcionesDeConversion) {
  const tipoCrudo = celda('tipoDte');
  const tipoDte = leerTipoDte(tipoCrudo);
  if (!tipoDte) throw new FilaRechazada('tipo_sin_familia', `Tipo «${tipoCrudo.slice(0, 60)}»`);
  const nombreEmisor = celda('nombreEmisor').slice(0, MAXIMO_DEL_NOMBRE);
  if (nombreEmisor === '') throw ilegible('Nombre del emisor', '');
  return {
    autorizacionFel: exigir(
      leerAutorizacion(celda('autorizacionFel')),
      'Número de autorización',
      celda('autorizacionFel'),
    ),
    tipoDte,
    serie: codigoCorto(celda('serie'), 'Serie'),
    numero: codigoCorto(celda('numero'), 'Número'),
    fechaEmision: exigir(
      leerFechaDeLaSat(celda('fechaEmision'), opciones.zonaHoraria),
      'Fecha de emisión',
      celda('fechaEmision'),
    ),
    nitEmisor: exigir(leerNit(celda('nitEmisor')), 'NIT del emisor', celda('nitEmisor')),
    nombreEmisor,
  };
}

/** El receptor debe ser la empresa y la moneda, quetzales; lo que el archivo no trae se supone. */
function exigirReceptorYMoneda(celda: (campo: CampoDelDte) => string, opciones: OpcionesDeConversion): string {
  const crudo = celda('nitReceptor');
  const receptor = crudo === '' ? opciones.nitDeLaEmpresa : leerNit(crudo);
  if (receptor !== opciones.nitDeLaEmpresa) {
    throw new FilaRechazada('nit_receptor_distinto', 'El receptor no es la empresa.');
  }
  const moneda = celda('moneda').toUpperCase();
  if (moneda !== '' && !MONEDAS_DE_QUETZALES.has(moneda)) {
    throw new FilaRechazada('moneda_no_admitida', `Moneda «${moneda.slice(0, 10)}»`);
  }
  return receptor;
}

/** Un monto opcional: vacío es cero. */
function montoOpcional(crudo: string, campo: string, decimales: number): string {
  return crudo === '' ? (leerMonto('0', decimales) as string) : exigir(leerMonto(crudo, decimales), campo, crudo);
}

interface MontosLeidos {
  total: string;
  iva: string;
  idp: string;
  otrosImpuestos: string;
  otrosImpuestosDetalle: Record<string, string>;
  ivaAjustadoPorRedondeo: boolean;
}

function leerOtrosImpuestos(celdas: readonly string[], columnas: ColumnasDelArchivo, decimales: number) {
  const detalle: Record<string, string> = {};
  let suma = 0n;
  for (const { nombre, posicion } of columnas.impuestos) {
    const monto = montoOpcional(textoDe(celdas, posicion), nombre, decimales);
    if (unidadesDeMonto(monto) === 0n) continue;
    detalle[nombre] = conDecimales(monto, 2);
    suma += unidadesDeMonto(monto);
  }
  return { detalle, suma };
}

/**
 * Los montos con los decimales de la configuración (mínimo dos) para comparar, y después a dos decimales, que es lo que
 * guarda la base. Si al redondear a dos decimales las partes pasan del total por unos centavos, se baja el IVA y se avisa.
 */
function leerMontos(
  celdas: readonly string[],
  columnas: ColumnasDelArchivo,
  opciones: OpcionesDeConversion,
): MontosLeidos {
  const decimales = Math.max(2, opciones.decimales);
  const celda = (campo: CampoDelDte) => textoDe(celdas, columnas.campos[campo]);
  const total = exigir(leerMonto(celda('total'), decimales), 'Gran total', celda('total'));
  if (unidadesDeMonto(total) === 0n) throw new FilaRechazada('total_en_cero', 'El total es cero.');
  const iva = montoOpcional(celda('iva'), 'IVA', decimales);
  const idp = montoOpcional(celda('idp'), 'Petróleo (IDP)', decimales);
  const otros = leerOtrosImpuestos(celdas, columnas, decimales);
  if (unidadesDeMonto(iva) + unidadesDeMonto(idp) + otros.suma > unidadesDeMonto(total)) {
    throw new FilaRechazada('impuestos_exceden_total', 'El IVA, el IDP y los otros impuestos pasan del total.');
  }
  return aDosDecimales({ total, iva, idp, detalle: otros.detalle });
}

function aDosDecimales(montos: {
  total: string;
  iva: string;
  idp: string;
  detalle: Record<string, string>;
}): MontosLeidos {
  const unidades = (monto: string) => unidadesDeMonto(conDecimales(monto, 2));
  const otrosEnUnidades = Object.values(montos.detalle).reduce((suma, monto) => suma + unidadesDeMonto(monto), 0n);
  const excedente = unidades(montos.iva) + unidades(montos.idp) + otrosEnUnidades - unidades(montos.total);
  if (excedente > AJUSTE_MAXIMO_POR_REDONDEO) {
    throw new FilaRechazada('impuestos_exceden_total', 'Las partes pasan del total al redondear.');
  }
  const ivaFinal = unidades(montos.iva) - (excedente > 0n ? excedente : 0n);
  return {
    total: conDecimales(montos.total, 2),
    iva: centavosATexto(ivaFinal),
    idp: conDecimales(montos.idp, 2),
    otrosImpuestos: centavosATexto(otrosEnUnidades),
    otrosImpuestosDetalle: montos.detalle,
    ivaAjustadoPorRedondeo: excedente > 0n,
  };
}

function centavosATexto(centavos: bigint): string {
  const digitos = centavos.toString().padStart(3, '0');
  return `${digitos.slice(0, -2)}.${digitos.slice(-2)}`;
}

/** Anulado si lo dice el estado, la marca o trae fecha de anulación; sin fecha legible se usa la de la carga. */
function leerEstado(celda: (campo: CampoDelDte) => string, opciones: OpcionesDeConversion) {
  const fechaCruda = celda('fechaDeAnulacion');
  const anulado =
    comparable(celda('estado')) === 'anulado' || esMarcaDeAnulado(celda('marcaDeAnulado')) || fechaCruda !== '';
  if (!anulado) return { estadoSat: 'vigente' as const, anuladoEnLaSatEl: null };
  const fecha = fechaCruda === '' ? null : leerFechaDeLaSat(fechaCruda, opciones.zonaHoraria);
  return { estadoSat: 'anulado' as const, anuladoEnLaSatEl: fecha ?? opciones.hoy };
}

/** Todas las columnas del archivo con valor, con tope de tamaño: lo que el mapa no usa se conserva para el usuario. */
function filaOriginalDe(celdas: readonly string[], encabezados: readonly string[]): Record<string, string> {
  const original: Record<string, string> = {};
  let largo = 0;
  encabezados.forEach((titulo, posicion) => {
    const valor = (celdas[posicion] ?? '').trim().slice(0, MAXIMO_DEL_VALOR_ORIGINAL);
    if (titulo === '' || valor === '' || largo + titulo.length + valor.length > MAXIMO_DE_LA_FILA_ORIGINAL) return;
    original[titulo] = valor;
    largo += titulo.length + valor.length;
  });
  return original;
}

/**
 * Convierte una fila del archivo de la SAT en los datos del DTE de la bandeja.
 * @throws FilaRechazada con el motivo si la fila no puede entrar.
 */
export function convertirFila(
  celdas: readonly string[],
  columnas: ColumnasDelArchivo,
  opciones: OpcionesDeConversion,
): FilaConvertida {
  const celda = (campo: CampoDelDte) => textoDe(celdas, columnas.campos[campo]);
  const identidad = leerIdentidad(celda, opciones);
  const nitReceptor = exigirReceptorYMoneda(celda, opciones);
  const { ivaAjustadoPorRedondeo, ...montos } = leerMontos(celdas, columnas, opciones);
  const datos: DatosDelDte = {
    ...identidad,
    nitReceptor,
    ...montos,
    ...leerEstado(celda, opciones),
    filaOriginal: filaOriginalDe(celdas, columnas.encabezados),
  };
  return { datos, ivaAjustadoPorRedondeo };
}
