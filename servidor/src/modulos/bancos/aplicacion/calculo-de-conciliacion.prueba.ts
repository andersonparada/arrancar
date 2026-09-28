import { describe, expect, it } from 'vitest';
import { calcularConciliacion, type MovimientoParaConciliar } from './calculo-de-conciliacion.js';

function movimiento(
  datos: Partial<MovimientoParaConciliar> & Pick<MovimientoParaConciliar, 'tipo' | 'monto'>,
): MovimientoParaConciliar {
  return {
    id: crypto.randomUUID(),
    fecha: '2026-01-15',
    numeroDeCheque: null,
    beneficiario: null,
    referencia: null,
    marcado: false,
    ...datos,
  };
}

describe('calcularConciliacion', () => {
  it('con todo marcado, el saldo del estado de cuenta coincide con el saldo final del banco', () => {
    const saldoInicial = movimiento({ tipo: 'credito', monto: '1000.00', marcado: true });
    const deposito = movimiento({ tipo: 'credito', monto: '200.00', marcado: true });
    const cheque = movimiento({ tipo: 'cheque', monto: '150.00', numeroDeCheque: 101, marcado: true });

    const resultado = calcularConciliacion({
      saldoInicialLibrosEnCentavos: 0,
      saldoInicialBancoEnCentavos: 0,
      movimientosDelMes: [saldoInicial, deposito, cheque],
      candidatos: [saldoInicial, deposito, cheque],
    });

    expect(resultado.libros).toEqual({
      saldoInicial: '0.00',
      ingresos: '1200.00',
      egresos: '150.00',
      saldoFinal: '1050.00',
    });
    expect(resultado.banco.saldoFinal).toBe('1050.00');
    expect(resultado.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1050.00');
    expect(resultado.partidas).toEqual({
      chequesEnCirculacion: [],
      otrosDebitosEnTransito: [],
      creditosEnTransito: [],
    });
  });

  it('un cheque sin cobrar queda en circulación y sube el saldo que debe mostrar el estado de cuenta', () => {
    const saldoInicial = movimiento({ tipo: 'credito', monto: '1000.00', marcado: true });
    const chequeSinCobrar = movimiento({
      tipo: 'cheque',
      monto: '300.00',
      numeroDeCheque: 55,
      beneficiario: 'Ferretería',
    });

    const resultado = calcularConciliacion({
      saldoInicialLibrosEnCentavos: 0,
      saldoInicialBancoEnCentavos: 0,
      movimientosDelMes: [saldoInicial, chequeSinCobrar],
      candidatos: [saldoInicial, chequeSinCobrar],
    });

    expect(resultado.libros.saldoFinal).toBe('700.00');
    expect(resultado.partidas.chequesEnCirculacion).toHaveLength(1);
    expect(resultado.partidas.chequesEnCirculacion[0]).toMatchObject({
      monto: '300.00',
      numeroDeCheque: 55,
      beneficiario: 'Ferretería',
    });
    expect(resultado.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1000.00');
    expect(resultado.banco.saldoFinal).toBe('1000.00');
  });

  it('un depósito en tránsito baja el saldo que debe mostrar el estado de cuenta', () => {
    const saldoInicial = movimiento({ tipo: 'credito', monto: '1000.00', marcado: true });
    const depositoEnTransito = movimiento({ tipo: 'credito', monto: '400.00' });

    const resultado = calcularConciliacion({
      saldoInicialLibrosEnCentavos: 0,
      saldoInicialBancoEnCentavos: 0,
      movimientosDelMes: [saldoInicial, depositoEnTransito],
      candidatos: [saldoInicial, depositoEnTransito],
    });

    expect(resultado.libros.saldoFinal).toBe('1400.00');
    expect(resultado.partidas.creditosEnTransito).toHaveLength(1);
    expect(resultado.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1000.00');
    expect(resultado.banco.saldoFinal).toBe('1000.00');
  });

  it('un débito distinto de cheque en tránsito suma como los cheques en circulación', () => {
    const saldoInicial = movimiento({ tipo: 'credito', monto: '1000.00', marcado: true });
    const comisionEnTransito = movimiento({ tipo: 'debito', monto: '25.00', referencia: 'Comisión' });

    const resultado = calcularConciliacion({
      saldoInicialLibrosEnCentavos: 0,
      saldoInicialBancoEnCentavos: 0,
      movimientosDelMes: [saldoInicial, comisionEnTransito],
      candidatos: [saldoInicial, comisionEnTransito],
    });

    expect(resultado.libros.saldoFinal).toBe('975.00');
    expect(resultado.partidas.otrosDebitosEnTransito).toHaveLength(1);
    expect(resultado.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1000.00');
  });

  it('arrastra el saldo inicial del mes anterior a ambos lados del cuadro', () => {
    const notaDelMes = movimiento({ tipo: 'credito', monto: '50.00', marcado: true });

    const resultado = calcularConciliacion({
      saldoInicialLibrosEnCentavos: 100_000,
      saldoInicialBancoEnCentavos: 100_000,
      movimientosDelMes: [notaDelMes],
      candidatos: [notaDelMes],
    });

    expect(resultado.libros).toMatchObject({ saldoInicial: '1000.00', saldoFinal: '1050.00' });
    expect(resultado.banco).toMatchObject({ saldoInicial: '1000.00', saldoFinal: '1050.00' });
  });
});
