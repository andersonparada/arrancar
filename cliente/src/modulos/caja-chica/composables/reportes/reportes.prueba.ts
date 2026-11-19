import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  ReporteDeArqueos,
  ReporteDeEstadoDeFondos,
  ReporteDePendientes,
  ReporteDeReposiciones,
} from '../../servicios/tipos-de-reportes';
import { esFechaCompleta, primerDiaDelMes, sumarDias } from './fechas-de-reportes';
import {
  cantidadDeFiltrosAlCorte,
  cantidadDeFiltrosDePeriodo,
  consultaAlCorte,
  consultaDePeriodo,
  erroresDelCorte,
  erroresDelPeriodo,
  filtrosAlCorteIniciales,
  filtrosDePeriodoIniciales,
  lineasDeImpresionAlCorte,
  lineasDeImpresionDePeriodo,
} from './filtros-de-reportes';
import {
  totalesDeArqueos,
  totalesDeEstadoDeFondos,
  totalesDePendientes,
  totalesDeReposiciones,
} from './resumen-de-reportes';

beforeEach(() => setActivePinia(createPinia()));
const HOY = '2026-11-19';

describe('fechas', () => {
  it('pide la fecha completa y real', () => {
    expect(esFechaCompleta(HOY)).toBe(true);
    expect(esFechaCompleta('2026-02-30')).toBe(false);
    expect(esFechaCompleta('2026-1')).toBe(false);
    expect(primerDiaDelMes(HOY)).toBe('2026-11-01');
    expect(sumarDias(HOY, -19)).toBe('2026-10-31');
  });
});

describe('filtros al corte (CC-R1 y CC-R4)', () => {
  it('abren al corte de hoy y sin fondo, y cuentan lo que cambió', () => {
    expect(filtrosAlCorteIniciales(HOY)).toEqual({ corte: HOY, fondoId: '' });
    expect(cantidadDeFiltrosAlCorte({ corte: HOY, fondoId: '' }, HOY)).toBe(0);
    expect(cantidadDeFiltrosAlCorte({ corte: '2026-10-31', fondoId: 'f1' }, HOY)).toBe(2);
  });

  it('mandan el fondo solo si se eligió y piden el corte completo', () => {
    expect(consultaAlCorte({ corte: HOY, fondoId: '' })).toEqual({ corte: HOY, fondoId: undefined });
    expect(consultaAlCorte({ corte: HOY, fondoId: 'f1' }).fondoId).toBe('f1');
    expect(erroresDelCorte({ corte: '2026-1', fondoId: '' }).corte).toBeTruthy();
    expect(erroresDelCorte({ corte: HOY, fondoId: '' })).toEqual({});
  });

  it('el encabezado impreso dice el corte y el fondo', () => {
    expect(lineasDeImpresionAlCorte({ corte: HOY, fondoId: '' })[1]).toBe('Fondo: todos los que puede ver');
    expect(lineasDeImpresionAlCorte({ corte: HOY, fondoId: 'f1' }, 'Caja central')[1]).toBe('Fondo: Caja central');
  });
});

describe('filtros del período (CC-R2, CC-R3 y CC-R5)', () => {
  it('abren con el mes de hoy hasta hoy y cuentan lo que cambió', () => {
    const inicial = filtrosDePeriodoIniciales(HOY);
    expect(inicial).toEqual({ desde: '2026-11-01', hasta: HOY, fondoId: '' });
    expect(cantidadDeFiltrosDePeriodo(inicial, HOY)).toBe(0);
    expect(cantidadDeFiltrosDePeriodo({ ...inicial, desde: '2026-10-01', fondoId: 'f1' }, HOY)).toBe(2);
  });

  it('piden fechas completas y un período en orden', () => {
    const inicial = filtrosDePeriodoIniciales(HOY);
    expect(erroresDelPeriodo(inicial)).toEqual({});
    expect(erroresDelPeriodo({ ...inicial, desde: '2026-1' }).desde).toBeTruthy();
    expect(erroresDelPeriodo({ ...inicial, hasta: '' }).hasta).toBeTruthy();
    expect(erroresDelPeriodo({ ...inicial, desde: '2026-11-20' }).desde).toContain('posterior');
  });

  it('la consulta lleva las fechas y el fondo solo si se eligió', () => {
    expect(consultaDePeriodo({ desde: '2026-11-01', hasta: HOY, fondoId: '' })).toEqual({
      desde: '2026-11-01',
      hasta: HOY,
      fondoId: undefined,
    });
    expect(lineasDeImpresionDePeriodo(filtrosDePeriodoIniciales(HOY))[0]).toContain('Del ');
  });
});

const totalDeComprobantes = { cantidad: 3, deducible: '75.00', noDeducible: '50.00', total: '125.00' };

describe('cifras de arriba', () => {
  it('CC-R1 destaca lo pendiente y separa lo deducible', () => {
    const cifras = totalesDePendientes({ total: totalDeComprobantes } as ReporteDePendientes);
    expect(cifras[0]).toEqual({ etiqueta: 'Pendiente de reponer', valor: formatearMonto('125.00'), destacado: true });
    expect(cifras.map((c) => c.etiqueta)).toEqual([
      'Pendiente de reponer',
      'Deducible',
      'No deducible',
      'Comprobantes',
    ]);
  });

  it('CC-R2 habla de reposiciones en singular y plural', () => {
    const una = totalesDeReposiciones({ total: { ...totalDeComprobantes, cantidad: 1 } } as ReporteDeReposiciones);
    const varias = totalesDeReposiciones({ total: totalDeComprobantes } as ReporteDeReposiciones);
    expect(una[3]!.etiqueta).toBe('Reposición');
    expect(varias[3]!.etiqueta).toBe('Reposiciones');
  });

  it('CC-R4 suma lo de los fondos y cuenta cuántos son', () => {
    const cifras = totalesDeEstadoDeFondos({
      fondos: [{}, {}],
      total: { monto: '6000.00', efectivoEsperado: '4500.00', pendienteDeReponer: '1200.00', valesAbiertos: '300.00' },
    } as ReporteDeEstadoDeFondos);
    expect(cifras[0]!.valor).toBe(formatearMonto('6000.00'));
    expect(cifras.at(-1)).toEqual({ etiqueta: 'Fondos', valor: '2' });
  });

  it('CC-R5 destaca los faltantes', () => {
    const cifras = totalesDeArqueos({
      total: { cantidad: 1, faltantes: '20.00', sobrantes: '0.00' },
    } as ReporteDeArqueos);
    expect(cifras[0]).toMatchObject({ etiqueta: 'Faltantes', destacado: true });
    expect(cifras[2]).toEqual({ etiqueta: 'Arqueo', valor: '1' });
  });
});
