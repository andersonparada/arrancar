import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import {
  MedicionYaAnulada,
  SuperficieInvalida,
  SuperficieUtilMayorQueTotal,
  UnidadSinVarasDeCuerda,
} from './errores-de-parcela.js';
import { Medicion, type DatosDeMedicion } from './medicion.js';
import type { FactoresDeSuperficie } from './superficie.js';

const factores: FactoresDeSuperficie = {
  metrosPorVara: 0.835905,
  varasCuadradasPorManzana: 10000,
  varasCuadradasPorCaballeria: 645816,
};

const datos = (cambios: Partial<DatosDeMedicion> = {}): DatosDeMedicion => ({
  vigenteDesde: '2026-01-01',
  fuente: 'escritura',
  cantidadOriginal: '1',
  unidadOriginal: 'manzana',
  varasPorLadoDeCuerda: null,
  cantidadUtil: null,
  documento: null,
  ...cambios,
});

const registrar = (cambios: Partial<DatosDeMedicion> = {}) =>
  Medicion.registrar({ empresaId: Identificador.nuevo(), parcelaId: randomUUID(), factores }, datos(cambios));

describe('medición', () => {
  it('guarda la cifra original y la convierte a m²; sin útil, la útil es igual a la total', () => {
    const medicion = registrar().instantanea();

    expect(medicion).toMatchObject({
      superficieTotalM2: '6987.37',
      superficieUtilM2: '6987.37',
      cantidadOriginal: '1',
      unidadOriginal: 'manzana',
      estado: 'vigente',
    });
  });

  it('en cuerdas guarda las varas por lado que se usaron', () => {
    const medicion = registrar({ cantidadOriginal: '1', unidadOriginal: 'cuerda', varasPorLadoDeCuerda: 40 });

    expect(medicion.instantanea()).toMatchObject({ superficieTotalM2: '1117.98', varasPorLadoDeCuerda: 40 });
  });

  it('las varas por lado van con la cuerda y solo con ella', () => {
    expect(() => registrar({ unidadOriginal: 'cuerda' })).toThrow(UnidadSinVarasDeCuerda);
    expect(() => registrar({ unidadOriginal: 'manzana', varasPorLadoDeCuerda: 25 })).toThrow(UnidadSinVarasDeCuerda);
  });

  it('las varas por lado van de 1 a 100 y la superficie cabe en la base', () => {
    const cuerda = (varas: number) => () => registrar({ unidadOriginal: 'cuerda', varasPorLadoDeCuerda: varas });

    expect(cuerda(100)).not.toThrow();
    for (const varas of [101, 0, -25, 2.5]) expect(cuerda(varas)).toThrow(SuperficieInvalida);
    expect(() => registrar({ cantidadOriginal: '9999999999', unidadOriginal: 'caballeria' })).toThrow(
      SuperficieInvalida,
    );
  });

  it('la útil se escribe en la misma unidad y no pasa de la total', () => {
    const medicion = registrar({ cantidadOriginal: '10', unidadOriginal: 'hectarea', cantidadUtil: '8.5' });

    expect(medicion.instantanea()).toMatchObject({ superficieTotalM2: '100000.00', superficieUtilM2: '85000.00' });
    expect(() => registrar({ cantidadUtil: '1.5' })).toThrow(SuperficieUtilMayorQueTotal);
  });

  it('se anula una vez, con motivo, y queda como rastro', () => {
    const medicion = registrar();

    medicion.anular({ motivo: 'Medida equivocada', usuarioId: randomUUID(), cuando: new Date() });

    expect(medicion.instantanea()).toMatchObject({ estado: 'anulada', motivoDeAnulacion: 'Medida equivocada' });
    expect(() => medicion.anular({ motivo: 'Otra vez', usuarioId: randomUUID(), cuando: new Date() })).toThrow(
      MedicionYaAnulada,
    );
  });
});
