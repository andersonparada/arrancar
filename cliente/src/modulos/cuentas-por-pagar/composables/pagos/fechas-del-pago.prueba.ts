import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { cargoDeEjemplo, datosDeEjemplo, edicionDeEjemplo, notaDeEjemplo } from './ejemplos-de-pago';
import { lineasDelPago } from './edicion-de-pago';
import {
  ayudaDeLaFecha,
  errorDeLaFecha,
  esPosfechado,
  fechaMaximaDelPago,
  fechaMinimaDelPago,
  notaElegida,
} from './fechas-del-pago';

const reciente = cargoDeEjemplo('a', { fechaDeEmision: '2026-10-20' });
const viejo = cargoDeEjemplo('b', { fechaDeEmision: '2026-09-01' });
const inicial = cargoDeEjemplo('i', { origen: 'saldo_inicial', fechaDeEmision: '2025-12-01', saldo: '80.00' });

beforeEach(() => setActivePinia(createPinia()));

function contexto(montos: Record<string, string>, extras: Parameters<typeof datosDeEjemplo>[1] = {}) {
  const datos = datosDeEjemplo([reciente, viejo, inicial], extras);
  const edicion = edicionDeEjemplo({ montos });
  return { datos, edicion, lineas: lineasDelPago(edicion, datos) };
}

describe('posfechado', () => {
  it('es posfechado solo con fecha posterior a hoy', () => {
    expect(esPosfechado('2026-11-16', '2026-11-15')).toBe(true);
    expect(esPosfechado('2026-11-15', '2026-11-15')).toBe(false);
    expect(esPosfechado('', '2026-11-15')).toBe(false);
  });

  it('solo el cheque y la nota de débito se pueden posfechar; la nota ligada y la apertura no pueden ser futuras', () => {
    expect(fechaMaximaDelPago('cheque', '2026-11-15')).toBeUndefined();
    expect(fechaMaximaDelPago('nota_de_debito', '2026-11-15')).toBeUndefined();
    expect(fechaMaximaDelPago('nota_ligada', '2026-11-15')).toBe('2026-11-15');
    expect(fechaMaximaDelPago('cuenta_de_apertura', '2026-11-15')).toBe('2026-11-15');
  });
});

describe('fecha mínima', () => {
  it('es la emisión más reciente de lo que se paga, no la recepción ni la contraseña', () => {
    const { datos, lineas } = contexto({ a: '10.00', b: '10.00' });
    expect(fechaMinimaDelPago(lineas, datos)).toMatchObject({ fecha: '2026-10-20' });
  });

  it('con un saldo inicial entra también la fecha de inicio', () => {
    const { datos, lineas } = contexto({ i: '10.00' });
    expect(fechaMinimaDelPago(lineas, datos)).toMatchObject({ fecha: '2026-01-01' });
  });

  it('sin líneas no hay mínima', () => {
    const { datos, lineas } = contexto({});
    expect(fechaMinimaDelPago(lineas, datos)).toBeNull();
  });
});

describe('error de la fecha', () => {
  const hoy = '2026-11-15';

  it('una fecha anterior a la emisión dice cuál es la mínima y por qué', () => {
    const { datos, edicion, lineas } = contexto({ a: '10.00' });
    const error = errorDeLaFecha({ ...edicion, fecha: '2026-10-01' }, { hoy, datos, lineas, nota: null });
    expect(error).toMatch(/anterior al .*20.*la emisión de la factura A-a/);
  });

  it('un cheque puede llevar fecha futura; una nota ligada no', () => {
    const { datos, edicion, lineas } = contexto({ a: '10.00' });
    expect(errorDeLaFecha({ ...edicion, fecha: '2026-12-31' }, { hoy, datos, lineas, nota: null })).toBeNull();
    const ligada = { ...edicion, forma: 'nota_ligada' as const, fecha: '2026-12-31' };
    expect(errorDeLaFecha(ligada, { hoy, datos, lineas, nota: null })).toMatch(/fecha futura/);
  });

  it('la nota ligada no puede ser anterior a la fecha de la nota en Bancos', () => {
    const { datos, edicion, lineas } = contexto({ a: '10.00' });
    const ligada = { ...edicion, forma: 'nota_ligada' as const, fecha: '2026-11-01' };
    expect(errorDeLaFecha(ligada, { hoy, datos, lineas, nota: notaDeEjemplo({ fecha: '2026-11-05' }) })).toMatch(
      /la fecha de la nota en Bancos/,
    );
  });

  it('sin fecha pide escribirla; con la apertura abierta no se pide porque es fija', () => {
    const { datos, edicion, lineas } = contexto({ a: '10.00' });
    expect(errorDeLaFecha({ ...edicion, fecha: '' }, { hoy, datos, lineas, nota: null })).toMatch(/Escriba/);
    const apertura = { ...edicion, forma: 'cuenta_de_apertura' as const, fecha: '' };
    expect(errorDeLaFecha(apertura, { hoy, datos, lineas, nota: null })).toBeNull();
  });

  it('la apertura con la carga cerrada no puede ser anterior a la fecha de inicio', () => {
    const { datos, edicion, lineas } = contexto({ i: '10.00' }, { cargaCerrada: true });
    const apertura = { ...edicion, forma: 'cuenta_de_apertura' as const, fecha: '2025-12-31' };
    expect(errorDeLaFecha(apertura, { hoy, datos, lineas, nota: null })).toMatch(/la fecha de inicio del sistema/);
  });
});

describe('ayuda de la fecha', () => {
  it('explica la mínima y que una fecha futura es un posfechado', () => {
    const { datos, edicion, lineas } = contexto({ a: '10.00' });
    const ayuda = ayudaDeLaFecha(edicion, { datos, lineas });
    expect(ayuda).toMatch(/No puede ser anterior/);
    expect(ayuda).toMatch(/posfechado/);
  });

  it('la apertura con la carga abierta explica que se usa la fecha de inicio', () => {
    const { datos, edicion, lineas } = contexto({ i: '10.00' });
    expect(ayudaDeLaFecha({ ...edicion, forma: 'cuenta_de_apertura' }, { datos, lineas })).toMatch(/fecha de inicio/);
  });
});

describe('nota elegida', () => {
  it('encuentra la nota por su movimiento', () => {
    const notas = [notaDeEjemplo({ movimientoId: 'x' }), notaDeEjemplo({ movimientoId: 'n1' })];
    expect(notaElegida(edicionDeEjemplo({ movimientoId: 'n1' }), notas)?.movimientoId).toBe('n1');
    expect(notaElegida(edicionDeEjemplo({ movimientoId: '' }), notas)).toBeNull();
  });
});
