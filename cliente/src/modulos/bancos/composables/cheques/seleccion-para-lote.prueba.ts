import { describe, expect, it } from 'vitest';
import {
  alternarMarca,
  depurarSeleccion,
  idsEnOrden,
  marcarTodosDeLaChequera,
  MAXIMO_DE_UN_LOTE,
  motivoDeBloqueo,
  resumenDeLaSeleccion,
} from './seleccion-para-lote';

const cheque = (numero: number, chequeraId = 'A', puedeImprimir = true) => ({
  id: `c${chequeraId}${numero}`,
  chequeraId,
  numero,
  puedeImprimir,
});

const lista = [cheque(5), cheque(6), cheque(7), cheque(8), cheque(9, 'A', false), cheque(1, 'B')];

describe('alternarMarca', () => {
  it('marca y desmarca', () => {
    const marcada = alternarMarca(lista, [], lista[0]!);
    expect(marcada).toEqual(['cA5']);
    expect(alternarMarca(lista, marcada, lista[0]!)).toEqual([]);
  });

  it('no deja marcar uno que el servidor no deja imprimir', () => {
    expect(alternarMarca(lista, [], lista[4]!)).toEqual([]);
    expect(motivoDeBloqueo(lista, [], lista[4]!)).toBe('No se puede imprimir.');
  });

  it('un lote es de una sola chequera', () => {
    const seleccion = alternarMarca(lista, [], lista[0]!);
    expect(alternarMarca(lista, seleccion, lista[5]!)).toEqual(['cA5']);
    expect(motivoDeBloqueo(lista, seleccion, lista[5]!)).toBe('Un lote es de una sola chequera.');
  });

  it('con el lote lleno no deja marcar más, pero sí desmarcar', () => {
    const muchos = Array.from({ length: MAXIMO_DE_UN_LOTE + 1 }, (_, i) => cheque(i + 1));
    const llena = muchos.slice(0, MAXIMO_DE_UN_LOTE).map((c) => c.id);
    expect(motivoDeBloqueo(muchos, llena, muchos[MAXIMO_DE_UN_LOTE]!)).toMatch(/hasta 50/);
    expect(motivoDeBloqueo(muchos, llena, muchos[0]!)).toBeNull();
  });
});

describe('marcarTodosDeLaChequera', () => {
  it('marca los que se pueden imprimir de la chequera ya elegida, en orden', () => {
    expect(marcarTodosDeLaChequera(lista, ['cA7'])).toEqual(['cA5', 'cA6', 'cA7', 'cA8']);
  });

  it('con una chequera dada marca los de esa, aunque no haya selección', () => {
    expect(marcarTodosDeLaChequera(lista, [], 'B')).toEqual(['cB1']);
  });

  it('sin selección ni chequera no marca nada', () => {
    expect(marcarTodosDeLaChequera(lista, [])).toEqual([]);
  });

  it('respeta el tope del lote', () => {
    const muchos = Array.from({ length: 60 }, (_, i) => cheque(i + 1));
    expect(marcarTodosDeLaChequera(muchos, [], 'A')).toHaveLength(MAXIMO_DE_UN_LOTE);
  });
});

describe('idsEnOrden y depurarSeleccion', () => {
  it('devuelve los ids por número, no por orden de marcado', () => {
    expect(idsEnOrden(lista, ['cA8', 'cA5', 'cA6'])).toEqual(['cA5', 'cA6', 'cA8']);
  });

  it('al recargar, quita lo que ya no se puede imprimir o ya no está', () => {
    const recargada = [cheque(5, 'A', false), cheque(6)];
    expect(depurarSeleccion(recargada, ['cA5', 'cA6', 'cA99'])).toEqual(['cA6']);
  });
});

describe('resumenDeLaSeleccion', () => {
  it('sin nada elegido', () => {
    expect(resumenDeLaSeleccion(lista, [])).toBe('Ninguno elegido');
  });

  it('un cheque', () => {
    expect(resumenDeLaSeleccion(lista, ['cA5'])).toBe('1 cheque: el 5');
  });

  it('varios seguidos', () => {
    expect(resumenDeLaSeleccion(lista, ['cA6', 'cA5', 'cA7'])).toBe('3 cheques: del 5 al 7');
  });

  it('con huecos avisa que el papel va en orden', () => {
    expect(resumenDeLaSeleccion(lista, ['cA5', 'cA8'])).toBe(
      '2 cheques: del 5 al 8 (con 2 huecos: el papel va en orden)',
    );
    expect(resumenDeLaSeleccion(lista, ['cA5', 'cA7'])).toBe(
      '2 cheques: del 5 al 7 (con un hueco: el papel va en orden)',
    );
  });
});
