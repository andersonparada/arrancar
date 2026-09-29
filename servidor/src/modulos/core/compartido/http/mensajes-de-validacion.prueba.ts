import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { configurarMensajesDeValidacion } from './mensajes-de-validacion.js';

configurarMensajesDeValidacion();

const mensajeDe = (esquema: z.ZodType, valor: unknown): string | undefined =>
  esquema.safeParse(valor).error?.issues[0]?.message;

describe('mensajes de validación en español claro', () => {
  it('un texto vacío pide el campo y uno largo dice el máximo', () => {
    expect(mensajeDe(z.string().min(1), '')).toBe('Campo obligatorio.');
    expect(mensajeDe(z.string().max(150), 'a'.repeat(151))).toBe('Escriba como máximo 150 caracteres.');
    expect(mensajeDe(z.string().min(3), 'a')).toBe('Escriba al menos 3 caracteres.');
  });

  it('un campo que falta es obligatorio', () => {
    expect(mensajeDe(z.object({ motivo: z.string() }), {})).toBe('Campo obligatorio.');
  });

  it('listas y números no llevan símbolos', () => {
    expect(mensajeDe(z.array(z.string()).min(1), [])).toBe('Elija al menos 1 opción.');
    expect(mensajeDe(z.number().min(5), 1)).toBe('Debe ser 5 o más.');
    expect(mensajeDe(z.number().max(5), 9)).toBe('Debe ser 5 o menos.');
  });

  it('lo que no tiene redacción propia usa la del idioma', () => {
    expect(mensajeDe(z.string().email(), 'x')).toBeDefined();
  });
});
