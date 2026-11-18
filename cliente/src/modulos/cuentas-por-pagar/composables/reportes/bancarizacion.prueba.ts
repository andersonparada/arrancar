import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ReporteDeBancarizacion } from '../../servicios/tipos-de-reportes-de-efectivo';
import {
  cantidadDeFiltrosDeBancarizacion,
  consultaDeBancarizacion,
  errorDelRangoDeBancarizacion,
  filtrosDeBancarizacionIniciales,
  lineasDeImpresionDeBancarizacion,
  mesesDelRango,
  notaDelCargo,
  opcionesDeMesesDeBancarizacion,
  reporteDeBancarizacionVacio,
  totalesDeBancarizacion,
} from './bancarizacion';

beforeEach(() => setActivePinia(createPinia()));
const HOY = '2026-11-18';

const CIFRAS = { cantidad: 0, efectivo: '0.00', ivaEnRiesgo: '0.00', costoNoDeducible: '0.00' };
const reporte = (): ReporteDeBancarizacion => ({
  desde: '2025-12',
  hasta: '2026-11',
  umbral: '30000.00',
  meses: [],
  documentosSobreElUmbral: [],
  totales: {
    meses: { ...CIFRAS, efectivo: '9000.00' },
    documentos: { ...CIFRAS, efectivo: '2000.00' },
    total: { ivaEnRiesgo: '1200.00', costoNoDeducible: '10000.00' },
  },
  leyendas: [],
});

describe('pagos en efectivo sobre el umbral', () => {
  it('abre con los últimos 12 meses y solo lo que tiene efecto fiscal', () => {
    expect(filtrosDeBancarizacionIniciales(HOY)).toEqual({
      desde: '2025-12',
      hasta: '2026-11',
      proveedorId: '',
      soloConEfecto: true,
    });
    expect(filtrosDeBancarizacionIniciales(HOY, 'p-1').proveedorId).toBe('p-1');
  });

  it('cuenta los filtros que se apartan de lo inicial', () => {
    const inicial = filtrosDeBancarizacionIniciales(HOY);
    expect(cantidadDeFiltrosDeBancarizacion(inicial, HOY)).toBe(0);
    expect(
      cantidadDeFiltrosDeBancarizacion({ ...inicial, desde: '2025-01', proveedorId: 'p', soloConEfecto: false }, HOY),
    ).toBe(3);
  });

  it('manda el proveedor solo si hay y el indicador de efecto', () => {
    const consulta = consultaDeBancarizacion(filtrosDeBancarizacionIniciales(HOY));
    expect(consulta).toMatchObject({ desde: '2025-12', hasta: '2026-11', soloConEfecto: true });
    expect(consulta.proveedorId).toBeUndefined();
  });

  it('cuenta los meses y rechaza el rango invertido o de más de 48 meses diciendo cómo corregir', () => {
    const base = filtrosDeBancarizacionIniciales(HOY);
    expect(mesesDelRango('2025-12', '2026-11')).toBe(12);
    expect(mesesDelRango('2026-11', '2026-11')).toBe(1);
    expect(errorDelRangoDeBancarizacion(base)).toBeUndefined();
    expect(errorDelRangoDeBancarizacion({ ...base, desde: '2022-12', hasta: '2026-11' })).toBeUndefined();
    expect(errorDelRangoDeBancarizacion({ ...base, desde: '2022-11', hasta: '2026-11' })).toMatch(/49 meses.*48/);
    expect(errorDelRangoDeBancarizacion({ ...base, desde: '2026-12', hasta: '2026-11' })).toMatch(/posterior/);
    expect(errorDelRangoDeBancarizacion({ ...base, desde: '' })).toMatch(/Escoja/);
  });

  it('ofrece 60 meses, del más reciente al más antiguo', () => {
    const opciones = opcionesDeMesesDeBancarizacion(HOY);
    expect(opciones).toHaveLength(60);
    expect(opciones[0]).toEqual({ valor: '2026-11', texto: 'noviembre de 2026' });
    expect(opciones[59]?.valor).toBe('2021-12');
  });

  it('resume primero lo que se pierde y el umbral con que se midió', () => {
    const totales = totalesDeBancarizacion(reporte());
    expect(totales[0]).toMatchObject({ valor: formatearMonto('1200.00'), destacado: true });
    expect(totales[1]?.valor).toBe(formatearMonto('10000.00'));
    expect(totales.at(-1)?.valor).toBe(formatearMonto('30000.00'));
  });

  it('sabe cuándo no hay nada que mostrar y avisa del IVA no conocido', () => {
    expect(reporteDeBancarizacionVacio(reporte())).toBe(true);
    expect(notaDelCargo({ ivaNoConocido: true })).toMatch(/IVA no conocido/);
    expect(notaDelCargo({ ivaNoConocido: false })).toBeNull();
  });

  it('describe los filtros para imprimir', () => {
    const lineas = lineasDeImpresionDeBancarizacion(filtrosDeBancarizacionIniciales(HOY), 'Agro');
    expect(lineas[0]).toContain('diciembre de 2025 a noviembre de 2026');
    expect(lineas[1]).toBe('Proveedor: Agro · Solo con efecto fiscal: sí');
  });
});
