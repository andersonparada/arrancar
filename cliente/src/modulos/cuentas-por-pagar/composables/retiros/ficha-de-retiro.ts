import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { conPuntoFinal } from '@/modulos/core/utilidades/frases';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { Retiro } from '../../servicios/tipos-de-retiros';
import { centavosDe } from '../dinero';
import { documentoDelRetiro, nombreDelEstadoDeRetiro } from './lista-de-retiros';

const hayDinero = (texto: string): boolean => (centavosDe(texto) ?? 0) > 0;

const opcional = (etiqueta: string, valor: string | null | undefined): DetalleDeRegistro[] =>
  valor ? [{ etiqueta, valor }] : [];

/** Los datos del retiro en su ficha; lo que no aplica a su estado no sale. */
export function detallesDeFichaDeRetiro(retiro: Retiro): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Estado', valor: nombreDelEstadoDeRetiro(retiro.estado) },
    { etiqueta: 'Custodio', valor: retiro.custodio },
    { etiqueta: 'Documento en Bancos', valor: documentoDelRetiro(retiro.forma, retiro.movimiento.numero) },
    { etiqueta: 'Fecha del retiro', valor: formatearFecha(retiro.fecha) },
    { etiqueta: 'Retirado', valor: formatearMonto(retiro.monto) },
    { etiqueta: 'Pagado a proveedores', valor: formatearMonto(retiro.pagado) },
    { etiqueta: 'Disponible', valor: formatearMonto(retiro.disponible) },
    ...opcional('Observaciones', retiro.observaciones),
  ];
}

/** Lo que dejó la liquidación: cuándo, lo devuelto con su depósito y el faltante con su motivo. */
export function detallesDeLaLiquidacion(retiro: Retiro): DetalleDeRegistro[] {
  if (!retiro.liquidacion) return [];
  const deposito = retiro.liquidacion.deposito;
  return [
    { etiqueta: 'Fecha de la liquidación', valor: formatearFecha(retiro.liquidacion.fecha) },
    {
      etiqueta: 'Devuelto al banco',
      valor: `${formatearMonto(retiro.devuelto)}${deposito ? ` · nota de crédito ${deposito.numero}` : ''}`,
    },
    ...(hayDinero(retiro.faltante) ? [{ etiqueta: 'Faltante', valor: formatearMonto(retiro.faltante) }] : []),
    ...opcional('Por qué faltó', retiro.motivoDeFaltante),
  ];
}

export function detallesDeAnulacionDeRetiro(retiro: Retiro): DetalleDeRegistro[] {
  if (!retiro.anulacion) return [];
  return [
    { etiqueta: 'Fecha de la anulación', valor: formatearFecha(retiro.anulacion.fecha) },
    { etiqueta: 'Motivo', valor: retiro.anulacion.motivo },
  ];
}

/** Los pagos que siguen vigentes: el efectivo que ya salió del retiro. */
export const pagosVigentesDelRetiro = (retiro: Retiro) => retiro.pagos.filter(({ estado }) => estado === 'vigente');

/** Se puede repartir efectivo si el retiro está abierto y todavía le queda algo (el servidor decide el resto). */
export const sePuedePagarConElRetiro = (retiro: Pick<Retiro, 'estado' | 'disponible'>): boolean =>
  retiro.estado === 'abierto' && hayDinero(retiro.disponible);

/** Qué pasará al reabrir, para confirmarlo. */
export function resumenDeReabrir(retiro: Retiro): string {
  const deposito = retiro.liquidacion?.deposito
    ? ` Bancos anulará el depósito de ${formatearMonto(retiro.devuelto)} (nota de crédito ${retiro.liquidacion.deposito.numero}).`
    : '';
  return (
    `Se reabre el retiro ${retiro.numero}: vuelve a estar por liquidar y se podrá pagar con él.${deposito} ` +
    `${hayDinero(retiro.faltante) ? `El faltante de ${formatearMonto(retiro.faltante)} se borra; ` : ''}` +
    'deberá liquidarlo otra vez.'
  );
}

/** Qué pasará al anular, para confirmarlo; solo un retiro sin pagos se puede anular. */
export function resumenDeAnularRetiro(retiro: Retiro): string {
  return (
    `Se anulará el retiro ${retiro.numero} de ${formatearMonto(retiro.monto)} a cargo de ${conPuntoFinal(retiro.custodio)} ` +
    `Bancos anulará el ${documentoDelRetiro(retiro.forma, retiro.movimiento.numero).toLowerCase()} o, si su mes ya está ` +
    'conciliado, creará un movimiento inverso. Esto no se puede deshacer.'
  );
}
