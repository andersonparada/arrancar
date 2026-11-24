import { describe, expect, it } from 'vitest';
import { armarArbolDeParcelas } from './arbol-de-parcelas.js';
import type { ParcelaDto } from './dto/parcela.dto.js';

const parcela = (id: string, parcelaMadreId: string | null): ParcelaDto => ({
  id,
  localidadId: 'l1',
  localidadNombre: 'Finca',
  parcelaMadreId,
  parcelaMadreCodigo: null,
  nivel: parcelaMadreId ? 2 : 1,
  tipoId: 't1',
  tipoNombre: 'Potrero',
  codigo: id.toUpperCase(),
  nombre: id,
  formaDeTenencia: 'propia',
  superficieTotalM2: null,
  superficieUtilM2: null,
  latitud: null,
  longitud: null,
  colindanciaNorte: null,
  colindanciaSur: null,
  colindanciaOriente: null,
  colindanciaPoniente: null,
  activo: true,
  observaciones: null,
  avisos: [],
});

describe('árbol de parcelas', () => {
  it('cada parcela cuelga de su madre y las de nivel 1 son las raíces', () => {
    const arbol = armarArbolDeParcelas([
      parcela('a', null),
      parcela('a1', 'a'),
      parcela('a2', 'a'),
      parcela('b', null),
    ]);

    expect(arbol.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(arbol[0]!.hijas.map(({ id }) => id)).toEqual(['a1', 'a2']);
  });

  it('si un filtro deja fuera a la madre, la hija pasa a ser raíz', () => {
    const arbol = armarArbolDeParcelas([parcela('a1', 'a')]);

    expect(arbol.map(({ id }) => id)).toEqual(['a1']);
  });
});
