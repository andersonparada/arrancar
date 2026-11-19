import { describe, expect, it } from 'vitest';
import { resumenDeEjemplo } from './ejemplos-de-saldos-iniciales';
import {
  lineasDeLaFormula,
  saldoEnLibrosPorFormula,
  situacionDelCuadre,
  textoDeLaDiferencia,
} from './cuadre-de-saldo-inicial';

describe('saldoEnLibrosPorFormula', () => {
  it('suma depósitos y resta cheques y débitos al saldo del estado de cuenta', () => {
    expect(saldoEnLibrosPorFormula(resumenDeEjemplo())).toBe('9300.00');
    expect(saldoEnLibrosPorFormula(resumenDeEjemplo({ totalDebitosEnTransito: '300.50' }))).toBe('8999.50');
  });

  it('el error del banco entra con su signo', () => {
    expect(saldoEnLibrosPorFormula(resumenDeEjemplo({ totalErroresDelBanco: '-75.25' }))).toBe('9224.75');
    expect(saldoEnLibrosPorFormula(resumenDeEjemplo({ totalErroresDelBanco: '75.25' }))).toBe('9375.25');
  });

  it('un saldo del banco negativo (sobregiro) deja el saldo en libros negativo', () => {
    const resumen = resumenDeEjemplo({ saldoSegunEstadoDeCuenta: '-2000.00' });
    expect(saldoEnLibrosPorFormula(resumen)).toBe('-2700.00');
  });

  it('suma en centavos: 0.10 + 0.20 es 0.30 exacto', () => {
    const partes = resumenDeEjemplo({
      saldoSegunEstadoDeCuenta: '0.10',
      totalDepositosEnTransito: '0.20',
      totalChequesEnCirculacion: '0.00',
    });
    expect(saldoEnLibrosPorFormula(partes)).toBe('0.30');
  });

  it('sin saldo del banco cuenta como cero', () => {
    const partes = resumenDeEjemplo({ saldoSegunEstadoDeCuenta: null, totalDepositosEnTransito: '10.00' });
    expect(saldoEnLibrosPorFormula(partes)).toBe('-1190.00');
  });
});

describe('situacionDelCuadre', () => {
  it('distingue sin saldo, sin dato, cuadra y no cuadra', () => {
    expect(situacionDelCuadre(resumenDeEjemplo({ forma: 'sin_saldo' }))).toBe('sin_saldo');
    expect(situacionDelCuadre(resumenDeEjemplo({ saldoSegunLibrosAnteriores: null, cuadra: false }))).toBe('sin_dato');
    expect(situacionDelCuadre(resumenDeEjemplo())).toBe('cuadra');
    expect(situacionDelCuadre(resumenDeEjemplo({ cuadra: false, diferencia: '5.00' }))).toBe('no_cuadra');
  });
});

describe('lineasDeLaFormula', () => {
  it('omite lo que vale cero pero deja el saldo del banco y el resultado', () => {
    const claves = lineasDeLaFormula(resumenDeEjemplo()).map((linea) => linea.clave);
    expect(claves).toEqual(['banco', 'depositos', 'cheques', 'libros']);
  });

  it('muestra débitos y errores del banco cuando los hay, con su signo', () => {
    const lineas = lineasDeLaFormula(
      resumenDeEjemplo({ totalDebitosEnTransito: '10.00', totalErroresDelBanco: '-5.00' }),
    );
    expect(lineas.find((linea) => linea.clave === 'debitos')?.signo).toBe('−');
    expect(lineas.find((linea) => linea.clave === 'errores')?.signo).toBe('±');
    expect(lineas.at(-1)).toMatchObject({ signo: '=', monto: '9300.00' });
  });

  it('un saldo «de antes» (global) solo tiene el resultado', () => {
    const lineas = lineasDeLaFormula(resumenDeEjemplo({ forma: 'global', saldoSegunEstadoDeCuenta: null }));
    expect(lineas).toHaveLength(1);
    expect(lineas[0]?.clave).toBe('libros');
  });
});

describe('textoDeLaDiferencia', () => {
  it('lo dice en palabras', () => {
    expect(textoDeLaDiferencia(null)).toBe('');
    expect(textoDeLaDiferencia('0.00')).toBe('Sin diferencia');
    expect(textoDeLaDiferencia('12.00')).toContain('más');
    expect(textoDeLaDiferencia('-12.00')).toContain('menos');
  });
});
