import { describe, expect, it } from 'vitest';
import { Correo, CorreoInvalido } from './correo.js';
import { Telefono, TelefonoInvalido } from './telefono.js';

describe('Correo', () => {
  it('se guarda en minúsculas y sin espacios alrededor', () => {
    expect(Correo.crear('  Ana.Lopez@Finca.GT ').valor).toBe('ana.lopez@finca.gt');
  });

  it.each(['sin-arroba.com', 'ana@', 'ana@finca', 'ana lopez@finca.gt', ''])(
    'rechaza un correo inválido: "%s"',
    (texto) => {
      expect(() => Correo.crear(texto)).toThrow(CorreoInvalido);
    },
  );
});

describe('Telefono', () => {
  it('guarda un número local sin separadores y lo muestra en dos grupos', () => {
    const telefono = Telefono.crear('5555 - 1234');

    expect(telefono.valor).toBe('55551234');
    expect(telefono.esLocal()).toBe(true);
    expect(telefono.paraMostrar()).toBe('5555-1234');
  });

  it('acepta números internacionales con su código de país', () => {
    const telefono = Telefono.crear('+502 (5555) 1234');

    expect(telefono.valor).toBe('+50255551234');
    expect(telefono.esLocal()).toBe(false);
    expect(telefono.paraMostrar()).toBe('+50255551234');
  });

  it.each(['123', 'cinco cinco', '+50255551234567890', ''])('rechaza un teléfono inválido: "%s"', (texto) => {
    expect(() => Telefono.crear(texto)).toThrow(TelefonoInvalido);
  });
});
