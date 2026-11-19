import { describe, expect, it } from 'vitest';
import type { Chequera } from '../../servicios/chequeras.api';
import { detallesDeChequera } from './detalles-de-chequera';
import { gruposDeChequeras } from './grupos-de-chequeras';

const chequera = (id: string, deApertura: boolean): Chequera => ({
  id,
  cuentaBancariaId: 'cb',
  cuentaBancariaNombre: 'Monetaria',
  serie: null,
  desde: 1,
  hasta: 50,
  activa: !deApertura,
  deApertura,
  disponibles: 0,
  emitidos: 0,
  anulados: 0,
  formatoDeChequeId: null,
  formatoNombre: null,
  plantillaDeCheque: null,
});

describe('gruposDeChequeras', () => {
  it('lista aparte la chequera de la carga inicial y conserva el orden', () => {
    const lista = [chequera('a', false), chequera('b', true), chequera('c', false)];
    const { normales, deApertura } = gruposDeChequeras(lista);
    expect(normales.map((c) => c.id)).toEqual(['a', 'c']);
    expect(deApertura.map((c) => c.id)).toEqual(['b']);
  });

  it('sin chequeras, ambos grupos quedan vacíos', () => {
    expect(gruposDeChequeras([])).toEqual({ normales: [], deApertura: [] });
  });
});

describe('detallesDeChequera', () => {
  it('la chequera de la carga inicial no muestra disponibles: no se emite', () => {
    const etiquetas = (registro: Chequera) => detallesDeChequera(registro).map((d) => d.etiqueta);
    expect(etiquetas(chequera('a', false))).toContain('Disponibles');
    expect(etiquetas(chequera('b', true))).not.toContain('Disponibles');
  });

  it('la chequera de la carga inicial no muestra con qué se imprime: no se imprime', () => {
    const etiquetas = (registro: Chequera) => detallesDeChequera(registro).map((d) => d.etiqueta);
    expect(etiquetas(chequera('a', false))).toContain('Se imprime con');
    expect(etiquetas(chequera('b', true))).not.toContain('Se imprime con');
  });
});
