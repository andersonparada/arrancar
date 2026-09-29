import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Transferencia } from '../../../dominio/transferencia.js';
import type { ConsultasCuentasBancarias } from '../../puertos/consultas-cuentas-bancarias.js';
import type { ConsultasMovimientos } from '../../puertos/consultas-movimientos.js';
import type { ConsultasTransferencias } from '../../puertos/consultas-transferencias.js';
import type { RepositorioMovimientos } from '../../puertos/repositorio-movimientos.js';
import type { RepositorioTransferencias } from '../../puertos/repositorio-transferencias.js';
import type { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';

/** Lo que usan los casos de uso de las transferencias. */
export interface DependenciasDeTransferencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioTransferencias;
  repositorioMovimientos: RepositorioMovimientos;
  consultas: ConsultasTransferencias;
  consultasMovimientos: ConsultasMovimientos;
  consultasCuentasBancarias: ConsultasCuentasBancarias;
  reglas: ReglasDeLaCuenta;
  auditoria: Auditoria;
  correlativos: Correlativos;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function transferenciaExistente(
  repositorio: RepositorioTransferencias,
  id: string,
): Promise<Transferencia> {
  const transferencia = await repositorio.buscar(Identificador.desde(id));
  if (!transferencia) throw new RecursoNoEncontrado('La transferencia');
  return transferencia;
}
