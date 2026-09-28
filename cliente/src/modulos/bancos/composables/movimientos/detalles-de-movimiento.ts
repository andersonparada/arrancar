import {
  formatearFecha,
  formatearMonto,
  formatearOpcion,
  formatearSiNo,
  formatearTexto,
} from '@/modulos/core/utilidades/formato';
import { OPCIONES_DE_TIPO } from './edicion-de-movimiento';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Movimiento } from '../../servicios/movimientos.api';

/** Lo que muestra la tarjeta del movimiento además de referencia, ya con formato. */
export const detallesDeMovimiento = (registro: Movimiento): DetalleDeRegistro[] => [
  { etiqueta: 'Cuenta', valor: formatearTexto(registro.cuentaBancariaNombre) },
  { etiqueta: 'Tipo', valor: formatearOpcion(OPCIONES_DE_TIPO, registro.tipo) },
  { etiqueta: 'Fecha', valor: formatearFecha(registro.fecha) },
  { etiqueta: 'Monto', valor: formatearMonto(registro.monto) },
  { etiqueta: 'Saldo inicial', valor: formatearSiNo(registro.saldoInicial) },
  { etiqueta: 'Beneficiario u origen', valor: formatearTexto(registro.beneficiario) },
  { etiqueta: 'Observaciones', valor: formatearTexto(registro.observaciones) },
];
