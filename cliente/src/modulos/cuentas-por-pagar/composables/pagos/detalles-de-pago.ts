import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { EstadoDePago, FormaDePago, PagoDeLaContrasena, PagoRegistrado } from '../../servicios/tipos-de-pagos';

const NOMBRES_DE_FORMA: Record<FormaDePago, string> = {
  cheque: 'Cheque',
  nota_de_debito: 'Nota de débito',
  nota_ligada: 'Nota de débito ya registrada',
  cuenta_de_apertura: 'Cuenta de apertura',
  efectivo: 'Efectivo',
};

export const nombreDeLaForma = (forma: FormaDePago): string => NOMBRES_DE_FORMA[forma];

const NOMBRES_DE_ESTADO: Record<EstadoDePago, string> = {
  pendiente: 'Sin pagar',
  en_parte: 'Pagada en parte',
  comprometido_en_parte: 'Comprometida en parte',
  comprometido: 'Comprometida',
  pagado: 'Pagada',
};

export const nombreDelEstadoDePago = (estado: EstadoDePago): string => NOMBRES_DE_ESTADO[estado];

export type TonoDeInsignia = 'campo' | 'trigo' | 'tierra' | 'rojo';

const TONOS_DE_ESTADO: Record<EstadoDePago, TonoDeInsignia> = {
  pendiente: 'tierra',
  en_parte: 'trigo',
  comprometido_en_parte: 'trigo',
  comprometido: 'trigo',
  pagado: 'campo',
};

export const tonoDelEstadoDePago = (estado: EstadoDePago): TonoDeInsignia => TONOS_DE_ESTADO[estado];

/** El documento bancario de un pago, como se lee: «Cheque 1523», «Nota de débito 45», o solo la forma si no mueve dinero. */
export function documentoDelPago(pago: Pick<PagoRegistrado, 'forma' | 'movimiento'>): string {
  const numero = pago.movimiento?.numero;
  return numero === undefined ? nombreDeLaForma(pago.forma) : `${nombreDeLaForma(pago.forma)} ${numero}`;
}

/** Las marcas de un pago de la contraseña: anulado o posfechado. */
export function marcasDelPago(pago: Pick<PagoDeLaContrasena, 'estado' | 'comprometido'>): string[] {
  return [...(pago.estado === 'anulado' ? ['Anulado'] : []), ...(pago.comprometido ? ['Posfechado'] : [])];
}

/** Lo que se ve del pago recién registrado. */
export function detallesDelPagoRegistrado(pago: PagoRegistrado): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Pago', valor: pago.numero },
    { etiqueta: 'Proveedor', valor: pago.proveedor.nombre },
    { etiqueta: 'Beneficiario', valor: pago.beneficiario },
    { etiqueta: 'Forma', valor: documentoDelPago(pago) },
    { etiqueta: 'Fecha', valor: `${formatearFecha(pago.fecha)}${pago.posfechado ? ' (posfechado)' : ''}` },
    { etiqueta: 'Monto', valor: formatearMonto(pago.monto) },
  ];
}

/** El título del aviso de éxito. */
export const textoDeExitoDelPago = (pago: Pick<PagoRegistrado, 'numero' | 'posfechado'>): string =>
  pago.posfechado
    ? `Pago ${pago.numero} registrado: el documento quedó comprometido hasta la fecha del cheque.`
    : `Pago ${pago.numero} registrado.`;
