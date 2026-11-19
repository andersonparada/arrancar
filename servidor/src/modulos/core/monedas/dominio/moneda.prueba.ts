import { describe, expect, it } from 'vitest';
import { aplicarCambios, exigirMonedaExtranjera, type Moneda } from './moneda.js';

const euro: Moneda = {
  codigo: 'EUR',
  nombre: 'Euro',
  simbolo: '€',
  decimales: 2,
  activa: false,
  codigoBanguat: null,
  letrasSingular: null,
  letrasPlural: null,
};
const quetzal: Moneda = { ...euro, codigo: 'GTQ', nombre: 'Quetzal', activa: true };
const yen: Moneda = { ...euro, codigo: 'JPY', decimales: 0 };

describe('aplicarCambios', () => {
  it('aplica lo que viene y deja lo demás como estaba', () => {
    const nueva = aplicarCambios(euro, { activa: true, codigoBanguat: 28 });

    expect(nueva).toEqual({ ...euro, activa: true, codigoBanguat: 28 });
  });

  it('lo que falta (undefined) no se toca, y null sí quita el valor', () => {
    const conCodigo = { ...euro, codigoBanguat: 28 };

    expect(aplicarCambios(conCodigo, { activa: undefined })).toEqual(conCodigo);
    expect(aplicarCambios(conCodigo, { codigoBanguat: null }).codigoBanguat).toBeNull();
  });

  it('no activa una moneda que no lleva dos decimales', () => {
    expect(() => aplicarCambios(yen, { activa: true })).toThrow(
      expect.objectContaining({ codigo: 'moneda_sin_dos_decimales' }),
    );
  });

  it('una moneda sin decimales sí puede tener código, letras y seguir inactiva', () => {
    expect(aplicarCambios(yen, { codigoBanguat: 5, letrasSingular: 'YEN', letrasPlural: 'YENES' }).codigoBanguat).toBe(
      5,
    );
  });

  it('las letras van las dos o ninguna', () => {
    expect(() => aplicarCambios(euro, { letrasSingular: 'EURO' })).toThrow(
      expect.objectContaining({ codigo: 'letras_incompletas' }),
    );
    expect(aplicarCambios(euro, { letrasSingular: 'EURO', letrasPlural: 'EUROS' }).letrasPlural).toBe('EUROS');
  });

  it('quitar las letras exige quitar las dos', () => {
    const conLetras = { ...euro, letrasSingular: 'EURO', letrasPlural: 'EUROS' };

    expect(aplicarCambios(conLetras, { letrasSingular: null, letrasPlural: null }).letrasSingular).toBeNull();
    expect(() => aplicarCambios(conLetras, { letrasSingular: null })).toThrow(
      expect.objectContaining({ codigo: 'letras_incompletas' }),
    );
  });

  it('el quetzal no se desactiva ni lleva código del Banguat', () => {
    expect(() => aplicarCambios(quetzal, { activa: false })).toThrow(
      expect.objectContaining({ codigo: 'moneda_base_no_se_desactiva' }),
    );
    expect(() => aplicarCambios(quetzal, { codigoBanguat: 2 })).toThrow(
      expect.objectContaining({ codigo: 'codigo_del_banguat_en_gtq' }),
    );
    expect(aplicarCambios(quetzal, { letrasSingular: 'QUETZAL', letrasPlural: 'QUETZALES' }).activa).toBe(true);
  });
});

describe('exigirMonedaExtranjera', () => {
  it('el quetzal no tiene tipo de cambio', () => {
    expect(() => exigirMonedaExtranjera('GTQ')).toThrow(
      expect.objectContaining({ codigo: 'tipo_de_cambio_del_quetzal' }),
    );
    expect(() => exigirMonedaExtranjera('USD')).not.toThrow();
  });
});
