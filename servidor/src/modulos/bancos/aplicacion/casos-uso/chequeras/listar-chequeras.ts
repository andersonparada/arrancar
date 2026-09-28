import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ChequeraDto } from '../../dto/chequera.dto.js';
import type { DependenciasDeChequeras } from './dependencias-de-chequeras.js';

/** Las chequeras de una cuenta bancaria, con el conteo de sus cheques por estado. */
export class ListarChequeras {
  constructor(private readonly dependencias: Pick<DependenciasDeChequeras, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador, cuentaBancariaId: string): Promise<ChequeraDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listarDeLaCuenta(cuentaBancariaId));
  }
}
