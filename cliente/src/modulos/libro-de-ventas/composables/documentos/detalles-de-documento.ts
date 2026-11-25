import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto, formatearNit } from '@/modulos/core/utilidades/formato';
import type {
  DocumentoEnLista,
  EstadoDeDocumento,
  FichaDeDocumento,
  LineaDeLaFicha,
} from '../../servicios/documentos.api';
import {
  CAUSAS_DE_ANULACION,
  CLASES_FISCALES,
  DESTINOS_DE_DOCUMENTO,
  TIPOS_DE_LINEA,
} from '../../textos-de-documentos';
import { etiquetaDePeriodo } from './filtros-de-documentos';

export type TonoDeInsignia = 'campo' | 'trigo' | 'tierra' | 'rojo';

export const textoDeEstado = (estado: EstadoDeDocumento): string => (estado === 'anulado' ? 'Anulado' : 'Vigente');
export const tonoDeEstado = (estado: EstadoDeDocumento): TonoDeInsignia => (estado === 'anulado' ? 'rojo' : 'campo');

/** El NIT escrito para leerlo; «CF» y los documentos que no son NIT se muestran como vienen. */
const identificacion = (documento: Pick<DocumentoEnLista, 'tipoDeIdentificacion' | 'nitReceptor'>): string =>
  documento.tipoDeIdentificacion === 'nit' ? formatearNit(documento.nitReceptor) : documento.nitReceptor;

/** Lo que muestra cada tarjeta de la lista, además del título y el nombre del cliente. */
export function detallesDeTarjeta(documento: DocumentoEnLista): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Fecha', valor: formatearFecha(documento.fechaEmision) },
    { etiqueta: 'Total', valor: formatearMonto(documento.total) },
    { etiqueta: 'NIT', valor: identificacion(documento) },
    { etiqueta: 'IVA', valor: formatearMonto(documento.iva) },
  ];
}

export interface EtiquetaDeTarjeta {
  texto: string;
  tono: TonoDeInsignia;
}

/** Las marcas de la tarjeta: anulado, sin cartera y fuera de los reportes de la SAT. */
export function etiquetasDeTarjeta(documento: DocumentoEnLista): EtiquetaDeTarjeta[] {
  const etiquetas: EtiquetaDeTarjeta[] = [
    { texto: textoDeEstado(documento.estado), tono: tonoDeEstado(documento.estado) },
  ];
  if (documento.estado === 'vigente' && documento.destino === null)
    etiquetas.push({ texto: 'Sin cartera', tono: 'trigo' });
  if (!documento.muestraEnReportesSat) etiquetas.push({ texto: 'Fuera de reportes SAT', tono: 'trigo' });
  return etiquetas;
}

const ORIGENES = { manual: 'Escrito a mano', bandeja_sat: 'De la bandeja de la SAT', fel: 'Emitido con FEL' } as const;

/** El encabezado de la ficha, sin los datos vacíos. */
export function detallesDeEncabezado(ficha: FichaDeDocumento): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Fecha de emisión', valor: formatearFecha(ficha.fechaEmision) },
    { etiqueta: 'Período del libro', valor: etiquetaDePeriodo(ficha.periodo) },
    { etiqueta: 'Receptor', valor: ficha.nombreReceptor },
    { etiqueta: 'Identificación', valor: identificacion(ficha) },
    { etiqueta: 'Destino', valor: ficha.destino ? DESTINOS_DE_DOCUMENTO[ficha.destino] : 'Sin cartera' },
    { etiqueta: 'Origen', valor: ORIGENES[ficha.origen] },
  ];
  if (ficha.tipoDte) detalles.push({ etiqueta: 'Código SAT', valor: ficha.tipoDte });
  if (ficha.autorizacionFel) detalles.push({ etiqueta: 'Autorización FEL', valor: ficha.autorizacionFel, largo: true });
  if (ficha.facturaAnterior) detalles.push(...detallesDeFacturaAnterior(ficha));
  if (ficha.observaciones) detalles.push({ etiqueta: 'Observaciones', valor: ficha.observaciones, largo: true });
  return detalles;
}

function detallesDeFacturaAnterior({ facturaAnterior }: FichaDeDocumento): DetalleDeRegistro[] {
  if (!facturaAnterior) return [];
  const numero = facturaAnterior.serie ? `${facturaAnterior.serie}-${facturaAnterior.numero}` : facturaAnterior.numero;
  return [{ etiqueta: 'Corrige la factura anterior', valor: `${numero} del ${formatearFecha(facturaAnterior.fecha)}` }];
}

/** Los datos de la anulación para la ficha. */
export function detallesDeAnulacion(ficha: FichaDeDocumento): DetalleDeRegistro[] {
  const { anulacion } = ficha;
  if (!anulacion) return [];
  return [
    { etiqueta: 'Causa', valor: CAUSAS_DE_ANULACION[anulacion.causa] },
    { etiqueta: 'Fecha', valor: formatearFecha(anulacion.fecha) },
    { etiqueta: 'Motivo', valor: anulacion.motivo, largo: true },
  ];
}

/** Las cifras de una línea de la ficha, en el orden en que se leen. */
export function cifrasDeLinea(linea: LineaDeLaFicha): { etiqueta: string; valor: string }[] {
  return [
    { etiqueta: 'Base', valor: linea.base },
    { etiqueta: 'IVA', valor: linea.iva },
    { etiqueta: 'Otros impuestos', valor: linea.otrosImpuestos },
    { etiqueta: 'Total', valor: linea.total },
  ];
}

/** Bien o servicio y clase fiscal, como se lee en la línea. */
export const clasificacionDeLinea = (linea: LineaDeLaFicha): string =>
  `${TIPOS_DE_LINEA[linea.tipo]} · ${CLASES_FISCALES[linea.claseFiscal]}`;

/** Las columnas del libro con su valor, para los totales de la ficha; las que están en cero no se muestran. */
export function totalesConValor(ficha: FichaDeDocumento): { etiqueta: string; valor: string }[] {
  const { totales } = ficha;
  const columnas = [
    { etiqueta: 'Gravado de bienes', valor: totales.gravadoBienes },
    { etiqueta: 'Gravado de servicios', valor: totales.gravadoServicios },
    { etiqueta: 'Exento', valor: totales.exento },
    { etiqueta: 'Exportación', valor: totales.exportacion },
    { etiqueta: 'IVA', valor: totales.iva },
    { etiqueta: 'Otros impuestos', valor: totales.otrosImpuestos },
  ];
  return columnas.filter(({ valor }) => Number(valor) !== 0);
}
