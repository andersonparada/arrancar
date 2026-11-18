import { describe, expect, it } from 'vitest';
import { historialIncompatible } from './historial-de-migraciones.js';

const m = (hash: string, fecha: number) => ({ hash, fecha });

describe('historialIncompatible', () => {
  const locales = [m('a', 1), m('b', 2), m('c', 3)];

  it('acepta una base sin historial', () => {
    expect(historialIncompatible([], locales)).toBe(false);
  });
  it('acepta el historial completo o con lo último pendiente', () => {
    expect(historialIncompatible(locales, locales)).toBe(false);
    expect(historialIncompatible([m('a', 1), m('b', 2)], locales)).toBe(false);
  });
  it('rechaza una migración aplicada que ya no existe o cambió de hash', () => {
    expect(historialIncompatible([m('a', 1), m('x', 2)], locales)).toBe(true);
  });
  it('rechaza una migración pendiente con fecha anterior a la última aplicada (drizzle la saltaría)', () => {
    expect(historialIncompatible([m('a', 1), m('c', 3)], locales)).toBe(true);
  });
});
