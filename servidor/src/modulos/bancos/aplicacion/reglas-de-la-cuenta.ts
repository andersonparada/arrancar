import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { aCentavos, deCentavos } from '../dominio/centavos.js';
import {
  MovimientoAntesDelSaldoInicial,
  SaldoInicialNoEsElPrimero,
  SaldoInicialRepetido,
  SaldoInsuficiente,
} from '../dominio/errores.js';
import type { ConsultasMovimientos } from './puertos/consultas-movimientos.js';
import type { PoliticaDeSobregiro } from './puertos/politica-de-sobregiro.js';

/** Lo que un registro, una corrección o una anulación hace en su cuenta. */
export interface CambioEnLaCuenta {
  cuentaBancariaId: string;
  /** El movimiento que se corrige: no cuenta al revisar el saldo inicial. */
  movimientoId?: string;
  /** Cómo queda el movimiento; una anulación no tiene fecha que revisar. */
  queda?: { fecha: string; saldoInicial: boolean };
  /** Cuánto cambia el saldo, en centavos (negativo si baja). */
  diferencia: number;
}

interface Dependencias {
  consultas: ConsultasMovimientos;
  politicaDeSobregiro: PoliticaDeSobregiro;
}

/**
 * Las reglas que cruzan los movimientos de una cuenta: el saldo inicial es único
 * y el primero por fecha, y sin sobregiro permitido el saldo no queda negativo.
 */
export class ReglasDeLaCuenta {
  constructor(private readonly dependencias: Dependencias) {}

  async revisar(operador: Operador, cambio: CambioEnLaCuenta): Promise<void> {
    if (cambio.queda) await this.revisarSaldoInicial(cambio, cambio.queda);
    await this.revisarSobregiro(operador, cambio);
  }

  private async revisarSaldoInicial(
    { cuentaBancariaId, movimientoId }: CambioEnLaCuenta,
    { fecha, saldoInicial }: { fecha: string; saldoInicial: boolean },
  ): Promise<void> {
    const { consultas } = this.dependencias;
    const fechaDelInicial = await consultas.fechaDelSaldoInicial(cuentaBancariaId, movimientoId);
    if (!saldoInicial) {
      if (fechaDelInicial && fecha < fechaDelInicial) throw new MovimientoAntesDelSaldoInicial();
      return;
    }
    if (fechaDelInicial) throw new SaldoInicialRepetido();
    const masAntigua = await consultas.fechaMasAntigua(cuentaBancariaId, movimientoId);
    if (masAntigua && fecha > masAntigua) throw new SaldoInicialNoEsElPrimero();
  }

  private async revisarSobregiro(operador: Operador, { cuentaBancariaId, diferencia }: CambioEnLaCuenta) {
    const { consultas, politicaDeSobregiro } = this.dependencias;
    if (diferencia >= 0 || (await politicaDeSobregiro.permiteSobregiro(operador))) return;
    const saldoQueQueda = aCentavos(await consultas.saldoDe(cuentaBancariaId)) + diferencia;
    if (saldoQueQueda < 0) throw new SaldoInsuficiente(deCentavos(saldoQueQueda));
  }
}
