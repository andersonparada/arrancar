import { describe, expect, it } from 'vitest';
import { calcularNombreMostrar } from './nombre-mostrar.js';

describe('calcularNombreMostrar', () => {
  it('usa nombres y apellidos para una persona individual', () => {
    expect(calcularNombreMostrar({ tipo: 'individual', nombres: 'Juan', apellidos: 'Pérez' })).toBe('Juan Pérez');
  });

  it('prefiere el nombre comercial aunque sea individual', () => {
    expect(
      calcularNombreMostrar({ tipo: 'individual', nombres: 'Juan', apellidos: 'Pérez', nombreComercial: 'Ferretería Juan' }),
    ).toBe('Ferretería Juan');
  });

  it('usa la razón social para una persona jurídica sin nombre comercial', () => {
    expect(calcularNombreMostrar({ tipo: 'juridica', razonSocial: 'Agropecuaria S.A.' })).toBe('Agropecuaria S.A.');
  });

  it('prefiere el nombre comercial sobre la razón social', () => {
    expect(
      calcularNombreMostrar({ tipo: 'juridica', razonSocial: 'Agropecuaria S.A.', nombreComercial: 'AgroSur' }),
    ).toBe('AgroSur');
  });

  it('recorta espacios cuando falta un apellido', () => {
    expect(calcularNombreMostrar({ tipo: 'individual', nombres: 'Juan', apellidos: '' })).toBe('Juan');
  });
});
