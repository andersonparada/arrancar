import type { ConsultaDeDocumentos, DocumentoEnLista, PaginaDeDocumentos } from '../../servicios/documentos.api';
import { FORMULARIO_DE_DOCUMENTO as textos } from '../../textos-de-documentos';
import { admiteNota } from './tipos-de-documento';

/** Cuántos documentos trae cada búsqueda; para ir a una factura antigua se escribe su serie o número. */
export const FACTURAS_POR_BUSQUEDA = 50;

/** Lo que el selector de «factura que corrige» necesita saber de la búsqueda. */
export interface BusquedaDeFacturas {
  elementos: DocumentoEnLista[];
  cargando: boolean;
  /** La lectura falló: no es lo mismo que «no hay facturas». */
  fallo: boolean;
  /** Hay más documentos de los que se muestran. */
  hayMas: boolean;
}

export const busquedaDeFacturasVacia = (): BusquedaDeFacturas => ({
  elementos: [],
  cargando: false,
  fallo: false,
  hayMas: false,
});

/** Las facturas vigentes del cliente, o de consumidor final si no hay cliente; `texto` busca serie o número. */
export function consultaDeFacturas(clienteId: string | null, texto: string): ConsultaDeDocumentos {
  const buscado = texto.trim();
  return {
    estado: 'vigente',
    limite: FACTURAS_POR_BUSQUEDA,
    ...(clienteId ? { clienteId } : { sinCliente: true }),
    ...(buscado ? { texto: buscado } : {}),
  };
}

/**
 * Deja solo las facturas que admiten nota. Si la elegida ya no sale en esta búsqueda se conserva (de la lista
 * anterior), para que el selector no quede en blanco mientras se busca otra.
 */
export function resultadoDeFacturas(
  pagina: PaginaDeDocumentos,
  elegida: { id: string | null; anteriores: DocumentoEnLista[] },
): Pick<BusquedaDeFacturas, 'elementos' | 'hayMas'> {
  const elementos = pagina.elementos.filter((factura) => admiteNota(factura.tipo));
  const faltante = elegida.id && !elementos.some((f) => f.id === elegida.id);
  const previa = faltante ? elegida.anteriores.find((f) => f.id === elegida.id) : undefined;
  return { elementos: previa ? [previa, ...elementos] : elementos, hayMas: pagina.total > pagina.elementos.length };
}

/** Qué decirle al usuario cuando la búsqueda no trae facturas. */
export function sinResultados(clienteId: string | null, texto: string): string {
  if (texto.trim()) return textos.sinCoincidencias;
  return clienteId ? textos.sinFacturasDelCliente : textos.sinFacturasDeConsumidorFinal;
}
