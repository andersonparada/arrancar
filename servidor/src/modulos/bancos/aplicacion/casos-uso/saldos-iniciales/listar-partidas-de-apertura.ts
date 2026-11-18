import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PartidaConSuCuenta } from '../../ficha-de-saldo-inicial.js';
import type { DependenciasDeLecturaDeSaldos } from './listar-saldos-iniciales.js';

/** Las partidas de apertura de todas las cuentas de la empresa (para exportarlas a Excel). */
export class ListarPartidasDeApertura {
  constructor(private readonly dependencias: DependenciasDeLecturaDeSaldos) {}

  ejecutar(operador: Operador): Promise<PartidaConSuCuenta[]> {
    const { unidadDeTrabajo, ficha } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => ficha.partidasDeLaEmpresa(operador));
  }
}
