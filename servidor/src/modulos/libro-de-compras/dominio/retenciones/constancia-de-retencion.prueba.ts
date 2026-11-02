import { describe, expect, it } from 'vitest';
import { constanciaValida, motivoDeQuitarValido, numeroDeConstanciaValido } from './constancia-de-retencion.js';
import {
  ConstanciaAnteriorALaRetencion,
  ConstanciaConFechaFutura,
  FechaDeConstanciaInvalida,
  MotivoDeLaConstanciaInvalido,
  NumeroDeConstanciaInvalido,
} from './errores-de-retenciones.js';

const HOY = '2026-10-20';

describe('constancia de retención', () => {
  it('el número va en mayúsculas y sin espacios, de 1 a 40 caracteres', () => {
    expect(numeroDeConstanciaValido(' abc 123 ')).toBe('ABC123');
    expect(() => numeroDeConstanciaValido('   ')).toThrow(NumeroDeConstanciaInvalido);
    expect(() => numeroDeConstanciaValido('A'.repeat(41))).toThrow(NumeroDeConstanciaInvalido);
  });

  it('la fecha no puede ser anterior a la de la retención, pero puede ser el mismo día', () => {
    expect(constanciaValida({ numero: 'c1', fecha: '2026-10-05' }, '2026-10-05', HOY)).toEqual({
      numero: 'C1',
      fecha: '2026-10-05',
    });
    expect(() => constanciaValida({ numero: 'C1', fecha: '2026-10-04' }, '2026-10-05', HOY)).toThrow(
      ConstanciaAnteriorALaRetencion,
    );
  });

  it('la fecha puede ser la de hoy, pero no una posterior', () => {
    expect(constanciaValida({ numero: 'C1', fecha: HOY }, '2026-10-05', HOY).fecha).toBe(HOY);
    const manana = () => constanciaValida({ numero: 'C1', fecha: '2026-10-21' }, '2026-10-05', HOY);
    expect(manana).toThrow(ConstanciaConFechaFutura);
    expect(manana).toThrow('La fecha de la constancia no puede ser posterior a hoy (20/10/2026).');
  });

  it('una fecha anterior a la retención sigue dando su propio error', () => {
    expect(() => constanciaValida({ numero: 'C1', fecha: '2026-10-01' }, '2026-10-05', '2026-09-01')).toThrow(
      ConstanciaAnteriorALaRetencion,
    );
  });

  it('rechaza una fecha mal escrita', () => {
    expect(() => constanciaValida({ numero: 'C1', fecha: '05/10/2026' }, '2026-10-05', HOY)).toThrow(
      FechaDeConstanciaInvalida,
    );
    expect(() => constanciaValida({ numero: 'C1', fecha: '2026-13-45' }, '2026-10-05', HOY)).toThrow(
      FechaDeConstanciaInvalida,
    );
  });

  it('quitar una constancia exige un motivo de hasta 300 caracteres', () => {
    expect(motivoDeQuitarValido(' Se anuló en Retenciones Web ')).toBe('Se anuló en Retenciones Web');
    expect(() => motivoDeQuitarValido('')).toThrow(MotivoDeLaConstanciaInvalido);
    expect(() => motivoDeQuitarValido('x'.repeat(301))).toThrow(MotivoDeLaConstanciaInvalido);
  });
});
