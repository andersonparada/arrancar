import { describe, expect, it } from 'vitest';
import { dejarAvisosDelRegistro, tomarAvisosDelRegistro } from './avisos-del-registro';

describe('avisos que pasan del registro a la ficha', () => {
  it('se entregan una sola vez y solo al documento recién registrado', () => {
    dejarAvisosDelRegistro('d1', ['Período declarado']);

    expect(tomarAvisosDelRegistro('otro')).toEqual([]);
    dejarAvisosDelRegistro('d1', ['Período declarado']);
    expect(tomarAvisosDelRegistro('d1')).toEqual(['Período declarado']);
    expect(tomarAvisosDelRegistro('d1')).toEqual([]);
  });

  it('sin avisos no deja nada pendiente', () => {
    dejarAvisosDelRegistro('d2', []);

    expect(tomarAvisosDelRegistro('d2')).toEqual([]);
  });
});
