import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Anticipo } from '../../../dominio/anticipos.js';
import type { DependenciasDeAnticipos } from './dependencias-de-anticipos.js';

/**
 * El anticipo bloqueado, con lo que tiene en Bancos bloqueado antes (Bancos antes que Cuentas por liquidar): primero la
 * devolución y el reembolso, si los hay, luego el cheque o la nota de la entrega y al final el anticipo. Es el mismo orden en
 * que llega el aviso de Bancos, así que ventanas y avisos a la vez no se traban.
 * @throws RecursoNoEncontrado
 */
export async function anticipoBloqueado(
  dependencias: Pick<DependenciasDeAnticipos, 'anticipos' | 'movimientos'>,
  anticipoId: string,
): Promise<Anticipo> {
  const { anticipos, movimientos } = dependencias;
  const existente = await anticipos.buscar(anticipoId);
  if (!existente) throw new RecursoNoEncontrado('El anticipo');
  const adicionales = [existente.movimientoDeDevolucionId, existente.movimientoDeReembolsoId];
  for (const movimientoId of adicionales) if (movimientoId) await movimientos.bloquear(movimientoId);
  await movimientos.bloquear(existente.movimientoId);
  return (await anticipos.bloquear(anticipoId))!;
}
