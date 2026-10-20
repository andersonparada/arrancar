import { describe, expect, it } from 'vitest';
import { constanciaValida, motivoDeQuitarValido, numeroDeConstanciaValido } from './constancia-de-retencion.js';
import {
  ConstanciaAnteriorALaRetencion,
  FechaDeConstanciaInvalida,
  MotivoDeLaConstanciaInvalido,
  NumeroDeConstanciaInvalido,
} from './errores-de-retenciones.js';

describe('constancia de retención', () => {
  it('el número va en mayúsculas y sin espacios, de 1 a 40 caracteres', () => {
    expect(numeroDeConstanciaValido(' abc 123 ')).toBe('ABC123');
    expect(() => numeroDeConstanciaValido('   ')).toThrow(NumeroDeConstanciaInvalido);
    expect(() => numeroDeConstanciaValido('A'.repeat(41))).toThrow(NumeroDeConstanciaInvalido);
  });

  it('la fecha no puede ser anterior a la de la retención, pero puede ser el mismo día', () => {
    expect(constanciaValida({ numero: 'c1', fecha: '2026-10-05' }, '2026-10-05')).toEqual({
      numero: 'C1',
      fecha: '2026-10-05',
    });
    expect(() => constanciaValida({ numero: 'C1', fecha: '2026-10-04' }, '2026-10-05')).toThrow(
      ConstanciaAnteriorALaRetencion,
    );
  });

  it('rechaza una fecha mal escrita', () => {
    expect(() => constanciaValida({ numero: 'C1', fecha: '05/10/2026' }, '2026-10-05')).toThrow(
      FechaDeConstanciaInvalida,
    );
    expect(() => constanciaValida({ numero: 'C1', fecha: '2026-13-45' }, '2026-10-05')).toThrow(
      FechaDeConstanciaInvalida,
    );
  });

  it('quitar una constancia exige un motivo de hasta 300 caracteres', () => {
    expect(motivoDeQuitarValido(' Se anuló en Retenciones Web ')).toBe('Se anuló en Retenciones Web');
    expect(() => motivoDeQuitarValido('')).toThrow(MotivoDeLaConstanciaInvalido);
    expect(() => motivoDeQuitarValido('x'.repeat(301))).toThrow(MotivoDeLaConstanciaInvalido);
  });
});
