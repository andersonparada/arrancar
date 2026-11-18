import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { fechaLocalEn, fechaYHoraLocalEn } from '../../../../core/compartido/dominio/fecha-local.js';
import { CierreDeCargaNoEncontrado } from '../../errores-de-cierre.js';
import type { DependenciasDelHistorialDeCarga } from './dependencias.js';
import { hojasDelCierre } from './hojas-del-cierre.js';
import type { CierreSolicitado } from './obtener-cierre-de-carga-inicial.js';

/** El Excel de un cierre y el nombre con el que se baja. */
export interface CierreExportado {
  contenido: Buffer;
  nombreDeArchivo: string;
}

export class ExportarCierreDeCargaInicial {
  constructor(private readonly dependencias: DependenciasDelHistorialDeCarga) {}

  /**
   * El cierre guardado en un Excel de tres hojas: Cierre, Hallazgos y Cifras (los montos como número).
   * @throws CierreDeCargaNoEncontrado si el id no es un cierre de esa carga.
   * @throws RecursoNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella.
   */
  async ejecutar(operador: Operador, { empresaId, cierreId }: CierreSolicitado): Promise<CierreExportado> {
    const { ejecutorEnEmpresa, historial, consultas, excel, zonaHoraria } = this.dependencias;
    const zona = await zonaHoraria.zonaHoraria({ ...operador, empresaId });
    const { empresa, cierre } = await ejecutorEnEmpresa.ejecutar(operador, empresaId, async () => {
      const guardado = await historial.cierre(empresaId, cierreId);
      if (!guardado) throw new CierreDeCargaNoEncontrado();
      return { empresa: await consultas.datosDeIdentificacion(empresaId), cierre: guardado };
    });
    const cerradaEn = fechaYHoraLocalEn(cierre.cerradaEn, zona);
    return {
      contenido: await excel.escribirVarias(hojasDelCierre({ empresa, cierre, cerradaEn })),
      nombreDeArchivo: `cierre-carga-inicial-${fechaLocalEn(cierre.cerradaEn, zona)}.xlsx`,
    };
  }
}
