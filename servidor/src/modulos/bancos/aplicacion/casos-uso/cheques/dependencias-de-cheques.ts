import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { ConceptosDeMovimientos } from '../../conceptos-de-movimientos.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Cheque } from '../../../dominio/cheque.js';
import type { CuentasPorPagarActivo } from '../../puertos/cuentas-por-pagar-activo.js';
import type { ConsultasCheques } from '../../puertos/consultas-cheques.js';
import type { ConsultasMovimientos } from '../../puertos/consultas-movimientos.js';
import type { RepositorioCheques } from '../../puertos/repositorio-cheques.js';
import type { RepositorioChequeras } from '../../puertos/repositorio-chequeras.js';
import type { RepositorioMovimientos } from '../../puertos/repositorio-movimientos.js';
import type { DesgloseDeMovimientos } from '../../desglose-de-movimientos.js';
import type { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';
import type { RevisorDeCambios } from '../../revisor-de-cambios.js';

/** Lo que usan los casos de uso de los cheques. */
export interface DependenciasDeCheques {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioCheques;
  repositorioChequeras: RepositorioChequeras;
  repositorioMovimientos: RepositorioMovimientos;
  consultas: ConsultasCheques;
  consultasMovimientos: ConsultasMovimientos;
  reglas: ReglasDeLaCuenta;
  auditoria: Auditoria;
  correlativos: Correlativos;
  conceptos: ConceptosDeMovimientos;
  reloj: Reloj;
  cuentasPorPagar: CuentasPorPagarActivo;
  /** Avisa al módulo de origen antes de cambiar un movimiento suyo o marcado (CP4). */
  revisor: RevisorDeCambios;
  /** El reparto por concepto de lo que emite otro módulo (CP4). */
  desglose: DesgloseDeMovimientos;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function chequeExistente(repositorio: RepositorioCheques, id: string): Promise<Cheque> {
  const cheque = await repositorio.buscar(Identificador.desde(id));
  if (!cheque) throw new RecursoNoEncontrado('El cheque');
  return cheque;
}
