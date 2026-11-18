import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { SaldoInicialDto } from '../../dto/saldo-inicial.dto.js';
import type { DependenciasDeLecturaDeSaldos } from './listar-saldos-iniciales.js';

/** La ficha de una cuenta: su cuadre, sus observaciones y todas sus partidas. */
export class ObtenerSaldoInicial {
  constructor(private readonly dependencias: DependenciasDeLecturaDeSaldos) {}

  /** @throws RecursoNoEncontrado si la cuenta no existe o es de otra empresa. */
  ejecutar(operador: Operador, cuentaBancariaId: string): Promise<SaldoInicialDto> {
    const { unidadDeTrabajo, ficha } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => ficha.deLaCuenta(operador, cuentaBancariaId));
  }
}
