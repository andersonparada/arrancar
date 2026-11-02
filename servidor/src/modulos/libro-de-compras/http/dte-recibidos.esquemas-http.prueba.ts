import { describe, expect, it } from 'vitest';
import { esquemaConfirmarDteRecibidos } from './dte-recibidos.esquemas-http.js';

const ID = crypto.randomUUID();
const analizar = (proveedoresNuevos: unknown) =>
  esquemaConfirmarDteRecibidos.safeParse({ ids: [ID], proveedoresNuevos });

describe('proveedoresNuevos al confirmar', () => {
  it('sin ellos queda vacío', () => {
    expect(esquemaConfirmarDteRecibidos.parse({ ids: [ID] }).proveedoresNuevos).toEqual({});
  });

  it('acepta la persona (apellidos opcionales) y la empresa, recortando espacios', () => {
    const resultado = analizar({
      '1234567': { tipoDePersona: 'individual', nombres: '  Ana  ' },
      '7654321': { tipoDePersona: 'juridica', razonSocial: ' Agro, S.A. ' },
    });

    expect(resultado.data?.proveedoresNuevos).toEqual({
      '1234567': { tipoDePersona: 'individual', nombres: 'Ana', apellidos: null },
      '7654321': { tipoDePersona: 'juridica', razonSocial: 'Agro, S.A.' },
    });
  });

  it('rechaza nombres y apellidos de 81 letras y razón social de 151', () => {
    const persona = (extra: object) => ({ '1': { tipoDePersona: 'individual', nombres: 'a', ...extra } });
    expect(analizar(persona({ nombres: 'a'.repeat(81) })).success).toBe(false);
    expect(analizar(persona({ apellidos: 'a'.repeat(81) })).success).toBe(false);
    expect(analizar({ '1': { tipoDePersona: 'juridica', razonSocial: 'a'.repeat(151) } }).success).toBe(false);
    expect(analizar({ '1': { tipoDePersona: 'juridica', razonSocial: 'a'.repeat(150) } }).success).toBe(true);
  });

  it('rechaza nombre vacío, campos de otro tipo y tipos desconocidos', () => {
    expect(analizar({ '1': { tipoDePersona: 'individual', nombres: '  ' } }).success).toBe(false);
    expect(analizar({ '1': { tipoDePersona: 'juridica', nombres: 'Ana', razonSocial: 'X' } }).success).toBe(false);
    expect(analizar({ '1': { tipoDePersona: 'otra', nombres: 'Ana' } }).success).toBe(false);
  });

  it('rechaza más de 100 NIT', () => {
    const muchos = Object.fromEntries(
      Array.from({ length: 101 }, (_, i) => [String(i), { tipoDePersona: 'juridica', razonSocial: 'X' }]),
    );
    expect(analizar(muchos).success).toBe(false);
  });
});
