import { describe, expect, it } from 'vitest';
import { centavosDe, fechaDeHoy, textoDeCentavos } from './dinero';

describe('centavosDe', () => {
  it('pasa montos con uno o dos decimales o sin ellos', () => {
    expect(centavosDe('1250.5')).toBe(125050);
    expect(centavosDe(' 0.07 ')).toBe(7);
    expect(centavosDe('12')).toBe(1200);
  });

  it('rechaza lo que no es un importe', () => {
    for (const texto of ['', 'abc', '-1', '1.234', '1,5', '.5']) expect(centavosDe(texto)).toBeNull();
  });
});

describe('textoDeCentavos', () => {
  it('escribe siempre dos decimales', () => {
    expect(textoDeCentavos(7)).toBe('0.07');
    expect(textoDeCentavos(125050)).toBe('1250.50');
  });
});

describe('fechaDeHoy', () => {
  it('escribe año, mes y día con ceros', () => {
    expect(fechaDeHoy(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
