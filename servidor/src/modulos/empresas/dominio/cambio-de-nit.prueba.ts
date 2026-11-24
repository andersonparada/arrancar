import { describe, expect, it } from 'vitest';
import { clasificarCambioDeNit, FaltaElMotivoDelCambioDeNit, motivoDelCambioDeNit } from './cambio-de-nit.js';

describe('clasificarCambioDeNit', () => {
  it('no hay cambio si es el mismo NIT o sigue sin NIT', () => {
    expect(clasificarCambioDeNit('1000002K', '1000002K')).toBe('ninguno');
    expect(clasificarCambioDeNit(null, null)).toBe('ninguno');
  });

  it('agregar un NIT a una empresa sin NIT es agregado', () => {
    expect(clasificarCambioDeNit(null, '1000002K')).toBe('agregado');
  });

  it('quitar o reemplazar el NIT es corregido', () => {
    expect(clasificarCambioDeNit('1000002K', null)).toBe('corregido');
    expect(clasificarCambioDeNit('1000002K', '76543218')).toBe('corregido');
  });
});

describe('motivoDelCambioDeNit', () => {
  it('devuelve el motivo sin espacios sobrantes', () => {
    expect(motivoDelCambioDeNit('  Error al digitar ')).toBe('Error al digitar');
  });

  it.each([undefined, null, '', '   '])('exige texto (%j)', (motivo) => {
    expect(() => motivoDelCambioDeNit(motivo)).toThrow(FaltaElMotivoDelCambioDeNit);
  });
});
