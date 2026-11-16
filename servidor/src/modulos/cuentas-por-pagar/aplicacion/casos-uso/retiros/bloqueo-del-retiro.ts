import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { RetiroDeEfectivo } from '../../../dominio/retiros.js';
import type { DependenciasDeRetiros } from './dependencias-de-retiros.js';

/**
 * El retiro bloqueado, con lo que tiene en Bancos bloqueado antes (Bancos antes que Cuentas por pagar): primero el depósito
 * de la devolución, si lo hay, luego el cheque o la nota del retiro y al final el retiro. Es el mismo orden en que llega el
 * aviso de Bancos, así que ventanas y avisos a la vez no se traban.
 * @throws RecursoNoEncontrado
 */
export async function retiroBloqueado(
  dependencias: Pick<DependenciasDeRetiros, 'retiros' | 'movimientos'>,
  retiroId: string,
): Promise<RetiroDeEfectivo> {
  const { retiros, movimientos } = dependencias;
  const existente = await retiros.buscar(retiroId);
  if (!existente) throw new RecursoNoEncontrado('El retiro');
  if (existente.movimientoDeDevolucionId) await movimientos.bloquear(existente.movimientoDeDevolucionId);
  await movimientos.bloquear(existente.movimientoId);
  return (await retiros.bloquear(retiroId))!;
}
