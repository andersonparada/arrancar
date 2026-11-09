import { describe, expect, it } from 'vitest';
import { avisosDeFechaDeInicio } from './avisos-de-fecha-de-inicio.js';

describe('avisosDeFechaDeInicio', () => {
  it('avisa con la fecha de inicio en dd/mm/aaaa si la emisión es anterior', () => {
    const avisos = avisosDeFechaDeInicio({ fechaDeEmision: '2026-09-30', fechaDeInicio: '2026-10-04' });
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('04/10/2026');
  });

  it('no avisa si la emisión es igual o posterior, ni sin fecha de inicio', () => {
    expect(avisosDeFechaDeInicio({ fechaDeEmision: '2026-10-04', fechaDeInicio: '2026-10-04' })).toEqual([]);
    expect(avisosDeFechaDeInicio({ fechaDeEmision: '2026-11-01', fechaDeInicio: '2026-10-04' })).toEqual([]);
    expect(avisosDeFechaDeInicio({ fechaDeEmision: '2020-01-01', fechaDeInicio: null })).toEqual([]);
  });
});
