import { describe, expect, it } from 'vitest';
import { referenciaDeLaRuta } from './referencia-de-destino';

const ID = '3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b';

describe('referenciaDeLaRuta', () => {
  it('sin referencia no hay nada', () => {
    expect(referenciaDeLaRuta({})).toEqual({ referencia: null, etiqueta: null, volver: null });
    expect(referenciaDeLaRuta({ etiqueta: 'Finca', volver: '/x' }).referencia).toBeNull();
  });

  it('una referencia que no es uuid se ignora', () => {
    expect(referenciaDeLaRuta({ referencia: 'abc', etiqueta: 'Finca' }).referencia).toBeNull();
  });

  it('toma la referencia, la etiqueta y la ruta de vuelta', () => {
    const query = { referencia: ID, etiqueta: ' Finca El Roble ', volver: '/caja-chica/fondos/1' };
    expect(referenciaDeLaRuta(query)).toEqual({
      referencia: ID,
      etiqueta: 'Finca El Roble',
      volver: '/caja-chica/fondos/1',
    });
  });

  it('no acepta una vuelta a otro sitio', () => {
    expect(referenciaDeLaRuta({ referencia: ID, volver: '//mal.com' }).volver).toBeNull();
    expect(referenciaDeLaRuta({ referencia: ID, volver: 'https://mal.com' }).volver).toBeNull();
    expect(referenciaDeLaRuta({ referencia: ID, volver: '/\\mal.com' }).volver).toBeNull();
  });
});
