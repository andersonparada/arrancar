import { formatearFecha, formatearTexto } from '@/modulos/core/utilidades/formato';
import { OPCIONES_DE_TIPO } from './edicion-de-movimiento';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Movimiento } from '../../servicios/movimientos.api';

/** El color y el signo con que se distinguen las entradas de las salidas. */
export const CLASE_DE_TIPO: Record<Movimiento['tipo'], string> = {
  credito: 'text-campo-700 dark:text-campo-400',
  debito: 'text-red-700 dark:text-red-400',
};

export const SIGNO_DE_TIPO: Record<Movimiento['tipo'], string> = {
  credito: '+',
  debito: '−',
};

/** El título de la tarjeta: el saldo inicial se distingue de una nota normal. */
export const tituloDeMovimiento = (registro: Pick<Movimiento, 'tipo' | 'saldoInicial'>): string =>
  registro.saldoInicial ? 'Saldo inicial' : OPCIONES_DE_TIPO[registro.tipo];

/** Lo que muestra la tarjeta del movimiento; el monto va aparte, destacado y con color. */
export function detallesDeMovimiento(registro: Movimiento): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Cuenta', valor: formatearTexto(registro.cuentaBancariaNombre) },
    { etiqueta: 'Fecha', valor: formatearFecha(registro.fecha) },
    { etiqueta: 'Referencia', valor: formatearTexto(registro.referencia) },
    { etiqueta: 'Beneficiario u origen', valor: formatearTexto(registro.beneficiario) },
  ];
  if (registro.observaciones) detalles.push({ etiqueta: 'Observaciones', valor: registro.observaciones });
  if (registro.anuladoEn) {
    detalles.push({ etiqueta: 'Motivo de anulación', valor: formatearTexto(registro.motivoDeAnulacion) });
  }
  return detalles;
}
