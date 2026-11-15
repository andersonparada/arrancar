import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { FichaDelDocumento } from '../servicios/tipos';
import type { NotasPosteriores } from '../servicios/tipos-de-saldos-iniciales';
import { tituloDeDocumento } from './detalles-de-documento';

const plural = (cantidad: number, uno: string, varios: string): string =>
  `${cantidad} ${cantidad === 1 ? uno : varios}`;

/** Si el saldo inicial tiene notas posteriores libres que citan su factura. */
export const hayNotasPosteriores = (notas: NotasPosteriores | undefined): boolean =>
  !!notas && (notas.notasDeCredito > 0 || notas.notasDeDebito > 0);

/**
 * Lo que se le dice al operador cuando una nota se registró antes de cargar la factura que corrige: no se enlazan
 * solas, así que le indica dónde aplicarlas. Vacío si no hay.
 */
export function avisoDeNotasPosteriores(notas: NotasPosteriores | undefined): string {
  if (!notas || !hayNotasPosteriores(notas)) return '';
  const partes: string[] = [];
  if (notas.notasDeCredito > 0) {
    const cantidad = plural(notas.notasDeCredito, 'nota de crédito posterior', 'notas de crédito posteriores');
    partes.push(
      `Hay ${cantidad} sobre esta factura con ${formatearMonto(notas.saldoLibre)} de saldo a favor: aplíquelas en Notas de crédito.`,
    );
  }
  if (notas.notasDeDebito > 0) {
    const cantidad = plural(notas.notasDeDebito, 'nota de débito', 'notas de débito');
    const inicio = notas.notasDeCredito > 0 ? 'También hay' : 'Hay';
    partes.push(`${inicio} ${cantidad} sobre esta factura que quedó como cargo sin factura.`);
  }
  return partes.join(' ');
}

/** El aviso del cuadre después de importar: cuántos saldos tienen notas posteriores libres; vacío si ninguno. */
export function avisoDelCuadreConNotas(saldosConNotasPosteriores: number): string {
  if (saldosConNotasPosteriores <= 0) return '';
  const cuantos = plural(saldosConNotasPosteriores, 'saldo inicial tiene', 'saldos iniciales tienen');
  return `${cuantos} notas posteriores sin aplicar: búsquelos marcados en la lista y aplique las notas de crédito en Notas de crédito.`;
}

/** Texto de la ficha de una nota del libro sobre una factura del sistema anterior; vacío en las demás. */
export function textoDeFacturaAnterior(ficha: FichaDelDocumento): string {
  if (!ficha.facturaDelSistemaAnterior) return '';
  if (ficha.documentoAfectadoId) return 'Corrige el saldo inicial de una factura del sistema anterior.';
  return 'Corrige una factura del sistema anterior que no tiene saldo inicial en Arrancar.';
}

/** Los datos de la factura anterior citada por la nota (solo si no tiene saldo inicial). */
export function detallesDeFacturaAnterior(ficha: FichaDelDocumento): DetalleDeRegistro[] {
  const factura = ficha.facturaAnterior;
  if (!factura) return [];
  return [
    { etiqueta: 'Factura', valor: tituloDeDocumento(factura) },
    { etiqueta: 'Fecha de emisión', valor: formatearFecha(factura.fechaEmision) },
  ];
}

/** Qué hacer con una nota suelta: sin saldo inicial, su total queda a favor hasta que se aplique. */
export function ayudaDeFacturaAnterior(ficha: FichaDelDocumento): string {
  if (!ficha.facturaDelSistemaAnterior || ficha.documentoAfectadoId) return '';
  return ficha.clase === 'abono'
    ? 'Si esa factura todavía se debe, cárguela en Saldos iniciales y aplique la nota en Notas de crédito.'
    : 'La nota de débito quedó como un cargo sin factura.';
}
