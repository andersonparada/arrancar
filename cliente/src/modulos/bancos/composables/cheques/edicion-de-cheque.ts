import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosDeEmisionDeCheque } from '../../servicios/cheques.api';

/** Lo que muestra cada campo de la ventana mientras se emite un cheque. */
export interface EdicionDeCheque {
  abierta: boolean;
  cuentaBancariaId: string | null;
  chequeId: string | null;
  fecha: string;
  monto: string | number;
  beneficiario: string;
  noNegociable: boolean;
  paraAbonoEnCuenta: boolean;
  conceptoId: string | null;
  referencia: string;
  observaciones: string;
}

/** La ventana recién abierta, vacía, con «No negociable» marcado y «Para abono en cuenta» sin marcar. */
export function edicionDeCheque(): EdicionDeCheque {
  return {
    abierta: true,
    cuentaBancariaId: null,
    chequeId: null,
    fecha: '',
    monto: '',
    beneficiario: '',
    noNegociable: true,
    paraAbonoEnCuenta: false,
    conceptoId: null,
    referencia: '',
    observaciones: '',
  };
}

/** Lo que se manda al servidor: lo vacío como `null`. */
export const datosDeEmisionDeCheque = (edicion: EdicionDeCheque): DatosDeEmisionDeCheque => ({
  fecha: edicion.fecha,
  monto: textoDeEdicion(edicion.monto),
  beneficiario: edicion.beneficiario.trim(),
  noNegociable: edicion.noNegociable,
  paraAbonoEnCuenta: edicion.paraAbonoEnCuenta,
  conceptoId: edicion.conceptoId ?? '',
  referencia: textoONulo(edicion.referencia),
  observaciones: textoONulo(edicion.observaciones),
});
