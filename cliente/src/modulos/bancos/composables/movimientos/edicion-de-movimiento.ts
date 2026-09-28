import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosMovimiento, Movimiento } from '../../servicios/movimientos.api';

export const OPCIONES_DE_TIPO = { credito: 'Nota de crédito', debito: 'Nota de débito' };

/** Lo que muestra cada campo de la ventana mientras se edita un movimiento. */
export interface EdicionDeMovimiento {
  abierta: boolean;
  id: string | null;
  cuentaBancariaId: string | null;
  tipo: 'credito' | 'debito';
  fecha: string;
  monto: string | number;
  saldoInicial: boolean;
  referencia: string;
  beneficiario: string;
  observaciones: string;
}

const MOVIMIENTO_NUEVO: Omit<EdicionDeMovimiento, 'abierta' | 'id'> = {
  cuentaBancariaId: null,
  tipo: 'credito',
  fecha: '',
  monto: '',
  saldoInicial: false,
  referencia: '',
  beneficiario: '',
  observaciones: '',
};

/**
 * La ventana abierta con los datos del movimiento, o vacía (con `tipo`) si es
 * nuevo. Un cheque nunca llega aquí: su tarjeta no ofrece "Editar".
 */
export function edicionDe(movimiento?: Movimiento, tipo: 'credito' | 'debito' = 'credito'): EdicionDeMovimiento {
  if (!movimiento) return { abierta: true, id: null, ...MOVIMIENTO_NUEVO, tipo };
  return {
    abierta: true,
    id: movimiento.id,
    cuentaBancariaId: movimiento.cuentaBancariaId,
    tipo: movimiento.tipo === 'credito' ? 'credito' : 'debito',
    fecha: textoDeEdicion(movimiento.fecha),
    monto: textoDeEdicion(movimiento.monto),
    saldoInicial: movimiento.saldoInicial,
    referencia: textoDeEdicion(movimiento.referencia),
    beneficiario: textoDeEdicion(movimiento.beneficiario),
    observaciones: textoDeEdicion(movimiento.observaciones),
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeMovimiento = (edicion: EdicionDeMovimiento): DatosMovimiento => ({
  cuentaBancariaId: edicion.cuentaBancariaId ?? '',
  tipo: edicion.tipo,
  fecha: edicion.fecha,
  monto: textoDeEdicion(edicion.monto),
  saldoInicial: edicion.saldoInicial,
  referencia: textoONulo(edicion.referencia),
  beneficiario: textoONulo(edicion.beneficiario),
  observaciones: textoONulo(edicion.observaciones),
});
