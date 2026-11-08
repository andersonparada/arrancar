import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearFechaHora, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { DocumentoPorPagar, EstadoDeDocumento, FichaDelDocumento } from '../servicios/tipos';
import { CAUSAS_DE_ANULACION, ESTADOS_DE_DOCUMENTO, TIPOS_DE_DOCUMENTO } from '../textos';

type Identificable = Pick<DocumentoPorPagar, 'tipo' | 'serie' | 'numero'>;
type Tono = 'campo' | 'trigo' | 'tierra' | 'rojo';

/** «Factura A-123» o «Nota de crédito 45» (sin serie). */
export function tituloDeDocumento({ tipo, serie, numero }: Identificable): string {
  return `${TIPOS_DE_DOCUMENTO[tipo]} ${serie ? `${serie}-${numero}` : numero}`;
}

export const textoDeEstado = (estado: EstadoDeDocumento): string => ESTADOS_DE_DOCUMENTO[estado];

const TONOS_DE_ESTADO: Record<EstadoDeDocumento, Tono> = {
  pendiente: 'tierra',
  registrado: 'trigo',
  autorizado: 'campo',
  anulado: 'rojo',
};

export const tonoDeEstado = (estado: EstadoDeDocumento): Tono => TONOS_DE_ESTADO[estado];

/** El saldo de una nota de crédito es lo que queda a favor de la empresa. */
export const etiquetaDelSaldo = ({ clase }: Pick<DocumentoPorPagar, 'clase'>): string =>
  clase === 'abono' ? 'Saldo a favor' : 'Saldo';

/** Los datos de una tarjeta de la bandeja: lo necesario para decidir el vencimiento. */
export function detallesDeBandeja(documento: DocumentoPorPagar): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Emisión', valor: formatearFecha(documento.fechaEmision) },
    { etiqueta: 'Recepción', valor: formatearFecha(documento.fechaRecepcion) },
    { etiqueta: 'Total', valor: formatearMonto(documento.total) },
    { etiqueta: 'Neto a pagar', valor: formatearMonto(documento.neto) },
  ];
}

/** Los datos de una tarjeta de la lista, con el saldo. */
export function detallesDeLista(documento: DocumentoPorPagar): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Emisión', valor: formatearFecha(documento.fechaEmision) },
    { etiqueta: 'Vence', valor: documento.vencimiento ? formatearFecha(documento.vencimiento) : '—' },
    { etiqueta: 'Neto a pagar', valor: formatearMonto(documento.neto) },
    { etiqueta: etiquetaDelSaldo(documento), valor: formatearMonto(documento.saldo) },
  ];
}

const vencimientoEnLaFicha = (ficha: FichaDelDocumento): string | null =>
  ficha.vencimiento ? `${formatearFecha(ficha.vencimiento)}${ficha.vencido ? ' (vencido)' : ''}` : null;

/** Los datos del encabezado de la ficha; el vencimiento de una nota de crédito no se muestra. */
export function detallesDeFicha(ficha: FichaDelDocumento): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Proveedor', valor: ficha.proveedorNombre },
    { etiqueta: 'Tipo', valor: TIPOS_DE_DOCUMENTO[ficha.tipo] },
    { etiqueta: 'Serie y número', valor: ficha.serie ? `${ficha.serie}-${ficha.numero}` : ficha.numero },
    { etiqueta: 'Fecha de emisión', valor: formatearFecha(ficha.fechaEmision) },
    { etiqueta: 'Fecha de recepción', valor: formatearFecha(ficha.fechaRecepcion) },
  ];
  if (ficha.clase === 'cargo') detalles.push({ etiqueta: 'Vence', valor: formatearTexto(vencimientoEnLaFicha(ficha)) });
  detalles.push({ etiqueta: 'Estado', valor: textoDeEstado(ficha.estado) });
  return detalles;
}

/** Los montos de la ficha: de dónde sale lo que se debe. */
export function detallesDeMontos(ficha: FichaDelDocumento): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Total', valor: formatearMonto(ficha.total) },
    { etiqueta: 'Retenciones', valor: formatearMonto(ficha.retenciones) },
    { etiqueta: 'Neto a pagar', valor: formatearMonto(ficha.neto) },
    { etiqueta: 'Aplicado (notas de crédito)', valor: formatearMonto(ficha.aplicado) },
    { etiqueta: etiquetaDelSaldo(ficha), valor: formatearMonto(ficha.saldo) },
  ];
}

/** Cuándo se completó y se autorizó; lo que aún no pasó se omite. */
export function detallesDeSeguimiento(ficha: FichaDelDocumento): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [];
  if (ficha.registradoEn) detalles.push({ etiqueta: 'Completado el', valor: formatearFechaHora(ficha.registradoEn) });
  if (ficha.autorizadoEn) detalles.push({ etiqueta: 'Autorizado el', valor: formatearFechaHora(ficha.autorizadoEn) });
  if (ficha.autorizacionPropia) {
    detalles.push({ etiqueta: 'Autorización', valor: 'La dio quien lo ingresó o lo completó' });
  }
  return detalles;
}

/** El bloque «Anulación»: causa, motivo, quién y cuándo; vacío si el documento no está anulado. */
export function detallesDeAnulacion(ficha: Pick<FichaDelDocumento, 'anulacion'>): DetalleDeRegistro[] {
  const anulacion = ficha.anulacion;
  if (!anulacion) return [];
  return [
    { etiqueta: 'Causa', valor: formatearTexto(anulacion.causa ? CAUSAS_DE_ANULACION[anulacion.causa] : null) },
    { etiqueta: 'Motivo', valor: formatearTexto(anulacion.motivo) },
    { etiqueta: 'Anulado por', valor: formatearTexto(anulacion.anuladoPor) },
    { etiqueta: 'Anulado el', valor: anulacion.anuladoEn ? formatearFechaHora(anulacion.anuladoEn) : '—' },
  ];
}
