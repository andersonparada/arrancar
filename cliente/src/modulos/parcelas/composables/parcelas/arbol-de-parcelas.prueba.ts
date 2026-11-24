import { describe, expect, it } from 'vitest';
import type { NodoDeParcela } from '../../servicios/parcelas.api';
import { agruparPorLocalidad, idsConHijas, superficieDelNodo } from './arbol-de-parcelas';

const nodo = (id: string, cambios: Partial<NodoDeParcela> = {}): NodoDeParcela => ({
  id,
  localidadId: 'loc-1',
  localidadNombre: 'Finca El Carmen',
  parcelaMadreId: null,
  parcelaMadreCodigo: null,
  nivel: 1,
  tipoId: 'tipo-1',
  tipoNombre: 'Potrero',
  codigo: id.toUpperCase(),
  nombre: `Parcela ${id}`,
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
  hijas: [],
  ...cambios,
});

const madre = nodo('a', {
  hijas: [
    nodo('a1', {
      nivel: 2,
      superficieTotalM2: '6987.37',
      hijas: [nodo('a1x', { nivel: 3, superficieTotalM2: '100.00' })],
    }),
    nodo('a2', { nivel: 2, superficieTotalM2: '3000.50' }),
  ],
});

describe('superficie de una parcela en el árbol', () => {
  it('usa la propia medición', () => {
    expect(superficieDelNodo(nodo('b', { superficieTotalM2: '451255.64' }))).toBe(45125564);
  });

  it('una madre sin medición muestra la suma de sus hijas', () => {
    expect(superficieDelNodo(madre)).toBe(698737 + 300050);
  });

  it('sin medición propia ni de sus hijas no hay superficie', () => {
    expect(superficieDelNodo(nodo('c', { hijas: [nodo('c1', { nivel: 2 })] }))).toBeNull();
  });
});

describe('árbol agrupado por localidad', () => {
  it('dibuja cada parcela debajo de su madre, con su profundidad', () => {
    const [grupo] = agruparPorLocalidad([madre], new Set());

    expect(grupo!.filas.map(({ nodo: { id }, profundidad }) => [id, profundidad])).toEqual([
      ['a', 0],
      ['a1', 1],
      ['a1x', 2],
      ['a2', 1],
    ]);
    expect(grupo!.filas[0]).toMatchObject({ tieneHijas: true, colapsada: false });
    expect(grupo!.cantidad).toBe(4);
  });

  it('una parcela colapsada esconde sus subparcelas pero sigue contándolas', () => {
    const [grupo] = agruparPorLocalidad([madre], new Set(['a1']));

    expect(grupo!.filas.map(({ nodo: { id } }) => id)).toEqual(['a', 'a1', 'a2']);
    expect(grupo!.filas[1]).toMatchObject({ colapsada: true });
    expect(grupo!.cantidad).toBe(4);
  });

  it('separa las localidades y suma la superficie de cada una', () => {
    const otra = nodo('z', { localidadId: 'loc-2', localidadNombre: 'Finca La Paz', superficieTotalM2: '10.00' });

    const grupos = agruparPorLocalidad([madre, otra], new Set());

    expect(grupos.map(({ localidadNombre }) => localidadNombre)).toEqual(['Finca El Carmen', 'Finca La Paz']);
    expect(grupos.map(({ superficieTotalM2 }) => superficieTotalM2)).toEqual(['9987.87', '10.00']);
  });

  it('una localidad sin ninguna medición no inventa un total', () => {
    expect(agruparPorLocalidad([nodo('d')], new Set())[0]!.superficieTotalM2).toBeNull();
  });

  it('sin parcelas no hay grupos', () => {
    expect(agruparPorLocalidad([], new Set())).toEqual([]);
  });
});

describe('parcelas inactivas y suma en la tarjeta', () => {
  const conInactiva = nodo('m', {
    hijas: [
      nodo('m1', { nivel: 2, superficieTotalM2: '100.00' }),
      nodo('m2', { nivel: 2, superficieTotalM2: '100.00', activo: false }),
    ],
  });

  it('las inactivas no suman, ni en la madre ni en el total de la localidad', () => {
    expect(superficieDelNodo(conInactiva)).toBe(10000);
    expect(superficieDelNodo(nodo('x', { superficieTotalM2: '50.00', activo: false }))).toBeNull();
    expect(agruparPorLocalidad([conInactiva], new Set())[0]!.superficieTotalM2).toBe('100.00');
  });

  it('la fila de una madre sin medición lleva la suma de sus hijas y lo indica', () => {
    const [grupo] = agruparPorLocalidad([madre], new Set());

    expect(grupo!.filas[0]).toMatchObject({ superficieTotalM2: '9987.87', esSumaDeSubparcelas: true });
    expect(grupo!.filas[2]).toMatchObject({ superficieTotalM2: '100.00', esSumaDeSubparcelas: false });
  });

  it('una madre inactiva muestra su propia medición aunque no aporte al total', () => {
    const fila = agruparPorLocalidad([nodo('i', { superficieTotalM2: '70.00', activo: false })], new Set())[0]!
      .filas[0]!;

    expect(fila).toMatchObject({ superficieTotalM2: '70.00', esSumaDeSubparcelas: false });
  });
});

describe('contraer todo', () => {
  it('lista solo las parcelas que tienen subparcelas, en cualquier nivel', () => {
    expect(idsConHijas([madre, nodo('sola')])).toEqual(['a', 'a1']);
  });
});
