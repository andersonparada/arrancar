import { describe, expect, it } from 'vitest';
import {
  avisoDeValeViejo,
  devueltoDelVale,
  diasAbiertoDelVale,
  exigirFechaDeLiquidacion,
  exigirFechaDelVale,
  exigirQueAlcanceParaElVale,
  exigirValeAbierto,
  exigirValeAnulable,
  nombreDelReceptor,
} from './reglas-de-vales-provisionales.js';

describe('reglas de los vales provisionales', () => {
  it('lo devuelto es lo que sobró y nunca es negativo', () => {
    expect(devueltoDelVale(50_000, 32_000)).toBe(18_000);
    expect(devueltoDelVale(50_000, 50_000)).toBe(0);
    expect(devueltoDelVale(50_000, 61_000)).toBe(0);
    expect(devueltoDelVale(50_000, 0)).toBe(50_000);
  });

  it('el nombre del usuario manda sobre el escrito y no puede quedar vacío', () => {
    expect(nombreDelReceptor('  Juan  ', null)).toBe('Juan');
    expect(nombreDelReceptor('Otro', 'Ana Pérez')).toBe('Ana Pérez');
    expect(() => nombreDelReceptor('  ', null)).toThrow(/a quién se entrega/);
  });

  it('la fecha del vale no es futura ni anterior a la apertura', () => {
    const contexto = { hoy: '2026-11-10', fechaDeApertura: '2026-11-01' };
    expect(() => exigirFechaDelVale('2026-11-10', contexto)).not.toThrow();
    expect(() => exigirFechaDelVale('2026-11-11', contexto)).toThrow(/futura/);
    expect(() => exigirFechaDelVale('2026-10-31', contexto)).toThrow(/apertura/);
  });

  it('la liquidación no es futura ni anterior a la entrega', () => {
    const contexto = { hoy: '2026-11-10', vale: { fecha: '2026-11-05' } };
    expect(() => exigirFechaDeLiquidacion('2026-11-05', contexto)).not.toThrow();
    expect(() => exigirFechaDeLiquidacion('2026-11-11', contexto)).toThrow(/futura/);
    expect(() => exigirFechaDeLiquidacion('2026-11-04', contexto)).toThrow(/entrega/);
  });

  it('el vale no puede pasar del efectivo de la caja', () => {
    expect(() => exigirQueAlcanceParaElVale(10_000, 10_000)).not.toThrow();
    expect(() => exigirQueAlcanceParaElVale(10_000, 10_001)).toThrow(/no alcanza/);
  });

  it('solo un vale abierto se liquida y solo uno sin comprobantes se anula', () => {
    expect(() => exigirValeAbierto({ estado: 'abierto', numero: 3 })).not.toThrow();
    expect(() => exigirValeAbierto({ estado: 'liquidado', numero: 3 })).toThrow('El vale 3 ya está liquidado.');
    expect(() => exigirValeAnulable({ estado: 'abierto', numero: 3 }, 0)).not.toThrow();
    expect(() => exigirValeAnulable({ estado: 'abierto', numero: 3 }, 1)).toThrow(/comprobantes/);
    expect(() => exigirValeAnulable({ estado: 'anulado', numero: 3 }, 0)).toThrow(/anulado/);
  });

  it('cuenta los días abiertos solo de un vale abierto', () => {
    expect(diasAbiertoDelVale({ fecha: '2026-11-01', estado: 'abierto' }, '2026-11-08')).toBe(7);
    expect(diasAbiertoDelVale({ fecha: '2026-11-01', estado: 'liquidado' }, '2026-11-08')).toBe(0);
  });

  it('avisa del vale viejo solo pasados los días y nunca con 0', () => {
    const base = { fecha: '2026-11-01', hoy: '2026-11-07' };
    expect(avisoDeValeViejo({ ...base, diasParaAvisar: 5, numero: 4 })).toBe(
      'El vale 4 lleva 6 días abierto: liquídelo.',
    );
    expect(avisoDeValeViejo({ ...base, diasParaAvisar: 6 })).toBeNull();
    expect(avisoDeValeViejo({ ...base, diasParaAvisar: 0 })).toBeNull();
    expect(avisoDeValeViejo({ ...base, diasParaAvisar: 3 })).toMatch(/desde hace 6 días/);
  });
});
