import type { ComprobanteDePago } from '../../servicios/tipos-de-pagos';
import { MAXIMO_DE_PROVEEDORES_EN_EL_REPARTO } from './reparto-de-efectivo';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Los pagos de la dirección `?pagos=id,id`: sin repetir, en el orden en que vienen y solo ids válidos, hasta el máximo de un
 * reparto. Un valor raro no rompe la pantalla: simplemente no cuenta.
 */
export function idsDeLosRecibos(valor: unknown): string[] {
  const texto = Array.isArray(valor) ? valor.join(',') : typeof valor === 'string' ? valor : '';
  const ids = texto
    .split(',')
    .map((id) => id.trim())
    .filter((id) => ID.test(id));
  return [...new Set(ids)].slice(0, MAXIMO_DE_PROVEEDORES_EN_EL_REPARTO);
}

/** El enlace para imprimir los recibos de estos pagos. */
export const destinoDeLosRecibos = (ids: readonly string[]) => ({
  name: 'cuentas-por-pagar.pagos.recibos',
  query: { pagos: ids.join(',') },
});

/** El nombre sugerido del PDF al guardar: «Recibos de efectivo 2026-15, 2026-16». */
export function tituloDelPapelDeLosRecibos(recibos: readonly Pick<ComprobanteDePago, 'pago'>[]): string {
  return `Recibos de efectivo ${recibos.map(({ pago }) => pago.numero).join(', ')}`;
}

/** Los pagos que no se pudieron preparar (por ejemplo, sin permiso o de otra empresa), para decirlo sin esconder el resto. */
export function idsQueFaltan(
  pedidos: readonly string[],
  recibos: readonly Pick<ComprobanteDePago, 'pago'>[],
): string[] {
  const listos = new Set(recibos.map(({ pago }) => pago.id));
  return pedidos.filter((id) => !listos.has(id));
}
