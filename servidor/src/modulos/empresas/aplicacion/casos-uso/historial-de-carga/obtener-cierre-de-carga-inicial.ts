import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { CierreDeCargaNoEncontrado } from '../../errores-de-cierre.js';
import type { CierreDeCargaInicialDto } from '../../dto/historial-de-carga.dto.js';
import type { DependenciasDelHistorialDeCarga } from './dependencias.js';

export interface CierreSolicitado {
  empresaId: string;
  cierreId: string;
}

export class ObtenerCierreDeCargaInicial {
  constructor(private readonly dependencias: DependenciasDelHistorialDeCarga) {}

  /**
   * La revisión completa de un cierre, tal como se guardó.
   * @throws CierreDeCargaNoEncontrado si el id no es un cierre de esa carga (es de otra empresa o de una reapertura).
   * @throws RecursoNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella.
   */
  ejecutar(operador: Operador, { empresaId, cierreId }: CierreSolicitado): Promise<CierreDeCargaInicialDto> {
    const { ejecutorEnEmpresa, historial } = this.dependencias;
    return ejecutorEnEmpresa.ejecutar(operador, empresaId, async () => {
      const cierre = await historial.cierre(empresaId, cierreId);
      if (!cierre) throw new CierreDeCargaNoEncontrado();
      return cierre;
    });
  }
}
