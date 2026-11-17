import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Reintegro } from '../../../dominio/reintegros.js';
import type { DependenciasDeReintegros } from './dependencias-de-reintegros.js';

/**
 * El reintegro bloqueado, con la nota de crédito que tiene en Bancos bloqueada antes (Bancos antes que Cuentas por pagar):
 * es el mismo orden en que llega el aviso de Bancos, así que ventanas y avisos a la vez no se traban.
 * @throws RecursoNoEncontrado
 */
export async function reintegroBloqueado(
  dependencias: Pick<DependenciasDeReintegros, 'reintegros' | 'movimientos'>,
  reintegroId: string,
): Promise<Reintegro> {
  const { reintegros, movimientos } = dependencias;
  const existente = await reintegros.buscar(reintegroId);
  if (!existente) throw new RecursoNoEncontrado('El reintegro');
  if (existente.movimientoId) await movimientos.bloquear(existente.movimientoId);
  return (await reintegros.bloquear(reintegroId))!;
}
