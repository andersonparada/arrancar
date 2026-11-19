import { describe, expect, it } from 'vitest';
import { sinCerosFinales } from './cantidades';

describe('cantidades del servidor', () => {
  it('quita los ceros que sobran sin tocar los enteros', () => {
    expect(sinCerosFinales('24.00000000')).toBe('24');
    expect(sinCerosFinales('110.50000000')).toBe('110.5');
    expect(sinCerosFinales('0.00026417')).toBe('0.00026417');
    expect(sinCerosFinales('100')).toBe('100');
    expect(sinCerosFinales('100.0')).toBe('100');
    expect(sinCerosFinales(null)).toBe('');
  });
});
