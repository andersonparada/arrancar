import { describe, expect, it } from 'vitest';
import { resumenDeEjemplo } from './ejemplos-de-saldos-iniciales';
import {
  datosDeCabecera,
  edicionDeSaldoInicial,
  edicionNuevaDeSaldoInicial,
  erroresDeCabecera,
} from './edicion-de-saldo-inicial';

const ficha = (cambios = {}) => ({
  ...resumenDeEjemplo(),
  observaciones: 'Cierre de diciembre',
  evidencia: null,
  partidas: [],
  ...cambios,
});

describe('edicionDeSaldoInicial', () => {
  it('abre vacía para registrar', () => {
    expect(edicionNuevaDeSaldoInicial()).toMatchObject({
      abierta: true,
      separando: false,
      saldoSegunEstadoDeCuenta: '',
    });
  });

  it('abre con lo guardado para corregir', () => {
    expect(edicionDeSaldoInicial(ficha())).toMatchObject({
      separando: false,
      saldoSegunEstadoDeCuenta: '10000.00',
      saldoSegunLibrosAnteriores: '9300.00',
      observaciones: 'Cierre de diciembre',
    });
  });

  it('con el saldo «de antes» pide un saldo nuevo para separarlo en partidas', () => {
    const edicion = edicionDeSaldoInicial(ficha({ forma: 'global', saldoSegunEstadoDeCuenta: null }));
    expect(edicion.separando).toBe(true);
    expect(edicion.saldoSegunEstadoDeCuenta).toBe('');
  });
});

describe('datosDeCabecera', () => {
  it('acepta el saldo negativo y manda lo opcional vacío como null', () => {
    const edicion = {
      ...edicionNuevaDeSaldoInicial(),
      saldoSegunEstadoDeCuenta: '-250.40',
      saldoSegunLibrosAnteriores: '',
      observaciones: '   ',
    };
    expect(datosDeCabecera(edicion)).toEqual({
      saldoSegunEstadoDeCuenta: '-250.40',
      saldoSegunLibrosAnteriores: null,
      observaciones: null,
    });
  });

  it('un número escrito en el campo viaja como texto', () => {
    const edicion = { ...edicionNuevaDeSaldoInicial(), saldoSegunEstadoDeCuenta: 1500, saldoSegunLibrosAnteriores: 0 };
    expect(datosDeCabecera(edicion)).toMatchObject({
      saldoSegunEstadoDeCuenta: '1500',
      saldoSegunLibrosAnteriores: '0',
    });
  });
});

describe('erroresDeCabecera', () => {
  it('un saldo vacío dice cómo corregirlo', () => {
    expect(erroresDeCabecera(edicionNuevaDeSaldoInicial()).saldoSegunEstadoDeCuenta).toContain('escriba 0');
  });

  it('el cero y los negativos son saldos válidos', () => {
    expect(erroresDeCabecera({ ...edicionNuevaDeSaldoInicial(), saldoSegunEstadoDeCuenta: 0 })).toEqual({});
    expect(erroresDeCabecera({ ...edicionNuevaDeSaldoInicial(), saldoSegunEstadoDeCuenta: '-2500' })).toEqual({});
  });
});
