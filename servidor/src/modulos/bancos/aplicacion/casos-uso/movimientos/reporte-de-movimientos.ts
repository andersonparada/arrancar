import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../dominio/centavos.js';
import { calcularSaldoCorrido, diaAnteriorA, type FilaDelReporte } from '../../calculo-de-reporte-de-movimientos.js';
import type { MovimientoDto } from '../../dto/movimiento.dto.js';
import type { DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

export interface FiltroDelReporte {
  cuentaBancariaId?: string;
  desde?: string;
  hasta?: string;
}

export interface ReporteDeMovimientosDto {
  saldoAnterior: string | null;
  filas: FilaDelReporte[];
  saldoFinal: string | null;
}

/** El reporte de Movimientos: filas en orden ascendente con saldo corrido, si se eligió una cuenta. */
export class ReporteDeMovimientos {
  constructor(private readonly dependencias: Pick<DependenciasDeMovimientos, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador, filtro: FiltroDelReporte = {}): Promise<ReporteDeMovimientosDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const filas = await consultas.listarAscendente(filtro);
      if (!filtro.cuentaBancariaId) return { saldoAnterior: null, filas: sinSaldo(filas), saldoFinal: null };
      const saldoAnterior = await this.saldoAnteriorA(filtro.cuentaBancariaId, filtro.desde);
      const filasConSaldo = calcularSaldoCorrido(aCentavos(saldoAnterior), filas);
      return { saldoAnterior, filas: filasConSaldo, saldoFinal: filasConSaldo.at(-1)?.saldo ?? saldoAnterior };
    });
  }

  private saldoAnteriorA(cuentaBancariaId: string, desde: string | undefined): Promise<string> {
    if (!desde) return Promise.resolve('0.00');
    return this.dependencias.consultas.saldoAlFinDe(cuentaBancariaId, diaAnteriorA(desde));
  }
}

const sinSaldo = (filas: MovimientoDto[]): FilaDelReporte[] => filas.map((fila) => ({ ...fila, saldo: null }));
