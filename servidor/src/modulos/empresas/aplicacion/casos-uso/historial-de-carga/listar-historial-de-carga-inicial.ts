import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EntradaDelHistorialDeCargaDto } from '../../dto/historial-de-carga.dto.js';
import type { DependenciasDelHistorialDeCarga } from './dependencias.js';

export class ListarHistorialDeCargaInicial {
  constructor(private readonly dependencias: DependenciasDelHistorialDeCarga) {}

  /**
   * Los cierres, reaperturas y cambios del balance de apertura de la carga, de la más nueva a la más vieja.
   * @throws RecursoNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella.
   */
  ejecutar(operador: Operador, empresaId: string): Promise<EntradaDelHistorialDeCargaDto[]> {
    const { ejecutorEnEmpresa, historial } = this.dependencias;
    return ejecutorEnEmpresa.ejecutar(operador, empresaId, () => historial.listar(empresaId));
  }
}
