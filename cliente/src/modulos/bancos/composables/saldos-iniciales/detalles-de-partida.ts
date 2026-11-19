import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { PartidaDeApertura } from '../../servicios/tipos-de-saldos-iniciales';

const esCheque = (partida: PartidaDeApertura): boolean =>
  partida.parte === 'cheque_en_circulacion' || partida.parte === 'cheque_posfechado';

/** El renglón principal de una partida: qué es, con su número si es un cheque. */
export function tituloDePartida(partida: PartidaDeApertura): string {
  if (esCheque(partida)) {
    const serie = partida.serie ? ` serie ${partida.serie}` : '';
    return `Cheque ${partida.numeroDeCheque ?? ''}${serie}`.trim();
  }
  if (partida.parte === 'deposito_en_transito') return 'Depósito en tránsito';
  if (partida.parte === 'debito_en_transito') return 'Débito en tránsito';
  return partida.tipo === 'debito' ? 'Error del banco que resta' : 'Error del banco que suma';
}

const aDetalle = (etiqueta: string, valor: string | null): DetalleDeRegistro[] => (valor ? [{ etiqueta, valor }] : []);

/** Lo que se ve de una partida debajo de su título: solo lo que tiene. */
export function detallesDePartida(partida: PartidaDeApertura): DetalleDeRegistro[] {
  const rotuloDelTercero = partida.parte === 'deposito_en_transito' ? 'Origen' : 'Beneficiario';
  return [
    { etiqueta: 'Fecha', valor: formatearFecha(partida.fecha) },
    ...aDetalle(rotuloDelTercero, partida.beneficiario),
    ...aDetalle('Referencia', partida.referencia),
    ...aDetalle('Concepto', partida.conceptoNombre),
    ...aDetalle(partida.parte === 'error_del_banco' ? 'Descripción' : 'Observaciones', partida.observaciones),
  ];
}

/** El monto de una partida con el signo con que entra en la fórmula (solo el error del banco cambia según su sentido). */
export function montoConSigno(partida: PartidaDeApertura): string {
  if (partida.parte === 'error_del_banco') {
    return `${partida.tipo === 'debito' ? '−' : '+'} ${formatearMonto(partida.monto)}`;
  }
  return formatearMonto(partida.monto);
}
