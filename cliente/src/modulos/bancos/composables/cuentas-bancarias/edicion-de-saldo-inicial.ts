import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { Movimiento } from '../../servicios/movimientos.api';
import type { DatosSaldoInicial } from '../../servicios/saldos-iniciales.api';

/** Lo que muestra cada campo de la ventana mientras se edita el saldo inicial. */
export interface EdicionDeSaldoInicial {
  abierta: boolean;
  id: string | null;
  cuentaBancariaId: string;
  tipo: 'credito' | 'debito';
  fecha: string;
  monto: string | number;
  referencia: string;
  observaciones: string;
}

/** La ventana abierta con los datos del saldo inicial vigente, o vacía (con crédito por omisión) si aún no tiene. */
export function edicionDe(cuentaBancariaId: string, saldoInicial?: Movimiento): EdicionDeSaldoInicial {
  if (!saldoInicial) {
    return {
      abierta: true,
      id: null,
      cuentaBancariaId,
      tipo: 'credito',
      fecha: '',
      monto: '',
      referencia: '',
      observaciones: '',
    };
  }
  return {
    abierta: true,
    id: saldoInicial.id,
    cuentaBancariaId,
    tipo: saldoInicial.tipo === 'credito' ? 'credito' : 'debito',
    fecha: textoDeEdicion(saldoInicial.fecha),
    monto: textoDeEdicion(saldoInicial.monto),
    referencia: textoDeEdicion(saldoInicial.referencia),
    observaciones: textoDeEdicion(saldoInicial.observaciones),
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeSaldoInicial = (edicion: EdicionDeSaldoInicial): DatosSaldoInicial => ({
  cuentaBancariaId: edicion.cuentaBancariaId,
  tipo: edicion.tipo,
  fecha: edicion.fecha,
  monto: textoDeEdicion(edicion.monto),
  referencia: textoONulo(edicion.referencia),
  observaciones: textoONulo(edicion.observaciones),
});
