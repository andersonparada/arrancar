import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { FilaDeChequePosfechado, ReporteDeChequesPosfechados } from '../../servicios/tipos-de-reportes-de-pagos';
import {
  cantidadDeFiltrosDeCheques,
  consultaDeCheques,
  errorDeCorteDeCheques,
  filtrosDeChequesIniciales,
  lineasDeImpresionDeCheques,
  textoDeCobro,
  textoDeDiasQueFaltan,
  totalesDeCheques,
} from './cheques-posfechados';

beforeEach(() => setActivePinia(createPinia()));
const HOY = '2026-11-18';

const fila = (cobrado: boolean): FilaDeChequePosfechado => ({
  pagoId: 'p',
  numeroDelPago: '1',
  fecha: '2026-12-01',
  diasQueFaltan: 13,
  cuenta: 'Banco',
  numeroDeCheque: '100',
  proveedorId: 'x',
  proveedorNombre: 'Agro',
  monto: '50.00',
  cobrado,
  cobradoEn: null,
});

describe('cheques posfechados', () => {
  it('abre al corte de hoy y respeta el corte del enlace', () => {
    expect(filtrosDeChequesIniciales(HOY)).toEqual({ corte: HOY, proveedorId: '' });
    expect(filtrosDeChequesIniciales(HOY, 'p-1', '2026-10-31').corte).toBe('2026-10-31');
    expect(cantidadDeFiltrosDeCheques({ corte: '2026-10-31', proveedorId: 'p-1' }, HOY)).toBe(2);
    expect(consultaDeCheques({ corte: HOY, proveedorId: '' }).proveedorId).toBeUndefined();
  });

  it('pide la fecha completa', () => {
    expect(errorDeCorteDeCheques('2026-11-1')).toMatch(/completa/);
    expect(errorDeCorteDeCheques(HOY)).toBeUndefined();
  });

  it('dice cuánto falta para la fecha del cheque', () => {
    expect(textoDeDiasQueFaltan(0)).toBe('Hoy');
    expect(textoDeDiasQueFaltan(1)).toBe('Mañana');
    expect(textoDeDiasQueFaltan(12)).toBe('En 12 días');
  });

  it('marca el cheque que Bancos ya concilió', () => {
    expect(textoDeCobro({ cobrado: false, cobradoEn: null })).toBe('Sin cobrar');
    expect(textoDeCobro({ cobrado: true, cobradoEn: '11/2026' })).toBe('Cobrado en 11/2026');
    expect(textoDeCobro({ cobrado: true, cobradoEn: null })).toBe('Cobrado a la vista');
  });

  it('resume lo comprometido y cuántos ya se cobraron', () => {
    const reporte: ReporteDeChequesPosfechados = {
      corte: HOY,
      filas: [fila(true), fila(false)],
      totalesPorCuenta: [],
      totalesPorSemana: [],
      total: { cantidad: 2, monto: '100.00' },
      leyendas: [],
    };
    const totales = totalesDeCheques(reporte);
    expect(totales[0]).toMatchObject({ valor: formatearMonto('100.00'), destacado: true });
    expect(totales[2]?.valor).toBe('1');
    expect(lineasDeImpresionDeCheques({ corte: HOY, proveedorId: '' }, null)[1]).toBe('Proveedor: todos');
  });
});
