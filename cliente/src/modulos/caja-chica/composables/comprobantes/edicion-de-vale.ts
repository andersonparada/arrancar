import { textoDeEdicion } from '@/modulos/core/utilidades/edicion';
import type { ValeDeGastoSolicitado } from '../../servicios/tipos-de-comprobantes';

/** El vale de gasto de la ventana: la fecha vacía es hoy y el motivo del tope solo cuenta si el vale pasa del tope. */
export interface EdicionDeVale {
  fecha: string;
  monto: string | number | null;
  descripcion: string;
  pagadoA: string;
  conceptoDeGastoId: string | null;
  motivoSinDocumento: string;
  motivoSobreElTope: string;
}

export const edicionDeVale = (): EdicionDeVale => ({
  fecha: '',
  monto: '',
  descripcion: '',
  pagadoA: '',
  conceptoDeGastoId: null,
  motivoSinDocumento: '',
  motivoSobreElTope: '',
});

const textoONulo = (texto: string): string | null => texto.trim() || null;

/** Lo que falta escribir de un gasto sin factura que se arma antes de enviar (al liquidar un vale provisional). */
export function faltaDelGastoSinFactura(edicion: EdicionDeVale): Record<string, string> {
  const faltantes: Record<string, string> = {};
  if (!/^\d+(\.\d{1,2})?$/.test(textoDeEdicion(edicion.monto).trim()) || Number(edicion.monto) <= 0) {
    faltantes.monto = 'Escriba el monto, mayor que cero y con hasta dos decimales.';
  }
  if (!edicion.descripcion.trim()) faltantes.descripcion = 'Escriba qué se compró o pagó.';
  if (!edicion.pagadoA.trim()) faltantes.pagadoA = 'Escriba a quién se pagó.';
  if (!edicion.conceptoDeGastoId) faltantes.conceptoDeGastoId = 'Escoja el concepto de gasto.';
  if (!edicion.motivoSinDocumento.trim()) faltantes.motivoSinDocumento = 'Escriba por qué no hay factura.';
  return faltantes;
}

export function cuerpoDeVale(edicion: EdicionDeVale): ValeDeGastoSolicitado {
  return {
    fecha: textoONulo(edicion.fecha),
    monto: textoDeEdicion(edicion.monto).trim(),
    descripcion: edicion.descripcion.trim(),
    pagadoA: edicion.pagadoA.trim(),
    conceptoDeGastoId: edicion.conceptoDeGastoId ?? '',
    motivoSinDocumento: edicion.motivoSinDocumento.trim(),
    motivoSobreElTope: textoONulo(edicion.motivoSobreElTope),
  };
}
