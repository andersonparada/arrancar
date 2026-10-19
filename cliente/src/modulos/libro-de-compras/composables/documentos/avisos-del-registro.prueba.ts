import { describe, expect, it } from 'vitest';
import { dejarAvisosDelRegistro, tomarAvisosDelRegistro } from './avisos-del-registro';

describe('avisos del registro', () => {
  it('la ficha del documento recién creado recibe sus avisos una sola vez', () => {
    dejarAvisosDelRegistro('d-1', ['Ese período puede estar declarado.']);
    expect(tomarAvisosDelRegistro('d-1')).toEqual(['Ese período puede estar declarado.']);
    expect(tomarAvisosDelRegistro('d-1')).toEqual([]);
  });

  it('otro documento no recibe los avisos de éste', () => {
    dejarAvisosDelRegistro('d-1', ['Aviso']);
    expect(tomarAvisosDelRegistro('d-2')).toEqual([]);
  });

  it('sin avisos no queda nada pendiente', () => {
    dejarAvisosDelRegistro('d-1', []);
    expect(tomarAvisosDelRegistro('d-1')).toEqual([]);
  });
});
