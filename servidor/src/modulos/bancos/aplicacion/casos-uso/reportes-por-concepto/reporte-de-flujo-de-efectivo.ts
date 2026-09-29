import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { armarFlujoDeEfectivo } from '../../calculo-de-flujo-de-efectivo.js';
import type { ReporteDeFlujoDeEfectivoDto } from '../../dto/reportes-por-concepto.dto.js';
import type { DependenciasDeReportesPorConcepto } from './dependencias-de-reportes-por-concepto.js';

export interface FiltroDelFlujoDeEfectivo {
  desde: string;
  hasta: string;
  /** Sin cuenta, son todas las de la empresa. */
  cuentaBancariaId?: string;
}

/**
 * El flujo de efectivo (método directo) de un rango: dos lecturas agregadas, sin recorrer movimientos. Las reglas
 * de cada línea y el control de cuadre están en `armarFlujoDeEfectivo`.
 */
export class ReporteDeFlujoDeEfectivo {
  constructor(private readonly dependencias: DependenciasDeReportesPorConcepto) {}

  ejecutar(operador: Operador, filtro: FiltroDelFlujoDeEfectivo): Promise<ReporteDeFlujoDeEfectivoDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (filtro.cuentaBancariaId) await consultas.exigirCuenta(filtro.cuentaBancariaId);
      const totales = await consultas.totalesPorConcepto(filtro);
      const saldos = await consultas.saldosDelRango(filtro);
      const { desde, hasta, cuentaBancariaId = null } = filtro;
      return armarFlujoDeEfectivo(totales, saldos, { desde, hasta, cuentaBancariaId });
    });
  }
}
