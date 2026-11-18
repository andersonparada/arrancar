import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { FichaDeSaldoInicial } from '../../ficha-de-saldo-inicial.js';
import type { SaldosInicialesDto } from '../../dto/saldo-inicial.dto.js';

/** Lo que usan los casos de uso de lectura de los saldos iniciales. */
export interface DependenciasDeLecturaDeSaldos {
  unidadDeTrabajo: UnidadDeTrabajo;
  ficha: FichaDeSaldoInicial;
}

/** Todas las cuentas de la empresa con su cuadre, los totales Bancos y Sobregiros y los hallazgos de cierre. */
export class ListarSaldosIniciales {
  constructor(private readonly dependencias: DependenciasDeLecturaDeSaldos) {}

  ejecutar(operador: Operador): Promise<SaldosInicialesDto> {
    const { unidadDeTrabajo, ficha } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => ficha.listado(operador));
  }
}
