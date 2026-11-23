import { describe, expect, it } from 'vitest';
import type { Existencia } from '../../servicios/existencias.api';
import { agruparPorArticulo, estaSinExistencia, filtrarPorTexto, valorDeLaLista } from './agrupar-existencias';

const existencia = (datos: Partial<Existencia>): Existencia => ({
  bodegaId: 'b1',
  bodegaNombre: 'Principal',
  articuloId: 'a1',
  articuloCodigo: 'ART-1',
  articuloNombre: 'Concentrado',
  tipoDeInventario: 'mercaderia',
  loteId: null,
  loteCodigo: null,
  cantidad: '10.0000',
  unidadBaseNombre: 'Libra',
  costoUnitario: '2.500000',
  valor: '25.00',
  ...datos,
});

describe('agrupar existencias por artículo', () => {
  it('suma lotes y bodegas, y ordena por nombre', () => {
    const grupos = agruparPorArticulo([
      existencia({ articuloId: 'a2', articuloNombre: 'Vacuna', articuloCodigo: 'V' }),
      existencia({ loteId: 'l1', cantidad: '5.5000', valor: '13.75' }),
      existencia({ bodegaId: 'b2', bodegaNombre: 'Anexo', cantidad: '4.0000', valor: '10.00' }),
    ]);
    expect(grupos.map((g) => g.nombre)).toEqual(['Concentrado', 'Vacuna']);
    expect(grupos[0]).toMatchObject({ cantidadTotal: '9.5000', valorTotal: '23.75' });
    expect(grupos[0]?.bodegas).toEqual([
      { bodegaId: 'b2', bodegaNombre: 'Anexo', cantidad: '4.0000' },
      { bodegaId: 'b1', bodegaNombre: 'Principal', cantidad: '5.5000' },
    ]);
    expect(grupos[0]?.filas).toHaveLength(2);
  });

  it('sin permiso de costos el valor queda en null y no se inventa un total', () => {
    const grupos = agruparPorArticulo([existencia({ costoUnitario: null, valor: null })]);
    expect(grupos[0]?.valorTotal).toBeNull();
    expect(valorDeLaLista(grupos)).toBeNull();
  });

  it('el valor de la lista suma los artículos', () => {
    const grupos = agruparPorArticulo([existencia({}), existencia({ articuloId: 'a2', valor: '0.10' })]);
    expect(valorDeLaLista(grupos)).toBe('25.10');
  });

  it('filtra por código o nombre sin importar tildes ni mayúsculas', () => {
    const grupos = agruparPorArticulo([
      existencia({ articuloNombre: 'Alimentación', articuloCodigo: 'X-1' }),
      existencia({ articuloId: 'a2', articuloNombre: 'Vacuna', articuloCodigo: 'Y-2' }),
    ]);
    expect(filtrarPorTexto(grupos, 'ALIMENTACION')).toHaveLength(1);
    expect(filtrarPorTexto(grupos, 'y-2')[0]?.nombre).toBe('Vacuna');
    expect(filtrarPorTexto(grupos, '  ')).toHaveLength(2);
  });

  it('un artículo sin cantidad se marca sin existencia', () => {
    const [grupo] = agruparPorArticulo([existencia({ cantidad: '0.0000' })]);
    expect(estaSinExistencia(grupo!)).toBe(true);
  });
});
