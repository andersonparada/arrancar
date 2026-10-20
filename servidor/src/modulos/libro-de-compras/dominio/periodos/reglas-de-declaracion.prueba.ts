import { describe, expect, it } from 'vitest';
import {
  FechaDePresentacionInvalida,
  MotivoDelPeriodoInvalido,
  NumeroDeFormularioInvalido,
  PeriodoSinTerminar,
} from './errores-de-periodos.js';
import {
  eventoDeLaDeclaracion,
  exigirFechaDePresentacion,
  exigirPeriodoTerminado,
  formularioDelRegimen,
  motivoDelPeriodoValido,
  numeroDeFormularioValido,
} from './reglas-de-declaracion.js';

describe('formulario según el régimen', () => {
  it('el general declara en el SAT-2237, el pequeño contribuyente en el SAT-2046 y los demás sin formulario', () => {
    expect(formularioDelRegimen('general')).toBe('SAT-2237');
    expect(formularioDelRegimen('pequeno_contribuyente')).toBe('SAT-2046');
    expect(formularioDelRegimen('pequeno_contribuyente_electronico')).toBe('SAT-2046');
    expect(formularioDelRegimen('no_afiliado')).toBe('sin_formulario');
    expect(formularioDelRegimen('primario_pecuario')).toBe('sin_formulario');
  });
});

describe('período terminado y fecha de presentación', () => {
  it('solo se declaran meses anteriores al mes de hoy', () => {
    expect(() => exigirPeriodoTerminado('2026-09-01', '2026-10-20')).not.toThrow();
    expect(() => exigirPeriodoTerminado('2026-10-01', '2026-10-20')).toThrow(PeriodoSinTerminar);
    expect(() => exigirPeriodoTerminado('2026-11-01', '2026-10-20')).toThrow(PeriodoSinTerminar);
  });

  it('se presenta desde el primer día del mes siguiente; sin fecha no hay nada que revisar', () => {
    expect(() => exigirFechaDePresentacion('2026-09-01', '2026-10-01')).not.toThrow();
    expect(() => exigirFechaDePresentacion('2026-09-01', null)).not.toThrow();
    expect(() => exigirFechaDePresentacion('2026-09-01', '2026-09-30')).toThrow(FechaDePresentacionInvalida);
  });
});

describe('número del formulario', () => {
  it('es opcional: vacío o ausente queda sin número', () => {
    expect(numeroDeFormularioValido(undefined, 'SAT-2237')).toBeNull();
    expect(numeroDeFormularioValido('  ', 'SAT-2237')).toBeNull();
  });

  it('se limpia (sin espacios ni guiones, en mayúsculas) y acepta letras y dígitos', () => {
    expect(numeroDeFormularioValido(' 12-34 ab ', 'SAT-2046')).toBe('1234AB');
  });

  it('rechaza símbolos, más de 40 caracteres y el número en un período sin formulario', () => {
    expect(() => numeroDeFormularioValido('12#34', 'SAT-2237')).toThrow(NumeroDeFormularioInvalido);
    expect(() => numeroDeFormularioValido('1'.repeat(41), 'SAT-2237')).toThrow(NumeroDeFormularioInvalido);
    expect(() => numeroDeFormularioValido('123', 'sin_formulario')).toThrow(NumeroDeFormularioInvalido);
  });
});

describe('motivo y evento', () => {
  it('el motivo lleva de 1 a 500 caracteres', () => {
    expect(motivoDelPeriodoValido('  Falta una factura ')).toBe('Falta una factura');
    expect(() => motivoDelPeriodoValido(undefined)).toThrow(MotivoDelPeriodoInvalido);
    expect(() => motivoDelPeriodoValido('   ')).toThrow(MotivoDelPeriodoInvalido);
    expect(() => motivoDelPeriodoValido('x'.repeat(501))).toThrow(MotivoDelPeriodoInvalido);
  });

  it('la primera vez es declaración y toda la siguiente, rectificación', () => {
    expect(eventoDeLaDeclaracion(0)).toBe('declaracion');
    expect(eventoDeLaDeclaracion(1)).toBe('rectificacion');
    expect(eventoDeLaDeclaracion(3)).toBe('rectificacion');
  });
});
