import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto, formatearSiNo, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { Documento } from '../../servicios/documentos.api';
import {
  ETIQUETAS_DE_CAUSA,
  ETIQUETAS_DE_CLASE,
  ETIQUETAS_DE_DESTINO,
  ETIQUETAS_DE_ESTADO,
} from '../compartido/etiquetas';

/** El permiso que anula cada clase de documento; el servidor valida el mismo. */
export const PERMISO_DE_ANULACION: Record<Documento['clase'], string> = {
  entrada_manual: 'inventarios.entradas.anular',
  salida_por_consumo: 'inventarios.salidas.anular',
  recepcion_de_compra: 'inventarios.recepciones.anular',
  devolucion_a_proveedor: 'inventarios.recepciones.anular',
  rebaja_de_costo: 'inventarios.recepciones.anular',
};

/** «Entrada n.º 12». */
export const tituloDeDocumento = (documento: Pick<Documento, 'clase' | 'numero'>): string =>
  `${ETIQUETAS_DE_CLASE[documento.clase]} n.º ${documento.numero}`;

/** Lo que explica por qué o para qué es el documento: la causa de una entrada o el destino de una salida. */
export function motivoDelDocumento(documento: Documento): string {
  if (documento.causa) return ETIQUETAS_DE_CAUSA[documento.causa];
  if (documento.destino) return ETIQUETAS_DE_DESTINO[documento.destino];
  return '';
}

/** Lo que muestra la tarjeta de una lista de documentos. */
export const detallesDeLaTarjeta = (documento: Documento): DetalleDeRegistro[] => [
  { etiqueta: 'Fecha', valor: formatearFecha(documento.fecha) },
  { etiqueta: 'Bodega', valor: formatearTexto(documento.bodegaNombre) },
  { etiqueta: 'Motivo', valor: formatearTexto(motivoDelDocumento(documento)) },
  ...(documento.costoTotal !== null ? [{ etiqueta: 'Costo total', valor: formatearMonto(documento.costoTotal) }] : []),
];

/** Lo que muestra la ficha del documento, con lo que solo aplica a entradas o salidas cuando lo tienen. */
export function detallesDeLaFicha(documento: Documento): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Fecha', valor: formatearFecha(documento.fecha) },
    { etiqueta: 'Bodega', valor: formatearTexto(documento.bodegaNombre) },
    { etiqueta: 'Estado', valor: ETIQUETAS_DE_ESTADO[documento.estado] },
  ];
  const opcionales: [string, string | null][] = [
    ['Motivo', motivoDelDocumento(documento) || null],
    ['Soporte', documento.soporte],
    ['Concepto de gasto', documento.conceptoDeGastoNombre],
    ['Entregado a', documento.entregadoA],
    ['Observaciones', documento.observaciones],
    ['Motivo de la anulación', documento.motivoDeAnulacion],
  ];
  for (const [etiqueta, valor] of opcionales) if (valor) detalles.push({ etiqueta, valor });
  if (documento.requiereFactura) detalles.push({ etiqueta: 'Requiere factura', valor: formatearSiNo(true) });
  if (documento.costoTotal !== null)
    detalles.push({ etiqueta: 'Costo total', valor: formatearMonto(documento.costoTotal) });
  return detalles;
}
