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
