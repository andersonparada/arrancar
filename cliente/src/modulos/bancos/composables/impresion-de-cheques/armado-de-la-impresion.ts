import { reglaDePagina } from '../formatos-de-cheque/estilos-de-impresion-de-cheque';
import type { ChequeParaImprimir, VistaDeImpresion } from '../../servicios/tipos-de-impresion-de-cheques';

/**
 * Lo que se arma en la pantalla de impresión a partir de la vista del servidor. Lógica pura: el cliente no calcula nada
 * del cheque (los textos y el relleno vienen armados), solo decide qué hojas hay y con qué papel se imprime cada parte.
 */

/** La hoja del cheque (en su formulario) o los comprobantes en hoja carta: cada una se imprime por separado. */
export type ParteDeLaImpresion = 'cheques' | 'comprobantes';

/** La hoja carta de los comprobantes que no caben en el papel del cheque. */
export const PAPEL_CARTA = { anchoMm: 215.9, altoMm: 279.4 };
const MARGEN_DEL_COMPROBANTE_MM = 12;

/** El comprobante sale en hoja carta aparte si no hay cheque en este papel o el formato no le reservó zona. */
export const comprobanteVaAparte = (cheque: ChequeParaImprimir): boolean =>
  cheque.cheque === null || cheque.zonaDelComprobante === null;

/** Las hojas que tiene cada parte: cuántos cheques en su formulario y cuántos comprobantes en carta. */
export function partesDeLaVista(vista: VistaDeImpresion): Record<ParteDeLaImpresion, number> {
  return {
    cheques: vista.cheques.filter((cheque) => cheque.cheque !== null).length,
    comprobantes: vista.cheques.filter(comprobanteVaAparte).length,
  };
}

/** La parte con que se empieza: los cheques si hay (en el formulario), si no, los comprobantes. */
export const parteInicial = (vista: VistaDeImpresion): ParteDeLaImpresion =>
  partesDeLaVista(vista).cheques > 0 ? 'cheques' : 'comprobantes';

/** La regla de página del navegador para esa parte: el papel del cheque, o carta con margen para los comprobantes. */
export function reglaDePaginaDe(vista: VistaDeImpresion, parte: ParteDeLaImpresion): string {
  if (parte === 'comprobantes') {
    return `${reglaDePagina(PAPEL_CARTA).replace('margin: 0', `margin: ${MARGEN_DEL_COMPROBANTE_MM}mm`)}`;
  }
  const conCheque = vista.cheques.find((cheque) => cheque.cheque !== null);
  return conCheque?.cheque ? reglaDePagina(conCheque.cheque.papel) : '';
}

/** Todos los avisos que no bloquean, sin repetir: los del lote (huecos) y los de cada cheque (sin probar, preimpreso). */
export function avisosDeLaVista(vista: VistaDeImpresion): string[] {
  const deLosCheques = vista.cheques.flatMap((cheque) => cheque.avisos);
  return [...new Set([...vista.avisos, ...deLosCheques])];
}

/** Dónde está la impresión: sin registrar, registrada aquí, o de un cheque que ya se imprimió (hay que reimprimir). */
export type SituacionDeLaImpresion = 'por-registrar' | 'registrada' | 'ya-impresa';

/**
 * Si algún cheque todavía no figura como impreso, imprimir lo registra. Si todos ya figuran y no se registraron en esta
 * pantalla, volver a imprimir sería una reimpresión sin motivo: se debe pedir desde «Reimprimir».
 */
export function situacionDeLaImpresion(vista: VistaDeImpresion, registradaAqui: boolean): SituacionDeLaImpresion {
  if (registradaAqui) return 'registrada';
  return vista.cheques.some((cheque) => !cheque.impreso) ? 'por-registrar' : 'ya-impresa';
}

/** Los ids que se mandan a registrar: los de la vista, en el orden en que llegaron (por número). */
export const idsDeLaVista = (vista: VistaDeImpresion): string[] => vista.cheques.map((cheque) => cheque.chequeId);

const numeroConSerie = (cheque: Pick<ChequeParaImprimir, 'serie' | 'numero'>): string =>
  `${cheque.serie ?? ''}${cheque.numero}`;

/** El título de la ventana de impresión (el nombre que sugiere el navegador al guardar en PDF). */
export function tituloDelDocumento(vista: VistaDeImpresion): string {
  const [primero] = vista.cheques;
  const ultimo = vista.cheques[vista.cheques.length - 1];
  if (!primero || !ultimo) return 'Cheques';
  if (primero === ultimo) return `Cheque ${numeroConSerie(primero)}`;
  return `Cheques ${numeroConSerie(primero)} a ${numeroConSerie(ultimo)}`;
}

/** El rótulo de una hoja: «Cheque 1234» o «Comprobante del cheque 1234». */
export const rotuloDeLaHoja = (cheque: ChequeParaImprimir, parte: ParteDeLaImpresion): string =>
  parte === 'cheques' ? `Cheque ${numeroConSerie(cheque)}` : `Comprobante del cheque ${numeroConSerie(cheque)}`;

/** Lo que dice el botón de imprimir cada parte, con cuántas hojas lleva. */
export function textoDeImprimir(parte: ParteDeLaImpresion, hojas: number, hayOtraParte: boolean): string {
  if (!hayOtraParte) return hojas === 1 ? 'Imprimir' : `Imprimir (${hojas} hojas)`;
  const que = parte === 'cheques' ? 'los cheques' : 'los comprobantes en hoja carta';
  return hojas === 1 ? `Imprimir ${que}` : `Imprimir ${que} (${hojas})`;
}
