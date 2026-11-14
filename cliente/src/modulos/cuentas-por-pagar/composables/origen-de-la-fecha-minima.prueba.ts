import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mensajeDeFechaMinima, origenDeLaFechaAlAplicar, origenDeLaFechaDeLaNota } from './origen-de-la-fecha-minima';

beforeEach(() => setActivePinia(createPinia()));

describe('origenDeLaFechaDeLaNota', () => {
  it('es la recepción de la nota o, en un saldo inicial, el inicio de la empresa', () => {
    expect(origenDeLaFechaDeLaNota(false)).toBe('nota');
    expect(origenDeLaFechaDeLaNota(true)).toBe('inicio');
  });
});

describe('origenDeLaFechaAlAplicar', () => {
  it('gana el documento si es más reciente o empata con la nota', () => {
    expect(origenDeLaFechaAlAplicar({ nota: '2026-10-01', documento: '2026-10-02' }, false)).toBe('documento');
    expect(origenDeLaFechaAlAplicar({ nota: '2026-10-01', documento: '2026-10-01' }, false)).toBe('documento');
  });

  it('gana la nota si el documento es anterior, y dice si es el inicio de la empresa', () => {
    expect(origenDeLaFechaAlAplicar({ nota: '2026-10-05', documento: '2026-10-01' }, false)).toBe('nota');
    expect(origenDeLaFechaAlAplicar({ nota: '2026-11-01', documento: null }, true)).toBe('inicio');
  });

  it('sin fecha de la nota manda el documento', () => {
    expect(origenDeLaFechaAlAplicar({ nota: null, documento: '2026-10-01' }, true)).toBe('documento');
  });
});

describe('mensajeDeFechaMinima', () => {
  it('nombra la fecha y de dónde viene', () => {
    expect(mensajeDeFechaMinima('2026-11-01', 'inicio')).toMatch(
      /fecha de inicio de la empresa con saldos iniciales\.$/,
    );
    expect(mensajeDeFechaMinima('2026-11-01', 'nota')).toMatch(/cuando se recibió la nota\.$/);
    expect(mensajeDeFechaMinima('2026-11-01', 'documento')).toMatch(/documento más reciente/);
    expect(mensajeDeFechaMinima('2026-11-01', 'nota')).toMatch(/^No puede ser anterior al .*2026/);
  });
});
