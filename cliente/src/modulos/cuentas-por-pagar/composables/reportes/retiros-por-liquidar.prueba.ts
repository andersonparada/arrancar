import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  FilaDeRetiroPorLiquidar,
  ReporteDeRetirosPorLiquidar,
} from '../../servicios/tipos-de-reportes-de-efectivo';
import {
  cantidadDeFiltrosDeRetiros,
  consultaDeRetiros,
  errorDeCorteDeRetiros,
  filtrosDeRetirosIniciales,
  lineasDeImpresionDeRetiros,
  textoDeDiasAbierto,
  textoDeFormaDeRetiro,
  totalesDeRetiros,
} from './retiros-por-liquidar';

beforeEach(() => setActivePinia(createPinia()));
const HOY = '2026-11-18';

const fila = (deMesAnterior: boolean): FilaDeRetiroPorLiquidar => ({
  id: 'r',
  numero: '3',
  forma: 'cheque',
  documento: 120,
  cuentaBancariaId: 'c',
  fecha: '2026-10-20',
  custodio: 'Juan',
  monto: '1000.00',
  pagado: '400.00',
  disponible: '600.00',
  diasAbierto: 29,
  deMesAnterior,
});

describe('retiros por liquidar', () => {
  it('abre al corte de hoy, respeta el del enlace y cuenta los filtros', () => {
    expect(filtrosDeRetirosIniciales(HOY)).toEqual({ corte: HOY, custodio: '' });
    expect(filtrosDeRetirosIniciales(HOY, '2026-10-31').corte).toBe('2026-10-31');
    expect(cantidadDeFiltrosDeRetiros({ corte: HOY, custodio: '  ' }, HOY)).toBe(0);
    expect(cantidadDeFiltrosDeRetiros({ corte: '2026-10-31', custodio: 'Ju' }, HOY)).toBe(2);
  });

  it('manda el custodio sin espacios o nada', () => {
    expect(consultaDeRetiros({ corte: HOY, custodio: ' Ana ' }).custodio).toBe('Ana');
    expect(consultaDeRetiros({ corte: HOY, custodio: ' ' }).custodio).toBeUndefined();
  });

  it('pide la fecha completa', () => {
    expect(errorDeCorteDeRetiros('2026-11-1')).toMatch(/completa/);
    expect(errorDeCorteDeRetiros(HOY)).toBeUndefined();
  });

  it('dice los días abierto y la forma del retiro', () => {
    expect(textoDeDiasAbierto(0)).toBe('Hoy');
    expect(textoDeDiasAbierto(1)).toBe('1 día');
    expect(textoDeDiasAbierto(45)).toBe('45 días');
    expect(textoDeFormaDeRetiro('cheque')).toBe('Cheque');
    expect(textoDeFormaDeRetiro('nota_de_debito')).toBe('Nota de débito');
  });

  it('resume el efectivo en manos de custodios primero', () => {
    const reporte: ReporteDeRetirosPorLiquidar = {
      corte: HOY,
      filas: [fila(true), fila(false)],
      total: { cantidad: 2, monto: '2000.00', pagado: '800.00', disponible: '1200.00' },
      leyendas: [],
    };
    const totales = totalesDeRetiros(reporte);
    expect(totales[0]).toMatchObject({ valor: formatearMonto('1200.00'), destacado: true });
    expect(totales.at(-1)?.valor).toBe('1');
    expect(lineasDeImpresionDeRetiros({ corte: HOY, custodio: '' })[1]).toBe('Custodio: todos');
  });
});
