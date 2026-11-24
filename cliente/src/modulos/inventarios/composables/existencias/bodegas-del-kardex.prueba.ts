import { describe, expect, it } from 'vitest';
import type { Existencia } from '../../servicios/existencias.api';
import {
  bodegaPorOmision,
  bodegasDeLasExistencias,
  opcionesDeBodegasDelKardex,
  puedePedirElKardex,
} from './bodegas-del-kardex';

const bodegas = [
  { id: 'b2', nombre: 'Zona sur', activo: true },
  { id: 'b1', nombre: 'Anexo', activo: false },
];

describe('bodegas del kardex', () => {
  it('quien ve todas puede pedir toda la empresa', () => {
    const opciones = opcionesDeBodegasDelKardex(bodegas, true);
    expect(opciones[0]).toEqual({ valor: null, texto: 'Toda la empresa' });
    expect(opciones.map((o) => o.texto)).toEqual(['Toda la empresa', 'Anexo (inactiva)', 'Zona sur']);
  });

  it('quien no las ve todas solo elige entre las suyas', () => {
    expect(opcionesDeBodegasDelKardex(bodegas, false).map((o) => o.valor)).toEqual(['b1', 'b2']);
  });

  it('abre con la empresa entera o con la primera bodega según el alcance', () => {
    expect(bodegaPorOmision(bodegas, true)).toBeNull();
    expect(bodegaPorOmision(bodegas, false)).toBe('b1');
    expect(bodegaPorOmision([], false)).toBeNull();
  });

  it('sin alcance total no se pide el kardex hasta elegir bodega', () => {
    expect(puedePedirElKardex(null, false)).toBe(false);
    expect(puedePedirElKardex('b1', false)).toBe(true);
    expect(puedePedirElKardex(null, true)).toBe(true);
  });
});

describe('bodegas desde las existencias', () => {
  it('sin poder listar bodegas, las del artículo salen de sus existencias sin repetirse', () => {
    const existencia = (bodegaId: string, bodegaNombre: string) => ({ bodegaId, bodegaNombre }) as Existencia;
    const lista = bodegasDeLasExistencias([
      existencia('b2', 'Zona sur'),
      existencia('b1', 'Anexo'),
      existencia('b2', 'Zona sur'),
    ]);
    expect(opcionesDeBodegasDelKardex(lista, false).map((o) => o.valor)).toEqual(['b1', 'b2']);
    expect(bodegaPorOmision(lista, false)).toBe('b1');
  });
});
