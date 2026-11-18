import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { aCentavos, deCentavos } from '../dominio/centavos.js';
import {
  MesConciliado,
  MovimientoAntesDelSaldoInicial,
  SaldoInicialNoEsElPrimero,
  SaldoInicialRepetido,
  SaldoInsuficiente,
} from '../dominio/errores.js';
import {
  InversoDentroDeLaApertura,
  MovimientoAntesDeLaApertura,
  MovimientoAntesDeLaFechaDeInicio,
} from '../dominio/errores-de-apertura.js';
import { fechaDeCorte } from '../dominio/apertura.js';
import type { CargaInicial } from './puertos/carga-inicial.js';
import type { ConsultasMovimientos, SaldoPrincipalDeLaCuenta } from './puertos/consultas-movimientos.js';
import type { PoliticaDeSobregiro } from './puertos/politica-de-sobregiro.js';

/** Lo que un registro, una corrección o una anulación hace en su cuenta. */
export interface CambioEnLaCuenta {
  cuentaBancariaId: string;
  /** El movimiento que se corrige: no cuenta al revisar el saldo inicial. */
  movimientoId?: string;
  /** Cómo queda el movimiento; una anulación no tiene fecha que revisar. */
  queda?: { fecha: string; saldoInicial: boolean };
  /** Todas las fechas que toca el cambio (la anterior y la nueva al corregir); se revisan contra el mes conciliado. */
  fechas: string[];
  /** Cuánto cambia el saldo, en centavos (negativo si baja). */
  diferencia: number;
}

interface Dependencias {
  consultas: ConsultasMovimientos;
  politicaDeSobregiro: PoliticaDeSobregiro;
  /** La fecha de inicio de la empresa: sin saldo inicial en la cuenta, nada nuevo se registra antes de ella. */
  cargaInicial: CargaInicial;
}

/**
 * Las reglas que cruzan los movimientos de una cuenta: el saldo inicial es único
 * y el primero por fecha, y sin sobregiro permitido el saldo no queda negativo.
 */
export class ReglasDeLaCuenta {
  constructor(private readonly dependencias: Dependencias) {}

  async revisar(operador: Operador, cambio: CambioEnLaCuenta): Promise<void> {
    if (cambio.queda) await this.revisarSaldoInicial(operador, cambio, cambio.queda);
    await this.revisarMesConciliado(cambio);
    await this.revisarSobregiro(operador, cambio);
  }

  /**
   * El inverso de una partida de apertura que se anula es un hecho del período: su fecha es posterior al corte (el día
   * anterior a la fecha de inicio de la empresa).
   * @throws InversoDentroDeLaApertura
   */
  async revisarElInversoDeApertura(operador: Operador, fecha: string): Promise<void> {
    const { fechaDeInicio } = await this.dependencias.cargaInicial.obtener(operador);
    if (fechaDeInicio === null) return;
    const corte = fechaDeCorte(fechaDeInicio);
    if (fecha <= corte) throw new InversoDentroDeLaApertura(corte);
  }

  private async revisarSaldoInicial(
    operador: Operador,
    { cuentaBancariaId, movimientoId }: CambioEnLaCuenta,
    { fecha, saldoInicial }: { fecha: string; saldoInicial: boolean },
  ): Promise<void> {
    const { consultas } = this.dependencias;
    const principal = await consultas.saldoPrincipalDe(cuentaBancariaId, movimientoId);
    if (saldoInicial) return this.revisarElSaldoInicialNuevo({ cuentaBancariaId, movimientoId, fecha, principal });
    if (principal) return this.revisarContraElSaldoPrincipal(fecha, principal);
    if (!movimientoId) await this.revisarLaFechaDeInicio(operador, fecha);
  }

  /** El saldo inicial es único y el primero por fecha. */
  private async revisarElSaldoInicialNuevo(datos: {
    cuentaBancariaId: string;
    movimientoId?: string;
    fecha: string;
    principal: SaldoPrincipalDeLaCuenta | null;
  }): Promise<void> {
    const { cuentaBancariaId, movimientoId, fecha, principal } = datos;
    if (principal) throw new SaldoInicialRepetido();
    const masAntigua = await this.dependencias.consultas.fechaMasAntigua(cuentaBancariaId, movimientoId);
    if (masAntigua && fecha > masAntigua) throw new SaldoInicialNoEsElPrimero();
  }

  /** Con saldo del banco: nada del corte para atrás (§5.2); con el global de antes: nada antes de su fecha. */
  private revisarContraElSaldoPrincipal(fecha: string, { parte, fecha: delSaldo }: SaldoPrincipalDeLaCuenta): void {
    if (parte === 'saldo_del_banco' && fecha <= delSaldo) throw new MovimientoAntesDeLaApertura(delSaldo);
    if (parte === 'saldo_global' && fecha < delSaldo) throw new MovimientoAntesDelSaldoInicial();
  }

  /** Sin saldo inicial en la cuenta, un movimiento nuevo no puede ser anterior a la fecha de inicio de la empresa (P-6). */
  private async revisarLaFechaDeInicio(operador: Operador, fecha: string): Promise<void> {
    const { fechaDeInicio } = await this.dependencias.cargaInicial.obtener(operador);
    if (fechaDeInicio !== null && fecha < fechaDeInicio) throw new MovimientoAntesDeLaFechaDeInicio(fechaDeInicio);
  }

  /** Nada se toca con fecha en un mes ya conciliado (o antes) de la cuenta. */
  private async revisarMesConciliado({ cuentaBancariaId, fechas }: CambioEnLaCuenta): Promise<void> {
    const { consultas } = this.dependencias;
    const fechaConciliada = await consultas.conciliadaHasta(cuentaBancariaId);
    if (!fechaConciliada) return;
    if (fechas.some((fecha) => fecha <= fechaConciliada)) throw new MesConciliado(fechaConciliada);
  }

  private async revisarSobregiro(operador: Operador, { cuentaBancariaId, diferencia }: CambioEnLaCuenta) {
    const { consultas, politicaDeSobregiro } = this.dependencias;
    if (diferencia >= 0 || (await politicaDeSobregiro.permiteSobregiro(operador))) return;
    const saldoQueQueda = aCentavos(await consultas.saldoDe(cuentaBancariaId)) + diferencia;
    if (saldoQueQueda < 0) throw new SaldoInsuficiente(deCentavos(saldoQueQueda));
  }
}
