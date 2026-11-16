import { describe, expect, it } from 'vitest';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { documentoSembrado } from '../../../pruebas/dobles-de-aplicaciones.js';
import type { ChequeAEmitir, NotaDeDebitoARegistrar, PagosEnBancos } from '../../puertos/puertos-de-pagos.js';
import type { LineaRevisada } from './dependencias-de-pagos.js';
import { conceptosDelPago, ordenarABancos, repartoPorActivo } from './orden-a-bancos.js';
import type { PeticionDePago } from './peticion-de-pago.js';

const operador = { usuarioId: 'u', cuentaId: 'c', empresaId: 'e', esSuperacceso: false } as Operador;

const linea = (montoCentavos: number, tieneActivoFijo: boolean): LineaRevisada =>
  ({ montoCentavos, fila: { documento: documentoSembrado({ tieneActivoFijo }) } }) as LineaRevisada;

class BancosFalso implements PagosEnBancos {
  cheque: ChequeAEmitir | null = null;
  nota: NotaDeDebitoARegistrar | null = null;
  async medios() {
    return { cuentas: [] };
  }
  async emitirCheque(_: Operador, cheque: ChequeAEmitir) {
    this.cheque = cheque;
    return { movimientoId: 'm', cuentaBancariaId: 'cb', numero: 1, avisos: [] };
  }
  async registrarNotaDeDebito(_: Operador, nota: NotaDeDebitoARegistrar) {
    this.nota = nota;
    return { movimientoId: 'm', cuentaBancariaId: nota.cuentaBancariaId, numero: 2, avisos: [] };
  }
  async anularMovimiento() {
    return { forma: 'sin_inverso' as const, fechaDelInverso: null };
  }
  async fijarDesglose() {}
}

const datos = { pagoId: 'p1', fecha: '2026-11-10', montoCentavos: 300, beneficiario: 'Agro S.A.', conceptos: [] };

describe('el reparto del pago por concepto', () => {
  it('con una sola clase de cargos va en una sola línea', () => {
    expect(conceptosDelPago([linea(100, false), linea(50, false)])).toEqual([
      { claveDeSistema: 'pago_a_proveedor', montoCentavos: 150 },
    ]);
    expect(conceptosDelPago([linea(100, true)])).toEqual([
      { claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 100 },
    ]);
  });

  it('con cargos de activo fijo y de gasto reparte entre Operación e Inversión', () => {
    expect(conceptosDelPago([linea(100, false), linea(200, true), linea(50, false)])).toEqual([
      { claveDeSistema: 'pago_a_proveedor', montoCentavos: 150 },
      { claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 200 },
    ]);
  });
});

describe('el reparto de un monto entre Operación e Inversión', () => {
  it('lo no ligado a activo fijo queda en Operación y sin activo fijo no hay línea de Inversión', () => {
    expect(repartoPorActivo(336_000, 224_000)).toEqual([
      { claveDeSistema: 'pago_a_proveedor', montoCentavos: 112_000 },
      { claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 224_000 },
    ]);
    expect(repartoPorActivo(100, 0)).toEqual([{ claveDeSistema: 'pago_a_proveedor', montoCentavos: 100 }]);
    expect(repartoPorActivo(100, 100)).toEqual([{ claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 100 }]);
  });
});

describe('la orden a Bancos', () => {
  it('un cheque lleva el pago como origen, es no negociable por omisión y no manda lo que no se escribió', async () => {
    const bancos = new BancosFalso();
    const pedido = { forma: 'cheque', chequeraId: 'ch', proveedorId: 'p', aplicaciones: [] } as PeticionDePago;

    await ordenarABancos(bancos, operador, { pedido, datos });

    expect(bancos.cheque).toMatchObject({
      origen: { modulo: 'cuentas-por-pagar', documentoId: 'p1' },
      chequeraId: 'ch',
      noNegociable: true,
      beneficiario: 'Agro S.A.',
    });
    expect(bancos.cheque).not.toHaveProperty('referencia');
    expect(bancos.cheque).not.toHaveProperty('chequeId');
  });

  it('una nota de débito va a la cuenta elegida con la referencia y las observaciones', async () => {
    const bancos = new BancosFalso();
    const pedido = {
      forma: 'nota_de_debito',
      cuentaBancariaId: 'cb',
      proveedorId: 'p',
      aplicaciones: [],
      referencia: 'Transferencia 55',
      observaciones: 'Noviembre',
    } as PeticionDePago;

    await ordenarABancos(bancos, operador, { pedido, datos });

    expect(bancos.nota).toMatchObject({
      cuentaBancariaId: 'cb',
      referencia: 'Transferencia 55',
      observaciones: 'Noviembre',
    });
  });
});
