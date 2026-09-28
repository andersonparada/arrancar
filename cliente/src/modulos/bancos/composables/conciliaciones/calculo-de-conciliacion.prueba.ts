import { describe, expect, it } from 'vitest';
import type { MovimientoConMarca } from '../../servicios/conciliaciones.api';
import { aCentavos, calcularResumen, deCentavos, efectoEnCentavos } from './calculo-de-conciliacion';

function movimiento(cambios: Partial<MovimientoConMarca> = {}): MovimientoConMarca {
  return {
    id: 'm1',
    cuentaBancariaId: 'c1',
    tipo: 'credito',
    fecha: '2026-01-10',
    monto: '100.00',
    saldoInicial: false,
    referencia: null,
    beneficiario: null,
    observaciones: null,
    cuentaBancariaNombre: null,
    anuladoEn: null,
    motivoDeAnulacion: null,
    transferenciaId: null,
    chequeId: null,
    numeroDeCheque: null,
    conciliacionId: null,
    marcado: false,
    ...cambios,
  };
}

describe('aCentavos y deCentavos', () => {
  it('convierten sin errores de punto flotante', () => {
    expect(aCentavos('0.1') + aCentavos('0.2')).toBe(30);
    expect(deCentavos(30)).toBe('0.30');
  });

  it('manejan negativos', () => {
    expect(aCentavos('-150.50')).toBe(-15050);
    expect(deCentavos(-15050)).toBe('-150.50');
  });
});

describe('efectoEnCentavos', () => {
  it('el crédito suma y el débito resta', () => {
    expect(efectoEnCentavos(movimiento({ tipo: 'credito', monto: '100.00' }))).toBe(10000);
    expect(efectoEnCentavos(movimiento({ tipo: 'debito', monto: '100.00' }))).toBe(-10000);
  });
});

describe('calcularResumen', () => {
  it('saldo conciliado = saldo anterior + marcados; diferencia = saldo según banco − saldo conciliado', () => {
    const movimientos = [
      movimiento({ id: 'a', tipo: 'credito', monto: '200.00', marcado: true }),
      movimiento({ id: 'b', tipo: 'debito', monto: '50.00', marcado: true }),
      movimiento({ id: 'c', tipo: 'credito', monto: '999.00', marcado: false }),
    ];

    const resumen = calcularResumen('1000.00', '1150.00', movimientos);

    expect(resumen.saldoConciliado).toBe('1150.00');
    expect(resumen.diferencia).toBe('0.00');
  });

  it('ignora los no marcados y reporta la diferencia cuando no cuadra', () => {
    const resumen = calcularResumen('0.00', '100.00', [movimiento({ monto: '40.00', marcado: true })]);

    expect(resumen.saldoConciliado).toBe('40.00');
    expect(resumen.diferencia).toBe('60.00');
  });

  it('sin movimientos marcados, el saldo conciliado es el anterior', () => {
    const resumen = calcularResumen('500.00', '500.00', []);

    expect(resumen).toEqual({ saldoConciliado: '500.00', diferencia: '0.00' });
  });
});
