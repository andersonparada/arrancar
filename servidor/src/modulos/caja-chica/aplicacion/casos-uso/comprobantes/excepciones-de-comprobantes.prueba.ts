import { describe, expect, it } from 'vitest';
import { AccesoDenegado } from '../../../../core/compartido/aplicacion/errores.js';
import { DatoInvalido } from '../../../../core/compartido/dominio/errores.js';
import type { Comprobante } from '../../../dominio/comprobantes.js';
import {
  type Excepcion,
  motivoDeLaRetencion,
  motivoDelTope,
  motivoDelTopeDelVale,
} from './excepciones-de-comprobantes.js';

const sin: Excepcion = { permitida: false, motivo: undefined };
const con = (motivo?: string | null): Excepcion => ({ permitida: true, motivo });

const comprobante = (cambios: Partial<Comprobante> = {}): Comprobante =>
  ({
    montoCentavos: 551_000,
    montoRetenidoCentavos: 9_000,
    conRetencion: true,
    clase: 'documento',
    numero: null,
    documento: { serie: 'A', numero: '7' },
    ...cambios,
  }) as Comprobante;

describe('motivoDelTope', () => {
  const por = (excepcion: Excepcion, tope: number | null = 200_000) => ({
    comprobante: comprobante(),
    tope,
    excepcion,
  });

  it('sin tope o por debajo no pide nada', () => {
    expect(motivoDelTope(por(sin, null))).toBeNull();
    expect(motivoDelTope(por(sin, 551_000))).toBeNull();
  });

  it('sobre el tope sin permiso es un acceso denegado (403)', () => {
    expect(() => motivoDelTope(por(sin))).toThrow(AccesoDenegado);
    expect(() => motivoDelTope(por(sin))).toThrow(/A-7 es de Q\s5,510\.00 y el tope es de Q\s2,000\.00/);
  });

  it('con permiso pide el motivo (el vacío no cuenta) y lo devuelve sin espacios', () => {
    expect(() => motivoDelTope(por(con()))).toThrow(DatoInvalido);
    expect(() => motivoDelTope(por(con('  ')))).toThrow(DatoInvalido);
    expect(motivoDelTope(por(con('  Urgente  ')))).toBe('Urgente');
  });
});

describe('motivoDelTopeDelVale', () => {
  const por = (excepcion: Excepcion, montoCentavos = 25_000) => ({ montoCentavos, tope: 20_000, excepcion });

  it('hasta el tope pasa; sobre el tope pide permiso y motivo', () => {
    expect(motivoDelTopeDelVale(por(sin, 20_000))).toBeNull();
    expect(() => motivoDelTopeDelVale(por(sin))).toThrow(AccesoDenegado);
    expect(() => motivoDelTopeDelVale(por(con()))).toThrow(DatoInvalido);
    expect(motivoDelTopeDelVale(por(con('Reparación')))).toBe('Reparación');
  });
});

describe('motivoDeLaRetencion', () => {
  it('sin retención no hay motivo, y escribir uno es un dato inválido', () => {
    const limpia = comprobante({ conRetencion: false, montoRetenidoCentavos: 0 });

    expect(motivoDeLaRetencion(limpia, sin)).toBeNull();
    expect(motivoDeLaRetencion(limpia, con())).toBeNull();
    expect(() => motivoDeLaRetencion(limpia, con('No aplica'))).toThrow(DatoInvalido);
  });

  it('con retención y sin permiso es 403 aunque traiga motivo, y dice cuánto retiene', () => {
    expect(() => motivoDeLaRetencion(comprobante(), { permitida: false, motivo: 'Solo efectivo' })).toThrow(
      AccesoDenegado,
    );
    expect(() => motivoDeLaRetencion(comprobante(), sin)).toThrow(/retención de Q\s90\.00/);
  });

  it('con permiso exige el motivo y lo devuelve sin espacios', () => {
    expect(() => motivoDeLaRetencion(comprobante(), con())).toThrow(DatoInvalido);
    expect(() => motivoDeLaRetencion(comprobante(), con('   '))).toThrow(DatoInvalido);
    expect(motivoDeLaRetencion(comprobante(), con(' Solo efectivo '))).toBe('Solo efectivo');
  });
});
