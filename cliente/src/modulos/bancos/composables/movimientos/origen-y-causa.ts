import type { CausaDeAnulacion } from '../../servicios/cheques.api';

const NOMBRES_DE_MODULO: Record<string, string> = {
  'cuentas-por-pagar': 'Cuentas por pagar',
  'cuentas-por-cobrar': 'Cuentas por cobrar',
  'libro-de-compras': 'Libro de compras',
  'libro-de-ventas': 'Libro de ventas',
  planilla: 'Planilla',
};

/** El nombre legible del módulo que generó un movimiento; si no se conoce, la clave con mayúscula inicial. */
export function nombreDeModuloDeOrigen(clave: string): string {
  const conocido = NOMBRES_DE_MODULO[clave];
  if (conocido) return conocido;
  const texto = clave.replace(/[-_]+/g, ' ').trim();
  return texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1);
}

/** «Origen: <módulo>» si el movimiento lo generó otro módulo; `null` si nació en Bancos. */
export function textoDeOrigen(movimiento: { moduloDeOrigen: string | null }): string | null {
  return movimiento.moduloDeOrigen ? `Origen: ${nombreDeModuloDeOrigen(movimiento.moduloDeOrigen)}` : null;
}

const MODULO_CUENTAS_POR_PAGAR = 'cuentas-por-pagar';

/**
 * A la ficha del pago de Cuentas por pagar que generó el movimiento; `null` si el origen es otro módulo o falta el
 * documento. El origen guarda solo el id: si fuera de otro documento de ese módulo (un reintegro), la ficha lo dice.
 */
export function destinoDeOrigenDelPago(movimiento: {
  moduloDeOrigen: string | null;
  documentoDeOrigenId: string | null;
}) {
  if (movimiento.moduloDeOrigen !== MODULO_CUENTAS_POR_PAGAR || !movimiento.documentoDeOrigenId) return null;
  return { name: 'cuentas-por-pagar.pagos.ficha', params: { id: movimiento.documentoDeOrigenId } };
}

const TEXTO_DE_CAUSA: Record<CausaDeAnulacion, string> = { manual: 'Manual', caducidad: 'Por caducidad' };

/** La causa de anulación de un cheque anulado; `null` si no está anulado. */
export const textoDeCausaDeAnulacion = (causa: CausaDeAnulacion | null): string | null =>
  causa ? TEXTO_DE_CAUSA[causa] : null;
