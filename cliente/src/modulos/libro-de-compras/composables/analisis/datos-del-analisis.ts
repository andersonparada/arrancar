import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type { ClaveDeAnalisis, ConsultaDeAnalisis, ResultadosDelAnalisis } from '../../servicios/analisis.api';
import { ANALISIS_DISPONIBLES, PROBLEMAS_DEL_RANGO, VENTANA_DEL_ANALISIS as textos } from '../../textos-del-analisis';
import { MOTIVOS_SIN_CREDITO } from '../../textos-de-documentos';
import { MOTIVOS_CORTOS } from '../../textos-del-libro';
import { etiquetaDePeriodo, mesDe } from '../documentos/filtros-de-documentos';
import { opcionesDePeriodoDelLibro } from '../libro/datos-del-libro';

/** Lo más que abarca un análisis, igual que el servidor. */
export const MAXIMO_DE_MESES = 24;

export interface RangoDeAnalisis {
  desde: string;
  hasta: string;
}

/** Al abrir: de enero del año en curso al mes en curso. */
export const rangoPorOmision = (hoy: Date): RangoDeAnalisis => ({
  desde: `${hoy.getFullYear()}-01`,
  hasta: mesDe(hoy),
});

const mesesDesdeElAnioCero = (periodo: string): number => {
  const [anio, mes] = periodo.split('-').map(Number);
  return (anio ?? 0) * 12 + (mes ?? 1) - 1;
};

/** Cuántos meses abarca el rango, con los dos extremos incluidos. */
export const mesesDelRango = (rango: RangoDeAnalisis): number =>
  mesesDesdeElAnioCero(rango.hasta) - mesesDesdeElAnioCero(rango.desde) + 1;

/** Qué le falta corregir al rango para poder pedirse; `null` si está bien. */
export function problemaDelRango(rango: RangoDeAnalisis): string | null {
  const meses = mesesDelRango(rango);
  if (meses < 1) return PROBLEMAS_DEL_RANGO.alReves;
  return meses > MAXIMO_DE_MESES ? PROBLEMAS_DEL_RANGO.muyLargo : null;
}

const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** «Enero de 2026» a partir de `AAAA-MM` o `AAAA-MM-DD`. */
export const etiquetaDelMes = (periodo: string): string => conMayuscula(etiquetaDePeriodo(periodo.slice(0, 7)));

/** «Enero de 2026 a octubre de 2026 (10 meses)». */
export function resumenDelRango(rango: RangoDeAnalisis): string {
  const meses = mesesDelRango(rango);
  const cuantos = meses === 1 ? '1 mes' : `${meses} meses`;
  return rango.desde === rango.hasta
    ? `${etiquetaDelMes(rango.desde)} (${cuantos})`
    : `De ${etiquetaDelMes(rango.desde)} a ${etiquetaDelMes(rango.hasta)} (${cuantos})`;
}

/** Los meses que se ofrecen en cada selector del rango (el más reciente primero). */
export const opcionesDeMes = (hoy: Date, actual: string): OpcionBuscable<string>[] =>
  opcionesDePeriodoDelLibro(hoy, actual);

/** Lo que se manda al servidor; la casilla de documentos fuera del libro solo vale en «por proveedor». */
export function consultaDe(clave: ClaveDeAnalisis, rango: RangoDeAnalisis, incluirFuera: boolean): ConsultaDeAnalisis {
  const consulta: ConsultaDeAnalisis = { desde: rango.desde, hasta: rango.hasta };
  return clave === 'compras-por-proveedor' && incluirFuera ? { ...consulta, incluirFueraDelLibro: true } : consulta;
}

/** El combustible con su nombre; `null` es el IDP escrito en la factura, sin combustible del catálogo. */
export const nombreDelCombustible = (combustible: string | null): string => combustible ?? textos.sinCombustible;

/** El motivo corto de un grupo de «IVA al costo» y su explicación completa, ambos de los textos de documentos. */
export function textosDelMotivo(motivo: string | null): { titulo: string; explicacion: string } {
  const titulos = MOTIVOS_CORTOS as Record<string, string>;
  const explicaciones = MOTIVOS_SIN_CREDITO as Record<string, string>;
  if (!motivo) return { titulo: textos.sinMotivo, explicacion: '' };
  return { titulo: titulos[motivo] ?? motivo, explicacion: explicaciones[motivo] ?? '' };
}

/** Si el resultado no trae ninguna fila, para mostrar el estado vacío en vez de una tabla en ceros. */
export function estaVacio<C extends ClaveDeAnalisis>(clave: C, datos: ResultadosDelAnalisis[C]): boolean {
  const resultado = datos as unknown as Record<string, unknown[]>;
  switch (clave) {
    case 'iva-al-costo':
      return resultado.motivos?.length === 0;
    case 'combustibles':
      return resultado.combustibles?.length === 0;
    default:
      return resultado.filas?.length === 0;
  }
}

/** Cuántos documentos o líneas hay, para decirlo junto al título. */
export function cantidadDeFilas(clave: ClaveDeAnalisis, datos: ResultadosDelAnalisis[ClaveDeAnalisis]): number {
  if (clave === 'iva-al-costo') {
    return (datos as ResultadosDelAnalisis['iva-al-costo']).motivos.reduce((suma, g) => suma + g.lineas.length, 0);
  }
  if (clave === 'combustibles') {
    return (datos as ResultadosDelAnalisis['combustibles']).combustibles.reduce((suma, g) => suma + g.meses.length, 0);
  }
  return (datos as { filas: unknown[] }).filas.length;
}

/** El tipo de concepto en palabras. */
export const textoDelTipo = (tipo: 'bien' | 'servicio'): string =>
  tipo === 'bien' ? textos.tipoBien : textos.tipoServicio;

const SALTOS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };

/** La pestaña a la que lleva una tecla (flechas, Inicio y Fin); `null` si la tecla no mueve. */
export function analisisTrasLaTecla(actual: ClaveDeAnalisis, tecla: string): ClaveDeAnalisis | null {
  const total = ANALISIS_DISPONIBLES.length;
  const posicion = ANALISIS_DISPONIBLES.findIndex((a) => a.clave === actual);
  const salto = SALTOS[tecla];
  let destino: number | null = null;
  if (salto) destino = (posicion + salto + total) % total;
  else if (tecla === 'Home') destino = 0;
  else if (tecla === 'End') destino = total - 1;
  return destino === null ? null : (ANALISIS_DISPONIBLES[destino]?.clave ?? null);
}
