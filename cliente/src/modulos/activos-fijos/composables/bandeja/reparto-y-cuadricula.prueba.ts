import { describe, expect, it } from 'vitest';
import {
  ajustarCuadricula,
  detalleParaEnviar,
  posicionesRepetidas,
  renglonVacio,
  unidadesSinSerie,
} from './cuadricula-de-unidades';
import { centavosDeTexto, costoPorUnidad, repartirEnUnidades, textoDeCentavos } from './montos-de-bandeja';

describe('montos en centavos', () => {
  it('lee montos con hasta dos decimales y rechaza el resto', () => {
    expect(centavosDeTexto('750000.01')).toBe(75000001);
    expect(centavosDeTexto('12.5')).toBe(1250);
    expect(centavosDeTexto(' 8 ')).toBe(800);
    expect(centavosDeTexto('-3.40')).toBe(-340);
    expect(centavosDeTexto('1.234')).toBeNull();
    expect(centavosDeTexto('')).toBeNull();
    expect(centavosDeTexto('abc')).toBeNull();
    expect(centavosDeTexto(null)).toBeNull();
  });

  it('escribe los centavos como texto con dos decimales', () => {
    expect(textoDeCentavos(75000001)).toBe('750000.01');
    expect(textoDeCentavos(5)).toBe('0.05');
    expect(textoDeCentavos(-1250)).toBe('-12.50');
    expect(textoDeCentavos(0)).toBe('0.00');
  });
});

describe('reparto en unidades', () => {
  it('deja el sobrante del redondeo en la última unidad (Q750,000.01 en 3)', () => {
    expect(repartirEnUnidades(75000001, 3)).toEqual([25000000, 25000000, 25000001]);
  });

  it('reparte exacto cuando no hay sobrante, y suma siempre el monto completo', () => {
    expect(repartirEnUnidades(90000, 3)).toEqual([30000, 30000, 30000]);
    expect(repartirEnUnidades(100, 7).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('con una unidad o con unidades inválidas', () => {
    expect(repartirEnUnidades(500, 1)).toEqual([500]);
    expect(repartirEnUnidades(500, 0)).toEqual([]);
    expect(repartirEnUnidades(500, 2.5)).toEqual([]);
  });

  it('el costo por unidad avisa si la última lleva el sobrante', () => {
    expect(costoPorUnidad(75000001, 3)).toEqual({ cadaUna: 25000000, ultima: 25000001, conSobrante: true });
    expect(costoPorUnidad(90000, 3)?.conSobrante).toBe(false);
    expect(costoPorUnidad(90000, 0)).toBeNull();
  });
});

describe('cuadrícula de unidades', () => {
  it('crece con renglones vacíos y encoge quitando los últimos, conservando lo escrito', () => {
    const una = [{ ...renglonVacio(), codigo: 'AF-1' }];
    const tres = ajustarCuadricula(una, 3);
    expect(tres).toHaveLength(3);
    expect(tres[0]?.codigo).toBe('AF-1');
    expect(ajustarCuadricula(tres, 1)).toEqual(una);
    expect(ajustarCuadricula(tres, 0)).toEqual([]);
  });

  it('marca los códigos repetidos sin distinguir mayúsculas ni espacios, e ignora los vacíos', () => {
    const renglones = ['af-1', 'AF-2', ' AF-1 ', '', ''].map((codigo) => ({ ...renglonVacio(), codigo }));
    expect([...posicionesRepetidas(renglones)]).toEqual([0, 2]);
  });

  it('no manda nada si no se escribió nada: el servidor propone los códigos', () => {
    expect(detalleParaEnviar(ajustarCuadricula([], 3))).toEqual([]);
  });

  it('con algo escrito manda un renglón por unidad y lo vacío como null', () => {
    const renglones = ajustarCuadricula([{ ...renglonVacio(), numeroDeSerie: ' SN-1 ' }], 2);
    expect(detalleParaEnviar(renglones)).toEqual([
      { codigo: null, numeroDeSerie: 'SN-1', placa: null, marca: null, modelo: null },
      { codigo: null, numeroDeSerie: null, placa: null, marca: null, modelo: null },
    ]);
  });

  it('cuenta las unidades sin serie', () => {
    const renglones = ajustarCuadricula([{ ...renglonVacio(), numeroDeSerie: 'SN-1' }], 3);
    expect(unidadesSinSerie(renglones)).toBe(2);
  });
});
