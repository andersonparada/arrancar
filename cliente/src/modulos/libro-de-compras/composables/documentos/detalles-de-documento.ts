import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import {
  formatearFecha,
  formatearFechaHora,
  formatearMonto,
  formatearOpcion,
  formatearSiNo,
  formatearTexto,
} from '@/modulos/core/utilidades/formato';
import type {
  DocumentoEnLista,
  EstadoDeDocumento,
  FichaDeDocumento,
  LineaDeDocumento,
} from '../../servicios/documentos.api';
import {
  textoDeCausa,
  DESTINOS_DE_DOCUMENTO,
  MOTIVOS_SIN_CREDITO,
  TIPOS_DE_DOCUMENTO,
} from '../../textos-de-documentos';
import { etiquetaDePeriodo } from './filtros-de-documentos';

type Identificable = { tipo: DocumentoEnLista['tipo']; serie: string | null; numero: string };

/** «Factura A-123» o «Nota de crédito 45» (sin serie). */
export function tituloDeDocumento({ tipo, serie, numero }: Identificable): string {
  return `${TIPOS_DE_DOCUMENTO[tipo]} ${serie ? `${serie}-${numero}` : numero}`;
}

export const textoDeEstado = (estado: EstadoDeDocumento): string => (estado === 'vigente' ? 'Vigente' : 'Anulado');

export const tonoDeEstado = (estado: EstadoDeDocumento): 'campo' | 'rojo' => (estado === 'vigente' ? 'campo' : 'rojo');

/** Los datos de una tarjeta de la lista, con formato. */
export function detallesDeTarjeta(documento: DocumentoEnLista): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Fecha', valor: formatearFecha(documento.fechaEmision) },
    { etiqueta: 'Total', valor: formatearMonto(documento.total) },
    { etiqueta: 'Retenido', valor: formatearMonto(documento.retenido) },
    { etiqueta: 'Neto a pagar', valor: formatearMonto(documento.netoAPagar) },
  ];
}

/** Los datos del encabezado de la ficha; lo que no se llenó se omite. */
export function detallesDeEncabezado(ficha: FichaDeDocumento): DetalleDeRegistro[] {
  const motivoDeLaFactura = ficha.motivoDeLaFactura ? MOTIVOS_SIN_CREDITO[ficha.motivoDeLaFactura] : null;
  const detalles: [string, string | null][] = [
    ['Emisor', ficha.nombreEmisor],
    ['NIT del emisor', ficha.nitEmisor],
    ['Tipo', TIPOS_DE_DOCUMENTO[ficha.tipo]],
    ['Código SAT', ficha.tipoDte ?? null],
    ['Serie', ficha.serie],
    ['Número', ficha.numero],
    ['Autorización FEL', ficha.autorizacionFel],
    ['NIT del receptor', ficha.nitReceptor],
    ['Fecha de emisión', formatearFecha(ficha.fechaEmision)],
    ['Fecha de recepción', formatearFecha(ficha.fechaRecepcion)],
    ['Período del libro', etiquetaDePeriodo(ficha.periodo)],
    ['Destino', formatearOpcion(DESTINOS_DE_DOCUMENTO, ficha.destino)],
    ['Se muestra en reportes SAT', formatearSiNo(ficha.muestraEnReportesSat)],
    ['Motivo de la factura', motivoDeLaFactura],
    ['Observaciones', ficha.observaciones],
  ];
  return detalles
    .filter(([, valor]) => valor !== null && valor !== '')
    .map(([etiqueta, valor]) => ({ etiqueta, valor: formatearTexto(valor) }));
}

/** Los datos de la anulación de un registro anulado. */
export function detallesDeAnulacion(ficha: FichaDeDocumento): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Anulado el', valor: formatearFechaHora(ficha.anuladoEn) },
    { etiqueta: 'Causa', valor: ficha.causaDeAnulacion ? textoDeCausa(ficha.causaDeAnulacion, ficha.tipo) : '—' },
    { etiqueta: 'Motivo', valor: formatearTexto(ficha.motivoDeAnulacion) },
  ];
}

const aCentavos = (monto: string): number => Math.round(Number(monto) * 100);

/** La suma de montos en texto, sin errores de redondeo. */
export const sumarMontos = (montos: string[]): string =>
  (montos.reduce((suma, monto) => suma + aCentavos(monto), 0) / 100).toFixed(2);

/** Lo retenido en total, para el resumen de totales. */
export const totalRetenido = (ficha: Pick<FichaDeDocumento, 'retenciones'>): string =>
  sumarMontos(ficha.retenciones.map((retencion) => retencion.monto));

/** Cómo se llama el concepto de una línea: su nombre si se conoce; si no, la descripción. */
export function nombreDeLinea(linea: LineaDeDocumento, conceptos: Map<string, string>): string {
  const concepto = conceptos.get(linea.conceptoId);
  if (concepto && linea.descripcion) return `${concepto}: ${linea.descripcion}`;
  return concepto ?? linea.descripcion ?? 'Concepto';
}

/** Los montos de una línea; IDP y exento solo si los hay. */
export function cifrasDeLinea(linea: LineaDeDocumento): { etiqueta: string; valor: string }[] {
  const opcionales = [
    { etiqueta: 'IDP', valor: linea.idp },
    { etiqueta: 'Exento', valor: linea.exento },
  ].filter(({ valor }) => aCentavos(valor) !== 0);
  return [
    { etiqueta: 'Total', valor: linea.total },
    { etiqueta: 'Base (sin IVA)', valor: linea.base },
    { etiqueta: 'IVA', valor: linea.iva },
    { etiqueta: 'IVA no acreditable', valor: linea.ivaNoAcreditable },
    ...opcionales,
    { etiqueta: 'Costo', valor: linea.costo },
  ];
}
