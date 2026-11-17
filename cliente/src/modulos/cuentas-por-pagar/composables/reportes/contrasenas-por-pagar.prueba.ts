import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ReporteDeContrasenasPorPagar } from '../../servicios/tipos-de-reportes-de-proveedor';
import {
  cantidadDeFiltrosDeContrasenas,
  consultaDeContrasenas,
  errorDeFechaPrometida,
  filtrosDeContrasenasIniciales,
  lineasDeImpresionDeContrasenas,
  textoDeAtraso,
  totalesDeContrasenas,
} from './contrasenas-por-pagar';

beforeEach(() => setActivePinia(createPinia()));
const HOY = '2026-11-15';

describe('contraseñas con pago prometido vencido', () => {
  it('abre con el pago prometido hasta ayer y sin proveedor', () => {
    const filtros = filtrosDeContrasenasIniciales(HOY);
    expect(filtros).toEqual({ pagoPrometidoHasta: '2026-11-14', proveedorId: '' });
    expect(cantidadDeFiltrosDeContrasenas(filtros, HOY)).toBe(0);
    expect(consultaDeContrasenas(filtros)).toEqual({ pagoPrometidoHasta: '2026-11-14', proveedorId: undefined });
  });

  it('cuenta los filtros que cambiaron', () => {
    const filtros = { pagoPrometidoHasta: '2026-12-01', proveedorId: 'p-1' };
    expect(cantidadDeFiltrosDeContrasenas(filtros, HOY)).toBe(2);
    expect(consultaDeContrasenas(filtros)).toEqual(filtros);
  });

  it('pide la fecha completa antes de consultar', () => {
    expect(errorDeFechaPrometida('2026-11-')).toMatch(/completa/);
    expect(errorDeFechaPrometida('2026-11-14')).toBeUndefined();
  });

  it('dice los días de atraso en singular y plural', () => {
    expect(textoDeAtraso(1)).toBe('Vencida hace 1 día');
    expect(textoDeAtraso(5)).toBe('Vencida hace 5 días');
    expect(textoDeAtraso(0)).toBe('Aún no vence el pago prometido');
  });

  it('las cifras de arriba separan lo autorizado de lo que falta autorizar', () => {
    const reporte = {
      totales: { cantidad: 1, saldo: '500.00', autorizado: '300.00', sinAutorizar: '200.00' },
    } as ReporteDeContrasenasPorPagar;
    const totales = totalesDeContrasenas(reporte);
    expect(totales[0]).toMatchObject({ valor: formatearMonto('500.00'), destacado: true });
    expect(totales[1]).toMatchObject({ etiqueta: 'Contraseña', valor: '1' });
    expect(totales.map((t) => t.etiqueta)).toContain('Sin autorizar');
  });

  it('rotula el encabezado impreso', () => {
    expect(lineasDeImpresionDeContrasenas(filtrosDeContrasenasIniciales(HOY), 'Agro SA')).toEqual([
      expect.stringContaining('pago prometido hasta el'),
      'Proveedor: Agro SA',
    ]);
  });
});
