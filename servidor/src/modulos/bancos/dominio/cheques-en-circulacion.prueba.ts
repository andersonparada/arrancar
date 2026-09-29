import { describe, expect, it } from 'vitest';
import { diasDeAntiguedad, fechaDeCorteDeCheques } from './cheques-en-circulacion.js';

describe('fecha de corte de cheques en circulación', () => {
  it.each([
    ['2026-09-29', 7, '2026-02-28'],
    ['2026-09-30', 7, '2026-02-28'],
    ['2026-03-31', 1, '2026-02-28'],
    ['2024-03-31', 1, '2024-02-29'],
    ['2026-02-10', 7, '2025-07-10'],
    ['2026-01-15', 12, '2025-01-15'],
    ['2026-01-15', 13, '2024-12-15'],
  ])('a %s le resta %i meses y da %s', (hoy, meses, esperada) => {
    expect(fechaDeCorteDeCheques(hoy, meses)).toBe(esperada);
  });
});

describe('días de antigüedad de un cheque', () => {
  it.each([
    ['2026-09-29', '2026-09-29', 0],
    ['2026-09-28', '2026-09-29', 1],
    ['2026-01-01', '2026-09-29', 271],
    ['2025-12-31', '2026-01-01', 1],
    ['2026-10-05', '2026-09-29', 0],
  ])('de %s a %s son %i días', (fecha, hoy, esperados) => {
    expect(diasDeAntiguedad(fecha, hoy)).toBe(esperados);
  });
});
