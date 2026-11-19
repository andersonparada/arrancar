import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { PosfechadoDelProveedor, SaldoDelProveedor } from '../servicios/tipos';
import { centavosDe } from './dinero';

/** Verdadero si el monto (texto con decimales) es mayor que cero; un texto ilegible cuenta como cero. */
export const hayMontoPositivo = (monto: string | null | undefined): boolean => (centavosDe(monto ?? '') ?? 0) > 0;

/** «dd/mm» de una fecha `AAAA-MM-DD`; vacío si no tiene esa forma. */
export function diaYMes(fecha: string): string {
  const partes = /^\d{4}-(\d{2})-(\d{2})/.exec(fecha);
  return partes ? `${partes[2]}/${partes[1]}` : '';
}

/**
 * La etiqueta del comprometido de un documento: «Comprometido — cheque al dd/mm/aaaa»; con varios cheques dice cuántos
 * son y la fecha del más lejano, que es cuando el documento deja de estar comprometido.
 */
export function etiquetaDeComprometido(hasta: string | null, cheques = 1): string {
  if (!hasta) return 'Comprometido';
  const fecha = formatearFecha(hasta);
  return cheques > 1 ? `Comprometido — ${cheques} cheques, el último al ${fecha}` : `Comprometido — cheque al ${fecha}`;
}

/** El error de un monto que pasa de lo disponible: explica que lo comprometido no se puede volver a pagar. */
export function textoDeMontoMayorAlDisponible(cargo: { disponible: string; comprometido: string }): string {
  const nota = hayMontoPositivo(cargo.comprometido)
    ? ` (${formatearMonto(cargo.comprometido)} ya está comprometido con un cheque posfechado)`
    : '';
  return `Este documento solo tiene ${formatearMonto(cargo.disponible)} disponible para pagar${nota}: escriba ese monto o menos.`;
}

/** «cheque 1523 al 20/12 Q500.00»; sin número, «cheque posfechado al 20/12 Q500.00». */
export function textoDelPosfechado(cheque: PosfechadoDelProveedor): string {
  const quien = cheque.numeroDeCheque ? `cheque ${cheque.numeroDeCheque}` : 'cheque posfechado';
  return `${quien} al ${diaYMes(cheque.fecha)} ${formatearMonto(cheque.monto)}`;
}

/** Los cheques que respaldan lo comprometido; si el servidor mandó solo los primeros, lo dice. */
function textoDeLosPosfechados(saldo: SaldoDelProveedor): string {
  const mostrados = saldo.posfechados.reduce((total, cheque) => total + (centavosDe(cheque.monto) ?? 0), 0);
  const texto = saldo.posfechados.map(textoDelPosfechado).join('; ');
  return mostrados < (centavosDe(saldo.comprometido) ?? 0) ? `${texto}; y otros más` : texto;
}

/** Lo vencido con su nota: lo comprometido vencido sigue debiéndose hasta que el cheque se cobre. */
function textoDeLoVencido(saldo: SaldoDelProveedor): string {
  const monto = formatearMonto(saldo.vencido);
  return hayMontoPositivo(saldo.vencidoComprometido)
    ? `${monto} (incluye ${formatearMonto(saldo.vencidoComprometido)} ya cubierto con cheque posfechado: sigue siendo deuda hasta que se cobre)`
    : monto;
}

/**
 * Lo que se le debe a un proveedor, en el orden en que se lee: «Por pagar Q…, de lo cual comprometido con cheque N al
 * dd/mm Q…, Disponible para pagar Q…», y lo vencido con su nota.
 */
export function detallesDeLoQueSeDebe(saldo: SaldoDelProveedor): DetalleDeRegistro[] {
  const comprometido = hayMontoPositivo(saldo.comprometido);
  const detalles: DetalleDeRegistro[] = [{ etiqueta: 'Por pagar', valor: formatearMonto(saldo.porPagar) }];
  if (comprometido) {
    detalles.push({ etiqueta: 'De lo cual comprometido', valor: textoDeLosPosfechados(saldo), largo: true });
    detalles.push({ etiqueta: 'Disponible para pagar', valor: formatearMonto(saldo.disponible) });
  }
  detalles.push({ etiqueta: 'Vencido', valor: textoDeLoVencido(saldo), largo: comprometido });
  return detalles;
}
