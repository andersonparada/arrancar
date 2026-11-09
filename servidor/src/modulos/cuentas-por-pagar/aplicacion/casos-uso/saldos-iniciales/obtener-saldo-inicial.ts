import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { SaldoInicialDto } from '../../dto/saldo-inicial.dto.js';
import { dtoDelSaldoInicial, type DependenciasDeConsultaDeSaldos } from './dependencias-de-saldos-iniciales.js';

/** Un saldo inicial por su id. */
export class ObtenerSaldoInicial {
  constructor(private readonly dependencias: DependenciasDeConsultaDeSaldos) {}

  /** @throws RecursoNoEncontrado si no existe o es un documento de Libro de compras. */
  ejecutar(operador: Operador, id: string): Promise<SaldoInicialDto> {
    const { unidadDeTrabajo, consultas, cargaInicial } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { cerrada } = await cargaInicial.obtener(operador);
      return dtoDelSaldoInicial(consultas, id, cerrada);
    });
  }
}
