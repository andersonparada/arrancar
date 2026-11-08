import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mensajeDeValidacionNativa, type EstadoNativo } from './validacion-nativa';

const validez = (parcial: Partial<EstadoNativo>): EstadoNativo => ({
  valueMissing: false,
  rangeOverflow: false,
  rangeUnderflow: false,
  badInput: false,
  ...parcial,
});

describe('mensajes propios de la validación del navegador', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('un campo obligatorio vacío pide completarlo, y una fecha, elegirla', () => {
    expect(mensajeDeValidacionNativa({ validez: validez({ valueMissing: true }) })).toBe('Complete este campo.');
    expect(mensajeDeValidacionNativa({ validez: validez({ valueMissing: true }), tipo: 'date' })).toBe(
      'Elija o escriba la fecha.',
    );
  });

  it('una fecha después del máximo dice cuál es el límite', () => {
    const mensaje = mensajeDeValidacionNativa({
      validez: validez({ rangeOverflow: true }),
      tipo: 'date',
      maximo: '2026-11-01',
    });
    expect(mensaje).toMatch(/^La fecha no puede ser posterior al .*2026/);
  });

  it('una fecha incompleta o inexistente pide una fecha válida', () => {
    expect(mensajeDeValidacionNativa({ validez: validez({ badInput: true }), tipo: 'date' })).toBe(
      'Escriba una fecha válida.',
    );
  });

  it('lo demás se deja al navegador', () => {
    expect(mensajeDeValidacionNativa({ validez: validez({}) })).toBe('');
  });
});
