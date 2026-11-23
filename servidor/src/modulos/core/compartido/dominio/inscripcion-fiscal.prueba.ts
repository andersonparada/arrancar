import { describe, expect, it } from 'vitest';
import { estaInscrita, situacionDeInscripcion, tieneNitDeContribuyente } from './inscripcion-fiscal.js';

const NIT_VALIDO = '1000002-K';

describe('tieneNitDeContribuyente', () => {
  it.each([null, '', '   ', 'CF', 'cf', 'c-f', '123', '1234567-1'])('no cuenta %j', (nit) => {
    expect(tieneNitDeContribuyente(nit)).toBe(false);
  });

  it('cuenta un NIT válido con o sin guion', () => {
    expect(tieneNitDeContribuyente(NIT_VALIDO)).toBe(true);
    expect(tieneNitDeContribuyente('1000002K')).toBe(true);
  });
});

describe('estaInscrita', () => {
  it('sin NIT ni historial no está inscrita', () => {
    expect(estaInscrita({ nit: null, tieneHistorialFiscal: false })).toBe(false);
    expect(estaInscrita({ nit: 'CF', tieneHistorialFiscal: false })).toBe(false);
  });

  it('con NIT válido lo está, tenga o no historial', () => {
    expect(estaInscrita({ nit: NIT_VALIDO, tieneHistorialFiscal: false })).toBe(true);
  });

  it('sin NIT pero con historial fiscal sigue inscrita (quitar el NIT no apaga las salvaguardas)', () => {
    expect(estaInscrita({ nit: null, tieneHistorialFiscal: true })).toBe(true);
    expect(estaInscrita({ nit: 'CF', tieneHistorialFiscal: true })).toBe(true);
  });
});

describe('situacionDeInscripcion', () => {
  it('reparte las cuatro filas de la tabla', () => {
    expect(situacionDeInscripcion({ nit: null, tieneHistorialFiscal: false })).toBe('sin_inscripcion');
    expect(situacionDeInscripcion({ nit: NIT_VALIDO, tieneHistorialFiscal: true })).toBe('inscrita_con_datos_fiscales');
    expect(situacionDeInscripcion({ nit: NIT_VALIDO, tieneHistorialFiscal: false })).toBe(
      'inscrita_sin_datos_fiscales',
    );
    expect(situacionDeInscripcion({ nit: null, tieneHistorialFiscal: true })).toBe('sin_nit_con_historial_fiscal');
  });
});
