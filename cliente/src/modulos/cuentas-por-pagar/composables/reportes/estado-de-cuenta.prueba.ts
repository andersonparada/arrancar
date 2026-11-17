import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { EstadoDeCuenta, LineaDelEstado } from '../../servicios/tipos-de-reportes-de-proveedor';
import {
  cantidadDeFiltrosDeEstado,
  consultaDeEstadoDeCuenta,
  errorDelRango,
  filtrosDeEstadoIniciales,
  lineasDeImpresionDeEstado,
  montoOVacio,
  notaDeAnteriores,
  puedePedirElEstado,
  textoDeLinea,
  textoSinMovimientos,
  tieneFicha,
  totalesDeEstado,
} from './estado-de-cuenta';

beforeEach(() => setActivePinia(createPinia()));
const HOY = '2026-11-15';

const linea = (cambios: Partial<LineaDelEstado> = {}): LineaDelEstado => ({
  fecha: '2026-11-02',
  hecho: 'documento',
  documentoId: 'd-1',
  concepto: 'Factura A-10',
  total: null,
  retenciones: null,
  anterioresAlInicio: null,
  cargo: '100.00',
  abono: null,
  saldo: '100.00',
  anulada: false,
  ...cambios,
});

const estado = (cambios: Partial<EstadoDeCuenta> = {}): EstadoDeCuenta => ({
  proveedor: { id: 'p-1', nombre: 'Agro SA', nit: '1234567' },
  presentacion: 'interna',
  desde: '2026-11-01',
  hasta: HOY,
  lineas: [],
  totales: { saldoAnterior: '50.00', cargos: '100.00', abonos: '20.00', saldoFinal: '130.00' },
  alCorte: { comprometido: '30.00', disponible: '100.00' },
  avisos: [],
  leyendas: [],
  ...cambios,
});

describe('filtros del estado de cuenta', () => {
  it('abre del primer día del mes a hoy, interno y sin proveedor', () => {
    const filtros = filtrosDeEstadoIniciales(HOY);
    expect(filtros).toEqual({
      proveedorId: '',
      desde: '2026-11-01',
      hasta: HOY,
      mostrarAnulados: false,
      presentacion: 'interna',
    });
    expect(cantidadDeFiltrosDeEstado(filtros, HOY)).toBe(0);
    expect(puedePedirElEstado(filtros)).toBe(false);
  });

  it('respeta el proveedor y el día final que pide otro reporte', () => {
    const filtros = filtrosDeEstadoIniciales(HOY, 'p-1', '2026-10-31');
    expect(filtros).toMatchObject({ proveedorId: 'p-1', desde: '2026-10-01', hasta: '2026-10-31' });
    expect(puedePedirElEstado(filtros)).toBe(true);
  });

  it('avisa de un rango incompleto o al revés antes de pedirlo', () => {
    expect(errorDelRango({ desde: '2026-11-0', hasta: HOY })).toMatch(/completas/);
    expect(errorDelRango({ desde: '2026-12-01', hasta: HOY })).toMatch(/posterior/);
    expect(errorDelRango({ desde: '2026-11-01', hasta: HOY })).toBeUndefined();
  });

  it('manda solo lo que se salió de lo normal', () => {
    const filtros = { ...filtrosDeEstadoIniciales(HOY, 'p-1'), presentacion: 'para_el_proveedor' as const };
    expect(consultaDeEstadoDeCuenta(filtros)).toEqual({
      proveedorId: 'p-1',
      desde: '2026-11-01',
      hasta: HOY,
      mostrarAnulados: undefined,
      presentacion: 'para_el_proveedor',
    });
    expect(cantidadDeFiltrosDeEstado(filtros, HOY)).toBe(1);
    expect(consultaDeEstadoDeCuenta({ ...filtros, presentacion: 'interna', mostrarAnulados: true })).toMatchObject({
      mostrarAnulados: true,
      presentacion: undefined,
    });
  });
});

describe('líneas del estado de cuenta', () => {
  it('marca lo anulado con palabras y lo deja sin saldo', () => {
    expect(textoDeLinea(linea({ anulada: true }))).toBe('Factura A-10 (anulada)');
    expect(textoDeLinea(linea())).toBe('Factura A-10');
  });

  it('lleva a la ficha solo las líneas de un documento', () => {
    expect(tieneFicha(linea())).toBe(true);
    expect(tieneFicha(linea({ documentoId: null, hecho: 'retencion' }))).toBe(false);
  });

  it('deja vacía la columna sin monto', () => {
    expect(montoOVacio(null)).toBe('');
    expect(montoOVacio('10.5')).toBe(formatearMonto('10.5'));
  });

  it('explica lo anterior a la fecha de inicio de un saldo inicial', () => {
    expect(notaDeAnteriores(linea())).toBeNull();
    expect(notaDeAnteriores(linea({ anterioresAlInicio: '25.00' }))).toContain(formatearMonto('25.00'));
  });
});

describe('totales y textos del estado de cuenta', () => {
  it('la presentación interna suma lo comprometido y lo disponible', () => {
    const interna = totalesDeEstado(estado());
    expect(interna.map((t) => t.etiqueta)).toEqual([
      'Saldo final',
      'Saldo anterior',
      'Cargos del período',
      'Abonos del período',
      'Comprometido (posfechados)',
      'Disponible para pagar',
    ]);
    expect(interna[0]).toMatchObject({ valor: formatearMonto('130.00'), destacado: true });
  });

  it('para el proveedor no muestra nada interno', () => {
    expect(totalesDeEstado(estado({ presentacion: 'para_el_proveedor', alCorte: undefined }))).toHaveLength(4);
  });

  it('rotula el encabezado impreso según la presentación', () => {
    expect(lineasDeImpresionDeEstado(estado())).toEqual([
      expect.stringContaining('Agro SA · NIT 1234567'),
      expect.stringContaining('Del '),
      'Presentación interna',
    ]);
    const paraElProveedor = estado({
      presentacion: 'para_el_proveedor',
      proveedor: { id: 'p-1', nombre: 'Agro SA', nit: null },
    });
    const lineas = lineasDeImpresionDeEstado(paraElProveedor);
    expect(lineas[0]).toBe('Proveedor: Agro SA');
    expect(lineas[2]).toBe('Estado de cuenta para el proveedor');
  });

  it('dice el saldo cuando no hubo movimientos', () => {
    expect(textoSinMovimientos(estado())).toContain(formatearMonto('130.00'));
  });
});
