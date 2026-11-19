import { describe, expect, it } from 'vitest';
import { ConversionFueraDeRango, TipoDeCambio, TipoDeCambioInvalido } from './tipo-de-cambio.js';

describe('TipoDeCambio.crear', () => {
  it('guarda el valor escalado × 10⁸ y lo devuelve sin ceros sobrantes', () => {
    const tipo = TipoDeCambio.crear('7.64489000');

    expect(tipo.escalado).toBe(764489000n);
    expect(tipo.valor).toBe('7.64489');
    expect(TipoDeCambio.crear('8').valor).toBe('8');
    expect(TipoDeCambio.crear(' 0.00000001 ').escalado).toBe(1n);
  });

  it.each(['', '0', '0.00000000', '-1', '7,5', '1.123456789', '1e3', 'abc', '123456789', '7.'])(
    'rechaza «%s»',
    (texto) => {
      expect(() => TipoDeCambio.crear(texto)).toThrow(TipoDeCambioInvalido);
    },
  );

  it('acepta el mayor valor que cabe en la columna y rechaza uno más', () => {
    expect(TipoDeCambio.crear('99999999.99999999').escalado).toBe(10n ** 16n - 1n);
    expect(() => TipoDeCambio.crear('100000000')).toThrow(TipoDeCambioInvalido);
  });

  it('el quetzal consigo mismo es uno y dos tipos iguales son iguales', () => {
    expect(TipoDeCambio.UNO.valor).toBe('1');
    expect(TipoDeCambio.crear('7.5').esIgualA(TipoDeCambio.crear('7.50'))).toBe(true);
  });
});

describe('TipoDeCambio.aQuetzales', () => {
  it('convierte con el tipo y redondea desde la mitad', () => {
    const tipo = TipoDeCambio.crear('7.64489');

    expect(tipo.aQuetzales(10000)).toBe(76449);
    expect(tipo.aQuetzales(1)).toBe(8);
    expect(tipo.aQuetzales(0)).toBe(0);
  });

  it('una mitad exacta sube (y baja, si es negativa)', () => {
    const tipo = TipoDeCambio.crear('0.5');

    expect(tipo.aQuetzales(1)).toBe(1);
    expect(tipo.aQuetzales(3)).toBe(2);
    expect(tipo.aQuetzales(-1)).toBe(-1);
    expect(tipo.aQuetzales(-3)).toBe(-2);
  });

  it('justo debajo de la mitad baja', () => {
    expect(TipoDeCambio.crear('0.49999999').aQuetzales(1)).toBe(0);
    expect(TipoDeCambio.crear('0.50000001').aQuetzales(1)).toBe(1);
  });

  it('con el tipo uno no cambia nada', () => {
    expect(TipoDeCambio.UNO.aQuetzales(123456)).toBe(123456);
    expect(TipoDeCambio.UNO.aMoneda(123456)).toBe(123456);
  });

  it('un centavo no se pierde por decimales de punto flotante', () => {
    expect(TipoDeCambio.crear('7.7').aQuetzales(10)).toBe(77);
    expect(TipoDeCambio.crear('1.1').aQuetzales(10)).toBe(11);
  });

  it('el máximo de numeric(14,2) con un tipo de 1 convierte; pasarse del tope falla', () => {
    const maximo = 99_999_999_999_999;

    expect(TipoDeCambio.UNO.aQuetzales(maximo)).toBe(maximo);
    expect(() => TipoDeCambio.crear('1.5').aQuetzales(maximo)).toThrow(ConversionFueraDeRango);
  });

  it('un monto que no es entero de centavos se rechaza', () => {
    expect(() => TipoDeCambio.UNO.aQuetzales(1.5)).toThrow(ConversionFueraDeRango);
    expect(() => TipoDeCambio.UNO.aQuetzales(Number.MAX_SAFE_INTEGER + 2)).toThrow(ConversionFueraDeRango);
  });
});

describe('TipoDeCambio.aMoneda', () => {
  it('convierte quetzales a la moneda y redondea desde la mitad', () => {
    const tipo = TipoDeCambio.crear('7.64489');

    expect(tipo.aMoneda(76449)).toBe(10000);
    expect(TipoDeCambio.crear('2').aMoneda(3)).toBe(2);
    expect(TipoDeCambio.crear('2').aMoneda(-3)).toBe(-2);
  });

  it('ida y vuelta: con un tipo de 1 o más, quetzales → moneda → quetzales vuelve al mismo monto en montos redondos', () => {
    const tipo = TipoDeCambio.crear('7.5');

    for (const centavos of [0, 75, 750, 1_000_000, 9_999_999_999_999]) {
      const enMoneda = tipo.aMoneda(centavos);
      expect(Math.abs(tipo.aQuetzales(enMoneda) - centavos)).toBeLessThanOrEqual(4);
    }
    expect(tipo.aQuetzales(tipo.aMoneda(750))).toBe(750);
  });

  it('un tipo muy pequeño que agranda el monto más allá del tope falla', () => {
    expect(() => TipoDeCambio.crear('0.00000001').aMoneda(1_000_000)).toThrow(ConversionFueraDeRango);
  });
});
