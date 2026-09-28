import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Movimiento } from '../../../dominio/movimiento.js';
import type { ConsultasMovimientos } from '../../puertos/consultas-movimientos.js';
import type { RepositorioMovimientos } from '../../puertos/repositorio-movimientos.js';
import type { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';

/** Lo que usan los casos de uso de los movimientos. */
export interface DependenciasDeMovimientos {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioMovimientos;
  consultas: ConsultasMovimientos;
  reglas: ReglasDeLaCuenta;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function movimientoExistente(repositorio: RepositorioMovimientos, id: string): Promise<Movimiento> {
  const movimiento = await repositorio.buscar(Identificador.desde(id));
  if (!movimiento) throw new RecursoNoEncontrado('El movimiento');
  return movimiento;
}
