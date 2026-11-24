import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { ConceptosDeMovimientos } from '../../conceptos-de-movimientos.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Movimiento } from '../../../dominio/movimiento.js';
import type { ConsultasMovimientos } from '../../puertos/consultas-movimientos.js';
import type { RepositorioMovimientos } from '../../puertos/repositorio-movimientos.js';
import type { DesgloseDeMovimientos } from '../../desglose-de-movimientos.js';
import type { ModulosDeOrigen } from '../../puertos/modulos-de-origen.js';
import type { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';
import type { RevisorDeCambios } from '../../revisor-de-cambios.js';

/** Lo que usan los casos de uso de los movimientos. */
export interface DependenciasDeMovimientos {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioMovimientos;
  consultas: ConsultasMovimientos;
  reglas: ReglasDeLaCuenta;
  auditoria: Auditoria;
  correlativos: Correlativos;
  conceptos: ConceptosDeMovimientos;
  /** Marcar una nota exige Cuentas por pagar activo (CP4). */
  modulosDeOrigen: ModulosDeOrigen;
  /** Avisa al módulo de origen antes de cambiar un movimiento suyo o marcado (CP4). */
  revisor: RevisorDeCambios;
  /** El reparto por concepto de lo que registra otro módulo o de una nota marcada (CP4). */
  desglose: DesgloseDeMovimientos;
}

/**
 * El movimiento que se va a cambiar, con su fila bloqueada: así no se pierde un origen que se liga en paralelo.
 * @throws RecursoNoEncontrado si no existe o no es de la empresa.
 */
export async function movimientoExistente(repositorio: RepositorioMovimientos, id: string): Promise<Movimiento> {
  const movimiento = await repositorio.bloquear(Identificador.desde(id));
  if (!movimiento) throw new RecursoNoEncontrado('El movimiento');
  return movimiento;
}
