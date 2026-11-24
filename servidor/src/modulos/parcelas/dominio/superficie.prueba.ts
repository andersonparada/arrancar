import { describe, expect, it } from 'vitest';
import {
  aCentesimasDeM2,
  centesimasATexto,
  deCentesimasDeM2,
  textoACentesimas,
  type FactoresDeSuperficie,
} from './superficie.js';

const FACTORES: FactoresDeSuperficie = {
  metrosPorVara: 0.835905,
  varasCuadradasPorManzana: 10000,
  varasCuadradasPorCaballeria: 645816,
};

const sinCuerda = (unidad: Parameters<typeof aCentesimasDeM2>[1]['unidad']) => ({ unidad, varasPorLadoDeCuerda: null });
const cuerdaDe = (varas: number) => ({ unidad: 'cuerda' as const, varasPorLadoDeCuerda: varas });

describe('conversión de superficies a centésimas de m²', () => {
  it('una manzana son 6,987.37 m²', () => {
    expect(centesimasATexto(aCentesimasDeM2('1', sinCuerda('manzana'), FACTORES))).toBe('6987.37');
  });

  it('16 cuerdas de 25 varas son una manzana', () => {
    expect(aCentesimasDeM2('16', cuerdaDe(25), FACTORES)).toBe(aCentesimasDeM2('1', sinCuerda('manzana'), FACTORES));
  });

  it('una hectárea son 1.4311 manzanas (1.43115… al redondear el cuarto decimal sube a 1.4312)', () => {
    const hectarea = aCentesimasDeM2('1', sinCuerda('hectarea'), FACTORES);

    expect(deCentesimasDeM2(hectarea, sinCuerda('manzana'), FACTORES)).toBe('1.4312');
  });

  it('una cuerda de 40 varas son 1,117.98 m²', () => {
    expect(centesimasATexto(aCentesimasDeM2('1', cuerdaDe(40), FACTORES))).toBe('1117.98');
  });

  it('una caballería son 645,816 varas cuadradas, 451,255.64 m² y unas 45.1256 hectáreas (V-1)', () => {
    const caballeria = aCentesimasDeM2('1', sinCuerda('caballeria'), FACTORES);

    expect(centesimasATexto(caballeria)).toBe('451255.64');
    expect(aCentesimasDeM2('645816', sinCuerda('vara_cuadrada'), FACTORES)).toBe(caballeria);
    expect(deCentesimasDeM2(caballeria, sinCuerda('hectarea'), FACTORES)).toBe('45.1256');
  });

  it('con 64.58 manzanas la caballería saldría más corta: la prueba fija la diferencia de V-1', () => {
    const exacta = aCentesimasDeM2('1', sinCuerda('caballeria'), FACTORES);
    const redondeada = aCentesimasDeM2('64.58', sinCuerda('manzana'), FACTORES);

    expect(centesimasATexto(redondeada)).toBe('451244.46');
    expect(exacta - redondeada).toBeGreaterThan(1000);
  });

  it('el metro cuadrado y la hectárea no dependen de la vara', () => {
    expect(aCentesimasDeM2('1250.5', sinCuerda('m2'), FACTORES)).toBe(125050);
    expect(aCentesimasDeM2('2', sinCuerda('hectarea'), FACTORES)).toBe(2_000_000);
  });

  it('redondea al centésimo, la mitad hacia arriba', () => {
    expect(aCentesimasDeM2('0.0050', sinCuerda('m2'), FACTORES)).toBe(1);
    expect(() => aCentesimasDeM2('0.0049', sinCuerda('m2'), FACTORES)).toThrowError(/demasiado pequeña/);
  });

  it('cambiar el factor de la vara cambia la conversión', () => {
    const otra = aCentesimasDeM2('1', sinCuerda('vara_cuadrada'), { ...FACTORES, metrosPorVara: 1 });

    expect(otra).toBe(100);
  });

  it('rechaza cifras que no son números positivos, con más de cuatro decimales o en cero', () => {
    for (const cifra of ['', 'abc', '-1', '1,5', '1.23456', '0']) {
      expect(() => aCentesimasDeM2(cifra, sinCuerda('m2'), FACTORES)).toThrowError();
    }
  });

  it('la cuerda exige las varas por lado', () => {
    expect(() => aCentesimasDeM2('1', sinCuerda('cuerda'), FACTORES)).toThrowError(/varas por lado/);
  });
});

describe('ida y vuelta entre centésimas y texto', () => {
  it('convierte sin coma flotante', () => {
    expect(textoACentesimas('451255.64')).toBe(45125564);
    expect(textoACentesimas('10')).toBe(1000);
    expect(centesimasATexto(5)).toBe('0.05');
    expect(centesimasATexto(textoACentesimas('1250.50'))).toBe('1250.50');
  });

  it('muestra las cuerdas con dos decimales', () => {
    const cuerdas = aCentesimasDeM2('3.5', cuerdaDe(25), FACTORES);

    expect(deCentesimasDeM2(cuerdas, cuerdaDe(25), FACTORES)).toBe('3.50');
  });
});
