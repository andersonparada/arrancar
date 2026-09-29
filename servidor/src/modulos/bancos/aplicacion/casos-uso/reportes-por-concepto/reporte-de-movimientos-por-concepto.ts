import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { armarMovimientosPorConcepto } from '../../calculo-de-movimientos-por-concepto.js';
import type {
  FiltroDeTotalesPorConcepto,
  ReporteDeMovimientosPorConceptoDto,
} from '../../dto/reportes-por-concepto.dto.js';
import type { DependenciasDeReportesPorConcepto } from './dependencias-de-reportes-por-concepto.js';

/** Total de entradas, salidas y cantidad por concepto en un rango; el inverso resta en el concepto de su original. */
export class ReporteDeMovimientosPorConcepto {
  constructor(private readonly dependencias: DependenciasDeReportesPorConcepto) {}

  ejecutar(operador: Operador, filtro: FiltroDeTotalesPorConcepto): Promise<ReporteDeMovimientosPorConceptoDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (filtro.cuentaBancariaId) await consultas.exigirCuenta(filtro.cuentaBancariaId);
      const totales = await consultas.totalesPorConcepto(filtro);
      const { desde, hasta, cuentaBancariaId = null } = filtro;
      return armarMovimientosPorConcepto(totales, { desde, hasta, cuentaBancariaId });
    });
  }
}
