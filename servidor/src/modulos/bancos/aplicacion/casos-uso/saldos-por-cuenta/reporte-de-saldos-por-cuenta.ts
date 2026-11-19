import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { finDelMesDe, periodoAnterior } from '../../../dominio/conciliacion.js';
import { armarReporteDeSaldos } from '../../calculo-de-saldos-por-cuenta.js';
import type { FiltroDeSaldosPorCuenta, ReporteDeSaldosPorCuentaDto } from '../../dto/saldos-por-cuenta.dto.js';
import type { ConsultasDeSaldosPorCuenta } from '../../puertos/consultas-de-saldos-por-cuenta.js';

export interface DependenciasDeSaldosPorCuenta {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeSaldosPorCuenta;
  reloj: Reloj;
}

/** El fin del mes inmediato anterior al mes de `fecha` (`AAAA-MM-DD`). */
function finDelMesAnteriorA(fecha: string): string {
  const [anio = 0, mes = 1] = fecha.split('-').map(Number);
  return finDelMesDe(periodoAnterior({ anio, mes }));
}

/**
 * «Saldos por cuenta» a una fecha de corte (hoy si no se elige): saldo en libros, posfechados, disponible y lo que el
 * banco aún no ha visto, con los totales de Bancos y de Sobregiros sin compensar. Las reglas están en
 * `armarReporteDeSaldos`; la lectura es agregada en la base.
 */
export class ReporteDeSaldosPorCuenta {
  constructor(private readonly dependencias: DependenciasDeSaldosPorCuenta) {}

  ejecutar(operador: Operador, filtro: FiltroDeSaldosPorCuenta = {}): Promise<ReporteDeSaldosPorCuentaDto> {
    const { unidadDeTrabajo, consultas, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const fecha = filtro.fecha ?? (await reloj.hoy(operador));
      const finDelMesAnterior = finDelMesAnteriorA(fecha);
      const lectura = await consultas.leer({ fecha, finDelMesAnterior, cuentaBancariaId: filtro.cuentaBancariaId });
      return armarReporteDeSaldos(lectura, { fecha, finDelMesAnterior });
    });
  }
}
