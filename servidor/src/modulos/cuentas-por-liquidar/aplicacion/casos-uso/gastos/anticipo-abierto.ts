import { numeroDelAnticipo, type Anticipo } from '../../../dominio/anticipos.js';
import { AnticipoNoAbierto } from '../../../dominio/errores-de-gastos.js';
import { anticipoBloqueado } from '../anticipos/bloqueo-del-anticipo.js';
import type { DependenciasDeGastos } from './dependencias-de-gastos.js';

/**
 * El anticipo bloqueado (Bancos antes que Cuentas por liquidar, como en `anticipoBloqueado`) que además sigue abierto: solo
 * un anticipo abierto recibe o suelta gastos.
 * @throws RecursoNoEncontrado, AnticipoNoAbierto
 */
export async function anticipoAbiertoBloqueado(
  dependencias: Pick<DependenciasDeGastos, 'anticipos' | 'movimientos'>,
  anticipoId: string,
): Promise<Anticipo> {
  const anticipo = await anticipoBloqueado(dependencias, anticipoId);
  if (anticipo.estado !== 'abierto') {
    throw new AnticipoNoAbierto(numeroDelAnticipo(anticipo.numero, anticipo.anioDeNumero), anticipo.estado);
  }
  return anticipo;
}
