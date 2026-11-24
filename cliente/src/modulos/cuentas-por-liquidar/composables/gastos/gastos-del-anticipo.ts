import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { Gasto, SolicitudDeGastoSinDocumento } from '../../servicios/tipos-de-gastos';
import { centavosDe, MONTO_MAXIMO_EN_CENTAVOS, textoDeCentavos } from '../dinero';

export const MAXIMO_DE_LA_DESCRIPCION_DEL_GASTO = 300;
export const MAXIMO_DE_PAGADO_A = 150;
export const MAXIMO_DEL_MOTIVO_DEL_GASTO = 300;

/** Lo que se escribe al registrar un gasto sin documento (nada de lo que tiene factura). */
export interface EdicionDeGastoSinDocumento {
  fecha: string;
  monto: string;
  descripcion: string;
  pagadoA: string;
  conceptoDeGastoId: string;
  motivoSinDocumento: string;
}

export const gastoSinDocumentoVacio = (hoy: string): EdicionDeGastoSinDocumento => ({
  fecha: hoy,
  monto: '',
  descripcion: '',
  pagadoA: '',
  conceptoDeGastoId: '',
  motivoSinDocumento: '',
});

function erroresDeLosTextos(edicion: EdicionDeGastoSinDocumento): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.descripcion.trim()) errores.descripcion = 'Escriba qué se compró o se pagó.';
  if (!edicion.pagadoA.trim()) errores.pagadoA = 'Escriba a quién se le pagó.';
  if (!edicion.conceptoDeGastoId) errores.conceptoDeGastoId = 'Escoja el concepto de gasto.';
  if (!edicion.motivoSinDocumento.trim()) errores.motivoSinDocumento = 'Escriba por qué no hay documento.';
  return errores;
}

/** Los errores por campo antes de molestar al servidor; `hoy` es `AAAA-MM-DD`. */
export function erroresDelGastoSinDocumento(edicion: EdicionDeGastoSinDocumento, hoy: string): Record<string, string> {
  const errores = erroresDeLosTextos(edicion);
  const centavos = centavosDe(edicion.monto);
  if (centavos === null) errores.monto = 'Escriba el monto con hasta dos decimales, por ejemplo 45.50.';
  else if (centavos > MONTO_MAXIMO_EN_CENTAVOS)
    errores.monto = 'El monto es demasiado grande: no puede pasar de 999,999,999,999.99.';
  else if (centavos <= 0) errores.monto = 'Escriba el monto: debe ser mayor que cero.';
  if (!edicion.fecha) errores.fecha = 'Escriba la fecha del gasto.';
  else if (edicion.fecha > hoy) errores.fecha = 'El gasto no puede tener fecha futura.';
  return errores;
}

export function solicitudDeGastoSinDocumento(edicion: EdicionDeGastoSinDocumento): SolicitudDeGastoSinDocumento {
  return {
    fecha: edicion.fecha,
    monto: textoDeCentavos(centavosDe(edicion.monto) ?? 0),
    descripcion: edicion.descripcion.trim(),
    pagadoA: edicion.pagadoA.trim(),
    conceptoDeGastoId: edicion.conceptoDeGastoId,
    motivoSinDocumento: edicion.motivoSinDocumento.trim(),
  };
}

const NOMBRES_DE_TIPO: Record<string, string> = {
  factura: 'Factura',
  nota_de_credito: 'Nota de crédito',
  nota_de_debito: 'Nota de débito',
  recibo: 'Recibo',
};

/** El título de un gasto: el documento (`Factura A-123`) o su descripción si no lo tiene. */
export function tituloDelGasto(gasto: Pick<Gasto, 'clase' | 'tipoDeDocumento' | 'etiqueta'>): string {
  if (gasto.clase === 'sin_documento') return gasto.etiqueta || 'Gasto sin documento';
  const tipo = gasto.tipoDeDocumento ? (NOMBRES_DE_TIPO[gasto.tipoDeDocumento] ?? 'Documento') : 'Documento';
  return `${tipo} ${gasto.etiqueta}`;
}

/** El monto con su signo: una nota de crédito baja lo gastado. */
export const montoDelGasto = (gasto: Pick<Gasto, 'monto' | 'resta'>): string =>
  gasto.resta ? `- ${formatearMonto(gasto.monto)}` : formatearMonto(gasto.monto);

function detallesDelDocumento(gasto: Gasto): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [];
  if (gasto.proveedor) detalles.push({ etiqueta: 'Proveedor', valor: gasto.proveedor });
  if (gasto.fechaDeEmision) detalles.push({ etiqueta: 'Emitida', valor: formatearFecha(gasto.fechaDeEmision) });
  if (gasto.montoRetenido !== '0.00') {
    detalles.push({ etiqueta: 'Retención (la entera la empresa)', valor: formatearMonto(gasto.montoRetenido) });
  }
  if (gasto.motivoConRetencion) {
    detalles.push({ etiqueta: 'Asignada con retención, por', valor: gasto.motivoConRetencion, largo: true });
  }
  return detalles;
}

function detallesDelGastoSinDocumento(gasto: Gasto): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [];
  if (gasto.pagadoA) detalles.push({ etiqueta: 'Pagado a', valor: gasto.pagadoA });
  if (gasto.motivoSinDocumento)
    detalles.push({ etiqueta: 'Sin documento porque', valor: gasto.motivoSinDocumento, largo: true });
  return detalles;
}

/** Lo que se ve de un gasto en la ficha del anticipo. */
export function detallesDelGasto(gasto: Gasto): DetalleDeRegistro[] {
  const propios = gasto.clase === 'documento' ? detallesDelDocumento(gasto) : detallesDelGastoSinDocumento(gasto);
  return [{ etiqueta: 'Fecha', valor: formatearFecha(gasto.fecha) }, ...propios];
}

/** Cuántos documentos y cuántos gastos sin documento hay, dicho para el título de la sección. */
export function resumenDeLosGastos(gastos: readonly Gasto[]): string {
  const conDocumento = gastos.filter(({ clase }) => clase === 'documento').length;
  const sinDocumento = gastos.length - conDocumento;
  if (gastos.length === 0) return 'Sin gastos todavía';
  const partes = [
    conDocumento > 0 ? `${conDocumento} ${conDocumento === 1 ? 'documento' : 'documentos'}` : '',
    sinDocumento > 0 ? `${sinDocumento} sin documento` : '',
  ].filter(Boolean);
  return partes.join(' y ');
}

/** Un gasto sin documento no es deducible: se le pone una marca para que no pase desapercibido. */
export const marcaDelGasto = (gasto: Pick<Gasto, 'clase' | 'sinBancarizar'>): string | undefined => {
  if (gasto.clase === 'sin_documento') return 'Sin documento';
  return gasto.sinBancarizar ? 'Sin bancarizar' : undefined;
};
