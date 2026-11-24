import { beforeEach, describe, expect, it } from 'vitest';
import { SaldoInicialRepetido } from '../../../dominio/errores-de-saldo-inicial.js';
import { EscenarioDeSaldosIniciales } from '../../../pruebas/escenario-de-saldos-iniciales.js';
import { OTRA_BODEGA } from '../../../pruebas/escenario-del-kardex.js';

let e: EscenarioDeSaldosIniciales;

beforeEach(() => {
  e = new EscenarioDeSaldosIniciales();
  e.elegirMetodo('peps');
});

describe('renglones repetidos', () => {
  it('rechaza repetir artículo, bodega, lote y fecha de la capa, y no duplica el inventario', async () => {
    await e.registrarSaldo('10', '20.00');

    await expect(e.registrarSaldo('10', '20.00')).rejects.toBeInstanceOf(SaldoInicialRepetido);
    await expect(e.registrarSaldo('10', '20.00', { fechaDeCapa: '2026-08-31' })).rejects.toBeInstanceOf(
      SaldoInicialRepetido,
    );
    expect((await e.listarSaldos()).totales).toMatchObject({ renglones: 1, valor: '20.00' });
  });

  it('admite otra fecha de capa u otra bodega', async () => {
    await e.registrarSaldo('10', '20.00');

    await e.registrarSaldo('10', '20.00', { fechaDeCapa: '2026-08-01' });
    await e.registrarSaldo('10', '20.00', { bodegaId: OTRA_BODEGA });

    expect((await e.listarSaldos()).totales.renglones).toBe(3);
  });
});
