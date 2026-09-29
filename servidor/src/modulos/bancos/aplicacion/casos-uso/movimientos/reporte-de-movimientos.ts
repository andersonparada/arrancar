import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../dominio/centavos.js';
import { calcularSaldoCorrido, diaAnteriorA, type FilaDelReporte } from '../../calculo-de-reporte-de-movimientos.js';
import type { MovimientoDto, ResumenDeSinClasificar } from '../../dto/movimiento.dto.js';
import type { DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

export interface FiltroDelReporte {
  cuentaBancariaId?: string;
  desde?: string;
  hasta?: string;
  /** Solo los movimientos de este concepto (para «Sin clasificar», el concepto de sistema de ese nombre). */
  conceptoId?: string;
}

export interface ReporteDeMovimientosDto {
  saldoAnterior: string | null;
  filas: FilaDelReporte[];
  saldoFinal: string | null;
  /** Lo que falta clasificar en la cuenta y fechas del filtro (sin importar el filtro de concepto). */
  sinClasificar: ResumenDeSinClasificar;
}

/**
 * El reporte de Movimientos: filas en orden ascendente con saldo corrido, si se eligió una cuenta y no un concepto
 * (un saldo corrido de solo algunas filas no significaría nada), y lo pendiente de clasificar.
 */
export class ReporteDeMovimientos {
  constructor(private readonly dependencias: Pick<DependenciasDeMovimientos, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador, filtro: FiltroDelReporte = {}): Promise<ReporteDeMovimientosDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const filas = await consultas.listarAscendente(filtro);
      const sinClasificar = await consultas.resumenDeSinClasificar(filtro);
      const { cuentaBancariaId, conceptoId } = filtro;
      if (!cuentaBancariaId || conceptoId)
        return { saldoAnterior: null, filas: sinSaldo(filas), saldoFinal: null, sinClasificar };
      const saldoAnterior = await this.saldoAnteriorA(cuentaBancariaId, filtro.desde);
      const filasConSaldo = calcularSaldoCorrido(aCentavos(saldoAnterior), filas);
      const saldoFinal = filasConSaldo.at(-1)?.saldo ?? saldoAnterior;
      return { saldoAnterior, filas: filasConSaldo, saldoFinal, sinClasificar };
    });
  }

  private saldoAnteriorA(cuentaBancariaId: string, desde: string | undefined): Promise<string> {
    if (!desde) return Promise.resolve('0.00');
    return this.dependencias.consultas.saldoAlFinDe(cuentaBancariaId, diaAnteriorA(desde));
  }
}

const sinSaldo = (filas: MovimientoDto[]): FilaDelReporte[] => filas.map((fila) => ({ ...fila, saldo: null }));
