import { describe, expect, it } from 'vitest';
import { feriadosCalculados } from './feriados-calculados.js';
import { diaDeLaSemana, sumarDias } from './fecha-iso.js';
import { domingoDePascua } from './pascua.js';

describe('domingoDePascua', () => {
  it.each([
    [2019, '2019-04-21'],
    [2023, '2023-04-09'],
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2038, '2038-04-25'],
  ])('en %i cae el %s', (anio, esperado) => {
    expect(domingoDePascua(anio)).toBe(esperado);
  });
});

describe('feriadosCalculados', () => {
  it('trae los nueve fijos y los tres días de Semana Santa, ordenados', () => {
    const feriados = feriadosCalculados(2026);

    expect(feriados).toHaveLength(12);
    expect(feriados.map((f) => f.fecha)).toEqual([...feriados.map((f) => f.fecha)].sort());
  });

  it('Semana Santa 2026: jueves 2, viernes 3 y sábado 4 de abril', () => {
    const santos = feriadosCalculados(2026).filter((f) => f.origen === 'semana_santa');

    expect(santos.map((f) => [f.fecha, f.nombre])).toEqual([
      ['2026-04-02', 'Jueves Santo'],
      ['2026-04-03', 'Viernes Santo'],
      ['2026-04-04', 'Sábado Santo'],
    ]);
  });

  it('Semana Santa 2024 cae en marzo', () => {
    const fechas = feriadosCalculados(2024)
      .filter((f) => f.origen === 'semana_santa')
      .map((f) => f.fecha);

    expect(fechas).toEqual(['2024-03-28', '2024-03-29', '2024-03-30']);
  });

  it('incluye el 20 de octubre y marca como medios días el 24 y el 31 de diciembre', () => {
    const feriados = feriadosCalculados(2026);

    expect(feriados.find((f) => f.fecha === '2026-10-20')).toMatchObject({ origen: 'fijo', medioDia: false });
    expect(feriados.filter((f) => f.medioDia).map((f) => f.fecha)).toEqual(['2026-12-24', '2026-12-31']);
  });

  it('no incluye el 15 de agosto (solo rige en el municipio de Guatemala)', () => {
    expect(feriadosCalculados(2026).some((f) => f.fecha === '2026-08-15')).toBe(false);
  });
});

describe('fechas', () => {
  it('suma días cruzando el fin de año y años bisiestos', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2024-02-28', 2)).toBe('2024-03-01');
  });

  it('el 20 de octubre de 2026 es martes', () => {
    expect(diaDeLaSemana('2026-10-20')).toBe(2);
  });

  it('rechaza fechas que no existen', () => {
    expect(() => sumarDias('2026-02-30', 1)).toThrow(/fecha válida/);
    expect(() => diaDeLaSemana('2026-2-3')).toThrow(/fecha válida/);
  });
});
