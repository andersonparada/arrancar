import { describe, expect, it } from 'vitest';
import { aEscala, dividirRedondeando, porcentajeDe, repartirProporcional } from './aritmetica-fiscal.js';
import { CorreccionDeIvaExcedida } from './errores-de-calculo.js';
import { ivaDelDocumento, repartirIva, toleranciaDeIvaEnCentavos } from './reparto-de-iva.js';

const suma = (valores: readonly number[]) => valores.reduce((a, b) => a + b, 0);

describe('aritmética fiscal', () => {
  it('redondea la mitad hacia arriba', () => {
    expect([dividirRedondeando(5n, 2n), dividirRedondeando(4n, 3n), dividirRedondeando(1n, 3n)]).toEqual([3n, 1n, 0n]);
  });

  it('saca porcentajes en centésimas sin coma flotante', () => {
    expect(porcentajeDe(10000, 1500)).toBe(1500);
    expect(porcentajeDe(1, 5000)).toBe(1);
    expect(porcentajeDe(333, 1500)).toBe(50);
  });

  it.each([
    ['12', 3, 12000n],
    ['0.5', 3, 500n],
    ['1.234', 3, 1234n],
    ['1.2345', 3, null],
    ['-1', 3, null],
    ['abc', 2, null],
    ['', 2, null],
  ])('aEscala(%s, %i) = %s', (texto, decimales, esperado) => {
    expect(aEscala(texto, decimales)).toBe(esperado);
  });
});

describe('repartirProporcional', () => {
  it.each([
    [1, [1, 1, 1], [1, 0, 0]],
    [100, [1, 1, 1], [34, 33, 33]],
    [10, [3, 3, 4], [3, 3, 4]],
    [5, [1, 2], [2, 3]],
    [0, [0, 0], [0, 0]],
    [7, [0, 5], [0, 7]],
  ])('reparte %i entre %j', (monto, pesos, esperado) => {
    expect(repartirProporcional(monto, pesos)).toEqual(esperado);
  });

  it('nunca pierde ni inventa centavos (casos pseudoaleatorios fijos)', () => {
    let semilla = 12345;
    const siguiente = (tope: number) => (semilla = (semilla * 1103515245 + 12345) % 2147483648) % tope;
    for (let vuelta = 0; vuelta < 200; vuelta++) {
      const pesos = Array.from({ length: 1 + siguiente(6) }, () => siguiente(100000));
      const monto = siguiente(50000);
      const partes = repartirProporcional(monto, pesos);
      if (suma(pesos) > 0) expect(suma(partes)).toBe(monto);
      partes.forEach((parte, indice) => {
        const exacto = (monto * (pesos[indice] ?? 0)) / (suma(pesos) || 1);
        expect(Math.abs(parte - exacto)).toBeLessThan(1);
      });
    }
  });

  it('no desborda con montos de numeric(14,2)', () => {
    const grande = 99_999_999_999_999;
    expect(suma(repartirProporcional(grande, [grande, grande]))).toBe(grande);
  });
});

describe('ivaDelDocumento', () => {
  it.each([
    [11200, 1200, 1200],
    [11201, 1200, 1200],
    [100, 1200, 11],
    [14, 1200, 1],
    [0, 1200, 0],
    [11200, 0, 0],
    [10500, 500, 500],
  ])('gravado %i con tasa %i da IVA %i', (gravado, tasa, esperado) => {
    expect(ivaDelDocumento(gravado, tasa)).toBe(esperado);
  });
});

describe('repartirIva', () => {
  it('reparte el IVA del documento en proporción al gravado, sin perder centavos', () => {
    const ivas = repartirIva([5000, 5000], 1200);
    expect(ivas).toEqual([536, 535]);
    expect(suma(ivas)).toBe(ivaDelDocumento(10000, 1200));
  });

  it('con tres líneas iguales el IVA total sigue siendo el del documento', () => {
    const ivas = repartirIva([3333, 3333, 3334], 1200);
    expect(suma(ivas)).toBe(ivaDelDocumento(10000, 1200));
  });

  it('una línea con gravado cero queda con IVA cero', () => {
    expect(repartirIva([0, 11200], 1200)).toEqual([0, 1200]);
  });

  it('corrige hasta Q0.05 en la línea de mayor gravado', () => {
    expect(repartirIva([5000, 6000], 1200, 1179)).toEqual([536, 643]);
    expect(suma(repartirIva([5000, 6000], 1200, 1179))).toBe(1179);
  });

  it('acepta la tolerancia exacta de 5 centavos en ambos sentidos', () => {
    expect(suma(repartirIva([5000, 5000], 1200, 1076))).toBe(1076);
    expect(suma(repartirIva([5000, 5000], 1200, 1066))).toBe(1066);
  });

  it('rechaza una diferencia de 6 centavos', () => {
    expect(() => repartirIva([5000, 5000], 1200, 1077)).toThrow(CorreccionDeIvaExcedida);
  });

  it('con más de 5 líneas el tope sube a una por línea', () => {
    const gravados = Array.from({ length: 8 }, () => 1000);
    const calculado = suma(repartirIva(gravados, 1200));
    expect(suma(repartirIva(gravados, 1200, calculado + 8))).toBe(calculado + 8);
    expect(suma(repartirIva(gravados, 1200, calculado - 8))).toBe(calculado - 8);
    expect(() => repartirIva(gravados, 1200, calculado + 9)).toThrow(CorreccionDeIvaExcedida);
  });

  it('el tope nunca baja de 5 centavos', () => {
    expect(toleranciaDeIvaEnCentavos(1)).toBe(5);
    expect(toleranciaDeIvaEnCentavos(5)).toBe(5);
    expect(toleranciaDeIvaEnCentavos(6)).toBe(6);
    expect(toleranciaDeIvaEnCentavos(40)).toBe(40);
  });

  it('rechaza una corrección que saca el IVA de una línea de su gravado', () => {
    expect(() => repartirIva([3], 1200, 5)).toThrow(CorreccionDeIvaExcedida);
    expect(() => repartirIva([100, 100], 1200, 16)).not.toThrow();
  });
});
