import { describe, expect, it } from 'vitest';
import { mensajesDeAvisos } from './avisos-de-bancos';

describe('avisos de Bancos', () => {
  it('devuelve los mensajes de la respuesta', () => {
    const avisos = [{ codigo: 'fondos_insuficientes', mensaje: 'El saldo no alcanza para los posfechados.' }];
    expect(mensajesDeAvisos({ avisos })).toEqual(['El saldo no alcanza para los posfechados.']);
  });

  it('sin avisos, o con mensajes vacíos, no hay nada que mostrar', () => {
    expect(mensajesDeAvisos({})).toEqual([]);
    expect(mensajesDeAvisos(null)).toEqual([]);
    expect(mensajesDeAvisos({ avisos: [{ codigo: 'x', mensaje: ' ' }] })).toEqual([]);
  });
});
