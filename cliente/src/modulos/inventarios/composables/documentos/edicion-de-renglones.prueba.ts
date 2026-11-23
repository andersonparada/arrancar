import { describe, expect, it } from 'vitest';
import type { Articulo } from '../../servicios/articulos.api';
import {
  agregarLeido,
  articuloDeCodigo,
  erroresDeRenglones,
  renglonesSolicitados,
  renglonNuevo,
  sinRenglonesVacios,
} from './edicion-de-renglones';

const articulo = (datos: Partial<Articulo>): Articulo =>
  ({ id: 'a1', codigo: 'ART-1', codigoDeBarras: '7401234567890', activo: true, ...datos }) as Articulo;

describe('renglones de un documento', () => {
  it('manda el costo solo en las entradas y la cantidad como texto', () => {
    const renglon = { ...renglonNuevo('a1', ' 3.5 '), costoTotal: '12.50' };
    expect(renglonesSolicitados([renglon], true)[0]).toEqual({
      articuloId: 'a1',
      loteId: null,
      cantidad: '3.5',
      unidadId: null,
      costoTotal: '12.50',
    });
    expect(renglonesSolicitados([renglon], false)[0]?.costoTotal).toBeNull();
  });

  it('dice qué falta, renglón por renglón', () => {
    const errores = erroresDeRenglones([renglonNuevo(), { ...renglonNuevo('a1', '2'), costoTotal: '1.234' }], true);
    expect(errores['renglones.0.articuloId']).toMatch(/Elija el artículo/);
    expect(errores['renglones.0.cantidad']).toMatch(/mayor que cero/);
    expect(errores['renglones.1.costoTotal']).toMatch(/2 decimales/);
    expect(errores['renglones.1.cantidad']).toBeUndefined();
  });

  it('sin renglones pide agregar al menos un artículo', () => {
    expect(erroresDeRenglones([], false).renglones).toMatch(/al menos un artículo/);
  });

  it('un costo vacío no se rechaza aquí: lo decide el servidor', () => {
    expect(erroresDeRenglones([renglonNuevo('a1', '2')], true)).toEqual({});
  });

  it('encuentra el artículo por código de barras o por código, solo entre los activos', () => {
    const lista = [articulo({}), articulo({ id: 'a2', codigo: 'X', codigoDeBarras: null, activo: false })];
    expect(articuloDeCodigo(lista, ' 7401234567890 ')?.id).toBe('a1');
    expect(articuloDeCodigo(lista, 'art-1')?.id).toBe('a1');
    expect(articuloDeCodigo(lista, 'X')).toBeNull();
    expect(articuloDeCodigo(lista, '')).toBeNull();
  });

  it('leer el mismo código varias veces suma la cantidad', () => {
    const una = agregarLeido([], 'a1');
    expect(una).toHaveLength(1);
    expect(una[0]?.cantidad).toBe('1');
    const tres = agregarLeido(agregarLeido(una, 'a1'), 'a1');
    expect(tres).toHaveLength(1);
    expect(tres[0]?.cantidad).toBe('3');
    expect(agregarLeido(tres, 'a2')).toHaveLength(2);
  });

  it('quita los renglones que quedaron vacíos', () => {
    expect(sinRenglonesVacios([renglonNuevo(), renglonNuevo('a1')])).toHaveLength(1);
  });
});
