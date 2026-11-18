import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { FilaDeNotaSinAplicar, ReporteDeNotasSinAplicar } from '../../servicios/tipos-de-reportes-de-efectivo';
import {
  cantidadDeFiltrosDeNotas,
  consultaDeNotas,
  errorDeCorteDeNotas,
  filtrosDeNotasIniciales,
  finDelMesAnterior,
  lineasDeImpresionDeNotas,
  opcionesDeCuentas,
  textoDeConciliada,
  textoDeDiasSinAplicar,
  totalesDeNotas,
  unirCuentas,
} from './notas-sin-aplicar';

beforeEach(() => setActivePinia(createPinia()));
const HOY = '2026-11-18';

const fila = (cuentaBancariaId: string, cuenta: string): FilaDeNotaSinAplicar => ({
  movimientoId: `m-${cuentaBancariaId}`,
  cuentaBancariaId,
  cuenta,
  fecha: '2026-10-10',
  numero: 7,
  referencia: null,
  monto: '500.00',
  aplicado: '100.00',
  disponible: '400.00',
  diasSinAplicar: 39,
  conciliada: false,
});

describe('notas de débito sin aplicar', () => {
  it('abre al fin del mes anterior', () => {
    expect(finDelMesAnterior(HOY)).toBe('2026-10-31');
    expect(finDelMesAnterior('2026-01-05')).toBe('2025-12-31');
    expect(finDelMesAnterior('2026-03-01')).toBe('2026-02-28');
    expect(filtrosDeNotasIniciales(HOY)).toEqual({ corte: '2026-10-31', cuentaBancariaId: '' });
    expect(filtrosDeNotasIniciales(HOY, '2026-09-30').corte).toBe('2026-09-30');
  });

  it('cuenta los filtros y arma la consulta', () => {
    expect(cantidadDeFiltrosDeNotas(filtrosDeNotasIniciales(HOY), HOY)).toBe(0);
    expect(cantidadDeFiltrosDeNotas({ corte: HOY, cuentaBancariaId: 'c' }, HOY)).toBe(2);
    expect(consultaDeNotas({ corte: HOY, cuentaBancariaId: '' }).cuentaBancariaId).toBeUndefined();
    expect(errorDeCorteDeNotas('2026-1')).toMatch(/completa/);
    expect(errorDeCorteDeNotas(HOY)).toBeUndefined();
  });

  it('junta las cuentas vistas por nombre sin perder la filtrada', () => {
    const primera = unirCuentas([], [fila('b', 'Monetaria'), fila('a', 'Ahorro'), fila('b', 'Monetaria')]);
    expect(primera.map((c) => c.nombre)).toEqual(['Ahorro', 'Monetaria']);
    const despues = unirCuentas(primera, [fila('c', 'Banrural')]);
    expect(despues.map((c) => c.nombre)).toEqual(['Ahorro', 'Banrural', 'Monetaria']);
    expect(opcionesDeCuentas(despues)[0]).toEqual({ valor: '', texto: 'Todas las cuentas' });
    expect(opcionesDeCuentas(despues)).toHaveLength(4);
  });

  it('dice los días y la conciliación', () => {
    expect(textoDeDiasSinAplicar(1)).toBe('1 día');
    expect(textoDeDiasSinAplicar(39)).toBe('39 días');
    expect(textoDeDiasSinAplicar(-2)).toBe('0 días');
    expect(textoDeConciliada(true)).toBe('Conciliada');
    expect(textoDeConciliada(false)).toBe('Sin conciliar');
  });

  it('resume lo que debería tener la transitoria', () => {
    const reporte: ReporteDeNotasSinAplicar = {
      corte: HOY,
      filas: [fila('a', 'Ahorro')],
      total: { cantidad: 1, monto: '500.00', aplicado: '100.00', disponible: '400.00' },
      leyendas: [],
    };
    expect(totalesDeNotas(reporte)[0]).toMatchObject({ valor: formatearMonto('400.00'), destacado: true });
    expect(lineasDeImpresionDeNotas({ corte: HOY, cuentaBancariaId: '' }, null)[1]).toBe('Cuenta: todas');
  });
});
