import { describe, expect, it } from 'vitest';
import {
  aCentavosEnteros,
  aDiezmilesimas,
  aMillonesimas,
  deCentavosEnteros,
  deDiezmilesimas,
  deMillonesimas,
  DecimalInvalido,
  deTextoAEntero,
} from './decimales.js';

describe('decimales sin coma flotante', () => {
  it('pasa el texto a enteros con la escala de cada columna', () => {
    expect(aDiezmilesimas('12.5')).toBe(125000n);
    expect(aDiezmilesimas('0.0001')).toBe(1n);
    expect(aMillonesimas('2.1')).toBe(2_100_000n);
    expect(aCentavosEnteros('1250.50')).toBe(125050n);
    expect(aCentavosEnteros('7')).toBe(700n);
    expect(aCentavosEnteros('-0.05')).toBe(-5n);
  });

  it('vuelve a texto con todos sus decimales y su signo', () => {
    expect(deDiezmilesimas(125000n)).toBe('12.5000');
    expect(deDiezmilesimas(5n)).toBe('0.0005');
    expect(deMillonesimas(2_100_000n)).toBe('2.100000');
    expect(deCentavosEnteros(-125050n)).toBe('-1250.50');
    expect(deCentavosEnteros(0n)).toBe('0.00');
  });

  it('ida y vuelta no pierde nada, aunque el número no quepa en un double', () => {
    const grande = '99999999999999.9999';

    expect(deDiezmilesimas(aDiezmilesimas(grande))).toBe(grande);
  });

  it('admite ceros de sobra pero rechaza decimales que no caben y lo que no es un número', () => {
    expect(aCentavosEnteros('1.500')).toBe(150n);
    expect(() => aCentavosEnteros('1.005')).toThrow(DecimalInvalido);
    expect(() => deTextoAEntero('abc', 2)).toThrow(DecimalInvalido);
    expect(() => deTextoAEntero('1e3', 2)).toThrow(DecimalInvalido);
    expect(() => deTextoAEntero('', 2)).toThrow(DecimalInvalido);
  });
});
