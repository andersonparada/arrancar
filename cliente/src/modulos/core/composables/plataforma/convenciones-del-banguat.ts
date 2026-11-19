import type { ConvencionDelBanguat, ValorDeLaMuestra } from '../../servicios/monedas.api';
import type { TipoDeLaSerie } from '../../servicios/tipos-de-cambio.api';
import { formatearTipoDeCambio } from '../../utilidades/formato';

const TEXTOS: Record<ConvencionDelBanguat, string> = {
  quetzales_por_unidad: 'Q por unidad',
  usd_por_unidad: 'USD por unidad',
  unidades_por_usd: 'unidades por USD',
};

/**
 * La política contable de la instalación (adenda B.5). Nunca se llama «tipo del Banguat» al valor en quetzales de una
 * moneda distinta del dólar: el dólar sí lo es.
 */
export const NOTA_DE_LA_POLITICA_DE_CRUCES =
  'Q por unidad = promedio del cruce publicado × referencia USD (o referencia USD ÷ promedio del cruce publicado en las monedas de unidades por dólar). Es una política contable de la instalación, no un valor publicado por el Banco de Guatemala; el dólar sí lo es.';

/** «USD por unidad», «unidades por USD» o «Q por unidad»; vacío si no hay convención. */
export const textoDeLaConvencion = (convencion: ConvencionDelBanguat | null | undefined): string =>
  convencion ? TEXTOS[convencion] : '';

/** Si el valor en quetzales sale de cruzar con el dólar (las demás monedas lo hacen; el dólar no). */
export const esCruce = (convencion: ConvencionDelBanguat | null | undefined): boolean =>
  convencion === 'usd_por_unidad' || convencion === 'unidades_por_usd';

/** Lo publicado: «Compra 1.3164 · venta 1.3165 (USD por unidad)»; vacío si el Banguat no dio compra y venta. */
export function textoDeLoPublicado(
  valor: { compra: string | null; venta: string | null },
  convencion: ConvencionDelBanguat | null | undefined,
): string {
  if (valor.compra === null || valor.venta === null) return '';
  const compra = formatearTipoDeCambio(valor.compra);
  const venta = formatearTipoDeCambio(valor.venta);
  const unidad = convencion ? ` (${textoDeLaConvencion(convencion)})` : '';
  return `Compra ${compra} · venta ${venta}${unidad}`;
}

/**
 * La cuenta que lleva a quetzales, con lo que el servidor guardó o calculó (el cliente no calcula nada):
 * «1.31645 USD por GBP × 7.64489 = Q 10.06411544» o «7.64489 ÷ 0.84265 CHF por USD = Q 9.07243814». Vacía si no es un
 * cruce o falta el dólar de ese día.
 */
export function fraseDelCruce(
  valor: Pick<ValorDeLaMuestra, 'promedio' | 'dolar' | 'referencia'>,
  moneda: string,
  convencion: ConvencionDelBanguat,
): string {
  if (!esCruce(convencion) || valor.dolar === null || valor.referencia === null) return '';
  const promedio = formatearTipoDeCambio(valor.promedio);
  const dolar = formatearTipoDeCambio(valor.dolar);
  const resultado = formatearTipoDeCambio(valor.referencia);
  return convencion === 'usd_por_unidad'
    ? `${promedio} USD por ${moneda} × ${dolar} = Q ${resultado}`
    : `${dolar} ÷ ${promedio} ${moneda} por USD = Q ${resultado}`;
}

/** Las líneas del detalle de una fila del Banguat: lo publicado, la convención y el dólar que se usó. */
export function detalleDeLaFila(
  fila: Pick<TipoDeLaSerie, 'compra' | 'venta' | 'convencion' | 'dolarUsado' | 'origen'>,
): string[] {
  if (fila.origen !== 'banguat') return [];
  const lineas = [textoDeLoPublicado(fila, fila.convencion)];
  if (esCruce(fila.convencion) && fila.dolarUsado !== null)
    lineas.push(`Dólar usado: Q ${formatearTipoDeCambio(fila.dolarUsado)}`);
  return lineas.filter((linea) => linea !== '');
}
