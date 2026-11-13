import { describe, expect, it } from 'vitest';
import type { SaldoInicial } from '../../servicios/tipos-de-saldos-iniciales';
import {
  aplicarPropuesta,
  centavosDe,
  datosDeSaldoInicial,
  edicionDe,
  edicionNueva,
  errorDeRetencionesPorPracticar,
  propuestaDeSaldoPendiente,
} from './edicion-de-saldo-inicial';

const saldo: SaldoInicial = {
  id: 's1',
  proveedorId: 'p1',
  proveedorNombre: 'Agro SA',
  proveedorNit: '1234567',
  tipo: 'factura',
  serie: null,
  numero: 'A-1',
  referencia: 'FAC-77',
  fechaEmision: '2026-09-15',
  vencimiento: null,
  total: '1000.00',
  retenciones: '50.00',
  retencionesPorPracticar: '20.00',
  saldoPendiente: '700.00',
  anterioresAlInicio: '250.00',
  saldo: '700.00',
  estado: 'registrado',
  tieneActivoFijo: false,
  creadoEn: '2026-10-01T00:00:00Z',
  puedeCorregir: true,
  puedeEliminar: true,
};

describe('montos en centavos', () => {
  it('lee montos con hasta dos decimales y rechaza lo demás', () => {
    expect(centavosDe('10.05')).toBe(1005);
    expect(centavosDe(7)).toBe(700);
    expect(centavosDe('')).toBeNull();
    expect(centavosDe('1.234')).toBeNull();
    expect(centavosDe('abc')).toBeNull();
  });
});

describe('propuesta del saldo pendiente', () => {
  it('es el total menos las retenciones', () => {
    expect(propuestaDeSaldoPendiente('1000', '50.50')).toBe('949.50');
    expect(propuestaDeSaldoPendiente('0.30', '0.10')).toBe('0.20');
  });

  it('sin retenciones es el total', () => {
    expect(propuestaDeSaldoPendiente('100', '')).toBe('100.00');
  });

  it('no propone si el total no es válido o las retenciones pasan del total', () => {
    expect(propuestaDeSaldoPendiente('', '')).toBe('');
    expect(propuestaDeSaldoPendiente('0', '')).toBe('');
    expect(propuestaDeSaldoPendiente('100', '150')).toBe('');
  });

  it('se aplica solo mientras el usuario no escribió el saldo', () => {
    const edicion = edicionNueva();
    Object.assign(edicion, { total: '200', retenciones: '10' });
    aplicarPropuesta(edicion);
    expect(edicion.saldoPendiente).toBe('190.00');
    edicion.saldoEscrito = true;
    edicion.total = '500';
    aplicarPropuesta(edicion);
    expect(edicion.saldoPendiente).toBe('190.00');
  });

  it('en una nota de crédito ignora las retenciones', () => {
    const edicion = edicionNueva();
    Object.assign(edicion, { tipo: 'nota_de_credito', total: '80', retenciones: '10' });
    aplicarPropuesta(edicion);
    expect(edicion.saldoPendiente).toBe('80.00');
  });
});

describe('retenciones por practicar', () => {
  it('no pueden pasar de las retenciones', () => {
    const edicion = edicionNueva();
    Object.assign(edicion, { retenciones: '10', retencionesPorPracticar: '10.01' });
    expect(errorDeRetencionesPorPracticar(edicion)).toMatch(/más que las retenciones/);
    edicion.retencionesPorPracticar = '10';
    expect(errorDeRetencionesPorPracticar(edicion)).toBeNull();
  });

  it('no se revisan en una nota de crédito ni mientras faltan datos', () => {
    const edicion = edicionNueva();
    expect(errorDeRetencionesPorPracticar(edicion)).toBeNull();
    Object.assign(edicion, { tipo: 'nota_de_credito', retenciones: '1', retencionesPorPracticar: '5' });
    expect(errorDeRetencionesPorPracticar(edicion)).toBeNull();
  });
});

describe('formulario y API', () => {
  it('al corregir, la edición trae lo guardado y no propone el saldo', () => {
    const edicion = edicionDe(saldo);
    expect(edicion).toMatchObject({ abierta: true, id: 's1', serie: '', vencimiento: '', saldoEscrito: true });
    expect(edicion.saldoPendiente).toBe('700.00');
  });

  it('manda lo vacío como null y las retenciones vacías como cero', () => {
    const edicion = edicionNueva();
    Object.assign(edicion, {
      proveedorId: 'p1',
      numero: ' 55 ',
      fechaEmision: '2026-09-01',
      total: '100',
      saldoPendiente: '100',
    });
    expect(datosDeSaldoInicial(edicion)).toMatchObject({
      serie: null,
      numero: '55',
      referencia: null,
      vencimiento: null,
      retenciones: '0.00',
      retencionesPorPracticar: '0.00',
      total: '100',
    });
  });

  it('una nota de crédito se manda sin vencimiento ni retenciones aunque queden escritos', () => {
    const edicion = edicionNueva();
    Object.assign(edicion, {
      tipo: 'nota_de_credito',
      vencimiento: '2026-12-01',
      retenciones: '5',
      retencionesPorPracticar: '2',
    });
    expect(datosDeSaldoInicial(edicion)).toMatchObject({
      vencimiento: null,
      retenciones: '0.00',
      retencionesPorPracticar: '0.00',
    });
  });
});
