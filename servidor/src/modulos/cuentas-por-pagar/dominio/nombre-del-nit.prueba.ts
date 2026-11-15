import { describe, expect, it } from 'vitest';
import { nombreDelNit } from './nombre-del-nit.js';

const base = { razonSocial: null, nombres: null, apellidos: null, nombreDelDte: null };

describe('el nombre del NIT del proveedor', () => {
  it('en una persona jurídica es la razón social, no el nombre comercial', () => {
    expect(nombreDelNit({ ...base, tipoDePersona: 'juridica', razonSocial: '  Agro   Insumos, S.A. ' })).toBe(
      'Agro Insumos, S.A.',
    );
  });

  it('en una persona individual son sus nombres y apellidos', () => {
    expect(nombreDelNit({ ...base, tipoDePersona: 'individual', nombres: 'Juan', apellidos: 'Pérez' })).toBe(
      'Juan Pérez',
    );
  });

  it('sin razón social usa el nombre del emisor del DTE más reciente', () => {
    expect(nombreDelNit({ ...base, tipoDePersona: 'juridica', nombreDelDte: 'AGRO INSUMOS SA' })).toBe(
      'AGRO INSUMOS SA',
    );
  });

  it('sin ninguno devuelve nulo: no se emite el cheque', () => {
    expect(nombreDelNit({ ...base, tipoDePersona: 'juridica', razonSocial: '  ' })).toBeNull();
  });
});
