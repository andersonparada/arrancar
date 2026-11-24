import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ReporteDeAnticiposPorLiquidar, ReporteDeNoLiquidado } from '../../servicios/tipos-de-reportes';
import {
  cantidadDeFiltrosDeAnticipos,
  consultaDeAnticipos,
  errorDeCorteDeAnticipos,
  filtrosDeAnticiposIniciales,
  lineasDeImpresionDeAnticipos,
  textoDeVencimiento,
} from './anticipos-por-liquidar';
import { esFechaCompleta, primerDiaDelMes } from './fechas-de-reportes';
import {
  cantidadDeFiltrosDeNoLiquidado,
  consultaDeNoLiquidado,
  errorDelPeriodo,
  filtrosDeNoLiquidadoIniciales,
  lineasDeImpresionDeNoLiquidado,
  textoDeCuotas,
} from './no-liquidado';
import { totalesDeAnticiposPorLiquidar, totalesDeNoLiquidado } from './resumen-de-reportes';

beforeEach(() => setActivePinia(createPinia()));
const HOY = '2026-11-19';

describe('fechas', () => {
  it('pide la fecha completa y real', () => {
    expect(esFechaCompleta('2026-11-19')).toBe(true);
    expect(esFechaCompleta('2026-02-30')).toBe(false);
    expect(esFechaCompleta('2026-1')).toBe(false);
    expect(primerDiaDelMes(HOY)).toBe('2026-11-01');
  });
});

describe('CL-R1: anticipos por liquidar', () => {
  it('abre al corte de hoy, respeta otro corte y cuenta los filtros', () => {
    expect(filtrosDeAnticiposIniciales(HOY)).toEqual({ corte: HOY, soloVencidos: false });
    expect(filtrosDeAnticiposIniciales(HOY, '2026-10-31').corte).toBe('2026-10-31');
    expect(cantidadDeFiltrosDeAnticipos({ corte: HOY, soloVencidos: false }, HOY)).toBe(0);
    expect(cantidadDeFiltrosDeAnticipos({ corte: '2026-10-31', soloVencidos: true }, HOY)).toBe(2);
  });

  it('manda los vencidos solo si se piden y pide el corte completo', () => {
    expect(consultaDeAnticipos({ corte: HOY, soloVencidos: false }).soloVencidos).toBeUndefined();
    expect(consultaDeAnticipos({ corte: HOY, soloVencidos: true }).soloVencidos).toBe('true');
    expect(errorDeCorteDeAnticipos('2026-1')).toBeTruthy();
    expect(errorDeCorteDeAnticipos(HOY)).toBeUndefined();
  });

  it('dice si venció y escribe las líneas de impresión', () => {
    expect(textoDeVencimiento(0)).toBe('Dentro del plazo');
    expect(textoDeVencimiento(1)).toBe('Venció hace 1 día');
    expect(textoDeVencimiento(45)).toBe('Venció hace 45 días');
    expect(lineasDeImpresionDeAnticipos({ corte: HOY, soloVencidos: true })[1]).toBe('Solo los vencidos');
  });

  it('arma las cifras de arriba', () => {
    const reporte = {
      total: {
        beneficiarios: 2,
        anticipos: 3,
        vencidos: 1,
        monto: '2500.00',
        porJustificar: '2000.00',
        aReembolsar: '0.00',
        porJustificarVencido: '700.00',
      },
    } as ReporteDeAnticiposPorLiquidar;
    const cifras = totalesDeAnticiposPorLiquidar(reporte);
    expect(cifras[0]).toEqual({ etiqueta: 'Por justificar', valor: formatearMonto('2000.00'), destacado: true });
    expect(cifras[1]!.valor).toBe(formatearMonto('700.00'));
    expect(cifras[2]).toMatchObject({ etiqueta: 'Anticipos', valor: '3' });
    expect(cifras.some(({ etiqueta }) => etiqueta.includes('reembolsar'))).toBe(false);
  });

  it('muestra lo gastado de más aparte, sin restarlo de lo por justificar', () => {
    const reporte = {
      total: { anticipos: 2, vencidos: 0, monto: '300.00', porJustificar: '200.00', aReembolsar: '300.00' },
    } as ReporteDeAnticiposPorLiquidar;
    const cifras = totalesDeAnticiposPorLiquidar(reporte);
    expect(cifras[0]!.valor).toBe(formatearMonto('200.00'));
    expect(cifras.at(-1)).toEqual({ etiqueta: 'A reembolsar a beneficiarios', valor: formatearMonto('300.00') });
  });
});

describe('CL-R2: lo no liquidado', () => {
  it('abre con el mes de hoy y cuenta los filtros', () => {
    const iniciales = filtrosDeNoLiquidadoIniciales(HOY);
    expect(iniciales).toEqual({ desde: '2026-11-01', hasta: HOY, destino: '' });
    expect(cantidadDeFiltrosDeNoLiquidado(iniciales, HOY)).toBe(0);
    expect(cantidadDeFiltrosDeNoLiquidado({ desde: '2026-01-01', hasta: HOY, destino: 'perdida' }, HOY)).toBe(2);
  });

  it('manda el destino solo si se escogió', () => {
    expect(consultaDeNoLiquidado({ desde: '2026-11-01', hasta: HOY, destino: '' }).destino).toBeUndefined();
    expect(consultaDeNoLiquidado({ desde: '2026-11-01', hasta: HOY, destino: 'cobrar' }).destino).toBe('cobrar');
  });

  it('revisa el período', () => {
    expect(errorDelPeriodo({ desde: '2026-11-01', hasta: HOY, destino: '' })).toEqual({});
    expect(errorDelPeriodo({ desde: '2026-11', hasta: HOY, destino: '' }).desde).toBeTruthy();
    expect(errorDelPeriodo({ desde: '2026-11-01', hasta: '', destino: '' }).hasta).toBeTruthy();
    expect(errorDelPeriodo({ desde: HOY, hasta: '2026-11-01', destino: '' }).desde).toContain('posterior');
  });

  it('dice las cuotas y arma las líneas y las cifras', () => {
    expect(textoDeCuotas(null)).toBe('');
    expect(textoDeCuotas(1)).toBe('1 cuota');
    expect(textoDeCuotas(6)).toBe('6 cuotas');
    expect(lineasDeImpresionDeNoLiquidado({ desde: '2026-11-01', hasta: HOY, destino: 'perdida' })[1]).toBe(
      'Destino: Pérdida',
    );
    const reporte = {
      total: { cantidad: 1, monto: '600.00' },
      grupos: [{ titulo: 'Por cobrar', monto: '600.00' }],
    } as ReporteDeNoLiquidado;
    expect(totalesDeNoLiquidado(reporte)).toEqual([
      { etiqueta: 'No liquidado en el período', valor: formatearMonto('600.00'), destacado: true },
      { etiqueta: 'Anticipo', valor: '1' },
      { etiqueta: 'Por cobrar', valor: formatearMonto('600.00') },
    ]);
  });
});
