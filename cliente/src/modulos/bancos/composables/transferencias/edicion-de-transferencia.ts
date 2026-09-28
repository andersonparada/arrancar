import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosTransferencia } from '../../servicios/transferencias.api';

/** Lo que muestra cada campo de la ventana mientras se registra una transferencia. */
export interface EdicionDeTransferencia {
  abierta: boolean;
  cuentaOrigenId: string | null;
  cuentaDestinoId: string | null;
  fecha: string;
  monto: string | number;
  referencia: string;
  observaciones: string;
}

/** La ventana recién abierta, vacía. */
export function edicionDe(): EdicionDeTransferencia {
  return {
    abierta: true,
    cuentaOrigenId: null,
    cuentaDestinoId: null,
    fecha: '',
    monto: '',
    referencia: '',
    observaciones: '',
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeTransferencia = (edicion: EdicionDeTransferencia): DatosTransferencia => ({
  cuentaOrigenId: edicion.cuentaOrigenId ?? '',
  cuentaDestinoId: edicion.cuentaDestinoId ?? '',
  fecha: edicion.fecha,
  monto: textoDeEdicion(edicion.monto),
  referencia: textoONulo(edicion.referencia),
  observaciones: textoONulo(edicion.observaciones),
});
